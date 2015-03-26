var assert         = require('assert');
var es             = require('event-stream');
var fs             = require('fs');
var gulp           = require('gulp');
var gutil          = require('gulp-util');
var path           = require('path');
var sa             = require('stream-assert');
var filerevReplace = require('../');

describe('gulp-filerev-replace', function() {
  var log = gutil.log;

  before(function() {
    gutil.log = function() {};
  });

  after(function() {
    gutil.log = log;
  });

  it('filerevs and replaces all files', function(done) {
    gulp
      .src(fixtures('basic/*'))
      .pipe(filerevReplace())
      .pipe(sa.nth(0, function(file) {
        assert.equal(file.relative, 'loader-aef3c727.gif');
      }))
      .pipe(sa.nth(1, function(file) {
        assert.equal(file.relative, 'styles-b442055f.css');
        assert.equal(file.contents.toString(), '"/loader-aef3c727.gif"');
      }))
      .pipe(sa.nth(2, function(file) {
        assert.equal(file.relative, 'index-42012d94.html');
        assert.equal(file.contents.toString(), '"/styles-b442055f.css" "/loader-aef3c727.gif"');
      }))
      .pipe(sa.end(done));
  });

  it('with filerev and replace filters', function(done) {
    gulp
      .src(fixtures('basic/*'))
      .pipe(filerevReplace({filerev: ['*.{gif,css}'], replace: ['*.html']}))
      .pipe(sa.nth(0, function(file) {
        assert.equal(file.relative, 'loader-aef3c727.gif');
      }))
      .pipe(sa.nth(1, function(file) {
        assert.equal(file.relative, 'styles-a514d32b.css');
        assert.equal(file.contents.toString(), '"/loader.gif"');
      }))
      .pipe(sa.nth(2, function(file) {
        assert.equal(file.relative, 'index.html');
        assert.equal(file.contents.toString(), '"/styles-a514d32b.css" "/loader-aef3c727.gif"');
      }))
      .pipe(sa.end(done));
  });

  it('with wrong web base path', function(done) {
    gulp
      .src(fixtures('basic/*'), {base: fixtures('')})
      .pipe(filerevReplace())
      .pipe(sa.nth(0, function(file) {
        assert.equal(file.relative, 'basic/index-4a54e2a0.html');
        assert.equal(file.contents.toString(), '"/styles.css" "/loader.gif"');
      }))
      .pipe(sa.nth(1, function(file) {
        assert.equal(file.relative, 'basic/loader-aef3c727.gif');
      }))
      .pipe(sa.nth(2, function(file) {
        assert.equal(file.relative, 'basic/styles-a514d32b.css');
        assert.equal(file.contents.toString(), '"/loader.gif"');
      }))
      .pipe(sa.end(done));
  });

  it('with right web base path', function(done) {
    gulp
      .src(fixtures('basic/*'), {base: fixtures('')})
      .pipe(filerevReplace({base: fixtures('basic')}))
      .pipe(sa.nth(0, function(file) {
        assert.equal(file.relative, 'basic/loader-aef3c727.gif');
      }))
      .pipe(sa.nth(1, function(file) {
        assert.equal(file.relative, 'basic/styles-b442055f.css');
        assert.equal(file.contents.toString(), '"/loader-aef3c727.gif"');
      }))
      .pipe(sa.nth(2, function(file) {
        assert.equal(file.relative, 'basic/index-42012d94.html');
        assert.equal(file.contents.toString(), '"/styles-b442055f.css" "/loader-aef3c727.gif"');
      }))
      .pipe(sa.end(done));
  });

  it('with folders and crazy delimiters', function(done) {
    gulp
      .src([fixtures('matching/**/*'), '!' + fixtures('matching/result.html')])
      .pipe(filerevReplace())
      .pipe(sa.nth(0, function(file) {
        assert.equal(file.relative, 'images/loader-aef3c727.gif');
      }))
      .pipe(sa.nth(1, function(file) {
        assert.equal(file.relative, 'matching-89eaa369.html');
        assert.equal(file.contents.toString(), fs.readFileSync(fixtures('matching/result.html')));
      }))
      .pipe(sa.end(done));
  });

  it('with circular reference', function(done) {
    gulp
      .src(fixtures('circular/*'))
      .pipe(filerevReplace())
      .on('error', function(err) {
        assert.equal(err.message, 'Circular reference detected:\nfile1.html\nfile2.html\nfile1.html');
        done();
      });
  });

  it('with streams', function(done) {
    gulp
      .src(__filename, {buffer: false})
      .pipe(filerevReplace())
      .on('error', function(err) {
        assert.equal(err.message, 'Streams are not supported!');
        done();
      });
  });

  describe('.addManifest', function() {
    it('adds a manifest file to the stream', function(done) {
      gulp
        .src(fixtures('basic/*'))
        .pipe(filerevReplace())
        .pipe(filerevReplace.addManifest())
        .pipe(sa.last(function(file) {
          assert.equal(file.relative, 'filerev-replace-manifest.json');
          assert.deepEqual(JSON.parse(file.contents), {
            'loader.gif': 'loader-aef3c727.gif',
            'styles.css': 'styles-b442055f.css',
            'index.html': 'index-42012d94.html'
          });
        }))
        .pipe(sa.end(done));
    });

    it('with folders', function(done) {
      gulp
        .src(fixtures('basic/*'), {base: fixtures('')})
        .pipe(filerevReplace({base: fixtures('basic')}))
        .pipe(filerevReplace.addManifest())
        .pipe(sa.last(function(file) {
          assert.equal(file.relative, 'filerev-replace-manifest.json');
          assert.deepEqual(JSON.parse(file.contents), {
            'basic/loader.gif': 'basic/loader-aef3c727.gif',
            'basic/styles.css': 'basic/styles-b442055f.css',
            'basic/index.html': 'basic/index-42012d94.html'
          });
        }))
        .pipe(sa.end(done));
    });

    it('with options', function(done) {
      gulp
        .src(fixtures('basic/*'))
        .pipe(filerevReplace())
        .pipe(filerevReplace.addManifest({path: 'folder/file.txt'}))
        .pipe(sa.last(function(file) {
          assert.equal(file.relative, 'folder/file.txt');
        }))
        .pipe(sa.end(done));
    });
  });
});

var fixtures = function(glob) {
  return path.join(__dirname, 'fixtures', glob);
};
