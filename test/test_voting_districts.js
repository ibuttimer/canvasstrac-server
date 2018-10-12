/*jslint node: true */ /*eslint-env node,mocha*/
'use strict';

var testConsts = require('./test_consts'),
  app_path = testConsts.app_path,
  request = require('supertest'),
  // assert = require('assert'),
  chai = require('chai'),
  assert = chai.assert,
  // expect = chai.expect,
  // should = chai.should(),
  app = require(app_path + 'app'),
  VotingDistricts = require(app_path + 'models/votingDistricts').model;

var testUsersData = require('./test_users_data'),
  // some convenience variables
  userIndicesArray = testUsersData.userIndicesArray,
  userIndicesArrayRev = testUsersData.userIndicesArrayRev(),
  // USER_ADMIN = testUsersData.userIndices.USER_ADMIN,
  // USER_MANAGER = testUsersData.userIndices.USER_MANAGER,
  // USER_GROUP_LEAD = testUsersData.userIndices.USER_GROUP_LEAD,
  // USER_STAFF = testUsersData.userIndices.USER_STAFF,
  // USER_CANVASSER = testUsersData.userIndices.USER_CANVASSER,
  // USER_PUBLIC = testUsersData.userIndices.USER_PUBLIC,
  testUsers = require('./test_users'),
  testUtils = require('./test_utils'),
  getAppError = testUtils.getAppError,
  assertAppError = testUtils.assertAppError,
  utils = require(app_path + 'misc/utils'),
  // config = require(app_path + 'config'),
  Consts = require(app_path + 'consts');


/*
 * Data
 */
var test_prefix = 'test-';
var test_regex = /^test-/;
var user_replace = 'rxr';
var user_replace_regex = /rxr/i;
var object_template = {
  // voting districts fields
  name: test_prefix + user_replace + ' VotingDistrict name',
  description: 'Test voting district added by ' + user_replace,
  towns: [],
  cities: [],
  counties: [],
  // database fields
  _id: '',
  // test control fields
  test_state: ''
};
var forbiddenNotAuthForOp = getAppError(Consts.APPERR_ROLE_NOPRIVILEGES, 'APPERR_ROLE_NOPRIVILEGES');
var forbiddenNoToken = getAppError(Consts.APPERR_NO_TOKEN, 'APPERR_NO_TOKEN');
var object_array = [];

var url = testConsts.url_data + '/votingdistricts';
var url_register = url;

function url_id (id) {
  return url + '/' + id;
}

testUtils.addAccessRule(url, testUtils.hasPublicAccess, 'r');
testUtils.addAccessRule(url_register, testUtils.hasStaffAccess, 'c');
testUtils.addAccessRule(url_id('id'), testUtils.hasPublicAccess, 'r');
testUtils.addAccessRule(url_id('id'), testUtils.hasStaffAccess, 'ud');


