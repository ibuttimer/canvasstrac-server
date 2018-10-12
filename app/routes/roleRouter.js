/*jslint node: true */ /*eslint-env node*/
'use strict';

var express = require('express'),
  bodyParser = require('body-parser'),
  ModelModule = require('../models/roles'),
  Model = ModelModule.model,
  // schema = ModelModule.schema,
  isValidModelPath = ModelModule.isValidModelPath,
  getModelNodeTree = ModelModule.getModelNodeTree,
  Verify = require('./verify'),
  router_utils = require('./router_utils'),
  checkError = router_utils.checkError,
  resultReply = router_utils.resultReply,
  // populateSubDocsReply = router_utils.populateSubDocsReply,
  getDocs = router_utils.getDocs,
  // utils = require('../misc/utils'),
  Consts = require('../consts');

var router = express.Router();

router.use(bodyParser.json());

router.route('/')

  .get(Verify.verifyOrdinaryUser, function (req, res, next) {

    getDocs(req, res, isValidModelPath, getModelNodeTree(), resultReply); 
  })

  /* The verifyAdmin() function first performs a verifyOrdinaryUser to verify the username & password before checking the admin flag. An alternative approach is "Verify.verifyOrdinaryUser, Verify.verifyAdmin" where you have a verifyAdmin() function that just does an admin flag check. */
  .post(Verify.verifyAdmin, function (req, res, next) {
    Model.create(req.body, function (err, doc) {
      if (!checkError(err, res)) {
        res.json(doc);
      }
    });
  })

  .delete(Verify.verifyAdmin, function (req, res, next) {
    Model.remove({}, function (err, doc) {
      if (!checkError(err, res)) {
        res.json(doc);
      }
    });
  });

router.route('/:objId')

  .get(Verify.verifyOrdinaryUser, function (req, res, next) {

    getDocs(req, res, isValidModelPath, getModelNodeTree(), resultReply, {
      objName: 'role'
    }); 
  })

  .put(Verify.verifyAdmin, function (req, res, next) {
    Model.findByIdAndUpdate(req.params.objId, {
      $set: req.body
    }, {
      new: true
    }, function (err, doc) {
      if (!checkError(err, res)) {
        res.json(doc);
      }
    });
  })

  .delete(Verify.verifyAdmin, function (req, res, next) {
    Model.findByIdAndRemove(req.params.objId, function (err, doc) {
      if (!checkError(err, res)) {
        res.json(doc);
      }
    });
  });

module.exports = {
  router: router
};

