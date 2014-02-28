var _ = require('lodash'),
    mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var Book = new Schema({
    title: { type: String, required: true }
}, { safe: true, strict: true });

/**
  Export the schema
 **/
module.exports = {
    name: 'Book',
    collection: 'books',
    schema: Book
};