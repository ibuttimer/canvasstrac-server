/*jslint node: true */
'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  ModelNodeModule = require('./modelNode'),
    ModelNode = ModelNodeModule.ModelNode,
  utilsModule = require('../misc/utils'),
    getUtilsTemplate = utilsModule.getTemplate,
  PeopleModule = require('./person'),
    People = PeopleModule.model,
  PartyModule = require('./party'),
    Party = PartyModule.model;

var schema = new Schema({
  person: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person'
  },
  party: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Party'
  }
}, {
  timestamps: true
});

// create a model using schema
var model = mongoose.model('Candidate', schema);

var modelNode = new ModelNode(model, populateSubDocs);

var modelTree = modelNode.getTree();

/*
 * Generates a candidate template object from the specified source
 * @param{object} source      - object with properties to extract
 * @param {string[]} exPaths  - array of other paths to exclude
 */
function getTemplate (source, exPaths) {
  // set defaults for arguments not passed
  if (!exPaths) {
    // exclude object ref fields by default
    exPaths = ['person', 'party'];
  }
  return getUtilsTemplate(source, model, exPaths);
}

function getModelNodeTree () {
  return modelNode;
}

function getSubDocPopulateOptions () {
  var options = [
    { path: 'person', model: 'Person', populate: PeopleModule.getSubDocPopulateOptions() },
    { path: 'party', model: 'Party', populate: PartyModule.getSubDocPopulateOptions() }
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
  getSubDocPopulateOptions: getSubDocPopulateOptions,
  populateSubDocs: populateSubDocs
};