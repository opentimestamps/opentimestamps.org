'use strict';

const gulp = require('gulp');
const sass = require('gulp-sass');
const sassGlob = require('gulp-sass-glob');
const autoprefixer = require('gulp-autoprefixer');
const uglifycss = require('gulp-uglifycss');
const include = require('gulp-include');
const addsrc = require('gulp-add-src');
const order = require('gulp-order');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const babili = require('gulp-babili');
var exec = require('gulp-exec');

gulp.task('sass', function() {
  return gulp.src(['assets/stylesheets/application.scss', 'assets/stylesheets/certificate.scss','assets/stylesheets/timestamp-of.scss'])
    .pipe(sassGlob())
    .pipe(sass().on('error', sass.logError))
    .pipe(autoprefixer())
    .pipe(uglifycss())
    .pipe(gulp.dest('assets/stylesheets/'));
});

gulp.task('compress', function() {
  gulp.src('assets/javascripts/bundle.js')
      .pipe(babili({
          mangle: {
              keepClassNames: true
          }
      }))
    .pipe(gulp.dest('assets/javascripts'))
});

gulp.task('browserify', function() {
    var options = {
        continueOnError: false, // default = false, true means don't emit error event
        pipeStdout: false, // default = false, true means stdout is written to file.contents
        customTemplatingThing: "test" // content passed to gutil.template()
    };
    var reportOptions = {
        err: true, // default = true, false means don't write err
        stderr: true, // default = true, false means don't write stderr
        stdout: true // default = true, false means don't write stdout
    }
    return gulp.src('./')
        .pipe(exec('browserify -r javascript-opentimestamps script.js -o assets/javascripts/bundle.js', options))
        .pipe(exec.reporter(reportOptions));
});

gulp.task('javascript', function() {
  return gulp.src('assets/javascripts/application/*.js')
    .pipe(addsrc('assets/javascripts/vendor/index.js'))
    .pipe(order([
      "assets/javascripts/vendor/index.js",
      "assets/javascripts/application/*.js"
    ], {base: '.'}))
    .pipe(include())
    .pipe(concat('application.js'))
    // .pipe(uglify())
    .pipe(gulp.dest('assets/javascripts'));
});

gulp.task('watch', function() {
  gulp.watch('assets/stylesheets/**/*.scss', ['sass']);
  gulp.watch('assets/javascripts/application/*.js', ['javascript']);
});
