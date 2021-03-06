/*jslint node: true */ /*eslint-env node*/
'use strict';

var express = require('express'),
  ElectionModule = require('../models/election'),
  Election = ElectionModule.model,
  // schema = ElectionModule.schema,
  getModelNodeTree = ElectionModule.getModelNodeTree,
  getElectionTemplate = ElectionModule.getTemplate,
  isValidModelPath = ElectionModule.isValidModelPath,
  // getSubDocPopulateOptions = ElectionModule.getSubDocPopulateOptions,
  populateSubDocs = ElectionModule.populateSubDocs,
  // VotingSystems = require('../models/votingSystems').model,
  // Candidate = require('../models/candidate').model,
  Verify = require('./verify'),
  router_utils = require('./router_utils'),
  checkError = router_utils.checkError,
  errorReply = router_utils.errorReply,
  resultReply = router_utils.resultReply,
  populateSubDocsReply = router_utils.populateSubDocsReply,
  makeResult = router_utils.makeResult,
  getDocs = router_utils.getDocs,
  // utils = require('../misc/utils'),
  Consts = require('../consts');


var router = express.Router();

function createElection (req, res, next) {

  var electionFields = getElectionTemplate(req.body, []);  // exclude nothing

  Election.create(electionFields, function (err, election) {
    if (!checkError (err, res)) {
      // success
      populateSubDocs(election, function (err, doc) {
        populateSubDocsReply(err, res, next, doc, Consts.HTTP_CREATED);
      });
    }
  });
}

function updateElection (id, req, res, next) {

  var electionFields = getElectionTemplate(req.body, []);  // exclude nothing

  Election.findByIdAndUpdate(id, {
    $set: electionFields
  }, {
    new: true // return the modified document rather than the original
  }, function (err, election) {
    if (!checkError (err, res)) {
      // success
      populateSubDocs(election, function (err, doc) {
        populateSubDocsReply(err, res, next, doc, Consts.HTTP_OK);
      });
    }
  });
}

function deleteElection (id, req, res, next) {

  Election.findById(id, function (err, doc) {
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
        errorReply(res, Consts.HTTP_NOT_FOUND, 'Unknown election identifier');
      }
    }
  });
}

router.route('/')

  .get(Verify.verifyHasCanvasserAccess, function (req, res, next) {

    getDocs(req, res, isValidModelPath, getModelNodeTree(), resultReply); 
  })
    
  .post(Verify.verifyHasStaffAccess, function (req, res) {

    createElection(req, res, resultReply);
  })

  .delete(Verify.verifyHasStaffAccess, function (req, res, next) {

    // check request for query params to delete a subset of items    
    var select = [];
    for (var id in req.query) {
      select.push({_id: id});
    }
    var query = Election.remove({});
    if (select.length > 0) {
      query.or(select);
    }
    query.exec(function (err, docs) {
      if (!checkError(err, res)) {
        res.json(docs);
      }
    });
  });


router.route('/:objId')

  .get(Verify.verifyHasCanvasserAccess, function (req, res, next) {

    getDocs(req, res, isValidModelPath, getModelNodeTree(), resultReply, {
      objName: 'election'
    }); 
  })

  .put(Verify.verifyHasStaffAccess, function (req, res, next) {
    
    updateElection (req.params.objId, req, res, resultReply);
  })

  .delete(Verify.verifyHasStaffAccess, function (req, res, next) {
  
    deleteElection(req.params.objId, req, res, resultReply);
  });

module.exports = {
  router: router
};