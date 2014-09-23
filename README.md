gulp-filerev-replace
====================

Rev and replace files according to their mutual dependencies.

Usage:

```javascript
gulp
  .src(['assets/**/*', '!assets/{scripts,styles}/**/*', 'views/**/*'], {base: process.cwd()})
  .pipe(filerevReplace({
    filerev: ['assets/**/*'],
    replace: ['assets/compiled/**/*', 'views/**/*'],
    base:    'assets'}))
  .pipe(gulp.dest(dest));

// Output
Starting 'gulp-filerev-replace'...
gulp-filerev-replace Filerevved: assets/images/ajax-loader.gif -> assets/images/ajax-loader-aef3c727.gif
gulp-filerev-replace Replaced: assets/compiled/scripts.js (9)
gulp-filerev-replace Replaced: assets/compiled/styles.css (8)
gulp-filerev-replace Replaced: views/index.html (6)
gulp-filerev-replace Replaced: views/media/index.html (5)
gulp-filerev-replace Filerevved: assets/compiled/styles.css -> assets/compiled/styles-b4051241.css
gulp-filerev-replace Replaced: assets/compiled/scripts.js (1)
gulp-filerev-replace Replaced: views/index.html (1)
gulp-filerev-replace Filerevved: assets/compiled/scripts.js -> assets/compiled/scripts-0328d21d.js
gulp-filerev-replace Replaced: views/index.html (1)
Finished 'gulp-filerev-replace' after 88 ms
```

Options:

- `filerev`: [minimatch](https://github.com/isaacs/minimatch) pattern to filter the files to filerev.
- `replace`: [minimatch](https://github.com/isaacs/minimatch) pattern to filter the files to replace.
- `base`: Directory from where the files are served by the web server.

TODO:

- Add tests!
