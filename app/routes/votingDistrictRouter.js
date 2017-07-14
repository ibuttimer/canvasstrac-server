/*jslint node: true */
'use strict';

var express = require('express'),
  Model = require('../models/votingDistricts').model,
  Verify = require('./verify'),
  router_utils = require('./router_utils'),
    checkError = router_utils.checkError,
    resultReply = router_utils.resultReply,
    populateSubDocsReply = router_utils.populateSubDocsReply,
    makeResult = router_utils.makeResult,
  utils = require('../misc/utils'),
  Consts = require('../consts');

var router = express.Router();

router.route('/')

  .get(Verify.verifyOrdinaryUser, function (req, res, next) {
    Model.find({})
      .exec(function (err, docs) {
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
