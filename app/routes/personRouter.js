/*jslint node: true */
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
  AddressRouterModule = require('./addressRouter'),
    addressRouter = AddressRouterModule.router,
    updateAddress = AddressRouterModule.update,
  ContactDetailsModule = require('../models/contactDetails'),
    ContactDetails = ContactDetailsModule.model,
    getContactDetailsTemplate = ContactDetailsModule.getTemplate,
  ModelNodeModule = require('../models/modelNode'),
    ModelNode = ModelNodeModule.ModelNode,
  Verify = require('./verify'),
  router_utils = require('./router_utils'),
    checkError = router_utils.checkError,
    errorReply = router_utils.errorReply,
    resultReply = router_utils.resultReply,
    populateSubDocsReply = router_utils.populateSubDocsReply,
    makeResult = router_utils.makeResult,
    updateDocAccessOk = router_utils.updateDocAccessOk,
    removeDoc = router_utils.removeDoc,
    removeDocAccessOk = router_utils.removeDocAccessOk,
    decodeReq = router_utils.decodeReq,
    processCountReq = router_utils.processCountReq,
    filterByField = router_utils.filterByField,
    getDocsUsingObj = router_utils.getDocsUsingObj,
    getRootOwner = router_utils.getRootOwner,
  utils = require('../misc/utils'),
  Consts = require('../consts');


var router = express.Router();

function getDocsQuery (query, objId, select, res, next) {
  if (select.length > 0) {
    query.select(select);
  }
  query.exec(function (err, docs) {
    if (!checkError(err, res)) {
      if (docs) {
        // success
        populateSubDocs(docs, function (err, docs) {
          populateSubDocsReply(err, res, next, docs, Consts.HTTP_OK);
        });
      } else if (objId) {
        errorReply(res, Consts.HTTP_NOT_FOUND, 'Unknown address identifier');
      }
    }
  });
}

function getDocs (req, res, next) {
  // check request for query params to select returned model paths
  var decode = decodeReq(req, res, isValidModelPath, true);
  if (decode) {
    // execute the query
    var root = getModelNodeTree(),
      model = root.model;

    if (req.params.objId) {
      // retrieve doc using id
      var query = model.findById(req.params.objId);
      getDocsQuery(query, req.params.objId, decode.select, res, next);
    } else {
      var array = [],
        propNames = Object.getOwnPropertyNames(decode.queryModelNodes),
        processedNames = [];
      propNames.forEach(function (prop) {
        // for each modelNode & corresponding query value, find the matching docs
        var propQuery = {},
          propModelNode = decode.queryModelNodes[prop], // ModelNode
          propModel = propModelNode.model;              // model of ModelNode 
        propQuery[prop] = decode.queryParam[prop];  // query using provided value

        getDocsUsingObj(res, propModel, propQuery, function (res, docs) {
          // get the root owner of each of the returned docs
          docs.forEach(function (doc) {
             
            getRootOwner(res, propModelNode, doc.owner, doc, function (modelNode, docx) {
              // if root is of correct type, add to array
              if (modelNode.model.modelName === root.model.modelName) {
                array.push(docx._id);
              }
              
              processedNames.push(prop);
              if (processedNames.length === propNames.length) {
                // all have been processed
                var query = model.find({_id: {$in: array}});
                getDocsQuery(query, req.params.objId, decode.select, res, next);
              }
            });
          })
        }); 
      });
    }
  }
}



router.route('/')

  .get(Verify.verifyHasCanvasserAccess, function (req, res, next) {

    getDocs (req, res, resultReply);
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

function createPerson (accessCheck, req, res, next) {

  accessCheck(req, res, function (err) {

    if (err) {
      errorReply(res, err.status, err.message);
      return;
    }
    
    var addressFields = getAddressTemplate(req.body),
      contactFields = getContactDetailsTemplate(req.body),
      // don't exclude owner field'
      personFields = getPersonTemplate(req.body, ['address', 'contactDetails']);
  
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
                    var err = new Error('Unable to save person.');
                    err.status = Consts.HTTP_INTERNAL_ERROR;
                    checkError(err, res);
                  }
                });
              } else {
                // tidy up by removing person & address
                removeDocuments (person._id, address._id);
                var err = new Error('Unable to create contact details.');
                err.status = Consts.HTTP_INTERNAL_ERROR;
                checkError(err, res);
              }
            });
          } else {
            // tidy up by removing person
            removeDocuments (person._id);
            var err = new Error('Unable to create address.');
            err.status = Consts.HTTP_INTERNAL_ERROR;
            checkError(err, res);
          }
        });
      }
    });
  });
}

function updatePerson (accessCheck, id, req, res, next) {

  accessCheck(req, res, function (err) {

    if (err) {
      errorReply(res, err.status, err.message);
      return;
    }
    
    var addressFields = getAddressTemplate(req.body),
      contactFields = getContactDetailsTemplate(req.body),
      personFields = getPersonTemplate(req.body);

    People.findByIdAndUpdate(id, {
        $set: personFields
      }, {
        new: true // return the modified document rather than the original
      }, function (err, person) {
        if (!checkError (err, res)) {
          
          if (person) {

            var mustSave = false;          

            updateDocAccessOk(addressFields, Addresses, person.address, req, res, function (result, res) {
              if (result) {
                // success or nothing to do
                if ((result.status == Consts.HTTP_OK) && (person.address != result.payload._id)) {
                  // created new document
                  person.address = result.payload._id;
                  mustSave = true;
                }
                
                updateDocAccessOk(contactFields, ContactDetails, person.contactDetails, req, res, function (result, res) {
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
  });
}


function deletePerson (accessCheck, id, req, res, next) {

  accessCheck(req, res, function (err) {

    if (err) {
      errorReply(res, err.status, err.message);
      return;
    }

    // TODO implement a tree delete

    People.findById(id, function (err, person) {
      if (!checkError (err, res)) {
        if (person) {
          // delete address
          removeDocAccessOk(Addresses, person.address, req, res, function (result) {
            if (result) {
              // delete contact details
              removeDocAccessOk(ContactDetails, person.contactDetails, req, res, function (result) {
                if (result) {
                  person.remove(function (err, person) {
                    if (!checkError (err, res)) {
                      // success
                      next(makeResult(Consts.HTTP_OK, person), res);
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
  });
}



router.route('/register')

  .post(function (req, res) {

    createPerson(Verify.verifyNoCheck, req, res, resultReply);
  });

router.route('/count')

  .get(Verify.verifyHasCanvasserAccess, function (req, res) {

    processCountReq (req, res, isValidModelPath, People);
  });

router.route('/:objId')

  .get(Verify.verifyHasCanvasserAccess, function (req, res) {

    People.findById(req.params.objId)
      .exec(function (err, doc) {
        if (!checkError(err, res)) {
          if (doc) {
            populateSubDocs(doc, function (err, doc) {
              if (!checkError(err, res)) {
                res.json(doc);
              }
            });
          } else {
            errorReply(res, Consts.HTTP_NOT_FOUND, 'Unknown person identifier');
          }
        }
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
  deletePerson: deletePerson,
  updatePerson: updatePerson
};
