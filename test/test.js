/* Run this test script by typing in a terminal from the project root:
   
   Linux: ./node_modules/.bin/mocha test/test.js
   Windows: node_modules\.bin\mocha test\test.js
   
   Alternatively, put the following in package.json;
       "scripts": {
          ...
          "test": "mocha ./test/test.js"
        },
    and use 'npm test'
    
  Configure the individual test to run by setting 'testOptions' in config.js
  as per cmd_options below.
*/
/*jslint node: true */ /*eslint-env node*/
'use strict';

var app_path = '../app/';   // relative path to app

var config = require(app_path + 'config');

var test_users = require('./test_users'),
  test_people = require('./test_people'),
  test_parties = require('./test_parties'),
  test_candidates = require('./test_candidates'),
  test_voting_systems = require('./test_voting_systems'),
  test_voting_districts = require('./test_voting_districts'),
  test_elections = require('./test_elections');

/* Command line functions */
var RUN_HELP = 0x01,
  RUN_USER = 0x02,
  RUN_PEOPLE = 0x04,
  RUN_PARTIES = 0x08,
  RUN_CANDIDATES = 0x10,
  RUN_VOTING_SYSTEMS = 0x20,
  RUN_VOTING_DISTRICTS = 0x40,
  RUN_ELECTIONS = 0x80,
  RUN_ALL = RUN_USER|RUN_PEOPLE|RUN_PARTIES|RUN_CANDIDATES|RUN_VOTING_SYSTEMS|RUN_VOTING_DISTRICTS|RUN_ELECTIONS;
var cmd_options = [
  { cmd: '-h', command: '--help',
    desc: 'Display help information',
    value: RUN_HELP
  },
  { cmd: '-a', command: '--all',
    desc: 'Run all tests',
    value: RUN_ALL,
    message: 'Running all tests'
  },
  { cmd: '-u', command: '--user',
    desc: 'Run user tests',
    value: RUN_USER,
    message: 'Running User API tests',
    module: test_users
  },
  { cmd: '-p', command: '--people',
    desc: 'Run people tests',
    value: RUN_PEOPLE,
    message: 'Running People API tests',
    module: test_people
  },
  { cmd: '-pp', command: '--party',
    desc: 'Run party tests',
    value: RUN_PARTIES,
    message: 'Running Party API tests',
    module: test_parties
  },
  { cmd: '-c', command: '--candidates',
    desc: 'Run candidate tests',
    value: RUN_CANDIDATES,
    message: 'Running Candidate API tests',
    module: test_candidates
  },
  { cmd: '-vs', command: '--votingsystem',
    desc: 'Run voting system tests',
    value: RUN_VOTING_SYSTEMS,
    message: 'Running Voting System API tests',
    module: test_voting_systems
  },
  { cmd: '-vd', command: '--votingdistrict',
    desc: 'Run voting district tests',
    value: RUN_VOTING_DISTRICTS,
    message: 'Running Voting District API tests',
    module: test_voting_districts
  },
  { cmd: '-e', command: '--election',
    desc: 'Run election tests',
    value: RUN_ELECTIONS,
    message: 'Running Election API tests',
    module: test_elections
  }
];
var run_options = 0;

var options_in = config.testOptions.split(' ');
if (options_in) {
  options_in.forEach(function (val, index, array) {
    cmd_options.find(function (element) {
      if ((element.cmd === val) || (element.command === val)) {
        run_options |= element.value;
      }
    });
  });
}
if (run_options === 0) {
  run_options = RUN_HELP;
}

if (config.disableAuth) {
  // eslint-disable-next-line no-console
  console.log('\nAuthentication is disabled, please set the "config.disableAuth" flag to false and run test again.');
} else {
  // run 
  if ((run_options & RUN_HELP) !== 0) {
    // eslint-disable-next-line no-console
    console.log('\nSpecify the required options as the "testOptions" value in config.js:');
    cmd_options.forEach(function (val, index, array) {
      // eslint-disable-next-line no-console
      console.log('\t' + val.cmd + ', ' + val.command + '\t' + val.desc);
    });
  } else {
    // run tests
    cmd_options.forEach(function (suite, index, array) {
      if ((run_options & suite.value) !== 0) {
        if (suite.module) {
          // eslint-disable-next-line no-console
          console.log('\n' + suite.message + '\n');
          suite.module.runTestSuite();
        }
      }
    });
  }
}
