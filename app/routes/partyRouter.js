/*jslint node: true */ /*eslint-env node*/
'use strict';

var express = require('express'),
  PartyModule = require('../models/party'),
  Party = PartyModule.model,
  getPartyTemplate = PartyModule.getTemplate,
  populateSubDocs = PartyModule.populateSubDocs,
  AddressModule = require('../models/addresses'),
  Addresses = AddressModule.model,
  getAddressTemplate = AddressModule.getTemplate,
  // AddressRouterModule = require('./addressRouter'),
  // addressRouter = AddressRouterModule.router,
  // updateAddress = AddressRouterModule.update,
  ContactDetailsModule = require('../models/contactDetails'),
  ContactDetails = ContactDetailsModule.model,
  getContactDetailsTemplate = ContactDetailsModule.getTemplate,
  Verify = require('./verify'),
  router_utils = require('./router_utils'),
  checkError = router_utils.checkError,
  errorReply = router_utils.errorReply,
  resultReply = router_utils.resultReply,
  populateSubDocsReply = router_utils.populateSubDocsReply,
  makeResult = router_utils.makeResult,
  updateDocAccessOk = router_utils.updateDocAccessOk,
  removeDocAccessOk = router_utils.removeDocAccessOk,
  // utils = require('../misc/utils'),
  Consts = require('../consts');


var router = express.Router();

router.route('/')

  .get(Verify.verifyHasCanvasserAccess, function (req, res, next) {
    Party.find({})
      .exec(function (err, docs) {
        if (!checkError(err, res)) {
          populateSubDocs(docs, function (err, docs) {
            if (!checkError(err, res)) {
              res.json(docs);
            }
          });
        }
      });
  });

/*
 * Remove party, address and contact details docuements
 * @param {mongoose.Schema.Types.ObjectId} partyId   - id of party doc to remove
 * @param {mongoose.Schema.Types.ObjectId} addressId - id of address doc to remove
 * @param {mongoose.Schema.Types.ObjectId} contactId - id of contact doc to remove
 */
function removePartyAddressContact (partyId, addressId, contactId) {
  removeDocAccessOk(Party, partyId);
  removeDocAccessOk(Addresses, addressId);
  removeDocAccessOk(ContactDetails, contactId);
}

function createParty (accessCheck, req, res, next) {

  accessCheck(req, res, function (err) {

    if (err) {
      errorReply(res, err.status, err.message);
      return;
    }
    
    var addressFields = getAddressTemplate(req.body),
      contactFields = getContactDetailsTemplate(req.body),
      partyFields = getPartyTemplate(req.body);
  
    Party.create(partyFields, function (err, party) {
      if (!checkError (err, res)) {

        addressFields.owner = party._id;
        contactFields.owner = party._id;

        // create address
        Addresses.create(addressFields, function (err, address) {
          if (!checkError (err, res)) {

            // create contact details
            ContactDetails.create(contactFields, function (err, contact) {
              if (!checkError (err, res)) {

                party.address = address._id;
                party.contactDetails = contact._id;
                party.save(function (err, newparty) {
                  if (!checkError (err, res)) {
                    // success
                    populateSubDocs(newparty, function (err, doc) {
                      populateSubDocsReply(err, res, next, doc, Consts.HTTP_CREATED);
                    });
                  } else {
                    // tidy up by removing everything
                    removePartyAddressContact (party._id, address._id, contact._id);
                    var addrErr = new Error('Unable to save party.');
                    addrErr.status = Consts.HTTP_INTERNAL_ERROR;
                    checkError(addrErr, res);
                  }
                });
              } else {
                // tidy up by removing party & address
                removePartyAddressContact (party._id, address._id);
                var cdErr = new Error('Unable to create contact details.');
                cdErr.status = Consts.HTTP_INTERNAL_ERROR;
                checkError(cdErr, res);
              }
            });
          } else {
            // tidy up by removing party
            removePartyAddressContact (party._id);
            var addrErr = new Error('Unable to create address.');
            addrErr.status = Consts.HTTP_INTERNAL_ERROR;
            checkError(addrErr, res);
          }
        });
      }
    });
  });
}

