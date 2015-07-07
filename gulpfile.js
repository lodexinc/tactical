/// <reference path="./typings/node/node.d.ts" />
var cp = require('child_process');
var format = require('gulp-clang-format');
var gulp = require('gulp');
var gulpClean = require('gulp-clean');
var gulpMocha = require('gulp-mocha');
var gulpTsc = require('gulp-typescript');
var runSequence = require('run-sequence');


// ==========
// config

// Sets typescript compilation options using tsconfig.json.
var tsProject = gulpTsc.createProject('./tsconfig.json', {
    typescript: require('typescript')
  });
  
var strictProject = gulpTsc.createProject('./tsconfig.json', {
    typescript: require('typescript'),
    noEmitOnError: true
  });


// ==========
// helper functions

/**
 * Execute a command with arguments, piping the resulting output on stdout.
 */
function exec(cmd, args, callback) {
  var proc = cp.spawn(cmd, args);
  proc.stdout.on('data', function(buf) {
    process.stdout.write(buf);
  });
  proc.stderr.on('data', function(buf) {
    process.stderr.write(buf);
  });
  proc.on('close', function() {
    callback();
  });
}

/**
 * Catches any error generated by any task in a sequence and calls done after
 * all tasks complete successfully.
 */
function sequenceComplete(done) {
  return function (err) {
    if (err) {
      var error = new Error('build sequence failed');
      error.showStack = false;
      done(error);
    } else {
      done();
    }
  };
}


// ==========
// setup

/**
 * Runs all tasks needed to start development.
 */
gulp.task('refresh', function(done) {
  runSequence('!update.modules', '!install.typings', sequenceComplete(done));
});

/**
 * Installs node modules specified in package.json via the 'npm' command.
 */
gulp.task('!update.modules', function(done) {
  exec('npm', ['update'], done);
});

/**
 * Install typings via the 'tsd' command.
 */
gulp.task('!install.typings', function(done) {
  exec('./node_modules/tsd/build/cli.js', ['reinstall'], done);
});


// ==========
// format

/**
 * Checks that all files in modules match the format specified in .clang-format.
 */
gulp.task('check-format', function() {
  return gulp.src('./modules/**/*.ts')
    .pipe(format.checkFormat('file'))
    .on('warning', function(e) { process.stdout.write(e.message); process.exit(1) });
});


// ==========
// compile

gulp.task('!clean', function() {
  return gulp.src('./dist', {read: false}).pipe(gulpClean());
});

/**
 * Transcompile all TypeScript code to JavaScript.
 */
gulp.task('build', ['!clean'], function() {
  var tsResult = gulp.src('./modules/**/*.ts')
      .pipe(gulpTsc(tsProject));
  return tsResult.js.pipe(gulp.dest(tsProject.options.outDir));
});

/**
 * Transcompile all TypeScript code to JavaScript, only if the typescript compiler emits no errors.
 */
gulp.task('build.strict', ['!clean'], function() {
  var tsResult = gulp.src('./modules/**/*.ts')
      .pipe(gulpTsc(strictProject));
  return tsResult.js.pipe(gulp.dest(tsProject.options.outDir));
});


// =========
// test

/**
 * Run tests with Mocha and report the results.
 */
gulp.task('test', ['build'], function() {
  return gulp.src('./dist/**/test/*.js').pipe(gulpMocha());
});

/**
 * Run tests with Mocha and report the results in a more fun way.
 */
gulp.task('test.nyan', ['build'], function() {
  return gulp.src('./dist/**/test/*.js').pipe(gulpMocha({'reporter': 'nyan'}));
});

/**
 * Run tests with Mocha and report the results in a more fun way.
 */
gulp.task('test.strict', ['build.strict'], function() {
  return gulp.src('./dist/**/test/*.js').pipe(gulpMocha());
});

/**
 * Runs pre-submission checks to ensure the quality of future pull requests.
 */
gulp.task('pre-submit', function(done) {
  return runSequence('check-format', 'test.strict', sequenceComplete(done));
});
