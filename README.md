# EasyMongooseDB

EasyMongooseDB takes a lot of the make work around quickly setting up a connection to a MongoDB database with Mongoose, as well as providing helpful functions around models and schema creation.

## Installation

```
npm install easymongoosedb
```

## Example Usage

### Connection to a database

```
var easydb = require('easymongoosedb');

var db = easydb({
	url: 'mongodb://127.0.0.1:27017/testdb', // Path to your database
	type: 'single', // Can be set/single
	modelsDir: path.join(__dirname, 'schemas') // Path to the schemas
});

db.connect(function(err) {
	
});

```

### Getting a model

```
// Async
db.getModel('user', function(err, User) {
	User.find(...);
});

// Get many models
db.getModels(['user', 'invoices'], function(err, User, Invoices) {
	
});

// Sync
var User = db.getModelSync('User');
```

### Namespacing

EasyMongooseDB provides the ability to created use a single schema to create many namespaced models (useful for creating instanced collections).

TODO - Add details

## License
EasyMongooseDB is distributed under an [MIT License](http://www.opensource.org/licenses/mit-license.php)_