function updateParty (accessCheck, id, req, res, next) {

  accessCheck(req, res, function (err) {

    if (err) {
      errorReply(res, err.status, err.message);
      return;
    }
    
    var addressFields = getAddressTemplate(req.body),
      contactFields = getContactDetailsTemplate(req.body),
      partyFields = getPartyTemplate(req.body);

    Party.findByIdAndUpdate(id, {
      $set: partyFields
    }, {
      new: true // return the modified document rather than the original
    }, function (err, party) {
      if (!checkError (err, res)) {
        
        if (party) {

          var mustSave = false;          

          updateDocAccessOk(addressFields, Addresses, party.address, res, function (result, res) {
            if (result) {
              // success or nothing to do
              if ((result.status == Consts.HTTP_OK) && (party.address != result.payload._id)) {
                // created new document
                party.address = result.payload._id;
                mustSave = true;
              }
              
              updateDocAccessOk(contactFields, ContactDetails, party.contactDetails, res, function (result, res) {
                if (result) {
                  // success or nothing to do
                  if ((result.status == Consts.HTTP_OK) && (party.contactDetails != result.payload._id)) {
                    // created new document
                    party.contactDetails = result.payload._id;
                    mustSave = true;
                  }

                  if (mustSave) {
                    // need to save party document
                    party.save(function (err, updated) {
                      if (!checkError (err, res)) {
                        // success
                        populateSubDocs(updated, function (err, doc) {
                          populateSubDocsReply(err, res, next, doc, Consts.HTTP_OK);
                        });
                      }
                    });
                  } else {
                    // populate party and return
                    populateSubDocs(party, function (err, doc) {
                      populateSubDocsReply(err, res, next, doc, Consts.HTTP_OK);
                    });
                  }                      
                }
              });
            }
          });
        } else {
          errorReply(res, Consts.HTTP_NOT_FOUND, 'Unknown party identifier');
        }
      }
    });
  });
}


function deleteParty (accessCheck, id, req, res, next) {

  accessCheck(req, res, function (err) {

    if (err) {
      errorReply(res, err.status, err.message);
      return;
    }

    // TODO implement a tree delete

    Party.findById(id, function (err, party) {
      if (!checkError (err, res)) {
        if (party) {
          // delete address
          removeDocAccessOk(Addresses, party.address, res, function (result) {
            if (result) {
              // delete contact details
              removeDocAccessOk(ContactDetails, party.contactDetails, res, function (result) {
                if (result) {
                  party.remove(function (err, party) {
                    if (!checkError (err, res)) {
                      // success
                      next(makeResult(Consts.HTTP_OK, party), res);
                    }
                  });
                }
              });
            }
          });
        } else {
          errorReply(res, Consts.HTTP_NOT_FOUND, 'Unknown party identifier');
        }
      }
    });
  });
}

router.route('/register')

  .post(Verify.verifyHasStaffAccess, function (req, res) {

    // create party (no access check as done in route)
    createParty(Verify.verifyNoCheck, req, res, resultReply);
  });

router.route('/:objId')

  .get(Verify.verifyHasCanvasserAccess, function (req, res, next) {

    Party.findById(req.params.objId)
      .exec(function (err, doc) {
        if (!checkError(err, res)) {
          if (doc) {
            populateSubDocs(doc, function (err, doc) {
              if (!checkError(err, res)) {
                res.json(doc);
              }
            });
          } else {
            errorReply(res, Consts.HTTP_NOT_FOUND, 'Unknown party identifier');
          }
        }
      });
  })

  .put(Verify.verifyHasStaffAccess, function (req, res, next) {

    // update party (no access check as done in route)
    updateParty(Verify.verifyNoCheck, req.params.objId, req, res, resultReply);
  })

  .delete(Verify.verifyHasStaffAccess, function (req, res, next) {
  
    // delete party (no access check as done in route)
    deleteParty(Verify.verifyNoCheck, req.params.objId, req, res, resultReply);
  });

module.exports = {
  router: router
};