const gulp = require('gulp');
const concat = require('gulp-concat');
const rename = require('gulp-rename');
const uglify = require('gulp-uglify');
const rollup = require('rollup');
const node = require('rollup-plugin-node-resolve');

gulp.task('build:d3', async function() {
  const bundle = await rollup.rollup({
    entry: 'index.js',
    plugins: [node()]
  });

  await bundle.write({
    format: 'umd',
    moduleName: 'd3',
    dest: 'lib/d3.js'
  })
});

gulp.task('build:ddt', function() {
  return gulp.src(['lib/d3.js','src/**/*.js'])
    .pipe(concat('ddtimelines.js'))
    .pipe(gulp.dest('dist'))
    .pipe(rename('ddtimelines.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('dist'))
});

gulp.task('watch', function() {
  gulp.watch('src/*.js', ['build:ddt']);
});
