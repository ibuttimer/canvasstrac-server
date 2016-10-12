/*jslint node: true */
'use strict';

var express = require('express'),
  bodyParser = require('body-parser'),
  ModelModule = require('../models/roles'),
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

router.use(bodyParser.json());

function getDocs (req, res, next) {
  // check request for query params to select returned model paths
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
          errorReply(res, Consts.HTTP_NOT_FOUND, 'Unknown role identifier');
        }
      }
    });
  }
}


router.route('/')

  .get(Verify.verifyOrdinaryUser, function (req, res, next) {

    getDocs (req, res, next);
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
    
    getDocs (req, res, next);
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

