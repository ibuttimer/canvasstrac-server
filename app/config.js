/*jslint node: true */
'use strict';

var dbAddr = 'localhost:27017/canvassTrac';

//var dbAddr = 'canvasstrac:1PuxOpIYQCKa@ds047935.mlab.com:47935/canvasstrac';

var forceHttps = false,     // flag to force all traffic through https channel
  httpPort = 4000,        // http port
  httpsPortOffset = 443;  // offset of https port from http port

function facebookCallback() {
  var proto,
    port = httpPort;
  if (forceHttps) {
    proto = 'https';
  } else {
    proto = 'http';
    port += httpsPortOffset;
  }
  return proto + '://localhost:' + port + '/users/facebook/callback';
}
    
    
module.exports = {
  'secretKey': '12345-67890-09876-54321',
  'mongoAddr': dbAddr,
  'mongoUrl' : 'mongodb://' + dbAddr,
  'tokenLife': 3600,    // validity of logged in token
  'disableAuth': true,  // flag to disable authentication for dev purposes
  'forceHttps': forceHttps,
  'httpPort': httpPort,
  'httpsPortOffset': httpsPortOffset,
  'facebook': {
    clientID: '1588991268084549',
    clientSecret: '1cdbb5536ce18b5b1c5f86b1ac74481b',
    callbackURL: facebookCallback()
  },
  
  'dfltPassword': 'password',
  
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
  'testOptions': '-pp'
};
