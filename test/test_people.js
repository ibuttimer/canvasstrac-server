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
  Person = require(app_path + 'models/person').model,
  Addresses = require(app_path + 'models/addresses').model,
  // VotingDistricts = require(app_path + 'models/votingDistricts'),
  ContactDetails = require(app_path + 'models/contactDetails').model;

var testUsersData = require('./test_users_data'),
  // some convenience variables
  userIndicesArray = testUsersData.userIndicesArray,
  userIndicesArrayRev = testUsersData.userIndicesArrayRev(),
  USER_ADMIN = testUsersData.userIndices.USER_ADMIN,
  // USER_MANAGER = testUsersData.userIndices.USER_MANAGER,
  // USER_GROUP_LEAD = testUsersData.userIndices.USER_GROUP_LEAD,
  // USER_STAFF = testUsersData.userIndices.USER_STAFF,
  // USER_CANVASSER = testUsersData.userIndices.USER_CANVASSER,
  // USER_PUBLIC = testUsersData.userIndices.USER_PUBLIC,
  testUsers = require('./test_users'),
  testUtils = require('./test_utils'),
  getAppError = testUtils.getAppError,
  assertAppError = testUtils.assertAppError;

var utils = require(app_path + 'misc/utils'),
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
  // person fields
  firstname: test_prefix + user_replace + '-name',
  lastname: test_prefix + user_replace + 'Surname',
  note: 'Test person added by ' + user_replace,
  // address fields
  addrLine1: 'Apartment ' + user_replace,
  addrLine2: user_replace + ' Test St.',
  addrLine3: user_replace + ' Test block',
  town: user_replace + ' Test town',
  city: user_replace + ' Test city',
  county: 'County Test ' + user_replace,
  country: 'Test Country ' + user_replace,
  postcode: 'TST-' + user_replace,
  gps: '',
  votingDistrict: '',
  // contact details fields
  phone: '(01) 123-PHONE-' + user_replace,
  mobile: '(01) 123-MOBILE-' + user_replace,
  email: user_replace + '.surname@test.com',
  website: 'www.' + user_replace + '_surname.net',
  facebook: 'https://www.facebook.com/' + user_replace + '.surname',
  twitter: '@' + user_replace + '.surname',
  // database fields
  _id: '',
  // test control fields
  test_state: ''
};
var object_array = [];
var forbiddenNotAuthForOp = getAppError(Consts.APPERR_ROLE_NOPRIVILEGES, 'APPERR_ROLE_NOPRIVILEGES');
var forbiddenNoToken = getAppError(Consts.APPERR_NO_TOKEN, 'APPERR_NO_TOKEN');
var unknownId = '123456789012345678901234';

var url = testConsts.url_data + '/people';
var url_register = url + '/register';

function url_id (id) {
  return url + '/' + id;
}

testUtils.addAccessRule(url_register, testUtils.hasPublicAccess, 'c');
testUtils.addAccessRule(url, testUtils.hasCanvasserAccess, 'r');
testUtils.addAccessRule(url_id('id'), testUtils.hasCanvasserAccess, 'rud');

function makeObjectDetails (ident) {
  // generate details with the user name to differentiate it
  return testUtils.makeObjectDetails(object_template, ['_id', 'test_state'], user_replace_regex, ident);
}

function removeExisting(criteria) {
  // don't use drop() as this will occasionally raise a background operation error
  Person.find(criteria, {_id: true}, null, function (err, collection) { 
    if (err) {
      throw err;
    }
    collection.forEach(function (id, index, array) {
      Addresses.remove({owner: id}, function (err) { 
        if (err) {
          throw err;
        }
        ContactDetails.remove({owner: id}, function (err) { 
          if (err) {
            throw err;
          }
          Person.findByIdAndRemove(id, function (err) { 
            if (err) {
              throw err;
            }
          });
        });
      });
    });
  });
}


/* Register the required test objects */
function registerTestObjects() {
  describe('Register Person API', function () {
    before('Remove existing test persons', function () {
      removeExisting({firstname: {$regex: test_regex}});
    });
    // after(function () {});
    // beforeEach(function () {});
    // afterEach('runs after each test', function () {});

    var registerObject = function (template, token, expectedStatus, done) {
      // properties excluding
      var objDetails = utils.cloneObject(template, ['_id', 'test_state', 'votingDistrict'], false);
      request(app)
        .post(url_register)
        .send(objDetails)
        .set('x-access-token', token)
        .expect('Content-Type', /json/)
        .expect(expectedStatus)
        .end(done);
    };

    userIndicesArray.forEach(function (userIdx, index, array) {
      var expectedStatus = testUtils.getExpectedStatus(userIdx, url_register, 'c');
      var user = testUsersData.getUser(userIdx);
      if (expectedStatus === Consts.HTTP_OK) {
        it('create person authenticated as ' + user.username, function (done) {
          testUsers.loginIndex(userIdx, function (res) {
            // generate object details with the user name to differentiate it
            var objDetails = makeObjectDetails(user.username);
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
            // generate object details with the user name to differentiate it
            var objDetails = makeObjectDetails(user.username);
            registerObject(objDetails, res.body.token, Consts.HTTP_FORBIDDEN, done);
          });
        });
      }

    });
    
    it('create person when not properly authenticated', function (done) {
      var objDetails = makeObjectDetails('not-auth');
      registerObject(objDetails, '', Consts.HTTP_CREATED, done);
    });

  });
}

