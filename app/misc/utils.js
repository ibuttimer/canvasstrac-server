/*jslint node: true */
'use strict';

var assert = require('assert');
var mongoose = require('../models/mongoose_app').mongoose;

var app = require('../app');
var config = require('../config');
var Consts = require('../consts');

/**
  * Test the equality of two objects based on a list of properties
  * @param {object} objA         - first object
  * @param {object} objB         - second object
  * @param {string[]} properties - list of property names, or if not supplied all properties
  */
function testEquality (objA, objB, properties) {
  var equal = true;
  if (!properties) {
    // check all properties of objects match
    var properties = Object.getOwnPropertyNames(objA),
      propB = Object.getOwnPropertyNames(objB);
    equal = (properties.length === propB.length);
  }
  if (equal) {
    for (var i = 0; equal && (i < properties.length); ++i) {
      if (objA.hasOwnProperty(properties[i]) && objB.hasOwnProperty(properties[i])) {
        var arrayChk = Array.isArray(objA[properties[i]]);
        equal = (arrayChk === Array.isArray(objB[properties[i]]));
        if (equal) {
          if (arrayChk) {
            // array check
            var length = objA[properties[i]].length;
            equal = (length === objB[properties[i]].length);
            for (var j = 0; (j < length) && equal; ++j) {
              equal = (objA[properties[i]][j] === objB[properties[i]][j]);
            }
          } else {
            // object check (can't use === as object ids fail that)
            equal = (objA[properties[i]] == objB[properties[i]]);
          }
        }
        if (!equal) {
          console.log('-> testEquality[' + properties[i] + ']: ' + objA[properties[i]] + ' != ' + objB[properties[i]]);
        }
      }
    }
  }
  return equal;
}

/**
  * Check if an object is empty
  * @param {object} object - object to check
  */
function isEmpty (object) {
  var empty = true;
  if (!isNullOrUndefined(object)) {
    if (Object.getOwnPropertyNames(object).length > 0) {
      empty = false;
    }
  } 
  return empty;
}

/**
 * Check if an object is null or undefined
 * @param   {object}  object object to test
 * @returns {boolean} true if object is null or undefined
 */
function isNullOrUndefined (object) {
  return ((object === null) || (object === undefined));
}

/**
  * Find an item in an array or null if not found
  * @param {object} array          - array to search
  * @param {function(object)} test - predicate function to test array object or object
  * @return   found object or null
  */
function find (array, test) {
  var found = null;
  if (array) {
    for (var i = 0; i < array.length; ++i) {
      var match;
      if (typeof test === 'function') {
        match = test(array[i]);
      } else {
        match = (array[i] === test);
      }
      if (match) {
        found = array[i];
        break;
      }
    }
  }
  return found;
}

/**
  * Clone an object, based on a specified list of property names
  * @param {object} object       - object to clone
  * @param {string[]} properties - list of property names or all properties if omitted
  * @param {boolean} include     - true = default, only get properties in list, false = exclude properties in list
  */
function cloneObject (object, properties, include) {
  // set defaults for arguments not passed
  if (isNullOrUndefined(include)) {
    include = true;
  }
  if (isNullOrUndefined(properties)) {
    properties = Object.getOwnPropertyNames(object);
  }
  
  var newObject = {};
  if (include) {
    // include mode
    for (var i = 0; i < properties.length; ++i) {
      if (object.hasOwnProperty(properties[i])) {
        newObject[properties[i]] = object[properties[i]];
      }
    }
  } else {
    // exclude mode
    Object.getOwnPropertyNames(object).forEach(function (name, index, array) {
      if (properties.indexOf(name) < 0) {
        newObject[name] = object[name];
      }
    });
  }
  return newObject;
}

/*
  * Get a list of the names of paths in a Mongoose schema
  * @param {object} model        - mongoose model object to get paths from
  * @param {boolean} exVersionId - exclude version & id paths
  * @param {boolean} exTimestamp - exclude timestamp paths
  * @param {string[]} exPaths    - array of other paths to exclude
  */
function getModelPathNames (model, exVersionId, exTimestamp, exPaths) {
  // set defaults for arguments not passed
  if (!exVersionId) { exVersionId = false; }
  if (!exTimestamp) { exTimestamp = false; }
  if (!exPaths) { exPaths = []; }

  var list = [];
  model.schema.eachPath(function (path, index, array) {
    var exclude;
    switch (path) {
      case '_id': // mongoose id path
      case '__v': // mongoose version path
        exclude = exVersionId;
        break;
      case 'createdAt': // default mongoose created path name
      case 'updatedAt': // default mongoose updated path name
        exclude = exTimestamp;
        break;
      default:
        exclude = (exPaths.indexOf(path) >= 0);
        break;
    }
    if (!exclude) {
      list.push(path);
    }
  });
  return list;
}

