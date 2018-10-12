/*jslint node: true */ /*eslint-env node,mongo */
'use strict';

/* Run this script in the mongo shell to create/update the basic data required by the 
  application.
  E.g. if the mongo client is running from c:\app folder & the app is in c:\app\canvasstrac,
      it may be loaded as follows:
        load('canvasstrac-server/dev/dbSetup.js')
      To see command, run
        canvasstrac()
      To create all collections, run
        canvasstrac('-c')
*/

function testEquality(objA, objB, properties) {
  var equal = true;
  for (var i = 0; (i < properties.length) && equal; ++i) {
    if (objA.hasOwnProperty(properties[i]) && objB.hasOwnProperty(properties[i])) {
      equal = (objA[properties[i]] == objB[properties[i]]);
    }
  }
  return equal;
}

/*
  * Check if an object is empty
  * @param {object} object - object to check
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
 * Insert a new document or update an existing one
 * @param {*} collection  Collection to add/update doc in
 * @param {*} existingId  Id os existing document
 * @param {*} doc         The doc data
 * @param {*} ownerId     Value for document owner property
 * @param {boolean} dbg   Shoe debug flag
 * @return {object} Result object with '_id' & 'action' properties
 */
function insertOrUpdate(collection, existingId, doc, ownerId, dbg) {
  var result = {};
  if (dbg) {
    print('existingId', existingId);
    printjson(doc);
  }
  if (existingId) {
    doc = collection.findOneAndUpdate({_id: existingId}, {$set: doc}, {returnNewDocument: true});
    if (dbg) {
      print('found');
      printjson(doc);
    }
    if (doc) {
      result._id = existingId;
      result.action = 'update';
    } else {
      result.action = 'notexist';
    }
  } else {
    if (ownerId) {
      doc.owner = ownerId;
    }
    var writeResult = collection.insert(doc);
    if (writeResult.nInserted == 1) {
      var ins = collection.findOne(doc);
      if (ins) {
        result._id = ins._id;
        result.action = 'insert';
      } else {
        result.action = 'notfound';
      }
    } else {
      result.action = 'notinserted';
    }
  }
  if (dbg) {
    print('result');
    printjson(result);
  }  
  return result;
}

// db collections
var rolesCollect = db.roles,
  votingSysCollect = db.votingsystems,
  partiesCollect = db.parties,
  addressCollect = db.addresses,
  contactCollect = db.contactdetails,
  candidatesCollect = db.candidates,
  peopleCollect = db.people,
  electionsCollect = db.elections,
  // common use
  deleted = 0,
  created = 0,
  updated = 0;



/* Role initialisation
    NOTE: The level value 
        a) should not be changed unless the entire database is been recreated!
        b) Must correspons tp the ROLE_xxx values in ../consts.js
*/
var Roles = {
  // level definitions for Roles TAKEN FROM ../consts.js
    ROLE_ADMIN: 100,      // admin level access
    ROLE_MANAGER: 90,     // manager level access
    ROLE_GROUP_LEAD: 80,  // group leader level access
    ROLE_STAFF: 70,       // staff level access
    ROLE_CANVASSER: 60,   // canvasser level access
    ROLE_NONE: 0          // public level access
  },
  // menu access consts copied from consts.js
  ACCESS = {
    ACCESS_NONE: 0x00,    // no access
    ACCESS_CREATE: 0x01,  // create access
    ACCESS_READ: 0x02,    // read access
    ACCESS_UPDATE: 0x04,  // update access
    ACCESS_DELETE: 0x08,  // delete access
    ACCESS_BATCH: 0x10,   // batch mode access
    ACCESS_BIT_COUNT: 5,  // number of access bits per group
    ACCESS_MASK: 0x1f,    // map of access bits
    // ** see below for values quick ref **

    ACCESS_ALL: 0x01,     // access all objects group
    ACCESS_ONE: 0x02,     // access single object group
    ACCESS_OWN: 0x04,     // access own object group
    ACCESS_GROUPMASK: 0x07,// map of access group bits
  };

