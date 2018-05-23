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
const connect = require('gulp-connect');
const clean = require('gulp-clean');
const source = require('vinyl-source-stream');
const runSequence = require('run-sequence');

gulp.task('clean', function () {
    return gulp.src('assets/stylesheets/*.css', {read: false})
        .pipe(addsrc('assets/javascripts/application.js'))
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
    runSequence('clean','sass','javascript', function(){
        done();
    });
});

gulp.task('watch', function() {
    gulp.watch('assets/stylesheets/**/*.scss', ['sass']);
    gulp.watch('assets/javascripts/application/*.js', ['javascript']);
});

gulp.task('server', function() {
    connect.server({
        //livereload: true
    });
});
