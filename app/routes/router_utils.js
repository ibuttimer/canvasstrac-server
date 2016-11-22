/*jslint node: true */
'use strict';

var express = require('express'),
  Verify = require('./verify'),
  utils = require('../misc/utils'),
    cloneObject = utils.cloneObject,
    arrayIntersection = utils.arrayIntersection,
  Consts = require('../consts');

/**
 * Check a database result for an error condition and send response if necessary
 * @param {object} err - database result
 * @param {object} res - response
 * @returns {boolean} true if error
 */
function checkError (err, res) {
  var isErr = false;
  if (err) {
    isErr = true;
    
    console.log(err);

    var status = Consts.HTTP_INTERNAL_ERROR;
    if (err.name === 'ValidationError') {
      // mongoose schema validation failed
      status = Consts.HTTP_BAD_REQUEST;
    } else if (err.name === 'UserExistsError') {
      // username already in use
      status = Consts.HTTP_CONFLICT;
    }
    res.status(status).json({err: err});
  }
  return isErr;
}

/**
 * Reply with an error
 * @param {Object} res     - http response
 * @param {number} status  - http status code
 * @param {string} message -  error message
 */
function errorReply(res, status, message) {
  if (res) {
    res.status(status).json({
      message: message,
      error: {status: status}
    });
  } else {
    // no response object available so just log
    console.log("Error: status " + status + ", " + message);
  }
}

/**
 * Reply with a result
 * @param {Object} result  - result object
 * @param {Object} res     - http response
 */
function resultReply(result, res) {
  if (result) {
    // success
    res.status(result.status).json(result.payload);
  }
}

/**
 * Reply with a result of a populate
 * @param {Object} result  - result object
 * @param {Object} res     - http response
 */
function populateSubDocsReply (err, res, next, docs, okStatus) {
  if (!checkError(err, res)) {
    next(makeResult(okStatus, docs), res);
  }
}


/**
 * Make a result object
 * @param {number} status - result http status
 * @param {Object} result - result payload
 */
function makeResult(status, payload) {
  return {
    status: status,
    payload: payload,
  };
}

/**
 * Do access check
 * @param {function} accessCheck              - access check function from verify.js
 * @param {mongoose.Schema.Types.ObjectId} id - id of doc to process
 * @param {Object} req                        - http request
 * @param {Object} res                        - http response
 * @param {function} next                     - next function
 */
function doChecks (accessCheck, id, req, res, next) {

  accessCheck(req, res, function (err) {

    if (err) {
      errorReply(res, err.status, err.message);
      return;
    }
    if (!id) {
      errorReply(res, Consts.HTTP_NOT_FOUND, 'Invalid document id');
      return;
    }
    
    next();
  });
}

/**
 * Update a document
 * @param {function} accessCheck              - access check function from verify.js
 * @param {object} fields                     - object containing updated property values
 * @param {mongoose.Model} model              - model to update doc in
 * @param {mongoose.Schema.Types.ObjectId} id - id of doc to update
 * @param {Object} req                        - http request
 * @param {Object} res                        - http response
 * @param {function} next                     - next function
 */
function updateDoc (accessCheck, fields, model, id, req, res, next) {

  doChecks(accessCheck, id, req, res, function () {

    if (!utils.isEmpty(fields)) {
      model.findByIdAndUpdate(id, {
          $set: fields
        }, {
          new: true,    // return the modified document rather than the original
          upsert: true  // creates the object if it doesn't exist
        }, function (err, updatedDoc) {
          if (!checkError (err, res)) {
            // success
            next(makeResult(Consts.HTTP_OK, updatedDoc), res);
          }
        });
    } else {
      // nothing to do
      next(makeResult(Consts.HTTP_NO_CONTENT), res);
    }
  });
}

/**
 * Update a document without an access check
 * @param {object} fields                     - object containing updated property values
 * @param {mongoose.Model} model              - model to update doc in
 * @param {mongoose.Schema.Types.ObjectId} id - id of doc to update
 * @param {Object} req                        - http request
 * @param {Object} res                        - http response
 * @param {function} next                     - next function
 */
function updateDocAccessOk (fields, model, id, req, res, next) {

  updateDoc (Verify.verifyNoCheck, fields, model, id, req, res, next);
}

/**
 * Remove a document
 * @param {function} accessCheck              - access check function from verify.js
 * @param {mongoose.Model} model              - model to remove doc from
 * @param {mongoose.Schema.Types.ObjectId} id - id of doc to remove
 * @param {Object} req                        - http request
 * @param {Object} res                        - http response
 * @param {function} next                     - next function
 */