function makePrivilegeMask (all, one, own) {
  var mask = ACCESS.ACCESS_NONE,
    priv,
    shift,
    grp,
    map = {};
  map[ACCESS.ACCESS_ALL] = all;
  map[ACCESS.ACCESS_ONE] = one;
  map[ACCESS.ACCESS_OWN] = own;

  for (grp = ACCESS.ACCESS_ALL, shift = 0; 
    (grp & ACCESS.ACCESS_GROUPMASK) != 0; 
    grp <<= 1, shift += ACCESS.ACCESS_BIT_COUNT) {
    priv = map[grp];
    if (priv) {
      for (var i = 0, ll = priv.length; i < ll; ++i) {
        switch (priv.charAt(i).toLowerCase()) {
          case 'c':
            mask |= (ACCESS.ACCESS_CREATE << shift);
            break;
          case 'r':
            mask |= (ACCESS.ACCESS_READ << shift);
            break;
          case 'u':
            mask |= (ACCESS.ACCESS_UPDATE << shift);
            break;
          case 'd':
            mask |= (ACCESS.ACCESS_DELETE << shift);
            break;
          case 'b':
            mask |= (ACCESS.ACCESS_BATCH << shift);
            break;
        }
      }
    }
  }
  return mask;
}

var predefRoles = [
  { name: 'Administrator', level: Roles.ROLE_ADMIN,
    //                               all     one     own
    votingsysPriv: makePrivilegeMask('crud', 'crud', ''),
    rolesPriv: makePrivilegeMask('crud', 'crud', ''),
    usersPriv: makePrivilegeMask('crudb', 'crud', 'ru'),
    electionsPriv: makePrivilegeMask('crud', 'crud', ''),
    candidatesPriv: makePrivilegeMask('crud', 'crud', ''),
    canvassesPriv: makePrivilegeMask('crud', 'crud', ''),
    noticePriv: makePrivilegeMask('crud', 'crud', '')
  },
  { name: 'Manager', level: Roles.ROLE_MANAGER,
    //                               all     one     own
    votingsysPriv: makePrivilegeMask('crud', 'crud', ''),
    rolesPriv: makePrivilegeMask('ru', 'ru', ''),
    usersPriv: makePrivilegeMask('crud', 'crud', 'ru'),
    electionsPriv: makePrivilegeMask('crud', 'crud', ''),
    candidatesPriv: makePrivilegeMask('crud', 'crud', ''),
    canvassesPriv: makePrivilegeMask('crud', 'crud', ''),
    noticePriv: makePrivilegeMask('cru', 'crud', '')
  },
  { name: 'Group Leader', level: Roles.ROLE_GROUP_LEAD,
    //                               all     one     own
    votingsysPriv: makePrivilegeMask('crud', 'crud', ''),
    rolesPriv: makePrivilegeMask('r', 'r', ''),
    usersPriv: makePrivilegeMask('crud', 'crud', 'ru'),
    electionsPriv: makePrivilegeMask('crud', 'crud', ''),
    candidatesPriv: makePrivilegeMask('crud', 'crud', ''),
    canvassesPriv: makePrivilegeMask('crud', 'crud', ''),
    noticePriv: makePrivilegeMask('cru', 'crud', '')
  },
  { name: 'Staff', level: Roles.ROLE_STAFF,
    //                               all     one     own
    votingsysPriv: makePrivilegeMask('crud', 'crud', ''),
    rolesPriv: makePrivilegeMask('r', 'r', ''),
    usersPriv: makePrivilegeMask('ru', 'ru', 'ru'),
    electionsPriv: makePrivilegeMask('crud', 'crud', ''),
    candidatesPriv: makePrivilegeMask('crud', 'crud', ''),
    canvassesPriv: makePrivilegeMask('crud', 'crud', ''),
    noticePriv: makePrivilegeMask('cru', 'crud', '')
  },
  { name: 'Canvasser', level: Roles.ROLE_CANVASSER,
    //                               all     one     own
    votingsysPriv: makePrivilegeMask('r', 'r', ''),
    rolesPriv: makePrivilegeMask('r', 'r', ''),
    usersPriv: makePrivilegeMask('r', 'r', 'ru'),
    electionsPriv: makePrivilegeMask('r', 'r', ''),
    candidatesPriv: makePrivilegeMask('r', 'r', ''),
    canvassesPriv: makePrivilegeMask('r', 'r', ''),
    noticePriv: makePrivilegeMask('r', 'r', '')
  },
  { name: 'None', level: Roles.ROLE_NONE,
    //                               all     one     own
    votingsysPriv: makePrivilegeMask('r', 'r', ''),
    rolesPriv: makePrivilegeMask('r', 'r', ''),
    usersPriv: makePrivilegeMask('r', 'r', 'ru'),
    electionsPriv: makePrivilegeMask('r', 'r', ''),
    candidatesPriv: makePrivilegeMask('r', 'r', ''),
    canvassesPriv: makePrivilegeMask('r', 'r', ''),
    noticePriv: makePrivilegeMask('r', 'r', '')
  },
];