/* Test access to people */
function testAccess () {

  var testEquality = function (check, ref) {
    return utils.testEquality(check, ref, ['firstname', 'lastname', 'note', '_id']);
  };
  
  var matchObject = function (lookFor, toTest) {
    return (lookFor.firstname === toTest.firstname);
  };

  describe('Access to ' + url, function () {

    before(function () {
      // make sure people ids are set
      Person.find(function (err, collection) {
        if (err) {
          throw err;
        }
        collection.forEach(function (entry, index, array) {
          var testEntry = utils.find(object_array, function (toTest) {
            return matchObject(entry, toTest);
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
        it('returns all people when authenticated as ' + user.username, function (done) {
          testUsers.loginIndex(userIdx, function (res) {
            getCollection(res.body.token, Consts.HTTP_OK, function (res) {
              assert.isAtLeast(res.body.length, object_array.length, 'response contains less than the number of test users');

              var matched = 0;
              object_array.forEach(function (entry, index, array) {
                var dbEntry = utils.find(res.body, function (toTest) {
                  return matchObject(entry, toTest);
                });
                if (testEquality(entry, dbEntry)) {
                  ++matched;
                }
              });
              assert.equal(matched, object_array.length, 'not all test people matched');

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

    // test read access to individual people
    userIndicesArray.forEach(function (userIdx, index, array) {
      var expectedStatus = testUtils.getExpectedStatus(userIdx, url_id('id'), 'r');
      var user = testUsersData.getUser(userIdx);
      if (expectedStatus === Consts.HTTP_OK) {
        it('returns a person by id when authenticated as ' + user.username, function (done) {
          testUsers.loginIndex(userIdx, function (res) {
            var testEntry = object_array[0];
            getEntry(testEntry._id, res.body.token, Consts.HTTP_OK, function (res) {
              assert.ok(testEquality(res.body, testEntry));
              done();
            });
          });
        });
      } else {
        it('is forbidden when authenticated as ' + testUsersData.getUser(userIdx).username, function (done) {
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

    it('return a person by id is "not found" with unknown id', function (done) {
      testUsers.loginIndex(USER_ADMIN, function (res) {
        getEntry(unknownId, res.body.token, Consts.HTTP_NOT_FOUND, function (res) {
          done();
        });
      });
    });

    // test write access to individual people
    userIndicesArray.forEach(function (userIdx, index, array) {
      var expectedStatus = testUtils.getExpectedStatus(userIdx, url_id('id'), 'u');
      var user = testUsersData.getUser(userIdx);
      if (expectedStatus === Consts.HTTP_OK) {
        it('updates a persons details by id when authenticated as ' + user.username, function (done) {
          var testEntry = object_array[0];
          testEntry.note = testEntry.note + ' and updated by ' + user.username;
          var update = {note: testEntry.note};
          testUsers.loginIndex(userIdx, function (res) {
            putEntry(testEntry._id, update, res.body.token, Consts.HTTP_OK, function (res) {
              assert.ok(testEquality(res.body, testEntry));
              done();
            });
          });
        });
      } else {
        it('is forbidden when authenticated as ' + user.username, function (done) {
          var testEntry = object_array[0];
          testEntry.note = testEntry.note + ' and updated by ' + user.username;
          var update = {note: testEntry.note};
          testUsers.loginIndex(userIdx, function (res) {
            putEntry(testEntry._id, update, res.body.token, Consts.HTTP_FORBIDDEN, function (res) {
              assertAppError(forbiddenNotAuthForOp, res);
              done();
            });
          });
        });
      }
    });
    
    it('update a persons details by id is "not found" with unknown id and no content', function (done) {
      testUsers.loginIndex(USER_ADMIN, function (res) {
        putEntry(unknownId, {}, res.body.token, Consts.HTTP_NOT_FOUND, function (res) {
          done();
        });
      });
    });

    it('update a persons details by id is "not found" with unknown id and valid content', function (done) {
      testUsers.loginIndex(USER_ADMIN, function (res) {
        // generate object details with the user name to differentiate it
        var objDetails = makeObjectDetails('unknown');
        putEntry(unknownId, objDetails, res.body.token, Consts.HTTP_NOT_FOUND, function (res) {
          done();
        });

      });
    });

    
    
    // test user deletion by id
    // use a reverse order copy of the array, so lowest role is deleting highest role's object
    userIndicesArrayRev.forEach(function (userIdx, index, array) {
      var expectedStatus = testUtils.getExpectedStatus(userIdx, url_id('id'), 'd');
      var user = testUsersData.getUser(userIdx);
      if (expectedStatus === Consts.HTTP_OK) {
        it('delete person by id succeeds when authenticated as ' + user.username, function (done) {
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
        it('delete person by id is forbidden when authenticated as ' + user.username, function (done) {
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
    
    it('delete person by id is "not found" with unknown id', function (done) {
      testUsers.loginIndex(USER_ADMIN, function (res) {
        deleteEntry(unknownId, res.body.token, Consts.HTTP_NOT_FOUND, function (res) {
          done();
        });
      });
    });
    
    
  });
}


module.exports = {
  runTestSuite: function () {
    registerTestObjects();
    testAccess();
  },
  removeExisting: removeExisting
};

