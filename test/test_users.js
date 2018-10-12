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
  User = require(app_path + 'models/user').model,
  Roles = require(app_path + 'models/roles').model,
  utils = require(app_path + 'misc/utils'),
  testUsersData = require('./test_users_data'),
  test_username_regex = testUsersData.test_username_regex,
  test_user_password = testUsersData.test_user_password,
  userArray = testUsersData.userArray,
  userIndices = testUsersData.userIndices,
  userIndicesArray = testUsersData.userIndicesArray,
  getUser = testUsersData.getUser,
  getPassword = testUsersData.getPassword,
  userToDelete = testUsersData.userToDelete,
  testUtils = require('./test_utils'),
  getAppError = testUtils.getAppError,
  assertAppError = testUtils.assertAppError,
  // config = require(app_path + 'config'),
  Consts = require(app_path + 'consts');

var replyCheckProps = ['username', 'firstname', 'lastname', 'role._id', '_id'];  // reply property names

var url = testConsts.url_data + '/users';
var url_login = url + '/login';
var url_logout = url + '/logout';
var url_register = url + '/register'; // public access point
var url_create = url;                 // admin access point

var test_username_postfix = '-create';

var forbiddenNotAuthForOp = getAppError(Consts.APPERR_ROLE_NOPRIVILEGES, 'APPERR_ROLE_NOPRIVILEGES');
var forbiddenNoToken = getAppError(Consts.APPERR_NO_TOKEN, 'APPERR_NO_TOKEN');

function url_id (id) {
  return url + '/' + id;
}

function url_test_is (name) {
  return testConsts.url_test + '/is/' + name;
}

function url_test_has (name) {
  return testConsts.url_test + '/has/' + name;
}


/* Register the required test users */
function registerUsers() {
  describe('Register User API', function () {
    before('Remove existing test users', function () {
      // don't use drop() as this will occasionally raise a background operation error
      User.remove({username: {$regex: test_username_regex}}, function (err) { 
        if (err) {
          throw err;
        }
      });
    });
    // after(function () {});
    // beforeEach(function (done) {});
    afterEach('Assign correct test user roles', function () {
      /* this code doesn't run in the after() hook for some unknown reason :-/ */
      Roles.find(function (err, roles) {
        if (err) {
          throw err;
        }
        roles.forEach(function (role, index, array) {
          userArray.forEach(function (user, index, array) {
            if (user.level === role.level) {
              User.update({
                username: user.username
              }, {
                role: role._id
              }, function (err, dbUser) {
                if (err) {
                  throw err;
                }
              });
            }
          });
        });
      });
    });

    var registerUser = function (user, expectedStatus, done) {
      request(app)
        .post(url_register)
        .send({
          'username': user.username,
          'firstname': user.firstname,
          'lastname': user.lastname,
          'password': test_user_password
        })
        .expect('Content-Type', /json/)
        .expect(expectedStatus)
        .end(done);
    };

    userArray.forEach(function(user, index, array) {
      it('register user ' + user.username, function (done) {
        registerUser(user, Consts.HTTP_CREATED, done);
      });
    });
    
    it('register existing user', function (done) {
      registerUser(userArray[0], Consts.HTTP_CONFLICT, done);
    });

    // register user for delete test 
    it('register user to delete', function (done) {
      registerUser(userToDelete, Consts.HTTP_CREATED, done);
    });
  });
}

/*
 * Login to server
 * @param {string} username   - login username
 * @param {string} password   - login password
 * @param {number} expectedStatus - expected response status
 * @param {function} cb       - function to call on finish
 */
function loginUser (username, password, expectedStatus, cb) {
  request(app)
    .post(url_login)
    .send({username: username, password: password})
    .expect(expectedStatus)
    .expect('Content-Type', /json/)
    .end(function (err, res) {
      if (err) {
        throw err;
      }
      cb(res);
    });
}

/*
 * Logout of server
 * @param {string} token      - token of user to logout
 * @param {number} expectedStatus - expected response status
 * @param {function} cb       - function to call on finish
 */
