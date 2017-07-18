/*jslint node: true */
'use strict';

var express = require('express'),
  bodyParser = require('body-parser'),
  Module = require('../models/canvassAssignment'),
    model = Module.model,
    getTemplate = Module.getTemplate,
    populateSubDocs = Module.populateSubDocs,
    isValidModelPath = Module.isValidModelPath,
    getModelNodeTree = Module.getModelNodeTree,
  router_utils = require('./router_utils'),
    checkError = router_utils.checkError,
    resultReply = router_utils.resultReply,
    populateSubDocsReply = router_utils.populateSubDocsReply,
    updateDoc = router_utils.updateDoc,
    removeDoc = router_utils.removeDoc,
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

  .post(Verify.verifyHasStaffAccess, function (req, res, next) {
    
    if (Array.isArray(req.body)) {
      model.insertMany(req.body, function (err, docs) {
        if (!checkError(err, res)) {
          populateSubDocs(docs, function (err, docs) {
            if (!checkError(err, res)) {
              // success
              res.json(docs);
            }
          });
        }
      });
    } else {
      model.create(req.body, function (err, doc) {
        if (!checkError(err, res)) {
          populateSubDocs(doc, function (err, doc) {
            if (!checkError(err, res)) {
              // success
              res.json(doc);
            }
          });
        }
      });
    }
  })

  .delete(Verify.verifyHasStaffAccess, function (req, res, next) {
    model.remove({}, function (err, doc) {
      if (!checkError(err, res)) {
        populateSubDocs(doc, function (err, doc) {
          if (!checkError(err, res)) {
            // success
            res.json(doc);
          }
        });
      }
    });
  });

router.route('/canvasses')

  .get(Verify.verifySelfOrHasCanvasserAccess, function (req, res, next) {

    getDocs(req, res, isValidModelPath, getModelNodeTree(), function (result, res) {
      if (result) {
        // success
        var array = []
        result.payload.forEach(function (alloc) {
          array.push(alloc.canvass);
        });
        res.status(result.status).json(array);
      }
    }); 
  });

router.route('/:objId')

  .get(Verify.verifySelfOrHasCanvasserAccess, function (req, res, next) {

    model.findById(req.params.objId)
      .exec(function (err, doc) {
        if (!checkError(err, res)) {
          populateSubDocs(doc, function (err, doc) {
            if (!checkError(err, res)) {
              // success
              res.json(doc);
            }
          });
        }
      });
  })

  .put(Verify.verifySelfOrHasCanvasserAccess, function (req, res, next) {
    
    var fields = getTemplate(req.body);

    model.findByIdAndUpdate(req.params.objId, {
        $set: fields
      }, {
        new: true // return the modified document rather than the original
      }, function (err, user) {
        if (!checkError (err, res)) {
          // success
          populateSubDocs(user, function (err, doc) {
            if (!checkError(err, res)) {
              // success
              res.json(doc);
            }
          });
        }
      }
    );
  })

  .delete(function (req, res, next) {
    
    removeDoc(Verify.verifySelfOrHasCanvasserAccess, model, req.params.objId, req, res, resultReply);
  });

module.exports = {
  router: router
};

