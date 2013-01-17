#gridform
======================

[Formidable](https://github.com/felixge/node-formidable) streams uploads to the file system by default. If you're using GridFS to store files you'll then need to turn around and copy them off of the file system. Using `gridform` removes this burden.

Example:

```js
var mongo = require('mongodb')
var gridform = require('gridform');

// assuming you've already created a db instance and opened it
gridform.db = db;
gridform.mongo = mongo;

// in your http server
var app = http.Server(function (req, res) {

  // create a gridform
  var form = gridform();

  // returns a custom IncomingForm
  assert(form instanceof formidable.IncomingForm);

  // optionally store per-file metadata
  form.on('fileBegin', function (name, file) {
    file.metadata = 'so meta'
  })

  // parse normally
  form.parse(req, function (err, fields, files) {

    // use files and fields as you do today
    var file = files.upload;

    file.name // the uploaded file name
    file.type // file type per [mime](https://github.com/bentomas/node-mime)
    file.size // uploaded file size (file length in GridFS) named "size" for compatibility
    file.path // same as file.name. included for compatibility
    file.lastModified // included for compatibility

    // files contain additional gridfs info
    file.root // the root of the files collection used in MongoDB ('fs' here means the full collection in mongo is named 'fs.files')
    file.id   // the ObjectId for this file

  });
});
```

## install

```
npm install gridform
```

## exports

The module exports a function which takes an options object.

```js
var gridform = require('gridform');
var options = { db: db, mongo: mongo, filename: fn };
var form = gridform(options);
```

Available options:

  - db: an open [node-mongodb-native](https://github.com/mongodb/node-mongodb-native) db instance
  - mongo: the [node-mongodb-native](https://github.com/mongodb/node-mongodb-native) driver you are using
  - filename: function

The optional `filename` function is passed the `file.name` before streaming to MongoDB providing an opportunity to return a customized filename with a prefix etc.

`db` and `mongo` are required unless you've specified them on `gridform` itself.

```js
var gridform = require('gridform');
gridform.db = db;
gridform.mongo = mongo;
var form = gridform(); // all good
```

The gridform function returns an instance of `formidable.IncomingForm` so you can process uploads without changing any code.

## gridfs-stream

This module utilizes the [gridfs-stream](https://github.com/aheckmann/gridfs-stream) module which is exposed as `require('gridform').gridfsStream`.

## tests

Run the tests with `make test`.

[LICENCE](https://github.com/aheckmann/gridform/blob/master/LICENSE)

