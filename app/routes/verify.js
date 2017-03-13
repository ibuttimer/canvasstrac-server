/*jslint node: true */
'use strict';

var User = require('../models/user').model,
  Roles = require('../models/roles').model,
  jwt = require('jsonwebtoken'), // used to create, sign and verify tokens
  utils = require('../misc/utils'),
  config = require('../config.js'),
  Consts = require('../consts');

var unauthenticatedErr = new Error('You are not authenticated!');
unauthenticatedErr.status = Consts.HTTP_UNAUTHORISED;
var tokenErr = new Error('No token provided!');
tokenErr.status = Consts.HTTP_FORBIDDEN;
var unknownRoleErr = new Error('Unknown role. You are not authorized to perform this operation!');
unknownRoleErr.status = Consts.HTTP_FORBIDDEN;
var notAuthorisedErr = new Error('You are not authorized to perform this operation!');
notAuthorisedErr.status = Consts.HTTP_FORBIDDEN;

var express = require('express');

var dev_fake_admin_token = 'dev_fake_admin_token';
var dev_fake_admin_id = '123456789012345678901234';


/*
 * Verify a JSON web token
 * @param{object} token   - token to verify
 * @param{object} res     - response
 * @param{function} next  - function to call with result
 */
function verifyToken(token, res, next) {
  // decode token
  var err = null;
  if (token) {
    // verifies secret and checks exp
    jwt.verify(token, config.jwtSecretKey, function (err, decoded) {
      if (err) {
        // err = new Error('You are not authenticated!');
        // err.status = Consts.HTTP_UNAUTHORISED;
        err = unauthenticatedErr;
      } else {
        // if everything is good
//        console.log(decoded);
      }
      return next(err, decoded);
    });
  } else {
    // if there is no token return an error
    // err = new Error('No token provided!');
    // err.status = Consts.HTTP_FORBIDDEN;
    return next(tokenErr);
  }
};

/*
 * Verify the credentials for a request
 * @param{object} req     - request
 * @param{object} res     - response
 * @param{function} next  - function to call with result
 */
function verifyCredentials(req, res, next) {
  
  if (config.disableAuth == false) {
    // authentication enabled
    // check header or url parameters or post parameters for token
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    verifyToken(token, res, function (err, decoded) {
      if (err) {
          next(err);
        } else {
          // if everything is good, save to request for use in other routes
          req.credentials = {
            decoded: decoded,
            token: token
          };
          next();
        }
    });
  } else {
    // development mode with authentication disabled
    // 'login' as admin
    Roles.findOne({level: Consts.ROLE_ADMIN}, function (err, role) {
      if (err) {
        throw err;
      }

      if (role === null) {
        throw new Error('Unable to find admin role.');
      } else {
        var decoded = {
           firstname: 'AdminDev',
           lastname: 'DevMode',
           role: role,
           username: 'dev-admin',
           _id: dev_fake_admin_id          
        };
        req.credentials = {
          decoded: decoded,
          token: dev_fake_admin_token
        };
        next();
      }
    });
  }
};

/*
 * Verify the access level for a request
 * @param{number} minLevel - min access level
 * @param{number} maxLevel - max access level
 * @param{object} req     - request
 * @param{object} res     - response
 * @param{function} next  - function to call with result
 */
function verifyAccessLevel(minLevel, maxLevel, req, res, next) {
  // verify access level AFTER credentials habe been verified
  Roles.findById(req.credentials.decoded.role, function (err, role) {
    if (err) {
      throw err;
    }

//    console.log('verifyAccessLevel', role, minLevel, maxLevel);

    // check if user has correct level
    var notAuthErr = null;
    if (role === null) {
      // notAuthErr = new Error('Unknown role. You are not authorized to perform this operation!');
      return next(unknownRoleErr);

    } else if ((role.level < minLevel) || (role.level > maxLevel)) {
      // notAuthErr = new Error('You are not authorized to perform this operation!');
      return next(notAuthorisedErr);
    } else {
      next();
    }
    // if (notAuthErr === null) {
    //   next();
    // } else {
    //   notAuthErr.status = Consts.HTTP_FORBIDDEN;
    //   return next(notAuthErr);
    // }
  });
};

/*
 * Verify the access for a request
 * @param{number} minLevel - min access level
 * @param{number} maxLevel - max access level
 * @param{object} req     - request
 * @param{object} res     - response
 * @param{function} next  - function to call with result
 */
