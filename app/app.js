/*jslint node: true */
'use strict';

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('./models/mongoose_app').mongoose;
var passport = require('passport');

var config = require('./config');
var Consts = require('./consts');

mongoose.connect(config.mongoUrl);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
  // we're connected!
  console.log("Connected correctly to database");
});

var routes = require('./routes/index');
var Verify = require('./routes/verify');
var userRouter = require('./routes/userRouter').router;
var roleRouter = require('./routes/roleRouter').router;
var personRouter = require('./routes/personRouter').router;
var candidateRouter = require('./routes/candidateRouter').router;
var votingSystemRouter = require('./routes/votingSystemRouter').router;
var votingDistrictRouter = require('./routes/votingDistrictRouter').router;
var electionRouter = require('./routes/electionRouter').router;
var partyRouter = require('./routes/partyRouter').router;
var addressRouter = require('./routes/addressRouter').router;
var contactDetailsRouter = require('./routes/contactDetailRouter').router;
var questionRouter = require('./routes/questionRouter').router;
var answerRouter = require('./routes/answerRouter').router;
var surveyRouter = require('./routes/surveyRouter').router;
var canvassRouter = require('./routes/canvassRouter').router;
var canvassAssignmentRouter = require('./routes/canvassAssignmentRouter').router;
var canvassResultRouter = require('./routes/canvassResultRouter').router;
var messageRouter = require('./routes/messageRouter').router;
var noticeRouter = require('./routes/noticeRouter').router;


var app = express(),
  heroku = (config.baseURL.indexOf('heroku') >= 0);

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
    console.log('redirecting to ', redirect_url);
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
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// passport config
app.use(passport.initialize());

// CORS on ExpressJS http://enable-cors.org/server_expressjs.html
// also http://stackoverflow.com/questions/32500073/request-header-field-access-control-allow-headers-is-not-allowed-by-itself-in-pr
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT,DELETE");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-access-token");
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
console.log('Mounted management app from ' + mgmtPath);

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



if (app.get('env') === 'development') {
  // install access test route only in dev mode
  app.use('/test', Verify.accessTestRouter);
  console.log('* Mounted test url *\n');
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
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || Consts.HTTP_INTERNAL_ERROR);
    res.json({
      message: err.message,
      error: err
    });
  });

  if (config.disableAuth) {
    console.log('* Authentication disabled *\n');
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
