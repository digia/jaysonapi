'use strict';

var Lab = require('lab');
var Code = require('code');
var Relationships = require('../lib/relationships');


var internals = {}

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;


describe('Relationships', function () {

  describe('#BelongsTo', function () {

    it('should parse a belongs to relationship', function (done) {

      // Referencee belongs to "something" within the relationshipData
      var referenceAttribute = 'personId';
      var schema = { type: 'person', ref: 'id' };
      var referenceeData = { id: 1, personId: 3 };
      var relationshipData = { id: 3 };

      var belongsTo = Relationships.BelongsTo(referenceAttribute);

      var result = belongsTo(schema, referenceeData, relationshipData);

      expect(result).to.be.an.object();
      expect(result.data).to.be.an.object();
      expect(result.data.type).to.equal('person');
      expect(result.data.id).to.equal(3);

      done();
    });

    it('should return null if no relationships exists within data', function (done) {

      var referenceAttribute = 'personId';
      var schema = { type: 'person', ref: 'id' };
      var referenceeData = { id: 1, personId: 3};
      var relationshipData = [];

      var belongsTo = Relationships.BelongsTo(referenceAttribute);

      var result = belongsTo(schema, referenceeData, relationshipData);

      expect(result).to.be.an.null();

      done();
    });

  });

  describe('#HasMany', function () {

    it('should parse a has many relationship', function (done) {

      var referenceAttribute = 'personId';
      var schema = { type: 'address', ref: 'id' };
      var referenceeData = { id: 1 };
      var relationshipData = { personId: 1, id: 1 };

      var hasMany = Relationships.HasMany(referenceAttribute);

      var result = hasMany(schema, referenceeData, relationshipData);

      expect(result).to.be.an.object();
      expect(result.data).to.be.an.object();
      expect(result.data.type).to.equal('address');
      expect(result.data.id).to.equal(1);

      done();
    });

    it('should parse an array of has many relationships', function (done) {

      var referenceAttribute = 'personId';
      var schema = { type: 'address', ref: 'id' };
      var referenceeData = { id: 1 };
      var relationshipData = [
        { personId: 1, id: 2 },
        { personId: 1, id: 3 },
        { personId: 1, id: 4 },
        { personId: 2, id: 4 },
      ];

      var hasMany = Relationships.HasMany(referenceAttribute);

      var result = hasMany(schema, referenceeData, relationshipData);

      expect(result).to.be.an.object();
      expect(result.data).to.be.an.array();
      expect(result.data.length).to.equal(3);
      expect(result.data[0].type).to.be.a.string();
      expect(result.data[0].id).to.be.a.number();

      done();
    });

    it('should return null if no relationships exists within data', function (done) {

      var referenceAttribute = 'personId';
      var schema = { type: 'address', ref: 'id' };
      var referenceeData = { id: 1 };
      var relationshipData = [];

      var hasMany = Relationships.HasMany(referenceAttribute);

      var result = hasMany(schema, referenceeData, relationshipData);

      expect(result).to.be.an.null();

      done();
    });
  });
});
