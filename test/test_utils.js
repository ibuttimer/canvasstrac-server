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

var test_users = require('./test_users');
// some convenience variables
var userIndicesArray = test_users.userIndicesArray,
    USER_ADMIN = test_users.userIndices.USER_ADMIN,
    USER_MANAGER = test_users.userIndices.USER_MANAGER,
    USER_GROUP_LEAD = test_users.userIndices.USER_GROUP_LEAD,
    USER_STAFF = test_users.userIndices.USER_STAFF,
    USER_CANVASSER = test_users.userIndices.USER_CANVASSER,
    USER_PUBLIC = test_users.userIndices.USER_PUBLIC;

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

var access_rules = [];
/* rule template is:
  { url: url to use, 
    access: array of test_users.userIndices allowed access,
    op: the specific CRUD operation access is allowed for, e.g. 'crud' }
    */
function addAccessRule (url, userArray, op) {
  access_rules.push( { url: url.toLowerCase(), access: userArray, op: op.toLowerCase()});
}

function getExpectedStatus (userIdx, url, op) {
  var srchUrl = url.toLowerCase();
  var srchOp = op.toLowerCase();
  var expectedStatus = Consts.HTTP_FORBIDDEN;
  // get filtered list of rules that match url & op
  var filtered = access_rules.filter(function (value) {
    return ((value.url === srchUrl) && (value.op.indexOf(srchOp) >= 0));
  });
  if (filtered.length > 0) {
    // check each rule for match
    filtered.forEach(function (rule, index, array) {
      if (rule.access.indexOf(userIdx) >= 0) {
        expectedStatus = Consts.HTTP_OK;
      }
    });
  }
  return expectedStatus;
}


function doIdentReplace (obj, regex, ident) {
  var result;
  if (typeof obj === 'string') {
    result = obj.replace(regex, ident);
  } else {
    result = obj;
  }
  return result;
}

/*
 * Make an object 
 * @param{object} template  - template to generate object based on
 * @param{string[]} exclude - array of names of template properties to exclude from generated object
 * @param{string} regex     - regular expression to identify replacable text
 * @param{string} ident     - text to replace text identified by regex
 */
function makeObjectDetails (template, exclude, regex, ident) {
  // generate details with ident to differentiate it
  var objDetails = utils.cloneObject(template, exclude, false);
  Object.getOwnPropertyNames(objDetails).forEach(function (name, index, array) {
    if (Array.isArray(objDetails[name])) {
      objDetails[name].forEach(function (item, index, array) {
        item = doIdentReplace(item, regex, ident);
      });
    } else {
      objDetails[name] = doIdentReplace(objDetails[name], regex, ident);
    }
  });
  return objDetails;
}

/*
 * Execute a GET test
 * @param{string} url             - url to GET
 * @param{string} token           - access token to use
 * @param{number} expectedStatus  - expected response status
 * @param{function} cb            - callback function to call with response
 */
function getEntry (url, token, expectedStatus, cb) {
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

/*
 * Execute a PUT test
 * @param{string} url             - url to PUT
 * @param{object} update          - data to update
 * @param{string} token           - access token to use
 * @param{number} expectedStatus  - expected response status
 * @param{function} cb            - callback function to call with response
 */
function putEntry (url, update, token, expectedStatus, cb) {
  request(app)
    .put(url)
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

/*
 * Execute a DELETE test
 * @param{string} url             - url to DELETE
 * @param{string} token           - access token to use
 * @param{number} expectedStatus  - expected response status
 * @param{function} cb            - callback function to call with response
 */
function deleteEntry (url, token, expectedStatus, cb) {
  request(app)
    .delete(url)
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



var self = {
  addAccessRule: addAccessRule,
  hasAdminAccess: [USER_ADMIN],
  hasManagerAccess: [USER_ADMIN, USER_MANAGER],
  hasGroupLeadAccess: [USER_ADMIN, USER_MANAGER, USER_GROUP_LEAD],
  hasStaffAccess: [USER_ADMIN, USER_MANAGER, USER_GROUP_LEAD, USER_STAFF],
  hasCanvasserAccess: [USER_ADMIN, USER_MANAGER, USER_GROUP_LEAD, USER_STAFF, USER_CANVASSER],
  hasPublicAccess: userIndicesArray,
  getExpectedStatus: getExpectedStatus,
  makeObjectDetails: makeObjectDetails,
  getEntry: getEntry,
  putEntry: putEntry,
  deleteEntry: deleteEntry,
  testTowns: function () {
    var towns = [];
    userIndicesArray.forEach(function (index) {
      towns.push('Test Town ' + index);
    })
    return towns;
  },
  testCities: function () {
    var cities = [];
    userIndicesArray.forEach(function (index) {
      cities.push('City ' + index);
    })
    return cities;
  },
  testCounties: function () {
    var counties = [];
    userIndicesArray.forEach(function (index) {
      counties.push('County ' + index);
    })
    return counties;
  }
};

module.exports = self;