/**
 * Create the basic roles required by the system
 */  
function createRoles() {
  deleted = created = updated = 0;
  predefRoles.forEach(function (predef, index, array) {
    var cursor = rolesCollect.find({'level': predef.level});
    if (cursor.hasNext()) {
      // exists in database
      var dbObj = cursor.next();
      rolesCollect.findOneAndUpdate({
        'level': predef.level
      }, {
        $set: predef
      });
      ++updated;
    } else {
      // create
      rolesCollect.insert(predef);
      ++created;
    }
  });

  // delete roles in db other than those just added
  var cursor = rolesCollect.find({});
  var list = [];
  while (cursor.hasNext()) {
    var dbObj = cursor.next(),
      i;
    for (i = 0; i < predefRoles.length; ++i) {
      if (testEquality(dbObj, predefRoles[i], ['name', 'level'])) {
        break;
      }
    }
    if (i == predefRoles.length) {
      list.push(dbObj._id);
    }
  }
  list.forEach(function (item, index, array) {
    var res = rolesCollect.deleteOne({'_id': item});
    deleted += res.deletedCount;
  });
  print('Roles: updated ' + updated + ', created ' + created + ', deleted ' + deleted);
}

/* Voting systems initialisation */
var predefVotingSystems = [
  { name: 'First Past The Post',
    abbreviation: 'FPTP',
    description: 'A first-past-the-post (abbreviated FPTP, 1stP, 1PTP or FPP) or winner-takes-all election is one that is won by the candidate receiving more votes than any others.',
    preferenceLevels: ['Yes', 'No', 'Undecided' ]
  },
  { name: 'Single Transferable Vote',
    abbreviation: 'STV',
    description: 'The single transferable vote (STV) is a voting system designed to achieve proportional representation through ranked voting in multi-seat constituencies (voting districts). Under STV, an elector (voter) has a single vote that is initially allocated to their most preferred candidate and, as the count proceeds and candidates are either elected or eliminated, is transferred to other candidates according to the voter\'s stated preferences, in proportion to any surplus or discarded votes.',
    preferenceLevels: ['1st', '2nd', '3rd', 'Nth', 'None', 'Undecided' ]
  }
];

/**
 * Create the basic voting systems required by the system
 */
function createVotingSystems() {
  deleted = created = updated = 0;
  predefVotingSystems.forEach(function (predef, index, array) {
    var findParam = {'abbreviation': predef.abbreviation};
    var cursor = votingSysCollect.find(findParam);
    if (cursor.hasNext()) {
      // exists in database
      var dbObj = cursor.next();
      votingSysCollect.findOneAndUpdate({
        'abbreviation': predef.abbreviation
      }, {
        $set: {
          'name': predef.name, 
          'description': predef.description, 
          'preferenceLevels': predef.napreferenceLevelsme
        }
      });
      ++updated;
    } else {
      // create
      votingSysCollect.insert(predef);
      ++created;
    }
    cursor = votingSysCollect.findOne(findParam);

    array[index]._id = cursor._id;  // save for later
  });
  print('Voting systems: updated ' + updated + ', created ' + created + ', deleted ' + deleted);
}

var USA = 'United States of America (USA)';

