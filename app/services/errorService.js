/*jslint node: true */
'use strict';

/* This a a factory for application related errors to be returned to clients.
 * Server errors are handled using the standard throw new Error method
 */

var Consts = require('../consts'),
  cache = {},
  errors = [
    { message: 'You are not authenticated!',
      status: Consts.HTTP_UNAUTHORISED, appCode: Consts.APPERR_CANT_VERIFY_TOKEN },
    { message: 'Not logged in. Please login to continue.',
      status: Consts.HTTP_FORBIDDEN, appCode: Consts.APPERR_NO_TOKEN },
    { message: 'Session expired. Please login to continue.',
      status: Consts.HTTP_FORBIDDEN, appCode: Consts.APPERR_SESSION_EXPIRED },
    { message: 'Unknown role. You are not authorized to perform this operation!',
      status: Consts.HTTP_FORBIDDEN, appCode: Consts.APPERR_UNKNOWN_ROLE },
    { message: 'Unknown role.',
      status: Consts.HTTP_INTERNAL_ERROR, appCode: Consts.APPERR_UNKNOWN_ROLE_NTERNAL },
    { message: 'You are not authorized to perform this operation!',
      status: Consts.HTTP_FORBIDDEN, appCode: Consts.APPERR_ROLE_NOPRIVILEGES },
    { message: 'You are not authorized to perform this operation!',
      status: Consts.HTTP_FORBIDDEN, appCode: Consts.APPERR_USER_URL }
  ];

errors.sort(function (a, b) {
  return (a.appCode - b.appCode);
});

/**
 * Generate an app error object
 * @param {string} message Error message
 * @param {number} status Http status
 * @param {number} appCode Application error code
 */
function makeError (message, status, appCode) {
  var error = new Error(message);
  error.status = status;
  error.appCode = appCode;
  return error;
}

/**
 * Verify a JSON web token
 * @param{object} token   - token to verify
 * @param{object} res     - response
 * @param{function} next  - function to call with result
 */
function getError(appCode) {
  var error = cache[appCode];
  if (!error) {
    error = errors.find(function (err) {
      return (err.appCode === appCode);
    })
    if (error) {
      error = makeError(error.message, error.status, error.appCode);  
    } else {
      error = makeError('Error ' + appCode, Consts.HTTP_NOT_IMPLEMENTED, appCode);  
    }
    cache[appCode] = error;  
  }
  return error;
}

module.exports = {
  getError: getError
};


