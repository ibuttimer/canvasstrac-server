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
  passportLocalMongoose = require('passport-local-mongoose'),
  RoleModule = require('./roles'),
    RoleModel = RoleModule.model,
  PeopleModule = require('./person'),
    People = PeopleModule.model;

var schema = new Schema({
    username: String,
    password: String,
    OauthId: String,
    OauthToken: String,
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role'
    },
    person: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Person'
    }
  });

schema.methods.getName = function () {
  return this.person.getName();
};

schema.plugin(passportLocalMongoose);

// create a model using schema
var model = mongoose.model('User', schema);

var modelNode = new ModelNode(model, populateSubDocs);
modelNode.addChildBranch(RoleModule.getModelNodeTree(), 'role');
modelNode.addChildBranch(PeopleModule.getModelNodeTree(), 'person');

var modelTree = modelNode.getTree();

// modelTree.forEach(function (node) {
//   console.log('model',node.model.modelName,'path',node.path);
//   if (node.parent) {
//     console.log('  parent',node.parent.model.modelName);
//     if (node.parent.parent) {
//       console.log('     parent',node.parent.parent.model.modelName);
//     }
//   }
// });

/*
 * Generates a user template object from the specified source
 * @param{object} source      - object with properties to extract
 * @param {string[]} exPaths  - array of other paths to exclude
 */
function getTemplate (source, exPaths) {
  // set defaults for arguments not passed
  if (!exPaths) {
    // exclude object ref fields by default
    exPaths = ['role', 'person'];
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
  var options = [
    { path: 'person', model: 'Person', populate: PeopleModule.getSubDocPopulateOptions() },
    { path: 'role', model: 'Role' }
  ];
  return options;
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