/**
 * Check if a path is valid in a model
 * @param {Object} modelNode  - ModelNode to check
 * @param {string} path       - path to check
 * @param {string[]} exPaths  - array of paths to exclude
 * @returns false or ModelNode if valid path 
 */
function validModelPathTest (modelNode, path, exPaths) {
  var model = modelNode.model,
    paths = getModelPathNames(model, true, true, exPaths),
    valid = false;  // always return false for not valid result
  if (paths.length > 0) {
    if (paths.indexOf(path) >= 0) {
      valid = modelNode;
    }
  }
  return valid;
}

/**
 * Check if a path is valid in a model/array of models
 * @param {Object} modelNodes  - ModelNode/array of ModelNode to check
 * @param {string} path        - path to check
 * @param {string[]} exPaths   - array of paths to exclude
 * @returns false or ModelNode if valid path 
 */
function isValidModelPath (modelNodes, path, exPaths) {
  var paths,
    chkArray,
    valid = false;
  if (Array.isArray(modelNodes)) {
    chkArray = modelNodes;
  } else {
    chkArray = [modelNodes];
  }
  for (var i = 0; !valid && (i < chkArray.length); ++i) {
    valid = validModelPathTest(chkArray[i], path, exPaths);
  }
  return valid;
}

/**
  * Get a template object with the paths in a Mongoose schema and values
  * @param {object} source       - source to get values from
  * @param {object} model        - mongoose model object to get paths from
  * @param {string[]} exPaths    - array of other paths to exclude
  * @return {object} object with only valid model paths as properties and corresponding values
  */
function getTemplate (source, model, exPaths) {
  var paths = getModelPathNames(model, true, true, exPaths);
  var fields;
  if (paths.length === 0) {
    fields = {};
  } else {
    fields = cloneObject(source, paths);
  }
  return fields;
}


/**
 * Process the interaction between 2 arrays
 * @param {Object[]} left             - left side array
 * @param {Object[]} right            - right side array
 * @param {function} compareFunction  - comparison function to sort arrays
 * @param {string} action             - action to perform
 * @returns {Object[]}  array containing entries satisfying action  
 */
function processArrays (left, right, compareFunction, action) {
  var dfltCompare = function (a, b) {
    if (a < b) {
      return -1;
    } else if (a > b) {
      return 1;
    }
    return 0;
  };

  if (!compareFunction) {
    compareFunction = dfltCompare;
  }
  if (typeof compareFunction === 'string') {
    action = compareFunction;
    compareFunction = dfltCompare;
  }
  var lcopy = left.slice(0),
    rcopy = right.slice(0),
    result = [],
    lidx = 0,
    ridx = 0,
    processFunction,
    addLeftRemainder = false,
    addRightRemainder = false;

  if (action === 'Intersection') {
    processFunction = function (cmpRes) {
      // if same add to result, otherwise increase index of smaller value array
      if (cmpRes === 0) {
        result.push(lcopy[lidx]);
        ++lidx;
        ++ridx;
      } else if (cmpRes > 0) {  // a > b
        ++ridx;   // b is smaller value array, so inc index
      } else {                  // a < b
        ++lidx;   // a is smaller value array, so inc index
      }
    };
  } else if (action === 'SymmetricDifference') {
    processFunction = function (cmpRes) {
      // if not same add to result and increase index of smaller value array
      if (cmpRes === 0) {
        ++lidx;
        ++ridx;
      } else if (cmpRes > 0) {    // a > b
        result.push(rcopy[ridx]);
        ++ridx;   // b is smaller value array, so inc index
      } else {                    // a < b
        result.push(lcopy[lidx]);
        ++lidx;   // a is smaller value array, so inc index
      }
    };
    addLeftRemainder = true;
    addRightRemainder = true;
  } else if (action === 'RelativeComplementAinB') {
    processFunction = function (cmpRes) {
      // if not same add to result if in B and increase index of smaller value array
      if (cmpRes === 0) {
        ++lidx;
        ++ridx;
      } else if (cmpRes > 0) {    // a > b
        result.push(rcopy[ridx]);
        ++ridx;   // b is smaller value array, so inc index
      } else {                    // a < b
        ++lidx;   // a is smaller value array, so inc index
      }
    };
    addRightRemainder = true;
  } else if (action === 'RelativeComplementBinA') {
    processFunction = function (cmpRes) {
      // if not same add to result if in A and increase index of smaller value array
      if (cmpRes === 0) {
        ++lidx;
        ++ridx;
      } else if (cmpRes > 0) {    // a > b
        ++ridx;   // b is smaller value array, so inc index
      } else {                    // a < b
        result.push(lcopy[lidx]);
        ++lidx;   // a is smaller value array, so inc index
      }
    };
    addLeftRemainder = true;
  } else {
    throw new Error('Unreckonised action: ' + action);
  }

  lcopy.sort(compareFunction);
  rcopy.sort(compareFunction);
  while ((lidx < lcopy.length) && (ridx < rcopy.length)) {
    processFunction(compareFunction(lcopy[lidx], rcopy[ridx]));
  }

  if (addLeftRemainder) {
    while (lidx < lcopy.length) {
      result.push(lcopy[lidx++]);
    }
  }
  if (addRightRemainder) {
    while (ridx < rcopy.length) {
      result.push(rcopy[ridx++]);
    }
  }
  return result;
}

