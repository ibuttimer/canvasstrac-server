/*jslint node: true */ /*eslint-env node*/
'use strict';

var SparkPost = require('sparkpost'),
  debug = require('debug')('emailService'),
  config = require('../config.js');

var sparky,
  sandbox = false;

if (config.feedbackToEmail && config.feedbackFromEmail) {
  // setup feedback email
  sparky = new SparkPost(); // uses process.env.SPARKPOST_API_KEY
} else {
  debug('SparkPost not configured');
}

function available () {
  return (sparky ? true : false);
}

function send (options, content, to, next, error) {
  if (available()) {
    var recipients;
    // https://developers.sparkpost.com/api/recipient-lists.html#header-address-attributes
    if (typeof to === 'string') {
      recipients = [
        { address: to }
      ];
    } else if (Array.isArray(to)) {
      recipients = [];
      to.forEach(function(element) {
        if (typeof element === 'string') {
          recipients.push({ address: element });
        } else {
          recipients.push(element);
        }
      }, this);
    } else {
      recipients = to;
    }
    // send email
    sparky.transmissions.send({
      options: options,
      content: content,
      recipients: recipients
    }).then(
      function (data) {
        if (next) {
          next(data);
        }
      })
      .catch(function (err) {
        if (error) {
          error(err);
        }
        debug('SparkPost error: %O', err);
      });
  }
}

function sendEmail (subject, html, reply_to, next, error) {
  if (available()) {
    var optsFrom = getOptsFrom();

    send(optsFrom.options, {
      from: optsFrom.from,
      // reply_to: reply_to,  leave out for now, any funky email addresses will cause it to be treated as spam
      subject: subject,
      html: html
    }, config.feedbackToEmail, next, error);
  }
}

function getOptsFrom () {
  var options,
    from;
  
  if (sandbox) {
    options = { sandbox: true };
    from = 'testing@' + process.env.SPARKPOST_SANDBOX_DOMAIN; // 'testing@sparkpostbox.com'
  } else {
    options = {};
    from = config.feedbackFromEmail;
  }
  return {
    options: options,
    from: from
  };
}


module.exports = {
  available: available,
  sendEmail: sendEmail
};

