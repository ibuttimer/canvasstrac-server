/*jslint node: true */
'use strict';

var define = require("node-constants")(exports);
// define is a function that binds "constants" to an object (commonly exports)

// a single constant
//define("PI", 3.14);

var FIRST_APPERR = 1000,               // start of app error range
  ERROR_RANGE_SIZE = 100,
  TOKEN_ERR_IDX = 0,
  ACCESS_ERR_IDX = 1,
  calcErrorRangeStart = function (idx) {
    return FIRST_APPERR + (idx * ERROR_RANGE_SIZE);
  },
  calcErrorRangeEnd = function (idx) {
    return calcErrorRangeStart(idx) + ERROR_RANGE_SIZE - 1;
  },
  // token related errors
  FIRST_TOKEN_ERR = calcErrorRangeStart(TOKEN_ERR_IDX),
  LAST_TOKEN_ERR = calcErrorRangeEnd(TOKEN_ERR_IDX),
  // access related errors
  FIRST_ACCESS_ERR = calcErrorRangeStart(ACCESS_ERR_IDX),
  LAST_ACCESS_ERR = calcErrorRangeEnd(ACCESS_ERR_IDX);

// or multiple
define({
  // http response codes
  // Informational 1xx
  HTTP_CONTINUE: 100,           // The client SHOULD continue with its request
  HTTP_SWITCHING_PROTOCOL: 101, // The server will switch protocols to those defined by the response
  // Successful 2xx
  HTTP_OK: 200,                 // Request has succeeded
  HTTP_CREATED: 201,            // Request has been fulfilled and resulted in a new resource being created
  HTTP_ACCEPTED: 202,           // Request has been accepted for processing, but the processing has not been completed
  HTTP_NON_AUTH_INFO: 203,      // The returned metainformation in the entity-header is not the definitive set as available from the origin server, but is gathered from a local or a third-party copy.
  HTTP_NO_CONTENT: 204,         // The server has fulfilled the request but does not need to return an entity-body
  HTTP_RESET_CONTENT: 205,      // The server has fulfilled the request and the user agent SHOULD reset the document view which caused the request to be sent.
  HTTP_PARTIAL_CONTENT: 206,    // The server has fulfilled the partial GET request for the resources.
  // Redirection 3xx
  HTTP_MULTIPLE_CHOICES: 300,   // The requested resource corresponds to any one of a set of representations
  HTTP_MOVED_PERMANEMTLY: 301,  // The requested resource has been assigned a new permanent URI and any future references to this resource SHOULD use one of the returned URIs.
  HTTP_FOUND: 302,              // The requested resource resides temporarily under a different URI
  HTTP_SEE_OTHER: 303,          // The response to the request can be found under a different URI and SHOULD be retrieved using a GET method on that resource.
  HTTP_NOT_MODIFIED: 304,       // If the client has performed a conditional GET request and access is allowed, but the document has not been modified, the server SHOULD respond with this status code.
  HTTP_USE_PROXY: 305,          // The requested resource MUST be accessed through the proxy given by the Location field.
  HTTP_TEMPORARY_REDIRECT: 307, // The requested resource resides temporarily under a different URI.
  // Client Error 4xx
  HTTP_BAD_REQUEST: 400,        // The request could not be understood by the server due to malformed syntax. 
  HTTP_UNAUTHORISED: 401,       // The request requires user authentication.
  HTTP_FORBIDDEN: 403,          // The server understood the request, but is refusing to fulfill it. 
  HTTP_NOT_FOUND: 404,          // The server has not found anything matching the Request-URI.
  HTTP_NOT_ALLOWED: 405,        // The method specified in the Request-Line is not allowed for the resource identified by the Request-URI.
  HTTP_NOT_ACCEPTABLE: 406,     // The resource identified by the request is only capable of generating response entities which have content characteristics not acceptable according to the accept headers sent in the request.
  HTTP_PROXY_AUTH_REQUIRED: 407,// The client must first authenticate itself with the proxy.
  HTTP_TIMEOUT: 408,            // The client did not produce a request within the time that the server was prepared to wait. The client MAY repeat the request without modifications at any later time.
  HTTP_CONFLICT: 409,           // The request could not be completed due to a conflict with the current state of the resource.
  HTTP_GONE: 410,               // The requested resource is no longer available at the server and no forwarding address is known.
  HTTP_LENGTH_REQUIRED: 411,    // The server refuses to accept the request without a defined Content- Length.
  HTTP_PRECON_FAILED: 412,      // The precondition given in one or more of the request-header fields evaluated to false when it was tested on the server.
  HTTP_ENTITY_TOO_LARGE: 413,   // The server is refusing to process a request because the request entity is larger than the server is willing or able to process.
  HTTP_URI_TOO_LONG: 414,       // The server is refusing to service the request because the Request-URI is longer than the server is willing to interpret
  HTTP_MEDIA_TYPE: 415,         // The server is refusing to service the request because the entity of the request is in a format not supported by the requested resource for the requested method.
  HTTP_RANGE: 416,              // None of the range-specifier values in this field overlap the current extent of the selected resource, and the request did not include an If-Range request-header field. (For byte-ranges, this means that the first- byte-pos of all of the byte-range-spec values were greater than the current length of the selected resource.)
  HTTP_EXPECTATION_FAILED: 417, // The expectation given in an Expect request-header field could not be met by this server, or, if the server is a proxy, the server has unambiguous evidence that the request could not be met by the next-hop server.
  // Server Error 5xx
  HTTP_INTERNAL_ERROR: 500,     // The server encountered an unexpected condition which prevented it from fulfilling the request.
  HTTP_NOT_IMPLEMENTED: 501,    // The server does not support the functionality required to fulfill the request.
  HTTP_BAD_GATEWAY: 502,        // The server, while acting as a gateway or proxy, received an invalid response from the upstream server it accessed in attempting to fulfill the request.
  HTTP_UNAVAILABLE: 503,        // The server is currently unable to handle the request due to a temporary overloading or maintenance of the server.
  HTTP_GATEWAY_TIMEOUT: 504,    // The server, while acting as a gateway or proxy, did not receive a timely response from the upstream server specified by the URI.
  HTTP_VERSION: 505,            // The server does not support, or refuses to support, the HTTP protocol version that was used in the request message.
  
  // level definitions for Roles
  ROLE_ADMIN: 100,      // admin level access
  ROLE_MANAGER: 90,     // manager level access
  ROLE_GROUP_LEAD: 80,  // group leader level access
  ROLE_STAFF: 70,       // staff level access
  ROLE_CANVASSER: 60,   // canvasser level access
  ROLE_NONE: 0,         // public level access

  /* menu access privileges take the form similar to linux permissions
    i.e. durc bits for each group, 
    e.g. 0x421 is all group create, one group read & own group update */
  // privilege definitions for menu access
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
  ACCESS_OWN: 0x03,     // access own object group
  ACCESS_GROUPMASK: 0x07,// map of access group bits

  // app level result codes
  FIRST_APPERR: FIRST_APPERR,       // start of app error range
  // token related errors
  IS_TOKEN_APPERR: function (appCode) {
    return ((appCode >= FIRST_TOKEN_ERR) && (appCode <= LAST_TOKEN_ERR));
  },
  APPERR_SESSION_EXPIRED: FIRST_TOKEN_ERR,        // jwt has expired
  APPERR_CANT_VERIFY_TOKEN: FIRST_TOKEN_ERR + 1,  // jwt failed verification
  APPERR_NO_TOKEN: FIRST_TOKEN_ERR + 2,           // no jwt provided
  // access related errors
  IS_ACCESS_APPERR: function (appCode) {
    return ((appCode >= FIRST_ACCESS_ERR) && (appCode <= LAST_ACCESS_ERR));
  },
  APPERR_UNKNOWN_ROLE: FIRST_ACCESS_ERR,          // unknown role identifier
  APPERR_UNKNOWN_ROLE_INTERNAL: FIRST_ACCESS_ERR + 1,// internal error unknown role identifier 
  APPERR_ROLE_NOPRIVILEGES: FIRST_ACCESS_ERR + 2, // assigned role doesn't have required privileges
  APPERR_USER_URL: FIRST_ACCESS_ERR + 3           // url doesn't match credentials

});

/* privilege values quick ref
c: create
r: read
u: update
d: delete
b: batch

 Own    One    Global   Hex     Dec
 bdurc  bdurc  bdurc    0x7fff  32767
 -ur--  durc-  durc-    0x19EF  6639
 -ur--  durc-  bdurc    0x19FF  6655
 -----  durc-  durc-    0x01EF  495
 -ur--  -ur--  -ur--    0x18C6  6342
 -----  -ur--  -ur--    0x00C6  198
 -ur--  -r---  -r---    0x1842  6210
 -ur--  -----  -----    0x1800  6144
 -r---  -r---  -r---    0x0842  2114
 -----  -r---  -r---    0x0042  66

 */
