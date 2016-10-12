/*jslint node: true */
'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  ModelNodeModule = require('./modelNode'),
    ModelNode = ModelNodeModule.ModelNode,
  utilsModule = require('../misc/utils'),
    getUtilsTemplate = utilsModule.getTemplate,
  ElectionModule = require('./election'),
    electionPopulateOptions = ElectionModule.getSubDocPopulateOptions,
  SurveyModule = require('./survey'),
    surveyPopulateOptions = SurveyModule.getSubDocPopulateOptions,
  UserModule = require('./user'),
    userPopulateOptions = UserModule.getSubDocPopulateOptions,
  AddressModule = require('./addresses'),
    addressPopulateOptions = AddressModule.getSubDocPopulateOptions,
  CanvassResultModule = require('./canvassResult'),
    canvassResultPopulateOptions = CanvassResultModule.getSubDocPopulateOptions;

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
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: Date.now
  },
  election: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Election'
  },
  survey: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Survey'
  },
  addresses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address'
  }],
  canvassers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  results: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CanvassResult'
  }]
}, {
  timestamps: true
});

// create a model using schema
var model = mongoose.model('Canvass', schema);

var modelNode = new ModelNode(model, populateSubDocs);

/*
 * Generates an canvass template object from the specified source
 * @param{object} source      - object with properties to extract
 * @param {string[]} exPaths  - array of other paths to exclude
 */
function getTemplate (source, exPaths) {
  // set defaults for arguments not passed
  if (!exPaths) {
    // exclude object ref fields by default
    exPaths = ['survey', 'addresses', 'canvassers', 'results'];
  }
  return getUtilsTemplate(source, model, exPaths);
}

function getModelNodeTree () {
  return modelNode;
}

function getSubDocPopulateOptions () {
  return [
    { path: 'election', model: 'Election', populate: electionPopulateOptions() },
    { path: 'survey', model: 'Survey', populate: surveyPopulateOptions() },
    { path: 'canvassers', model: 'User', populate: userPopulateOptions() },
    { path: 'addresses', model: 'Address', populate: addressPopulateOptions() },
    { path: 'results', model: 'CanvassResult', populate: canvassResultPopulateOptions() }
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
  getSubDocPopulateOptions: getSubDocPopulateOptions,
  populateSubDocs: populateSubDocs
};