/*jslint node: true */
'use strict';

// grab the things we need
var mongoose = require('./mongoose_app').mongoose,
  Schema = mongoose.Schema,
  ModelNodeModule = require('./modelNode'),
    ModelNode = ModelNodeModule.ModelNode,
  utilsModule = require('../misc/utils'),
    utilsIsValidModelPath = utilsModule.isValidModelPath,
    utilsGetTemplate = utilsModule.getTemplate,
  populateSubDocsUtil = require('./model_utils').populateSubDocs;

// create the address schema
var INFO_MSG = 1,
  WARN_MSG = 2,
  CRITICAL_MSG = 3,
  schema = new Schema({
    level: {
      type: Number,
      required: true,
      default: INFO_MSG
    },
    title: {
      type: String,
      required: true,
      default: ''
    },
    message: {
      type: String,
      required: true,
      default: ''
    },
    fromDate: {
      type: Date,
      required: true,
      default: ''
    },
    toDate: {
      type: Date,
      required: true,
      default: ''
    }
  }, {
    timestamps: true
  });

// create a model using schema
var model = mongoose.model('Notice', schema);

var modelNode = new ModelNode(model, { populateSubDocs: populateSubDocs });

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
    exPaths = [];
  }
  return utilsGetTemplate(source, model, exPaths);
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
  INFO_MSG: INFO_MSG,
  WARN_MSG: WARN_MSG,
  CRITICAL_MSG: CRITICAL_MSG,
  getTemplate: getTemplate,
  isValidModelPath: isValidModelPath,
  getSubDocPopulateOptions: getSubDocPopulateOptions,
  getModelNodeTree: getModelNodeTree,
  populateSubDocs: populateSubDocs
};