/**
 * Generate an array containing the Intersection between 2 arrays, 
 * i.e the elements common to both
 * @param {Object[]} a                - left side array
 * @param {Object[]} b                - right side array
 * @param {function} compareFunction  - comparison function to sort arrays
 * @returns {Object[]}  array containing entries common to both arrays  
 */
function arrayIntersection (a, b, compareFunction) {
  return processArrays(a, b, compareFunction, 'Intersection');
}

/**
 * Generate an array containing the Symmetric Difference between 2 arrays, 
 * i.e the elements not common to both
 * @param {Object[]} a                - left side array
 * @param {Object[]} b                - right side array
 * @param {function} compareFunction  - comparison function to sort arrays
 * @returns {Object[]}  array containing entries not common to both arrays  
 */
function arraySymmetricDifference (a, b, compareFunction) {
  return processArrays(a, b, compareFunction, 'SymmetricDifference');
}

/**
 * Generate an array containing the Relative Complement of A in B of 2 arrays, 
 * i.e elements in B but not in A.
 * @param {Object[]} a                - left side array
 * @param {Object[]} b                - right side array
 * @param {function} compareFunction  - comparison function to sort arrays
 * @returns {Object[]}  array containing Relative Complement of left in right  
 */
function arrayRelativeComplementAinB (a, b, compareFunction) {
  return processArrays(a, b, compareFunction, 'RelativeComplementAinB');
}

/**
 * Generate an array containing the Relative Complement of B in A of 2 arrays, 
 * i.e elements in A but not in B.
 * @param {Object[]} a                - left side array
 * @param {Object[]} b                - right side array
 * @param {function} compareFunction  - comparison function to sort arrays
 * @returns {Object[]}  array containing Relative Complement of left in right  
 */
function arrayRelativeComplementBinA (a, b, compareFunction) {
  return processArrays(a, b, compareFunction, 'RelativeComplementBinA');
}

/**
 * Convert a mongodb ObjectID or array of ObjectIDs to string equivalent(s)
 * @param {ObjectID|Array} id Id(s) to convert
 * @param {funcction} func  Function to apply before saving entry to result
 */
function objectIdToString (id, func) {
  var result;

  if (Array.isArray(id)) {
    result = [];
    id.forEach(function(element) {
      result.push(intObjectIdToString(element, func));
    });
  } else {
    result = intObjectIdToString(id, func);
  }
  return result;
}

/**
 * Convert a single mongodb ObjectID to string equivalent
 * @param {ObjectID|Array} id Id to convert
 * @param {funcction} func  Function to apply before saving entry to result
 */
function intObjectIdToString (id, func) {
  var str = id.toString();
  if (func) {
    str = func(str);
  }
  return str;
}

module.exports = {
  testEquality: testEquality,
  isEmpty: isEmpty,
  isNullOrUndefined: isNullOrUndefined,
  find: find,
  cloneObject: cloneObject,
  arrayIntersection: arrayIntersection,
  arraySymmetricDifference: arraySymmetricDifference,
  arrayRelativeComplementAinB: arrayRelativeComplementAinB,
  arrayRelativeComplementBinA: arrayRelativeComplementBinA,
  getModelPathNames: getModelPathNames,
  isValidModelPath: isValidModelPath,
  getTemplate: getTemplate,
  objectIdToString: objectIdToString
};