/* Register the required test documentss */
function registerTestObjects() {
  describe('Register Voting District API', function () {
    before('Remove existing test districts', function () {
      // don't use drop() as this will occasionally raise a background operation error
      VotingDistricts.remove({name: {$regex: test_regex}}, function (err) { 
        if (err) {
          throw err;
        }
      });
    });
    // after(function () {});
    // beforeEach(function () {});
    // afterEach('runs after each test', function () {});

    var registerObject = function (template, token, expectedStatus, done) {
      // properties excluding
      var objDetails = utils.cloneObject(template, ['_id', 'test_state'], false);
      request(app)
        .post(url_register)
        .send(objDetails)
        .set('x-access-token', token)
        .expect('Content-Type', /json/)
        .expect(expectedStatus)
        .end(done);
    };

    var makeObjectDetails = function (ident) {
      // generate details with the user name to differentiate it
      return testUtils.makeObjectDetails(object_template, ['_id', 'test_state'], user_replace_regex, ident);
    };
    
    userIndicesArray.forEach(function (userIdx, index, array) {
      var expectedStatus = testUtils.getExpectedStatus(userIdx, url_register, 'c');
      var user = testUsersData.getUser(userIdx);
      if (expectedStatus === Consts.HTTP_OK) {
        it('create voting district authenticated as ' + user.username, function (done) {
          testUsers.loginIndex(userIdx, function (res) {
            // generate voting district details with the user name to differentiate it
            var objDetails = makeObjectDetails(user.username);
            // customise to have only towns, cities or counties
            switch(userIdx % 3) {
              case 0:
                objDetails.towns = testUtils.testTowns();
                break;
              case 1:
                objDetails.cities = testUtils.testCities();
                break;
              case 2:
                objDetails.counties = testUtils.testCounties();
                break;
            } 
            registerObject(objDetails, res.body.token, Consts.HTTP_CREATED, done);

            // save details for later
            objDetails._id = '';
            objDetails.test_state = 'created';
            object_array.push(objDetails);
          });
        });
      } else {
        it('is forbidden when authenticated as ' + user.username, function (done) {
          testUsers.loginIndex(userIdx, function (res) {
            // generate documents details with the user name to differentiate it
            var objDetails = makeObjectDetails(user.username);
            registerObject(objDetails, res.body.token, Consts.HTTP_FORBIDDEN, done);
          });
        });
      }

    });
    
    it('returns "forbidden" when not properly authenticated', function (done) {
      var objDetails = makeObjectDetails('not-auth');
      request(app)
        .post(url_register)
        .send(objDetails)
        .expect(Consts.HTTP_FORBIDDEN)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          assertAppError(forbiddenNoToken, res);
        })
        .end(done);
    });

  });
}

