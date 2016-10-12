/*jslint node: true */
'use strict';

// grab the things we need
var mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  ModelNodeModule = require('./modelNode'),
    ModelNode = ModelNodeModule.ModelNode;

// create the address schema
var schema = new Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  towns: {
    type: Array,
    default: [] 
  },
  cities: {
    type: Array,
    default: [] 
  },
  counties: {
    type: Array,
    default: [] 
  }

}, {
  timestamps: true
});

// create a model using schema
// make this available to our Node applications
module.exports = mongoose.model('VotingDistrict', schema);