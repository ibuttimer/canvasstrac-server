/*jslint node: true */
'use strict';

// grab the things we need
var mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  ModelNodeModule = require('./modelNode'),
    ModelNode = ModelNodeModule.ModelNode,
  utilsModule = require('../misc/utils'),
    getUtilsTemplate = utilsModule.getTemplate;

var dfltRangeMin = 1,
  dfltRangeMax = 10;

// create the address schema
var schema = new Schema({
  type: {
    type: Number,
    required: true
  },
  question: {
    type: String,
    required: true
  },
  options: {
    type: [String],
    default: []
  },
  rangeMin: {
    type: Number,
    default: dfltRangeMin
  },
  rangeMax: {
    type: Number,
    default: dfltRangeMax
  }
}, {
  timestamps: true
});

// create a model using schema
var model = mongoose.model('Question', schema);

var modelNode = new ModelNode(model, populateSubDocs);

var modelTree = modelNode.getTree();

/*
 * Generates an question template object from the specified source
 * @param{object} source      - object with properties to extract
 * @param {string[]} exPaths  - array of other paths to exclude
 */
function getTemplate (source, exPaths) {
  var template = getUtilsTemplate(source, model, exPaths);
  var quesType;
  for (var qtype in questionTypes) {
    if (questionTypes.hasOwnProperty(qtype)) {
      if (questionTypes[qtype].type == template.type) {
        quesType = questionTypes[qtype];
        break;
      }
    }
  }

  if (quesType) {
    switch (quesType.type) {
      case questionTypes.QUESTION_YES_NO.type:
      case questionTypes.QUESTION_YES_NO_MAYBE.type:
        template.options = quesType.options; 
        break;
      case questionTypes.QUESTION_CHOICE_MULTISEL.type:
      case questionTypes.QUESTION_CHOICE_SINGLESEL.type:
        if (!template.options) {
          template.options = quesType.options;
        } 
        break;
      case questionTypes.QUESTION_RANKING.type:
        if (!template.rangeMin) {
          template.rangeMin = quesType.rangeMin;
        } 
        if (!template.rangeMax) {
          template.rangeMax = quesType.rangeMax;
        } 
        break;
      default:
        break;
    }
  } else {
    template = undefined;
  }  
  return template;
}

function getModelNodeTree () {
  return modelNode;
}

function getSubDocPopulateOptions () {
  return [];
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


var questionTypes = {
  QUESTION_YES_NO: {          // simple yes/no question
    type: 0,
    options: ['Yes','No']
  },
  QUESTION_YES_NO_MAYBE: {    // simple yes/no/maybe question
    type: 1,
    options: ['Yes','No', 'Maybe']
  },
  QUESTION_CHOICE_MULTISEL: { // multiple choice/multiple answer
    type: 2,
    options: []
  },
  QUESTION_CHOICE_SINGLESEL: {// multiple choice/single answer
    type: 3,
    options: []
  },
  QUESTION_RANKING: {         // rank answer
    type: 4,
    options: [],              // if not supplied, range numbers disaplayed
    rangeMin: dfltRangeMin,
    rangeMax: dfltRangeMax
  },
  QUESTION_QUERY: {           // surveyee answer 
    type: 5,
  }
};


module.exports = {
  schema: schema,
  model: model,
  getTemplate: getTemplate,
  getModelNodeTree: getModelNodeTree,
  questionTypes: questionTypes,
  getSubDocPopulateOptions: getSubDocPopulateOptions,
  populateSubDocs: populateSubDocs
};