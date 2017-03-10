var gulp = require('gulp'),
    nodemon = require('gulp-nodemon'),
    jshint = require('gulp-jshint'),
    argv = require('yargs')
      .usage('Usage: $0 -production')
      .argv,
    replace = require('gulp-replace-task'),
    path = require('path'),
    fs = require('fs');
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

  // Read the settings from the right file
    filename = env + '.json',
    settings = JSON.parse(fs.readFileSync(basePaths.config + filename, 'utf8')),
    // basic patterns
    patterns = [
      { match: 'dbAddr', replacement: settings.dbAddr },
      { match: 'forceHttps', replacement: settings.forceHttps },
      { match: 'httpPort', replacement: settings.httpPort },
      { match: 'httpsPortOffset', replacement: settings.httpsPortOffset },
      { match: 'baseURL', replacement: settings.baseURL },
      { match: 'jwtSecretKey',  replacement: settings.jwtSecretKey },
      { match: 'tokenLife', replacement: settings.tokenLife },
      { match: 'disableAuth', replacement: settings.disableAuth },
      { match: 'fbClientID', replacement: settings.fbClientID },
      { match: 'fbClientSecret', replacement: settings.fbClientSecret },
      { match: 'dfltPassword', replacement: settings.dfltPassword },
      { match: 'testOptions', replacement: settings.testOptions }
    ];

  // Replace each placeholder with the correct value for the variable.
  gulp.src(basePaths.config + 'config.js')
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
