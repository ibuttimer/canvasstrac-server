/*jslint node: true */
'use strict';

var express = require('express'),
  passport = require('passport'),
  UserModule = require('../models/user'),
    User = UserModule.model,
    getModelNodeTree = UserModule.getModelNodeTree,
    getUserTemplate = UserModule.getTemplate,
    getSubDocPopulateOptions = UserModule.getSubDocPopulateOptions,
    populateSubDocs = UserModule.populateSubDocs,
    isValidModelPath = UserModule.isValidModelPath,
    getProjection = UserModule.getProjection,
  Roles = require('../models/roles').model,
  personRouterModule = require('./personRouter'),
    createPerson = personRouterModule.createPerson,
    deletePerson = personRouterModule.deletePerson,
    updatePerson = personRouterModule.updatePerson,
  ModelNodeModule = require('../models/modelNode'),
    ModelNode = ModelNodeModule.ModelNode,
  Verify = require('./verify'),
  authenticate = require('../authenticate'),
  router_utils = require('./router_utils'),
    checkError = router_utils.checkError,
    errorReply = router_utils.errorReply,
    resultReply = router_utils.resultReply,
    populateSubDocsReply = router_utils.populateSubDocsReply,
    makeResult = router_utils.makeResult,
    removeDoc = router_utils.removeDoc,
    removeDocAccessOk = router_utils.removeDocAccessOk,
    decodeReq = router_utils.decodeReq,
    processCountReq = router_utils.processCountReq,
    // getDocsUsingObj = router_utils.getDocsUsingObj,
    // getRootOwner = router_utils.getRootOwner,
    getDocs = router_utils.getDocs,
  utils = require('../misc/utils'),
    find = utils.find,
    cloneObject = utils.cloneObject,
    arrayIntersection = utils.arrayIntersection,
  Consts = require('../consts'),
  config = require('../config.js');

var router = express.Router();

function createUser (req, res, next) {

  if (!req.body.password) {
    // if no password supplied, use default
    req.body.password = config.dfltPassword;
  }

  var userFields = getUserTemplate(req.body, ['person']); // only exclude person, as role is required

  User.register(new User(userFields), req.body.password, function (err, user) {
    if (!checkError (err, res)) {

      req.body.owner = user._id; // add person owner field

      // create person (no access check as done on route)
      createPerson(Verify.verifyNoCheck, req, res, function (result, res) {
        if (result) {
          // person successfully created
          user.person = result.payload._id;
          user.save(function (err, newuser) {
            if (!checkError (err, res)) {
              // success

              passport.authenticate('local')(req, res, function () {
                // If this function gets called, authentication was successful.
                // `req.user` contains the authenticated user.
                
                
                // success
                next(makeResult(Consts.HTTP_CREATED, newuser), res);
              });

            } else {
              // tidy up by removing everything
              personRouter.deletePerson(req, user.person, res, function (result, res) { });
              removeDocAccessOk(User, user._id);
              var err = new Error('Unable to save user.');
              err.status = Consts.HTTP_INTERNAL_ERROR;
              checkError(err, res);
            }
          });
        } else {
          // tidy up by removing user
          removeDocAccessOk(User, user._id);
          var err = new Error('Unable to create person.');
          err.status = Consts.HTTP_INTERNAL_ERROR;
          checkError(err, res);
        }
      });
    }
  });
}

function updateUser (id, req, res, next) {

  var userFields = getUserTemplate(req.body, ['person']); // only exclude person, as role is required

  User.findByIdAndUpdate(id, {
      $set: userFields
    }, {
      new: true // return the modified document rather than the original
    }, function (err, user) {
      if (!checkError (err, res)) {
        // update person (no access check sd done on route)
        updatePerson(Verify.verifyNoCheck, user.person, req, res, function (result, res) {
          if (result) {
            // success
            populateSubDocs(user, function (err, doc) {
              populateSubDocsReply(err, res, next, doc, Consts.HTTP_OK);
            });
          }
        });
      }
    }
  );
}

