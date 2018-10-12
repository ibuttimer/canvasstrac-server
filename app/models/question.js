/*jslint node: true */ /*eslint-env node*/
/*eslint-env node*/
'use strict';

// grab the things we need
var mongoose = require('./mongoose_app').mongoose,
  Schema = mongoose.Schema,
  ModelNodeModule = require('./modelNode'),
  ModelNode = ModelNodeModule.ModelNode,
  utilsModule = require('../misc/utils'),
  utilsIsValidModelPath = utilsModule.isValidModelPath,
  utilsGetTemplate = utilsModule.getTemplate,
  modelUtilsModule = require('./model_utils'),
  getSchemaOptions = modelUtilsModule.getSchemaOptions,
  OPT_TIMESTAMP = modelUtilsModule.OPT_TIMESTAMP,
  populateSubDocsUtil = modelUtilsModule.populateSubDocs;

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
}, getSchemaOptions(OPT_TIMESTAMP));

// create a model using schema
var model = mongoose.model('Question', schema);

var modelNode = new ModelNode(model, { populateSubDocs: populateSubDocs });

var modelTree = modelNode.getTree();

/**
 * Generates a question template object from the specified source
 * @param {object} source     - object with properties to extract
 * @param {string[]} exPaths  - array of other paths to exclude
 */
function getTemplate (source, exPaths) {
  var template = utilsGetTemplate(source, model, exPaths);
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
  return [];
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
  isValidModelPath: isValidModelPath,
  getSubDocPopulateOptions: getSubDocPopulateOptions,
  getModelNodeTree: getModelNodeTree,
  questionTypes: questionTypes,
  populateSubDocs: populateSubDocs
};