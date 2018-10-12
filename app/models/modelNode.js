/*jslint node: true */ /*eslint-env node*/
'use strict';

// grab the things we need
var utilsModule = require('../misc/utils'),
  cloneObject = utilsModule.cloneObject,
  getModelPathTypes = utilsModule.getModelPathTypes,
  debug = require('debug')('modelNode');

/**
 * ModeNode object
 * @param {mongoose.model} model  - mongoose.model to represent
 * @param {Object} options        - object containing optional arguments:
 *    @param {string} parent            + ref to parent node
 *    @param {string} path              + path in parent model to this model
 *    @param {function} populateSubDocs + function to populate subdocuments
 *    @param {Object} projection        + determines fields to be returned/excluded in queries
 */
function ModelNode (model, options) {
  this.model = model;
  this.path = undefined;
  this.parent = undefined;
  this.populateSubDocs = undefined;
  this.projection = undefined;
  if (options) {
    this.path = options.path;
    this.parent = options.parent;
    this.populateSubDocs = options.populateSubDocs;
    this.projection = options.projection;
  }
  this.sibling = undefined;// ref to next node in sibling chain or undefined if end of chain
  this.child = undefined;  // ref to first child in child chain or undefined if no children
}

/** 
 * Do a pre-order depth-first traversal of the tree
*/
ModelNode.prototype.preorder = function (node, callback) {
  if (typeof node === 'function') {
    callback = node;
    node = this;
  }
  if (node) {
    // callback on current node
    callback(node);
    // Traverse the left subtree by recursively calling the pre-order function
    ModelNode.prototype.preorder(node.child, callback);
    // Traverse the right subtree by recursively calling the pre-order function
    ModelNode.prototype.preorder(node.sibling, callback);
  }
};

/** 
 * Do a breath-first traversal of the tree
*/
ModelNode.prototype.levelorder = function (root, callback) {
  if (typeof root === 'function') {
    callback = root;
    root = this;
  }
  if (root) {
    var queue = [];
    queue.push(root);
    while (queue.length) {
      var node = queue.shift(); // fifo queue
      callback(node, node.parent, node.sibling, node.child);
      if (node.sibling) {
        queue.unshift(node.sibling);  // siblings added at start
      }
      if (node.child) {
        queue.push(node.child);       // children added at end
      }
    }
  }
};

ModelNode.prototype.getRoot = function (node) {
  if (!node) {
    node = this;
  }
  while (node.parent) {
    node = node.parent;
  }
  return node;
};

ModelNode.prototype.getFirstSibling = function (node) {
  if (!node) {
    node = this;
  }
  var sibling; 
  if (node.parent) {
    // parent's child ref is first in chain
    sibling = node.parent.child; 
  } else {
    sibling = node; // it's a root'
  }
  return sibling;
};

ModelNode.prototype.getLastSibling = function (node) {
  if (!node) {
    node = this;
  }
  var sibling = node; // default to itself
  while (sibling.sibling) {
    sibling = sibling.sibling;
  }
  return sibling;
};

ModelNode.prototype.addAsLastChild = function (node, child) {
  if (node.child) {
    var childSibling = node.getLastSibling(node.child);
    childSibling.sibling = child;
  } else {
    node.child = child;
  }
  return child;
};

/**
 * Add a child
 * @param {mongoose.model} model  - mongoose.model of child
 * @param {string} path           - path in parent model to child model
 * @param {Object} options        - object containing optional Child arguments:
 *    @param {function} populateSubDocs + function to populate subdocuments
 *    @param {Object} projection        + determines fields to be returned/excluded in queries
 */
ModelNode.prototype.addChild = function (model, path, options) {
  if (!model) {
    throw new Error('Unable to add child: model is required');
  }
  if (!path) {
    throw new Error('Unable to add child: path is required');
  }
  var opts;
  if (!options) {
    opts = {};
  } else {
    opts = {
      populateSubDocs: options.populateSubDocs,
      projection: options.projection
    };
  }
  opts.path = path;
  opts.parent = this;
  // insert new child node at end of children node chain
  var child = new ModelNode(model, opts);
  return this.addAsLastChild(this, child);
};

