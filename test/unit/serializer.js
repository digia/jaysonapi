import Serializer, { Registry } from '../../src';
import { BelongsTo, HasMany } from '../../src/relationships';
import {
  DataReferenceError,
  SerializerNotRegisteredError,
  TopLevelDocumentError,
} from '../../src/errors';


describe('Serializer', function () {
  it(`initializes`, function (done) {
    expect(Serializer('test', {})).to.exist();

    done();
  });

  it(`configures on initialization`, function (done) {
    const type = 'test';
    const schema = {
      attributes: ['name', 'email'],
    };
    const serializer = Serializer(type, schema);

    expect(serializer.type).to.equal(type);
    expect(serializer.ref).to.equal('id'); // Defaults to id
    expect(serializer.attributes).to.equal(schema.attributes);
    expect(serializer.relationships).to.undefined();
    expect(serializer.serialize).to.be.a.function();

    done();
  });

  it(`allows config to be passed at initialization`, function (done) {
    const config = {
      ref: 'uuid',
    };
    const serializer = Serializer('test', {}, config);

    expect(serializer.ref).to.equal('uuid');

    done();
  });

  describe('#serialize', function () {
    describe('data', function () {
      it(`serializes the top level object with null as data`, function (done) {
        const schema = {
          attributes: ['name', 'email'],
        };
        const serializer = Serializer('test', schema);
        const data = {};

        const jsonapi = serializer.serialize({ data });

        expect(jsonapi).to.be.an.object();
        expect(jsonapi.data).to.be.null();
        expect(jsonapi.errors).to.be.undefined();
        expect(jsonapi.includes).to.be.undefined();
        expect(jsonapi.meta).to.be.undefined();

        done();
      });

      it(`serializes the top level object with an empty array as data`, function (done) {
        const schema = {
          attributes: ['name', 'email'],
        };
        const serializer = Serializer('test', schema);
        const data = [];

        const jsonapi = serializer.serialize({ data });

        expect(jsonapi).to.be.an.object();
        expect(jsonapi.data).to.be.an.array();
        expect(jsonapi.data).to.be.length(0);
        expect(jsonapi.errors).to.be.undefined();
        expect(jsonapi.includes).to.be.undefined();
        expect(jsonapi.meta).to.be.undefined();

        done();
      });

      it(`throws DataReferenceError when data doesn't contain the reference`, function (done) {
        const schema = {
          attributes: ['name', 'email'],
        };
        const serializer = Serializer('test', schema);
        const data = {
          name: 'Alex',
          email: '123alex@aaaas.com',
          wontInclude: 'yoooo',
        };

        function throws() {
          serializer.serialize({ data });
        }

        expect(throws).to.throw(DataReferenceError);

        done();
      });
    });

    describe('data attributes', function () {
      it(`serializes the top level object`, function (done) {
        const schema = {
          attributes: ['name', 'email'],
        };
        const serializer = Serializer('test', schema);
        const data = {
          id: 1,
          name: 'Alex',
          email: '123alex@aaaas.com',
        };

        const jsonapi = serializer.serialize({ data });

        expect(jsonapi).to.be.an.object();

        const { id, type, attributes, relationships, links } = jsonapi.data;

        expect(id).to.be.equal(1);
        expect(type).to.be.equal('test');
        expect(attributes.name).to.be.equal(data.name);
        expect(attributes.email).to.be.equal(data.email);
        expect(relationships).to.be.undefined();
        expect(links).to.be.undefined();

        done();
      });

      it(`serializes the top level object - array`, function (done) {
        const schema = {
          attributes: ['name', 'email'],
        };
        const serializer = Serializer('test', schema);
        const data = [
          {
            id: 1,
            name: 'Alex',
            email: '123alex@aaaas.com',
          }
        ];

        const jsonapi = serializer.serialize({ data });

        expect(jsonapi).to.be.an.object();
        expect(jsonapi.data).to.be.an.array();

        const { id, type, attributes, relationships, links } = jsonapi.data[0];

        expect(id).to.be.equal(1);
        expect(type).to.be.equal('test');
        expect(attributes.name).to.be.equal(data[0].name);
        expect(attributes.email).to.be.equal(data[0].email);
        expect(relationships).to.be.undefined();
        expect(links).to.be.undefined();

        done();
      });

      it(`serializes the top level object only including the attributes defined in the schema`, function (done) {
        const schema = {
          attributes: ['name', 'email'],
        };
        const serializer = Serializer('test', schema);
        const data = {
          id: 1,
          name: 'Alex',
          email: '123alex@aaaas.com',
          wontInclude: 'yoooo',
        };

        const jsonapi = serializer.serialize({ data });

        const { attributes } = jsonapi.data;

        expect(attributes.wontInclude).to.be.undefined();

        done();
      });
    });

    describe('data links', function () {
      it(`generates the data links for resource objects`, function (done) {
        const schema = {
          attributes: ['name', 'email'],
          links: {
            self: (data) => `http://github.com/api/person/${data.id}`,
            related: (data) => `http://github.com/api/account/relationships/person`,
          }
        };
        const serializer = Serializer('test', schema);
        const data = {
          id: 1,
          name: 'Alex',
          email: '123alex@aaaas.com',
        };

        const jsonapi = serializer.serialize({ data });

        expect(jsonapi).to.be.an.object();

        const { id, type, attributes, links, relationships } = jsonapi.data;

        expect(id).to.be.equal(1);
        expect(type).to.be.equal('test');
        expect(attributes.name).to.be.equal(data.name);
        expect(attributes.email).to.be.equal(data.email);
        expect(links).to.be.an.object();
        expect(links.self).to.be.equal('http://github.com/api/person/1');
        expect(links.related).to.be.equal('http://github.com/api/account/relationships/person');
        expect(relationships).to.be.undefined();

        done();
      });
    });

    describe('included and data relationships', function () {
      it(`serializes the included and data relationships`, function (done) {
        const schema = {
          attributes: ['name', 'phone'],
          relationships: {
            address: {
              serializer: {
                type: 'address',
                attributes: ['street', 'city'],
              },
              relationshipType: HasMany('personId')
            }
          }
        };
        const serializer = Serializer('test', schema);
        const payload = { id: 1, name: 'Joe', phone: '9008881234' };
        const includedPayload = {
          address: {
            id: 2,
            street: '123 Street Ave.',
            city: 'Lansing',
            personId: 1,
          }
        };

        const jsonapi = serializer.serialize({ data: payload, included: includedPayload });

        const { data, included } = jsonapi;

        expect(included).to.be.an.array();
        expect(included).to.be.length(1);

        const address = included[0];

        expect(address.type).to.equal(schema.relationships.address.serializer.type);
        expect(address.id).to.equal(includedPayload.address.id);

        const { relationships } = data;

        expect(relationships).to.be.an.object();

        expect(relationships.address.data.type).to.equal(schema.relationships.address.serializer.type);
        expect(relationships.address.data.id).to.equal(includedPayload.address.id);

        done();
      });

      it(`serializes the included and data relationships using a string as the serializer reference`, function (done) {
        const addressSchema = {
          type: 'address',
          attributes: ['street', 'city'],
        };
        const addressSerializer = Serializer('address', addressSchema);
        const personSchema = {
          attributes: ['name', 'phone'],
          relationships: {
            address: {
              serializer: 'Address',
              relationshipType: HasMany('personId')
            }
          }
        };
        const personSerializer = Serializer('person', personSchema);

        // Register the serializers

        Registry.register('Address', addressSerializer);
        Registry.register('Person', personSerializer);

        // Test

        const payload = { id: 1, name: 'Joe', phone: '9008881234' };
        const includedPayload = {
          address: {
            id: 2,
            street: '123 Street Ave.',
            city: 'Lansing',
            personId: 1,
          }
        };

        const jsonapi = personSerializer.serialize({ data: payload, included: includedPayload });

        const { data, included } = jsonapi;

        expect(included).to.be.an.array();
        expect(included).to.be.length(1);

        const address = included[0];

        expect(address.type).to.equal('address');
        expect(address.id).to.equal(2);
        expect(address.attributes.street).to.equal('123 Street Ave.');
        expect(address.attributes.city).to.equal('Lansing');

        const { relationships } = data;

        expect(relationships).to.be.an.object();

        expect(relationships.address.data.type).to.equal('address');
        expect(relationships.address.data.id).to.equal(2);


        Registry.empty(); // Clean up for the error test later on

        done();
      });

      it(`serializes the included and data relationships using a nested serializer reference`, function (done) {
        const addressSchema = {
          type: 'address',
          attributes: ['street', 'city'],
        };
        const addressSerializer = Serializer('address', addressSchema);
        const personSchema = {
          attributes: ['name', 'phone'],
          relationships: {
            address: {
              serializer: addressSerializer,
              relationshipType: HasMany('personId')
            }
          }
        };
        const personSerializer = Serializer('person', personSchema);

        // Test

        const payload = { id: 1, name: 'Joe', phone: '9008881234' };
        const includedPayload = {
          address: {
            id: 2,
            street: '123 Street Ave.',
            city: 'Lansing',
            personId: 1,
          }
        };

        const jsonapi = personSerializer.serialize({ data: payload, included: includedPayload });

        const { data, included } = jsonapi;

        expect(included).to.be.an.array();
        expect(included).to.be.length(1);

        const address = included[0];

        expect(address.type).to.equal('address');
        expect(address.id).to.equal(2);
        expect(address.attributes.street).to.equal('123 Street Ave.');
        expect(address.attributes.city).to.equal('Lansing');

        const { relationships } = data;

        expect(relationships).to.be.an.object();

        expect(relationships.address.data.type).to.equal('address');
        expect(relationships.address.data.id).to.equal(2);

        done();
      });

      it(`serializes the included and data relationships with multiple unique included`, function (done) {
        const personSchema = {
          attributes: ['name', 'phone'],
          relationships: {
            address: {
              serializer: {
                type: 'address',
                attributes: ['street', 'city'],
              },
              relationshipType: HasMany('personId')
            },
            phone: {
              serializer: {
                type: 'phone',
                attributes: ['number'],
                config: {
                  ref: 'uuid',
                },
              },
              relationshipType: HasMany('personId')
            }
          }
        };
        const serializer = Serializer('person', personSchema);
        const payload = { id: 1, name: 'Joe' };
        const includedPayload = {
          phone: {
            uuid: 99,
            areaCode: '888',
            personId: 1,
          },
          address: [
            {
              id: 2,
              street: '123 Street Ave.',
              city: 'Lansing',
              personId: 1,
            },
            {
              id: 2,
              street: '123 Street Ave.',
              city: 'Lansing',
              personId: 1,
            },
            {
              id: 3,
              street: '2 Address',
              city: 'Detroit',
              personId: 1,
            }
          ],
        };

        const jsonapi = serializer.serialize({ data: payload, included: includedPayload });

        const { data, included } = jsonapi;

        expect(included).to.be.an.array();
        expect(included).to.be.length(3);

        const { relationships } = data;

        expect(relationships).to.be.an.object();

        expect(relationships.address.data).to.be.an.array();
        expect(relationships.address.data).to.be.length(2);
        expect(relationships.phone.data).to.be.an.object();
        expect(relationships.phone.data.uuid).to.be.equal(99);
        expect(relationships.phone.data.type).to.be.equal('phone');
        // TODO(digia): Testing undefined attributes need to be it's own test.
        expect(relationships.phone.data.attributes).to.be.undefined();

        done();
      });

      it(`throws SerializerNotRegisteredError when attempting to nest an unregistered serializer`, function (done) {
        const personSchema = {
          attributes: ['name', 'phone'],
          relationships: {
            address: {
              serializer: 'address',
              relationshipType: HasMany('personId')
            },
          }
        };
        const serializer = Serializer('person', personSchema);
        const payload = { id: 1, name: 'Joe' };
        const includedPayload = {
          address: {
            id: 2,
            street: '123 Street Ave.',
            city: 'Lansing',
            personId: 1,
          },
        };

        function throws() {
          serializer.serialize({ data: payload, included: includedPayload });
        }

        expect(throws).to.throw(SerializerNotRegisteredError);


        done();
      });

      it(`doesn't include the included top level member if there is no data`, function (done) {
        const schema = {
          attributes: ['name', 'phone'],
          relationships: {
            address: {
              serializer: {
                type: 'address',
                attributes: ['street', 'city'],
              },
              relationshipType: HasMany('personId')
            }
          }
        };
        const serializer = Serializer('test', schema);
        const payload = undefined;
        const includedPayload = {
          address: {
            id: 2,
            street: '123 Street Ave.',
            city: 'Lansing',
            personId: 1,
          }
        };
        const meta = { count: 100 };

        const jsonapi = serializer.serialize({ data: payload, included: includedPayload, meta });

        const { data, included } = jsonapi;

        expect(data).to.be.undefined();
        expect(included).to.be.undefined();
        expect(meta).to.be.an.object();
        expect(meta.count).to.equal(100);

        done();
      });

      it.only(`doesn't include the included top level member if data is an empty array`, function (done) {
        const schema = {
          attributes: ['name', 'phone'],
          relationships: {
            address: {
              serializer: {
                type: 'address',
                attributes: ['street', 'city'],
              },
              relationshipType: HasMany('personId')
            }
          }
        };
        const serializer = Serializer('test', schema);
        const payload = [];
        const includedPayload = {
          address: {
            id: 2,
            street: '123 Street Ave.',
            city: 'Lansing',
            personId: 1,
          }
        };

        const jsonapi = serializer.serialize({ data: payload, included: includedPayload });

        const { data, included } = jsonapi;

        expect(data).to.be.length(0);
        expect(included).to.be.undefined();

        done();
      });
    });

    describe('meta', function () {
      it(`serializes the top level object with only meta`, function (done) {
        const schema = {
          attributes: ['name', 'email'],
        };
        const serializer = Serializer('test', schema);
        const meta = {
          count: 100,
        };

        const jsonapi = serializer.serialize({ meta });

        expect(jsonapi).to.be.an.object();
        expect(jsonapi.data).to.be.undefined();
        expect(jsonapi.errors).to.be.undefined();
        expect(jsonapi.includes).to.be.undefined();
        expect(jsonapi.links).to.be.undefined();
        expect(jsonapi.meta).to.be.an.object();
        expect(jsonapi.meta.count).to.equal(100);

        done();
      });
    });

    describe('links', function () {
      it(`serialize the top level links with self`, function (done) {
        const schema = {
          attributes: ['name', 'email'],
        };
        const serializer = Serializer('test', schema);
        const meta = {
          count: 100,
        };
        const links = {
          self: 'http://github.com/digia/jaysonapi',
        };

        // Include meta for the sake of the standard
        // Top level must have one of the following: data, errors, meta
        const jsonapi = serializer.serialize({ meta, links });

        expect(jsonapi).to.be.an.object();
        expect(jsonapi.data).to.be.undefined();
        expect(jsonapi.errors).to.be.undefined();
        expect(jsonapi.includes).to.be.undefined();
        expect(jsonapi.meta).to.be.an.object();
        expect(jsonapi.links).to.be.an.object();
        expect(jsonapi.links.self).to.be.equal(links.self);

        done();
      });

      it(`throws TopLevelDocumentError if only links is included`, function (done) {
        const schema = {
          attributes: ['name', 'email'],
        };
        const serializer = Serializer('test', schema);
        const links = {
          self: 'http://github.com/digia/jaysonapi',
        };

        function throws() {
          serializer.serialize({ links });
        }

        expect(throws).to.throw(TopLevelDocumentError);

        done();
      });
    });
  });
});
