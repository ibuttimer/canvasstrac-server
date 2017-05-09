/*jslint node: true */
'use strict';

var express = require('express'),
  bodyParser = require('body-parser'),
  Module = require('../models/canvassResult'),
    model = Module.model,
    getTemplate = Module.getTemplate,
    populateSubDocs = Module.populateSubDocs,
  router_utils = require('./router_utils'),
    checkError = router_utils.checkError,
    errorReply = router_utils.errorReply,
    resultReply = router_utils.resultReply,
    populateSubDocsReply = router_utils.populateSubDocsReply,
    doChecks = router_utils.doChecks,
    updateDoc = router_utils.updateDoc,
    removeDoc = router_utils.removeDoc,
  addCanvassResult = require('./canvassRouter').addCanvassResult,
  createAnswer = require('./answerRouter').createAnswer,
  utils = require('../misc/utils'),
  Verify = require('./verify'),
  Consts = require('../consts');

var router = express.Router();

router.use(bodyParser.json());


function createCanvassResult (req, answers, res, next) {

  var fields = getTemplate(req.body, ['answers']),  // exclude only answers
    canvassId = req.body.canvass;

  fields.answers = answers;

  model.create(fields, function (err, resDoc) {
    if (!checkError(err, res)) {

      addCanvassResult (canvassId, resDoc._id, function (err, doc) {
        if (!checkError(err, res)) {
          // success
          populateSubDocs(resDoc, function (err, doc) {
            if (!checkError(err, res)) {
              // success
              res.json(doc);
            }
          });
        }
      });
    }
  });
}


router.route('/')

  .get(Verify.verifyHasCanvasserAccess, function (req, res, next) {
    model.find({})
      .exec(function (err, docs) {
        if (!checkError(err, res)) {
          populateSubDocs(docs, function (err, docs) {
            if (!checkError(err, res)) {
              // success
              res.json(docs);
            }
          });
        }
      });
  })

  .post(Verify.verifyHasCanvasserAccess, function (req, res, next) {

    var rawAnswers = req.body.answers,
      answers = [];

    if (rawAnswers && rawAnswers.length) {
      // first save all the answers, then the result
      for (var i = 0; i < rawAnswers.length; ++i) {
        // create answers (no access check as done on route)
        createAnswer(Verify.verifyNoCheck, req, rawAnswers[i], res, function (result, res) {
          if (result) {
            // answer successfully created
            answers.push(result.payload._id);

            if (answers.length === rawAnswers.length) {
              // save the canvass result now that all the answers are saved
              createCanvassResult(req, answers, res, next);
            }
          }
        });
      }
    } else {
      // no answers so just save result
      createCanvassResult(req, answers, res, next);
    }
  })

  .delete(Verify.verifyHasStaffAccess, function (req, res, next) {
    model.remove({}, function (err, doc) {
      if (!checkError(err, res)) {
        populateSubDocs(doc, function (err, doc) {
          if (!checkError(err, res)) {
            // success
            res.json(doc);
          }
        });
      }
    });
  });

router.route('/:objId')

  .get(Verify.verifySelfOrHasCanvasserAccess, function (req, res, next) {

    model.findById(req.params.objId)
      .exec(function (err, doc) {
        if (!checkError(err, res)) {
          populateSubDocs(doc, function (err, doc) {
            if (!checkError(err, res)) {
              // success
              res.json(doc);
            }
          });
        }
      });
  })

  .put(Verify.verifySelfOrHasCanvasserAccess, function (req, res, next) {
    
    var fields = getTemplate(req.body);

    model.findByIdAndUpdate(req.params.objId, {
        $set: fields
      }, {
        new: true // return the modified document rather than the original
      }, function (err, user) {
        if (!checkError (err, res)) {
          // success
          populateSubDocs(user, function (err, doc) {
            if (!checkError(err, res)) {
              // success
              res.json(doc);
            }
          });
        }
      }
    );
  })

  .delete(function (req, res, next) {
    
    removeDoc(Verify.verifySelfOrHasCanvasserAccess, model, req.params.objId, req, res, resultReply);
  });

module.exports = {
  router: router
};