ModelNode.prototype.addChildBranch = function (node, path) {
  if (!node) {
    throw new Error('Unable to add child: node is required');
  }
  if (!path) {
    throw new Error('Unable to add child: path is required');
  }
  // insert new child branch at end of children node chain
  var child = cloneObject(node);
  // copy of 'node is a root node, so set parent & path
  child.parent = this; 
  child.path = path;
  // need to clone children tree as well so it can use 'child' as it's root
  
  var clone,
    queue = [child];
  while (queue.length) {
    var pnode = queue.shift(); // fifo queue
    if (pnode.sibling) {
      clone = cloneObject(pnode.sibling);
      clone.parent = pnode.parent;
      pnode.sibling = clone;
      queue.unshift(clone); // add cloned sibling to start of queue
    }
    if (pnode.child) {
      clone = cloneObject(pnode.child);
      clone.parent = pnode;
      pnode.child = clone;
      queue.push(clone);  // add cloned child to end of queue
    }
  }
  return this.addAsLastChild(this, child);
};

/**
 * Add a sibling
 * @param {mongoose.model} model  - mongoose.model of child
 * @param {string} path           - path in parent model to child model
 * @param {Object} options        - object containing optional Child arguments:
 *    @param {function} populateSubDocs + function to populate subdocuments
 *    @param {Object} projection        + determines fields to be returned/excluded in queries
 */
ModelNode.prototype.addSibling = function (model, path, options) {
  if (!model) {
    throw new Error('Unable to add sibling: model is required');
  }
  if (!path) {
    throw new Error('Unable to add sibling: path is required');
  }
  if (!this.parent) {
    throw new Error('Unable to add sibling to root ModelNode');
  }
  var opts;
  if (!options) {
    opts = {};
  } else {
    opts = {
      populateSubDocs: options.populateSubDocs,
      projection: options.projection
    };
  }
  opts.path = path;
  opts.parent = this.parent;
  // insert new sibling node after this node
  var sibling = new ModelNode(model, opts);
  sibling.sibling = this.sibling;
  this.sibling = sibling;
  return sibling;
};


ModelNode.prototype.forEachInChain = function (node, callback) {
  while (node) {
    callback(node);
    node = node.sibling;
  }
};

ModelNode.prototype.forEachInArray = function (stack, start, callback) {
  var i, end, step;
  if (stack.length) {
    if (start <= 0) {
      i = 0;
      end = stack.length - 1;
      step = 1;
    } else {
      i = stack.length - 1;
      end = 0;
      step = -1;
    }
    while (i !== end) {
      callback(stack[i]);
      i += step;
    }
  }
};

ModelNode.prototype.forEachSibling = function (node, callback) {
  if (typeof node === 'function') {
    callback = node;
    node = this;
  } else if (!node) {
    node = this;
  }
  var sibling = node.getFirstSibling(node); // first in sibling chain
  node.forEachInChain(sibling, callback);
};

/**
 * Return an array of siblings in order. Use as a queue (fifo) with shift() or a 
 * stack (lifo) with pop(). 
 */
ModelNode.prototype.getSiblingArray = function (node) {
  var sibling = node.getFirstSibling(node), // first in sibling chain
    stack = [];
  while (sibling) {
    stack.push(sibling);
    sibling = sibling.sibling;
  }
  return stack;
};

ModelNode.prototype.forEachSiblingRev = function (node, callback) {
  if (typeof node === 'function') {
    callback = node;
    node = this;
  } else if (!node) {
    node = this;
  }
  var sibling = node.getFirstSibling(node), // first in sibling chain
    stack = node.getSiblingArray(sibling);
  node.forEachInArray(stack, stack.length, callback);
};