function verifyAccess(minLevel, maxLevel, req, res, next) {
  // first verify username & password
  verifyCredentials(req, res, function (err) {
    if (err) {
      return next(err);
    }
//    console.log('verifyAccess', minLevel, maxLevel);

    verifyAccessLevel(minLevel, maxLevel, req, res, next);
  });
};

function getToken(user) {
  return jwt.sign(user, config.jwtSecretKey, {
    expiresIn: config.jwtTokenLife
  });
}

function verifyAdmin(req, res, next) {
  verifyAccess(Consts.ROLE_ADMIN, Consts.ROLE_ADMIN, req, res, next);
}

function verifyManager(req, res, next) {
  verifyAccess(Consts.ROLE_MANAGER, Consts.ROLE_MANAGER, req, res, next);
}

function verifyGroupLead(req, res, next) {
  verifyAccess(Consts.ROLE_GROUP_LEAD, Consts.ROLE_GROUP_LEAD, req, res, next);
}

function verifyStaff(req, res, next) {
  verifyAccess(Consts.ROLE_STAFF, Consts.ROLE_STAFF, req, res, next);
}

function verifyCanvasser(req, res, next) {
  verifyAccess(Consts.ROLE_CANVASSER, Consts.ROLE_CANVASSER, req, res, next);
}

function verifyPublic(req, res, next) {
  verifyAccess(Consts.ROLE_NONE, Consts.ROLE_NONE, req, res, next);
}

function verifyHasAdminAccess(req, res, next) {
  verifyAccess(Consts.ROLE_ADMIN, Consts.ROLE_ADMIN, req, res, next);
}

function verifyHasManagerAccess(req, res, next) {
  verifyAccess(Consts.ROLE_MANAGER, Consts.ROLE_ADMIN, req, res, next);
}

function verifyHasGroupLeadAccess(req, res, next) {
  verifyAccess(Consts.ROLE_GROUP_LEAD, Consts.ROLE_ADMIN, req, res, next);
}

function verifyHasStaffAccess(req, res, next) {
  verifyAccess(Consts.ROLE_STAFF, Consts.ROLE_ADMIN, req, res, next);
}

function verifyHasCanvasserAccess(req, res, next) {
  verifyAccess(Consts.ROLE_CANVASSER, Consts.ROLE_ADMIN, req, res, next);
}

function verifyOrdinaryUser(req, res, next) {
  verifyCredentials(req, res, next);
}

function verifySelf(req, res, next) {
  // first verify username & password
  verifyCredentials(req, res, function (err) {
    if (err) {
      return next(err);
    }

    // check if url matches user
    if (req.params.objId == req.credentials.decoded._id) {
      next();
    } else {
      var notAuthErr = new Error('You are not authorized to perform this operation!');
      notAuthErr.status = Consts.HTTP_FORBIDDEN;
      return next(notAuthErr);
    }
  });
}

function verifySelfOrLevel(minLevel, maxLevel, req, res, next) {
  // first verify username, password & is self
  verifySelf(req, res, function (err) {
    if (err) {
      if (err.status === Consts.HTTP_FORBIDDEN) {
        // not self
        verifyAccessLevel(minLevel, maxLevel, req, res, function (err) {
          next(err);
        });
      } else {
        next(err);
      }
    } else {
      // is self
      next(err);
    } 
  }); 
}

function verifySelfOrAdmin(req, res, next) {
  verifySelfOrLevel(Consts.ROLE_ADMIN, Consts.ROLE_ADMIN, req, res, next);
}

function verifySelfOrManager(req, res, next) {
  verifySelfOrLevel(Consts.ROLE_MANAGER, Consts.ROLE_MANAGER, req, res, next);
}

function verifySelfOrGroupLead(req, res, next) {
  verifySelfOrLevel(Consts.ROLE_GROUP_LEAD, Consts.ROLE_GROUP_LEAD, req, res, next);
}

function verifySelfOrStaff(req, res, next) {
  verifySelfOrLevel(Consts.ROLE_STAFF, Consts.ROLE_STAFF, req, res, next);
}

function verifySelfOrCanvasser(req, res, next) {
  verifySelfOrLevel(Consts.ROLE_CANVASSER, Consts.ROLE_CANVASSER, req, res, next);
}

function verifySelfOrHasAdminAccess(req, res, next) {
  verifySelfOrLevel(Consts.ROLE_ADMIN, Consts.ROLE_ADMIN, req, res, next);
}

