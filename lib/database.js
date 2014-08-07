var _ = require('lodash'),
  async = require('async'), 
  events = require('events'),
	fs = require('fs'),
	mongoose = require('mongoose'),
  path = require('path'),
	util = require('util'),
	logger = require('debug')('easymongoosedb');

/**
  Database class responsible for streamlining access to the database connectivity, status
  and models
 **/
function Database(opts) {

  if (!opts || !opts.modelsDir) throw new Error('Invalid database options');

	// Database options
	this.opts = _.extend(opts || {});
	// Loaded models
  this.models = {};
  this.connection = mongoose.createConnection();
  this.mongoose = mongoose;
  // Flags
  this.ready = false;
}
util.inherits(Database, events.EventEmitter);

/**
  Connects to the database
 **/
Database.prototype.connect = function(callback) {
 
    var type = this.opts.type || 'single',
        connection = this.connection,
        db = this;
        
    logger('Connecting to database ' + db.opts.url);
    
    connection[type == 'set' ? 'openSet' : 'open'](db.opts.url, function(err) {
    	if (err) {
    		logger('Fatal error connecting to database', err);
        return callback(err);
    	} else {
    		logger('Database connected successfully');
    		db.ready = true;
    		db.emit('ready', db);
        return callback();   
    	}
    });            
}

/**
  Returns the model id for the given model
 **/
Database.prototype._getModelId = function(modelName, opts) {
  var options = opts || {};

  return (options.namespace ? options.namespace + '.' : '') + modelName;
}

/**
  Gets the model with the given model name and returns it to the callback
  
  Returns err if the model is not available, or queues the model request if the
  database is not yet ready  
 **/
Database.prototype.getModel = function(modelName, opts, callback) {

	if (typeof opts == 'function' && !callback) {
		callback = opts;
		opts = null;
	}

	var db = this,
      options = opts || {},
		  modelId = this._getModelId(modelName, options)

  logger(modelName);

  // If not, check if the database is ready
  if (this.ready) {
  	return this.loadModel(modelName, modelId, options, callback);
  } else {
  	// Otherwise queue up the loads while we wait
  	this.on('ready', this.loadModel.bind(this, modelName, modelId, options, callback));
  }
}

/**
  Attempts to load the model without using an asynchronous code - for backwards compatibility with the legacy API
  @deprecated
 **/
Database.prototype.getModelSync = function(modelName, opts) {

  var options = opts || {},
      modelId = this._getModelId(modelName, options)

  // If not, check if the database is ready
  if (this.ready) {
    return this.loadModelSync(modelName, modelId, options);
  } else {
    return null;
  }
}

/**
  Returns a number of models at a given time and returns them to the callback function in
  the order they were present in the array
 **/
Database.prototype.getModels = function(models, callback) {

  var db = this;

  async.map(
    models, 
    function(model, done) {

      if (typeof model == 'string') {
        return db.getModel(model, done);
      } 
      else if (typeof model == 'object' && model.hasOwnProperty('name')) {
        return db.getModel(model['name'], model['opts'], done);
      } 
      else {
        return done('Invalid model');
      }
    },

    function(err, models) {
      if (err) return callback(err);
      callback.apply(callback.this, [null].concat(models));
    }
  );

}

/**
  Loads a model using a schema
 **/
Database.prototype.loadModel = function(schemaId, modelId, opts, callback) {

	if (!this.ready) return callback('Database is not ready');

	// Check if we have an already loaded model
  if (this.models[modelId]) {
  	return callback(null, this.models[modelId]);
  }

  var schemaFile = path.join(this.opts.modelsDir, schemaId + '.js'),
      db = this;
      
  logger("Creating model " + modelId + " using schema " + schemaId + " from " + this.opts.modelsDir);

  fs.stat(schemaFile, function(err, stat) {
      if (err || !stat.isFile()) {
      	logger('A schema file [' + schemaFile + '] could not be loaded for model ' + modelId + ' [Error: ' + (err || 'Unknown') + ']');
      	return callback('Unable to load schema file ' + schemaId);
      }

      db._loadModelFromFile(schemaFile, modelId, opts, callback);
  });
}

/**
  Loads a model inline using a schema. Designed for backwards compatibility with the legacy API. For new functionality, use
  loadModel
  @deprecated
 **/
Database.prototype.loadModelSync = function(schemaId, modelId, opts) {
  if (!this.ready) return callback('Database is not ready');

  // Check if we have an already loaded model
  if (this.models[modelId]) {
    return this.models[modelId];
  }

  var schemaFile = path.join(this.opts.modelsDir, schemaId + '.js'),
      db = this;
      
  logger("Creating model " + modelId + " using schema " + schemaId + " from " + this.opts.modelsDir);

  var stat = fs.statSync(schemaFile);
  if (!stat || !stat.isFile()) {
    logger('A schema file [' + schemaFile + '] could not be loaded for model ' + modelId + ' [Error: ' + (err || 'Unknown') + ']');
    return null;
  }

  return db._loadModelFromFile(schemaFile, modelId, opts);
}

/**
  Loads a model from a file - it assumes that the file exists so that this can remain an synchronous function, 
  so should be checked prior to calling this method
 **/
Database.prototype._loadModelFromFile = function(schemaFile, modelId, options, callback) {

  var db = this,
      schemaOpts = options || {},
      schemaInfo = require(schemaFile);

  // Allow for schemas to use the model loading capability for relationships
  if (typeof schemaInfo == 'function') {
    schemaInfo = schemaInfo(db);
  }

  if (!schemaInfo || !schemaInfo.schema || !schemaInfo.name) {
    logger('A schema file [' + schemaFile + '] did not have valid schema information');
    if (callback) callback('Invalid schema information for ' + schemaId);
    return null;
  }

  // Allow blocking of namespacing (ie. brands)
  if (schemaOpts.namespace && schemaInfo.preventNamespacing) {
    if (callback) callback('Attempted to namespace a schema that prevented it');
    return null;
  }

  var modelName = schemaInfo.name + (schemaOpts.namespace ? '-' + schemaOpts.namespace : ''),
      collectionName =  (schemaInfo.collection ? (schemaOpts.namespace ? schemaOpts.namespace + '.' : '') + schemaInfo.collection : null),
      schema = schemaInfo.schema,
      model;

  // Patch additional methods in
  if (schemaOpts.methods) {
    _.each(schemaOpts.methods, function(method, name) {
      schema.methods[name] = method;
    });
  }

  model = db.connection.model(modelName, schema, collectionName);

  if (model) {
    db.models[modelId] = model;
    if (callback) callback(null, model);
  } else if (callback) {
    callback('Could not load model ' + modelId);
  }
  return model;
}

/**
  Allows a module to manually register a model
 **/
Database.prototype.registerModel = function(modelId, schema, callback) {
  // TODO
}

module.exports = function(opts) {
  return new Database(opts);
}