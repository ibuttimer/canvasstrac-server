/*jslint node: true */
'use strict';

// grab the things we need
var mongoose = require('./mongoose_app').mongoose,
  Schema = mongoose.Schema,
  ModelNodeModule = require('./modelNode'),
    ModelNode = ModelNodeModule.ModelNode,
  QuestionModule = require('./question'),
    QuestionModel = QuestionModule.model,
  utilsModule = require('../misc/utils'),
    utilsIsValidModelPath = utilsModule.isValidModelPath,
    utilsGetTemplate = utilsModule.getTemplate,
  questionPopulateOptions = require('./question').getSubDocPopulateOptions,
  populateSubDocsUtil = require('./model_utils').populateSubDocs;

// create the address schema
var schema = new Schema({
  answer: {
    type: String,
    required: true
  },
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  }
}, {
  timestamps: true
});

// create a model using schema
var model = mongoose.model('Answer', schema);

var modelNode = new ModelNode(model, { populateSubDocs: populateSubDocs });
modelNode.addChildBranch(QuestionModule.getModelNodeTree(), 'question');

var modelTree = modelNode.getTree();

/**
 * Generates an answer template object from the specified source
 * @param {object} source     - object with properties to extract
 * @param {string[]} exPaths  - array of other paths to exclude
 */
function getTemplate (source, exPaths) {
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
  return [
    { path: 'question', model: 'Question', populate: questionPopulateOptions() }
  ];
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
  getSubDocPopulateOptions: getSubDocPopulateOptions,
  getModelNodeTree: getModelNodeTree,
  populateSubDocs: populateSubDocs
};