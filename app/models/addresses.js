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
    default: ''
  },
  votingDistrict: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VotingDistrict'
  },
  owner: {
      type: mongoose.Schema.Types.ObjectId
  }

}, {
  timestamps: true
});

// create a model using schema
var model = mongoose.model('Address', schema);

var modelNode = new ModelNode(model, populateSubDocs);
// TODO ignoring votingDistrict for now

var modelTree = modelNode.getTree();

/*
 * Generates an address template object from the specified source
 * @param{object} source      - object with properties to extract
 * @param {string[]} exPaths  - array of other paths to exclude
 */
function getTemplate (source, exPaths) {
  // set defaults for arguments not passed
  if (!exPaths) {
    // exclude object ref fields by default
    exPaths = ['votingDistrict', 'owner'];
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
  return utilsIsValidModelPath(modelNode, path, exPaths);
}


function getSubDocPopulateOptions () {
  return [];
}

function getModelNodeTree () {
  return modelNode;
}

function populateSubDocs (docs, next) {
  var options = getSubDocPopulateOptions();
  if (options.length > 0) {
    model.populate(docs, options, function (err, docs) {
      next(err, docs);
    });
  } else {
    next(err, docs);
  }
}


module.exports = {
  schema: schema,
  model: model,
  modelNode: modelNode,
  getTemplate: getTemplate,
  isValidModelPath: isValidModelPath,
  getSubDocPopulateOptions: getSubDocPopulateOptions,
  getModelNodeTree: getModelNodeTree,
  populateSubDocs: populateSubDocs
};