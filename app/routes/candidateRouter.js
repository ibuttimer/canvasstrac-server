/*jslint node: true */
'use strict';

var express = require('express'),
  CandidateModule = require('../models/candidate'),
    Candidate = CandidateModule.model,
    getCandidateTemplate = CandidateModule.getTemplate,
    getSubDocPopulateOptions = CandidateModule.getSubDocPopulateOptions,
    populateSubDocs = CandidateModule.populateSubDocs,
  personRouterModule = require('./personRouter'),
    createPerson = personRouterModule.createPerson,
    deletePerson = personRouterModule.deletePerson,
    updatePerson = personRouterModule.updatePerson,
  Verify = require('./verify'),
  router_utils = require('./router_utils'),
    checkError = router_utils.checkError,
    resultReply = router_utils.resultReply,
    populateSubDocsReply = router_utils.populateSubDocsReply,
    makeResult = router_utils.makeResult,
    removeDoc = router_utils.removeDoc,
    removeDocAccessOk = router_utils.removeDocAccessOk,
  utils = require('../misc/utils'),
  Consts = require('../consts');


var router = express.Router();

function createCandidate (req, res, next) {

  var candidateFields = getCandidateTemplate(req.body, ['person']);  // only exclude person as party is required

  Candidate.create(candidateFields, function (err, candidate) {
    if (!checkError (err, res)) {

      req.body.owner = candidate._id; // add candidate owner field

      // create person (no access check as done on route)
      createPerson(Verify.verifyNoCheck, req, res, function (result, res) {
        if (result) {
          // person successfully created
          candidate.person = result.payload._id;
          candidate.save(function (err, newcandidate) {
            if (!checkError (err, res)) {
              // success
              populateSubDocs(newcandidate, function (err, doc) {
                populateSubDocsReply(err, res, next, doc, Consts.HTTP_CREATED);
              });
            } else {
              // tidy up by removing everything
              personRouter.deletePerson(req, candidate.person, res, function (result, res) { });
              removeDocAccessOk(Candidate, candidate._id);
              var err = new Error('Unable to save candidate.');
              err.status = Consts.HTTP_INTERNAL_ERROR;
              checkError(err, res);
            }
          });
        } else {
          // tidy up by removing candidate
          removeDocAccessOk(Candidate, candidate._id);
          var err = new Error('Unable to create person.');
          err.status = Consts.HTTP_INTERNAL_ERROR;
          checkError(err, res);
        }
      });
    }
  });
}

function updateCandidate (id, req, res, next) {

  var candidateFields = getCandidateTemplate(req.body, ['person']);  // only exclude person as party is required

  Candidate.findByIdAndUpdate(id, {
      $set: candidateFields
    }, {
      new: true // return the modified document rather than the original
    }, function (err, candidate) {
      if (!checkError (err, res)) {
        // update person (no access check sd done on route)
        updatePerson(Verify.verifyNoCheck, candidate.person, req, res, function (result, res) {
          if (result) {
            // success
            populateSubDocs(candidate, function (err, doc) {
              populateSubDocsReply(err, res, next, doc, Consts.HTTP_OK);
            });
          }
        });
      }
    }
  );
}

function deleteCandidate (id, req, res, next) {

  Candidate.findById(id, function (err, doc) {
    if (!checkError (err, res)) {
      if (doc) {
        // delete person (no access check sd done on route)
        deletePerson(Verify.verifyNoCheck, doc.person, req, res, function (result, res) {
          if (result) {
            // success
            doc.remove(function (err, doc) {
              if (!checkError (err, res)) {
                // success
                next(makeResult(Consts.HTTP_OK, doc), res);
              }
            });
          }
        });
      } else {
        errorReply(res, Consts.HTTP_NOT_FOUND, 'Unknown candidate identifier');
      }
    }
  });
}


router.route('/')

  .get(Verify.verifyHasCanvasserAccess, function (req, res, next) {
    Candidate.find({})
      .exec(function (err, docs) {
        if (!checkError(err, res)) {
          populateSubDocs(docs, function (err, docs) {
            if (!checkError(err, res)) {
              res.json(docs);
            }
          });
        }
      });
    })
    
  .post(Verify.verifyAdmin, function (req, res) {

    createCandidate(req, res, resultReply);
  });


router.route('/:objId')

  .get(Verify.verifyHasCanvasserAccess, function (req, res, next) {
    Candidate.findById(req.params.objId)
      .exec(function (err, doc) {
        if (!checkError(err, res)) {
          if (doc) {
            populateSubDocs(doc, function (err, doc) {
              if (!checkError(err, res)) {
                res.json(doc);
              }
            });
          } else {
            errorReply(res, Consts.HTTP_NOT_FOUND, 'Unknown candidate identifier');
          }
        }
    });
  })

  .put(Verify.verifyHasStaffAccess, function (req, res, next) {
    
    updateCandidate (req.params.objId, req, res, resultReply);
  })

  .delete(Verify.verifyHasStaffAccess, function (req, res, next) {
  
    deleteCandidate(req.params.objId, req, res, resultReply);
  });

module.exports = {
  router: router
};