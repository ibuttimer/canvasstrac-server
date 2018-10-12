/*jslint node: true */ /*eslint-env node*/
'use strict';

var passport = require('passport'),
  LocalStrategy = require('passport-local').Strategy,
  FacebookStrategy = require('passport-facebook').Strategy,
  User = require('./models/user').model,
  config = require('./config'),
  debug = require('debug')('authenticate');


exports.local = passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

exports.facebook = passport.use(new FacebookStrategy({
  clientID: config.facebook.clientID,
  clientSecret: config.facebook.clientSecret,
  callbackURL: config.facebook.callbackURL
},
function (accessToken, refreshToken, profile, done) {
  User.findOne({ OauthId: profile.id }, function(err, user) {
    if(err) {
      debug('User not found %s', err); // handle errors!
    }
    if (!err && user !== null) {
      done(null, user);
    } else {
      user = new User({
        username: profile.displayName.toLowerCase().replace(' ', '-')
      });
      user.OauthId = profile.id;
      user.OauthToken = accessToken;
      user.save(function(err) {
        if(err) {
          debug('User save error %s', err); // handle errors!
        } else {
          debug('saving user ...');
          done(null, user);
        }
      });
    }
  });
}));