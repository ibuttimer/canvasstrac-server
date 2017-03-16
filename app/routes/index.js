var express = require('express');
var router = express.Router();
var config = require('../config');

/* GET home page. */
// router.get('/', function(req, res, next) {
//   res.render('index', { title: 'Express' });
// });

router.get('/', function(req, res, next) {
  // load the single view file (angular will handle the page changes on the front-end)
  // res.sendFile(config.mgmtPath + '/index.html'); 
  var fileName = 'index.html';
  res.sendFile(fileName, {
    root: config.mgmtPath
  }, function (err) {
    if (err) {
      next(err);
    } else {
      console.log('Sent:', fileName);
    }
  });
});


module.exports = router;
