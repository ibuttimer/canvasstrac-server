/*jslint node: true */
'use strict';

var express = require('express'),
  bodyParser = require('body-parser'),
  MessageModule = require('../models/message'),
    model = MessageModule.model,
    getModelNodeTree = MessageModule.getModelNodeTree,
    schema = MessageModule.schema,
    getTemplate = MessageModule.getTemplate,
    isValidModelPath = MessageModule.isValidModelPath,
  router_utils = require('./router_utils'),
    checkError = router_utils.checkError,
    errorReply = router_utils.errorReply,
    resultReply = router_utils.resultReply,
    doChecks = router_utils.doChecks,
    updateDoc = router_utils.updateDoc,
    removeDoc = router_utils.removeDoc,
    processCountReq = router_utils.processCountReq,
    getDocs = router_utils.getDocs,
  emailService = require('../services/emailService'),
  ESAPI = require('node-esapi'),
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

  .delete(Verify.verifyAdmin, function (req, res, next) {
    model.remove({}, function (err, doc) {
      if (!checkError(err, res)) {
        res.json(doc);
      }
    });
  });

router.route('/feedback')

  .get(Verify.verifyAdmin, function (req, res, next) {
    
    // TODO add feedback restriction
    getDocs(req, res, isValidModelPath, getModelNodeTree(), resultReply); 
  })

  .post(Verify.verifyNoCheck, function (req, res, next) {
    var safe = { 
      type: MessageModule.FEEDBACK_MSG,
      name: ESAPI.encoder().encodeForHTML(req.body.name),
      email: req.body.email,
      comment: ESAPI.encoder().encodeForHTML(req.body.comment)
    };

    model.create(safe, function (err, doc) {
      if (!checkError(err, res)) {

        if (emailService.available()) {
          // send email with info
          var html = '<html><body><p>Name: ' + doc.name + '</p>' +
                      '<p>Email: <a href=\"mailto:' + doc.email + '\">' + doc.email + '</a></p>' +
                      '<p>Comment: ' + doc.comment + '</p>' +
                      '</body></html>'

          emailService.sendEmail('CanvassTrac Feedback', html, doc.email, 
            function (data) {
              doc.result = JSON.stringify(data);
              saveDoc (doc, res);
            }, 
            function (err) {
              doc.result = JSON.stringify(err);
              saveDoc (doc, res);
            });
        } else {
          res.json(doc);
          console.log('Warning: Email service not available');
        }
      }
    });
  })

  .delete(Verify.verifyAdmin, function (req, res, next) {
    model.remove({ type: MessageModule.FEEDBACK_MSG }, function (err, doc) {
      if (!checkError(err, res)) {
        res.json(doc);
      }
    });
  });

router.route('/support')

  .get(Verify.verifyAdmin, function (req, res, next) {
    
    // TODO add support restriction
    getDocs(req, res, isValidModelPath, getModelNodeTree(), resultReply); 
  })

  .post(Verify.verifyNoCheck, function (req, res, next) {
    var safe = {
      type: MessageModule.SUPPORT_MSG,
      name: ESAPI.encoder().encodeForHTML(req.body.name),
      email: req.body.email,
      comment: ESAPI.encoder().encodeForHTML(req.body.comment)
    };

    model.create(safe, function (err, doc) {
      if (!checkError(err, res)) {

        if (emailService.available()) {
          // send email with info
          var html = '<html><body><p>Name: ' + doc.name + '</p>' +
                      '<p>Email: <a href=\"mailto:' + doc.email + '\">' + doc.email + '</a></p>' +
                      '<p>Request: ' + doc.comment + '</p>' +
                      '</body></html>'

          emailService.sendEmail('CanvassTrac Support Request', html, doc.email, 
            function (data) {
              doc.result = JSON.stringify(data);
              saveDoc (doc, res);
            }, 
            function (err) {
              doc.result = JSON.stringify(err);
              saveDoc (doc, res);
            });
        } else {
          res.json(doc);
          console.log('Warning: Email service not available');
        }
      }
    });
  })

  .delete(Verify.verifyAdmin, function (req, res, next) {
    model.remove({ type: MessageModule.SUPPORT_MSG }, function (err, doc) {
      if (!checkError(err, res)) {
        res.json(doc);
      }
    });
  });

// router.route('/count')

//   .get(Verify.verifyAdmin, function (req, res, next) {

//     processCountReq (req, res, isValidModelPath, model);
//   });

// router.route('/:objId')

//   .get(Verify.verifyHasCanvasserAccess, function (req, res, next) {

//     getDocs(req, res, isValidModelPath, getModelNodeTree(), resultReply, {
//       objName: 'feedback'
//     }); 
//   })

//   .put(function (req, res, next) {
    
//     var fields = getTemplate(req.body);
    
//     updateDoc(Verify.verifyHasCanvasserAccess, fields, model, req.params.objId, req, res, resultReply);
//   })

//   .delete(function (req, res, next) {
    
//     removeDoc(Verify.verifyHasCanvasserAccess, model, req.params.objId, req, res, resultReply);
//   });

module.exports = {
  router: router
};

