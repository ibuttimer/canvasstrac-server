var gulp = require('gulp'),
    nodemon = require('gulp-nodemon'),
    jshint = require('gulp-jshint'),
    argv = require('yargs')
      .usage('Usage: $0 -production')
      .argv,
    replace = require('gulp-replace-task'),
    notify = require('gulp-notify'),
    path = require('path'),
    fs = require('fs'),
    browserSync = require('browser-sync');

var basePaths = {
    src: 'app/',
    config: 'config/',
  };


gulp.task('lint', function () {
  gulp.src('./**/*.js')
    .pipe(jshint());
})

gulp.task('replace', function () {
  /* based on http://geekindulgence.com/environment-variables-in-angularjs-and-ionic/
    see config/readme.txt for details
   */

  // Get the environment from the command line
  var env = argv.env || 'localdev',
    envfilename = 'env.json',
  // Read the settings from the right file
    filename = env + '.json',
    settings = JSON.parse(fs.readFileSync(basePaths.config + filename, 'utf8')),
    // basic patterns
    patterns = [];

    [ // server/management app common settings
      'baseURL',
      'forceHttps',
      'httpPort',
      'httpsPortOffset',
      'socketTimeout',
      // server-specific settings
      'dbAddr',
      'mgmtPath',
      'jwtSecretKey',
      'jwtWebTokenLife',
      'jwtMobileTokenLife',
      'disableAuth',
      'fbClientID',
      'fbClientSecret',
      'feedbackFromEmail',
      'feedbackToEmail',
      'dfltPassword',
      'testOptions',
      // sparkpost-specific settings
      'SPARKPOST_API_KEY',
      'SPARKPOST_API_URL',
      'SPARKPOST_SANDBOX_DOMAIN',
      'SPARKPOST_SMTP_HOST',
      'SPARKPOST_SMTP_PASSWORD',
      'SPARKPOST_SMTP_PORT',
      'SPARKPOST_SMTP_USERNAME'
    ].forEach(function (prop) {
      patterns.push({ match: prop, replacement: settings[prop] });
    });

  // Replace each placeholder with the correct value for the variable.
  gulp.src(basePaths.config + envfilename)
    .pipe(notify({ message: 'Creating ' + envfilename + ' from ' + filename }))
    .pipe(replace({ patterns: patterns }))
    .pipe(gulp.dest(basePaths.src));
});


gulp.task('develop', function () {
  nodemon({ script: './app/bin/www'
          , ext: 'html js'
          , ignore: ['ignored.js']
          , tasks: ['lint'] })
    .on('restart', function () {
      console.log('restarted!')
    })
    .on('start', function () {
      // Watch any files in destination, reload on change
      gulp.watch(['./public/**']).on('change', browserSync.reload);
    });
  
  browserSync.init({
        files: './public/**'
      },
      {
        server: {
            baseDir: './public',
            index: 'index.html'
      }
  });

})
