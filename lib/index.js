'use strict';

var _ = require('lodash');
var Relationships = require('./relationships');
var Promise = require('bluebird');


var internals = {};

internals.defaultConfig = {
  ref: 'id',
};

internals.serializerRegistery = {};

module.exports = internals.Serializer = function (type, schema, configuration) 
{
  var serializer = {};
  var config = configuration || internals.defaultConfig;

  serializer.type = type;
  serializer.ref = config.ref;
  serializer.attributes = schema.attributes;
  serializer.relationships = schema.relationships;

  serializer.serialize = function (data, included, meta)
  {
    var self = this;

    return new Promise(function (resolve) { 

      resolve(self.serializeSync(data, included, meta)) 
    });
  }

  serializer.serializeSync = function (data, included, meta) 
  {
    var root = {};
    var self = this;

    // Meta

    if (meta && _.isPlainObject(meta)) root.meta = meta;

    // Data
    
    root.data = (_.isArray(data)) 
      ? data.map(function (d) { return internals.serializeData(self, d, included); })
      : internals.serializeData(this, data, included);

    // Included
    
    if ( !_.isUndefined(included) && !_.isUndefined(this.relationships)) {
      root.included = internals.serializeIncluded(this.relationships, included);
    }

    return root;
  }

  return serializer;
}

internals.serializeData = function (schema, data, included)
{
  var serialized = {};
  var attributes = {};
  var relationships = internals.serializeDataRelationships(schema, data, included);

  serialized.type = schema.type
  
  if (_.isUndefined(data[schema.ref])) {
    var message = schema.ref+' is not defined within data';
    throw new ReferenceError(message);
  } 
  else {
    serialized[schema.ref] = data[schema.ref];
  }

  for (var i = 0, li = schema.attributes.length; i < li; i++) {
    var key = schema.attributes[i];

    if ( !_.isUndefined(data[key])) {
      attributes[key] = data[key];
    }
  }

  if ( !_.isEmpty(attributes)) serialized.attributes = attributes;

  if ( !_.isEmpty(relationships)) serialized.relationships = relationships;

  return serialized; 
}

internals.serializeDataRelationships = function (schema, data, included)
{
  if (_.isEmpty(included)) return;

  if (_.isUndefined(schema.relationships)) return;

  if (_.isEmpty(schema.relationships)) return;

  var relationships = {};
  var relationNameList = Object.keys(schema.relationships);

  for (var i = 0, li = relationNameList.length; i < li; i++) {
    var relationName = relationNameList[i];

    if ( ! relationName in included) continue;

    var relation = schema.relationships[relationName];
    var serializerAsSchema = internals.parseSerializer(relation.serializer);
    var parser = relation.relationshipType;

    relationships[relationName] = parser(serializerAsSchema, data, included[relationName]);
  }

  return relationships;
}

internals.parseSerializer = function (serializer)
{
  if (_.isFunction(serializer)) return serializer;

  if (_.isString(serializer)) {
    var serializerName = serializer;
    var serializer = this.serializerRegistery[serializerName.toLowerCase()];

    if (_.isUndefined(serializer)) {
      var message = serializerName+' is not a registered serializer.';
      throw new ReferenceError(message);
    }

    return serializer;
  }

  return this.Serializer(serializer.type, serializer);
}

/**
 * Serialize Included
 *
 * TODO: Spec calls for including included data, even if its not directly related
 * to the data - they can be related to each other. Currently i don't see a simple
 * way to include non-related data - there isn't a way to specify the serializers for them.
 *
 * @param relationship {object}
 * @param included {object}
 *
 * @return array
 * 
 */
internals.serializeIncluded = function (relationships, data) 
{
  var included = [];
  var relationList = Object.keys(data);

  for (var i = 0, li = relationList.length; i < li; i++) {
    var relationName = relationList[i];

    if (_.isUndefined(relationships[relationName])) continue;

    var serializer = internals.parseSerializer(relationships[relationName].serializer);
    var serialized = serializer.serializeSync(data[relationName]).data;

    if (_.isArray(serialized)) included = included.concat(serialized);

    if (_.isPlainObject(serialized)) included.push(serialized);
  }

  return internals.removeIncludedDuplicates(included);
}

internals.removeIncludedDuplicates = function (data)
{
  return _.reduce(data, function (included, include) {
    
    if (0 === _.filter(included, include).length) included.push(include);

    return included;
  }, []);
}


// Registry

internals.Serializer.register = function (name, serializer)
{
  internals.serializerRegistery[name.toLowerCase()] = serializer;

  return;
}

internals.Serializer.get = function (name)
{
  return internals.serializerRegistery[name.toLowerCase()];
}

internals.Serializer.has = function (name)
{
  return !_.isUndefined(internals.serializerRegistery[name.toLowerCase()]);
}

internals.Serializer.remove = function (name)
{
  return delete internals.serializerRegistery[name.toLowerCase()];
}


// Relationships 

internals.Serializer.Relationships = {};
internals.Serializer.Relationships.hasMany = Relationships.HasMany;
internals.Serializer.Relationships.belongsTo = Relationships.BelongsTo;

