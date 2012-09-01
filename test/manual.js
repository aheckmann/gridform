var formidable = require('formidable')
var http = require('http')
var mongo = require('mongodb')
var assert= require('assert')
var db, app;

var gridform = require('../')

var server = new mongo.Server('localhost', 27017);
db = new mongo.Db('test_gridform', server);
db.open(function (err) {
  assert.ifError(err);

  db.dropDatabase(function () {
  db.collection('fs.files', function (err, coll) {
    assert.ifError(err);

    gridform.db = db;
    gridform.mongo = mongo;

    app = http.Server(function (req, res, next) {
      if ('GET' == req.method) {
        res.setHeader("Content-Type", "text/html");
        return res.end(
            '<form method="post" action="/" enctype="multipart/form-data">'
          + '<input type="file" name="text">'
          + '<input type="submit" value="upload">'
          + '</form>');
      }

      if ('POST' == req.method && '/' == req.url) {
        var form = gridform();

        form.parse(req, function (err, fields, files) {
          if (err) return res.end('got parse err: ' + err.stack)

          console.log(fields);
          console.log(files);
          console.log('received upload..');

          // https://github.com/aheckmann/gridform/issues/1
          coll.findOne({ _id: files.text.id }, function (err, doc) {
            if (err) return res.end('got error: ' + err.stack);
            if (!doc) return res.end('no doc found');
            res.end(files.text.name);
          })
        });
      }
    });
    app.listen(8087, function () {
      console.log('listening on http://localhost:8087');
    });
  });
  });
});

