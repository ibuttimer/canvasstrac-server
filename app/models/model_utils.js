/*jslint node: true */ /*eslint-env node*/
'use strict';

var utils = require('../misc/utils'),

  V3_6_X = '3.6.x',

  OPT_NONE = 0,
  OPT_TIMESTAMP = 0x01;

/**
 * Populate the subdocuments in a result set
 * @param {object} model  - mongoose model
 * @param {Array} docs    - documents to populate
 * @param {Array} options - subdocument populate options
 * @param {function} next - next function
 */
function populateSubDocs (model, docs, options, next) {
  
  if (options.length > 0) {
    model.populate(docs, options, function (err, docs) {
      next(err, docs);
    });
  } else {
    next(null, docs);
  }
}

/**
 * Get mongoose connection options object
 * @returns Options object
 */
function dbVersionTest() {
  // MongoDB Server 3.6.x: mongoose 5.x, or ^4.11.0 with useMongoClient and usePushEach
  return utils.dbVersionTest(V3_6_X, utils.OPS.GT_EQ);
}

/**
 * Get mongoose connection options object
 * @returns Options object
 */
function getMongooseOptions() {
  var options = {};
  if (dbVersionTest()) {
    // MongoDB Server 3.6.x: mongoose 5.x, or ^4.11.0 with useMongoClient and usePushEach
    options.useMongoClient = true;
  }
  return options;
}

/**
 * Get a schema options object
 * @param {Number} flags Options mask
 * @returns Options object
 */
function getSchemaOptions(flags) {
  var options = {};
  if ((flags & OPT_TIMESTAMP) === OPT_TIMESTAMP) {
    options.timestamps = true;
  }
  if (dbVersionTest()) {
    // MongoDB Server 3.6.x: mongoose 5.x, or ^4.11.0 with useMongoClient and usePushEach
    options.usePushEach = true;
  }
  return options;
}


module.exports = {
  populateSubDocs: populateSubDocs,
  getMongooseOptions: getMongooseOptions,
  getSchemaOptions: getSchemaOptions,
  OPT_NONE: OPT_NONE,
  OPT_TIMESTAMP: OPT_TIMESTAMP
};
