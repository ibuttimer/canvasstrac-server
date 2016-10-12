/*jslint node: true */
'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  ModelNodeModule = require('./modelNode'),
    ModelNode = ModelNodeModule.ModelNode,
  utilsModule = require('../misc/utils'),
    getUtilsTemplate = utilsModule.getTemplate,
  AnswerModule = require('./answer'),
    answerPopulateOptions = AnswerModule.getSubDocPopulateOptions,
  UserModule = require('./user'),
    userPopulateOptions = UserModule.getSubDocPopulateOptions,
  PersonModule = require('./person'),
    personPopulateOptions = PersonModule.getSubDocPopulateOptions,
  AddressModule = require('./addresses'),
    addressPopulateOptions = AddressModule.getSubDocPopulateOptions;

var schema = new Schema({
  available: {
    type: Boolean,
    default: true
  },
  dontCanvassAgain: {
    type: Boolean,
    default: false
  },
  tryAgain: {
    type: Boolean,
    default: true
  },
  supporter: {
    type: Number,
    default: 0
  },
  date: {
    type: Date,
    default: Date.now
  },
  answers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Answer'
  }],
  canvasser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  voter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person'
  },
  address: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address'
  }
}, {
  timestamps: true
});

// create a model using schema
var model = mongoose.model('CanvassResult', schema);

var modelNode = new ModelNode(model, populateSubDocs);

/*
 * Generates an cavvass template object from the specified source
 * @param{object} source      - object with properties to extract
 * @param {string[]} exPaths  - array of other paths to exclude
 */
function getTemplate (source, exPaths) {
  // set defaults for arguments not passed
  if (!exPaths) {
    // exclude object ref fields by default
    exPaths = ['answers', 'canvasser', 'voter', 'address'];
  }
  return getUtilsTemplate(source, model, exPaths);
}

function getModelNodeTree () {
  return modelNode;
}

function getSubDocPopulateOptions () {
  return [
    { path: 'answers', model: 'Answer', populate: answerPopulateOptions() },
    { path: 'canvasser', model: 'User', populate: userPopulateOptions() },
    { path: 'voter', model: 'Person', populate: personPopulateOptions() },
    { path: 'address', model: 'Address', populate: addressPopulateOptions() }
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