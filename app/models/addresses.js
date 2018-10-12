/*jslint node: true */ /*eslint-env node*/
'use strict';

// grab the things we need
var mongoose = require('./mongoose_app').mongoose,
  Schema = mongoose.Schema,
  ModelNodeModule = require('./modelNode'),
  ModelNode = ModelNodeModule.ModelNode,
  utilsModule = require('../misc/utils'),
  utilsIsValidModelPath = utilsModule.isValidModelPath,
  utilsGetTemplate = utilsModule.getTemplate,
  modelUtilsModule = require('./model_utils'),
  getSchemaOptions = modelUtilsModule.getSchemaOptions,
  OPT_TIMESTAMP = modelUtilsModule.OPT_TIMESTAMP,
  populateSubDocsUtil = modelUtilsModule.populateSubDocs;

// create the address schema
var schema = new Schema({
  addrLine1: {
    type: String,
    default: ''
  },
  addrLine2: {
    type: String,
    default: ''
  },
  addrLine3: {
    type: String,
    default: ''
  },
  town: {
    type: String,
    default: ''
  },
  city: {
    type: String,
    default: ''
  },
  county: {
    type: String,
    default: ''
  },
  state: {
    type: String,
    default: ''
  },
  country: {
    type: String,
    default: ''
  },
  postcode: {
    type: String,
    default: ''
  },
  gps: {
    type: String,
    default: ''       // Decimal degrees (DD), latitude, longitude: e.g. 41.40338, 2.17403
  },
  votingDistrict: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VotingDistrict'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId
  }
}, getSchemaOptions(OPT_TIMESTAMP));

// create a model using schema
var model = mongoose.model('Address', schema);

var modelNode = new ModelNode(model, { populateSubDocs: populateSubDocs });
// TODO ignoring votingDistrict for now

var modelTree = modelNode.getTree();

/**
 * Generates an address template object from the specified source
 * @param {object} source     - object with properties to extract
 * @param {string[]} exPaths  - array of other paths to exclude
 */
function getTemplate (source, exPaths) {
  // set defaults for arguments not passed
  if (!exPaths) {
    // exclude object ref fields by default
    exPaths = ['votingDistrict', 'owner'];
  }
  return utilsGetTemplate(source, model, exPaths);
}

/**
 * Generates a list of model properties & their types
 * @param {object} options - options object with the following properties:
 *                           @see utils.excludePath() for details
 */
function getModelPathTypes (options) {
  return modelNode.getModelPathTypes(options);
}

/**
 * Check if a path is valid for this model
 * @param {string} path       - path to check
 * @param {string[]} exPaths  - array of paths to exclude
 * @param {boolean} checkSub  - check sub documents flag
 * @returns false or ModelNode if valid path 
 */
function isValidModelPath (path, exPaths, checkSub) {
  checkSub = checkSub || false;

  var modelNodes;
  if (checkSub) {
    modelNodes = modelTree;
  } else {
    modelNodes = modelNode;
  }
  return utilsIsValidModelPath(modelNodes, path, exPaths);
}

/**
 * Get the subdocument populate options
 * @returns an array of populate objects of the form:
 *  @param {string} path       - path to subdocument
 *  @param {string} model      - name of subdocument model
 *  @param {function} populate - function to populate subdocument
 */
function getSubDocPopulateOptions () {
  return [];
}

/**
 * Get the root of the ModelNode tree for this model
 * @returns {object} root of ModelNode tree
 */
function getModelNodeTree () {
  return modelNode;
}

/**
 * Populate the subdocuments in a result set
 * @param {Array} docs    - documents to populate
 * @param {function} next - next function
 */
function populateSubDocs (docs, next) {
  populateSubDocsUtil(model, docs, getSubDocPopulateOptions(), next);
}


module.exports = {
  schema: schema,
  model: model,
  getTemplate: getTemplate,
  isValidModelPath: isValidModelPath,
  getModelPathTypes: getModelPathTypes,
  getSubDocPopulateOptions: getSubDocPopulateOptions,
  getModelNodeTree: getModelNodeTree,
  populateSubDocs: populateSubDocs
};