/* Political parties initialisation */
var predefParties = [{ 
  party: {
    name: 'Conserative Party',
    description: 'A political party of those of a conserative nature.',
    note: 'Very popular with conseratives, according to https://www.forbes.com/pictures/gfii45img/most-conservative-no-1/#591397af792a'
  },
  addr: {
    addrLine1: '1313 East Baseline Road',
    addrLine2: '',
    addrLine3: '',
    town: 'Gilbert',
    city: '',
    county: '',
    state: 'Arizona',
    postcode: 'AZ 85233',
    country: USA,
    gps: '33.3777623,-111.80334390000002'
  },
  contact: {
    phone: '123-456-123456789',
    mobile: '456-123456789',
    email: 'party@conserative.org',
    website: 'http://conserative.org',
    facebook: 'https://www.facebook.com/Conserative.Party',
    twitter: '@Conserative.Party'
  }
}, { 
  party: {
    name: 'Progressive Party',
    description: 'A political party of those of a progressive nature.',
    note: 'Very popular with non-conseratives, according to https://www.forbes.com/pictures/gfii45img/most-liberal-no-1/#4e1f6dcc5c41'
  },
  addr: {
    addrLine1: '1000 Lombard Street',
    addrLine2: '',
    addrLine3: '',
    town: '',
    city: 'San Francisco',
    county: '',
    state: 'California',
    postcode: 'CA 94109',
    country: USA,
    gps: '37.802458,-122.418207'
  },
  contact: {
    phone: '123-987-987654321',
    mobile: '987-987654321',
    email: 'party@progressive.org',
    website: 'http://progressive.org',
    facebook: 'https://www.facebook.com/Progressive.Party',
    twitter: '@Progressive.Party'
  }
}, {
  party: {
    name: 'Apathy Party',
    description: 'A political party of those who do not care about politics.',
    note: 'Very popular with no-one as they do not care about politics, according to https://www.forbes.com/2010/11/02/cities-stress-quality-of-life-lifestyle-real-estate-relaxed_slide_11.html'
  },
  addr: {
    addrLine1: '1000 Summit Avenue',
    addrLine2: '',
    addrLine3: '',
    town: '',
    city: 'Saint Paul',
    county: '',
    state: 'Minnesota',
    postcode: 'MN 55105',
    country: USA,
    gps: '44.9413888,-93.14269200000001'
  },
  contact: {
    phone: '123-001-112233445',
    mobile: '001-112233445',
    email: 'party@apathy.org',
    website: 'http://apathy.org',
    facebook: 'https://www.facebook.com/apathy.party',
    twitter: '@apathy.party'
  }
}];

/**
 * Create the basic political parties required by the system
 */
function createParties() {
  partiesCollect.drop();

  deleted = created = updated = 0;
  predefParties.forEach(function (predef, index, array) {
    var findParam = {'name': predef.party.name};
    var cursor = partiesCollect.find(findParam);
    if (cursor.hasNext()) {
      // exists in database
      var dbObj = cursor.next();
      partiesCollect.findOneAndUpdate(findParam, {$set: predef.party});
      ++updated;
    } else {
      // create
      partiesCollect.insert(predef.party);
      ++created;
    }
    cursor = partiesCollect.findOne(findParam);

    array[index].party['_id'] = cursor._id; // save id for later

    var need2update = {};

    var result = insertOrUpdate(addressCollect, cursor.address, predef.addr, cursor._id);
    if (result.action === 'insert') {
      need2update['address'] = result._id;
    }
    result = insertOrUpdate(contactCollect, cursor.contactDetails, predef.contact, cursor._id);
    if (result.action === 'insert') {
      need2update['contactDetails'] = result._id;
    }
    if (!isEmpty(need2update)) {
      partiesCollect.findOneAndUpdate(findParam,{$set: need2update});
    }
  });
  print('Political parties: updated ' + updated + ', created ' + created + ', deleted ' + deleted);
}

/* Candidates initialisation
  one for each predef party in *same* order */
var predefCandidates = [
  { party: 'Conserative Party',   // must match party name in db
    person: {
      firstname: 'Joe',
      lastname: 'Slowchange'
    }, 
    addr: {
      addrLine1: '1314 East Baseline Road',
      addrLine2: '',
      addrLine3: '',
      town: 'Gilbert',
      city: '',
      county: '',
      state: 'Arizona',
      postcode: 'AZ 85233',
      country: USA,
      gps: '33.3790239,-111.80260929999997'
    },
    contact: {
      phone: '123-456-012345678',
      mobile: '456-012345678',
      email: 'joe.slowchange@conserative.org',
      website: 'http://joeslowchange.conserative.org',
      facebook: 'https://www.facebook.com/joe.slowchange',
      twitter: '@joe.slowchange'
    }
  },
  { party: 'Progressive Party',   // must match party name in db
    person: {
      firstname: 'Mary',
      lastname: 'Allchange'
    },
    addr: {
      addrLine1: '1010 Lombard Street',
      addrLine2: '',
      addrLine3: '',
      town: '',
      city: 'San Francisco',
      county: '',
      state: 'California',
      postcode: 'CA 94109',
      country: USA,
      gps: '37.802377,-122.41837620000001'
    },
    contact: {
      phone: '123-987-098765432',
      mobile: '987-098765432',
      email: 'mary.allchange@progressive.org',
      website: 'http://maryallchange.progressive.org',
      facebook: 'https://www.facebook.com/mary.allchange',
      twitter: '@mary.allchange'
    }
  },
  { party: 'Apathy Party',   // must match party name in db
    person: {
      firstname: 'Donal',
      lastname: 'Care'
    },
    addr: {
      addrLine1: '1001 Summit Avenue',
      addrLine2: '',
      addrLine3: '',
      town: '',
      city: 'Saint Paul',
      county: '',
      state: 'Minnesota',
      postcode: 'MN 55105',
      country: USA,
      gps: '44.9413864,-93.14224089999999'
    },
    contact: {
      phone: '123-001-011223344',
      mobile: '001-011223344',
      email: 'donal.care@apathy.org',
      website: 'http://donalcare.apathy.org',
      facebook: 'https://www.facebook.com/donal.care',
      twitter: '@donal.care'
    }
  }
];

