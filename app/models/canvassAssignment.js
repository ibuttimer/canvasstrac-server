/*jslint node: true */ /*eslint-env node*/
'use strict';

var mongoose = require('./mongoose_app').mongoose,
  Schema = mongoose.Schema,
  ModelNodeModule = require('./modelNode'),
  ModelNode = ModelNodeModule.ModelNode,
  utilsModule = require('../misc/utils'),
  utilsIsValidModelPath = utilsModule.isValidModelPath,
  utilsGetTemplate = utilsModule.getTemplate,
  objectIdToString = utilsModule.objectIdToString,
  modelUtilsModule = require('./model_utils'),
  getSchemaOptions = modelUtilsModule.getSchemaOptions,
  OPT_TIMESTAMP = modelUtilsModule.OPT_TIMESTAMP,
  populateSubDocsUtil = modelUtilsModule.populateSubDocs,
  CanvassModule = require('./canvass'),
  canvassPopulateOptions = CanvassModule.getSubDocPopulateOptions,
  UserModule = require('./user'),
  userPopulateOptions = UserModule.getSubDocPopulateOptions,
  userPopulateProjection = UserModule.getPopulateProjection,
  AddressModule = require('./addresses'),
  addressPopulateOptions = AddressModule.getSubDocPopulateOptions;

var schema = new Schema({
  canvass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Canvass'
  },
  canvasser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  addresses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address'
  }]
}, getSchemaOptions(OPT_TIMESTAMP));

// create a model using schema
var model = mongoose.model('CanvassAssignment', schema);

var modelNode = new ModelNode(model, { populateSubDocs: populateSubDocs });
modelNode.addChildBranch(UserModule.getModelNodeTree(), 'canvasser');
modelNode.addChildBranch(AddressModule.getModelNodeTree(), 'addresses');

//modelNode.dumpTree();

var modelTree = modelNode.getTree();


/**
 * Generates a canvass assignment template object from the specified source
 * @param {object} source     - object with properties to extract
 * @param {string[]} exPaths  - array of other paths to exclude
 */
function getTemplate (source, exPaths) {
  // set defaults for arguments not passed
  if (!exPaths) {
    // exclude nothing by default
    exPaths = [];
  }
  return utilsGetTemplate(source, model, exPaths);
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
  return [
    { path: 'canvass', model: 'Canvass', populate: canvassPopulateOptions() },
    { path: 'canvasser', model: 'User', populate: userPopulateOptions(), select: userPopulateProjection() },
    { path: 'addresses', model: 'Address', populate: addressPopulateOptions() }
  ];
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

/**
 * Cancel assignments
 * @param {string} canvassId Id of canvass assignments are for
 * @param {string|array} canvasser Canvasser id(s)
 * @param {string|array} address Address id(s)
 * @param {function} next function to call next
 */
function cancelAssignments (canvassId, canvasser, address, next) {
  var canvasserQuery = {
    canvass: canvassId
  },
  addressQuery = {
    canvass: canvassId
  },
  addrArray,
  error;

  if (Array.isArray(canvasser)) {
    canvasserQuery.canvasser = { $in: canvasser };
  } else {
    canvasserQuery.canvasser = canvasser;
  }
  if (Array.isArray(address)) {
    addressQuery.addresses = { $in: address };
    addrArray = [];
    address.forEach(function (addr) {
      addrArray.push(addr.toLowerCase());
    });
  } else {
    addressQuery.addresses = address;
    addrArray = [address.toLowerCase()];
  }

  // for canvassers just remove the canvassassignment entry in the db
  model.remove(canvasserQuery, function (err, canvasserDoc) {
    if (err) {
      next(err, canvasserDoc);
    } else {
      // for addresses find the canvassassignment entry & update it
      model.find(addressQuery, function (err, addrDoc) {
        if (err) {
          next(err, addrDoc);
        } else {
          // for each canvassassignment entry
          addrDoc.forEach(function (entry) {
            // for each entry in the address array
            addrArray.forEach(function (addr) {
              var idx = entry.addresses.findIndex(function (caddr) {
                // objectid === addr
                return (objectIdToString(caddr, function(element) {
                          return element.toLowerCase();
                        }) === addr);
              });
              if (idx >= 0) {
                // found addr in canvassassignment addresses
                entry.addresses.splice(idx, 1); // remove it
              }
            });
          });

          addrDoc.forEach(function (entry) {
            if (!error && entry.isModified()) {
              entry.save(function (err, updatedEntry) {
                if (err) {
                  error = err;  // save error
                }
              });
            }
          });

          next(error);
        }
      });
    }
  });
}

module.exports = {
  schema: schema,
  model: model,
  getTemplate: getTemplate,
  isValidModelPath: isValidModelPath,
  getSubDocPopulateOptions: getSubDocPopulateOptions,
  getModelNodeTree: getModelNodeTree,
  populateSubDocs: populateSubDocs,
  cancelAssignments: cancelAssignments
};