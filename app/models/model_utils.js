/*jslint node: true */
'use strict';

var utils = require('../misc/utils'),
  Consts = require('../consts');

/**
 * Populate the subdocuments in a result set
 * @param {object} model  - mongoose model
 * @param {Array} docs    - documents to populate
 * @param {Array} options - subdocument populate options
 * @param {function} next - next function
 */
function populateSubDocs (model, docs, options, next) {
  
  // TODO method of not populating fields that should not be returned, e.g. password for users
  
  
  if (options.length > 0) {
    model.populate(docs, options, function (err, docs) {
      next(err, docs);
    });
  } else {
    next(null, docs);
  }
}



module.exports = {
  populateSubDocs: populateSubDocs
};
