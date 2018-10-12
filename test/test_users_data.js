/*jslint node: true */ /*eslint-env node,mocha*/
'use strict';

var testConsts = require('./test_consts'),
  app_path = testConsts.app_path,
  Consts = require(app_path + 'consts');

/*
 * Data
 */
var userIndices = {
  USER_ADMIN: 0,
  USER_MANAGER: 1,
  USER_GROUP_LEAD: 2,
  USER_STAFF: 3,
  USER_CANVASSER: 4,
  USER_PUBLIC: 5
};
var userIndicesArray = [0, 1, 2, 3, 4, 5];

function userIndicesArrayRev () {
  var array = Array.prototype.slice.call(userIndicesArray);
  return array.reverse();
}

function isValidUser (index) {
  if ((index >= userIndices.USER_ADMIN) && (index <= userIndices.USER_PUBLIC)) {
    return true;
  } else {
    return false;
  }
}

function getUser (index) {
  if (isValidUser(index)) {
    return userArray[index];
  } else {
    throw new RangeError('Unknown user: index out of bounds ' + index);
  }
}

function getPassword (index) {
  if (isValidUser(index)) {
    return test_user_password;  // all the same
  } else {
    throw new RangeError('Unknown user: index out of bounds ' + index);
  }
}
  
var test_username_prefix = 'test-';
var test_username_regex = /^test-/;
var test_user_password = 'password';
var userArray = [
  {
    'testname': 'admin',
    'level': Consts.ROLE_ADMIN,
    'username': test_username_prefix + 'admin',
    'firstname': 'Admin',
    'lastname': 'Test',
    'token': '',
    'role': '',
    '_id': ''
  },
  {
    'testname': 'manager',
    'level': Consts.ROLE_MANAGER,
    'username': test_username_prefix + 'manager',
    'firstname': 'Manager',
    'lastname': 'Test',
    'token': '',
    'role': '',
    '_id': ''
  },
  {
    'testname': 'grouplead',
    'level': Consts.ROLE_GROUP_LEAD,
    'username': test_username_prefix + 'grouplead',
    'firstname': 'Group',
    'lastname': 'Test',
    'token': '',
    'role': '',
    '_id': ''
  },
  {
    'testname': 'staff',
    'level': Consts.ROLE_STAFF,
    'username': test_username_prefix + 'staff',
    'firstname': 'Staff',
    'lastname': 'Test',
    'token': '',
    'role': '',
    '_id': ''
  },
  {
    'testname': 'canvasser',
    'level': Consts.ROLE_CANVASSER,
    'username': test_username_prefix + 'canvasser',
    'firstname': 'Canvasser',
    'lastname': 'Test',
    'token': '',
    'role': '',
    '_id': ''
  },
  {
    'testname': 'public',
    'username': test_username_prefix + 'public',
    'firstname': 'Public',
    'lastname': 'Test',
    'level': Consts.ROLE_NONE,
    'token': '',
    'role': '',
    '_id': ''
  },
];
var userToDelete =  {
  'testname': 'delete',
  'username': test_username_prefix + 'delete',
  'firstname': 'To Delete',
  'lastname': 'Test',
  'level': Consts.ROLE_NONE,
  'token': '',
  'role': '',
  '_id': ''
};


module.exports = {
  userIndices: userIndices,
  userIndicesArray: userIndicesArray,
  userIndicesArrayRev: userIndicesArrayRev,
  isValidUser: isValidUser,
  getUser: getUser,
  getPassword: getPassword,
  userToDelete: userToDelete,
  test_username_regex: test_username_regex,
  test_user_password: test_user_password,
  userArray: userArray
};
