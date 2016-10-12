/*jslint node: true */
'use strict';

var express = require('express'),
  bodyParser = require('body-parser'),
  Module = require('../models/canvass'),
    model = Module.model,
    getTemplate = Module.getTemplate,
    populateSubDocs = Module.populateSubDocs,
  router_utils = require('./router_utils'),
    checkError = router_utils.checkError,
    errorReply = router_utils.errorReply,
    resultReply = router_utils.resultReply,
    populateSubDocsReply = router_utils.populateSubDocsReply,
    doChecks = router_utils.doChecks,
    updateDoc = router_utils.updateDoc,
    removeDoc = router_utils.removeDoc,
    getDocById = router_utils.getDocById,
  utils = require('../misc/utils'),
  Verify = require('./verify'),
  Consts = require('../consts');

var router = express.Router();

router.use(bodyParser.json());


function createCanvass (req, res, next) {

  var fields = getTemplate(req.body, []);  // exclude nothing

  model.create(fields, function (err, doc) {
    if (!checkError (err, res)) {
      // success
      populateSubDocs(doc, function (err, doc) {
        populateSubDocsReply(err, res, next, doc, Consts.HTTP_CREATED);
      });
    }
  });
}

function updateCanvass (id, req, res, next) {

  var fields = getTemplate(req.body, []);  // exclude nothing

  model.findByIdAndUpdate(id, {
      $set: fields
    }, {
      new: true // return the modified document rather than the original
    }, function (err, doc) {
      if (!checkError (err, res)) {
        // success
        populateSubDocs(doc, function (err, doc) {
          populateSubDocsReply(err, res, next, doc, Consts.HTTP_OK);
        });
      }
    }
  );
}

function deleteCanvass (id, req, res, next) {

  model.findById(id, function (err, doc) {
    if (!checkError (err, res)) {
      if (doc) {
        // success
        doc.remove(function (err, doc) {
          if (!checkError (err, res)) {
            // success
            next(makeResult(Consts.HTTP_OK, doc), res);
          }
        });
      } else {
        errorReply(res, Consts.HTTP_NOT_FOUND, 'Unknown canvass identifier');
      }
    }
  });
}



function getDocs (req, res, next) {
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

  var query;
  if (req.params.objId) {
    query = model.findById(req.params.objId);
  } else {
    query = model.find({});
  }
  if (select.length > 0) {
    query.select(select);
  }
  query.exec(function (err, docs) {
    if (!checkError(err, res)) {
      if (docs) {
        populateSubDocs(docs, function (err, docs) {
          if (!checkError(err, res)) {
            res.json(docs);
          }
        });
      } else if (req.params.objId) {
        errorReply(res, Consts.HTTP_NOT_FOUND, 'Unknown canvass identifier');
      }
    }
  });
}

router.route('/')

  .get(Verify.verifyHasCanvasserAccess, function (req, res, next) {
    
    getDocs(req, res, next);
  })

  .post(Verify.verifyHasStaffAccess, function (req, res, next) {
    
    createCanvass(req, res, resultReply);
  })

  .delete(Verify.verifyHasStaffAccess, function (req, res, next) {

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

    // model.remove({}, function (err, doc) {
    //   if (!checkError(err, res)) {
    //     populateSubDocs(doc, function (err, doc) {
    //       if (!checkError(err, res)) {
    //         // success
    //         res.json(doc);
    //       }
    //     });
    //   }
    // });
  });

router.route('/:objId')

  .get(Verify.verifySelfOrHasCanvasserAccess, function (req, res, next) {

    getDocs(req, res, next);
  })

  .put(Verify.verifySelfOrHasCanvasserAccess, function (req, res, next) {
    
    updateCanvass(req.params.objId, req, res, resultReply);

    // var fields = getTemplate(req.body);

    // model.findByIdAndUpdate(req.params.objId, {
    //     $set: fields
    //   }, {
    //     new: true // return the modified document rather than the original
    //   }, function (err, user) {
    //     if (!checkError (err, res)) {
    //       // success
    //       populateSubDocs(user, function (err, doc) {
    //         if (!checkError(err, res)) {
    //           // success
    //           res.json(doc);
    //         }
    //       });
    //     }
    //   }
    // );
  })

  .delete(Verify.verifyHasStaffAccess, function (req, res, next) {
    
    deleteCanvass(req.params.objId, req, res, resultReply);

    // removeDoc(Verify.verifySelfOrHasCanvasserAccess, model, req.params.objId, req, res, resultReply);
  });

module.exports = {
  router: router
};

