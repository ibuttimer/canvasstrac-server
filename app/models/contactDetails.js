/*jslint node: true */
'use strict';

// grab the things we need
var mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  ModelNodeModule = require('./modelNode'),
    ModelNode = ModelNodeModule.ModelNode,
  utilsModule = require('../misc/utils'),
    utilsIsValidModelPath = utilsModule.isValidModelPath,
    getModelPathNames = utilsModule.getModelPathNames,
    getUtilsTemplate = utilsModule.getTemplate;

// create the address schema
var schema = new Schema({
  phone: {
    type: String
  },
  mobile: {
    type: String
  },
  email: {
    type: String
  },
  website: {
    type: String
  },
  facebook: {
    type: String
  },
  twitter: {
    type: String
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId
  }
}, {
  timestamps: true
});

// create a model using schema
// make this available to our Node applications
var model = mongoose.model('ContactDetails', schema);

var modelNode = new ModelNode(model);

var modelTree = modelNode.getTree();

/*
 * Generates a contactDetails template object from the specified source
 * @param{object} source - object with properties to extract
 */
function getTemplate (source) {
  return getUtilsTemplate(source, model);
}

/*
 * Check if a path is valid for this model
 * @param{string} path        - path to check
 * @param {string[]} exPaths  - array of paths to exclude
 * @param {boolean} checkSub  - check sub documents flag
 * @returns false or ModelNode if valid path 
 */
function isValidModelPath (path, exPaths, checkSub) {
  return utilsIsValidModelPath(modelNode, path, exPaths);
}

function getModelNodeTree () {
  return modelNode;
}




module.exports = {
  schema: schema,
  model: model,
  modelNode: modelNode,
  getTemplate: getTemplate,
  getModelNodeTree: getModelNodeTree,
  isValidModelPath: isValidModelPath 
};