/*jslint node: true */ /*eslint-env node*/
'use strict';

var express = require('express'),
  bodyParser = require('body-parser'),
  Module = require('../models/question'),
  model = Module.model,
  getTemplate = Module.getTemplate,
  router_utils = require('./router_utils'),
  checkError = router_utils.checkError,
  errorReply = router_utils.errorReply,
  resultReply = router_utils.resultReply,
  // doChecks = router_utils.doChecks,
  updateDoc = router_utils.updateDoc,
  removeDoc = router_utils.removeDoc,
  getDocById = router_utils.getDocById,
  // utils = require('../misc/utils'),
  Verify = require('./verify'),
  Consts = require('../consts');

var router = express.Router();

router.use(bodyParser.json());


router.route('/')

  .get(Verify.verifyHasCanvasserAccess, function (req, res, next) {
    model.find({})
      .exec(function (err, docs) {
        if (!checkError(err, res)) {
          res.json(docs);
        }
      });
  })

  .post(Verify.verifyHasStaffAccess, function (req, res, next) {
    var template = getTemplate(req.body);
    if (template) {
      model.create(template, function (err, doc) {
        if (!checkError(err, res)) {
          res.json(doc);
        }
      });
    } else {
      errorReply(res, Consts.HTTP_BAD_REQUEST, 'Invalid template');
    }
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
    //     res.json(doc);
    //   }
    // });
  });

router.route('/:objId')

  .get(function (req, res, next) {
    
    getDocById(Verify.verifyOrdinaryUser, model, req.params.objId, req, res);
  })

  .put(function (req, res, next) {
    
    var fields = getTemplate(req.body);
    
    updateDoc(Verify.verifyHasStaffAccess, fields, model, req.params.objId, req, res, resultReply);
  })

  .delete(function (req, res, next) {
    
    removeDoc(Verify.verifyHasStaffAccess, model, req.params.objId, req, res, resultReply);
  });

module.exports = {
  router: router
};

