/*jslint node: true */
'use strict';

var express = require('express'),
  ModelModule = require('../models/votingSystems'),
    Model = ModelModule.model,
    schema = ModelModule.schema,
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
    decodeReq = router_utils.decodeReq,
  utils = require('../misc/utils'),
  Consts = require('../consts');

var router = express.Router();

function getDocs (req, res, next) {
  // check request for query params to select returned model path
  var decode = decodeReq (req, res, isValidModelPath);
  if (decode) {
    // execute the query
    var query;
    if (req.params.objId) {
      query = Model.findById(req.params.objId);
    } else {
      query = Model.find(decode.queryParam);
    }
    if (decode.select.length > 0) {
      query.select(decode.select);
    }
    query.exec(function (err, docs) {
      if (!checkError(err, res)) {
        if (docs) {
          res.json(docs);
        } else if (req.params.objId) {
          errorReply(res, Consts.HTTP_NOT_FOUND, 'Unknown election identifier');
        }
      }
    });
  }
}


router.route('/')

  .get(Verify.verifyOrdinaryUser, function (req, res, next) {

    // check request for query params to select returned model paths    
    var select = '';
    for (var path in req.query) {
      if (isValidModelPath(path)) {
        if (select.length > 0) {
          select += ' ';
        }
        select += path;
      } 
    }
    var query = Model.find({});
    if (select.length > 0) {
      query.select(select);
    }
    query.exec(function (err, docs) {
      if (!checkError(err, res)) {
        res.json(docs);
      }
    });
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
    Model.findById(req.params.objId, function (err, doc) {
      if (!checkError(err, res)) {
        res.json(doc);
      }
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
