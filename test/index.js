var formidable = require('formidable')
var http = require('http')
var mongo = require('mongodb')
var assert= require('assert')
var request = require('./_request')
var db;

var gridform = require('../')

describe('gridform', function(){
  before(function(done){
    var server = new mongo.Server('localhost', 27017);
    db = new mongo.Db('test_gridform', server, {w:1});
    db.open(done);
  });

  describe('File', function(){
    it('should be a function', function(){
      assert('function' == typeof gridform.File)
    });
    it('should have expected props', function(){
      var file = new gridform.File;
      'name path type size root id lastModified'.split(' ').forEach(function (prop) {
        assert(prop in file)
      });
    });
  });

  describe('gridfsStream', function(){
    it('is exposed', function(){
      assert.ok('function' == typeof gridform.gridfsStream);
    })
  })

  describe('exports.', function(){
    it('should be a fn', function(){
      assert('function' == typeof gridform)
    })

    describe('an instance', function(){
      it('should expect a db', function(){
        var e;
        try {
        var form = gridform();
        } catch (err) {
          e = err;
        }
        assert(e);
        try {
        var form = gridform({ mongo: mongo });
        } catch (err) {
          e = err;
        }
        assert(e);
      })
      it('should expect a driver', function(){
        var e;
        try {
        var form = gridform({ db: 1 });
        } catch (err) {
          e = err;
        }
        assert(e);
      })
      it('should be a formidable.IncomingForm', function(){
        var form = gridform({ db: db, mongo: mongo });
        assert(form instanceof formidable.IncomingForm)
      })

      describe('options', function(){
        it('should not assign db, filename, or mongo to the form', function(){
          var form = gridform({ db: 1, mongo: mongo, filename: function(){}, x: true });
          assert.equal(form.x, undefined);
          assert.equal('undefined', typeof form.db)
          assert.equal('undefined', typeof form.mongo)
          assert.equal('undefined', typeof form.filename)
        })
        it('__filename', function(){
          var form = gridform({db:db, mongo: mongo});
          assert(form.__filename);
          assert.equal('function', typeof form.__filename);
          assert.equal(4, form.__filename(4));
          form = gridform({ db: db, mongo: mongo, filename: function(){return 2} });
          assert.equal(2, form.__filename(4));
        });
      })

      // test uploading a file and getting fields, files, progress, final values
      describe('should handle uploading', function(){
        var address;
        var app;
        var fn; // switched out for each test

        // start a server
        before(function(done){
          app = http.Server(function (req, res, next) {
            fn(req, res, next);
          });
          app.listen(0, function () {
            request.address = app.address();
            done();
          });
        });

        // test uploading a file and reading it back
        it('should set the body', function (done) {

          fn = function (req, res, next) {
            var form = gridform({ db: db, mongo: mongo });
            var self = this;
            form.parse(req, function (err, fields, files) {
              if (err) return done(err);
              res.end(JSON.stringify(fields));
            });
          }

          request()
          .post('/')
          .header('Content-Type', 'multipart/form-data; boundary=foo')
          .write('--foo\r\n')
          .write('Content-Disposition: form-data; name="user"\r\n')
          .write('\r\n')
          .write('Tobi')
          .write('\r\n--foo--')
          .end(function(res){
            assert.equal(res.body, '{"user":"Tobi"}');
            done();
          });
        });

        it('should support files', function(done){
          fn = function (req, res, next) {
            var form = gridform({ db: db, mongo: mongo });
            form.parse(req, function (err, fields, files) {
              if (err) return done(err);
              assert.equal(fields['user[name]'], 'Tobi');
              assert(files.text.path);
              assert.equal('File', files.text.constructor.name);

              // https://github.com/aheckmann/gridform/issues/1
              db.collection('fs.files', function (err, coll) {
                assert.ifError(err);
                coll.findOne({ _id: files.text.id }, function (err, doc) {
                  assert.ifError(err);
                  assert.ok(doc);
                  res.end(files.text.name);
                })
              })
            });
          }

          request()
          .post('/')
          .header('Content-Type', 'multipart/form-data; boundary=foo')
          .write('--foo\r\n')
          .write('Content-Disposition: form-data; name="user[name]"\r\n')
          .write('\r\n')
          .write('Tobi')
          .write('\r\n--foo\r\n')
          .write('Content-Disposition: form-data; name="text"; filename="foo.txt"\r\n')
          .write('\r\n')
          .write('some text here')
          .write('\r\n--foo--')
          .end(function(res){
            assert.equal(res.body, 'foo.txt');
            done();
          });
        });

        it('should store metadata', function(done){
          fn = function (req, res, next) {
            var form = gridform({ db: db, mongo: mongo });
            form.on('fileBegin', function (name, file) {
              file.metadata = { meta: name };
            });
            form.parse(req, function (err, fields, files) {
              if (err) return done(err);
              res.end(files.text.metadata.meta);
            });
          }

          request()
          .post('/')
          .header('Content-Type', 'multipart/form-data; boundary=foo')
          .write('--foo\r\n')
          .write('Content-Disposition: form-data; name="user[name]"\r\n')
          .write('\r\n')
          .write('Tobi')
          .write('\r\n--foo\r\n')
          .write('Content-Disposition: form-data; name="text"; filename="foo.txt"\r\n')
          .write('\r\n')
          .write('some text here')
          .write('\r\n--foo--')
          .end(function(res){
            assert.equal(res.body, 'text');
            done();
          });
        });

        it('should work with multiple fields', function(done){
          fn = function (req, res, next) {
            var form = gridform({ db: db, mongo: mongo });
            form.parse(req, function (err, fields, files) {
              if (err) return done(err);
              assert.equal(0, Object.keys(files).length);
              res.end(JSON.stringify(fields));
            });
          }
          request()
          .post('/')
          .header('Content-Type', 'multipart/form-data; boundary=foo')
          .write('--foo\r\n')
          .write('Content-Disposition: form-data; name="user"\r\n')
          .write('\r\n')
          .write('Tobi')
          .write('\r\n--foo\r\n')
          .write('Content-Disposition: form-data; name="age"\r\n')
          .write('\r\n')
          .write('1')
          .write('\r\n--foo--')
          .end(function(res){
            assert.equal(res.body,'{"user":"Tobi","age":"1"}');
            done();
          });
        })

        it('should support multiple files of the same name', function(done){
          fn = function(req, res){
            var form = gridform({ db: db, mongo: mongo });
            form.parse(req, function (err, fields, files) {
              assert.equal(err.message,'parser error, 16 of 28 bytes parsed');
              res.statusCode = 500;
              res.end();
            });
          };

          request()
          .post('/')
          .header('Content-Type', 'multipart/form-data; boundary=foo')
          .write('--foo\r\n')
          .write('Content-filename="foo.txt"\r\n')
          .write('\r\n')
          .write('some text here')
          .write('\r\n--foo\r\n')
          .write('Content-Disposition: form-data; name="text"; filename="bar.txt"\r\n')
          .write('\r\n')
          .write('some more text stuff')
          .write('\r\n--foo--')
          .end(function(res){
            assert.equal(500, res.statusCode);
            done();
          });
        })

      });
    })
  })
})

