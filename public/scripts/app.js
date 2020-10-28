/**
 * Assign __env to the root window object.
 *
 * The goal of this file is to allow the deployment
 * process to pass in environment values into the application.
 *
 * The deployment process can overwrite this file to pass in
 * custom values:
 *
 * window.__env = window.__env || {};
 * window.__env.url = 'some-url';
 * window.__env.key = 'some-key';
 *
 * Keep the structure flat (one level of properties only) so
 * the deployment process can easily map environment keys to
 * properties.
 *
 * Based on this example
 *  http://plnkr.co/edit/XvFh4CkCYM7QgS9Fg8Kz
 * from
 *  http://www.jvandemo.com/how-to-configure-your-angularjs-application-using-environment-variables/
 *
 * And here's a nice explaination of IIFE
 *  https://toddmotto.com/what-function-window-document-undefined-iife-really-means/
 */

(function (window) {
  window.__env = window.__env || {};

  // server/management app common settings
  window.__env.baseURL = 'canvasstrac.herokuapp.com';
  window.__env.forceHttps = true;
  window.__env.httpPort = -1;
  window.__env.httpsPortOffset = 443;
  window.__env.socketTimeout = 120000;

  window.__env.disableAuth = false;

  // management app settings
  window.__env.mapsApiKey = 'api_key';

  window.__env.autoLogout = '2000';
  window.__env.autoLogoutCount = '10';
  window.__env.tokenRefresh = '1000';
  window.__env.reloadMargin = '60';

  window.__env.DEV_MODE = false;
  window.__env.DEV_USER1 = '';
  window.__env.DEV_PASSWORD1 = '';
  window.__env.DEV_USER2 = '';
  window.__env.DEV_PASSWORD2 = '';
  window.__env.DEV_USER3 = '';
  window.__env.DEV_PASSWORD3 = '';

  /* TODO debug flags really need some work */
  // client common flags
  window.__env.dbgstoreFactory = false;
  window.__env.dbglocalStore = false;
  window.__env.dbgsurveyFactory = true;
  window.__env.dbgcanvassFactory = true;
  window.__env.dbgelectionFactory = true;

  //  mgmt client app flags
  window.__env.dbgCanvassController = true;
  window.__env.dbgCanvassActionController = true;
  window.__env.dbgSurveyController = true;
  window.__env.dbgHeaderController = false;
  window.__env.dbgElectionController = false;
  window.__env.dbgCanvassController = true;
  window.__env.dbgCanvassAddressController = false;

}(this));

/*jslint node: true */
/*global angular */
'use strict';

/**************************************************************************
 * Set environment values
 *************************************************************************/

// Default environment variables
var appenv = {};

// Import variables if present
if(window){
  for (var prop in window.__env) {
    appenv[prop] = window.__env[prop];
  }
  if (!appenv.baseURL) {
    throw Error('Missing configuration: baseURL');
  }
  // ensure numbers where required
  [ 'httpPort',
    'httpsPortOffset',
    'socketTimeout',
    'autoLogout',
    'autoLogoutCount',
    'tokenRefresh',
    'reloadMargin'
  ].forEach(function (prop) {
    if (typeof appenv[prop] === 'string') {
      appenv[prop] = parseInt(appenv[prop]);
    }
  });
}

/**
 * Check if an object has the specified property
 * @param {object} object Object to check
 * @param {string} property Name of property to check for
 * @returns {boolean} true if has property
 */
function hasProperty(object, property) {
  return Object.prototype.hasOwnProperty.call(object, property);
}

angular.module('ct.config', [])

  .constant('baseURL', (function () {
    // This is the data base url, app pages are handled by ui-router
    var proto = 'http',
      port = appenv.httpPort,
      url;
    if (appenv.forceHttps) {
      proto = 'https';
      if (port >= 0) {
        port += appenv.httpsPortOffset;
      }
    }
    url = proto + '://' + appenv.baseURL;
    if (port >= 0) {
      url += ':' + port;
    }
    return url + '/db/';
  })())
  .constant('STATES', (function () {
    var cfgState = 'app.cfg',
      campaignState = 'app.campaign',
      makeStates = function (path, base, substate) {
        // e.g. app.cfg.user-view
        var state = path + '.' + base;
        if (substate) {
          state += '-' + substate;
        }
        return state;
      },
      makeSubStatePropName = function (state, substate) {
        // e.g. VOTINGSYS_NEW
        return state + '_' + substate;
      },
      substates = [
        'NEW', 'VIEW', 'EDIT', 'DEL', 'BATCH'
      ],
      makeStdStateName = function (name) {
        // e.g. dashState
        return name.toLowerCase() + 'State';
      },
      stateConstant = {
        STD_STATE_NAMES: [],

        APP: 'app',
        ABOUTUS: 'app.aboutus',

        CONFIG: cfgState,
        CAMPAIGN: campaignState,

        LOGIN: 'app.login',
        CONTACTUS: 'app.contactus',
        SUPPORT: 'app.support'
      },
      disabledStates = [
        // add entries to disbale a state and any substates
      ];

    /* make state values, e.g. VOTINGSYS, VOTINGSYS_NEW etc.
          add a disabled flag to disable the state and any substates */
    [ { property: 'VOTINGSYS', path: cfgState, base: 'votingsystem', disabled: true },
      { property: 'ROLES', path: cfgState, base: 'role', disabled: true },
      { property: 'USERS', path: cfgState, base: 'user' },
      { property: 'NOTICE', path: cfgState, base: 'notice' },
      { property: 'ELECTION', path: campaignState, base: 'election' },
      { property: 'CANDIDATE', path: campaignState, base: 'candidate', disabled: true },
      { property: 'CANVASS', path: campaignState, base: 'canvass' }
    ].forEach(function (state) {
      /* make state properties, e.g. USERS = 'app.cfg.user'
                                        USERS_NEW = 'app.cfg.user-new' */
      stateConstant[state.property] = makeStates(state.path, state.base); // path.base
      substates.forEach(function (substate) {
        stateConstant[makeSubStatePropName(state.property, substate)] = // state_substate
            makeStates(state.path, state.base, substate.toLowerCase()); // path.base-substate
      });

      if (state.disabled) {
        // disbale the state and any substates
        disabledStates.push(stateConstant[state.property]);
      }
    });

    // add function to check for disabled states
    stateConstant.ISDISABLED = function (state) {
      var disabled = true,  // everythimg disabled by default
        properties = Object.getOwnPropertyNames(stateConstant),
        i, j;
      for (i = 0; i < properties.length; ++i) {
        if (stateConstant[properties[i]] === state) {
          disabled = false; // valid state, enabled by default
          for (j = 0; j < properties.length; ++j) {
            if (state.indexOf(disabledStates[j]) === 0) {
              return true;  // it or a parent is disabled
            }
          }
        }
      }
      return disabled;
    };

    /* add function to set scope variables giving
      scope.dashState, scope.newState, scope.viewState etc. */
    stateConstant.SET_SCOPE_VARS = function (base, scope) {
      if (!scope) {
        scope = {};
      }
      scope[makeStdStateName('dash')] = stateConstant[base];
      substates.forEach(function (substate) {
        // make properties like 'newState' etc.
        scope[makeStdStateName(substate)] = stateConstant[makeSubStatePropName(base, substate)];
      });
      return scope;
    };

    // list of properties added by SET_SCOPE_VARS
    stateConstant.STD_STATE_NAMES.push(makeStdStateName('dash'));
    substates.forEach(function (substate) {
      stateConstant.STD_STATE_NAMES.push(makeStdStateName(substate));
    });

    return stateConstant;
  })())
  .constant('CONFIG', (function () {
    return {
      DEV_MODE: appenv.DEV_MODE,  // flag to enable dev mode hack/shortcuts etc.
      DEV_USER1: appenv.DEV_USER1,
      DEV_PASSWORD1: appenv.DEV_PASSWORD1,
      DEV_USER2: appenv.DEV_USER2,
      DEV_PASSWORD2: appenv.DEV_PASSWORD2,
      DEV_USER3: appenv.DEV_USER3,
      DEV_PASSWORD3: appenv.DEV_PASSWORD3,
      NOAUTH: appenv.disableAuth,
      MAPSAPIKEY: appenv.mapsApiKey,
      AUTOLOGOUT: appenv.autoLogout,
      AUTOLOGOUTCOUNT: appenv.autoLogoutCount,
      TOKENREFRESH: appenv.tokenRefresh,
      RELOADMARGIN: appenv.reloadMargin
    };
  })())
  .constant('DBG', (function () {

    var dbgObj = {
      isEnabled: function (mod) {
        return this[mod];
      },
      loggerFunc: function (level, mod) {
        if (this[mod]) {
          var args = Array.prototype.slice.call(arguments, 2);
          console[level].apply(console, args.concat(' '));
        }
      },
      log: function (mod) {
        if (this[mod]) {
          var args = Array.prototype.slice.call(arguments, 1);
          console.log.apply(console, args.concat(' '));
        }
      },
      debug: function (mod) {
        if (this[mod]) {
          var args = Array.prototype.slice.call(arguments, 1);
          console.debug.apply(console, args.concat(' '));
        }
      },
      info: function (mod) {
        if (this[mod]) {
          var args = Array.prototype.slice.call(arguments, 1);
          console.info.apply(console, args.concat(' '));
        }
      },
      warn: function (mod) {
        if (this[mod]) {
          var args = Array.prototype.slice.call(arguments, 1);
          console.warn.apply(console, args.concat(' '));
        }
      },
      error: function (mod) {
        if (this[mod]) {
          var args = Array.prototype.slice.call(arguments, 1);
          console.error.apply(console, args.concat(' '));
        }
      }
    };

    // add debug enable flags
    Object.getOwnPropertyNames(appenv).forEach(function (prop) {
      if (prop.indexOf('dbg') === 0) {
        dbgObj[prop] = appenv[prop];
      }
    });

    return dbgObj;
  })())
  .constant('RES', (function () {
    return {
      ACTIVE_CANVASS: 'activeCanvass',            // canvass object name
      ACTIVE_SURVEY: 'activeSurvey',              // survey object name
      ACTIVE_ELECTION: 'activeElection',          // election object name
      BACKUP_CANVASS: 'backupCanvass',            // backup canvass object name
      BACKUP_SURVEY: 'backupSurvey',              // backup survey object name
      BACKUP_ELECTION: 'backupElection',          // backup election object name
      CANVASS_RESULT: 'canvassResults',           // canvass results object name
      SURVEY_QUESTIONS: 'surveyQuestions',        // survey questions object name

      ASSIGNED_ADDR: 'assignedAddr',              // all addresses assigned to canvass
      BACKUP_ASSIGNED_ADDR: 'backupAssignedAddr', // backup of all addresses assigned to canvass
      UNASSIGNED_ADDR: 'unassignedAddr',          // addresses not assigned to canvass
      ASSIGNED_CANVASSER: 'assignedCanvasser',    // all canvassers assigned to canvass
      BACKUP_ASSIGNED_CANVASSER: 'backupAssignedCanvasser', // backup all canvassers assigned to canvass
      UNASSIGNED_CANVASSER: 'unassignedCanvasser',// canvassers not assigned to canvass
      ALLOCATED_ADDR: 'allocatedAddr',            // addresses allocated to canvassers in canvass
      ALLOCATED_CANVASSER: 'allocatedCanvasser',  // canvassers with allocated addresses in canvass
      ALLOCATION_UNDOS: 'allocationUndos',        // undo objects for allocations
      getPagerName: function (base) {
        // eg assignedAddrPager
        return base + 'Pager';
      },
      getFilterName: function (base) {
        // eg assignedAddrFilter
        return base + 'Filter';
      },
      getFilterStrName: function (base) {
        // eg assignedAddrFilterStr
        return base + 'FilterStr';
      },

      PROCESS_NEW: 0,        // new object mode
      PROCESS_UPDATE: 1,     // update existing object mode
      PROCESS_UPDATE_NEW: 2  // update with new object mode

    };
  })())
;

/*jslint node: true */
'use strict';

angular.module('NgDialogUtil', ['ngDialog'])

  .factory('NgDialogFactory', NgDialogFactory);


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

NgDialogFactory.$inject = ['authFactory', 'ngDialog', '$state', 'STATES', 'RSPCODE', 'miscUtilFactory'];

function NgDialogFactory (authFactory, ngDialog, $state, STATES, RSPCODE, miscUtilFactory) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    open: open,
    openAndHandle: openAndHandle,
    close: close,
    closeAll: closeAll,
    error: error,
    message: message,
    errormessage: errormessage,
    isNgDialogCancel: isNgDialogCancel,
    yesNoDialog: yesNoDialog
  };
  
  return factory;

  /* function implementation
    -------------------------- */

  /**
   * Wrapper for the ngDialog open function
   * @param   {object} options dialog options
   * @see https://github.com/likeastore/ngDialog#options
   * @returns {object} dialog properties
   * @see https://github.com/likeastore/ngDialog#returns
   */
  function open (options) {
    return ngDialog.open(options);
  }
  
  /**
   * Display a dialog and process the result
   * @param   {object}   options dialog options
   * @see https://github.com/likeastore/ngDialog#options
   * @param {function} process Function to process result
   * @param {function} cancel  Function to handle a dialog cancel
   * @returns {object} dialog properties
   * @see https://github.com/likeastore/ngDialog#returns
   */
  function openAndHandle (options, process, cancel) {
    var dialog = ngDialog.open(options);

    dialog.closePromise.then(function (data) {
      if (!isNgDialogCancel(data.value)) {
        if (process) {
          process(data.value);
        }
      } else {
        if (cancel) {
          cancel();
        }
      }
    });
    return dialog;
  }

  /**
   * Wrapper for ngDialog close function
   * @param {string}   id    id of dialog to close. If id is not specified it will close all currently active modals.
   * @param {[[Type]]} value optional value to resolve the dialog promise with
   * @see https://github.com/likeastore/ngDialog#closeid-value
   */
  function close (id, value) {
    ngDialog.close (id,value);
  }
  
  /**
   * Wrapper for ngDialog closeAll function
   * @param {[[Type]]} value optional value to resolve the dialog promise with
   * @see https://github.com/likeastore/ngDialog#closeallvalue
   */
  function closeAll (value) {
    ngDialog.closeAll (value);
  }

  /**
   * Display an error dialog from a server response
   * @param {object} response http response
   * @param {string} title    Dialog title
   */
  function error (response, title) {
    var authErr = false,
      options = {
        template: 'views/errormodal.html',
        className: 'ngdialog-theme-default'
      },
      msg;

    // response is message
    if (response) {
      if (!title) {
        switch (response.status) {
          case RSPCODE.HTTP_FORBIDDEN:
            title = 'Access denied';
            break;
          default:
            if (response.status <= 0) {
              title = 'Aborted';
            } else {
              title = 'Error ' + response.status + ': ' + response.statusText;
            }
            break;
        }
      }

      if (response.data) {
        if (response.data.err) {
          msg = response.data.err.message;
        } else if (response.data.message) {
          msg = response.data.message;
        }
      } else if (response.status <= 0) {
        // status codes less than -1 are normalized to zero. -1 usually means the request was aborted
        msg = 'Request aborted';
      }

      authErr = authFactory.checkForAuthError(response);
    }
    if (!msg) {
      msg = 'Unknown error';
    }

    options.data = {
      title: title,
      message: [msg]
    };

    if (authErr) {
      ngDialog.openConfirm(options)
        .then( function (value) {
          gotoHome();
          return value;
        }, function (reason) {
          gotoHome();
          return reason;
        });
    } else {
      ngDialog.openConfirm(options);
    }
  }

  /**
   * Got to the home screen
   */
  function gotoHome () {
    $state.go(STATES.APP);
  }

  /**
   * Display a message dialog
   * @param {string} title   Dialog title
   * @param {string} message message to display
   */
  function message (title, message) {
    var messages = miscUtilFactory.toArray(message);
    ngDialog.openConfirm({
      template: 'views/messagemodal.html',
      className: 'ngdialog-theme-default',
      data: { title: title, message: messages }
    });
  }

  /**
   * Display an error message dialog
   * @param {string} title   Dialog title
   * @param {string} message message to display
   */
  function errormessage (title, message) {
    var messages = miscUtilFactory.toArray(message);
    ngDialog.openConfirm({
      template: 'views/errormodal.html',
      className: 'ngdialog-theme-default',
      data: { title: title, message: messages }
    });
  }

  /**
   * Check if reason for an ngDialog close was cancel
   * @param   {string}  data ngDialog result
   * @returns {boolean} true if reasonwas cancel, false otherwise
   */
  function isNgDialogCancel (data) {
    return ((data === undefined) ||   // ngDialog.close
            (data === 'cancel') || (data === '$closeButton') || (data === '$escape') || (data === '$document'));
  }
  
  /**
   * Display a message dialog with yes/no buttons
   * @param {string} title   Dialog title
   * @param {string} message message to display
   * @param {function} process Function to process result
   * @param {function} cancel  Function to handle a dialog cancel
   * @returns {object} dialog properties
   * @see https://github.com/likeastore/ngDialog#returns
   */
  function yesNoDialog (title, message, process, cancel) {

    var options = {
      template: 'views/yesno.modal.html',
      className: 'ngdialog-theme-default',
      data: { title: title, message: message }
    };
    return openAndHandle(options, process, cancel);
  }
  
}

/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon', ['ct.config', 'ngResource', 'ngCordova', 'ngCookies'])

  .constant('geocodeURL', 'https://maps.googleapis.com/maps/api/geocode/json')
  .constant('PLATFORM', (function () {
    return {
      /* NOTE: keys are values returned by cordova.platformId
        NOTE: cordova.platformId seems to be a lower case copy of device.platform from cordova-plugin-device
        see http://cordova.apache.org/docs/en/latest/reference/cordova-plugin-device/index.html#supported-platforms */
      android: {
        MAPS_PACKAGE: 'com.google.android.apps.maps', // package name of the Google Maps app
        NAVIGATION_URI: 'google.navigation:q=',    /* launch Google Maps navigation with turn-by-turn direction 
                                                      e.g. 'google.navigation:q=Taronga+Zoo,+Sydney+Australia'
                                                      see https://developers.google.com/maps/documentation/android-api/intents#launch_turn-by-turn_navigation */
        MODE_DRIVE: 'd',  // method of transportation driving
        MODE_WALK: 'w',   // method of transportation walking
        MODE_BIKE: 'b',   // method of transportation bicycling
        AVOID_TOLLS: 't', // try to avoid tolls
        AVOID_HIWAY: 'h', // try to avoid highways
        AVOID_FERRY: 'f', // try to avoid ferries
        MAP_URI: 'geo:', /* display a map
                          e.g. 'geo:latitude,longitude?z=zoom'
                          see https://developers.google.com/maps/documentation/android-api/intents#uri_encoded_query_strings */
        MAPS_URL: 'https://www.google.com/maps/dir/current+location/' // e.g. https://www.google.com/maps/dir/current+location/Sydney+Opera+House,+Sydney+Opera+House,+Bennelong+Point,+Sydney+NSW+2000,+Australia/
      },
      ios: {
        // TODO

        // https://developers.google.com/maps/documentation/ios-sdk/urlscheme
      },
      isAndroid: function (platform) {
        // utilise device.platform & cordova.platformId similarity
        return (platform.toLowerCase() === 'android');
      },
      isiOS: function (platform) {
        // utilise device.platform & cordova.platformId similarity
        return (platform.toLowerCase() === 'ios');
      }
    };
  })())
  .constant('CHARTS', (function () {
    // use the angular-chart directive names
    return {
      PIE: 'chart-pie',
      POLAR: 'chart-polar-area',
      DOUGHNUT: 'chart-doughnut',
      BAR: 'chart-bar',
      HORZ_BAR: 'chart-horizontal-bar',
      RADAR: 'chart-radar',
      LINE: 'chart-line',
      BUBBLE: 'chart-bubble'
    };
  })())
  .constant('RSPCODE', (function () {
    return {
      // http response codes
      // Informational 1xx
      HTTP_CONTINUE: 100,           // The client SHOULD continue with its request
      HTTP_SWITCHING_PROTOCOL: 101, // The server will switch protocols to those defined by the response
      // Successful 2xx
      HTTP_OK: 200,                 // Request has succeeded
      HTTP_CREATED: 201,            // Request has been fulfilled and resulted in a new resource being created
      HTTP_ACCEPTED: 202,           // Request has been accepted for processing, but the processing has not been completed
      HTTP_NON_AUTH_INFO: 203,      // The returned metainformation in the entity-header is not the definitive set as available from the origin server, but is gathered from a local or a third-party copy.
      HTTP_NO_CONTENT: 204,         // The server has fulfilled the request but does not need to return an entity-body
      HTTP_RESET_CONTENT: 205,      // The server has fulfilled the request and the user agent SHOULD reset the document view which caused the request to be sent.
      HTTP_PARTIAL_CONTENT: 206,    // The server has fulfilled the partial GET request for the resources.
      // Redirection 3xx
      HTTP_MULTIPLE_CHOICES: 300,   // The requested resource corresponds to any one of a set of representations
      HTTP_MOVED_PERMANEMTLY: 301,  // The requested resource has been assigned a new permanent URI and any future references to this resource SHOULD use one of the returned URIs.
      HTTP_FOUND: 302,              // The requested resource resides temporarily under a different URI
      HTTP_SEE_OTHER: 303,          // The response to the request can be found under a different URI and SHOULD be retrieved using a GET method on that resource.
      HTTP_NOT_MODIFIED: 304,       // If the client has performed a conditional GET request and access is allowed, but the document has not been modified, the server SHOULD respond with this status code.
      HTTP_USE_PROXY: 305,          // The requested resource MUST be accessed through the proxy given by the Location field.
      HTTP_TEMPORARY_REDIRECT: 307, // The requested resource resides temporarily under a different URI.
      // Client Error 4xx
      HTTP_BAD_REQUEST: 400,        // The request could not be understood by the server due to malformed syntax. 
      HTTP_UNAUTHORISED: 401,       // The request requires user authentication.
      HTTP_FORBIDDEN: 403,          // The server understood the request, but is refusing to fulfill it. 
      HTTP_NOT_FOUND: 404,          // The server has not found anything matching the Request-URI.
      HTTP_NOT_ALLOWED: 405,        // The method specified in the Request-Line is not allowed for the resource identified by the Request-URI.
      HTTP_NOT_ACCEPTABLE: 406,     // The resource identified by the request is only capable of generating response entities which have content characteristics not acceptable according to the accept headers sent in the request.
      HTTP_PROXY_AUTH_REQUIRED: 407,// The client must first authenticate itself with the proxy.
      HTTP_TIMEOUT: 408,            // The client did not produce a request within the time that the server was prepared to wait. The client MAY repeat the request without modifications at any later time.
      HTTP_CONFLICT: 409,           // The request could not be completed due to a conflict with the current state of the resource.
      HTTP_GONE: 410,               // The requested resource is no longer available at the server and no forwarding address is known.
      HTTP_LENGTH_REQUIRED: 411,    // The server refuses to accept the request without a defined Content- Length.
      HTTP_PRECON_FAILED: 412,      // The precondition given in one or more of the request-header fields evaluated to false when it was tested on the server.
      HTTP_ENTITY_TOO_LARGE: 413,   // The server is refusing to process a request because the request entity is larger than the server is willing or able to process.
      HTTP_URI_TOO_LONG: 414,       // The server is refusing to service the request because the Request-URI is longer than the server is willing to interpret
      HTTP_MEDIA_TYPE: 415,         // The server is refusing to service the request because the entity of the request is in a format not supported by the requested resource for the requested method.
      HTTP_RANGE: 416,              // None of the range-specifier values in this field overlap the current extent of the selected resource, and the request did not include an If-Range request-header field. (For byte-ranges, this means that the first- byte-pos of all of the byte-range-spec values were greater than the current length of the selected resource.)
      HTTP_EXPECTATION_FAILED: 417, // The expectation given in an Expect request-header field could not be met by this server, or, if the server is a proxy, the server has unambiguous evidence that the request could not be met by the next-hop server.
      // Server Error 5xx
      HTTP_INTERNAL_ERROR: 500,     // The server encountered an unexpected condition which prevented it from fulfilling the request.
      HTTP_NOT_IMPLEMENTED: 501,    // The server does not support the functionality required to fulfill the request.
      HTTP_BAD_GATEWAY: 502,        // The server, while acting as a gateway or proxy, received an invalid response from the upstream server it accessed in attempting to fulfill the request.
      HTTP_UNAVAILABLE: 503,        // The server is currently unable to handle the request due to a temporary overloading or maintenance of the server.
      HTTP_GATEWAY_TIMEOUT: 504,    // The server, while acting as a gateway or proxy, did not receive a timely response from the upstream server specified by the URI.
      HTTP_VERSION: 505,            // The server does not support, or refuses to support, the HTTP protocol version that was used in the request message.
    };
  })())
  .constant('APPCODE', (function () {
    var FIRST_APPERR = 1000,               // start of app error range
      ERROR_RANGE_SIZE = 100,
      TOKEN_ERR_IDX = 0,
      ACCESS_ERR_IDX = 1,
      calcErrorRangeStart = function (idx) {
        return FIRST_APPERR + (idx * ERROR_RANGE_SIZE);
      },
      calcErrorRangeEnd = function (idx) {
        return calcErrorRangeStart(idx) + ERROR_RANGE_SIZE - 1;
      },
      // token related errors
      FIRST_TOKEN_ERR = calcErrorRangeStart(TOKEN_ERR_IDX),
      LAST_TOKEN_ERR = calcErrorRangeEnd(TOKEN_ERR_IDX),
      // access related errors
      FIRST_ACCESS_ERR = calcErrorRangeStart(ACCESS_ERR_IDX),
      LAST_ACCESS_ERR = calcErrorRangeEnd(ACCESS_ERR_IDX);

    return {
      // app level result codes
      FIRST_APPERR: FIRST_APPERR,       // start of app error range
      // token related errors
      IS_TOKEN_APPERR: function (appCode) {
        return ((appCode >= FIRST_TOKEN_ERR) && (appCode <= LAST_TOKEN_ERR));
      },
      APPERR_SESSION_EXPIRED: FIRST_TOKEN_ERR,        // jwt has expired
      APPERR_CANT_VERIFY_TOKEN: FIRST_TOKEN_ERR + 1,  // jwt failed verification
      APPERR_NO_TOKEN: FIRST_TOKEN_ERR + 2,           // no jwt provided
      // access related errors
      IS_ACCESS_APPERR: function (appCode) {
        return ((appCode >= FIRST_ACCESS_ERR) && (appCode <= LAST_ACCESS_ERR));
      },
      APPERR_UNKNOWN_ROLE: FIRST_ACCESS_ERR,          // unknown role identifier
      APPERR_ROLE_NOPRIVILEGES: FIRST_ACCESS_ERR + 1, // assigned role doesn't have required privileges
      APPERR_USER_URL: FIRST_ACCESS_ERR + 2           // url doesn't match credentials
    };
  })())
  .constant('ACCESS', (function () {
    return {
      // privilege definitions for menu access
      ACCESS_NONE: 0x00,    // no access
      ACCESS_CREATE: 0x01,  // create access
      ACCESS_READ: 0x02,    // read access
      ACCESS_UPDATE: 0x04,  // update access
      ACCESS_DELETE: 0x08,  // delete access
      ACCESS_BATCH: 0x10,   // batch mode access
      ACCESS_BIT_COUNT: 5,  // number of access bits per group
      ACCESS_MASK: 0x1f,    // map of access bits

      ACCESS_ALL: 0x01,     // access all objects group
      ACCESS_ONE: 0x02,     // access single object group
      ACCESS_OWN: 0x04,     // access own object group
      ACCESS_GROUPMASK: 0x07,// map of access group bits
      
      // menu access properties in login response
      VOTINGSYS: 'votingsysPriv',
      ROLES: 'rolesPriv',
      USERS: 'usersPriv',
      ELECTIONS: 'electionsPriv',
      CANDIDATES: 'candidatesPriv',
      CANVASSES: 'canvassesPriv',
      NOTICES: 'noticePriv'
    };
  })())
  .constant('MISC', (function () {
    return {
      // countries of the world
      COUNTRIES: [
        'Afghanistan',
        'Albania',
        'Algeria',
        'Andorra',
        'Angola',
        'Anguilla',
        'Antigua & Barbuda',
        'Argentina',
        'Armenia',
        'Australia',
        'Austria',
        'Azerbaijan',
        'Bahamas',
        'Bahrain',
        'Bangladesh',
        'Barbados',
        'Belarus',
        'Belgium',
        'Belize',
        'Benin',
        'Bermuda',
        'Bhutan',
        'Bolivia',
        'Bosnia & Herzegovina',
        'Botswana',
        'Brazil',
        'Brunei Darussalam',
        'Bulgaria',
        'Burkina Faso',
        'Myanmar/Burma',
        'Burundi',
        'Cambodia',
        'Cameroon',
        'Canada',
        'Cape Verde',
        'Cayman Islands',
        'Central African Republic',
        'Chad',
        'Chile',
        'China',
        'Colombia',
        'Comoros',
        'Congo',
        'Costa Rica',
        'Croatia',
        'Cuba',
        'Cyprus',
        'Czech Republic',
        'Democratic Republic of the Congo',
        'Denmark',
        'Djibouti',
        'Dominican Republic',
        'Dominica',
        'Ecuador',
        'Egypt',
        'El Salvador',
        'Equatorial Guinea',
        'Eritrea',
        'Estonia',
        'Ethiopia',
        'Fiji',
        'Finland',
        'France',
        'French Guiana',
        'Gabon',
        'Gambia',
        'Georgia',
        'Germany',
        'Ghana',
        'Great Britain',
        'Greece',
        'Grenada',
        'Guadeloupe',
        'Guatemala',
        'Guinea',
        'Guinea-Bissau',
        'Guyana',
        'Haiti',
        'Honduras',
        'Hungary',
        'Iceland',
        'India',
        'Indonesia',
        'Iran',
        'Iraq',
        'Ireland',
        'Israel and the Occupied Territories',
        'Italy',
        'Ivory Coast (Cote d\'Ivoire)',
        'Jamaica',
        'Japan',
        'Jordan',
        'Kazakhstan',
        'Kenya',
        'Kosovo',
        'Kuwait',
        'Kyrgyz Republic (Kyrgyzstan)',
        'Laos',
        'Latvia',
        'Lebanon',
        'Lesotho',
        'Liberia',
        'Libya',
        'Liechtenstein',
        'Lithuania',
        'Luxembourg',
        'Republic of Macedonia',
        'Madagascar',
        'Malawi',
        'Malaysia',
        'Maldives',
        'Mali',
        'Malta',
        'Martinique',
        'Mauritania',
        'Mauritius',
        'Mayotte',
        'Mexico',
        'Moldova, Republic of',
        'Monaco',
        'Mongolia',
        'Montenegro',
        'Montserrat',
        'Morocco',
        'Mozambique',
        'Namibia',
        'Nepal',
        'Netherlands',
        'New Zealand',
        'Nicaragua',
        'Niger',
        'Nigeria',
        'Korea, Democratic Republic of (North Korea)',
        'Norway',
        'Oman',
        'Pacific Islands',
        'Pakistan',
        'Panama',
        'Papua New Guinea',
        'Paraguay',
        'Peru',
        'Philippines',
        'Poland',
        'Portugal',
        'Puerto Rico',
        'Qatar',
        'Reunion',
        'Romania',
        'Russian Federation',
        'Rwanda',
        'Saint Kitts and Nevis',
        'Saint Lucia',
        'Saint Vincent\'s & Grenadines',
        'Samoa',
        'Sao Tome and Principe',
        'Saudi Arabia',
        'Senegal',
        'Serbia',
        'Seychelles',
        'Sierra Leone',
        'Singapore',
        'Slovak Republic (Slovakia)',
        'Slovenia',
        'Solomon Islands',
        'Somalia',
        'South Africa',
        'Korea, Republic of (South Korea)',
        'South Sudan',
        'Spain',
        'Sri Lanka',
        'Sudan',
        'Suriname',
        'Swaziland',
        'Sweden',
        'Switzerland',
        'Syria',
        'Tajikistan',
        'Tanzania',
        'Thailand',
        'Timor Leste',
        'Togo',
        'Trinidad & Tobago',
        'Tunisia',
        'Turkey',
        'Turkmenistan',
        'Turks & Caicos Islands',
        'Uganda',
        'Ukraine',
        'United Arab Emirates',
        'United States of America (USA)',
        'Uruguay',
        'Uzbekistan',
        'Venezuela',
        'Vietnam',
        'Virgin Islands (UK)',
        'Virgin Islands (US)',
        'Yemen',
        'Zambia',
        'Zimbabwe'
      ]
    };
  })())
  .config(function () {
    // no config for the moment
  });

/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  // object storage
  .factory('storeFactory', storeFactory)

  // browser local storage
  .factory('localStore', localStore);


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

storeFactory.$inject = ['consoleService'];

function storeFactory(consoleService) {

  var store = {},   // object store
    con = consoleService.getLogger('storeFactory'),
    conIsEnabled = con.isEnabled,
    NOFLAG = 0,
    CREATE = 0x01,      // create new object if doesn't exist
    COPY_SET = 0x02,    // set using copy of object
    COPY_GET = 0x04,    // return a copy of object
    CREATE_INIT = 0x08, // create new object if doesn't exist, or init it if it does
    APPLY_FILTER = 0x10,// apply filter (after filter or list set)
    EXISTING = 0x20,    // return existing if it exists
    OVERWRITE = 0x40,   // overwrite existing if it exists
    EMPTY_OBJ = 0x80,   // create an empty object ignoring any constructor
    nameList = [
      'CREATE',
      'COPY_SET',
      'COPY_GET',
      'CREATE_INIT',
      'APPLY_FILTER',
      'EXISTING',
      'OVERWRITE',
      'EMPTY_OBJ'
    ],
    CREATE_COPY_SET = (CREATE | COPY_SET),
    CREATE_ANY = (CREATE | CREATE_INIT);

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    newObj: newObj,
    duplicateObj: duplicateObj,
    delObj: delObj,
    setObj: setObj,
    getObj: getObj,
    NOFLAG: NOFLAG,
    CREATE: CREATE,
    COPY_SET: COPY_SET,
    COPY_GET: COPY_GET,
    APPLY_FILTER: APPLY_FILTER,
    EXISTING: EXISTING,
    OVERWRITE: OVERWRITE,
    EMPTY_OBJ: EMPTY_OBJ,
    CREATE_INIT: CREATE_INIT,
    CREATE_COPY_SET: CREATE_COPY_SET,
    CREATE_ANY: CREATE_ANY,
    doCreate: doCreate,
    doCreateInit: doCreateInit,
    doCreateAny: doCreateAny,
    doCopySet: doCopySet,
    doCopyGet: doCopyGet,
    doApplyFilter: doApplyFilter,
    maskFlag: maskFlag
  };
  
  return factory;

  /* function implementation
    -------------------------- */

  function newObj (id, constructor, flags) {
    if (typeof constructor === 'number') {
      flags = constructor;
      constructor = undefined;
    }
    if (!flags) {
      flags = factory.CREATE;
    }
    if (conIsEnabled) {
      con.debug('storeFactory[' + id + ']: new ' + flagsToString(flags));
    }
    if (!store[id] || doCreateInit(flags)) {
      if (doEmptyObj(flags)) {
        store[id] = {};
      } else if (typeof constructor === 'function') {
        store[id] = new constructor();
      } else if (typeof constructor === 'object') {
        store[id] = constructor;
      } else {
        store[id] = {};
      }
      con.debug('storeFactory: created "' + id + '"');
    } else {
      if (doCreate(flags)) {
        throw new Error('Object with id "' + id + '" already exists in store.');
      }
    }
    return getObj(id, flags);
  }
  
  /**
   * Create a duplicate of an existing object
   * @throws {Error} If object exists and EXISTING flag not set, or source doesn't exist
   * @param   {string}   id       Id of new object to create
   * @param   {string}   srcId    Id of source object
   * @param   {number}   flags    Optional flags
   * @param   {function} presetCb Optional function to be called before object stored
   * @returns {object}   New or existing object
   */
  function duplicateObj (id, srcId, flags, presetCb) {
    if (typeof flags === 'function') {
      presetCb = flags;
      flags = NOFLAG;
    }
    if (conIsEnabled) {
      con.debug('storeFactory[' + id + ']: duplicate ' + flagsToString(flags));
    }
    var copy = getCopy(srcId, COPY_GET);
    if (copy) {
      if (!store[id] || doOverwrite(flags)) {
        if (presetCb) {
          presetCb(copy);    // apply callback to new object
        }
        store[id] = copy;
      } else {
        if (doExisting(flags)) {
          if (presetCb) {
            presetCb(store[id], store[srcId]);  // apply callback to existing object
          }
        } else {
          throw new Error('Object with id "' + id + '" already exists in store.');
        }
      }
    } else {
      throw new Error('Source object with id "' + srcId + '" does not exist in store.');
    }
    return getObj(id, flags);
  }
  
  /**
   * Delete an object from the store
   * @param   {string}         id    Id of object to delete
   * @param   {number}         flags Optional flags
   * @returns {object|boolean} Copy of deleted object (if COPY_GET flag) or true/false
   */
  function delObj (id, flags) {
    if (conIsEnabled) {
      con.debug('storeFactory[' + id + ']: del ' + flagsToString(flags));
    }
    var result = false;
    if (store[id]) {
      result = getCopy(id, flags);
      delete store[id];
      if (!result) {
        result = true;
      }
    }
    return result;
  }

  function getCopy (id, flags) {
    var copy;
    if (doCopyGet(flags)) {
      if (store[id]) {
        copy = angular.copy(store[id]);
      }
    }
    return copy;
  }

  function setObj (id, data, flags, constructor) {
    if (conIsEnabled) {
      con.debug('storeFactory[' + id + ']: set ' + flagsToString(flags));
    }
    var obj = store[id];
    if (!obj && doCreateAny(flags)) {
      obj = newObj(id, constructor, maskFlag(flags, CREATE_ANY));
    }
    if (obj) {
      Object.getOwnPropertyNames(data).forEach(function (prop) {
        obj[prop] = data[prop];
      });
    }
    return getObj(id, flags);
  }
  
  function getObj (id, flags) {
    if (conIsEnabled) {
      con.debug('storeFactory[' + id + ']: get ' + flagsToString(flags));
    }
    var obj = getCopy(id, flags);
    if (!obj) {
      obj = store[id];
    }
    if (conIsEnabled) {
      con.debug(obj ? obj.toString() : obj);
    }
    return obj;
  }

  function testFlag (flags, test) {
    flags = flags || NOFLAG;
    return ((flags & test) !== 0);
  }

  function maskFlag (flags, mask) {
    flags = flags || NOFLAG;
    return (flags & mask);
  }

  function doCreate (flags) {
    return testFlag(flags, CREATE);
  }

  function doCreateInit (flags) {
    return testFlag(flags, CREATE_INIT);
  }

  function doCreateAny (flags) {
    return testFlag(flags, CREATE_ANY);
  }

  function doCopySet (flags) {
    return testFlag(flags, COPY_SET);
  }

  function doCopyGet (flags) {
    return testFlag(flags, COPY_GET);
  }

  function doApplyFilter (flags) {
    return testFlag(flags, APPLY_FILTER);
  }

  function doExisting (flags) {
    return testFlag(flags, EXISTING);
  }

  function doOverwrite (flags) {
    return testFlag(flags, OVERWRITE);
  }

  function doEmptyObj (flags) {
    return testFlag(flags, EMPTY_OBJ);
  }

  function flagsToString (flags) {
    var str = '',
      done,
      mask,
      idx;
    if (typeof flags === 'number') {
      for (done = idx = 0, mask = 0x01; 
        (flags !== done) && (idx < 32); 
        mask <<= 1, ++idx) {
        if ((flags & mask) == mask) {
          if (nameList[idx]) {
            str += nameList[idx] + ' ';
          } else {
            str += 'x' + mask.toString(16) + ' ';
          }
          done |= mask;
        }
      }
    } else {
      str = flags;
    }
    return str;
  }
}


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

localStore.$inject = ['$window'];

function localStore ($window) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    isAvailable: isAvailable,
    store: store,
    remove: remove,
    get: get,
    storeObject: storeObject,
    getObject: getObject
  };

  return factory;

  /* function implementation
    -------------------------- */
  
  function isAvailable () {
    try {
      var x = '__storage_test__';
      $window.localStorage.setItem(x, x);
      $window.localStorage.removeItem(x);
      return true;
    }
    catch(e) {
      return false;
    }
  }

  function store(key, value) {
    try{
      if($window.Storage){
        $window.localStorage.setItem(key, value);
        return true;
      } else {
        return false;
      }
    } catch( error ){
      console.error( error, error.message );
    }
  }

  function remove(key) {
    try{
      if($window.Storage){
        $window.localStorage.removeItem(key);
        return true;
      } else {
        return false;
      }
    } catch( error ){
      console.error( error, error.message );
    }
  }

  function get(key, defaultValue) {
    try{
      if($window.Storage){
        return ($window.localStorage.getItem(key) || defaultValue);
      } else {
        return defaultValue;
      }
    } catch( error ){
      console.error( error, error.message );
    }
  }

  function storeObject(key, value) {
    store(key, JSON.stringify(value));
  }

  function getObject(key, defaultValue) {
    return JSON.parse(get(key, defaultValue));
  }
}



/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .factory('miscUtilFactory', miscUtilFactory);


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

miscUtilFactory.$inject = [];

function miscUtilFactory () {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    copyProperties: copyProperties,
    copyAndAddProperties: copyAndAddProperties,
    removeProperties: removeProperties,
    isEmpty: isEmpty,
    isObject: isObject,
    isNullOrUndefined: isNullOrUndefined,
    readSafe: readSafe,
    toArray: toArray,
    findArrayIndex: findArrayIndex,

    listForEach: listForEach,
    listFind: listFind,

    initSelected: initSelected,
    selectAll: selectAll,
    setSelected: setSelected,
    getSelectedList: getSelectedList,
    countSelected: countSelected,
    toggleSelection: toggleSelection,
    findSelected: findSelected,
    findUnselected: findUnselected,
    addSelectionCmds: addSelectionCmds,
    SET_SEL: 's',
    CLR_SEL: 'c',
    TOGGLE_SEL: 't',
    
    toInteger: toInteger,
    call: call,
    arrayToMap: arrayToMap
  };

  return factory;

  /* function implementation
    -------------------------- */

  /**
   * Copy properties from one object to another
   * @param {object}  from  Object to copy from
   * @param {object   to    Object to copy to
   * @param {Array}   list  list of properties to copy, or all if omitted
   * @return {object} updated to object
   */
  function copyProperties (from, to, list) {
    if (from) {
      if (!list) {
        list = Object.getOwnPropertyNames(from);
      }
      angular.forEach(list, function (prop) {
        to[prop] = from[prop];
      });
    }
    return to;
  }

  /**
   * Create a copy of an object and add additional properties from another object
   * @param {object}  from    Object to copy
   * @param {object   add     Object to add properties from
   * @param {Array}   list    list of properties to copy from 'add', or all if omitted
   * @return {object} new object
   */
  function copyAndAddProperties (from, add, list) {
    var to;
    if (from) {
      to = angular.copy(from);
    } else {
      to = {};
    }
    copyProperties(add, to, list);
    return to;
  }

  /**
   * Remove properties from an object
   * @param {object}  from  Object to remove from
   * @param {Array}   list  list of properties to remove, or all if omitted
   * @return {object} updated to object
   */
  function removeProperties (from, list) {
    if (from) {
      if (!list) {
        list = Object.getOwnPropertyNames(from);
      }
      angular.forEach(list, function (prop) {
        delete from[prop];
      });
    }
    return from;
  }

  /**
   * Check if an object is empty
   * @param   {object}  object object to test
   * @returns {boolean} true if object is empty
   */
  function isEmpty(object) {
    var empty = true;
    if (!isNullOrUndefined(object)) {
      if (Object.getOwnPropertyNames(object).length > 0) {
        empty = false;
      }
    }
    return empty;
  }

  /**
   * Check if argument is an object
   * @param   {object}  object object to test
   * @returns {boolean} true if object is empty
   */
  function isObject(object) {
    return (angular.isObject(object) && !angular.isArray(object));
  }

  /**
   * Check if an object is null or undefined
   * @param   {object}  object object to test
   * @returns {boolean} true if object is null or undefined
   */
  function isNullOrUndefined (object) {
    return ((object === null) || (object === undefined));
  }
  
  /**
   * Return object as an array
   * @param   {object} input object to array-ify
   * @returns {array}   object if already an array, or new array containing object
   */
  function toArray (input) {
    var array;
    if (!Array.isArray(input)) {
      array = [input];
    } else {
      array = input;
    }
    return array;
  }
  
  /**
   * Read a property from a multi-layered object without a read error if a layer is undefined
   * @param   {object}   object Object to read from
   * @param   {Array}    path   property name on path to required value
   * @returns property value or undefined if can't read it
   */
  function readSafe (object, path) {
    var read = object;
    if (object && angular.isArray(path)) {
      for (var i = 0, ll = path.length; (i < ll) && !isNullOrUndefined(read); ++i) {
        read = read[path[i]];
      }
    }
    return read;
  }

  /**
   * Find the index of an entry in an array using the callback function to test each of the entries 
   * @param {array}    array     array to search
   * @param {function} predicate function to test entries in array
   * @param {number}   start     offset to start from
   */
  function findArrayIndex (array, predicate, start) {

    if (!Array.isArray(array)) {
      throw new TypeError('array must be an array');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    // If argument start was passed let n be ToInteger(start); else let n be 0.
    var n = toInteger(start),
      length = array.length >>> 0;

    for (var i = n; i < length; i++) {
      if (predicate(array[i], i, array)) {
        return i;
      }
    }
    return undefined;
  }

  /**
   * Initialise the 'selected' property of all objects in an array
   * @param {Array|ResourceList} list     ResourceList or Array of objects to initialise
   * @param {function} callback Optional function to call with each element
   */
  function initSelected(list, callback) {
    return setSelected(list, factory.CLR_SEL, callback);
  }
  
  /**
   * Set the 'selected' property of all objects in an array
   * @param {Array|ResourceList} list     ResourceList or Array of objects to set
   * @param {function} callback Optional function to call with each element
   */
  function selectAll(list, callback) {
    return setSelected(list, factory.SET_SEL, callback);
  }

  /**
   * Set the 'selected' state of all the entries in the array
   * @param {Array|ResourceList} list     ResourceList or Array of objects to set
   * @param {boolean}  set      Value to set; one of factory.SET_SEL, factory.CLR_SEL or factory.TOGGLE_SEL
   * @param {function} callback Optional function to call with each element
   */
  function setSelected(list, set, callback) {
    var selCount = 0;
    if (list) {
      var forceSet = (set === factory.SET_SEL),
        forceClr = (set === factory.CLR_SEL),
        toggle = (set === factory.TOGGLE_SEL);
      if (forceSet || forceClr || toggle) {

        listForEach(list, function (entry) {
          if (forceSet || (toggle && !entry.isSelected)) {
            entry.isSelected = true;
          } else if (entry.isSelected) {
            delete entry.isSelected;
          }
          if (entry.isSelected) {
            ++selCount;
          }
          if (callback) {
            callback(entry);
          }
        });
      }
    }
    return selCount;
  }

  /**
   * Return an array of 'selected' entries 
   * @param {Array|ResourceList} list ResourceList or Array of objects to extract selected items from
   * @param {function}           func Function to apply to each selected entry
   * @returns {Array}              Array of selected items
   */
  function getSelectedList(list, func) {
    var selectedList = [];

    listForEach(list, function (entry) {
      if (entry.isSelected) {
        if (func) {
          selectedList.push(func(entry));
        } else {
          selectedList.push(entry);
        }
      }
    });

    return selectedList;
  }

  /**
   * Process each entry in the list
   * @param {Array|ResourceList} list     ResourceList or Array of objects to count selected items from
   * @param {function} func   Function to process entry with
   */
  function listForEach (list, func) {
    if (list.isResourceList) {
      // process as ResourceList
      list.forEachInList(function (entry) {
        func(entry);
      });
    } else {
      // process as array
      angular.forEach(list, function (entry) {
        func(entry);
      });
    }
  }

  
  /**
   * Return number of 'selected' entries
   * @param {Array|ResourceList} list     ResourceList or Array of objects to count selected items from
   * @returns {number} Number of selected items
   */
  function countSelected(list) {
    var count = 0;

    listForEach(list, function (entry) {
      if (entry.isSelected) {
        ++count;
      }
    });
    return count;
  }

  /**
   * Find the first selected entry in the list
   * @param {Array|ResourceList} list     ResourceList or Array of objects to search
   * @param {number}   start     offset to start from
   */
  function findSelected(list, start) {
    return listFind(list, function (entry) {
      return entry.isSelected;
    }, start);
  }


  /**
   * Find the first unselected entry in the list
   * @param {Array|ResourceList} list     ResourceList or Array of objects to search
   * @param {number}   start     offset to start from
   */
  function findUnselected(list, start) {
    return listFind(list, function (entry) {
      return !entry.isSelected;
    }, start);
  }


  /**
   * Find an entry in the list
   * @param {Array|ResourceList} list     ResourceList or Array of objects to count selected items from
   * @param {function} func   function to test entries in list
   * @param {number}   start     offset to start from
   */
  function listFind(list, func, start) {
    var item;
    if (list.isResourceList) {
      // process as ResourceList
      item = list.findInList(function (entry) {
        return func(entry);
      }, start);
    } else {
      // process as array
      // If argument start was passed let n be ToInteger(start); else let n be 0.
      var n = toInteger(start),
        length = list.length >>> 0,
        value;

      for (var i = n; i < length; i++) {
        value = list[i];
        if (func(value)) {
          item = value;
          break;
        }
      }
    }
    return item;
  }


  /**
   * Toggle an object's 'selected' state
   * @param   {object} entry Object to toggle state of
   * @param   {number} count Current selected count
   * @returns {number} Updated selected count
   */
  function toggleSelection (entry, count) {
    if (count === undefined) {
      count = 0;
    }
    if (!entry.isSelected) {
      entry.isSelected = true;
      count += 1;
    } else {
      entry.isSelected = false;
      count -= 1;
    }
    return count;
  }
  
  /**
   * Convenience methos to add selection commands to a scope
   * @param {object} scope Scope to add commands to
   */
  function addSelectionCmds (scope) {
    scope.SET_SEL = factory.SET_SEL;
    scope.CLR_SEL = factory.CLR_SEL;
    scope.TOGGLE_SEL = factory.TOGGLE_SEL;
  }

  /**
   * Get the toInteger value 
   * @param   {number} value Value to convert
   * @returns {number} integer value
   */
  function toInteger (value) {
    // If argument value was passed let n be ToInteger(value); else let n be 0.
    var n = +value /* unary plus */ || 0;
    if (Math.abs(n) === Infinity) {
      n = 0;
    }
    return n;
  }

  /**
   * Safely call a function
   * @param {function} func Numction to call
   */
  function call(func) {
    if (typeof func === 'function') {
      var args;
      if (arguments.length > 1) {
        args = Array.prototype.slice.call(arguments, 1);
      }
      func.apply(null, args);
    }
  }

  /**
   * Create an object with propertry names being the value of the specified property,
   * and values being the corresponding array object
   * @param {array} array Array to convert
   * @param {string} prop Name of property to use as key
   * @return {object} object mapping property values to array objects
   */
  function arrayToMap(array, prop) {
    var map = {},
      forEach;

    if (array.isResourceList) {
      forEach = 'forEachInList';  // resource list forEach function
    } else {
      forEach = 'forEach';     // Array forEachfunction
    }
    array[forEach](function (entry) {
      if (hasProperty(entry, prop)) {
        if (hasProperty(map, entry[prop])) {
          throw new Error('Map already has property ' + entry[prop]);
        } else {
          map[entry[prop]] = entry;
        }
      } else {
        throw new Error('Entry missing property ' + prop);
      }
    });
    return map;
  }


}

/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .constant('SCHEMA_CONST', (function () {
    var SORT_ASC = '+',
      SORT_DESC = '-',

      BASIC_SORT_OPTIONS = [],
      SORT_DIRS = [
        {key: SORT_ASC, chr: '\u25B2'},
        {key: SORT_DESC, chr: '\u25BC'}
      ];

    // generate basic sort options list
    [{name: 'Index', key: 'index'}].forEach(function (option) {
      SORT_DIRS.forEach(function (sort) {
        BASIC_SORT_OPTIONS.push({
          name: option.name + ' ' + sort.chr,
          value: sort.key + option.key
          // no id field as the compare function can be directly returned
        });
      });
    });

    var idTagEnd = '.',
      makeIdTag = function (name) {
        return name + idTagEnd;
      },
      // note: each needs to be unique
      typeUnknown = 'unkwn',
      typeStr = 'str',
      typeDate = 'date',
      typeBool = 'bool',
      typeNum = 'num',
      typeObj = 'obj',
      typeObjId = 'oId',
      typeArray = '[]',
      makeArrayType = function (type) {
        return (type + typeArray);
      },
      typeStrArray = makeArrayType(typeStr),
      typeDateArray = makeArrayType(typeDate),
      typeBoolArray = makeArrayType(typeBool),
      typeNumArray = makeArrayType(typeNum),
      typeObjArray = makeArrayType(typeObj),
      typeObjIdArray = makeArrayType(typeObjId),
      isType = function (mType, type) {
        return (mType === type);
      },
      isPartType = function (mType, type) {
        return (mType.indexOf(type) >= 0);
      };
  
    return {
      // schema id tags
      ID_TAG_END: idTagEnd,
      MAKE_ID_TAG: makeIdTag,

      // schema field properties
      DIALOG_PROP: 'dialog',    // property for string used in dialogs
      DISPLAY_PROP: 'display',  // property for display string
      MODEL_PROP: 'model',      // property for field(s) used in db model
      TYPE_PROP: 'type',        // property for type of field
      TRANSFORM_PROP: 'filterTransform',  // property for value transform
      TEST_PROP: 'filterTest',  // property for value filter test
      REF_SCHEMA_PROP: 'refSchema',  // schema for ObjectId reference object
      REF_FIELD_PROP: 'refField',  // link field id for ObjectId reference object

      PATH_PROP: 'path',        // property for path to field
      ID_PROP: 'id',            // property for id used to identify schema

      // ModelProp field properties
      MODELNAME_PROP: 'modelName',
      MODELPATH_PROP: 'modelPath',
      FACTORY_PROP: 'factory',
      DEFAULT_PROP: 'dfltValue',
      
      FIELD_TYPES: {
        UNKNOWN: typeUnknown,
        STRING: typeStr,
        DATE: typeDate,
        BOOLEAN: typeBool,
        NUMBER: typeNum,
        OBJECT: typeObj,
        OBJECTID: typeObjId,
        
        STRING_ARRAY: typeStrArray,
        DATE_ARRAY: typeDateArray,
        BOOLEAN_ARRAY: typeBoolArray,
        NUMBER_ARRAY: typeNumArray,
        OBJECT_ARRAY: typeObjArray,
        OBJECTID_ARRAY: typeObjIdArray,
        
        IS_TYPE: isType,
        IS_STRING: function (mType) {
          return isType(mType, typeStr);
        },
        IS_DATE: function (mType) {
          return isType(mType, typeDate);
        },
        IS_BOOLEAN: function (mType) {
          return isType(mType, typeBool);
        },
        IS_NUMBER: function (mType) {
          return isType(mType, typeNum);
        },
        IS_OBJECT: function (mType) {
          return isType(mType, typeObj);
        },
        IS_OBJECTID: function (mType) {
          return isType(mType, typeObjId);
        },
        IS_ARRAY: function (mType) {
          return isPartType(mType, typeArray);
        },
        IS_STRING_ARRAY: function (mType) {
          return isType(mType, typeStrArray);
        },
        IS_DATE_ARRAY: function (mType) {
          return isType(mType, typeDateArray);
        },
        IS_BOOLEAN_ARRAY: function (mType) {
          return isType(mType, typeBoolArray);
        },
        IS_NUMBER_ARRAY: function (mType) {
          return isType(mType, typeNumArray);
        },
        IS_OBJECT_ARRAY: function (mType) {
          return isType(mType, typeObjArray);
        },
        IS_OBJECTID_ARRAY: function (mType) {
          return isType(mType, typeObjIdArray);
        }
      },

      TRANSFORM_LWRCASE_STR: 'transformLowerCaseStr',
      TEST_IDXOF_STR: 'testIndexOfStr',

      // stamdard mongo datge fields
      ID: {
        field: 'ID', modelName: '_id', dfltValue: undefined, type: typeObjId
      },
      CREATEDAT: {
        field: 'CREATED', modelName: 'createdAt', dfltValue: undefined, type: typeDate
      },
      UPDATEDAT: {
        field: 'UPDATED', modelName: 'updatedAt', dfltValue: undefined, type: typeDate
      },
      
      // sort direction indicators
      SORT_ASC: '+',
      SORT_DESC: '-',
      SORT_DIRS: SORT_DIRS,
      
      BASIC_SORT_OPTIONS: BASIC_SORT_OPTIONS,
      
      MAKE_SORT_OPTION_VALUE: 
        /**
         * Generate a value for a sort option list item 
         * @param   {string} key    Option asc/desc key, i.e. SORT_ASC or SORT_DESC
         * @param   {string} item   Item name
         * @returns {string} id
         */
        function makeSortOptionValue (key, item) {
          return key + item;
        },

      DECODE_SORT_OPTION_VALUE:
        /**
         * Decode a value for a sort option list item 
         * @param   {string} sort item value
         * @returns {object} decoded id with the following properties:
         *  @param   {string} key  Option asc/desc key
         *  @param   {number} item  Item name
         */
        function decodeSortOptionValue (itemId) {
          return { 
            key: itemId.charAt(0), 
            item: itemId.substr(1)
          };
        },
      
      MAKE_SORT_ITEM_ID: 
        /**
         * Generate an id for a sort option list item 
         * @param   {string} idTag   Schema id string
         * @param   {number} index   Option index
         * @returns {string}  id
         */
        function makeSortItemId (idTag, index) {
          return idTag + index;
        },

      DECODE_SORT_ITEM_ID: 
        /**
         * Decode an id for a sort option list item 
         * @param   {string} sort item id
         * @returns {object} decoded id with the following properties:
         *  @param   {string} idTag Schema id string
         *  @param   {number} index Option index
         */
        function decodeSortItemId (itemId) {
          var splits = itemId.split(idTagEnd);
          return { 
            idTag: makeIdTag(splits[0]), 
            index: parseInt(splits[1])
          };
        }

      
    };
  }()))

/* A schema object provider, with help from https://www.bennadel.com/blog/2788-creating-a-factory-provider-for-the-configuration-phase-in-angularjs.htm
  NOTE: The provider can have other providers injected, but it cannot inject 
	services as this will be created during the configuration phase, before 
	services have been made available.

  NOTE: The ProvideSchema() function is going to be instantiated using the
	"new" operator; as such, we could use the "this" reference to define object
	properties and methods. But this implementation returns a public API.
*/
  .provider('schema', ['$injector', 'SCHEMA_CONST' , 'RESOURCE_CONST', function ProvideSchema($injector, SCHEMA_CONST, RESOURCE_CONST) {

    var modelPropProperties = ['id', 'modelName', 'modelPath', 'factory', 'dfltValue', 'type', 'filterTransform', 'filterTest', 'refSchema', 'refField'],
      // TODO big overlap between schema fields & ModelProp object, fix
      //      modelPropSchemaProperties = ['factory', 'dfltValue', 'type', 'filterTransform', 'filterTest', 'refSchema', 'refField'],
      schemaFieldArgs = [
        // same arder as Schema.prototype.addField() arguments!
        SCHEMA_CONST.DIALOG_PROP,
        SCHEMA_CONST.DISPLAY_PROP,
        SCHEMA_CONST.MODEL_PROP,
        SCHEMA_CONST.TYPE_PROP,
        SCHEMA_CONST.TRANSFORM_PROP,
        SCHEMA_CONST.TEST_PROP,
        SCHEMA_CONST.REF_SCHEMA_PROP,
        SCHEMA_CONST.REF_FIELD_PROP
      ];

    /**
     * Create a Schema object
     * @returns {object} new Schema object
     */
    function getSchema(name, modelProps, ids, tag) {
      return $injector.instantiate(Schema, {
        name: name,
        modelProps: modelProps,
        ids: ids,
        tag: tag
      });
    }

    /**
     * Create a ModelProp object
     * @returns {object} new ModelProp object
     */
    function getModelPropObject(args) {
      var vals = {};
      modelPropProperties.forEach(function (prop) {
        if (hasProperty(args, prop)) {
          vals[prop] = args[prop];
        } else {
          vals[prop] = undefined;
        }
      });
      return $injector.instantiate(ModelProp, vals);
    }

    /**
     * Add extra properties to the default string ModelProp arguments
     * @param {object} args      ModelProp arguments object
     * @param {object} xtra      Optional extra properties to add
     * @returns {object} ModelProp arguments object
     */
    function addXtraArgs (args, xtra) {
      if (args && xtra) {
        for (var prop in xtra) {
          args[prop] = xtra[prop];
        }
      }
      return args;
    }

    /**
     * Return an object with the default ModelProp arguments
     * @param {string}        modelName Name of model field
     * @param {*}             dfltValue Default value
     * @param {string|object} factory   StandardFactory/name of same for object
     * @param {string}        resource  Factory resource for the object
     * @param {string}        type      Type; one of SCHEMA_CONST.FIELD_TYPES
     * @returns {object}        ModelProp arguments object
     */
    function getBaseModelPropArgs (modelName, dfltValue, factory, resource, type) {
      return {
        modelName: modelName,
        dfltValue: dfltValue,
        factory: factory,
        resource: resource,
        type: type
      };
    }

    /**
     * Return an object with the default string ModelProp arguments
     * @param {string} modelName Name of model field
     * @param {object} xtra      Optional extra properties to add
     * @returns {object} ModelProp arguments object
     */
    function getStringModelPropArgs (modelName, xtra) {
      var args = getBaseModelPropArgs(modelName, '', undefined, undefined, SCHEMA_CONST.FIELD_TYPES.STRING);
      args.filterTransform = SCHEMA_CONST.TRANSFORM_LWRCASE_STR;
      args.filterTest = SCHEMA_CONST.TEST_IDXOF_STR;
      return addXtraArgs(args, xtra);
    }

    /**
     * Return an object with the default number ModelProp arguments
     * @param {string} modelName Name of model field
     * @param {number} dfltValue Default value
     * @param {object} xtra      Optional extra properties to add
     * @returns {object} ModelProp arguments object
     */
    function getNumberModelPropArgs (modelName, dfltValue, xtra) {
      return addXtraArgs(
        getBaseModelPropArgs(modelName, dfltValue, undefined, undefined, SCHEMA_CONST.FIELD_TYPES.NUMBER),
        xtra
      );
    }

    /**
     * Return an object with the default date ModelProp arguments
     * @param {string} modelName Name of model field
     * @param {number} dfltValue Default value
     * @param {object} xtra      Optional extra properties to add
     * @returns {object} ModelProp arguments object
     */
    function getDateModelPropArgs (modelName, dfltValue, xtra) {
      return addXtraArgs(
        getBaseModelPropArgs(modelName, dfltValue, undefined, undefined, SCHEMA_CONST.FIELD_TYPES.DATE),
        xtra
      );
    }
    
    /**
     * Return an object with the default boolean ModelProp arguments
     * @param {string} modelName Name of model field
     * @param {number} dfltValue Default value
     * @param {object} xtra      Optional extra properties to add
     * @returns {object} ModelProp arguments object
     */
    function getBooleanModelPropArgs (modelName, dfltValue, xtra) {
      return addXtraArgs(
        getBaseModelPropArgs(modelName, dfltValue, undefined, undefined, SCHEMA_CONST.FIELD_TYPES.BOOLEAN),
        xtra
      );
    }
    

    /**
     * Return an object with the default ObjectId ModelProp arguments
     * @param {string}        modelName Name of model field
     * @param {string|object} factory   StandardFactory/name of same for object
     * @param {string}        resource  Factory resource for the object
     * @param {object}        schema    Schema for object referenced
     * @param {number}        field     Field id of reference link field
     * @param {object}        xtra      Optional extra properties to add
     * @returns {object}        ModelProp arguments object
     */
    function getObjectIdModelPropArgs (modelName, factory, resource, schema, field, xtra) {
      var args = getBaseModelPropArgs(modelName, undefined, factory, resource, SCHEMA_CONST.FIELD_TYPES.OBJECTID);
      args.refSchema = schema;
      args.refField = field;
      return addXtraArgs(args, xtra);
    }

    /**
     * Return an object with the default array ModelProp arguments
     * @param {string}        modelName Name of model field
     * @param {string|object} factory   StandardFactory/name of same for object
     * @param {string}        resource  Factory resource for the object
     * @param {object}        xtra      Optional extra properties to add
     * @returns {object}        ModelProp arguments object
     */
    function getArrayModelPropArgs (modelName, type, factory, resource, xtra) {
      return addXtraArgs(
        getBaseModelPropArgs(modelName, [], factory, resource, type),
        xtra
      );
    }

    /**
     * Return an object with the default string array ModelProp arguments
     * @param {string} modelName Name of model field
     * @param {object} xtra      Optional extra properties to add
     * @returns {object}        ModelProp arguments object
     */
    function getStringArrayModelPropArgs (modelName, xtra) {
      return getArrayModelPropArgs(modelName, SCHEMA_CONST.FIELD_TYPES.STRING_ARRAY, undefined, undefined, xtra);
    }

    /**
     * Return an object with the default number array ModelProp arguments
     * @param {string} modelName Name of model field
     * @param {object} xtra      Optional extra properties to add
     * @returns {object}        ModelProp arguments object
     */
    function getNumberArrayModelPropArgs (modelName, xtra) {
      return getArrayModelPropArgs(modelName, SCHEMA_CONST.FIELD_TYPES.NUMBER_ARRAY, undefined, undefined, xtra);
    }

    /**
     * Return an object with the default date array ModelProp arguments
     * @param {string} modelName Name of model field
     * @param {object} xtra      Optional extra properties to add
     * @returns {object}        ModelProp arguments object
     */
    function getDateArrayModelPropArgs (modelName, xtra) {
      return getArrayModelPropArgs(modelName, SCHEMA_CONST.FIELD_TYPES.DATE_ARRAY, undefined, undefined, xtra);
    }

    /**
     * Return an object with the default boolean array ModelProp arguments
     * @param {string} modelName Name of model field
     * @param {object} xtra      Optional extra properties to add
     * @returns {object}        ModelProp arguments object
     */
    function getBooleanArrayModelPropArgs (modelName, xtra) {
      return getArrayModelPropArgs(modelName, SCHEMA_CONST.FIELD_TYPES.BOOLEAN_ARRAY, undefined, undefined, xtra);
    }

    /**
     * Return an object with the default ObjectId array ModelProp arguments
     * @param {string}        modelName Name of model field
     * @param {string|object} factory   StandardFactory/name of same for object
     * @param {string}        resource  Factory resource for the object
     * @param {object}        schema    Schema for object referenced
     * @param {number}        field     Field id of reference link field
     * @param {object}        xtra      Optional extra properties to add
     * @returns {object}        ModelProp arguments object
     */
    function getObjectIdArrayModelPropArgs (modelName, factory, resource, schema, field, xtra) {
      var args = getArrayModelPropArgs(modelName, SCHEMA_CONST.FIELD_TYPES.OBJECTID_ARRAY, factory, resource, xtra);
      args.refSchema = schema;
      args.refField = field;
      return args;
    }

    /**
     * Generate a sort option list based on the specified schema object
     * @param   {object} schema  Schema to generate sort list from
     * @param   {Array}  indices Schema field indices to use
     * @param   {string} idTag   Schema id string
     * @returns {Array}  List of sort options
     */
    function makeSortList (schema, indices, idTag) {

      var sortOptions = angular.copy(SCHEMA_CONST.BASIC_SORT_OPTIONS);

      // add addr sort option to basic list of sort options
      indices.forEach(function (index) {
        var field = schema.getField(index);
        SCHEMA_CONST.SORT_DIRS.forEach(function (sort) {
          sortOptions.push({
            name: field.display + ' ' + sort.chr,
            value: SCHEMA_CONST.MAKE_SORT_OPTION_VALUE(sort.key, field.dialog),
            id: SCHEMA_CONST.MAKE_SORT_ITEM_ID(idTag, index)
          });
        });
      });

      return sortOptions;
    }

    /**
     * Generate a sort option list based on the specified schema object
     * @param   {Array}    subDocOptions Sub doc sort options
     * @param   {Array}    path          Path to subdoc in this schema
     * @param   {Object}   args          Additional optinal arguments:
     *    @param   {Array}    exOptions     Sub doc options to exclude
     *    @param   {Array}    addTo         Options array to add to
     *    @param   {function} cb            Function to call for each option being added
     * @returns {Array}    List of sort options
     */
    function makeSubDocSortList (subDocOptions, path, args) {

      var sortOptions,
        i,
        ex,
        pathArray;

      if (typeof path === 'string') {
        pathArray = [path];
      } else if (Object.prototype.toString.call(path) === '[object Array]') {
        pathArray = path;
      } else if (typeof path === 'object') {
        args = path;
      }
      if (!args) {
        args = {};
      }

      if (!args.exOptions) {
        sortOptions = angular.copy(subDocOptions);
      } else {
        sortOptions = [];
        subDocOptions.forEach(function (option) {
          ex = false;
          for (i = 0; !ex && (i < args.exOptions.length); ++i) {
            ex = (option.value === args.exOptions[i].value);
          }
          if (!ex) {
            sortOptions.push(angular.copy(option));
          }
        });
      }
      sortOptions.forEach(function (option) {
        option.path = pathArray;
        if (args.cb) {
          args.cb(option);
        }
        if (args.addTo) {
          args.addTo.push(option);
        }
      });
      return sortOptions;
    }

    // ---
    // FACTORY METHOD.
    // ---


    // Create the actual schema service. 
    // --
    // NOTE: This function is the same function we could have defined if we
    // had just used .factory() instead of .provider(). As such, this method
    // is invoked using dependency injection and can inject other services.
    function instantiateProvider() {

      // Return the public API.
      return({
        dummy: dummy
      });

      // ---
      // PUBLIC METHODS.
      // ---

      // Return a greeting message for the given name.
      function dummy() {
        return 'Placeholder provider method';
      }

    }

    /**
     * Transform a string to lower case
     * @param   {string} str String to transform
     * @returns {string} lowercase string
     */
    function transformLowerCaseStr (str) {
      return str.toLowerCase();
    }
    
    /**
     * Test that a string existins within another
     * @param   {string}   value  String to test
     * @param   {string}   filter [[Description]]
     * @returns {[[Type]]} [[Description]]
     */
    function testIndexOfStr (value, filter) {
      return (value.indexOf(filter) >= 0);
    }

    /**
     * Wrapper for toString to prevent toString calls on undefined
     * @param {object} value   Object to call toString() on
     * @returns {string} string representation
     */
    function propertyToString (value) {
      var str;
      if (value === undefined) {
        str = 'undefined';
      } else if (value === null) {
        str = 'null';
      } else if (Array.isArray(value)) {
        str = '[' + value.toString() + ']';
      } else if (typeof value === 'function') {
        str = value.name;
      } else {
        str = value.toString();
      }
      return str;
    }

    /**
     * Return a string representing the enumerable properties of this object
     * @param {object} obj  Object to return string representation of
     * @returns {string} string representation
     */
    function propertyString (obj) {
      var str = '';
      for (var property in obj) {
        if (str) {
          str += ', ';
        }
        str += property + ': ' + propertyToString(obj[property]);
      }
      return str;
    }

    /**
     * Test if an object matches the specified arguments
     * @param {object}  obj Object to test
     * @param {object}  args Match criteria. Criteria are of the form:
     *                    { <property name>: <test>, ... }
     *                    where if <test> is 
     *                    - a function; the value is passed to the predicate function
     *                    - otherwise equivalence is tested using angular.equals()
     * @returns {boolean} true if matches
     */
    function matches (obj, args) {
      var hits = 0,
        target = 0,
        tested = false;
      for (var prop in args) {
        tested = true;
        ++target;
        if (hasProperty(obj, prop)) {
          if (typeof args[prop] === 'function') {
            if (args[prop](obj[prop])) {
              ++hits;
            }
          } else if (angular.equals(args[prop], obj[prop])) {
            ++hits;
          }
        }
      }
      return (tested && (hits === target));
    }
    
    /**
     * Construct a ModelProp object representing a field in a database document
     * @param {number}        id              Property id
     * @param {string}        modelName       Name of model field
     * @param {Array}         modelPath       Path to values within object
     * @param {string|object} factory         StandardFactory/name of same for object
     * @param {*}             dfltValue       Default value
     * @param {string}        type            Value type; SCHEMA_CONST.FIELD_TYPES.STRING etc.
     * @param {function}      filterTransform Function to transform value before a filter test
     * @param {function}      filterTest      Function to perform a filter test
     * @param {function}      refSchema       schema for ObjectId reference object
     * @param {function}      refField        link field id for ObjectId reference object
     */
    function ModelProp (id, modelName, modelPath, factory, dfltValue, type, filterTransform, filterTest, refSchema, refField) {
      this.id = id;
      this.modelName = modelName;
      this.modelPath = modelPath;
      this.factory = factory;
      this.dfltValue = dfltValue;
      this.type = type;
      if (filterTransform === SCHEMA_CONST.TRANSFORM_LWRCASE_STR) {
        this.filterTransform = transformLowerCaseStr;
      } else {
        this.filterTransform = filterTransform;
      }
      if (filterTest === SCHEMA_CONST.TEST_IDXOF_STR) {
        this.filterTest = testIndexOfStr;
      } else {
        this.filterTest = filterTransform;
      }
      this.refSchema = refSchema;
      this.refField = refField;
    }

    ModelProp.$inject = ['id', 'modelName', 'modelPath', 'factory', 'dfltValue', 'type', 'filterTransform', 'filterTest', 'refSchema', 'refField'];

    /**
     * Test if this object matches the specified arguments
     * @param   {object}  args Match criteria. Criteria are of the form:
     *                      { <property name>: <test>, ... }
     *                      where if <test> is 
     *                      - a function the value is passed to the predicate function
     *                      - otherwise equivalence is tested using angular.equals()
     * @returns {boolean} true if matches
     */
    ModelProp.prototype.matches = function (args) {
      return matches(this, args);
    };

    
    ModelProp.prototype.toString = function () {
      return 'ModelProp { ' + propertyString(this) + '}';
    };

    /**
     * Schema object constructor
     * @param {string} name       Schema name
     * @param {Array}  modelProps Model properties array
     * @param {object}  ids       ids for schema fields
     * @param {string} tag        id tag
     */
    function Schema (SCHEMA_CONST, RESOURCE_CONST, name, modelProps, ids, tag) {
      if (!Array.isArray(modelProps)) {
        throw new TypeError('Invalid type for argument: modelProps');
      }
      this.name = name;
      this.modelProps = modelProps;
      this.ids = ids;
      this.tag = tag;
      this.fields = [];
    }

    Schema.$inject = ['SCHEMA_CONST', 'RESOURCE_CONST', 'name', 'modelProps', 'ids', 'tag'];
    
    /**
     * Identify this object as a Schema
     */
    Schema.prototype.isSchema = true;

    /**
     * Add a new entry to the Schema
     * @param   {string}       dialog          String used in dialogs
     * @param   {string}       display         String displayed in dialogs
     * @param   {Array|object} model           Field(s) from db model
     * @param   {string}       type            field type
     * @param {function}     filterTransform Function to transform value before a filter test
     * @param {function}     filterTest      Function to perform a filter test
     * @param {object}       refSchema       schema for ObjectId reference object
     * @param {number}       refField        link field id for ObjectId reference object
     * @param   {Object}       args            Additional optinal arguments:
     *    @param   {Array|object} path            Field(s) providing path to field
     *    @param   {function}     cb              Function to call for each option
     * @returns {number}       index of added entry
     * 
     * NOTE update schemaFieldArgs variable on any changes to arguments
     */
    Schema.prototype.addField = function (dialog, display, model, type, filterTransform, filterTest, refSchema, refField, args) {
      var modelArray,
        pathArray,
        field = {};
      if (!Array.isArray(model)) {
        modelArray = [model];
      } else {
        modelArray = model;
      }
      if (typeof filterTransform === 'object') {
        if (filterTransform.isSchema) {
          args = refSchema;
          refField = filterTest;
          refSchema = filterTransform;
        } else {
          args = filterTransform;
        }
        filterTest = undefined;
        filterTransform = undefined;
      }
      if (args && args.path) {
        if (!Array.isArray(args.path)) {
          pathArray = [args.path];
        } else {
          pathArray = args.path;
        }
      }
      
      // TODO big overlap between schema fields & ModelProp object, fix
      
      for (var i = 0, 
        len = (schemaFieldArgs.length < arguments.length ?
          schemaFieldArgs.length : arguments.length); i < len; ++i) {
        field[schemaFieldArgs[i]] = arguments[i];
      }

      field[SCHEMA_CONST.ID_PROP] = this.tag;
      field[SCHEMA_CONST.PATH_PROP] = pathArray;

      if (args && args.cb) {
        args.cb(field);
      }
      this.fields.push(field);
      return (this.fields.length - 1);
    };

    /**
     * Add a new entry to the Schema
     * @param   {string}       dialog  String used in dialogs
     * @param   {string}       display String displayed in dialogs
     * @param   {Array|number} id      Schema id index or array of, e.g. 'ADDRSCHEMA.IDs.ADDR1'
     * @param   {Object}       args    Additional optional arguments:
     *    @param   {Array|object} path    Field(s) providing path to field
     *    @param   {function}     cb      Function to call for each option
     * @returns {number}       index of added entry
     */
    Schema.prototype.addFieldFromField = function (field, args) {
      var addArgs = [];  // arguments for Schema.prototype.addField()

      schemaFieldArgs.forEach(function (prop) {
        addArgs.push(field[prop]);
      });

      addArgs.push(args);

      return this.addField.apply(this, addArgs);
    };

    /**
     * Add a new entry to the Schema
     * @param   {string}       dialog  String used in dialogs
     * @param   {string}       display String displayed in dialogs
     * @param   {Array|number} id      Schema id index or array of, e.g. 'ADDRSCHEMA.IDs.ADDR1'
     * @param   {Object}       args    Additional optional arguments:
     *    @param   {Array|object} path    Field(s) providing path to field
     *    @param   {function}     cb      Function to call for each option
     * @returns {number}       index of added entry
     */
    Schema.prototype.addFieldFromModelProp = function (dialog, display, id, args) {
      var idArray,
        modelArray = [],
        addArgs = [dialog, display, modelArray],  // arguments for Schema.prototype.addField()
        init = 0,
        array = [
          // NOTE: order must match arguments for Schema.prototype.addField()
          { bit: 0x01, value: undefined, prop: SCHEMA_CONST.TYPE_PROP, missing: true },
          { bit: 0x02, value: undefined, prop: SCHEMA_CONST.TRANSFORM_PROP },
          { bit: 0x04, value: undefined, prop: SCHEMA_CONST.TEST_PROP },
          { bit: 0x08, value: undefined, prop: SCHEMA_CONST.REF_SCHEMA_PROP },
          { bit: 0x10, value: undefined, prop: SCHEMA_CONST.REF_FIELD_PROP }
        ],
        modelProp;

      if (!Array.isArray(id)) {
        idArray = [id];
      } else {
        idArray = id;
      }
      idArray.forEach(function (sId) {
        modelProp = this.getModelProp(sId);
        if (modelProp.modelName) {
          modelArray.push(modelProp.modelName);
        } else {
          throw new Error('Missing modelName');
        }

        array.forEach(function (entry) {
          if ((init & entry.bit) === 0) {
            entry.value = modelProp[entry.prop];  // first time init
            init |= entry.bit;
            
            addArgs.push(entry.value);  // add to addField arguments
          }
              
          if (modelProp[entry.prop] !== entry.value) {
            throw new Error('Type mismatch in multi-model ' + entry.prop);
          } else {
            if (entry.missing && !entry.value) {
              throw new Error('Missing ' + entry.prop);
            }
          }
        });
      }, this);

      addArgs.push(args);

      return this.addField.apply(this, addArgs);
    };

    /**
     * Return the schema field with the specified index. 
     * @param   {number} index    Index of field to return
     * @param   {string} property Property of field to return
     * @returns {object} Field object or property
     */
    Schema.prototype.getField = function (index, property) {
      var result;
      if ((index >= 0) && (index < this.fields.length)) {
        if (typeof property === 'string') {
          // return specific property of entry
          result = this.fields[index][property];
        } else {
          // return whole entry
          result = this.fields[index];
        }
      }
      return result;
    };

    /**
     * Return a schema link object. 
     * @param   {number} id    Field id
     * @returns {object} schema link
     */
    Schema.prototype.getSchemaLink = function (id) {
      return {
        schema: this,
        schemaId: id
      };
    };

    /**
     * Process a forEach callback
     * @param {Array}    array    Array to traverse
     * @param {function} callback Function to callback taking the arguments:
     *    @param {object}   field    field object
     *    @param {number}   index    field index
     *    @param {array}    array    field array
     * @param {object}   thisArg  The value of 'this' provided for the call to the callback function
     */
    function forEachCallback (array, callback, thisArg) {
      if (typeof callback === 'function') {
        var loop = true;
        for (var i = 0, ll = array.length; loop && (i < ll); ++i) {
          loop = callback.call(thisArg, array[i], i, array);
          if (loop === undefined) {
            loop = true;
          }
        }
      }
    }

    /**
     * Callback the specified function for each field in the schema, providing the field details as the callback arguments
     * @param {function} callback Function to callback taking the arguments:
     *    @param {object}   field    field object
     *    @param {number}   index    field index
     *    @param {array}    array    field array
     * @param {object}   thisArg  The value of 'this' provided for the call to the callback function
     */
    Schema.prototype.forEachField = function (callback, thisArg) {
      forEachCallback(this.fields, callback, thisArg);
    };

    /**
     * Process a list of ids callback
     * @param {Array}    ids        Array of schema ids
     * @param {object}   thisForGet Schema object for get function
     * @param {function} getFunc    Function to get element in Schema object
     * @param {function} callback   Function to callback taking the arguments:
     *    @param {object}   field      field object
     *    @param {number}   index      field index
     *    @param {array}    array      field array
     * @param {object}   thisArg    The value of 'this' provided for the call to the callback function
     */
    function forCalback (array, thisForGet, getFunc, ids, callback, thisArg) {
      if (typeof callback === 'function') {
        var loop = true;
        for (var i = 0, ll = ids.length; loop && (i < ll); ++i) {
          loop = callback.call(thisArg, getFunc.call(thisForGet, ids[i]), ids[i], array);
          if (loop === undefined) {
            loop = true;
          }
        }
      }
    }
    
    /**
     * Callback the specified function for each field in the schema id array, providing the field details as the callback arguments
     * @param {Array}    ids      Array of schema ids
     * @param {function} callback Function to callback taking the arguments:
     *    @param {object}   field    field object
     *    @param {number}   index    field index
     *    @param {array}    array    field array
     * @param {object}   thisArg  The value of 'this' provided for the call to the callback function
     */
    Schema.prototype.forFields = function (ids, callback, thisArg) {
      forCalback(this.fields, this, this.getField, ids, callback, thisArg);
    };

    /**
     * Return a list of fields in this schema that match the specified criteria
     * @param {object} args Criteria to match, 
     *                      @see ModelProp.prototype.matches() for details
     * @return {array}  Array of matching modelProp objects
     */
    Schema.prototype.getFieldList = function (args) {
      var result = [];
      this.fields.forEach(function (field) {
        if (field.matches(args)) {
          result.push(field);
        }
      });
      return result;
    };

    
    /**
     * Return an object representing this schema as a string
     */
    Schema.prototype.objectToString = function (obj) {
      var str = '';
      this.modelProps.forEach(function (field) {
        if (str) {
          str += ', ';
        }
        str += field.modelName + '=' + obj[field.modelName];
      });
      return this.name + ' {' + str + '}';
    };

    /**
     * Return an initialised object representing this schema
     */
    Schema.prototype.getObject = function () {
      var obj = {};
      this.modelProps.forEach(function (field) {
        obj[field.modelName] = field.dfltValue;
      });
      obj.schema = this;
      obj.toString = function () {
        return this.schema.objectToString(this);
      };
      return obj;
    };

    /**
     * Return an initialised filter object for this schema
     */
    Schema.prototype.getFilter = function (filterVal) {
      var obj = {},
        value,
        dialog;
      this.fields.forEach(function (field) {
        dialog = field[SCHEMA_CONST.DIALOG_PROP];
        if (typeof filterVal === 'function') {
          value = filterVal(dialog);
        } else if (typeof filterVal === 'object') {
          value = filterVal[dialog];
        } else {
          value = filterVal;
        }
        obj[dialog] = value;
      });
      return obj;
    };

    /**
     * Return a list of fields in this schema that match the specified criteria
     * @param {object} args Criteria to match, 
     *                      @see ModelProp.prototype.matches() for details
     * @return {array}  Array of matching modelProp objects
     */
    Schema.prototype.getModelPropList = function (args) {
      var result = [];
      this.modelProps.forEach(function (mdlProp) {
        if (mdlProp.matches(args)) {
          result.push(mdlProp);
        }
      });
      return result;
    };

    /**
     * Return the default value for a field in this schema
     * @param {number} id       Schema id index, e.g. 'ADDRSCHEMA.IDs.ADDR1'
     * @param {string} property Name of property to return 
     * @return {object} modelProp object or property of modelProp object
     */
    Schema.prototype.getModelProp = function (id, property) {
      var i, value;
      for (i = 0; i < this.modelProps.length; ++i) {
        if (this.modelProps[i].id === id) {
          if (property) {
            value = this.modelProps[i][property];
          } else {
            value = this.modelProps[i];
          }
          break;
        }
      }
      return value;
    };

    /**
     * Callback the specified function for each ModelProp in the schema, providing the ModelProp details as the callback arguments
     * @param {function} callback     Function to callback taking the arguments:
     *    @param {object}   modelProp ModelProp object
     *    @param {number}   index     ModelProp index
     *    @param {array}    array     ModelProp array
     * @param {object}   thisArg      The value of 'this' provided for the call to the callback function
     */
    Schema.prototype.forEachModelProp = function (callback, thisArg) {
      forEachCallback(this.modelProps, callback, thisArg);
    };

    /**
     * Callback the specified function for each ModelProp in the schema id array, providing the ModelProp details as the callback arguments
     * @param {Array}    ids      Array of schema ids
     * @param {function} callback Function to callback taking the arguments:
     *    @param {object}   modelProp ModelProp object
     *    @param {number}   index     ModelProp index
     *    @param {array}    array     ModelProp array
     * @param {object}   thisArg  The value of 'this' provided for the call to the callback function
     */
    Schema.prototype.forModelProps = function (ids, callback, thisArg) {
      forCalback(this.modelProps, this, this.getModelProp, ids, callback, thisArg);
    };


    /**
     * Return the default value for a field in this schema
     * @param {number} Schema id index, e.g. 'ADDRSCHEMA.IDs.ADDR1'
     * @return {object} default value of field
     */
    Schema.prototype.getDfltValue = function (id) {
      return this.getModelProp(id, 'dfltValue');
    };

    /**
     * Return the type for a field in this schema
     * @param {number} Schema id index, e.g. 'ADDRSCHEMA.IDs.ADDR1'
     * @return {string} type of field
     */
    Schema.prototype.getType = function (id) {
      return this.getModelProp(id, 'type');
    };

    /**
     * Return the storage type for a field in this schema
     * @param {number} Schema id index, e.g. 'ADDRSCHEMA.IDs.ADDR1'
     * @return {string} storage type of field; RESOURCE_CONST.STORE_LIST/STORE_OBJ
     */
    Schema.prototype.getStorageType = function (id) {
      var type;
      if (SCHEMA_CONST.FIELD_TYPES.IS_ARRAY(this.getType(id))) {
        type = RESOURCE_CONST.STORE_LIST;
      } else {
        type = RESOURCE_CONST.STORE_OBJ;
      }
      return type;
    };

    /**
     * Return the model path name for a field in this schema
     * @param {number} Schema id index, e.g. 'ADDRSCHEMA.IDs.ADDR1'
     * @return {string} model path name of field
     */
    Schema.prototype.getModelName = function (id) {
      return this.getModelProp(id, 'modelName');
    };

    /**
     * Return the factory name for a field in this schema
     * @param {number} Schema id index, e.g. 'ADDRSCHEMA.IDs.ADDR1'
     * @return {string} factory name of field
     */
    Schema.prototype.getModelFactory = function (id) {
      return this.getModelProp(id, 'factory');
    };

    /**
     * Read a property and sets its value in an object/array
     * @param {object} from     - source to read properties from
     * @param {object} args     - arguments object
     *  @see readProperty() for properties
     * @return updated/new object
     */
    Schema.prototype.read = function (from, args) {
      args = (!args ? {} : args);
      var i,
        result,
        objArgs = angular.copy(args);

      objArgs._ids = this._getIdsToRead(objArgs);

      if (from) {
        if (Array.isArray(from)) {
          // read array of object
          if (args.obj) {
            if (!Array.isArray(args.obj)) {
              throw new Error('Non-array update object argument');
            }
            result = args.obj;
          } else {
            result = [];
          }
          for (i = 0; i < from.length; ++i) {
            objArgs = angular.copy(args);
            if (objArgs.obj) {
              objArgs.obj = objArgs.obj[i]; // update appropriate index
            }
            result[i] = this.readProperty(from[i], objArgs);
          }
        } else {
          // read single object
          result = this.readProperty(from, objArgs);
        }
      }
      return result;
    };

    /**
     * Internal function to determine the schema ids for readProperty
     * @param {object} args     - arguments object
     * @return {array} ids array
     */
    Schema.prototype._getIdsToRead = function (args) {
      var ids;

      if (!args.schemaReadIds) {
        // no schema ids specified so read all
        ids = [];
        this.modelProps.forEach(function (field) {
          ids.push(field.id);
        });
      } else {
        // make sure ids is an array
        if (Array.isArray(args.schemaReadIds)) {
          ids = args.schemaReadIds;
        } else {
          ids = [args.schemaReadIds];
        }
        if (args.schemaExcludeMode) {
          // schema ids are ids to exclude
          var exIds = ids;
          ids = [];
          this.modelProps.forEach(function (field) {
            var idx = exIds.findIndex(function (element) {
              return (element === field.id);
            });
            if (idx === -1) {
              ids.push(field.id);
            }
          });
        }
      }
      return ids;
    };

    /**
     * Read a property and sets its value in an object
     * @param {object} from     - source to read properties from
     * @param {object} args     - arguments object with following properties
     *    {object} obj          - object to update, or if null/undefined a new object is created
     *    {number|array} schemaReadIds - schema id/array of schema id(s) to read, or if null/undefined all schema fields are read
     *    {boolean} schemaExcludeMode - schema id(s) are ids to exclude 
     *    {number|array} schemaPruneIds - schema id/array of schema id(s) to remove from final object
     *    {object} fromProp - object ({schema id}, {string}), specifying the property names to read from response for schema ids
     *    {object} convert  - function({schema id}, {value}) to convert read values
     * @return updated/new object
     */
    Schema.prototype.readProperty = function (from, args) {
      args = (!args ? {} : args);
      var i,
        ids,
        props = (!args.fromProp ? {} : args.fromProp),
        obj = (!args.obj ? this.getObject() : args.obj),
        searcher = new SearchStdArg(args);

      if (from) {
        if (args._ids) {
          ids = args._ids;
        } else {
          ids = this._getIdsToRead(args);
        }
        // read properties
        for (i = 0; i < ids.length; ++i) {
          // find model property corrsponding to id
          var modelProp = this.getModelProp(ids[i]);
          if (modelProp) {
            var property = props[ids[i]],
              read;
            if (property === undefined) {
              property = modelProp.modelName; // same property name in source
            }
            searcher.setModelProp(modelProp);

            // if it has the property read & possibly convert it, otherwise set to undefined
            read = undefined;
            if (hasProperty(from, property)) {
              read = from[property];

              /* need to pass run stage injector to Schema object as since it is created during the config
                stage it only has access to the config stage injector (only providers and constants accessible) */
              if (modelProp.factory && args.injector) {
                // process it through the appropriate factory
                var factory = args.injector.get(modelProp.factory);
                if (factory.readRspObject) {
                  // find specific args if available
                  var readArgs = searcher.findInStandardArgs();

                  if (readArgs) {
                    // use the appropriate function to read the object(s)
                    readArgs = angular.copy(readArgs);
                    // don't need schema/schemaId/path as its read as a root object from here
                    delete readArgs.schema;
                    delete readArgs.schemaId;
                    delete readArgs.path;

                    if (Array.isArray(read)) {
                      for (var ridx = 0; ridx < read.length; ++ridx) {
                        readArgs.obj = read[ridx];   // inplace update
                        //                        console.log('factory.readRspObject', ridx, readArgs.objId[0]);
                        factory.readRspObject(read[ridx], readArgs);
                      }
                    } else {
                      read = factory.readRspObject(read, readArgs);
                    }
                  } // else no specific args will set read value
                }
              }
              if (args.convert) {
                read = args.convert(modelProp.id, read);
              }
            }
            obj[modelProp.modelName] = read;
          }
        }
      }
      if (args.schemaPruneIds) {
        args.schemaPruneIds.forEach(function (id) {
          var modelName = this.getModelName(id);
          if (modelName) {
            delete obj[modelName];
          }
        }, this);
      }

      //      console.log('readProperty', args, obj);

      return obj;
    };


    function SearchStdArg (args) {
      this.args = args;
      this.modelProp = undefined;
    }

    SearchStdArg.$inject = ['args'];

    SearchStdArg.prototype.setModelProp = function (modelProp) {
      this.modelProp = modelProp;
    };

    SearchStdArg.prototype.findInStandardArgs = function () {
      var testFxn = function (arg) {
          return (arg.schemaId === this.modelProp.id);
        },
        boundFxn = testFxn.bind(this);
      return this.args.findInStandardArgs(this.args, boundFxn);
    };
    
    
    // Return the public API for the provider.
    return({
      getSchema: getSchema,
      getModelPropObject: getModelPropObject,
      makeSortList: makeSortList,
      makeSubDocSortList: makeSubDocSortList,

      getStringModelPropArgs: getStringModelPropArgs,
      getNumberModelPropArgs: getNumberModelPropArgs,
      getDateModelPropArgs: getDateModelPropArgs,
      getBooleanModelPropArgs: getBooleanModelPropArgs,
      getObjectIdModelPropArgs: getObjectIdModelPropArgs,
      getStringArrayModelPropArgs: getStringArrayModelPropArgs,
      getNumberArrayModelPropArgs: getNumberArrayModelPropArgs,
      getDateArrayModelPropArgs: getDateArrayModelPropArgs,
      getBooleanArrayModelPropArgs: getBooleanArrayModelPropArgs,
      getObjectIdArrayModelPropArgs: getObjectIdArrayModelPropArgs,
      
      // The provider must include a $get() method that will be our 
      // factory function for creating the service. This $get() method 
      // will be invoked using $injector.invoke() and can therefore use
      // dependency-injection.
      $get: instantiateProvider
    });


  }])

//  .config(function configureApplication (schemaProvider) {
//    // You can configure the provider during the config stage, via public API for the provider.
//    // --
//    // NOTE: After the configuration phase is over, there will be no public
//    // way to change this unless you cache a reference to the provider.
//    schemaProvider.someConfigFunction(<<config>>);
//  })
//
//  .run(function startApplication (schema ) {
//      // Consume the schema that we configured in the previous Config phase.
//      console.log( schema.greet( "Kim" ) );
//    }
//  )

;


/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .factory('compareFactory', compareFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

compareFactory.$inject = ['$injector', 'consoleService', 'miscUtilFactory', 'SCHEMA_CONST'];

function compareFactory ($injector, consoleService, miscUtilFactory, SCHEMA_CONST) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    NAME: 'compareFactory',
    newComparinator: newComparinator,
    compareIndices: compareIndices,
    compareStrings: compareStrings,
    compareBoolean: compareBoolean,
    compareDate: compareDate,
    compareStringFields: compareStringFields,
    compareNumberFields: compareNumberFields,
    compareBooleanFields: compareBooleanFields,
    compareDateFields: compareDateFields,
    compareTypeFields: compareTypeFields,
    compareFields: compareFields
  };
  
  /* function implementation
    -------------------------- */

  /**
   * Create a new Comparinator object
   * Compare objects based on schema fields that have numeric values
   * @param {object} schema Schema object
   * @param {number} index  Index of Schema field to use
   * @param {string} type   Type of fiels, @see SCHEMA_CONST.FIELD_TYPES
   * @returns {object} new Comparinator object
   */
  function newComparinator (schema, index, type) {
    if (!schema) {
      throw new Error('Missing argument: schema');
    }
    if (!index) {
      if (typeof index === 'undefined') {
        throw new Error('Missing argument: index');
      }
    }
    return $injector.instantiate(Comparinator, {
      schema: schema, index: index, type: type
    });
  }
  
  /**
   * Compare object's using 'index' property
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareIndices (a, b) {
    return (a.index - b.index);
  }

  /**
   * Compare items
   * @param {string}  a   First item to compare
   * @param {string}  b   Second item to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function basicCompare (a, b) {
    var aNa = miscUtilFactory.isNullOrUndefined(a),
      bNa = miscUtilFactory.isNullOrUndefined(b),
      result = 0; // no diff by default
    if (aNa && !bNa) {
      result = -1;  // null/undefined before value
    } else if (!aNa && bNa) {
      result = 1;  // null/undefined before value
    } else if (a < b) {
      result = -1;
    } else if (a > b) {
      result = 1;
    }
    return result;
  }

  /**
   * Compare strings
   * @param {string}  a   First string to compare
   * @param {string}  b   Second string to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareStrings (a, b) {
    return basicCompare(a, b);
  }

  /**
   * Compare boolean, i.e. false before true
   * @param {boolean}  a   First boolean to compare
   * @param {boolean}  b   Second boolean to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareBoolean (a, b) {
    if (!a && b) {
      return -1;
    }
    if (a && !b) {
      return 1;
    }
    return 0;
  }

  /**
   * Convert to date
   * @param {string} value Date string to convert
   * @returns {object}  Date object
   */
  function toDate (value) {
    if (!angular.isDate(value)) {
      value = new Date(value);
    }
    return value;
  }

  /**
   * Compare dates
   * @param {object|string} a     First date/date string to compare
   * @param {object|string} b     Second date/date string to compare
   * @param {string}        order '+' ascending sort (default) i.e. older dates first
   *                              or '-' descending sort i.e. newer dates first
   * @returns {number}        < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareDate (a, b, order) {
    var timeA = toDate(a).getTime(),
      timeB = toDate(b).getTime(),
      result;
    if (isFinite(timeA) && isFinite(timeB)) {
      result = timeA - timeB; // default, ascending result
      if (order === '-') {
        result = -result;
      }
    } else {
      // valid time before invalid
      if (timeA === timeB) {
        result = 0;
      } else if (isFinite(timeA)) {
        result = -1;
      } else {
        result = 1;
      }
    }
    return result;
  }

  /**
   * Compare object properties to compare
   * @param {object}       obj    Object to get property from 
   * @param {string|Array} path   path to property
   * @param {model}        model  name of property
   * @returns {object|string|number}  object property
   */
  function getCompareItem (obj, path, model) {
    var item = obj;
    if (path) {
      for (var i = 0; !miscUtilFactory.isNullOrUndefined(item) && (i < path.length); ++i) {
        item = item[path[i]];
      }
    }
    if (!miscUtilFactory.isNullOrUndefined(item)) {
      item = item[model];
    }
    return item;
  }

  /**
   * Compare objects based on schema fields that have string values
   * @param {object}  schema  Schema object
   * @param {number}  index   Index of Schema field to use
   * @param {object}  a       First object to compare
   * @param {object}  b       Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareStringFields (schema, index, a, b) {
    var result = 0,
      path = schema.getField(index, SCHEMA_CONST.PATH_PROP),
      array = schema.getField(index, SCHEMA_CONST.MODEL_PROP);
    for (var j = 0; (j < array.length) && (result === 0) ; ++j) {
      result = compareStrings(
        getCompareItem(a, path, array[j]), 
        getCompareItem(b, path, array[j]));
    }
    return result;
  }

  /**
   * Compare objects based on schema fields that have numeric values
   * @param {object}  schema  Schema object
   * @param {number}  index   Index of Schema field to use
   * @param {object}  a       First object to compare
   * @param {object}  b       Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareNumberFields (schema, index, a, b) {
    var result = 0,
      array = schema.getField(index, SCHEMA_CONST.MODEL_PROP);
    for (var j = 0; (j < array.length) && (result === 0) ; ++j) {
      result = a[array[j]] - b[array[j]];
    }
    return result;
  }

  /**
   * Compare objects based on schema fields that have boolean values
   * @param {object}  schema  Schema object
   * @param {number}  index   Index of Schema field to use
   * @param {object}  a       First object to compare
   * @param {object}  b       Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareBooleanFields (schema, index, a, b) {
    var result = 0,
      array = schema.getField(index, SCHEMA_CONST.MODEL_PROP);
    for (var j = 0; (j < array.length) && (result === 0); ++j) {
      result = compareBoolean(a[array[j]], b[array[j]]);
    }
    return result;
  }

  /**
   * Compare objects based on schema fields that have date values
   * @param {object}  schema  Schema object
   * @param {number}  index   Index of Schema field to use
   * @param {object}  a       First object to compare
   * @param {object}  b       Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareDateFields (schema, index, a, b) {
    var result = 0,
      array = schema.getField(index, SCHEMA_CONST.MODEL_PROP);
    for (var j = 0; (j < array.length) && (result === 0); ++j) {
      result = compareDate(a[array[j]], b[array[j]]);
    }
    return result;
  }

  /**
   * Compare objects based on schema fields
   * @param {object} schema Schema object
   * @param {number} index  Index of Schema field to use
   * @param {string} type   Type of field, @see SCHEMA_CONST.FIELD_TYPES
   * @param {object} a      First object to compare
   * @param {object} b      Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareTypeFields (schema, index, type, a, b) {
    var result = 0;
    switch (type) {
      case SCHEMA_CONST.FIELD_TYPES.STRING:
        result = compareStringFields(schema, index, a, b);
        break;
      case SCHEMA_CONST.FIELD_TYPES.DATE:
        result = compareDateFields(schema, index, a, b);
        break;
      case SCHEMA_CONST.FIELD_TYPES.BOOLEAN:
        result = compareBooleanFields(schema, index, a, b);
        break;
      case SCHEMA_CONST.FIELD_TYPES.NUMBER:
        result = compareNumberFields(schema, index, a, b);
        break;
    }
    return result;
  }

  /**
   * Compare objects based on schema fields
   * @param {object} schema Schema object
   * @param {number} index  Index of Schema field to use
   * @param {object} a      First object to compare
   * @param {object} b      Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareFields (schema, index, a, b) {
    return compareTypeFields(schema, index, 
      schema.getField(index, SCHEMA_CONST.TYPE_PROP), a, b);
  }



  /**
   * Configurable object to compare schema fields
   * @param {object} schema   Schema object
   * @param {number} index    Index of Schema field to use
   * @param {string} type     Type of fiels, @see SCHEMA_CONST.FIELD_TYPES
   */
  function Comparinator (SCHEMA_CONST, schema, index, type) {
    this.schema = schema;
    this.index = index;
    this.type = type;

  }

  Comparinator.$inject = ['SCHEMA_CONST', 'schema', 'index', 'type'];

  /**
   * Compare objects based on schema fields that have string values
   * @param {object} a First object to compare
   * @param {object} b Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  Comparinator.prototype.compareStringFields = function (a, b) {
    return compareStringFields(this.schema, this.index, a, b);
  };

  /**
   * Compare objects based on schema fields that have numeric values
   * @param {object}  a       First object to compare
   * @param {object}  b       Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  Comparinator.prototype.compareNumberFields = function (a, b) {
    return compareNumberFields(this.schema, this.index, a, b);
  };

  /**
   * Compare objects based on schema fields that have boolean values
   * @param {object}  a       First object to compare
   * @param {object}  b       Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  Comparinator.prototype.compareBooleanFields = function (a, b) {
    return compareBooleanFields(this.schema, this.index, a, b);
  };

  /**
   * Compare objects based on schema fields that have date values
   * @param {object}  a       First object to compare
   * @param {object}  b       Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  Comparinator.prototype.compareDateFields = function (a, b) {
    return compareDateFields(this.schema, this.index, a, b);
  };

  /**
   * Compare objects based on schema fields
   * @param {object} a      First object to compare
   * @param {object} b      Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  Comparinator.prototype.compareFields = function (a, b) {
    return compareFields(this.schema, this.index, a, b);
  };

  // need the return here so that object prototype functions are added
  return factory;
}



/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .filter('filterBlank', ['SCHEMA_CONST', function (SCHEMA_CONST) {

    function filterBlankFilter (input, schema) {
      
      // filter out blank entries
      var out = [];

      angular.forEach(input, function (obj) {
        
        schema.forEachField(function(fieldProp) {
          var empty = true,
            model = fieldProp[SCHEMA_CONST.MODEL_PROP];
          for (var j = 0; empty && (j < model.length); ++j) {
            var objVal = obj[model[j]];
            if (objVal) {
              empty = false;
            }
          }
          if (!empty) {
            out.push(obj);
          }
          return empty;
        });
      });

      return out;
    }

    return filterBlankFilter;
  }])

  .filter('filterMisc', [function () {

    function filterMiscFilter (input, filter) {

      // filter out blank entries
      var out = [];

      angular.forEach(input, function (obj) {
        if (filter(obj)) {
          out.push(obj);
        }
      });

      return out;
    }

    return filterMiscFilter;
  }])

  .filter('filterSchema', ['miscUtilFactory', 'SCHEMA_CONST', 'RESOURCE_CONST', function (miscUtilFactory, SCHEMA_CONST, RESOURCE_CONST) {

    function filterSchemaFilter (input, schema, filterBy, type) {

      var out = [];

      if (!miscUtilFactory.isEmpty(filterBy)) {
        var testCnt = 0,  // num of fields to test as speced by filter
          testedCnt,      // num of fields tested
          matchCnt,       // num of fields matching filter
          continueNext;   // continue to process schema fields flag
        schema.forEachField(function(schemaField) {
          if (filterBy[schemaField[SCHEMA_CONST.DIALOG_PROP]]) {  // filter uses dialog properties
            ++testCnt;
          }
        });
        angular.forEach(input, function (element) {
          matchCnt = 0;
          testedCnt = 0;
          continueNext = true;
          schema.forEachField(function(schemaField) {
            var filterVal = filterBy[schemaField[SCHEMA_CONST.DIALOG_PROP]],  // filter uses dialog properties
              filterTransform = schemaField[SCHEMA_CONST.TRANSFORM_PROP],
              filterTest = schemaField[SCHEMA_CONST.TEST_PROP],
              refSchema = schemaField[SCHEMA_CONST.REF_SCHEMA_PROP],
              refField = schemaField[SCHEMA_CONST.REF_FIELD_PROP],
              addToOut = false;

            if (filterVal) {
              var elementObj = miscUtilFactory.readSafe(element, schemaField[SCHEMA_CONST.PATH_PROP]);
              if (elementObj) {
                if (filterTransform) {
                // transform filter value
                  filterVal = filterTransform(filterVal);
                }

                // apply OR logic to multiple model fields
                var match = false,
                  model = schemaField[SCHEMA_CONST.MODEL_PROP];
                for (var j = 0; !match && (j < model.length); ++j) {
                  var elementVal = elementObj[model[j]];

                  if (refSchema && (refField >= 0)) {
                  // read actual value to compare from embedded doc
                    var modelName = refSchema.SCHEMA.getModelName(refField);
                    if (modelName) {
                      elementVal = elementVal[modelName];
                    }
                  }

                  if (elementVal) {
                    if (filterTransform) {
                    // transform filter value
                      elementVal = filterTransform(elementVal);
                    }
                    if (filterTest) {
                      match = filterTest(elementVal, filterVal);
                    } else {
                      match = (elementVal === filterVal);
                    }
                  }
                }

                ++testedCnt;
              
                if (match) {
                  ++matchCnt;
                  if (type === RESOURCE_CONST.QUERY_AND) {
                  // logical AND, need to match all filter criteria
                    addToOut = (matchCnt === testCnt);
                  } else if (type === RESOURCE_CONST.QUERY_OR) {
                  // logical OR, need to match at least 1 filter criteria
                    addToOut = (matchCnt > 0);
                  }
                } else {
                  if (type === RESOURCE_CONST.QUERY_AND) {
                  // logical AND, need to match all filter criteria
                    continueNext = false; // doesn't match at least one field, found result so finish
                  } else if (type === RESOURCE_CONST.QUERY_NOR) {
                  // logical NOR, must match none of the filter criteria
                    addToOut = (testedCnt === testCnt);
                  }
                }

                if (addToOut) {
                  out.push(element);
                  continueNext = false; // found result so finish
                }
              }
            }
            return continueNext;
          });
        });
      } else {
        out = input;
      }
      return out;
    }

    return filterSchemaFilter;
  }])

  .factory('filterFactory', filterFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

filterFactory.$inject = ['$filter', '$injector', 'miscUtilFactory', 'consoleService', 'SCHEMA_CONST', 'RESOURCE_CONST'];

function filterFactory ($filter, $injector, miscUtilFactory, consoleService, SCHEMA_CONST, RESOURCE_CONST) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    NAME: 'filterFactory',
    newResourceFilter: newResourceFilter,
    getFilteredArray: getFilteredArray,
    getFilteredList: getFilteredList,
    filterArray: filterArray
  };
  
  //  return factory;

  /* function implementation
    -------------------------- */

  /**
   * Create a new ResourceFilter object
   * @param   {object} schema  Schema object for which filter will be used
   * @param   {object} base    Base object to filter by
   * @param   {object} options Additional options
   * @returns {object} new ResourceFilter object
   */
  function newResourceFilter (schema, base, options) {
    return $injector.instantiate(ResourceFilter, {
      schema: schema, base: base, options: options
    });
  }

  /**
   * Filter an array
   * @param {string}   filterName Name of filter to apply
   * @param {Array}    list       Array object to filter
   * @param {boolean}  allowBlank Allow blanks flag
   * @param {object}   schema     Schema object to use
   * @param {object}   filterBy   Filter object to use (not ResourceFilter)
   * @param {strimg}   type        Filter type; RESOURCE_CONST.QUERY_OR etc.
   * @param {function} xtraFilter Function to provide additional filtering
   * @returns {Array}    filtered list
   */
  function getFilteredArray (filterName, list, allowBlank, schema, filterBy, type, xtraFilter) {
    var output = list;

    if (!allowBlank) {
      // remove blanks if necessary
      if (schema) {
        output = $filter('filterBlank')(output, schema);
      } else {
        output = $filter('filterMisc')(output, function (obj) {
          return !miscUtilFactory.isEmpty(obj);
        });
      }
    }
    // apply filter
    if (output.length) {
      output = $filter(filterName)(output, schema, filterBy, type);
    }
    if (output.length && xtraFilter) {
      // apply extra filter if necessary
      output = $filter('filterMisc')(output, xtraFilter);
    }
    return output;
  }

  /**
   * Generate a filtered list
   * @param {string}   filterName Name of filter to apply
   * @param {object}   reslist    ResourceList object to filter
   * @param {object}   filterBy   Filter object to use (not ResourceFilter)
   * @param {function} xtraFilter Function to provide additional filtering
   * @returns {Array}    filtered list
   */
  function getFilteredList (filterName, reslist, filterBy, xtraFilter) {
    return getFilteredArray(filterName, reslist.list, reslist.filter.allowBlank, reslist.filter.schema, filterBy, reslist.filter.type, xtraFilter);
  }
  
  /**
   * Filter an array
   * @param {Array}    array           Array to filter
   * @param {function} compareFunction Function that defines the sort order. If omitted, the array is sorted according to each character's Unicode code point value, according to the string conversion of each element.
   * @param {function} expression      The predicate to be used for selecting items from array.
   * @param {function} comparator       Comparator which is used in determining if values retrieved using expression (when it is not a function) should be considered a match
   * @see https://docs.angularjs.org/api/ng/filter/filter
   * @returns {Array}    New array with filtered values
   */
  function filterArray (array, compareFunction , expression, comparator) {
    var list = array;
    if (angular.isArray(array)) {
      // sort list
      list = array.slice().sort(compareFunction);

      // filter list so only have newest results for each address
      list = $filter('filter')(list, expression, comparator);
    }
    return list;
  }
  
  /**
   * Filter for a ResourceList object
   * @param {object} schema  Schema object for which filter will be used
   * @param {object} base    Base object to filter by
   * @param {object} options Additional options
   */
  function ResourceFilter (schema, base, options) {
    var noOpts = miscUtilFactory.isNullOrUndefined(options);
    
    this.schema = schema; // keep a ref to field array
    this.filterBy = {};
    this.lastFilter = undefined;  // last filter used
    [
      { name: 'allowBlank', dflt: true },
      { name: 'customFunction', dflt: undefined },
      { name: 'type', dflt: RESOURCE_CONST.QUERY_AND },
      { name: 'dispTransform', dflt: undefined },
      { name: 'hiddenFilters', dflt: undefined }
    ].forEach(function (property) {
      this[property.name] = property.dflt;
      if (!noOpts) {
        if (!miscUtilFactory.isNullOrUndefined(options[property.name])) {
          this[property.name] = options[property.name];
        }
      }
    }, this);

    if (base) {
      // filter utilises dialog fields
      this.schema.forEachField(function (fieldProp) {
        var filterVal = base[fieldProp[SCHEMA_CONST.DIALOG_PROP]];
        if (filterVal) {
          this.filterBy[fieldProp[SCHEMA_CONST.DIALOG_PROP]] = filterVal;
        }
      }, this);
    }
  }

  ResourceFilter.$inject = ['schema', 'base', 'options'];

  /**
   * Identify this object as a ResourceFilter
   */
  ResourceFilter.prototype.isResourceFilter = true;

  /**
   * Return the filter values object
   * @returns {object} filter values
   */
  ResourceFilter.prototype.getFilterValue = function (name) {
    if (!name) {
      return this.filterBy;
    }
    return this.filterBy[name];
  };

  /**
   * Adds a value to the filter values object
   * @param {string} name  Name of value to add
   * @param {*}      value Value to add
   * @returns {object} filter values
   */
  ResourceFilter.prototype.addFilterValue = function (name, value) {
    this.filterBy[name] = value;
    return this.filterBy;
  };

  /**
   * Removes a value from the filter values object
   * @param {string} name  Name of value to remove
   * @returns {object} filter values
   */
  ResourceFilter.prototype.delFilterValue = function (name) {
    delete this.filterBy[name];
    return this.filterBy;
  };

  /**
   * toString method for a filter for a ResourceList object
   * @param   {string}   prefix        Prefix dtring
   * @param {function} dispTransform  Function to transform display values
   * @returns {string}   string representation
   */
  ResourceFilter.prototype.toString = function (prefix, dispTransform) {
    var str,
      hiddenFilters,
      filterBy = (this.lastFilter ? this.lastFilter : this.filterBy);
    if (typeof prefix === 'function') {
      dispTransform = prefix;
      prefix = undefined;
    }
    if (!prefix) {
      str = '';
    } else {
      str = prefix;
    }
    if (!dispTransform) {
      dispTransform = this.dispTransform;
    }
    if (this.hiddenFilters && (this.hiddenFilters.length > 0)) {
      hiddenFilters = this.hiddenFilters;
    } else {
      hiddenFilters = [];
    }
    this.schema.forEachField(function (fieldProp) {
      var dialog = fieldProp[SCHEMA_CONST.DIALOG_PROP],
        idx = hiddenFilters.findIndex(function (hide) {
          return (hide === dialog);
        }),
        filterVal = filterBy[dialog];
      if ((idx < 0) && filterVal) {
        if (str.length > 0) {
          str += ', ';
        }
        if (dispTransform) {
          filterVal = dispTransform(dialog, filterVal);
        }
        str += fieldProp[SCHEMA_CONST.DISPLAY_PROP] + ': ' + filterVal;
      }
    });
    if (str.length === 0) {
      str = 'No filter';
    }
    return str;
  };

  // need the return here so that object prototype functions are added
  return factory;

}




/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .factory('queryFactory', queryFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

queryFactory.$inject = ['miscUtilFactory', 'SCHEMA_CONST', 'RESOURCE_CONST'];

function queryFactory (miscUtilFactory, SCHEMA_CONST, RESOURCE_CONST) {


  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    NAME: 'queryFactory',
    getQueryParam: getQueryParam,
    buildSchemaQuery: buildSchemaQuery,
    buildModelPropQuery: buildModelPropQuery,
    buildMultiValModelPropQuery: buildMultiValModelPropQuery,
    multiValToObject: multiValToObject
  };
  
  // need to return factory as end so that object prototype functions are added

  /* function implementation
    -------------------------- */

  /**
   * Create a query param string
   * @param   {string}   op    Query operation: one of RESOURCE_CONST.QUERY_*
   * @param   {string}   value Param value
   * @returns {[[Type]]} [[Description]]
   */
  function getQueryParam (op, value) {
    var query = value;
    switch (op) {
      case RESOURCE_CONST.QUERY_NE:  // inverse i.e. not equal
      case RESOURCE_CONST.QUERY_GT:  // greater than
      case RESOURCE_CONST.QUERY_LT:  // less than
      case RESOURCE_CONST.QUERY_GTE: // greater than or equal
      case RESOURCE_CONST.QUERY_LTE: // less than or equal
        if (!miscUtilFactory.isNullOrUndefined(value)) {
          query = op + value;
        }
        break;
      case RESOURCE_CONST.QUERY_BLANK: // blank
      case RESOURCE_CONST.QUERY_NBLANK:// not blank
        query = op;
        break;
    }
    return query;
  }
  
  /**
   * Generate a query object, with a multifield path e.g.'field1|field2=value'.
   * @param {function}        processFunc    Function to build query
   * @param {function|array}  forEachElement Element callback function or array of elements
   * @param {object}          thisArg        Optional, value to use as this when executing callback.
   * @returns {object}          query object
   */
  function processBuildQuery (processFunc, forEachElement, thisArg) {
    if (Array.isArray(forEachElement)) {
      // process as array
      forEachElement.forEach(processFunc, thisArg);
    } else {
      // process as function
      forEachElement(processFunc, thisArg);
    }
  }

  /**
   * Generate a query object, with a multifield path e.g.'field1|field2=value'.
   * @param {function}        processFunc    Function to build query
   * @param {function|array}  forEachElement Element callback function or array of elements
   * @param {object|function} filter         object to filter by or function to call get return values
   * @param {string}          multiJoin      Join for multi fields
   * @param {object}          thisArg        Optional, value to use as this when executing callback.
   * @returns {object}          query object
   */
  function processBuildQueryArgs (filter, multiJoin, thisArg) {
    var filterFunc,
      func;
    if (typeof filter === 'string') {
      thisArg = multiJoin;
      multiJoin = filter;
      filter = undefined;
    }
    if (typeof multiJoin !== 'string') {
      if (!miscUtilFactory.isNullOrUndefined(multiJoin)) {
        thisArg = multiJoin;
      }
      multiJoin = undefined;
    }
    if (!multiJoin) {
      multiJoin = RESOURCE_CONST.QUERY_OR_JOIN;
    }
    if (!miscUtilFactory.isNullOrUndefined(filter)) {
      if (typeof filter === 'function') {
        filterFunc = filter;  // get value from function
      } else if (typeof filter === 'object') {
        func = function (prop) {
          return this[prop];
        };
        filterFunc = func.bind(filter); // get value from filter object
      } else {
        func = function () {
          return this;
        };
        filterFunc = func.bind(filter); // value the filter
      }
    }
    return {
      filter: filterFunc,
      multiJoin: multiJoin,
      thisArg: thisArg
    };
  }

  /**
   * Generate a query object, with a multifield path e.g.'field1|field2=value'.
   * @param {function}        forEachSchemaField Schema field callback function 
   * @param {object|function} filter             object to filter by or function to call get return values
   * @param {string}          multiJoin          Join for multi fields        
   * @param {object}          thisArg        Optional, value to use as this when executing callback.
   * @returns {object}          query object
   */
  function buildSchemaQuery (forEachSchemaField, filter, multiJoin, thisArg) {
    var query = {},
      args = processBuildQueryArgs(filter, multiJoin, thisArg);
    
    if (args.filter) {
      // using the dialog fields to build an object based on the model fields
      processBuildQuery(function (fieldProp) {
        var filterVal = args.filter(fieldProp[SCHEMA_CONST.DIALOG_PROP]);

        if (!miscUtilFactory.isNullOrUndefined(filterVal)) {
          var models = fieldProp[SCHEMA_CONST.MODEL_PROP],
            field = models.join(args.multiJoin);
          query[field] = filterVal;
        }
      }, forEachSchemaField, args.thisArg);
    }
    return query;
  }

  /**
   * Generate a query object, e.g.'field=value'.
   * @param {function|array}  forEachModelPropField ModelProp callback function or array of ModelProps
   * @param {object|function} filter                object to filter by or function to call get return values
   * @param {object}          thisArg        Optional, value to use as this when executing callback.
   * @returns {object}          query object
   */
  function processBuildModelPropQuery (valSetFunc, forEachModelPropField, filter, thisArg) {
    var args = processBuildQueryArgs(filter, undefined, thisArg);
    if (args.filter) {
      // using the ModelProps to build an object based on the model fields
      processBuildQuery(function (modelProp) {
        var modelName = modelProp.modelName,
          filterVal = args.filter(modelName);

        if (!miscUtilFactory.isNullOrUndefined(filterVal)) {
          valSetFunc(modelName, filterVal);
        }
      }, forEachModelPropField, thisArg);
    }
  }

  
  /**
   * Generate a query object, e.g.'field=value'.
   * @param {function|array}  forEachModelPropField ModelProp callback function or array of ModelProps
   * @param {object|function} filter                object to filter by or function to call get return values
   * @param {object}          thisArg        Optional, value to use as this when executing callback.
   * @returns {object}          query object
   */
  function buildModelPropQuery (forEachModelPropField, filter, thisArg) {
    var query = {};
    // using the ModelProps to build an object based on the model fields
    processBuildModelPropQuery(function (modelName, filterVal) {
      query[modelName] = filterVal;
    }, forEachModelPropField, filter, thisArg);
    return query;
  }

  
  /**
   * Generate a query OR/AND/NOR object, with a multifield value e.g.'$or=field1=value1,field2=value2'.
   * @param {function}        forEachSchemaField Schema field callback function 
   * @param {object|function} filter             object to filter by or function to call get return values
   * @param {object}          thisArg        Optional, value to use as this when executing callback.
   * @returns {object}          query object
   */
  function buildMultiValModelPropQuery (key, forEachModelPropField, filter, thisArg) {
    var query = {};
    // using the ModelProps to build an object based on the model fields
    processBuildModelPropQuery(function (modelName, filterVal) {
      if (query[key]) {
        query[key] += RESOURCE_CONST.QUERY_COMMA_JOIN;
      } else {
        query[key] = '';
      }
      query[key] += modelName + RESOURCE_CONST.QUERY_EQ + filterVal;
    }, forEachModelPropField, filter, thisArg);
    return query;
  }

  /**
   * Convert a multi-value string to an object
   * @param   {string} multiVal   String to convert
   * @param   {string} multiJoin  Join character for values
   * @param   {string} keyvalJoin Join character to key/value pairs
   * @returns {object} Object with key/value properties
   */
  function multiValToObject (multiVal, multiJoin, keyvalJoin) {
    var obj = {},
      values = multiVal.split(multiJoin);
    if (values.length) {
      values.forEach(function (value) {
        var keyVal = value.split(keyvalJoin);
        switch (keyVal.length) {
          case 1:
            obj[keyVal[0]] = undefined;
            /* fall through */
          case 0:
            break;
          default:
            obj[keyVal[0]] = keyVal.slice(1).join(keyvalJoin);
            break;
        }
      });
    }
    return obj;
  }

  // need the return here so that object prototype functions are added
  return factory;
}




/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .factory('resourceListFactory', resourceListFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

resourceListFactory.$inject = ['$filter', '$injector', 'storeFactory', 'miscUtilFactory', 'pagerFactory', 'compareFactory', 'SCHEMA_CONST'];

function resourceListFactory ($filter, $injector, storeFactory, miscUtilFactory, pagerFactory, compareFactory, SCHEMA_CONST) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    NAME: 'resourceListFactory',
    newResourceList: newResourceList,
    duplicateList: duplicateList,
    delResourceList: delResourceList,
    setResourceList: setResourceList,
    getResourceList: getResourceList,
    initResourceList: initResourceList,

    setFilter: setFilter,
    setPager: setPager,
    applyFilter: applyFilter,

    getSortFunction: getSortFunction,
    sortResourceList: sortResourceList,
    isDescendingSortOrder: isDescendingSortOrder,
  };
  

  // need to return factory as end so that object prototype functions are added

  /* function implementation
    -------------------------- */

  /**
   * Create a new ResourceList object
   * @param {string} storeId Id string to use in storeFactory
   * @param {object} args    Argument object with the following properties:
   *   {string} id                          Id of list
   *   {string} title                       Title of list
   *   {Array}  list                        base list to use
   *   {number} [flags=storeFactory.NOFLAG] storeFactory flags
   *   {string} factory                     name of factory
   *   {string} resource                    name of factory resource
   * @returns {object} ResourceList object
   */
  function newResourceList (storeId, args) {

    var listArgs,
      resourceList,
      newList;

    if (args) {
      listArgs = angular.copy(args);
    } else {
      listArgs = {};
    }
    if (!listArgs.id) {
      listArgs.id = '';
    }
    if (!listArgs.title) {
      listArgs.title = '';
    }
    if (!listArgs.list) {
      listArgs.list = [];
    }
    if (!listArgs.flags) {
      listArgs.flags = storeFactory.NOFLAG;
    }

    resourceList = $injector.instantiate(ResourceList, listArgs);
    newList = storeFactory.newObj(storeId, resourceList, listArgs.flags);

    if (typeof listArgs.factory === 'string') {
      newList.factory = $injector.get(listArgs.factory);
    }
    if (typeof listArgs.resource === 'string') {
      newList.resource = listArgs.resource;
    }

    newList.sortOptions = newList.factory.getSortOptions();
    newList.sortBy = newList.sortOptions[0];

    return newList;
  }
  
  /**
   * Create a new ResourceList object by duplicating an existing object
   * @param {string} id         Id string fir new ResourceList
   * @param {string} storeId    Id string to use in storeFactory
   * @param {string} srcStoreId storeFactory Id string of object to duplicate
   * @param {number} flags      storefactory flags
   * @param {object} args       Optional arguemnts specifying fields to duplicate when used with EXISTING
   *                            title: true - duplicate title
   *                            list: true - duplicate list and apply filter
   *                            filter: true - duplicate filter
   *                            pager: true - duplicate pager
   *                            sort: true - duplicate sortby
   *                            onchange: true - duplicate onchange
   */
  function duplicateList (id, storeId, srcStoreId, flags, args) {
    if (typeof flags === 'object') {
      args = flags;
      flags = storeFactory.NOFLAG;
    }
    var presetCb,
      list;
    if (args) {
      presetCb = function (destination, source) {
        return duplicateListFields (args, destination, source);
      };
    }
    list = storeFactory.duplicateObj(storeId, srcStoreId, flags, presetCb);
    list.id = id;
    return list;
  }

  /**
   * Duplicate specific ResourceList fields
   * @param {object} args        Object specifying fields to duplicate
   * @param {object} destination ResourceList to update
   * @param {object} source      ResourceList to duplicate from
   */
  function duplicateListFields (args, destination, source) {
    if (source && destination) { // need something to duplicate
      ['title', 'filter', 'pager', 'onchange'].forEach(function (prop) {
        if (args[prop]) {
          destination[prop] = angular.copy(source[prop]);
        }
      });
      if (args.sort) {
        destination.sortOptions = angular.copy(source.sortOptions);
        destination.sortBy = angular.copy(source.sortBy);
      }
      if (args.list) {
        destination.setList(source.list, 
          (storeFactory.COPY_SET | storeFactory.APPLY_FILTER));
        destination.selCount = source.selCount;
      }
    }
  }

  /**
   * Delete a ResourceList object
   * @param {string}   storeId Id string to use in storeFactory
   * @param {number}   flags storeFactory flags; the following are used
   *                         - COPY_GET: to return copy of list
   *                         - other flags ignored
   * @returns {object|boolean} Copy of deleted ResourceList object, or true if successful
   */
  function delResourceList (storeId, flags) {
    return storeFactory.delObj(storeId, flags);
  }
  
  /**
   * Set the base list for a ResourceList object
   * @param {string}   storeId Id string to use in storeFactory
   * @param {Array}    list    base list to use
   * @param {number}   flags   storefactoryFlags
   * @param {function} newList Optional list creator function
   * @returns {object} ResourceList object
   */
  function setResourceList (storeId, list, flags, newList) {
    var resourceList = getResourceList(storeId, flags, newList);
    if (resourceList) {
      resourceList.setList(list, flags);
    }
    return getResourceList(storeId, flags);
  }

  /**
   * Get an existing ResourceList object
   * @param {string}   storeId Id string to use in storeFactory
   * @param {number}   flags   storefactoryFlags
   * @param {function} newList Optional list creator function
   * @returns {object} ResourceList object
   */
  function getResourceList (storeId, flags, newList) {
    var resourceList = storeFactory.getObj(storeId, flags);
    if (!resourceList && storeFactory.doCreateAny(flags)) {
      resourceList = newList(flags);
    }
    return resourceList;
  }

  /**
   * Initialise a ResourceList object to an emply base list
   * @param {string}   storeId Id string to use in storeFactory
   * @param   {number}   flags   storefactoryFlags
   * @returns {object} ResourceList object
   */
  function initResourceList (storeId, flags) {
    return setResourceList(storeId, [], flags);
  }

  /**
   * Set the filter for a ResourceList object
   * @param {string} storeId    Id string to use in storeFactory
   * @param   {object} [filter={}] Filter object to use, ResourceFilter object or no filter
   * @param   {number} flags      storefactoryFlags
   * @returns {object} ResourceList object
   */
  function setFilter (storeId, filter, flags) {
    if (typeof filter === 'number') {
      flags = filter;
      filter = {};
    }
    filter = filter || {};

    var resourceList = getResourceList(storeId);
    if (resourceList) {
      resourceList.filter = filter;
      if (storeFactory.doApplyFilter(flags)) {
        resourceList.applyFilter(filter);
      }
    }
    return getResourceList(storeId, flags);
  }

  /**
   * Set the pager for the ResourceList object
   * @param {string} storeId Id string to use in storeFactory
   * @param   {object} pager   pagerFactory object
   * @param   {number} flags   storefactoryFlags
   * @returns {object} ResourceList object
   */
  function setPager (storeId, pager, flags) {
    if (typeof pager === 'number') {
      flags = pager;
      pager = undefined;
    }

    var resourceList = getResourceList(storeId);
    if (resourceList) {
      resourceList.pager = pager;
    }
    return getResourceList(storeId, flags);
  }

  /**
   * Apply a filter to a ResourceList object, and update the associated pager if applicable
   * @see ResourceList.applyFilter()
   * @param {string} storeId Id string to use in storeFactory
   * @param   {object} filter filter to use or preset filter is used if undefined
   * @param   {number} flags   storefactoryFlags
   * @returns {object} this object to facilitate chaining
   */
  function applyFilter (storeId, filter, flags) {
    var resourceList = getResourceList(storeId);
    if (resourceList) {
      resourceList.applyFilter(filter);
    }
    return getResourceList(storeId, flags);
  }

  /**
   * Get the sort function
   * @param   {object} sortOptions  List of possible sort option
   * @param   {object} sortBy       Key to sort by
   * @returns {function|object} sort function or sort option
   */
  function getSortFunction (sortOptions, sortBy) {
    var sortFxn;
    for (var i = 0; (i < sortOptions.length) && !sortFxn; ++i) {
      var option = sortOptions[i].value;
      if (option === sortBy) {
        for (var j = 0; j < SCHEMA_CONST.BASIC_SORT_OPTIONS.length; ++j) {
          if (option === SCHEMA_CONST.BASIC_SORT_OPTIONS[j].value) {
            sortFxn = compareFactory.compareIndices;
            break;
          }
        }
        if (!sortFxn) {
          sortFxn = sortOptions[i];  // return sort option
        }
      }
    }
    return sortFxn;
  }

  /**
   * Sort a ResourceList
   * @param   {object}   resList         List to sort
   * @param   {function} getSortFunction Function to return  sort function
   * @param   {array}   sortOptions     List of possible sort option
   * @param   {object}   sortByValue     Key to sort by
   * @returns {Array}    sorted list
   */
  function sortResourceList (resList, getSortFunction, sortOptions, sortByValue) {
    var sortList,
      sortFxn;
    
    if (resList && resList.factory) {
      if (!angular.isFunction(getSortFunction)) {
        sortByValue = sortOptions;
        sortOptions = getSortFunction;
        getSortFunction = resList.factory.getSortFunction;
      }
      if (!angular.isArray(sortOptions)) {
        sortByValue = sortOptions;
        sortOptions = resList.sortOptions;
      }
      if (!sortByValue) {
        if (resList.sortBy) {
          sortByValue = resList.sortBy.value;
        }
      }

      if (getSortFunction && sortOptions && sortByValue) {
        sortList = resList.list;

        sortFxn = getSortFunction(sortOptions, sortByValue);
        if (sortFxn) {
          sortList.sort(sortFxn);
          if (isDescendingSortOrder(sortByValue)) {
            sortList.reverse();
          }
          
          if (resList.filter.lastFilter) {
            // reapply last filter
            resList.applyFilter(resList.filter.lastFilter);
          } else if (resList.pager) {
            // update pager
            pagerFactory.updatePager(resList.pager.id, sortList);
          }
        }
      }
    }
    return sortList;
  }

  
  /**
   * Check if sort key is descending order
   * @param   {object} sortBy   Key to sort by
   * @returns {boolean} true if is descending order, false otherwise
   */
  function isDescendingSortOrder (sortBy) {
    return (sortBy.charAt(0) === SCHEMA_CONST.SORT_DESC);
  }

  /**
   * Set the base list
   * @param {Array}  list  base list to use
   * @param {number} flags storeFactory flags; the following are used
   *                       - COPY_SET: to set list to a copy of the argument
   *                       - APPLY_FILTER: to immediately filter list
   *                       - other flags ignored
   * @returns {object} ResourceList object
   */
  function setListForResourceList (resList, list, flags) {
    var toSet = list;
    if (toSet) {
      toSet = miscUtilFactory.toArray(list);
      if (storeFactory.doCopySet(flags)) {
        toSet = angular.copy(toSet);
      }
    }
    resList.list = toSet;       // unfiltered list
    resList.filterList = toSet; // filtered list
    if (toSet) {
      resList.count = toSet.length;       // total number of possibilities
      resList.filterCount = toSet.length; // total after filter
    } else {
      resList.count = 0;
      resList.filterCount = 0;
    }
    if (storeFactory.doApplyFilter(flags)) {
      resList.applyFilter();
    }
    resList.exeChanged();

    return resList;
  }

  /**
   *  Compare the base lists of two ResourceLists
   * @param   {object}   listA   First ResourceList
   * @param   {object}   listB   Senond ResourceList
   * @param   {function} compare Function to compare entries
   * @param   {number}   start   Optional Zero-based start index
   * @param   {number}   end     Optional Zero-based index to stop comparison before
   * @returns {boolean}  true if lists match over specified range
   */
  function compareResourceLists (listA, listB, compare, start, end) {

    if (typeof compare === 'number') {
      end = start;
      start = compare;
      compare = angular.equals;
    }

    var n = miscUtilFactory.toInteger(start),
      lenA = listA.list.length >>> 0,
      lenB = listB.list.length >>> 0,
      length = miscUtilFactory.toInteger(end),
      count = 0,
      testFunc = function (entry) {
        return compare(this, entry);
      };

    if (!end || !length) {
      // set length to smallest list length
      length = lenA;
      if (length !== lenB) {
        return false; // lists not the same length
      }
    } else {  // end provided
      if ((lenA === lenB) && (length > lenA)) {
        length = lenA;  // requested length too long, use available
      } else if ((length > lenA) || (length > lenB)) {
        return false; // lists not the same over requested length
      }
    }
    
    // check entries
    for (var i = n; i < length; ++i) {
      if (listB.findIndexInList(testFunc.bind(listA.list[i])) !== undefined) {
        ++count;
      }
    }

    return (count === length);
  }

  /**
   * A resource list object containing base and filtered lists
   * @param {function} $filter         Angular filter service
   * @param {function} storeFactory    storeFactory service
   * @param {object}   miscUtilFactory miscUtilFactory service
   * @param {object}   pagerFactory    pagerFactory
   * @param {string}   id              id string
   * @param {string}   title           title string
   * @param {Array}    list            base list to use
   * @param {number}   flags           storeFactory flags
   */
  function ResourceList ($filter, storeFactory, resourceFactory, miscUtilFactory, pagerFactory, id, title, list, flags) {
    if (!list) {
      list = [];
    }

    // configure object
    this.id = id;
    this.title = title;
    setListForResourceList(this, list, flags);
    this.filter = {};         // filter
    this.pager = undefined;   // pager
    this.selCount = 0;        // selected count
    this.sortOptions = undefined;  // list of sort valid options
    this.sortBy = undefined;  // sort by option
    this.onChange = [];       // functions to be executed when contents are changed
  }

  ResourceList.$inject = ['$filter', 'storeFactory', 'resourceFactory', 'miscUtilFactory', 'pagerFactory', 'id', 'title', 'list', 'flags'];

  /**
   * Identify this object as a ResourceList
   */
  ResourceList.prototype.isResourceList = true;

  /**
   * Set the base list
   * @param {Array}  list  base list to use
   * @param {number} flags storeFactory flags; the following are used
   *                       - COPY_SET: to set list to a copy of the argument
   *                       - APPLY_FILTER: to immediately filter list
   *                       - other flags ignored
   * @returns {object} ResourceList object
   */
  ResourceList.prototype.setList = function (list, flags) {
    return setListForResourceList(this, list, flags);
  };

  /**
   * Add an entry to the base list
   * @param {object|array} entry     Entry/entries to add to list
   * @param {number}       flags     storeFactory flags; the following are used
   *                                 - COPY_SET: to add a copy of the entry argument to the list
   *                                 - APPLY_FILTER: to immediately filter list
   *                                 - other flags ignored
   * @param {boolean}      duplicate Duplicate check flag;
   *                                 true => no duplicates allowed
   *                                 false (default) => duplicated allowed
   * @param {function}     compare   Function to use for duplicate comparision, angular.equals() is used if none provided   
   */
  ResourceList.prototype.addToList = function (entry, flags, duplicate, compare) {

    var count = this.count, //initial count
      idx;

    if (typeof flags === 'boolean') {
      compare = duplicate;
      duplicate = flags;
      flags = storeFactory.NOFLAG;
    }
    if (duplicate) {
      if (!compare) {
        compare = angular.equals;
      }
    }

    if (!this.list) {
      if (Array.isArray(entry)) {
        this.setList(entry, flags);
      } else {
        this.setList([entry], flags);
      }
    } else {
      miscUtilFactory.toArray(entry).forEach(function (element) {
        // process single item
        if (duplicate) {
          // do duplicate test
          idx = this.findIndexInList(function (listEntry) {
            return compare(listEntry, element);
          });
        } else {
          idx = undefined;
        }

        if (idx === undefined) {
          // add to list
          if (storeFactory.doCopySet(flags)) {
            element = angular.copy(element);
          }

          this.list.push(element);
          this.count = this.list.length;
        }
      }, this);
    }
    if (count !== this.count) {
      if (storeFactory.doApplyFilter(flags)) {
        this.applyFilter();
      }
      this.exeChanged();
    }
  };

  /**
   * Remove an entry to the base list
   * @param {object|array} entry     Entry/entries to remove from list
   * @param {number}       flags     storeFactory flags; the following are used
   *                                 - APPLY_FILTER: to immediately filter list
   *                                 - other flags ignored
   * @param {function}     compare   Function to use for duplicate comparision, angular.equals() is used if none provided   
   */
  ResourceList.prototype.removeFromList = function (entry, flags, compare) {

    var count = this.count, //initial count
      idx;

    if (typeof flags === 'function') {
      compare = flags;
      flags = storeFactory.NOFLAG;
    }
    if (!compare) {
      compare = angular.equals;
    }

    miscUtilFactory.toArray(entry).forEach(function (element) {
      // search for item
      idx = this.findIndexInList(function (listEntry) {
        return compare(listEntry, element);
      });

      if (idx >= 0) {
        // remove from list
        this.list.splice(idx, 1);
        this.count = this.list.length;
      }
    }, this);

    if (count !== this.count) {
      if (storeFactory.doApplyFilter(flags)) {
        this.applyFilter();
      }
      this.exeChanged();
    }
  };

  /**
   * Returns a shallow copy of a portion of this list as a new array object selected
   * from begin to end (end not included). The original list will not be modified.
   * @param {number}  begin   Optional. Zero-based index at which to begin extraction.
   * @param {number}  end     Optional. Zero-based index before which to end extraction. slice extracts up to but not including end.
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice
   */
  ResourceList.prototype.slice = function (begin, end) {
    return this.list.slice(begin, end);
  };

  /**
   * Notify all listeners of a change
   */
  ResourceList.prototype.exeChanged = function () {
    if (this.onChange) {
      for (var i = 0; i < this.onChange.length; ++i) {
        this.onChange[i](this);
      }
    }
  };

  /**
   * Add an onChange listener
   * @param {function} listener   listener function to callback
   */
  ResourceList.prototype.addOnChange = function (listener) {
    this.onChange.push(listener);
  };

  /**
   * Call the callback function for each of the entries in this objects list
   * @param {function} callback   function to callback
   * @param {object}   thisArg    Optional, object to use as this when executing callback.
   */
  ResourceList.prototype.forEachInList = function (callback, thisArg) {
    this.list.forEach(function (entry) {
      callback(entry);
    }, thisArg);
  };

  /**
   * Find an entry in this objects list using the callback function to test each of the entries 
   * @param {function} predicate function to test entries in list
   * @param {number}   start     offset to start from
   * @return {object}   Found entry or undefined
   */
  ResourceList.prototype.findInList = function (predicate, start) {
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    // If argument start was passed let n be ToInteger(start); else let n be 0.
    var n = miscUtilFactory.toInteger(start),
      length = this.list.length >>> 0,
      value;

    for (var i = n; i < length; i++) {
      value = this.list[i];
      if (predicate(value, i, this.list)) {
        return value;
      }
    }
    return undefined;
  };

  /**
   * Find the index of an entry in this objects list using the callback function to test each of the entries 
   * @param {function} predicate function to test entries in list
   * @param {number}   start     offset to start from
   * @return {number}   Index of found entry or undefined
   */
  ResourceList.prototype.findIndexInList = function (predicate, start) {
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    // If argument start was passed let n be ToInteger(start); else let n be 0.
    var n = miscUtilFactory.toInteger(start),
      length = this.list.length >>> 0,
      value;

    for (var i = n; i < length; i++) {
      value = this.list[i];
      if (predicate(value, i, this.list)) {
        return i;
      }
    }
    return undefined;
  };

  /**
   * Return an entry in this objects list
   * @param {number}   index     index of entry to return
   */
  ResourceList.prototype.getFromList = function (index) {
    var length = this.list.length >>> 0;

    if ((index < 0) || (index >= length)) {
      throw new RangeError('index out of range');
    }
    return this.list[index];
  };

  /**
   * Set an entry in this objects list
   * @param {number}   index     index of entry to return
   * @param {object}   value     value of entry to set
   */
  ResourceList.prototype.setInList = function (index, value) {
    var length = this.list.length >>> 0;

    if ((index < 0) || (index >= length)) {
      throw new RangeError('index out of range');
    }
    return (this.list[index] = value);
  };

  /**
   * Update an entry in this objects list with the properties of value
   * @param {number}   index     index of entry to return
   * @param {object}   value     value of entry to set
   */
  ResourceList.prototype.updateInList = function (index, value) {
    var length = this.list.length >>> 0;

    if ((index < 0) || (index >= length)) {
      throw new RangeError('index out of range');
    }
    miscUtilFactory.copyProperties(value, this.list[index]);
    return this.list[index];
  };

  /**
   * Apply a filter to the list, and update the associated pager if applicable
   * @param {object}   filterBy   Filter object to use (not ResourceFilter) or preset filter used if undefined
   * @returns {object} this object to facilitate chaining
   */
  ResourceList.prototype.applyFilter = function (filterBy) {
    if (typeof filterBy === 'undefined') {
      // use preset filter object
      if (this.filter) {
        filterBy = this.filter.filterBy;
      }
    }

    filterBy = filterBy || {};
    
    this.filter.lastFilter = filterBy;

    if (!miscUtilFactory.isEmpty(filterBy) || !this.filter.allowBlank) {
      if (this.filter.customFunction) {
        // use the specific filter function to set the filtered list
        this.filter.customFunction(this, filterBy);
      } else {
        // use the filter object
        this.filterList = $filter('filter')(this.list, filterBy);
      }
    } else {
      this.filterList = this.list;
    }
    this.filterCount = this.filterList.length;

    if (this.pager) {
      pagerFactory.updatePager(this.pager.id, this.filterList);
    }

    return this;
  };

  /**
   * Sort this ResourceList
   * @param   {function} getSortFunction Function to return  sort function
   * @param   {object}   sortOptions     List of possible sort option
   * @param   {object}   sortByValue     Key to sort by
   * @returns {Array}    sorted list
   */
  ResourceList.prototype.sort = function (getSortFunction, sortOptions, sortByValue) {
    return sortResourceList(this, getSortFunction, sortOptions, sortByValue);
  };

  /**
   * Compare this ResourceList's base list to another ResourceList's
   * @param   {object}   list    ResourceList to compare to
   * @param   {function} compare Function to compare entries
   * @param   {number}   start   Optional Zero-based start index
   * @param   {number}   end     Optional Zero-based index to stop comparison before
   * @returns {boolean}  true if lists match over specified range
   */
  ResourceList.prototype.compare = function (list, compare, start, end) {
    return compareResourceLists(this, list, compare, start, end);
  };

  /**
   * toString method for a ResourceList object
   * @returns {string} string representation
   */
  ResourceList.prototype.toString = function () {
    return 'ResourceList{ id: ' + this.id +
    ', title: ' + this.title +
    ', list: ' + this.propertyToString(this.list) +
    ', count: ' + this.count +
    ', filterList: ' + this.propertyToString(this.filterList) +
    ', filterCount: ' + this.filterCount +
    ', filter: ' + this.propertyToString(this.filter) +
    ', pager: ' + this.pager +
    ', selCount: ' + this.selCount +
    ', sortOptions: ' + this.propertyToString(this.sortOptions) +
    ', sortBy: ' + this.sortBy + '}';
  };

  /**
   * Wrapper for toString to prevent toString calls on undefined
   * @param {object} property object to call to String on
   * @returns {string} string representation
   */
  ResourceList.prototype.propertyToString = function (property) {
    var str;
    if (property) {
      str = property.toString();
    } else {
      str = property;
    }
    return str;
  };

  // need the return here so that object prototype functions are added
  return factory;
}




/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .factory('standardFactoryFactory', standardFactoryFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

standardFactoryFactory.$inject = ['$resource', '$injector', '$q', 'baseURL', 'storeFactory', 'miscUtilFactory', 'resourceListFactory', 'filterFactory', 'queryFactory', 'SCHEMA_CONST'];

function standardFactoryFactory($resource, $injector, $q, baseURL, storeFactory, miscUtilFactory, resourceListFactory, filterFactory, queryFactory, SCHEMA_CONST) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'standardFactoryFactory',
      getResourceConfig: getResourceConfig,
      getResourceConfigWithId: getResourceConfigWithId,
    
      registerStandardFactory: registerStandardFactory
    },
    standardFactories = {};

  // need to return factory as end so that object prototype functions are added

  /* function implementation
    -------------------------- */

  /**
   * Registger a standard factory
   * @param   {string}          name         Name of the new factory
   * @param   {object}          args         Optional srguments:
   *  @param  {function|string} storeId      Function to generate store ids for objects created by the factory or id tag to use when generating
   *  @param  {object}          schema       Schema associated with the factory
   *  @param  {object}          addInterface Object to add standard factory interface to
   *  @param  {object}          resources    Resource config object
   * @returns {object}          new factory 
   */
  function registerStandardFactory (name, args) {
    var factory = standardFactories[name],
      prop,
      resrcName,
      cfg;
    if (!factory) {
      factory = $injector.instantiate(StandardFactory, {
        name: name,
        storeId: args.storeId,
        schema: args.schema,
        sortOptions: args.sortOptions,
        resources: args.resources
      });
      standardFactories[name] = factory;

      if (args.addInterface) {
        // add the standard functions to the factory
        for (prop in Object.getPrototypeOf(factory)) {
          args.addInterface[prop] = factory[prop].bind(factory);
        }
        if (args.resources) {
          // add functions to the factory for the custom actions
          miscUtilFactory.toArray(args.resources).forEach(function (resource) {
            for (resrcName in resource) {
              /* StandardFactory has methods matching the default action of 
                resource class:
                  { 'get':    {method:'GET'},
                    'save':   {method:'POST'},
                    'query':  {method:'GET', isArray:true},
                    'remove': {method:'DELETE'},
                    'delete': {method:'DELETE'} };
                https://docs.angularjs.org/api/ngResource/service/$resource
              */
              cfg = resource[resrcName];
              if (cfg.actions) {
                // add methods for custom methods
                for (prop in cfg.actions) {
                  if (!args.addInterface[prop]) {
                    args.addInterface[prop] = factory.resourceMethod.bind(factory, prop);
                  }
                }
              }
            }
          });
        }
      }
    }
    return factory;
  }

  /**
   * Return a resource config object
   * @param   {string} url     URL for resource
   * @returns {object} resource config object
   */
  function getResourceConfig (url) {
    return {
      url: url,                   // URL template
      paramDefaults: null,
      actions: null
    };
  }
  
  /**
   * Return a resource config object with parameterized URL
   * @param   {string} url     URL for resource
   * @param   {object} actions Optional additional custom actions
   * @returns {object} resource config object
   */
  function getResourceConfigWithId (url, actions) {
    var action,
      cfg = {
        url: url + '/:id', // parameterized URL template with parameters prefixed by : 
        paramDefaults: {id:'@id'},    // extract parameter value from corresponding property on the data object
        actions: {
          update: { method: 'PUT'}    //  custom actions
        }
      };

    if (actions) {
      for (action in actions) {
        cfg.actions[action] = actions[action];
      }
    }
    return cfg;
  }

  /**
   * Create storeFactory id
   * @param {object} factory Factory to generate storeFactory id for
   * @param {string} id      Factory id to generate storeFactory id from
   * @return {string} Store id
   */
  function storeId (factory, id) {
    var idstr;
    if (typeof factory.storeId === 'string') {
      idstr = factory.storeId + id;
    } else if (typeof factory.storeId === 'function') {
      idstr = factory.storeId(id);
    } else {
      idstr = id;
    }
    return idstr;
  }

  /**
   * StandardFactory object
   * @throws {TypeError} on incorrect argument type
   * @param {string}   name    Name of factory
   * @param {function} storeId Function to make store ids for objects created by the factory
   * @param {object}   schema  Schema associated with this factory
   * @param {object}   resources  Resource config object
   */
  function StandardFactory ($resource, baseURL, storeFactory, name, storeId, schema, sortOptions, resources) {
    this.name = name;
    if ((typeof storeId !== 'function') && (typeof storeId !== 'string')) {
      throw new TypeError('Incorrect argument type for storeId: ' + typeof storeId);
    }
    this.storeId = storeId;
    this.schema = schema;
    this.sortOptions = sortOptions;
    this.resources = resources;
  }
  
  StandardFactory.$inject = ['$resource', 'baseURL', 'storeFactory', 'name', 'storeId', 'schema', 'sortOptions', 'resources'];
  
  /**
   * Get the factory schema
   * @param {object} factory schema
   */
  StandardFactory.prototype.getSchema = function (thisArg) {
    thisArg = thisArg || this;
    return thisArg.schema;
  };

  /**
   * Get the factory resource
   * @param {string} name   Name of resource to get
   * @return {object} resource "class" object
   */
  StandardFactory.prototype.getResource = function (name) {
    var resource = this.resources[name];
    if (!resource) {
      throw new Error('Resource not defined for \'' + name + '\'');
    }
    return $resource(baseURL + resource.url, resource.paramDefaults, resource.actions);
  };

  /**
   * Call an action on the factory resource
   * @param {object}   resource  Resource class object
   * @param {string}   method    action name
   * @param {object}   params    Optional params
   * @param {object}   postData  Optional data for body of request
   * @param {function} onSuccess Function to call on success
   * @param {function} onFailure Function to call on failure
   * @param {boolean}  asPromise Return the resource promise if true, otherwise implement success/failure functions
   */
  function requestMethod (resource, method, params, postData, onSuccess, onFailure, asPromise) {
    var result,
      promise;

    if (typeof params === 'function') {
      //                   resource, method, params, postData, onSuccess, onFailure, asPromise
      return requestMethod(resource, method, undefined, undefined, params, postData, onSuccess);
    }
    if (typeof params === 'boolean') {
      //                   resource, method, params, postData, onSuccess, onFailure, asPromise
      return requestMethod(resource, method, undefined, undefined, undefined, undefined, params);
    }
    if (typeof postData === 'function') {
      //                   resource, method, params, postData, onSuccess, onFailure, asPromise
      return requestMethod(resource, method, params, undefined, postData, onSuccess, onFailure);
    }
    if (typeof postData === 'boolean') {
      //                   resource, method, params, postData, onSuccess, onFailure, asPromise
      return requestMethod(resource, method, params, undefined, undefined, undefined, postData);
    }
    if (typeof onSuccess === 'boolean') {
      //                   resource, method, params, postData, onSuccess, onFailure, asPromise
      return requestMethod(resource, method, params, postData, undefined, undefined, onSuccess);
    }
    if (typeof onFailure === 'boolean') {
      //                   resource, method, params, postData, onSuccess, onFailure, asPromise
      return requestMethod(resource, method, params, postData, onSuccess, undefined, onFailure);
    }
    
    promise = resource[method](params, postData).$promise;
    if (asPromise) {
      result = promise;
    } else {
      promise.then(
        // success function
        function (response) {
          if (onSuccess) {
            onSuccess(response);
          }
        },
        // error function
        function (response) {
          if (onFailure) {
            onFailure(response);
          }
        }
      );
    }
    return result;
  }

  /**
   * Call an action on the factory resource
   * @param {string} name   Name of resource
   * For other arguments & return @see requestMethod()
   */
  StandardFactory.prototype.resourceMethod = function (method, name, params, postData, onSuccess, onFailure, asPromise) {
    return requestMethod(this.getResource(name), method, params, postData, onSuccess, onFailure, asPromise) ;
  };

  /**
   * Get the factory resource.
   * For arguments & return @see requestMethod()
   */
  StandardFactory.prototype.get = function (name, params, postData, onSuccess, onFailure, asPromise) {
    return this.resourceMethod('get', name, params, postData, onSuccess, onFailure, asPromise);
  };

  /**
   * Save the factory resource
   * For arguments & return @see requestMethod()
   */
  StandardFactory.prototype.save = function (name, postData, onSuccess, onFailure, asPromise) {
    return this.resourceMethod('save', name, undefined, postData, onSuccess, onFailure, asPromise);
  };

  /**
   * Query the factory resource
   * For arguments & return @see requestMethod()
   */
  StandardFactory.prototype.query = function (name, params, postData, onSuccess, onFailure, asPromise) {
    return this.resourceMethod('query', name, params, postData, onSuccess, onFailure, asPromise);
  };

  /**
   * Remove using the factory resource
   * For arguments & return @see requestMethod()
   */
  StandardFactory.prototype.remove = function (name, params, postData, onSuccess, onFailure, asPromise) {
    return this.resourceMethod('remove', name, params, postData, onSuccess, onFailure, asPromise);
  };

  /**
   * Delete using the factory resource
   * For arguments & return @see requestMethod()
   */
  StandardFactory.prototype.delete = function (name, params, postData, onSuccess, onFailure, asPromise) {
    return this.resourceMethod('delete', name, params, postData, onSuccess, onFailure, asPromise);
  };

  /**
   * Store a response from the server asynchronously
   * @param {string}   name             Name of factory
   * @param {object}   resourceFactory  Reference to resourceFactory (required in order to prevent circular dependency)
   * @param {object}   obj              Object to save
   * @param {object}   args             process arguments object, @see resourceFactory.storeServerRsp() for details
   * @param {object}   con              consoleService object to log output
   * @param {string}   label            Label to use in log output
   * @return {object}   Canvass object
   */
  StandardFactory.prototype.storeRspObjectAsync = function (name, resourceFactory, obj, args, con, label) {

    var subObjects, i, ll, promises,
      saveMain = function (result) {

        if (con) {
          con.debug('Store ' + label + ' response: ' + obj);
        }

        // just basic storage args as subdocs have been processed above
        var storeArgs = resourceFactory.copyBasicStorageArgs(args, {
          factory: $injector.get(name)
        });

        resourceFactory.storeServerRsp(obj, storeArgs);
      };

    // store sub objects first
    if (args.subObj) {
      subObjects = miscUtilFactory.toArray(args.subObj);
      promises = [];

      if (con) {
        con.debug('Store ' + label + ' subobjs: ' + subObjects.length);
      }

      for (i = 0, ll = subObjects.length; i < ll; ++i) {
        promises.push(
          $q(function (resolve, reject) {
            resourceFactory.storeSubDoc(obj, subObjects[i], args);
            if (con) {
              con.debug('Stored ' + label + ' subobj[' + i + ']: ' + subObjects[i].objId);
            }
            resolve();
          })
        );
      }
    }

    if (promises) {
      $q.all(promises).then(saveMain);
    } else {
      saveMain();
    }
  };

  /**
   * Create a new object
   * @param {string} id     Factory id of new object
   * @param {number} flags  storefactory flags
   */
  StandardFactory.prototype.newObj = function (id, flags) {
    return storeFactory.newObj(storeId(this, id), this.schema.getObject(), flags);
  };

  /**
   * Create a new object by duplicating an existing object
   * @param {string} id     Factory id of new object
   * @param {string} srcId  Factory id of object to duplicate
   * @param {number} flags  storefactory flags
   * @param   {function} presetCb Optional function to be called before object stored
   * @returns {object}   New or existing object
   */
  StandardFactory.prototype.duplicateObj = function (id, srcId, flags, presetCb) {
    return storeFactory.duplicateObj(storeId(this, id), storeId(this, srcId), flags, presetCb);
  };
  
  /**
   * Delete an object
   * @param {string} id     Factory id of object to delete
   * @param {number} flags  storefactory flags
   */
  StandardFactory.prototype.delObj = function (id, flags) {
    return storeFactory.delObj(storeId(this, id), flags);
  };

  /**
   * Set an object
   * @param {string} id     Factory id of object to set
   * @param {object} data   data to set
   * @param {number} flags  storefactory flags
   */
  StandardFactory.prototype.setObj = function (id, data, flags) {
    return storeFactory.setObj(storeId(this, id), data, flags, this.schema.getObject());
  };
  
  /**
   * Get an object
   * @param {string} id     Factory id of object to get
   * @param {number} flags  storefactory flags
   */
  StandardFactory.prototype.getObj = function (id, flags) {
    return storeFactory.getObj(storeId(this, id), flags);
  };
  
  /**
   * Initialise an object
   * @param {string} id     Factory id of object to init
   * @param {number} flags  storefactory flags
   */
  StandardFactory.prototype.initObj = function (id, flags) {
    return this.setObj(id, this.schema.getObject(), flags);
  };

  /**
   * Create a new ResourceList object
   * @param   {string} id   Id of list
   * @param {object} args Argument object @see resourceListFactory.newResourceList()
   * @returns {object} ResourceList object
   */
  StandardFactory.prototype.newList = function (id, args) {
    var listArgs;
    if (args) {
      listArgs = angular.copy(args);
    } else {
      listArgs = {};
    }
    if (!listArgs.id) {
      listArgs.id = id;
    }
    listArgs.factory = this.name;

    return resourceListFactory.newResourceList(storeId(this, id), listArgs);
  };
  
  /**
   * Create a new ResourceList object by duplicating an existing object
   * @param {string} id    Factory id of new object
   * @param {string} srcId Factory id of object to duplicate
   * @param {number} flags storefactory flags
   * @param {object} args  Optional arguemnts specifying fields to duplicate when used with EXISTING
   * @see resourceListFactory.duplicateList()
   * @returns {object} ResourceList object
   */
  StandardFactory.prototype.duplicateList = function (id, srcId, flags, args) {
    return resourceListFactory.duplicateList(id, storeId(this, id), storeId(this, srcId), flags, args);
  };

  
  /**
   * Delete a ResourceList object
   * @param {string}         id    Id string to use
   * @param {number}         flags storeFactory flags; the following are used
   *                               - COPY_GET: to return copy of list
   *                               - other flags ignored
   * @returns {object|boolean} Copy of deleted ResourceList object, or true if successful
   */
  StandardFactory.prototype.delList = function (id, flags) {
    return resourceListFactory.delResourceList(storeId(this, id), flags);
  };
  
  /**
   * Set the base list for a ResourceList object
   * @param {string} id    Id string to use
   * @param {Array}  list  base list to use
   * @param {number} flags storefactoryFlags
   * @param {string} title Title of list if new list must be created
   * @returns {object} ResourceList object
   */
  StandardFactory.prototype.setList = function (id, list, flags, title) {
    var newListFxn = this.newList.bind(this, id);
    return resourceListFactory.setResourceList(storeId(this, id), list, flags,
      function (flags) {
        return newListFxn({
          id: id, title: title, list: list, flags: flags }
        );
      });
  };
  
  /**
   * Get an existing ResourceList object
   * @param {string} id   Id string to use
   * @param   {number}   flags   storefactoryFlags
   * @returns {object} ResourceList object
   */
  StandardFactory.prototype.getList = function (id, flags) {
    var newListFxn = this.newList.bind(this, id);
    return resourceListFactory.getResourceList(storeId(this, id), flags,
      function (flags) {
        return newListFxn({
          id: id, flags: flags
        });
      });
  };
  
  /**
   * Initialise a ResourceList object to an emply base list
   * @param {string} id   Id string to use
   * @param {number}   flags   storefactoryFlags
   * @returns {object} ResourceList object
   */
  StandardFactory.prototype.initList = function (id, flags) {
    return resourceListFactory.initResourceList(storeId(this, id), flags);
  };

  /**
   * Check if sort key is descending order
   * @param   {object} sortBy   Key to sort by
   * @returns {boolean} true if is descending order, false otherwise
   */
  StandardFactory.prototype.isDescendingSortOrder = function (sortBy) {
    return resourceListFactory.isDescendingSortOrder(sortBy);
  };

  /**
   * Set the pager for a ResourceList object
   * @param {string} id     Factory id of object
   * @param   {object} [filter={}] Filter object to use, ResourceFilter object or no filter
   * @param {number} flags  storefactory flags
   * @returns {object} canvass result ResourceList object
   */
  StandardFactory.prototype.setPager = function (id, pager, flags) {
    return resourceListFactory.setPager(storeId(this, id), pager, flags);
  };

  /**
   * Generate a new ResourceFilter
   * @param {object}   base         Base object to generate filter from
   * @param {function} customFilter Custom filter function
   * @param {object}   options      Additional options
   */
  StandardFactory.prototype.newFilter = function (base, customFilter, options) {
    if (typeof base === 'function') {
      options = customFilter;
      customFilter = base;
      base = undefined;
    }
    if (typeof customFilter === 'object') {
      options = customFilter;
      customFilter = undefined;
    }
    if (!customFilter) {
      customFilter = this.filterFunction;
    }

    var opts = miscUtilFactory.copyAndAddProperties(options, {
      customFunction: customFilter
    });

    return filterFactory.newResourceFilter(this.schema, base, opts);
  };
  
  /**
   * Generate a filtered list
   * @param {object}   reslist    ResourceList object to filter
   * @param {object}   filterBy   Filter object to use (not ResourceFilter)
   * @param {function} xtraFilter Function to provide additional filtering
   * @returns {Array}  filtered list
   */
  StandardFactory.prototype.getFilteredList = function (reslist, filterBy, xtraFilter) {
    return filterFactory.getFilteredList('filterSchema', reslist, filterBy, xtraFilter);
  };
  
  /**
   * Address-specific filter function
   * @param {object}   reslist    ResourceList object
   * @param {object}   filterBy   Filter object to use (not ResourceFilter)
   */
  StandardFactory.prototype.filterFunction = function (reslist, filterBy, xtraFilter) {
    reslist.filterList = reslist.factory.getFilteredList(reslist, filterBy);
  };

  /**
   * Get resources from the server
   * @param {string}   name                 Name of resource
   * @param {object}   resList              ResourceList to save result to
   * @param {object}   [filter=newFilter()] ResourceFilter to filter raw results
   * @param {function} success              Function to call on success
   * @param {function} failure              Function to call on failure
   * @param {function} forEachSchemaField   Schema field iterator
   */
  StandardFactory.prototype.getFilteredResource = function (name, resList, filter, success, failure, forEachSchemaField) {

    if (typeof name !== 'string') {
      throw new TypeError('Incorrect argument type for name: ' + typeof name);
    }
    if (!resList.isResourceList) {
      throw new TypeError('Incorrect argument type for resList: ' + typeof resList);
    }
    if (typeof filter === 'function') {
      forEachSchemaField = failure;
      failure = success;
      filter = this.newFilter();
    }
    if (!forEachSchemaField) {
      forEachSchemaField = this.forEachSchemaField;
    }
    filter = filter || this.newFilter();

    var query;
    if (filter.isResourceFilter) {
      // build query from a schema filter object
      query = queryFactory.buildSchemaQuery(forEachSchemaField, filter.getFilterValue(), this);
    } else {
      // use raw query
      query = filter;
    }

    resList.setList([]);
    this.query(name, query,
      // success function
      function (response) {
        // add indices
        for (var i = 0; i < response.length; ++i) {
          response[i].index = i + 1;
        }
        // response from server contains result of filter request
        resList.setList(response, storeFactory.APPLY_FILTER);

        if (success){
          success(response);
        }
      },
      // error function
      failure
    );
  };
  
  /**
   * Set the filter for a ResourceList
   * @param {string} id                   ResourceList id
   * @param {object} [filter=newFilter()] ResourceFilter to set
   * @param {number} flags                storefactoryFlags
   * @returns {object} ResourceList object
   */
  StandardFactory.prototype.setFilter = function (id, filter, flags) {
    if (!filter) {
      filter = this.newFilter();
    }
    return resourceListFactory.setFilter(storeId(this, id), filter, flags);
  };

  /**
   * Apply filter to a ResourceList object
   * @param {string} id     Factory id of object
   * @param {object} filter filter to use or preset filter is used if undefined
   * @param {number} flags  storefactory flags
   * @returns {object} canvass result ResourceList object
   */
  StandardFactory.prototype.applyFilter = function (id, filter, flags) {
    return resourceListFactory.applyFilter(storeId(this, id), filter, flags);
  };

  /**
   * Return the ResourceList sort options for this factory
   * @return {Array} Array of options
  */
  StandardFactory.prototype.getSortOptions = function (thisArg) {
    thisArg = thisArg || this;
    return thisArg.sortOptions;
  };

  /**
   * Return a sort options for this factory
   * @param {number} index   Field index
   * @param {string} sortKey Sort key; SCHEMA_CONST.SORT_ASC or SCHEMA_CONST.SORT_DESC
   * @return {object} Sort option
  */
  StandardFactory.prototype.getSortOption = function (index, sortKey, thisArg) {
    thisArg = thisArg || this;
    var sortObj,
      value = thisArg.schema.getField(index);

    if (value) {
      value = SCHEMA_CONST.MAKE_SORT_OPTION_VALUE(sortKey, value.dialog);
      sortObj = thisArg.sortOptions.find(function(option) {
        return (option.value === value);
      });
    }
    return sortObj;
  };

  /**
   * Callback the specified function for each field in the schema, providing the field details as the callback arguments
   * @see Schema.prototype.forEachField() for argument details
   */
  StandardFactory.prototype.forEachSchemaField = function (callback, thisArg) {
    thisArg = thisArg || this;
    if (thisArg.schema) {
      thisArg.schema.forEachField(callback, thisArg);
    }
  };
  
  /**
   * Return a list of fields in this schema that match the specified criteria
   * @param {object} args Criteria to match, 
   *                      @see ModelProp.prototype.matches() for details
   * @return {array}  Array of matching modelProp objects
   */
  StandardFactory.prototype.getFieldList = function (args, thisArg) {
    var result = [];
    thisArg = thisArg || this;
    if (thisArg.schema) {
      result = thisArg.schema.getFieldList(args);
    }
    return result;
  };

  /**
   * Callback the specified function for each ModelProp in the schema, providing the ModelProp details as the callback arguments
   * @see Schema.prototype.forEachModelProp() for argument details
   */
  StandardFactory.prototype.forEachModelPropField = function (callback, thisArg) {
    thisArg = thisArg || this;
    if (thisArg.schema) {
      thisArg.schema.forEachModelProp(callback, thisArg);
    }
  };

  /**
   * Return a list of ModfelProps in this schema that match the specified criteria
   * @param {object} args Criteria to match, 
   *                      @see ModelProp.prototype.matches() for details
   * @return {array}  Array of matching modelProp objects
   */
  StandardFactory.prototype.getModelPropList = function (args, thisArg) {
    var result = [];
    thisArg = thisArg || this;
    if (thisArg.schema) {
      result = thisArg.schema.getModelPropList(args);
    }
    return result;
  };

  // need the return here so that object prototype functions are added
  return factory;
}




/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .constant('RESOURCE_CONST', (function () {
    var model = ['path', 'type', 'storage', 'factory'],   // related to ModelProp
      schemaModel = ['schema', 'schemaId', 'resource'].concat(model), // related to Schema & ModelProp
      basicStore = ['objId', 'flags', 'storage', 'next'],
      stdArgs = schemaModel.concat(basicStore, ['subObj', 'customArgs']),
      processRead = 0x01,   // process argument during read
      processStore = 0x02,  // process argument during store
      toProcess = function (processArg, toCheck) {
        var process = true;
        if (processArg && toCheck) {
          process = ((processArg & toCheck) !== 0);
        }
        return process;
      };
    return {
      STORE_LIST: 'list',
      STORE_OBJ: 'obj',

      PROCESS_READ: processRead,
      PROCESS_STORE: processStore,
      PROCESS_READ_STORE: (processRead | processStore),
      PROCESS_FOR_READ: function (toCheck) {
        return toProcess(processRead, toCheck);
      },
      PROCESS_FOR_STORE: function (toCheck) {
        return toProcess(processStore, toCheck);
      },

      MODEL_ARGS: model,
      SCHEMA_MODEL_ARGS: schemaModel,
      BASIC_STORE_ARGS: basicStore,
      STD_ARGS: stdArgs,
      
      QUERY_OR: '$or', // performs a logical OR operation on an array of two or more <expressions> and selects the documents that satisfy at least one of the <expressions>
      QUERY_AND: '$and', // performs a logical AND operation on an array of two or more expressions (e.g. <expression1>, <expression2>, etc.) and selects the documents that satisfy all the expressions
      QUERY_NOT: '$not', // performs a logical NOT operation on the specified <operator-expression> and selects the documents that do not match the <operator-expression>
      QUERY_NOR: '$nor', // performs a logical NOR operation on an array of one or more query expression and selects the documents that fail all the query expressions

      QUERY_OR_JOIN: '|',   // multi field OR
      QUERY_AND_JOIN: '+',  // multi field AND
      QUERY_COMMA_JOIN: ',',  // multi field comma join

      QUERY_NE: '!',  // inverse i.e. not equal
      QUERY_EQ: '=',  // equal
      QUERY_GT: '>',  // greater than
      QUERY_LT: '<',  // less than
      QUERY_GTE: '>=',  // greater than or equal
      QUERY_LTE: '<=',  // less than or equal
      QUERY_BLANK: '~', // blank
      QUERY_NBLANK: '!~' // not blank
    };
  }()))

  .factory('resourceFactory', resourceFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

resourceFactory.$inject = ['$resource', '$filter', '$injector', 'baseURL', 'storeFactory', 'miscUtilFactory', 'pagerFactory', 'compareFactory', 'standardFactoryFactory', 'resourceListFactory', 'queryFactory', 'consoleService', 'SCHEMA_CONST', 'RESOURCE_CONST'];

function resourceFactory ($resource, $filter, $injector, baseURL, storeFactory, miscUtilFactory, pagerFactory, compareFactory, standardFactoryFactory, resourceListFactory, queryFactory, consoleService, SCHEMA_CONST, RESOURCE_CONST) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'resourceFactory',
      createResources: createResources,
      getStoreResource: getStoreResource,
      storeServerRsp: storeServerRsp,
      storeSubDoc: storeSubDoc,
      standardiseArgs: standardiseArgs,
      getStandardArgsObject: getStandardArgsObject,
      checkArgs: checkArgs,
      arrayiseArguments: arrayiseArguments,
      findInStandardArgs: findInStandardArgs,
      findAllInStandardArgs: findAllInStandardArgs,
      addResourcesToArgs: addResourcesToArgs,
      standardiseModelArgs: standardiseModelArgs,
      getObjectInfo: getObjectInfo,
      removeSchemaPathTypeArgs: removeSchemaPathTypeArgs,
      copyBasicStorageArgs: copyBasicStorageArgs,
      removeBasicStorageArgs: removeBasicStorageArgs,
      getServerRsp: getServerRsp,
    
      extendFactory: extendFactory
    },
    modelArgsMap = {},
    StandardArgsInfo = [
    // arg info for getStandardArgsObject()
      { name: 'factory', test: angular.isString, dflt: undefined },
      { name: 'resource', test: angular.isString, dflt: undefined },
      { name: 'subObj', test: angular.isArray, dflt: undefined },
      { name: 'schema', test: angular.isObject, dflt: {} },
      { name: 'flags', test: angular.isNumber, dflt: storeFactory.NOFLAG },
      { name: 'next', test: angular.isFunction, dflt: undefined },
      { name: 'customArgs', test: angular.isObject, dflt: {} }
    ],
    con;  // console logger

  if (consoleService.isEnabled(factory.NAME)) {
    con = consoleService.getLogger(factory.NAME);
  }

  // add additional methods to factory
  extendFactory(factory, standardFactoryFactory);
  extendFactory(factory, resourceListFactory);
  extendFactory(factory, queryFactory);
  
  RESOURCE_CONST.MODEL_ARGS.forEach(function (prop) {
    switch (prop) {
      case 'path':
        modelArgsMap[prop] = 'getModelName'; // Schema object function to get value
        break;
      case 'type':
        modelArgsMap[prop] = 'getType'; // Schema object function to get value
        break;
      case 'storage':
        modelArgsMap[prop] = 'getStorageType'; // Schema object function to get value
        break;
      case 'factory':
        modelArgsMap[prop] = 'getModelFactory'; // Schema object function to get value
        break;
    }
  });

  // need the return here so that object prototype functions are added
  return factory;

  // need to return factory as end so that object prototype functions are added

  /* function implementation
    -------------------------- */

  /**
   * Extend a factory with poprerties from another factory
   * @param   {object} dst     Factory to extend
   * @param   {object} src     Factory to get poprerties from
   * @param   {Array}  addlist List of properties to add to dst
   * @param   {Array}  exlist  List of properties to not add to dst
   * @returns {object} Destination factory
   */
  function extendFactory (dst, src, addlist, exlist) {
    
    if (addlist) {
      addlist = addlist.slice();
    } else {
      addlist = Object.getOwnPropertyNames(src);
    }
    if (exlist) {
      exlist = exlist.slice();
    } else {
      exlist = [];
    }
    exlist.push('NAME');  // never copy name
    
    // remove excluded entries from add list
    exlist.forEach(function (prop) {
      var idx = addlist.findIndex(function (element) {
        return (element === prop);
      });
      if (idx >= 0) {
        addlist.splice(idx, 1);
      }
    });
    // copy add list entries
    addlist.forEach(function (prop) {
      if (hasProperty(src, prop)) {
        dst[prop] = src[prop];
      }
    });
    return dst;
  }
  
  /**
   * Create resources
   * @param   {object} options   Options specifying ids & types
   * @param   {object} resources Object to add the new resources to
   * @returns {object} Object updateed with the new resources
   */
  function createResources (options, resources) {
    var srcId,
      result,
      args = standardiseArgs(options);
    if (!resources) {
      resources = {};
    }
    args.objId.forEach(function (id) {
      switch (args.storage) {
        case RESOURCE_CONST.STORE_OBJ:
          if (!srcId) {
            result = args.factory.newObj(id, storeFactory.CREATE_INIT);
          } else {
            result = args.factory.duplicateObj(id, srcId, storeFactory.OVERWRITE);
          }
          break;
        case RESOURCE_CONST.STORE_LIST:
          if (!srcId) {
            result = args.factory.newList(id, {
              title: id,
              flags: storeFactory.CREATE_INIT,
              resource: args.resource
            });
          } else {
            result = args.factory.duplicateList(id, srcId, storeFactory.OVERWRITE);
          }
          break;
        default:
          result = undefined;
      }
      if (result) {
        resources[id] = result;
      }
      if (!srcId) {
        srcId = id;
      }
    });

    if (args.subObj) {
      args.subObj.forEach(function (subObj) {
        createResources(subObj, resources);
      });
    }

    return resources;
  }

  /**
   * Get a store object
   * @param {object}       options   process arguments object with following properties:
   *  @param {string}       objId    id of object to get
   *  @param {number}       flags    storefactory flags
   * @return {object}       ResourceList or object
   */
  function getStoreResource (options) {
    var result,
      args = standardiseArgs(options);
    if (args.storage === RESOURCE_CONST.STORE_LIST) {
      result = args.factory.getList(args.objId, args.flags);
    } else if (args.storage === RESOURCE_CONST.STORE_OBJ) {
      result = args.factory.getObj(args.objId, args.flags);
    }
    return result;
  }

  /**
   * Store a response from the server
   * @param {object}       response Server response
   * @param {object}       args     process arguments object with following properties:
   *  @param {string|Array} objId    id/array of ids of object to save response data to
   *  @param {string}       storage  save as list or object flag; STORE_LIST, STORE_OBJ, default depends on response
   *  @param {string}       path     path within response object to object to store
   *  @param {string}       type     object type, @see SCHEMA_CONST.FIELD_TYPES
   *  @param {object}       schema   Schema to use to retrieve object path & type
   *  @param {number}       schemaId Schema id to use to retrieve object path & type
   *  @param {number}       flags    storefactory flags
   *  @param {object|string} factory  factory (or factory name) to handle saving of objects/lists
   *  @param {function}     next     function to call after processing
   *  @param {Object|array} subObj   additional set(s) of arguments for sub objects
   * @return {object}       ResourceList or object
   */
  function storeServerRsp (response, args) {

    if (!RESOURCE_CONST.PROCESS_FOR_STORE(args.processArg)) {
      // arg only processed during read, so ignore
      return undefined;
    } // else process for store

    var stdArgs = standardiseArgs(args, args.parent),
      factory = stdArgs.factory,
      idArray = stdArgs.objId,
      resp,
      asList, i,
      toSave = getObjectInfo(response, stdArgs).object;

    // store sub objects first
    if (args.subObj) {
      miscUtilFactory.toArray(args.subObj).forEach(function (subObj) {
        storeSubDoc(response, subObj, stdArgs);
      });
    }

    resp = toSave;  // default result is raw object

    if (idArray.length) {
      if (stdArgs.storage === RESOURCE_CONST.STORE_LIST) {
        asList = true;
      } else if (stdArgs.storage === RESOURCE_CONST.STORE_OBJ) {
        asList = false;
      } else {
        asList = Array.isArray(toSave);
      }

      if (asList) {
        // process a query response
        if (toSave) {
          resp = factory.setList(idArray[0], toSave, stdArgs.flags);
        } else {
          resp = factory.initList(idArray[0], stdArgs.flags);
        }
      } else {
        // process a get response
        if (toSave) {
          resp = factory.setObj(idArray[0], toSave, stdArgs.flags);
        } else {
          resp = factory.initObj(idArray[0], stdArgs.flags);
        }
      }
      if (con) {
        con.debug('storeServerRsp: ' + idArray[0]);
      }
      // if multiple objId's secondary ids are set to copies
      for (i = 1; i < idArray.length; ++i) {
        if (asList) {
          factory.duplicateList(idArray[i], idArray[0], storeFactory.EXISTING, {
            list: true  // just duplicate list
          });
        } else {
          factory.duplicateObj(idArray[i], idArray[0], storeFactory.OVERWRITE);
        }
      }
    }

    if (stdArgs.next) {
      stdArgs.next(resp);
    }
    return resp;
  }


  /**
   * Get the object to save based on the provided path
   * @param {object} response Response object
   * @param {string} path     Path to required object
   * @return {object} object to save
   */
  function getObjectInfo (response, args) {
    var paths = [],
      object = response,
      parent, property;

    if (args.path) {
      paths.push(args.path);
    }
    for (parent = args.parent; parent && parent.path; parent = parent.parent) {
      paths.unshift(parent.path);
    }
    
    // drill down to get item to save
    paths.forEach(function (path) {
      if (object) {
        parent = object;
        property = path;
        object = parent[property];
      }
    });
    return { object: object,    // object to save
      parent: parent,   // parent object
      property: property }; // parent object property
  }

  /**
   * Process a populated sub document, by copying the data to a new factory object and 
   * transforming the original to ObjectIds.
   * @param {object} response Server response
   * @param {object} args     process arguments object, @see storeServerRsp() for details
   * @param {object} parent   Object's parent
   */
  function storeSubDoc(response, args, parent) {

    if (!RESOURCE_CONST.PROCESS_FOR_STORE(args.processArg)) {
      // arg only processed during read, so ignore
      return undefined;
    } // else process for store

    var stdArgs = standardiseArgs(args, parent),
      resp, list,
      toSaveInfo = getObjectInfo(response, stdArgs),
      toSave = toSaveInfo.object;

    // store subdoc, resp is ResourceList or object
    resp = storeServerRsp(response, stdArgs);

    // update response with expected response type i.e. ObjectIds
    if (resp) {
      if (SCHEMA_CONST.FIELD_TYPES.IS_OBJECTID(stdArgs.type)) {
        // field is objectId, so was saved as object
        toSaveInfo.parent[toSaveInfo.property] = resp._id;

      } else if (SCHEMA_CONST.FIELD_TYPES.IS_OBJECTID_ARRAY(stdArgs.type)) {
        // field is an array of objectId
        if (Array.isArray(toSave)) {
          if (resp.isResourceList) {
            list = resp.list; // its a ResourceList
          } else {
            list = resp;  // should be an raw array
          }
          for (var i = 0; i < toSave.length; ++i) {
            toSave[i] = list[i]._id;
          }
        }
      }
    }
    return resp;
  }

  /**
   * Standardise a server response argument object
   * @param {object}   args     process arguments object, @see storeServerRsp() for details
   * @param {object}   parent   Object's parent
   * @return {object}  arguments object
   */
  function standardiseArgs (args, parent) {

    var stdArgs = angular.copy(args);

    if (stdArgs.objId) {
      stdArgs.objId = miscUtilFactory.toArray(stdArgs.objId);
    } else {
      stdArgs.objId = [];
    }
    stdArgs.flags = (args.flags ? args.flags : storeFactory.NOFLAG);
    stdArgs.parent = parent;

    copySchemaModelArgs(
      standardiseModelArgs(copySchemaModelArgs(args), false /*no copy*/), stdArgs);

    if (typeof args.factory === 'string') {
      // get factory instance from injector
      stdArgs.factory = $injector.get(args.factory);
    }

    if (stdArgs.subObj) {
      if (Array.isArray(stdArgs.subObj)) {
        for (var i = 0; i < stdArgs.subObj.length; ++i) {
          stdArgs.subObj[i] = standardiseArgs(stdArgs.subObj[i], stdArgs);
        }
      } else {
        stdArgs.subObj = [standardiseArgs(stdArgs.subObj, stdArgs)];
      }
    }

    return stdArgs;
  }

  /**
   * Return a standard args object
   * @param {string|array} objId    Id(s) to use for storage
   * @param {string}       factory  Factory name
   * @param {string}       resource Name of factory resource to access resources on server
   * @param {array}        subObj   Sub-objects
   * @param {object}       schema   Schema object
   * @param {number}       flags    storeFactory flags
   * @param {function}     next     Function to call following completion
   * @param {object}       customArgs   Custom properties
   * @returns {object}       Standard args object
   *                                  
   * NOTE 1: make sure to update StandardArgsInfo on any change to function prototype.
   *      2: the objIdargument must be passed
   */
  function getStandardArgsObject(objId, factory, resource, subObj, schema, flags, next, customArgs) {

    var args = intCheckStandardArgsObjectArgs(arrayiseArguments(arguments, 1)); // exclude objId
    return {
      objId: objId,
      factory: args.factory,
      resource: args.resource,
      schema: args.schema.schema,
      schemaId: args.schema.schemaId,
      //type/path/storage/factory: can be retrieved using schema & schemaId
      subObj: args.subObj,
      flags: args.flags,
      next: args.next,
      customArgs: args.customArgs
    };
  }

  /**
   * Check arguemnts for getRspOptionsObject() making sure args are correctly positioned
   * @param {object}  funcArguments Argument object for original function
   * @return {object} checked argument object
   */
  function intCheckStandardArgsObjectArgs(funcArguments) {
    return checkArgs(StandardArgsInfo, funcArguments);
  }

  /**
   * Check arguments for correct positioning in function call
   * @param {Array}         argsInfo      Array of argument info objects:
   *                                      { name: <arg name>, test: <predicate validity test>, 
   *                                        dflt: <default value> }
   * @param {object|Array}  funcArguments Argument object for original function or an array of arguments
   * @return {object} checked argument object
   */
  function checkArgs(argsInfo, funcArguments) {

    var args = (Array.isArray(funcArguments) ? funcArguments.slice() : arrayiseArguments(funcArguments)),
      arg,
      checked = {};

    for (var i = 0, ll = argsInfo.length; i < ll; ++i) {
      arg = argsInfo[i];
      if (!arg.test(args[i])) {
        if (args.length < ll) { // num of args < expected
          args.splice(i, 0, arg.dflt);  // insert argument default value
        } else {
          if (args[i] !== undefined) {
            // right shift arguments
            for (var j = args.length - 1; j > i; --j) {
              args[j] = args[j - 1];
            }
          }
          args[i] = arg.dflt;   // set argument to default value
        }
      }
      checked[arg.name] = args[i];
    }
    return checked;
  }

  /**
   * 
   * Convert a function arguments object to an array
   * @param {object}  funcArguments Argument object for original function
   * @param {number}  start         Argument indexto start from
   * @return {Array} argument array
   */
  function arrayiseArguments(funcArguments, start) {
    var array;
    if (start === undefined) {
      start = 0;
    }
    if (start >= funcArguments.length) {
      array = [];
    } else if (funcArguments.length === 1) {
      array = [funcArguments[0]];
    } else {
      array = Array.prototype.slice.call(funcArguments, start);
    }
    return array;
  }

  /**
   * Find an arg object within a StandardArgs object 
   * @param {object}       stdArgs  StandardArgs object to traverse
   * @param {function}     callback Function to test arg objects
   * @return {object}      arguments object
   */
  function findInStandardArgs (stdArgs, callback) {

    var arg;
    if (callback(stdArgs)) {
      arg = stdArgs;
    }
    if (!arg && stdArgs.subObj) {
      for (var i = 0; !arg && (i < stdArgs.subObj.length); ++i) {
        arg = findInStandardArgs(stdArgs.subObj[i], callback);
      }
    }
    return arg;
  }

  /**
   * Find all arg objects within a StandardArgs object 
   * @param {object}       stdArgs  StandardArgs object to traverse
   * @param {function}     callback Function to test arg objects
   * @param {Array}        args     Array to add matching arg objects to
   * @return {Array}       Array of matching arg objects
   */
  function findAllInStandardArgs (stdArgs, callback, args) {

    if (!args) {
      args = [];
    }
    if (callback(stdArgs)) {
      args.push(stdArgs);
    }
    if (stdArgs.subObj) {
      stdArgs.subObj.forEach(function (sub) {
        findAllInStandardArgs(sub, callback, args);
      });
    }
    return args;
  }

  /**
   * Add resources required by Schema object
   * @param {object}       args   Args object to add to
   * @return {object}      arguments object
   */
  function addResourcesToArgs (args) {
    if (!args.injector) {
      /* need to pass run stage injector to Schema object as since it is created during the config
        stage it only has access to the config stage injector (only providers and constants accessible) */
      args.injector = $injector;
    }
    if (!args.findInStandardArgs) {
      args.findInStandardArgs = findInStandardArgs;
    }
    return args;
  }

  /**
   * Standardise a server response argument object
   * @param {object}       args     process arguments object with following properties:
   * @see storeServerRsp()
   * @return {object}       arguments object
   */
  function standardiseModelArgs (args, makeCopy) {
    
    makeCopy = ((makeCopy === undefined) ? true : makeCopy);

    var stdArgs = args;
    if (makeCopy) {
      stdArgs = copySchemaModelArgs(args);
    }

    if (stdArgs.schema && 
        (typeof stdArgs.schemaId === 'number') && (stdArgs.schemaId >= 0)) {
      // if not explicitly set retrieve using schema & schemaId
      RESOURCE_CONST.MODEL_ARGS.forEach(function (prop) {
        if (!stdArgs[prop]) {
          stdArgs[prop] = stdArgs.schema[modelArgsMap[prop]](stdArgs.schemaId);
        }
      });




      //-      if (!stdArgs.path) {
      //-        // path not explicitly provided, retrieve from schema & schemaId
      //-        stdArgs.path = stdArgs.schema.getModelName(stdArgs.schemaId);
      //-      }
      //-      if (!stdArgs.type) {
      //-        // path not explicitly provided, retrieve from schema & schemaId
      //-        stdArgs.type = stdArgs.schema.getType(stdArgs.schemaId);


    }

    return stdArgs;
  }

  /**
   * Copy the standard Schema/ModelProp arguments
   * @param {Array}  list list of properties to copy
   * @param {object} args process arguments object to copy from
   * @param {object} to   process arguments object to copy to
   * @return {object} arguments object
   */
  function copyArgs (list, args, to) {
    if (!to) {
      to = {};
    }
    return miscUtilFactory.copyProperties(args, to, list);
  }

  /**
   * Copy the standard Schema/ModelProp arguments
   * @param {object}       args     process arguments object to copy from
   * @param {object}       to       process arguments object to copy to
   * @return {object}       arguments object
   */
  function copySchemaModelArgs (args, to) {
    return copyArgs(RESOURCE_CONST.SCHEMA_MODEL_ARGS, args, to);
  }

  /**
   * Remove the standard Schema/ModelProp arguments
   * @param {object}       args     process arguments object to remove from
   * @return {object}       arguments object
   */
  function removeSchemaPathTypeArgs (args) {
    return miscUtilFactory.removeProperties(args, RESOURCE_CONST.SCHEMA_MODEL_ARGS);
  }

  /**
   * Copy the basic storage arguments
   * @param {object}       args     process arguments object to copy from
   * @param {object}       to       process arguments object to copy to
   * @return {object}       arguments object
   */
  function copyBasicStorageArgs (args, to) {
    return copyArgs(RESOURCE_CONST.BASIC_STORE_ARGS, args, to);
  }

  /**
   * Remove the standard Schema/ModelProp arguments
   * @param {object}       args     process arguments object to remove from
   * @return {object}       arguments object
   */
  function removeBasicStorageArgs (args) {
    return miscUtilFactory.removeProperties(args, RESOURCE_CONST.BASIC_STORE_ARGS);
  }

  
  
  /**
   * Get a stored response from the server
   * @param {object}       args     process arguments object with following properties:
   * @see storeServerRsp()
   * @return {object}       ResourceList or object
   */
  function getServerRsp (args) {

    var stdArgs = standardiseArgs(args),
      factory = stdArgs.factory,
      idArray = stdArgs.objId,
      resp = [],
      asList = true,
      asObj = true,
      read;

    if (stdArgs.storage === RESOURCE_CONST.STORE_LIST) {
      asObj = false;
    } else if (stdArgs.storage === RESOURCE_CONST.STORE_OBJ) {
      asList = false;
    } 
    // else no type specified so try both

    if (asList) {
      idArray.forEach(function (id) {
        read = factory.getList(id, stdArgs.flags);
        if (read) {
          resp.push(read);
        }
      });
    } 
    if (asObj) {
      idArray.forEach(function (id) {
        read = factory.getObj(id, stdArgs.flags);
        if (read) {
          resp.push(read);
        }
      });
    }

    if (stdArgs.next) {
      stdArgs.next(resp);
    }
    return resp;
  }

}

/*jslint node: true */
/*global angular */
'use strict';

/* This pager service was inspired by http://jasonwatmore.com/post/2016/01/31/AngularJS-Pagination-Example-with-Logic-like-Google.aspx */


angular.module('ct.clientCommon')

  .factory('pagerFactory', pagerFactory);


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

pagerFactory.$inject = ['storeFactory'];

function pagerFactory (storeFactory) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    newPager: newPager,
    delPager: delPager,
    getPager: getPager,
    updatePager: updatePager,
    addPerPageOptions: addPerPageOptions
  };

  return factory;

  /* function implementation
    -------------------------- */

  function storeId (id) {
    return 'pager.' + id;
  }

  /**
   * Create a new pager
   * @param   {string} id           Pager id
   * @param   {Array}  items        Items for pager to paginate
   * @param   {number} currentPage  Current page, NOTE 1-based
   * @param   {number} itemsPerPage Number of items per page
   * @param   {number} maxDispPages Max number of page numbers to display in page bar
   * @returns {object} new pager
   */
  function newPager(id, items, currentPage, itemsPerPage, maxDispPages) {
    return updatePager(id, items, currentPage, itemsPerPage, maxDispPages);
  }

  function delPager (id, flags) {
    return storeFactory.delObj(storeId(id), flags);
  }
  
  function getPager(id, flags) {
    return storeFactory.getObj(storeId(id), flags);
  }

  function updatePager(id, items, currentPage, itemsPerPage, maxDispPages) {
    var pager = configPager(id, items, currentPage, itemsPerPage, maxDispPages);
    return pager.setPage(pager.currentPage);
  }

  
  function configPager(id, items, currentPage, itemsPerPage, maxDispPages) {
    var pager = getPager(id);

    // default values
    items = valToUse(items, pager, 'items', []);
    currentPage = valToUse(currentPage, pager, 'currentPage', 1);
    itemsPerPage = valToUse(itemsPerPage, pager, 'itemsPerPage', 10);
    maxDispPages = valToUse(maxDispPages, pager, 'maxDispPages', 10);

    var totalItems = items.length,
      totalPages = Math.ceil(totalItems/itemsPerPage);
    if ((totalPages > 0) && (currentPage < 1)) {
      currentPage = 1;
    } else if (currentPage > totalPages) {
      currentPage = totalPages;
    }
    
    if (!pager) {
      pager = storeFactory.newObj(storeId(id), Pager);
    }
    pager.id = id;                    // id of object
    pager.items = items;              // base array of items
    pager.totalItems = totalItems;    // total number of items
    pager.currentPage = currentPage;  // current page
    pager.itemsPerPage = itemsPerPage;// items per page
    pager.maxDispPages = maxDispPages;// max number of pages in page window
    pager.totalPages = totalPages;    // total num of pages
    pager.startPage = currentPage;    // 1st page in page window
    pager.endPage = totalPages;       // last page in page window
    pager.startIndex = 0;             // start display index
    pager.endIndex = totalItems - 1;  // end display index
    pager.pages = [];                 // page nums to display
    pager.pageItems = [];             // page itgems to display

    return pager;
  }

  
  function valToUse (supplied, object, member, dflt) {
    var val;
    if (!supplied) {
      if (object) {
        val = object[member];
      } else {
        val = dflt;
      }
    } else {
      val = supplied;
    }
    return val;
  }
  
  /**
   * Add per page options to a scope
   * @param {object} scope     Scope to add to
   * @param {number} min       Min number per page
   * @param {number} step      Per page increment
   * @param {number} stepCnt   Number of options
   * @param {number} defltStep Which increment is the default option. NOTE zero-bases!
   */
  function addPerPageOptions (scope, min, step, stepCnt, defltStep) {
    var perPageOpt = [];
    
    for (var i = 0; i < stepCnt; ++i) {
      perPageOpt.push(min + (step * i));
      if (i === defltStep) {
        scope.perPage = perPageOpt[perPageOpt.length - 1];
      }
    }
    scope.perPageOpt = perPageOpt;
  }
  
}

function Pager(id, items, totalItems, currentPage, itemsPerPage, maxDispPages, totalPages, startPage, endPage, startIndex, endIndex, pages, pageItems) {
  this.id = id;                     // id of object
  this.items = items;               // base array of items
  this.totalItems = totalItems;     // total number of items
  this.currentPage = currentPage;   // current page
  this.itemsPerPage = itemsPerPage; // items per page
  this.maxDispPages = maxDispPages; // max number of pages in page window
  this.totalPages = totalPages;     // total num of pages
  this.startPage = startPage;       // 1st page in page window
  this.endPage = endPage;           // last page in page window
  this.startIndex = startIndex;     // start display index
  this.endIndex = endIndex;         // end display index
  this.pages = pages;               // page nums to display
  this.pageItems = pageItems;       // page itgems to display
}

Pager.prototype.toString = function pagerToString () {
  return 'Pager{ items: ' + this.propertyToString(this.items) +
  ', totalItems: ' + this.totalItems +
  ', currentPage: ' + this.currentPage +
  ', itemsPerPage: ' + this.itemsPerPage +
  ', maxDispPages: ' + this.maxDispPages +
  ', totalPages: ' + this.totalPages +
  ', startPage: ' + this.startPage +
  ', endPage: ' + this.endPage +
  ', startIndex: ' + this.startIndex +
  ', endIndex: ' + this.endIndex +
  ', pages: ' + this.propertyToString(this.pages) +
  ', pageItems: ' + this.propertyToString(this.pageItems) + '}';
};

/**
  * Wrapper for toString to prevent toString calls on undefined
  * @param {object} property object to call to String on
  * @returns {string} string representation
  */
Pager.prototype.propertyToString = function (property) {
  var str;
  if (property) {
    str = property.toString();
  } else {
    str = property;
  }
  return str;
};


Pager.prototype.setPage = function (newPage) {
  if ((newPage >= 1) && (newPage <= this.totalPages)) {
    var startPage,
      endPage;

    if (this.totalPages <= this.maxDispPages) {
      // display all pages
      startPage = 1;
      endPage = this.totalPages;
    } else {
      var middlePage = Math.floor(this.maxDispPages/2);
      if (newPage <= (middlePage + 1)) {  // 1st half of 1st page
        startPage = 1;
        endPage = this.maxDispPages;
      } else if ((newPage + middlePage - 1) >= this.totalPages) {  // last half of last page
        endPage = this.totalPages;
        startPage = endPage - this.maxDispPages +1;
      } else  {
        startPage = newPage - middlePage;
        endPage = startPage + this.maxDispPages - 1;
      }
    }
    this.startPage = startPage;
    this.endPage = endPage;
    this.currentPage = newPage;
    this.pages = getPageNumbers(startPage, endPage);

    this.startIndex = (newPage - 1) * this.itemsPerPage;
    this.endIndex = Math.min((this.startIndex + this.itemsPerPage), this.totalItems) - 1;

    this.pageItems = this.items.slice(this.startIndex, this.endIndex + 1);
  }
  return this;
};

Pager.prototype.setMaxDispPages = function (maxDispPages) {
  if (maxDispPages >= 1) {
    this.maxDispPages = maxDispPages;
    this.setPage(1);
  }
  return this;
};

Pager.prototype.setPerPage = function (perPage) {
  if (perPage >= 1) {
    this.totalPages = Math.ceil(this.totalItems / perPage);
    this.itemsPerPage = perPage;
    this.setPage(1);
  }
  return this;
};

Pager.prototype.stepPage = function (step) {
  return this.setPage(this.currentPage + step);
};

Pager.prototype.incPage = function () {
  return this.stepPage(1);
};

Pager.prototype.decPage = function () {
  return this.stepPage(-1);
};

function getPageNumbers(startPage, endPage) {
  var pages = [];
  for (var i = startPage; i <= endPage; ++i) {
    pages.push(i);
  }
  return pages;
}


/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .service('consoleService', consoleService);


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

consoleService.$inject = ['$injector', 'DBG'];

function consoleService($injector, DBG) {

  /*jshint validthis:true */
  this.getLogger = function (tag) {
    return $injector.instantiate(ConsoleLogger, {tag: tag});
  };
  
  /*jshint validthis:true */
  this.isEnabled = function (tag) {
    return DBG.isEnabled(getConsoleLoggerTag(tag));
  };
}

function getConsoleLoggerTag (tag) {
  if (tag.indexOf('dbg') === 0) {
    return tag;
  } else {
    return 'dbg' + tag;
  }
}

function ConsoleLogger(DBG, tag) {
  this.dbg = DBG;
  this.tag = getConsoleLoggerTag(tag);
}

ConsoleLogger.$inject = ['DBG', 'tag'];

ConsoleLogger.prototype.config = function (tag) {
  this.tag = getConsoleLoggerTag(tag);
};

ConsoleLogger.prototype.isEnabled = function () {
  return this.dbg.isEnabled(this.tag);
};

/**
 * General logger function 
 * NOTE: not to be called from outside ConsoleLogger object
 * @param {string} level Log level
 */
ConsoleLogger.prototype.loggerFunc = function (level) {
  if (this.isEnabled()) {
    // argument after level will be an array as called from log/debug etc.
    var args = [].concat(arguments[1]);
    args.unshift(this.tag);
    this.dbg[level].apply(this.dbg, args);
  }
};

ConsoleLogger.prototype.log = function () {
  this.loggerFunc('log', Array.prototype.slice.call(arguments));
};

ConsoleLogger.prototype.debug = function () {
  this.loggerFunc('debug', Array.prototype.slice.call(arguments));
};

ConsoleLogger.prototype.info = function () {
  this.loggerFunc('info', Array.prototype.slice.call(arguments));
};

ConsoleLogger.prototype.warn = function () {
  this.loggerFunc('warn', Array.prototype.slice.call(arguments));
};

ConsoleLogger.prototype.error = function () {
  this.loggerFunc('error', Array.prototype.slice.call(arguments));
};

ConsoleLogger.prototype.objToString = function (obj) {
  var str = '';
  for (var prop in obj) {
    if (hasProperty(obj, prop)) {
      if (str) {
        str += ', ';
      }
      str += prop + ': ' + obj[prop];
    }
  }
  return '{' + str + '}';
};

/*jslint node: true */
'use strict';

angular.module('ct.clientCommon')

  .factory('timerFactory', TimerFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

TimerFactory.$inject = ['$timeout', 'USER'];

function TimerFactory($timeout, USER) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      addTimeout: addTimeout,
      getTimerDuration: getTimerDuration,
      decodeTimerConfigSetting: decodeTimerConfigSetting,

      DURATION: {
        LENGTH: 'len',
        TOKEN_PERCENT: 'token%',  // duration is percentage of token life (e.g. 0.5=50%)
        TOKEN_MINUS: 'token-',    // duration is token life minus amount
        TOKEN_PLUS: 'token+',     // duration is token life plus amount
        TOKEN_DIVIDE: 'token/',   // duration is token life divided by amount
        TOKEN_MULTIPLY: 'token*'  // duration is token life multiplied by amount
      }
    },
    UNITS = [ 
      { designator: 'ms', factor: 1 },      // msec
      { designator: 's', factor: 1000 },    // sec
      { designator: 'm', factor: 60000 },   // min
      { designator: 'h', factor: 3600000 }  // hour
    ];

  return factory;

  /* function implementation
    -------------------------- */
  
  /**
   * Add a timout
   * @param {object}        data  Timeout properties object:
   * @param {number|string} value Countdown duration in the form:
   *                              number - msec value
   *                              string - text representation, e.g. '1ms', '1s', '1m', '1h', '0.5'
   * @param {string}        type  Duration type; @see factory.DURATION
   * @param {function}      fn    Function to delay execution of
   * @returns {object}        timeout promise
   */
  function addTimeout (data) {
    var promise;
    if (data) {
      var duration = getTimerDuration(data);
      if (duration > 0) {
        promise = $timeout(data.fn, duration);
      } else {
        // call immediately
        data.fn();
      }
    }
    return promise;
  }

  /**
   * Get the value for a timer in msec
   * @param {object|string} data  Timeout properties object or config string
   * @returns {object} duration in msec
   */
  function getTimerDuration (data) {
    var duration,
      param;
    if (data) {
      if (typeof data === 'string') {
        param = decodeTimerConfigSetting (data);
      } else {
        param = data;
      }
      if (param) {
        var value,
          unit;
        if (typeof data.value === 'number') {
          value = data.value;
        } else if (typeof data.value === 'string') {
          unit = UNITS.find(function (chk) {
            var position = this.length - chk.designator.length,
              lastIndex = this.lastIndexOf(chk.designator, position);
            return lastIndex !== -1 && lastIndex === position;
          }, data.value);
          value = parseFloat(data.value);
          if (unit) {
            value *= unit.factor;  // convert to msec
          }
        }

        switch (data.type) {
          case factory.DURATION.LENGTH:
            duration = value;
            break;
          case factory.DURATION.TOKEN_PERCENT:
            duration = USER.sessionLength * value;
            break;
          case factory.DURATION.TOKEN_MINUS:
            duration = USER.sessionLength - value;
            break;
          case factory.DURATION.TOKEN_PLUS:
            duration = USER.sessionLength + value;
            break;
          case factory.DURATION.TOKEN_DIVIDE:
            duration = USER.sessionLength / value;
            break;
          case factory.DURATION.TOKEN_MULTIPLY:
            duration = USER.sessionLength / value;
            break;
        }
        if (duration) {
          duration = Math.floor(duration);
        }
      }
    }
    return duration;
  }

  /**
   * Decode a timer config setting in the form '<<type>><<value>>', e.g. 'len10s' for 10sec
   * @param   {string} config Config string to decode
   * @returns {object} decoded value as 
   * @param {string} type of timer
   * @param {string} valur for timer
   */
  function decodeTimerConfigSetting (config) {
    var param,
      duration = Object.getOwnPropertyNames(factory.DURATION).find(
        function (prop) {
          return (config.indexOf(factory.DURATION[prop]) === 0);
        });
    if (duration) {
      duration = factory.DURATION[duration];
      param = {
        type: duration,
        value: config.substr(duration.length)
      };
    }
    return param;
  }
  

}


/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .factory('undoFactory', undoFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

undoFactory.$inject = ['$injector', 'consoleService', 'miscUtilFactory'];

function undoFactory ($injector, consoleService, miscUtilFactory) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    NAME: 'undoFactory',
    newUndoStack: newUndoStack,
    newUndoStep: newUndoStep
  };
  
  /* function implementation
    -------------------------- */

  /**
   * Create a new UndoStack object
   * @returns {object} new UndoStack object
   */
  function newUndoStack () {
    return $injector.instantiate(UndoStack);
  }
  
  /**
   * Create a new UndoStep object
   * @throws {Error} Missing arguments
   * @param   {function} func Function to execute to do the undo
   * @returns {object}   UndoStep object
   */
  function newUndoStep (func) {
    if (!func) {
      throw new Error('Missing argument: schema');
    }
    return $injector.instantiate(UndoStep, {
      func: func
    });
  }
  
  
  function initUndoStack (stack) {
    stack.array = [];
    stack.size = 0;
    stack.multiInProgress = false;  // multi step entry in progress
  }
  

  /**
   * Configurable object to compare schema fields
   */
  function UndoStack () {
    initUndoStack(this);
  }

  UndoStack.$inject = [];

  function undoStepTypeCheck (entry) {
    if (!entry.isUndoStep) {
      throw new TypeError('Unsupported object type');
    }
  }

  function multiStepInProgressCheck (stack, require) {
    if (stack.multiInProgress !== require) {
      var msg = 'Multi-step entry ';
      if (require) {
        msg += 'not ';
      }
      msg += 'in progress';
      throw new Error(msg);
    }
  }
  
  /**
   * Format an entry to add to the stack
   * @param {object|array} entry Entry/array of entries to add
   * @returns {array} Entry to add
   */
  function getEntryToAdd (entry) {
    var toAdd;

    if (Array.isArray(entry)) {
      if (entry.length) {
        entry.forEach(function (element) {
          undoStepTypeCheck(element);
        });
        toAdd = entry;
      }
    } else {
      undoStepTypeCheck(entry);
      toAdd = [entry];
    }

    return toAdd;
  }

  /**
   * Push an entry to the end of the stack
   * @param {object|array} entry Entry/array of entries to add
   * @returns {number} current length of stack
   */
  UndoStack.prototype.push = function (entry) {

    multiStepInProgressCheck(this, false);

    var toAdd,
      len;

    if (entry !== undefined) {
      toAdd = getEntryToAdd(entry);
      if (toAdd) {
        len = this.array.push(toAdd);
        this.size = len;
      }
    }
    return len;
  };

  /**
   * Start a multi-step entry on the stack
   * @returns {number} current position in stack
   */
  UndoStack.prototype.startMultiStep = function () {
    multiStepInProgressCheck(this, false);

    this.multiInProgress = true;
    return this.array.push([]);
  };

  /**
   * Add a step to a multi-step entry on the stack
   * @param {object} step Step to add
   * @returns {number} number of steps in entry
   */
  UndoStack.prototype.addStep = function (step) {
    multiStepInProgressCheck(this, true);

    var toAdd,
      len;

    if (step !== undefined) {
      toAdd = getEntryToAdd(step);
      if (toAdd) {
        len = this.array[this.array.length - 1].push(toAdd);
        this.size = this.array.length;
      }
    }
    return len;
  };

  /**
   * End a multi-step entry on the stack
   */
  UndoStack.prototype.endMultiStep = function () {
    this.multiInProgress = false;
    if (this.array[this.array.length - 1].length === 0) {
      // no steps
      this.array.pop();
    }
  };

  
  /**
   * Clear the stack
   */
  UndoStack.prototype.clear = function () {
    initUndoStack(this);
  };

  /**
   * Undo the specified number of entries from the stack
   * @param {number} steps  Number of steps to undo, or all if not passed
   * @returns {number} New length of atack
   */
  UndoStack.prototype.undo = function (steps) {

    multiStepInProgressCheck(this, false);

    processUndo(this.array, steps);
    return (this.size = this.array.length);
  };

  function processUndo (array, steps) {

    var cnt = miscUtilFactory.toInteger(steps) || array.length,
      popped;
    if (cnt > array.length) {
      cnt = array.length;
    }

    while (cnt > 0) {
      popped = array.pop();
      if (popped) {
        if (Array.isArray(popped)) {
          processUndo(popped);  // undo all
        } else {
          popped.execute();
        }
      }
      --cnt;
    }
    return array.length;
  }


  /**
   * Canvasser/address undo link object
   * @param {object}   canvasser Canvasser to unlink
   * @param {object}   address   Address to unlink
   * @param {function} func      Undo function
   */
  function UndoStep (func) {
    this.func = func;
  }

  UndoStep.$inject = ['func'];

  UndoStep.prototype.isUndoStep = true;
  
  /**
   * Execute the canvasser/address undo
   */
  UndoStep.prototype.execute = function () {
    if (this.func) {
      this.func();
    }
  };
  
  
  
  // need the return here so that object prototype functions are added
  return factory;
}



/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .value('USER', {
    authenticated: false,
    token: undefined,
    expires: undefined,     // time & date string
    sessionLength: 0,       // session length in millisec
    expired: false,
    fromStore: false,

    // access properties
    // NOTE: need to match ACCESS.VOTINGSYS etc. from cliemt.module.js
    votingsysPriv: 0,
    rolesPriv: 0,
    usersPriv: 0,
    electionsPriv: 0,
    candidatesPriv: 0,
    canvassesPriv: 0,
    noticePriv: 0,

    // mirroring user model properties
    id: '',
    username: '',
    role: undefined,
    person: undefined
  })
  .constant('AUTH_KEYS', (function () {
    return {
      TOKEN_KEY: 'canvasstraccredentials',  // object key for user credentials
      USERINFO_KEY: 'canvasstracuserinfo'   // object key for user info
    };
  }()))
  .factory('authFactory', AuthFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

AuthFactory.$inject = ['$resource', '$http', '$cookies', '$timeout', 'localStore', 'baseURL', 'miscUtilFactory', 'timerFactory', 'AUTH_KEYS', 'USER', 'APPCODE', 'ACCESS'];

function AuthFactory($resource, $http, $cookies, $timeout, localStore, baseURL, miscUtilFactory, timerFactory, AUTH_KEYS, USER, APPCODE, ACCESS) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      login: login,
      logout: logout,
      register: register,
      loginByFacebook: loginByFacebook,
      tokenRefresh: tokenRefresh,
      checkForAuthError: checkForAuthError,
      getUserinfo: getUserinfo,
      isAuthenticated: isAuthenticated,
      getUsername: getUsername,
      getUserId: getUserId,
      storeUserinfo: storeUserinfo,
      removeUserinfo: removeUserinfo,
      hasAccess: hasAccess,
      isAccess: isAccess,
      SRC: {
        WEB: 'web',
        MOBILE: 'mobile'
      }
    },
    menuAccessProperties = [
      ACCESS.VOTINGSYS,
      ACCESS.ROLES,
      ACCESS.USERS,
      ACCESS.ELECTIONS,
      ACCESS.CANDIDATES,
      ACCESS.CANVASSES,
      ACCESS.NOTICES
    ],
    responseProperties = menuAccessProperties.concat([
      'token',
      'expires',
      'id'
    ]),
    credentialProperties = responseProperties.concat('username'),
    stateProperties = credentialProperties.concat('sessionLength'),
    crud = [
      { chr: 'c', bit: ACCESS.ACCESS_CREATE },
      { chr: 'r', bit: ACCESS.ACCESS_READ },
      { chr: 'u', bit: ACCESS.ACCESS_UPDATE },
      { chr: 'd', bit: ACCESS.ACCESS_DELETE },
      { chr: 'b', bit: ACCESS.ACCESS_BATCH }
    ],
    a1o = [
      { chr: 'a', bit: ACCESS.ACCESS_ALL },
      { chr: '1', bit: ACCESS.ACCESS_ONE },
      { chr: 'o', bit: ACCESS.ACCESS_OWN }
    ];

  loadUserCredentials();

  return factory;

  /* function implementation
    -------------------------- */
  
  function useCredentials(credentials, fromStore) {
    var authenticated = false,
      expiry,
      state;

    fromStore = fromStore || false;

    if (!miscUtilFactory.isEmpty(credentials)) {
      // check for expired
      authenticated = !credentialsExpired(credentials.expires);
      if (!authenticated) {
        destroyUserCredentials('stored');
        fromStore = false;
      }
    } else {
      fromStore = false;
    }

    state = {
      username: '',
      token: undefined,
      expires: undefined,
      sessionLength: 0,
      id: ''
    };
    menuAccessProperties.forEach(function (prop) {
      state[prop] = 0;
    });
    if (authenticated) {
      expiry = new Date(credentials.expires);

      miscUtilFactory.copyProperties(credentials, state, credentialProperties);
      state.sessionLength = expiry.getTime() - Date.now();
    }
    // update value
    USER.authenticated = authenticated;
    USER.expired = !authenticated;
    USER.fromStore = fromStore;
    miscUtilFactory.copyProperties(state, USER, stateProperties);

    // Set the token as header for your requests!
    $http.defaults.headers.common['x-access-token'] = state.token;

  }

  function credentialsExpired (expires) {
    var expired = true;
    if (expires) {
      // check for expired
      var expiry = new Date(expires);
      expired = (Date.now() >= expiry.getTime());
    }
    return expired;
  }

  function destroyUserCredentials (level) {
    if (level !== 'stored') {
      useCredentials(undefined);
    }
    removeStored(AUTH_KEYS.TOKEN_KEY);    
  }

  function removeStored (key) {
    if (localStore.isAvailable()) {
      localStore.remove(key);
    }
    $cookies.remove(key);    
  }

  function removeUserinfo () {
    removeStored(AUTH_KEYS.USERINFO_KEY);
  }

  function loadUserCredentials () {
    var credentials = loadStored(AUTH_KEYS.TOKEN_KEY);
    useCredentials(credentials, true);
  }

  function loadStored (key) {
    var stored;
    if (localStore.isAvailable()) {
      stored = localStore.getObject(key, '{}');
    }
    if (miscUtilFactory.isEmpty(stored)) {
      stored = $cookies.getObject(key);
      if (stored === undefined) {
        stored = {};
      }
    }
    return stored;
  }

  function getUserinfo() {
    return loadStored(AUTH_KEYS.USERINFO_KEY);
  }

  function storeUserCredentials (credentials) {
    store(AUTH_KEYS.TOKEN_KEY, credentials, credentials.expires);
  }

  function store (key, obj, expires) {
    if (localStore.isAvailable()) {
      localStore.storeObject(key, obj);
    } else {
      var options;
      if (expires) {
        options = {
          expires: expires
        };
      }
      $cookies.putObject(key, obj, expires);
    }
  }

  function storeUserinfo (loginData) {
    // only save username
    store(AUTH_KEYS.USERINFO_KEY, { username: loginData.username });
  }


  function loginSuccess (loginData, response) {
    
    var credentials = miscUtilFactory.copyProperties(response, {
      username: loginData.username
    }, responseProperties);

    if (loginData.rememberMe) {
      storeUserinfo(loginData);
    } else {
      removeUserinfo();
    }
    storeUserCredentials(credentials);
    useCredentials(credentials);

    timerFactory.addTimeout(loginData.timeout);
  }

  function refreshSuccess (response) {
    var credentials = loadStored(AUTH_KEYS.TOKEN_KEY);
    
    credentials.token = response.token;
    credentials.expires = response.expires;
    
    storeUserCredentials(credentials);
    useCredentials(credentials);
  }

  function loginFailure (/*response*/) {
    destroyUserCredentials();
  }

  function userUrl (fxn) {
    return baseURL + 'users/' + fxn;
  }

  function login (loginData, success, failure) {
    $resource(userUrl('login'))
      .save(loginData,
        function (response) {
          // success response
          loginSuccess(loginData, response);
      
          if (success) {
            success(response);
          }
        },
        function (response) {
          // error response
          loginFailure(response);

          if (failure) {
            failure(response);
          }
        }
      );
  }

  function tokenRefresh (success, failure) {
    $resource(userUrl('token') + '/:id', {id:'@id'}, null)
      .get({ id: USER.id, src: factory.SRC.WEB },
        function (response) {
          // success response
          refreshSuccess(response);
      
          if (success) {
            success(response);
          }
        },
        function (response) {
          // error response
          checkForAuthError(response);

          if (failure) {
            failure(response);
          }
        }
      );
  }

  function checkForAuthError (response) {
    // error response
    var wasErr = false,
      appCode = miscUtilFactory.readSafe(response, ['data','error','appCode']);
    if (APPCODE.IS_TOKEN_APPERR(appCode)) {
      // any token error on a refresh shuts the shop
      destroyUserCredentials();
      wasErr = true;
    }
    return wasErr;
  }

  function logout (success, failure) {
    $resource(userUrl('logout'))
      .get(function (response) {
        if (success) {
          success(response);
        }
      },
      function (response) {
        if (failure) {
          failure(response);
        }
      });
    destroyUserCredentials();
  }

  function register (registerData, success, failure) {
    $resource(userUrl('register'))
      .save(registerData, function (response) {
        // success response
        var loginData = { username: registerData.username, password: registerData.password };
        factory.login(loginData);
        if (registerData.rememberMe) {
          factory.storeUserinfo(loginData);
        }

        if (success) {
          success(response);
        }
      },
      function (response) {
        // error response
        if (failure) {
          failure(response);
        }
      });
  }

  function loginByFacebook (loginData, success, failure) {
    $resource(userUrl('facebook'))
      .get({},
        function (response) {
          // success response
      
          console.log('success' , response);
      
          // TODO username from facebook login
      
          loginSuccess(loginData.username, response);
      
          if (success) {
            success(response);
          }
        },
        function (response) {
          // error response
          loginFailure(response);

          if (failure) {
            failure(response);
          }
        }
      );
  }
  
  
  /**
   * Get an access setting for a menu
   * @param   {string} menu  Menu name
   * @param   {number} group Access group
   * @returns {number} Access setting
   */
  function getAccess (menu, group) {
    /* menu access privileges take the form similar to linux permissions
      i.e. crudb bits for each group, 
      e.g. 00100 00010 00001 (0x1041) is all group create, one group read & own group update */
    var access = ACCESS.ACCESS_NONE,
      privileges = menuAccessProperties.find(function (name) {
        return (name === menu);
      });
    if (privileges) {
      privileges = USER[privileges] || ACCESS.ACCESS_NONE;
      for (var bit = (group & ACCESS.ACCESS_GROUPMASK); bit; bit >>>= 1) {
        if (bit & 0x01) {
          access = privileges & ACCESS.ACCESS_MASK;
          break;
        }
        privileges >>>= ACCESS.ACCESS_BIT_COUNT;  // next group
      }
    }
    return access;
  }

  /**
   * Access test
   * @param   {string}  menu  Name of menu to test access for
   * @param   {number}  group Access group
   * @param   {number}  mask  Mask to test for
   * @param   {boolean} exact Match criteria; true=exact, false=any
   * @returns {boolean} true if access matches 
   */
  function accessTest (menu, group, mask, exact) {
    var result = false,
      testMask = (mask & ACCESS.ACCESS_MASK),
      access;

    for (var bit = 0x01; (bit & ACCESS.ACCESS_GROUPMASK); bit <<= 1) {
      if (bit & group) {
        access = getAccess(menu, bit) & testMask;
        if (exact) {
          result = (access === testMask); // exact match test
          if (!result) {
            break;
          }
        } else {
          if (access !== 0) { // bit match test
            result = true;
          }
        }
      }
    }
    return result;
  }

  /**
   * Has access (i.e. at least one privilege) test
   * @param   {string}  menu  Name of menu to test access for
   * @param   {string}  group Access group; 'a'=all, '1'=one or 'o'=own
   * @param   {string}  ops   Operations; 'c'=create, 'r'=read, 'u'=update & 'd'=delete
   * @returns {boolean} true if has access
   */
  function hasAccess (menu, group, ops) {
    return accessTest(menu, valToMask(group, a1o), valToMask(ops, crud), false);
  }

  /**
   * Is access (i.e. all privilege) test
   * @param   {string}  menu  Name of menu to test access for
   * @param   {string}  group Access group; 'a'=all, '1'=one or 'o'=own
   * @param   {string}  ops   Operations; 'c'=create, 'r'=read, 'u'=update & 'd'=delete
   * @returns {boolean} true if has access
   */
  function isAccess (menu, group, ops) {
    return accessTest(menu, valToMask(group, a1o), valToMask(ops, crud), true);
  }

  /**
   * Convert a string value to a mask
   * @param   {string} val   Value to convert
   * @param   {Array}  cvals Convert values array
   * @returns {number} mask
   */
  function valToMask (val, cvals) {
    var lval = val.toLowerCase(),
      mask = 0;
    cvals.forEach(function (cval) {
      if (lval.indexOf(cval.chr) >= 0) {
        mask |= cval.bit;
      }
    });
    return mask;
  }

  /**
   * Convenience method to check if user is authenticated
   * @returns {boolean} true if authenticated
   */
  function isAuthenticated() {
    return USER.authenticated;
  }

  /**
   * Convenience method to get user's username
   * @returns {string} 
   */
  function getUsername() {
    return USER.username;
  }

  /**
   * Convenience method to get user's id
   * @returns {string} 
   */
  function getUserId() {
    return USER.id;
  }
  
  
}


/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', function ($provide, schemaProvider, SCHEMA_CONST) {

    var details = [
        SCHEMA_CONST.ID,
        schemaProvider.getStringModelPropArgs('addrLine1', { field: 'ADDR1' }),
        schemaProvider.getStringModelPropArgs('addrLine2', { field: 'ADDR2' }),
        schemaProvider.getStringModelPropArgs('addrLine3', { field: 'ADDR3' }),
        schemaProvider.getStringModelPropArgs('town', { field: 'TOWN' }),
        schemaProvider.getStringModelPropArgs('city', { field: 'CITY' }),
        schemaProvider.getStringModelPropArgs('county', { field: 'COUNTY' }),
        schemaProvider.getStringModelPropArgs('state', { field: 'STATE' }),
        schemaProvider.getStringModelPropArgs('country', { field: 'COUNTRY' }),
        schemaProvider.getStringModelPropArgs('postcode', { field: 'PCODE' }),
        schemaProvider.getStringModelPropArgs('gps', { field: 'GPS' }),
        schemaProvider.getObjectIdModelPropArgs('votingDistrict', undefined, undefined, undefined, undefined, { field: 'VOTEDIST' }),
        schemaProvider.getObjectIdModelPropArgs('owner', undefined, undefined, undefined, undefined, { field: 'OWNER' })
      ],
      ids = {},
      modelProps = [];

    for (var i = 0; i < details.length; ++i) {
      ids[details[i].field] = i;          // id is index

      var args = angular.copy(details[i]);
      args.id = i;
      modelProps.push(schemaProvider.getModelPropObject(args));
    }

    var ID_TAG = SCHEMA_CONST.MAKE_ID_TAG('addrs'),
      schema = schemaProvider.getSchema('Address', modelProps, ids, ID_TAG),
      ADDRESS_ADDR_IDX = 
        schema.addFieldFromModelProp('addr', 'Address', [ids.ADDR1, ids.ADDR2, ids.ADDR3]),
      ADDRESS_TOWN_IDX = 
        schema.addFieldFromModelProp('town', 'Town', ids.TOWN),
      ADDRESS_CITY_IDX = 
        schema.addFieldFromModelProp('city', 'City', ids.CITY),
      ADDRESS_COUNTY_IDX = 
        schema.addFieldFromModelProp('county', 'County', ids.COUNTY),
      ADDRESS_STATE_IDX = 
        schema.addFieldFromModelProp('state', 'State', ids.STATE),
      ADDRESS_POSTCODE_IDX =
        schema.addFieldFromModelProp('postcode', 'Postcode', ids.PCODE),
      ADDRESS_GPS_IDX =
        schema.addFieldFromModelProp('gps', 'GPS', ids.GPS),

      // generate list of sort options
      sortOptions = schemaProvider.makeSortList(schema, 
        [ADDRESS_ADDR_IDX, ADDRESS_TOWN_IDX, ADDRESS_CITY_IDX, ADDRESS_COUNTY_IDX, ADDRESS_STATE_IDX, ADDRESS_POSTCODE_IDX], 
        ID_TAG);

    $provide.constant('ADDRSCHEMA', {
      IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
      MODELPROPS: modelProps,

      SCHEMA: schema,
      // row indices
      ADDRESS_ADDR_IDX: ADDRESS_ADDR_IDX,
      ADDRESS_TOWN_IDX: ADDRESS_TOWN_IDX,
      ADDRESS_CITY_IDX: ADDRESS_CITY_IDX,
      ADDRESS_COUNTY_IDX: ADDRESS_COUNTY_IDX,
      ADDRESS_STATE_IDX: ADDRESS_STATE_IDX,
      ADDRESS_POSTCODE_IDX: ADDRESS_POSTCODE_IDX,
      ADDRESS_GPS_IDX: ADDRESS_GPS_IDX,

      SORT_OPTIONS: sortOptions,
      ID_TAG: ID_TAG
    });
  }])

  .factory('addressFactory', addressFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

addressFactory.$inject = ['$filter', '$injector', 'baseURL', 'consoleService', 'storeFactory', 'resourceFactory', 'compareFactory', 'filterFactory', 'miscUtilFactory', 'SCHEMA_CONST', 'ADDRSCHEMA'];

function addressFactory($filter, $injector, baseURL, consoleService, storeFactory, resourceFactory, compareFactory, filterFactory, miscUtilFactory, SCHEMA_CONST, ADDRSCHEMA) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'addressFactory',

      readRspObject: readRspObject,

      getSortFunction: getSortFunction,
      stringifyAddress: stringifyAddress
    },
    con = consoleService.getLogger(factory.NAME);

  resourceFactory.registerStandardFactory(factory.NAME, {
    storeId: ADDRSCHEMA.ID_TAG,
    schema: ADDRSCHEMA.SCHEMA,
    sortOptions: ADDRSCHEMA.SORT_OPTIONS,
    addInterface: factory, // add standard factory functions to this factory
    resources: {
      address: resourceFactory.getResourceConfigWithId('addresses'),
      count: resourceFactory.getResourceConfig('addresses/count')
    }
  });
  
  return factory;

  /* function implementation
    -------------------------- */

  /**
   * Read a server response address object
   * @param {object} response   Server response
   * @param {object} args       arguments object
   *                            @see Schema.readProperty() for details
   * @returns {object}  Address object
   */
  function readRspObject (response, args) {
    if (!args) {
      args = {};
    }
    // no conversions required by default
    //    if (!args.convert) {
    //      args.convert = readRspObjectValueConvert;
    //    }
    // add resources required by Schema object
    resourceFactory.addResourcesToArgs(args);

    var stdArgs = resourceFactory.standardiseArgs(args),
      object = ADDRSCHEMA.SCHEMA.read(response, stdArgs);

    con.debug('Read address rsp object: ' + object);

    return object;
  }

  function getSortFunction (options, sortBy) {
    var sortFxn = resourceFactory.getSortFunction(options, sortBy);
    if (typeof sortFxn === 'object') {
      var sortItem = SCHEMA_CONST.DECODE_SORT_ITEM_ID(sortFxn.id);
      if (sortItem.idTag === ADDRSCHEMA.ID_TAG) {
        switch (sortItem.index) {
          case ADDRSCHEMA.ADDRESS_ADDR_IDX:
            sortFxn = compareAddress;
            break;
          case ADDRSCHEMA.ADDRESS_TOWN_IDX:
            sortFxn = compareTown;
            break;
          case ADDRSCHEMA.ADDRESS_CITY_IDX:
            sortFxn = compareCity;
            break;
          case ADDRSCHEMA.ADDRESS_COUNTY_IDX:
            sortFxn = compareCounty;
            break;
          case ADDRSCHEMA.ADDRESS_STATE_IDX:
            sortFxn = compareState;
            break;
          case ADDRSCHEMA.ADDRESS_POSTCODE_IDX:
            sortFxn = comparePostcode;
            break;
          default:
            sortFxn = undefined;
            break;
        }
      }
    }
    return sortFxn;
  }

  function compareStringFields (idx, a, b) {
    return compareFactory.compareStringFields(ADDRSCHEMA.SCHEMA, idx, a, b);
  }

  function compareAddress (a, b) {
    return compareStringFields(ADDRSCHEMA.ADDRESS_ADDR_IDX, a, b);
  }

  function compareTown (a, b) {
    return compareStringFields(ADDRSCHEMA.ADDRESS_TOWN_IDX, a, b);
  }

  function compareCity (a, b) {
    return compareStringFields(ADDRSCHEMA.ADDRESS_CITY_IDX, a, b);
  }

  function compareCounty (a, b) {
    return compareStringFields(ADDRSCHEMA.ADDRESS_COUNTY_IDX, a, b);
  }

  function compareState (a, b) {
    return compareStringFields(ADDRSCHEMA.ADDRESS_STATE_IDX, a, b);
  }

  function comparePostcode (a, b) {
    return compareStringFields(ADDRSCHEMA.ADDRESS_POSTCODE_IDX, a, b);
  }

  function stringifyAddress (addr, join) {
    if (!join) {
      join = ', ';
    }
    var str = '';
    factory.forEachSchemaField(function (fieldProp) {
      fieldProp[SCHEMA_CONST.MODEL_PROP].forEach(function (property) {
        if (addr[property]) {
          var value = addr[property].trim();
          if (str) {
            str += join;
          }
          str += value;
        }
      });
    });
    return str;
  }

}





/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', 'ADDRSCHEMA', function ($provide, schemaProvider, SCHEMA_CONST, ADDRSCHEMA) {

    var details = [
        SCHEMA_CONST.ID,
        schemaProvider.getStringModelPropArgs('firstname', { field: 'FNAME' }),
        schemaProvider.getStringModelPropArgs('lastname', { field: 'LNAME' }),
        schemaProvider.getStringModelPropArgs('note', { field: 'NOTE' }),
        schemaProvider.getObjectIdModelPropArgs('address', 'addressFactory', 'address', ADDRSCHEMA, ADDRSCHEMA.IDs.ID, { field: 'ADDR' }),
        schemaProvider.getObjectIdModelPropArgs('contactDetails', undefined, undefined, undefined, undefined,  { field: 'CONTACT' }),
        schemaProvider.getObjectIdModelPropArgs('owner', undefined, undefined, undefined, undefined, { field: 'OWNER' })
      ],
      ids = {},
      modelProps = [];

    for (var i = 0; i < details.length; ++i) {
      ids[details[i].field] = i;          // id is index

      var args = angular.copy(details[i]);
      args.id = i;
      modelProps.push(schemaProvider.getModelPropObject(args));
    }

    var ID_TAG = SCHEMA_CONST.MAKE_ID_TAG('people'),
      schema = schemaProvider.getSchema('Person', modelProps, ids, ID_TAG),
      PEOPLE_FNAME_IDX =
        schema.addFieldFromModelProp('fname', 'Firstname', ids.FNAME),
      PEOPLE_LNAME_IDX =
        schema.addFieldFromModelProp('lname', 'Lastname', ids.LNAME),

      // generate list of sort options
      sortOptions = schemaProvider.makeSortList(schema, 
        [PEOPLE_FNAME_IDX, PEOPLE_LNAME_IDX], 
        ID_TAG);

    $provide.constant('PEOPLESCHEMA', {
      IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
      MODELPROPS: modelProps,

      SCHEMA: schema,
      // row indices
      PEOPLE_FNAME_IDX: PEOPLE_FNAME_IDX,
      PEOPLE_LNAME_IDX: PEOPLE_LNAME_IDX,

      SORT_OPTIONS: sortOptions,
      ID_TAG: ID_TAG
    });
  }])

  .factory('peopleFactory', peopleFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

peopleFactory.$inject = ['baseURL', 'storeFactory', 'resourceFactory', 'compareFactory', 'filterFactory', 'SCHEMA_CONST', 'PEOPLESCHEMA'];

function peopleFactory (baseURL, storeFactory, resourceFactory, compareFactory, filterFactory, SCHEMA_CONST, PEOPLESCHEMA) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    NAME: 'peopleFactory',
    getSortFunction: getSortFunction
  };

  resourceFactory.registerStandardFactory(factory.NAME, {
    storeId: PEOPLESCHEMA.ID_TAG,
    schema: PEOPLESCHEMA.SCHEMA,
    sortOptions: PEOPLESCHEMA.SORT_OPTIONS,
    addInterface: factory, // add standard factory functions to this factory
    resources: {
      person: resourceFactory.getResourceConfigWithId('people'),
      count: resourceFactory.getResourceConfig('people/count')
    }
  });
  
  return factory;

  /* function implementation
    -------------------------- */

  function getSortFunction (options, sortBy) {
    var sortFxn = resourceFactory.getSortFunction(options, sortBy);
    if (typeof sortFxn === 'object') {
      var sortItem = SCHEMA_CONST.DECODE_SORT_ITEM_ID(sortFxn.id);
      if (sortItem.idTag === PEOPLESCHEMA.ID_TAG) {
        switch (sortItem.index) {
          case PEOPLESCHEMA.PEOPLE_FNAME_IDX:
            sortFxn = compareFname;
            break;
          case PEOPLESCHEMA.PEOPLE_LNAME_IDX:
            sortFxn = compareLname;
            break;
          default:
            sortFxn = undefined;
            break;
        }
      }
    }
    return sortFxn;
  }

  function compareFname (a, b) {
    return compareFactory.compareStringFields(PEOPLESCHEMA.SCHEMA, PEOPLESCHEMA.PEOPLE_FNAME_IDX, a, b);
  }

  function compareLname (a, b) {
    return compareFactory.compareStringFields(PEOPLESCHEMA.SCHEMA, PEOPLESCHEMA.PEOPLE_LNAME_IDX, a, b);
  }


}


  


/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .constant('ROLES', (function() {
    return {
      // level definitions for Roles from server
      ROLE_ADMIN: 100,      // admin level access
      ROLE_MANAGER: 90,     // manager level access
      ROLE_GROUP_LEAD: 80,  // group leader level access
      ROLE_STAFF: 70,       // staff level access
      ROLE_CANVASSER: 60,   // canvasser level access
      ROLE_NONE: 0          // public level access
    };
  })())

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', 'ROLES', function ($provide, schemaProvider, SCHEMA_CONST, ROLES) {

    var details = [
        SCHEMA_CONST.ID,
        schemaProvider.getStringModelPropArgs('name', { field: 'NAME' }),
        schemaProvider.getNumberModelPropArgs('level', ROLES.ROLE_NONE, { field: 'LEVEL' })
      ],
      ids = {},
      modelProps = [];

    for (var i = 0; i < details.length; ++i) {
      ids[details[i].field] = i;          // id is index

      var args = angular.copy(details[i]);
      args.id = i;
      
      modelProps.push(schemaProvider.getModelPropObject(args));
    }

    var ID_TAG = SCHEMA_CONST.MAKE_ID_TAG('role'),
      schema = schemaProvider.getSchema('Role', modelProps, ids, ID_TAG),
      ROLE_NAME_IDX =
        schema.addFieldFromModelProp('name', 'Name', ids.NAME),
      ROLE_LEVEL_IDX =
        schema.addFieldFromModelProp('level', 'Level', ids.LEVEL),

      // generate list of sort options
      sortOptions = schemaProvider.makeSortList(schema, 
        [ROLE_NAME_IDX, ROLE_LEVEL_IDX],
        ID_TAG);

    $provide.constant('ROLESCHEMA', {
      IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
      MODELPROPS: modelProps,

      SCHEMA: schema,
      // row indices
      ROLE_NAME_IDX: ROLE_NAME_IDX,
      ROLE_LEVEL_IDX: ROLE_LEVEL_IDX,

      SORT_OPTIONS: sortOptions,
      ID_TAG: ID_TAG
    });
  }])


  .factory('roleFactory', roleFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

roleFactory.$inject = ['SCHEMA_CONST', 'ROLESCHEMA', 'resourceFactory'];

function roleFactory (SCHEMA_CONST, ROLESCHEMA, resourceFactory) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    NAME: 'roleFactory',
    readRspObject: readRspObject
  };
  
  resourceFactory.registerStandardFactory(factory.NAME, {
    storeId: ROLESCHEMA.ID_TAG,
    schema: ROLESCHEMA.SCHEMA,
    addInterface: factory, // add standard factory functions to this factory
    resources: {
      role: resourceFactory.getResourceConfig('roles')
    }
  });

  return factory;

  /* function implementation
    -------------------------- */

  /**
   * Read a server response canvass object
   * @param {object} response   Server response
   * @param {object} args       arguments object
   *                            @see Schema.readProperty() for details
   * @returns {object}  Canvass object
   */
  function readRspObject (response, args) {
    if (!args) {
      args = {};
    }
    //    if (!args.convert) {
    //      args.convert = readRspObjectValueConvert;
    //    }
    // add resources required by Schema object
    resourceFactory.addResourcesToArgs(args);

    var stdArgs = resourceFactory.standardiseArgs(args),
      object = ROLESCHEMA.SCHEMA.read(response, stdArgs);

    return object;
  }

  
}



/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', 'PEOPLESCHEMA', 'ADDRSCHEMA', 'ROLESCHEMA', function ($provide, schemaProvider, SCHEMA_CONST, PEOPLESCHEMA, ADDRSCHEMA, ROLESCHEMA) {

    var i, uidx = 0,
      ids = {},
      modelProps = [],
      peoplePath,
      addressPath,
      subSchemaList,

      details = [
        SCHEMA_CONST.ID,
        schemaProvider.getStringModelPropArgs('username', { field: 'UNAME' }),
        schemaProvider.getObjectIdModelPropArgs('role', 'roleFactory', 'role', ROLESCHEMA, ROLESCHEMA.IDs.ID, { field: 'ROLE' }),
        schemaProvider.getObjectIdModelPropArgs('person', 'peopleFactory', 'person', PEOPLESCHEMA, PEOPLESCHEMA.IDs.ID, { field: 'PERSON' })
      ];

    // user schema is a combination of the person & address
    for (i = 0; i < details.length; ++i, ++uidx) {
      ids[details[i].field] = uidx;          // uidx is index

      var args = angular.copy(details[i]);
      args.id = uidx;
      modelProps.push(schemaProvider.getModelPropObject(args));
    }

    peoplePath = modelProps[ids.PERSON].modelName; // path to person in user schema
    addressPath = [
      peoplePath,  // path to person in user schema
      PEOPLESCHEMA.SCHEMA.getModelName(PEOPLESCHEMA.IDs.ADDR) // path to address in person schema
    ];
    subSchemaList = [
      { schema: PEOPLESCHEMA, path: peoplePath },
      { schema: ADDRSCHEMA, path: addressPath }
    ];

    subSchemaList.forEach(function (subSchema) {
      var subId,
        subIds = [];  // unique ids for subschema items

      for (subId in subSchema.schema.IDs) {
        subIds.push(subSchema.schema.ID_TAG + subId);
      }

      for (i = 0; i < subSchema.schema.MODELPROPS.length; ++i, ++uidx) {
        ids[subIds[i]] = uidx;          // id is index

        var args = angular.copy(subSchema.schema.MODELPROPS[i]);
        args.id = uidx;
        args.modelPath = subSchema.path;
        modelProps.push(schemaProvider.getModelPropObject(args));
      }
    });

    var ID_TAG = SCHEMA_CONST.MAKE_ID_TAG('user'),
      schema = schemaProvider.getSchema('User', modelProps, ids, ID_TAG),

      USER_UNAME_IDX =
        schema.addFieldFromModelProp('uname', 'Username', ids.UNAME),
      USER_ROLE_IDX =
        schema.addFieldFromModelProp('role', 'Role', ids.ROLE),

      sortOptions,  // user schema sort options
      sortOptionIndices = // dialog properties of sort options
        [schema.getField(USER_UNAME_IDX, SCHEMA_CONST.DIALOG_PROP)],
      sortOptArgs,
      constToProvide;

    subSchemaList.forEach(function (subSchema) {
      subSchema.schema.SCHEMA.forEachField(
        function (schemaField) {
          schema.addFieldFromField(schemaField, {
            path: subSchema.path,
            cb: function (field) {
              // save dialog property for index configuration
              sortOptionIndices.push(field.dialog);
            }
          });
        });
    });

    // generate list of sort options based on basic, person & address sort options
    sortOptions = schemaProvider.makeSortList(schema, [USER_UNAME_IDX], ID_TAG);

    sortOptArgs = {
      exOptions: SCHEMA_CONST.BASIC_SORT_OPTIONS,
      addTo: sortOptions,
      cb: function (option) {
        // decode option value to get dialog property
        var optVal = SCHEMA_CONST.DECODE_SORT_OPTION_VALUE(option.value),
          i;
        // set id to user tag & correct index
        for (i = 0; i < sortOptionIndices.length; ++i) {
          if (sortOptionIndices[i] === optVal.item) {
            option.id = SCHEMA_CONST.MAKE_SORT_ITEM_ID(ID_TAG, i);
            break;
          }
        }
      }
    };

    schemaProvider.makeSubDocSortList(
      PEOPLESCHEMA.SORT_OPTIONS, peoplePath, sortOptArgs);
    schemaProvider.makeSubDocSortList(
      ADDRSCHEMA.SORT_OPTIONS, addressPath, sortOptArgs);
  
    constToProvide = {
      ID_TAG: ID_TAG,
      IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
      MODELPROPS: modelProps,

      USER_UNAME_IDX: USER_UNAME_IDX,
      USER_ROLE_IDX: USER_ROLE_IDX,

      SCHEMA: schema,

      SORT_OPTIONS: sortOptions
    };

    $provide.constant('USERSCHEMA', constToProvide);
  }])

  .factory('userFactory', userFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

userFactory.$inject = ['$injector', '$filter', 'storeFactory', 'resourceFactory', 'compareFactory', 'filterFactory', 'miscUtilFactory',
  'SCHEMA_CONST', 'USERSCHEMA'];

function userFactory($injector, $filter, storeFactory, resourceFactory, compareFactory, filterFactory, miscUtilFactory,
  SCHEMA_CONST, USERSCHEMA) {


  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'userFactory',
      getSortFunction: getSortFunction,
      readUserRsp: readUserRsp
    },
    comparinators = [];

  resourceFactory.registerStandardFactory(factory.NAME, {
    storeId: USERSCHEMA.ID_TAG,
    schema: USERSCHEMA.SCHEMA,
    sortOptions: USERSCHEMA.SORT_OPTIONS,
    addInterface: factory, // add standard factory functions to this factory
    resources: {
      user: resourceFactory.getResourceConfigWithId('users'),
      count: resourceFactory.getResourceConfig('users/count'),
      batch: resourceFactory.getResourceConfig('users/batch')
    }
  });

  // make an array of comparinator objects based on sort indices
  USERSCHEMA.SORT_OPTIONS.forEach(function (option) {
    if (option.id) {
      var itemId = SCHEMA_CONST.DECODE_SORT_ITEM_ID(option.id);
      if (!comparinators[itemId.index]) {
        comparinators[itemId.index] = 
          compareFactory.newComparinator(USERSCHEMA.SCHEMA, itemId.index);
      }
    }
  });
  
  return factory;

  /* function implementation
    -------------------------- */

  /**
   * Read a server response user object
   * @param {object} response   Server response
   * @param {object} args       arguments object
   *                            @see Schema.readProperty() for details
   * @returns {object}  user object
   */
  //  function readRspObject (response, args) {
  //    if (!args) {
  //      args = {};
  //    }
  //    if (!args.convert) {
  //      args.convert = readRspObjectValueConvert;
  //    }
  //    // add resources required by Schema object
  //    resourceFactory.addResourcesToArgs(args);
  //
  //    var stdArgs = resourceFactory.standardiseArgs(args),
  //      object = USERSCHEMA.SCHEMA.read(response, stdArgs);
  //
  //    con.debug('Read user rsp object: ' + object);
  //
  //    return object;
  //  }

  /**
   * Convert values read from a server election response
   * @param {number}    schema id 
   * @param {object}    read value
   * @returns {object}  Converted value
   */
  //  function readRspObjectValueConvert (id, value) {
  //    switch (id) {
  //      case ELECTIONSCHEMA.IDs.ELECTIONDATE:
  //        value = new Date(value);
  //        break;
  //      default:
  //        // other fields require no conversion
  //        break;
  //    }
  //    return value;
  //  }


  /**
   * Read a user response from the server
   * @param {object}   response   Server response
   * @param {object}   args       process arguments object as per resourceFactory.storeServerRsp()
   *                              without 'factory' argument
   *                              @see resourceFactory.storeServerRsp()
   * @return {object}  user ResourceList object
   */
  function readUserRsp(response, args) {
    var storeArgs = miscUtilFactory.copyAndAddProperties(args, {
      factory: $injector.get(factory.NAME)
    });
    return resourceFactory.storeServerRsp(response, storeArgs);
  }

  /**
   * Get the sort function for a user ResourceList
   * @param   {object} sortOptions  List of possible sort option
   * @param   {object} sortBy       Key to sort by
   * @returns {function} sort function
   */
  function getSortFunction (options, sortBy) {
    var sortFxn = resourceFactory.getSortFunction(options, sortBy);
    if (typeof sortFxn === 'object') {
      var sortItem = SCHEMA_CONST.DECODE_SORT_ITEM_ID(sortFxn.id);
      if (sortItem.idTag === USERSCHEMA.ID_TAG) {
        if (comparinators[sortItem.index]) {
          sortFxn = getComparinator(sortItem.index);
        }
      }
    } // else basic index sort or not found
    return sortFxn;
  }

  /**
   * Compare user objects based on username
   * @param   {object} a First user object
   * @param   {object} b Second user object
   * @returns {number} comparision result
   */
  //  function compareUsername (a, b) {
  //    return compareFactory.compareStringFields(USERSCHEMA.SCHEMA, USERSCHEMA.USER_UNAME_IDX, a, b);
  //  }

  /**
   * Wrapper function to return comparinator function
   * @param   {number}   index Inhex of comparinator to use
   * @returns {function} Function to pass to Array.sort()
   */
  function getComparinator (index) {
    return function (a, b) {
      return comparinators[index].compareFields(a, b);
    };
  }
}






/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', function ($provide, schemaProvider, SCHEMA_CONST) {

    var details = [
        SCHEMA_CONST.ID,
        schemaProvider.getNumberModelPropArgs('type', undefined, { field: 'TYPE' }),
        schemaProvider.getStringModelPropArgs('question', { field: 'QUESTION' }),
        schemaProvider.getStringArrayModelPropArgs('options', { field: 'OPTIONS' }),
        schemaProvider.getNumberModelPropArgs('rangeMin', 1, { field: 'RANGEMIN' }),
        schemaProvider.getNumberModelPropArgs('rangeMax', 10, { field: 'RANGEMAX' })
      ],
      ids = {},
      modelProps = [];

    for (var i = 0; i < details.length; ++i) {
      ids[details[i].field] = i;          // id is index

      var args = angular.copy(details[i]);
      args.id = i;
      modelProps.push(schemaProvider.getModelPropObject(args));
    }

    var ID_TAG = SCHEMA_CONST.MAKE_ID_TAG('ques'),
      schema = schemaProvider.getSchema('Question', modelProps, ids, ID_TAG),
      QUES_TYPE_IDX =
        schema.addFieldFromModelProp('type', 'Type', ids.TYPE),
      QUES_QUESTION_IDX =
        schema.addFieldFromModelProp('question', 'Question', ids.QUESTION),

      // generate list of sort options
      sortOptions = schemaProvider.makeSortList(schema, 
        [QUES_TYPE_IDX, QUES_QUESTION_IDX],
        ID_TAG),

      questionTypeIds = {
        QUESTION_YES_NO: 0,          // simple yes/no question
        QUESTION_YES_NO_MAYBE: 1,    // simple yes/no/maybe question
        QUESTION_CHOICE_MULTISEL: 2, // multiple choice/multiple answer
        QUESTION_CHOICE_SINGLESEL: 3,// multiple choice/single answer
        QUESTION_RANKING: 4,         // rank answer
        QUESTION_QUERY: 5            // surveyee answer 
      },

      getOptionCountArray = function (min, max) {
        var array = [];
        for (var i = min; i <= max; ++i) {
          array.push(i);
        }
        return array;
      },

      objs = [
        {
          type: questionTypeIds.QUESTION_YES_NO,
          name: 'Yes/No',
          showOptions: true,
        },
        {
          type: questionTypeIds.QUESTION_YES_NO_MAYBE,
          name: 'Yes/No/Maybe',
          showOptions: true,
        },
        {
          type: questionTypeIds.QUESTION_CHOICE_MULTISEL,
          name: 'MultiSelect',
          showOptions: true,
          range: getOptionCountArray(2, 10)
        },
        {
          type: questionTypeIds.QUESTION_CHOICE_SINGLESEL,
          name: 'SingleSelect',
          showOptions: true,
          range: getOptionCountArray(2, 10)
        },
        {
          type: questionTypeIds.QUESTION_RANKING,
          name: 'Ranking',
          showOptions: true,
          range: getOptionCountArray(2, 10)
        },
        {
          type: questionTypeIds.QUESTION_QUERY,
          name: 'Query',
          showOptions: false
        }
      ];

    $provide.constant('QUESTIONSCHEMA', {
      IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
      MODELPROPS: modelProps,

      SCHEMA: schema,
      // row indices
      QUES_TYPE_IDX: QUES_TYPE_IDX,
      QUES_QUESTION_IDX: QUES_QUESTION_IDX,

      SORT_OPTIONS: sortOptions,
      ID_TAG: ID_TAG,

      TYPEIDs: questionTypeIds,
      QUESTIONOBJs: objs
    });
  }])

  .factory('questionFactory', questionFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

questionFactory.$inject = ['$injector', 'baseURL', 'SCHEMA_CONST', 'QUESTIONSCHEMA', 'storeFactory', 'resourceFactory', 'compareFactory', 'filterFactory', 'miscUtilFactory', 'consoleService'];

function questionFactory($injector, baseURL, SCHEMA_CONST, QUESTIONSCHEMA, storeFactory, resourceFactory, compareFactory, filterFactory, miscUtilFactory, consoleService) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'questionFactory',
      getQuestionTypes: getQuestionTypes,
      getQuestionTypeObj: getQuestionTypeObj,
      getQuestionTypeName: getQuestionTypeName,
      showQuestionOptions: showQuestionOptions,
      hasPresetQuestionOptions: hasPresetQuestionOptions,
      showQuestionSingleSelOptions: showQuestionSingleSelOptions,
      showQuestionMultiSelOptions: showQuestionMultiSelOptions,
      showRankingNumber: showRankingNumber,
      showTextInput: showTextInput,
      readRspObject: readRspObject,
      readResponse: readResponse,
      storeRspObject: storeRspObject,

      getSortFunction: getSortFunction,
    },
    con = consoleService.getLogger(factory.NAME);

  resourceFactory.registerStandardFactory(factory.NAME, {
    storeId: QUESTIONSCHEMA.ID_TAG,
    schema: QUESTIONSCHEMA.SCHEMA,
    sortOptions: QUESTIONSCHEMA.SORT_OPTIONS,
    addInterface: factory, // add standard factory functions to this factory
    resources: {
      question: resourceFactory.getResourceConfigWithId('questions')
    }
  });

  return factory;

  /* function implementation
    -------------------------- */

  /**
    * Return all the possible question types
    * @return {Array} an array of question type objects
    */
  function getQuestionTypes () {
    return QUESTIONSCHEMA.QUESTIONOBJs;
  }

  /**
    * Get a question type object
    * @param {number} type  Type of question type to get
    * @return {object}  question type object
    */
  function getQuestionTypeObj (type) {
    var questionTypes = QUESTIONSCHEMA.QUESTIONOBJs,
      obj;
    for (var i = 0; i < questionTypes.length; ++i) {
      if (questionTypes[i].type == type) {
        obj = questionTypes[i];
        break;
      }
    }
    return obj;
  }

  /**
    * Get a question type name
    * @param {number} type  Type of question type to get name for
    * @return {string}  question type name
    */
  function getQuestionTypeName (type) {
    var name = '';
    var obj = getQuestionTypeObj(type);
    if (obj !== undefined) {
      name = obj.name;
    }
    return name;
  }

  /**
    * Check if options should be displayed for a question type
    * @param {number} type  Type of question type to check
    * @return {boolean}  true if options should be displayed
    */
  function showQuestionOptions (type) {
    var show = false;
    var obj = getQuestionTypeObj(type);
    if (obj !== undefined) {
      show = obj.showOptions;
    }
    return show;
  }

  /**
   * Check if a question type has predefined options
   * @param {number} type  Type of question type to check
   * @return {boolean}  true if has predefined options
   */
  function hasPresetQuestionOptions (type) {
    switch (type) {
      case QUESTIONSCHEMA.TYPEIDs.QUESTION_YES_NO:
      case QUESTIONSCHEMA.TYPEIDs.QUESTION_YES_NO_MAYBE:
        return true;
      default:
        return false;
    }
  }

  /**
    * Check if single select options should be displayed for a question type
    * @param {number} type  Type of question type to check
    * @return {boolean}  true if options should be displayed
    */
  function showQuestionSingleSelOptions (type) {
    return (showQuestionOptions(type) && !showQuestionMultiSelOptions(type) && !showRankingNumber(type));
  }

  /**
    * Check if multiselect options should be displayed for a question type
    * @param {number} type  Type of question type to check
    * @return {boolean}  true if options should be displayed
    */
  function showQuestionMultiSelOptions (type) {
    return (type === QUESTIONSCHEMA.TYPEIDs.QUESTION_CHOICE_MULTISEL);
  }

  /**
    * Check if ranking number should be displayed for a question type
    * @param {number} type  Type of question type to check
    * @return {boolean}  true if ranking number should be displayed
    */
  function showRankingNumber (type) {
    return (type === QUESTIONSCHEMA.TYPEIDs.QUESTION_RANKING);
  }

  /**
    * Check if text input should be displayed for a question type
    * @param {number} type  Type of question type to check
    * @return {boolean}  true if text input should be displayed
    */
  function showTextInput (type) {
    return (type === QUESTIONSCHEMA.TYPEIDs.QUESTION_QUERY);
  }


  /**
   * Read a server response question object
   * @param {object} response   Server response
   * @param {object} args       arguments object
   *                            @see Schema.readProperty() for details
   * @returns {object}  Survey object
   */
  function readRspObject(response, args) {
    if (!args) {
      args = {};
    }
    // no conversions required by default
    //    if (!args.convert) {
    //      args.convert = readRspObjectValueConvert;
    //    }
    // add resources required by Schema object
    resourceFactory.addResourcesToArgs(args);

    var stdArgs = resourceFactory.standardiseArgs(args),
      object = QUESTIONSCHEMA.SCHEMA.read(response, stdArgs);

    con.debug('Read question rsp object: ' + object);

    return object;
  }

  /**
   * Read a question response from the server and store it
   * @param {object}   response   Server response
   * @param {object}   args       process arguments object with following properties
   *    {string|Array} objId      id/array of ids of question object to save response data to
   *    {number}       flags      storefactory flags
   *    {function}     next       function to call after processing
   * @returns {object}   Survey object
   */
  function readResponse (response, args) {
    var question = readRspObject(response, args);
    return storeRspObject(question, args);
  }

  /**
   * Store a question object
   * @param {object}   obj        Object to store
   * @param {object}   args       process arguments object as per resourceFactory.storeServerRsp()
   *                              without 'factory' argument
   *                              @see resourceFactory.storeServerRsp()
   * @return {object}  question ResourceList object
   */
  function storeRspObject (obj, args) {
    var storeArgs = miscUtilFactory.copyAndAddProperties(args, {
      factory: $injector.get(factory.NAME)
    });
    return resourceFactory.storeServerRsp(obj, storeArgs);
  }

  function getSortFunction (options, sortBy) {
    var sortFxn = resourceFactory.getSortFunction(options, sortBy);
    if (typeof sortFxn === 'object') {
      var sortItem = SCHEMA_CONST.DECODE_SORT_ITEM_ID(sortFxn.id);
      if (sortItem.idTag === QUESTIONSCHEMA.ID_TAG) {
        switch (sortItem.index) {
          //case QUESTIONSCHEMA.QUES_TYPE_IDX:
          //  sortFxn = compareAddress;
          //  break;
          //case QUESTIONSCHEMA.QUES_QUESTION_IDX:
          //  sortFxn = compareTown;
          //  break;
          default:
            sortFxn = undefined;
            break;
        }
      }
    }
    return sortFxn;
  }

}

/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', 'QUESTIONSCHEMA', function ($provide, schemaProvider, SCHEMA_CONST, QUESTIONSCHEMA) {

    var details = [
        SCHEMA_CONST.ID,
        schemaProvider.getStringModelPropArgs('answer', { field: 'ANSWER' }),
        schemaProvider.getObjectIdModelPropArgs('question', 'questionFactory', 'question', QUESTIONSCHEMA, QUESTIONSCHEMA.IDs.ID, { field: 'QUESTION' })
      ],
      ids = {},
      modelProps = [];

    for (var i = 0; i < details.length; ++i) {
      ids[details[i].field] = i;          // id is index

      var args = angular.copy(details[i]);
      args.id = i;
      modelProps.push(schemaProvider.getModelPropObject(args));
    }

    var ID_TAG = SCHEMA_CONST.MAKE_ID_TAG('ans'),
      schema = schemaProvider.getSchema('Answer', modelProps, ids, ID_TAG),
      ANS_QUESTION_IDX =
        schema.addFieldFromModelProp('question', 'Question', ids.QUESTION),

      // generate list of sort options
      sortOptions = schemaProvider.makeSortList(schema, 
        [ANS_QUESTION_IDX],
        ID_TAG);

    $provide.constant('ANSWERSCHEMA', {
      IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
      MODELPROPS: modelProps,

      SCHEMA: schema,
      // row indices
      ANS_QUESTION_IDX: ANS_QUESTION_IDX,

      SORT_OPTIONS: sortOptions,
      ID_TAG: ID_TAG
    });
  }])

  .factory('answerFactory', answerFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

answerFactory.$inject = ['$injector', 'baseURL', 'SCHEMA_CONST', 'ANSWERSCHEMA', 'storeFactory', 'resourceFactory', 'compareFactory', 'filterFactory', 'miscUtilFactory', 'consoleService'];

function answerFactory($injector, baseURL, SCHEMA_CONST, ANSWERSCHEMA, storeFactory, resourceFactory, compareFactory, filterFactory, miscUtilFactory, consoleService) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'answerFactory',
      readRspObject: readRspObject,
      readResponse: readResponse,
      storeRspObject: storeRspObject,

      getSortFunction: getSortFunction,
    },
    con = consoleService.getLogger(factory.NAME);

  resourceFactory.registerStandardFactory(factory.NAME, {
    storeId: ANSWERSCHEMA.ID_TAG,
    schema: ANSWERSCHEMA.SCHEMA,
    sortOptions: ANSWERSCHEMA.SORT_OPTIONS,
    addInterface: factory, // add standard factory functions to this factory
    resources: {
      answer: resourceFactory.getResourceConfigWithId('answers')
    }
  });

  return factory;

  /* function implementation
    -------------------------- */

  /**
   * Read a server response question object
   * @param {object} response   Server response
   * @param {object} args       arguments object
   *                            @see Schema.readProperty() for details
   * @returns {object}  Survey object
   */
  function readRspObject(response, args) {
    if (!args) {
      args = {};
    }
    // no conversions required by default
    //    if (!args.convert) {
    //      args.convert = readRspObjectValueConvert;
    //    }
    // add resources required by Schema object
    resourceFactory.addResourcesToArgs(args);

    var stdArgs = resourceFactory.standardiseArgs(args),
      object = ANSWERSCHEMA.SCHEMA.read(response, stdArgs);

    con.debug('Read answer rsp object: ' + object);

    return object;
  }

  /**
   * Read a question response from the server and store it
   * @param {object}   response   Server response
   * @param {object}   args       process arguments object with following properties
   *    {string|Array} objId      id/array of ids of question object to save response data to
   *    {number}       flags      storefactory flags
   *    {function}     next       function to call after processing
   * @returns {object}   Survey object
   */
  function readResponse (response, args) {
    var question = readRspObject(response, args);
    return storeRspObject(question, args);
  }

  /**
   * Store a question object
   * @param {object}   obj        Object to store
   * @param {object}   args       process arguments object as per resourceFactory.storeServerRsp()
   *                              without 'factory' argument
   *                              @see resourceFactory.storeServerRsp()
   * @return {object}  question ResourceList object
   */
  function storeRspObject (obj, args) {
    var storeArgs = miscUtilFactory.copyAndAddProperties(args, {
      factory: $injector.get(factory.NAME)
    });
    return resourceFactory.storeServerRsp(obj, storeArgs);
  }

  function getSortFunction (options, sortBy) {
    var sortFxn = resourceFactory.getSortFunction(options, sortBy);
    if (typeof sortFxn === 'object') {
      var sortItem = SCHEMA_CONST.DECODE_SORT_ITEM_ID(sortFxn.id);
      if (sortItem.idTag === ANSWERSCHEMA.ID_TAG) {
        switch (sortItem.index) {
          //case ANSWERSCHEMA.ANS_QUESTION_IDX:
          //  sortFxn = compareTown;
          //  break;
          default:
            sortFxn = undefined;
            break;
        }
      }
    }
    return sortFxn;
  }

}

/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', 'QUESTIONSCHEMA', function ($provide, schemaProvider, SCHEMA_CONST, QUESTIONSCHEMA) {

    var details = [
        SCHEMA_CONST.ID,
        schemaProvider.getStringModelPropArgs('name', { field: 'NAME' }),
        schemaProvider.getStringModelPropArgs('description', { field: 'DESCRIPTION' }),
        schemaProvider.getObjectIdArrayModelPropArgs('questions', 'questionFactory', 'question', QUESTIONSCHEMA, QUESTIONSCHEMA.IDs.ID, { field: 'QUESTIONS' })
      ],
      ids = {},
      modelProps = [];

    for (var i = 0; i < details.length; ++i) {
      ids[details[i].field] = i;          // id is index

      var args = angular.copy(details[i]);
      args.id = i;
      modelProps.push(schemaProvider.getModelPropObject(args));
    }

    var ID_TAG = SCHEMA_CONST.MAKE_ID_TAG('survey'),
      schema = schemaProvider.getSchema('Survey', modelProps, ids, ID_TAG),
      SURVEY_NAME_IDX =
        schema.addFieldFromModelProp('name', 'Name', ids.NAME),
      SURVEY_DESCRIPTION_IDX =
        schema.addFieldFromModelProp('description', 'Description', ids.DESCRIPTION),
      SURVEY_QUESTIONS_IDX =
        schema.addFieldFromModelProp('questions', 'Questions', ids.QUESTIONS),

      // generate list of sort options
      sortOptions = schemaProvider.makeSortList(schema, 
        [SURVEY_NAME_IDX, SURVEY_DESCRIPTION_IDX],
        ID_TAG);

    $provide.constant('SURVEYSCHEMA', {
      IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
      MODELPROPS: modelProps,

      SCHEMA: schema,
      // row indices
      SURVEY_NAME_IDX: SURVEY_NAME_IDX,
      SURVEY_DESCRIPTION_IDX: SURVEY_DESCRIPTION_IDX,
      SURVEY_QUESTIONS_IDX: SURVEY_QUESTIONS_IDX,

      SORT_OPTIONS: sortOptions,
      ID_TAG: ID_TAG
    });
  }])

  .factory('surveyFactory', surveyFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

surveyFactory.$inject = ['$injector', 'baseURL', 'SURVEYSCHEMA', 'storeFactory', 'resourceFactory', 'miscUtilFactory', 'consoleService'];

function surveyFactory($injector, baseURL, SURVEYSCHEMA, storeFactory, resourceFactory, miscUtilFactory, consoleService) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'surveyFactory',
      readRspObject: readRspObject,
      readResponse: readResponse,
      storeRspObject: storeRspObject
    },
    con = consoleService.getLogger(factory.NAME);

  resourceFactory.registerStandardFactory(factory.NAME, {
    storeId: SURVEYSCHEMA.ID_TAG,
    schema: SURVEYSCHEMA.SCHEMA,
    addInterface: factory, // add standard factory functions to this factory
    resources: {
      survey: resourceFactory.getResourceConfigWithId('surveys')
    }

  });
 
  return factory;

  /* function implementation
    -------------------------- */

  /**
   * Read a server response survey object
   * @param {object} response   Server response
   * @param {object} args       arguments object
   *                            @see Schema.readProperty() for details
   * @returns {object}  Survey object
   */
  function readRspObject(response, args) {
    if (!args) {
      args = {};
    }
    // no conversions required by default
    //    if (!args.convert) {
    //      args.convert = readRspObjectValueConvert;
    //    }
    // add resources required by Schema object
    resourceFactory.addResourcesToArgs(args);

    var stdArgs = resourceFactory.standardiseArgs(args),
      object = SURVEYSCHEMA.SCHEMA.read(response, stdArgs);

    con.debug('Read survey rsp object: ' + object);

    return object;
  }

  /**
   * Read a survey response from the server and store it
   * @param {object}   response   Server response
   * @param {object}   args       process arguments object with following properties
   *    {string|Array} objId      id/array of ids of survey object to save response data to
   *    {number}       flags      storefactory flags
   *    {function}     next       function to call after processing
   * @returns {object}   Survey object
   */
  function readResponse (response, args) {
    var survey = readRspObject(response, args);
    return storeRspObject(survey, args);
  }

  /**
   * Store a survey object
   * @param {object}   obj        Object to store
   * @param {object}   args       process arguments object as per resourceFactory.storeServerRsp()
   *                              without 'factory' argument
   *                              @see resourceFactory.storeServerRsp()
   * @return {object}  survey ResourceList object
   */
  function storeRspObject (obj, args) {
    var storeArgs = miscUtilFactory.copyAndAddProperties(args, {
      factory: $injector.get(factory.NAME)
    });
    return resourceFactory.storeServerRsp(obj, storeArgs);
  }

}

/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', function ($provide, schemaProvider, SCHEMA_CONST) {

    var details = [
        SCHEMA_CONST.ID,
        schemaProvider.getStringModelPropArgs('name', { field: 'NAME' }),
        schemaProvider.getStringModelPropArgs('description', { field: 'DESCRIPTION' }),
        schemaProvider.getStringModelPropArgs('abbreviation', { field: 'ABBREVIATION' })
      ],
      ids = {},
      modelProps = [];

    for (var i = 0; i < details.length; ++i) {
      ids[details[i].field] = i;          // id is index

      var args = angular.copy(details[i]);
      args.id = i;
      modelProps.push(schemaProvider.getModelPropObject(args));
    }

    var ID_TAG = SCHEMA_CONST.MAKE_ID_TAG('votingsys'),
      schema = schemaProvider.getSchema('Voting System', modelProps, ids, ID_TAG),
      VOTINGSYS_NAME_IDX =
        schema.addFieldFromModelProp('name', 'Name', ids.NAME),
      VOTINGSYS_DESCRIPTION_IDX =
        schema.addFieldFromModelProp('description', 'Description', ids.DESCRIPTION),
      VOTINGSYS_ABBREVIATION_IDX =
        schema.addFieldFromModelProp('abbreviation', 'Abbreviation', ids.ABBREVIATION),

      // generate list of sort options
      sortOptions = schemaProvider.makeSortList(schema, 
        [VOTINGSYS_NAME_IDX, VOTINGSYS_ABBREVIATION_IDX],
        ID_TAG);

    $provide.constant('VOTINGSYSSCHEMA', {
      IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
      MODELPROPS: modelProps,

      SCHEMA: schema,
      // row indices
      VOTINGSYS_NAME_IDX: VOTINGSYS_NAME_IDX,
      VOTINGSYS_DESCRIPTION_IDX: VOTINGSYS_DESCRIPTION_IDX,
      VOTINGSYS_ABBREVIATION_IDX: VOTINGSYS_ABBREVIATION_IDX,

      SORT_OPTIONS: sortOptions,
      ID_TAG: ID_TAG
    });
  }])

  .factory('votingsystemFactory', votingsystemFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

votingsystemFactory.$inject = ['$injector', '$filter', 'storeFactory', 'resourceFactory', 'filterFactory', 'consoleService',
  'miscUtilFactory', 'SCHEMA_CONST', 'VOTINGSYSSCHEMA'];

function votingsystemFactory ($injector, $filter, storeFactory, resourceFactory, filterFactory, consoleService, 
  miscUtilFactory, SCHEMA_CONST, VOTINGSYSSCHEMA) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'votingsystemFactory',
      readRspObject: readRspObject,
      readResponse: readResponse,
      storeRspObject: storeRspObject,

      getSortFunction: getSortFunction
    },
    con = consoleService.getLogger(factory.NAME);

  resourceFactory.registerStandardFactory(factory.NAME, {
    storeId: VOTINGSYSSCHEMA.ID_TAG,
    schema: VOTINGSYSSCHEMA.SCHEMA,
    sortOptions: VOTINGSYSSCHEMA.SORT_OPTIONS,
    addInterface: factory, // add standard factory functions to this factory
    resources: {
      system: resourceFactory.getResourceConfigWithId('votingsystems')
    }
  });
  
  return factory;

  /* function implementation
    -------------------------- */

  /**
   * Read a server response voting system object
   * @param {object} response   Server response
   * @param {object} args       arguments object
   *                            @see Schema.readProperty() for details
   * @returns {object}  voting system object
   */
  function readRspObject (response, args) {
    if (!args) {
      args = {};
    }
    // no conversions required by default
    //    if (!args.convert) {
    //      args.convert = readRspObjectValueConvert;
    //    }
    // add resources required by Schema object
    resourceFactory.addResourcesToArgs(args);

    var stdArgs = resourceFactory.standardiseArgs(args),
      object = VOTINGSYSSCHEMA.SCHEMA.read(response, stdArgs);

    con.debug('Read voting sys rsp object: ' + object);

    return object;
  }

  /**
   * Convert values read from a server response
   * @param {number}    schema id 
   * @param {object}    read value
   * @returns {object}  Converted value
   */
  //  function readRspObjectValueConvert (id, value) {
  //    switch (id) {
  //      case VOTINGSYSSCHEMA.IDs.???:
  //        value = <<new value>>;
  //        break;
  //      default:
  //        // other fields require no conversion
  //        break;
  //    }
  //    return value;
  //  }


  /**
   * Read an voting system response from the server and store it
   * @param {object}   response   Server response
   * @param {object}   args       process arguments object with following properties
   *    {string|Array} objId      id/array of ids of voting system object to save response data to
   *    {number}       flags      storefactory flags
   *    {function}     next       function to call after processing
   * @return {object}  voting system ResourceList object
   */
  function readResponse (response, args) {
    var system = readRspObject(response, args);
    return storeRspObject(system, args);
  }

  /**
   * Store an voting system object
   * @param {object}   obj        Object to store
   * @param {object}   args       process arguments object as per resourceFactory.storeServerRsp()
   *                              without 'factory' argument
   *                              @see resourceFactory.storeServerRsp()
   * @return {object}  voting system ResourceList object
   */
  function storeRspObject (obj, args) {
    var storeArgs = miscUtilFactory.copyAndAddProperties(args, {
      factory: $injector.get(factory.NAME)
    });
    return resourceFactory.storeServerRsp(obj, storeArgs);
  }

  function getSortFunction(options, sortBy) {
    var sortFxn = resourceFactory.getSortFunction(options, sortBy);
    if (typeof sortFxn === 'object') {
      var sortItem = SCHEMA_CONST.DECODE_SORT_ITEM_ID(sortFxn.id);
      if (sortItem.idTag === VOTINGSYSSCHEMA.ID_TAG) {
        switch (sortItem.index) {
          //          case VOTINGSYSSCHEMA.VOTINGSYS_NAME_IDX:
          //            sortFxn = compareAddress;
          //            break;
          //          case VOTINGSYSSCHEMA.VOTINGSYS_ABBREVIATION_IDX:
          //            sortFxn = compareCity;
          //            break;
          default:
            sortFxn = undefined;
            break;
        }
      }
    }
    return sortFxn;
  }

}



/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', 'VOTINGSYSSCHEMA', function ($provide, schemaProvider, SCHEMA_CONST, VOTINGSYSSCHEMA) {

    var details = [
        SCHEMA_CONST.ID,
        schemaProvider.getStringModelPropArgs('name', { field: 'NAME' }),
        schemaProvider.getStringModelPropArgs('description', { field: 'DESCRIPTION' }),
        schemaProvider.getNumberModelPropArgs('seats', 0, { field: 'SEATS' }),
        schemaProvider.getDateModelPropArgs('electionDate', undefined, { field: 'ELECTIONDATE' }),
        schemaProvider.getObjectIdModelPropArgs('system', 'votingsystemFactory', 'system', VOTINGSYSSCHEMA, VOTINGSYSSCHEMA.IDs.ID, { field: 'SYSTEM' }),
        schemaProvider.getObjectIdArrayModelPropArgs('candidates', undefined, undefined, undefined, undefined, { field: 'CANDIDATES' })
      ],
      ids = {},
      modelProps = [];

    for (var i = 0; i < details.length; ++i) {
      ids[details[i].field] = i;          // id is index

      var args = angular.copy(details[i]);
      args.id = i;
      modelProps.push(schemaProvider.getModelPropObject(args));
    }

    var ID_TAG = SCHEMA_CONST.MAKE_ID_TAG('election'),
      schema = schemaProvider.getSchema('Election', modelProps, ids, ID_TAG),
      ELECTION_NAME_IDX =
        schema.addFieldFromModelProp('name', 'Name', ids.NAME),
      ELECTION_DESCRIPTION_IDX =
        schema.addFieldFromModelProp('description', 'Description', ids.DESCRIPTION),
      ELECTION_SEATS_IDX =
        schema.addFieldFromModelProp('seats', 'Seats', ids.SEATS),
      ELECTION_ELECTIONDATE_IDX =
        schema.addFieldFromModelProp('date', 'Election Date', ids.ELECTIONDATE),
      ELECTION_SYSTEM_IDX =
        schema.addFieldFromModelProp('system', 'System', ids.SYSTEM),

      // generate list of sort options
      sortOptions = schemaProvider.makeSortList(schema, 
        [ELECTION_NAME_IDX, ELECTION_SEATS_IDX, ELECTION_ELECTIONDATE_IDX, ELECTION_SYSTEM_IDX],
        ID_TAG);

    $provide.constant('ELECTIONSCHEMA', {
      IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
      MODELPROPS: modelProps,

      SCHEMA: schema,
      // row indices
      ELECTION_NAME_IDX: ELECTION_NAME_IDX,
      ELECTION_DESCRIPTION_IDX: ELECTION_DESCRIPTION_IDX,
      ELECTION_SEATS_IDX: ELECTION_SEATS_IDX,
      ELECTION_ELECTIONDATE_IDX: ELECTION_ELECTIONDATE_IDX,
      ELECTION_SYSTEM_IDX: ELECTION_SYSTEM_IDX,

      SORT_OPTIONS: sortOptions,
      ID_TAG: ID_TAG
    });
  }])

  .factory('electionFactory', electionFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

electionFactory.$inject = ['$injector', '$filter', 'storeFactory', 'resourceFactory', 'filterFactory', 'consoleService',
  'miscUtilFactory', 'SCHEMA_CONST', 'ELECTIONSCHEMA'];

function electionFactory($injector, $filter, storeFactory, resourceFactory, filterFactory, consoleService, 
  miscUtilFactory, SCHEMA_CONST, ELECTIONSCHEMA) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'electionFactory',
      readRspObject: readRspObject,
      readResponse: readResponse,
      storeRspObject: storeRspObject,

      getSortFunction: getSortFunction
    },
    con = consoleService.getLogger(factory.NAME);

  resourceFactory.registerStandardFactory(factory.NAME, {
    storeId: ELECTIONSCHEMA.ID_TAG,
    schema: ELECTIONSCHEMA.SCHEMA,
    sortOptions: ELECTIONSCHEMA.SORT_OPTIONS,
    addInterface: factory, // add standard factory functions to this factory
    resources: {
      election: resourceFactory.getResourceConfigWithId('elections'),
    }
  });
  
  return factory;

  /* function implementation
    -------------------------- */

  /**
   * Read a server response election object
   * @param {object} response   Server response
   * @param {object} args       arguments object
   *                            @see Schema.readProperty() for details
   * @returns {object}  election object
   */
  function readRspObject (response, args) {
    if (!args) {
      args = {};
    }
    if (!args.convert) {
      args.convert = readRspObjectValueConvert;
    }
    // add resources required by Schema object
    resourceFactory.addResourcesToArgs(args);

    var stdArgs = resourceFactory.standardiseArgs(args),
      object = ELECTIONSCHEMA.SCHEMA.read(response, stdArgs);

    con.debug('Read election rsp object: ' + object);

    return object;
  }

  /**
   * Convert values read from a server election response
   * @param {number}    schema id 
   * @param {object}    read value
   * @returns {object}  Converted value
   */
  function readRspObjectValueConvert (id, value) {
    switch (id) {
      case ELECTIONSCHEMA.IDs.ELECTIONDATE:
        value = new Date(value);
        break;
      default:
        // other fields require no conversion
        break;
    }
    return value;
  }


  /**
   * Read an election response from the server and store it
   * @param {object}   response   Server response
   * @param {object}   args       process arguments object with following properties
   *    {string|Array} objId      id/array of ids of election object to save response data to
   *    {number}       flags      storefactory flags
   *    {function}     next       function to call after processing
   * @return {object}  election ResourceList object
   */
  function readResponse (response, args) {
    var election = readRspObject(response, args);
    return storeRspObject(election, args);
  }

  /**
   * Store an election object
   * @param {object}   obj        Object to store
   * @param {object}   args       process arguments object as per resourceFactory.storeServerRsp()
   *                              without 'factory' argument
   *                              @see resourceFactory.storeServerRsp()
   * @return {object}  election ResourceList object
   */
  function storeRspObject (obj, args) {
    var storeArgs = miscUtilFactory.copyAndAddProperties(args, {
      factory: $injector.get(factory.NAME)
    });
    return resourceFactory.storeServerRsp(obj, storeArgs);
  }

  function getSortFunction(options, sortBy) {
    var sortFxn = resourceFactory.getSortFunction(options, sortBy);
    if (typeof sortFxn === 'object') {
      var sortItem = SCHEMA_CONST.DECODE_SORT_ITEM_ID(sortFxn.id);
      if (sortItem.idTag === ELECTIONSCHEMA.ID_TAG) {
        switch (sortItem.index) {
          //          case ELECTIONSCHEMA.ELECTION_NAME_IDX:
          //            sortFxn = compareAddress;
          //            break;
          //          case ELECTIONSCHEMA.ELECTION_SEATS_IDX:
          //            sortFxn = compareCity;
          //            break;
          //          case ELECTIONSCHEMA.ELECTION_ELECTIONDATE_IDX:
          //            sortFxn = compareCounty;
          //            break;
          //          case ELECTIONSCHEMA.ELECTION_SYSTEM_IDX:
          //            sortFxn = comparePostcode;
          //            break;
          default:
            sortFxn = undefined;
            break;
        }
      }
    }
    return sortFxn;
  }

}



/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', 'USERSCHEMA', 'PEOPLESCHEMA', 'ADDRSCHEMA', 'ANSWERSCHEMA', function ($provide, schemaProvider, SCHEMA_CONST, USERSCHEMA, PEOPLESCHEMA, ADDRSCHEMA, ANSWERSCHEMA) {

    var details = [
        SCHEMA_CONST.ID,
        schemaProvider.getBooleanModelPropArgs('available', true, { field: 'AVAILABLE' }),
        schemaProvider.getBooleanModelPropArgs('dontCanvass', false, { field: 'DONTCANVASS' }),
        schemaProvider.getBooleanModelPropArgs('tryAgain', false, { field: 'TRYAGAIN' }),
        schemaProvider.getNumberModelPropArgs('support', -1, { field: 'SUPPORT' }),
        schemaProvider.getDateModelPropArgs('date', undefined, { field: 'DATE' }),
        schemaProvider.getObjectIdArrayModelPropArgs('answers', 'answerFactory', 'answer', ANSWERSCHEMA, ANSWERSCHEMA.IDs.ID, { field: 'ANSWERS' }),
        schemaProvider.getObjectIdModelPropArgs('canvasser', 'userFactory', 'user', USERSCHEMA, USERSCHEMA.IDs.ID, { field: 'CANVASSER' }),
        schemaProvider.getObjectIdModelPropArgs('voter', 'peopleFactory', 'person', PEOPLESCHEMA, PEOPLESCHEMA.IDs.ID, { field: 'VOTER' }),
        schemaProvider.getObjectIdModelPropArgs('address', 'addressFactory', 'address', ADDRSCHEMA, ADDRSCHEMA.IDs.ID, { field: 'ADDRESS' }),
        SCHEMA_CONST.CREATEDAT,
        SCHEMA_CONST.UPDATEDAT
      ],
      ids = {},
      modelProps = [];

    for (var i = 0; i < details.length; ++i) {
      ids[details[i].field] = i;          // id is index

      var args = angular.copy(details[i]);
      args.id = i;
      modelProps.push(schemaProvider.getModelPropObject(args));
    }

    var ID_TAG = SCHEMA_CONST.MAKE_ID_TAG('canvassresult'),
      schema = schemaProvider.getSchema('CanvassResult', modelProps, ids, ID_TAG),
      CANVASSRES_AVAILABLE_IDX =
        schema.addFieldFromModelProp('available', 'Available', ids.AVAILABLE),
      CANVASSRES_DONTCANVASS_IDX =
        schema.addFieldFromModelProp('dontCanvass', 'Don\'t Canvass', ids.DONTCANVASS),
      CANVASSRES_TRYAGAIN_IDX =
        schema.addFieldFromModelProp('tryAgain', 'Try Again', ids.TRYAGAIN),
      CANVASSRES_SUPPORT_IDX =
        schema.addFieldFromModelProp('support', 'Support', ids.SUPPORT),
      CANVASSRES_DATE_IDX =
        schema.addFieldFromModelProp('date', 'Date', ids.DATE),

      // generate list of sort options
      sortOptions = schemaProvider.makeSortList(schema, 
        [CANVASSRES_AVAILABLE_IDX, CANVASSRES_DONTCANVASS_IDX, CANVASSRES_TRYAGAIN_IDX, CANVASSRES_SUPPORT_IDX, CANVASSRES_DATE_IDX],
        ID_TAG);

    $provide.constant('CANVASSRES_SCHEMA', {
      IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
      MODELPROPS: modelProps,

      SCHEMA: schema,
      // row indices
      CANVASSRES_AVAILABLE_IDX: CANVASSRES_AVAILABLE_IDX,
      CANVASSRES_DONTCANVASS_IDX: CANVASSRES_DONTCANVASS_IDX,
      CANVASSRES_TRYAGAIN_IDX: CANVASSRES_TRYAGAIN_IDX,
      CANVASSRES_SUPPORT_IDX: CANVASSRES_SUPPORT_IDX,
      CANVASSRES_DATE_IDX: CANVASSRES_DATE_IDX,

      SORT_OPTIONS: sortOptions,
      ID_TAG: ID_TAG,

      SUPPORT_UNKNOWN: -1,  // -1 represents unknown
      SUPPORT_MIN: 0,
      SUPPORT_MAX: 10       // 0-10 represents none to full support

    });
  }])

  .factory('canvassResultFactory', canvassResultFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

canvassResultFactory.$inject = ['$injector', '$filter', 'baseURL', 'storeFactory', 'resourceFactory', 'compareFactory', 'filterFactory', 'surveyFactory',
  'addressFactory', 'electionFactory', 'userFactory', 'miscUtilFactory', 'SCHEMA_CONST', 'CANVASSRES_SCHEMA', 'consoleService'];
function canvassResultFactory($injector, $filter, baseURL, storeFactory, resourceFactory, compareFactory, filterFactory, surveyFactory,
  addressFactory, electionFactory, userFactory, miscUtilFactory, SCHEMA_CONST, CANVASSRES_SCHEMA, consoleService) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'canvassResultFactory',
      readRspObject: readRspObject,
      readResponse: readResponse,
      storeRspObject: storeRspObject,

      getSortFunction: getSortFunction,

      filterResultsLatestPerAddress: filterResultsLatestPerAddress
    },
    con = consoleService.getLogger(factory.NAME);

  resourceFactory.registerStandardFactory(factory.NAME, {
    storeId: CANVASSRES_SCHEMA.ID_TAG,
    schema: CANVASSRES_SCHEMA.SCHEMA,
    sortOptions: CANVASSRES_SCHEMA.SORT_OPTIONS,
    addInterface: factory, // add standard factory functions to this factory
    resources: {
      result: resourceFactory.getResourceConfigWithId('canvassresult', {
        saveMany: { method: 'POST', isArray: true }
      })
    }
  });
  
  return factory;

  /* function implementation
    -------------------------- */

  /**
   * Read a server response canvass result object
   * @param {object} response   Server response
   * @param {object} args       arguments object
   *                            @see Schema.readProperty() for details
   * @returns {object}  Canvass object
   */
  function readRspObject (response, args) {
    if (!args) {
      args = {};
    }
    if (!args.convert) {
      args.convert = readRspObjectValueConvert;
    }
    // add resources required by Schema object
    resourceFactory.addResourcesToArgs(args);

    var stdArgs = resourceFactory.standardiseArgs(args),
      object = CANVASSRES_SCHEMA.SCHEMA.read(response, stdArgs);

    con.debug('Read canvass result rsp object: ' + object);

    return object;
  }

  /**
   * Convert values read from a server canvass result response
   * @param {number}    schema id 
   * @param {object}    read value
   * @returns {object}  Converted value
   */
  function readRspObjectValueConvert(id, value) {
    switch (id) {
      case CANVASSRES_SCHEMA.IDs.DATE:
      case CANVASSRES_SCHEMA.IDs.CREATED:
      case CANVASSRES_SCHEMA.IDs.UPDATED:
        value = new Date(value);
        break;
      default:
        // other fields require no conversion
        break;
    }
    return value;
  }

  /**
   * Read a canvass result response from the server
   * @param {object}   response   Server response
   * @param {object}   args       process arguments object with following properties
   *    {string|Array}  objId       id/array of ids of canvass & survey objects to save response data to
   *    {string|Array}  addrId      id/array of ids of list object(s) to save address data to
   *    {string|Array}  userId      id/array of ids of list object to save canvasser data to
   *    {number}        flags       storefactory flags
   *    {object}        surveyArgs  arguments to process embedded survey sub doc, 
   *                                @see surveyFactory.readResponse() for details
   *    {object}        electionArgs arguments to process embedded election sub doc, 
   *                                @see electionFactory.readResponse() for details
   *    {function}      next        function to call after processing
   * @return {object}   Canvass object
   */
  function readResponse (response, args) {

    var result = readRspObject(response, args);
    return storeRspObject(result, args);
  }

  /**
   * Store a canvass result response from the server
   * @param {object}   response   Server response
   * @param {object}   args       process arguments object with following properties
   *    {string|Array}  objId       id/array of ids of canvass & survey objects to save response data to
   *    {string|Array}  addrId      id/array of ids of list object(s) to save address data to
   *    {string|Array}  userId      id/array of ids of list object to save canvasser data to
   *    {number}        flags       storefactory flags
   *    {object}        surveyArgs  arguments to process embedded survey sub doc, 
   *                                @see surveyFactory.readResponse() for details
   *    {object}        electionArgs arguments to process embedded election sub doc, 
   *                                @see electionFactory.readResponse() for details
   *    {function}      next        function to call after processing
   * @return {object}   Canvass object
   */
  function storeRspObject(canvassRes, args) {

    con.debug('Store canvass result response: ' + canvassRes);

    // just basic storage args as subdocs have been processed above
    var storeArgs = resourceFactory.copyBasicStorageArgs(args, {
      factory: $injector.get(factory.NAME)
    });

    return resourceFactory.storeServerRsp(canvassRes, storeArgs);
  }

  /**
   * Get the sort function for a canvass result ResourceList
   * @param   {object} sortOptions  List of possible sort option
   * @param   {object} sortBy       Key to sort by
   * @returns {function} sort function
   */
  function getSortFunction(options, sortBy) {
    var sortFxn = resourceFactory.getSortFunction(options, sortBy);
    if (typeof sortFxn === 'object') {
      var sortItem = SCHEMA_CONST.DECODE_SORT_ITEM_ID(sortFxn.id);
      if (sortItem.idTag === CANVASSRES_SCHEMA.ID_TAG) {
        switch (sortItem.index) {
          case CANVASSRES_SCHEMA.CANVASSRES_AVAILABLE_IDX:
            sortFxn = compareAvailable;
            break;
          case CANVASSRES_SCHEMA.CANVASSRES_DONTCANVASS_IDX:
            sortFxn = compareDontCanvass;
            break;
          case CANVASSRES_SCHEMA.CANVASSRES_TRYAGAIN_IDX:
            sortFxn = compareTryAgain;
            break;
          case CANVASSRES_SCHEMA.CANVASSRES_SUPPORT_IDX:
            sortFxn = compareSupport;
            break;
          case CANVASSRES_SCHEMA.CANVASSRES_DATE_IDX:
            sortFxn = compareDate;
            break;
          default:
            sortFxn = undefined;
            break;
        }
      }
    }
    return sortFxn;
  }

  /**
   * Compare objects based on 'available' property
   * @param {object}  a       First object to compare
   * @param {object}  b       Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareAvailable (a, b) {
    return compareFactory.compareBooleanFields(CANVASSRES_SCHEMA.SCHEMA, CANVASSRES_SCHEMA.CANVASSRES_AVAILABLE_IDX, a, b);
  }

  /**
   * Compare objects based on 'dont canvass' property
   * @param {object}  a       First object to compare
   * @param {object}  b       Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareDontCanvass (a, b) {
    return compareFactory.compareBooleanFields(CANVASSRES_SCHEMA.SCHEMA, CANVASSRES_SCHEMA.CANVASSRES_DONTCANVASS_IDX, a, b);
  }

  /**
   * Compare objects based on 'try again' property
   * @param {object}  a       First object to compare
   * @param {object}  b       Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareTryAgain (a, b) {
    return compareFactory.compareBooleanFields(CANVASSRES_SCHEMA.SCHEMA, CANVASSRES_SCHEMA.CANVASSRES_TRYAGAIN_IDX, a, b);
  }

  /**
   * Compare objects based on 'support' property
   * @param {object}  a       First object to compare
   * @param {object}  b       Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareSupport (a, b) {
    return compareFactory.compareNumberFields(CANVASSRES_SCHEMA.SCHEMA, CANVASSRES_SCHEMA.CANVASSRES_SUPPORT_IDX, a, b);
  }
  
  /**
   * Compare objects based on 'date' property
   * @param {object}  a       First object to compare
   * @param {object}  b       Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareDate (a, b) {
    return compareFactory.compareDateFields(CANVASSRES_SCHEMA.SCHEMA, CANVASSRES_SCHEMA.CANVASSRES_DATE_IDX, a, b);
  }
  
  
  /**
   * Filter an array of results to give a list of the latest results for each address
   * @param   {Array} resArray Result array to filter
   * @returns {Array} New array containing filtered values
   */
  function filterResultsLatestPerAddress (resArray) {
    var i,
      filteredList = filterFactory.filterArray(
        resArray.slice(),
        function (a, b) {
          // sort list in descending date order
          return compareFactory.compareDate(a.updatedAt, b.updatedAt, '-');
        },                                           
        function (value, index, array) {
          // exclude value from filtered list if newer entry already in list
          var noneNewer = true;
          for (i = index - 1; (i >= 0) && noneNewer; --i) {
            noneNewer = (array[i].address._id !== value.address._id);
          }
          return noneNewer;
        });
    return filteredList;
  }
  
  
}


/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', 'ELECTIONSCHEMA', 'SURVEYSCHEMA', 'ADDRSCHEMA', 'USERSCHEMA', function ($provide, schemaProvider, SCHEMA_CONST, ELECTIONSCHEMA, SURVEYSCHEMA, ADDRSCHEMA, USERSCHEMA) {

    var details = [
        SCHEMA_CONST.ID,
        schemaProvider.getStringModelPropArgs('name', { field: 'NAME' }),
        schemaProvider.getStringModelPropArgs('description', { field: 'DESCRIPTION' }),
        schemaProvider.getDateModelPropArgs('startDate', undefined, { field: 'STARTDATE' }),
        schemaProvider.getDateModelPropArgs('endDate', undefined, { field: 'ENDDATE' }),
        schemaProvider.getObjectIdModelPropArgs('election', 'electionFactory', 'election', ELECTIONSCHEMA, ELECTIONSCHEMA.IDs.ID, { field: 'ELECTION' }),
        schemaProvider.getObjectIdModelPropArgs('survey', 'surveyFactory', 'survey', SURVEYSCHEMA, SURVEYSCHEMA.IDs.ID, { field: 'SURVEY' }),
        schemaProvider.getObjectIdArrayModelPropArgs('addresses', 'addressFactory', 'address',  ADDRSCHEMA, ADDRSCHEMA.IDs.ID, { field: 'ADDRESSES' }),
        schemaProvider.getObjectIdArrayModelPropArgs('canvassers', 'userFactory', 'user', USERSCHEMA, USERSCHEMA.IDs.ID, { field: 'CANVASSERS' }),
        schemaProvider.getObjectIdArrayModelPropArgs('results', 'canvassResultFactory', 'result', undefined, undefined, { field: 'RESULTS' })
      ],
      ids = {},
      modelProps = [],
      i;

    for (i = 0; i < details.length; ++i) {
      ids[details[i].field] = i;          // id is index

      var args = angular.copy(details[i]);
      args.id = i;
      modelProps.push(schemaProvider.getModelPropObject(args));
    }

    var ID_TAG = SCHEMA_CONST.MAKE_ID_TAG('canvass'),
      schema = schemaProvider.getSchema('Canvass', modelProps, ids, ID_TAG),
      CANVASS_NAME_IDX =
        schema.addFieldFromModelProp('name', 'Name', ids.NAME),
      CANVASS_DESCRIPTION_IDX =
        schema.addFieldFromModelProp('description', 'Description', ids.DESCRIPTION),
      CANVASS_STARTDATE_IDX =
        schema.addFieldFromModelProp('start', 'Start Date', ids.STARTDATE),
      CANVASS_ENDDATE_IDX =
        schema.addFieldFromModelProp('end', 'End Date', ids.ENDDATE),
      CANVASS_ELECTION_IDX =
        schema.addFieldFromModelProp('election', 'Election', ids.ELECTION),
      CANVASS_SURVEY_IDX =
        schema.addFieldFromModelProp('survey', 'Survey', ids.SURVEY),

      // generate list of sort options
      sortOptions = schemaProvider.makeSortList(schema, 
        [CANVASS_NAME_IDX, CANVASS_DESCRIPTION_IDX, CANVASS_STARTDATE_IDX, CANVASS_ENDDATE_IDX, CANVASS_ELECTION_IDX],
        ID_TAG);

    $provide.constant('CANVASSSCHEMA', {
      IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
      MODELPROPS: modelProps,

      SCHEMA: schema,
      // row indices
      CANVASS_NAME_IDX: CANVASS_NAME_IDX,
      CANVASS_DESCRIPTION_IDX: CANVASS_DESCRIPTION_IDX,
      CANVASS_STARTDATE_IDX: CANVASS_STARTDATE_IDX,
      CANVASS_ENDDATE_IDX: CANVASS_ENDDATE_IDX,
      CANVASS_ELECTION_IDX: CANVASS_ELECTION_IDX,
      CANVASS_SURVEY_IDX: CANVASS_SURVEY_IDX,

      SORT_OPTIONS: sortOptions,
      ID_TAG: ID_TAG
    });
  }])

  .factory('canvassFactory', canvassFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

canvassFactory.$inject = ['$injector', 'baseURL', 'storeFactory', 'resourceFactory', 'filterFactory', 'miscUtilFactory', 'surveyFactory', 'questionFactory',
  'addressFactory', 'electionFactory', 'userFactory', 'canvassResultFactory', 'SCHEMA_CONST', 'CANVASSSCHEMA', 'SURVEYSCHEMA', 'RESOURCE_CONST', 'CHARTS', 'consoleService'];
function canvassFactory($injector, baseURL, storeFactory, resourceFactory, filterFactory, miscUtilFactory, surveyFactory, questionFactory,
  addressFactory, electionFactory, userFactory, canvassResultFactory, SCHEMA_CONST, CANVASSSCHEMA, SURVEYSCHEMA, RESOURCE_CONST, CHARTS, consoleService) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'canvassFactory',
      readRspObject: readRspObject,
      readResponse: readResponse,

      getSortFunction: getSortFunction,

      storeRspObject: storeRspObject,

      processAddressResultsLink: processAddressResultsLink,
      ADDR_RES_LINKADDRESS: 'addrResLinkAddr',  // link address flag for linking addresses & results
      ADDR_RES_LINKRESULT: 'addrResLinkRes',    // link result flag for linking addresses & results

      QUES_RES_LINKQUES: 'quesResLinkQues', // link results flag for linking questions & results
      QUES_RES_LINKRES: 'quesResLinkRes'    // link results flag for linking questions & results

    },
    con;  // console logger

  if (consoleService.isEnabled(factory.NAME)) {
    con = consoleService.getLogger(factory.NAME);
  }

  resourceFactory.registerStandardFactory(factory.NAME, {
    storeId: CANVASSSCHEMA.ID_TAG,
    schema: CANVASSSCHEMA.SCHEMA,
    sortOptions: CANVASSSCHEMA.SORT_OPTIONS,
    addInterface: factory, // add standard factory functions to this factory
    resources: {
      canvass: resourceFactory.getResourceConfigWithId('canvasses')
    }
  });

  return factory;

  /* function implementation
    -------------------------- */

  /**
   * Read a server response canvass object
   * @param {object} response   Server response
   * @param {object} args       arguments object
   *                            @see Schema.readProperty() for details
   * @returns {object}  Canvass object
   */
  function readRspObject (response, args) {
    if (!args) {
      args = {};
    }
    if (!args.convert) {
      args.convert = readRspObjectValueConvert;
    }
    // add resources required by Schema object
    resourceFactory.addResourcesToArgs(args);

    var stdArgs = resourceFactory.standardiseArgs(args),
      object = CANVASSSCHEMA.SCHEMA.read(response, stdArgs);

    processAddressResultsLink(response, stdArgs);
    processQuestionResultsLink(response, stdArgs);

    if (con) {
      con.debug('Read canvass rsp object: ' + object);
    }

    return object;
  }

  /**
   * Process the linking of addresses and results
   * @param {object} response   Server response
   * @param {object} args       arguments object
   */
  function processAddressResultsLink (response, args) {
    
    if (miscUtilFactory.readSafe(args, ['customArgs', 'linkAddressAndResult'])) {
      var stdArgs = resourceFactory.standardiseArgs(args),
        addr = resourceFactory.findAllInStandardArgs(stdArgs, function (arg) {
          return arg[factory.ADDR_RES_LINKADDRESS];
        }),
        result = resourceFactory.findAllInStandardArgs(stdArgs, function (arg) {
          return arg[factory.ADDR_RES_LINKRESULT];
        });
        
      linkAddressAndResults(addr, result, response);
    }
  }

  /**
   * Process the linking of questions and results
   * @param {object} response   Server response
   * @param {object} args       arguments object
   */
  function processQuestionResultsLink (response, args) {
    if (miscUtilFactory.readSafe(args, ['customArgs', 'linkQuestionAndResult'])) {
      var stdArgs = resourceFactory.standardiseArgs(args),
        ques = resourceFactory.findAllInStandardArgs(stdArgs, function (arg) {
          return arg[factory.QUES_RES_LINKQUES];
        }),
        result = resourceFactory.findAllInStandardArgs(stdArgs, function (arg) {
          return arg[factory.QUES_RES_LINKRES];
        });

      linkQuestionAndResults(ques, result, response);
    }
  }


  /**
   * Convert values read from a server canvass response
   * @param {number}    schema id 
   * @param {object}    read value
   * @returns {object}  Converted value
   */
  function readRspObjectValueConvert(id, value) {
    switch (id) {
      case CANVASSSCHEMA.IDs.STARTDATE:
      case CANVASSSCHEMA.IDs.ENDDATE:
        value = new Date(value);
        break;
      default:
        // other fields require no conversion
        break;
    }
    return value;
  }

  /**
   * Read a canvass response from the server
   * @param {object}   response   Server response
   * @param {object}   args       process arguments object 
   *    @see storeRspObject() for details
   * @return {object}   Canvass ResourceList object
   */
  function readResponse (response, args) {

    var object = readRspObject(response, args);
    return storeRspObject(object, args);
  }

  /**
   * Store a canvass response from the server
   * @param {object}   obj        Object to store
   * @param {object}   args       process arguments object
   *                              @see resourceFactory.storeServerRsp()
   * @return {object}   Canvass object
   */
  function storeRspObject (obj, args) {

    // async version
    //factory.storeRspObjectTest(factory.NAME, resourceFactory, obj, args, con, 'canvass');

    var subObjects, i;

    // store sub objects first
    if (args.subObj) {
      subObjects = miscUtilFactory.toArray(args.subObj);

      if (con) {
        con.debug('Store canvass subobjs: ' + subObjects.length);
      }

      for (i = 0; i < subObjects.length; ++i) {
        resourceFactory.storeSubDoc(obj, subObjects[i], args);
        if (con) {
          con.debug('Stored canvass subobj[' + i + ']: ' + subObjects[i].objId);
        }
      }
    }

    if (con) {
      con.debug('Store canvass response: ' + obj);
    }

    // just basic storage args as subdocs have been processed above
    var storeArgs = resourceFactory.copyBasicStorageArgs(args, {
      factory: $injector.get(factory.NAME)
    });

    return resourceFactory.storeServerRsp(obj, storeArgs);
  }

  /**
    * Link addresses to canvass results
    * @param {object|Array} addrArgs    arg object/array of arg objects of addresses
    * @param {object|Array} resultsId   arg object/array of arg objects of results
    * @param {object} response          object to read data from
    */
  function linkAddressAndResults (addrArgs, resultArgs, response) {
    if (addrArgs && resultArgs) {
      var addresses,
        results,
        filteredList,
        obj;

      miscUtilFactory.toArray(response).forEach(function (rsp) {
        addresses = []; // array of arrays of addresses
        results = [];   // array of arrays of results

        miscUtilFactory.toArray(addrArgs).forEach(function (addrArg) {
          obj = resourceFactory.getObjectInfo(rsp, addrArg).object;
          if (obj) {
            addresses.push(obj);
          }
        });
        miscUtilFactory.toArray(resultArgs).forEach(function (resArg) {
          obj = resourceFactory.getObjectInfo(rsp, resArg).object;
          if (obj) {
            results.push(obj);
          }
        });

        if (con) {
          con.debug('linkAddressAndResults: addresses ' + addresses.length + ' results ' + results.length);
        }

        if (addresses.length && results.length) {
          results.forEach(function (resArray) {
            
            filteredList = canvassResultFactory.filterResultsLatestPerAddress(resArray);

            filteredList.forEach(function (resObj) {

              addresses.forEach(function (addrArray) {
                var addrObj = addrArray.find(function (entry) {
                  return (entry._id === resObj.address._id);
                });
                if (addrObj) {
                  // link address and canvass result
                  addrObj.canvassResult = resObj._id;
                  addrObj.canvassDate = new Date(resObj.updatedAt);
                }
              });
            });
          });
        }
      });
    }
  }

  /**
    * Link questions to canvass results
    * @param {object|Array} quesArgs    arg object/array of arg objects of questions
    * @param {object|Array} resultsId   arg object/array of arg objects of results
    * @param {object} response          object to read data from
    */
  function linkQuestionAndResults (quesArgs, resultArgs, response) {
    if (quesArgs && resultArgs) {
      var quesLists = [],
        resLists = [],
        i, resData, obj;

      miscUtilFactory.toArray(quesArgs).forEach(function (quesArg) {
        obj = resourceFactory.getObjectInfo(response, quesArg).object;
        if (obj) {
          quesLists.push({
            list: obj,                // questions array
            factory: quesArg.factory  // factory to handle them
          });
        }
      });
      miscUtilFactory.toArray(resultArgs).forEach(function (resArg) {
        obj = resourceFactory.getObjectInfo(response, resArg).object;
        if (obj) {
          resLists.push({
            list: obj,  // results array
            getChartType: (resArg.customArgs ? resArg.customArgs.getChartType : undefined)
          });
        }
      });

      if (quesLists.length && resLists.length) {
        // loop questions initialising results related data
        quesLists.forEach(function (questionList) {
          questionList.list.forEach(function (question) {
            resData = {
              // labels, chart, data, series, maxValue, data indices properties
            }; // put all results related stuff in a single object
            if (questionList.factory.showQuestionOptions(question.type)) {
              resData.labels = question.options;

              /* chart.js pie, polarArea & doughnut charts may be displayed using
                  single data series (i.e. data = []), whereas chart.js radar, line &
                  bar require multiple data series (i.e. data = [[], []]) */
              var array = []; // raw data array
              for (i = 0; i < resData.labels.length; ++i) {
                array[i] = 0;

                // add properties to the question whose values are the indices into the data array
                resData[makeOptionIndexPropertyName(resData.labels[i])] = i;
              }
              
              resLists.forEach(function (res) {
                if (res.getChartType) {
                  resData.chart = res.getChartType(question.type);
                  switch (resData.chart) {
                    case CHARTS.PIE:
                    case CHARTS.POLAR:
                    case CHARTS.DOUGHNUT:
                      resData.data = array;
                      // series info not required
                      break;
                    case CHARTS.BAR:
                    case CHARTS.RADAR:
                    case CHARTS.LINE:
                      resData.data = [array];
                      resData.series = ['0'];  // just one series
                      break;
                  }
                }
              });
              resData.maxValue = 0;

            } else if (questionList.factory.showTextInput(question.type)) {
              resData.data = [];
            }
            question.resData = resData;
          });
        });
        
        // loop through results linking answers & questions
        var ansProcessor = new AnswerProcessor();
        resLists.forEach(function (res) {
          if (res.list) {
            // loop through results 
            res.list.forEach(function (result) {
              if (result.answers && result.answers.length) {

                // loop thru answers looking for questions from list
                result.answers.forEach(function (answer) {
                  ansProcessor.setAnswer(answer);

                  quesLists.forEach(function (questionList) {
                    questionList.list.forEach(function (question) {
                      if (ansProcessor.testQuestionId(question)) {
                        // set data for options from answer
                        resData = question.resData;
                        if (questionFactory.showQuestionOptions(question.type)) {
                          ansProcessor.setQuestion(question);

                          if (resData.series) {
                            // only one series for now but ..
                            ansProcessor.setSeriesIdx(resData.series.length - 1);
                          } else {
                            ansProcessor.clrSeriesIdx();
                          }

                          var splits = answer.answer.split(',');
                          splits.forEach(ansProcessor.procData, ansProcessor);

                        } else if (questionFactory.showTextInput(question.type)) {
                          resData.data.push(answer.answer);
                        }
                      }
                    });
                  });
                });
              }
            });
          }
        });
      }
    }
  }

  /**
   * Processor for a aurvey answer's data
   */
  function AnswerProcessor () {
    this.answer = undefined;
    this.question = undefined;
    this.seriesIdx = -1;

    this.setAnswer = function (answer) {
      this.answer = answer;
    };
    this.setQuestion = function (question) {
      this.question = question;
    };
    this.setSeriesIdx = function (seriesIdx) {
      this.seriesIdx = seriesIdx;
    };
    this.clrSeriesIdx = function () {
      this.seriesIdx = -1;
    };

    this.testQuestionId = function (ques) {
      var result = false;
      if (this.answer.question) {
        result = (this.answer.question._id === ques._id);
      }
      return result;
    };
    
    this.procData = function (ans) {
      var idx,
        value;

      if (questionFactory.showRankingNumber(this.question.type)) {
        /* if its a ranking question the answer is the value between min & 
            max rank, not the displayed options */
        idx = parseInt(ans) - this.question.rangeMin;
      } else {
        idx = this.question.resData[makeOptionIndexPropertyName(ans)];
      }
      if (idx >= 0) {
        if (this.seriesIdx >= 0) {
          value = ++this.question.resData.data[this.seriesIdx][idx];
        } else {
          value = ++this.question.resData.data[idx];
        }
        if (value > this.question.resData.maxValue) {
          this.question.resData.maxValue = value;
        }
      }
    };
  }

  /**
   * Make an option index property name
   * @param   {string} option Option name
   * @returns {string} property name
   */
  function makeOptionIndexPropertyName (option) {
    return 'optIdx_' + option;
  }
  
  function getSortFunction (options, sortBy) {
    var sortFxn = resourceFactory.getSortFunction(options, sortBy);
    if (typeof sortFxn === 'object') {
      var sortItem = SCHEMA_CONST.DECODE_SORT_ITEM_ID(sortFxn.id);
      if (sortItem.idTag === CANVASSSCHEMA.ID_TAG) {
        switch (sortItem.index) {
          //case CANVASSSCHEMA.CANVASS_NAME_IDX:
          //  sortFxn = compareAddress;
          //  break;
          default:
            sortFxn = undefined;
            break;
        }
      }
    }
    return sortFxn;
  }

}


/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', 'CANVASSSCHEMA', 'USERSCHEMA', 'ADDRSCHEMA', function ($provide, schemaProvider, SCHEMA_CONST, CANVASSSCHEMA, USERSCHEMA, ADDRSCHEMA) {

    var details = [
        SCHEMA_CONST.ID,
        schemaProvider.getObjectIdModelPropArgs('canvass', 'canvassFactory', 'canvass', CANVASSSCHEMA, CANVASSSCHEMA.IDs.ID, { field: 'CANVASS' }),
        schemaProvider.getObjectIdModelPropArgs('canvasser', 'userFactory', 'user', USERSCHEMA, USERSCHEMA.IDs.ID, { field: 'CANVASSER' }),
        schemaProvider.getObjectIdArrayModelPropArgs('addresses', 'addressFactory', 'address', ADDRSCHEMA, ADDRSCHEMA.IDs.ID, { field: 'ADDRESSES' }),
        SCHEMA_CONST.CREATEDAT,
        SCHEMA_CONST.UPDATEDAT
      ],
      ids = {},
      modelProps = [];

    for (var i = 0; i < details.length; ++i) {
      ids[details[i].field] = i;          // id is index

      var args = angular.copy(details[i]);
      args.id = i;
      modelProps.push(schemaProvider.getModelPropObject(args));
    }

    var ID_TAG = SCHEMA_CONST.MAKE_ID_TAG('canvassassignment'),
      schema = schemaProvider.getSchema('CanvassAssignment', modelProps, ids, ID_TAG),
      CANVASSASSIGN_CANVASS_IDX =
        schema.addFieldFromModelProp('canvass', 'Canvass', ids.CANVASS),
      CANVASSASSIGN_CANVASSER_IDX =
        schema.addFieldFromModelProp('canvasser', 'Canvasser', ids.CANVASSER),

      // generate list of sort options
      sortOptions = schemaProvider.makeSortList(schema, 
        [CANVASSASSIGN_CANVASS_IDX, CANVASSASSIGN_CANVASSER_IDX],
        ID_TAG);

    $provide.constant('CANVASSASSIGN_SCHEMA', {
      IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
      MODELPROPS: modelProps,

      SCHEMA: schema,
      // row indices
      CANVASSASSIGN_CANVASS_IDX: CANVASSASSIGN_CANVASS_IDX,
      CANVASSASSIGN_CANVASSER_IDX: CANVASSASSIGN_CANVASSER_IDX,

      SORT_OPTIONS: sortOptions,
      ID_TAG: ID_TAG
    });
  }])

  .factory('canvassAssignmentFactory', canvassAssignmentFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

canvassAssignmentFactory.$inject = ['$injector', '$filter', '$q', 'baseURL', 'storeFactory', 'resourceFactory', 'compareFactory', 'filterFactory', 'miscUtilFactory', 'surveyFactory', 'canvassFactory',
  'addressFactory', 'electionFactory', 'userFactory', 'SCHEMA_CONST', 'CANVASSASSIGN_SCHEMA', 'consoleService', 'undoFactory'];
function canvassAssignmentFactory($injector, $filter, $q, baseURL, storeFactory, resourceFactory, compareFactory, filterFactory, miscUtilFactory, surveyFactory, canvassFactory,
  addressFactory, electionFactory, userFactory, SCHEMA_CONST, CANVASSASSIGN_SCHEMA, consoleService, undoFactory) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'canvassAssignmentFactory',
      readRspObject: readRspObject,
      readResponse: readResponse,
      storeRspObject: storeRspObject,

      getSortFunction: getSortFunction,

      linkCanvasserToAddr: linkCanvasserToAddr,
      unlinkAddrFromCanvasser: unlinkAddrFromCanvasser,
      unlinkAddrListFromCanvasser: unlinkAddrListFromCanvasser,
      setLabeller: setLabeller,

      // objects to be extracted from response
      ADDR_CANVSR_LINKCANVASSER: 'addrCanvsrlinkCanvasser',   // canvasser whose allocation it is
      ADDR_CANVSR_LINKADDRESS: 'addrCanvsrlinkAddress',       // canvasser's address allocation 
      ADDR_CANVSR_CANVASSERARRAY: 'addrCanvsrCanvasserArray', // array of canvassers
      ADDR_CANVSR_ADDRESSARRAY: 'addrCanvsrAddressArray',     // array of addresses
      // objects to be extracted from store
      ADDR_CANVSR_CANVASSERLIST: 'addrCanvsrCanvasserList',   // ResourceList of canvassers
      ADDR_CANVSR_ADDRESSLIST: 'addrCanvsrAddressList'        // ResourceList of addresses

    },
    addrCanvsrLinkArgs = [factory.ADDR_CANVSR_LINKCANVASSER, factory.ADDR_CANVSR_LINKADDRESS],
    addrCanvsrCanvsrsArgs = [factory.ADDR_CANVSR_CANVASSERARRAY, factory.ADDR_CANVSR_CANVASSERLIST],
    addrCanvsrAddrsArgs = [factory.ADDR_CANVSR_ADDRESSARRAY, factory.ADDR_CANVSR_ADDRESSLIST],
    addrCanvsrArrayArgs = [factory.ADDR_CANVSR_ADDRESSARRAY, factory.ADDR_CANVSR_CANVASSERARRAY],
    addrCanvsrObjArgs = addrCanvsrLinkArgs.concat(addrCanvsrArrayArgs),
    addrCanvsrListArgs = [factory.ADDR_CANVSR_CANVASSERLIST, factory.ADDR_CANVSR_ADDRESSLIST],
    addrCanvsrAllArgs = addrCanvsrObjArgs.concat(addrCanvsrListArgs),
    dfltLabeller,
    con;  // console logger

  if (consoleService.isEnabled(factory.NAME)) {
    con = consoleService.getLogger(factory.NAME);
  }

  resourceFactory.registerStandardFactory(factory.NAME, {
    storeId: CANVASSASSIGN_SCHEMA.ID_TAG,
    schema: CANVASSASSIGN_SCHEMA.SCHEMA,
    sortOptions: CANVASSASSIGN_SCHEMA.SORT_OPTIONS,
    addInterface: factory, // add standard factory functions to this factory
    resources: {
      assignment: resourceFactory.getResourceConfigWithId('canvassassignment', {
        saveMany: { method: 'POST', isArray: true }
      }),
      canvasses: resourceFactory.getResourceConfig('canvassassignment/canvasses')
    }
  });

  return factory;

  /* function implementation
    -------------------------- */

  /**
   * Read a server response canvass assignment object
   * @param {object} response   Server response
   * @param {object} args       arguments object
   *                            @see Schema.readProperty() for details
   * @returns {object}  Canvass object
   */
  function readRspObject (response, args) {
    if (!args) {
      args = {};
    }
    if (!args.convert) {
      args.convert = readRspObjectValueConvert;
    }
    // add resources required by Schema object
    resourceFactory.addResourcesToArgs(args);

    var stdArgs = resourceFactory.standardiseArgs(args),
      object = CANVASSASSIGN_SCHEMA.SCHEMA.read(response, stdArgs);

    canvassFactory.processAddressResultsLink(object, stdArgs);

    processAddressCanvasserLink(object, stdArgs);

    if (con) {
      con.debug('Read canvass assignment rsp object: ' + object);
    }

    return object;
  }

  /**
   * Process the linking of canvassers and addresses
   * @param {object} response   Server response
   * @param {object} args       arguments object
   */
  function processAddressCanvasserLink (response, args) {
    if (args.linkAddressAndCanvasser) {
      var stdArgs = resourceFactory.standardiseArgs(args),
        linkArg = {};
      addrCanvsrAllArgs.forEach(function (flag) {
        linkArg[flag] = resourceFactory.findAllInStandardArgs(stdArgs, function (arg) {
          return arg[flag];
        });
      });

      linkAddressAndCanvasser(linkArg, response, args.linkAddressAndCanvasser.labeller);
    }
  }

  /**
   * Convert values read from a server canvass assignment response
   * @param {number}    schema id 
   * @param {object}    read value
   * @returns {object}  Converted value
   */
  function readRspObjectValueConvert(id, value) {
    switch (id) {
      case CANVASSASSIGN_SCHEMA.IDs.CREATED:
      case CANVASSASSIGN_SCHEMA.IDs.UPDATED:
        value = new Date(value);
        break;
      default:
        // other fields require no conversion
        break;
    }
    return value;
  }

  /**
   * Read a canvass assignment response from the server
   * @param {object}   response   Server response
   * @param {object}   args       process arguments object with following properties
   *    {string|Array}  objId       id/array of ids of canvass & survey objects to save response data to
   *    {string|Array}  addrId      id/array of ids of list object(s) to save address data to
   *    {string|Array}  userId      id/array of ids of list object to save canvasser data to
   *    {number}        flags       storefactory flags
   *    {object}        surveyArgs  arguments to process embedded survey sub doc, 
   *                                @see surveyFactory.readResponse() for details
   *    {object}        electionArgs arguments to process embedded election sub doc, 
   *                                @see electionFactory.readResponse() for details
   *    {function}      next        function to call after processing
   * @return {object}   Canvass object
   */
  function readResponse (response, args) {

    var object = readRspObject(response, args);
    return storeRspObject(object, args);
  }

  /**
   * Store a canvass assignment response from the server
   * @param {object}   response   Server response
   * @param {object}   args       process arguments object, @see resourceFactory.storeServerRsp() for details
   * @return {object}   Canvass object
   */
  function storeRspObject (obj, args) {

    // async version
    //factory.storeRspObjectTest(factory.NAME, resourceFactory, obj, args, con, 'canvass assignment');

    var subObjects, i, ll;

    // store sub objects first
    if (args.subObj) {
      subObjects = miscUtilFactory.toArray(args.subObj);

      if (con) {
        con.debug('Store canvass assignment subobjs: ' + subObjects.length);
      }

      for (i = 0, ll = subObjects.length; i < ll; ++i) {
        resourceFactory.storeSubDoc(obj, subObjects[i], args);
        if (con) {
          con.debug('Stored canvass assignment subobj[' + i + ']: ' + subObjects[i].objId);
        }
      }
    }

    if (con) {
      con.debug('Store canvass assignment response: ' + obj);
    }

    // just basic storage args as subdocs have been processed above
    var storeArgs = resourceFactory.copyBasicStorageArgs(args, {
      factory: $injector.get(factory.NAME)
    });

    return resourceFactory.storeServerRsp(obj, storeArgs);
  }

  /**
   * Get the sort function for a canvass assignment ResourceList
   * @param   {object} sortOptions  List of possible sort option
   * @param   {object} sortBy       Key to sort by
   * @returns {function} sort function
   */
  function getSortFunction(options, sortBy) {
    var sortFxn = resourceFactory.getSortFunction(options, sortBy);
    if (typeof sortFxn === 'object') {
      var sortItem = SCHEMA_CONST.DECODE_SORT_ITEM_ID(sortFxn.id);
      if (sortItem.idTag === CANVASSASSIGN_SCHEMA.ID_TAG) {
        switch (sortItem.index) {
          //case CANVASSASSIGN_SCHEMA.CANVASSASSIGN_CANVASS_IDX:
          //  sortFxn = compareAvailable;
          //  break;
          //case CANVASSASSIGN_SCHEMA.CANVASSASSIGN_CANVASSER_IDX:
          //  sortFxn = compareDontCanvass;
          //  break;
          default:
            sortFxn = undefined;
            break;
        }
      }
    }
    return sortFxn;
  }

  /**
   * Link addresses & canvassers
   * @throws {Error} for incorrect arguments
   * @param   {object}   linkArg  Link arguments
   * @param   {object}   response Data to process
   * @param   {function} labeller Function to generate label classes
   */
  function linkAddressAndCanvasser(linkArg, response, labeller) {
    var linkCanvasser,    // canvasser whose allocation it is
      linkAddressList,    // canvasser's address allocation 
      linkCanvasserListArray,   // array of array's of canvassers
      linkAddressListArray;     // array of array's of addresses

    if (linkArg) {
      // response may be an array depending on query params
      miscUtilFactory.toArray(response).forEach(function (canvasserAssignment) {

        var artifacts = getLinkAddressAndCanvasserArtifacts(linkArg, canvasserAssignment);
        if (artifacts) {
          // get canvasser arrays & resource lists
          linkCanvasserListArray = getPropertiesWithLength(addrCanvsrCanvsrsArgs, artifacts);
          // get address arrays & resource lists
          linkAddressListArray = getPropertiesWithLength(addrCanvsrAddrsArgs, artifacts);

          // have all the info i.e. canvasser whose alloc it is and the allocations in the canvass subdoc
          linkCanvasser = getFirstOfOne(artifacts[factory.ADDR_CANVSR_LINKCANVASSER], // array of link canvasser
            'Multiple link canvassers specified', 'Invalid link canvasser');
          if (con) {
            con.debug('Link canvasser: ' + JSON.stringify(linkCanvasser));
          }

          linkAddressList = getFirstOfOne(artifacts[factory.ADDR_CANVSR_LINKADDRESS],  // array of link canvasser's addresses
            'Multiple link addresses specified', 'Invalid link canvasser address list');

          if (linkCanvasser && linkAddressList) {
            // find canvasser whose allocation it is in list of assigned canvassers
            searchMap(linkCanvasserListArray, linkCanvasser._id, function (canvasserToLink) {

              if (con) {
                con.debug('Canvasser to link: ' + JSON.stringify(canvasserToLink));
              }

              // save id of canvasser's allocation record
              canvasserToLink.allocId = canvasserAssignment._id;

              // find the allocated address in the list of assigned addresses
              linkAddressList.forEach(function (linkAddress) {
                // find address to link in list of addresses
                searchMap(linkAddressListArray, linkAddress._id, function (addressToLink) {

                  if (con) {
                    con.debug('Address to link: ' + JSON.stringify(addressToLink));
                  }
                  linkCanvasserToAddr(canvasserToLink, addressToLink, labeller);
                });
              });
            });
          }
        }
      });
    }
  }

  /**
    * Get the link addresses & canvasser
    * @param {object} linkArg             Link arguments
    * @param {object} canvasserAssignment Assignment response from server
    * @return {object}  Artifacts object
    */
  function getLinkAddressAndCanvasserArtifacts(linkArg, canvasserAssignment) {
    var artifacts;
    if (linkArg) {
      var link = countProperties(addrCanvsrLinkArgs, linkArg),      // count number of link args
        canvsrs = countProperties(addrCanvsrCanvsrsArgs, linkArg),  // count number of canvasser args
        addrs = countProperties(addrCanvsrAddrsArgs, linkArg);      // count number of address args

      // check have all the args
      if ((link === addrCanvsrLinkArgs.length) && (canvsrs >= 1) && (addrs >= 1)) {
        // have all link args and, canvassers & addresses to connect args

        // check have all the data, i.e. array lengths > 0
        link = countPropertiesLength(addrCanvsrLinkArgs, linkArg);
        canvsrs = countPropertiesLength(addrCanvsrCanvsrsArgs, linkArg);
        addrs = countPropertiesLength(addrCanvsrAddrsArgs, linkArg);
        if ((link === addrCanvsrLinkArgs.length) && (canvsrs >= 1) && (addrs >= 1)) {
          // have everything
          var addToArtifacts = function (obj, prop) {
              if (obj) {
                if (!artifacts[prop]) {
                  artifacts[prop] = [];
                }
                artifacts[prop].push(obj);
              }
            },
            addIdMap = function (obj, prop) {
              if (obj) {
                addToArtifacts(miscUtilFactory.arrayToMap(obj, '_id'), prop);
              }
            };

          artifacts = {};

          // get the link args and put into result
          processPropertiesFromArgs(addrCanvsrLinkArgs, linkArg, function (objId, prop, arg) {
            // save link canvasser & their allocated addresses as it
            addToArtifacts(resourceFactory.getObjectInfo(canvasserAssignment, arg).object, prop);
          });
          // get the link arrays and put into result
          processPropertiesFromArgs(addrCanvsrArrayArgs, linkArg, function (objId, prop, arg) {
            // convert to map for easy lookup
            addIdMap(resourceFactory.getObjectInfo(canvasserAssignment, arg).object, prop);
          });
          // get the lists & put into result
          processPropertiesFromArgs(addrCanvsrListArgs, linkArg, function (objId, prop, arg) {
            // convert to map for easy lookup
            addIdMap(arg.factory.getList(objId), prop);
          });
        }
      }
    }
    return artifacts;
  }

  function processPropertiesFromArgs(properties, linkArg, processFunc) {
    properties.forEach(function (prop) {
      miscUtilFactory.toArray(linkArg[prop]).forEach(function (arg) {
        var objId = arg.objId;
        // if object is being saved it'll be a string or array of strings
        if (!objId || (Array.isArray(objId) && !objId.length)) {
          // object is not being saved
          objId = 'nosave'; // dummy objId
        }
        miscUtilFactory.toArray(objId).forEach(function (objId) {
          processFunc(objId, prop, arg);
        });
      });
    });
  }


  function searchMap(arrayOfArrayOfMap, id, processFunc) {
    var result;

    arrayOfArrayOfMap.forEach(function (arrayOfMap) {
      arrayOfMap.forEach(function (map) {
        result = map[id];
        if (result) {
          processFunc(result);
        }
      });
    });
  }

  function getFirstOfOne(array, tooManyErr, invalidErr) {
    var result;
    if (array) {
      if (array.length > 1) {
        throw new Error(tooManyErr);
      } else {
        // should only be linking 1 canvasser
        result = array[0];
        if (!result) {
          throw new Error(invalidErr);
        }
      }
    }
    return result;
  }

  function getPropertiesWithLength(properties, arrayOfArrays) {
    var result = [];
    properties.forEach(function (prop) {
      if (arrayOfArrays[prop] && arrayOfArrays[prop].length) {
        result.push(arrayOfArrays[prop]);
      }
    });
    return result;
  }




  /**
   * Count the number of specified properties in an object
   * @param {array} props   Array of property names
   * @param {object} obj    Object to check
   * @returns {number} Property count
   */
  function countProperties(props, obj) {
    var i = 0;
    props.forEach(function (prop) {
      if (obj[prop]) {
        ++i;
      }
    });
    return i;
  }

  /**
   * Count the number of specified array properties in an object with length > 0
   * @param {array} props   Array of property names
   * @param {object} obj    Object to check
   * @returns {number} Property count
   */
  function countPropertiesLength(props, obj) {
    var i = 0;
    props.forEach(function (prop) {
      if (obj[prop].length) {
        ++i;
      }
    });
    return i;
  }

  /**
   * Link the specified canvasser and address
   * @param {object}   canvasser Canvasser object to link
   * @param {object}   addr      Address object to link
   * @param {function} labeller  Label class generator function
   * @param {boolean}  rtnUndo   Generate undo  object
   * @return {object}   undo object
   */
  function linkCanvasserToAddr (canvasser, addr, labeller, rtnUndo) {
    var undo;
    
    if (typeof labeller === 'boolean') {
      rtnUndo = labeller;
      labeller = undefined;
    }

    if (!canvasser.addresses) {
      canvasser.addresses = [];
    }
    if (findAddrIndex(canvasser, addr) < 0) {
      canvasser.addresses.push(addr._id); // not in list so add
    }

    addr.canvasser = canvasser._id;
    if (!canvasser.badge) {
      angular.extend(canvasser, makeCanvasserBadge(canvasser));
    }
    copyCanvasserBadge(canvasser, addr);

    if (!canvasser.labelClass) {
      if (labeller) {
        canvasser.labelClass = labeller();
      } else if (dfltLabeller) {
        canvasser.labelClass = dfltLabeller();
      }
    }
    addr.labelClass = canvasser.labelClass;
    
    if (rtnUndo) {
      undo = undoFactory.newUndoStep(
        factory.unlinkAddrFromCanvasser.bind(factory, canvasser, addr)
      );
    }
    
    return undo;
  }

  /**
   * Link the specified canvasser and address
   * @param {object}   canvasser  Canvasser object to link
   * @param {object}   addr       Address object to link
   */
  function findAddrIndex (canvasser, addr) {
    return canvasser.addresses.findIndex(function (entry) {
      return (entry === this._id);
    }, addr);
  }

  /**
   * Generate a canvasser badge
   * @param   {object} canvasser Canvasser object
   * @returns {string} badge
   */
  function makeCanvasserBadge (canvasser) {
    return {
      badge: getFirstLetters(canvasser.person.firstname) +
              getFirstLetters(canvasser.person.lastname),
      canvasserTip: 'Canvasser: ' + canvasser.person.firstname + ' ' +
                                      canvasser.person.lastname
    };
  }
  
  /**
   * Copy cnavasser badge properties
   * @param {object} src Source object
   * @param {object} dst Destination object
   */
  function copyCanvasserBadge (src, dst) {
    dst.badge = src.badge;
    dst.canvasserTip = src.canvasserTip;
  }
  
  /**
   * Remove cnavasser badge properties
   * @param {object} from Object to remove from
   */
  function removeCanvasserBadge (from) {
    delete from.badge;
    delete from.canvasserTip;
  }
  
  /**
   * Get the first letters of all words in a string
   * @param {string}   str  String to get leading letter from
   * @return {string}  String of leading letters
   */
  function getFirstLetters (str) {
    var splits,
      letters = '';
    if (str) {
      splits = str.split(' ');
      splits.forEach(function (split) {
        letters += split.charAt(0);
      });
    }
    return letters;
  }

  /**
   * Unlink the specified canvasser and address
   * @param {object}  canvasser Canvasser object to unlink
   * @param {object}  addr      Address object to unlink
   * @param {boolean} rtnUndo   Generate undo  object
   * @return {object}  undo object
   */
  function unlinkAddrFromCanvasser (canvasser, addr, rtnUndo) {
    var undo,
      idx;
    if (canvasser.addresses) {
      idx = findAddrIndex(canvasser, addr);
      if (idx >= 0) {
        canvasser.addresses.splice(idx, 1);
        
        if (rtnUndo) {
          undo = undoFactory.newUndoStep(
            factory.linkCanvasserToAddr.bind(factory, canvasser, addr)
          );
        }
      }
    }
    delete addr.canvasser;
    removeCanvasserBadge(addr);

    return undo;
  }

  /**
   * Unlink the specified canvasser and all addresses in a list
   * @param {object}   canvasser  Canvasser object to unlink
   * @param {array}   addrArray   List of address objects to unlink
   * @param {boolean} rtnUndo   Generate undo  object
   * @return {array} array of undo objects
   */
  function unlinkAddrListFromCanvasser (canvasser, addrArray, rtnUndo) {
    var undo = [];
    if (canvasser.addresses) {
      canvasser.addresses.forEach(function (addrId) {
        var addr = addrArray.find(function (entry) {
          return (entry._id === this);
        }, addrId);
        if (addr) {
          delete addr.canvasser;
          removeCanvasserBadge(addr);
          
          if (rtnUndo) {
            undo.push(undoFactory.newUndoStep(
              factory.linkCanvasserToAddr.bind(factory, canvasser, addr)
            ));
          }
        }
      });
    }
    canvasser.addresses = [];

    return (undo.length ? undo : undefined);
  }

  /**
   * Set the labeling function
   * @param {function} labelfunc Function to return label class
   */
  function setLabeller (labelfunc) {
    dfltLabeller = labelfunc;
  }

}


/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', function ($provide, schemaProvider, SCHEMA_CONST) {

    var details = [
        SCHEMA_CONST.ID,
        schemaProvider.getStringModelPropArgs('type', { field: 'TYPE' }),
        schemaProvider.getStringModelPropArgs('name', { field: 'NAME' }),
        schemaProvider.getStringModelPropArgs('email', { field: 'EMAIL' }),
        schemaProvider.getStringModelPropArgs('comment', { field: 'COMMENT' }),
        SCHEMA_CONST.CREATEDAT,
        SCHEMA_CONST.UPDATEDAT
      ],
      ids = {},
      modelProps = [];

    for (var i = 0; i < details.length; ++i) {
      ids[details[i].field] = i;          // id is index

      var args = angular.copy(details[i]);
      args.id = i;
      modelProps.push(schemaProvider.getModelPropObject(args));
    }

    var ID_TAG = SCHEMA_CONST.MAKE_ID_TAG('message'),
      schema = schemaProvider.getSchema('Message', modelProps, ids, ID_TAG),
      TYPE_IDX = 
        schema.addFieldFromModelProp('type', 'Type', ids.NAME),
      NAME_IDX = 
        schema.addFieldFromModelProp('name', 'Name', ids.NAME),
      EMAIL_IDX =
        schema.addFieldFromModelProp('email', 'Email', ids.EMAIL),

      // generate list of sort options
      sortOptions = schemaProvider.makeSortList(schema, 
        [TYPE_IDX, NAME_IDX, EMAIL_IDX], 
        ID_TAG);

    $provide.constant('MESSAGESCHEMA', {
      IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
      MODELPROPS: modelProps,

      SCHEMA: schema,
      // row indices
      TYPE_IDX: TYPE_IDX,
      NAME_IDX: NAME_IDX,
      EMAIL_IDX: EMAIL_IDX,

      SORT_OPTIONS: sortOptions,
      ID_TAG: ID_TAG
    });
  }])

  .factory('messageFactory', messageFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

messageFactory.$inject = ['$filter', '$injector', 'baseURL', 'consoleService', 'storeFactory', 'resourceFactory', 'compareFactory', 'filterFactory', 'miscUtilFactory', 'SCHEMA_CONST', 'MESSAGESCHEMA'];

function messageFactory($filter, $injector, baseURL, consoleService, storeFactory, resourceFactory, compareFactory, filterFactory, miscUtilFactory, SCHEMA_CONST, MESSAGESCHEMA) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'messageFactory',

      readRspObject: readRspObject,

      getSortFunction: getSortFunction,
    },
    con = consoleService.getLogger(factory.NAME);

  resourceFactory.registerStandardFactory(factory.NAME, {
    storeId: MESSAGESCHEMA.ID_TAG,
    schema: MESSAGESCHEMA.SCHEMA,
    sortOptions: MESSAGESCHEMA.SORT_OPTIONS,
    addInterface: factory, // add standard factory functions to this factory
    resources: {
      message: resourceFactory.getResourceConfigWithId('message'),
      feedback: resourceFactory.getResourceConfigWithId('message/feedback'),
      support: resourceFactory.getResourceConfigWithId('message/support')
    }
  });
  
  return factory;

  /* function implementation
    -------------------------- */

  /**
   * Read a server response message object
   * @param {object} response   Server response
   * @param {object} args       arguments object
   *                            @see Schema.readProperty() for details
   * @returns {object}  message object
   */
  function readRspObject (response, args) {
    if (!args) {
      args = {};
    }
    // no conversions required by default
    //    if (!args.convert) {
    //      args.convert = readRspObjectValueConvert;
    //    }
    // add resources required by Schema object
    resourceFactory.addResourcesToArgs(args);

    var stdArgs = resourceFactory.standardiseArgs(args),
      object = MESSAGESCHEMA.SCHEMA.read(response, stdArgs);

    con.debug('Read message rsp object: ' + object);

    return object;
  }

  
  function getSortFunction (options, sortBy) {
    var sortFxn = resourceFactory.getSortFunction(options, sortBy);
    if (typeof sortFxn === 'object') {
      var sortItem = SCHEMA_CONST.DECODE_SORT_ITEM_ID(sortFxn.id);
      if (sortItem.idTag === MESSAGESCHEMA.ID_TAG) {
        switch (sortItem.index) {
          case MESSAGESCHEMA.TYPE_IDX:
            sortFxn = compareType;
            break;
          case MESSAGESCHEMA.NAME_IDX:
            sortFxn = compareName;
            break;
          case MESSAGESCHEMA.EMAIL_IDX:
            sortFxn = compareEmail;
            break;
          default:
            sortFxn = undefined;
            break;
        }
      }
    }
    return sortFxn;
  }

  function compareType (a, b) {
    return compareFactory.compareStringFields(MESSAGESCHEMA.SCHEMA, MESSAGESCHEMA.TYPE_IDX, a, b);
  }

  function compareName (a, b) {
    return compareFactory.compareStringFields(MESSAGESCHEMA.SCHEMA, MESSAGESCHEMA.NAME_IDX, a, b);
  }

  function compareEmail (a, b) {
    return compareFactory.compareStringFields(MESSAGESCHEMA.SCHEMA, MESSAGESCHEMA.EMAIL_IDX, a, b);
  }

}





/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', function ($provide, schemaProvider, SCHEMA_CONST) {

    var INFO_MSG = 1,
      WARN_MSG = 2,
      CRITICAL_MSG = 3,
      noticeTypeObjs = [
        { level: INFO_MSG, name: 'Informational', 
          icon: 'fa-info-circle', style: 'bg-info' },
        { level: WARN_MSG, name: 'Warning', 
          icon: 'fa-window-close', style: 'bg-warning' },
        { level: CRITICAL_MSG, name: 'Critical', 
          icon: 'fa-exclamation-triangle', style: 'bg-danger' }
      ],
      details = [
        SCHEMA_CONST.ID,
        schemaProvider.getNumberModelPropArgs('level', INFO_MSG, { field: 'LEVEL' }),
        schemaProvider.getStringModelPropArgs('title', { field: 'TITLE' }),
        schemaProvider.getStringModelPropArgs('message', { field: 'MESSAGE' }),
        schemaProvider.getDateModelPropArgs('fromDate', undefined, { field: 'FROMDATE' }),
        schemaProvider.getDateModelPropArgs('toDate', undefined, { field: 'TODATE' }),
        SCHEMA_CONST.CREATEDAT,
        SCHEMA_CONST.UPDATEDAT
      ],
      ids = {},
      modelProps = [];

    for (var i = 0; i < details.length; ++i) {
      ids[details[i].field] = i;          // id is index

      var args = angular.copy(details[i]);
      args.id = i;
      modelProps.push(schemaProvider.getModelPropObject(args));
    }

    var ID_TAG = SCHEMA_CONST.MAKE_ID_TAG('notice'),
      schema = schemaProvider.getSchema('Notice', modelProps, ids, ID_TAG),
      LEVEL_IDX = 
        schema.addFieldFromModelProp('level', 'Level', ids.LEVEL),
      TITLE_IDX = 
        schema.addFieldFromModelProp('title', 'Title', ids.TITLE),
      MESSAGE_IDX = 
        schema.addFieldFromModelProp('message', 'Message', ids.MESSAGE),
      FROMDATE_IDX =
        schema.addFieldFromModelProp('fromDate', 'From Date', ids.FROMDATE),
      TODATE_IDX =
        schema.addFieldFromModelProp('toDate', 'To Date', ids.TODATE),

      // generate list of sort options
      sortOptions = schemaProvider.makeSortList(schema, 
        [LEVEL_IDX, TITLE_IDX, FROMDATE_IDX], 
        ID_TAG);

    $provide.constant('NOTICESCHEMA', {
      IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
      MODELPROPS: modelProps,

      SCHEMA: schema,
      // row indices
      LEVEL_IDX: LEVEL_IDX,
      TITLE_IDX: TITLE_IDX,
      MESSAGE_IDX: MESSAGE_IDX,
      FROMDATE_IDX: FROMDATE_IDX,
      TODATE_IDX: TODATE_IDX,
        
      NOTICETYPEOBJS: noticeTypeObjs,

      SORT_OPTIONS: sortOptions,
      ID_TAG: ID_TAG
    });
  }])

  .factory('noticeFactory', noticeFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

noticeFactory.$inject = ['$filter', '$injector', 'baseURL', 'consoleService', 'storeFactory', 'resourceFactory', 'compareFactory', 'filterFactory', 'miscUtilFactory', 'SCHEMA_CONST', 'NOTICESCHEMA'];

function noticeFactory($filter, $injector, baseURL, consoleService, storeFactory, resourceFactory, compareFactory, filterFactory, miscUtilFactory, SCHEMA_CONST, NOTICESCHEMA) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'noticeFactory',

      readRspObject: readRspObject,
      readResponse: readResponse,

      getSortFunction: getSortFunction,

      getNoticeTypeObj: getNoticeTypeObj
    },
    con = consoleService.getLogger(factory.NAME);

  resourceFactory.registerStandardFactory(factory.NAME, {
    storeId: NOTICESCHEMA.ID_TAG,
    schema: NOTICESCHEMA.SCHEMA,
    sortOptions: NOTICESCHEMA.SORT_OPTIONS,
    addInterface: factory, // add standard factory functions to this factory
    resources: {
      notice: resourceFactory.getResourceConfigWithId('notice'),
      current: resourceFactory.getResourceConfigWithId('notice/current'),
      count: resourceFactory.getResourceConfigWithId('notice/count'),
    }
  });
  
  return factory;

  /* function implementation
    -------------------------- */

  /**
   * Read a server response notice object
   * @param {object} response   Server response
   * @param {object} args       arguments object
   *                            @see Schema.readProperty() for details
   * @returns {object}  notice object
   */
  function readRspObject (response, args) {
    if (!args) {
      args = {};
    }
    if (!args.convert) {
      args.convert = readRspObjectValueConvert;
    }
    // add resources required by Schema object
    resourceFactory.addResourcesToArgs(args);

    var stdArgs = resourceFactory.standardiseArgs(args),
      object = NOTICESCHEMA.SCHEMA.read(response, stdArgs);

    con.debug('Read notice rsp object: ' + object);

    return object;
  }

  /**
   * Convert values read from a server notice response
   * @param {number}    id    notice id
   * @param {object}    value notice value
   * @returns {object}  Converted value
   */
  function readRspObjectValueConvert (id, value) {
    switch (id) {
      case NOTICESCHEMA.IDs.FROMDATE:
      case NOTICESCHEMA.IDs.TODATE:
        value = new Date(value);
        break;
      default:
        // other fields require no conversion
        break;
    }
    return value;
  }


  /**
   * Read an notice response from the server and store it
   * @param {object}   response   Server response
   * @param {object}   args       process arguments object with following properties
   *    {string|Array} objId      id/array of ids of notice object to save response data to
   *    {number}       flags      storefactory flags
   *    {function}     next       function to call after processing
   * @return {object}  notice ResourceList object
   */
  function readResponse (response, args) {
    var notice = readRspObject(response, args);
    return storeRspObject(notice, args);
  }

  /**
   * Store an notice object
   * @param {object}   obj        Object to store
   * @param {object}   args       process arguments object as per resourceFactory.storeServerRsp()
   *                              without 'factory' argument
   *                              @see resourceFactory.storeServerRsp()
   * @return {object}  notice ResourceList object
   */
  function storeRspObject (obj, args) {
    var storeArgs = miscUtilFactory.copyAndAddProperties(args, {
      factory: $injector.get(factory.NAME)
    });
    return resourceFactory.storeServerRsp(obj, storeArgs);
  }
  
  
  function getSortFunction (options, sortBy) {
    var sortFxn = resourceFactory.getSortFunction(options, sortBy);
    if (typeof sortFxn === 'object') {
      var sortItem = SCHEMA_CONST.DECODE_SORT_ITEM_ID(sortFxn.id);
      if (sortItem.idTag === NOTICESCHEMA.ID_TAG) {
        switch (sortItem.index) {
          case NOTICESCHEMA.LEVEL_IDX:
            sortFxn = compareLevel;
            break;
          case NOTICESCHEMA.TITLE_IDX:
            sortFxn = compareTitle;
            break;
          case NOTICESCHEMA.FROMDATE_IDX:
            sortFxn = compareFromDate;
            break;
          case NOTICESCHEMA.TODATE_IDX:
            sortFxn = compareToDate;
            break;
          default:
            sortFxn = undefined;
            break;
        }
      }
    }
    return sortFxn;
  }

  function compareLevel (a, b) {
    return compareFactory.compareNumberFields(NOTICESCHEMA.SCHEMA, NOTICESCHEMA.LEVEL_IDX, a, b);
  }

  function compareTitle (a, b) {
    return compareFactory.compareStringFields(NOTICESCHEMA.SCHEMA, NOTICESCHEMA.TITLE_IDX, a, b);
  }

  function compareFromDate (a, b) {
    return compareFactory.compareDateFields(NOTICESCHEMA.SCHEMA, NOTICESCHEMA.FROMDATE_IDX, a, b);
  }

  function compareToDate (a, b) {
    return compareFactory.compareDateFields(NOTICESCHEMA.SCHEMA, NOTICESCHEMA.TODATE_IDX, a, b);
  }
  
  function getNoticeTypeObj (level, prop) {
    var result,
      obj = NOTICESCHEMA.NOTICETYPEOBJS.find(function (levelObj) {
        return (levelObj.level === level);
      });
    if (obj) {
      if (prop) {
        result = obj[prop];
      } else {
        result = obj;
      }
    }
    return result;
  }

}





/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac', ['ct.config', 'ui.router', 'ngResource', 'ngCordova', 'ui.bootstrap', 'NgDialogUtil', 'ct.clientCommon', 'chart.js', 'ngIdle', 'timer'])

  .config(['$stateProvider', '$urlRouterProvider', 'STATES', function ($stateProvider, $urlRouterProvider, STATES) {

    var getUrl = function (state, param) {
        var splits = state.split('.'),
          url = '';
        if (splits.length > 2) {
          url += '/';
        } // 2nd level doesn't need preceeding '/' as app path is only '/'
        url += splits[splits.length - 1];
        if (param) {
          url += '/' + param;
        }
        return url;
      },
      appPath = '/',
      otherwisePath = appPath,
      routes = [
        { state: STATES.CONFIG,
          config: {
            url: getUrl(STATES.CONFIG),
            views: {
              'content@': {
                templateUrl : 'layout/submenu.page.html',
                controller  : 'SubmenuPageController',
                resolve: {
                  SUBMENU: function (MENUS) {
                    return MENUS.CONFIG;
                  }
                }
              }
            }
          }
        },
        { state: STATES.VOTINGSYS,
          config: {
            url: getUrl(STATES.VOTINGSYS),
            views: {
              'content@': {
                templateUrl : 'views/aboutus.html',
                controller  : 'AboutController'
              }
            }
          }
        },
        { state: STATES.VOTINGSYS_NEW,
          config: {
            url: getUrl(STATES.VOTINGSYS_NEW),
            views: {
              'content@': {
                templateUrl : 'views/aboutus.html',
                controller  : 'AboutController'
              }
            }
          }
        },
        { state: STATES.ROLES,
          config: {
            url: getUrl(STATES.ROLES),
            views: {
              'content@': {
                templateUrl : 'views/aboutus.html',
                controller  : 'AboutController'
              }
            }
          }
        },
        { state: STATES.ROLES_NEW,
          config: {
            url: getUrl(STATES.ROLES_NEW),
            views: {
              'content@': {
                templateUrl : 'views/aboutus.html',
                controller  : 'AboutController'
              }
            }
          }
        },
        { state: STATES.USERS,
          config: {
            url: getUrl(STATES.USERS),
            views: {
              'content@': {
                templateUrl : 'users/userdash.html',
                controller  : 'UserDashController'
              }
            }
          }
        },
        { state: STATES.USERS_VIEW,
          config: {
            url: getUrl(STATES.USERS_VIEW, ':id'),
            views: {
              'content@': {
                templateUrl : 'users/newuser.html',
                controller  : 'UserController'
              }
            }
          }
        },
        { state: STATES.USERS_EDIT,
          config: {
            url: getUrl(STATES.USERS_EDIT, ':id'),
            views: {
              'content@': {
                templateUrl : 'users/newuser.html',
                controller  : 'UserController'
              }
            }
          }
        },
        { state: STATES.USERS_NEW,
          config: {
            url: getUrl(STATES.USERS_NEW),
            views: {
              'content@': {
                templateUrl : 'users/newuser.html',
                controller  : 'UserController'
              }
            }
          }
        },
        { state: STATES.USERS_BATCH,
          config: {
            url: getUrl(STATES.USERS_BATCH),
            views: {
              'content@': {
                templateUrl : 'users/batchuser.html',
                controller  : 'UserBatchController'
              }
            }
          }
        },
        { state: STATES.NOTICE,
          config: {
            url: getUrl(STATES.NOTICE),
            views: {
              'content@': {
                templateUrl : 'notices/noticedash.html',
                controller  : 'NoticeDashController'
              }
            }
          }
        },
        { state: STATES.NOTICE_VIEW,
          config: {
            url: getUrl(STATES.NOTICE_VIEW, ':id'),
            views: {
              'content@': {
                templateUrl : 'notices/newnotice.html',
                controller  : 'NoticeController'
              }
            }
          }
        },
        { state: STATES.NOTICE_EDIT,
          config: {
            url: getUrl(STATES.NOTICE_EDIT, ':id'),
            views: {
              'content@': {
                templateUrl : 'notices/newnotice.html',
                controller  : 'NoticeController'
              }
            }
          }
        },
        { state: STATES.NOTICE_NEW,
          config: {
            url: getUrl(STATES.NOTICE_NEW),
            views: {
              'content@': {
                templateUrl : 'notices/newnotice.html',
                controller  : 'NoticeController'
              }
            }
          }
        },
        { state: STATES.CAMPAIGN,
          config: {
            url: getUrl(STATES.CAMPAIGN),
            views: {
              'content@': {
                templateUrl : 'layout/submenu.page.html',
                controller  : 'SubmenuPageController',
                resolve: {
                  SUBMENU: function (MENUS) {
                    return MENUS.CAMPAIGN;
                  }
                }
              }
            }
          }
        },
        { state: STATES.ELECTION,
          config: {
            url: getUrl(STATES.ELECTION),
            views: {
              'content@': {
                templateUrl : 'elections/electiondash.html',
                controller  : 'ElectionDashController'
              }
            }
          }
        },
        { state: STATES.ELECTION_VIEW,
          config: {
            url: getUrl(STATES.ELECTION_VIEW, ':id'),
            views: {
              'content@': {
                templateUrl : 'elections/newelection.html',
                controller  : 'ElectionController'
              }
            }
          }
        },
        { state: STATES.ELECTION_EDIT,
          config: {
            url: getUrl(STATES.ELECTION_EDIT, ':id'),
            views: {
              'content@': {
                templateUrl : 'elections/newelection.html',
                controller  : 'ElectionController'
              }
            }
          }
        },
        { state: STATES.ELECTION_NEW,
          config: {
            url: getUrl(STATES.ELECTION_NEW),
            views: {
              'content@': {
                templateUrl : 'elections/newelection.html',
                controller  : 'ElectionController'
              }
            }
          }
        },
        { state: STATES.CANDIDATE,
          config: {
            url: getUrl(STATES.CANDIDATE),
            views: {
              'content@': {
                templateUrl : 'views/aboutus.html',
                controller  : 'AboutController'
              }
            }
          }
        },
        { state: STATES.CANDIDATE_NEW,
          config: {
            url: getUrl(STATES.CANDIDATE_NEW),
            views: {
              'content@': {
                templateUrl : 'views/aboutus.html',
                controller  : 'AboutController'
              }
            }
          }
        },
        { state: STATES.CANVASS,
          config: {
            url: getUrl(STATES.CANVASS),
            views: {
              'content@': {
                templateUrl : 'canvasses/canvassdash.html',
                controller  : 'CanvassDashController'
              }
            }
          }
        },
        { state: STATES.CANVASS_VIEW,
          config: {
            url: getUrl(STATES.CANVASS_VIEW, ':id'),
            views: {
              'content@': {
                templateUrl : 'canvasses/newcanvass.html',
                controller  : 'CanvassController'
              }
            }
          }
        },
        { state: STATES.CANVASS_EDIT,
          config: {
            url: getUrl(STATES.CANVASS_EDIT, ':id'),
            views: {
              'content@': {
                templateUrl : 'canvasses/newcanvass.html',
                controller  : 'CanvassController'
              }
            }
          }
        },
        { state: STATES.CANVASS_NEW,
          config: {
            url: getUrl(STATES.CANVASS_NEW),
            views: {
              'content@': {
                templateUrl : 'canvasses/newcanvass.html',
                controller  : 'CanvassController'
              }
            }
          }
        }
      ];

    $stateProvider
      // route for the home page
      .state(STATES.APP, {
        url: appPath,
        views: {
          'header': {
            templateUrl : 'layout/header.html',
            controller  : 'HeaderController'
          },
          'content': {
            templateUrl : 'views/home.html',
            controller  : 'HomeController'
          },
          'footer': {
            templateUrl : 'layout/footer.html',
            controller  : 'FooterController'
          }
        }
      })

      // route for the aboutus page
      .state(STATES.ABOUTUS, {
        url: getUrl(STATES.ABOUTUS),
        views: {
          'content@': {
            templateUrl : 'views/aboutus.html',
            controller  : 'AboutController'
          }
        }
      })

      .state(STATES.LOGIN, {
        url: getUrl(STATES.LOGIN),
        onEnter: ['$stateParams', '$state', '$uibModal', function ($stateParams, $state, $uibModal) {
          
          $uibModal.open({
            templateUrl: 'login/login.html',
            controller: 'LoginController'
          }).result.finally(function () {
            $state.go('^');   // go to parent state
          });
        }]
      })
    
      // route for the contactus page
      .state(STATES.CONTACTUS, {
        url: getUrl(STATES.CONTACTUS),
        views: {
          'content@': {
            templateUrl : 'views/contactus.html',
            controller  : 'ContactController'
          }
        }
      })

      // route for the support page
      .state(STATES.SUPPORT, {
        url: getUrl(STATES.SUPPORT),
        views: {
          'content@': {
            templateUrl : 'views/contactus.html',
            controller  : 'ContactController'
          }
        }
      });

    routes.forEach(function (route) {
      if (!STATES.ISDISABLED(route.state)) {
        $stateProvider.state(route.state, route.config);
      }
    });

    $urlRouterProvider.otherwise(otherwisePath);
  }])
  .config(['IdleProvider', 'KeepaliveProvider', 'CONFIG', function(IdleProvider, KeepaliveProvider, CONFIG) {
    // configure Idle settings
    IdleProvider.idle(CONFIG.AUTOLOGOUT); // in seconds
    IdleProvider.timeout(CONFIG.AUTOLOGOUTCOUNT); // in seconds
    KeepaliveProvider.interval(CONFIG.TOKENREFRESH); // in seconds
  }]);

/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .controller('ContactController', ContactController)

  .controller('FeedbackController', ['$scope', '$state', 'messageFactory' ,'NgDialogFactory', 'STATES', function ($scope, $state, messageFactory, NgDialogFactory, STATES) {


    $scope.sendMessage = function () {

      var resource;
      if ($state.is(STATES.CONTACTUS)) {
        resource = 'feedback';
      } else if ($state.is(STATES.SUPPORT)) {
        resource = 'support';
      }

      if (resource) {
        // post message to server
        messageFactory.save(resource, $scope.message,
          // success function
          function (/*response*/) {
            // re-init for next comment entry
            $scope.initMessage(true);

            $scope.messageForm.$setPristine();
          },
          // error function
          function (response) {
            // response is message
            NgDialogFactory.error(response, 'Error saving');
          }
        );
      }
    };
  }])


  .controller('AboutController', ['$scope', function ($scope) {


  }]);


ContactController.$inject = ['$scope', '$state', 'STATES', 'MESSAGESCHEMA'];

function ContactController ($scope, $state, STATES, MESSAGESCHEMA) {

  // function to initialise feedback object
  $scope.initMessage = function (submitted) {
    $scope.message = MESSAGESCHEMA.SCHEMA.getObject();
    $scope.message.submitted = submitted;
  };

  if ($state.is(STATES.CONTACTUS)) {
    $scope.title = 'Send Feedback';
    $scope.thanks = 'Thank you for your feedback';
    $scope.entryPrompt = 'Your Feedback';
  } else if ($state.is(STATES.SUPPORT)) {
    $scope.title = 'Support Request';
    $scope.thanks = 'Thank you for your request, you will receive a response as soon as possible.';
    $scope.entryPrompt = 'Details';
  }

  $scope.initMessage();
}



/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .constant('UTIL', (function() {
    var and = 'And',
      or = 'Or';
    return {
      OP_AND: and,
      OP_OR: or,
      OP_LIST: [and, or]
    };
  })())

  .factory('utilFactory', utilFactory);


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

utilFactory.$inject = ['$rootScope', 'miscUtilFactory'];

function utilFactory ($rootScope, miscUtilFactory) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    formatDate: formatDate,
    arrayAdd: arrayAdd,
    arrayRemove: arrayRemove
  };
  
  return factory;

  /* function implementation
    -------------------------- */

  function formatDate (date) {
    return new Date(date).toDateString();
  }

  /**
   * Add item(s) to an array based on the result of a test function
   * @throws {TypeError} Thrown when incorrect arguments provided
   * @param   {Array}        array                              Array to add to
   * @param   {Array|object} add                                Object to add, or array of objects to individually add
   * @param   {function}     [test=function (array, element) {}] Test function returning true if object should be added
   * @returns {number}  Number of elements added
   */
  function arrayAdd(array, add, test) {
    return arrayFxn('add', array, add, test) ;
  }
  
  /**
   * Remove item(s) from an array based on the result of a test function
   * @throws {TypeError} Thrown when incorrect arguments provided
   * @param   {Array}        array                              Array to remove from
   * @param   {Array|object} remove                             Object to remove, or array of objects to individually remove
   * @param   {function}     [test=function (array, element) {}] Test function returning true if object should be removed
   * @returns {number}  Number of elements removed
   */
  function arrayRemove(array, remove, test) {
    return arrayFxn('remove', array, remove, test) ;
  }
  
  /**
   * Add/remove item(s) to/from an array based on the result of a test function
   * @throws {TypeError} Thrown when incorrect arguments provided
   * @throws {Error} Thrown when unrecognised action
   * @param   {string}   action                              Action to perform
   * @param   {Array}    array                               Array to work on
   * @param   {Array|object} subject                         Object, or array of objects to individually perform action for
   * @param   {function} [test=function (array, element) {}] Test function returning true if action should be performed
   * @returns {number}  Number of elements added/removed
   */
  function arrayFxn(action, array, subject, test) {
    if (typeof test === 'undefined') {
      test = function () {
        return true;  // do action
      };
    }
    arrayFxnTests(array, test);
    var count = 0,
      actionFxn;

    if (action === 'add') {
      actionFxn = function (element) {
        array.push(element);
      };
    } else if (action === 'remove') {
      actionFxn = function (element) {
        var idx = array.findIndex(function (ele) {
          return (element === ele);
        });
        if (idx >= 0) {
          array.splice(idx, 1);
        }
      };
    } else {
      throw new Error('Unknown action: ' + action);
    }
    
    if (Array.isArray(subject)) {
      subject.forEach(function (element) {
        if (test(array, element)) {
          actionFxn(element);
          ++count;
        }
      });
    } else {
      if (test(array, subject)) {
        actionFxn(subject);
        ++count;
      }
    }
    return count;
  }
  
  function arrayFxnTests(array, test) {
    if (typeof test !== 'function') {
      throw new TypeError('test is non-function');
    }
    if (!Array.isArray(array)) {
      throw new TypeError('array is non-array');
    }
  }
  
  
  
}

/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .constant('DECOR', (function () {
    return {
      DASH: { icon: 'fa fa-tachometer fa-fw', class: 'btn btn-default' },
      NEW: { icon: 'fa fa-plus-square-o fa-fw', class: 'btn btn-primary' },
      VIEW: { icon: 'fa fa-eye fa-fw', class: 'btn btn-info' },
      EDIT: { icon: 'fa fa-pencil-square-o fa-fw', class: 'btn btn-warning' },
      DEL: { icon: 'fa fa-trash-o fa-fw', class: 'btn btn-danger' },
      BATCH: { icon: 'fa fa-files-o fa-fw', class: 'btn btn-secondary' },
      SEL: { icon: 'fa fa-check-square-o fa-fw', class: 'btn btn-default' },
      UNSEL: { icon: 'fa fa-square-o fa-fw', class: 'btn btn-default' }
    };
  })())

  .factory('controllerUtilFactory', controllerUtilFactory);


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

controllerUtilFactory.$inject = ['authFactory', 'miscUtilFactory', 'utilFactory', 'STATES', 'ACCESS', 'DECOR', 'CONFIG'];

function controllerUtilFactory (authFactory, miscUtilFactory, utilFactory, STATES, ACCESS, DECOR, CONFIG) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      setScopeVars: setScopeVars,
      getStateButton: getStateButton,
      setSelect: setSelect,
      toggleSelection: toggleSelection,
      moveListSelected: moveListSelected
    },

    dashTxt = 'Dash',
    newTxt = 'New',
    viewTxt = 'View',
    editTxt = 'Edit',
    delTxt = 'Delete',
    buttons = [
      { txt: dashTxt, icon: DECOR.DASH.icon, tip: 'Go to dashboard', class: DECOR.DASH.class },
      { txt: newTxt, icon: DECOR.NEW.icon, tip: 'Create new', class: DECOR.NEW.class },
      { txt: viewTxt, icon: DECOR.VIEW.icon, tip: 'View selected', class: DECOR.VIEW.class },
      { txt: editTxt, icon: DECOR.EDIT.icon, tip: 'Edit selected', class: DECOR.EDIT.class },
      { txt: delTxt, icon: DECOR.DEL.icon, tip: 'Delete selected', class: DECOR.DEL.class }
    ],
    StateAccessMap = {
    // map mwnu names to access names
      VOTINGSYS: ACCESS.VOTINGSYS,
      ROLES: ACCESS.ROLES,
      USERS: ACCESS.USERS,
      ELECTION: ACCESS.ELECTIONS,
      CANDIDATE: ACCESS.CANDIDATES,
      CANVASS: ACCESS.CANVASSES,
      NOTICE: ACCESS.NOTICES
    };

  return factory;

  /* function implementation
    -------------------------- */

  /**
   * Set standard scope variables
   * @param {string} menu  Name of menu, as per STATES properties e.g. 'CANVASS', 'USERS. etc.
   * @param {object} scope Scope to add variables to
   */
  function setScopeVars (menu, scope) {
    var states = STATES.SET_SCOPE_VARS(menu),
      props = Object.getOwnPropertyNames(states),
      access;

    /* group is combination of 'a' (access to all) & '1' (access to one)
      privilege is combination of 'c' (create), 'r' (read), 'u' (update) & 'd' (delete) */
    props.forEach(function (prop) {
      switch (prop) {
        case 'dashState':
          access = { group: 'a', privilege: 'r' };  // need all read for dash
          break;
        case 'newState':
          access = { group: '1', privilege: 'c' };  // need 1 create for new
          break;
        case 'viewState':
          access = { group: '1', privilege: 'r' };  // need 1 read for view
          break;
        case 'editState':
          access = { group: '1', privilege: 'u' };  // need 1 update for edit
          break;
        case 'delState':
          access = { group: 'a1', privilege: 'd' };  // need all/1 delete for delete
          break;
        case 'batchState':
          access = { group: 'a1', privilege: 'b' };  // need all/1 batch for delete
          break;
        default:
          access = undefined;
          break;
      }
      if (access) {
        if (!CONFIG.NOAUTH &&
            !authFactory.isAccess(StateAccessMap[menu], access.group, access.privilege)) {
          // no access so remove state
          states[prop] = undefined;
        }
      }
    });
    props.forEach(function (prop) {
      scope[prop] = states[prop];
    });
  }

  function getStateButton(state, scope) {
    var button,
      txt;
    if (state === 'all') {
      button = angular.copy(buttons);
    } else {
      if (state === scope.dashState) {
        txt = dashTxt;
      } else if (state === scope.newState) {
        txt = newTxt;
      } else if (state === scope.viewState) {
        txt = viewTxt;
      } else if (state === scope.editState) {
        txt = editTxt;
      } else if (state === scope.newState) {
        txt = delTxt;
      }
      if (txt) {
        button = angular.copy(buttons.find(function (element) {
          return (element.txt === txt);
        }));
      }
    }

    // add state to button(s)
    if (button) {
      miscUtilFactory.toArray(button).forEach(function (element) {
        var btnState;
        switch (element.txt) {
          case dashTxt:
            btnState = scope.dashState;
            break;
          case newTxt:
            btnState = scope.newState;
            break;
          case viewTxt:
            btnState = scope.viewState;
            break;
          case editTxt:
            btnState = scope.editState;
            break;
          case delTxt:
            btnState = scope.delState;
            break;
        }
        element.state = btnState;
      });
    }

    return button;
  }

  /**
   * Select/unselect all items in an array
   * @param   {object}  scope Scope to set selected count in
   * @param   {Array}   list  Array of items
   * @param   {number}  sel   Flag; truthy = set, falsy = unset
   * @returns {boolean} true if all set
   */
  function setSelect (scope, list, sel) {
    var allSel = false;
    if (sel) {
      scope.selectedCnt = miscUtilFactory.selectAll(list);
    } else {
      scope.selectedCnt = miscUtilFactory.initSelected(list);
    }
    if (list) {
      allSel = (scope.selectedCnt === list.length);
    }
    return allSel;
  }


  function toggleSelection (scope, entry, list, dlftFunc) {
    var oldCnt = scope.selectedCnt,
      singleSel;

    scope.selectedCnt = miscUtilFactory.toggleSelection(entry, oldCnt);
    switch (scope.selectedCnt) {
      case 1:
        if (entry.isSelected) {
          singleSel = entry;
          break;
        } else if (oldCnt === 2) {
          // deselected an entry
          singleSel = miscUtilFactory.findSelected(list);
          break;
        }
        /* falls through */
      default:
        if (dlftFunc) {
          dlftFunc();
        }
        break;
    }

    return singleSel;
  }


  /**
   * Move the selected elements of a ResourceList to another ResourceList
   * @param {ResourceList} fromList Source list
   * @param {ResourceList} toList   Destination list
   * @param {function}     testFunc Function to test if itema are the same
   * @returns {boolean}      [[Description]]
   */
  function moveListSelected (fromList, toList, testFunc) {
    var selList;      // selected items

    selList = miscUtilFactory.getSelectedList(fromList, function (element) {
      miscUtilFactory.toggleSelection(element);
      return element;
    });
    fromList.selCount = 0;

    if (selList.length > 0) {
      fromList.removeFromList(selList, testFunc);
      toList.addToList(selList, true, testFunc);
    }

    [fromList, toList].forEach(function (resList) {
      resList.sort();
      resList.applyFilter();
    });
  }

}

/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .controller('StateButtonsController', StateButtonsController);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

StateButtonsController.$inject = ['$scope', '$state', 'controllerUtilFactory', 'DECOR'];

function StateButtonsController($scope, $state, controllerUtilFactory, DECOR) {

  var allSelected = false,
    buttons;

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.showButton = showButton;
  $scope.disableButton = disableButton;
  $scope.changeState = changeState;

  if ($state.is($scope.dashState)) {
    $scope.btnvert = true;
  } else {
    $scope.btnhorz = true;
  }
  if ($scope.getStateButton) {
    buttons = $scope.getStateButton('all');
  } else {
    buttons = controllerUtilFactory.getStateButton('all', $scope);
  }
  if ($state.is($scope.dashState)) {
    // add select/unselect all in dash state
    buttons = buttons.concat([
      { txt: 'Unselect', state: 'unsel', icon: DECOR.UNSEL.icon, tip: 'Unselect all',
        class: DECOR.UNSEL.class },
      { txt: 'Select', state: 'sel', icon: DECOR.SEL.icon, tip: 'Select all',
        class: DECOR.SEL.class }
    ]);
  }

  $scope.stateButtons = buttons;

  /* function implementation
  -------------------------- */

  function showButton (forState) {
    var show = false,
      array;
    if (forState) {
      if ($state.is($scope.dashState)) {
        array = [ 'unsel', 'sel' ];
      } else {
        array = [];
      }

      if ($state.is($scope.newState)) {
        // no buttons in newState
      } else if ($state.is($scope.viewState)) {
        array = array.concat([
          $scope.dashState,
          $scope.newState,
          $scope.editState,
          $scope.delState
        ]);
      } else if ($state.is($scope.editState)) {
        array = array.concat([
          $scope.dashState,
          $scope.newState,
          $scope.viewState,
          $scope.delState
        ]);
      } else if ($state.is($scope.dashState)) {
        array = array.concat([
          $scope.newState,
          $scope.viewState,
          $scope.editState,
          $scope.delState
        ]);
      }
      if (array.length) {
        show = array.find(function (state) {
          return (state === forState);
        });
        show = (show ? true : false);
      }
    }
    return show;
  }


  function disableButton (forState) {
    var disable = false;
    if (forState) {
      if ($state.is($scope.newState)) {
        disable = true; // no buttons
      } else if ($state.is($scope.viewState) ||
              $state.is($scope.editState)) {
        disable = !showButton(forState);  // if its shown enable it
      } else if ($state.is($scope.dashState)) {
        if ((forState === $scope.viewState) ||
              (forState === $scope.editState)) {
          disable = ($scope.selectedCnt !== 1); // only one selected item allowed
        } else if (forState === $scope.delState) {
          disable = ($scope.selectedCnt < 1); // must be at least one selected
        } else if (forState === 'unsel') {
          disable = ($scope.selectedCnt < 1); // must be at least one selected
        } else if (forState === 'sel') {
          disable = allSelected;
        } // else always enable new
      } else {
        disable = true;
      }
    }
    return disable;
  }


  function changeState (toState) {
    var to = toState,
      params;
    if (to) {
      if (to === $scope.newState) {
        // TODO add save changes check
      } else if (to === $scope.viewState) {
        // TODO add save changes check
        params = $scope.changeStateParam();
      } else if (to === $scope.editState) {
        params = $scope.changeStateParam();
      } else if (to === $scope.delState) {
        if ($state.is($scope.dashState)) {
          $scope.dashDelete();
        } else {
          $scope.singleDelete();
        }
        to = undefined;
      } else if ((to === 'unsel') || (to === 'sel')) {
        allSelected = $scope.setSelect((to === 'unsel') ? 0 : 1);
        to = undefined;
      } else if (to !== $scope.dashState) {
        to = undefined;
      }
      if (to) {
        $state.go(to, params);
      }
    }
  }


}


/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .service('menuService', menuService);


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

menuService.$inject = ['authFactory', 'MENUS', 'CONFIG', 'USER'];

function menuService(authFactory, MENUS, CONFIG, USER) {

  /*jshint validthis:true */
  this.configMenus = function (scope, loggedIn) {
    var showMenus,
      override,
      doConfigMenu,
      doCampaignMenu;

    if (!loggedIn) {
      showMenus = CONFIG.NOAUTH;  // show menus if authentication disabled
      override = CONFIG.NOAUTH;   // override access check if authentication disabled
    } else {
      showMenus = USER.authenticated;
    }
    // config menu's if need to show, or menu exists and not showing
    doConfigMenu = doCampaignMenu = showMenus;
    if (!showMenus) {
      doConfigMenu = scope.configMenu;
      doCampaignMenu = scope.campaignMenu;
    }
    if (doConfigMenu) {
      scope.configMenu = this.configMenuAccess(MENUS.CONFIG, override);
    }
    if (doCampaignMenu) {
      scope.campaignMenu = this.configMenuAccess(MENUS.CAMPAIGN, override);
    }
  };

  /*jshint validthis:true */
  this.configMenuAccess = function (baseMenu, override) {
    var menu = {
        root: baseMenu.root // copy root
      },
      substate,
      entry,
      count = 0;  // count of menu entries

    Object.getOwnPropertyNames(baseMenu).forEach(function (name) {
      if (name !== 'root') {
        /* NOTE: name is the property value from the MENUS config phase in 
            header.controller.js, matches the access property in the login 
            response (e.g. ACCESS.VOTINGSYS etc.)
        */
        var submenu = {
          header: baseMenu[name].header,
          items: []
        }; 

        // add items to the menu if user has access
        baseMenu[name].items.forEach(function (item) {
          substate = menu.root.substates.find(function (state) {
            return (state.state === item.sref);
          });
          if (substate) {
            if (override ||
                authFactory.hasAccess(name, substate.access.group, substate.access.privilege)) {

              entry = angular.copy(item);
              entry.name = entry.name.trim(); // remove any whitespace used to set alignment in dropdown menu

              submenu.items.push(entry);
              ++count;
            }
          }
        });
        if (submenu.items.length) {
          menu[name] = submenu;
        }
      }
    });
    if (!count) {
      menu = undefined; // no menu items so no need for menu
    }
    return menu;
  };



}


/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .value('HOMESCRN', {
    message: undefined  // message to display on hmoe screen
  })
  .controller('HomeController', HomeController);


HomeController.$inject = ['$scope', '$rootScope', 'menuService', 'noticeFactory', 'NgDialogFactory', 'HOMESCRN', 'CONFIG'];

function HomeController ($scope, $rootScope, menuService, noticeFactory, NgDialogFactory, HOMESCRN, CONFIG) {


  $scope.message = HOMESCRN.message;

  /* need to use the function for the watch as the message is displayed inside an ng-if
   * which means a child scope & as the message is a primitive (e.g., number, string, boolean)
   * the child scope hides/shadows the parent scope value */
  $scope.$watch(function () {
    return HOMESCRN.message;
  }, function(newValue, oldValue, scope) {
    scope.message = newValue;
  }, true /* object equality */);

  setMenus(CONFIG.NOAUTH ? false : true);

  $rootScope.$on('login:Successful', function () {
    setMenus(true);
  });

  $rootScope.$on('registration:Successful', function () {
    setMenus(true);
  });

  $rootScope.$on('logout:', function () {
    setMenus(false);
  });

  $scope.levelToIcon = levelToIcon;
  $scope.levelToStyle = levelToStyle;


  $scope.notices = noticeFactory.query('current',
    // success function
    function (response) {
      // response is actual data
      $scope.notices = response;
    },
    // error function
    function (response) {
      // response is message
      NgDialogFactory.error(response, 'Unable to retrieve Notices');
    }
  );



  function setMenus (loggedIn) {
    var menus = {},
      menuEntries = [];

    menuService.configMenus(menus, loggedIn);
    for (var menu in menus) {
      for (var entry in menus[menu]) {
        if (entry !== 'root') {
          menuEntries.push(menus[menu][entry]);
        }
      }
    }
    $scope.menuEntries = menuEntries;
  }


  function levelToIcon (level) {
    return noticeFactory.getNoticeTypeObj(level, 'icon');
  }

  function levelToStyle (level) {
    return noticeFactory.getNoticeTypeObj(level, 'style');
  }

}



/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .constant('MENUS', (function () {
    /* can't inject a contant into a constant but can modify (at least in angular 1.x)
       a constant in the config stage, hence this roundabout way of setting up MENUS */
    return {
      HOME: {},
      ABOUT: {},
      CONTACT: {},
      CONFIG: {},
      CAMPAIGN: {},
      CRUMBS: []
    };
  })())
  .config(['$provide', 'MENUS', 'STATES', 'ACCESS', 'CONFIG', 'DECOR', function ($provide, MENUS, STATES, ACCESS, CONFIG, DECOR) {
    /* Unicode code point   UTF-8 literal   html
      U+00A0	             \xc2\xa0	       &nbsp; */
    var prop,
      tree, toCheck,
      dropdownNew = '\xA0\xA0\xA0New',  // add nbsp
      dropdownBatch = '\xA0\xA0\xA0Batch',  // add nbsp
      configuration = 'Configuration',
      votingSysDash = 'Voting Systems',
      rolesDash = 'Roles',
      userDash = 'Users',
      noticeDash = 'Notices',
      campaign = 'Campaign',
      electionDash = 'Elections',
      candidateDash = 'Candidates',
      canvassDash = 'Canvasses',
      accessAllRead = { group: 'a', privilege: 'r' },
      accessAllBatch = { group: 'a', privilege: 'b' },
      access1Read = { group: '1', privilege: 'r' },
      access1Update = { group: '1', privilege: 'u' },
      access1Create = { group: '1', privilege: 'c' },

      addToTree = function (entry) {
        if (!STATES.ISDISABLED(entry.sref)) {
          tree[entry.property] = entry.value;
        }
      };

    for (prop in MENUS) {
      tree = {};
      toCheck = [];

      switch (prop) {
        case 'HOME':
          tree = {
            name: 'Home', sref: STATES.APP
          };
          break;
        case 'ABOUT':
          tree = {
            name: 'About', sref: STATES.ABOUTUS
          };
          break;
        case 'CONTACT':
          tree = {
            name: 'Contact', sref: STATES.CONTACTUS
          };
          break;
        case 'CONFIG':
          toCheck = [
            { sref: STATES.CONFIG,
              property: 'root',
              value: {
                name: configuration,
                icon: 'fa fa-cog fa-fw',
                sref: STATES.CONFIG,
                substates: []
              }
            },
            { sref: STATES.VOTINGSYS,
              property: ACCESS.VOTINGSYS,  // NOTE: matches access property in login response
              value: {
                header: votingSysDash,
                items: [
                  { name: votingSysDash, sref: STATES.VOTINGSYS },
                  { name: dropdownNew, sref: STATES.VOTINGSYS_NEW }
                ]
              }
            },
            { sref: STATES.ROLES,
              property: ACCESS.ROLES,  // NOTE: matches access property in login response
              value: {
                header: rolesDash,
                items: [
                  { name: rolesDash, sref: STATES.ROLES },
                  { name: dropdownNew, sref: STATES.ROLES_NEW }
                ]
              }
            },
            { sref: STATES.USERS,
              property: ACCESS.USERS,  // NOTE: matches access property in login response
              value: {
                header: userDash,
                items: [
                  { name: userDash,
                    icon: 'fa fa-users fa-fw',
                    class: DECOR.DASH.class,
                    sref: STATES.USERS },
                  { name: dropdownNew,
                    icon: 'fa fa-user-plus fa-fw',
                    class: DECOR.NEW.class,
                    sref: STATES.USERS_NEW },
                  { name: dropdownBatch,
                    icon: DECOR.BATCH.icon,
                    class: DECOR.BATCH.class,
                    sref: STATES.USERS_BATCH }
                ]
              }
            },
            { sref: STATES.NOTICE,
              property: ACCESS.NOTICES,  // NOTE: matches access property in login response
              value: {
                header: noticeDash,
                items: [
                  { name: noticeDash,
                    icon: 'fa fa-comments fa-fw',
                    class: DECOR.DASH.class,
                    sref: STATES.NOTICE },
                  { name: dropdownNew,
                    icon: DECOR.NEW.icon,
                    class: DECOR.NEW.class,
                    sref: STATES.NOTICE_NEW }
                ]
              }
            }
          ];
          break;
        case 'CAMPAIGN':
          toCheck = [
            { sref: STATES.CAMPAIGN,
              property: 'root',
              value: {
                name: campaign,
                icon: 'fa fa-pencil-square fa-fw',
                sref: STATES.CAMPAIGN,
                substates: []
              }
            },
            { sref: STATES.ELECTION,
              property: ACCESS.ELECTIONS,  // NOTE: matches access property in login response
              value: {
                header: electionDash,
                items: [
                  { name: electionDash,
                    icon:'fa fa-bullhorn fa-fw',
                    class: DECOR.DASH.class,
                    sref: STATES.ELECTION },
                  { name: dropdownNew,
                    icon: DECOR.NEW.icon,
                    class: DECOR.NEW.class,
                    sref: STATES.ELECTION_NEW }
                ]
              }
            },
            { sref: STATES.CANDIDATE,
              property: ACCESS.CANDIDATES,  // NOTE: matches access property in login response
              value: {
                header: candidateDash,
                items: [
                  { name: candidateDash, sref: STATES.CANDIDATE },
                  { name: dropdownNew, sref: STATES.CANDIDATE_NEW }
                ]
              }
            },
            { sref: STATES.CANVASS,
              property: ACCESS.CANVASSES,  // NOTE: matches access property in login response
              value: {
                header: canvassDash,
                items: [
                  { name: canvassDash,
                    icon: 'fa fa-clipboard fa-fw',
                    class: DECOR.DASH.class,
                    sref: STATES.CANVASS },
                  { name: dropdownNew,
                    icon: DECOR.NEW.icon,
                    class: DECOR.NEW.class,
                    sref: STATES.CANVASS_NEW }
                ]
              }
            }
          ];
          break;
        case 'CRUMBS':
          tree = [];  // filled out once the rest are populated
          break;
        default:
          tree = undefined;
          break;
      }

      toCheck.forEach(addToTree);

      MENUS[prop] = tree;
    }

    // populate the CRUMBS property
    var runnerObj = function (root) {
      var self = this;
      self.root = root;
      self.processEntry = function (entry) {
        if (entry.state) {
          if (entry.state.indexOf(self.root.sref) === 0) {
            self.root.substates.push({
              state: entry.state,
              access: entry.access
            });
          }
        }
      };
    };
    // start with basic entries
    tree = [
      { state: STATES.APP, name: 'Home' },
      { state: STATES.ABOUTUS, name: 'About' },
      { state: STATES.CONTACTUS, name: 'Contact' }
    ];
    if (!STATES.ISDISABLED(STATES.CAMPAIGN)) {
      tree.push({ state: STATES.CAMPAIGN, name: campaign });
    }
    if (!STATES.ISDISABLED(STATES.CONFIG)) {
      tree.push({ state: STATES.CONFIG, name: configuration });
    }
    // add entries from dropdown menus
    [
      { state: STATES.ELECTION, entries: [
        { state: STATES.ELECTION, name: electionDash, access: accessAllRead },
        { state: STATES.ELECTION_VIEW, name: 'View Election', access: access1Read },
        { state: STATES.ELECTION_EDIT, name: 'Update Election', access: access1Update },
        { state: STATES.ELECTION_NEW, name: 'New Election', access: access1Create }
      ]
      },
      { state: STATES.CANDIDATE, entries: [
        { state: STATES.CANDIDATE, name: candidateDash, access: accessAllRead },
        { state: STATES.CANDIDATE_VIEW, name: 'View Candidate', access: access1Read },
        { state: STATES.CANDIDATE_EDIT, name: 'Update Candidate', access: access1Update},
        { state: STATES.CANDIDATE_NEW, name: 'New Candidate', access: access1Create }
      ]
      },
      { state: STATES.CANVASS, entries: [
        { state: STATES.CANVASS, name: canvassDash, access: accessAllRead },
        { state: STATES.CANVASS_VIEW, name: 'View Canvass', access: access1Read },
        { state: STATES.CANVASS_EDIT, name: 'Update Canvass', access: access1Update },
        { state: STATES.CANVASS_NEW, name: 'New Canvass', access: access1Create }
      ]
      },
      { state: STATES.VOTINGSYS, entries: [
        { state: STATES.VOTINGSYS, name: votingSysDash, access: accessAllRead },
        { state: STATES.VOTINGSYS_VIEW, name: 'View Voting System', access: access1Read },
        { state: STATES.VOTINGSYS_EDIT, name: 'Update Voting System', access: access1Update },
        { state: STATES.VOTINGSYS_NEW, name: 'New Voting System', access: access1Create }
      ]
      },
      { state: STATES.ROLES, entries: [
        { state: STATES.ROLES, name: rolesDash, access: accessAllRead },
        { state: STATES.ROLES_VIEW, name: 'View Role', access: access1Read },
        { state: STATES.ROLES_EDIT, name: 'Update Role', access: access1Update },
        { state: STATES.ROLES_NEW, name: 'New Role', access: access1Create }
      ]
      },
      { state: STATES.USERS, entries: [
        { state: STATES.USERS, name: userDash, access: accessAllRead },
        { state: STATES.USERS_VIEW, name: 'View User', access: access1Read },
        { state: STATES.USERS_EDIT, name: 'Update User', access: access1Update },
        { state: STATES.USERS_NEW, name: 'New User', access: access1Create },
        { state: STATES.USERS_BATCH, name: 'User Batch Mode', access: accessAllBatch }
      ]
      },
      { state: STATES.NOTICE, entries: [
        { state: STATES.NOTICE, name: noticeDash, access: accessAllRead },
        { state: STATES.NOTICE_VIEW, name: 'View Notice', access: access1Read },
        { state: STATES.NOTICE_EDIT, name: 'Update Notice', access: access1Update },
        { state: STATES.NOTICE_NEW, name: 'New Notice', access: access1Create }
      ]
      }
    ].forEach(function (cfgBlock) {
      if (!STATES.ISDISABLED(cfgBlock.state)) {
        Array.prototype.push.apply(tree, cfgBlock.entries);

        for (prop in MENUS) {
          if (MENUS[prop].root) {
            var runner = new runnerObj(MENUS[prop].root);

            cfgBlock.entries.forEach(runner.processEntry);
          }
        }
      }
    });
    MENUS.CRUMBS = tree;

    // setup show debug flag
    if (CONFIG.DEV_MODE) {
      $provide.value('DEBUG', {
        show: true,   // enabled by default in devmode
        devmode: true // devmode
      });
    } else {
      $provide.constant('DEBUG', {
        show: false,    // disable in production
        devmode: false  // production
      });
    }
  }])
  .controller('HeaderController', HeaderController);


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

HeaderController.$inject = ['$scope', '$state', '$rootScope', 'Idle', 'authFactory', 'userService', 'consoleService', 'stateFactory', 'NgDialogFactory', 'menuService', 'STATES', 'MENUS', 'USER', 'HOMESCRN', 'DEBUG', 'CONFIG'];

function HeaderController ($scope, $state, $rootScope, Idle, authFactory, userService, consoleService, stateFactory, NgDialogFactory, menuService, STATES, MENUS, USER, HOMESCRN, DEBUG, CONFIG) {

  var con = consoleService.getLogger('HeaderController');

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.openLogin = openLogin;
  $scope.openSupport = openSupport;
  $scope.logOut = logOut;

  if (CONFIG.DEV_MODE) {
    $scope.debug = DEBUG;
    $scope.toggleDebug = toggleDebug;
    toggleDebug(DEBUG.show);
  }

  stateFactory.addInterface($scope);  // add stateFactory menthods to scope

  $scope.homeMenu = MENUS.HOME;
  $scope.aboutMenu = MENUS.ABOUT;
  $scope.contactMenu = MENUS.CONTACT;

  makeBreadcrumb();
  setLoggedIn(CONFIG.NOAUTH ? false : true);

  $rootScope.$on('login:Successful', function () {
    setLoggedIn(true);
  });

  $rootScope.$on('registration:Successful', function () {
    setLoggedIn(true);
  });

  $rootScope.$on('$stateChangeSuccess',
    function (/* arguments not required so ignore
                event, toState, toParams, fromState, fromParams */){
      makeBreadcrumb();
    });

  $scope.$on('IdleStart', function() {
    // the user appears to have gone idle
    log('IdleStart:');
  });

  $scope.$on('IdleWarn', function(e, countdown) {
    // follows after the IdleStart event, but includes a countdown until the user is considered timed out
    // the countdown arg is the number of seconds remaining until then.
    // you can change the title or display a warning dialog from here.
    // you can let them resume their session by calling Idle.watch()
    log('IdleWarn:', countdown);

    if (countdown === CONFIG.AUTOLOGOUTCOUNT) {
      openIdleTimeout();
    }
  });

  $scope.$on('IdleTimeout', function() {
    // timed out (meaning idleDuration + timeout has passed without any activity)
    log('IdleTimeout:');
  });

  $scope.$on('IdleEnd', function() {
    // the user has come back from AFK and is doing stuff. if you are warning them, you can use this to hide the dialog
    log('IdleEnd:');
  });

  $scope.$on('Keepalive', function() {
    // do something to keep the user's session alive
    log('Keepalive:');

    doRefresh();
  });


  if (USER.authenticated) {
    // page reload, start idle watching, also starts the Keepalive service by default.
    if (!Idle.running()) {
      Idle.watch();

      var time = Math.floor(USER.sessionLength / 1000); // convert to sec
      time -= Idle.getIdle() - CONFIG.RELOADMARGIN;
      if (time < 0) {
        // session will expire before refresh event, so refresh now
        doRefresh();
      }
    }
  }


  /* function implementation
    -------------------------- */

  /**
   * Set logged in state
   * @param {boolean} loggedIn - logged in flag; false: force logged off state, true: state determined by authentication factory
   */
  function setLoggedIn(loggedIn, type) {

    if (!loggedIn) {
      $scope.loggedIn = false;
      $scope.username = '';
    } else {
      $scope.loggedIn = USER.authenticated;
      $scope.username = USER.username;
    }

    menuService.configMenus($scope, loggedIn);

    if ($scope.loggedIn) {
      setHomeScrnMsg(undefined);

      userService.getUserDetails(USER.id, false,
        // success function
        function (response, user) {
          USER.person = user.person;
          setHomeScrnMsg('Welcome ' + USER.person.firstname);
        }
      );

    } else if (type === 'auto') {
      setHomeScrnMsg('Your session has expired, please login again to continue.', true);
    }
  }

  function setHomeScrnMsg (msg, showAfterLogout) {
    HOMESCRN.message = msg;
    $scope.showAfterLogout = (showAfterLogout ? true : false);
  }

  function openLogin () {
    NgDialogFactory.open({ template: 'login/login.html', scope: $scope, className: 'ngdialog-theme-default', controller: 'LoginController' });
  }

  function openSupport () {
    $state.go(STATES.SUPPORT);
  }

  function openIdleTimeout () {

    doRefresh();

    var dialog = NgDialogFactory.open({
      template: 'login/idlemodal.html',
      scope: $scope, className: 'ngdialog-theme-default',
      controller: 'IdleController',
      data: {}
    });

    dialog.closePromise.then(function (data) {
      if (!NgDialogFactory.isNgDialogCancel(data.value)) {
        // stay logged in
        Idle.watch();
      } else {
        // logout
        autoLogOut();
      }
    });
  }


  function autoLogOut() {
    log('autoLogOut:');
    logOut('auto');

    NgDialogFactory.errormessage('Session expired', 'Please login again.');
  }

  function logOut(type) {
    Idle.unwatch();
    $rootScope.$broadcast('logout:');

    if (!$scope.showAfterLogout) {
      setHomeScrnMsg(undefined);
    }

    authFactory.logout(function (/*response*/) {
      // on success
      loggedOut();
    },
    function (/*response*/) {
      // on error
      loggedOut();
    });
    setLoggedIn(false, type);
  }

  function loggedOut () {
    // stop idle watching
    if ($state.is(STATES.APP)) {
      $state.reload();
    } else {
      $state.go(STATES.APP);
    }
  }


  function doRefresh() {
    if (!$scope.refreshInProgress) {
      $scope.refreshInProgress = true;
      $scope.lastRefresh = $scope.thisRefresh;
      $scope.thisRefresh = Date.now();
      authFactory.tokenRefresh(function () {
        // on success
        $scope.refreshInProgress = false;
        log('refresh ok:', ($scope.thisRefresh - $scope.lastRefresh));
      },
      function (/*response*/) {
        // on failure
        $scope.refreshInProgress = false;

        NgDialogFactory.errormessage('Session expired', 'Please login again.');
      });
    }
  }

  function makeBreadcrumb () {
    var breadcrumb = [],
      entry;

    MENUS.CRUMBS.forEach(function (crumb) {
      entry = makeCrumb(crumb.state, crumb.name);
      if (entry) {
        breadcrumb.push(entry);
      }
    });

    $scope.breadcrumb = breadcrumb;
  }

  /**
   * Make a breadcrumb entry
   * @param   {string}           state State entry should represent
   * @param   {string}           name  Display name
   * @returns {object|undefined} Crumb object or undefined if nothing to include
   */
  function makeCrumb (state, name) {
    var crumb = { name: name };

    crumb.active = stateFactory.stateIncludes(state);
    if (crumb.active) {
      if (stateFactory.stateIs(state)) {
        crumb.active = false;   // current state so link not active
      } else {
        crumb.href = stateFactory.stateHref(state);
      }
    } else {
      if (!stateFactory.stateIs(state)) {
        crumb = undefined;  // not paer of current tree so forget
      }
    }
    return crumb;
  }


  function toggleDebug (set) {
    if (set !== undefined) {
      DEBUG.show = set;
    } else {
      DEBUG.show = !DEBUG.show;
    }
    $scope.dbgText = (DEBUG.show ? 'Hide debug' : 'Show debug');
  }


  function log (title) {
    if (con.isEnabled()) {
      var args = Array.prototype.slice.call(arguments, 1);
      con.debug(title, Date.now(), args.concat(' '));
    }
  }

}

/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .controller('FooterController', FooterController);


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

FooterController.$inject = ['$scope', 'stateFactory', 'MENUS'];

function FooterController ($scope, stateFactory, MENUS) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  stateFactory.addInterface($scope);  // add stateFactory menthod to scope

  $scope.aboutMenu = MENUS.ABOUT;
  $scope.homeMenu = MENUS.HOME;


  /* function implementation
    -------------------------- */

}

/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .controller('SubmenuPageController', SubmenuPageController);


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

SubmenuPageController.$inject = ['$scope', 'SUBMENU'];

function SubmenuPageController ($scope, SUBMENU) {

  var menuEntries = [],
    entry;
  for (var prop in SUBMENU) {
    if (SUBMENU[prop].header) {
      entry = angular.copy(SUBMENU[prop]);
      entry.items.forEach(function (item) {
        item.name = item.name.trim(); // remove any whitespace used to set alignment in dropdown menu
      });
      menuEntries.push(entry);
    }
  }

  $scope.menuEntries = menuEntries;

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033

  /* function implementation
    -------------------------- */

}

/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .factory('stateFactory', stateFactory);


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

stateFactory.$inject = ['$state', 'STATES', 'MENUS'];

function stateFactory ($state, STATES, MENUS) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    addInterface: addInterface,
    stateIs: stateIs,
    stateIsNot: stateIsNot,
    stateIncludes: stateIncludes,
    stateIsOneOf: stateIsOneOf,
    stateIsNotOneOf: stateIsNotOneOf,
    inSubstate: inSubstate,
    stateHref: stateHref
  };
  
  return factory;

  /* function implementation
    -------------------------- */

  function addInterface (scope) {
    for (var prop in factory) {
      if (prop !== 'addInterface') {
        scope[prop] = factory[prop];
      }
    }
  }

  function stateIs(curstate) {
    var res = false;
    if (curstate) {
      res = $state.is(curstate);
    }
    return res;
  }

  function stateIsNot(curstate) {
    return !stateIs(curstate);
  }

  function stateIncludes(curstate) {
    var res = false;
    if (curstate) {
      res = $state.includes(curstate);
    }
    return res;
  }

  function stateIsOneOf(states) {
    var isoneof = false;
    for (var i = 0; i < states.length; ++i) {
      if (stateIs(states[i])) {
        isoneof = true;
        break;
      }
    }
    return isoneof;
  }

  function stateIsNotOneOf(states) {
    return !stateIsOneOf(states);
  }

  function inSubstate (state) {
    var properties = Object.getOwnPropertyNames(MENUS),
      issub = false;
    for (var i = 0; (i < properties.length) && !issub; ++i) {
      var entry = MENUS[properties[i]].root;
      if (entry) {
        if (entry.sref === state) {
          for (var j = 0; (j < entry.substates.length) && !issub; ++j) {
            issub = $state.is(entry.substates[j].state);
          }
        }
      }
    }
    return issub;
  }

  /**
   * A url generation method that returns the compiled url for the given state
   * populated with the given params.
   * @see https://ui-router.github.io/ng1/docs/0.3.1/index.html#/api/ui.router.state.$state
   * @param   {string|object} stateOrName The state name or state object you'd like to generate a url from.
   * @param   {object}        params      An object of parameter values to fill the state's required parameters.
   * @param   {object}        options     Options object.
   * @returns {string}        compiled state url
   */
  function stateHref (stateOrName, params, options) {
    return $state.href(stateOrName, params, options);
  }
}

/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .controller('LoginController', LoginController)

  .controller('RegisterController', RegisterController);


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

LoginController.$inject = ['$scope', '$state', '$rootScope', 'NgDialogFactory', 'Idle', 'authFactory', 'userFactory', 'userService', 'timerFactory', 'CONFIG', 'STATES'];

function LoginController($scope, $state, $rootScope, NgDialogFactory, Idle, authFactory, userFactory, userService, timerFactory, CONFIG, STATES) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.doLogin = doLogin;
  $scope.doFacebookLogin = doFacebookLogin;
  $scope.openRegister = openRegister;

  $scope.loginData = authFactory.getUserinfo();

  $scope.devmode = CONFIG.DEV_MODE;
  if (CONFIG.DEV_MODE) {
    $scope.devCredentials = devCredentials;
    $scope.devUser1 = CONFIG.DEV_USER1;
    $scope.devUser2 = CONFIG.DEV_USER2;
    $scope.devUser3 = CONFIG.DEV_USER3;
  }

  /* function implementation
    -------------------------- */

  function loginSuccess (/*response*/) {
    $rootScope.$broadcast('login:Successful');
    goHome();

    // start idle watching, also starts the Keepalive service by default.
    Idle.watch();
  }

  function loginFailure (response) {
    NgDialogFactory.error(response, 'Login Unsuccessful');
    goHome();
  }

  function goHome() {
    if ($state.is(STATES.APP)) {
      $state.reload();
    } else {
      $state.go(STATES.APP);
    }
  }

  function setSource(data) {
    data.src = authFactory.SRC.WEB;
    return data;
  }

  function doLogin() {
    authFactory.login(setSource($scope.loginData), loginSuccess, loginFailure);
    NgDialogFactory.close();
  }

  function doFacebookLogin() {
    authFactory.loginByFacebook(setSource($scope.loginData), loginSuccess, loginFailure);
    NgDialogFactory.close();
  }

  function openRegister() {
    NgDialogFactory.open({ template: 'login/register.html', scope: $scope, className: 'ngdialog-theme-default', controller: 'RegisterController' });
  }

  // Quick hack for dev mode to enter user credentials
  function devCredentials(user) {
    // HACK username/password for dev
    if (!$scope.loginData) {
      $scope.loginData = {};
    }
    if (user === CONFIG.DEV_USER1) {
      $scope.loginData.username = CONFIG.DEV_USER1;
      $scope.loginData.password = CONFIG.DEV_PASSWORD1;
    } else if (user === CONFIG.DEV_USER2) {
      $scope.loginData.username = CONFIG.DEV_USER2;
      $scope.loginData.password = CONFIG.DEV_PASSWORD2;
    } else if (user === CONFIG.DEV_USER3) {
      $scope.loginData.username = CONFIG.DEV_USER3;
      $scope.loginData.password = CONFIG.DEV_PASSWORD3;
    }
  }



}


RegisterController.$inject = ['$scope', '$rootScope', 'NgDialogFactory', 'authFactory'];

function RegisterController ($scope, $rootScope, NgDialogFactory, authFactory) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.doRegister = doRegister;

  $scope.registration = {};
  $scope.loginData = {};


  /* function implementation
    -------------------------- */

  function doRegister() {
    authFactory.register($scope.registration,
      // success functgion
      function (/*response*/) {
        $rootScope.$broadcast('registration:Successful');
      },
      // failure function
      function (response) {
        NgDialogFactory.error(response, 'Registration Unsuccessful');
      }
    );

    NgDialogFactory.close();
  }
}

/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .controller('IdleController', IdleController);


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

IdleController.$inject = ['$scope', 'NgDialogFactory', 'CONFIG'];

function IdleController($scope, NgDialogFactory, CONFIG) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.finished = finished;

  if (CONFIG.AUTOLOGOUTCOUNT < 60) {
    $scope.secTimer = true; // seconds timer
  } else if (CONFIG.AUTOLOGOUTCOUNT < 3600) {
    $scope.minTimer = true; // minutes timer
  } else if (CONFIG.AUTOLOGOUTCOUNT < 86400) {
    $scope.hrTimer = true; // hours timer
  } else {
    $scope.dayTimer = true; // days timer
  }
  $scope.timerDuration = CONFIG.AUTOLOGOUTCOUNT; //sec
  $scope.timerInterval = 1000; // interval 1 sec



  /* function implementation
    -------------------------- */

  function finished () {
    NgDialogFactory.close();
  }

}



/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .controller('PersonFilterController', PersonFilterController);


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

PersonFilterController.$inject = ['$scope'];

function PersonFilterController($scope) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.initFilter = initFilter;

  $scope.title = $scope.ngDialogData.title + ' Filter Options';

 
  
  /* function implementation
  -------------------------- */

  function initFilter() {
    $scope.ngDialogData.filter = {};
  }
  

}


/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .service('userService', userService);


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

userService.$inject = ['$state', 'userFactory', 'NgDialogFactory', 'controllerUtilFactory', 'miscUtilFactory', 'SCHEMA_CONST', 'PEOPLESCHEMA', 'ADDRSCHEMA', 'DEBUG'];

function userService($state, userFactory, NgDialogFactory, controllerUtilFactory, miscUtilFactory, SCHEMA_CONST, PEOPLESCHEMA, ADDRSCHEMA, DEBUG) {

  /*jshint validthis:true */
  this.confirmDeleteUSer = function (scope, deleteList, onSuccess, onFailure) {

    NgDialogFactory.openAndHandle({
      template: 'users/confirmdelete_user.html',
      scope: scope, className: 'ngdialog-theme-default',
      controller: 'UserDeleteController',
      data: { list: deleteList }
    },
    // process function
    function (value) {
      // perform delete
      var delParams = {};
      angular.forEach(value, function (entry) {
        delParams[entry._id] = true;
      });

      userFactory.delete('user', delParams,
        // success function
        function (response) {
          if (onSuccess) {
            onSuccess(response);
          }
        },
        // error function
        function (response) {
          if (onFailure) {
            onFailure(response);
          } else {
            NgDialogFactory.error(response, 'Delete Unsuccessful');
          }
        }
      );
    });
  };

  /*jshint validthis:true */
  this.getStateButton = function (scope, state) {
    var button = controllerUtilFactory.getStateButton(state, scope),
      buttons = miscUtilFactory.toArray(button),
      isDash = $state.is(scope.dashState);

    buttons.forEach(function (element) {
      if (element.state === scope.newState) {
        element.tip = 'Create new user';
      } else if (element.state === scope.viewState) {
        if (isDash) {
          element.tip = 'View selected user';
        } else {
          element.tip = 'View this user';
        }
      } else if (element.state === scope.editState) {
        if (isDash) {
          element.tip = 'Edit selected user';
        } else {
          element.tip = 'Edit this user';
        }
      } else if (element.state === scope.delState) {
        if (isDash) {
          element.tip = 'Delete selected user(s)';
        } else {
          element.tip = 'Delete this user';
        }
      }
    });

    // TODO remove hack, user delete not currently supported
    var idx = buttons.findIndex(function (element) {
      return (element.state === scope.delState);
    });
    if (idx >= 0) {
      buttons.splice(idx, 1);
      if (buttons.length === 0) {
        button = undefined;
      }
    }


    if (Array.isArray(button)) {
      return buttons;
    } else {
      return button;
    }
  };

  this.getUserDetails = function (id, flat, onSuccess, onFailure) {
    if (typeof flat === 'function') {
      onFailure = onSuccess;
      onSuccess = flat;
      flat = false;
    }

    userFactory.get('user', {id: id},
      // success function
      function (response) {

        var user = {
          // from user model
          username: response.username,
          role: response.role._id,
          _id: response._id
        };

        if (flat) {
          // flatten object
          PEOPLESCHEMA.SCHEMA.forModelProps([
            PEOPLESCHEMA.IDs.FNAME,
            PEOPLESCHEMA.IDs.LNAME,
            PEOPLESCHEMA.IDs.NOTE
          ], function (field) {
            var model = field[SCHEMA_CONST.MODELNAME_PROP];
            if (model) {
              user[model] = response.person[model];
            }
          });
          ADDRSCHEMA.SCHEMA.forModelProps([
            ADDRSCHEMA.IDs.ADDR1,
            ADDRSCHEMA.IDs.ADDR2,
            ADDRSCHEMA.IDs.ADDR3,
            ADDRSCHEMA.IDs.TOWN,
            ADDRSCHEMA.IDs.CITY,
            ADDRSCHEMA.IDs.COUNTY,
            ADDRSCHEMA.IDs.STATE,
            ADDRSCHEMA.IDs.COUNTRY,
            ADDRSCHEMA.IDs.PCODE,
            ADDRSCHEMA.IDs.GPS
          ], function (field) {
            var model = field[SCHEMA_CONST.MODELNAME_PROP];
            if (model) {
              user[model] = response.person.address[model];
            }
          });

          // TODO contactDetails schema & factory

          if (response.person.contactDetails) {
            miscUtilFactory.copyProperties(response.person.contactDetails, user, [
              // from contactDetails model
              'phone', 'mobile', 'email', 'website', 'facebook', 'twitter'
            ]);
          }
        } else {
          user.person = response.person;
        }

        if (DEBUG.devmode) {
          user.person_id = miscUtilFactory.readSafe(response, ['person','_id']);
          user.address_id = miscUtilFactory.readSafe(response, ['person','address','_id']);
          user.contact_id = miscUtilFactory.readSafe(response, ['person','contactDetails','_id']);
        }

        if (onSuccess) {
          onSuccess(response, user);
        }
      },
      // error function
      function (response) {
        // response is message
        NgDialogFactory.error(response, 'Unable to retrieve User');

        if (onFailure) {
          onFailure(response);
        }
      }
    );
  };


}


/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .controller('UserDashController', UserDashController)

  .filter('filterDashUser', ['UTIL', function (UTIL) {
    return function (input, name, op, role) {

      if (!op) {
        op = UTIL.OP_OR;
      }
      var out = [];
      if (name || role) {
        // filter by name & role values for
        angular.forEach(input, function (user) {
          var nameOk,
            roleOk,
            username = user.person.firstname + ' ' + user.person.lastname;

          if (name) {
            nameOk = (username.toLowerCase().indexOf(name) >= 0);
          } else {
            nameOk = false;
          }
          if (role) {
            roleOk = (user.role._id === role);
          } else {
            roleOk = false;
          }
          if (((op === UTIL.OP_OR) && (nameOk || roleOk)) ||
              ((op === UTIL.OP_AND) && (nameOk && roleOk))) {
            out.push(user);
          }
        });
      } else {
        out = input;
      }
      return out;
    };
  }]);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

UserDashController.$inject = ['$scope', 'roleFactory', 'userFactory', 'userService', 'NgDialogFactory', 'stateFactory', 'controllerUtilFactory', 'miscUtilFactory', 'USERSCHEMA', 'STATES', 'UTIL', 'DEBUG'];

function UserDashController($scope, roleFactory, userFactory, userService, NgDialogFactory, stateFactory, controllerUtilFactory, miscUtilFactory, USERSCHEMA, STATES, UTIL, DEBUG) {

  controllerUtilFactory.setScopeVars('USERS', $scope);

  if (DEBUG.devmode) {
    $scope.debug = DEBUG;
  }

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.filterOps = UTIL.OP_LIST;
  $scope.initFilter = initFilter;
  $scope.toggleSelection = toggleSelection;

  $scope.changeStateParam = changeStateParam;
  $scope.dashDelete = dashDelete;
  $scope.setSelect = setSelect;
  $scope.getStateButton = getStateButton;

  stateFactory.addInterface($scope);  // add stateFactory menthods to scope

  initFilter();

  // get list of roles selecting name field, _id field is always provided
  $scope.roles = roleFactory.query('role', {fields: 'name'},
    // success function
    function (response) {
      // response is actual data
      $scope.roles = response;

      // get list of users
      getUsers();
    },
    // error function
    function (response) {
      // response is message
      NgDialogFactory.error(response);
    }
  );

  /* function implementation
  -------------------------- */

  function initFilter() {
    $scope.filterText = undefined;
    $scope.filterRole = undefined;
    $scope.filterOp = undefined;
    setSelect(0);
  }

  function toggleSelection (entry) {
    setUser(
      controllerUtilFactory.toggleSelection($scope, entry, $scope.users, initUser)
    );
  }

  function getUsers() {
    // get list of users
    $scope.users = userFactory.query('user',
      // success function
      function (response) {
        // response is actual data
        $scope.users = response;
      },
      // error function
      function (response) {
        // repose is message
        NgDialogFactory.error(response, 'Unable to retrieve users');
      }
    );
  }


  function changeStateParam () {
    return {
      id: $scope.user._id
    };
  }

  function setUser (user) {
    $scope.user = user;
  }

  function initUser () {
    // include only required fields
    setUser(USERSCHEMA.SCHEMA.getObject());
  }

  function dashDelete() {
    var selectedList = miscUtilFactory.getSelectedList($scope.users);
    userService.confirmDeleteUser($scope, selectedList,
      // on success
      function (/*response*/) {
        getUsers();
      });
  }

  function getStateButton (state) {
    return userService.getStateButton($scope, state);
  }


  function setSelect (sel) {
    return controllerUtilFactory.setSelect($scope, $scope.users, sel);
  }

}


/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .controller('UserController', UserController);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

UserController.$inject = ['$scope', '$rootScope', '$state', '$stateParams', 'roleFactory', 'userFactory', 'userService', 'NgDialogFactory', 'stateFactory', 'consoleService', 'controllerUtilFactory', 'DEBUG', 'MISC'];

function UserController($scope, $rootScope, $state, $stateParams, roleFactory, userFactory, userService, NgDialogFactory, stateFactory, consoleService, controllerUtilFactory, DEBUG, MISC) {

  var con = consoleService.getLogger('UserController');

  con.log('UserController id', $stateParams.id);

  controllerUtilFactory.setScopeVars('USERS', $scope);

  if (DEBUG.devmode) {
    $scope.debug = DEBUG;
  }

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.getTitle = getTitle;
  $scope.processForm = processForm;

  $scope.changeStateParam = changeStateParam;
  $scope.singleDelete = singleDelete;
  $scope.getStateButton = getStateButton;

  $scope.gotoDash = gotoDash;

  stateFactory.addInterface($scope);  // add stateFactory menthods to scope

  initUser($stateParams.id);

  // get list of roles selecting name field, _id field is always provided
  $scope.roles = roleFactory.query('role', {fields: 'name'},
    // success function
    function (response) {
      // response is actual data
      $scope.roles = response;
    },
    // error function
    function (response) {
      // response is message
      NgDialogFactory.error(response);
    }
  );
  $scope.countries = MISC.COUNTRIES;

  /* function implementation
  -------------------------- */

  function getTitle() {
    $scope.editDisabled = true;
    $scope.passSetable = false;

    var title;
    if ($state.is($scope.newState)) {
      title = 'Create User';
      $scope.editDisabled = false;
      $scope.passSetable = true;
    } else if ($state.is($scope.viewState)) {
      title = 'View User';
    } else if ($state.is($scope.editState)) {
      title = 'Update User';
      $scope.editDisabled = false;
    } else {
      title = '';
    }
    return title;
  }

  function processForm() {
    if ($state.is($scope.newState)) {
      createUser();
    } else if ($state.is($scope.viewState)) {
      gotoDash();
    } else if ($state.is($scope.editState)) {
      updateUser();
    }
  }

  function initUser(id) {
    if (!id) {
      // include only required fields
      $scope.user = {
        firstname: '',
        lastname: '',
        username: '',
        role: '',
        _id: ''
      };
    } else {
      $scope.user = undefined;
      userService.getUserDetails(id, true,
        // success function
        function (response, user) {

          con.log('response', response);

          $scope.user = user;
        }
      );
    }
  }


  function createUser() {

    con.log('createUser', $scope.user);

    userFactory.save('user', $scope.user,
      // success function
      function (/*response*/) {
        initUser();
        gotoDash();
      },
      // error function
      function (response) {
        // response is message
        NgDialogFactory.error(response, 'Creation Unsuccessful');
      }
    );
  }

  function updateUser() {

    con.log('updateUser', $scope.user);

    userFactory.update('user', {id: $scope.user._id}, $scope.user,
      // success function
      function (/*response*/) {
        initUser();
        gotoDash();
      },
      // error function
      function (response) {
        // response is message
        NgDialogFactory.error(response, 'Update Unsuccessful');
      }
    );
  }

  function changeStateParam () {
    return {
      id: $scope.user._id
    };
  }

  function singleDelete() {
    userService.confirmDeleteUser($scope, [$scope.user],
      // success function
      function (/*response*/) {
        gotoDash();
      });
  }

  function getStateButton (state) {
    return userService.getStateButton($scope, state);
  }

  function gotoDash() {
    $state.go($scope.dashState);
  }


}


/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .controller('UserDeleteController', UserDeleteController);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

UserDeleteController.$inject = ['$scope', 'utilFactory'];

function UserDeleteController($scope, utilFactory) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.formatDate = utilFactory.formatDate;


  /* function implementation
  -------------------------- */

}


/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .directive('file', function(){
    // Based on http://angularjstutorial.blogspot.ie/2012/12/angularjs-with-input-file-directive.html#.WWi57YjyuHs
    return {
      scope: {
        file: '='   // bidirectional binding
      },
      /**
           * Directive link function
           * @param {object} scope   Scope object
           * @param {object} element jqLite-wrapped element that this directive matches
           * @param {object} attrs   hash object with key-value pairs of normalized attribute names and their corresponding attribute values
           */
      link: function(scope, element, attrs){
        element.bind('change', function(event){
          var file = event.target.files[0];
          scope.file = file ? file : undefined;
          scope.$apply();
        });
      }
    };
  })

  .controller('UserBatchController', UserBatchController);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

UserBatchController.$inject = ['$scope', 'roleFactory', 'userFactory', 'userService', 'NgDialogFactory', 'stateFactory', 'controllerUtilFactory', 'miscUtilFactory', 'USERSCHEMA', 'STATES', 'UTIL', 'DEBUG'];

function UserBatchController($scope, roleFactory, userFactory, userService, NgDialogFactory, stateFactory, controllerUtilFactory, miscUtilFactory, USERSCHEMA, STATES, UTIL, DEBUG) {

  if (DEBUG.devmode) {
    $scope.debug = DEBUG;
  }

  $scope.param = {};
  $scope.errors = [];

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.processForm = processForm;


  /* function implementation
  -------------------------- */

  function processForm() {

    $scope.errors = [];

    if ($scope.param.file) {
      var reader = new FileReader();
      reader.onload = function (event) {
        // The file's text will be printed here
        console.log(event.target.result);
        
        var obj;
        try {
          obj = JSON.parse(event.target.result);
          
          userFactory.save('batch', obj,
            // success function
            function (response) {
              $scope.errors = response.errors;

              $scope.param = {};
              $scope.userBatchForm.$setPristine();

              var info = getResultTitleMsg(response);
              NgDialogFactory.message(info.title, info.msg);
            },
            // error function
            function (response) {
              $scope.errors = response.data.errors;
            
              var info = getResultTitleMsg(response.data);
              NgDialogFactory.errormessage(info.title, info.msg);
            }
          );
          
        }
        catch (ex) {
          NgDialogFactory.errormessage('Error', ex.message);
        }
        
      };
      reader.readAsText($scope.param.file);
    }
    
  }
  
  function getResultTitleMsg (result) {
    var title,
      msg = [];
    if (result.failed > 0) {
      if (result.created === 0) {
        title = 'Processing Unsuccessful';
      } else {
        title = 'Processing Partially Completed';
        msg.push(puraliseMsg(result.created, 'user', 'created'));
      }
      msg.push(puraliseMsg(result.failed, 'error', 'error during processing'));
    } else if ((result.failed === 0) && (result.created === 0)) {
      title = 'Nothing Processed';
      msg.push('Please verify input file');
    } else {
      title = 'Processing Completed';
      msg.push(puraliseMsg(result.created, 'user', 'created'));
    }
    return {
      title: title,
      msg: msg
    };
  }

  function puraliseMsg (count, noun, base) {
    var msg;
    if (count === 1) {
      msg = '1 ' + noun + ' ' + base;
    } else if (count === 0) {
      msg = 'No ' + noun + 's ' + base;
    } else {
      msg = count + ' ' + noun + 's ' + base;
    }
    return msg;
  }

}


/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .service('electionService', electionService);


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

electionService.$inject = ['$state', 'electionFactory', 'NgDialogFactory', 'controllerUtilFactory'];

function electionService($state, electionFactory, NgDialogFactory, controllerUtilFactory) {

  /*jshint validthis:true */
  this.confirmDeleteElection = function (scope, deleteList, onSuccess, onFailure) {

    NgDialogFactory.openAndHandle({
      template: 'elections/confirmdelete_election.html',
      scope: scope, className: 'ngdialog-theme-default',
      controller: 'ElectionDeleteController',
      data: { list: deleteList }
    },
    // process function
    function (value) {
      // perform delete
      var delParams = {};
      angular.forEach(value, function (entry) {
        delParams[entry._id] = true;
      });

      electionFactory.delete('election', delParams,
        // success function
        onSuccess,
        // error function
        function (response) {
          if (onFailure) {
            onFailure(response);
          } else {
            NgDialogFactory.error(response, 'Delete Unsuccessful');
          }
        }
      );
    });
  };

  /*jshint validthis:true */
  this.getStateButton = function (scope, state) {
    var button = controllerUtilFactory.getStateButton(state, scope),
      isDash = $state.is(scope.dashState);

    button.forEach(function (element) {
      if (element.state === scope.newState) {
        element.tip = 'Create new election';
      } else if (element.state === scope.viewState) {
        if (isDash) {
          element.tip = 'View selected election';
        } else {
          element.tip = 'View this election';
        }
      } else if (element.state === scope.editState) {
        if (isDash) {
          element.tip = 'Edit selected election';
        } else {
          element.tip = 'Edit this election';
        }
      } else if (element.state === scope.delState) {
        if (isDash) {
          element.tip = 'Delete selected election(s)';
        } else {
          element.tip = 'Delete this election';
        }
      }
    });

    return button;
  };

}


/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .controller('ElectionDashController', ElectionDashController)

  .filter('filterDashElection', ['UTIL', function (UTIL) {
    return function (input, name, op, system) {

      if (!op) {
        op = UTIL.OP_OR;
      }
      var out = [];
      if (name || system) {
        // filter by name & system values for
        angular.forEach(input, function (election) {
          var nameOk,
            systemOk;

          if (name) {
            nameOk = (election.name.toLowerCase().indexOf(name.toLowerCase()) >= 0);
          } else {
            nameOk = false;
          }
          if (system) {
            systemOk = (election.system._id === system);
          } else {
            systemOk = false;
          }
          if (((op === UTIL.OP_OR) && (nameOk || systemOk)) ||
              ((op === UTIL.OP_AND) && (nameOk && systemOk))) {
            out.push(election);
          }
        });
      } else {
        out = input;
      }
      return out;
    };
  }]);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

ElectionDashController.$inject = ['$scope', '$rootScope', '$state', 'votingsystemFactory', 'electionFactory', 'electionService', 'NgDialogFactory', 'stateFactory', 'utilFactory', 'controllerUtilFactory', 'miscUtilFactory', 'ELECTIONSCHEMA', 'STATES', 'UTIL', 'DEBUG'];

function ElectionDashController($scope, $rootScope, $state, votingsystemFactory, electionFactory, electionService, NgDialogFactory, stateFactory, utilFactory, controllerUtilFactory, miscUtilFactory, ELECTIONSCHEMA, STATES, UTIL, DEBUG) {

  controllerUtilFactory.setScopeVars('ELECTION', $scope);

  if (DEBUG.devmode) {
    $scope.debug = DEBUG;
  }

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.filterOps = UTIL.OP_LIST;
  $scope.initFilter = initFilter;
  $scope.toggleSelection = toggleSelection;
  $scope.formatDate = utilFactory.formatDate;

  $scope.changeStateParam = changeStateParam;
  $scope.dashDelete = dashDelete;
  $scope.setSelect = setSelect;
  $scope.getStateButton = getStateButton;

  stateFactory.addInterface($scope);  // add stateFactory menthods to scope

  initFilter();

  // get list of systems selecting name field, _id field is always provided
  $scope.votingSystems = votingsystemFactory.query('system', {fields: 'name'},
    // success function
    function (response) {
      // response is actual data
      $scope.votingSystems = response;

      getElections();
    },
    // error function
    function (response) {
      // response is message
      NgDialogFactory.error(response, 'Unable to retrieve Voting Systems');
      $state.go(STATES.APP);
    }
  );


  /* function implementation
  -------------------------- */

  function initFilter() {
    $scope.filterText = undefined;
    $scope.filterSystem = undefined;
    $scope.filterOp = undefined;
    setSelect(0);
  }

  function toggleSelection (entry) {
    setElection(
      controllerUtilFactory.toggleSelection($scope, entry, $scope.elections, initElection)
    );
  }


  function getElections () {
    $scope.elections = electionFactory.query('election',
      // success function
      function (response) {
        // response is actual data
        $scope.elections = response;

        initFilter();
      },
      // error function
      function (response) {
        // response is message
        NgDialogFactory.error(response, 'Unable to retrieve Elections');
      }
    );
  }

  function changeStateParam () {
    return {
      id: $scope.election._id
    };
  }

  function setElection (election) {
    $scope.election = election;
  }

  function initElection () {
    // include only required fields
    setElection(ELECTIONSCHEMA.SCHEMA.getObject());
  }


  function dashDelete() {
    var selectedList = miscUtilFactory.getSelectedList($scope.elections);
    electionService.confirmDeleteElection($scope, selectedList,
      // success function
      function (/*response*/) {
        getElections();
      });
  }

  function getStateButton (state) {
    return electionService.getStateButton($scope, state);
  }

  function setSelect(sel) {
    return controllerUtilFactory.setSelect($scope, $scope.elections, sel);
  }


}


/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .controller('ElectionController', ElectionController);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

ElectionController.$inject = ['$scope', '$rootScope', '$state', '$stateParams', 'votingsystemFactory', 'electionFactory', 'electionService', 'NgDialogFactory', 'stateFactory', 'controllerUtilFactory', 'consoleService', 'STATES', 'ELECTIONSCHEMA', 'RESOURCE_CONST', 'DEBUG'];

function ElectionController($scope, $rootScope, $state, $stateParams, votingsystemFactory, electionFactory, electionService, NgDialogFactory, stateFactory, controllerUtilFactory, consoleService, STATES, ELECTIONSCHEMA, RESOURCE_CONST, DEBUG) {

  var con = consoleService.getLogger('ElectionController');

  con.debug('ElectionController id', $stateParams.id);

  controllerUtilFactory.setScopeVars('ELECTION', $scope);

  if (DEBUG.devmode) {
    $scope.debug = DEBUG;
  }

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.getTitle = getTitle;
  $scope.processForm = processForm;

  $scope.changeStateParam = changeStateParam;
  $scope.singleDelete = singleDelete;
  $scope.getStateButton = getStateButton;

  $scope.gotoDash = gotoDash;

  stateFactory.addInterface($scope);  // add stateFactory menthods to scope

  // get list of systems selecting name field, _id field is always provided
  $scope.votingSystems = votingsystemFactory.query('system', {fields: 'name'},
    // success function
    function (response) {
      // response is actual data
      $scope.votingSystems = response;
    },
    // error function
    function (response) {
      // response is message
      NgDialogFactory.error(response, 'Unable to retrieve Voting Systems');
      $state.go(STATES.APP);
    }
  );

  initItem($stateParams.id);
  
  /* function implementation
  -------------------------- */

  function getTitle() {
    $scope.editDisabled = true;

    var title;
    if ($state.is($scope.newState)) {
      title = 'Create Election';
      $scope.editDisabled = false;
    } else if ($state.is($scope.viewState)) {
      title = 'View Election';
    } else if ($state.is($scope.editState)) {
      title = 'Update Election';
      $scope.editDisabled = false;
    } else {
      title = '';
    }
    return title;
  }


  function processForm() {
    if ($state.is($scope.newState)) {
      createElection();
    } else if ($state.is($scope.viewState)) {
      gotoDash();
    } else if ($state.is($scope.editState)) {
      updateElection();
    }
  }

  function initItem(id) {
    if (!id) {
      $scope.election = ELECTIONSCHEMA.SCHEMA.getObject();
    } else {
      $scope.election = electionFactory.get('election', {id: id},
        // success function
        function (response) {

          $scope.election = electionFactory.readResponse(response, {
            objId: undefined, // no objId means not stored, just returned
            factory: 'electionFactory',
            storage: RESOURCE_CONST.STORE_OBJ,
            subObj: { // storage infor for election
              objId: undefined, // no objId means not stored, just returned
              factory: 'votingsystemFactory',
              schema: ELECTIONSCHEMA.SCHEMA,
              schemaId: ELECTIONSCHEMA.IDs.SYSTEM,
              //type: can be retrieved using schema & schemaId
              //path: can be retrieved using schema & schemaId
              storage: RESOURCE_CONST.STORE_OBJ,
            }
          });
        },
        // error function
        function (response) {
          // response is message
          NgDialogFactory.error(response, 'Unable to retrieve Election');
        }
      );
    }
  }


  function createElection() {

    con.log('createElection', $scope.election);

    electionFactory.save('election', $scope.election,
      // success function
      function (/*response*/) {
        initItem();
        gotoDash();
      },
      // error function
      function (response) {
        // response is message
        NgDialogFactory.error(response, 'Creation Unsuccessful');
      }
    );
  }

  function updateElection() {

    con.log('updateElection', $scope.election);

    electionFactory.update('election', {id: $scope.election._id}, $scope.election,
      // success function
      function (/*response*/) {
        initItem();
        gotoDash();
      },
      // error function
      function (response) {
        // response is message
        NgDialogFactory.error(response, 'Update Unsuccessful');
      }
    );
  }

  function changeStateParam () {
    return {
      id: $scope.election._id
    };
  }

  function singleDelete() {

    // $scope.election.system is set to doc id, change to object for display purposes
    var deleteList = [
      JSON.parse(JSON.stringify($scope.election))
    ];
    deleteList[0].system = $scope.votingSystems.find(function (system) {
      return (system._id === $scope.election.system);
    });

    electionService.confirmDeleteElection($scope, deleteList,
      // success function
      function (/*response*/) {
        gotoDash();
      });
  }

  function getStateButton (state) {
    return electionService.getStateButton($scope, state);
  }

  function gotoDash() {
    $state.go($scope.dashState);
  }

}


/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .controller('ElectionDeleteController', ElectionDeleteController);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

ElectionDeleteController.$inject = ['$scope', 'utilFactory'];

function ElectionDeleteController($scope, utilFactory) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.formatDate = utilFactory.formatDate;


  /* function implementation
  -------------------------- */

}


/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .service('canvassService', canvassService);


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

canvassService.$inject = ['$state', 'canvassFactory', 'NgDialogFactory', 'controllerUtilFactory', 'userFactory', 'miscUtilFactory', 'USERSCHEMA', 'SCHEMA_CONST'];

function canvassService($state, canvassFactory, NgDialogFactory, controllerUtilFactory, userFactory, miscUtilFactory, USERSCHEMA, SCHEMA_CONST) {

  var roleDialog =
      USERSCHEMA.SCHEMA.getField(USERSCHEMA.USER_ROLE_IDX, SCHEMA_CONST.DIALOG_PROP);

  /*jshint validthis:true */
  this.confirmDeleteCanvass = function (scope, deleteList, onSuccess, onFailure) {

    NgDialogFactory.openAndHandle({
      template: 'canvasses/confirmdelete_canvass.html',
      scope: scope, className: 'ngdialog-theme-default',
      controller: 'CanvassDeleteController',
      data: { list: deleteList }
    },
    // process function
    function (value) {
      // perform delete
      var delParams = {};
      angular.forEach(value, function (entry) {
        delParams[entry._id] = true;
      });

      canvassFactory.delete('canvass', delParams,
        // success function
        onSuccess,
        // error function
        function (response) {
          if (onFailure) {
            onFailure(response);
          } else {
            NgDialogFactory.error(response, 'Delete Unsuccessful');
          }
        }
      );
    });
  };

  /*jshint validthis:true */
  this.getStateButton = function (scope, state) {
    var button = controllerUtilFactory.getStateButton(state, scope),
      isDash = $state.is(scope.dashState);

    button.forEach(function (element) {
      if (element.state === scope.newState) {
        element.tip = 'Create new canvass';
      } else if (element.state === scope.viewState) {
        if (isDash) {
          element.tip = 'View selected canvass';
        } else {
          element.tip = 'View this canvass';
        }
      } else if (element.state === scope.editState) {
        if (isDash) {
          element.tip = 'Edit selected canvass';
        } else {
          element.tip = 'Edit this canvass';
        }
      } else if (element.state === scope.delState) {
        if (isDash) {
          element.tip = 'Delete selected canvass(es)';
        } else {
          element.tip = 'Delete this canvass';
        }
      }
    });

    return button;
  };


  this.newCanvasserFilter = function (base, canvasser) {
    var opts = {
        hiddenFilters: [roleDialog] // hide role from filter description
      },
      filter;

    // display role name rather than id
    //    if (canvasser) {
    //      opts = {
    //        dispTransform: function (dialog, filterVal) {
    //          var str = filterVal;
    //          if (dialog === roleDialog) {
    //            str = canvasser.name;
    //          }
    //          return str;
    //        }
    //      };
    //    }

    filter = userFactory.newFilter(base, opts);

    // add canvasser restriction to filter
    if (canvasser) {
      filter.addFilterValue(roleDialog, canvasser._id);
    }

    return filter;
  };



}


/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .controller('CanvassDashController', CanvassDashController)

  .filter('filterDashCanvass', ['UTIL', function (UTIL) {
    return function (input, name, op, election) {
      
      if (!op) {
        op = UTIL.OP_OR;
      }
      var out = [];
      if (name || election) {
        // filter by name & election values for
        angular.forEach(input, function (canvass) {
          var nameOk,
            electionOk;

          if (name) {
            nameOk = (canvass.name.toLowerCase().indexOf(name.toLowerCase()) >= 0);
          } else {
            nameOk = false;
          }
          if (election) {
            electionOk = (canvass.election._id === election);
          } else {
            electionOk = false;
          }
          if (((op === UTIL.OP_OR) && (nameOk || electionOk)) ||
              ((op === UTIL.OP_AND) && (nameOk && electionOk))) {
            out.push(canvass);
          }
        });
      } else {
        out = input;
      }
      return out;
    };
  }]);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

CanvassDashController.$inject = ['$scope', '$rootScope', '$state', 'canvassFactory', 'canvassService', 'electionFactory', 'NgDialogFactory', 'stateFactory', 'miscUtilFactory', 'utilFactory', 'controllerUtilFactory', 'CANVASSSCHEMA', 'STATES', 'UTIL', 'DEBUG'];

function CanvassDashController($scope, $rootScope, $state, canvassFactory, canvassService, electionFactory, NgDialogFactory, stateFactory, miscUtilFactory, utilFactory, controllerUtilFactory, CANVASSSCHEMA, STATES, UTIL, DEBUG) {

  if (DEBUG.devmode) {
    $scope.debug = DEBUG;
  }

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.filterOps = UTIL.OP_LIST;
  $scope.initFilter = initFilter;
  $scope.toggleCanvassSel = toggleCanvassSel;
  $scope.formatDate = utilFactory.formatDate;

  $scope.changeStateParam = changeStateParam;
  $scope.dashDelete = dashDelete;
  $scope.setSelect = setSelect;
  $scope.getStateButton = getStateButton;

  stateFactory.addInterface($scope);  // add stateFactory menthods to scope

  controllerUtilFactory.setScopeVars('CANVASS', $scope);

  initFilter();

  // get list of elections selecting name field, _id field is always provided
  $scope.elections = electionFactory.query('election', {fields: 'name'},
    // success function
    function (response) {
      // response is actual data
      $scope.elections = response;

      getCanvasses();
    },
    // error function
    function (response) {
      // response is message
      NgDialogFactory.error(response, 'Unable to retrieve Elections');
      $state.go(STATES.APP);
    }
  );

  
  
  /* function implementation
  -------------------------- */

  function initFilter() {
    $scope.filterText = undefined;
    $scope.filterElection = undefined;
    $scope.filterOp = undefined;
    setSelect(0);
  }
  
  
  function toggleCanvassSel (entry) {
    setCanvass(
      controllerUtilFactory.toggleSelection($scope, entry, $scope.canvasses, initCanvass)
    );
  }

  function getCanvasses() {
    $scope.canvasses = canvassFactory.query('canvass',
      // success function
      function (response) {
        // response is actual data
        $scope.canvasses = response;

        initFilter();
        initCanvass();
      },
      // error function
      function (response) {
        // response is message
        NgDialogFactory.error(response, 'Unable to retrieve Canvasses');
      }
    );
  }
  

  function setCanvass(canvass) {
    $scope.canvass = canvass;
  }

  function initCanvass() {
    // include only required fields
    setCanvass(CANVASSSCHEMA.SCHEMA.getObject());
  }

  function changeStateParam () {
    return {
      id: $scope.canvass._id
    };
  }
  
  function dashDelete () {
    var selectedList = miscUtilFactory.getSelectedList($scope.canvasses);
    canvassService.confirmDeleteCanvass($scope, selectedList,
      // on success
      function (/*response*/) {
        getCanvasses();
      });
  }

  function setSelect (sel) {
    return controllerUtilFactory.setSelect($scope, $scope.canvasses, sel);
  }

  function getStateButton (state) {
    return canvassService.getStateButton($scope, state);
  }


}


/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .value('LABELS', (function () {
    return {
      index: 0,
      classes: [
        'label-primary',
        'label-success',
        'label-info',
        'label-warning',
        'label-danger'
      ]
    };
  })())
  .controller('CanvassController', CanvassController);


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

CanvassController.$inject = ['$scope', '$state', '$stateParams', '$filter', '$injector', 'canvassFactory', 'canvassService', 'canvassAssignmentFactory', 'surveyFactory', 'addressFactory', 'userFactory', 'NgDialogFactory', 'stateFactory', 'utilFactory', 'miscUtilFactory', 'storeFactory', 'resourceFactory', 'consoleService', 'controllerUtilFactory', 'RES', 'roleFactory', 'ROLES', 'STATES', 'LABELS', 'SCHEMA_CONST', 'CANVASSSCHEMA', 'SURVEYSCHEMA', 'CANVASSRES_SCHEMA', 'CANVASSASSIGN_SCHEMA', 'ADDRSCHEMA', 'RESOURCE_CONST', 'QUESTIONSCHEMA', 'CHARTS', 'DEBUG'];

function CanvassController($scope, $state, $stateParams, $filter, $injector, canvassFactory, canvassService, canvassAssignmentFactory, surveyFactory, addressFactory, userFactory, NgDialogFactory, stateFactory, utilFactory, miscUtilFactory, storeFactory, resourceFactory, consoleService, controllerUtilFactory, RES, roleFactory, ROLES, STATES, LABELS, SCHEMA_CONST, CANVASSSCHEMA, SURVEYSCHEMA, CANVASSRES_SCHEMA, CANVASSASSIGN_SCHEMA, ADDRSCHEMA, RESOURCE_CONST, QUESTIONSCHEMA, CHARTS, DEBUG) {

  var con = consoleService.getLogger('CanvassController');

  con.debug('CanvassController id', $stateParams.id);

  controllerUtilFactory.setScopeVars('CANVASS', $scope);

  $scope.tabs = {
    CANVASS_TAB: 0,
    SURVEY_TAB: 1,
    ADDRESS_TAB: 2,
    CANVASSER_TAB: 3,
    ASSIGNMENT_TAB: 4,
    RESULT_TAB: 5,
    ALL_TABS: 6,
    DASH_TAB: 100  // tab number to indicate dashboard
  };
  $scope.firstTab = $scope.tabs.CANVASS_TAB;
  if (showTab($scope.tabs.RESULT_TAB)) {
    $scope.lastTab = $scope.tabs.RESULT_TAB;
  } else {
    $scope.lastTab = $scope.tabs.ASSIGNMENT_TAB;
  }
  $scope.activeTab = $scope.firstTab;
  $scope.deactiveTab = $scope.firstTab;

  LABELS.index = 0;

  var TAB_BITS = [0];
  for (var prop in $scope.tabs) {
    var bit = (1 << $scope.tabs[prop]);
    if ($scope.tabs[prop] !== $scope.tabs.ALL_TABS) {
      TAB_BITS.push(bit);
      TAB_BITS[0] += bit;
    }
  }
  TAB_BITS.push(TAB_BITS.shift());  // first shall be last

  if (DEBUG.devmode) {
    $scope.debug = DEBUG;
  }

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.getTitle = getTitle;

  $scope.changeStateParam = changeStateParam;
  $scope.singleDelete = singleDelete;
  $scope.getStateButton = getStateButton;

  $scope.showTab = showTab;
  $scope.initTab = initTab;
  $scope.deselectTab = deselectTab;
  $scope.formatDate = utilFactory.formatDate;
  $scope.processForm = processForm;
  $scope.processSurvey = processSurvey;
  $scope.gotoDash = gotoDash;
  $scope.nextTab = nextTab;
  $scope.prevTab = prevTab;
  $scope.gotoTab = gotoTab;
  $scope.setPage = setPage;
  $scope.incPage = incPage;
  $scope.decPage = decPage;
  $scope.isFirstPage = isFirstPage;
  $scope.isLastPage = isLastPage;
  $scope.isActivePage = isActivePage;
  $scope.setPerPage = setPerPage;
  $scope.showPager = showPager;
  $scope.toggleItemSel = toggleItemSel;
  $scope.setItemSel = setItemSel;
  $scope.requestCanvasserRole = requestCanvasserRole;
  $scope.getSurveyRspOptions = getSurveyRspOptions;

  stateFactory.addInterface($scope);  // add stateFactory menthods to scope

  canvassAssignmentFactory.setLabeller(labeller);

  initItem(); // perform basic init of objects
  if ($stateParams.id) {
    initItem($stateParams.id);  // init objects for id
  }

  /* function implementation
  -------------------------- */

  function initTab (tab) {
    if (tab < TAB_BITS.length) {
      var bit = TAB_BITS[tab];

      Object.getOwnPropertyNames($scope.tabs).forEach(function (prop) {
        if ($scope.tabs[prop] !== $scope.tabs.ALL_TABS) {  // skip all tabs
          if ((bit & TAB_BITS[$scope.tabs[prop]]) !== 0) {
            switch ($scope.tabs[prop]) {
              case $scope.tabs.CANVASS_TAB:
                // canvass tab specific init
                break;
              case $scope.tabs.SURVEY_TAB:
                // survey tab specific init
                if ($scope.survey) {
                  miscUtilFactory.initSelected($scope.survey.questions);
                }
                break;
              case $scope.tabs.ADDRESS_TAB:
                // address tab specific init
                break;
              case $scope.tabs.CANVASSER_TAB:
                // canvasser tab specific init
                break;
              case $scope.tabs.ASSIGNMENT_TAB:
                // assignment tab specific init
                break;
              case $scope.tabs.RESULT_TAB:
                // result tab specific init
                break;
            }
          }
        }
      });
    }
  }
  
  function deselectTab ($event, $selectedIndex) {

    var modified = false;

    con.debug('deselectTab', $event, $scope.deactiveTab, $selectedIndex);

    if ($scope.deactiveTab === $selectedIndex) {
      return; // ignore
    }

    if ($state.is($scope.newState) || $state.is($scope.editState)) {
      switch ($scope.deactiveTab) {
        case $scope.tabs.CANVASS_TAB:
          modified = isCanvassModified();
          if (modified) {
            deselectObjectTab($event, $scope.deactiveTab, $selectedIndex, 'Canvass Modified',
              function () {
                // discard modificarions
                $scope.canvass = canvassFactory.duplicateObj(RES.ACTIVE_CANVASS, RES.BACKUP_CANVASS, storeFactory.OVERWRITE);
              });
          }
          break;
        case $scope.tabs.SURVEY_TAB:
          modified = isSurveyModified();
          if (modified) {
            deselectObjectTab($event, $scope.deactiveTab, $selectedIndex, 'Survey Modified',
              function () {
                // discard modificarions
                $scope.survey = surveyFactory.duplicateObj(RES.ACTIVE_SURVEY, RES.BACKUP_SURVEY, storeFactory.OVERWRITE);
              });
          }
          break;
        case $scope.tabs.ADDRESS_TAB:
          modified = deselectListTab($event, $scope.deactiveTab, $selectedIndex,
            addressFactory.getList(RES.ASSIGNED_ADDR),
            addressFactory.getList(RES.BACKUP_ASSIGNED_ADDR),
            'Assigned Addresses Modified');
          break;
        case $scope.tabs.CANVASSER_TAB:
          modified = deselectListTab($event, $scope.deactiveTab, $selectedIndex,
            userFactory.getList(RES.ASSIGNED_CANVASSER),
            userFactory.getList(RES.BACKUP_ASSIGNED_CANVASSER),
            'Assigned Canvassers Modified');
          break;
        case $scope.tabs.ASSIGNMENT_TAB:
          modified = areAllocationsModified();
          if (modified) {
            deselectObjectTab($event, $scope.deactiveTab, $selectedIndex, 'Assignments Modified',
              function () {
                // discard modificarions
                var undoStack = storeFactory.getObj(RES.ALLOCATION_UNDOS);
                if (undoStack) {
                  undoStack.undo();
                }
              });
          }
          break;
      }
    }
    if (!modified) {
      /* no need to gotoTab as activeTab will have been set by the tab selection click
        or the gotoTab call on the next/prev button */
      endTabChange($selectedIndex);
    }
  }
  
  function deselectObjectTab ($event, prevTabIndex, nextTabIndex, title, restoreFunc) {

    var tabSet = function () {
      endTabChange(nextTabIndex);  // default, just setup for next change
    };
    if ($event) {
      $event.preventDefault();

      if (isValidTab(nextTabIndex)) {
        tabSet = function () {
          setTab(nextTabIndex); // set to required tab as tab event was prevented
        };
      }
    }

    NgDialogFactory.yesNoDialog(title, 'Do you wish to save changes?',
      // process function
      function (/*value*/) {
        processData(prevTabIndex, tabSet);
      },
      // cancel function
      function () {
        // discard modificarions
        miscUtilFactory.call(restoreFunc);

        tabSet();
      }
    );
  }

  function deselectListTab ($event, prevTabIndex, nextTabIndex, workList, backupList, title) {

    var unmodified = workList.compare(backupList, function (o1, o2) {
      return (o1._id === o2._id);
    });

    if (!unmodified) {
      deselectObjectTab($event, prevTabIndex, nextTabIndex, title, function () {
        // discard modificarions
        workList.setList(backupList.slice(), storeFactory.APPLY_FILTER);
      });
    }
    return (!unmodified); // true if modified
  }
  
  function getTitle () {
    $scope.editDisabled = true;
    var title;
    if ($state.is($scope.newState)) {
      title = 'Create Canvass';
      $scope.editDisabled = false;
    } else if ($state.is($scope.viewState)) {
      title = 'View Canvass';
    } else if ($state.is($scope.editState)) {
      title = 'Update Canvass';
      $scope.editDisabled = false;
    } else {
      title = '';
    }
    return title;
  }

  function changeStateParam () {
    return {
      id: $scope.canvass._id
    };
  }

  function singleDelete() {
    var deleteList = [
      JSON.parse(JSON.stringify($scope.canvass))
    ];
    deleteList[0].election = $scope.election;

    canvassService.confirmDeleteCanvass($scope, deleteList,
      // on success
      function (/*response*/) {
        gotoDash();
      });
  }

  function getStateButton (state) {
    return canvassService.getStateButton($scope, state);
  }

  function showTab (tab) {
    var show = true;
    if ($state.is($scope.newState) || $state.is($scope.editState)) {
      if (tab === $scope.tabs.RESULT_TAB) {
        show = false; // no results in new/edit mode
      }
    }
    return show;
  }

  function processData (currentTabIdx, next) {

    if ($state.is($scope.newState) || $state.is($scope.editState)) {
      // depending on timing of responses from host, $scope.canvass may not be set, so get local copy
      var canvass = canvassFactory.getObj(RES.ACTIVE_CANVASS),
        action = ($state.is($scope.newState) ? RES.PROCESS_NEW : RES.PROCESS_UPDATE);

      switch (currentTabIdx) {
        case $scope.tabs.CANVASS_TAB:
          processCanvass(action, next);
          break;
        case $scope.tabs.SURVEY_TAB:
          if (!canvass.survey && (action === RES.PROCESS_UPDATE)) {
            // no previous survey so change to new mode
            action = RES.PROCESS_UPDATE_NEW;
          } else if (canvass.survey && (action === RES.PROCESS_NEW)) {
            // previous survey (created after adding question), so change to update mode
            action = RES.PROCESS_UPDATE;
          }
          processSurvey(action, next);
          break;
        case $scope.tabs.ADDRESS_TAB:
          // generate addreess list for host
          canvass.addresses = extractIds(addressFactory, RES.ASSIGNED_ADDR);
          processCanvass(RES.PROCESS_UPDATE, requestAssignments(next));
          break;
        case $scope.tabs.CANVASSER_TAB:
          // generate canvasser list for host
          canvass.canvassers = extractIds(userFactory, RES.ASSIGNED_CANVASSER);
          processCanvass(RES.PROCESS_UPDATE, requestAssignments(next));
          break;
        case $scope.tabs.ASSIGNMENT_TAB:
          processAllocations(RES.PROCESS_UPDATE, next);
          break;
      }
    }
  }

  function processForm () {
    if ($state.is($scope.newState) || $state.is($scope.editState)) {
      // depending on timing of responses from host, $scope.canvass may not be set, so get local copy
      var canvass = canvassFactory.getObj(RES.ACTIVE_CANVASS),
        action = ($state.is($scope.newState) ? RES.PROCESS_NEW : RES.PROCESS_UPDATE);

      switch ($scope.activeTab) {
        case $scope.tabs.CANVASS_TAB:
          processCanvass(action, nextTab);
          break;
        case $scope.tabs.SURVEY_TAB:
          if (!canvass.survey && (action === RES.PROCESS_UPDATE)) {
            // no previous survey so change to new mode
            action = RES.PROCESS_UPDATE_NEW;
          } else if (canvass.survey && (action === RES.PROCESS_NEW)) {
            // previous survey (created after adding question), so change to update mode
            action = RES.PROCESS_UPDATE;
          }
          processSurvey(action, nextTab);
          break;
        case $scope.tabs.ADDRESS_TAB:
          // generate addreess list for host
          canvass.addresses = extractIds(addressFactory, RES.ASSIGNED_ADDR);
          processCanvass(RES.PROCESS_UPDATE, requestAssignmentsNextTab);
          break;
        case $scope.tabs.CANVASSER_TAB:
          // generate canvasser list for host
          canvass.canvassers = extractIds(userFactory, RES.ASSIGNED_CANVASSER);
          processCanvass(RES.PROCESS_UPDATE, requestAssignmentsNextTab);
          break;
        case $scope.tabs.ASSIGNMENT_TAB:
          processAllocations(RES.PROCESS_UPDATE, gotoDash);
          break;
      }
    } else if ($state.is($scope.viewState)) {
      if ($scope.activeTab === $scope.lastTab) {
        $state.go($scope.dashState);
      } else {
        nextTab();
      }
    }
  }

  function init () {

    var resources = resourceFactory.createResources(getCanvassRspOptions());

    $scope.canvass = resources[RES.ACTIVE_CANVASS];
    $scope.backupCanvass = resources[RES.BACKUP_CANVASS];

    $scope.survey = resources[RES.ACTIVE_SURVEY];
    $scope.backupSurvey = resources[RES.BACKUP_SURVEY];

    $scope.election = resources[RES.ACTIVE_ELECTION];
  }

  function initItem(id) {
    if (!id) {
      init();
      initTab($scope.tabs.ALL_TABS);
    } else {
      $scope.canvass = canvassFactory.get('canvass', { id: id },
        // success function
        function (response) {
          initTab($scope.tabs.ALL_TABS);
          processCanvassRsp(response,
            (storeFactory.CREATE_INIT | storeFactory.APPLY_FILTER),
            requestAssignments);
        },
        // error function
        function (response) {
          // response is message
          NgDialogFactory.error(response, 'Unable to retrieve Canvass');
        }
      );
    }
  }

  function processCanvassRsp (response, flags, next) {
    // process a canvass response linking subdoc elements
    $scope.canvass = canvassFactory.readResponse(response,
      getCanvassRspOptions(flags, next, {
        linkAddressAndResult: true,
        linkQuestionAndResult: true
      }));
  }

  function getCanvassRspOptions (schema, flags, next, customArgs) {

    var args = resourceFactory.getStandardArgsObject(
        undefined, // no id, this obj will not be used
        'canvassFactory', 'canvass', schema, flags, next, customArgs),
      addrObjId,
      canvsrObjId,
      schemaLink;

    if (!miscUtilFactory.isEmpty(args.schema)) {
      schemaLink = {
        schema: args.schema,
        schemaId: args.schemaId
      };
      if (args.schema.name === CANVASSASSIGN_SCHEMA.SCHEMA.name) {
        // for canvass assignment processing so only want allocated addr/canvasser
        addrObjId = RES.ALLOCATED_ADDR;
        canvsrObjId = RES.ALLOCATED_CANVASSER;
      }
    } else {
      // for canvass processing
      addrObjId = [RES.ASSIGNED_ADDR, RES.BACKUP_ASSIGNED_ADDR, RES.ALLOCATED_ADDR];
      canvsrObjId = [RES.ASSIGNED_CANVASSER, RES.BACKUP_ASSIGNED_CANVASSER, RES.ALLOCATED_CANVASSER];
      schemaLink = {};
    }

    var addrOpts = getRspAddressOptions(addrObjId,
        CANVASSSCHEMA.SCHEMA.getSchemaLink(CANVASSSCHEMA.IDs.ADDRESSES),
        (args.flags | storeFactory.COPY_SET)),  // make copy of addresses
      canvsrOpts = getRspCanvasserOptions(canvsrObjId,
        CANVASSSCHEMA.SCHEMA.getSchemaLink(CANVASSSCHEMA.IDs.CANVASSERS),
        (args.flags | storeFactory.COPY_SET)),  // make copy of canvassers
      resltsOpts = getRspResultOptions(RES.CANVASS_RESULT,
        CANVASSSCHEMA.SCHEMA.getSchemaLink(CANVASSSCHEMA.IDs.RESULTS),
        (args.flags | storeFactory.COPY_SET)),   // make copy of results
      rspOptions = resourceFactory.getStandardArgsObject(
        [RES.ACTIVE_CANVASS,  RES.BACKUP_CANVASS],
        args.factory, args.resource,
        [ // storage arguments for specific sub sections of survey info
          // storage info for election
          getRspElectionOptions(
            RES.ACTIVE_ELECTION, // id of election object to save
            CANVASSSCHEMA.SCHEMA.getSchemaLink(CANVASSSCHEMA.IDs.ELECTION),
            args.flags),
          // storage info for survey
          getSurveyRspOptions(
            CANVASSSCHEMA.SCHEMA.getSchemaLink(CANVASSSCHEMA.IDs.SURVEY),
            args.flags),
          // storage info for addresses
          addrOpts,
          // storage info for canvassers
          canvsrOpts,
          // storage info for results
          resltsOpts
        ],
        schemaLink, args.flags, args.next, args.customArgs);

    angular.extend(rspOptions, {
      storage: RESOURCE_CONST.STORE_OBJ
    });

    // mark address & result objects for linking
    addrOpts[canvassFactory.ADDR_RES_LINKADDRESS] = true;
    resltsOpts[canvassFactory.ADDR_RES_LINKRESULT] = true;

    // mark question & result objects for linking
    resltsOpts[canvassFactory.QUES_RES_LINKRES] = true;
    // questions are in survey

    // mark address & canvasser objects for linking
    addrOpts[canvassAssignmentFactory.ADDR_CANVSR_ADDRESSLIST] = true;
    canvsrOpts[canvassAssignmentFactory.ADDR_CANVSR_CANVASSERLIST] = true;

    return rspOptions;
  }

  function getRspAddressOptions (objId, schema, flags, next, customArgs) {
    // storage info for addresses
    return getRspOptionsObject(objId, 'addressFactory', 'address', schema, flags, next, customArgs);
  }

  function getRspCanvasserOptions (objId, schema, flags, next, customArgs) {
    // storage info for canvassers
    return getRspOptionsObject(objId, 'userFactory', 'user', schema, flags, next, customArgs);
  }

  function getRspElectionOptions (objId, schema, flags, next, customArgs) {
    // storage info for canvassers
    return getRspOptionsObject(objId, 'electionFactory', 'election', schema, flags, next, customArgs);
  }

  function getRspResultOptions (objId, schema, flags, next) {
    // storage info for results, no need to decode embedded address/canvass/voter subdocs as not required
    var modelProps = CANVASSRES_SCHEMA.SCHEMA.getModelPropList({
        type: SCHEMA_CONST.FIELD_TYPES.OBJECTID,  // get list of properties of type OBJECTID
        id: function (id) {
          return (id !== CANVASSRES_SCHEMA.IDs.ID); // but not the canvass result id
        }
      }),
      subObj = [],
      read,
      prune;
    // create subObj array to just read the ids
    modelProps.forEach(function (mdlProp) {
      read = undefined;
      prune = undefined;
      if (mdlProp.factory) {
        var schema = $injector.get(mdlProp.factory).getSchema();
        if (schema) {
          read = [schema.ids.ID]; // only want id
          prune = [];
          for (var id in schema.ids) {
            if (schema.ids[id] !== schema.ids.ID) {
              prune.push(schema.ids[id]); // prune anything other than id
            }
          }
        }
      }
      subObj.push({
        processArg: RESOURCE_CONST.PROCESS_READ,  // argument only for use during read
        schema: CANVASSRES_SCHEMA.SCHEMA,
        schemaId: mdlProp.id,
        schemaReadIds: read,
        schemaPruneIds: prune
      });
    });

    var optObj = getRspOptionsObject(
      objId, 'canvassResultFactory', 'result',
      subObj, schema, flags, next, {
        getChartType: function (type) {
          /* chart.js pie, polarArea & doughnut charts may be displayed using
                        single data series (i.e. data = []), whereas chart.js radar, line &
                        bar require multiple data series (i.e. data = [[], []]) */
          switch (type) {
            case QUESTIONSCHEMA.TYPEIDs.QUESTION_YES_NO:
            case QUESTIONSCHEMA.TYPEIDs.QUESTION_YES_NO_MAYBE:
            case QUESTIONSCHEMA.TYPEIDs.QUESTION_CHOICE_SINGLESEL:
              return CHARTS.PIE;
            case QUESTIONSCHEMA.TYPEIDs.QUESTION_CHOICE_MULTISEL:
              return CHARTS.BAR;
            case QUESTIONSCHEMA.TYPEIDs.QUESTION_RANKING:
              return CHARTS.POLAR;
            default:
              return undefined;
          }
        }
      });
    return optObj;
  }

  function getRspOptionsObject(objId, factory, resource, subObj, schema, flags, next, customArgs) {

    return resourceFactory.getStandardArgsObject(objId, factory, resource, subObj, schema, flags, next, customArgs);
  }


  function getSurveyRspOptions (schema, flags, next, customArgs) {

    var args = resourceFactory.getStandardArgsObject(
        [RES.ACTIVE_SURVEY, RES.BACKUP_SURVEY],
        'surveyFactory', 'survey',
        // will set subObj here
        schema, flags, next, customArgs),
      subObj = {
        // storage arguments for specific sub sections of survey info
        objId: RES.SURVEY_QUESTIONS,
        schema: SURVEYSCHEMA.SCHEMA,
        schemaId: SURVEYSCHEMA.IDs.QUESTIONS,
        //type/path/storage/factory: can be retrieved using schema & schemaId
        flags: args.flags | storeFactory.COPY_SET  // make copy of questions
      };

    // mark question & result objects for linking
    subObj[canvassFactory.QUES_RES_LINKQUES] = true;

    return angular.extend(args, {
      subObj: subObj,
      storage: RESOURCE_CONST.STORE_OBJ
    });
  }



  function labeller () {
    return LABELS.classes[LABELS.index++ % LABELS.classes.length];
  }

  function processCanvassAllocationRsp (response, flags, next) {

    if (typeof flags !== 'number') {
      next = flags;
      flags = storeFactory.NOFLAG;
    }
    if (typeof next !== 'function') {
      next = undefined;
    }

    canvassAssignmentFactory.readResponse(response,
      getAssignmentRspOptions(flags, next));
  }

  function getAssignmentRspOptions (schema, flags, next) {

    var args = resourceFactory.getStandardArgsObject(
        undefined, // no objId as don't need to save the assignments response
        'canvassAssignmentFactory', 'assignment',
        // subObj will be set here
        schema, flags, next),
      commonArgs = {
        processArg: RESOURCE_CONST.PROCESS_READ,  // argument only for use during read
      },
      addrOpts = getRspAddressOptions(undefined /* not being saved */,
        CANVASSASSIGN_SCHEMA.SCHEMA.getSchemaLink(
          CANVASSASSIGN_SCHEMA.IDs.ADDRESSES
        ),
        (args.flags | storeFactory.COPY_SET)),  // make copy of addresses
      canvsrOpts = getRspCanvasserOptions(undefined /* not being saved */,
        CANVASSASSIGN_SCHEMA.SCHEMA.getSchemaLink(
          CANVASSASSIGN_SCHEMA.IDs.CANVASSER
        ),
        (args.flags | storeFactory.COPY_SET)),  // make copy of canvasser
      subObj = [
        // storage info for canvasser
        canvsrOpts,
        // storage info for addresses
        addrOpts,
        // storage info for canvass
        getCanvassRspOptions(
          CANVASSASSIGN_SCHEMA.SCHEMA.getSchemaLink(
            CANVASSASSIGN_SCHEMA.IDs.CANVASS
          ),
          args.flags)
      ];

    subObj.forEach(function (obj) {
      angular.extend(obj, commonArgs);
    });

    // mark address & canvasser objects for linking
    addrOpts[canvassAssignmentFactory.ADDR_CANVSR_LINKADDRESS] = true;
    canvsrOpts[canvassAssignmentFactory.ADDR_CANVSR_LINKCANVASSER] = true;

    return angular.extend(args, {
      subObj: subObj,
      linkAddressAndCanvasser: {
        labeller: labeller
      }
    }, commonArgs);
  }

  
  function requestAssignments (next) {
    // depending on timing of responses from host, $scope.canvass may not be set, so get local copy
    var canvass = canvassFactory.getObj(RES.ACTIVE_CANVASS);

    canvassAssignmentFactory.query('assignment', {canvass: canvass._id},
      // success function
      function (response) {
        // response from server contains result
        processCanvassAllocationRsp(response, next);
      },
      // error function
      function (response) {
        NgDialogFactory.error(response, 'Unable to retrieve canvass assignments');
      }
    );
  }

  function requestAssignmentsNextTab () {
    requestAssignments(nextTab);
  }


  function creationError(response) {
    NgDialogFactory.error(response, 'Creation Unsuccessful');
  }

  function updateError(response) {
    NgDialogFactory.error(response, 'Update Unsuccessful');
  }
  
  function getErrorFxn(action) {
    var errorFxn;
    if ((action === RES.PROCESS_NEW) || (action === RES.PROCESS_UPDATE_NEW)) {
      errorFxn = creationError;
    } else if (action === RES.PROCESS_UPDATE) {
      errorFxn = updateError;
    }
    return errorFxn;
  }
  
  function processCanvass (action, next) {
    // depending on timing of responses from host, $scope.canvass may not be set, so get local copy
    var canvass = canvassFactory.getObj(RES.ACTIVE_CANVASS),
      promise;

    con.log('processCanvass', canvass);
    
    if (action === RES.PROCESS_NEW) {
      promise = canvassFactory.save('canvass', canvass, true);
    } else if (action === RES.PROCESS_UPDATE) {
      var modified = isCanvassModified(canvass);

      con.log('updateCanvass', modified);

      if (modified) {   // object was modified
        promise = canvassFactory.update('canvass', {id: canvass._id}, canvass, true);
      } else {  // not modified so proceed to next
        miscUtilFactory.call(next);
      }
    }
    
    if (promise) {
      promise.then(
        // success function
        function (response) {
          processCanvassRsp(response,
            (storeFactory.CREATE_INIT | storeFactory.APPLY_FILTER),
            next);
        },
        // error function
        getErrorFxn(action)
      );
    }
  }
  
  function isCanvassModified (canvass, backupCanvass) {
    // depending on timing of responses from host, $scope.canvass may not be set, so get local copy
    if (!canvass) {
      canvass = canvassFactory.getObj(RES.ACTIVE_CANVASS);
    }
    if (!backupCanvass) {
      backupCanvass = canvassFactory.getObj(RES.BACKUP_CANVASS);
    }
    var modified = !angular.equals(backupCanvass, canvass);
    con.log('canvass modified', modified);
    return modified;
  }

  function processAllocations (action, next) {

    // depending on timing of responses from host, $scope.canvass may not be set, so get local copy
    var canvass = canvassFactory.getObj(RES.ACTIVE_CANVASS),
      canvassers = userFactory.getList(RES.ALLOCATED_CANVASSER),
      newAllocs = [],
      updates = [];

    canvassers.forEachInList(function (canvasser) {
      
      if (!canvasser.allocId) {
        if (canvasser.addresses && canvasser.addresses.length) {
          newAllocs.push({
            canvass: canvass._id,
            canvasser: canvasser._id,
            addresses: canvasser.addresses
          });
        }
      } else {
        // has existing allocation, so update it
        updates.push(
          canvassAssignmentFactory.update('assignment', {id: canvasser.allocId}, {
            addresses: canvasser.addresses
          }, true)
        );
      }
    });
    
    if (newAllocs.length) {
      canvassAssignmentFactory.saveMany('assignment', undefined, newAllocs,
        // success function
        function (response) {
          processCanvassAllocationRsp(response, next);
        },
        // error function
        creationError
      );
    }
    if (updates.length) {
      updates.forEach(function (promise) {
        promise.then(
          // success function
          function (response) {
            processCanvassAllocationRsp(response, next);
          },
          // error function
          updateError
        );
      });
    }
  }
  
  function areAllocationsModified () {

    var undoStack = storeFactory.getObj(RES.ALLOCATION_UNDOS),
      modified = false;
    if (undoStack) {
      modified = (undoStack.size > 0);
    }
    return (modified);
  }

  function extractIds (factory, listId) {

    var idArray = [],
      resList = factory.getList(listId);

    if (resList) {
      resList.list.forEach(function (entry) {
        idArray.push(entry._id);
      });
    }
    return idArray;
  }

  function processSurvey (action, next) {
    // depending on timing of responses from host, $scope.canvass may not be set, so get local copy
    var canvass = canvassFactory.getObj(RES.ACTIVE_CANVASS),
      survey = surveyFactory.getObj(RES.ACTIVE_SURVEY),
      promise;
    
    con.log('processSurvey', survey);

    if ((action === RES.PROCESS_NEW) || (action === RES.PROCESS_UPDATE_NEW)) {
      promise = surveyFactory.save('survey', survey, true);
    } else if (action === RES.PROCESS_UPDATE) {
      var modified = isSurveyModified(survey);

      con.log('updateSurvey', modified);

      if (modified) {   // object was modified
        promise = surveyFactory.update('survey', {id: survey._id}, survey, true);
      } else {  // not modified so proceed to next
        miscUtilFactory.call(next);
      }
    }

    if (promise) {
      promise.then(
        // success function
        function (response) {
          survey = surveyFactory.readResponse(response, getSurveyRspOptions());
          if (!canvass.survey) {
            // link survey to canvass (TODO should really be in the original request)
            canvass.survey = survey._id;
            processCanvass(RES.PROCESS_UPDATE, next);
          } else {  // have survey already so proceed to next
            miscUtilFactory.call(next);
          }
        },
        // error function
        getErrorFxn(action)
      );
    }
  }

  function isSurveyModified (survey, backupSurvey) {
    // depending on timing of responses from host, $scope.canvass may not be set, so get local copy
    if (!survey) {
      survey = surveyFactory.getObj(RES.ACTIVE_SURVEY);
    }
    if (!backupSurvey) {
      backupSurvey = surveyFactory.getObj(RES.BACKUP_SURVEY);
    }
    var modified = !angular.equals(backupSurvey, survey);

    con.log('survey modified', modified);

    return modified;
  }

  function gotoDash () {
    $state.go($scope.dashState);
  }

  function nextTab () {
    if ($scope.activeTab < $scope.lastTab) {
      gotoTab($scope.activeTab + 1);
    } else if ($scope.activeTab === $scope.lastTab) {
      deselectTab(null, $scope.tabs.DASH_TAB);
    }
  }

  function prevTab () {
    if ($scope.activeTab > $scope.firstTab) {
      gotoTab($scope.activeTab - 1);
    }
  }

  function isValidTab (tabnum) {
    return ((tabnum >= $scope.firstTab) && (tabnum <= $scope.lastTab));
  }

  /**
   * Initiase move to new tab, e.g. from onClick etc.
   * @param {number} tabnum Tab index to go to
   */
  function gotoTab (tabnum) {
    if (isValidTab(tabnum)) {
      $scope.activeTab = tabnum;
    }
  }

  /**
   * Set the tab, e.g. from software
   * @param {number} tabnum Tab index to go to
   */
  function setTab (tabnum) {
    if (isValidTab(tabnum)) {
      $scope.deactiveTab = tabnum;  // ready for next action
      $scope.activeTab = tabnum;
    }
  }

  /**
   * End a tab change
   * @param {number} tabnum Tab index to go to
   */
  function endTabChange (tabnum) {
    if (isValidTab(tabnum)) {
      $scope.deactiveTab = tabnum;  // ready for next action
    } else if (tabnum === $scope.tabs.DASH_TAB) {
      gotoDash();
    }
  }

  function showPager(pager) {
    var result = false;
    if (pager) {
      result = (pager.pages.length > 0);
    }
    return result;
  }

  function translatePage(pager, page) {
    if (page === 'last') {
      page = pager.totalPages;
    } else if (page === 'first') {
      page = 1;
    }
    return page;
  }

  function setPage(pager, page) {
    if (pager) {
      pager.setPage(translatePage(pager, page));
    }
  }

  function incPage(pager) {
    if (pager) {
      pager.incPage();
    }
  }
  
  function decPage(pager) {
    if (pager) {
      pager.decPage();
    }
  }
  
  function isFirstPage(pager) {
    return isActivePage(pager, 1);
  }
  
  function isLastPage(pager) {
    return isActivePage(pager, pager.totalPages);
  }

  function isActivePage(pager, page) {
    var result = false;
    if (pager) {
      result = (pager.currentPage === translatePage(pager, page));
    }
    return result;
  }

  function setPerPage(pagers, pages) {
    var list;
    if (Array.isArray(pagers)) {
      list = pagers;
    } else {
      list = [pagers];
    }
    list.forEach(function (pager) {
      pager.setPerPage(pages);
    });
  }
  
  function toggleItemSel (ctrl, entry) {
    if (ctrl && !$scope.editDisabled) {
      ctrl.selCount = miscUtilFactory.toggleSelection(entry, ctrl.selCount);
    }
  }
  
  function setItemSel (ctrl, set) {
    if (ctrl) {
      var cmd = (set.cmd ? set.cmd : set);
      ctrl.selCount = miscUtilFactory.setSelected(ctrl, cmd);
    }
  }

  function requestCanvasserRole (next) {
    $scope.canvasser = roleFactory.query('role', {level: ROLES.ROLE_CANVASSER},
      // success function
      function (response) {
        // response is actual data
        if (Array.isArray(response)) {
          $scope.canvasser = response[0];
        } else {
          $scope.canvasser = response;
        }
        miscUtilFactory.call(next);
      },
      // error function
      function (response) {
        // response is message
        NgDialogFactory.error(response, 'Unable to retrieve Roles');
      }
    );
  }

}



/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .controller('CanvassCanvassController', CanvassCanvassController);


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

CanvassCanvassController.$inject = ['$scope', 'canvassFactory', 'electionFactory', 'NgDialogFactory'];

function CanvassCanvassController($scope, canvassFactory, electionFactory, NgDialogFactory) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033

  // get list of elections selecting name field, _id field is always provided
  $scope.elections = electionFactory.query('election', {fields: 'name'},
    // success function
    function (response) {
      // response is actual data
      $scope.elections = response;
    },
    // error function
    function (response) {
      // response is message
      NgDialogFactory.error(response, 'Unable to retrieve Elections');
    }
  );
  

  /* function implementation
  -------------------------- */

  
}



/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .controller('CanvassSurveyController', CanvassSurveyController);


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

CanvassSurveyController.$inject = ['$scope', '$rootScope', '$state', '$filter', 'canvassFactory', 'electionFactory', 'surveyFactory', 'questionFactory', 'addressFactory', 'miscUtilFactory', 'NgDialogFactory', 'stateFactory', 'QUESACTION', 'RES', 'DECOR'];

function CanvassSurveyController($scope, $rootScope, $state, $filter, canvassFactory, electionFactory, surveyFactory, questionFactory, addressFactory, miscUtilFactory, NgDialogFactory, stateFactory, QUESACTION, RES, DECOR) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.toggleQuestionSel = toggleQuestionSel;
  $scope.questionDelete = questionDelete;
  $scope.questionSelClear = questionSelClear;
  $scope.questionSelAll = questionSelAll;
  $scope.openQuestion = openQuestion;
  $scope.getQuestionTypeName = questionFactory.getQuestionTypeName;
  $scope.showQuestionOptions = questionFactory.showQuestionOptions;
  $scope.onSurveyChange = onSurveyChange;
  $scope.quesButtons = [
    { txt: 'New', icon: DECOR.NEW.icon, tip: 'Create new',
      class: DECOR.DASH.class, act: QUESACTION.NEW },
    { txt: 'View', icon: DECOR.VIEW.icon, tip: 'View selected',
      class: DECOR.VIEW.class, act: QUESACTION.VIEW },
    { txt: 'Edit', icon: DECOR.EDIT.icon, tip: 'Edit selected',
      class: DECOR.EDIT.class, act: QUESACTION.EDIT },
    { txt: 'Delete', icon: DECOR.DEL.icon, tip: 'Delete selected',
      class: DECOR.DEL.class },
    { txt: 'Unselect', state: 'unsel', icon: DECOR.UNSEL.icon, tip: 'Unselect all',
      class: DECOR.UNSEL.class },
    { txt: 'Select', state: 'sel', icon: DECOR.SEL.icon, tip: 'Select all',
      class: DECOR.SEL.class }
  ];

  $scope.showQuesButton = showQuesButton;
  $scope.exeQuesButton = exeQuesButton;
  $scope.disableQuesButton = disableQuesButton;



  $scope.questions = questionFactory.getList(RES.SURVEY_QUESTIONS);

  
  /* function implementation
  -------------------------- */

  function toggleQuestionSel (entry) {
    $scope.selQuestionCnt = miscUtilFactory.toggleSelection(entry, $scope.selQuestionCnt);
  }

  function countQuestionSel () {
    $scope.selQuestionCnt = miscUtilFactory.countSelected($scope.questions);
  }

  function haveSurveyQuestions () {
    return ($scope.survey && $scope.questions.count);
  }

  function questionSelUnSel (action) {
    if (haveSurveyQuestions()) {
      $scope.selQuestionCnt = miscUtilFactory.setSelected($scope.questions, action);
    } else {
      $scope.selQuestionCnt = 0;
    }
  }

  function questionSelClear () {
    questionSelUnSel(miscUtilFactory.CLR_SEL);
  }

  function questionSelAll () {
    questionSelUnSel(miscUtilFactory.SET_SEL);
  }


  function questionDelete () {
    if (haveSurveyQuestions()) {
      var selectedList = miscUtilFactory.getSelectedList($scope.questions);
      confirmDeleteQuestion(selectedList);
    }
  }


  function confirmDeleteQuestion (deleteList) {

    NgDialogFactory.openAndHandle({
      template: 'canvasses/confirmdelete_question.html', scope: $scope,
      className: 'ngdialog-theme-default', controller: 'CanvassSurveyController',
      data: { list: deleteList}
    },
    // process function
    function (value) {
      // perform delete
      var delParams = {},
        idx,
        updatedSurvey = angular.copy($scope.survey);
      angular.forEach(value, function (entry) {
        delParams[entry._id] = true;

        idx = updatedSurvey.questions.findIndex(function (ques) {
          return (ques === entry._id);
        });
        if (idx >= 0) {
          updatedSurvey.questions.splice(idx, 1);
        }
      });

      questionFactory.delete('question', delParams,
        // success function
        function (/*response*/) {
          // update survey's list of questions
          surveyFactory.update('survey', {id: updatedSurvey._id}, updatedSurvey,
            // success function
            function (response) {
              surveyFactory.readResponse(response, $scope.getSurveyRspOptions());

              countQuestionSel();
            },
            // error function
            function (response) {
              // response is message
              NgDialogFactory.error(response, 'Unable to retrieve Survey');
            }
          );
        },
        // error function
        function (response) {
          NgDialogFactory.error(response, 'Delete Unsuccessful');
        }
      );
    });
  }
  
  
  function openQuestion (action) {
    var qdata;

    if (action === QUESACTION.NEW) {
      qdata = {};
    } else if ((action === QUESACTION.VIEW) || (action === QUESACTION.EDIT)) {
      
      qdata = miscUtilFactory.findSelected($scope.questions);
      if (qdata) {
        qdata = angular.copy(qdata);
        // change qdata.type to a question type object as expected by dialog
        qdata.type = questionFactory.getQuestionTypeObj(qdata.type);
        // set numoptions as that's not part of the model but needed by dialog
        qdata.numoptions = 0;
        if (qdata.type.showOptions && qdata.options) {
          qdata.numoptions = qdata.options.length;
        }
      }
    } 

    var dialog = NgDialogFactory.open({
      template: 'surveys/question.html', scope: $scope,
      className: 'ngdialog-theme-default', controller: 'QuestionController',
      data: { action: action, question: qdata },
      resolve: {
        questionTypes: function depFactory() {
          return questionFactory.getQuestionTypes();
        }
      }
    });

    dialog.closePromise.then(function (data) {
      if (!NgDialogFactory.isNgDialogCancel(data.value)) {

        // dialog returns question type object, only need the type value for the server
        data.value.question.type = data.value.question.type.type;

        if (data.value.action === QUESACTION.NEW) {
          questionFactory.save('question', data.value.question,
            // success function
            function (response) {
              if (!$scope.survey.questions) {
                $scope.survey.questions = [];
              }
              $scope.survey.questions.push(response._id);

              var surveyProc;
              if (!$scope.survey._id) {
                surveyProc = RES.PROCESS_UPDATE_NEW;
              } else {
                surveyProc = RES.PROCESS_UPDATE;
              }
              $scope.processSurvey(surveyProc, countQuestionSel);
            },
            // error function
            function (response) {
              NgDialogFactory.error(response, 'Creation Unsuccessful');
            }
          );
        } else if (data.value.action === QUESACTION.EDIT) {
          questionFactory.update('question', {id: data.value.question._id}, data.value.question,
            // success function
            function (response) {

              var idx = $scope.questions.findIndexInList(function (entry) {
                return (entry._id === response._id);
              });
              if (idx >= 0) {
                toggleQuestionSel(
                  $scope.questions.updateInList(idx,
                    questionFactory.readRspObject(response)));
              }

              if (!$scope.survey.questions) {
                $scope.survey.questions = [];
                $scope.survey.questions.push(response._id);
              }

              $scope.processSurvey(RES.PROCESS_UPDATE);
            },
            // error function
            function (response) {
              NgDialogFactory.error(response, 'Creation Unsuccessful');
            }
          );
        }
      }
    });

  }


  function showQuesButton (btn, form) {
    var show = false;
    switch (btn.txt) {
      case 'New':
        show = (!$scope.editDisabled && !form.$invalid);
        break;
      case 'View':
        show = ($scope.questions.count > 0);
        break;
      case 'Edit':
      case 'Delete':
      case 'Unselect':
      case 'Select':
        show = (!$scope.editDisabled && ($scope.questions.count > 0));
        break;
    }
    return show;
  }

  function exeQuesButton (btn) {
    switch (btn.txt) {
      case 'New':
      case 'View':
      case 'Edit':
        openQuestion(btn.act);
        break;
      case 'Delete':
        questionDelete();
        break;
      case 'Unselect':
        questionSelClear();
        break;
      case 'Select':
        questionSelAll();
        break;
    }
  }

  function disableQuesButton (btn, form) {
    var disable = false;
    switch (btn.txt) {
      case 'New':
        disable = !$scope.editDisabled && form.$invalid;
        break;
      case 'View':
      case 'Edit':
        disable = ($scope.selQuestionCnt !== 1);
        break;
      case 'Delete':
        disable = ($scope.selQuestionCnt < 1);
        break;
      case 'Unselect':
        disable = ($scope.selQuestionCnt === 0);
        break;
      case 'Select':
        disable = ($scope.selQuestionCnt === $scope.questions.count);
        break;
    }
    return disable;
  }





  function onSurveyChange () {
    /* save the updated survey to the store, as processSurvey in the parent
      controller doesn't see the changes to name & description.
      Something to do with scopes? */
    //    surveyFactory.setObj(RES.ACTIVE_SURVEY, $scope.survey);
  }
  
  
}



/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .directive('cnvtrcAddrWidget', function() {
    return {
      restrict: 'E',          // restrict the directive declaration style to element name
      scope: {                // new "isolate" scope
        'addrInfo': '=info',  // bidirectional binding
        'showBadge': '=badge',
        'debug': '='
      },
      templateUrl: 'canvasses/address.element.html'
    };
  })
  .controller('CanvassAddressController', CanvassAddressController);



/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

CanvassAddressController.$inject = ['$scope', '$state', '$stateParams', '$filter', 'addressFactory', 'NgDialogFactory', 'utilFactory', 'miscUtilFactory', 'controllerUtilFactory', 'pagerFactory', 'storeFactory', 'consoleService', 'resourceFactory', 'RES', 'RESOURCE_CONST', 'SCHEMA_CONST'];

function CanvassAddressController($scope, $state, $stateParams, $filter, addressFactory, NgDialogFactory, utilFactory, miscUtilFactory, controllerUtilFactory, pagerFactory, storeFactory, consoleService, resourceFactory, RES, RESOURCE_CONST, SCHEMA_CONST) {

  var con = consoleService.getLogger('CanvassAddressController');

  con.log('CanvassAddressController id', $stateParams.id);

  pagerFactory.addPerPageOptions($scope, 5, 5, 4, 1); // 4 opts, from 5 inc 5, dflt 10

  setupGroup(RES.ASSIGNED_ADDR, 'Assigned');
  setupGroup(RES.UNASSIGNED_ADDR, 'Unassigned');


  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.filterList = filterList;
  $scope.updateList = updateList;
  $scope.sortList = sortList;

  var anyNonBlankQuery = resourceFactory.buildMultiValModelPropQuery(
    // $or=field1=value1,field2=value2....
    RESOURCE_CONST.QUERY_OR,
    addressFactory.getModelPropList({
      type: SCHEMA_CONST.FIELD_TYPES.STRING,  // get list of properties of type STRING
    }),
    function () {
      return RESOURCE_CONST.QUERY_NBLANK;
    }
  );

  requestAddressCount();  // get database total address count

  
  /* function implementation
  -------------------------- */
  
  function setupGroup(id, label) {

    $scope[id] = addressFactory.newList(id, {
      title: label,
      flags: storeFactory.CREATE_INIT
    });
    
    var filter = RES.getFilterName(id);
    $scope[filter] = storeFactory.newObj(filter, newFilter, storeFactory.CREATE_INIT);

    var pager = RES.getPagerName(id);
    $scope[pager] = pagerFactory.newPager(pager, [], 1, $scope.perPage, 5);

    setFilter(id, $scope[filter]);
    addressFactory.setPager(id, $scope[pager]);
  }
  
  function newFilter (base) {
    // new filter no blanks
    return addressFactory.newFilter(base, { allowBlank: false });
  }

  function setFilter (id, filter) {
    // unassignedAddrFilterStr or assignedAddrFilterStr
    var filterStr = RES.getFilterStrName(id);
    if (!filter) {
      filter = newFilter();
    }
    $scope[filterStr] = filter.toString();

    return addressFactory.setFilter(id, filter);
  }

  function sortList (resList) {
    return resList.sort();
  }


  function filterList (resList, btn) {

    var action = btn.cmd;
    
    if (action === 'c') {       // clear filter
      setFilter(resList.id);
      if (resList.id === RES.UNASSIGNED_ADDR) {
        resList.setList([]);  // clear list of addresses
      }
      resList.applyFilter();
    } else if (action === 'a') {  // no filter, get all
      setFilter(resList.id);
      requestAddresses(resList, anyNonBlankQuery);  // request all addresses
    } else {  // set filter
      var filter = angular.copy(resList.filter.getFilterValue());

      var dialog = NgDialogFactory.open({ template: 'address/addressfilter.html', scope: $scope, className: 'ngdialog-theme-default', controller: 'AddressFilterController', 
        data: {action: resList.id, title: resList.title, filter: filter}});

      dialog.closePromise.then(function (data) {
        if (!NgDialogFactory.isNgDialogCancel(data.value)) {

          var filter = newFilter(data.value.filter);
          
          var resList = setFilter(data.value.action, filter);
          if (resList) {
            if (resList.id === RES.UNASSIGNED_ADDR) {
              // request filtered addresses from server
              requestAddresses(resList, filter);
            } else {
              resList.applyFilter();
            }
          }
        }
      });
    }

  }


  function requestAddresses (resList, filter) {
    
    addressFactory.getFilteredResource('address', resList, filter,
      // success function
      function (response) {
        if (!response.length) {
          NgDialogFactory.message('No addresses found', 'No addresses matched the specified criteria');
        }
        $scope.setItemSel(resList, miscUtilFactory.CLR_SEL);

        requestAddressCount();
      },
      // error function
      function (response) {
        NgDialogFactory.error(response, 'Unable to retrieve addresses');
      }
    ); // get database total address count
  }

  function requestAddressCount () {
    $scope.dbAddrCount = addressFactory.get('count', anyNonBlankQuery,
      // success function
      function (response) {
        $scope.dbAddrCount = response.count; // total count
      },
      // error function
      function (response) {
        NgDialogFactory.error(response, 'Unable to retrieve address count');
      }
    );
  }

  function updateList (fromList, toList) {

    controllerUtilFactory.moveListSelected(fromList, toList, function (item1, item2) {
      return (item1._id === item2._id);
    });
  }
  
}


/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .service('filterSortService', filterSortService);



/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

filterSortService.$inject = ['miscUtilFactory', 'DECOR'];

function filterSortService (miscUtilFactory, DECOR) {

  var all = 0x01,
    filter = 0x02,
    clear = 0x04;

  /*jshint validthis:true */
  this.ALL = all;
  this.FILTER = filter;
  this.CLEAR = clear;
  this.ALL_FILTER_CLEAR = all | filter | clear;
  this.FILTER_CLEAR = filter | clear;
  this.ALL_FILTER = all | filter;
  this.ALL_CLEAR = all | clear;

  this.getRequestButtons = function (name, btns) {
    var buttons = [
        { txt: 'All', cmd: 'a', icon: 'fa fa-list-alt fa-fw', tip: 'Request all ' + name,
          class: 'btn btn-primary' },
        { txt: 'Filter', cmd: 'f', icon: 'fa fa-filter fa-fw', tip: 'Filter ' + name,
          class: 'btn btn-info' },
        { txt: 'Clear', cmd: 'c', icon: 'fa fa-eraser fa-fw', tip: 'Clear '  + name + ' list',
          class: 'btn btn-warning' }
      ],
      reqButtons = [];

    for (var i = 0, mask = all; mask <= clear; mask <<= 1, ++i) {
      if ((btns & mask) !== 0) {
        reqButtons.push(buttons[i]);
      }
    }

    return reqButtons;
  };

  this.getSelectButtons = function () {
    return [
      { txt: 'All', cmd: miscUtilFactory.SET_SEL, icon: DECOR.SEL.icon, tip: 'Select all in list',
        class: DECOR.SEL.class },
      { txt: 'Clear', cmd: miscUtilFactory.CLR_SEL, icon: DECOR.UNSEL.icon, tip: 'Unselect all in list',
        class: DECOR.UNSEL.class },
      { txt: 'Invert', cmd: miscUtilFactory.TOGGLE_SEL, icon: 'fa fa-exchange fa-rotate-90 fa-fw', tip: 'Invert selection',
        class: 'btn btn-default' }
    ];
  };

  /* function implementation
  -------------------------- */

}






/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .controller('CanvassUnassignedAddressController', CanvassUnassignedAddressController);



/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

CanvassUnassignedAddressController.$inject = ['$scope', 'addressFactory', 'RES', 'filterSortService'];

function CanvassUnassignedAddressController($scope, addressFactory, RES, filterSortService) {

  $scope.list = addressFactory.getList(RES.UNASSIGNED_ADDR);
  $scope.sortOptions = $scope.list.sortOptions;
  $scope.pager = $scope.list.pager;
  $scope.reqButtons = filterSortService.getRequestButtons('unassigned addresses', filterSortService.ALL_FILTER_CLEAR);
  $scope.selButtons = filterSortService.getSelectButtons();

  /* function implementation
  -------------------------- */

}






/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .controller('CanvassAssignedAddressController', CanvassAssignedAddressController);



/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

CanvassAssignedAddressController.$inject = ['$scope', 'addressFactory', 'RES', 'filterSortService'];

function CanvassAssignedAddressController($scope, addressFactory, RES, filterSortService) {

  $scope.list = addressFactory.getList(RES.ASSIGNED_ADDR);
  $scope.sortOptions = $scope.list.sortOptions;
  $scope.pager = $scope.list.pager;
  $scope.reqButtons = filterSortService.getRequestButtons('assigned addresses', filterSortService.FILTER_CLEAR);
  $scope.selButtons = filterSortService.getSelectButtons();
  
  /* function implementation
  -------------------------- */

}






/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .controller('CanvassCanvasserController', CanvassCanvasserController);



/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

CanvassCanvasserController.$inject = ['$scope', '$state', '$filter', 'NgDialogFactory', 'miscUtilFactory', 'controllerUtilFactory', 'pagerFactory', 'storeFactory', 'RES', 'USERSCHEMA', 'SCHEMA_CONST', 'userFactory', 'canvassService'];

function CanvassCanvasserController($scope, $state, $filter, NgDialogFactory, miscUtilFactory, controllerUtilFactory, pagerFactory, storeFactory, RES, USERSCHEMA, SCHEMA_CONST, userFactory, canvassService) {

  $scope.sortOptions = userFactory.getSortOptions();
  
  pagerFactory.addPerPageOptions($scope, 5, 5, 4, 1); // 4 opts, from 5 inc 5, dflt 10

  setupGroup(RES.ASSIGNED_CANVASSER, 'Assigned');
  setupGroup(RES.UNASSIGNED_CANVASSER, 'Unassigned');


  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.filterList = filterList;
  $scope.updateList = updateList;
  $scope.sortList = sortList;

  // get canvasser role id, followed by unassigned canvassers
  $scope.requestCanvasserRole(requestUnassignedCanvassers);

  /* function implementation
  -------------------------- */
  
  function setupGroup(id, label) {
    $scope[id] = userFactory.newList(id, {
      title: label,
      flags: storeFactory.CREATE_INIT
    });
    
    var filter = RES.getFilterName(id);
    $scope[filter] = storeFactory.newObj(filter, newFilter, storeFactory.CREATE_INIT);

    var pager = RES.getPagerName(id);
    $scope[pager] = pagerFactory.newPager(pager, [], 1, $scope.perPage, 5);

    setFilter(id, $scope[filter]);
    userFactory.setPager(id, $scope[pager]);
  }

  function newFilter (base) {
    return canvassService.newCanvasserFilter(base, $scope.canvasser);

  }

  function setFilter (id , filter) {
    // unassignedCanvasserFilterStr or assignedCanvasserFilterStr
    var filterStr = RES.getFilterStrName(id);
    if (!filter) {
      filter = newFilter();
    }
    $scope[filterStr] = filter.toString();

    return userFactory.setFilter(id, filter);
  }

  function sortList (resList) {
    return resList.sort();
  }
  
  function filterList (resList, btn) {

    var action = btn.cmd;
    
    if (action === 'c') {       // clear filter
      setFilter(resList.id);
      if (resList.id === RES.UNASSIGNED_CANVASSER) {
        resList.setList([]);  // clear list of canvassers
      }
      resList.applyFilter();
    } else if (action === 'a') {  // no filter, get all
      setFilter(resList.id);
      requestCanvassers(resList, resList.filter);  // request all canvassers
      
    } else {  // set filter
      var filter = angular.copy(resList.filter.getFilterValue());

      NgDialogFactory.openAndHandle({
        template: 'people/personfilter.html', scope: $scope,
        className: 'ngdialog-theme-default', controller: 'PersonFilterController',
        data: {action: resList.id, title: resList.title, filter: filter}
      },
      // process function
      function (value) {

        var filter = newFilter(value.filter),
          resList = setFilter(value.action, filter);
        if (resList) {
          if (resList.id === RES.UNASSIGNED_CANVASSER) {
            // request filtered canvassers from server
            requestCanvassers(resList, filter);
          } else {
            resList.applyFilter();
          }
        }
      }
        // no cancel function
      );
    }

  }


  function requestUnassignedCanvassers () {
    var resList = userFactory.getList(RES.UNASSIGNED_CANVASSER);
    if (resList) {
      setFilter(RES.UNASSIGNED_CANVASSER);
      requestCanvassers(resList, resList.filter);
    }
  }

  function requestCanvassers (resList, filter) {
    
    userFactory.getFilteredResource('user', resList, filter,
                                    
      // success function
      function (response) {
        if (!response.length) {
          NgDialogFactory.message('No canvassers found', 'No canvassers matched the specified criteria');
        }
        $scope.setItemSel(resList, miscUtilFactory.CLR_SEL);
      },
      // error function
      function (response) {
        NgDialogFactory.error(response, 'Unable to retrieve canvassers');
      }
    );
  }

  function updateList (fromList, toList) {

    controllerUtilFactory.moveListSelected(fromList, toList, function (item1, item2) {
      return (item1._id === item2._id);
    });
  }
  
}


/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .controller('CanvassUnassignedCanvasserController', CanvassUnassignedCanvasserController);



/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

CanvassUnassignedCanvasserController.$inject = ['$scope', 'userFactory', 'RES', 'filterSortService'];

function CanvassUnassignedCanvasserController($scope, userFactory, RES, filterSortService) {

  $scope.list = userFactory.getList(RES.UNASSIGNED_CANVASSER);
  $scope.sortOptions = $scope.list.sortOptions;
  $scope.pager = $scope.list.pager;
  $scope.reqButtons = filterSortService.getRequestButtons('unassigned canvassers', filterSortService.ALL_FILTER_CLEAR);
  $scope.selButtons = filterSortService.getSelectButtons();
  
  /* function implementation
  -------------------------- */

}






/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .controller('CanvassAssignedCanvasserController', CanvassAssignedCanvasserController);



/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

CanvassAssignedCanvasserController.$inject = ['$scope', 'userFactory', 'RES', 'filterSortService'];

function CanvassAssignedCanvasserController($scope, userFactory, RES, filterSortService) {

  $scope.list = userFactory.getList(RES.ASSIGNED_CANVASSER);
  $scope.sortOptions = $scope.list.sortOptions;
  $scope.pager = $scope.list.pager;
  $scope.reqButtons = filterSortService.getRequestButtons('assigned canvassers', filterSortService.FILTER_CLEAR);
  $scope.selButtons = filterSortService.getSelectButtons();
  
  /* function implementation
  -------------------------- */

}






/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .constant('CANVASSASSIGN', (function () {
    return {
      ASSIGNMENTCHOICES: [{text: 'Yes', val: 'y'},
        {text: 'No', val: 'n'},
        {text: 'All', val: 'a'}
      ]
    };
  })())

  .controller('CanvassAssignmentController', CanvassAssignmentController);



/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

CanvassAssignmentController.$inject = ['$scope', '$rootScope', '$state', '$filter', 'canvassFactory', 'canvassAssignmentFactory', 'electionFactory', 'surveyFactory', 'addressFactory', 'NgDialogFactory', 'stateFactory', 'pagerFactory', 'storeFactory', 'miscUtilFactory', 'undoFactory', 'RES', 'ADDRSCHEMA', 'roleFactory', 'ROLES', 'userFactory', 'CANVASSASSIGN'];

function CanvassAssignmentController($scope, $rootScope, $state, $filter, canvassFactory, canvassAssignmentFactory, electionFactory, surveyFactory, addressFactory, NgDialogFactory, stateFactory, pagerFactory, storeFactory, miscUtilFactory, undoFactory, RES, ADDRSCHEMA, roleFactory, ROLES, userFactory, CANVASSASSIGN) {

  var factories = {},
    customFilters = {},
    addressAssignmentTests = makeAddressAssignmentTests(),
    canvasserAssignmentTests = makeCanvasserAssignmentTests(),
    undoStack = storeFactory.newObj(RES.ALLOCATION_UNDOS,
      undoFactory.newUndoStack, storeFactory.CREATE_INIT);

  pagerFactory.addPerPageOptions($scope, 5, 5, 4, 1); // 4 opts, from 5 inc 5, dflt 10

  setupGroup(RES.ALLOCATED_ADDR, addressFactory, 'Addresses',
    CANVASSASSIGN.ASSIGNMENTCHOICES, 'Assigned', false, addrFilterFunction);
  setupGroup(RES.ALLOCATED_CANVASSER, userFactory, 'Canvassers',
    CANVASSASSIGN.ASSIGNMENTCHOICES, 'Has Allocation', true, cnvsrFilterFunction);

  $scope.undoStack = undoStack;

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.filterList = filterList;
  $scope.updateList = updateList;
  $scope.sortList = sortList;
  $scope.undo = undo;

  // get canvasser role id
  $scope.requestCanvasserRole();

  
  /* function implementation
  -------------------------- */

  function setupGroup(id, factory, label, assignmentChoices, assignmentLabel, nameFields, customFilter) {

    factories[id] = factory;
    customFilters[factory.NAME] = customFilter;
    
    $scope[id] = factory.getList(id, storeFactory.CREATE_INIT);
    $scope[id].title = label;
    $scope[id].assignmentChoices = assignmentChoices;
    $scope[id].assignmentLabel = assignmentLabel;
    $scope[id].nameFields = nameFields;

    var filter = RES.getFilterName(id);
    $scope[filter] = storeFactory.newObj(filter, function () {
      return newFilter(factory);
    }, storeFactory.CREATE_INIT);

    var pager = RES.getPagerName(id);
    $scope[pager] = pagerFactory.newPager(pager, [], 1, $scope.perPage, 5);

    setFilter(id, $scope[filter]);
    factory.setPager(id, $scope[pager]);
  }

  function filterFunction (list, tests, filter) {
    var incTest,
      dfltFilter = angular.copy(filter);  // filter for use by default filter function
    if (filter && filter.assignment) {
      // remove assignment from default filter otherwise there'll be no moatches
      delete dfltFilter.assignment;

      incTest = tests[filter.assignment];
    }

    // list specific filter function
    var filterList = list.factory.getFilteredList(list, dfltFilter, incTest);
    list.filterList = filterList;
  }

  function addrHasAssignmentTest (addr) {
    // if canvasser set then has assignment
    return (addr.canvasser);
  }

  function addrHasNoAssignmentTest (addr) {
    return !addrHasAssignmentTest(addr);
  }

  function makeAddressAssignmentTests () {
    var choiceObj = {};
    CANVASSASSIGN.ASSIGNMENTCHOICES.forEach(function (choice) {
      switch (choice.val) {
        case 'y': // yes test
          choiceObj[choice.val] = addrHasAssignmentTest;
          break;
        case 'n': // no test
          choiceObj[choice.val] = addrHasNoAssignmentTest;
          break;
      }
    });
    return choiceObj;
  }

  function addrFilterFunction (list, filter) {
    // address specific filter function
    filterFunction(list, addressAssignmentTests, filter);
  }

  function canvasserHasAssignmentTest (canvasser) {
    // if addresses set then has assignment
    return (canvasser.addresses && canvasser.addresses.length);
  }

  function canvasserHasNoAssignmentTest (canvasser) {
    return !canvasserHasAssignmentTest(canvasser);
  }

  function makeCanvasserAssignmentTests () {
    var choiceObj = {};
    CANVASSASSIGN.ASSIGNMENTCHOICES.forEach(function (choice) {
      switch (choice.val) {
        case 'y': // yes test
          choiceObj[choice.val] = canvasserHasAssignmentTest;
          break;
        case 'n': // no test
          choiceObj[choice.val] = canvasserHasNoAssignmentTest;
          break;
      }
    });
    return choiceObj;
  }

  function cnvsrFilterFunction (list, filter) {
    // canvasser specific filter function
    filterFunction(list, canvasserAssignmentTests, filter);
  }

  /**
   * Create a new filter
   * @param   {object} factory Factory to create filter
   * @param   {object} data    Base object to create filter from
   * @returns {object} Filter
   */
  function newFilter (factory, data) {
    // new filter with custom function & no blanks
    var filter = factory.newFilter(data, customFilters[factory.NAME], { allowBlank: false });
    // add assignment specific fields
    if (data && data.assignment) {
      filter.addFilterValue('assignment', data.assignment);
    }
    return filter;
  }

            
  
  
  
  function setFilter (id , filter) {
    var factory = factories[id],
      // allocatedAddrFilterStr or allocatedCanvasserFilterStr
      filterStr = RES.getFilterStrName(id),
      filterStrPrefix,
      assignment;
    if (!filter) {
      filter = newFilter(factory);
    }
    assignment = filter.getFilterValue('assignment');
    if (assignment) {
      // set filter string prefix to assignment text
      var list = factory.getList(id);
      if (list) {
        list.assignmentChoices.forEach(function (choice) {
          if (choice.val === assignment) {
            filterStrPrefix = list.assignmentLabel + ': '+ choice.text;
          }
        });
      }
    }
    
    $scope[filterStr] = filter.toString(filterStrPrefix);

    // add canvasser restriction to filter
    if ((id === RES.ALLOCATED_CANVASSER) && $scope.canvasser) {
      filter.role = $scope.canvasser._id;
    }

    return factory.setFilter(id, filter);
  }

  function sortList (resList) {
    return resList.sort();
  }

  function filterList (resList, btn) {

    var action = btn.cmd;
    
    if (action === 'c') {       // clear filter
      setFilter(resList.id);
      resList.applyFilter();
    } else if (action === 'a') {  // no filter, get all
      var list = setFilter(resList.id);
      if (list) {
        resList.factory.getFilteredResource(resList.resource, resList, list.filter);
      }
    } else {  // set filter
      var filter = angular.copy(resList.filter.getFilterValue());

      var dialog = NgDialogFactory.open({ template: 'canvasses/assignmentfilter.html', scope: $scope, className: 'ngdialog-theme-default', controller: 'AssignmentFilterController', 
        data: {action: resList.id, 
          ctrl: { title: resList.title,
            assignmentChoices: resList.assignmentChoices,
            assignmentLabel: resList.assignmentLabel,
            nameFields: resList.nameFields},
          filter: filter}});

      dialog.closePromise.then(function (data) {
        if (!NgDialogFactory.isNgDialogCancel(data.value)) {

          var factory = factories[data.value.action],
            filter = newFilter(factory, data.value.filter);

          var resList = setFilter(data.value.action, filter);
          if (resList) {
            resList.applyFilter();
          }
        }
      });
    }
  }


  function updateList (action) {
    var addrList = miscUtilFactory.getSelectedList($scope.allocatedAddr),
      cnvsList = miscUtilFactory.getSelectedList($scope.allocatedCanvasser),
      aidx, cidx,
      canvasser, addr,
      clrSel;

    if (action.indexOf('alloc') >= 0) {
      clrSel = true;
      undoStack.startMultiStep();

      if (action === 'alloc') {
        for (aidx = 0; aidx < addrList.length; ++aidx) {
          addr = addrList[aidx];

          for (cidx = 0; cidx < cnvsList.length; ++cidx) {
            canvasser = cnvsList[cidx];

            if (canvasser._id !== addr.canvasser) {
              undoStack.addStep(
                unlinkAddress(addr)  // unlink addr from previous
              );

              undoStack.addStep(
                canvassAssignmentFactory.linkCanvasserToAddr(canvasser, addr, true)
              );
            }
          }
        }
      } else if (action === 'unalloc') {
        // unallocate all addresses allocated to selected canvassers
        cnvsList.forEach(function (unallocCnvsr) {
          undoStack.addStep(
            canvassAssignmentFactory.unlinkAddrListFromCanvasser(unallocCnvsr, $scope.allocatedAddr.slice(), true)
          );
        });
        // unallocate all selected addresses
        addrList.forEach(function (unallocAddr) {
          undoStack.addStep(
            unlinkAddress(unallocAddr)  // unlink addr from previous
          );
        });
      }

      undoStack.endMultiStep();
    } else if (action === 'show') {
      // TODO show allocations
    }


    if (clrSel) {
      $scope.setItemSel($scope.allocatedAddr, miscUtilFactory.CLR_SEL);
      $scope.setItemSel($scope.allocatedCanvasser, miscUtilFactory.CLR_SEL);
    }
  }

  function unlinkAddress (addr) {
    var undo;
    if (addr.canvasser) {
      var canvasser = $scope.allocatedCanvasser.findInList(function (element) {
        return (element._id === addr.canvasser);
      });
      if (canvasser) {
        undo = canvassAssignmentFactory.unlinkAddrFromCanvasser(canvasser, addr, true);
      }
    }
    return undo;
  }


  function undo () {
    undoStack.undo(1);
  }
}


/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .controller('CanvassAssignmentAddressController', CanvassAssignmentAddressController);



/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

CanvassAssignmentAddressController.$inject = ['$scope', 'addressFactory', 'RES', 'filterSortService'];

function CanvassAssignmentAddressController($scope, addressFactory, RES, filterSortService) {

  $scope.list = addressFactory.getList(RES.ALLOCATED_ADDR);
  $scope.sortOptions = $scope.list.sortOptions;
  $scope.pager = $scope.list.pager;
  $scope.showBadge = true; // enable badge display
  $scope.reqButtons = filterSortService.getRequestButtons('addresses', filterSortService.FILTER_CLEAR);
  $scope.selButtons = filterSortService.getSelectButtons();

  /* function implementation
  -------------------------- */

}


/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .controller('CanvassAssignmentCanvasserController', CanvassAssignmentCanvasserController);



/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

CanvassAssignmentCanvasserController.$inject = ['$scope', 'userFactory', 'RES', 'filterSortService'];

function CanvassAssignmentCanvasserController($scope, userFactory, RES, filterSortService) {

  $scope.list = userFactory.getList(RES.ALLOCATED_CANVASSER);
  $scope.sortOptions = $scope.list.sortOptions;
  $scope.pager = $scope.list.pager;
  $scope.showBadge = true; // enable badge display
  $scope.reqButtons = filterSortService.getRequestButtons('canvassers', filterSortService.FILTER_CLEAR);
  $scope.selButtons = filterSortService.getSelectButtons();
  $scope.addressCountStr = addressCountStr;

  /* function implementation
  -------------------------- */

  function addressCountStr (count) {
    var str;
    switch (count) {
      case 0:
        str = 'No addresses';
        break;
      case 1:
        str = count + ' address';
        break;
      default:
        str = count + ' addresses';
        break;
    }
    return str;
  }

}






/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .controller('CanvassResultController', CanvassResultController);



/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

CanvassResultController.$inject = ['$scope', '$rootScope', '$state', 'canvassFactory', 'electionFactory', 'surveyFactory', 'addressFactory', 'canvassResultFactory', 'questionFactory', 'NgDialogFactory', 'stateFactory', 'pagerFactory', 'storeFactory', 'miscUtilFactory', 'RES', 'ADDRSCHEMA', 'CANVASSRES_SCHEMA', 'roleFactory', 'ROLES', 'userFactory', 'CANVASSASSIGN', 'QUESTIONSCHEMA', 'CHARTS', 'SCHEMA_CONST', 'compareFactory', 'filterFactory'];

function CanvassResultController($scope, $rootScope, $state, canvassFactory, electionFactory, surveyFactory, addressFactory, canvassResultFactory, questionFactory, NgDialogFactory, stateFactory, pagerFactory, storeFactory, miscUtilFactory, RES, ADDRSCHEMA, CANVASSRES_SCHEMA, roleFactory, ROLES, userFactory, CANVASSASSIGN, QUESTIONSCHEMA, CHARTS, SCHEMA_CONST, compareFactory, filterFactory) {

  var factories = {},
    i,
    quickDetails = [
      { label: 'Not Available',
        id: CANVASSRES_SCHEMA.IDs.AVAILABLE
      },
      { label: 'Don\'t Canvass',
        id: CANVASSRES_SCHEMA.IDs.DONTCANVASS
      },
      { label: 'Try Again',
        id: CANVASSRES_SCHEMA.IDs.TRYAGAIN
      }
    ],
    supportProperty = CANVASSRES_SCHEMA.SCHEMA.getModelName(CANVASSRES_SCHEMA.IDs.SUPPORT);

  quickDetails.forEach(function (detail) {
    detail.property = CANVASSRES_SCHEMA.SCHEMA.getModelName(detail.id);
    detail.dfltValue = CANVASSRES_SCHEMA.SCHEMA.getDfltValue(detail.id);
  });

  pagerFactory.addPerPageOptions($scope, 5, 5, 4, 1); // 4 opts, from 5 inc 5, dflt 10

  setupGroup(RES.ALLOCATED_ADDR, addressFactory, 'Addresses',
    CANVASSASSIGN.ASSIGNMENTCHOICES, 'Assigned', false);
  setupGroup(RES.ALLOCATED_CANVASSER, userFactory, 'Canvassers',
    CANVASSASSIGN.ASSIGNMENTCHOICES, 'Has Allocation', true);

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.getQuestionTypeName = questionFactory.getQuestionTypeName;
  $scope.showPieChart = showPieChart;
  $scope.showBarChart = showBarChart;
  $scope.showPolarAreaChart = showPolarAreaChart;
  $scope.showChart = showChart;
  $scope.showResultDetail = showResultDetail;
  $scope.toPercent = toPercent;

  // generate quick response labels & data
  $scope.quickLabels = [];
  $scope.quickData = new Array(quickDetails.length);
  quickDetails.forEach(function (detail) {
    $scope.quickLabels.push(detail.label);
  });
  $scope.pieChartOptions = {
    legend: {
      display: true
    }
  };

  // generate support labels & data
  $scope.supportLabels = ['Unknown'];
  $scope.supportData = [0];
  for (i = CANVASSRES_SCHEMA.SUPPORT_MIN; i <= CANVASSRES_SCHEMA.SUPPORT_MAX; ++i) {
    $scope.supportLabels.push('Level ' + i.toString());
    $scope.supportData.push(0);
  }
  $scope.resultCount = 0;

  $scope.canvassLabels = ['Completed', 'Pending'];
  $scope.canvassComplete = $scope.canvassPending = makeCountPercent(0, 0);

  $scope.survey = surveyFactory.getObj(RES.ACTIVE_SURVEY);

  $scope.addresses = addressFactory.getList(RES.ALLOCATED_ADDR);
  $scope.addresses.addOnChange(canvassChartData);

  $scope.results = canvassResultFactory.getList(RES.CANVASS_RESULT);
  $scope.results.addOnChange(processsResults);

  $scope.questions = questionFactory.getList(RES.SURVEY_QUESTIONS);
  $scope.questions.addOnChange(processQuestions);



  /* function implementation
  -------------------------- */

  function canvassChartData(resList) {
    var completed = 0,
      pending = 0;
    resList.forEachInList(function (entry) {
      if (entry.canvassResult) {
        ++completed;
      } else {
        ++pending;
      }
    });
    $scope.canvassComplete = makeCountPercent(completed, resList.count);
    $scope.canvassPending = makeCountPercent(pending, resList.count);
  }

  function processsResults (resList) {

    /* TODO curently only support a single canvass result per address
       TODO preventing the multiple counting of results for an address should be handled on the server
    */

    var i,
      filteredList = canvassResultFactory.filterResultsLatestPerAddress(resList.slice());

    $scope.resultCount = filteredList.length;

    var quickData = new Array($scope.quickData.length),
      supportData = new Array($scope.supportData.length),
      quickCnt = 0,   // number of quick responses
      supportCnt = 0; // number of support responses
    quickData.fill(0);
    supportData.fill(0);

    filteredList.forEach(function (result) {
      // calc quick responses
      for (i = 0; i < quickDetails.length; ++i) {
        if (result[quickDetails[i].property] !== quickDetails[i].dfltValue) {
          // quick responses are mutually exclusive, so if one isn't its default value, thats it
          ++quickData[i];
          ++quickCnt;
          break;
        }
      }

      // calc support
      if (result[supportProperty] === CANVASSRES_SCHEMA.SUPPORT_UNKNOWN) {
        ++supportData[0];
      } else {
        i = result[supportProperty] - CANVASSRES_SCHEMA.SUPPORT_MIN + 1;
        if (i < supportData.length) {
          ++supportData[i];
          ++supportCnt;
        }
      }
    });

    $scope.quickLabelData = makeLabelData($scope.quickLabels, quickData, quickCnt);
    $scope.quickData = quickData;
    $scope.quickDataCnt = quickCnt;
    $scope.supportLabelData = makeLabelData($scope.supportLabels, supportData,
      function (index) {
        if (index === 0) {  // unknown
          return $scope.resultCount;
        } else {
          return supportCnt;
        }
      });
    $scope.supportData = supportData;
    $scope.supportDataCnt = supportCnt;
  }

  function makeLabelData (labels, values, total) {
    var ll = labels.length,
      labelData = new Array(ll),
      totalCnt;
    for (var i = 0; i < ll; ++i) {
      if (angular.isFunction(total)) {
        totalCnt = total(i);
      } else {
        totalCnt = total;
      }
      labelData[i] = {
        label: labels[i],
        data: makeCountPercent(values[i], totalCnt)
      };
    }
    return labelData;
  }

  function processQuestions (resList) {
    var val;
    resList.forEachInList(function (question) {
      question.chartType = chartCtrl(question);
      switch (question.chartType) {
        case CHARTS.PIE:
          question.chartOptions = {
            legend: {
              display: true
            }
          };
          break;
        case CHARTS.BAR:
        case CHARTS.HORZ_BAR:
          question.chartOptions = {
            legend: {
              display: false  // don't display as no series names
            },
            scales: {
              // horizontal bar
              xAxes: [{
                ticks: {
                  beginAtZero: true,
                  min: 0
                }
              }]
            }
          };
          break;
        case CHARTS.POLAR:
          val = ((question.resData.maxValue + 5) / 5).toFixed() * 5;
          question.chartOptions = {
            legend: {
              display: true
            },
            scale: {
              ticks: {
                beginAtZero: true,
                min: 0,
                max: val,
                stepSize: (val > 10 ? 10 : 5)
              }
            }
          };
          break;
        default:
          break;
      }
    });
  }

  function chartCtrl (question) {
    var chart;
    switch (question.type) {
      case QUESTIONSCHEMA.TYPEIDs.QUESTION_YES_NO:
      case QUESTIONSCHEMA.TYPEIDs.QUESTION_YES_NO_MAYBE:
      case QUESTIONSCHEMA.TYPEIDs.QUESTION_CHOICE_SINGLESEL:
        chart = CHARTS.PIE;
        break;
      case QUESTIONSCHEMA.TYPEIDs.QUESTION_CHOICE_MULTISEL:
        chart = CHARTS.BAR;
        break;
      case QUESTIONSCHEMA.TYPEIDs.QUESTION_RANKING:
        chart = CHARTS.POLAR;
        break;
      default:
        chart = undefined;
        break;
    }
    return chart;
  }

  function showChart (question) {
    return (chartCtrl(question) !== undefined);
  }

  function showPieChart (question) {
    return (chartCtrl(question) === CHARTS.PIE);
  }

  function showBarChart (question) {
    return (chartCtrl(question) === CHARTS.BAR);
  }

  function showPolarAreaChart (question) {
    return (chartCtrl(question) === CHARTS.POLAR);
  }


  function showResultDetail (question) {

    var dialog,
      i,
      seriesIdx,
      value,
      total = 0,    // total number of options selected
      resData = question.resData,
      data,
      details = []; // combined label & count info

    if (questionFactory.showQuestionOptions(question.type)) {
      // selection from options
      if (resData.series) {
        seriesIdx = resData.series.length - 1;
      } else {
        seriesIdx = -1;
      }
      if (seriesIdx >= 0) {
        data = resData.data[seriesIdx];
      } else {
        data = resData.data;
      }
      for (i = 0; i < resData.labels.length; ++i) {
        details.push({
          label: resData.labels[i],
          value: data[i] //value
        });
        total += data[i]  /*value*/;
      }
      details.forEach(function (detail) {
        detail.percent = toPercent(detail.value, total);
      });
    } else if (questionFactory.showTextInput(question.type)) {
      // text input
      details = resData.data;
    }

    dialog = NgDialogFactory.open({ template: 'canvasses/result.detail.html', scope: $scope, className: 'ngdialog-theme-default', controller: 'ResultDetailController',
      data: {
        question: question,
        chart: chartCtrl(question),
        details: details,
        respCnt: $scope.resultCount
      }});

    dialog.closePromise.then(function (data) {
      if (!NgDialogFactory.isNgDialogCancel(data.value)) {
        // noop
      }
    });
  }


  function toPercent (value, total, digits) {
    var percent;
    if (total === 0) {
      percent = 0;
    } else {
      percent = (value * 100) / total;
      if (!Number.isInteger(percent)) {
        if (!angular.isNumber(digits)) {
          digits = 1;  // to 1 digit by default
        }
        percent = percent.toFixed(digits);
      }
    }
    return percent;
  }

  function makeCountPercent (value, total, digits) {
    return {
      value: value,
      percent: toPercent(value, total, digits)
    };
  }


  function setupGroup(id, factory, label, assignmentChoices, assignmentLabel,  nameFields) {
    factories[id] = factory;

    $scope[id] = factory.getList(id, storeFactory.CREATE_INIT);
    $scope[id].title = label;
    $scope[id].assignmentChoices = assignmentChoices;
    $scope[id].assignmentLabel = assignmentLabel;
    $scope[id].nameFields = nameFields;
  }

}


/*jslint node: true */
'use strict';

angular.module('canvassTrac')

  .controller('ResultDetailController', ResultDetailController);


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

ResultDetailController.$inject = ['$scope', 'CHARTS'];

function ResultDetailController ($scope, CHARTS) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.showPieChart = showPieChart;
  $scope.showBarChart = showBarChart;
  $scope.showPolarAreaChart = showPolarAreaChart;
  $scope.indexToStyle = indexToStyle;

  $scope.question = $scope.ngDialogData.question;
  $scope.chart = $scope.ngDialogData.chart;
  $scope.details = $scope.ngDialogData.details;
  $scope.respCnt = $scope.ngDialogData.respCnt;

  /* function implementation
  -------------------------- */

  function showPieChart (chart) {
    return (chart === CHARTS.PIE);
  }

  function showBarChart (chart) {
    return (chart === CHARTS.BAR);
  }

  function showPolarAreaChart (chart) {
    return (chart === CHARTS.POLAR);
  }

  function indexToStyle (index) {
    // different colours for alternate entries
    return (((indexToStyle % 2) === 0) ? 'bg-info' : 'bg-primary');
  }

}


/*jslint node: true */
'use strict';

angular.module('canvassTrac')

  .controller('CanvassDeleteController', CanvassDeleteController);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

CanvassDeleteController.$inject = ['$scope', 'utilFactory'];

function CanvassDeleteController($scope, utilFactory) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.formatDate = utilFactory.formatDate;


  /* function implementation
  -------------------------- */

}


/*jslint node: true */
'use strict';

angular.module('canvassTrac')

  .controller('AssignmentFilterController', AssignmentFilterController);


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

AssignmentFilterController.$inject = ['$scope'];

function AssignmentFilterController($scope) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.initFilter = initFilter;

  $scope.title = $scope.ngDialogData.ctrl.title + ' Filter Options';
  $scope.assignmentChoices = $scope.ngDialogData.ctrl.assignmentChoices;
  $scope.assignmentLabel = $scope.ngDialogData.ctrl.assignmentLabel;
  $scope.nameFields = $scope.ngDialogData.ctrl.nameFields;
 
 
  
  /* function implementation
  -------------------------- */

  function initFilter() {
    $scope.ngDialogData.filter = {};
  }
  

}


/*jslint node: true */
'use strict';

angular.module('canvassTrac')

  .controller('CanvassTabNavController', CanvassTabNavController);



/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

CanvassTabNavController.$inject = ['$scope'];

function CanvassTabNavController($scope) {

  $scope.hasPrev = false;
  $scope.hasReset = true;
  $scope.prevTooltip = 'Previous tab';
  $scope.prevEnabled = function () {
    return this.canvassForm.$invalid;
  };
  $scope.nextText = 'Next';
  $scope.nextTooltip = 'Survey tab';
  $scope.nextEnabled = function () {
    return this.canvassForm.$invalid;
  };

  /* function implementation
  -------------------------- */

}






/*jslint node: true */
'use strict';

angular.module('canvassTrac')

  .controller('SurveyTabNavController', SurveyTabNavController);



/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

SurveyTabNavController.$inject = ['$scope'];

function SurveyTabNavController($scope) {

  $scope.hasPrev = true;
  $scope.hasReset = true;
  $scope.prevTooltip = 'Canvass tab';
  $scope.prevEnabled = function () {
    return this.surveyForm.$invalid;
  };
  $scope.nextText = 'Next';
  $scope.nextTooltip = 'Address tab';
  $scope.nextEnabled = function () {
    return this.surveyForm.$invalid;
  };

  /* function implementation
  -------------------------- */

}






/*jslint node: true */
'use strict';

angular.module('canvassTrac')

  .controller('AddressTabNavController', AddressTabNavController);



/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

AddressTabNavController.$inject = ['$scope'];

function AddressTabNavController($scope) {

  $scope.hasPrev = true;
  $scope.hasReset = false;
  $scope.prevTooltip = 'Survey tab';
  $scope.prevEnabled = function () {
    return this.addressForm.$invalid;
  };
  $scope.nextText = 'Next';
  $scope.nextTooltip = 'Canvasser tab';
  $scope.nextEnabled = function () {
    return this.addressForm.$invalid;
  };

  /* function implementation
  -------------------------- */

}






/*jslint node: true */
'use strict';

angular.module('canvassTrac')

  .controller('CanvassersTabNavController', CanvassersTabNavController);



/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

CanvassersTabNavController.$inject = ['$scope'];

function CanvassersTabNavController($scope) {

  $scope.hasPrev = true;
  $scope.hasReset = false;
  $scope.prevTooltip = 'Address tab';
  $scope.prevEnabled = function () {
    return this.canvasserForm.$invalid;
  };
  $scope.nextText = 'Next';
  $scope.nextTooltip = 'Assignment tab';
  $scope.nextEnabled = function () {
    return this.canvasserForm.$invalid;
  };

  /* function implementation
  -------------------------- */

}






/*jslint node: true */
'use strict';

angular.module('canvassTrac')

  .controller('AssignmentTabNavController', AssignmentTabNavController);



/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

AssignmentTabNavController.$inject = ['$scope'];

function AssignmentTabNavController($scope) {

  $scope.hasPrev = true;
  $scope.hasReset = false;
  $scope.prevTooltip = 'Canvasser tab';
  $scope.prevEnabled = function () {
    return this.assignmentForm.$invalid;
  };
  if ($scope.lastTab === $scope.tabs.ASSIGNMENT_TAB) {
    $scope.nextText = 'Done';
    $scope.nextTooltip = 'Go to dashboard';
  } else {
    $scope.nextText = 'Next';
    $scope.nextTooltip = 'Results tab';
  }
  $scope.nextEnabled = function () {
    return this.assignmentForm.$invalid;
  };

  /* function implementation
  -------------------------- */

}






/*jslint node: true */
'use strict';

angular.module('canvassTrac')

  .controller('ResultTabNavController', ResultTabNavController);



/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

ResultTabNavController.$inject = ['$scope'];

function ResultTabNavController($scope) {

  $scope.hasPrev = true;
  $scope.hasReset = false;
  $scope.prevTooltip = 'Assignment tab';
  $scope.prevEnabled = function () {
    return this.resultForm.$invalid;
  };
  $scope.nextText = 'Done';
  $scope.nextTooltip = 'Go to dashboard';
  $scope.nextEnabled = function () {
    return this.resultForm.$invalid;
  };

  /* function implementation
  -------------------------- */

}






/*jslint node: true */
'use strict';

angular.module('canvassTrac')

  .constant('QUESACTION', (function () {
    return {
      NEW: 'new',
      VIEW: 'view',
      EDIT: 'edit'
    };
  })())
  .controller('QuestionController', QuestionController);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

QuestionController.$inject = ['$scope', 'questionFactory', 'NgDialogFactory', 'questionTypes', 'QUESACTION', 'DEBUG'];

function QuestionController($scope, questionFactory, NgDialogFactory, questionTypes, QUESACTION, DEBUG) {

  if (DEBUG.devmode) {
    $scope.debug = DEBUG;
  }

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.getTitle = getTitle;
  $scope.getOkText = getOkText;
  $scope.selectedItemChanged = selectedItemChanged;
  $scope.questionTypes = questionTypes;
  $scope.isRequired = isRequired;

  if ($scope.ngDialogData.question.type) {
    selectedItemChanged('init', $scope.ngDialogData.question);
  } else {
    $scope.showNumOptions = false;
    $scope.showRankingNumber = false;
  }

  /* function implementation
  -------------------------- */

  function getTitle() {
    $scope.editDisabled = true;
    var title;
    if ($scope.ngDialogData.action === QUESACTION.NEW) {
      title = 'Create Question';
      $scope.editDisabled = false;
    } else if ($scope.ngDialogData.action === QUESACTION.VIEW) {
      title = 'View Question';
    } else if ($scope.ngDialogData.action === QUESACTION.EDIT) {
      title = 'Update Question';
      $scope.editDisabled = false;
    } else {
      title = '';
    }
    return title;
  }

  function getOkText() {
    var text;
    if ($scope.ngDialogData.action === QUESACTION.NEW) {
      text = 'Create';
    } else if ($scope.ngDialogData.action === QUESACTION.VIEW) {
      text = 'OK';
    } else if ($scope.ngDialogData.action === QUESACTION.EDIT) {
      text = 'Update';
    } else {
      text = '';
    }
    return text;
  }

  function selectedItemChanged(item, value) {
    if ((item === 'qtype') || (item === 'init')) {
      var typeId = value.type.type,
        showNumOpts = (questionFactory.showQuestionOptions(typeId) &&
          !questionFactory.hasPresetQuestionOptions(typeId)),
        showRankingNum = questionFactory.showRankingNumber(typeId);

      if (!showNumOpts) {
        value.numoptions = 0;
        value.rangeMin = value.rangeMax = 0;
        value.options = undefined;
      }
      
      $scope.showNumOptions = showNumOpts;
      $scope.showRankingNumber = showRankingNum;
    } else if (item === 'numopts') {
      if (value.options === undefined) {
        value.options = [];
      }
      value.rangeMin = 1;
      value.rangeMax = value.numoptions;
      if (value.options.length < value.numoptions) {
        for (var i = value.options.length; i < value.numoptions; ++i) {
          value.options.push('');
        }
      } else {
        value.options.splice(value.numoptions, (value.options.length - value.numoptions)) ;
      }
    }
  }

  function isRequired (index, options) {
    var required = $scope.showNumOptions; // default all options are required if displayed
    if (required && $scope.showRankingNumber) {
      // only first & last are required for ranking
      if ((index > 0) && (index < (options.length - 1))) {
        required = false;
      }
    }
    return required;
  }

}


/*jslint node: true */
'use strict';

angular.module('canvassTrac')

  .controller('AddressFilterController', AddressFilterController);


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

AddressFilterController.$inject = ['$scope'];

function AddressFilterController($scope) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.initFilter = initFilter;

  $scope.title = $scope.ngDialogData.title + ' Filter Options';

 
  
  /* function implementation
  -------------------------- */

  function initFilter() {
    $scope.ngDialogData.filter = {};
  }
  

}


/*jslint node: true */
'use strict';

angular.module('ct.clientCommon')

  .service('noticeService', noticeService);


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

noticeService.$inject = ['$state', 'noticeFactory', 'NgDialogFactory', 'controllerUtilFactory'];

function noticeService($state, noticeFactory, NgDialogFactory, controllerUtilFactory) {

  /*jshint validthis:true */
  this.confirmDeleteNotice = function (scope, deleteList, onSuccess, onFailure) {

    NgDialogFactory.openAndHandle({
      template: 'notices/confirmdelete_notice.html',
      scope: scope, className: 'ngdialog-theme-default',
      controller: 'NoticeDeleteController',
      data: { list: deleteList }
    },
    // process function
    function (value) {
      // perform delete
      var delParams = {};
      angular.forEach(value, function (entry) {
        delParams[entry._id] = true;
      });

      noticeFactory.delete('notice', delParams,
        // success function
        onSuccess,
        // error function
        function (response) {
          if (onFailure) {
            onFailure(response);
          } else {
            NgDialogFactory.error(response, 'Delete Unsuccessful');
          }
        }
      );
    });
  };

  /*jshint validthis:true */
  this.getStateButton = function (scope, state) {
    var button = controllerUtilFactory.getStateButton(state, scope),
      isDash = $state.is(scope.dashState);

    button.forEach(function (element) {
      if (element.state === scope.newState) {
        element.tip = 'Create new notice';
      } else if (element.state === scope.viewState) {
        if (isDash) {
          element.tip = 'View selected notice';
        } else {
          element.tip = 'View this notice';
        }
      } else if (element.state === scope.editState) {
        if (isDash) {
          element.tip = 'Edit selected notice';
        } else {
          element.tip = 'Edit this notice';
        }
      } else if (element.state === scope.delState) {
        if (isDash) {
          element.tip = 'Delete selected notice(s)';
        } else {
          element.tip = 'Delete this notice';
        }
      }
    });

    return button;
  };

}


/*jslint node: true */
'use strict';

angular.module('canvassTrac')

  .controller('NoticeDashController', NoticeDashController)

  .filter('filterDashNotice', ['UTIL', function (UTIL) {
    return function (input, title, op, level) {

      if (!op) {
        op = UTIL.OP_OR;
      }
      var out = [];
      if (title || angular.isNumber(level)) {
        // filter by title & level values
        var titleLwr;
        if (title) {
          titleLwr = title.toLowerCase();
        }
        angular.forEach(input, function (notice) {
          var titleOk,
            levelOk = (notice.level === level);

          if (title) {
            titleOk = (notice.title.toLowerCase().indexOf(titleLwr) >= 0);
          } else {
            titleOk = false;
          }
          if (((op === UTIL.OP_OR) && (titleOk || levelOk)) ||
              ((op === UTIL.OP_AND) && (titleOk && levelOk))) {
            out.push(notice);
          }
        });
      } else {
        out = input;
      }
      return out;
    };
  }]);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

NoticeDashController.$inject = ['$scope', '$rootScope', '$state', 'noticeFactory', 'noticeService', 'NgDialogFactory', 'stateFactory', 'utilFactory', 'controllerUtilFactory', 'miscUtilFactory', 'NOTICESCHEMA', 'STATES', 'UTIL', 'DEBUG'];

function NoticeDashController($scope, $rootScope, $state, noticeFactory, noticeService, NgDialogFactory, stateFactory, utilFactory, controllerUtilFactory, miscUtilFactory, NOTICESCHEMA, STATES, UTIL, DEBUG) {

  controllerUtilFactory.setScopeVars('NOTICE', $scope);

  if (DEBUG.devmode) {
    $scope.debug = DEBUG;
  }

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.filterOps = UTIL.OP_LIST;
  $scope.initFilter = initFilter;
  $scope.toggleSelection = toggleSelection;
  $scope.formatDate = utilFactory.formatDate;
  $scope.levelToName = levelToName;
  $scope.levelToIcon = levelToIcon;

  $scope.changeStateParam = changeStateParam;
  $scope.dashDelete = dashDelete;
  $scope.setSelect = setSelect;
  $scope.getStateButton = getStateButton;

  stateFactory.addInterface($scope);  // add stateFactory menthods to scope

  $scope.noticeTypes = NOTICESCHEMA.NOTICETYPEOBJS;

  initFilter();
  getNotices();

  /* function implementation
  -------------------------- */

  function initFilter() {
    $scope.filterText = undefined;
    $scope.filterLevel = undefined;
    $scope.filterOp = undefined;
    setSelect(0);
  }

  function toggleSelection (entry) {
    setNotice(
      controllerUtilFactory.toggleSelection($scope, entry, $scope.notices, initNotice)
    );
  }


  function getNotices () {
    $scope.notices = noticeFactory.query('notice',
      // success function
      function (response) {
        // response is actual data
        $scope.notices = response;

        initFilter();
      },
      // error function
      function (response) {
        // response is message
        NgDialogFactory.error(response, 'Unable to retrieve Notices');
      }
    );
  }

  function changeStateParam () {
    return {
      id: $scope.notice._id
    };
  }

  function setNotice (notice) {
    $scope.notice = notice;
  }

  function levelToName (level, prop) {
    return noticeFactory.getNoticeTypeObj(level, 'name');
  }

  function levelToIcon (level) {
    return noticeFactory.getNoticeTypeObj(level, 'icon');
  }

  function initNotice () {
    // include only required fields
    setNotice(NOTICESCHEMA.SCHEMA.getObject());
  }


  function dashDelete() {
    var selectedList = miscUtilFactory.getSelectedList($scope.notices);
    noticeService.confirmDeleteNotice($scope, selectedList,
      // success function
      function (/*response*/) {
        getNotices();
      });
  }

  function getStateButton (state) {
    return noticeService.getStateButton($scope, state);
  }

  function setSelect(sel) {
    return controllerUtilFactory.setSelect($scope, $scope.notices, sel);
  }


}


/*jslint node: true */
'use strict';

angular.module('canvassTrac')

  .directive('convertToNumber', function() {
    /* copied from https://code.angularjs.org/1.4.7/docs/api/ng/directive/select */
    return {
      require: 'ngModel',
      link: function(scope, element, attrs, ngModel) {
        ngModel.$parsers.push(function(val) {
          return parseInt(val, 10);
        });
        ngModel.$formatters.push(function(val) {
          return '' + val;
        });
      }
    };
  })

  .controller('NoticeController', NoticeController);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

NoticeController.$inject = ['$scope', '$rootScope', '$state', '$stateParams', 'noticeFactory', 'noticeService', 'NgDialogFactory', 'stateFactory', 'controllerUtilFactory', 'consoleService', 'STATES', 'NOTICESCHEMA', 'RESOURCE_CONST', 'DEBUG'];

function NoticeController($scope, $rootScope, $state, $stateParams, noticeFactory, noticeService, NgDialogFactory, stateFactory, controllerUtilFactory, consoleService, STATES, NOTICESCHEMA, RESOURCE_CONST, DEBUG) {

  var con = consoleService.getLogger('NoticeController');

  con.debug('NoticeController id', $stateParams.id);

  controllerUtilFactory.setScopeVars('NOTICE', $scope);

  if (DEBUG.devmode) {
    $scope.debug = DEBUG;
  }

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.getTitle = getTitle;
  $scope.processForm = processForm;

  $scope.changeStateParam = changeStateParam;
  $scope.singleDelete = singleDelete;
  $scope.getStateButton = getStateButton;

  $scope.gotoDash = gotoDash;

  stateFactory.addInterface($scope);  // add stateFactory menthods to scope

  $scope.noticeTypes = NOTICESCHEMA.NOTICETYPEOBJS;

  initItem($stateParams.id);

  /* function implementation
  -------------------------- */

  function getTitle() {
    $scope.editDisabled = true;

    var title;
    if ($state.is($scope.newState)) {
      title = 'Create Notice';
      $scope.editDisabled = false;
    } else if ($state.is($scope.viewState)) {
      title = 'View Notice';
    } else if ($state.is($scope.editState)) {
      title = 'Update Notice';
      $scope.editDisabled = false;
    } else {
      title = '';
    }
    return title;
  }


  function processForm() {
    if ($state.is($scope.newState)) {
      createNotice();
    } else if ($state.is($scope.viewState)) {
      gotoDash();
    } else if ($state.is($scope.editState)) {
      updateNotice();
    }
  }

  function initItem(id) {
    if (!id) {
      $scope.notice = NOTICESCHEMA.SCHEMA.getObject();
    } else {
      $scope.notice = noticeFactory.get('notice', {id: id},
        // success function
        function (response) {

          $scope.notice = noticeFactory.readResponse(response, {
            objId: undefined, // no objId means not stored, just returned
            factory: 'noticeFactory',
            storage: RESOURCE_CONST.STORE_OBJ
          });
        },
        // error function
        function (response) {
          // response is message
          NgDialogFactory.error(response, 'Unable to retrieve Notice');
        }
      );
    }
  }


  function createNotice() {

    con.log('createNotice', $scope.notice);

    noticeFactory.save('notice', $scope.notice,
      // success function
      function (/*response*/) {
        initItem();
        gotoDash();
      },
      // error function
      function (response) {
        // response is message
        NgDialogFactory.error(response, 'Creation Unsuccessful');
      }
    );
  }

  function updateNotice() {

    con.log('updateNotice', $scope.notice);

    noticeFactory.update('notice', {id: $scope.notice._id}, $scope.notice,
      // success function
      function (/*response*/) {
        initItem();
        gotoDash();
      },
      // error function
      function (response) {
        // response is message
        NgDialogFactory.error(response, 'Update Unsuccessful');
      }
    );
  }

  function changeStateParam () {
    return {
      id: $scope.notice._id
    };
  }

  function singleDelete() {

    var deleteList = [
      JSON.parse(JSON.stringify($scope.notice))
    ];

    noticeService.confirmDeleteNotice($scope, deleteList,
      // success function
      function (/*response*/) {
        gotoDash();
      });
  }

  function getStateButton (state) {
    return noticeService.getStateButton($scope, state);
  }

  function gotoDash() {
    $state.go($scope.dashState);
  }

}


/*jslint node: true */
'use strict';

angular.module('canvassTrac')

  .controller('NoticeDeleteController', NoticeDeleteController);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

NoticeDeleteController.$inject = ['$scope', 'utilFactory', 'noticeFactory'];

function NoticeDeleteController($scope, utilFactory, noticeFactory) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.formatDate = utilFactory.formatDate;
  $scope.levelToName = levelToName;
  $scope.levelToIcon = levelToIcon;


  /* function implementation
  -------------------------- */

  function levelToName (level, prop) {
    return noticeFactory.getNoticeTypeObj(level, 'name');
  }

  function levelToIcon (level) {
    return noticeFactory.getNoticeTypeObj(level, 'icon');
  }

}

