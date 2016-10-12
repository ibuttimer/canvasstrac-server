/*jslint node: true */
'use strict';

// grab the things we need
var mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  utilsModule = require('../misc/utils'),
    cloneObject = utilsModule.cloneObject,
    utilsIsValidModelPath = utilsModule.isValidModelPath,
    getUtilsTemplate = utilsModule.getTemplate,
    getModelPathNames = utilsModule.getModelPathNames;

function ModelNode (model, path, parent, populateSubDocs) {
  if (typeof path === 'function') {
    populateSubDocs = path;
    path = undefined;
    parent = undefined;
  } else if (typeof parent === 'function') {
    populateSubDocs = parent;
    parent = undefined;
  }

  this.model = model;     // mongoose model
  this.path = path;       // path in parent model to this model
  this.parent = parent;   // ref to parent node
  this.populateSubDocs = populateSubDocs; // function to populate sub docs
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
    callback(node);
    ModelNode.prototype.preorder(node.child, callback);
    ModelNode.prototype.preorder(node.sibling, callback);
  }
}

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
}

ModelNode.prototype.getRoot = function (node) {
  if (!node) {
    node = this;
  }
  while (node.parent) {
    node = node.parent;
  }
  return node;
}

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
}

ModelNode.prototype.getLastSibling = function (node) {
  if (!node) {
    node = this;
  }
  var sibling = node; // default to itself
  while (sibling.sibling) {
    sibling = sibling.sibling;
  }
  return sibling;
}

ModelNode.prototype.addAsLastChild = function (node, child) {
  if (node.child) {
    var childSibling = node.getLastSibling(node.child);
    childSibling.sibling = child;
  } else {
    node.child = child;
  }
  return child;
}

ModelNode.prototype.addChild = function (model, path) {
  if (!model) {
    throw new Error('Unable to add child: model is required');
  }
  if (!path) {
    throw new Error('Unable to add child: path is required');
  }
  // insert new child node at end of children node chain
  var child = new ModelNode(model, path, this); 
  return this.addAsLastChild(this, child);
}

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
  
  var queue = [child];
  while (queue.length) {
    var pnode = queue.shift(); // fifo queue
    if (pnode.sibling) {
      var clone = cloneObject(pnode.sibling);
      clone.parent = pnode.parent;
      pnode.sibling = clone;
      queue.unshift(clone); // add cloned sibling to start of queue
    }
    if (pnode.child) {
      var clone = cloneObject(pnode.child);
      clone.parent = pnode;
      pnode.child = clone;
      queue.push(clone);  // add cloned child to end of queue
    }
  }
  return this.addAsLastChild(this, child);
};

ModelNode.prototype.addSibling = function (model, path) {
  if (!model) {
    throw new Error('Unable to add sibling: model is required');
  }
  if (!path) {
    throw new Error('Unable to add sibling: path is required');
  }
  if (!this.parent) {
    throw new Error('Unable to add sibling to root ModelNode');
  }
  // insert new sibling node after this node
  var sibling = new ModelNode(model, path, this.parent);
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
}

ModelNode.prototype.getTree = function () {
  var tree = [];
  this.forEach(function (node) {
    tree.push(node);
  });
  return tree;
}


module.exports = {
  ModelNode: ModelNode
};