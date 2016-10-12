/*jslint node: true */
'use strict';

var express = require('express'),
  bodyParser = require('body-parser'),
  Module = require('../models/contactDetails'),
    model = Module.model,
    getTemplate = Module.getTemplate,
  router_utils = require('./router_utils'),
    errorReply = router_utils.errorReply,
    resultReply = router_utils.resultReply,
    updateDoc = router_utils.updateDoc,
    removeDoc = router_utils.removeDoc,
    getDocById = router_utils.getDocById,
  utils = require('../misc/utils'),
  Verify = require('./verify'),
  Consts = require('../consts');

var router = express.Router();

router.use(bodyParser.json());



router.route('/')

  .get(Verify.verifyOrdinaryUser, function (req, res, next) {
    model.find({})
      .exec(function (err, result) {
        if (err) {
          errorReply(res, err.status, err.message);
        } else {
          res.json(result);
        }
      });
  })

  /* The verifyAdmin() function first performs a verifyOrdinaryUser to verify the username & password before checking the admin flag. An alternative approach is "Verify.verifyOrdinaryUser, Verify.verifyAdmin" where you have a verifyAdmin() function that just does an admin flag check. */
  .post(Verify.verifyAdmin, function (req, res, next) {
    model.create(req.body, function (err, result) {
      if (err) {
        errorReply(res, err.status, err.message);
      } else {
        res.json(result);
      }
    });
  })

  .delete(Verify.verifyAdmin, function (req, res, next) {
    model.remove({}, function (err, result) {
      if (err) {
        errorReply(res, err.status, err.message);
      } else {
        res.json(result);
      }
    });
  });

router.route('/:objId')
  .all(Verify.verifyHasCanvasserAccess)

  .get(function (req, res, next) {
    
    getDocById(Verify.verifyHasCanvasserAccess, model, req.params.objId, req, res);
  })

  .put(function (req, res, next) {
    
    var fields = getTemplate(req.body);
    
    updateDoc(Verify.verifyHasCanvasserAccess, fields, model, req.params.objId, req, res, resultReply);
  })

  .delete(function (req, res, next) {
    
    removeDoc(Verify.verifyHasCanvasserAccess, model, req.params.objId, req, res, resultReply);
  });

module.exports = {
  router: router
};

