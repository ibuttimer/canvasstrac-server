/*jslint node: true */
'use strict';

// grab the things we need
var mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  ModelNodeModule = require('./modelNode'),
    ModelNode = ModelNodeModule.ModelNode,
  QuestionModule = require('./question'),
  utilsModule = require('../misc/utils'),
    getUtilsTemplate = utilsModule.getTemplate,
  questionPopulateOptions = require('./question').getSubDocPopulateOptions;

// create the address schema
var schema = new Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
  }]
}, {
  timestamps: true
});

// create a model using schema
var model = mongoose.model('Survey', schema);

var modelNode = new ModelNode(model, populateSubDocs);

/*
 * Generates a survey template object from the specified source
 * @param{object} source      - object with properties to extract
 * @param {string[]} exPaths  - array of other paths to exclude
 */
function getTemplate (source, exPaths) {
  return getUtilsTemplate(source, model, exPaths);
}

function getModelNodeTree () {
  var models = [model];
  [QuestionModule].forEach(function (mod) {
    mod.getModelNodeTree().forEach(function (submodel) {
      models.push(submodel);
    });
  });
  return models;
}

function getSubDocPopulateOptions () {
  return [
    { path: 'questions', model: 'Question', populate: questionPopulateOptions() }
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