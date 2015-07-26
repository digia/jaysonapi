'use strict';

var _ = require('lodash');


var internals = {};

exports.BelongsTo = internals.BelongsTo = function (referenceAttribute)
{
  return function (schema, referencee, relationshipData)
  {
    if ( !_.isArray(relationshipData)) relationshipData = [relationshipData];

    var referenceValue = referencee[referenceAttribute];

    for (var i = 0, li = relationshipData.length; i < li; i++) {
      var potentialRelationship = relationshipData[i];

      if (referenceValue == potentialRelationship[schema.ref]) {
        var parsed = {};
        parsed.type = schema.type;
        parsed[schema.ref] = potentialRelationship[schema.ref];

        return { data: parsed };
      }
    }

    return null;
  }
}

exports.HasMany = internals.HasMany = function (referenceAttribute)
{
  return function (schema, refrencee, relationshipData)
  {
    var parsed = [];
    var referenceValue = refrencee[schema.ref];

    if ( !_.isArray(relationshipData)) relationshipData = [relationshipData];

    for (var i = 0, li = relationshipData.length; i < li; i++) {
      var potentialRelationship = relationshipData[i];

      if (referenceValue == potentialRelationship[referenceAttribute]) {
        var match = {};
        match.type = schema.type;
        match[schema.ref] = relationshipData[i][schema.ref];

        parsed.push(match);
      }
    }

    if (_.isEmpty(parsed)) return null;

    if (1 === parsed.length) return { data: parsed.pop() };

    return { data: parsed };
  }
}

