
/**
 * Module dependencies
 */

var EventEmitter = require('events').EventEmitter;

/**
 * Expose
 */

module.exports = exports = File;

/**
 * File
 * @api private
 */

function File (name, path, type) {
  EventEmitter.call(this);

  this.name = name;
  this.path = path;
  this.type = type;
  this.size = 0;
  this.root = null;
  this.id = null;
  this.lastModified = new Date;
}

File.prototype.__proto__ = EventEmitter.prototype;