function removeDoc (accessCheck, model, id, req, res, next) {

  doChecks(accessCheck, id, req, res, function () {

    model.findByIdAndRemove(id, function (err, doc) {
      if (err) {
        errorReply(res, err.status, err.message);
      } else {
        // success
        if (typeof next === 'function') {
          next(makeResult(Consts.HTTP_OK, doc), res);
        }
        // else no callback specified
      }
    });
  });
}

/**
 * Remove a document without an access check
 * @param {mongoose.Model} model              - model to remove doc from
 * @param {mongoose.Schema.Types.ObjectId} id - id of doc to remove
 * @param {Object} req                        - http request
 * @param {Object} res                        - http response
 * @param {function} next                     - next function
 */
function removeDocAccessOk (model, id, req, res, next) {

  removeDoc (Verify.verifyNoCheck, model, id, req, res, next);
}

/**
 * Retrieve a document
 * @param {function} accessCheck              - access check function from verify.js
 * @param {mongoose.Model} model              - model to retrieve doc from
 * @param {mongoose.Schema.Types.ObjectId} id - id of doc to retrieve
 * @param {Object} req                        - http request
 * @param {Object} res                        - http response
 */
function getDocById (accessCheck, model, id, req, res) {

  doChecks(accessCheck, id, req, res, function () {

    model.findById(id, function (err, doc) {
      if (err) {
        errorReply(res, err.status, err.message);
      } else {
        if (doc) {
          res.json(doc);
        } else {
          errorReply(res, Consts.HTTP_NOT_FOUND, 'Invalid document id');
        }
      }
    });
  });
}

/**
 * Split a url path string into select and query objects 
 * @param {string} string               - string to split
 * @param {function} isValidModelPath   - function to check if valid model path
 * @param {boolean} checkSub            - check sub document model(s) flag
 * @param {Array} fieldErrors           - where to save error info
 * @returns {object}  object comtaining select, query parameter and model node properties
 */
function splitPathString(path, isValidModelPath, checkSub, fieldErrors) {
  var fields = path.split(' '),
    select = '',
    queryParam = [],      // array of field names
    queryModelNodes = {}; // ModelNodes corresponding to field names
  fields.forEach(function (field) {
    var modelNode = isValidModelPath(field, [], checkSub);
    if (modelNode !== false) {
      // generate a space seperated string 
      if (select.length > 0) {
        select += ' ';
      }
      select += field;

      // generate an array of fields 
      queryParam.push(field);

      queryModelNodes[field] = modelNode;
    } else {
      fieldErrors.push(field);
    }
  });
  return {select: select, queryParam: queryParam, queryModelNodes: queryModelNodes}; 
}

/**
 * Generate a mongoose query parameter value 
 * @param {object} modelNode            - modelNode to generate query for
 * @param {string} path                 - model path
 * @param {string} raw                  - raw value
 * @returns {object}  query parameter
 */
function getQueryParamValue(modelNode, path, raw) {
  var type = modelNode.model.schema.path(path),
    modOp = raw.charAt(0),
    value;
  if (type.instance === 'Number') {
    switch (modOp) {
      case '!': // inverse, i.e not equal
        value = {$ne: raw.substring(1)};
        break;
      case '>': // greater than
        value = {$gt: raw.substring(1)};
        break;
      case '<': // less than
        value = {$lt: raw.substring(1)};
        break;
      default:
        value = raw;
        break;
    }
  } else if (type.instance === 'ObjectID') {
    value = raw;
  } else {
    // case insensitive search
    switch (modOp) {
      case '!': // inverse, i.e not equal
        /* http://stackoverflow.com/a/33680443
          * "The regex (?!hede). looks ahead to see if there's no substring "hede" to be seen, 
          * and if that is the case (so something else is seen), then the . (dot) will match 
          * any character except a line break". "every empty string is first validated to see 
          * if there's no "hede" up ahead, before a character is consumed by the . (dot). 
          * The regex (?!hede). will do that only once, so it is wrapped in a group, and 
          * repeated zero or more times: ((?!hede).)*. Finally, the start- and end-of-input 
          * are anchored to make sure the entire input is consumed: ^((?!hede).)*$"
          */
        value = new RegExp('^((?!' + raw.substring(1) + ').)*$', 'i');
        break;
      default:
        value = new RegExp(raw, 'i');
        break;
    }
  }
  return value;
}

/**
 * Generate a mongoose query parameter object with multiple values 
 * @param {string} queryVal             - raw value
 * @param {Array} queryParam            - array of query parameters
 * @param {Array} queryModelNodes       - array of model nodes corresponding to query parameters
 * @returns {object}  query parameter
 */