function logoutUser (token, expectedStatus, cb) {
  request(app)
    .get(url_logout)
    .set('x-access-token', token)
    .expect(expectedStatus)
    .expect('Content-Type', /json/)
    .end(function (err, res) {
      if (err) {
        throw err;
      }
      cb(res);
    });
}

/*
  * Login to server
  * @param {string} username   - login username
  * @param {string} password   - login password
  * @param {function} cb       - function to call on successful login
  */
function login (username, password, cb) {
  loginUser (username, password, Consts.HTTP_OK, cb);
}

/*
  * Login to server
  * @param {integer} index     - test user to use; one of users_fixture.userIndices.xxx_USER
  * @param {function} cb       - function to call on successful login
  */
function loginIndex (index, cb) {
  var user = getUser(index),
    username = user.username,
    password = getPassword(index);
  login(username, password, function (res) {
    user.token = res.body.token;  // save token for later tests
    cb(res);
  });
}

/* Login the test users */
function loginUsers() {
  describe('Login/logout User API - ', function () {
    // before(function () {});
    // after(function () {});
    // beforeEach(function () {});
    // afterEach(function () {});

    userArray.forEach(function(user, index, array) {
      it('login user ' + user.username, function (done) {
        loginUser (user.username, test_user_password, Consts.HTTP_OK, function (res) {
          user.token = res.body.token;  // save token for later tests
          done();
        });
      });
      it('logout user ' + user.username, function (done) {
        logoutUser (user.token, Consts.HTTP_OK, function (res) {
          user.token = '';
          done();
        });
      });
    });
    
    it('login incorrect password', function (done) {
      loginUser (userArray[0].username, test_user_password + 'x', Consts.HTTP_UNAUTHORISED, function (res) {
        done();
      });
    });

  });
}

