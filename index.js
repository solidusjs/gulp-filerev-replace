var path           = require('path');
var through        = require('through2');
var gutil          = require('gulp-util');
var lazypipe       = require('lazypipe');
var crypto         = require('crypto');
var multimatch     = require('multimatch');
var istextorbinary = require('istextorbinary');

const PLUGIN_NAME        = 'gulp-filerev-replace';
const STARTING_DELIMITER = '(\\\\?\'|\\\\?"|\\\\?\\(\\s*)';
const ENDING_DELIMITER   = '(\\\\?\'|\\\\?"|\\s*\\\\?\\)|\\?|#)';
const MANIFEST_OPTIONS   = {path: 'filerev-replace-manifest.json'};

function plugin(options) {
  var self = {};

  return (lazypipe()
    .pipe(initialize.bind(self), options)
    .pipe(findReferences.bind(self))
    .pipe(sortByReferencesDepth.bind(self))
    .pipe(filerevAndReplace.bind(self))
  )();
};

plugin.addManifest = function(options) {
  var manifest      = {};
  var manifest_file = new gutil.File(options || MANIFEST_OPTIONS);

  return through.obj(function(file, enc, cb) {
    if (file.old_relative) manifest[file.old_relative] = file.relative;
    this.push(file);
    cb();
  }, function(cb) {
    manifest_file.contents = new Buffer(JSON.stringify(manifest, null, 2));
    this.push(manifest_file);
    cb();
  });
};

// PRIVATE

function initialize(options) {
  var self = this;

  self.filerev = {};
  self.replace = {};
  self.options = options || {};
  self.options.filerev || (self.options.filerev = '**/*');
  self.options.replace || (self.options.replace = '**/*');

  return transformAllFiles(function(file, enc) {
    if (multimatch(file.relative, self.options.filerev).length) {
      self.filerev[file.relative] = {
        regexp:     new RegExp(STARTING_DELIMITER + escapeRegExp(webPath.call(self, file)) + ENDING_DELIMITER, 'g'),
        references: []
      };
    }

    if (multimatch(file.relative, self.options.replace).length && istextorbinary.isTextSync(null, file.contents)) {
      self.replace[file.relative] = {
        contents: String(file.contents)
      };
    }
  });
};

function findReferences() {
  var self = this;

  return transformAllFiles(function(file, enc) {
    if (!self.replace[file.relative]) return;

    var contents = self.replace[file.relative].contents;

    for (var src in self.filerev) {
      if (contents.match(self.filerev[src].regexp)) {
        self.filerev[src].references.push(file.relative);
      }
    }
  });
};

function sortByReferencesDepth() {
  var self   = this;
  var depths = {};

  return transformAllFiles(
    function(file, enc) {
      if (!self.filerev[file.relative]) return;

      // Find the max references depth for each file
      var references = self.filerev[file.relative].references;
      try {
        depths[file.relative] = maxDepth.call(self, [file.relative], references);
      } catch(err) {
        this.emit('error', new gutil.PluginError(PLUGIN_NAME, err));
      }
    },
    function(files) {
      // Sort by decreasing depth
      return files.sort(function(file1, file2) {
        var depth1 = depths[file1.relative] || 0;
        var depth2 = depths[file2.relative] || 0;
        return depth2 - depth1;
      });
    }
  );
};

function filerevAndReplace() {
  var self = this;

  return through.obj(function(file, enc, cb) {
    if (file.isBuffer()) {
      var old_relative = file.relative;

      if (self.replace[old_relative]) {
        file.contents = new Buffer(self.replace[old_relative].contents);
      }

      if (self.filerev[old_relative]) {
        file.path         = filerevFile(file);
        file.old_relative = old_relative;

        gutil.log(PLUGIN_NAME, 'Filerevved: ' + old_relative + ' -> ' + file.relative);

        var references = self.filerev[old_relative].references;
        var regexp     = self.filerev[old_relative].regexp;
        var dest       = webPath.call(self, file);

        for (var i = 0; i < references.length; ++i) {
          var reference = references[i];
          var count     = 0;

          self.replace[reference].contents = self.replace[reference].contents.replace(regexp, function(match, starting_delimiter, ending_delimiter) {
            ++count;
            return starting_delimiter + dest + ending_delimiter;
          });

          gutil.log(PLUGIN_NAME, 'Replaced: ' + reference + ' (' + count + 'x)');
        }
      }
    }

    this.push(file);
    cb();
  });
};

// Transform all files in the stream but wait until all files are handled before emitting events
function transformAllFiles(transform, flush) {
  var files = [];

  return through.obj(
    function(file, enc, cb) {
      if (file.isStream()) {
        this.emit('error', new gutil.PluginError(PLUGIN_NAME, 'Streams are not supported!'));
        return cb();
      }

      if (file.isBuffer()) {
        if (transform) transform.call(this, file, enc);
      }

      files.push(file);
      cb();
    },
    function(cb) {
      if (flush) files = flush.call(this, files);
      for (var i = 0; i < files.length; ++i) {
        this.push(files[i]);
      }
      cb();
    }
  );
}

function escapeRegExp(str) {
  return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

function webPath(file) {
  var self = this;
  return '/' + path.relative(self.options.base || file.base, file.path);
};

function maxDepth(stack, references) {
  if (!references.length) return stack.length;

  var self = this;
  var depths = references.map(function(src) {
    var filerev = self.filerev[src];
    if (!filerev) return stack.length;
    if (stack.indexOf(src) > -1) throw('Circular reference detected:\n' + stack.concat([src]).join('\n'));
    return maxDepth.call(self, stack.concat([src]), filerev.references);
  });

  return Math.max.apply(Math, depths);
};

function filerevFile(file) {
  var hash     = md5(file.contents).slice(0, 8);
  var ext      = path.extname(file.path);
  var filename = path.basename(file.path, ext) + '-' + hash + ext;
  return path.join(path.dirname(file.path), filename);
};

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
};

module.exports = plugin;