function generateMultiConditionObject (queryVal, queryParam, queryModelNodes) {
  // generate OR parameter
  var params = [];  // array of condition objects
  queryParam.forEach(function (field) {
    var param = {},
      modelNode = queryModelNodes[field];
    param[field] = getQueryParamValue(modelNode, field, queryVal);

    params.push(param);
  });
  return params;
}


/**
 * Decode a request
 * @param {Object} req                - http request
 * @param {Object} res                - http response
 * @param {function} isValidModelPath - function to test valid model paths
 * @param {boolean} checkSub          - check sub documents flag
 */
function decodeReq (req, res, isValidModelPath, checkSub) {
  // check request for query params to select returned model paths    
  var select = '',
    queryParam = {},
    queryModelNodes = {},
    fieldErrors = [],
    altErrors = [];
  for (var path in req.query) {
    if (path.indexOf(' ') > 0) {
      // an OR field string, e.g. 'field1+field2', so either field1 or field2 matching the param is acceptable
      var splitPath = splitPathString(path, isValidModelPath, checkSub, fieldErrors),
        i,
        fieldNames = Object.getOwnPropertyNames(splitPath.queryModelNodes);
      // check all the same ModelNode
      for (i = 1; i < fieldNames.length; ++i) {
        if (splitPath.queryModelNodes[fieldNames[i-1]] !== splitPath.queryModelNodes[fieldNames[i]]) {
          break;
        }
      }
      if (i < fieldNames.length) {
        altErrors.push('OR queries restricted to within a single model');
      } else {
        // { $or: [{....}, {....} ....]}
        queryParam.$or = generateMultiConditionObject(req.query[path], splitPath.queryParam, splitPath.queryModelNodes);
        queryModelNodes.$or = splitPath.queryModelNodes[fieldNames[0]];  // all the same ModelNode
      }
    } else if (path === 'fields') {
      /* 'fields=a+b+c' is how field selection is specified where a, b & c are field names
        * NOTE: currently only works on top level document */
      var splitPath = splitPathString(req.query[path], isValidModelPath, checkSub, fieldErrors);
      select = splitPath.select;
    } else {
      var modelNode = isValidModelPath(path, [], checkSub);
      if (modelNode !== false) {
        // requesting single field value
        queryParam[path] = getQueryParamValue(modelNode, path, req.query[path]);
        queryModelNodes[path] = modelNode;
      } else {
        fieldErrors.push(path);
      }
    }
  }

  var result;
  if ((fieldErrors.length > 0) || (altErrors.length > 0)) {
    var msg = '';
    if (fieldErrors.length > 0) {
      msg += 'Unknown field name(s): ' + fieldErrors;
    }
    altErrors.forEach(function (err) {
      if (msg) {
        msg += '\n';
      }
      msg += err; 
    });
    errorReply(res, Consts.HTTP_BAD_REQUEST, msg);
  } else {
    result = {};
    result.queryParam = queryParam;   // query object with fields as property names & property value as query value 
    result.queryModelNodes = queryModelNodes; // ModelNodes corresponding to fields
    result.select = select;
  }
  return result;
}

/**
 * Process a document count request
 * @param {Object} req                - http request
 * @param {Object} res                - http response
 * @param {function} isValidModelPath - function to test valid model paths
 * @param {mongoose.Model} model      - model
 */
function processCountReq (req, res, isValidModelPath, model) {
  // check request for query params
  var decode = decodeReq (req, res, isValidModelPath);
  if (decode) {
    // execute the query


// TODO processCountReq need to handle multiple models!!!

  //  result.queryParam = queryParam;
  //   result.queryModelNodes = queryModelNodes;


    var query = model.count(decode.queryParam);
    query.exec(function (err, doc) {
      if (!checkError(err, res)) {
        res.json({count: doc});
      }
    });
  }
}

/**
 * Retrieve document(s) using a query object
 * @param {Object} res                        - http response
 * @param {mongoose.Model} model              - model to retrieve from
 * @param {Object} queryObj                   - query object
 * @param {String} select                     - field select string
 * @param {function} next                     - next function
 */
function getDocsUsingObj (res, model, queryObj, select, next) {
  if (typeof select === 'function') {
    next = select;
    select = '';
  }
  if (!select) {
    select = '';
  }
  // execute the query
  var query = model.find(queryObj);
  if (select.length > 0) {
    query.select(select);
  }
  query.exec(function (err, docs) {
    if (!checkError(err, res)) {
      next(res, docs);
    }
  });
}

/**
 * Retrieve the root owner of the specified document 
 * @param {Object} res                        - http response
 * @param {Object} modelNode                  - ModelNode of document
 * @param {mongoose.Schema.Types.ObjectId} owner - owner ObjectId of document
 * @param {Object} docIn                      - document to find root owner of
 * @param {function} next                     - next function
 */
