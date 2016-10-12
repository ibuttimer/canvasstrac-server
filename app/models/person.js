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
    getModelPathNames = utilsModule.getModelPathNames;

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

var modelNode = new ModelNode(model, populateSubDocs);
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
 * @param{string} path        - path to check
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

function getSubDocPopulateOptions () {
  return [
    { path: 'address', model: 'Address' },
    { path: 'contactDetails', model: 'ContactDetails' }
  ];
}

function getModelNodeTree () {
  return modelNode;
}

function populateSubDocs (docs, next) {
  var options = getSubDocPopulateOptions();

  model.populate(docs, options, function (err, docs) {
    next(err, docs);
  });
}


module.exports = {
  schema: schema,
  model: model,
  modelNode: modelNode,
  getTemplate: getTemplate,
  getModelNodeTree: getModelNodeTree,
  isValidModelPath: isValidModelPath,
  getSubDocPopulateOptions: getSubDocPopulateOptions,
  populateSubDocs: populateSubDocs
};