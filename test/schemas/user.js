var _ = require('lodash'),
    mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var User = new Schema({
    email: { type: String, required: true }
}, { safe: true, strict: true });

/**
  Export the schema
 **/
module.exports = {
    name: 'User',
    collection: 'users',
    schema: User
};