ModelNode.prototype.forEachChild = function (node, callback) {
  if (typeof node === 'function') {
    callback = node;
    node = this;
  } else if (!node) {
    node = this;
  }
  var child = node.child; // first in child chain
  node.forEachInChain(child, callback);
};

ModelNode.prototype.forEach = function (callback) {
  this.preorder(this.getRoot(), callback); 
};

ModelNode.prototype.getTree = function () {
  var tree = [];
  this.forEach(function (node) {
    tree.push(node);
  });
  return tree;
};

/**
  * Get a list of the names & types of paths in a Mongoose schema
  * @param {object} options - options object with the following properties:
  *                           @see utils.excludePath() for details
  */
ModelNode.prototype.getModelPathTypes = function (options) {
  var result;
  this.forEach(function (node) {
    var pathTypes = getModelPathTypes(node.model, options);
    if (result === undefined) {
      result = pathTypes;
    } else {
      result[node.path] = pathTypes;
    }
  });
  return result;
};

ModelNode.prototype.dumpTree = function () {
  var dump = function (node, title) {
    var msg = title + ' ' + node.model.modelName;
    if (node.path) {
      msg += ' path "' + node.path + '"';
    }
    debug(msg);
  };
  this.forEach(function (node) {
    dump(node, 'model');
    // debug('model', node.model.modelName, 'path', node.path);
    var indent = '  ',
      parent;
    for (parent = node.parent; parent; parent = parent.parent) {
      dump(parent, indent + 'parent');
      // debug(indent + 'parent', parent.model.modelName, 'path', parent.path);
      indent += '  ';
    }
  });
};

/**
 * Returns a projection for a query in the form { 
 *  <field>: x,
 *  <path>.<field>: x,
 * }
 */
ModelNode.prototype.getProjection = function () {
  var projection = {},
    parent,
    join,
    path;

  this.forEach(function (node) {
    if (node.projection) {
      path = node.path;
      if (!path) {
        path = '';
      }
      for (parent = node.parent; parent; parent = parent.parent) {
        if (parent.path)  {
          join = parent.path;
          if (path.length) {
            join += '.';
          }
        } else {
          join = '';
        }
        path = join + path;
      }
      Object.getOwnPropertyNames(node.projection).forEach(function (name) {
        var prop;
        if (path) {
          prop = path + '.' + name;
        } else {
          prop = name;
        }
        projection[prop] = node.projection[name];
      });
    }
  });
  return projection;
};

/**
 * Convert a projection in object notation to string syntax.
 * @param {object} projection   object to convert
 * @return {string} string syntax
 */
ModelNode.prototype.objectNotationToStringSyntax = function (projection) {
  var result = '';
  if (typeof projection === 'string') {
    result = projection;
  } else if (typeof projection === 'object') {
    Object.getOwnPropertyNames(projection).forEach(function (name) {
      if (result.length) {
        result += ' ';
      }
      if (this[name] === 0) {
        result += '-'; // use '-' syntax to exclude
      }
      result += name;
    }, projection);
  }
  return result;
};

/**
 * Convert a projection in string syntax to object notation.
 * @param {object} projection   object to convert
 * @return {string} object notation
 */
ModelNode.prototype.stringSyntaxToObjectNotation = function (projection) {
  var result;
  if (typeof projection === 'object') {
    result = projection;
  } else if (typeof projection === 'string') {
    var splits = projection.split(' ');
    splits.forEach(function (name) {
      if (!result) {
        result = {};
      }
      if (name.indexOf('-') === 0) {  // use '-' syntax to exclude
        result[name] = 0;
      } else {
        result[name] = 1;
      }
    }, projection);
  }
  return result;
};

/**
 * Returns a projection for a populate in object notation { 
 *  field: '0|1'
 * }
 */
ModelNode.prototype.getPopulateProjection = function () {
  var projection;

  /* if the projection is in object notation, return as is, and if its in 
  string syntax convert to object notation */
  if (this.projection) {
    projection = this.stringSyntaxToObjectNotation(this.projection);
  }
  return projection;
};


module.exports = {
  ModelNode: ModelNode
};