/*jslint node: true */ /*eslint-env node*/
'use strict';

var express = require('express'),
  path = require('path'),
  // favicon = require('serve-favicon'),
  logger = require('morgan'),
  cookieParser = require('cookie-parser'),
  bodyParser = require('body-parser'),
  mongoose = require('./models/mongoose_app').mongoose,
  passport = require('passport'),
  assert = require('assert'),
  utils = require('./misc/utils'),
  modelUtils = require('./models/model_utils'),
  config = require('./config'),
  Consts = require('./consts'),
  debug = require('debug')('app');

utils.setDbVersion(config.dbVersion);

mongoose.connect(config.mongoUrl, modelUtils.getMongooseOptions(),
  function(err, db) {
    assert.strictEqual(null, err);
    assert.ok(db != null);
    var admin = new mongoose.mongo.Admin(mongoose.connection.db);
    admin.buildInfo(function (err, info) {
      debug('database v%s', info.version);
      utils.setDbVersion(info.version);
      
      if (!utils.dbVersionTest(config.dbVersion)) {
        debug('database v%s does not match configured version %s', info.version, config.dbVersion);
      }
    });
  });

var db = mongoose.connection;
db.on('error', debug.bind(console, 'connection error:'));
db.once('open', function () {
  // we're connected!
  debug('Connected correctly to database');
});

var app = express(),
  heroku = (config.baseURL.indexOf('heroku') >= 0),
  dev_environment = (app.get('env') === 'development');

// Secure traffic only
app.all('*', function (req, res, next) {
  var secure = req.secure;
  if (heroku) {
    /* for apps hosted on Heroku, request.secure will always be false 
      see https://jaketrent.com/post/https-redirect-node-heroku/
      https://devcenter.heroku.com/articles/http-routing#routing */
    secure = req.header('x-forwarded-proto') === 'https';
  }

  if (config.forceHttps && !secure) {
    var redirect_url = 'https://' + req.hostname;
    if (heroku) {
      redirect_url += req.url;
    } else {
      redirect_url += ':' + app.get('secPort') + req.url;
    }
    debug('redirecting to %s', redirect_url);
    res.redirect(redirect_url);
  } else {
    return next();
  }
});

// view engine setup
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

if (dev_environment) {
  app.use(logger('dev'));
} else {
  app.use(logger('combined'));
}
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// passport config
app.use(passport.initialize());

// CORS on ExpressJS http://enable-cors.org/server_expressjs.html
// also http://stackoverflow.com/questions/32500073/request-header-field-access-control-allow-headers-is-not-allowed-by-itself-in-pr
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT,DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-access-token');
  next();
});

// mount management console app
var mgmtPath;
if (config.mgmtPath) {
  mgmtPath = config.mgmtPath;
} else {
  // default location
  mgmtPath = path.join(__dirname, '../', 'public');
}
app.use(express.static(mgmtPath));
debug('Mounted management app from %s', mgmtPath);

var routes = require('./routes/index'),
  Verify = require('./routes/verify'),
  userRouter = require('./routes/userRouter').router,
  roleRouter = require('./routes/roleRouter').router,
  personRouter = require('./routes/personRouter').router,
  candidateRouter = require('./routes/candidateRouter').router,
  votingSystemRouter = require('./routes/votingSystemRouter').router,
  votingDistrictRouter = require('./routes/votingDistrictRouter').router,
  electionRouter = require('./routes/electionRouter').router,
  partyRouter = require('./routes/partyRouter').router,
  addressRouter = require('./routes/addressRouter').router,
  contactDetailsRouter = require('./routes/contactDetailRouter').router,
  questionRouter = require('./routes/questionRouter').router,
  answerRouter = require('./routes/answerRouter').router,
  surveyRouter = require('./routes/surveyRouter').router,
  canvassRouter = require('./routes/canvassRouter').router,
  canvassAssignmentRouter = require('./routes/canvassAssignmentRouter').router,
  canvassResultRouter = require('./routes/canvassResultRouter').router,
  messageRouter = require('./routes/messageRouter').router,
  noticeRouter = require('./routes/noticeRouter').router;

// route for static pages and views
app.use('/', routes);
// routes for data
app.use('/db/users', userRouter);
app.use('/db/roles', roleRouter);
app.use('/db/people', personRouter);
app.use('/db/candidates', candidateRouter);
app.use('/db/votingsystems', votingSystemRouter);
app.use('/db/votingdistricts', votingDistrictRouter);
app.use('/db/elections', electionRouter);
app.use('/db/parties', partyRouter);
app.use('/db/addresses', addressRouter);
app.use('/db/contactdetails', contactDetailsRouter);
app.use('/db/questions', questionRouter);
app.use('/db/answers', answerRouter);
app.use('/db/surveys', surveyRouter);
app.use('/db/canvasses', canvassRouter);
app.use('/db/canvassassignment', canvassAssignmentRouter);
app.use('/db/canvassresult', canvassResultRouter);
app.use('/db/message', messageRouter);
app.use('/db/notice', noticeRouter);

if (dev_environment) {
  // install access test route only in dev mode
  app.use('/test', Verify.accessTestRouter);
  debug('* Mounted test url *');
}

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = Consts.HTTP_NOT_FOUND;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (dev_environment) {
  app.use(function (err, req, res, next) {
    res.status(err.status || Consts.HTTP_INTERNAL_ERROR);
    res.json({
      message: err.message,
      error: err
    });
  });

  if (config.disableAuth) {
    debug('* Authentication disabled *');
  }
} else {
  // production mode safety check
  if (config.disableAuth) {
    throw new Error('Error: authentication disabled in production mode, please update configuration');
  }
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
  res.status(err.status || Consts.HTTP_INTERNAL_ERROR);
  res.json({
    message: err.message,
    error: {}
  });
});

module.exports = app;
