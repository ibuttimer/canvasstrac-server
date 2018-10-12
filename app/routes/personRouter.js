/*jslint node: true */ /*eslint-env node*/
'use strict';

var express = require('express'),
  PeopleModule = require('../models/person'),
  People = PeopleModule.model,
  getModelNodeTree = PeopleModule.getModelNodeTree,
  getPersonTemplate = PeopleModule.getTemplate,
  populateSubDocs = PeopleModule.populateSubDocs,
  isValidModelPath = PeopleModule.isValidModelPath,
  AddressModule = require('../models/addresses'),
  Addresses = AddressModule.model,
  getAddressTemplate = AddressModule.getTemplate,
  ContactDetailsModule = require('../models/contactDetails'),
  ContactDetails = ContactDetailsModule.model,
  getContactDetailsTemplate = ContactDetailsModule.getTemplate,
  Verify = require('./verify'),
  router_utils = require('./router_utils'),
  checkError = router_utils.checkError,
  newError = router_utils.newError,
  errorReply = router_utils.errorReply,
  resultReply = router_utils.resultReply,
  populateSubDocsReply = router_utils.populateSubDocsReply,
  makeResult = router_utils.makeResult,
  updateDocAccessOk = router_utils.updateDocAccessOk,
  removeDocAccessOk = router_utils.removeDocAccessOk,
  processCountReq = router_utils.processCountReq,
  getDocs = router_utils.getDocs,
  Consts = require('../consts');


var router = express.Router();



router.route('/')

  .get(Verify.verifyHasCanvasserAccess, function (req, res, next) {

    getDocs(req, res, isValidModelPath, getModelNodeTree(), resultReply); 
  });

/*
 * Remove person, address and contact details docuements
 * @param {mongoose.Schema.Types.ObjectId} personId - id of person doc to remove
 * @param {mongoose.Schema.Types.ObjectId} addressId - id of address doc to remove
 * @param {mongoose.Schema.Types.ObjectId} contactId - id of contact doc to remove
 */
function removeDocuments (personId, addressId, contactId) {
  removeDocAccessOk(People, personId);
  removeDocAccessOk(Addresses, addressId);
  removeDocAccessOk(ContactDetails, contactId);
}

/**
 * Add a person document to the database without an access check
 * @param {object} rawPerson  Person info to add
 * @param {Object} res        http response
 * @param {function} next     next function
 */
function createPersonAccessOk (rawPerson, res, next) {

  /* person info arrives as a flattened object */
  var addressFields = getAddressTemplate(rawPerson),
    contactFields = getContactDetailsTemplate(rawPerson),
    // don't exclude owner field'
    personFields = getPersonTemplate(rawPerson, ['address', 'contactDetails']);

  People.create(personFields, function (err, person) {
    if (!checkError (err, res)) {

      addressFields.owner = person._id;
      contactFields.owner = person._id;

      // create address
      Addresses.create(addressFields, function (err, address) {
        if (!checkError (err, res)) {

          // create contact details
          ContactDetails.create(contactFields, function (err, contact) {
            if (!checkError (err, res)) {

              person.address = address._id;
              person.contactDetails = contact._id;
              person.save(function (err, newperson) {
                if (!checkError (err, res)) {
                  // success
                  populateSubDocs(newperson, function (err, doc) {
                    populateSubDocsReply(err, res, next, doc, Consts.HTTP_CREATED);
                  });
                } else {
                  // tidy up by removing everything
                  removeDocuments (person._id, address._id, contact._id);
                  checkError(
                    newError(Consts.HTTP_INTERNAL_ERROR, 'Unable to save person.'), 
                    res
                  );
                }
              });
            } else {
              // tidy up by removing person & address
              removeDocuments (person._id, address._id);
              checkError(
                newError(Consts.HTTP_INTERNAL_ERROR, 'Unable to create contact details.'), 
                res
              );
            }
          });
        } else {
          // tidy up by removing person
          removeDocuments (person._id);
          checkError(
            newError(Consts.HTTP_INTERNAL_ERROR, 'Unable to create address.'), 
            res
          );
        }
      });
    }
  });
}

/**
 * Add a person document to the database
 * @param {function} accessCheck  Access check function; one of verifyXXX()
 * @param {Object} req            http request
 * @param {Object} res            http response
 * @param {function} next         next function
 */
function createPerson (accessCheck, req, res, next) {

  accessCheck(req, res, function (err) {
    if (err) {
      errorReply(res, err.status, err.message);
    } else {
      createPersonAccessOk(req.body, res, next);
    }
  });
}

/**
 * Update a person document in the database without an access check
 * @param {string} id         ObjectId of document to update
 * @param {object} rawPerson  Person info to update
 * @param {Object} res        http response
 * @param {function} next     next function
 */
