/*jslint node: true */
'use strict';

var dbAddr = '@@dbAddr';

//var dbAddr = 'canvasstrac:1PuxOpIYQCKa@ds047935.mlab.com:47935/canvasstrac';

var forceHttps = @@forceHttps,      // flag to force all traffic through https channel
  httpPort = @@httpPort,            // http port
  httpsPortOffset = @@httpsPortOffset;  // offset of https port from http port

function facebookCallback() {
  var proto,
    port = httpPort;
  if (forceHttps) {
    proto = 'https';
  } else {
    proto = 'http';
    port += httpsPortOffset;
  }
  return proto + '://@@baseURL:' + port + '/users/facebook/callback';
}
    
    
module.exports = {
  'secretKey': '@@jwtSecretKey',
  'mongoAddr': dbAddr,
  'mongoUrl' : 'mongodb://' + dbAddr,
  'tokenLife': @@tokenLife,    // validity of logged in token
  'disableAuth': @@disableAuth,  // flag to disable authentication for dev purposes
  'forceHttps': forceHttps,
  'httpPort': httpPort,
  'httpsPortOffset': httpsPortOffset,
  'facebook': {
    clientID: '@@fbClientID',
    clientSecret: '@@fbClientSecret',
    callbackURL: facebookCallback()
  },
  
  'dfltPassword': '@@dfltPassword',
  
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
  'testOptions': '@@testOptions'
};
