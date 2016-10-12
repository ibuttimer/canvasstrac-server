/*jslint node: true */
'use strict';

var app_path = '../app/';   // relative path to app

var request = require('supertest');
//var assert = require('assert');
var chai = require('chai'),
    assert = chai.assert,
    expect = chai.expect,
    should = chai.should();
var mongoose = require('mongoose');
var app = require(app_path + 'app');
var VotingSystems = require(app_path + 'models/votingSystems').model;
var VotingDistricts = require(app_path + 'models/votingDistricts').model;

var test_users = require('./test_users');
// some convenience variables
var userIndicesArray = test_users.userIndicesArray,
    userIndicesArrayRev = test_users.userIndicesArrayRev(),
    USER_ADMIN = test_users.userIndices.USER_ADMIN,
    USER_MANAGER = test_users.userIndices.USER_MANAGER,
    USER_GROUP_LEAD = test_users.userIndices.USER_GROUP_LEAD,
    USER_STAFF = test_users.userIndices.USER_STAFF,
    USER_CANVASSER = test_users.userIndices.USER_CANVASSER,
    USER_PUBLIC = test_users.userIndices.USER_PUBLIC;
var test_utils = require('./test_utils');

var utils = require(app_path + 'misc/utils');
var config = require(app_path + 'config');
var Consts = require(app_path + 'consts');


/*
 * Data
 */
var test_prefix = 'test-';
var test_regex = /^test-/;
var user_replace = 'rxr';
var user_replace_regex = /rxr/i;
var object_template = {
  // voting system fields
  name: test_prefix + user_replace + "-name",
  description: "Test voting system added by " + user_replace,
  abbreviation: "ABBRV-" + user_replace,
  preferenceLevels: ['Pref_1_' + user_replace, 'Pref_2_' + user_replace],
  // database fields
  _id: "",
  // test control fields
  test_state: ""
};
var object_array = [];
var forbiddenNoToken = {
  "message": "No token provided!",
  "error": {"status": Consts.HTTP_FORBIDDEN}
};
var forbiddenNotAuthForOp = {
  "message": "You are not authorized to perform this operation!",
  "error": {"status": Consts.HTTP_FORBIDDEN}
};

var url = '/votingsystems';
var url_register = url;

function url_id (id) {
  return url + '/' + id;
};

test_utils.addAccessRule(url, test_utils.hasPublicAccess, 'r');
test_utils.addAccessRule(url_register, test_utils.hasStaffAccess, 'c');
test_utils.addAccessRule(url_id('id'), test_utils.hasPublicAccess, 'r');
test_utils.addAccessRule(url_id('id'), test_utils.hasStaffAccess, 'ud');


