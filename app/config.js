/*jslint node: true */
'use strict';

var fs = require('fs'),
  // the types of properties to be set
  types = {
    // server/management app common settings
    baseURL: 'str',
    forceHttps: 'bool',     // flag to force all traffic through https channel
    httpPort: 'num',        // http port
    httpsPortOffset: 'num', // offset of https port from http port
    socketTimeout: 'num',   // timeout for sockets
    // server-specific settings
    dbAddr: 'str',
    mgmtPath: 'str',
    jwtSecretKey: 'str',
    jwtWebTokenLife: 'num',   // validity of logged in token (seconds)
    jwtMobileTokenLife: 'num',// validity of logged in token (seconds)
    disableAuth: 'bool',      // flag to disable authentication for dev purposes
    fbClientID: 'str',
    fbClientSecret: 'str',
    feedbackFromEmail: "str",
    feedbackToEmail: 'str',
    dfltPassword: 'str',
    testOptions: 'str',
    // sparkpost email settings
    SPARKPOST_API_KEY: 'str',
    SPARKPOST_API_URL: 'str',
    SPARKPOST_SANDBOX_DOMAIN: 'str',
    SPARKPOST_SMTP_HOST: 'str',
    SPARKPOST_SMTP_PASSWORD: 'str',
    SPARKPOST_SMTP_PORT: 'num',
    SPARKPOST_SMTP_USERNAME: 'str'
  },
  path = 'app/env.json',
  cfg,
  prop;

if (fs.existsSync(path)) {
  cfg = JSON.parse(fs.readFileSync(path, 'utf8'));
} else {
  // setup template
  cfg = {};
  for (prop in types) {
    cfg[prop] = '@@' + prop;
  }
}

// check if cfg properties have been set and if not read from environment
for (prop in cfg) {
  if (cfg[prop].indexOf('@@') == 0) {
    cfg[prop] = process.env[prop];
  }
}
// make sure we have everything and convert to the correct type
for (prop in types) {
  if (!cfg[prop]) {
    cfg[prop] = process.env[prop];
  }
  // set to correct type
  if (types[prop] === 'num') {
    cfg[prop] = parseInt(cfg[prop]);
  } else if (types[prop] === 'bool') {
    cfg[prop] = (cfg[prop] === 'true');
  }

  if (prop.indexOf('SPARKPOST') === 0) {
    // sparkpost specific, the pluging uses environment variables
    if (!process.env[prop]) {
      process.env[prop] = cfg[prop];
    }
  }

  console.log('config: ' + prop + ' \'' + cfg[prop] + '\'');
}

function facebookCallback() {
  var url = 'http',
    port = cfg.httpPort;
  if (cfg.forceHttps) {
    url = 'https';
    if (port >= 0) {
      port += cfg.httpsPortOffset;
    }
  }
  url += '://' + cfg.baseURL;
  if (port >= 0) {
    url += ':' + port;
  }
  return url + '/db/users/facebook/callback';
}
    
    
module.exports = {
  'jwtSecretKey': cfg.jwtSecretKey,
  'mongoAddr': cfg.dbAddr,
  'mongoUrl': 'mongodb://' + cfg.dbAddr,
  'mgmtPath': cfg.mgmtPath,
  'jwtWebTokenLife': cfg.jwtWebTokenLife,
  'jwtMobileTokenLife': cfg.jwtMobileTokenLife,
  'baseURL': cfg.baseURL,
  'disableAuth': cfg.disableAuth,
  'forceHttps': cfg.forceHttps,
  'httpPort': cfg.httpPort,
  'httpsPortOffset': cfg.httpsPortOffset,
  "socketTimeout": cfg.socketTimeout,
  'facebook': {
    clientID: cfg.fbClientID,
    clientSecret: cfg.fbClientSecret,
    callbackURL: facebookCallback()
  },
  'feedbackFromEmail': cfg.feedbackFromEmail,
  'feedbackToEmail': cfg.feedbackToEmail,
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
