/*jslint node: true */ /*eslint-env node*/
'use strict';

// grab the things we need
var mongoose = require('mongoose');

/* (node:1500) DeprecationWarning: Mongoose: mpromise (mongoose's default promise library) 
 * is deprecated, plug in your own promise library instead: http://mongoosejs.com/docs/promises.html
 * 
 * For backwards compatibility, Mongoose 4 returns mpromise promises by default.
 * 
 * From Mongoose 4.1.0 you can plugin your own promise library
 */

// Use native promises
mongoose.Promise = global.Promise;

module.exports = {
  mongoose: mongoose
};