/*jslint node: true */
'use strict';

// the types of properties to be set
var types = {
  dbAddr: 'str',
  baseURL: 'str',
  forceHttps: 'bool',
  httpPort: 'num',
  httpsPortOffset: 'num',
  jwtSecretKey: 'str',
  jwtTokenLife: 'num',
  disableAuth: 'bool',
  fbClientID: 'str',
  fbClientSecret: 'str',
  dfltPassword: 'str',
  testOptions: 'str'
};

var cfg = {};
cfg.dbAddr = '@@dbAddr';
cfg.baseURL = '@@baseURL';
cfg.forceHttps = '@@forceHttps';          // flag to force all traffic through https channel
cfg.httpPort = '@@httpPort';              // http port
cfg.httpsPortOffset = '@@httpsPortOffset';// offset of https port from http port
cfg.jwtSecretKey = '@@jwtSecretKey';
cfg.jwtTokenLife = '@@jwtTokenLife';// validity of logged in token
cfg.disableAuth = '@@disableAuth';  // flag to disable authentication for dev purposes
cfg.fbClientID = '@@fbClientID';
cfg.fbClientSecret = '@@fbClientSecret';
cfg.dfltPassword = '@@dfltPassword';
cfg.testOptions = '@@testOptions';

// check if cfg properties have been set and of not read from environment
for (var prop in cfg) {
  if (cfg[prop].indexOf('@@') == 0) {
    cfg[prop] = process.env[prop];
  }
  // set to correct type
  if (types[prop] === 'num') {
    cfg[prop] = parseInt(cfg[prop]);
  } else if (types[prop] === 'bool') {
    cfg[prop] = (cfg[prop] === 'true');
  }
}

function facebookCallback() {
  var proto = 'http',
    port = cfg.httpPort;
  if (cfg.forceHttps) {
    proto = 'https';
    port += cfg.httpsPortOffset;
  }
  return proto + '://' + cfg.baseURL + ':' + port + '/users/facebook/callback';
}
    
    
module.exports = {
  'jwtSecretKey': cfg.jwtSecretKey,
  'mongoAddr': cfg.dbAddr,
  'mongoUrl' : 'mongodb://' + cfg.dbAddr,
  'jwtTokenLife': cfg.jwtTokenLife,
  'disableAuth': cfg.disableAuth,
  'forceHttps': cfg.forceHttps,
  'httpPort': cfg.httpPort,
  'httpsPortOffset': cfg.httpsPortOffset,
  'facebook': {
    clientID: cfg.fbClientID,
    clientSecret: cfg.fbClientSecret,
    callbackURL: facebookCallback()
  },
  'dfltPassword': cfg.dfltPassword,

  /* test options for mocha tests:
      -h, --help              Display help information
      -u, --user              Run user tests
      -p, --people            Run people tests
      -c', --candidates       Run candidate tests
      -pp, --party            Run party tests
      -vs, --votingsystem     Run voting system tests
      -vd, --votingdistrict   Run voting district tests
      -e, --election          Run election tests
   */
  'testOptions': cfg.testOptions
};
