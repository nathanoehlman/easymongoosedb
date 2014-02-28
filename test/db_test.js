var should = require('chai').should(),
    path = require('path'),
    easydb = require('..');
    
describe('EasyMongooseDB', function(){

    var db;

    before(function(done) {
        db = easydb({ 
            modelsDir: path.join(__dirname, 'schemas'),
            url: 'mongodb://127.0.0.1:27017/easydb-test',
            type: 'single'
        });
        db.connect(done);
    });
    
    it('should be able to load up a standard model', function(done) {

        db.getModel('user', function(err, model) {
            model.modelName.should.equal('User');
            model.collection.name.should.equal('users');
            return done(err);
        });

    });

    it('should be able to load up a namespaced model', function(done) {

        db.getModel('user', { namespace: 'other' }, function(err, model) {
            model.modelName.should.equal('User-other');
            model.collection.name.should.equal('other.users');
            return done(err);
        });

    });

    it('should be able to load multiple models', function(done) {

        db.getModels(['user', 'book'], function(err, User, Book) {
            if (err) return done(err);

            User.modelName.should.equal('User');
            Book.modelName.should.equal('Book');
            return done();
        });
    });
    
});