/* Test access to users */
function testUserAccess() {
  describe('Access levels ' + testConsts.url_test, function () {
    
    before(function () {
      // make sure role ids are set
      Roles.find(function (err, roles) {
        if (err) {
          throw err;
        }
        roles.forEach(function (role, index, array) {
          userArray.forEach(function (user, index, array) {
            if (user.level === role.level) {
              user.role = role._id; // save role to local object
            }
          });
        });
      });
    });
    // after(function () {});
    // beforeEach(function () {});
    // afterEach(function () {});

    var getTest = function (access_url, token, expectedStatus, cb) {
      request(app)
        .get(access_url)
        .set('x-access-token', token)
        .expect(expectedStatus)
        .end(function (err, res) {
          if (err) {
            throw err;
          }
          cb(res);
        });
    };

    // test the 'is' verification
    userIndicesArray.forEach(function (userIdx, index, array) {
      var user = getUser(userIdx);
      it(user.username + ' is ' + user.testname, function (done) {
        loginIndex(userIdx, function (res) {
          getTest(url_test_is(user.testname), res.body.token, Consts.HTTP_OK, function (res) {
            done();
          });
        });
      });
    });

    // test the 'has access' verification
    userIndicesArray.forEach(function (userIdx, index, array) {
      var user = getUser(userIdx);
      userIndicesArray.forEach(function (hasIdx, index, array) {
        var hasAccess = getUser(hasIdx);
        var expectedStatus = Consts.HTTP_OK;
        if (hasIdx < userIdx) {
          expectedStatus = Consts.HTTP_FORBIDDEN;
        }
        it(user.username + ' has ' + hasAccess.testname, function (done) {
          getTest(url_test_has(hasAccess.testname), user.token, expectedStatus, function (res) {
            done();
          });
        });
      });
    });
  });

  describe('Access to ' + url, function () {
    
    var adminIdx = userIndices.USER_ADMIN;
    var admin = getUser(adminIdx);
    
    before(function () {
      // make sure user ids are set
      User.find(function (err, users) {
        if (err) {
          throw err;
        }
        users.forEach(function (user, index, array) {
          var testUser = utils.find(userArray, function (toTest) {
            return (toTest.username === user.username);
          });
          if (testUser != null) {
            testUser._id = user._id;
          } else if (userToDelete.username === user.username) {
            userToDelete._id = user._id;
          }
        });
      });
    });
    // after(function () {});
    // beforeEach(function () {});
    // afterEach(function () {});

    var getUsers = function (token, expectedStatus, cb) {
      request(app)
        .get(url)
        .set('x-access-token', token)
        .expect('Content-Type', /json/)
        .expect(expectedStatus)
        .end(function (err, res) {
          if (err) {
            throw err;
          }
          cb(res);
        });
    };

    var getUserById = function (id, token, expectedStatus, cb) {
      request(app)
        .get(url_id(id))
        .set('x-access-token', token)
        .expect('Content-Type', /json/)
        .expect(expectedStatus)
        .end(function (err, res) {
          if (err) {
            throw err;
          }
          cb(res);
        });
    };

    var putUserById = function (id, update, token, expectedStatus, cb) {
      request(app)
        .put(url_id(id))
        .send(update)
        .set('x-access-token', token)
        .expect('Content-Type', /json/)
        .expect(expectedStatus)
        .end(function (err, res) {
          if (err) {
            throw err;
          }
          cb(res);
        });
    };

    var deleteUser = function (id, token, expectedStatus, cb) {
      request(app)
        .delete(url_id(id))
        .set('x-access-token', token)
        .expect('Content-Type', /json/)
        .expect(expectedStatus)
        .end(function (err, res) {
          if (err) {
            throw err;
          }
          cb(res);
        });
    };

    it('returns all users when authenticated as admin', function (done) {
      loginIndex(adminIdx, function (res) {
        getUsers(admin.token, Consts.HTTP_OK, function (res) {
          assert.isAtLeast(res.body.length, userArray.length, 'response contains less than the number of test users');
          
          var matched = 0;
          userArray.forEach(function (user, index, array) {
            var dbUser = utils.find(res.body, function (toTest) {
              return (toTest.username === user.username);
            });
            if (utils.testEquality(user, dbUser, replyCheckProps)) {
              ++matched;
            }
          });
          assert.equal(matched, userArray.length, 'not all test users matched');

          done();
        });
      });
    });

    userIndicesArray.forEach(function (userIdx, index, array) {
      if (userIdx != userIndices.USER_ADMIN) {
        it('is forbidden when authenticated as ' + getUser(userIdx).username, function (done) {
          loginIndex(userIdx, function (res) {
            getUsers(res.body.token, Consts.HTTP_FORBIDDEN, function (res) {
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
    
    // test read access to /user/id for admin
    userIndicesArray.forEach(function (userIdx, index, array) {
      var user = getUser(userIdx);
      it('returns ' + user.username + ' details by id when authenticated as admin', function (done) {
        getUserById(user._id, admin.token, Consts.HTTP_OK, function (res) {
          assert.ok(utils.testEquality(user, res.body, replyCheckProps));
          done();
        });
      });
    });

    // test read access to /user/id for individual users
    userIndicesArray.forEach(function (userIdx, index, array) {
      var user = getUser(userIdx);
      userIndicesArray.forEach(function (otherIdx, index, array) {
        var other = getUser(otherIdx);
        if (userIdx === otherIdx) {
          it('returns ' + user.username + ' details by id when authenticated as ' + user.username,
            function (done) {
              getUserById(user._id, other.token, Consts.HTTP_OK, function (res) {
                assert.ok(utils.testEquality(user, res.body, replyCheckProps));
                done();
              });
            });
        } else if (otherIdx != userIndices.USER_ADMIN) {  // skip admin as has access to everything
          it('returns "forbidden" by id when authenticated as ' + other.username,
            function (done) {
              getUserById(user._id, other.token, Consts.HTTP_FORBIDDEN, function (res) {
                done();
              });
            });
        }
      });
    });
    
    // test update access to /user/id for individual users
    userIndicesArray.forEach(function (userIdx, index, array) {
      var user = getUser(userIdx);
      userIndicesArray.forEach(function (otherIdx, index, array) {
        var other = getUser(otherIdx);
        var update = {'lastname': user.lastname + ' ' + userIdx};
        if (userIdx === otherIdx) {
          it('updates ' + user.username + ' details by id when authenticated as ' + user.username,
            function (done) {
              putUserById(user._id, update, other.token, Consts.HTTP_OK, function (res) {
                assert.ok(utils.testEquality(user, res.body, replyCheckProps));
                assert.equal(update.lastname, res.body.person.lastname);
                done();
              });
            });
        } else if (otherIdx != userIndices.USER_ADMIN) {  // skip admin as has access to everything
          it('returns "forbidden" by id when authenticated as ' + other.username,
            function (done) {
              putUserById(user._id, update, other.token, Consts.HTTP_FORBIDDEN, function (res) {
                done();
              });
            });
        }
      });
    });

    // test update access to /user/id for admin
    userIndicesArray.forEach(function (userIdx, index, array) {
      var user = getUser(userIdx);
      it('updates ' + user.username + ' details by id when authenticated as admin', function (done) {
        var update = {'lastname': user.lastname};
        putUserById(user._id, update, admin.token, Consts.HTTP_OK, function (res) {
          assert.ok(utils.testEquality(user, res.body, replyCheckProps));
          done();
        });
      });
    });

    // test user deletion by self
    it('delete user ' + userToDelete.username + ' returns "forbidden" when authenticated as ' + userToDelete.username, function (done) {
      loginUser (userToDelete.username, test_user_password, Consts.HTTP_OK, function (res) {
        userToDelete.token = res.body.token;  // save token for later tests
        
        deleteUser(userToDelete._id, userToDelete.token, Consts.HTTP_FORBIDDEN, 
          function (res) {
            done();
          });
      });
    });

    // test user deletion by other users
    // use a reverse order copy of the array
    var userIndicesArrayRev = Array.prototype.slice.call(userIndicesArray);
    userIndicesArrayRev.reverse();
    userIndicesArrayRev.forEach(function (userIdx, index, array) {
      // NOTE in reverse order as admin should succeed
      var user = getUser(userIndices.USER_PUBLIC - userIdx);
      if (user.level != Consts.ROLE_ADMIN) {
        it('delete user ' + userToDelete.username + ' returns "forbidden" when authenticated as ' + user.testname, function (done) {
          deleteUser(userToDelete._id, user.token, Consts.HTTP_FORBIDDEN, function (res) {
            done();
          });
        });
      } else {
        it('delete user ' + userToDelete.username + ' successful when authenticated as ' + user.testname, function (done) {
          deleteUser(userToDelete._id, user.token, Consts.HTTP_OK, function (res) {
            done();
          });
        });
      }
    });


  });
}

/* Test user creation */
function createUsers() {
  describe('Create User API', function () {
    // before('Remove existing test users', function () {});
    // after(function () {});
    // beforeEach(function (done) {});
    // afterEach('Assign correct test user roles', function () {});

    var createUser = function (user, expectedStatus, done) {
      request(app)
        .post(url_create)
        .set('x-access-token', user.token)
        .send({
          'username': user.username + test_username_postfix,
          'firstname': user.firstname,
          'lastname': user.lastname,
          'password': test_user_password,
          'role': user.role
        })
        .expect('Content-Type', /json/)
        .expect(expectedStatus)
        .end(done);
    };

    userArray.forEach(function(user, index, array) {
      it('create user as ' + user.testname, function (done) {
        loginUser (user.username, test_user_password, Consts.HTTP_OK, function (res) {
          user.token = res.body.token;  // save token for later tests
          if (user.level == Consts.ROLE_ADMIN) {
            createUser(user, Consts.HTTP_CREATED, done);
          } else {
            createUser(user, Consts.HTTP_FORBIDDEN, done);
          }
        });
      });
    });
  });
}


function runTestSuite () {
  registerUsers();
  loginUsers();
  testUserAccess();
  createUsers();
}

module.exports = {
  login: login,
  loginIndex: loginIndex,
  runTestSuite: runTestSuite
};