function updatePersonAccessOk (id, rawPerson, res, next) {

  var addressFields = getAddressTemplate(rawPerson),
    contactFields = getContactDetailsTemplate(rawPerson),
    personFields = getPersonTemplate(rawPerson);

  People.findByIdAndUpdate(id, {
    $set: personFields
  }, {
    new: true // return the modified document rather than the original
  }, function (err, person) {
    if (!checkError (err, res)) {
      
      if (person) {

        var mustSave = false;          

        updateDocAccessOk(addressFields, Addresses, person.address, res, function (result, res) {
          if (result) {
            // success or nothing to do
            if ((result.status == Consts.HTTP_OK) && (person.address != result.payload._id)) {
              // created new document
              person.address = result.payload._id;
              mustSave = true;
            }
            
            updateDocAccessOk(contactFields, ContactDetails, person.contactDetails, res, function (result, res) {
              if (result) {
                // success or nothing to do
                if ((result.status == Consts.HTTP_OK) && (person.contactDetails != result.payload._id)) {
                  // created new document
                  person.contactDetails = result.payload._id;
                  mustSave = true;
                }

                if (mustSave) {
                  // need to save person document
                  person.save(function (err, updated) {
                    if (!checkError (err, res)) {
                      // success
                      populateSubDocs(updated, function (err, doc) {
                        populateSubDocsReply(err, res, next, doc, Consts.HTTP_OK);
                      });
                    }
                  });
                } else {
                  // populate person and return
                  populateSubDocs(person, function (err, doc) {
                    populateSubDocsReply(err, res, next, doc, Consts.HTTP_OK);
                  });
                }                      
              }
            });
          }
        });
      } else {
        errorReply(res, Consts.HTTP_NOT_FOUND, 'Unknown person identifier');
      }
    }
  });
}

/**
 * Update a person document in the database
 * @param {function} accessCheck  Access check function; one of verifyXXX()
 * @param {string} id             ObjectId of document to update
 * @param {Object} req            http request
 * @param {Object} res            http response
 * @param {function} next         next function
 */
function updatePerson (accessCheck, id, req, res, next) {

  accessCheck(req, res, function (err) {
    if (err) {
      errorReply(res, err.status, err.message);
    } else {
      updatePersonAccessOk(id, req.body, res, next);
    }
  });
}

/**
 * Delete a person document from the database without an access check
 * @param {string} id     ObjectId of document to delete
 * @param {Object} res    http response
 * @param {function} next next function
 */
function deletePersonAccessOk (id, res, next) {

  // TODO implement a tree delete

  People.findById(id, function (err, person) {
    if (!checkError (err, res)) {
      if (person) {
        // delete address
        removeDocAccessOk(Addresses, person.address, res, function (result) {
          if (result) {
            // delete contact details
            removeDocAccessOk(ContactDetails, person.contactDetails, res, function (result) {
              if (result) {
                person.remove(function (err, person) {
                  if (!checkError (err, res)) {
                    // success
                    if (next) {
                      next(makeResult(Consts.HTTP_OK, person), res);
                    }
                  }
                });
              }
            });
          }
        });
      } else {
        errorReply(res, Consts.HTTP_NOT_FOUND, 'Unknown person identifier');
      }
    }
  });
}

/**
 * Delete a person document from the database
 * @param {function} accessCheck  Access check function; one of verifyXXX()
 * @param {string} id             ObjectId of document to delete
 * @param {Object} req            http request
 * @param {Object} res            http response
 * @param {function} next         next function
 */
function deletePerson (accessCheck, id, req, res, next) {

  accessCheck(req, res, function (err) {
    if (err) {
      errorReply(res, err.status, err.message);
    } else {
      deletePersonAccessOk(id, res, next);
    }
  });
}



router.route('/register')

  .post(function (req, res) {

    // public api no access check
    createPersonAccessOk(req.body, res, resultReply);
  });

router.route('/count')

  .get(Verify.verifyHasCanvasserAccess, function (req, res) {

    processCountReq (req, res, isValidModelPath, People);
  });

router.route('/:objId')

  .get(Verify.verifyHasCanvasserAccess, function (req, res) {

    getDocs(req, res, isValidModelPath, getModelNodeTree(), resultReply, {
      objName: 'person'
    }); 
  })

  .put(Verify.verifySelfOrHasCanvasserAccess, function (req, res) {

    // update person (no access check as done in route)
    updatePerson(Verify.verifyNoCheck, req.params.objId, req, res, resultReply);
  })

  .delete(Verify.verifyHasCanvasserAccess, function (req, res) {

    // delete person (no access check as done in route)
    deletePerson(Verify.verifyNoCheck, req.params.objId, req, res, resultReply);
  });

module.exports = {
  router: router,
  createPerson: createPerson,
  createPersonAccessOk: createPersonAccessOk,
  deletePerson: deletePerson,
  deletePersonAccessOk: deletePersonAccessOk,
  updatePerson: updatePerson,
  updatePersonAccessOk: updatePersonAccessOk
};
