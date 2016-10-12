var gulp = require('gulp'),
    nodemon = require('gulp-nodemon'),
    jshint = require('gulp-jshint'),
    browserSync = require('browser-sync');


gulp.task('lint', function () {
  gulp.src('./**/*.js')
    .pipe(jshint());
})

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
