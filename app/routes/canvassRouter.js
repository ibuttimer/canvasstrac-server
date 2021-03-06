/*jslint node: true */ /*eslint-env node*/
'use strict';

var express = require('express'),
  bodyParser = require('body-parser'),
  Module = require('../models/canvass'),
  model = Module.model,
  getModelNodeTree = Module.getModelNodeTree,
  getTemplate = Module.getTemplate,
  populateSubDocs = Module.populateSubDocs,
  isValidModelPath = Module.isValidModelPath,
  AssignmentModule = require('../models/canvassAssignment'),
  cancelAssignments = AssignmentModule.cancelAssignments,
  utilsModule = require('../misc/utils'),
  arrayRelativeComplementBinA = utilsModule.arrayRelativeComplementBinA,
  objectIdToString = utilsModule.objectIdToString,
  router_utils = require('./router_utils'),
  checkError = router_utils.checkError,
  errorReply = router_utils.errorReply,
  resultReply = router_utils.resultReply,
  populateSubDocsReply = router_utils.populateSubDocsReply,
  // updateDoc = router_utils.updateDoc,
  // removeDoc = router_utils.removeDoc,
  // getDocById = router_utils.getDocById,
  getDocs = router_utils.getDocs,
  makeResult = router_utils.makeResult,
  // utils = require('../misc/utils'),
  Verify = require('./verify'),
  Consts = require('../consts');

var router = express.Router();

router.use(bodyParser.json());


function createCanvass (req, res, next) {

  var fields = getTemplate(req.body, []);  // exclude nothing

  model.create(fields, function (err, doc) {
    if (!checkError (err, res)) {
      // success
      populateSubDocs(doc, function (err, doc) {
        populateSubDocsReply(err, res, next, doc, Consts.HTTP_CREATED);
      });
    }
  });
}

/**
 * Update a canvass, including updating assignments
 * @param {string} id Id of canvass to update
 * @param {object} req http request
 * @param {object} res hyyp response
 * @param {function} next function to call next
 */
function updateCanvass (id, req, res, next) {

  var canvassers = req.body.canvassers,
    addresses = req.body.addresses,
    rmCanvasser,  // removed canvassers
    rmAddresses;  // removed addresses

  if (!canvassers && !addresses) {
    // no assignments to cancel
    exeUpdateCanvass(id, req, res, next);
  } else {
    // check if need tro cancel assignments
    model.findById(id, function (err, doc) {
      if (!checkError (err, res)) {
        // get canvassers in original but not update
        rmCanvasser = getRemoved(doc.canvassers, canvassers);
        rmAddresses = getRemoved(doc.addresses, addresses);

        if (rmCanvasser.length || rmAddresses.length) {
          // canvassers have been removed, so cancel all their assignments
          cancelAssignments(id, rmCanvasser, rmAddresses, function (err, doc) {
            if (!checkError (err, res)) {
              // success
              exeUpdateCanvass(id, req, res, next);
            }
          });
        } else {
          // no assignments to cancel
          exeUpdateCanvass(id, req, res, next);
        }
      }
    });
  }
}

function getRemoved (originalObjId, updateStr) {
  var update = [],
    original = objectIdToString(originalObjId, function(element) {
      return element.toLowerCase();
    });

  updateStr.forEach(function(element) {
    update.push(element.toLowerCase());
  });
  // get entries that are only in original
  return arrayRelativeComplementBinA(original, update);
}

/**
 * Update a canvass
 * @param {string} id Id of canvass to update
 * @param {object} req http request
 * @param {object} res hyyp response
 * @param {function} next function to call next
 */
function exeUpdateCanvass (id, req, res, next) {

  var fields = getTemplate(req.body, []);  // exclude nothing

  model.findByIdAndUpdate(id, {
    $set: fields
  }, {
    new: true // return the modified document rather than the original
  }, function (err, doc) {
    if (!checkError (err, res)) {
      // success
      populateSubDocs(doc, function (err, doc) {
        populateSubDocsReply(err, res, next, doc, Consts.HTTP_OK);
      });
    }
  });
}

/**
 * @param {string} canvassId   - id of canvass doc to update
 * @param {string} resultId    - id of canvass result doc to add to canvass doc
 */
function addCanvassResult (canvassId, resultId, next) {

  model.findById(canvassId, function (err, doc) {
    if (err) {
      next(err, doc);
    } else {
      doc.results.push(resultId);
      doc.save(function (err, doc) {
        next(err, doc);
      });
    }
  });
}

function deleteCanvass (id, req, res, next) {

  model.findById(id, function (err, doc) {
    if (!checkError (err, res)) {
      if (doc) {
        // success
        doc.remove(function (err, doc) {
          if (!checkError (err, res)) {
            // success
            next(makeResult(Consts.HTTP_OK, doc), res);
          }
        });
      } else {
        errorReply(res, Consts.HTTP_NOT_FOUND, 'Unknown canvass identifier');
      }
    }
  });
}



router.route('/')

  .get(Verify.verifyHasCanvasserAccess, function (req, res, next) {
    
    getDocs(req, res, isValidModelPath, getModelNodeTree(), resultReply); 
  })

  .post(Verify.verifyHasStaffAccess, function (req, res, next) {
    
    createCanvass(req, res, resultReply);
  })

  .delete(Verify.verifyHasStaffAccess, function (req, res, next) {

    // check request for query params to delete a subset of items    
    var select = [];
    for (var id in req.query) {
      select.push({_id: id});
    }
    var query = model.remove({});
    if (select.length > 0) {
      query.or(select);
    }
    query.exec(function (err, docs) {
      if (!checkError(err, res)) {
        res.json(docs);
      }
    });

    // model.remove({}, function (err, doc) {
    //   if (!checkError(err, res)) {
    //     populateSubDocs(doc, function (err, doc) {
    //       if (!checkError(err, res)) {
    //         // success
    //         res.json(doc);
    //       }
    //     });
    //   }
    // });
  });

router.route('/:objId')

  .get(Verify.verifySelfOrHasCanvasserAccess, function (req, res, next) {

    getDocs(req, res, isValidModelPath, getModelNodeTree(), resultReply, {
      objName: 'canvass'
    }); 
  })

  .put(Verify.verifySelfOrHasCanvasserAccess, function (req, res, next) {
    
    updateCanvass(req.params.objId, req, res, resultReply);
  })

  .delete(Verify.verifyHasStaffAccess, function (req, res, next) {
    
    deleteCanvass(req.params.objId, req, res, resultReply);

    // removeDoc(Verify.verifySelfOrHasCanvasserAccess, model, req.params.objId, req, res, resultReply);
  });

module.exports = {
  router: router,
  addCanvassResult: addCanvassResult
};

