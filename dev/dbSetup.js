/*jslint node: true */
'use strict';

/* Run this script in the mongo shell to create/update the basic data required by the 
  application.
  E.g. if the mongo client is running from c:\app folder & the app is in c:\app\canvasstrac,
      it may be run as follows:
        load("canvasstrac-server/dev/dbSetup.js")
*/

//var db = connect('localhost:27017/canvassTrac');

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
};
var predefRoles = [
  { name: "Administrator", level: Roles.ROLE_ADMIN },
  { name: "Manager", level: Roles.ROLE_MANAGER },
  { name: "Group Leader", level: Roles.ROLE_GROUP_LEAD },
  { name: "Staff", level: Roles.ROLE_STAFF },
  { name: "Canvasser", level: Roles.ROLE_CANVASSER },
  { name: "None", level: Roles.ROLE_NONE },
];
var rolesCollect = db.roles;

var deleted = 0,
  created = 0,
  processed = 0;
predefRoles.forEach(function (predef, index, array) {
  var cursor = rolesCollect.find({"level": predef.level});
  if (cursor.hasNext()) {
    // exists in database
    var dbObj = cursor.next();
    rolesCollect.findOneAndUpdate({"level": predef.level}, 
                              {$set: {"name": predef.name}});
    ++processed;
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
  var res = rolesCollect.deleteOne({"_id": item});
  deleted += res.deletedCount;
});
print("Roles: processed " + processed + ", created " + created + ", deleted " + deleted);


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
var votingSysCollect = db.votingsystems;

deleted = 0;
created = 0;
processed = 0;
predefVotingSystems.forEach(function (predef, index, array) {
  var findParam = {"abbreviation": predef.abbreviation};
  var cursor = votingSysCollect.find(findParam);
  if (cursor.hasNext()) {
    // exists in database
    var dbObj = cursor.next();
    votingSysCollect.findOneAndUpdate({"abbreviation": predef.abbreviation}, 
                              {$set: {"name": predef.name, "description": predef.description, "preferenceLevels": predef.napreferenceLevelsme}});
    ++processed;
  } else {
    // create
    votingSysCollect.insert(predef);
    ++created;
  }
  cursor = votingSysCollect.findOne(findParam);

  array[index]._id = cursor._id;  // save for later
});
print("Voting systems: processed " + processed + ", created " + created + ", deleted " + deleted);


/* Political parties initialisation */
var predefParties = [
  { party: {
      name: 'Conserative Party',
      description: 'A political party of those of a conserative nature.',
      note: 'Very popular with conseratives!'
    },
    addr: {
      addrLine1: '1 Nochange St.',
      addrLine2: 'Statusquoville',
      addrLine3: 'Plus ca change',
      town: 'Con town',
      city: 'Serve city',
      county: 'Ative County',
      postcode: 'C1'
    },
    contact: {
      phone: '123-456-123456789',
      mobile: '456-123456789',
      email: 'party@conserative.org',
      website: 'http://conserative.org',
      facebook: "https://www.facebook.com/Conserative.Party",
      twitter: "@Conserative.Party"
    }
  },
  { party: {
      name: 'Progressive Party',
      description: 'A political party of those of a progressive nature.',
      note: 'Very popular with non-conseratives!'
    },
    addr: {
      addrLine1: '99 Allchange St.',
      addrLine2: 'Progressus Hill',
      addrLine3: 'Progressio',
      town: 'Prog town',
      city: 'Ress city',
      county: 'Ive County',
      postcode: 'P1'
    },
    contact: {
      phone: '123-987-987654321',
      mobile: '987-987654321',
      email: 'party@progressive.org',
      website: 'http://progressive.org',
      facebook: "https://www.facebook.com/Progressive.Party",
      twitter: "@Progressive.Party"
    }
  },
  { party: {
      name: 'Apathy Party',
      description: 'A political party of those who do not care about politics.',
      note: 'Very popular with no-one as they do not care about politics.'
    },
    addr: {
      addrLine1: '149 Wherever St.',
      addrLine2: 'Indifferent Court',
      addrLine3: 'Carenot',
      town: 'Ap town',
      city: 'At city',
      county: 'Hy County',
      postcode: 'A1'
    },
    contact: {
      phone: '123-001-112233445',
      mobile: '001-112233445',
      email: 'party@apathy.org',
      website: 'http://apathy.org',
      facebook: "https://www.facebook.com/apathy.party",
      twitter: "@apathy.party"
    }
  }
];
var partiesCollect = db.parties;
var addressCollect = db.addresses;
var contactCollect = db.contactdetails;

partiesCollect.drop();

function insertOrUpdate(collection, existingId, doc, ownerId) {
  var result = {};
  if (existingId) {

  print('existingId', existingId);
  printjson(doc);
    
    var doc = collection.findOneAndUpdate({_id: existingId}, {$set: doc}, {returnNewDocument: true});
  print('doc', doc);
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
  print('result', result);
  
  return result;
}

deleted = 0;
created = 0;
processed = 0;
predefParties.forEach(function (predef, index, array) {
  var findParam = {"name": predef.party.name};
  var cursor = partiesCollect.find(findParam);
  if (cursor.hasNext()) {
    // exists in database
    var dbObj = cursor.next();
    partiesCollect.findOneAndUpdate(findParam, {$set: predef.party});
    ++processed;
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
print("Political parties: processed " + processed + ", created " + created + ", deleted " + deleted);


/* Candidates initialisation
  one for each predef party in *same* order */
var predefCandidates = [
  { person: {
      firstname: 'Joe',
      lastname: 'Slowchange'
    }, 
    addr: {
      addrLine1: '2 Nochange St.',
      addrLine2: 'Statusquoville',
      addrLine3: 'Plus ca change',
      town: 'Con town',
      city: 'Serve city',
      county: 'Ative County',
      postcode: 'C1'
    },
    contact: {
      phone: '123-456-012345678',
      mobile: '456-012345678',
      email: 'joe.slowchange@conserative.org',
      website: 'http://joeslowchange.conserative.org',
      facebook: "https://www.facebook.com/joe.slowchange",
      twitter: "@joe.slowchange"
    }
  },
  { person: {
      firstname: 'Mary',
      lastname: 'Allchange'
    },
    addr: {
      addrLine1: '100 Allchange St.',
      addrLine2: 'Progressus Hill',
      addrLine3: 'Progressio',
      town: 'Prog town',
      city: 'Ress city',
      county: 'Ive County',
      postcode: 'P1'
    },
    contact: {
      phone: '123-987-098765432',
      mobile: '987-098765432',
      email: 'mary.allchange@progressive.org',
      website: 'http://maryallchange.progressive.org',
      facebook: "https://www.facebook.com/mary.allchange",
      twitter: "@mary.allchange"
    }
  },
  { person: {
      firstname: 'Donal',
      lastname: 'Care'
    },
    addr: {
      addrLine1: '150 Wherever St.',
      addrLine2: 'Indifferent Court',
      addrLine3: 'Carenot',
      town: 'Ap town',
      city: 'At city',
      county: 'Hy County',
      postcode: 'A1'
    },
    contact: {
      phone: '123-001-011223344',
      mobile: '001-011223344',
      email: 'donal.care@apathy.org',
      website: 'http://donalcare.apathy.org',
      facebook: "https://www.facebook.com/donal.care",
      twitter: "@donal.care"
    }
  }
];
var candidatesCollect = db.candidates;
var peopleCollect = db.people;


/* TODO: sort out find for subdoc or redesign schema, probably need to redesign
  as currently a candidate just holds references to a person & party */
candidatesCollect.drop();   // just for now, may need to redo schemas

deleted = 0;
created = 0;
processed = 0;

predefCandidates.forEach(function (predef, index, array) {
  
  var findParam = {"firstname": predef.person.firstname, "lastname": predef.person.lastname};
  var cursor = peopleCollect.find(findParam);
  if (cursor.hasNext()) {
    // exists in database
    var dbObj = cursor.next();
    peopleCollect.findOneAndUpdate(findParam, {$set: predef.person});
    ++processed;
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

  // TODO bad hackery

  var result = insertOrUpdate(candidatesCollect, undefined, 
                {"person": cursor._id, "party": predefParties[index].party._id}, undefined);
  if (result.action === 'insert') {
    array[index]._id = result._id; // save id for later
    ++created;
  }
});
print("Candidates: processed " + processed + ", created " + created + ", deleted " + deleted);


/* Election initialisation */
var predefElections = [
  { name: 'Sample Election',
    description: 'Election to demonstrate functionlaity.',
    seats: 1,
    electionDate: Date.now(),
    system: predefVotingSystems[0]._id
  }
];
var electionsCollect = db.elections;

electionsCollect.drop();

deleted = 0;
created = 0;
processed = 0;
predefElections.forEach(function (predef, index, array) {
  
  predef.candidates = [];
  for (var i = 0; i < predefCandidates.length; ++i) {
    predef.candidates.push(predefCandidates[i]._id);
  }

  var result = insertOrUpdate(electionsCollect, undefined, predef, undefined);
  if (result.action === 'insert') {
    array[index]._id = result._id; // save id for later
    ++created;
  }
});
print("Elections: processed " + processed + ", created " + created + ", deleted " + deleted);



// /* Address initialisation */
// var predefStreets = [
//   'Orange', 'Avacado', 'Lime', 'Pineapple', 'Apple', 'Banana', 'Grape'
// ];
// var predefTowns = [
//   'Fruit town', 'One-of-Five town'
// ];
// var predefCities = [
//   { "city": 'Citrus city', "county": 'Citrus County' },
//   { "city": 'Fruity city', "county": 'Fruit County' }
// ];

// deleted = 0;
// created = 0;
// processed = 0;
// predefCities.forEach(function (city, cidx) {
//   predefTowns.forEach(function (town, tidx) {
//     predefStreets.forEach(function (street, sidx) {
//       for (var num = 1; num < 10; ++num) {
//         var addr = {
//           "addrLine1": num + ' ' + street + ' St.',
//           "addrLine2": street + 'ville',
//           "addrLine3": street,
//           "town": town,
//           "city": city.county,
//           "county": city.city,
//           "postcode": 'P' + sidx + '-' + tidx + '-' + cidx
//         };
//         var cursor = addressCollect.find({"postcode": addr.postcode});
//         if (cursor.hasNext()) {
//           // exists in database
//           var dbObj = cursor.next();
//           addressCollect.findOneAndUpdate({"postcode": addr.postcode}, {$set: addr});
//           ++processed;
//         } else {
//           // create
//           addressCollect.insert(addr);
//           ++created;
//         }
//       }  
//     });
//   });
// });

// print("Addresses: processed " + processed + ", created " + created + ", deleted " + deleted);





