/*jslint node: true */ /*eslint-env node, es6 */
var gulp = require('gulp'),
  nodemon = require('gulp-nodemon'),
  jshint = require('gulp-jshint'),
  argv = require('yargs')
    .usage('Usage: gulp <command> [options]')
    .command('replace', 'Generate the environment file based on the options from a configuration file')
    .command('develop', 'Start server and watch application files')
    .option('e', {
      alias: 'env',
      default: 'localdev',
      describe: 'Specify name of configuration file to use',
      type: 'string'
    })
    .help('h')
    .alias('h', 'help')
    .argv,
  replace = require('gulp-replace-task'),
  notify = require('gulp-notify'),
  fs = require('fs'),
  browserSync = require('browser-sync');

var basePaths = {
  src: 'app/',
  config: 'config/',
};


gulp.task('lint', function () {
  gulp.src('./**/*.js')
    .pipe(jshint());
});

gulp.task('replace', async () => {
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
    patterns = [],
    keyVal, dfltVal, setDflt;

  [
    { prop: 'baseURL', type: 'str' },
    { prop: 'forceHttps', type: 'bool', dflt: true },
    { prop: 'httpPort', type: 'num' },
    { prop: 'httpsPortOffset', type: 'num' },
    { prop: 'socketTimeout', type: 'num' },
    // server-specific settings
    { prop: 'disableAuth', type: 'bool', dflt: false },
    { prop: 'dbAddr', type: 'str' },
    { prop: 'dbVersion', type: 'str' },
    { prop: 'mgmtPath', type: 'str' },
    { prop: 'jwtSecretKey', type: 'str' },
    { prop: 'jwtWebTokenLife', type: 'num|str' },
    { prop: 'jwtMobileTokenLife', type: 'num|str' },
    { prop: 'fbClientID', type: 'str' },
    { prop: 'fbClientSecret', type: 'str' },
    { prop: 'feedbackFromEmail', type: 'str' },
    { prop: 'feedbackToEmail', type: 'str' },
    { prop: 'dfltPassword', type: 'str' },
    { prop: 'testOptions', type: 'str' },
    // sparkpost-specific settings
    // Heroku SparkPost add-on shutdown 15/10/2020, disable email for the moment
    // { prop: 'SPARKPOST_API_KEY', type: 'str' },
    // { prop: 'SPARKPOST_API_URL', type: 'str' },
    // { prop: 'SPARKPOST_SANDBOX_DOMAIN', type: 'str' },
    // { prop: 'SPARKPOST_SMTP_HOST', type: 'str' },
    // { prop: 'SPARKPOST_SMTP_PASSWORD', type: 'str' },
    // { prop: 'SPARKPOST_SMTP_PORT', type: 'str' },
    // { prop: 'SPARKPOST_SMTP_USERNAME', type: 'str' }
  ].forEach(function (key) {
    keyVal = settings[key.prop];
    setDflt = (keyVal === undefined);
    if (!setDflt && (typeof keyVal === 'string')) {
      setDflt = (keyVal.indexOf('@@') === 0); // no replacement in settings file
    }
    if (setDflt) {
      dfltVal = undefined;

      if (key.dflt) {
        dfltVal = key.dflt;
      } else if (key.type.indexOf('num') >= 0) {
        dfltVal = '0';
      } else if (key.type.indexOf('str') >= 0) {
        dfltVal = '';
      } else if (key.type.indexOf('bool') >= 0) {
        dfltVal = false;
      }
      keyVal = dfltVal;
    }
    patterns.push({ match: key.prop, replacement: keyVal });
  });

  // Replace each placeholder with the correct value for the variable.
  gulp.src(basePaths.config + envfilename)
    .pipe(notify({ message: 'Creating ' + envfilename + ' from ' + filename }))
    .pipe(replace({ patterns: patterns }))
    .pipe(gulp.dest(basePaths.src));
});


gulp.task('develop', function () {
  nodemon({
    script: './app/bin/www',
    ext: 'html js',
    ignore: ['ignored.js'],
    tasks: ['lint']
  }).on('restart', function () {
    console.log('restarted!');
  }).on('start', function () {
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
});

// Default task - does nothing for now
gulp.task('default', function (cb) {
  var err;
  cb(err);
});

