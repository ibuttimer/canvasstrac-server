/*jslint node: true */
'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  ModelNodeModule = require('./modelNode'),
    ModelNode = ModelNodeModule.ModelNode,
  SystemModule = require('./votingSystems'),
  CandidatesModule = require('./candidate'),
  utilsModule = require('../misc/utils'),
    utilsIsValidModelPath = utilsModule.isValidModelPath,
    getUtilsTemplate = utilsModule.getTemplate,
    getModelPathNames = utilsModule.getModelPathNames,
  CandidateModule = require('./candidate');


var schema = new Schema({
  name: {
    type: String,
    required: true,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  seats: {
    type: Number,
    default: 1
  },
  electionDate: {
    type: Date,
    default: Date.now
  },
  system: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VotingSystems'
  },
  candidates: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate'
  }]
}, {
  timestamps: true
});

// create a model using schema
var model = mongoose.model('Election', schema);

var modelNode = new ModelNode(model, populateSubDocs);

/*
 * Generates an election template object from the specified source
 * @param{object} source      - object with properties to extract
 * @param {string[]} exPaths  - array of other paths to exclude
 */
function getTemplate (source, exPaths) {
  // set defaults for arguments not passed
  if (!exPaths) {
    // exclude object ref fields by default
    exPaths = ['system', 'candidates'];
  }
  return getUtilsTemplate(source, model, exPaths);
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

function getSubDocPopulateOptions () {
  return [
    { path: 'system', model: 'VotingSystems' },
    { path: 'candidates', model: 'Candidate', populate: CandidateModule.getSubDocPopulateOptions() }
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
  getTemplate: getTemplate,
  getModelNodeTree: getModelNodeTree,
  isValidModelPath: isValidModelPath,
  getSubDocPopulateOptions: getSubDocPopulateOptions,
  populateSubDocs: populateSubDocs
};