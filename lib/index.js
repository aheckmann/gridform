// gridform

/**
 * Module dependencies
 */

var gridstream = require('gridfs-stream');
var formidable = require('formidable');
var File = require('./file');

/**
 * Expose
 */

module.exports = exports = gridform;
exports.File = File;

/**
 * gridform
 *
 * @param {Object} options
 * @return {formidable.IncomingForm}
 */

function gridform (options) {
  options || (options = {});
  var db = options.db || (options.db = exports.db);
  if (!db) throw new Error('missing db');
  delete options.db;

  var filename = options.filename || (options.filename = exports.filename || ƒ);
  delete options.filename;

  var form = new formidable.IncomingForm;
  form.__gridstream = gridstream(db);
  form.__filename = filename;
  form.onPart = onPart;
  return form;
}

/**
 * onPart
 *
 * @param {formidable Part} part
 * @api private
 * @ignore
 */

function onPart (part) {
  var form = this;

  if (undefined === part.filename) return form.handlePart(part);

  ++form._flushing;

  var file = new File(part.filename, form.__filename(part.filename), part.mime);

  form.emit('fileBegin', part.name, file);

  var options = { mode: 'w', content_type: file.type };
  if (this.chunk_size) options.chunk_size = this.chunk_size;
  if (this.root) options.root = this.root;
  if (this.metadata) options.metadata = this.metadata;
  var ws = form.__gridstream.createWriteStream(file.path, options);

  ws.on('progress', onprogress);
  ws.on('drain', resume);
  ws.once('error', done);
  part.on('data', onData);
  part.once('end', onEnd);

  function onprogress (size) {
    file.lastModified = new Date;
    file.size = size;
    file.emit('progress', size);
  }

  function resume () {
    form.resume();
  };

  function onData (data) {
    form.pause();
    ws.write(data);
  };

  function onEnd () {
    part.removeListener('data', onData);
    part.removeListener('end', onEnd);
    ws.once('drain', done);
    ws.end();
  };

  function done (err) {
    if (done.err) return;
    if (err) return form.emit('error', done.err = err);

    ws.removeListener('progress', onprogress);
    ws.removeListener('drain', resume);
    ws.removeListener('error', done);

    file.id || (file.id = ws._store.fileId);
    file.root = ws._store.root;
    file.size = ws._store.position;
    file.emit('end');

    --form._flushing;

    form.emit('file', part.name, file);
    form._maybeEnd();
  }
}

/**
 * @api private
 */

function ƒ (v) {
  return v;
}

