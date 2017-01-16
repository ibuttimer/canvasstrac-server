/*jslint node: true */
'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  ModelNodeModule = require('./modelNode'),
    ModelNode = ModelNodeModule.ModelNode,
  utilsModule = require('../misc/utils'),
    utilsIsValidModelPath = utilsModule.isValidModelPath,
    getUtilsTemplate = utilsModule.getTemplate,
    getModelPathNames = utilsModule.getModelPathNames,
  populateSubDocsUtil = require('./model_utils').populateSubDocs,
  ElectionModule = require('./election'),
    electionPopulateOptions = ElectionModule.getSubDocPopulateOptions,
  SurveyModule = require('./survey'),
    surveyPopulateOptions = SurveyModule.getSubDocPopulateOptions,
  UserModule = require('./user'),
    userPopulateOptions = UserModule.getSubDocPopulateOptions,
    userPopulateProjection = UserModule.getPopulateProjection,
  AddressModule = require('./addresses'),
    addressPopulateOptions = AddressModule.getSubDocPopulateOptions,
  CanvassResultModule = require('./canvassResult'),
    canvassResultPopulateOptions = CanvassResultModule.getSubDocPopulateOptions;

var schema = new Schema({
  name: {
    type: String,
    required: true,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: Date.now
  },
  election: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Election'
  },
  survey: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Survey'
  },
  addresses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address'
  }],
  canvassers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  results: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CanvassResult'
  }]
}, {
  timestamps: true
});

// create a model using schema
var model = mongoose.model('Canvass', schema);

var modelNode = new ModelNode(model, { populateSubDocs: populateSubDocs });

var modelTree = modelNode.getTree();

/*
 * Generates a canvass template object from the specified source
 * @param{object} source      - object with properties to extract
 * @param {string[]} exPaths  - array of other paths to exclude
 */
function getTemplate (source, exPaths) {
  // set defaults for arguments not passed
  if (!exPaths) {
    // exclude object ref fields by default
    exPaths = ['survey', 'addresses', 'canvassers', 'results'];
  }
  return getUtilsTemplate(source, model, exPaths);
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
    { path: 'election', model: 'Election', populate: electionPopulateOptions() },
    { path: 'survey', model: 'Survey', populate: surveyPopulateOptions() },
    { path: 'canvassers', model: 'User', populate: userPopulateOptions(), select: userPopulateProjection() },
    { path: 'addresses', model: 'Address', populate: addressPopulateOptions() },
    { path: 'results', model: 'CanvassResult', populate: canvassResultPopulateOptions() }
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