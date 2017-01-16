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
  AnswerModule = require('./answer'),
    answerPopulateOptions = AnswerModule.getSubDocPopulateOptions,
  UserModule = require('./user'),
    userPopulateOptions = UserModule.getSubDocPopulateOptions,
    userPopulateProjection = UserModule.getPopulateProjection,
  PersonModule = require('./person'),
    personPopulateOptions = PersonModule.getSubDocPopulateOptions,
  AddressModule = require('./addresses'),
    addressPopulateOptions = AddressModule.getSubDocPopulateOptions;

var schema = new Schema({
  available: {
    type: Boolean,
    default: false
  },
  dontCanvass: {
    type: Boolean,
    default: false
  },
  tryAgain: {
    type: Boolean,
    default: false
  },
  support: {
    type: Number,
    default: -1
  },
  date: {
    type: Date,
    default: Date.now
  },
  answers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Answer'
  }],
  canvasser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  voter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person'
  },
  address: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address'
  }
}, {
  timestamps: true
});

// create a model using schema
var model = mongoose.model('CanvassResult', schema);

var modelNode = new ModelNode(model, { populateSubDocs: populateSubDocs });

var modelTree = modelNode.getTree();

/*
 * Generates a canvass result template object from the specified source
 * @param{object} source      - object with properties to extract
 * @param {string[]} exPaths  - array of other paths to exclude
 */
function getTemplate (source, exPaths) {
  // set defaults for arguments not passed
  if (!exPaths) {
    // exclude object ref fields by default
    exPaths = ['canvass', 'answers', 'canvasser', 'voter', 'address'];
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
    { path: 'answers', model: 'Answer', populate: answerPopulateOptions() },
    { path: 'canvasser', model: 'User', populate: userPopulateOptions(), select: userPopulateProjection() },
    { path: 'voter', model: 'Person', populate: personPopulateOptions() },
    { path: 'address', model: 'Address', populate: addressPopulateOptions() }
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