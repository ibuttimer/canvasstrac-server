/*jslint node: true */
'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  ModelNodeModule = require('./modelNode'),
    ModelNode = ModelNodeModule.ModelNode,
  utilsModule = require('../misc/utils'),
    utilsIsValidModelPath = utilsModule.isValidModelPath,
    getUtilsTemplate = utilsModule.getTemplate,
  CanvassModule = require('./canvass'),
    canvassPopulateOptions = CanvassModule.getSubDocPopulateOptions,
  UserModule = require('./user'),
    userPopulateOptions = UserModule.getSubDocPopulateOptions,
  AddressModule = require('./addresses'),
    addressPopulateOptions = AddressModule.getSubDocPopulateOptions;

var schema = new Schema({
  canvass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Canvass'
  },
  canvasser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  addresses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address'
  }]
}, {
  timestamps: true
});

// create a model using schema
var model = mongoose.model('CanvassAssignment', schema);

var modelNode = new ModelNode(model, populateSubDocs);
modelNode.addChildBranch(UserModule.getModelNodeTree(), 'canvasser');
modelNode.addChildBranch(AddressModule.getModelNodeTree(), 'addresses');

var modelTree = modelNode.getTree();

modelTree.forEach(function (node) {
  console.log('model',node.model.modelName,'path',node.path);
  if (node.parent) {
    console.log('  parent',node.parent.model.modelName);
    if (node.parent.parent) {
      console.log('     parent',node.parent.parent.model.modelName);
      if (node.parent.parent.parent) {
        console.log('       parent',node.parent.parent.parent.model.modelName);
      }
    }
  }
});

/*
 * Generates an cavvass template object from the specified source
 * @param{object} source      - object with properties to extract
 * @param {string[]} exPaths  - array of other paths to exclude
 */
function getTemplate (source, exPaths) {
  // set defaults for arguments not passed
  if (!exPaths) {
    // exclude nothing by default
    exPaths = [];
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

function getModelNodeTree () {
  return modelNode;
}

function getSubDocPopulateOptions () {
  return [
    { path: 'canvass', model: 'Canvass', populate: canvassPopulateOptions() },
    { path: 'canvasser', model: 'User', populate: userPopulateOptions() },
    { path: 'addresses', model: 'Address', populate: addressPopulateOptions() }
  ];
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
  getTemplate: getTemplate,
  getModelNodeTree: getModelNodeTree,
  isValidModelPath: isValidModelPath,
  getSubDocPopulateOptions: getSubDocPopulateOptions,
  populateSubDocs: populateSubDocs
};