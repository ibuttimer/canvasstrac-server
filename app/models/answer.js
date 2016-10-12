/*jslint node: true */
'use strict';

// grab the things we need
var mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  ModelNodeModule = require('./modelNode'),
    ModelNode = ModelNodeModule.ModelNode,
  QuestionModule = require('./question'),
    QuestionModel = QuestionModule.model,
  utilsModule = require('../misc/utils'),
    getUtilsTemplate = utilsModule.getTemplate,
  questionPopulateOptions = require('./question').getSubDocPopulateOptions;

// create the address schema
var schema = new Schema({
  answer: {
    type: String,
    required: true
  },
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  }
}, {
  timestamps: true
});

// create a model using schema
var model = mongoose.model('Answer', schema);

var modelNode = new ModelNode(model, populateSubDocs);
modelNode.addChildBranch(QuestionModule.getModelNodeTree(), 'question');

var modelTree = modelNode.getTree();

/*
 * Generates an answer template object from the specified source
 * @param{object} source      - object with properties to extract
 * @param {string[]} exPaths  - array of other paths to exclude
 */
function getTemplate (source, exPaths) {
  return getUtilsTemplate(source, model, exPaths);
}

function getSubDocPopulateOptions () {
  return [
    { path: 'question', model: 'Question', populate: questionPopulateOptions() }
  ];
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
  getTemplate: getTemplate,
  getModelNodeTree: getModelNodeTree,
  getSubDocPopulateOptions: getSubDocPopulateOptions,
  populateSubDocs: populateSubDocs
};