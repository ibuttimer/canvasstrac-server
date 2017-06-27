/*jslint node: true */
'use strict';

var express = require('express'),
  ModelModule = require('../models/votingSystems'),
    Model = ModelModule.model,
    schema = ModelModule.schema,
    getModelNodeTree = ModelModule.getModelNodeTree,
    isValidModelPath = ModelModule.isValidModelPath,
  Verify = require('./verify'),
  router_utils = require('./router_utils'),
    checkError = router_utils.checkError,
    errorReply = router_utils.errorReply,
    resultReply = router_utils.resultReply,
    populateSubDocsReply = router_utils.populateSubDocsReply,
    makeResult = router_utils.makeResult,
    removeDoc = router_utils.removeDoc,
    removeDocAccessOk = router_utils.removeDocAccessOk,
    getDocs = router_utils.getDocs,
  utils = require('../misc/utils'),
  Consts = require('../consts');

var router = express.Router();


router.route('/')

  .get(Verify.verifyOrdinaryUser, function (req, res, next) {

    getDocs(req, res, isValidModelPath, getModelNodeTree(), resultReply); 
  })

  .post(Verify.verifyHasStaffAccess, function (req, res) {

    Model.create(req.body, function (err, doc) {
      if (!checkError(err, res)) {
        res.status(Consts.HTTP_CREATED).json(doc);
      }
    });
  });

router.route('/:objId')

  .get(Verify.verifyOrdinaryUser, function (req, res, next) {

    getDocs(req, res, isValidModelPath, getModelNodeTree(), resultReply, {
      objName: 'voting system'
    }); 
  })

  .put(Verify.verifyHasStaffAccess, function (req, res, next) {
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

  .delete(Verify.verifyHasStaffAccess, function (req, res, next) {
  
    Model.findByIdAndRemove(req.params.objId, function (err, doc) {
      if (!checkError(err, res)) {
        res.json(doc);
      }
    });
  });

module.exports = {
  router: router
};
