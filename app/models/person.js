/*jslint node: true */
'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  ModelNodeModule = require('./modelNode'),
    ModelNode = ModelNodeModule.ModelNode,
  ContactDetailsModule = require('./contactDetails'),
    ContactDetailsModel = ContactDetailsModule.model, 
  AddressModule = require('./addresses'),
    AddressModel = AddressModule.model,
  utilsModule = require('../misc/utils'),
    utilsIsValidModelPath = utilsModule.isValidModelPath,
    getUtilsTemplate = utilsModule.getTemplate,
    getModelPathNames = utilsModule.getModelPathNames,
  populateSubDocsUtil = require('./model_utils').populateSubDocs;

var schema = new Schema({
  firstname: {
    type: String,
    required: true,
    default: ''
  },
  lastname: {
    type: String,
    required: true,
    default: ''
  },
  note: {
    type: String,
    default: ''
  },
  address: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address'
  },
  contactDetails: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ContactDetails'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId
  }
}, {
  timestamps: true
});

schema.methods.getName = function () {
  return (this.firstname + ' ' + this.lastname);
};

// create a model using schema
var model = mongoose.model('Person', schema);

var modelNode = new ModelNode(model, { populateSubDocs: populateSubDocs });
modelNode.addChildBranch(ContactDetailsModule.getModelNodeTree(), 'contactDetails');
modelNode.addChildBranch(AddressModule.getModelNodeTree(), 'address');

var modelTree = modelNode.getTree();

/**
 * Generates a person template object from the specified source
 * @param{object} source      - object with properties to extract
 * @param {string[]} exPaths  - array of other paths to exclude
 */
function getTemplate (source, exPaths) {
  // set defaults for arguments not passed
  if (!exPaths) {
    // exclude object ref fields by default
    exPaths = ['address', 'contactDetails', 'owner'];
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
    { path: 'address', model: 'Address' },
    { path: 'contactDetails', model: 'ContactDetails' }
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