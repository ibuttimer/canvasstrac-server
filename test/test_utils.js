/*jslint node: true */ /*eslint-env node*/
'use strict';

var testConsts = require('./test_consts'),
  app_path = testConsts.app_path,
  request = require('supertest'),
  // assert = require('assert'),
  chai = require('chai'),
  assert = chai.assert,
  app = require(app_path + 'app');

var testUsersData = require('./test_users_data'),
  // some convenience variables
  userIndicesArray = testUsersData.userIndicesArray,
  USER_ADMIN = testUsersData.userIndices.USER_ADMIN,
  USER_MANAGER = testUsersData.userIndices.USER_MANAGER,
  USER_GROUP_LEAD = testUsersData.userIndices.USER_GROUP_LEAD,
  USER_STAFF = testUsersData.userIndices.USER_STAFF,
  USER_CANVASSER = testUsersData.userIndices.USER_CANVASSER;
  // USER_PUBLIC = testUsersData.userIndices.USER_PUBLIC;

var utils = require(app_path + 'misc/utils'),
  errorService = require(app_path + 'services/errorService'),
  // config = require(app_path + 'config'),
  Consts = require(app_path + 'consts');


/*
 * Data
 */
var access_rules = [];
/* rule template is:
  { url: url to use, 
    access: array of testUsersData.userIndices allowed access,
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
}

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
}

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
}

/**
 * Get an error object
 * @param {number} appCode  Application error code to get error object for
 * @param {string} name     Name of application error code
 */
function getAppError(appCode, name) {
  var opErr = errorService.getError(appCode);
  assert.isNotNull(opErr, 'Error object not found: ' + name);
  return opErr;
}

/**
 * Assert that a http response matches an application error object
 * @param {object} serviceErr Application error object
 * @param {object} res        Http response
 */
function assertAppError(serviceErr, res) {
  assert.equal(res.body.error.status, serviceErr.status, 'Incorrect status');
  assert.equal(res.body.error.appCode, serviceErr.appCode, 'Incorrect appCode');
  assert.equal(res.body.message, serviceErr.message, 'Incorrect message');
}



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
    });
    return towns;
  },
  testCities: function () {
    var cities = [];
    userIndicesArray.forEach(function (index) {
      cities.push('City ' + index);
    });
    return cities;
  },
  testCounties: function () {
    var counties = [];
    userIndicesArray.forEach(function (index) {
      counties.push('County ' + index);
    });
    return counties;
  },
  getAppError: getAppError,
  assertAppError: assertAppError
};

module.exports = self;
