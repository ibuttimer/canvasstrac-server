/*jslint node: true */
'use strict';

var express = require('express'),
  bodyParser = require('body-parser'),
  AddressModule = require('../models/addresses'),
    model = AddressModule.model,
    getModelNodeTree = AddressModule.getModelNodeTree,
    schema = AddressModule.schema,
    getTemplate = AddressModule.getTemplate,
    isValidModelPath = AddressModule.isValidModelPath,
  router_utils = require('./router_utils'),
    checkError = router_utils.checkError,
    errorReply = router_utils.errorReply,
    resultReply = router_utils.resultReply,
    doChecks = router_utils.doChecks,
    updateDoc = router_utils.updateDoc,
    removeDoc = router_utils.removeDoc,
    decodeReq = router_utils.decodeReq,
    processCountReq = router_utils.processCountReq,
    getDocs = router_utils.getDocs,
  utils = require('../misc/utils'),
  Verify = require('./verify'),
  Consts = require('../consts');

var router = express.Router();

router.use(bodyParser.json());


router.route('/')

  .get(Verify.verifyHasCanvasserAccess, function (req, res, next) {
    
    getDocs(req, res, isValidModelPath, getModelNodeTree(), resultReply); 
  })

  .post(Verify.verifyHasCanvasserAccess, function (req, res, next) {
    model.create(req.body, function (err, doc) {
      if (!checkError(err, res)) {
        res.json(doc);
      }
    });
  })

  .delete(Verify.verifyAdmin, function (req, res, next) {
    model.remove({}, function (err, doc) {
      if (!checkError(err, res)) {
        res.json(doc);
      }
    });
  });

router.route('/count')

  .get(Verify.verifyHasCanvasserAccess, function (req, res, next) {

    processCountReq (req, res, isValidModelPath, model);
  });

router.route('/:objId')

  .get(Verify.verifyHasCanvasserAccess, function (req, res, next) {

    getDocs(req, res, isValidModelPath, getModelNodeTree(), resultReply, {
      objName: 'address'
    }); 
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

