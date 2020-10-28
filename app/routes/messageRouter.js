/*jslint node: true */ /*eslint-env node*/
'use strict';

var express = require('express'),
  bodyParser = require('body-parser'),
  MessageModule = require('../models/message'),
  model = MessageModule.model,
  getModelNodeTree = MessageModule.getModelNodeTree,
  isValidModelPath = MessageModule.isValidModelPath,
  router_utils = require('./router_utils'),
  checkError = router_utils.checkError,
  resultReply = router_utils.resultReply,
  getDocs = router_utils.getDocs,
  emailService = require('../services/emailService'),
  ESAPI = require('node-esapi'),
  Verify = require('./verify'),
  debug = require('debug')('messageRouter');

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
                      '<p>Email: <a href="mailto:' + doc.email + '">' + doc.email + '</a></p>' +
                      '<p>Comment: ' + doc.comment + '</p>' +
                      '</body></html>';

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
          debug('Warning: Email service not available');
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
                      '<p>Email: <a href="mailto:' + doc.email + '">' + doc.email + '</a></p>' +
                      '<p>Request: ' + doc.comment + '</p>' +
                      '</body></html>';

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
          debug('Warning: Email service not available');
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

module.exports = {
  router: router
};