/* Register the required test documentss */
function registerTestObjects() {
  describe('Register Voting System API', function () {
    before('Remove existing test systems', function () {
      // don't use drop() as this will occasionally raise a background operation error
      VotingSystems.remove({name: {$regex: test_regex}}, function (err, people) { 
        if (err) {
          throw err;
        }
      });
    });
//    after(function () {});
//    beforeEach(function () {});
//    afterEach('runs after each test', function () {});

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
      return test_utils.makeObjectDetails(object_template, ['_id', 'test_state'], user_replace_regex, ident);
    }
    
    userIndicesArray.forEach(function (userIdx, index, array) {
      var expectedStatus = test_utils.getExpectedStatus(userIdx, url_register, 'c');
      var user = test_users.getUser(userIdx);
      if (expectedStatus === Consts.HTTP_OK) {
        it('create voting system authenticated as ' + user.username, function (done) {
          test_users.loginIndex(userIdx, function (res) {
            // generate voting system details with the user name to differentiate it
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
          test_users.loginIndex(userIdx, function (res) {
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
          assert.deepEqual(res.body, forbiddenNoToken);
        })
        .end(done);
    });

  });
}

/* Test access to voting systems */
function testAccess () {

  var testEquality = function (check, ref) {
    return utils.testEquality(check, ref, ['name', 'description', 'abbreviation', 'preferenceLevels', '_id']);
  }
    
  describe('Access to ' + url, function () {

    before(function () {
      // make sure object ids are set
      VotingSystems.find(function (err, collection) {
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
//    after(function () {});
//    beforeEach(function () {});
//    afterEach(function () {});

    var getCollection = function (token, expectedStatus, cb) {
	  test_utils.getEntry(url, token, expectedStatus, cb);
    };

    // test read access to all people
    userIndicesArray.forEach(function (userIdx, index, array) {
      var expectedStatus = test_utils.getExpectedStatus(userIdx, url, 'r');
      var user = test_users.getUser(userIdx);
      if (expectedStatus === Consts.HTTP_OK) {
        it('returns all voting systems when authenticated as ' + user.username, function (done) {
          test_users.loginIndex(userIdx, function (res) {
            getCollection(res.body.token, Consts.HTTP_OK, function (res) {
              assert.isAtLeast(res.body.length, object_array.length, 'response contains less than the number of test systems');

              var matched = 0;
              object_array.forEach(function (entry, index, array) {
                var dbEntry = utils.find(res.body, function (toTest) {
                  return (toTest.name === entry.name);
                })
                if (testEquality(entry, dbEntry)) {
                  ++matched;
                }
              });
              assert.equal(matched, object_array.length, 'not all test systems matched');

              done();
            });
          });
        });
      } else {
        it('is forbidden when authenticated as ' + user.username, function (done) {
          test_users.loginIndex(userIdx, function (res) {
            getCollection(res.body.token, Consts.HTTP_FORBIDDEN, function (res) {
              assert.deepEqual(res.body, forbiddenNotAuthForOp);
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
          assert.deepEqual(res.body, forbiddenNoToken);
        })
        .end(done);
    });
  });

  describe('Access to ' + url_id('id'), function () {

//    before(function () {});
//    after(function () {});
//    beforeEach(function () {});
//    afterEach(function () {});

    var getEntry = function (id, token, expectedStatus, cb) {
      test_utils.getEntry(url_id(id), token, expectedStatus, cb);
    };

    var putEntry = function (id, update, token, expectedStatus, cb) {
      test_utils.putEntry(url_id(id), update, token, expectedStatus, cb);
    };

    var deleteEntry = function (id, token, expectedStatus, cb) {
      test_utils.deleteEntry(url_id(id), token, expectedStatus, cb)
    };

    // test read access to individual documents
    userIndicesArray.forEach(function (userIdx, index, array) {
      var expectedStatus = test_utils.getExpectedStatus(userIdx, url_id('id'), 'r');
      var user = test_users.getUser(userIdx);
      if (expectedStatus === Consts.HTTP_OK) {
        it('returns a voting system by id when authenticated as ' + user.username, function (done) {
          test_users.loginIndex(userIdx, function (res) {
            var testEntry = object_array[0];
            getEntry(testEntry._id, res.body.token, Consts.HTTP_OK, function (res) {
              assert.ok(testEquality(res.body, testEntry));
              done();
            });
          });
        });
      } else {
        it('is forbidden when authenticated as ' + user.username, function (done) {
          test_users.loginIndex(userIdx, function (res) {
            var testEntry = object_array[0];
            getEntry(testEntry._id, res.body.token, Consts.HTTP_FORBIDDEN, function (res) {
              assert.deepEqual(res.body, forbiddenNotAuthForOp);
              done();
            });
          });
        });
      }
    });
    
    // test write access to individual documents
    userIndicesArray.forEach(function (userIdx, index, array) {
      var expectedStatus = test_utils.getExpectedStatus(userIdx, url_id('id'), 'u');
      var user = test_users.getUser(userIdx);
      if (expectedStatus === Consts.HTTP_OK) {
        it('updates voting system details when authenticated as ' + user.username, function (done) {
          var testEntry = object_array[0];
          testEntry.description = testEntry.description + ' and updated by ' + user.username
          var update = {description: testEntry.description};
          test_users.loginIndex(userIdx, function (res) {
            putEntry(testEntry._id, update, res.body.token, Consts.HTTP_OK, function (res) {
              assert.ok(testEquality(res.body, testEntry));
              done();
            });
          });
        });
      } else {
        it('update voting system details is forbidden when authenticated as ' + user.username, function (done) {
          var testEntry = object_array[0];
          testEntry.description = testEntry.description + ' and updated by ' + user.username
          var update = {description: testEntry.description};
          test_users.loginIndex(userIdx, function (res) {
            putEntry(testEntry._id, update, res.body.token, Consts.HTTP_FORBIDDEN, function (res) {
              assert.deepEqual(res.body, forbiddenNotAuthForOp);
              done();
            });
          });
        });
      }
    });
    
    // test deletion by id
    // use a reverse order copy of the array, so lowest role is deleting highest role's entry
    userIndicesArrayRev.forEach(function (userIdx, index, array) {
      var expectedStatus = test_utils.getExpectedStatus(userIdx, url_id('id'), 'd');
      var user = test_users.getUser(userIdx);
      if (expectedStatus === Consts.HTTP_OK) {
        it('delete voting system by id succeeds when authenticated as ' + user.username, function (done) {
          var testEntry = utils.find(object_array, function (toTest) {
            return (toTest.test_state === 'created');
          });
          test_users.loginIndex(userIdx, function (res) {
            deleteEntry(testEntry._id, res.body.token, Consts.HTTP_OK, function (res) {
              testEntry.test_state = 'deleted';
              done();
            });
          });
        });
      } else {
        it('delete voting system by id is forbidden when authenticated as ' + user.username, function (done) {
          var testEntry = utils.find(object_array, function (toTest) {
            return (toTest.test_state === 'created');
          });
          test_users.loginIndex(userIdx, function (res) {
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
