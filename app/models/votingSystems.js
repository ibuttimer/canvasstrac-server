/*jslint node: true */
'use strict';

// grab the things we need
var mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  ModelNodeModule = require('./modelNode'),
    ModelNode = ModelNodeModule.ModelNode,
  utilsModule = require('../misc/utils'),
    utilsIsValidModelPath = utilsModule.isValidModelPath,
    getUtilsTemplate = utilsModule.getTemplate,
    getModelPathNames = utilsModule.getModelPathNames;
    
// create the address schema
var schema = new Schema({
  name: {
    type: String,
    required: true,
    default: ''
  },
  description: {
    type: String,
    required: true,
    default: ''
  },
  abbreviation: {
    type: String,
    required: true,
    default: ''
  },
  preferenceLevels: {
    type: Array,
    required: true,
    default: [] 
  }
}, {
  timestamps: true
});

// create a model using schema
var model = mongoose.model('VotingSystems', schema);

var modelNode = new ModelNode(model);

/**
 * Generates an voting system template object from the specified source
 * @param{object} source      - object with properties to extract
 * @param {string[]} exPaths  - array of other paths to exclude
 */
function getTemplate (source, exPaths) {
  return getUtilsTemplate(source, model, exPaths);
}

function getModelNodeTree () {
  return modelNode;
}

/**
 * Check if a path is valid for this model
 * @param{string} path        - path to check
 * @param {string[]} exPaths  - array of paths to exclude
 * @param {boolean} checkSub  - check sub documents flag
 * @returns false or ModelNode if valid path 
 */
function isValidModelPath (path, exPaths, checkSub) {
  return utilsIsValidModelPath(modelNode, path, exPaths);
}

module.exports = {
  schema: schema,
  model: model,
  getTemplate: getTemplate,
  getModelNodeTree: getModelNodeTree,
  isValidModelPath: isValidModelPath
};
