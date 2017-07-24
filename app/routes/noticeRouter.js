/*jslint node: true */
'use strict';

var express = require('express'),
  bodyParser = require('body-parser'),
  NoticeModule = require('../models/notice'),
    model = NoticeModule.model,
    getModelNodeTree = NoticeModule.getModelNodeTree,
    schema = NoticeModule.schema,
    getTemplate = NoticeModule.getTemplate,
    isValidModelPath = NoticeModule.isValidModelPath,
  router_utils = require('./router_utils'),
    checkError = router_utils.checkError,
    resultReply = router_utils.resultReply,
    updateDoc = router_utils.updateDoc,
    removeDoc = router_utils.removeDoc,
    processCountReq = router_utils.processCountReq,
    getDocs = router_utils.getDocs,
  utils = require('../misc/utils'),
  Verify = require('./verify'),
  Consts = require('../consts'),
  config = require('../config.js');

var router = express.Router();

router.use(bodyParser.json());

function saveDoc (doc, res) {
  doc.save(function (err, updatedDoc) {
    if (!checkError(err, res)) {
      res.json(updatedDoc);
    }
  });
}


router.route('/')

  .get(Verify.verifyAdmin, function (req, res, next) {
    
    getDocs(req, res, isValidModelPath, getModelNodeTree(), resultReply); 
  })

  .post(Verify.verifyAdmin, function (req, res, next) {
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

  .delete(Verify.verifyAdmin, function (req, res, next) {
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
  });

router.route('/current')

  .get(function (req, res, next) {
    
    var today = new Date();
    model.find({ 
      fromDate: { $lte : today },
      toDate: { $gte : today }
    }).exec(function (err, doc) {
        if (!checkError(err, res)) {
          // success
          res.json(doc);
        }
      });
  });

router.route('/:objId')

  .get(function (req, res, next) {

    model.findById(req.params.objId)
      .exec(function (err, doc) {
        if (!checkError(err, res)) {
          // success
          res.json(doc);
        }
      });
  })

  .put(Verify.verifyAdmin, function (req, res, next) {
    
    var fields = getTemplate(req.body);
    
    model.findByIdAndUpdate(req.params.objId, {
        $set: fields
      }, {
        new: true // return the modified document rather than the original
      }, function (err, doc) {
        if (!checkError(err, res)) {
          // success
          res.json(doc);
        }
      }
    );
  })

  .delete(function (req, res, next) {
    
    removeDoc(Verify.verifyAdmin, model, req.params.objId, req, res, resultReply);
  });


module.exports = {
  router: router
};

