/*jslint node: true */ /*eslint-env node*/

/**
 * Module dependencies.
 */

var app = require('../app'),
  config = require('../config.js'),
  debug = require('debug')('rest-server:server'),
  http = require('http'),
  https = require('https'),
  fs = require('fs');

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || config.httpPort),
  secPort = port + config.httpsPortOffset;
app.set('port', port);
app.set('secPort', secPort);


/**
 * Create HTTP server.
 */

var server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */
if (config.socketTimeout) {
  server.setTimeout(config.socketTimeout);
}
server.listen(port, function() {
  debug('Server (http) listening on port %s', app.get('port'));
});
server.on('error', onError);
server.on('listening', onListening);

/**
 * Create HTTPS server.
 */ 
var options = {
  key: fs.readFileSync(__dirname+'/private.key'),
  cert: fs.readFileSync(__dirname+'/certificate.pem')
};

var secureServer = https.createServer(options, app);

/**
 * Listen on provided port, on all network interfaces.
 */
secureServer.listen(secPort, function() {
  debug('Server (https) listening on port %s', app.get('secPort'));
});
secureServer.on('error', onError);
secureServer.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      debug('%s requires elevated privileges', bind);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      debug('%s is already in use', bind);
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on %s', bind);
}