/* Test access to voting districts */
function testAccess () {

  var testEquality = function (check, ref) {
    return utils.testEquality(check, ref, ['name', 'description', 'towns', 'cities', 'counties', '_id']);
  };

  describe('Access to ' + url, function () {

    before(function () {
      // make sure object ids are set
      VotingDistricts.find(function (err, collection) {
        if (err) {
          throw err;
        }
        collection.forEach(function (entry, index, array) {
          var testEntry = utils.find(object_array, function (toTest) {
            return (toTest.name === entry.name);
          });
          if (testEntry != null) {
            testEntry._id = entry._id;
          }
        });
      });
    });
    // after(function () {});
    // beforeEach(function () {});
    // afterEach(function () {});

    var getCollection = function (token, expectedStatus, cb) {
	    testUtils.getEntry(url, token, expectedStatus, cb);
    };

    // test read access to all people
    userIndicesArray.forEach(function (userIdx, index, array) {
      var expectedStatus = testUtils.getExpectedStatus(userIdx, url, 'r');
      var user = testUsersData.getUser(userIdx);
      if (expectedStatus === Consts.HTTP_OK) {
        it('returns all voting districts when authenticated as ' + user.username, function (done) {
          testUsers.loginIndex(userIdx, function (res) {
            getCollection(res.body.token, Consts.HTTP_OK, function (res) {
              assert.isAtLeast(res.body.length, object_array.length, 'response contains less than the number of test districts');

              var matched = 0;
              object_array.forEach(function (entry, index, array) {
                var dbEntry = utils.find(res.body, function (toTest) {
                  return (toTest.name === entry.name);
                });
                if (testEquality(entry, dbEntry)) {
                  ++matched;
                }
              });
              assert.equal(matched, object_array.length, 'not all test districts matched');

              done();
            });
          });
        });
      } else {
        it('is forbidden when authenticated as ' + user.username, function (done) {
          testUsers.loginIndex(userIdx, function (res) {
            getCollection(res.body.token, Consts.HTTP_FORBIDDEN, function (res) {
              assertAppError(forbiddenNotAuthForOp, res);
              done();
            });
          });
        });
      }
    });

    it('returns "forbidden" when not properly authenticated', function (done) {
      request(app)
        .get(url)
        .expect(Consts.HTTP_FORBIDDEN)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          assertAppError(forbiddenNoToken, res);
        })
        .end(done);
    });
  });

  describe('Access to ' + url_id('id'), function () {

    // before(function () {});
    // after(function () {});
    // beforeEach(function () {});
    // afterEach(function () {});

    var getEntry = function (id, token, expectedStatus, cb) {
      testUtils.getEntry(url_id(id), token, expectedStatus, cb);
    };

    var putEntry = function (id, update, token, expectedStatus, cb) {
      testUtils.putEntry(url_id(id), update, token, expectedStatus, cb);
    };

    var deleteEntry = function (id, token, expectedStatus, cb) {
      testUtils.deleteEntry(url_id(id), token, expectedStatus, cb);
    };

    // test read access to individual documents
    userIndicesArray.forEach(function (userIdx, index, array) {
      var expectedStatus = testUtils.getExpectedStatus(userIdx, url_id('id'), 'r');
      var user = testUsersData.getUser(userIdx);
      if (expectedStatus === Consts.HTTP_OK) {
        it('returns a voting district by id when authenticated as ' + user.username, function (done) {
          testUsers.loginIndex(userIdx, function (res) {
            var testEntry = object_array[0];
            getEntry(testEntry._id, res.body.token, Consts.HTTP_OK, function (res) {
              assert.ok(testEquality(res.body, testEntry));
              done();
            });
          });
        });
      } else {
        it('is forbidden when authenticated as ' + user.username, function (done) {
          testUsers.loginIndex(userIdx, function (res) {
            var testEntry = object_array[0];
            getEntry(testEntry._id, res.body.token, Consts.HTTP_FORBIDDEN, function (res) {
              assertAppError(forbiddenNotAuthForOp, res);
              done();
            });
          });
        });
      }
    });
    
    // test write access to individual documents
    userIndicesArray.forEach(function (userIdx, index, array) {
      var expectedStatus = testUtils.getExpectedStatus(userIdx, url_id('id'), 'u');
      var user = testUsersData.getUser(userIdx);
      if (expectedStatus === Consts.HTTP_OK) {
        it('updates voting district details when authenticated as ' + user.username, function (done) {
          var testEntry = object_array[0];
          testEntry.description = testEntry.description + ' and updated by ' + user.username;
          var update = {description: testEntry.description};
          testUsers.loginIndex(userIdx, function (res) {
            putEntry(testEntry._id, update, res.body.token, Consts.HTTP_OK, function (res) {
              assert.ok(testEquality(res.body, testEntry));
              done();
            });
          });
        });
      } else {
        it('update voting district details is forbidden when authenticated as ' + user.username, function (done) {
          var testEntry = object_array[0];
          testEntry.description = testEntry.description + ' and updated by ' + user.username;
          var update = {description: testEntry.description};
          testUsers.loginIndex(userIdx, function (res) {
            putEntry(testEntry._id, update, res.body.token, Consts.HTTP_FORBIDDEN, function (res) {
              assertAppError(forbiddenNotAuthForOp, res);
              done();
            });
          });
        });
      }
    });
    
    // test deletion by id
    // use a reverse order copy of the array, so lowest role is deleting highest role's entry
    userIndicesArrayRev.forEach(function (userIdx, index, array) {
      var expectedStatus = testUtils.getExpectedStatus(userIdx, url_id('id'), 'd');
      var user = testUsersData.getUser(userIdx);
      if (expectedStatus === Consts.HTTP_OK) {
        it('delete voting district by id succeeds when authenticated as ' + user.username, function (done) {
          var testEntry = utils.find(object_array, function (toTest) {
            return (toTest.test_state === 'created');
          });
          testUsers.loginIndex(userIdx, function (res) {
            deleteEntry(testEntry._id, res.body.token, Consts.HTTP_OK, function (res) {
              testEntry.test_state = 'deleted';
              done();
            });
          });
        });
      } else {
        it('delete voting district by id is forbidden when authenticated as ' + user.username, function (done) {
          var testEntry = utils.find(object_array, function (toTest) {
            return (toTest.test_state === 'created');
          });
          testUsers.loginIndex(userIdx, function (res) {
            deleteEntry(testEntry._id, res.body.token, Consts.HTTP_FORBIDDEN, function (res) {
              done();
            });
          });
        });
      }
    });
    
  });
}


var self = {
  runTestSuite: function () {
    registerTestObjects();
    testAccess();
  }
};

module.exports = self;