function deleteUser (id, req, res, next) {

  User.findById(id, function (err, doc) {
    if (!checkError (err, res)) {
      if (doc) {
        // delete person  (no access check sd done on route)
        deletePerson(Verify.verifyNoCheck, doc.person, req, res, function (result, res) {
          if (result) {
            // success
            doc.remove(function (err, doc) {
              if (!checkError (err, res)) {
                // success
                next(makeResult(Consts.HTTP_OK, doc), res);
              }
            });
          }
        });
      } else {
        errorReply(res, Consts.HTTP_NOT_FOUND, 'Unknown person identifier');
      }
    }
  });
}


router.route('/')

  .get(Verify.verifyAdmin, function (req, res, next) {

    getDocs(req, res, isValidModelPath, getModelNodeTree(), resultReply, {
      projection: getProjection()
    }); 
  })

  .post(Verify.verifyAdmin, function (req, res) {

    // admin access point
    Roles.findOne({'_id': req.body.role}, function (err, role) {
      if (err) {
        return res.status(Consts.HTTP_INTERNAL_ERROR).json({err: err});
      }
      if (role === null) {
        return res.status(Consts.HTTP_INTERNAL_ERROR).json({err: 'Role not found.'});
      }

      createUser(req, res, resultReply);
     });
   });


router.post('/register', function (req, res) {
  
  // public access point
  Roles.findOne({'level': Consts.ROLE_NONE}, function (err, role) {
    if (err) {
      return res.status(Consts.HTTP_INTERNAL_ERROR).json({err: err});
    }
    if (role === null) {
      return res.status(Consts.HTTP_INTERNAL_ERROR).json({err: 'Role not found.'});
    }

    req.body.role = role._id;

    createUser(req, res, resultReply);
  });
});

router.post('/login', function (req, res, next) {
  passport.authenticate('local', function (err, user, info) {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(Consts.HTTP_UNAUTHORISED).json({
        err: info
      });
    }
    req.logIn(user, function (err) {
      if (err) {
        return res.status(Consts.HTTP_INTERNAL_ERROR).json({
          err: 'Could not log in user'
        });
      }

      // generate token from important bits of user info
      var token = Verify.getToken({
        "username": user.username,
        "_id": user._id,
        "role": user.role
      });
      
      res.status(Consts.HTTP_OK).json({
        message: 'Login successful!',
        success: true,
        token: token,
        id: user._id
      });
    });
  })(req, res, next);
});

router.get('/logout', function (req, res) {
  req.logout();
  res.status(Consts.HTTP_OK).json({
    status: 'Bye!'
  });
});

router.get('/facebook', passport.authenticate('facebook'), function (req, res) {});

router.get('/facebook/callback', function (req, res, next) {
  passport.authenticate('facebook', function (err, user, info) {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(Consts.HTTP_UNAUTHORISED).json({
        err: info
      });
    }
    
    console.log('User: ', user);
    console.log('Info: ', info);

    
    req.logIn(user, function (err) {
      if (err) {
        return res.status(Consts.HTTP_INTERNAL_ERROR).json({
          err: 'Could not log in user'
        });
      }
      var token = Verify.getToken(user);
      res.status(Consts.HTTP_OK).json({
        status: 'Login successful!',
        success: true,
        token: token
      });
    });
  })(req, res, next);
});

router.route('/count')

  .get(Verify.verifyHasCanvasserAccess, function (req, res, next) {

    processCountReq (req, res, isValidModelPath, User);
  });


/* get/update/delete individual users
  NOTE: needs to be here, i.e. after 'facebook' etc. otherwise 'facebook' is matched as 'objId' */
router.route('/:objId')

  .get(Verify.verifySelfOrAdmin, function (req, res, next) {
    // only admin or the user themselves may access their user info

    getDocs(req, res, isValidModelPath, getModelNodeTree(), resultReply, {
      projection: getProjection(),
      objName: 'user'
    }); 
  })

  .put(Verify.verifySelfOrAdmin, function (req, res, next) {
    // only admin or the user themselves may update their user info
    updateUser(req.params.objId, req, res, resultReply);
  })

  .delete(Verify.verifyAdmin, function (req, res, next) {
    // only admin may delete a user    
    deleteUser (req.params.objId, req, res, resultReply);
  });

module.exports = {
  router: router
};