/**
 * Create the sample candidates
 */
function createCandidates() {
  /* TODO: sort out find for subdoc or redesign schema, probably need to redesign
    as currently a candidate just holds references to a person & party */

  deleted = candidatesCollect.count();
  created = updated = 0;

  candidatesCollect.drop();   // just for now, may need to redo schemas

  predefCandidates.forEach(function (predef, index, array) {
    
    var findParam = {'firstname': predef.person.firstname, 'lastname': predef.person.lastname};
    var cursor = peopleCollect.find(findParam);
    if (cursor.hasNext()) {
      // exists in database
      var dbObj = cursor.next();
      peopleCollect.findOneAndUpdate(findParam, {$set: predef.person});
      ++updated;
    } else {
      // create
      peopleCollect.insert(predef.person);
      ++created;
    }
    cursor = peopleCollect.findOne(findParam);

    var need2update = {};

    var result = insertOrUpdate(addressCollect, cursor.address, predef.addr, cursor._id);
    if (result.action === 'insert') {
      need2update['address'] = result._id;
    }
    result = insertOrUpdate(contactCollect, cursor.contactDetails, predef.contact, cursor._id);
    if (result.action === 'insert') {
      need2update['contactDetails'] = result._id;
    }
    if (!isEmpty(need2update)) {
      peopleCollect.findOneAndUpdate(findParam,{$set: need2update});
    }

    var party = partiesCollect.findOne({'name': predef.party});
    if (party) {
      // create candidate entry
      result = insertOrUpdate(candidatesCollect, undefined, { 
        'person': cursor._id, 'party': party._id
      }, undefined);
      if (result.action === 'insert') {
        array[index]._id = result._id; // save id for later
        ++created;
      }
    } else {
      print('Unable to find party \'' + predef.party + '\' for candidate ' + predef.person.firstname + ' ' + predef.person.lastname);
    }
  });
  print('Candidates: updated ' + updated + ', created ' + created + ', deleted ' + deleted);
}

/* Election initialisation */
var predefElections = [
  {
    system: 'FPTP', // must match abbreviation of existing voting system
    election: {
      name: 'Sample Election',
      description: 'Election to demonstrate functionlaity.',
      seats: 1,
      electionDate: Date.now(),
    }
  }
];

/**
 * Create sample elections
 */
function createElections() {

  deleted = electionsCollect.count();
  created = updated = 0;

  electionsCollect.drop();

  predefElections.forEach(function (predef, index, array) {
    
    var system = votingSysCollect.findOne({'abbreviation': predef.system});
    if (system) {
      // create election entry
      var election = Object.assign({}, predef.election);
      election.candidates = [];
      var cursor = candidatesCollect.find();
      while (cursor.hasNext()) {
        election.candidates.push(cursor.next()._id);
      }

      var result = insertOrUpdate(electionsCollect, undefined, election, undefined);
      if (result.action === 'insert') {
        ++created;
      }
    } else {
      print('Unable to find voting system \'' + predef.system + '\' for election ' + predef.election.name);
    }
  });
  print('Elections: updated ' + updated + ', created ' + created + ', deleted ' + deleted);
}


/* Address initialisation */
var predefAddresses = [
  {
    addr: {
      addrLine1: 'Hollywood Boulevard',
      addrLine2: '',
      addrLine3: '',
      town: '',
      city: 'Los Angeles',
      county: '',
      state: 'California',
      postcode: 'CA 90028',
      country: USA,
      gps: ''
    },
    houses: [
      6170, 6172, 6174, 6176, 6178, 6180
    ]
  }
];