function getRootOwner(res, modelNode, owner, docIn, next) {
  if (modelNode.parent && owner) {
    var model = modelNode.parent.model;

    model.findById(owner, function (err, doc) {
      if (!checkError(err, res)) {
        if (doc) {
          getRootOwner(res, modelNode.parent, doc.owner, doc, next);
        } else {
          next(modelNode, docIn);
        }
      }
    });
  } else {
    next(modelNode, docIn);
  }
}

function getDocsQuery (query, objId, select, root, res, next) {
  if (select.length > 0) {
    query.select(select);
  }
  query.exec(function (err, docs) {
    if (!checkError(err, res)) {
      if (docs) {
        // success
        if (root.populateSubDocs) {
          root.populateSubDocs(docs, function (err, docs) {
            populateSubDocsReply(err, res, next, docs, Consts.HTTP_OK);
          });
        } else {
          populateSubDocsReply(err, res, next, docs, Consts.HTTP_OK);
        }
      } else if (objId) {
        errorReply(res, Consts.HTTP_NOT_FOUND, 'Unknown address identifier');
      }
    }
  });
}


function getDocs (req, res, isValidModelPath, root, next) {
  // check request for query params to select returned model paths
  var decode = decodeReq(req, res, isValidModelPath, true);
  if (decode) {
    // execute the query
    var model = root.model,
      fieldNames = Object.getOwnPropertyNames(decode.queryModelNodes);

    if (req.params.objId) {
      // retrieve doc using id
      var query = model.findById(req.params.objId);
      getDocsQuery(query, req.params.objId, decode.select, root, res, next);
    } else if (fieldNames.length == 0) {
      // no ModelNodes therefore must be a get all request
      var query = model.find(decode.queryParam);
      getDocsQuery(query, req.params.objId, decode.select, root, res, next);
    } else {
      /* fields may be spread across several models so build a list, 
        * and find the root owner of each document, if its the correc model 
        * then return it */
      var queryResult = {}, // obj containing arrays of docs matching individual query fields
        processed = 0,  // docs processed count
        toProcess = 0;  // total number of docs to process
      fieldNames.forEach(function (prop) {
        // for each modelNode & corresponding query value, find the matching docs
        var propModelNode = decode.queryModelNodes[prop], // ModelNode
          propModel = propModelNode.model,              // model of ModelNode 
          propQuery = cloneObject(decode.queryParam, [prop]); // query using provided value

        getDocsUsingObj(res, propModel, propQuery, function (res, docs) {
          toProcess += docs.length; // inc total number of docs to process

          // get the root owner of each of the returned docs
          docs.forEach(function (doc) {
             
            getRootOwner(res, propModelNode, doc.owner, doc, function (modelNode, docx) {
              // if root is of correct type, add to queryResult
              ++processed;
              if (modelNode.model.modelName === root.model.modelName) {
                if (!queryResult[prop]) {
                  queryResult[prop] = [];
                }
                queryResult[prop].push(docx._id); // save doc id
              }

              if (processed === toProcess) {
                // all have been processed
                var resultFields = Object.getOwnPropertyNames(queryResult),
                  haveRes = (resultFields.length && (resultFields.length === fieldNames.length));
                if (haveRes) {
                  // have results for all input query fields, so generate array of docs that match all query params
                  var idsArray = queryResult[resultFields[0]];
                  for (var i = 1; i < resultFields.length; ++i) {
                    idsArray = arrayIntersection(idsArray, queryResult[resultFields[i]]); 
                  }
                  haveRes = (idsArray.length > 0);
                  if (haveRes) {
                    // retrieve the docs to return 
                    var query = modelNode.model.find({_id: {$in: idsArray}});
                    getDocsQuery(query, req.params.objId, decode.select, root, res, next);
                  }
                } 
                if (!haveRes) {
                  // nothing found matching query
                  populateSubDocsReply(undefined, res, next, [], Consts.HTTP_NO_CONTENT);
                }
              } 
            });
          });
        }); 
      });
    }
  }
}



module.exports = {
  checkError: checkError,
  errorReply: errorReply,
  makeResult: makeResult,
  resultReply: resultReply,
  populateSubDocsReply: populateSubDocsReply,
  doChecks: doChecks, 
  removeDoc: removeDoc,
  updateDoc: updateDoc,
  updateDocAccessOk: updateDocAccessOk,
  removeDocAccessOk: removeDocAccessOk,
  getDocById: getDocById,
  decodeReq: decodeReq,
  processCountReq: processCountReq,
  getDocsUsingObj: getDocsUsingObj,
  getRootOwner: getRootOwner,
  getDocs: getDocs
};
