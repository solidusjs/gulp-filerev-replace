gulp-filerev-replace
====================

Rev and replace files according to their mutual dependencies. This plugin accepts a stream containing all the files to filerev and/or replace. It will detect which files reference which files, and then transform the files accordingly. For example, if we filerev and replace these files:

```
index.html: <img src="/loader.gif" /> <link href="/styles.css" type="text/css" />
loader.gif
styles.css: body {background: url("/loader.gif")}
```

The process will be the following (hashes are made up for the example):

1. Filerev `loader.gif` into `loader-11111111.gif`
2. Replace `/loader.gif` in `index.html` and `styles.css`
3. Filerev `styles.css` into `styles-22222222.css`
4. Replace `/styles.css` in `index.html`
5. Filerev `index.html` into `index-33333333.html`

Notice that `loader.gif` is filereved first, since it is referenced the most, then `styles.css` and finally `index.html`. The resulting stream will be:

```
loader-11111111.gif
styles-22222222.css: body {background: url("/loader-11111111.gif")}
index-33333333.html: <img src="/loader-11111111.gif" /> <link href="/styles-22222222.css" type="text/css" />
```

## Usage:

```javascript
var filerevReplace = require('gulp-filerev-replace');

// Include all files to filerev and/or replace, making sure the base is correct
gulp.src('/mysite/**/*', {base: '/mysite'})
  .pipe(filerevReplace({
    filerev: ['assets/**/*'], // Select the files to filerev
    replace: ['views/**/*'],  // Select the files to replace
    base:    'assets'         // Filerevved files are served from the assets directory by the web server
  }))
  ...
```

### Options:

- `filerev`: [minimatch](https://github.com/isaacs/minimatch) pattern to filter the files to filerev.
- `replace`: [minimatch](https://github.com/isaacs/minimatch) pattern to filter the files to replace.
- `base`: Directory from where the files are served by the web server. Optional, defaults to the [file's base](https://github.com/gulpjs/gulp/blob/master/docs/API.md#optionsbase);

## TODO

- Try to break this into simpler plugins...
- Handle null files
- Handle relative paths in current directory?
- Document matched patterns
