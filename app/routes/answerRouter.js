/*jslint node: true */ /*eslint-env node*/
'use strict';

var express = require('express'),
  bodyParser = require('body-parser'),
  Module = require('../models/answer'),
  model = Module.model,
  getTemplate = Module.getTemplate,
  populateSubDocs = Module.populateSubDocs,
  router_utils = require('./router_utils'),
  checkError = router_utils.checkError,
  errorReply = router_utils.errorReply,
  resultReply = router_utils.resultReply,
  updateDoc = router_utils.updateDoc,
  removeDoc = router_utils.removeDoc,
  getDocById = router_utils.getDocById,
  populateSubDocsReply = router_utils.populateSubDocsReply,
  // utils = require('../misc/utils'),
  Verify = require('./verify'),
  Consts = require('../consts');

var router = express.Router();

router.use(bodyParser.json());


function createAnswer (accessCheck, req, data, res, next) {

  accessCheck(req, res, function (err) {

    if (err) {
      errorReply(res, err.status, err.message);
      return;
    }
    
    var fields = getTemplate(data);

    model.create(fields, function (err, doc) {
      if (!checkError (err, res)) {
        // success
        populateSubDocs(doc, function (err, doc) {
          populateSubDocsReply(err, res, next, doc, Consts.HTTP_CREATED);
        });
      }
    });
  });
}


router.route('/')

  .get(Verify.verifyHasStaffAccess, function (req, res, next) {
    model.find({})
      .exec(function (err, docs) {
        if (!checkError(err, res)) {
          res.json(docs);
        }
      });
  })

  .post(Verify.verifyHasStaffAccess, function (req, res, next) {

    // create answer (no access check as done on route)
    createAnswer(Verify.verifyNoCheck, req, req.body, res, resultReply);
  })

  .delete(Verify.verifyHasStaffAccess, function (req, res, next) {
    model.remove({}, function (err, doc) {
      if (!checkError(err, res)) {
        res.json(doc);
      }
    });
  });

router.route('/:objId')

  .get(function (req, res, next) {
    
    getDocById(Verify.verifySelfOrHasCanvasserAccess, model, req.params.objId, req, res);
  })

  .put(function (req, res, next) {
    
    var fields = getTemplate(req.body);
    
    updateDoc(Verify.verifySelfOrHasCanvasserAccess, fields, model, req.params.objId, req, res, resultReply);
  })

  .delete(function (req, res, next) {
    
    removeDoc(Verify.verifySelfOrHasCanvasserAccess, model, req.params.objId, req, res, resultReply);
  });

module.exports = {
  router: router,
  createAnswer: createAnswer
};

