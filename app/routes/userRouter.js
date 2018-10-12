/*jslint node: true */ /*eslint-env node*/
'use strict';

var express = require('express'),
  router = express.Router(),
  passport = require('passport'),
  LOCAL_STRATEGY = 'local',
  FACEBOOK_STRATEGY = 'facebook',
  http = require('http'),
  mongoose = require('../models/mongoose_app').mongoose,
  UserModule = require('../models/user'),
  User = UserModule.model,
  getUserModelNodeTree = UserModule.getModelNodeTree,
  getUserTemplate = UserModule.getTemplate,
  getUserModelPathTypes = UserModule.getModelPathTypes,
  populateSubDocs = UserModule.populateSubDocs,
  isValidModelPath = UserModule.isValidModelPath,
  getProjection = UserModule.getProjection,
  RolesModule = require('../models/roles'),
  RolesModel = RolesModule.model,
  getPrivilegePaths = RolesModule.getPrivilegePaths,
  personRouterModule = require('./personRouter'),
  createPersonAccessOk = personRouterModule.createPersonAccessOk,
  deletePersonAccessOk = personRouterModule.deletePersonAccessOk,
  updatePersonAccessOk = personRouterModule.updatePersonAccessOk,
  Verify = require('./verify'),
  authenticate = require('../authenticate'),  // eslint-disable-line no-unused-vars
  router_utils = require('./router_utils'),
  checkError = router_utils.checkError,
  newError = router_utils.newError,
  errorReply = router_utils.errorReply,
  resultReply = router_utils.resultReply,
  populateSubDocsReply = router_utils.populateSubDocsReply,
  makeResult = router_utils.makeResult,
  removeDocAccessOk = router_utils.removeDocAccessOk,
  processCountReq = router_utils.processCountReq,
  getDocs = router_utils.getDocs,
  errorServiceModule = require('../services/errorService'),
  getError = errorServiceModule.getError,
  assert = require('assert'),
  debug = require('debug')('userRouter'),
  Consts = require('../consts'),
  config = require('../config.js');

/**
 * Create a user
 * @param {Object} req      http request
 * @param {object} res      response
 * @param {function} errCheck function to call to check for error
 * @param {function} next   function to call with result
 */
function createUserAccessOk (req, res, errCheck, next) {

  /* need the request object as passport.authenticate() automatically calls 
     req.login() which together with other function etc. are added to the
     request object by passport */

  /* user info arrives as a flattened object */
  if (!req.body.password) {
    // if no password supplied, use default
    req.body.password = config.dfltPassword;
  }

  var userFields = getUserTemplate(req.body, ['person']), // only exclude person, as role is required
    userId = makeUserId(req);

  User.register(new User(userFields), req.body.password, function (err, user) {
    if (!errCheck(err, res, userId)) {

      req.body.owner = user._id; // add person owner field

      // create person (no access check as done on route)
      createPersonAccessOk(req.body, res, function (result, res) {
        if (result) {
          // person successfully created
          user.person = result.payload._id;
          user.save(function (err, newuser) {
            if (!errCheck(err, res, userId)) {
              // success
              passport.authenticate(LOCAL_STRATEGY)(req, res, function (err) {
                // If this function gets called, authentication was successful,
                // (according to doc but can also arrive here if strategy is unknown)
                // `req.user` contains the authenticated user.
                assert.strictEqual(undefined, err);                
                // success
                next(makeResult(Consts.HTTP_CREATED, newuser), res);
              });

            } else {
              // tidy up by removing everything
              deletePersonAccessOk(user.person, res, function (result, res) { });
              removeDocAccessOk(User, user._id);
              errCheck(
                newError(Consts.HTTP_INTERNAL_ERROR, 'Unable to save user.'), 
                res,
                userId
              );
            }
          });
        } else {
          // tidy up by removing user
          removeDocAccessOk(User, user._id);
          errCheck(
            newError(Consts.HTTP_INTERNAL_ERROR, 'Unable to create person.'), 
            res,
            userId
          );
        }
      });
    }
  });
}

function makeUserId (req) {
  var strs = [];
  [req.body.username, req.body.firstname, req.body.lastname].forEach(function (str) {
    strs.push(str.slice());
  });
  return strs.join('/');
}

function createUser (roleQuery, req, res, errCheck, next) {
  RolesModel.findOne(roleQuery, function (err, role) {
    if (!errCheck(err, res)) {
      if (role === null) {
        errCheck(getError(Consts.APPERR_UNKNOWN_ROLE_INTERNAL), res);
      } else {
        req.body.role = role._id;

        createUserAccessOk(req, res, errCheck, next);
      }
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
      updatePersonAccessOk(user.person, req.body, res, function (result, res) {
        if (result) {
          // success
          populateSubDocs(user, function (err, doc) {
            populateSubDocsReply(err, res, next, doc, Consts.HTTP_OK);
          });
        }
      });
    }
  });
}

