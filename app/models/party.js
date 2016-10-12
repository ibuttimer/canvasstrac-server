/*jslint node: true */
'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  ModelNodeModule = require('./modelNode'),
    ModelNode = ModelNodeModule.ModelNode,
  ContactDetailsModule = require('./contactDetails'),
  AddressModule = require('./addresses'),
  utilsModule = require('../misc/utils'),
    getUtilsTemplate = utilsModule.getTemplate;

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
  note: {
    type: String,
    default: ''
  },
  address: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address'
  },
  contactDetails: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ContactDetails'
  }
}, {
  timestamps: true
});

// create a model using schema
var model = mongoose.model('Party', schema);

var modelNode = new ModelNode(model, populateSubDocs);

/*
 * Generates a party template object from the specified source
 * @param{object} source      - object with properties to extract
 * @param {string[]} exPaths  - array of other paths to exclude
 */
function getTemplate (source, exPaths) {
  // set defaults for arguments not passed
  if (!exPaths) {
    // exclude object ref fields by default
    exPaths = ['address', 'contactDetails'];
  }
  return getUtilsTemplate(source, model, exPaths);
}

function getModelNodeTree () {
  return modelNode;
}

function getSubDocPopulateOptions () {
  return [
    { path: 'address', model: 'Address' },
    { path: 'contactDetails', model: 'ContactDetails' }
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