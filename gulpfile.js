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
const connect = require('gulp-connect');
const clean = require('gulp-clean');
const exec = require('gulp-exec');
const browserify = require("browserify");
const babelify = require("babelify");
const source = require('vinyl-source-stream');
const runSequence = require('run-sequence');

gulp.task('clean', function () {
    return gulp.src('assets/stylesheets/*.css', {read: false})
        .pipe(addsrc('assets/javascripts/application.js'))
        .pipe(addsrc('assets/javascripts/index.bundle.js'))
        .pipe(addsrc('assets/javascripts/info.bundle.js'))
        .pipe(clean({force: true}))
});

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

gulp.task('index', function() {
    var options = {
        continueOnError: false, // default = false, true means don't emit error event
        pipeStdout: false, // default = false, true means stdout is written to file.contents
        customTemplatingThing: "test" // content passed to gutil.template()
    };
    var reportOptions = {
        err: true, // default = true, false means don't write err
        stderr: true, // default = true, false means don't write stderr
        stdout: true // default = true, false means don't write stdout
    };
    return gulp.src('./')
        .pipe(exec('browserify -r javascript-opentimestamps assets/javascripts/page/index.js -o assets/javascripts/index.bundle.js', options))
        .pipe(exec('babel assets/javascripts/index.bundle.js -o assets/javascripts/index.bundle.js', options))
        .pipe(exec.reporter(reportOptions));

    /*NOTE: babelify run babel with .babelrc file, but doesn't convert the code
    gulp.task('index', function() {
        return browserify({ debug: true, entries: ["assets/javascripts/page/index.js"] })
            .transform(babelify)
            .bundle()
            .pipe(source('index.bundle.js'))
            .pipe(gulp.dest('./assets/javascripts'));
    });*/
});

gulp.task('info', function() {
    var options = {
        continueOnError: false, // default = false, true means don't emit error event
        pipeStdout: false, // default = false, true means stdout is written to file.contents
        customTemplatingThing: "test" // content passed to gutil.template()
    };
    var reportOptions = {
        err: true, // default = true, false means don't write err
        stderr: true, // default = true, false means don't write stderr
        stdout: true // default = true, false means don't write stdout
    };
    return gulp.src('./')
        .pipe(exec('browserify -r javascript-opentimestamps assets/javascripts/page/info.js -o assets/javascripts/info.bundle.js', options))
        .pipe(exec('babel assets/javascripts/info.bundle.js -o assets/javascripts/info.bundle.js', options))
        .pipe(exec.reporter(reportOptions));

    /*NOTE: babelify run babel with .babelrc file, but doesn't convert the code
     gulp.task('info', function() {
     return browserify({ debug: true })
     .transform(babelify)
     .require("assets/javascripts/page/info.js", { entry: true })
     .bundle()
     .pipe(source('info.bundle.js'))
     .pipe(gulp.dest('assets/javascripts'));
     });*/
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
        .pipe(uglify())
        .pipe(gulp.dest('assets/javascripts'));
});

gulp.task('default', function(done) {
    runSequence('clean','sass','javascript', 'index', 'info', function(){
        done();
    });
});

gulp.task('watch', function() {
    gulp.watch('assets/stylesheets/**/*.scss', ['sass']);
    gulp.watch('assets/javascripts/application/*.js', ['javascript']);
    gulp.watch('assets/javascripts/page/index.js', ['index']);
    gulp.watch('assets/javascripts/page/info.js', ['info']);
});

gulp.task('server', function() {
    connect.server({
        //livereload: true
    });
});