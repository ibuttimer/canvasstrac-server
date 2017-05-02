/*jslint node: true */
'use strict';

var mongoose = require('./mongoose_app').mongoose,
  Schema = mongoose.Schema,
  ModelNodeModule = require('./modelNode'),
    ModelNode = ModelNodeModule.ModelNode,
  utilsModule = require('../misc/utils'),
    utilsIsValidModelPath = utilsModule.isValidModelPath,
    getUtilsTemplate = utilsModule.getTemplate,
    getModelPathNames = utilsModule.getModelPathNames,
  populateSubDocsUtil = require('./model_utils').populateSubDocs,
  passportLocalMongoose = require('passport-local-mongoose'),
  RoleModule = require('./roles'),
    RoleModel = RoleModule.model,
  PeopleModule = require('./person'),
    People = PeopleModule.model;

var schema = new Schema({
    username: String,
    // password: String,
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

var modelNode = new ModelNode(model, { 
  populateSubDocs: populateSubDocs,
  projection: {
    password: 0,
    OauthId: 0,
    OauthToken: 0,
    __v: 0
  }
});
modelNode.addChildBranch(RoleModule.getModelNodeTree(), 'role');
modelNode.addChildBranch(PeopleModule.getModelNodeTree(), 'person');

var modelTree = modelNode.getTree();

//modelNode.dumpTree();

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
  var options = [
    { path: 'person', model: 'Person', populate: PeopleModule.getSubDocPopulateOptions() },
    { path: 'role', model: 'Role' }
  ];
  return options;
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

/**
 * Return a projection of the paths to always exclude from the results of a query
 */
function getProjection () {
  return modelNode.projection;
}

/**
 * Return a projection of the paths to always exclude from a populate
 */
function getPopulateProjection () {
  return modelNode.getPopulateProjection();
}

module.exports = {
  schema: schema,
  model: model,
  getTemplate: getTemplate,
  isValidModelPath: isValidModelPath,
  getSubDocPopulateOptions: getSubDocPopulateOptions,
  getModelNodeTree: getModelNodeTree,
  populateSubDocs: populateSubDocs,
  getProjection: getProjection,
  getPopulateProjection: getPopulateProjection
};