function deleteUser (id, req, res, next) {

  User.findById(id, function (err, doc) {
    if (!checkError(err, res)) {
      if (doc) {
        // delete person  (no access check sd done on route)
        deletePersonAccessOk(doc.person, res, function (result, res) {
          if (result) {
            // success
            doc.remove(function (err, doc) {
              if (!checkError(err, res)) {
                // success
                if (next) {
                  next(makeResult(Consts.HTTP_OK, doc), res);
                }
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

function getTokenLife (req) {
  return (req.body.src === 'mobile' ? config.jwtMobileTokenLife : config.jwtWebTokenLife);
}

router.route('/')

  .get(Verify.verifyAdmin, function (req, res, next) {

    getDocs(req, res, isValidModelPath, getUserModelNodeTree(), resultReply, {
      projection: getProjection()
    }); 
  })

  .post(Verify.verifyAdmin, function (req, res) {

    // admin access point
    createUser({'_id': req.body.role}, req, res, checkError, resultReply);
  });


router.post('/register', function (req, res) {
  
  // public access point
  createUser({'level': Consts.ROLE_NONE}, req, res, checkError, resultReply);
});

router.post('/login', function (req, res, next) {
  passport.authenticate(LOCAL_STRATEGY, function (err, user, info) {
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
        'username': user.username,
        '_id': user._id,
        'role': user.role,
        'src': req.body.src
      }, getTokenLife(req));

      // retrieve functionality access masks
      RolesModel.findOne({'_id': user.role}, function (err, role) {
        if (err) {
          return res.status(Consts.HTTP_INTERNAL_ERROR).json({err: err});
        }
        if (role === null) {
          checkError(getError(Consts.APPERR_UNKNOWN_ROLE_INTERNAL), res);
        } else {
          var payload = addTokenToPayload({
            message: 'Login successful!',
            success: true,
            id: user._id
          }, token);

          // add functionality access masks
          getPrivilegePaths().forEach(function (path) {
            payload[path] = role[path];
          });

          res.status(Consts.HTTP_OK).json(payload);
        }
      });
    });
  })(req, res, next);
});

function addTokenToPayload (payload, token) {
  payload.token = token.token;
  payload.expires = token.expires;
  return payload;
}

router.route('/token/:objId')

  .get(Verify.verifySelf, function (req, res, next) {
    var token = Verify.refreshToken(Verify.extractToken(req), getTokenLife(req));

    res.status(Consts.HTTP_OK).json(addTokenToPayload({
      message: 'Token refresh successful!',
      success: true,
    }, token));
  });

router.get('/logout', function (req, res) {
  req.logout();
  res.status(Consts.HTTP_OK).json({
    status: 'Logout successful!'
  });
});

router.get('/facebook', passport.authenticate(FACEBOOK_STRATEGY), function (req, res) {});

router.get('/facebook/callback', function (req, res, next) {
  passport.authenticate(FACEBOOK_STRATEGY, function (err, user, info) {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(Consts.HTTP_UNAUTHORISED).json({
        err: info
      });
    }
    
    debug('User: %O', user);
    debug('Info: %O', info);

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
      }, getTokenLife(req));
    });
  })(req, res, next);
});

router.route('/count')

  .get(Verify.verifyHasCanvasserAccess, function (req, res, next) {

    processCountReq (req, res, isValidModelPath, User);
  });

router.route('/batch')

  .post(Verify.verifyHasAdminAccess, function (req, res, next) {

    var userBatch = req.body.user,
      result = {
        created: 0,
        failed: 0,
        errors: []
      },
      sendResult = function (todoCnt, resInfo, res) {
        if ((resInfo.created + resInfo.failed) === todoCnt) {
          var status;
          if (resInfo.created === todoCnt) {
            status = Consts.HTTP_CREATED;
          } else if (resInfo.failed === todoCnt) {
            status = Consts.HTTP_BAD_REQUEST;
          } else {
            status = Consts.HTTP_PARTIAL_CONTENT;
          }
          res.status(status).json(resInfo);
        }
      };

    // if user batch object & create array
    if (userBatch && Array.isArray(userBatch.create)) {
      var delProps = getUserModelPathTypes({
          exVersionId: true,
          exTimestamp: true,
          exTypes: [mongoose.Schema.Types.ObjectId.schemaName]
        }),
        rmProp = function (props, from) {
          for (var prop in props) {
            if (typeof props[prop] === 'object') {
              rmProp(props[prop], from);
            } else {
              delete from[prop];
            }
          }
        };

      userBatch.create.forEach(function (user, index, array) {
        var userReq = new http.IncomingMessage(), // new http request to handle creation
          query;

        // add the missing bits
        userReq.body = {};
        userReq._passport = req._passport;
        Object.assign(userReq.body, user);  // merge user info

        if (user.role) {
          query = {'name': user.role};
        } else {
          query = {'level': Consts.ROLE_NONE};
        }

        createUser(query, userReq, res, 
          // error check function
          function (err, res, userId) {
            var isErr = false;
            if (err) {
              isErr = true;
              ++result.failed;
              result.errors.push({
                name: err.name,
                message: err.message,
                user: userId
              });
              sendResult(array.length, result, res);
            }
            return isErr;
          }, 
          // next function
          function (opResult, res) {
            if (opResult) {
              // success
              ++result.created;
              sendResult(array.length, result, res);
            }
          }
        );
      });
    } else {
      // nothing to do
      res.status(Consts.HTTP_NO_CONTENT);
    }
  });


/* get/update/delete individual users
  NOTE: needs to be here, i.e. after 'facebook' etc. otherwise 'facebook' is matched as 'objId' */
router.route('/:objId')

  .get(Verify.verifySelfOrAdmin, function (req, res, next) {
    // only admin or the user themselves may access their user info

    getDocs(req, res, isValidModelPath, getUserModelNodeTree(), resultReply, {
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
