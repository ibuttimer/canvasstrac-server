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
var Candidate = require(app_path + 'models/candidate').model;
var Person = require(app_path + 'models/person').model;
var Addresses = require(app_path + 'models/addresses').model;
var VotingDistricts = require(app_path + 'models/votingDistricts');
var ContactDetails = require(app_path + 'models/contactDetails').model;

var test_users = require('./test_users');
// some convenience variables
var userIndicesArray = test_users.userIndicesArray,
    userIndicesArrayRev = test_users.userIndicesArrayRev(),
    USER_ADMIN = test_users.userIndices.USER_ADMIN,
    USER_MANAGER = test_users.userIndices.USER_MANAGER,
    USER_GROUP_LEAD = test_users.userIndices.USER_GROUP_LEAD,
    USER_STAFF = test_users.userIndices.USER_STAFF,
    USER_CANVASSER = test_users.userIndices.USER_CANVASSER,
    USER_PUBLIC = test_users.userIndices.USER_PUBLIC,
  test_utils = require('./test_utils'),
  test_people = require('./test_people'),
  test_parties = require('./test_parties'),
  utils = require(app_path + 'misc/utils'),
  config = require(app_path + 'config'),
  Consts = require(app_path + 'consts');

/*
 * Data
 */
var test_prefix = 'test-';
var test_regex = /^test-/;
var user_replace = 'rxr';
var user_replace_regex = /rxr/i;
var object_template = {
  // candidate fields
  // tbc
  // person fields
  firstname: test_prefix + user_replace + "-name",
  lastname: test_prefix + user_replace + "Surname",
  note: "Test candidate added by " + user_replace,
  // address fields
  addrLine1: "Apartment " + user_replace,
  addrLine2: user_replace + " Test St.",
  addrLine3: user_replace + " Test block",
  town: user_replace + " Test town",
  city: user_replace + " Test city",
  county: "County Test " + user_replace,
  country: "Test Country " + user_replace,
  postcode: "TST-" + user_replace,
  gps: "",
  votingDistrict: "",
  // contact details fields
  phone: "(01) 123-PHONE-" + user_replace,
  mobile: "(01) 123-MOBILE-" + user_replace,
  email: user_replace + ".surname@test.com",
  website: "www." + user_replace + "_surname.net",
  facebook: "https://www.facebook.com/" + user_replace + ".surname",
  twitter: "@" + user_replace + ".surname",
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
var unknownId = '123456789012345678901234';

var url = '/candidates';
var url_register = url;

function url_id (id) {
  return url + '/' + id;
};

test_utils.addAccessRule(url_register, test_utils.hasStaffAccess, 'c');
test_utils.addAccessRule(url, test_utils.hasCanvasserAccess, 'r');
test_utils.addAccessRule(url_id('id'), test_utils.hasCanvasserAccess, 'r');
test_utils.addAccessRule(url_id('id'), test_utils.hasStaffAccess, 'ud');

function makeObjectDetails (ident) {
  // generate details with the user name to differentiate it
  return test_utils.makeObjectDetails(object_template, ['_id', 'test_state'], user_replace_regex, ident);
}
    

/* Register the required test objects */
function registerTestObjects() {
  describe('Register Candidate API', function () {
    before('Remove existing test candidates', function () {
      // don't use drop() as this will occasionally raise a background operation error
      Candidate.find({}, function (err, collection) { 
        if (err) {
          throw err;
        }
        collection.forEach(function (entry, index, array) {
          
          test_people.removeExisting({
            _id: entry.person,
            firstname: {$regex: test_regex}});

            entry.remove(function (err) { 
              if (err) {
                throw err;
              }
            });
          });
        });
      });
//    after(function () {});
//    beforeEach(function () {});
//    afterEach('runs after each test', function () {});

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
      var expectedStatus = test_utils.getExpectedStatus(userIdx, url_register, 'c');
      var user = test_users.getUser(userIdx);
      if (expectedStatus === Consts.HTTP_OK) {
        it('create candidate authenticated as ' + user.username, function (done) {
          test_users.loginIndex(userIdx, function (res) {
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
          test_users.loginIndex(userIdx, function (res) {
            // generate object details with the user name to differentiate it
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

/* Test access to people */
function testAccess () {

  var testEquality = function (check, ref) {
//            console.log('check-------', check, '\nref-----',ref);
    return utils.testEquality(check, ref, ['firstname', 'lastname', 'note', '_id']);
  }
  
  var matchObject = function (lookFor, toTest) {
            console.log('lookFor-------', lookFor, '\ntoTest-----',toTest);
    return (lookFor.firstname === toTest.person.firstname);
  };
    
  describe('Access to ' + url, function () {

    before(function () {
      // make sure candidate ids are set
      Candidate.find(function (err, collection) {
        if (err) {
          throw err;
        }
        collection.forEach(function (entry, index, array) {
          
          console.log('entry-------', entry);

          Person.find({owner: entry._id}, function (err, list) {
            if (err) {
              throw err;
            }
            
            console.log('list-------', list);

            
            list.forEach(function (item, index, array) {
              var testEntry = utils.find(object_array, function (toTest) {
                return matchObject(item, toTest);
              });
            console.log('testEntry-------', testEntry);
              if (testEntry != null) {
                testEntry._id = entry._id;
                            console.log('testEntry-------', testEntry);

              }
            });
          });
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
        it('returns all candidates when authenticated as ' + user.username, function (done) {
          test_users.loginIndex(userIdx, function (res) {
            getCollection(res.body.token, Consts.HTTP_OK, function (res) {
              assert.isAtLeast(res.body.length, object_array.length, 'response contains less than the number of test candidates');

              var matched = 0;
              object_array.forEach(function (entry, index, array) {
                
//                console.log('entry----------',entry);
//                console.log(res.body);
                
                var dbEntry = utils.find(res.body, function (toTest) {
                  return matchObject(entry, toTest);
                })
                if (testEquality(entry, dbEntry)) {
                  ++matched;
                }
              });
              assert.equal(matched, object_array.length, 'not all test candidates matched');

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

    // test read access to individual candidates
    userIndicesArray.forEach(function (userIdx, index, array) {
      var expectedStatus = test_utils.getExpectedStatus(userIdx, url_id('id'), 'r');
      var user = test_users.getUser(userIdx);
      if (expectedStatus === Consts.HTTP_OK) {
        it('returns a candidate by id when authenticated as ' + user.username, function (done) {
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

    it('return a candidate by id is "not found" with unknown id', function (done) {
      test_users.loginIndex(USER_ADMIN, function (res) {
        getEntry(unknownId, res.body.token, Consts.HTTP_NOT_FOUND, function (res) {
          done();
        });
      });
    });

    // test write access to individual people
//    userIndicesArray.forEach(function (userIdx, index, array) {
//      var expectedStatus = test_utils.getExpectedStatus(userIdx, url_id('id'), 'u');
//      var user = test_users.getUser(userIdx);
//      if (expectedStatus === Consts.HTTP_OK) {
//        it('updates a candidates details by id when authenticated as ' + user.username, function (done) {
//          var testEntry = object_array[0];
//          testEntry.note = testEntry.note + ' and updated by ' + user.username
//          var update = {note: testEntry.note};
//          test_users.loginIndex(userIdx, function (res) {
//            putEntry(testEntry._id, update, res.body.token, Consts.HTTP_OK, function (res) {
//              assert.ok(testEquality(res.body, testEntry));
//              done();
//            });
//          });
//        });
//      } else {
//        it('is forbidden when authenticated as ' + user.username, function (done) {
//          var testEntry = object_array[0];
//          testEntry.note = testEntry.note + ' and updated by ' + user.username
//          var update = {note: testEntry.note};
//          test_users.loginIndex(userIdx, function (res) {
//            putEntry(testEntry._id, update, res.body.token, Consts.HTTP_FORBIDDEN, function (res) {
//              assert.deepEqual(res.body, forbiddenNotAuthForOp);
//              done();
//            });
//          });
//        });
//      }
//    });
//    
//    it('update a Candidates details by id is "bad request" with unknown id and not content', function (done) {
//      test_users.loginIndex(USER_ADMIN, function (res) {
//        putEntry(unknownId, {}, res.body.token, Consts.HTTP_BAD_REQUEST, function (res) {
//          done();
//        });
//      });
//    });
//
//    it('update a Candidates details by id is "not found" with unknown id and valid content', function (done) {
//      test_users.loginIndex(USER_ADMIN, function (res) {
//        // generate object details with the user name to differentiate it
//        var objDetails = makeObjectDetails('unknown');
//        putEntry(unknownId, objDetails, res.body.token, Consts.HTTP_NOT_FOUND, function (res) {
//          done();
//        });
//
//      });
//    });
//
//    
//    
//    // test user deletion by id
//    // use a reverse order copy of the array, so lowest role is deleting highest role's object
//    userIndicesArrayRev.forEach(function (userIdx, index, array) {
//      var expectedStatus = test_utils.getExpectedStatus(userIdx, url_id('id'), 'd');
//      var user = test_users.getUser(userIdx);
//      if (expectedStatus === Consts.HTTP_OK) {
//        it('delete Candidate by id succeeds when authenticated as ' + user.username, function (done) {
//          var testEntry = utils.find(object_array, function (toTest) {
//            return (toTest.test_state === 'created');
//          });
//          test_users.loginIndex(userIdx, function (res) {
//            deleteEntry(testEntry._id, res.body.token, Consts.HTTP_OK, function (res) {
//              testEntry.test_state = 'deleted';
//              done();
//            });
//          });
//        });
//      } else {
//        it('delete Candidate by id is forbidden when authenticated as ' + user.username, function (done) {
//          var testEntry = utils.find(object_array, function (toTest) {
//            return (toTest.test_state === 'created');
//          });
//          test_users.loginIndex(userIdx, function (res) {
//            deleteEntry(testEntry._id, res.body.token, Consts.HTTP_FORBIDDEN, function (res) {
//              done();
//            });
//          });
//        });
//      }
//    });
//    
//    it('delete Candidate by id is "not found" with unknown id', function (done) {
//      test_users.loginIndex(USER_ADMIN, function (res) {
//        deleteEntry(unknownId, res.body.token, Consts.HTTP_NOT_FOUND, function (res) {
//          done();
//        });
//      });
//    });
    
    
  });
}


var self = {
  runTestSuite: function () {
    registerTestObjects();
    testAccess();
  }
};

module.exports = self;
