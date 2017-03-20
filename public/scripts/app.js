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
  window.__env.baseURL = "canvasstrac.herokuapp.com";
  window.__env.forceHttps = true;
  window.__env.httpPort = -1;
  window.__env.httpsPortOffset = 443;

  // management app settings
  window.__env.mapsApiKey = "";

  window.__env.DEV_MODE = false;
  window.__env.DEV_USER = "";
  window.__env.DEV_PASSWORD = "";

  window.__env.storeFactory = false;
  window.__env.localStorage = false;
  window.__env.surveyFactory = true;
  window.__env.canvassFactory = true;
  window.__env.electionFactory = true;
  window.__env.CanvassController = true;
  window.__env.CanvassActionController = true;
  window.__env.SurveyController = true;
  window.__env.navService = true;

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
  .constant('mapsApiKey', appenv.mapsApiKey)
  .constant('STATES', (function () {
    var cfgState = 'app.cfg',
      campaignState = 'app.campaign',
      makeStates = function (path, base, substate) {
        var state = path + '.' + base;
        if (substate) {
          state += '-' + substate;
        }
        return state;
      },
      makeSubStatePropName = function (state, substate) {
        return state + '_' + substate;
      },
      substates = [
        'NEW', 'VIEW', 'EDIT', 'NEW', 'DEL'
      ],
      stateConstant = {
        APP: 'app',
        ABOUTUS: 'app.aboutus',

        CONFIG: cfgState,
        CAMPAIGN: campaignState,

        LOGIN: 'app.login',
        CONTACTUS: 'app.contactus'
      },
      disabledStates = [
        // add entries to disbale a state and any substates
      ];

      /* make state values, e.g. VOTINGSYS, VOTINGSYS_NEW etc.
          add a disabled flag to disable the state and any substates */
      [ { property: 'VOTINGSYS', path: cfgState, base: 'votingsystem', disabled: true },
        { property: 'ROLES', path: cfgState, base: 'role', disabled: true },
        { property: 'USERS', path: cfgState, base: 'user' },
        { property: 'ELECTION', path: campaignState, base: 'election' },
        { property: 'CANDIDATE', path: campaignState, base: 'candidate' },
        { property: 'CANVASS', path: campaignState, base: 'canvass' }
      ].forEach(function (state) {
        stateConstant[state.property] = makeStates(state.path, state.base);
        substates.forEach(function (substate) {
          stateConstant[makeSubStatePropName(state.property, substate)] = makeStates(state.path, state.base, substate.toLowerCase());
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
      scope.dashState, $scope.newState, $scope.viewState etc. */
    stateConstant.SET_SCOPE_VARS = function (scope, base) {
      scope.dashState = stateConstant[base];
      substates.forEach(function (substate) {
        // make properties like 'newState' etc.
        var name = substate.toLowerCase();
        scope[name + 'State'] = stateConstant[makeSubStatePropName(base, substate)];
      });
    };

    return stateConstant;
  })())
  .constant('CONFIG', (function () {
    return {
      DEV_MODE: appenv.DEV_MODE,  // flag to enable dev mode hack/shortcuts etc.
      DEV_USER: appenv.DEV_USER,
      DEV_PASSWORD: appenv.DEV_PASSWORD
    };
  })())
  .constant('DBG', (function () {
    return {
      // debug enable flags
      storeFactory: appenv.storeFactory,
      localStorage: appenv.localStorage,
      surveyFactory: appenv.surveyFactory,
      canvassFactory: appenv.canvassFactory,
      electionFactory: appenv.electionFactory,
      CanvassController: appenv.CanvassController,
      CanvassActionController: appenv.CanvassActionController,
      SurveyController: appenv.SurveyController,
      navService: appenv.navService,

      isEnabled: function (mod) {
        return this[mod];
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
      UNASSIGNED_ADDR: 'unassignedAddr',          // addresses not assigned to canvass
      ASSIGNED_CANVASSER: 'assignedCanvasser',    // all canvassers assigned to canvass
      UNASSIGNED_CANVASSER: 'unassignedCanvasser',// canvassers not assigned to canvass
      ALLOCATED_ADDR: 'allocatedAddr',            // addresses allocated to canvassers in canvass
      ALLOCATED_CANVASSER: 'allocatedCanvasser',  // canvassers with allocated allocated addresses in canvass
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

NgDialogFactory.$inject = ['$rootScope', 'ngDialog'];

function NgDialogFactory ($rootScope, ngDialog) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    open: open,
    openAndHandle: openAndHandle,
    close: close,
    error: error,
    message: message,
    isNgDialogCancel: isNgDialogCancel,
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
   * @param {string}   id    id of dialog to close
   * @param {[[Type]]} value optional value to resolve the dialog promise with
   * @see https://github.com/likeastore/ngDialog#closeid-value
   */
  function close (id, value) {
    ngDialog.close (id,value);
  }
  
  /**
   * Display an error dialog
   * @param {object} response http response
   * @param {string} title    Dialog title
   */
  function error(response, title) {

    // response is message
    $rootScope.errortitle = title;
    $rootScope.errormessage = '';
    if (response) {
      if (response.data) {
        if (response.data.err) {
          $rootScope.errormessage = response.data.err.message;
        } else if (response.data.message) {
          $rootScope.errormessage = response.data.message;
        }
      } else if (response.status <= 0) {
        // status codes less than -1 are normalized to zero. -1 usually means the request was aborted
        $rootScope.errormessage = 'Request aborted';
      }
    }
    if (!$rootScope.errormessage) {
      $rootScope.errormessage = 'Unknown error';
    }
    ngDialog.openConfirm({ template: 'views/errormodal.html', scope: $rootScope });
  }

  /**
   * Display a message dialog
   * @param {string} title   Dialog title
   * @param {string} message message to display
   */
  function message(title, message) {

    // response is message
    $rootScope.title = title;
    $rootScope.message = message;
    ngDialog.openConfirm({ template: 'views/messagemodal.html', scope: $rootScope });
  }

  /**
   * Check if reason for an ngDialog close was cancel
   * @param   {string}  data ngDialog result
   * @returns {boolean} true if reasonwas cancel, false otherwise
   */
  function isNgDialogCancel (data) {
    return ((data === 'cancel') || (data === '$closeButton'));
  }
  

  
}

/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon', ['ct.config', 'ngResource', 'ngCordova'])

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
  .factory('localStorage', localStorage);


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

localStorage.$inject = ['$window'];

function localStorage ($window) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    store: store,
    remove: remove,
    get: get,
    storeObject: storeObject,
    getObject: getObject
  };

  return factory;

  /* function implementation
    -------------------------- */

  function store(key, value) {
    try{
      if($window.Storage){
        $window.localStorage[key] = value;
        return true;
      } else {
        return false;
      }
    } catch( error ){
      console.error( error, error.message );
    }
  }

  function remove(key, value) {
    try{
      if($window.Storage){
        delete $window.localStorage[key];
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
        return $window.localStorage[key] || defaultValue;
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
    isNullOrUndefined: isNullOrUndefined,
    toArray: toArray,
    findArrayIndex: findArrayIndex,
    arrayPolyfill: arrayPolyfill
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
  function isEmpty (object) {
    var empty = true;
    if (object) {
      if (Object.getOwnPropertyNames(object).length > 0) {
        empty = false;
      }
    } 
    return empty;
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
    var n = +start || 0;
    if (Math.abs(n) === Infinity) {
      n = 0;
    }

    var length = array.length >>> 0;

    for (var i = n; i < length; i++) {
      if (predicate(array[i], i, array)) {
        return i;
      }
    }
    return undefined;
  }

  
  /**
   * Provides polyfill implementations of some Array functions
   * @throws {TypeError} [[Description]]
   * @returns {[[Type]]} [[Description]]
   */
  function arrayPolyfill () {
    // only implement if no native implementation is available
    // from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray
    if (typeof Array.isArray === 'undefined') {
      Array.isArray = function (obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
      };
    }
    // from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
    if (!Array.prototype.find) {
      Array.prototype.find = function(predicate) {
        //'use strict';
        if (this === null) {
          throw new TypeError('Array.prototype.find called on null or undefined');
        }
        if (typeof predicate !== 'function') {
          throw new TypeError('predicate must be a function');
        }
        var list = Object(this);
        var length = list.length >>> 0;
        var thisArg = arguments[1];
        var value;

        for (var i = 0; i < length; i++) {
          value = list[i];
          if (predicate.call(thisArg, value, i, list)) {
            return value;
          }
        }
        return undefined;
      };
    }
    // from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex
    if (!Array.prototype.findIndex) {
      Array.prototype.findIndex = function(predicate) {
        //'use strict';
        if (this === null) {
          throw new TypeError('Array.prototype.findIndex called on null or undefined');
        }
        if (typeof predicate !== 'function') {
          throw new TypeError('predicate must be a function');
        }
        var list = Object(this);
        var length = list.length >>> 0;
        var thisArg = arguments[1];
        var value;

        for (var i = 0; i < length; i++) {
          value = list[i];
          if (predicate.call(thisArg, value, i, list)) {
            return i;
          }
        }
        return -1;
      };
    }
    // from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter
    if (!Array.prototype.filter) {
      Array.prototype.filter = function(fun/*, thisArg*/) {
        //'use strict';
        if (this === void 0 || this === null) {
          throw new TypeError();
        }

        var t = Object(this);
        var len = t.length >>> 0;
        if (typeof fun !== 'function') {
          throw new TypeError();
        }

        var res = [];
        var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
        for (var i = 0; i < len; i++) {
          if (i in t) {
            var val = t[i];

            // NOTE: Technically this should Object.defineProperty at
            //       the next index, as push can be affected by
            //       properties on Object.prototype and Array.prototype.
            //       But that method's new, and collisions should be
            //       rare, so use the more-compatible alternative.
            if (fun.call(thisArg, val, i, t)) {
              res.push(val);
            }
          }
        }

        return res;
      };
    }
    // from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/fill
    if (!Array.prototype.fill) {
      Array.prototype.fill = function(value) {

        // Steps 1-2.
        if (this === null) {
          throw new TypeError('this is null or not defined');
        }

        var O = Object(this);

        // Steps 3-5.
        var len = O.length >>> 0;

        // Steps 6-7.
        var start = arguments[1];
        var relativeStart = start >> 0;

        // Step 8.
        var k = relativeStart < 0 ?
          Math.max(len + relativeStart, 0) :
          Math.min(relativeStart, len);

        // Steps 9-10.
        var end = arguments[2];
        var relativeEnd = end === undefined ?
          len : end >> 0;

        // Step 11.
        var final = relativeEnd < 0 ?
          Math.max(len + relativeEnd, 0) :
          Math.min(relativeEnd, len);

        // Step 12.
        while (k < final) {
          O[k] = value;
          k++;
        }

        // Step 13.
        return O;
      };
    }
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
      PATH_PROP: 'path',        // property for path to field
      ID_PROP: 'id',            // property for id used to identify schema
      
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
  .provider('schema', ['$injector', 'SCHEMA_CONST', function ProvideSchema($injector, SCHEMA_CONST) {

    var modelPropProperties = ['id', 'modelName', 'modelPath', 'factory', 'dfltValue', 'type'];

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
        if (args.hasOwnProperty(prop)) {
          vals[prop] = args[prop];
        } else {
          vals[prop] = undefined;
        }
      });
      return $injector.instantiate(ModelProp, vals);
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

    
    function ModelProp (id, modelName, modelPath, factory, dfltValue, type) {
      this.id = id;
      this.modelName = modelName;
      this.modelPath = modelPath;
      this.factory = factory;
      this.dfltValue = dfltValue;
      this.type = type;
    }
    
    ModelProp.$inject = ['id', 'modelName', 'modelPath', 'factory', 'dfltValue', 'type'];


    ModelProp.prototype.matches = function (args) {
      var hits = 0,
        target = 0,
        tested = false;
      for (var prop in args) {
        tested = true;
        ++target;
        if (this.hasOwnProperty(prop)) {
          if (typeof args[prop] === 'function') {
            if (args[prop](this[prop])) {
              ++hits;
            }
          } else if (args[prop] === this[prop]) {
            ++hits;
          }
        }
      }
      return (tested && (hits === target));
    };


    function Schema (SCHEMA_CONST, RESOURCE_CONST, name, modelProps, ids, tag) {

      this.SCHEMA_CONST = SCHEMA_CONST;
      this.RESOURCE_CONST = RESOURCE_CONST;
      this.fields = [];
      this.name = name;
      this.modelProps = modelProps;
      this.ids = ids;
      this.tag = tag;
    }

    Schema.$inject = ['SCHEMA_CONST', 'RESOURCE_CONST', 'name', 'modelProps', 'ids', 'tag'];
    
    /**
     * Add a new entry to the Schema
     * @param   {string}       dialog  String used in dialogs
     * @param   {string}       display String displayed in dialogs
     * @param   {Array|object} model   Field(s) from dm model
     * @param   {string}       type    field type
     * @param   {Object}       args    Additional optinal arguments:
     *    @param   {Array|object} path    Field(s) providing path to field
     *    @param   {function}     cb      Function to call for each option
     * @returns {number}       index of added entry
     */
    Schema.prototype.addField = function (dialog, display, model, type, args) {
      var modelArray,
        pathArray,
        field;
      if (!Array.isArray(model)) {
        modelArray = [model];
      } else {
        modelArray = model;
      }
      if (args && args.path) {
        if (!Array.isArray(args.path)) {
          pathArray = [args.path];
        } else {
          pathArray = args.path;
        }
      }
      field = {
        dialog: dialog,
        display: display,
        model: modelArray,
        type: type,
        path: pathArray,
        id: this.tag
      };
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
     * @param   {Object}       args    Additional optinal arguments:
     *    @param   {Array|object} path    Field(s) providing path to field
     *    @param   {function}     cb      Function to call for each option
     * @returns {number}       index of added entry
     */
    Schema.prototype.addFieldFromModelProp = function (dialog, display, id, args) {
      var idArray,
        modelArray = [],
        type = this.SCHEMA_CONST.FIELD_TYPES.UNKNOWN,
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

        if (type === this.SCHEMA_CONST.FIELD_TYPES.UNKNOWN) {
          type = modelProp.type;  // first time init
        }
        if (modelProp.type !== type) {
          throw new Error('Type mismatch in multi-model');
        } else {
          if (!type) {
            throw new Error('Missing type');
          }
        }
      }, this);

      return this.addField(dialog, display, modelArray, type, args);
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
     * Callback the specified function for each field in the schema, providing the field details as the callback arguments
     * @param {function} callback Function to callback taking the arguments:
     *    @param {number}   schema field index
     *    @param {object}   schema field details @see Schema.addField for details
     */
    Schema.prototype.forEachField = function (callback) {
      if (typeof callback === 'function') {
        for (var i = 0; i < this.fields.length; ++i) {
          callback(i, this.fields[i]);
        }
      }
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
     * Return the default value for a field in this schema
     * @param {number} id       Schema id index, e.g. 'ADDRSCHEMA.IDs.ADDR1'
     * @param {string} property Name of property to return 
     * @return {object} modelProp object or property of modelProp object
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
      if (this.SCHEMA_CONST.FIELD_TYPES.IS_ARRAY(this.getType(id))) {
        type = this.RESOURCE_CONST.STORE_LIST;
      } else {
        type = this.RESOURCE_CONST.STORE_OBJ;
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
            if (from.hasOwnProperty(property)) {
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
                        console.log('factory.readRspObject', ridx, readArgs.objId[0]);
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

      console.log('readProperty', args, obj);

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
   * Compare dates
   * @param {boolean}  a   First date to compare
   * @param {boolean}  b   Second date to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareDate (a, b) {
    return basicCompare(a, b);
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

  .factory('filterFactory', filterFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

filterFactory.$inject = ['$filter', '$injector', 'consoleService', 'SCHEMA_CONST'];

function filterFactory ($filter, $injector, consoleService, SCHEMA_CONST) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    NAME: 'filterFactory',
    newResourceFilter: newResourceFilter,
    getFilteredList: getFilteredList
  };
  
//  return factory;

  /* function implementation
    -------------------------- */

  /**
   * Create a new ResourceFilter object
   * @param   {object} schema Schema object for which filter will be used
   * @param   {object} base   Base object to filter by
   * @returns {object} new ResourceFilter object
   */
  function newResourceFilter (schema, base) {
    return $injector.instantiate(ResourceFilter, {schema: schema, base: base});
  }

  /**
   * Generate a filtered list
   * @param {string}   filterName Name of filter to apply
   * @param {object}   reslist    ResourceList object to filter
   * @param {object}   filter     filter to apply
   * @param {function} xtraFilter Function to provide additional filtering
   * @returns {Array}    filtered list
   */
  function getFilteredList (filterName, reslist, filter, xtraFilter) {
    var output = $filter(filterName)(reslist.list, reslist.filter.schema, filter);
    if (output && xtraFilter) {
      var input = output;
      output = [];
      input.forEach(function (element) {
        if (xtraFilter(element)) {
          output.push(element);
        }
      });
    }
    return output;
  }

  /**
   * Filter for a ResourceList object
   * @param   {object} schema Schema object for which filter will be used
   * @param   {object} base   Base object to filter by
   */
  function ResourceFilter (SCHEMA_CONST, schema, base) {
    this.schema = schema; // keep a ref to field array
    this.filterBy = {};

    if (base) {
      // filter utilises dialog fields
      var newfilterBy = {};
      this.schema.forEachField(function (idx, fieldProp) {
        var filterVal = base[fieldProp[SCHEMA_CONST.DIALOG_PROP]];
        if (filterVal) {
          newfilterBy[fieldProp[SCHEMA_CONST.DIALOG_PROP]] = filterVal;
        }
      });
      this.filterBy = newfilterBy;
    }
  }

  ResourceFilter.$inject = ['SCHEMA_CONST', 'schema', 'base'];

  /**
   * toString method for a filter for a ResourceList object
   * @param   {string} prefix Prefix dtring
   * @returns {string} string representation
   */
  ResourceFilter.prototype.toString = function (prefix) {
    var str,
      filterBy = this.filterBy;
    if (!prefix) {
      str = '';
    } else {
      str = prefix;
    }
    this.schema.forEachField(function (idx, fieldProp) {
      var filterVal = filterBy[fieldProp[SCHEMA_CONST.DIALOG_PROP]];
      if (filterVal) {
        if (str.length > 0) {
          str += '\n';
        }
        str += fieldProp[SCHEMA_CONST.MODEL_PROP] + ': ' + filterVal;
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

  .constant('RESOURCE_CONST', (function () {
    var model = ['path', 'type', 'storage', 'factory'],   // related to ModelProp
      schemaModel = ['schema', 'schemaId'].concat(model), // related to Schema & ModelProp
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
      STD_ARGS: stdArgs
    };
  })())

  .factory('resourceFactory', resourceFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

resourceFactory.$inject = ['$resource', '$filter', '$injector', 'baseURL', 'storeFactory', 'miscUtilFactory', 'pagerFactory', 'compareFactory',
  'consoleService', 'SCHEMA_CONST', 'RESOURCE_CONST'];

function resourceFactory ($resource, $filter, $injector, baseURL, storeFactory, miscUtilFactory, pagerFactory, compareFactory,
  consoleService, SCHEMA_CONST, RESOURCE_CONST) {

  // jic no native implementation is available
  miscUtilFactory.arrayPolyfill();

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    NAME: 'resourceFactory',
    getResources: getResources,
    getCount: getCount,
    createResources: createResources,
    getStoreResource: getStoreResource,
    storeServerRsp: storeServerRsp,
    storeSubDoc: storeSubDoc,
    standardiseArgs: standardiseArgs,
    getStandardArgsObject: getStandardArgsObject,
    checkStandardArgsObjectArgs: checkStandardArgsObjectArgs,
    findInStandardArgs: findInStandardArgs,
    findAllInStandardArgs: findAllInStandardArgs,
    addResourcesToArgs: addResourcesToArgs,
    standardiseModelArgs: standardiseModelArgs,
    getObjectInfo: getObjectInfo,
    removeSchemaPathTypeArgs: removeSchemaPathTypeArgs,
    copyBasicStorageArgs: copyBasicStorageArgs,
    removeBasicStorageArgs: removeBasicStorageArgs,
    getServerRsp: getServerRsp,
    
    registerStandardFactory: registerStandardFactory,
    
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
    buildQuery: buildQuery
  },
  standardFactories = {},
  modelArgsMap = {};

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


  // need to return factory as end so that object prototype functions are added
//  return factory;

  /* function implementation
    -------------------------- */

  /**
   * Get basic REST resource 
   * @param   {string} url url relative to baseUrl
   * @returns {object} REST resource
   */
  function getResources (url) {
    /* https://docs.angularjs.org/api/ngResource/service/$resource
      default action of resource class:
        { 'get':    {method:'GET'},
          'save':   {method:'POST'},
          'query':  {method:'GET', isArray:true},
          'remove': {method:'DELETE'},
          'delete': {method:'DELETE'} };

      add custom update method
    */
    return $resource(baseURL + url + '/:id', {id:'@id'}, {'update': {method: 'PUT'}});
  }

  /**
   * Get basic count resource
   * @param   {string} url url relative to baseUrl
   * @returns {object} REST resource
   */
  function getCount (url) {
    /* https://docs.angularjs.org/api/ngResource/service/$resource
      default action of resource class:
        { 'get':    {method:'GET'},
          'save':   {method:'POST'},
          'query':  {method:'GET', isArray:true},
          'remove': {method:'DELETE'},
          'delete': {method:'DELETE'} };
    */
    return $resource(baseURL + url + '/count', null, null);
  }

  /**
   * Registger a standard factory
   * @param   {string}   name         Name of the new factory
   * @param   {object}   args         Optional srguments:
   * @param   {function} storeId      Function to generate store ids for objects created by the factory
   * @param   {object}   schema       Schema associated with the factory
   * @param   {object}   addInterface Object ro add standard factory interface to
   * @returns {object}   new factory 
   */
  function registerStandardFactory (name, args) {
    var factory = standardFactories[name];
    if (!factory) {
      factory = $injector.instantiate(StandardFactory, {
        name: name,
        storeId: args.storeId,
        schema: args.schema
      });
      standardFactories[name] = factory;

      if (args.addInterface) {
        for (var prop in Object.getPrototypeOf(factory)) {
          args.addInterface[prop] = factory[prop].bind(factory);
        }
      }
    }
    return factory;
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
              flags: storeFactory.CREATE_INIT
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
   * Process a populated sub document array, by copying the data to a new factory object and 
   * transforming the original to ObjectIds.
   * @param {Array}         array   Populated array received from host
   * @param {Array|string}  ids     Factory id/array of ids to copy data to
   * @param {object}        factory Factory to use to generate new factory objects
   * @param {number}        flags   storefactory flags
   */
  function storeSubDoc(response, args, parent) {

    if (!RESOURCE_CONST.PROCESS_FOR_STORE(args.processArg)) {
      // arg only processed during read, so ignore
      return undefined;
    } // else process for store

    var stdArgs = standardiseArgs(args, parent),
      factory = stdArgs.factory,
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
          if (resp.toString().indexOf('ResourceList') === 0) {
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
   * @param {object}       args     process arguments object with following properties:
   * @see storeServerRsp()
   * @return {object}       arguments object
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
   * @param {string|array} objId  Id(s) to use for storage
   * @param {string} factory      Factory name
   * @param {array} subObj        Sub-objects
   * @param {object} schema       Schema object
   * @param {number} flags        storeFactory flags
   * @param {function} next       Function to call following completion
   * @param {object} custom       Custom properties
   * @returns {object} Standard args object
   */
  function getStandardArgsObject (objId, factory, subObj, schema, flags, next, custom) {
    var args = checkStandardArgsObjectArgs(factory, subObj, schema, flags, next, custom);
    return {
      objId: objId,
      factory: args.factory,
      schema: args.schema.schema,
      schemaId: args.schema.schemaId,
      //type/path/storage/factory: can be retrieved using schema & schemaId
      subObj: args.subObj,
      flags: args.flags,
      next: args.next,
      customArgs: args.custom
    };
  }

  /**
   * Check arguemnts for getRspOptionsObject() making sure args are correctly positioned
   * @param {string} factory      Factory name
   * @param {array} subObj        Sub-objects
   * @param {object} schema       Schema object
   * @param {number} flags        storeFactory flags
   * @param {function} next       Function to call following completion
   * @param {object} custom       Custom properties
   * @returns {object} args object
   */
  function checkStandardArgsObjectArgs(factory, subObj, schema, flags, next, custom) {
    if (!angular.isString(factory)) {
      custom = next;
      next = flags;
      flags = schema;
      schema = subObj;
      subObj = factory;
      factory = undefined;
    }
    if (!angular.isArray(subObj)) {
      custom = next;
      next = flags;
      flags = schema;
      schema = subObj;
      subObj = undefined;
    }
    if (!angular.isObject(schema)) {
      custom = next;
      next = flags;
      flags = schema;
      schema = {};
    }
    if (!angular.isNumber(flags)) {
      custom = next;
      next = flags;
      flags = storeFactory.NOFLAG;
    }
    if (!angular.isFunction(next)) {
      custom = next;
      next = undefined;
    }
    return {
      factory: factory, schema: schema, subObj: subObj,
      flags: flags, next: next, custom: custom
    };
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

  /**
   * Create a new ResourceList object
   * @param {string} storeId Id string to use in storeFactory
   * @param {object} args    Argument object with the following properties:
   *   {string} id                          Id of list
   *   {string} title                       Title of list
   *   {Array}  list                        base list to use
   *   {number} [flags=storeFactory.NOFLAG] storeFactory flags
   *   {string} factory                     name of factory
   * @returns {object} ResourceList object
   */
  function newResourceList (storeId, args) {
    // jic no native implementation is available
    miscUtilFactory.arrayPolyfill();
    
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
   * @param   {object}   sortOptions     List of possible sort option
   * @param   {object}   sortByValue     Key to sort by
   * @returns {Array}    sorted list
   */
  function sortResourceList (resList, getSortFunction, sortOptions, sortByValue) {
    var sortList,
        sortFxn;
    
    if (resList && resList.factory) {
      if (!getSortFunction) {
        if (resList.factory) {
          getSortFunction = resList.factory.getSortFunction;
        }
      }
      if (!sortOptions) {
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

          if (resList.pager) {
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
   * Generate a query object
   * @param {function}  forEachSchemaField  Schema field callback function 
   * @param {object}    filter              object to filter by
   * @returns {object} query object
   */
  function buildQuery(forEachSchemaField, filter) {
    var query = {};
    if (filter) {
      // using the dialog fields to build an object based on the model fields
      forEachSchemaField(function (idx, fieldProp) {
        var filterVal = filter[fieldProp[SCHEMA_CONST.DIALOG_PROP]];
        if (filterVal) {
          var field = '',
            models = fieldProp[SCHEMA_CONST.MODEL_PROP];
          for (var i = 0; i < models.length; ++i) {
            if (i > 0) {
              field += ' ';
            }
            field += models[i];
          }
          query[field] = filterVal;
        }
      });
    }
    return query;
  }



  /**
   * StandardFactory object
   * @throws {TypeError} on incorrect argument type
   * @param {string}   name    Name of factory
   * @param {function} storeId Function to make store ids for objects created by the factory
   * @param {object}   schema  Schema associated with this factory
   */
  function StandardFactory (storeFactory, name, storeId, schema) {
    this.name = name;
    this.storeId = storeId;
    if (typeof storeId !== 'function') {
      throw new TypeError('Incorrect argument type: storeId');
    }
    this.schema = schema;
  }
  
  StandardFactory.$inject = ['storeFactory', 'name', 'storeId', 'schema'];
  
  /**
   * Get the factory schema
   * @param {object} factory schema
   */
  StandardFactory.prototype.getSchema = function () {
    return this.schema;
  };

  /**
   * Create a new object
   * @param {string} id     Factory id of new object
   * @param {number} flags  storefactory flags
   */
  StandardFactory.prototype.newObj = function (id, flags) {
    return storeFactory.newObj(this.storeId(id), this.schema.getObject(), flags);
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
    return storeFactory.duplicateObj(this.storeId(id), this.storeId(srcId), flags, presetCb);
  };
  
  /**
   * Delete an object
   * @param {string} id     Factory id of object to delete
   * @param {number} flags  storefactory flags
   */
  StandardFactory.prototype.delObj = function (id, flags) {
    return storeFactory.delObj(this.storeId(id), flags);
  };

  /**
   * Set an object
   * @param {string} id     Factory id of object to set
   * @param {object} data   data to set
   * @param {number} flags  storefactory flags
   */
  StandardFactory.prototype.setObj = function (id, data, flags) {
    return storeFactory.setObj(this.storeId(id), data, flags, this.schema.getObject());
  };
  
  /**
   * Get an object
   * @param {string} id     Factory id of object to get
   * @param {number} flags  storefactory flags
   */
  StandardFactory.prototype.getObj = function (id, flags) {
    return storeFactory.getObj(this.storeId(id), flags);
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
   * @param {object} args Argument object with the following properties:
   *   {string} id                          Id of list
   *   {string} title                       Title of list
   *   {Array}  list                        base list to use
   *   {number} [flags=storeFactory.NOFLAG] storeFactory flags
   * @returns {object} address ResourceList object
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

    return newResourceList(this.storeId(id), listArgs);
  };
  
  /**
   * Create a new ResourceList object by duplicating an existing object
   * @param {string} id    Factory id of new object
   * @param {string} srcId Factory id of object to duplicate
   * @param {number} flags storefactory flags
   * @param {object} args  Optional arguemnts specifying fields to duplicate when used with EXISTING
   * @see resourceFactory.duplicateList()
   * @returns {object} ResourceList object
   */
  StandardFactory.prototype.duplicateList = function (id, srcId, flags, args) {
    return duplicateList(id, this.storeId(id), this.storeId(srcId), flags, args);
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
    return delResourceList(this.storeId(id), flags);
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
    return setResourceList(this.storeId(id), list, flags,
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
    return getResourceList(this.storeId(id), flags,
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
    return initResourceList(this.storeId(id), flags);
  };

  /**
   * Check if sort key is descending order
   * @param   {object} sortBy   Key to sort by
   * @returns {boolean} true if is descending order, false otherwise
   */
  StandardFactory.prototype.isDescendingSortOrder = function (sortBy) {
    return isDescendingSortOrder(sortBy);
  };

  /**
   * Set the pager for a ResourceList object
   * @param {string} id     Factory id of object
   * @param   {object} [filter={}] Filter object to use, ResourceFilter object or no filter
   * @param {number} flags  storefactory flags
   * @returns {object} canvass result ResourceList object
   */
  StandardFactory.prototype.setPager = function (id, pager, flags) {
    return setPager(this.storeId(id), pager, flags);
  };

  /**
   * Apply filter to a ResourceList object
   * @param {string} id     Factory id of object
   * @param {object} filter filter to use or preset filter is used if undefined
   * @param {number} flags  storefactory flags
   * @returns {object} canvass result ResourceList object
   */
  StandardFactory.prototype.applyFilter = function (id, filter, flags) {
    return applyFilter(this.storeId(id), filter, flags);
  };


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
   * Identify this object as a REsourceList
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
   * @param {object} entry Entry to add to list
   * @param {number} flags storeFactory flags; the following are used
   *                       - COPY_SET: to add a copy of the entry argument to the list
   *                       - APPLY_FILTER: to immediately filter list
   *                       - other flags ignored
   */
  ResourceList.prototype.addToList = function (entry, flags) {
    if (!this.list) {
      this.setList([entry], flags);
    } else {
      if (storeFactory.doCopySet(flags)) {
        entry = angular.copy(entry);
      }

      this.list.push(entry);
      ++this.count;

      if (storeFactory.doApplyFilter(flags)) {
        this.applyFilter();
      }
    }
    this.exeChanged();
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
   */
  ResourceList.prototype.forEachInList = function (callback) {
    this.list.forEach(function (entry) {
      callback(entry);
    });
  };

  /**
   * Find an entry in this objects list using the callback function to test each of the entries 
   * @param {function} predicate function to test entries in list
   * @param {number}   start     offset to start from
   */
  ResourceList.prototype.findInList = function (predicate, start) {
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    // If argument start was passed let n be ToInteger(start); else let n be 0.
    var n = +start || 0;
    if (Math.abs(n) === Infinity) {
      n = 0;
    }

    var length = this.list.length >>> 0,
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
   */
  ResourceList.prototype.findIndexInList = function (predicate, start) {
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    // If argument start was passed let n be ToInteger(start); else let n be 0.
    var n = +start || 0;
    if (Math.abs(n) === Infinity) {
      n = 0;
    }

    var length = this.list.length >>> 0,
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
   * @param   {object} filter filter to use or preset filter used if undefined
   * @returns {object} this object to facilitate chaining
   */
  ResourceList.prototype.applyFilter = function (filter) {
    if (typeof filter === 'undefined') {
      // use preset filter object
      if (this.filter) {
        filter = this.filter.filterBy;
      }
    }

    filter = filter || {};

    if (!miscUtilFactory.isEmpty(filter)) {
      if (this.filter.customFunction) {
        // use the specific filter function
        this.filter.customFunction(this, filter);
      } else {
        // use the filter object
        this.filterList = $filter('filter')(this.list, filter);
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
    updatePager: updatePager
  };

  return factory;

  /* function implementation
    -------------------------- */

  function storeId (id) {
    return 'pager.' + id;
  }

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

consoleService.$inject = ['$injector'];

function consoleService($injector) {

  this.getLogger = function (tag) {
    return $injector.instantiate(ConsoleLogger, {tag: tag});
  };
}

function ConsoleLogger(DBG, tag) {
  this.dbg = DBG;
  this.tag = tag;
}

ConsoleLogger.$inject = ['DBG', 'tag'];

ConsoleLogger.prototype.config = function (tag) {
  this.tag = tag;
};

ConsoleLogger.prototype.isEnabled = function () {
  return this.dbg.isEnabled(this.tag);
};

ConsoleLogger.prototype.log = function () {
  var args = Array.prototype.slice.call(arguments);
  args.unshift(this.tag);
  this.dbg.log.apply(this.dbg, args);
};

ConsoleLogger.prototype.debug = function () {
  var args = Array.prototype.slice.call(arguments);
  args.unshift(this.tag);
  this.dbg.debug.apply(this.dbg, args);
};

ConsoleLogger.prototype.info = function () {
  var args = Array.prototype.slice.call(arguments);
  args.unshift(this.tag);
  this.dbg.info.apply(this.dbg, args);
};

ConsoleLogger.prototype.warn = function () {
  var args = Array.prototype.slice.call(arguments);
  args.unshift(this.tag);
  this.dbg.debug.warn(this.dbg, args);
};

ConsoleLogger.prototype.error = function () {
  var args = Array.prototype.slice.call(arguments);
  args.unshift(this.tag);
  this.dbg.debug.error(this.dbg, args);
};

ConsoleLogger.prototype.objToString = function (obj) {
  var str = '';
  for (var prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      if (str) {
        str += ', ';
      }
      str += prop + ': ' + obj[prop];
    }
  }
  return '{' + str + '}';
};

/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .value('USER', {
    authenticated: false,
    authToken: undefined,

    // mirroring user model properties
    id: '',
    username: '',
    role: undefined,
    person: undefined
  })
  .constant('AUTH_KEYS', (function () {
    return {
      TOKEN_KEY: 'token',       // object key for user token
      USERINFO_KEY: 'userinfo' // object key for user info
    };
  }()))
  .factory('authFactory', AuthFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

AuthFactory.$inject = ['$resource', '$http', 'storeFactory', 'localStorage', 'baseURL', 'miscUtilFactory', 'AUTH_KEYS', 'USER'];

function AuthFactory($resource, $http, storeFactory, localStorage, baseURL, miscUtilFactory, AUTH_KEYS, USER) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    login: login,
    logout: logout,
    register: register,
    loginByFacebook: loginByFacebook,
    isAuthenticated: isAuthenticated,
    getUsername: getUsername,
    getUserId: getUserId,
    getUserinfo: getUserinfo,
    storeUserinfo: storeUserinfo,
    removeUserinfo: removeUserinfo
  };

  loadUserCredentials();

  return factory;

  /* function implementation
    -------------------------- */
  
  // TODO sort out use of localStorage or storeFactory !!!!

  function useCredentials (credentials) {
    var state = {
      authenticated: !miscUtilFactory.isEmpty(credentials), // TODO method to verify authenticated against server
      username: '',
      authToken: undefined,
      id: ''
    };
    if (state.authenticated) {
      state.username = credentials.username;
      state.authToken = credentials.token;
      state.id = credentials.id;
    }
    // update value
    USER.authenticated = state.authenticated;
    USER.username = state.username;
    USER.authToken = state.authToken;
    USER.id = state.id;
    
    // Set the token as header for your requests!
    $http.defaults.headers.common['x-access-token'] = state.authToken;
  }

  function destroyUserCredentials() {
    useCredentials(undefined);
    localStorage.remove(AUTH_KEYS.TOKEN_KEY);
  }

  function loadUserCredentials () {
    var credentials = localStorage.getObject(AUTH_KEYS.TOKEN_KEY, '{}');
    useCredentials(credentials);
  }

  function storeUserCredentials (credentials) {
    localStorage.storeObject(AUTH_KEYS.TOKEN_KEY, credentials);
    useCredentials(credentials);
  }
  
  function loginSuccess (loginData, response) {
    var credentials = {
      username: loginData.username,
      token: response.token,
      id: response.id
    };
    if (loginData.rememberMe) {
      storeUserCredentials(credentials);
    } else {
      useCredentials(credentials);
    }
  }

  function loginFailure (response) {
    destroyUserCredentials();
  }

  function login (loginData, success, failure) {
    $resource(baseURL + 'users/login')
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

  function logout (next) {
    $resource(baseURL + 'users/logout').get(function (response) {
      if (next) {
        next(response);
      }
    });
    destroyUserCredentials();
  }

  function register (registerData, success, failure) {
    $resource(baseURL + 'users/register')
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
    $resource(baseURL + 'users/facebook')
      .get({},
        function (response) {
          // success response
      
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

  function isAuthenticated() {
    return USER.authenticated;
  }

  function getUsername() {
    return USER.username;
  }

  function getUserId() {
    return USER.id;
  }


  function getUserinfo() {
    return localStorage.getObject(AUTH_KEYS.USERINFO_KEY, '{}');
  }

  function storeUserinfo(loginData) {
    localStorage.storeObject(AUTH_KEYS.USERINFO_KEY, { username: loginData.username });  // only save username
  }

  function removeUserinfo() {
    localStorage.remove(AUTH_KEYS.USERINFO_KEY);
  }
}


/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', function ($provide, schemaProvider, SCHEMA_CONST) {

    var details = [
      SCHEMA_CONST.ID,
      {
        field: 'ADDR1', modelName: 'addrLine1',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
      {
        field: 'ADDR2', modelName: 'addrLine2',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
      {
        field: 'ADDR3', modelName: 'addrLine3',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
      {
        field: 'TOWN', modelName: 'town',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
      {
        field: 'CITY', modelName: 'city',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
      {
        field: 'COUNTY', modelName: 'county',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
      {
        field: 'COUNTRY', modelName: 'country',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
      {
        field: 'PCODE', modelName: 'postcode',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
      {
        field: 'GPS', modelName: 'gps',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
      {
        field: 'VOTEDIST', modelName: 'votingDistrict',
        dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.OBJECTID
      },
      {
        field: 'OWNER', modelName: 'owner',
        dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.OBJECTID
      }
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
      ADDRESS_POSTCODE_IDX =
        schema.addFieldFromModelProp('postcode', 'Postcode', ids.PCODE),
      ADDRESS_GPS_IDX =
        schema.addFieldFromModelProp('gps', 'GPS', ids.GPS),

      // generate list of sort options
      sortOptions = schemaProvider.makeSortList(schema, 
                      [ADDRESS_ADDR_IDX, ADDRESS_TOWN_IDX, ADDRESS_CITY_IDX, ADDRESS_COUNTY_IDX, ADDRESS_POSTCODE_IDX], 
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
        ADDRESS_POSTCODE_IDX: ADDRESS_POSTCODE_IDX,
        ADDRESS_GPS_IDX: ADDRESS_GPS_IDX,

        SORT_OPTIONS: sortOptions,
        ID_TAG: ID_TAG
      });
  }])

  .filter('filterAddr', ['miscUtilFactory', 'SCHEMA_CONST', function (miscUtilFactory, SCHEMA_CONST) {

    function filterAddrFilter (input, schema, filterBy) {
      
      // address specific filter function
      var out = [];

      if (!miscUtilFactory.isEmpty(filterBy)) {
        var testCnt = 0,  // num of fields to test as speced by filter
          matchCnt;       // num of fields matching filter
        schema.forEachField(function(idx, fieldProp) {
          if (filterBy[fieldProp[SCHEMA_CONST.DIALOG_PROP]]) {  // filter uses dialog properties
            ++testCnt;
          }
        });
        angular.forEach(input, function (addr) {
          matchCnt = 0;
          schema.forEachField(function(idx, fieldProp) {
            var filterVal = filterBy[fieldProp[SCHEMA_CONST.DIALOG_PROP]];  // filter uses dialog properties
            if (filterVal) {
              filterVal = filterVal.toLowerCase();
              // apply OR logic to multiple model fields
              var match = false,
                model = fieldProp[SCHEMA_CONST.MODEL_PROP];
              for (var j = 0; !match && (j < model.length); ++j) {
                var addrVal = addr[model[j]];
                if (addrVal) {
                  match = (addrVal.toLowerCase().indexOf(filterVal) >= 0);
                }
              }
              if (match) {
                ++matchCnt;
                if (matchCnt === testCnt) {
                  out.push(addr);
                }
              }
            }
          });
        });
      } else {
        out = input;
      }
      return out;
    }

    return filterAddrFilter;
  }])

  .factory('addressFactory', addressFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

addressFactory.$inject = ['$resource', '$filter', '$injector', 'baseURL', 'consoleService', 'storeFactory', 'resourceFactory', 'compareFactory', 'filterFactory', 'SCHEMA_CONST', 'ADDRSCHEMA'];

function addressFactory($resource, $filter, $injector, baseURL, consoleService, storeFactory, resourceFactory, compareFactory, filterFactory, SCHEMA_CONST, ADDRSCHEMA) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'addressFactory',
      getAddresses: getAddresses,
      getCount: getCount,

      readRspObject: readRspObject,

      setFilter: setFilter,
      newFilter: newFilter,
      getFilteredList: getFilteredList,
      forEachSchemaField: forEachAddrSchemaField,
      getSortOptions: getSortOptions,
      getSortFunction: getSortFunction,
      getFilteredResource: getFilteredResource,
      stringifyAddress: stringifyAddress
    },
    con = consoleService.getLogger(factory.NAME),
    stdFactory = resourceFactory.registerStandardFactory(factory.NAME, {
      storeId: storeId,
      schema: ADDRSCHEMA.SCHEMA,
      addInterface: factory // add standard factory functions to this factory
    });
  
  return factory;

  /* function implementation
    -------------------------- */

  function getAddresses () {
    return resourceFactory.getResources('addresses');
  }

  function getCount () {
    return resourceFactory.getCount('addresses');
  }

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

  /**
   * Create storeFactory id
   * @param {string}   id   Factory id to generate storeFactory id from
   */
  function storeId(id) {
    return ADDRSCHEMA.ID_TAG + id;
  }

  function getFilteredResource (resList, filter, success, failure, forEachSchemaField) {
    
    filter = filter || newFilter();

    if (typeof filter === 'function') {
      forEachSchemaField = failure;
      failure = success;
      filter = newFilter();
    }
    if (!forEachSchemaField) {
      forEachSchemaField = forEachAddrSchemaField;
    }

    var query = resourceFactory.buildQuery(forEachSchemaField, filter.filterBy);

    resList.setList([]);
    getAddresses().query(query).$promise.then(
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
      function (response) {
        if (failure){
          failure(response);
        }
      }
    );
  }
  
  function setFilter (id, filter, flags) {
    if (!filter) {
      filter = newFilter();
    }
    return resourceFactory.setFilter(storeId(id), filter, flags);
  }

  function getSortOptions () {
    return ADDRSCHEMA.SORT_OPTIONS;
  }

  function forEachAddrSchemaField (callback) {
    ADDRSCHEMA.SCHEMA.forEachField(callback);
  }
  
  function newFilter (base, customFilter) {
    if (!customFilter) {
      customFilter = filterFunction;
    }
    var filter = filterFactory.newResourceFilter(ADDRSCHEMA.SCHEMA, base);
    filter.customFunction = customFilter;
    return filter;
  }
  
  /**
   * Generate a filtered list
   * @param {object}   reslist    Address ResourceList object to filter
   * @param {object}   filter     filter to apply
   * @param {function} xtraFilter Function to provide additional filtering
   * @returns {Array}    filtered list
   */
  function getFilteredList (reslist, filter, xtraFilter) {
    // address specific filter function
    return filterFactory.getFilteredList('filterAddr', reslist, filter, xtraFilter);
  }
  
  function filterFunction (addrList, filter) {
    // address specific filter function
    addrList.filterList = getFilteredList(addrList, filter);
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

  function compareAddress (a, b) {
    return compareFactory.compareStringFields(ADDRSCHEMA.SCHEMA, ADDRSCHEMA.ADDRESS_ADDR_IDX, a, b);
  }

  function compareTown (a, b) {
    return compareFactory.compareStringFields(ADDRSCHEMA.SCHEMA, ADDRSCHEMA.ADDRESS_TOWN_IDX, a, b);
  }

  function compareCity (a, b) {
    return compareFactory.compareStringFields(ADDRSCHEMA.SCHEMA, ADDRSCHEMA.ADDRESS_CITY_IDX, a, b);
  }

  function compareCounty (a, b) {
    return compareFactory.compareStringFields(ADDRSCHEMA.SCHEMA, ADDRSCHEMA.ADDRESS_COUNTY_IDX, a, b);
  }

  function comparePostcode (a, b) {
    return compareFactory.compareStringFields(ADDRSCHEMA.SCHEMA, ADDRSCHEMA.ADDRESS_POSTCODE_IDX, a, b);
  }

  function stringifyAddress (addr, join) {
    if (!join) {
      join = ', ';
    }
    var str = '';
    forEachAddrSchemaField(function (idx, fieldProp) {
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

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', function ($provide, schemaProvider, SCHEMA_CONST) {

    var details = [
      SCHEMA_CONST.ID,
      {
        field: 'FNAME', modelName: 'firstname',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
      {
        field: 'LNAME', modelName: 'lastname',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
      {
        field: 'NOTE', modelName: 'note',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
      {
        field: 'ADDR', modelName: 'address',
        dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.OBJECTID
      },
      {
        field: 'CONTACT', modelName: 'contactDetails',
        dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.OBJECTID
      },
      {
        field: 'OWNER', modelName: 'owner',
        dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.OBJECTID
      }
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

peopleFactory.$inject = ['$resource', 'baseURL', 'storeFactory', 'resourceFactory', 'compareFactory', 'filterFactory', 'SCHEMA_CONST', 'PEOPLESCHEMA'];

function peopleFactory ($resource, baseURL, storeFactory, resourceFactory, compareFactory, filterFactory, SCHEMA_CONST, PEOPLESCHEMA) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    NAME: 'peopleFactory',
    getPeople: getPeople,
    getCount: getCount,
    setFilter: setFilter,
    newFilter: newFilter,
    forEachSchemaField: forEachPeopleSchemaField,
    getSortOptions: getSortOptions,
    getSortFunction: getSortFunction
  },
    stdFactory = resourceFactory.registerStandardFactory(factory.NAME, {
      storeId: storeId,
      schema: PEOPLESCHEMA.SCHEMA,
      addInterface: factory // add standard factory functions to this factory
    });
  
  return factory;

  /* function implementation
    -------------------------- */

  function getPeople () {
    return resourceFactory.getResources('people');
  }

  function getCount () {
    return resourceFactory.getCount('people');
  }
  
  function storeId (id) {
    return PEOPLESCHEMA.ID_TAG + id;
  }

  function setFilter (id, filter, flags) {
    if (!filter) {
      filter = newFilter();
    }
    return resourceFactory.setFilter(storeId(id), filter, flags);
  }

  function getSortOptions () {
    return PEOPLESCHEMA.SORT_OPTIONS;
  }

  function forEachPeopleSchemaField (callback) {
    PEOPLESCHEMA.SCHEMA.forEachField(callback);
  }
  
  function newFilter (base) {
    return filterFactory.newResourceFilter(PEOPLESCHEMA.SCHEMA, base);
  }
  
  
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

  .factory('roleFactory', roleFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

roleFactory.$inject = ['$resource', 'baseURL'];

function roleFactory ($resource, baseURL) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    getRoles: getRoles
  };
  
  return factory;

  /* function implementation
    -------------------------- */

  function getRoles () {
    // only getting roles, so no need for a custom action as the default resource "class" object has get/query
    return $resource(baseURL + 'roles', null, null);
  }
}



/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', 'PEOPLESCHEMA', 'ADDRSCHEMA', function ($provide, schemaProvider, SCHEMA_CONST, PEOPLESCHEMA, ADDRSCHEMA) {

    var i, uidx = 0,
      ids = {},
      modelProps = [],
      peoplePath,
      addressPath,
      subSchemaList,

      details = [
        SCHEMA_CONST.ID,
        {
          field: 'UNAME', modelName: 'username',
          dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
        },
        {
          field: 'ROLE', modelName: 'role', factory: 'roleFactory',
          dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.OBJECTID
        },
        {
          field: 'PERSON', modelName: 'person', factory: 'peopleFactory',
          dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.OBJECTID
        }
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

      sortOptions,  // user schema sort options
      sortOptionIndices = // dialog properties of sort options
        [schema.getField(USER_UNAME_IDX, SCHEMA_CONST.DIALOG_PROP)],
      sortOptArgs,
      constToProvide;

    subSchemaList.forEach(function (subSchema) {
      subSchema.schema.SCHEMA.forEachField(
        function (index, fieldProp) {
          schema.addField(
            fieldProp[SCHEMA_CONST.DIALOG_PROP],
            fieldProp[SCHEMA_CONST.DISPLAY_PROP],
            fieldProp[SCHEMA_CONST.MODEL_PROP],
            fieldProp[SCHEMA_CONST.TYPE_PROP], {
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

      SCHEMA: schema,

      SORT_OPTIONS: sortOptions
    };

    $provide.constant('USERSCHEMA', constToProvide);
  }])

  .filter('filterUser', ['SCHEMA_CONST', 'PEOPLESCHEMA', 'ADDRSCHEMA', 'miscUtilFactory', function (SCHEMA_CONST, PEOPLESCHEMA, ADDRSCHEMA, miscUtilFactory) {
    
    function filterUserFilter (input, schema, filterBy) {
      
      // user specific filter function
      var out = [];

      if (!miscUtilFactory.isEmpty(filterBy)) {
        var testCnt = 0,  // num of fields to test as speced by filter
          matchCnt;       // num of fields matching filter
        schema.forEachField(function(idx, fieldProp) {
          if (filterBy[fieldProp[SCHEMA_CONST.DIALOG_PROP]]) {  // filter uses dialog properties
            ++testCnt;
          }
        });
        angular.forEach(input, function (user) {
          matchCnt = 0;
          schema.forEachField(function(idx, fieldProp) {
            var filterVal = filterBy[fieldProp[SCHEMA_CONST.DIALOG_PROP]];  // filter uses dialog properties
            if (filterVal) {
              var userObj = user,
                path = fieldProp[SCHEMA_CONST.PATH_PROP];
              if (path) {
                for (var i = 0; !miscUtilFactory.isNullOrUndefined(userObj) && (i < path.length); ++i) {
                  userObj = userObj[path[i]];
                }
              }
              if (userObj) {
                filterVal = filterVal.toLowerCase();
                // apply OR logic to multiple model fields
                var match = false,
                  model = fieldProp[SCHEMA_CONST.MODEL_PROP];
                for (var j = 0; !match && (j < model.length); ++j) {
                  var userVal = userObj[model[j]];
                  if (userVal) {
                    match = (userVal.toLowerCase().indexOf(filterVal) >= 0);
                  }
                }
                if (match) {
                  ++matchCnt;
                  if (matchCnt === testCnt) {
                    out.push(user);
                  }
                }
              }
            }
          });
        });
      } else {
        out = input;
      }
      return out;
    }
    
    return filterUserFilter;
  }])

  .factory('userFactory', userFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

userFactory.$inject = ['$resource', '$injector', '$filter', 'storeFactory', 'resourceFactory', 'compareFactory', 'filterFactory', 'miscUtilFactory',
  'SCHEMA_CONST', 'USERSCHEMA'];

function userFactory($resource, $injector, $filter, storeFactory, resourceFactory, compareFactory, filterFactory, miscUtilFactory,
  SCHEMA_CONST, USERSCHEMA) {


  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    NAME: 'userFactory',
    getUsers: getUsers,
    getCount: getCount,
    setFilter: setFilter,
    newFilter: newFilter,
    getFilteredList: getFilteredList,
    forEachSchemaField: forEachUserSchemaField,
    getSortOptions: getSortOptions,
    getSortFunction: getSortFunction,
    getFilteredResource: getFilteredResource,
    readUserRsp: readUserRsp

  },
  stdFactory = resourceFactory.registerStandardFactory(factory.NAME, {
    storeId: storeId,
    schema: USERSCHEMA.SCHEMA,
    addInterface: factory // add standard factory functions to this factory
  }),
  comparinators = [];
  
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

  function getUsers () {
    return resourceFactory.getResources('users');
  }

  function getCount () {
    return resourceFactory.getCount('users');
  }
  
  function getFilteredResource (resList, filter, success, failure, forEachSchemaField) {
    
    filter = filter || newFilter();

    if (typeof filter === 'function') {
      forEachSchemaField = failure;
      failure = success;
      filter = newFilter();
    }
    if (!forEachSchemaField) {
      forEachSchemaField = forEachUserSchemaField;
    }

    var query = resourceFactory.buildQuery(forEachSchemaField, filter.filterBy);

    resList.setList([]);
    getUsers().query(query).$promise.then(
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
      function (response) {
        if (failure){
          failure(response);
        }
      }
    );
  }

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
   * Create storefactory id
   * @param {string}   id       id within this factory
   * @return {string}  storefactory id
   */
  function storeId(id) {
    return USERSCHEMA.ID_TAG + id;
  }

  /**
   * Set the filter for a user ResourceList object
   * @param {string} id     Factory id of object
   * @param   {object} [filter={}] Filter object to use, ResourceFilter object or no filter
   * @param {number} flags  storefactory flags
   * @returns {object} user ResourceList object
   */
  function setFilter(id, filter, flags) {
    if (!filter) {
      filter = newFilter();
    }
    return resourceFactory.setFilter(storeId(id), filter, flags);
  }

  /**
   * Get the default sort options for a user ResourceList object
   * @returns {object} user ResourceList sort options
   */
  function getSortOptions() {
    return USERSCHEMA.SORT_OPTIONS;
  }

  /**
   * Execute the callback on each of the schema fields
   */
  function forEachUserSchemaField(callback) {
    USERSCHEMA.SCHEMA.forEachField(callback);
  }
  
  /**
   * Get a new filter object
   * @param {object} base           filter base object
   * @param {function} customFilter custom filter function
   * @returns {object} user ResourceList filter object
   */
  function newFilter(base, customFilter) {
    if (!customFilter) {
      customFilter = filterFunction;
    }
    var filter = filterFactory.newResourceFilter(USERSCHEMA.SCHEMA, base);
    filter.customFunction = customFilter;
    return filter;
  }

  /**
   * Generate a filtered list
   * @param {object}   reslist    User ResourceList object to filter
   * @param {object}   filter     filter to apply
   * @param {function} xtraFilter Function to provide additional filtering
   * @returns {Array}    filtered list
   */
  function getFilteredList (reslist, filter, xtraFilter) {
    // user specific filter function
    return filterFactory.getFilteredList('filterUser', reslist, filter, xtraFilter);
  }
  
  /**
   * Default user ResourceList custom filter function
   * @param {object} reslist    user ResourceList object to filter
   * @param {object} filter     filter to apply
   */
  function filterFunction(reslist, filter) {
    // user specific filter function
    reslist.filterList = getFilteredList(reslist, filter);
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
  function compareUsername (a, b) {
    return compareFactory.compareStringFields(USERSCHEMA.SCHEMA, USERSCHEMA.USER_UNAME_IDX, a, b);
  }

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
      {
        field: 'NAME', modelName: 'name',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
      {
        field: 'DESCRIPTION', modelName: 'description',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
      {
        field: 'QUESTIONS', modelName: 'questions', factory: 'questionFactory',
        dfltValue: [], type: SCHEMA_CONST.FIELD_TYPES.OBJECTID_ARRAY
      }
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

surveyFactory.$inject = ['$resource', '$injector', 'baseURL', 'SURVEYSCHEMA', 'storeFactory', 'resourceFactory', 'miscUtilFactory', 'consoleService'];

function surveyFactory($resource, $injector, baseURL, SURVEYSCHEMA, storeFactory, resourceFactory, miscUtilFactory, consoleService) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'surveyFactory',
      getSurveys: getSurveys,
      readRspObject: readRspObject,
      readResponse: readResponse,
      storeRspObject: storeRspObject
    },
   con = consoleService.getLogger(factory.NAME),
   stdFactory = resourceFactory.registerStandardFactory(factory.NAME, {
      storeId: storeId,
      schema: SURVEYSCHEMA.SCHEMA,
      addInterface: factory // add standard factory functions to this factory
    });
 
  return factory;

  /* function implementation
    -------------------------- */

  function getSurveys () {
    /* https://docs.angularjs.org/api/ngResource/service/$resource
      default action of resource class:
        { 'get':    {method:'GET'},
          'save':   {method:'POST'},
          'query':  {method:'GET', isArray:true},
          'remove': {method:'DELETE'},
          'delete': {method:'DELETE'} };

      add custom update method
    */
    return $resource(baseURL + 'surveys/:id', {id:'@id'}, {'update': {method: 'PUT'}});
  }

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


  function storeId(id) {
    return SURVEYSCHEMA.ID_TAG + id;
  }

}

/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', function ($provide, schemaProvider, SCHEMA_CONST) {

    var details = [
      SCHEMA_CONST.ID,
      {
        field: 'TYPE', modelName: 'type',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.NUMBER
      },
      {
        field: 'QUESTION', modelName: 'question',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.OBJECTID
      },
      {
        field: 'OPTIONS', modelName: 'options',
        dfltValue: [], type: SCHEMA_CONST.FIELD_TYPES.STRING_ARRAY
      },
      {
        field: 'RANGEMIN', modelName: 'rangeMin',
        dfltValue: 1, type: SCHEMA_CONST.FIELD_TYPES.NUMBER
      },
      {
        field: 'RANGEMAX', modelName: 'rangeMax',
        dfltValue: 10, type: SCHEMA_CONST.FIELD_TYPES.NUMBER
      }
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
          range: getOptionCountArray(1, 10)
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

  .filter('filterQues', ['miscUtilFactory', 'SCHEMA_CONST', function (miscUtilFactory, SCHEMA_CONST) {

    function filterQuesFilter(input, schema, filterBy) {

      // question specific filter function
      var out = [];

      //if (!miscUtilFactory.isEmpty(filterBy)) {
        // TODO question specific filter function
      //} else {
        out = input;
      //}
      return out;
    }

    return filterQuesFilter;
  }])

  .factory('questionFactory', questionFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

questionFactory.$inject = ['$resource', '$injector', 'baseURL', 'SCHEMA_CONST', 'QUESTIONSCHEMA', 'storeFactory', 'resourceFactory', 'compareFactory', 'filterFactory', 'miscUtilFactory', 'consoleService'];

function questionFactory($resource, $injector, baseURL, SCHEMA_CONST, QUESTIONSCHEMA, storeFactory, resourceFactory, compareFactory, filterFactory, miscUtilFactory, consoleService) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'questionFactory',
      getQuestions: getQuestions,
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

      setFilter: setFilter,
      newFilter: newFilter,
      getFilteredList: getFilteredList,
      forEachSchemaField: forEachQuesSchemaField,
      getSortOptions: getSortOptions,
      getSortFunction: getSortFunction,
      getFilteredResource: getFilteredResource
    },
    con = consoleService.getLogger(factory.NAME),
    stdFactory = resourceFactory.registerStandardFactory(factory.NAME, {
      storeId: storeId,
      schema: QUESTIONSCHEMA.SCHEMA,
      addInterface: factory // add standard factory functions to this factory
    });

  return factory;

  /* function implementation
    -------------------------- */

  function getQuestions () {
    /* https://docs.angularjs.org/api/ngResource/service/$resource
      default action of resource class:
        { 'get':    {method:'GET'},
          'save':   {method:'POST'},
          'query':  {method:'GET', isArray:true},
          'remove': {method:'DELETE'},
          'delete': {method:'DELETE'} };

      add custom update method
    */
    return $resource(baseURL + 'questions/:id', {id:'@id'}, {'update': {method: 'PUT'}});
  }

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

  function getFilteredResource(resList, filter, success, failure, forEachSchemaField) {

    filter = filter || newFilter();

    if (typeof filter === 'function') {
      forEachSchemaField = failure;
      failure = success;
      filter = newFilter();
    }
    if (!forEachSchemaField) {
      forEachSchemaField = forEachQuesSchemaField;
    }

    var query = resourceFactory.buildQuery(forEachSchemaField, filter.filterBy);

    resList.setList([]);
    getQuestions().query(query).$promise.then(
      // success function
      function (response) {
        // add indices
        for (var i = 0; i < response.length; ++i) {
          response[i].index = i + 1;
        }
        // response from server contains result of filter request
        resList.setList(response, storeFactory.APPLY_FILTER);

        if (success) {
          success(response);
        }
      },
      // error function
      function (response) {
        if (failure) {
          failure(response);
        }
      }
    );
  }


  function storeId(id) {
    return QUESTIONSCHEMA.ID_TAG + id;
  }
  
  function setFilter (id, filter, flags) {
    if (!filter) {
      filter = newFilter();
    }
    return resourceFactory.setFilter(storeId(id), filter, flags);
  }

  function getSortOptions () {
    return QUESTIONSCHEMA.SORT_OPTIONS;
  }

  function forEachQuesSchemaField (callback) {
    QUESTIONSCHEMA.SCHEMA.forEachField(callback);
  }
  
  function newFilter (base, customFilter) {
    if (!customFilter) {
      customFilter = filterFunction;
    }
    var filter = filterFactory.newResourceFilter(QUESTIONSCHEMA.SCHEMA, base);
    filter.customFunction = customFilter;
    return filter;
  }
  
  /**
   * Generate a filtered list
   * @param {object}   reslist    Address ResourceList object to filter
   * @param {object}   filter     filter to apply
   * @param {function} xtraFilter Function to provide additional filtering
   * @returns {Array}    filtered list
   */
  function getFilteredList (reslist, filter, xtraFilter) {
    return filterFactory.getFilteredList('filterQues', reslist, filter, xtraFilter);
  }
  
  function filterFunction (reslist, filter) {
    // question specific filter function
    reslist.filterList = getFilteredList(reslist, filter);
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

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', function ($provide, schemaProvider, SCHEMA_CONST) {

    var details = [
      SCHEMA_CONST.ID,
      {
        field: 'ANSWER', modelName: 'answer',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
      {
        field: 'QUESTION', modelName: 'question',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.OBJECTID
      }
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

  .filter('filterAns', ['miscUtilFactory', 'SCHEMA_CONST', function (miscUtilFactory, SCHEMA_CONST) {

    function filterQuesFilter(input, schema, filterBy) {

      // answer specific filter function
      var out = [];

      //if (!miscUtilFactory.isEmpty(filterBy)) {
      // TODO answer specific filter function
      //} else {
      out = input;
      //}
      return out;
    }

    return filterQuesFilter;
  }])

  .factory('answerFactory', answerFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

answerFactory.$inject = ['$resource', '$injector', 'baseURL', 'SCHEMA_CONST', 'ANSWERSCHEMA', 'storeFactory', 'resourceFactory', 'compareFactory', 'filterFactory', 'miscUtilFactory', 'consoleService'];

function answerFactory($resource, $injector, baseURL, SCHEMA_CONST, ANSWERSCHEMA, storeFactory, resourceFactory, compareFactory, filterFactory, miscUtilFactory, consoleService) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'answerFactory',
      getAnswers: getAnswers,
      readRspObject: readRspObject,
      readResponse: readResponse,
      storeRspObject: storeRspObject,

      setFilter: setFilter,
      newFilter: newFilter,
      getFilteredList: getFilteredList,
      forEachSchemaField: forEachAnsSchemaField,
      getSortOptions: getSortOptions,
      getSortFunction: getSortFunction,
      getFilteredResource: getFilteredResource
    },
    con = consoleService.getLogger(factory.NAME),
    stdFactory = resourceFactory.registerStandardFactory(factory.NAME, {
      storeId: storeId,
      schema: ANSWERSCHEMA.SCHEMA,
      addInterface: factory // add standard factory functions to this factory
    });

  return factory;

  /* function implementation
    -------------------------- */

  function getAnswers () {
    /* https://docs.angularjs.org/api/ngResource/service/$resource
      default action of resource class:
        { 'get':    {method:'GET'},
          'save':   {method:'POST'},
          'query':  {method:'GET', isArray:true},
          'remove': {method:'DELETE'},
          'delete': {method:'DELETE'} };

      add custom update method
    */
    return $resource(baseURL + 'answers/:id', { id: '@id' }, { 'update': { method: 'PUT' } });
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

  function getFilteredResource(resList, filter, success, failure, forEachSchemaField) {

    filter = filter || newFilter();

    if (typeof filter === 'function') {
      forEachSchemaField = failure;
      failure = success;
      filter = newFilter();
    }
    if (!forEachSchemaField) {
      forEachSchemaField = forEachAnsSchemaField;
    }

    var query = resourceFactory.buildQuery(forEachSchemaField, filter.filterBy);

    resList.setList([]);
    getAnswers().query(query).$promise.then(
      // success function
      function (response) {
        // add indices
        for (var i = 0; i < response.length; ++i) {
          response[i].index = i + 1;
        }
        // response from server contains result of filter request
        resList.setList(response, storeFactory.APPLY_FILTER);

        if (success) {
          success(response);
        }
      },
      // error function
      function (response) {
        if (failure) {
          failure(response);
        }
      }
    );
  }


  function storeId(id) {
    return ANSWERSCHEMA.ID_TAG + id;
  }
  
  function setFilter (id, filter, flags) {
    if (!filter) {
      filter = newFilter();
    }
    return resourceFactory.setFilter(storeId(id), filter, flags);
  }

  function getSortOptions () {
    return ANSWERSCHEMA.SORT_OPTIONS;
  }

  function forEachAnsSchemaField (callback) {
    ANSWERSCHEMA.SCHEMA.forEachField(callback);
  }
  
  function newFilter (base, customFilter) {
    if (!customFilter) {
      customFilter = filterFunction;
    }
    var filter = filterFactory.newResourceFilter(ANSWERSCHEMA.SCHEMA, base);
    filter.customFunction = customFilter;
    return filter;
  }
  
  /**
   * Generate a filtered list
   * @param {object}   reslist    Address ResourceList object to filter
   * @param {object}   filter     filter to apply
   * @param {function} xtraFilter Function to provide additional filtering
   * @returns {Array}    filtered list
   */
  function getFilteredList (reslist, filter, xtraFilter) {
    return filterFactory.getFilteredList('filterAns', reslist, filter, xtraFilter);
  }
  
  function filterFunction (reslist, filter) {
    // question specific filter function
    reslist.filterList = getFilteredList(reslist, filter);
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

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', function ($provide, schemaProvider, SCHEMA_CONST) {

    var details = [
      SCHEMA_CONST.ID,
      {
        field: 'NAME', modelName: 'name',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
      {
        field: 'DESCRIPTION', modelName: 'description',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
      {
        field: 'SEATS', modelName: 'seats',
        dfltValue: 0, type: SCHEMA_CONST.FIELD_TYPES.NUMBER
      },
      {
        field: 'ELECTIONDATE', modelName: 'electionDate',
        dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.DATE
      },
      {
        field: 'SYSTEM', modelName: 'system', factory: 'votingsystemFactory',
        dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.OBJECTID
      },
      {
        field: 'CANDIDATES', modelName: 'candidates',
        dfltValue: [], type: SCHEMA_CONST.FIELD_TYPES.OBJECTID_ARRAY
      }
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

electionFactory.$inject = ['$resource', '$injector', '$filter', 'storeFactory', 'resourceFactory', 'filterFactory', 'consoleService',
  'miscUtilFactory', 'SCHEMA_CONST', 'ELECTIONSCHEMA'];

function electionFactory($resource, $injector, $filter, storeFactory, resourceFactory, filterFactory, consoleService, 
  miscUtilFactory, SCHEMA_CONST, ELECTIONSCHEMA) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'electionFactory',
      getElections: getElections,
      readRspObject: readRspObject,
      readResponse: readResponse,
      storeRspObject: storeRspObject,
      setFilter:setFilter,
      getSortOptions: getSortOptions,
      forEachSchemaField: forEachElectionSchemaField,
      newFilter: newFilter,
      getFilteredList: getFilteredList,
      filterFunction: filterFunction,
      getSortFunction: getSortFunction
    },
    con = consoleService.getLogger(factory.NAME),
    stdFactory = resourceFactory.registerStandardFactory(factory.NAME, {
      storeId: storeId,
      schema: ELECTIONSCHEMA.SCHEMA,
      addInterface: factory // add standard factory functions to this factory
    });
  
  return factory;

  /* function implementation
    -------------------------- */

  function getElections () {
    return resourceFactory.getResources('elections');
  }

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

  function storeId (id) {
    return ELECTIONSCHEMA.ID_TAG + id;
  }

  function setFilter(id, filter, flags) {
    if (!filter) {
      filter = newFilter();
    }
    return resourceFactory.setFilter(storeId(id), filter, flags);
  }

  function getSortOptions() {
    return ELECTIONSCHEMA.SORT_OPTIONS;
  }

  function forEachElectionSchemaField(callback) {
    ELECTIONSCHEMA.SCHEMA.forEachField(callback);
  }

  function newFilter(base, customFilter) {
    if (!customFilter) {
      customFilter = filterFunction;
    }
    var filter = filterFactory.newResourceFilter(ELECTIONSCHEMA.SCHEMA, base);
    filter.customFunction = customFilter;
    return filter;
  }

  /**
   * Generate a filtered list
   * @param {object} reslist    Election ResourceList object to filter
   * @param {object} filter     filter to apply
   * @param {function} xtraFilter Function to provide additional filtering
   * @returns {Array} filtered list
   */
  function getFilteredList (reslist, filter, xtraFilter) {
    // election specific filter function
    return filterFactory.getFilteredList('filterElection', reslist, filter, xtraFilter);
  }

  function filterFunction(electionList, filter) {
    // election specific filter function
    electionList.filterList = getFilteredList(electionList, filter);
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

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', function ($provide, schemaProvider, SCHEMA_CONST) {

    var details = [
      SCHEMA_CONST.ID,
      {
        field: 'NAME', modelName: 'name',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
      {
        field: 'DESCRIPTION', modelName: 'description',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
      {
        field: 'ABBREVIATION', modelName: 'abbreviation',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      }
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

votingsystemFactory.$inject = ['$resource', '$injector', '$filter', 'storeFactory', 'resourceFactory', 'filterFactory', 'consoleService',
  'miscUtilFactory', 'SCHEMA_CONST', 'VOTINGSYSSCHEMA'];

function votingsystemFactory ($resource, $injector, $filter, storeFactory, resourceFactory, filterFactory, consoleService, 
  miscUtilFactory, SCHEMA_CONST, VOTINGSYSSCHEMA) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'votingsystemFactory',
      getVotingSystems: getVotingSystems,
      readRspObject: readRspObject,
      readResponse: readResponse,
      storeRspObject: storeRspObject,
      setFilter:setFilter,
      getSortOptions: getSortOptions,
      forEachSchemaField: forEachVotingSysSchemaField,
      newFilter: newFilter,
      getFilteredList: getFilteredList,
      filterFunction: filterFunction,
      getSortFunction: getSortFunction
    },
    con = consoleService.getLogger(factory.NAME),
    stdFactory = resourceFactory.registerStandardFactory(factory.NAME, {
      storeId: storeId,
      schema: VOTINGSYSSCHEMA.SCHEMA,
      addInterface: factory // add standard factory functions to this factory
    });
  
  return factory;

  /* function implementation
    -------------------------- */

  function getVotingSystems () {
    return resourceFactory.getResources('votingsystems');
    
  }
  

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

  function storeId (id) {
    return VOTINGSYSSCHEMA.ID_TAG + id;
  }

  function setFilter(id, filter, flags) {
    if (!filter) {
      filter = newFilter();
    }
    return resourceFactory.setFilter(storeId(id), filter, flags);
  }

  function getSortOptions() {
    return VOTINGSYSSCHEMA.SORT_OPTIONS;
  }

  function forEachVotingSysSchemaField(callback) {
    VOTINGSYSSCHEMA.SCHEMA.forEachField(callback);
  }

  function newFilter(base, customFilter) {
    if (!customFilter) {
      customFilter = filterFunction;
    }
    var filter = filterFactory.newResourceFilter(VOTINGSYSSCHEMA.SCHEMA, base);
    filter.customFunction = customFilter;
    return filter;
  }

  /**
   * Generate a filtered list
   * @param {object} reslist    Election ResourceList object to filter
   * @param {object} filter     filter to apply
   * @param {function} xtraFilter Function to provide additional filtering
   * @returns {Array} filtered list
   */
  function getFilteredList (reslist, filter, xtraFilter) {
    // voting system specific filter function
    return filterFactory.getFilteredList('filterVotingSys', reslist, filter, xtraFilter);
  }

  function filterFunction(reslist, filter) {
    // voting system specific filter function
    reslist.filterList = getFilteredList(reslist, filter);
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

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', function ($provide, schemaProvider, SCHEMA_CONST) {

    var details = [
      SCHEMA_CONST.ID,
      {
        field: 'NAME', modelName: 'name',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
      { field: 'DESCRIPTION', modelName: 'description', 
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING },
      {
        field: 'STARTDATE', modelName: 'startDate',
        dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.DATE
      },
      {
        field: 'ENDDATE', modelName: 'endDate',
        dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.DATE
      },
      {
        field: 'ELECTION', modelName: 'election', factory: 'electionFactory',
        dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.OBJECTID
      },
      {
        field: 'SURVEY', modelName: 'survey', factory: 'surveyFactory',
        dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.OBJECTID
      },
      {
        field: 'ADDRESSES', modelName: 'addresses', factory: 'addressFactory',
        dfltValue: [], type: SCHEMA_CONST.FIELD_TYPES.OBJECTID_ARRAY
      },
      {
        field: 'CANVASSERS', modelName: 'canvassers', factory: 'userFactory',
        dfltValue: [], type: SCHEMA_CONST.FIELD_TYPES.OBJECTID_ARRAY
      },
      {
        field: 'RESULTS', modelName: 'results', factory: 'canvassResultFactory',
        dfltValue: [], type: SCHEMA_CONST.FIELD_TYPES.OBJECTID_ARRAY
      }
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

  .filter('filterCanvass', ['miscUtilFactory', 'SCHEMA_CONST', function (miscUtilFactory, SCHEMA_CONST) {

    function filterCanvassFilter(input, schema, filterBy) {

      // canvass specific filter function
      var out = [];

      //if (!miscUtilFactory.isEmpty(filterBy)) {
      // TODO canvass specific filter function
      //} else {
      out = input;
      //}
      return out;
    }

    return filterCanvassFilter;
  }])

  .factory('canvassFactory', canvassFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

canvassFactory.$inject = ['$resource', '$injector', 'baseURL', 'storeFactory', 'resourceFactory', 'filterFactory', 'miscUtilFactory', 'surveyFactory', 'questionFactory',
  'addressFactory', 'electionFactory', 'userFactory', 'canvassResultFactory', 'SCHEMA_CONST', 'CANVASSSCHEMA', 'SURVEYSCHEMA', 'RESOURCE_CONST', 'CHARTS', 'consoleService'];
function canvassFactory($resource, $injector, baseURL, storeFactory, resourceFactory, filterFactory, miscUtilFactory, surveyFactory, questionFactory,
  addressFactory, electionFactory, userFactory, canvassResultFactory, SCHEMA_CONST, CANVASSSCHEMA, SURVEYSCHEMA, RESOURCE_CONST, CHARTS, consoleService) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'canvassFactory',
      getCanvasses: getCanvasses,
      readRspObject: readRspObject,
      readResponse: readResponse,

      setFilter: setFilter,
      newFilter: newFilter,
      getFilteredList: getFilteredList,
      forEachSchemaField: forEachCanvassSchemaField,
      getSortOptions: getSortOptions,
      getSortFunction: getSortFunction,
      getFilteredResource: getFilteredResource,

      storeRspObject: storeRspObject,
      setLabeller: setLabeller,
      linkCanvasserToAddr: linkCanvasserToAddr,
      unlinkAddrFromCanvasser: unlinkAddrFromCanvasser,
      unlinkAddrListFromCanvasser: unlinkAddrListFromCanvasser,

      processAddressResultsLink: processAddressResultsLink,
      ADDR_RES_LINKADDRESS: 'addrResLinkAddr',  // link address flag for linking addresses & results
      ADDR_RES_LINKRESULT: 'addrResLinkRes',    // link result flag for linking addresses & results

      QUES_RES_LINKQUES: 'quesResLinkQues', // link results flag for linking questions & results
      QUES_RES_LINKRES: 'quesResLinkRes'    // link results flag for linking questions & results

    },
    con = consoleService.getLogger(factory.NAME),
    labeller,
    stdFactory = resourceFactory.registerStandardFactory(factory.NAME, {
      storeId: storeId,
      schema: CANVASSSCHEMA.SCHEMA,
      addInterface: factory // add standard factory functions to this factory
    });

  return factory;

  /* function implementation
    -------------------------- */

  function getCanvasses () {
    return resourceFactory.getResources('canvasses');
  }

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

    con.debug('Read canvass rsp object: ' + object);

    return object;
  }

  /**
   * Process the linking of addresses and results
   * @param {object} response   Server response
   * @param {object} args       arguments object
   */
  function processAddressResultsLink (response, args) {
    if (args.linkAddressAndResult) {
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
    if (args.linkQuestionAndResult) {
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
   * Set the labeling function
   * @param {function} labelfunc Function to return label class
   */
  function setLabeller (labelfunc) {
    labeller = labelfunc;
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

    var subObjects, i, stdArgs;

    // store sub objects first
    if (args.subObj) {
      subObjects = miscUtilFactory.toArray(args.subObj);
      for (i = 0; i < subObjects.length; ++i) {
        stdArgs = resourceFactory.standardiseArgs(subObjects[i]);

        resourceFactory.storeSubDoc(obj, stdArgs, args);
      }
    }

    con.debug('Store canvass response: ' + obj);

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
        results;

      miscUtilFactory.toArray(response).forEach(function (rsp) {
        addresses = [];
        results = [];

        miscUtilFactory.toArray(addrArgs).forEach(function (addrArg) {
          addresses.push(resourceFactory.getObjectInfo(rsp, addrArg).object);
        });
        miscUtilFactory.toArray(resultArgs).forEach(function (resArg) {
          results.push(resourceFactory.getObjectInfo(rsp, resArg).object);
        });

        if (addresses.length && results.length) {
          results.forEach(function (result) {
            result.forEach(function (resObj) {
              addresses.forEach(function (address) {
                var addr = address.find(function (entry) {
                  return (entry._id === resObj.address._id);
                });
                if (addr) {
                  // link address and canvass result
                  addr.canvassResult = resObj._id;
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
        var start,
          ques,
          ansProcessor = new AnswerProcessor();
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
  
  
  /**
   * Link the specified canvasser and address
   * @param {object}   canvasser  Canvasser object to link
   * @param {object}   addr       Address object to link
   */
  function linkCanvasserToAddr (canvasser, addr) {
    if (!canvasser.addresses) {
      canvasser.addresses = [];
    }
    if (canvasser.addresses.findIndex(elementTest, addr) < 0) {
      canvasser.addresses.push(addr._id);
    }

    addr.canvasser = canvasser._id;
    var badge = '';
    if (canvasser.person.firstname) {
      badge += getFirstLetters(canvasser.person.firstname);
    }
    if (canvasser.person.lastname) {
      badge += getFirstLetters(canvasser.person.lastname);
    }
    addr.badge = badge;
    
    if (!canvasser.labelClass) {
      if (labeller) {
        canvasser.labelClass = labeller();
      }
    }
    addr.labelClass = canvasser.labelClass;
  }
  
  /**
   * Get the first letters of all words in a string
   * @param {string}   str  String to get leading letter from
   * @return {string}  String of leading letters
   */
  function getFirstLetters (str) {
    var splits = str.split(' '),
      letters = '';
    splits.forEach(function (split) {
      letters += split.charAt(0);
    });
    return letters;
  }
  

  function elementIdTest (element) {
    return (element._id === this);
  }

  function elementTest (element) {
    return (element === this._id);
  }

  /**
   * Unlink the specified canvasser and address
   * @param {object}   canvasser  Canvasser object to unlink
   * @param {object}   addr       Address object to unlink
   */
  function unlinkAddrFromCanvasser (canvasser, addr) {
    if (canvasser.addresses) {
      var idx = canvasser.addresses.findIndex(elementTest, addr);
      if (idx >= 0) {
        canvasser.addresses.splice(idx, 1);
      }
    }
    delete addr.canvasser;
    delete addr.badge;
  }
  
  /**
   * Unlink the specified canvasser and all addresses in a list
   * @param {object}   canvasser  Canvasser object to unlink
   * @param {object}   addrList   List of address objects to unlink
   */
  function unlinkAddrListFromCanvasser (canvasser, addrList) {
    if (canvasser.addresses) {
      canvasser.addresses.forEach(function (addrId) {
        var addr = addrList.find(elementIdTest, addrId);
        if (addr) {
          delete addr.canvasser;
          delete addr.badge;
        }
      });
    }
    canvasser.addresses = [];
  }
  
  /**
   * Create storeFactory id
   * @param {string}   id   Factory id to generate storeFactory id from
   */
  function storeId (id) {
    return CANVASSSCHEMA.ID_TAG + id;
  }

  function getFilteredResource (resList, filter, success, failure, forEachSchemaField) {
    
    filter = filter || newFilter();

    if (typeof filter === 'function') {
      forEachSchemaField = failure;
      failure = success;
      filter = newFilter();
    }
    if (!forEachSchemaField) {
      forEachSchemaField = forEachCanvassSchemaField;
    }

    var query = resourceFactory.buildQuery(forEachSchemaField, filter.filterBy);

    resList.setList([]);
    getCanvasses().query(query).$promise.then(
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
      function (response) {
        if (failure){
          failure(response);
        }
      }
    );
  }

  function setFilter (id, filter, flags) {
    if (!filter) {
      filter = newFilter();
    }
    return resourceFactory.setFilter(storeId(id), filter, flags);
  }

  function getSortOptions () {
    return CANVASSSCHEMA.SORT_OPTIONS;
  }

  function forEachCanvassSchemaField (callback) {
    CANVASSSCHEMA.SCHEMA.forEachField(callback);
  }
  
  function newFilter (base, customFilter) {
    if (!customFilter) {
      customFilter = filterFunction;
    }
    var filter = filterFactory.newResourceFilter(CANVASSSCHEMA.SCHEMA, base);
    filter.customFunction = customFilter;
    return filter;
  }
  
  /**
   * Generate a filtered list
   * @param {object}   reslist    Address ResourceList object to filter
   * @param {object}   filter     filter to apply
   * @param {function} xtraFilter Function to provide additional filtering
   * @returns {Array}    filtered list
   */
  function getFilteredList (reslist, filter, xtraFilter) {
    // canvass specific filter function
    return filterFactory.getFilteredList('filterCanvass', reslist, filter, xtraFilter);
  }
  
  function filterFunction (addrList, filter) {
    // canvass specific filter function
    addrList.filterList = getFilteredList(addrList, filter);
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

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', function ($provide, schemaProvider, SCHEMA_CONST) {

    var details = [
      SCHEMA_CONST.ID,
      {
        field: 'AVAILABLE', modelName: 'available',
        dfltValue: true, type: SCHEMA_CONST.FIELD_TYPES.BOOLEAN
      },
      {
        field: 'DONTCANVASS', modelName: 'dontCanvass',
        dfltValue: false, type: SCHEMA_CONST.FIELD_TYPES.BOOLEAN
      },
      {
        field: 'TRYAGAIN', modelName: 'tryAgain',
        dfltValue: false, type: SCHEMA_CONST.FIELD_TYPES.BOOLEAN
      },
      {
        field: 'SUPPORT', modelName: 'support',
        dfltValue: -1, type: SCHEMA_CONST.FIELD_TYPES.NUMBER
      },
      {
        field: 'DATE', modelName: 'date',
        dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.DATE
      },
      {
        field: 'ANSWERS', modelName: 'answers',
        dfltValue: [], type: SCHEMA_CONST.FIELD_TYPES.OBJECTID_ARRAY
      },
      {
        field: 'CANVASSER', modelName: 'canvasser', factory: 'userFactory',
        dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.OBJECTID
      },
      {
        field: 'VOTER', modelName: 'voter', factory: 'peopleFactory',
        dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.OBJECTID
      },
      {
        field: 'ADDRESS', modelName: 'address', factory: 'addressFactory',
        dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.OBJECTID
      },
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

  .filter('filterCanvassResult', ['SCHEMA_CONST', 'utilFactory', 'miscUtilFactory', function (SCHEMA_CONST, utilFactory, miscUtilFactory) {

    function filterCanvassResultFilter(input, schema, filterBy) {

      // canvass result specific filter function

      // TODO filter canvass result function
      return input;
    }

    return filterCanvassResultFilter;
  }])

  .factory('canvassResultFactory', canvassResultFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

canvassResultFactory.$inject = ['$resource', '$injector', '$filter', 'baseURL', 'storeFactory', 'resourceFactory', 'compareFactory', 'filterFactory', 'miscUtilFactory', 'surveyFactory',
  'addressFactory', 'electionFactory', 'userFactory', 'SCHEMA_CONST', 'CANVASSRES_SCHEMA', 'consoleService'];
function canvassResultFactory($resource, $injector, $filter, baseURL, storeFactory, resourceFactory, compareFactory, filterFactory, miscUtilFactory, surveyFactory,
  addressFactory, electionFactory, userFactory, SCHEMA_CONST, CANVASSRES_SCHEMA, consoleService) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'canvassResultFactory',
      getCanvassResult: getCanvassResult,
      readRspObject: readRspObject,
      readResponse: readResponse,
      storeRspObject: storeRspObject,
      setFilter: setFilter,
      newFilter: newFilter,
      getFilteredList: getFilteredList,
      forEachSchemaField: forEachCanvassResSchemaField,
      getSortOptions: getSortOptions,
      getSortFunction: getSortFunction
    },
    con = consoleService.getLogger(factory.NAME),
    stdFactory = resourceFactory.registerStandardFactory(factory.NAME, {
      storeId: storeId,
      schema: CANVASSRES_SCHEMA.SCHEMA,
      addInterface: factory // add standard factory functions to this factory
    });
  
  return factory;

  /* function implementation
    -------------------------- */

  function getCanvassResult() {
    /* https://docs.angularjs.org/api/ngResource/service/$resource
      default action of resource class:
        { 'get':    {method:'GET'},
          'save':   {method:'POST'},
          'query':  {method:'GET', isArray:true},
          'remove': {method:'DELETE'},
          'delete': {method:'DELETE'} };

      add custom update & multiple save methods
    */
    return $resource(baseURL + 'canvassresult/:id', { id: '@id' },
                      {'update': {method: 'PUT'},
                       'saveMany': {method: 'POST', isArray: true}
                      });
  }
  
  
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
   * Create storeFactory id
   * @param {string}   id   Factory id to generate storeFactory id from
   */
  function storeId (id) {
    return CANVASSRES_SCHEMA.ID_TAG + id;
  }
  
  /**
   * Set the filter for a canvass result ResourceList object
   * @param {string} id     Factory id of object
   * @param   {object} [filter={}] Filter object to use, ResourceFilter object or no filter
   * @param {number} flags  storefactory flags
   * @returns {object} canvass result ResourceList object
   */
  function setFilter(id, filter, flags) {
    if (!filter) {
      filter = newFilter();
    }
    return resourceFactory.setFilter(storeId(id), filter, flags);
  }

  /**
   * Get the default sort options for a canvass result ResourceList object
   * @returns {object} canvass result ResourceList sort options
   */
  function getSortOptions() {
    return CANVASSRES_SCHEMA.SORT_OPTIONS;
  }

  /**
   * Execute the callback on each of the schema fields
   */
  function forEachCanvassResSchemaField(callback) {
    CANVASSRES_SCHEMA.SCHEMA.forEachField(callback);
  }
  
  /**
   * Get a new filter object
   * @param {object} base           filter base object
   * @param {function} customFilter custom filter function
   * @returns {object} canvass result ResourceList filter object
   */
  function newFilter(base, customFilter) {
    if (!customFilter) {
      customFilter = filterFunction;
    }
    var filter = filterFactory.newResourceFilter(CANVASSRES_SCHEMA.SCHEMA, base);
    filter.customFunction = customFilter;
    return filter;
  }
  
  /**
   * Generate a filtered list
   * @param {object} reslist    canvass result ResourceList object to filter
   * @param {object} filter     filter to apply
   * @param {function} xtraFilter Function to provide additional filtering
   * @returns {Array} filtered list
   */
  function getFilteredList (reslist, filter, xtraFilter) {
    // canvass result specific filter function
    return filterFactory.getFilteredList('filterCanvassResult', reslist, filter, xtraFilter);
  }
  
  /**
   * Default canvass result ResourceList custom filter function
   * @param {object} reslist    canvass result ResourceList object to filter
   * @param {object} filter     filter to apply
   */
  function filterFunction(reslist, filter) {
    // canvass result specific filter function
    reslist.filterList = getFilteredList(reslist, filter);
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
  
}


/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', function ($provide, schemaProvider, SCHEMA_CONST) {

    var details = [
      SCHEMA_CONST.ID,
      {
        field: 'CANVASS', modelName: 'canvass', factory: 'canvassFactory',
        dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.OBJECTID
      },
      {
        field: 'CANVASSER', modelName: 'canvasser', factory: 'userFactory',
        dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.OBJECTID
      },
      {
        field: 'ADDRESSES', modelName: 'addresses', factory: 'addressFactory',
        dfltValue: [], type: SCHEMA_CONST.FIELD_TYPES.OBJECTID_ARRAY
      },
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

  .filter('filterCanvassAssignment', ['SCHEMA_CONST', 'utilFactory', 'miscUtilFactory', function (SCHEMA_CONST, utilFactory, miscUtilFactory) {

    function filterCanvassAssignmentFilter(input, schema, filterBy) {

      // canvass assignment specific filter function

      // TODO filter canvass assignment function
      return input;
    }

    return filterCanvassAssignmentFilter;
  }])

  .factory('canvassAssignmentFactory', canvassAssignmentFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

canvassAssignmentFactory.$inject = ['$resource', '$injector', '$filter', 'baseURL', 'storeFactory', 'resourceFactory', 'compareFactory', 'filterFactory', 'miscUtilFactory', 'surveyFactory', 'canvassFactory',
  'addressFactory', 'electionFactory', 'userFactory', 'SCHEMA_CONST', 'CANVASSASSIGN_SCHEMA', 'consoleService'];
function canvassAssignmentFactory($resource, $injector, $filter, baseURL, storeFactory, resourceFactory, compareFactory, filterFactory, miscUtilFactory, surveyFactory, canvassFactory,
  addressFactory, electionFactory, userFactory, SCHEMA_CONST, CANVASSASSIGN_SCHEMA, consoleService) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'canvassAssignmentFactory',
      getCanvassAssignment: getCanvassAssignment,
      getAssignmentCanvasses: getAssignmentCanvasses,
      readRspObject: readRspObject,
      readResponse: readResponse,
      storeRspObject: storeRspObject,
      setFilter: setFilter,
      newFilter: newFilter,
      getFilteredList: getFilteredList,
      forEachSchemaField: forEachCanvassAssignSchemaField,
      getSortOptions: getSortOptions,
      getSortFunction: getSortFunction,

      // objects to be extracted from response
      ADDR_CANVSR_LINKCANVASSER: 'addrCanvsrlinkCanvasser',   // canvasser whose allocation it is
      ADDR_CANVSR_LINKADDRESS: 'addrCanvsrlinkAddress',       // canvasser's address allocation 
      ADDR_CANVSR_CANVASSERARRAY: 'addrCanvsrCanvasserArray', // array of canvassers
      ADDR_CANVSR_ADDRESSARRAY: 'addrCanvsrAddressArray',     // array of addresses
      // objects to be extracted from store
      ADDR_CANVSR_CANVASSERLIST: 'addrCanvsrCanvasserList',   // ResourceList of canvassers
      ADDR_CANVSR_ADDRESSLIST: 'addrCanvsrAddressList'        // ResourceList of addresses

    },
    con = consoleService.getLogger(factory.NAME),
    stdFactory = resourceFactory.registerStandardFactory(factory.NAME, {
      storeId: storeId,
      schema: CANVASSASSIGN_SCHEMA.SCHEMA,
      addInterface: factory // add standard factory functions to this factory
    }),
    addrCanvsrLinkArgs = [factory.ADDR_CANVSR_LINKCANVASSER, factory.ADDR_CANVSR_LINKADDRESS],
    addrCanvsrCanvsrsArgs = [factory.ADDR_CANVSR_CANVASSERARRAY, factory.ADDR_CANVSR_CANVASSERLIST],
    addrCanvsrAddrsArgs = [factory.ADDR_CANVSR_ADDRESSARRAY, factory.ADDR_CANVSR_ADDRESSLIST],
    addrCanvsrObjArgs = addrCanvsrLinkArgs.concat(factory.ADDR_CANVSR_ADDRESSARRAY, factory.ADDR_CANVSR_CANVASSERARRAY),
    addrCanvsrListArgs = [factory.ADDR_CANVSR_CANVASSERLIST, factory.ADDR_CANVSR_ADDRESSLIST],
    addrCanvsrAllArgs = addrCanvsrObjArgs.concat(addrCanvsrListArgs);
  
  return factory;

  /* function implementation
    -------------------------- */

  function getCanvassAssignment () {
    /* https://docs.angularjs.org/api/ngResource/service/$resource
      default action of resource class:
        { 'get':    {method:'GET'},
          'save':   {method:'POST'},
          'query':  {method:'GET', isArray:true},
          'remove': {method:'DELETE'},
          'delete': {method:'DELETE'} };

      add custom update & multiple save methods
    */
    return $resource(baseURL + 'canvassassignment/:id', { id: '@id' },
                      {
                        'update': { method: 'PUT' },
                        'saveMany': { method: 'POST', isArray: true }
                      });
  }

  function getAssignmentCanvasses() {
    /* https://docs.angularjs.org/api/ngResource/service/$resource
      default action of resource class:
        { 'get':    {method:'GET'},
          'save':   {method:'POST'},
          'query':  {method:'GET', isArray:true},
          'remove': {method:'DELETE'},
          'delete': {method:'DELETE'} };
    */
    return $resource(baseURL + 'canvassassignment/canvasses');
  }

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

    con.debug('Read canvass assignment rsp object: ' + object);

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
  function storeRspObject (obj, args) {

    var subObjects, i, stdArgs;

    // store sub objects first
    if (args.subObj) {
      subObjects = miscUtilFactory.toArray(args.subObj);
      for (i = 0; i < subObjects.length; ++i) {
        stdArgs = resourceFactory.standardiseArgs(subObjects[i]);

        resourceFactory.storeSubDoc(obj, stdArgs, args);
      }
    }

    con.debug('Store canvass assignment response: ' + obj);

    // just basic storage args as subdocs have been processed above
    var storeArgs = resourceFactory.copyBasicStorageArgs(args, {
      factory: $injector.get(factory.NAME)
    });

    return resourceFactory.storeServerRsp(obj, storeArgs);
  }

  /**
   * Create storeFactory id
   * @param {string}   id   Factory id to generate storeFactory id from
   */
  function storeId (id) {
    return CANVASSASSIGN_SCHEMA.ID_TAG + id;
  }
  
  /**
   * Set the filter for a canvass assignment ResourceList object
   * @param {string} id     Factory id of object
   * @param   {object} [filter={}] Filter object to use, ResourceFilter object or no filter
   * @param {number} flags  storefactory flags
   * @returns {object} canvass assignment ResourceList object
   */
  function setFilter(id, filter, flags) {
    if (!filter) {
      filter = newFilter();
    }
    return resourceFactory.setFilter(storeId(id), filter, flags);
  }

  /**
   * Get the default sort options for a canvass assignment ResourceList object
   * @returns {object} canvass assignment ResourceList sort options
   */
  function getSortOptions() {
    return CANVASSASSIGN_SCHEMA.SORT_OPTIONS;
  }

  /**
   * Execute the callback on each of the schema fields
   */
  function forEachCanvassAssignSchemaField (callback) {
    CANVASSASSIGN_SCHEMA.SCHEMA.forEachField(callback);
  }
  
  /**
   * Get a new filter object
   * @param {object} base           filter base object
   * @param {function} customFilter custom filter function
   * @returns {object} canvass assignment ResourceList filter object
   */
  function newFilter(base, customFilter) {
    if (!customFilter) {
      customFilter = filterFunction;
    }
    var filter = filterFactory.newResourceFilter(CANVASSASSIGN_SCHEMA.SCHEMA, base);
    filter.customFunction = customFilter;
    return filter;
  }
  
  /**
   * Generate a filtered list
   * @param {object} reslist    canvass assignment ResourceList object to filter
   * @param {object} filter     filter to apply
   * @param {function} xtraFilter Function to provide additional filtering
   * @returns {Array} filtered list
   */
  function getFilteredList (reslist, filter, xtraFilter) {
    // canvass assignment specific filter function
    return filterFactory.getFilteredList('filterCanvassAssignment', reslist, filter, xtraFilter);
  }
  
  /**
   * Default canvass assignment ResourceList custom filter function
   * @param {object} reslist    canvass assignment ResourceList object to filter
   * @param {object} filter     filter to apply
   */
  function filterFunction(reslist, filter) {
    // canvass assignment specific filter function
    reslist.filterList = getFilteredList(reslist, filter);
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
    if (linkArg) {
      var i = 0,
        link = countProperties(addrCanvsrLinkArgs, linkArg),
        canvsrs = countProperties(addrCanvsrCanvsrsArgs, linkArg),
        addrs = countProperties(addrCanvsrAddrsArgs, linkArg),
        lists = {},
        addressToLink;
      
      // check have all the args
      if ((link === addrCanvsrLinkArgs.length) && (canvsrs >= 1) && (addrs >= 1)) {
        // have all link args and, canvassers & addresses to connect
        // response may be an array depending on query params
        miscUtilFactory.toArray(response).forEach(function (canvasserAssignment) {

          // get the objects
          addrCanvsrObjArgs.forEach(function (flag) {
            lists[flag] = [];
            miscUtilFactory.toArray(linkArg[flag]).forEach(function (objArg) {
              lists[flag].push(resourceFactory.getObjectInfo(canvasserAssignment, objArg).object);
            });
          });
          // get the lists
          addrCanvsrListArgs.forEach(function (flag) {
            lists[flag] = [];
            miscUtilFactory.toArray(linkArg[flag]).forEach(function (listArg) {
              miscUtilFactory.toArray(listArg.objId).forEach(function (objId) {
                lists[flag].push(listArg.factory.getList(objId));
              });
            });
          });

          // check have all the data
          link = countPropertiesLength(addrCanvsrLinkArgs, linkArg);
          canvsrs = countPropertiesLength(addrCanvsrCanvsrsArgs, linkArg);
          addrs = countPropertiesLength(addrCanvsrAddrsArgs, linkArg);
          if ((link === addrCanvsrLinkArgs.length) && (canvsrs >= 1) && (addrs >= 1)) {
            // have all the info i.e. canvasser whose alloc it is and the allocations in the canvass subdoc
            var canvasserToLink,
              linkCanvasserData = lists[factory.ADDR_CANVSR_LINKCANVASSER], // array of link canvasser
              linkAddressData = lists[factory.ADDR_CANVSR_LINKADDRESS],     // array of link canvasser's addresses
              linkCanvasserListArray = [],   // array of array's of canvassers
              linkAddressListArray = [];     // array of array's of addresses
            if (linkCanvasserData.length > 1) {
              throw new Error('Multiple link canvassers specified');
            }
            if (linkAddressData.length > 1) {
              throw new Error('Multiple link addresses specified');
            }

            addrCanvsrCanvsrsArgs.forEach(function (canvsrs) {
              if (lists[canvsrs].length) {
                linkCanvasserListArray.push(lists[canvsrs]);
              }
            });
            addrCanvsrAddrsArgs.forEach(function (addrs) {
              if (lists[addrs].length) {
                linkAddressListArray.push(lists[addrs]);
              }
            });

            linkCanvasserData.forEach(function (linkCanvasser) {
              if (linkCanvasser) {
                // find canvasser whose allocation it is in list of assigned canvassers
                linkCanvasserListArray.forEach(function (linkCanvasserListData) {
                  linkCanvasserListData.forEach(function (canvasserList) {
                    var canvsrFind;
                    if (canvasserList.isResourceList) {
                      canvsrFind = 'findInList';  // resource list find function
                    } else {
                      canvsrFind = 'find';        // Array find function
                    }
                    canvasserToLink = canvasserList[canvsrFind](function (canvsr) {
                      return (canvsr._id === linkCanvasser._id);
                    });
                    if (canvasserToLink) {

                      // save id of canvasser's allocation record
                      canvasserToLink.allocId = canvasserAssignment._id;

                      // find the allocated address in the list of assigned addresses
                      linkAddressData.forEach(function (linkAddressList) {
                        if (linkAddressList) {
                          linkAddressList.forEach(function (linkAddress) {
                            // find address to link in list of addresses
                            linkAddressListArray.forEach(function (linkAddressListData) {
                              linkAddressListData.forEach(function (addressList) {
                                var addrFind;
                                if (addressList.isResourceList) {
                                  addrFind = 'findInList';  // resource list find function
                                } else {
                                  addrFind = 'find';        // Array find function
                                }
                                addressToLink = addressList[addrFind](function (addr) {
                                  return (addr._id === linkAddress._id);
                                });
                                if (addressToLink) {
                                  linkCanvasserToAddr(canvasserToLink, addressToLink, labeller);
                                }
                              });
                            });
                          });
                        }
                      });
                    }
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
   * @param {object}   canvasser  Canvasser object to link
   * @param {object}   addr       Address object to link
   */
  function linkCanvasserToAddr (canvasser, addr, labeller) {
    if (!canvasser.addresses) {
      canvasser.addresses = [];
    }
    if (findAddrIndex(canvasser, addr) < 0) {
      canvasser.addresses.push(addr._id); // not in list so add
    }

    addr.canvasser = canvasser._id;
    addr.badge = getFirstLetters(canvasser.person.firstname) + 
                  getFirstLetters(canvasser.person.lastname);

    if (!canvasser.labelClass) {
      canvasser.labelClass = labeller();
    }
    addr.labelClass = canvasser.labelClass;
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
   * @param {object}   canvasser  Canvasser object to unlink
   * @param {object}   addr       Address object to unlink
   */
  function unlinkAddrFromCanvasser (canvasser, addr) {
    if (canvasser.addresses) {
      var idx = findAddrIndex(canvasser, addr);
      if (idx >= 0) {
        canvasser.addresses.splice(idx, 1); // remove from list
      }
    }
    delete addr.canvasser;
    delete addr.badge;
  }




}


/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac', ['ct.config', 'ui.router', 'ngResource', 'ngCordova', 'ui.bootstrap', 'NgDialogUtil', 'ct.clientCommon', 'chart.js'])

  .config(['$stateProvider', '$urlRouterProvider', 'STATES', 'MENUS', function ($stateProvider, $urlRouterProvider, STATES, MENUS) {

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
                controller  : 'UserController'
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
                controller  : 'ElectionController'
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
            templateUrl : 'views/home.html'
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
      });

    routes.forEach(function (route) {
      if (!STATES.ISDISABLED(route.state)) {
        $stateProvider.state(route.state, route.config);
      }
    });

    $urlRouterProvider.otherwise(otherwisePath);
  }]);

/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .controller('ContactController', ['$scope', function ($scope) {

    // function to initialise feedback object
    $scope.initFeedback = function () {
      $scope.feedback = {
        mychannel: '',
        firstName: '',
        lastName: '',
        agree: false,
        email: ''
      };

      $scope.invalidChannelSelection = false;
    };

    $scope.initFeedback();

    // function to log feedback object to console
    $scope.logFeedback = function (message) {
      console.log(message + ':');
      console.log($scope.feedback);
    };

    $scope.channels = [{value: 'tel', label: 'Tel.'}, {value: 'Email', label: 'Email'}];
  }])

  .controller('FeedbackController', ['$scope', 'feedbackFactory', function ($scope, feedbackFactory) {

    $scope.sendFeedback = function () {

      $scope.logFeedback('sendFeedback');

      if ($scope.feedback.agree && ($scope.feedback.mychannel === '')) {
        $scope.invalidChannelSelection = true;
        console.log('invalidChannelSelection');
      } else {
        // post comment to server
        feedbackFactory.putFeedback().save($scope.feedback)
          .$promise.then(
            // success function
            function (response) {
              // response is actual data

              // re-init for next comment entry
              $scope.initFeedback();

              $scope.feedbackForm.$setPristine();

              $scope.logFeedback('clearFeedback');
            },
            // error function
            function (response) {
              // reponse is message
              var message = 'Error saving feedback\n\n' +
                  'Error: ' + response.status + ' ' + response.statusText;
              alert(message);
            }
          );
      }
    };
  }])


  .controller('AboutController', ['$scope', function ($scope) {


  }]);




/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .service('menuFactory', ['$resource', 'baseURL', function ($resource, baseURL) {

    this.getDishes = function () {
      // need to update dishes with new comments, so need a custom PUT action as the default resource "class" object doesn't have one
      return $resource(baseURL + 'dishes/:id', null, {'update': {method: 'PUT'}});
    };


    // implement a function named getPromotion
    // that returns a selected promotion.

    this.getPromotion = function () {
      // only getting promos, so no need for a custom action as the default resource "class" object has get/query
      return $resource(baseURL + 'promotions/:id', null, null);
    };

  }])

  .factory('corporateFactory', ['$resource', 'baseURL', function ($resource, baseURL) {

    var corpfac = {};

    corpfac.getLeader = function () {
      // only getting leaders, so no need for a custom action as the default resource "class" object has get/query
      return $resource(baseURL + 'leadership/:id', null, null);
    };

    return corpfac;
  }])

  .factory('feedbackFactory', ['$resource', 'baseURL', function ($resource, baseURL) {

    var feedbackfac = {};

    feedbackfac.putFeedback = function () {
      // default resource "class" object contains a save method so no need for a custom action
      return $resource(baseURL + 'feedback/', null, null);
    };

    return feedbackfac;
  }]);



/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .constant('UTIL', (function() {
    var and = 'And',
      or = 'Or';
    return {
      SET_SEL: 's',
      CLR_SEL: 'c',
      TOGGLE_SEL: 't',

      OP_AND: and,
      OP_OR: or,
      OP_LIST: [and, or]
    };
  })())

  .factory('utilFactory', utilFactory);


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

utilFactory.$inject = ['$rootScope', 'miscUtilFactory', 'UTIL'];

function utilFactory ($rootScope, miscUtilFactory, UTIL) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    formatDate: formatDate,
    initSelected: initSelected,
    setSelected: setSelected,
    getSelectedList: getSelectedList,
    countSelected: countSelected,
    toggleSelection: toggleSelection,
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
   * Initialise the 'selected' property of all objects in an array
   * @param {Array}    list     Array of objects to initialise
   * @param {function} callback Optional function to call with each element
   */
  function initSelected(list, callback) {
    return setSelected(list, UTIL.CLR_SEL, callback);
  }
  
  /**
   * Set the 'selected' state of all the entries in the array
   * @param {Array}    list     Array to set
   * @param {boolean}  set      Value to set; one of UTIL.SET_SEL, UTIL.CLR_SEL or UTIL.TOGGLE_SEL
   * @param {function} callback Optional function to call with each element
   */
  function setSelected(list, set, callback) {
    var selCount = 0;
    if (list) {
      var forceSet = (set === UTIL.SET_SEL),
        forceClr = (set === UTIL.CLR_SEL),
        toggle = (set === UTIL.TOGGLE_SEL);
      if (forceSet || forceClr || toggle) {
        angular.forEach(list, function (entry) {
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
   * @param   {Array} fullList Array to extract selected items from
   * @returns {Array} Array of selected items
   */
  function getSelectedList (fullList) {
    var selectedList = [];

    angular.forEach(fullList, function (entry) {
      if (entry.isSelected) {
        selectedList.push(entry);
      }
    });
    return selectedList;
  }

  
  /**
   * Return number of 'selected' entries
   * @param   {Array} fullList Array to count selected items from
   * @returns {number} Number of selected items
   */
  function countSelected (fullList) {
    var count = 0;

    angular.forEach(fullList, function (entry) {
      if (entry.isSelected) {
        ++count;
      }
    });
    return count;
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
    // jic no native implementation is available
    miscUtilFactory.arrayPolyfill();
    
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
  .config(['MENUS', 'STATES', function (MENUS, STATES) {
    /* Unicode code point   UTF-8 literal   html
      U+00A0	             \xc2\xa0	       &nbsp; */
    var prop,
      tree, toCheck,
      dropdownNew = '\xA0\xA0\xA0New',
      configuration = 'Configuration',
      votingSysDash = 'Voting Systems',
      rolesDash = 'Roles',
      userDash = 'Users',
      campaign = 'Campaign',
      electionDash = 'Elections',
      candidateDash = 'Candidates',
      canvassDash = 'Canvasses',

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
                sref: STATES.CONFIG,
                substates: []
              }
            },
            { sref: STATES.VOTINGSYS,
              property: 'votingsys',
              value: {
                header: votingSysDash,
                items: [
                  { name: votingSysDash, sref: STATES.VOTINGSYS },
                  { name: dropdownNew, sref: STATES.VOTINGSYS_NEW }
                ]
              }
            },
            { sref: STATES.ROLES,
              property: 'roles',
              value: {
                header: rolesDash,
                items: [
                  { name: rolesDash, sref: STATES.ROLES },
                  { name: dropdownNew, sref: STATES.ROLES_NEW }
                ]
              }
            },
            { sref: STATES.USERS,
              property: 'users',
              value: {
                header: userDash,
                items: [
                  { name: userDash, sref: STATES.USERS },
                  { name: dropdownNew, sref: STATES.USERS_NEW }
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
                sref: STATES.CAMPAIGN,
                substates: []
              }
            },
            { sref: STATES.ELECTION,
              property: 'elections',
              value: {
                header: electionDash,
                items: [
                  { name: electionDash, sref: STATES.ELECTION },
                  { name: dropdownNew, sref: STATES.ELECTION_NEW }
                ]
              }
            },
            { sref: STATES.CANDIDATE,
              property: 'candidates',
              value: {
                header: candidateDash,
                items: [
                  { name: candidateDash, sref: STATES.CANDIDATE },
                  { name: dropdownNew, sref: STATES.CANDIDATE_NEW }
                ]
              }
            },
            { sref: STATES.CANVASS,
              property: 'canvass',
              value: {
                header: canvassDash,
                items: [
                  { name: canvassDash, sref: STATES.CANVASS },
                  { name: dropdownNew, sref: STATES.CANVASS_NEW }
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
            self.root.substates.push(entry.state);
          }
        }
      };
    };
    // start with basic entries
    tree = [
      { state: STATES.APP, name: 'Home' },
      { state: STATES.ABOUTUS, name: 'About' }
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
          { state: STATES.ELECTION, name: electionDash },
          { state: STATES.ELECTION_VIEW, name: 'View Election' },
          { state: STATES.ELECTION_EDIT, name: 'Update Election' },
          { state: STATES.ELECTION_NEW, name: 'New Election' }
        ]
      },
      { state: STATES.CANDIDATE, entries: [
          { state: STATES.CANDIDATE, name: candidateDash },
          { state: STATES.CANDIDATE_VIEW, name: 'View Candidate' },
          { state: STATES.CANDIDATE_EDIT, name: 'Update Candidate' },
          { state: STATES.CANDIDATE_NEW, name: 'New Candidate' }
        ]
      },
      { state: STATES.CANVASS, entries: [
          { state: STATES.CANVASS, name: canvassDash },
          { state: STATES.CANVASS_VIEW, name: 'View Canvass' },
          { state: STATES.CANVASS_EDIT, name: 'Update Canvass' },
          { state: STATES.CANVASS_NEW, name: 'New Canvass' }
        ]
      },
      { state: STATES.VOTINGSYS, entries: [
          { state: STATES.VOTINGSYS, name: votingSysDash },
          { state: STATES.VOTINGSYS_VIEW, name: 'View Voting System' },
          { state: STATES.VOTINGSYS_EDIT, name: 'Update Voting System' },
          { state: STATES.VOTINGSYS_NEW, name: 'New Voting System' }
        ]
      },
      { state: STATES.ROLES, entries: [
          { state: STATES.ROLES, name: rolesDash },
          { state: STATES.ROLES_VIEW, name: 'View Role' },
          { state: STATES.ROLES_EDIT, name: 'Update Role' },
          { state: STATES.ROLES_NEW, name: 'New Role' }
        ]
      },
      { state: STATES.USERS, entries: [
          { state: STATES.USERS, name: userDash },
          { state: STATES.USERS_VIEW, name: 'View User' },
          { state: STATES.USERS_EDIT, name: 'Update User' },
          { state: STATES.USERS_NEW, name: 'New User' }
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
  }])
  .controller('HeaderController', HeaderController);


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

HeaderController.$inject = ['$scope', '$state', '$rootScope', 'authFactory', 'stateFactory', 'NgDialogFactory', 'STATES', 'MENUS'];

function HeaderController ($scope, $state, $rootScope, authFactory, stateFactory, NgDialogFactory, STATES, MENUS) {

  $scope.status = {
    cfgIsOpen: false,
    cmpgnIsOpen: false
  };
  
  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.setLoggedIn = setLoggedIn;
  $scope.openLogin = openLogin;
  $scope.logOut = logOut;

  stateFactory.addInterface($scope);  // add stateFactory menthod to scope

  $scope.homeMenu = MENUS.HOME;
  $scope.aboutMenu = MENUS.ABOUT;
  $scope.contactMenu = MENUS.CONTACT;
  $scope.campaignMenu = MENUS.CAMPAIGN;
  $scope.configMenu = MENUS.CONFIG;


  makeBreadcrumb();
  $scope.setLoggedIn(false);

  $rootScope.$on('login:Successful', function () {
    $scope.setLoggedIn(true);
  });

  $rootScope.$on('registration:Successful', function () {
    $scope.setLoggedIn(true);
  });

  $rootScope.$on('$stateChangeSuccess',
    function (/* arguments not required so ignore
                event, toState, toParams, fromState, fromParams */){
      makeBreadcrumb();
  });


  /* function implementation
    -------------------------- */

  /**
   * Set logged in state
   * @param {boolean} loggedIn - logged in flag; false: force logged off state, true: state determined by authentication factory
   */
  function setLoggedIn(loggedIn) {
    if (!loggedIn) {
      $scope.loggedIn = false;
      $scope.username = '';
    } else {
      $scope.loggedIn = authFactory.isAuthenticated();
      $scope.username = authFactory.getUsername();
    }
  }

  function openLogin() {
    NgDialogFactory.open({ template: 'login/login.html', scope: $scope, className: 'ngdialog-theme-default', controller: 'LoginController' });
  }

  function logOut() {
    authFactory.logout(function (/*response*/) {
      $state.go('app');
    });
    $scope.setLoggedIn(false);
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

  var menuEntries = [];
  for (var prop in SUBMENU) {
    if (SUBMENU[prop].header) {
      menuEntries.push(SUBMENU[prop]);
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
    return $state.is(curstate);
  }

  function stateIsNot(curstate) {
    return !$state.is(curstate);
  }

  function stateIncludes(curstate) {
    return $state.includes(curstate);
  }

  function stateIsOneOf(states) {
    var isoneof = false;
    for (var i = 0; i < states.length; ++i) {
      if ($state.is(states[i])) {
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
            issub = $state.is(entry.substates[j]);
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

LoginController.$inject = ['$scope', '$rootScope', 'NgDialogFactory', 'authFactory', 'CONFIG'];

function LoginController($scope, $rootScope, NgDialogFactory, authFactory, CONFIG) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.doLogin = doLogin;
  $scope.doFacebookLogin = doFacebookLogin;
  $scope.openRegister = openRegister;

  $scope.loginData = authFactory.getUserinfo();

  $scope.devmode = CONFIG.DEV_MODE;
  if (CONFIG.DEV_MODE) {
    $scope.devCredentials = devCredentials;
  }

  /* function implementation
    -------------------------- */

  function loginSuccess (/*response*/) {
    $rootScope.$broadcast('login:Successful');
  }

  function loginFailure (/*response*/) {
    NgDialogFactory.error(response, 'Login Unsuccessful');
  }

  function doLogin() {
    if($scope.rememberMe) {
      authFactory.storeUserinfo($scope.loginData);
    } else {
      authFactory.removeUserinfo();
    }

    authFactory.login($scope.loginData, loginSuccess, loginFailure);

    NgDialogFactory.close();
  }

  function doFacebookLogin() {
    authFactory.loginByFacebook($scope.loginData, loginSuccess, loginFailure);
    NgDialogFactory.close();
  }

  function openRegister() {
    NgDialogFactory.open({ template: 'login/register.html', scope: $scope, className: 'ngdialog-theme-default', controller: 'RegisterController' });
  }

  // Quick hack for dev mode to enter user credentials
  function devCredentials() {
    // HACK username/password for dev
    $scope.loginData.username = CONFIG.DEV_USER;
    $scope.loginData.password = CONFIG.DEV_PASSWORD;
  }



}


RegisterController.$inject = ['$scope', '$rootScope', 'NgDialogFactory', 'authFactory'];

function RegisterController ($scope, $rootScope, NgDialogFactory, authFactory) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.doRegister = doRegister;

  $scope.register = {};
  $scope.loginData = {};


  /* function implementation
    -------------------------- */

  function doRegister() {
    console.log('Doing registration', $scope.registration);

    authFactory.register($scope.registration,
      // success functgion
      function (response) {
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

angular.module('canvassTrac')

  .controller('UserController', UserController)

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

UserController.$inject = ['$scope', '$rootScope', '$state', '$stateParams', 'roleFactory', 'userFactory', 'NgDialogFactory', 'stateFactory', 'utilFactory', 'miscUtilFactory', 'ADDRSCHEMA', 'PEOPLESCHEMA', 'STATES', 'UTIL'];

function UserController($scope, $rootScope, $state, $stateParams, roleFactory, userFactory, NgDialogFactory, stateFactory, utilFactory, miscUtilFactory, ADDRSCHEMA, PEOPLESCHEMA, STATES, UTIL) {

  console.log('UserController id', $stateParams.id);

  STATES.SET_SCOPE_VARS($scope, 'USERS');

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.userFilterOps = UTIL.OP_LIST;
  $scope.initUserFilter = initUserFilter;
  $scope.toggleSelection = toggleSelection;
  $scope.getTitle = getTitle;
  $scope.selectedCnt = 0;
  $scope.editDisabled = true;
  $scope.initUser = initUser;
  $scope.processForm = processForm;
  $scope.viewUser = viewUser;
  $scope.editUser = editUser;
  $scope.confirmDelete = confirmDelete;
  $scope.stateIs = stateFactory.stateIs;
  $scope.stateIsNot = stateFactory.stateIsNot;
  $scope.stateIncludes = stateFactory.stateIncludes;
  $scope.menuStateIs = stateFactory.menuStateIs;
  
  initUserFilter();
  initUser($stateParams.id);

  // get list of roles selecting name field, _id field is always provided
  $scope.roles = roleFactory.getRoles().query({fields: 'name'})
    .$promise.then(
      // success function
      function (response) {
        // response is actual data
        
        console.log(response);
        
        $scope.roles = response;
      },
      // error function
      function (response) {
        // response is message
        $scope.message = 'Error: ' + response.status + ' ' + response.statusText;
      }
    );

  $scope.users = userFactory.getUsers().query(
    // success function
    function (response) {
      // response is actual data
      $scope.users = response;
//        $scope.showMenu = true;
    },
    // error function
    function (response) {
      // repose is message
      $scope.message = 'Error: ' + response.status + ' ' + response.statusText;
    }
  );


  
  
  /* function implementation
  -------------------------- */

  function initUserFilter() {
    $scope.userFilterText = undefined;
    $scope.userFilterRole = undefined;
    $scope.userFilterOp = undefined;
    $scope.userSelectList = undefined;
    $scope.selectedCnt = utilFactory.initSelected($scope.users);
  }
  
  function toggleSelection(entry) {
    $scope.selectedCnt = utilFactory.toggleSelection(entry, $scope.selectedCnt);
    switch ($scope.selectedCnt) {
      case 1:
        if (entry.isSelected) {
          $scope.user = entry;
          break;
        }
        /* falls through */
      default:
        initUser();
        break;
    }
  }

  function getTitle() {
    $scope.editDisabled = true;

    var title;
    if ($state.is($scope.newState)) {
      title = 'Create User';
      $scope.editDisabled = false;
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
      $state.go($scope.dashState);
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
      $scope.user = userFactory.getUsers().get({id: id})
        .$promise.then(
          // success function
          function (response) {
            
            console.log('response', response);
            
            var user = {
              // from user model
              username: response.username,
              role: response.role._id,
              id: response._id
            };

            copyProperties(response.person, user, PEOPLESCHEMA.SCHEMA, [
                PEOPLESCHEMA.IDs.FNAME,
                PEOPLESCHEMA.IDs.LNAME,
                PEOPLESCHEMA.IDs.NOTE
              ]);
            copyProperties(response.person.address, user, ADDRSCHEMA.SCHEMA, [
                ADDRSCHEMA.IDs.ADDR1,
                ADDRSCHEMA.IDs.ADDR2,
                ADDRSCHEMA.IDs.ADDR3,
                ADDRSCHEMA.IDs.TOWN,
                ADDRSCHEMA.IDs.CITY,
                ADDRSCHEMA.IDs.COUNTY,
                ADDRSCHEMA.IDs.COUNTRY,
                ADDRSCHEMA.IDs.PCODE,
                ADDRSCHEMA.IDs.GPS
              ]);
            // TODO contactDetails schema & factory
//            copyProperties(response.person.contactDetails, user, schema, ids);

            if (response.person.contactDetails) {
              miscUtilFactory.copyProperties(response.person.contactDetails, user, [
                // from contactDetails model
                'phone', 'mobile', 'email', 'website', 'facebook', 'twitter'
                ]);
            }
            $scope.user = user;
          },
          // error function
          function (response) {
            // response is message
            NgDialogFactory.error(response, 'Unable to retrieve User');
          }
        );
    }
  }


  function copyProperties (from, to, schema, ids) {
    if (from) {
      var fields = [];
      ids.forEach(function (id) {
        fields.push(schema.getModelName(id));
      });
      miscUtilFactory.copyProperties(from, to, fields);
    }
  }


  function createUser() {

    console.log('createUser', $scope.user);

    userFactory.getUsers().save($scope.user)
      .$promise.then(
        // success function
        function (response) {
          $scope.initUser();
          $state.go($scope.dashState);
        },
        // error function
        function (response) {
          // response is message
          NgDialogFactory.error(response, 'Creation Unsuccessful');
        }
      );
  }

  function updateUser() {

    console.log('updateUser', $scope.user);

    userFactory.getUsers().update({id: $scope.user.id}, $scope.user)
      .$promise.then(
        // success function
        function (response) {
          $scope.initUser();
          $state.go($scope.dashState);
        },
        // error function
        function (response) {
          // response is message
          NgDialogFactory.error(response, 'Update Unsuccessful');
        }
      );
  }

  function viewUser() {
    $state.go($scope.viewState, {id: $scope.user._id});
  }

  function editUser() {
    $state.go($scope.editState, {id: $scope.user._id});
  }

  function confirmDelete() {
    $scope.userSelectList = [];

    angular.forEach($scope.users, function (user) {
      if (user.isSelected) {
        $scope.userSelectList.push(user);
      }
    });

    NgDialogFactory.open({ template: 'users/confirmdelete.html', scope: $scope, className: 'ngdialog-theme-default', controller: 'UserController' });
  }
  
  
}


/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .controller('ElectionController', ElectionController)

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

ElectionController.$inject = ['$scope', '$rootScope', '$state', '$stateParams', 'votingsystemFactory', 'electionFactory', 'NgDialogFactory', 'stateFactory', 'utilFactory', 'STATES', 'UTIL', 'ELECTIONSCHEMA', 'RESOURCE_CONST'];

function ElectionController($scope, $rootScope, $state, $stateParams, votingsystemFactory, electionFactory, NgDialogFactory, stateFactory, utilFactory, STATES, UTIL, ELECTIONSCHEMA, RESOURCE_CONST) {

  console.log('id', $stateParams.id);

  STATES.SET_SCOPE_VARS($scope, 'ELECTION');

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.filterOps = UTIL.OP_LIST;
  $scope.initFilter = initFilter;
  $scope.toggleSelection = toggleSelection;
  $scope.getTitle = getTitle;
  $scope.formatDate = utilFactory.formatDate;
//  $scope.initItem = initItem;
  $scope.processForm = processForm;
  $scope.viewItem = viewItem;
  $scope.editItem = editItem;
  $scope.deleteItem = deleteItem;
  $scope.dashDelete = dashDelete;
  $scope.confirmDelete = confirmDelete;
  $scope.gotoDash = gotoDash;
  $scope.stateIs = stateFactory.stateIs;
  $scope.stateIsNot = stateFactory.stateIsNot;
  $scope.stateIncludes = stateFactory.stateIncludes;
  $scope.menuStateIs = stateFactory.menuStateIs;
  $scope.stateIsOneOf = stateFactory.stateIsOneOf;
  $scope.stateIsNotOneOf = stateFactory.stateIsNotOneOf;

  
  // get list of systems selecting name field, _id field is always provided
  $scope.votingSystems = votingsystemFactory.getVotingSystems().query({fields: 'name'})
    .$promise.then(
      // success function
      function (response) {
        // response is actual data
        $scope.votingSystems = response;
      },
      // error function
      function (response) {
        // response is message
        $scope.message = 'Error: ' + response.status + ' ' + response.statusText;
      }
    );

  getElections();


  
  
  /* function implementation
  -------------------------- */

  function initFilter() {
    $scope.filterText = undefined;
    $scope.filterSystem = undefined;
    $scope.filterOp = undefined;
    $scope.selectedCnt = utilFactory.initSelected($scope.elections);
  }
  
  function toggleSelection(entry) {
    $scope.selectedCnt = utilFactory.toggleSelection(entry, $scope.selectedCnt);
    switch ($scope.selectedCnt) {
      case 1:
        if (entry.isSelected) {
          $scope.election = entry;
          break;
        }
        /* falls through */
      default:
        initItem();
        break;
    }
  }

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

  
  function getElections() {
    $scope.elections = electionFactory.getElections().query(
      // success function
      function (response) {
        // response is actual data
        $scope.elections = response;

        initFilter();
        initItem($stateParams.id);
      },
      // error function
      function (response) {
        // repose is message
        $scope.message = 'Error: ' + response.status + ' ' + response.statusText;
      }
    );
  }
  
  
  function processForm() {
    if ($state.is($scope.newState)) {
      createElection();
    } else if ($state.is($scope.viewState)) {
      $state.go($scope.dashState);
    } else if ($state.is($scope.editState)) {
      updateElection();
    }
  }

  function initItem(id) {
    if (!id) {
      // include only required fields
      $scope.election = ELECTIONSCHEMA.SCHEMA.getObject();
    } else {
      $scope.election = electionFactory.getElections().get({id: id})
        .$promise.then(
          // success function
          function (response) {
            
            console.log('response', response);
            
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

    console.log('createElection', $scope.election);

    electionFactory.getElections().save($scope.election)
      .$promise.then(
        // success function
        function (response) {
          initItem();
          $state.go($scope.dashState);
        },
        // error function
        function (response) {
          // response is message
          NgDialogFactory.error(response, 'Creation Unsuccessful');
        }
      );
  }

  function updateElection() {

    console.log('updateElection', $scope.election);

    electionFactory.getElections().update({id: $scope.election._id}, $scope.election)
      .$promise.then(
        // success function
        function (response) {
          initItem();
          $state.go($scope.dashState);
        },
        // error function
        function (response) {
          // response is message
          NgDialogFactory.error(response, 'Update Unsuccessful');
        }
      );
  }

  function viewItem() {
    $state.go($scope.viewState, {id: $scope.election._id});
  }

  function editItem() {
    $state.go($scope.editState, {id: $scope.election._id});
  }

  function deleteItem() {
    confirmDelete([$scope.election]);
  }
  
  function gotoDash() {
    $state.go($scope.dashState);
  }

  function dashDelete() {
    var selectedList = utilFactory.getSelectedList($scope.elections);
    confirmDelete(selectedList);
  }

  function confirmDelete(deleteList) {

    var dialog = NgDialogFactory.open({ template: 'election/confirmdelete.html', scope: $scope, className: 'ngdialog-theme-default', controller: 'ElectionController',
                  data: {list: deleteList}});
    
    dialog.closePromise.then(function (data) {
      if (!NgDialogFactory.isNgDialogCancel(data.value)) {
        // perform delete
        var delParams = {};
        angular.forEach(data.value, function (entry) {
          delParams[entry._id] = true;
        });

        electionFactory.getElections().delete(delParams)
          .$promise.then(
            // success function
            function (response) {
              if ($state.is($scope.dashState)) {
                getElections();
              } else {
                gotoDash();
              }
            },
            // error function
            function (response) {
              // response is message
              NgDialogFactory.error(response, 'Delete Unsuccessful');
            }
          );
      }
    });
  }

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

CanvassDashController.$inject = ['$scope', '$rootScope', '$state', 'canvassFactory', 'electionFactory', 'utilFactory', 'NgDialogFactory', 'stateFactory', 'STATES', 'UTIL'];

function CanvassDashController($scope, $rootScope, $state, canvassFactory, electionFactory, utilFactory, NgDialogFactory, stateFactory, STATES, UTIL) {

  STATES.SET_SCOPE_VARS($scope, 'CANVASS');

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.filterOps = UTIL.OP_LIST;
  $scope.initFilter = initFilter;
  $scope.toggleCanvassSel = toggleCanvassSel;
  $scope.viewItem = viewItem;
  $scope.editItem = editItem;
  $scope.deleteItem = deleteItem;
  $scope.dashDelete = dashDelete;
  $scope.confirmDeleteCanvass = confirmDeleteCanvass;
  $scope.gotoDash = gotoDash;
  $scope.stateIs = stateFactory.stateIs;
  $scope.stateIsNot = stateFactory.stateIsNot;
  $scope.stateIncludes = stateFactory.stateIncludes;
  $scope.menuStateIs = stateFactory.menuStateIs;
  $scope.stateIsOneOf = stateFactory.stateIsOneOf;
  $scope.stateIsNotOneOf = stateFactory.stateIsNotOneOf;

  // get list of elections selecting name field, _id field is always provided
  $scope.elections = electionFactory.getElections().query({fields: 'name'})
    .$promise.then(
      // success function
      function (response) {
        // response is actual data
        $scope.elections = response;
      },
      // error function
      function (response) {
        // response is message
        $scope.message = 'Error: ' + response.status + ' ' + response.statusText;
      }
    );
  
  getCanvasses();

  
  
  /* function implementation
  -------------------------- */

  function initFilter() {
    $scope.filterText = undefined;
    $scope.filterElection = undefined;
    $scope.filterOp = undefined;
    $scope.selectedCnt = utilFactory.initSelected($scope.canvasses);
  }
  
  
  function toggleCanvassSel(entry) {
    $scope.selectedCnt = utilFactory.toggleSelection(entry, $scope.selectedCnt);
    switch ($scope.selectedCnt) {
      case 1:
        if (entry.isSelected) {
          $scope.canvass = entry;
          break;
        }
        /* falls through */
      default:
        initCanvass();
        break;
    }
  }

  function getCanvasses() {
    $scope.canvasses = canvassFactory.getCanvasses().query(
      // success function
      function (response) {
        // response is actual data
        $scope.canvasses = response;

        initFilter();
        initCanvass();
      },
      // error function
      function (response) {
        // repose is message
        $scope.message = 'Error: ' + response.status + ' ' + response.statusText;
      }
    );
  }
  

  function setCanvass(canvass) {
    $scope.canvass = canvass;
  }

  function initCanvass() {
    // include only required fields
    setCanvass({
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      election: ''
//        _id: ''
    });
  }

  function viewItem () {
    $state.go($scope.viewState, {id: $scope.canvass._id});
  }

  function editItem () {
    $state.go($scope.editState, {id: $scope.canvass._id});
  }

  function deleteItem () {
    confirmDeleteCanvass([$scope.canvass]);
  }
  
  function gotoDash () {
    $state.go($scope.dashState);
  }

  function dashDelete() {
    var selectedList = utilFactory.getSelectedList($scope.canvasses);
    confirmDeleteCanvass(selectedList);
  }


  function confirmDelete (dialogOpts, onClose) {

    var dialog = NgDialogFactory.open(dialogOpts);
    
    dialog.closePromise.then(function (data) {
      if (!NgDialogFactory.isNgDialogCancel(data.value)) {
        // perform delete
        onClose(data);
      }
    });
  }
  
  function confirmDeleteCanvass (deleteList) {

    confirmDelete (
      {template: 'canvasses/confirmdelete_canvass.html', 
        scope: $scope, className: 'ngdialog-theme-default', 
        controller: 'CanvassDashController', data: {list: deleteList}},
      function (data) {
        // perform delete
        var delParams = {};
        angular.forEach(data.value, function (entry) {
          delParams[entry._id] = true;
        });

        canvassFactory.getCanvasses().delete(delParams)
          .$promise.then(
            // success function
            function (response) {
              if ($state.is($scope.dashState)) {
                getCanvasses();
              } else {
                gotoDash();
              }
            },
            // error function
            function (response) {
              NgDialogFactory.error(response, 'Delete Unsuccessful');
            }
          );
      });
  }
  

  
  
  
}


/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .constant('LABELS', (function () {
    return ['label-primary',
      'label-success',
      'label-info',
      'label-warning',
      'label-danger'
      ];
  })())
  .value('LABELIDX', 0)
  .controller('CanvassController', CanvassController);


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

CanvassController.$inject = ['$scope', '$rootScope', '$state', '$stateParams', '$filter', '$injector', 'canvassFactory', 'canvassAssignmentFactory', 'canvassResultFactory', 'electionFactory', 'surveyFactory', 'addressFactory', 'questionFactory', 'userFactory', 'NgDialogFactory', 'stateFactory', 'utilFactory', 'miscUtilFactory', 'pagerFactory', 'storeFactory', 'resourceFactory', 'RES', 'roleFactory', 'ROLES', 'STATES', 'LABELS', 'LABELIDX', 'SCHEMA_CONST', 'CANVASSSCHEMA', 'SURVEYSCHEMA', 'CANVASSRES_SCHEMA', 'CANVASSASSIGN_SCHEMA', 'ADDRSCHEMA', 'RESOURCE_CONST', 'QUESTIONSCHEMA', 'CHARTS'];

function CanvassController($scope, $rootScope, $state, $stateParams, $filter, $injector, canvassFactory, canvassAssignmentFactory, canvassResultFactory, electionFactory, surveyFactory, addressFactory, questionFactory, userFactory, NgDialogFactory, stateFactory, utilFactory, miscUtilFactory, pagerFactory, storeFactory, resourceFactory, RES, roleFactory, ROLES, STATES, LABELS, LABELIDX, SCHEMA_CONST, CANVASSSCHEMA, SURVEYSCHEMA, CANVASSRES_SCHEMA, CANVASSASSIGN_SCHEMA, ADDRSCHEMA, RESOURCE_CONST, QUESTIONSCHEMA, CHARTS) {

  console.log('CanvassController id', $stateParams.id);

  STATES.SET_SCOPE_VARS($scope, 'CANVASS');
  $scope.tabs = {
    CANVASS_TAB: 0,
    SURVEY_TAB: 1,
    ADDRESS_TAB: 2,
    CANVASSER_TAB: 3,
    ASSIGNMENT_TAB: 4,
    RESULT_TAB: 5,
    ALL_TABS: 6
  };
  $scope.firstTab = $scope.tabs.CANVASS_TAB;
  if (showTab($scope.tabs.RESULT_TAB)) {
    $scope.lastTab = $scope.tabs.RESULT_TAB;
  } else {
    $scope.lastTab = $scope.tabs.ASSIGNMENT_TAB;
  }
  $scope.activeTab = $scope.firstTab;
  
  var TAB_BITS = [0];
  for (var prop in $scope.tabs) {
    var bit = (1 << $scope.tabs[prop]);
    if ($scope.tabs[prop] !== $scope.tabs.ALL_TABS) {
      TAB_BITS.push(bit);
      TAB_BITS[0] += bit;
    }
  }
  TAB_BITS.push(TAB_BITS.shift());  // first shall be last

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.getTitle = getTitle;
  $scope.showButton = showButton;
  $scope.changeState = changeState;
  $scope.showTab = showTab;
  $scope.initTab = initTab;
  $scope.formatDate = utilFactory.formatDate;
  $scope.processForm = processForm;
  $scope.processSurvey = processSurvey;
  $scope.gotoDash = gotoDash;
  $scope.nextTab = nextTab;
  $scope.prevTab = prevTab;
  $scope.stateIs = stateFactory.stateIs;
  $scope.stateIsNot = stateFactory.stateIsNot;
  $scope.stateIncludes = stateFactory.stateIncludes;
  $scope.menuStateIs = stateFactory.menuStateIs;
  $scope.stateIsOneOf = stateFactory.stateIsOneOf;
  $scope.stateIsNotOneOf = stateFactory.stateIsNotOneOf;
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
  $scope.confirmDelete = confirmDelete;
  $scope.requestCanvasserRole = requestCanvasserRole;
  $scope.getSurveyRspOptions = getSurveyRspOptions;

  canvassFactory.setLabeller(labeller);

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
                  utilFactory.initSelected($scope.survey.questions);
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

  function showButton (forState) {
    var show = false;
    if ($state.is($scope.newState)) {
      // no buttons in newState
    } else if ($state.is($scope.viewState)) {
      switch (forState) {
        case $scope.newState:
        case $scope.editState:
        case $scope.delState:
          show = true;  // show new/edit/del
          break;
      }
    } else if ($state.is($scope.editState)) {
      switch (forState) {
        case $scope.newState:
        case $scope.viewState:
        case $scope.delState:
          show = true;  // show new/view/del
          break;
      }
    }
    return show;
  }

  function changeState (toState) {
    var to = toState,
      params;
    if (toState === $scope.newState) {
      // TODO add save changes check
    } else if (toState === $scope.viewState) {
      // TODO add save changes check
      params = {id: $scope.canvass._id};
    } else if (toState === $scope.editState) {
      params = {id: $scope.canvass._id};
    } else if (toState === $scope.delState) {
      // TODO delState
      to = undefined;
    }
    if (to) {
      $state.go(to, params);
    }
  }

  
  function showTab (tab) {
    var show = true;
    if ($state.is($scope.newState) || $state.is($scope.editState)) {
      if (tab === $scope.tabs.RESULT_TAB) {
        show = false; // no results in new mode
      }
    }
    return show;
  }


  function processForm () {
    if ($state.is($scope.newState) || $state.is($scope.editState)) {
      // depending on timing of responses from host, $scope.canvass may not be set, so get local copy
      var canvass = canvassFactory.getObj(RES.ACTIVE_CANVASS),
        action = ($state.is($scope.newState) ? RES.PROCESS_NEW : RES.PROCESS_UPDATE),
        resList;
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
          resList = addressFactory.getList(RES.ASSIGNED_ADDR);
          if (resList) {
            canvass.addresses = extractIds(resList);
          }
          processCanvass(RES.PROCESS_UPDATE, requestAssignmentsNextTab);
          break;
        case $scope.tabs.CANVASSER_TAB:
          // generate canvasser list for host
          resList = userFactory.getList(RES.ASSIGNED_CANVASSER);
          if (resList) {
            canvass.canvassers = extractIds(resList);
          }
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
  }

  function initItem(id) {
    if (!id) {
      init();
      initTab($scope.tabs.ALL_TABS);
    } else {
      $scope.canvass = canvassFactory.getCanvasses().get({id: id})
        .$promise.then(
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

  function getCanvassRspOptions (schema, flags, next, custom) {

    var args = checkArgs('canvassFactory', schema, flags, next, custom),
      addrObjId,
      canvsrObjId;

    if (!miscUtilFactory.isEmpty(args.schema) && args.schema.schema &&
        (args.schema.schema.name === CANVASSASSIGN_SCHEMA.SCHEMA.name)) {
      // for canvass assignment processing so only want allocated addr/canvasser
      addrObjId = RES.ALLOCATED_ADDR;
      canvsrObjId = RES.ALLOCATED_CANVASSER;
    } else {
      // for canvass processing
      addrObjId = [RES.ASSIGNED_ADDR, RES.ALLOCATED_ADDR];
      canvsrObjId = [RES.ASSIGNED_CANVASSER, RES.ALLOCATED_CANVASSER];
    }

    var addrOpts = getRspAddressOptions(addrObjId, {
        schema: CANVASSSCHEMA.SCHEMA,
        schemaId: CANVASSSCHEMA.IDs.ADDRESSES,
      }, (args.flags | storeFactory.COPY_SET)),  // make copy of addresses
      canvsrOpts = getRspCanvasserOptions(canvsrObjId, {
        schema: CANVASSSCHEMA.SCHEMA,
        schemaId: CANVASSSCHEMA.IDs.CANVASSERS,
      }, (args.flags | storeFactory.COPY_SET)),  // make copy of canvassers
      resltsOpts = getRspResultOptions(RES.CANVASS_RESULT, {
        schema: CANVASSSCHEMA.SCHEMA,
        schemaId: CANVASSSCHEMA.IDs.RESULTS,
      }, (args.flags | storeFactory.COPY_SET)),   // make copy of results
    rspOptions = {
      objId: [RES.ACTIVE_CANVASS,  RES.BACKUP_CANVASS],
      factory: args.factory,
      schema: args.schema.schema,
      schemaId: args.schema.schemaId,
      storage: RESOURCE_CONST.STORE_OBJ,
      flags: args.flags,
      next: args.next,
      subObj: [
        // storage arguments for specific sub sections of survey info
        { // storage info for election
          objId: RES.ACTIVE_ELECTION, // id of election object to save response data to
          schema: CANVASSSCHEMA.SCHEMA,
          schemaId: CANVASSSCHEMA.IDs.ELECTION,
          //type/path/storage/factory: can be retrieved using schema & schemaId
          flags: args.flags
        },
        // storage info for survey
        getSurveyRspOptions({
          schema: CANVASSSCHEMA.SCHEMA,
          schemaId: CANVASSSCHEMA.IDs.SURVEY
        }, args.flags),
        // storage info for addresses
        addrOpts,
        // storage info for canvassers
        canvsrOpts,
        // storage info for results
        resltsOpts
      ]
    };

    // mark address & result objects for linking
    addrOpts[canvassFactory.ADDR_RES_LINKADDRESS] = true;
    resltsOpts[canvassFactory.ADDR_RES_LINKRESULT] = true;

    // mark question & result objects for linking
    resltsOpts[canvassFactory.QUES_RES_LINKRES] = true;
    // questions are in survey

    // mark address & canvasser objects for linking
    addrOpts[canvassAssignmentFactory.ADDR_CANVSR_ADDRESSLIST] = true;
    canvsrOpts[canvassAssignmentFactory.ADDR_CANVSR_CANVASSERLIST] = true;

    if (args.custom) {
      // add custom items
      miscUtilFactory.copyProperties(args.custom, rspOptions);
    }

    return rspOptions;
  }

  function getRspAddressOptions (objId, schema, flags, next, custom) {
    // storage info for addresses
    return getRspOptionsObject(objId, 'addressFactory', schema, flags, next, custom);
  }

  function getRspCanvasserOptions (objId, schema, flags, next, custom) {
    // storage info for canvassers
    return getRspOptionsObject(objId, 'userFactory', schema, flags, next, custom);
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

    var optObj = getRspOptionsObject(objId, 'canvassResultFactory', subObj, schema, flags, next);
    optObj.customArgs = {
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
    };
    return optObj;
  }

  function getRspOptionsObject(objId, factory, subObj, schema, flags, next, custom) {
    var args = checkArgs(factory, subObj, schema, flags, next, custom);
    return { // storage info for results
      objId: objId,
      factory: args.factory,
      schema: args.schema.schema,
      schemaId: args.schema.schemaId,
      //type/path/storage/factory: can be retrieved using schema & schemaId
      subObj: args.subObj,
      flags: args.flags,
      next: args.next,
      custom: args.custom
    };
  }

  function checkArgs (factory, subObj, schema, flags, next, custom) {
    if (!angular.isString(factory)) {
      custom = next;
      next = flags;
      flags = schema;
      schema = subObj;
      subObj = factory;
      factory = undefined;
    }
    if (!angular.isArray(subObj)) {
      custom = next;
      next = flags;
      flags = schema;
      schema = subObj;
      subObj = undefined;
    }
    if (!angular.isObject(schema)) {
      custom = next;
      next = flags;
      flags = schema;
      schema = {};
    }
    if (!angular.isNumber(flags)) {
      custom = next;
      next = flags;
      flags = storeFactory.NOFLAG;
    }
    if (!angular.isFunction(next)) {
      custom = next;
      next = undefined;
    }
    return {
      factory: factory, schema: schema, subObj: subObj,
      flags: flags, next: next, custom: custom
    };
  }

  function getSurveyRspOptions (schema, flags, next) {
    var args = checkArgs('surveyFactory', schema, flags, next),
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

    return {
      // storage info for survey
      objId: [RES.ACTIVE_SURVEY, RES.BACKUP_SURVEY],
      factory: args.factory,
      schema: args.schema.schema,
      schemaId: args.schema.schemaId,
      //type/path/storage: can be retrieved using schema & schemaId
      storage: RESOURCE_CONST.STORE_OBJ,
      flags: args.flags,
      next: args.next,
      subObj: subObj
    };
  }



  function labeller () {
    return LABELS[LABELIDX++ % LABELS.length];
  }

  function processCanvassAllocationRsp (response, flags, next) {

    if (typeof flags !== 'number') {
      next = flags;
      flags = storeFactory.NOFLAG;
    }
    if (typeof next !== 'function') {
      next = undefined;
    }

    // TODO currently only support single assignment
//    var toProcess = response;
//    if (Array.isArray(response)) {
//      toProcess = response[0];
//    }
//    if (toProcess) {
      canvassAssignmentFactory.readResponse(response,
                                            getAssignmentRspOptions(flags, next));
//    }
  }

  function getAssignmentRspOptions (schema, flags, next) {
    var args = checkArgs(schema, flags, next),
      custom = {
        processArg: RESOURCE_CONST.PROCESS_READ,  // argument only for use during read
      },
      addrOpts = getRspAddressOptions(undefined /*RES.ALLOCATED_ADDR*/, {
          schema: CANVASSASSIGN_SCHEMA.SCHEMA,
          schemaId: CANVASSASSIGN_SCHEMA.IDs.ADDRESSES,
        }, (args.flags | storeFactory.COPY_SET),  // make copy of addresses
        custom),
      canvsrOpts = getRspCanvasserOptions(undefined /*RES.ALLOCATED_CANVASSER*/, {
          schema: CANVASSASSIGN_SCHEMA.SCHEMA,
          schemaId: CANVASSASSIGN_SCHEMA.IDs.CANVASSER,
        }, (args.flags | storeFactory.COPY_SET),  // make copy of canvasser
        custom);

    // mark address & canvasser objects for linking
    addrOpts[canvassAssignmentFactory.ADDR_CANVSR_LINKADDRESS] = true;
    canvsrOpts[canvassAssignmentFactory.ADDR_CANVSR_LINKCANVASSER] = true;

    return {
      // no objId as don't need to save the assignments response
      flags: args.flags,
      next: args.next,
      subObj: [
          // storage info for canvasser
          canvsrOpts,
          // storage info for addresses
          addrOpts,
          // storage info for canvass
          getCanvassRspOptions({
            schema: CANVASSASSIGN_SCHEMA.SCHEMA,
            schemaId: CANVASSASSIGN_SCHEMA.IDs.CANVASS
          }, args.flags, custom)
      ],
      linkAddressAndCanvasser: {
        labeller: labeller
      }
    };
  }



  
  function requestAssignments (next) {
    // depending on timing of responses from host, $scope.canvass may not be set, so get local copy
    var canvass = canvassFactory.getObj(RES.ACTIVE_CANVASS),
      resource = canvassAssignmentFactory.getCanvassAssignment();

    resource.query({canvass: canvass._id}).$promise.then(
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
      backupCanvass = canvassFactory.getObj(RES.BACKUP_CANVASS),
      resource = canvassFactory.getCanvasses(),
      promise;

    console.log('processCanvass', canvass);
    
    if (action === RES.PROCESS_NEW) {
      promise = resource.save(canvass).$promise;
    } else if (action === RES.PROCESS_UPDATE) {
      var modified = !angular.equals(backupCanvass, canvass);

      console.log('updateCanvass', modified);

      if (modified) {   // object was modified
        promise = resource.update({id: canvass._id}, canvass).$promise;
      } else {  // not modified so proceed to next tab
        nextTab();
      }
    }
    
    if (promise) {
      var errorFxn = getErrorFxn(action);

      promise.then(
        // success function
        function (response) {
          processCanvassRsp(response,
                            (storeFactory.CREATE_INIT | storeFactory.APPLY_FILTER),
                            next);
        },
        // error function
        errorFxn
      );
    }
  }
  
  function processAllocations (action, next) {

    // depending on timing of responses from host, $scope.canvass may not be set, so get local copy
    var canvass = canvassFactory.getObj(RES.ACTIVE_CANVASS),
      canvassers = userFactory.getList(RES.ALLOCATED_CANVASSER),
      resource = canvassAssignmentFactory.getCanvassAssignment(),
      newAllocs = [],
      promises = [];
    
    canvassers.list.forEach(function (canvasser) {
      
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
        promises.push(resource.update({id: canvasser.allocId}, {
            addresses: canvasser.addresses
          }).$promise);
      }
    });
    
    if (newAllocs.length) {
      resource.saveMany(newAllocs).$promise.then(
        // success function
        function (response) {
          processCanvassAllocationRsp(response, next);
        },
        // error function
        creationError
      );
    }
    if (promises.length) {
      promises.forEach(function (promise) {
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
  
  function extractIds (resList) {
    var idArray = [];
    resList.list.forEach(function (entry) {
      idArray.push(entry._id);
    });
    return idArray;
  }

  function processSurvey (action, next) {
    // depending on timing of responses from host, $scope.canvass may not be set, so get local copy
    var canvass = canvassFactory.getObj(RES.ACTIVE_CANVASS),
      survey = surveyFactory.getObj(RES.ACTIVE_SURVEY),
      backupSurvey = surveyFactory.getObj(RES.BACKUP_SURVEY),
      resource = surveyFactory.getSurveys(),
      promise;
    
    console.log('processSurvey', survey);

    if ((action === RES.PROCESS_NEW) || (action === RES.PROCESS_UPDATE_NEW)) {
      promise = resource.save(survey).$promise;
    } else if (action === RES.PROCESS_UPDATE) {
      var modified = !angular.equals(backupSurvey, survey);

      console.log('updateSurvey', modified);

      if (modified) {   // object was modified
        promise = resource.update({id: survey._id}, survey).$promise;
      } else {  // not modified so proceed to next
        if (next) {
          next();
        }
      }
    }

    if (promise) {
      var errorFxn = getErrorFxn(action);

      promise.then(
        // success function
        function (response) {
          survey = surveyFactory.readResponse(response, getSurveyRspOptions());
          if (!canvass.survey) {
            // link survey to canvass (TODO should really be in the original request)
            canvass.survey = survey._id;
            processCanvass(RES.PROCESS_UPDATE, next);
          } else {  // have survey already so proceed to next
            if (next) {
              next();
            }
          }
        },
        // error function
        errorFxn
      );
    }
  }

  function gotoDash () {
    $state.go($scope.dashState);
  }

  function confirmDelete (dialogOpts, onClose) {

    var dialog = NgDialogFactory.open(dialogOpts);
    
    dialog.closePromise.then(function (data) {
      if (!NgDialogFactory.isNgDialogCancel(data.value)) {
        // perform delete
        onClose(data);
      }
    });
  }
  
  
  function nextTab () {
    if ($scope.activeTab < $scope.lastTab) {
      $scope.activeTab += 1;
    }
  }

  function prevTab () {
    if ($scope.activeTab > $scope.firstTab) {
      $scope.activeTab -= 1;
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
    // jic no native implementation is available
    miscUtilFactory.arrayPolyfill();
    
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
      ctrl.selCount = utilFactory.toggleSelection(entry, ctrl.selCount);
    }
  }
  
  function setItemSel (ctrl, set) {
    if (ctrl) {
      ctrl.selCount = utilFactory.setSelected(ctrl.list, set);
    }
  }

  function requestCanvasserRole (next) {
    $scope.canvasser = roleFactory.getRoles().query({level: ROLES.ROLE_CANVASSER})
      .$promise.then(
        // success function
        function (response) {
          // response is actual data
          $scope.canvasser = response;
          if (next) {
            next();
          }
        },
        // error function
        function (response) {
          // response is message
          $scope.message = 'Error: ' + response.status + ' ' + response.statusText;
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

CanvassCanvassController.$inject = ['$scope', '$rootScope', '$state', '$stateParams', '$filter', 'canvassFactory', 'electionFactory', 'RES'];

function CanvassCanvassController($scope, $rootScope, $state, $stateParams, $filter, canvassFactory, electionFactory, RES) {

  console.log('CanvassCanvassController id', $stateParams.id);

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033

  // get list of elections selecting name field, _id field is always provided
  $scope.elections = electionFactory.getElections().query({fields: 'name'})
    .$promise.then(
      // success function
      function (response) {
        // response is actual data
        $scope.elections = response;
      },
      // error function
      function (response) {
        // response is message
        $scope.message = 'Error: ' + response.status + ' ' + response.statusText;
      }
    );
  

  $scope.canvass = canvassFactory.getObj(RES.ACTIVE_CANVASS);

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

CanvassSurveyController.$inject = ['$scope', '$rootScope', '$state', '$stateParams', '$filter', 'canvassFactory', 'electionFactory', 'surveyFactory', 'questionFactory', 'addressFactory', 'NgDialogFactory', 'stateFactory', 'utilFactory', 'UTIL', 'RES'];

function CanvassSurveyController($scope, $rootScope, $state, $stateParams, $filter, canvassFactory, electionFactory, surveyFactory, questionFactory, addressFactory, NgDialogFactory, stateFactory, utilFactory, UTIL, RES) {

  console.log('CanvassSurveyController id', $stateParams.id);

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.toggleQuestionSel = toggleQuestionSel;
  $scope.questionDelete = questionDelete;
  $scope.questionSelClear = questionSelClear;
  $scope.questionSelAll = questionSelAll;
  $scope.confirmDeleteQuestion = confirmDeleteQuestion;
  $scope.openQuestion = openQuestion;
  $scope.getQuestionTypeName = questionFactory.getQuestionTypeName;
  $scope.showQuestionOptions = questionFactory.showQuestionOptions;
  $scope.onSurveyChange = onSurveyChange;

  $scope.canvass = canvassFactory.getObj(RES.ACTIVE_CANVASS);
  $scope.survey = surveyFactory.getObj(RES.ACTIVE_SURVEY);
  $scope.questions = questionFactory.getList(RES.SURVEY_QUESTIONS);

  
  /* function implementation
  -------------------------- */

  function toggleQuestionSel (entry) {
    $scope.selQuestionCnt = utilFactory.toggleSelection(entry, $scope.selQuestionCnt);
  }

  function haveSurveyQuestions () {
    return ($scope.survey && $scope.questions.count);
  }

  function questionSelClear () {
    if (haveSurveyQuestions()) {
      $scope.selQuestionCnt = utilFactory.setSelected($scope.questions.list, UTIL.CLR_SEL);
    }
  }

  function questionSelAll () {
    if (haveSurveyQuestions()) {
      $scope.selQuestionCnt = utilFactory.setSelected($scope.questions.list, UTIL.SET_SEL);
    }
  }


  function questionDelete () {
    if (haveSurveyQuestions()) {
      var selectedList = utilFactory.getSelectedList($scope.questions.list);
      confirmDeleteQuestion(selectedList);
    }
  }


  function confirmDeleteQuestion (deleteList) {

    $scope.confirmDelete (
      {template: 'canvasses/confirmdelete_question.html', 
        scope: $scope, className: 'ngdialog-theme-default', 
        controller: 'CanvassSurveyController', data: {list: deleteList}},
      function (data) {
        // perform delete
        var delParams = {},
          idx,
          updatedSurvey = angular.copy($scope.survey);
        angular.forEach(data.value, function (entry) {
          delParams[entry._id] = true;

          idx = updatedSurvey.questions.findIndex(function (ques) {
            return (ques === entry._id);
          });
          if (idx >= 0) {
            updatedSurvey.questions.splice(idx, 1);
          }
        });

        questionFactory.getQuestions().delete(delParams)
          .$promise.then(
            // success function
            function (response) {
              // update survey's list of questions
              surveyFactory.getSurveys().update({id: updatedSurvey._id}, updatedSurvey)
                .$promise.then(
                  // success function
                  function (response) {
                    surveyFactory.readResponse(response, $scope.getSurveyRspOptions());

                    $scope.selQuestionCnt = utilFactory.countSelected($scope.questions.list);
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
    if (action === 'new') {
      qdata = {};
    } else if ((action === 'view') || (action == 'edit')) {
      
      for (var i = 0; i < $scope.questions.list.length; ++i) {
        if ($scope.questions.list[i].isSelected) {
          qdata = angular.copy($scope.questions.list[i]);
          // change qdata.type to a question type object as expected by dialog
          qdata.type = questionFactory.getQuestionTypeObj(qdata.type);
          // set numoptions as that's not part of the model but needed by dialog
          qdata.numoptions = 0;
          if (qdata.type.showOptions && qdata.options) {
            qdata.numoptions = qdata.options.length;
          }
          break;
        }
      }
    } 

    var dialog = NgDialogFactory.open({ template: 'surveys/question.html', scope: $scope, className: 'ngdialog-theme-default', controller: 'QuestionController', 
                	data: {action: action, question: qdata},
									resolve: {
										questionTypes: function depFactory() {
											return questionFactory.getQuestionTypes();
										}
									}});

    dialog.closePromise.then(function (data) {
      if (!NgDialogFactory.isNgDialogCancel(data.value)) {

        var resource = questionFactory.getQuestions();

        // dialog returns question type object, only need the type value for the server
        data.value.question.type = data.value.question.type.type;
        
        if (data.value.action === 'new') {
          resource.save(data.value.question)
            .$promise.then(
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
                $scope.processSurvey(surveyProc);
              },
              // error function
              function (response) {
                NgDialogFactory.error(response, 'Creation Unsuccessful');
              }
            );
        } else if (data.value.action === 'edit') {
          resource.update({id: data.value.question._id}, data.value.question)
            .$promise.then(
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
        
        // clear selected question list
//        initSelected($scope.survey.questions);
      }
    });

  }

  function onSurveyChange () {
    /* save the updated survey to the store, as processSurvey in the parent
      controller doesn't see the changes to name & description.
      Something to do with scopes? */
    surveyFactory.setObj(RES.ACTIVE_SURVEY, $scope.survey);
  }
  
  
}



/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .controller('CanvassAddressController', CanvassAddressController);



/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

CanvassAddressController.$inject = ['$scope', '$rootScope', '$state', '$stateParams', '$filter', 'canvassFactory', 'electionFactory', 'surveyFactory', 'addressFactory', 'NgDialogFactory', 'stateFactory', 'utilFactory', 'pagerFactory', 'storeFactory', 'resourceFactory', 'RES'];

function CanvassAddressController($scope, $rootScope, $state, $stateParams, $filter, canvassFactory, electionFactory, surveyFactory, addressFactory, NgDialogFactory, stateFactory, utilFactory, pagerFactory, storeFactory, resourceFactory, RES) {

  console.log('CanvassAddressController id', $stateParams.id);

  var MAX_DISP_PAGE = 5;

//  $scope.sortOptions = addressFactory.getSortOptions();
  
  $scope.perPageOpt = [5, 10, 15, 20];
  $scope.perPage = 10;

  setupGroup(RES.ASSIGNED_ADDR, 'Assigned');
  setupGroup(RES.UNASSIGNED_ADDR, 'Unassigned');


  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.filterList = filterList;
  $scope.updateList = updateList;
  $scope.sortList = sortList;

  requestAddressCount();  // get database total address count

  
  /* function implementation
  -------------------------- */
  
  function setupGroup(id, label) {

    $scope[id] = addressFactory.newList(id, {
      title: label,
      flags: storeFactory.CREATE_INIT
    });
    
    var filter = RES.getFilterName(id);
    $scope[filter] = storeFactory.newObj(filter, addressFactory.newFilter, storeFactory.CREATE_INIT);

    var pager = RES.getPagerName(id);
    $scope[pager] = pagerFactory.newPager(pager, [], 1, $scope.perPage, MAX_DISP_PAGE);

    setFilter(id, $scope[filter]);
    addressFactory.setPager(id, $scope[pager]);
  }
  
  function setFilter (id , filter) {
    // unassignedAddrFilterStr or assignedAddrFilterStr
    var filterStr = RES.getFilterStrName(id);
    if (!filter) {
      filter = addressFactory.newFilter();
    }
    $scope[filterStr] = filter.toString();

    return addressFactory.setFilter(id, filter);
  }

  function sortList (resList) {
    return resList.sort();
  }


  function filterList (resList, action) {
    
    if (action === 'c') {       // clear filter
      setFilter(resList.id);
      if (resList.id === RES.UNASSIGNED_ADDR) {
        resList.setList([]);  // clear list of addresses
      }
      resList.applyFilter();
    } else if (action === 'a') {  // no filter, get all
      setFilter(resList.id);
      requestAddresses(resList);  // request all addresses
      
    } else {  // set filter
      var filter = angular.copy(resList.filter.filterBy);

      var dialog = NgDialogFactory.open({ template: 'address/addressfilter.html', scope: $scope, className: 'ngdialog-theme-default', controller: 'AddressFilterController', 
                    data: {action: resList.id, title: resList.title, filter: filter}});

      dialog.closePromise.then(function (data) {
        if (!NgDialogFactory.isNgDialogCancel(data.value)) {

          var filter = addressFactory.newFilter(data.value.filter);
          
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
    
    addressFactory.getFilteredResource(resList, filter, 
      // success function
      function (response) {
        if (!response.length) {
          NgDialogFactory.message('No addresses found', 'No addresses matched the specified criteria');
        }

        requestAddressCount();
      },
      // error function
      function (response) {
        NgDialogFactory.error(response, 'Unable to retrieve addresses');
      }
    ); // get database total address count
  }

  function requestAddressCount (filter) {
    $scope.dbAddrCount = addressFactory.getCount().get()
      .$promise.then(
        // success function
        function (response) {
          $scope.dbAddrCount = response.count;
        },
        // error function
        function (response) {
          NgDialogFactory.error(response, 'Unable to retrieve address count');
        }
      );
  }

  
  function updateList (fromList, toList) {
    var selList,
      moveList = [];  // addr to be moved, i.e. not in target

    selList = utilFactory.getSelectedList(fromList.list);
    
    if (selList.length > 0) {
      selList.forEach(function (element) {
        var i;
        for (i = 0; i < toList.list.length; ++i) {
          if (element._id === toList.list[i]._id) {
            break;
          }
        }
        if (i === toList.list.length) {
          // not in target so needs to be moved
          moveList.push(element);
        }
        
        utilFactory.toggleSelection(element);
      });
      
      // remove all selected from source
      utilFactory.arrayRemove(fromList.list, selList);
      fromList.selCount = 0;
    }
    
    if (moveList.length > 0) {

      utilFactory.arrayAdd(toList.list, moveList, function (array, add) {
        for (var i = 0; i < array.length; ++i) {
          if (add._id === array[i]._id) {
            return false; // already in array
          }
        }
        return true;  // not found, so add
      });
    }
    
    [fromList, toList].forEach(function (resList) {
      sortList(resList);
      resList.count = resList.list.length;
      resList.applyFilter();
    });
  }
  
}


/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .controller('CanvassUnassignedAddressController', CanvassUnassignedAddressController);



/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

CanvassUnassignedAddressController.$inject = ['$scope', '$rootScope', '$state', '$stateParams', 'addressFactory', 'RES', 'UTIL'];

function CanvassUnassignedAddressController($scope, $rootScope, $state, $stateParams, addressFactory, RES, UTIL) {

  console.log('CanvassUnassignedAddressController id', $stateParams.id);

  $scope.list = addressFactory.getList(RES.UNASSIGNED_ADDR);
  $scope.sortOptions = $scope.list.sortOptions;
  $scope.pager = $scope.list.pager;
  $scope.reqAll = true; // emable request all button
  $scope.SET_SEL = UTIL.SET_SEL;
  $scope.CLR_SEL = UTIL.CLR_SEL;
  $scope.TOGGLE_SEL = UTIL.TOGGLE_SEL;
  
  
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

CanvassAssignedAddressController.$inject = ['$scope', '$rootScope', '$state', '$stateParams', 'addressFactory', 'RES', 'UTIL'];

function CanvassAssignedAddressController($scope, $rootScope, $state, $stateParams, addressFactory, RES, UTIL) {

  console.log('CanvassAssignedAddressController id', $stateParams.id);

  $scope.list = addressFactory.getList(RES.ASSIGNED_ADDR);
  $scope.sortOptions = $scope.list.sortOptions;
  $scope.pager = $scope.list.pager;
  $scope.reqAll = false; // disable request all button
  $scope.SET_SEL = UTIL.SET_SEL;
  $scope.CLR_SEL = UTIL.CLR_SEL;
  $scope.TOGGLE_SEL = UTIL.TOGGLE_SEL;
  
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

CanvassCanvasserController.$inject = ['$scope', '$rootScope', '$state', '$stateParams', '$filter', 'canvassFactory', 'electionFactory', 'surveyFactory', 'addressFactory', 'NgDialogFactory', 'stateFactory', 'utilFactory', 'pagerFactory', 'storeFactory', 'RES', 'ADDRSCHEMA', 'roleFactory', 'ROLES', 'userFactory'];

function CanvassCanvasserController($scope, $rootScope, $state, $stateParams, $filter, canvassFactory, electionFactory, surveyFactory, addressFactory, NgDialogFactory, stateFactory, utilFactory, pagerFactory, storeFactory, RES, ADDRSCHEMA, roleFactory, ROLES, userFactory) {

  console.log('CanvassCanvasserController id', $stateParams.id);

  var MAX_DISP_PAGE = 5;

  $scope.sortOptions = userFactory.getSortOptions();
  
  $scope.perPageOpt = [5, 10, 15, 20];
  $scope.perPage = 10;

  setupGroup(RES.ASSIGNED_CANVASSER, 'Assigned');
  setupGroup(RES.UNASSIGNED_CANVASSER, 'Unassigned');


  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.filterList = filterList;
  $scope.updateList = updateList;
  $scope.sortList = sortList;

  // get canvasser role id, followed by inassigned canvassers
  $scope.requestCanvasserRole(requestUnassignedCanvassers);

  
  /* function implementation
  -------------------------- */
  
  function setupGroup(id, label) {
    $scope[id] = userFactory.newList(id, {
      title: label,
      flags: storeFactory.CREATE_INIT
    });
    
    var filter = RES.getFilterName(id);
    $scope[filter] = storeFactory.newObj(filter, userFactory.newFilter, storeFactory.CREATE_INIT);

    var pager = RES.getPagerName(id);
    $scope[pager] = pagerFactory.newPager(pager, [], 1, $scope.perPage, MAX_DISP_PAGE);

    setFilter(id, $scope[filter]);
    userFactory.setPager(id, $scope[pager]);
  }

  function setFilter (id , filter) {
    // unassignedCanvasserFilterStr or assignedCanvasserFilterStr
    var filterStr = RES.getFilterStrName(id);
    if (!filter) {
      filter = userFactory.newFilter();
    }
    $scope[filterStr] = filter.toString();

    // add canvasser restriction to filter
    if ($scope.canvasser) {
      filter.role = $scope.canvasser._id;
    }
    
    return userFactory.setFilter(id, filter);
  }

  function sortList (resList) {
    return resList.sort();
  }
  
  function filterList (resList, action) {
    
    if (action === 'c') {       // clear filter
      setFilter(resList.id);
      if (resList.id === RES.UNASSIGNED_CANVASSER) {
        resList.setList([]);  // clear list of canvassers
      }
      resList.applyFilter();
    } else if (action === 'a') {  // no filter, get all
      setFilter(resList.id);
      requestCanvassers(resList);  // request all canvassers
      
    } else {  // set filter
      var filter = angular.copy(resList.filter.filterBy);

      NgDialogFactory.openAndHandle({ template: 'people/personfilter.html', scope: $scope, className: 'ngdialog-theme-default', controller: 'PersonFilterController', 
                    data: {action: resList.id, title: resList.title, filter: filter}},
        // process function
        function (value) {

          var filter = userFactory.newFilter(value.filter),
            resList = setFilter(value.action, filter);
          if (resList) {
            if (resList.id === RES.UNASSIGNED_CANVASSER) {
              // request filtered addresses from server
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


  function requestUnassignedCanvassers (filter) {
    var resList = userFactory.getList(RES.UNASSIGNED_CANVASSER);
    if (resList) {
      requestCanvassers(resList);
    }
  }

  function requestCanvassers (resList, filter) {
    
    userFactory.getFilteredResource(resList, filter, 
                                    
      // success function
      function (response) {
        if (!response.length) {
          NgDialogFactory.message('No canvassers found', 'No canvassers matched the specified criteria');
        }
      },
      // error function
      function (response) {
        NgDialogFactory.error(response, 'Unable to retrieve canvassers');
      }
    );
  }

  function updateList (fromList, toList) {
    var selList,
      moveList = [];  // addr to be moved, i.e. not in target

    selList = utilFactory.getSelectedList(fromList.list);
    
    if (selList.length > 0) {
      selList.forEach(function (element) {
        var i;
        for (i = 0; i < toList.list.length; ++i) {
          if (element._id === toList.list[i]._id) {
            break;
          }
        }
        if (i === toList.list.length) {
          // not in target so needs to be moved
          moveList.push(element);
        }
        
        utilFactory.toggleSelection(element);
      });
      
      // remove all selected from source
      utilFactory.arrayRemove(fromList.list, selList);
      fromList.selCount = 0;
    }
    
    if (moveList.length > 0) {

      utilFactory.arrayAdd(toList.list, moveList, function (array, add) {
        for (var i = 0; i < array.length; ++i) {
          if (add._id === array[i]._id) {
            return false; // already in array
          }
        }
        return true;  // not found, so add
      });
    }
    
    [fromList, toList].forEach(function (resList) {
      sortList(resList);
      resList.count = resList.list.length;
      resList.applyFilter();
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

CanvassUnassignedCanvasserController.$inject = ['$scope', '$rootScope', '$state', '$stateParams', 'userFactory', 'RES', 'UTIL'];

function CanvassUnassignedCanvasserController($scope, $rootScope, $state, $stateParams, userFactory, RES, UTIL) {

  console.log('CanvassUnassignedCanvasserController id', $stateParams.id);

  $scope.list = userFactory.getList(RES.UNASSIGNED_CANVASSER);
  $scope.sortOptions = $scope.list.sortOptions;
  $scope.pager = $scope.list.pager;
  $scope.reqAll = true; // emable request all button
  $scope.SET_SEL = UTIL.SET_SEL;
  $scope.CLR_SEL = UTIL.CLR_SEL;
  $scope.TOGGLE_SEL = UTIL.TOGGLE_SEL;
  
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

CanvassAssignedCanvasserController.$inject = ['$scope', '$rootScope', '$state', '$stateParams', 'userFactory', 'RES', 'UTIL'];

function CanvassAssignedCanvasserController($scope, $rootScope, $state, $stateParams, userFactory, RES, UTIL) {

  console.log('CanvassAssignedCanvasserController id', $stateParams.id);

  $scope.list = userFactory.getList(RES.ASSIGNED_CANVASSER);
  $scope.sortOptions = $scope.list.sortOptions;
  $scope.pager = $scope.list.pager;
  $scope.reqAll = false; // disable request all button
  $scope.SET_SEL = UTIL.SET_SEL;
  $scope.CLR_SEL = UTIL.CLR_SEL;
  $scope.TOGGLE_SEL = UTIL.TOGGLE_SEL;
  
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

CanvassAssignmentController.$inject = ['$scope', '$rootScope', '$state', '$stateParams', '$filter', 'canvassFactory', 'electionFactory', 'surveyFactory', 'addressFactory', 'NgDialogFactory', 'stateFactory', 'utilFactory', 'pagerFactory', 'storeFactory', 'RES', 'ADDRSCHEMA', 'roleFactory', 'ROLES', 'userFactory', 'CANVASSASSIGN', 'UTIL'];

function CanvassAssignmentController($scope, $rootScope, $state, $stateParams, $filter, canvassFactory, electionFactory, surveyFactory, addressFactory, NgDialogFactory, stateFactory, utilFactory, pagerFactory, storeFactory, RES, ADDRSCHEMA, roleFactory, ROLES, userFactory, CANVASSASSIGN, UTIL) {

  console.log('CanvassAssignmentController id', $stateParams.id);

  var MAX_DISP_PAGE = 5,
    factories = {},
    addressAssignmentTests = makeAddressAssignmentTests(),
    canvasserAssignmentTests = makeCanvasserAssignmentTests();

  $scope.perPageOpt = [5, 10, 15, 20];
  $scope.perPage = 10;

  setupGroup(RES.ALLOCATED_ADDR, addressFactory, 'Addresses',
             CANVASSASSIGN.ASSIGNMENTCHOICES, 'Assigned', false);
  setupGroup(RES.ALLOCATED_CANVASSER, userFactory, 'Canvassers',
             CANVASSASSIGN.ASSIGNMENTCHOICES, 'Has Allocation', true);

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.filterList = filterList;
  $scope.updateList = updateList;
  $scope.sortList = sortList;

  // get canvasser role id
  $scope.requestCanvasserRole();

  
  /* function implementation
  -------------------------- */

  function setupGroup(id, factory, label, assignmentChoices, assignmentLabel,  nameFields) {

    factories[id] = factory;
    
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
    $scope[pager] = pagerFactory.newPager(pager, [], 1, $scope.perPage, MAX_DISP_PAGE);

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
    // if canvasser set then has assignment
    return (!addr.canvasser);
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
    // if addresses set then has assignment
    return (!canvasser.addresses || !canvasser.addresses.length);
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

  function newFilter (factory, data) {
    var filter = factory.newFilter(data);
    // add assignment specific fields
    if (data && data.assignment) {
      filter.filterBy.assignment = data.assignment;
    }
    // override default customFunction with enhanced version
    if (factory.NAME === 'addressFactory') {
      filter.customFunction = addrFilterFunction;
    } else {
      filter.customFunction = cnvsrFilterFunction;
    }
    return filter;
  }

            
  
  
  
  function setFilter (id , filter) {
    var factory = factories[id],
      // allocatedAddrFilterStr or allocatedCanvasserFilterStr
      filterStr = RES.getFilterStrName(id),
      filterStrPrefix;
    if (!filter) {
      filter = newFilter(factory);
    }
    if (filter.filterBy.assignment) {
      // set filter string prefix to assignment text
      var list = factory.getList(id);
      if (list) {
        list.assignmentChoices.forEach(function (choice) {
          if (choice.val === filter.filterBy.assignment) {
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

  function filterList (resList, action) {
    
    if (action === 'c') {       // clear filter
      setFilter(resList.id);
      resList.applyFilter();
    } else if (action === 'a') {  // no filter, get all
      var list = setFilter(resList.id);
      if (list) {
        resList.factory.getFilteredResource(resList, list.filter, resList.label);
      }
    } else {  // set filter
      var filter = angular.copy(resList.filter.filterBy);

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
    var addrList = utilFactory.getSelectedList($scope.allocatedAddr.list),
      cnvsList = utilFactory.getSelectedList($scope.allocatedCanvasser.list),
      aidx, cidx,
      canvasser, addr,
      clrSel;

    if (action === 'alloc') {
      clrSel = true;
      for (aidx = 0; aidx < addrList.length; ++aidx) {
        addr = addrList[aidx];

        unlinkAddress(addr);  // unlink addr from previous

        for (cidx = 0; cidx < cnvsList.length; ++cidx) {
          canvasser = cnvsList[cidx];
          canvassFactory.linkCanvasserToAddr(canvasser, addr);
        }
      }
    } else if (action === 'unalloc') {
      clrSel = true;

      // unallocate all addresses allocated to selected canvassers
      cnvsList.forEach(function (unallocCnvsr) {
        canvassFactory.unlinkAddrListFromCanvasser(unallocCnvsr, $scope.allocatedAddr.list);
      });
      // unallocate all selected addresses
      addrList.forEach(function (unallocAddr) {
        unlinkAddress(unallocAddr);
      });
    } else if (action === 'show') {
      // TODO show allocations
    }

    if (clrSel) {
      $scope.setItemSel($scope.allocatedAddr, UTIL.CLR_SEL);
      $scope.setItemSel($scope.allocatedCanvasser, UTIL.CLR_SEL);
    }
  }

  function unlinkAddress (addr) {
    if (addr.canvasser) {
      var canvasser = $scope.allocatedCanvasser.findInList(function (element) {
          return (element._id === addr.canvasser);
        });
      if (canvasser) {
        canvassFactory.unlinkAddrFromCanvasser(canvasser, addr);
      }
    }
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

CanvassAssignmentAddressController.$inject = ['$scope', '$rootScope', '$state', '$stateParams', 'addressFactory', 'RES', 'UTIL'];

function CanvassAssignmentAddressController($scope, $rootScope, $state, $stateParams, addressFactory, RES, UTIL) {

  console.log('CanvassAssignmentAddressController id', $stateParams.id);

  $scope.list = addressFactory.getList(RES.ALLOCATED_ADDR);

  $scope.sortOptions = $scope.list.sortOptions;
  $scope.pager = $scope.list.pager;
  $scope.reqAll = true; // enable request all button
  $scope.showBadge = true; // enable badge display
  $scope.SET_SEL = UTIL.SET_SEL;
  $scope.CLR_SEL = UTIL.CLR_SEL;
  $scope.TOGGLE_SEL = UTIL.TOGGLE_SEL;
  

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

CanvassAssignmentCanvasserController.$inject = ['$scope', '$rootScope', '$state', '$stateParams', 'userFactory', 'RES', 'UTIL'];

function CanvassAssignmentCanvasserController($scope, $rootScope, $state, $stateParams, userFactory, RES, UTIL) {

  console.log('CanvassAssignmentCanvasserController id', $stateParams.id);

  $scope.list = userFactory.getList(RES.ALLOCATED_CANVASSER);
  $scope.sortOptions = $scope.list.sortOptions;
  $scope.pager = $scope.list.pager;
  $scope.reqAll = true; // emable request all button
  $scope.showBadge = true; // enable badge display
  $scope.SET_SEL = UTIL.SET_SEL;
  $scope.CLR_SEL = UTIL.CLR_SEL;
  $scope.TOGGLE_SEL = UTIL.TOGGLE_SEL;
  
  /* function implementation
  -------------------------- */

}






/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .controller('CanvassResultController', CanvassResultController);



/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

CanvassResultController.$inject = ['$scope', '$rootScope', '$state', '$stateParams', '$filter', 'canvassFactory', 'electionFactory', 'surveyFactory', 'addressFactory', 'canvassResultFactory', 'questionFactory', 'NgDialogFactory', 'stateFactory', 'utilFactory', 'pagerFactory', 'storeFactory', 'RES', 'ADDRSCHEMA', 'CANVASSRES_SCHEMA', 'roleFactory', 'ROLES', 'userFactory', 'CANVASSASSIGN', 'UTIL', 'QUESTIONSCHEMA', 'CHARTS'];

function CanvassResultController($scope, $rootScope, $state, $stateParams, $filter, canvassFactory, electionFactory, surveyFactory, addressFactory, canvassResultFactory, questionFactory, NgDialogFactory, stateFactory, utilFactory, pagerFactory, storeFactory, RES, ADDRSCHEMA, CANVASSRES_SCHEMA, roleFactory, ROLES, userFactory, CANVASSASSIGN, UTIL, QUESTIONSCHEMA, CHARTS) {

  console.log('CanvassResultController id', $stateParams.id);

  var MAX_DISP_PAGE = 5,
    factories = {},
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

  $scope.perPageOpt = [5, 10, 15, 20];
  $scope.perPage = 10;

  setupGroup(RES.ALLOCATED_ADDR, addressFactory, 'Addresses',
             CANVASSASSIGN.ASSIGNMENTCHOICES, 'Assigned', false);
  setupGroup(RES.ALLOCATED_CANVASSER, userFactory, 'Canvassers',
             CANVASSASSIGN.ASSIGNMENTCHOICES, 'Has Allocation', true);

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.filterList = filterList;
  $scope.updateList = updateList;
  $scope.sortList = sortList;
  $scope.getQuestionTypeName = questionFactory.getQuestionTypeName;
  $scope.showPieChart = showPieChart;
  $scope.showBarChart = showBarChart;
  $scope.showPolarAreaChart = showPolarAreaChart;
  $scope.showChart = showChart;
  $scope.showResultDetail = showResultDetail;


  // generate quick response labels & data
  $scope.quickLabels = [];
  $scope.quickData = [];
  quickDetails.forEach(function (detail) {
    $scope.quickLabels.push(detail.label);
    $scope.quickData.push(0);
  });

  // generate support labels & data
  $scope.supportLabels = ['Unknown'];
  $scope.supportData = [0];
  for (i = CANVASSRES_SCHEMA.SUPPORT_MIN; i <= CANVASSRES_SCHEMA.SUPPORT_MAX; ++i) {
    $scope.supportLabels.push(i.toString());
    $scope.supportData.push(0);
  }
  $scope.resultCount = 0;

  $scope.canvassLabels = ['Completed', 'Pending'];
  $scope.canvassComplete = 0;
  $scope.canvassPending = 0;

//  $scope.canvass = canvassFactory.getObj(RES.ACTIVE_CANVASS);
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
    $scope.canvassComplete = completed;
    $scope.canvassPending = pending;
  }

  function processsResults (resList) {
    console.log('results');
    console.log(resList);
    $scope.resultCount = resList.count;

    $scope.quickData.fill(0);
    $scope.supportData.fill(0);

    resList.forEachInList(function (result) {
      // calc quick responses
      for (i = 0; i < quickDetails.length; ++i) {
        if (result[quickDetails[i].property] !== quickDetails[i].dfltValue) {
          ++$scope.quickData[i];
        }
      }

      // ca;c support
      if (result[supportProperty] === CANVASSRES_SCHEMA.SUPPORT_UNKNOWN) {
        ++$scope.supportData[0];
      } else {
        i = result[supportProperty] - CANVASSRES_SCHEMA.SUPPORT_MIN + 1;
        if (i < $scope.supportData.length) {
          ++$scope.supportData[i];
        }
      }
    });
  }

  function processQuestions (resList) {
    console.log('questions');
    console.log(resList);

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
      total = 0,
      resData,
      details = []; // combined label & count info

    if (questionFactory.showQuestionOptions(question.type)) {
      resData = question.resData;
      // selection from options
      if (resData.series) {
        seriesIdx = resData.series.length - 1;
      } else {
        seriesIdx = -1;
      }
      for (i = 0; i < resData.labels.length; ++i) {
        if (seriesIdx >= 0) {
          value = resData.data[seriesIdx][i];
        } else {
          value = resData.data[i];
        }
        details.push({
          label: resData.labels[i],
          value: value
        });
        total += value;
      }
      details.forEach(function (detail) {
        value = (detail.value * 100) / total;
        if (!Number.isInteger(value)) {
          value = value.toFixed(1);
        }
        detail.percent = value;
      });
    } else if (questionFactory.showTextInput(question.type)) {
      // text input
      details = resData.data;
    }

    dialog = NgDialogFactory.open({ template: 'canvasses/result.detail.html', scope: $scope, className: 'ngdialog-theme-default', controller: 'ResultDetailController',
                  data: {
                    question: question,
                    chart: chartCtrl(question),
                    details: details
                  }});

    dialog.closePromise.then(function (data) {
      if (!NgDialogFactory.isNgDialogCancel(data.value)) {
        // noop
      }
    });
  }





  function setupGroup(id, factory, label, assignmentChoices, assignmentLabel,  nameFields) {

    factories[id] = factory;

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
    $scope[pager] = pagerFactory.newPager(pager, [], 1, $scope.perPage, MAX_DISP_PAGE);

    setFilter(id, $scope[filter]);
    factory.setPager(id, $scope[pager]);
  }

  function getAssignmentChoiceIndex (value) {
    var idx = -1;
    for (var i = CANVASSASSIGN.ASSIGNMENT_YES_IDX; i <= CANVASSASSIGN.ASSIGNMENT_ALL_IDX; ++i) {
      if (value === CANVASSASSIGN.ASSIGNMENTCHOICES[i].val) {
        idx = i;
        break;
      }
    }
    return idx;
  }

  function filterFunction (list, tests, filter) {
    var incTest,
      dfltFilter = angular.copy(filter);  // filter for use by default filter function
    if (filter && filter.assignment) {
      // remove assignment from default filter otherwise there'll be no moatches
      delete dfltFilter.assignment;

      var idx = getAssignmentChoiceIndex(filter.assignment);
      if ((idx >= 0) && (idx < tests.length)) {
        incTest = tests[idx];
      }
    }

    // list specific filter function
    var filterList = list.factory.getFilteredList(list, dfltFilter, incTest);

    // apply allocated criteria
//    if (incTest) {
//      var outList = [];
//      filterList.forEach(function (element) {
//        if (incTest(element)) {
//          outList.push(element);
//        }
//      });
//      filterList = outList;
//    }
    list.filterList = filterList;
  }

  function addrFilterFunction (list, filter) {
    // address specific filter function
    filterFunction(list, [
        function (element) {  // yes test
          return (element.canvasser);
        },
        function (element) {  // no test
          return (!element.canvasser);
        }
      ], filter);
  }

  function cnvsrFilterFunction (list, filter) {
    // canvasser specific filter function
    filterFunction(list, [
        function (element) {  // yes test
          return (element.addresses && element.addresses.length);
        },
        function (element) {  // no test
          return (!element.addresses || !element.addresses.length);
        }
      ], filter);
  }

  function newFilter(factory, data) {
    var filter = factory.newFilter(data);
    // add assignment specific fields
    if (data && data.assignment) {
      filter.filterBy.assignment = data.assignment;
    }
    // override default customFunction with enhanced version
    if (factory.ID_TAG === ADDRSCHEMA.ID_TAG) {
      filter.customFunction = addrFilterFunction;
    } else {
      filter.customFunction = cnvsrFilterFunction;
    }
    return filter;
  }





  function setFilter (id , filter) {
    var factory = factories[id],
      // allocatedAddrFilterStr or allocatedCanvasserFilterStr
      filterStr = RES.getFilterStrName(id),
      filterStrPrefix;
    if (!filter) {
      filter = newFilter(factory);
    }
    if (filter.filterBy.assignment) {
      // set filter string prefix to assignment text
      var idx = getAssignmentChoiceIndex(filter.filterBy.assignment);
      if ((idx >= 0) && (idx < CANVASSASSIGN.ASSIGNMENTCHOICES.length)) {
        var list = factory.getList(id);
        if (list) {
          filterStrPrefix = list.assignmentLabel + ': '+           CANVASSASSIGN.ASSIGNMENTCHOICES[idx].text;
        }
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

  function filterList (resList, action) {

    if (action === 'c') {       // clear filter
      setFilter(resList.id);
//      if (resList.id === RES.UNASSIGNED_CANVASSER) {
//        resList.setList([]);  // clear list of addresses
//      }
      resList.applyFilter();
    } else if (action === 'a') {  // no filter, get all
      var list = setFilter(resList.id);
      if (list) {
        resList.factory.getFilteredResource(resList, list.filter, resList.label);
      }
    } else {  // set filter
      var filter = angular.copy(resList.filter.filterBy);

      var dialog = NgDialogFactory.open({ template: 'canvasses/assignmentfilter.html', scope: $scope, className: 'ngdialog-theme-default', controller: 'AssignmentFilterController',
                    data: {action: resList.id,
                           ctrl: { title: resList.title,
                                  assignmentChoices: resList.assignmentChoices,
                                  assignmentLabel: resList.assignmentLabel,
                                  nameFields: resList.nameFields},
                           filter: filter}});

      dialog.closePromise.then(function (data) {
        if (!NgDialogFactory.isNgDialogCancel(data.value)) {

//          ngDialogData.filter.assignment

          var factory = factories[data.value.action],
            filter = newFilter(factory, data.value.filter);

          var resList = setFilter(data.value.action, filter);
          if (resList) {
            if (resList.id === RES.UNASSIGNED_CANVASSER) {
              // request filtered addresses from server
              $scope.equestCanvassers(resList, filter);
            } else {
              resList.applyFilter();
            }
          }
        }
      });
    }

  }


  function updateList (action) {
    var addrList = utilFactory.getSelectedList($scope.allocatedAddr.list),
      cnvsList = utilFactory.getSelectedList($scope.allocatedCanvasser.list),
      aidx, cidx,
      canvasser, addr,
      clrSel;

    if (action === 'alloc') {
      clrSel = true;
      for (aidx = 0; aidx < addrList.length; ++aidx) {
        addr = addrList[aidx];

        unlinkAddress(addr);  // unlink addr from previous

        for (cidx = 0; cidx < cnvsList.length; ++cidx) {
          canvasser = cnvsList[cidx];
          canvassFactory.linkCanvasserToAddr(canvasser, addr);
        }
      }
    } else if (action === 'unalloc') {
      clrSel = true;

      // unallocate all addresses allocated to selected canvassers
      cnvsList.forEach(function (unallocCnvsr) {
        canvassFactory.unlinkAddrListFromCanvasser(unallocCnvsr, $scope.allocatedAddr.list);
      });
      // unallocate all selected addresses
      addrList.forEach(function (unallocAddr) {
        unlinkAddress(unallocAddr);
      });
    } else if (action === 'show') {
      // TODO show allocations
    }

    if (clrSel) {
      $scope.setItemSel($scope.allocatedAddr, UTIL.CLR_SEL);
      $scope.setItemSel($scope.allocatedCanvasser, UTIL.CLR_SEL);
    }
  }

  function unlinkAddress (addr) {
    if (addr.canvasser) {
      var canvasser = $scope.allocatedCanvasser.findInList(function (element) {
          return (element._id === addr.canvasser);
        });
      if (canvasser) {
        canvassFactory.unlinkAddrFromCanvasser(canvasser, addr);
      }
    }
  }
}


/*jslint node: true */
/*global angular */
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

  $scope.question = $scope.ngDialogData.question;
  $scope.chart = $scope.ngDialogData.chart;
  $scope.details = $scope.ngDialogData.details;

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


}


/*jslint node: true */
/*global angular */
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
/*global angular */
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
  $scope.prevEnabled = function () {
    return this.canvassForm.$invalid;
  };
  $scope.nextText = 'Next';
  $scope.nextEnabled = function () {
    return this.canvassForm.$invalid;
  };

  /* function implementation
  -------------------------- */

}






/*jslint node: true */
/*global angular */
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
  $scope.prevEnabled = function () {
    return this.surveyForm.$invalid;
  };
  $scope.nextText = 'Next';
  $scope.nextEnabled = function () {
    return this.surveyForm.$invalid;
  };

  /* function implementation
  -------------------------- */

}






/*jslint node: true */
/*global angular */
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
  $scope.prevEnabled = function () {
    return this.addressForm.$invalid;
  };
  $scope.nextText = 'Next';
  $scope.nextEnabled = function () {
    return this.addressForm.$invalid;
  };

  /* function implementation
  -------------------------- */

}






/*jslint node: true */
/*global angular */
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
  $scope.prevEnabled = function () {
    return this.canvasserForm.$invalid;
  };
  $scope.nextText = 'Next';
  $scope.nextEnabled = function () {
    return this.canvasserForm.$invalid;
  };

  /* function implementation
  -------------------------- */

}






/*jslint node: true */
/*global angular */
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
  $scope.prevEnabled = function () {
    return this.assignmentForm.$invalid;
  };
  if ($scope.lastTab === $scope.tabs.ASSIGNMENT_TAB) {
    $scope.nextText = 'Done';
  } else {
    $scope.nextText = 'Next';
  }
  $scope.nextEnabled = function () {
    return this.assignmentForm.$invalid;
  };

  /* function implementation
  -------------------------- */

}






/*jslint node: true */
/*global angular */
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
  $scope.prevEnabled = function () {
    return this.resultForm.$invalid;
  };
  $scope.nextText = 'Done';
  $scope.nextEnabled = function () {
    return this.resultForm.$invalid;
  };

  /* function implementation
  -------------------------- */

}






/*jslint node: true */
/*global angular */
'use strict';

angular.module('canvassTrac')

  .controller('QuestionController', QuestionController);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

QuestionController.$inject = ['$scope', 'questionFactory', 'NgDialogFactory', 'questionTypes'];

function QuestionController($scope, questionFactory, NgDialogFactory, questionTypes) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  $scope.getTitle = getTitle;
  $scope.getOkText = getOkText;
  $scope.selectedItemChanged = selectedItemChanged;
	$scope.questionTypes = questionTypes;

  if ($scope.ngDialogData.question.type) {
    selectedItemChanged('init', $scope.ngDialogData.question);
  } else {
    $scope.showNumOptions = false;
    $scope.showRankingNumber = false;
  }

  
  
  var ACTIONS = {
    NEW: 'new',
    VIEW: 'view',
    EDIT: 'edit'
  };
  
  /* function implementation
  -------------------------- */

  function getTitle() {
    $scope.editDisabled = true;
    var title;
    if ($scope.ngDialogData.action === ACTIONS.NEW) {
      title = 'Create Question';
      $scope.editDisabled = false;
    } else if ($scope.ngDialogData.action === ACTIONS.VIEW) {
      title = 'View Question';
    } else if ($scope.ngDialogData.action === ACTIONS.EDIT) {
      title = 'Update Question';
      $scope.editDisabled = false;
    } else {
      title = '';
    }
    return title;
  }

  function getOkText() {
    var text;
    if ($scope.ngDialogData.action === ACTIONS.NEW) {
      text = 'Create';
    } else if ($scope.ngDialogData.action === ACTIONS.VIEW) {
      text = 'OK';
    } else if ($scope.ngDialogData.action === ACTIONS.EDIT) {
      text = 'Update';
    } else {
      text = '';
    }
    return text;
  }

  function selectedItemChanged(item, value) {
    console.log(item, value);
    if ((item === 'qtype') || (item === 'init')) {
      var typeId = value.type.type,
        showNumOpts = (questionFactory.showQuestionOptions(typeId) &&
          !questionFactory.hasPresetQuestionOptions(typeId)),
        showRankingNum = questionFactory.showRankingNumber(typeId);

      if (!showNumOpts) {
        value.numoptions = 0;
        value.options = undefined;
      }
      
      $scope.showNumOptions = showNumOpts;
      $scope.showRankingNumber = showRankingNum;
      
      console.log(item + ' after', value);


    } else if (item === 'numopts') {
      if (value.options === undefined) {
        value.options = [];
      }
      if (value.options.length < value.numoptions) {
        for (var i = value.options.length; i < value.numoptions; ++i) {
          value.options.push('');
        }
      } else {
        value.options.splice(value.numoptions, (value.options.length - value.numoptions)) ;
      }
    }
    
    
    
  }

}


/*jslint node: true */
/*global angular */
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

