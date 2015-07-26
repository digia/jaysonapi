'use strict';

var _ = require('lodash');
var Lab = require('lab');
var Code = require('code');
var Serializer = require('../lib');


var internals = {}

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;


internals.generateSerializer = function (type, schema)
{
  var t = type || 'test';
  var s = schema || {};

  return Serializer(t, s);
}


describe('Serializer', function () {

  describe('#data', function () {
    it('should instantiate with a type and attributes', function (done) {

      var serializer = Serializer('test', {attributes: {}});

      expect(serializer).to.be.an.object();
      expect(serializer.type).to.equal('test');
      expect(serializer.attributes).to.be.an.object();

      done();
    });

    it('should serialize data according to its schema', function (done) {

      var schema = { attributes: ['name', 'phone'] };
      var serializer = Serializer('test', schema);
      var data = { id: 1, name: 'Joe Smith', phone: '8009991234' };

      serializer.serialize(data).then(function (result) {;

        expect(result.data).to.be.an.object(); 
        expect(result.data.type).to.equal('test');
        expect(result.data.id).to.equal(1);
        expect(result.data.attributes).to.be.an.object();
        expect(result.data.attributes.name).to.equal(data.name);
        expect(result.data.attributes.phone).to.equal(data.phone);

        done();
      });
    });

    it('should return an array even if data is empty', function (done) {

      var schema = { attributes: ['name', 'phone'] };
      var serializer = Serializer('test', schema);
      var data = [];

      serializer.serialize(data).then(function (result) {

        expect(result.data).to.be.an.array(); 
        expect(result.data.length).to.equal(0);

        done();
      });
    });

    it('should serialize an array of data according to its schema', function (done) {

      var schema = { attributes: ['name', 'phone'] };
      var serializer = Serializer('test', schema);
      var data = [
        { id: 1, name: 'Joe Smith', phone: '8009991234' },
        { id: 2, name: 'Joe Smith', phone: '8009991234' },
        { id: 3, name: 'Joe Smith', phone: '8009991234' },
        { id: 4, name: 'Joe Smith', phone: '8009991234' }
      ];

      serializer.serialize(data).then(function (result) {

        expect(result.data).to.be.an.array(); 
        expect(result.data.length).to.equal(4);

        done();
      });
    });

    it('should not include attributes if none exists', function (done) {

      var schema = { attributes: ['name', 'phone'] };
      var serializer = Serializer('test', schema);
      var data = { id: 1, };

      serializer.serialize(data).then(function (result) {

        expect(result.data).to.be.an.object(); 
        expect(result.data.type).to.equal('test');
        expect(result.data.id).to.equal(1);
        expect(result.data.attributes).to.be.an.undefined();

        done();
      });
    });

    it('should throw error when reference attribute is not within data', function (done) {

      // Using uuid as a custom `ref` 

      var schema = { attributes: ['name', 'phone'] };
      var data = { name: 'Joe Smith', phone: '8009991234' };

      var serializer = Serializer('test', schema, { ref: 'uuid' });

      var throws = function () 
      {
        serializer.serializeSync(data)
      }

      expect(throws).to.throw(ReferenceError, 'uuid is not defined within data');

      // Using the default `ref`

      var schema = { attributes: ['name', 'phone'] };
      var data = { name: 'Joe Smith', phone: '8009991234' };

      var serializer = Serializer('test', schema);

      var throws = function () 
      {
        serializer.serializeSync(data);
      }

      expect(throws).to.throw(ReferenceError, 'id is not defined within data');

      done();
    });

    describe('#relationships', function () {

      it('should include hasMany relationships', function (done) {

        var schema = { 
          attributes: ['name', 'phone'],
          relationships: {
            address: {
              serializer: {
                type: 'address',
                attributes: ['street', 'city', 'state', 'zipcode']
              },
              relationshipType: Serializer.Relationships.hasMany('personId')
            }
          }
        };

        var serializer = Serializer('person', schema);

        var data = { id: 1, name: 'Joe', phone: '9008881234' };
        var included = {
          address: {
            id: 2,
            street: '123 Street Ave.',
            city: 'Lansing',
            personId: 1,
          }
        };

        serializer.serialize(data, included).then(function (result) {

          expect(result.data).to.be.an.object();
          expect(result.data.id).to.equal(1);
          expect(result.data.type).to.equal('person');
          expect(result.data.attributes).to.be.an.object();

          expect(result.data.relationships).to.be.an.object();
          expect(result.data.relationships.address).to.be.an.object();
          expect(result.data.relationships.address.data).to.be.an.object();
          expect(result.data.relationships.address.data.type).to.equal('address');
          expect(result.data.relationships.address.data.id).to.equal(2);

          done();
        });
      });

      it('should include an array of hasMany relationships', function (done) {

        var schema = { 
          attributes: ['name', 'phone'],
          relationships: {
            address: {
              serializer: {
                type: 'address',
                attributes: ['street', 'city', 'state', 'zipcode']
              },
              relationshipType: Serializer.Relationships.hasMany('personId')
            }
          }
        };

        var serializer = Serializer('person', schema);

        var data = { id: 1, name: 'Joe', phone: '9008881234' };
        var included = {
          address: [{
            id: 2,
            street: '123 Street Ave.',
            city: 'Lansing',
            personId: 1,
          },
          {
            id: 3,
            street: 'Not a street Ave.',
            city: 'Detroit',
            personId: 1,
          },
          {
            id: 8,
            street: 'Not a street Ave.',
            city: 'Detroit',
            personId: 3,
          }]
        };

        serializer.serialize(data, included).then(function (result) {

          expect(result.data).to.be.an.object();
          expect(result.data.id).to.equal(1);
          expect(result.data.type).to.equal('person');
          expect(result.data.attributes).to.be.an.object();

          expect(result.data.relationships).to.be.an.object();
          expect(result.data.relationships.address).to.be.an.object();
          expect(result.data.relationships.address.data).to.be.an.array();
          expect(result.data.relationships.address.data.length).to.equal(2);

          expect(result.data.relationships.address.data[0].id).to.be.a.number();
          expect(result.data.relationships.address.data[1].id).to.be.a.number();

          var addressOne = result.data.relationships.address.data[0];
          var addressTwo = result.data.relationships.address.data[1];

          expect(addressOne.id).to.not.equal(addressTwo.id);

          done();
        });
      });

      it('should include belongsTo relationships', function (done) {

        var schema = { 
          attributes: ['name', 'phone'],
          relationships: {
            account: {
              serializer: {
                type: 'account',
                attributes: [ 'organization' ]
              },
              relationshipType: Serializer.Relationships.belongsTo('accountId')
            }
          }
        };

        var serializer = Serializer('person', schema);

        var data = { id: 1, name: 'Joe', phone: '9008881234', accountId: 2 };
        var included = {
          account: {
            id: 2,
            organization: 'ABC Co.',
          }
        };

        serializer.serialize(data, included).then(function (result) {

          expect(result.data).to.be.an.object();
          expect(result.data.id).to.equal(1);
          expect(result.data.type).to.equal('person');
          expect(result.data.attributes).to.be.an.object();

          expect(result.data.relationships).to.be.an.object();
          expect(result.data.relationships.account).to.be.an.object();
          expect(result.data.relationships.account.data).to.be.an.object();
          expect(result.data.relationships.account.data.type).to.equal('account');
          expect(result.data.relationships.account.data.id).to.equal(2);

          done();
        });
      });

      it('should use the provided relationship serializer instead generating', function (done) {

        var accountSchema = { attributes: [ 'organization' ] };
        var accountSerializer = Serializer('account', accountSchema);

        var schema = { 
          attributes: ['name', 'phone'],
          relationships: {
            account: {
              serializer: accountSerializer,
              relationshipType: Serializer.Relationships.belongsTo('accountId')
            }
          }
        };

        var serializer = Serializer('person', schema);

        var data = { id: 1, name: 'Joe', phone: '9008881234', accountId: 2 };
        var included = {
          account: {
            id: 2,
            organization: 'ABC Co.',
          }
        };

        serializer.serialize(data, included).then(function (result) {

          expect(result.data).to.be.an.object();
          expect(result.data.id).to.equal(1);
          expect(result.data.type).to.equal('person');
          expect(result.data.attributes).to.be.an.object();

          expect(result.data.relationships).to.be.an.object();
          expect(result.data.relationships.account).to.be.an.object();
          expect(result.data.relationships.account.data).to.be.an.object();
          expect(result.data.relationships.account.data.type).to.equal('account');
          expect(result.data.relationships.account.data.id).to.equal(2);

          done();
        });
      });

      it('should convert a string to serializer via the registry', function (done) {

        var accountSchema = { attributes: [ 'organization' ] };
        var accountSerializer = Serializer('account', accountSchema);

        Serializer.register('Account', accountSerializer);

        var schema = { 
          attributes: ['name', 'phone'],
          relationships: {
            account: {
              serializer: 'Account',
              relationshipType: Serializer.Relationships.belongsTo('accountId')
            }
          }
        };

        var serializer = Serializer('person', schema);

        var data = { id: 1, name: 'Joe', phone: '9008881234', accountId: 2 };
        var included = {
          account: {
            id: 2,
            organization: 'ABC Co.',
          }
        };

        serializer.serialize(data, included).then(function (result) {

          expect(result.data).to.be.an.object();
          expect(result.data.id).to.equal(1);
          expect(result.data.type).to.equal('person');
          expect(result.data.attributes).to.be.an.object();

          expect(result.data.relationships).to.be.an.object();
          expect(result.data.relationships.account).to.be.an.object();
          expect(result.data.relationships.account.data).to.be.an.object();
          expect(result.data.relationships.account.data.type).to.equal('account');
          expect(result.data.relationships.account.data.id).to.equal(2);

          done();
        });
      });

      it('should throw a ReferenceError when serializer is not registered', function (done) {

        var accountSchema = { attributes: [ 'organization' ] };
        var accountSerializer = Serializer('account', accountSchema);

        if (Serializer.has('Account')) Serializer.remove('Account');

        var schema = { 
          attributes: ['name', 'phone'],
          relationships: {
            account: {
              serializer: 'Account',
              relationshipType: Serializer.Relationships.belongsTo('accountId')
            }
          }
        };

        var serializer = Serializer('person', schema);

        var data = { id: 1, name: 'Joe', phone: '9008881234', accountId: 2 };
        var included = {
          account: {
            id: 2,
            organization: 'ABC Co.',
          }
        };

        var throws = function () 
        {
          serializer.serializeSync(data, included);
        }

        expect(throws).to.throw(ReferenceError, 'Account is not a registered serializer.');

        done();
      });
    });
  });

  describe('#included', function () {

    it('should include the included data', function (done) {

        var schema = { 
          attributes: ['name', 'phone'],
          relationships: {
            address: {
              serializer: {
                type: 'address',
                attributes: ['street', 'city', 'state', 'zipcode']
              },
              relationshipType: Serializer.Relationships.hasMany('personId')
            }
          }
        };

        var serializer = Serializer('person', schema);

        var data = { id: 1, name: 'Joe', phone: '9008881234' };
        var included = {
          address: [{
            id: 2,
            street: '123 Street Ave.',
            city: 'Lansing',
            personId: 1,
          },
          {
            id: 3,
            street: 'a Street',
            city: 'Detroit',
            personId: 1,
          },
          {
            id: 3,
            street: 'a Street',
            city: 'Detroit',
            personId: 1,
          },
          {
            id: 8,
            street: 'Not a street Ave.',
            city: 'Detroit',
            personId: 3,
          }]
        };

      serializer.serialize(data, included).then(function (results) {

        expect(results).to.be.an.object();
        expect(results.included).to.be.an.array();
        expect(results.included[0]).to.be.an.object();
        expect(results.included[0].type).to.equal('address');
        expect(results.included[0].id).to.be.a.number();

        var duplicateCheck = _.filter(results.included, { id: 3 });

        expect(duplicateCheck.length).to.equal(1);

        done();
      });
    });

    it('should include multiple relations within included data', function (done) {

        var schema = { 
          attributes: ['name', 'phone'],
          relationships: {
            address: {
              serializer: {
                type: 'address',
                attributes: ['street', 'city', 'state', 'zipcode']
              },
              relationshipType: Serializer.Relationships.hasMany('personId')
            },
            account: {
              serializer: {
                type: 'account',
                attributes: ['organization']
              },
              relationshipType: Serializer.Relationships.belongsTo('accountId')
            }
          }
        };

        var serializer = Serializer('person', schema);

        var data = { id: 1, name: 'Joe', phone: '9008881234', accountId: 10};
        var included = {
          address: [{
            id: 2,
            street: '123 Street Ave.',
            city: 'Lansing',
            personId: 1,
          },
          {
            id: 3,
            street: 'a Street',
            city: 'Detroit',
            personId: 1,
          },
          {
            id: 8,
            street: 'Not a street Ave.',
            city: 'Detroit',
            personId: 3,
         }],
          account: {
            id: 10,
            organization: 'Hello Co.'
          }
        };

      serializer.serialize(data, included).then(function (results) {

        expect(results).to.be.an.object();
        expect(results.included).to.be.an.array();
        expect(results.included[0]).to.be.an.object();
        expect(results.included[0].type).to.equal('address');
        expect(results.included[0].id).to.be.a.number();

        var account = _.filter(results.included, { type: 'account' }).pop();
        expect(account).to.be.an.object();
        expect(account.type).to.equal('account');
        expect(account.id).to.equal(10);

        done();
      });
    });
  });

  describe('#meta', function () {

    it('should include a meta attribute if provided', function (done) {

      var schema = { attributes: [] };
      var serializer = Serializer('test', schema);
      var data = { id: 1, };
      var meta = { total: 100 };

      serializer.serialize(data, null, meta).then(function (result) {

        expect(result.data).to.be.an.object();
        expect(result.data.id).to.equal(1);
        expect(result.data.type).to.equal('test');
        expect(result.data.attributes).to.be.undefined();
        expect(result.meta).to.be.an.object();
        expect(result.meta.total).to.equal(meta.total);

        done();
      });
    });

    it('should not include a meta attribute if its not a plain object', function (done) {

      // String meta

      var schema = { attributes: [] };
      var serializer = Serializer('test', schema);
      var data = { id: 1, };
      var meta = '';

      serializer.serialize(data, null, meta).then(function (result) {

        expect(result.data).to.be.an.object();
        expect(result.data.id).to.equal(1);
        expect(result.data.type).to.equal('test');
        expect(result.data.attributes).to.be.undefined();
        expect(result.meta).to.be.an.undefined();


      });

      // Function meta

      var schema = { attributes: [] };
      var serializer = Serializer('test', schema);
      var data = { id: 1, };
      var meta = function () {};

      var result = serializer.serializeSync(data, null, meta);

      expect(result.data).to.be.an.object();
      expect(result.data.id).to.equal(1);
      expect(result.data.type).to.equal('test');
      expect(result.data.attributes).to.be.undefined();
      expect(result.meta).to.be.an.undefined();

      done();
    });
  });
});