function verifySelfOrHasManagerAccess(req, res, next) {
  verifySelfOrLevel(Consts.ROLE_MANAGER, Consts.ROLE_ADMIN, req, res, next);
}

function verifySelfHasOrGroupLeadAccess(req, res, next) {
  verifySelfOrLevel(Consts.ROLE_GROUP_LEAD, Consts.ROLE_ADMIN, req, res, next);
}

function verifySelfOrHasStaffAccess(req, res, next) {
  verifySelfOrLevel(Consts.ROLE_STAFF, Consts.ROLE_ADMIN, req, res, next);
}

function verifySelfOrHasCanvasserAccess(req, res, next) {
  verifySelfOrLevel(Consts.ROLE_CANVASSER, Consts.ROLE_ADMIN, req, res, next);
}

function verifyNoCheck(req, res, next) {
  // no verification check, just pass thru
  next();
}

// access router for test purposes
var router = express.Router();

router.route('/is/admin')
  .get(verifyAdmin, function (req, res, next) {
    res.sendStatus(Consts.HTTP_OK);
  });
router.route('/is/manager')
  .get(verifyManager, function (req, res, next) {
    res.sendStatus(Consts.HTTP_OK);
  });
router.route('/is/grouplead')
  .get(verifyGroupLead, function (req, res, next) {
    res.sendStatus(Consts.HTTP_OK);
  });
router.route('/is/staff')
  .get(verifyStaff, function (req, res, next) {
    res.sendStatus(Consts.HTTP_OK);
  });
router.route('/is/canvasser')
  .get(verifyCanvasser, function (req, res, next) {
    res.sendStatus(Consts.HTTP_OK);
  });
router.route('/is/public')
  .get(verifyPublic, function (req, res, next) {
    res.sendStatus(Consts.HTTP_OK);
  });
router.route('/has/admin')
  .get(verifyHasAdminAccess, function (req, res, next) {
    res.sendStatus(Consts.HTTP_OK);
  });
router.route('/has/manager')
  .get(verifyHasManagerAccess, function (req, res, next) {
    res.sendStatus(Consts.HTTP_OK);
  });
router.route('/has/grouplead')
  .get(verifyHasGroupLeadAccess, function (req, res, next) {
    res.sendStatus(Consts.HTTP_OK);
  });
router.route('/has/staff')
  .get(verifyHasStaffAccess, function (req, res, next) {
    res.sendStatus(Consts.HTTP_OK);
  });
router.route('/has/canvasser')
  .get(verifyHasCanvasserAccess, function (req, res, next) {
    res.sendStatus(Consts.HTTP_OK);
  });
router.route('/has/public')
  .get(verifyOrdinaryUser, function (req, res, next) {
    res.sendStatus(Consts.HTTP_OK);
  });


module.exports = {
  getToken: getToken,
  verifyAdmin: verifyAdmin,
  verifyManager: verifyManager,
  verifyGroupLead: verifyGroupLead,
  verifyStaff: verifyStaff,
  verifyCanvasser: verifyCanvasser,
  verifyPublic: verifyPublic,
  verifyHasAdminAccess: verifyHasAdminAccess,
  verifyHasManagerAccess: verifyHasManagerAccess,
  verifyHasGroupLeadAccess: verifyHasGroupLeadAccess,
  verifyHasStaffAccess: verifyHasStaffAccess,
  verifyHasCanvasserAccess: verifyHasCanvasserAccess,
  verifyOrdinaryUser: verifyOrdinaryUser,
  verifySelf: verifySelf,
  verifySelfOrAdmin: verifySelfOrAdmin,
  verifySelfOrManager: verifySelfOrManager,
  verifySelfOrGroupLead: verifySelfOrGroupLead,
  verifySelfOrStaff: verifySelfOrStaff,
  verifySelfOrCanvasser: verifySelfOrCanvasser,
  verifySelfOrHasAdminAccess: verifySelfOrHasAdminAccess,
  verifySelfOrHasManagerAccess: verifySelfOrHasManagerAccess,
  verifySelfHasOrGroupLeadAccess: verifySelfHasOrGroupLeadAccess,
  verifySelfOrHasStaffAccess: verifySelfOrHasStaffAccess,
  verifySelfOrHasCanvasserAccess: verifySelfOrHasCanvasserAccess,
  verifyNoCheck: verifyNoCheck,

  accessTestRouter: router
};