/**
 * Create sample canvass addresses
 */
function createAddresses() {
  deleted = created = updated = 0;
  predefAddresses.forEach(function (predef, index, array) {
    predef.houses.forEach(function (hseNum) {

      var addr = Object.assign({}, predef.addr);
      addr.addrLine1 = hseNum + ' ' + addr.addrLine1;

      var findParam = {'addrLine1': addr.addrLine1};
      var cursor = addressCollect.find(findParam);
      if (cursor.hasNext()) {
        // exists in database
        var dbObj = cursor.next();
        addressCollect.findOneAndUpdate(findParam, {$set: addr});
        ++updated;
      } else {
        // create
        addressCollect.insert(addr);
        ++created;
      }
    });
  });
  print('Addresses: updated ' + updated + ', created ' + created + ', deleted ' + deleted);
}


var collections = [
  'roles',
  'votingsystems',
  'parties',
  'candidates',
  'elections',
  'addresses'
];
/**
 * Create collections
 * @param {string[]} args   collections to create
 */
function createCollections (args) {
  var exe = [ // exe flags NOTE matches order of collections
      { flag: false, cmd: createRoles }, // create roles
      { flag: false, cmd: createVotingSystems },  // create voting systems
      { flag: false, cmd: createParties },  // create parties
      { flag: false, cmd: createCandidates },  // create candidates
      { flag: false, cmd: createElections },  // create elections
      { flag: false, cmd: createAddresses },  // create addresses
    ],
    usedArgCount = 0; // number of arguments used

  if (!args || !args.length) {
    // default do all
    exe.forEach(function (exeFlag) {
      exeFlag.flag = true;
    });
  }
  for (usedArgCount = 0; usedArgCount < args.length; ++usedArgCount) {
    var index = collections.findIndex(function (coll) {
      return (coll === args[usedArgCount]);
    });
    if (index >= 0) {
      exe[index].flag = true; // mark for execution
    }
  }
  exe.forEach(function (exeFlag) {
    if (exeFlag.flag) {
      exeFlag.cmd();  // execute
    }
  });
  return usedArgCount;
}

var cmdPrefix = '--', 
  scmdPrefix = '-',
  canvasstracCmds = [
    { cmd: 'help', scmd: 'h', help: 'Display help' },
    { cmd: 'create', scmd: 'c', help: [ 'Create database collections.', 'Options are:' ].concat(collections, 'Default option is all') },
  ];

/**
 * Display help 
 */
function displayHelp() {
  print('Usage: canvasstrac(<args>)');
  print('       where <args> is a string of commands');
  canvasstracCmds.forEach(function (cmd) {
    var helpArray;
    if (Array.isArray(cmd.help)) {
      helpArray = cmd.help;
    } else {
      helpArray = [cmd.help];
    }
    print('       ' + cmdPrefix + cmd.cmd + ', ' + scmdPrefix + cmd.scmd + ' : ' + helpArray[0]);
    helpArray.slice(1).forEach(function (hlp) {
      print('         ' + hlp);
    });
  });
}

/**
 * Command function
 * @param {string} cmd  Commands to execute
 */
function canvasstrac(cmd) {

  if (!cmd) {
    cmd = scmdPrefix + 'h'; // help
  }
  var prefixes = [
      { prefix: cmdPrefix, cmd: 'cmd' },
      { prefix: scmdPrefix, cmd: 'scmd' }
    ],
    splits = cmd.split(' ');
  for (var i = 0; i < splits.length; ++i) {
    // find command prefix
    var cmdCtrl = prefixes.find(function (prefix) {
      return (splits[i].indexOf(prefix.prefix) === 0);
    });
    if (cmdCtrl) { 
      // find command
      var exeCmd = canvasstracCmds.find(function (cmd) {
        return (cmd[cmdCtrl.cmd] === splits[i].substr(cmdCtrl.prefix.length));
      });
      if (exeCmd) {
        // execute command
        switch (exeCmd.scmd) {
          case 'h':
            displayHelp();
            break;
          case 'c':
            i += createCollections(splits.slice(i + 1));
            break;
        }
      } else {
        print('Ignoring argument: ' + splits[i]);
      }
    } else {
      print('Ignoring argument: ' + splits[i]);
    }
  }
}
