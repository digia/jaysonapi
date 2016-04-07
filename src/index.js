import {
  reduce as Reduce,
  defaults as Defaults,
  isArray as IsArray,
  isEmpty as IsEmpty,
  isUndefined as IsUndefined,
  isFunction as IsFunction,
  isString as IsString,
  isNull as IsNull,
  chain as Chain,
  pick as Pick,
  omitBy as OmitBy,
  omit as Omit,
  set as Set,
  get as Get,
} from 'lodash';
import {
  DataReferenceError,
  SerializerNotRegisteredError,
  TopLevelDocumentError,
} from './errors';
import { HasMany, BelongsTo } from './relationships';
import DefaultRegistry from './registry';


const defaultConfig = {
  ref: 'id',
  registry: DefaultRegistry(),
};

export default function Serializer(
  type,
  serializerSchema,
  configuration = {}
) {
  const config = Defaults(configuration, defaultConfig);
  const { ref, registry } = config;
  const { attributes, relationships, links } = serializerSchema;

  /**
   * Parse Serializer
   *
   * @param serializer {function,object,string}
   *
   * @return object
   */
  function parseSerializer(serializer) {
    // Support embeded serializers
    if (IsFunction(serializer)) {
      return serializer;
    }

    // Support serializer registry
    if (IsString(serializer)) {
      const name = serializer;
      const registeredSerializer = registry.get(name.toLowerCase());

      if (!registeredSerializer) {
        const msg = `${name} is not a registered serializer.`;
        throw new SerializerNotRegisteredError(msg);
      }

      return registeredSerializer;
    }

    // Support dynamic serializer creation
    return Serializer(serializer.type, serializer, serializer.config || {});
  }

  /**
   * Process Data Relationships
   *
   * @param data {object}
   * @param included {object} { address: [] | {}, phone: [] | {} }
   *
   * @return object|array
   */
  function processDataRelationships(data, included) {
    if (IsEmpty(relationships) || IsEmpty(data) || IsEmpty(included)) {
      return undefined;
    }

    const toInclude = Pick(included, Object.keys(relationships));

    if (IsEmpty(toInclude)) {
      return undefined;
    }

    const relationships = Reduce(toInclude, (accum, relationData, relationName) => {
      const relation = Get(relationships, relationName);
      const relationSerializer = parseSerializer(relation.serializer);
      const relationParser = relation.relationshipType;
      const parserData = (relationParser.type === 'HasMany')
      ? Get(data, ref)
      : data;

      const parsedRelation = relationParser(relationSerializer, parserData, relationData);

      if (IsNull(parsedRelation) ||
          IsArray(parsedRelation.data) && IsEmpty(parsedRelation.data)) {
        return accum;
      }

      return Set(accum, relationName, parsedRelation);
    }, {});

    return IsEmpty(relationships)
    ? undefined
    : relationships;
  }

  function processDataLinks(data) {
    const toProcess = Pick(links, ['self', 'related']);

    if (IsEmpty(toProcess)) {
      return undefined;
    }

    return Reduce(toProcess, (accum, fn, key) => {
      accum[key] = fn(data);

      return accum;
    }, {});
  }

  /**
   * Process Data
   *
   * @param data {object}
   * @param included {object} { address: [] | {}, phone: [] | {} }
   *
   * @return object|array
   */
  function processData(data, included) {
    if (IsEmpty(data)) {
      if (IsUndefined(data)) {
        return data;
      }

      return IsArray(data)
      ? data
      : null;
    }

    if (IsArray(data)) {
      return data.map(d => processData(d, included));
    }

    const refValue = Get(data, ref);

    if (!refValue) {
      const msg = `${ref} property must be defined within data`;
      throw new DataReferenceError(msg);
    }

    const serializedAttributes = Pick(data, attributes);
    const serializedRelationships = processDataRelationships(data, included);
    const serializedLinks = processDataLinks(data);

    const resourceObject = {
      type,
      [ref]: refValue,
      attributes: IsEmpty(serializedAttributes) ? undefined : serializedAttributes,
      relationships: serializedRelationships,
      links: serializedLinks,
    };

    return OmitBy(resourceObject, IsUndefined);
  }

  /**
   * Process Included
   *
   * TODO: Spec calls for including included data, even if its not directly related
   * to the data - they can be related to each other. Currently i don't see a simple
   * way to include non-related data - there isn't a way to specify the serializers for them.
   *
   * @param relationship {object} { address: { serializer: {}, relationship: {} } }
   * @param included {object} { address: [] | {}, phone: [] | {} }
   *
   * @return array
   */
  function processIncluded(included) {
    if (IsEmpty(relationships) || IsEmpty(included)) {
      return undefined;
    }

    const relationshipNameList = Object.keys(relationships);
    const toInclude = Pick(included, relationshipNameList);

    if (IsEmpty(toInclude)) {
      return undefined;
    }

    return Chain(Object.keys(toInclude))
    .map((relationName) => {
      const relationSchema = Get(relationships, relationName);
      const relationData = Get(toInclude, relationName);
      const relationSerializer = parseSerializer(relationSchema.serializer);

      return relationSerializer.serialize({ data: relationData }).data;
    })
    .flatten()
    .uniqWith((c, cTo) => {
      // TODO(digia): Is this harming performance enough to refactor?
      // We do this to dynamically detect the reference property.
      // Top level of an include - at this time - should only be
      // id, "ref", and attributes. Ref can be configured.
      const kL = Object.keys(Omit(c, 'attributes'));

      return Get(c, kL[0]) === Get(cTo, kL[0]) && Get(c, kL[1]) === Get(cTo, kL[1]);
    })
    .value();
  }

  function processTopLevelLinks(links) {
    // self: the link that generated the current response document.
    // related: a related resource link when the primary data represents a resource relationship.
    // pagination: pagination links for the primary data.
    const topLevelLinks = Pick(links, ['self', 'related', 'pagination']);

    if (IsEmpty(topLevelLinks)) {
      return undefined;
    }

    return topLevelLinks;
  }

  function serialize({ data, included, meta, links, errors } = {}) { // eslint-disable-line
    const serialized = {
      data: processData(data, included),
      included: processIncluded(included),
      meta,
      links: processTopLevelLinks(links),
      errors,
    };

    if (IsUndefined(serialized.data) &&
        IsEmpty(serialized.errors) &&
        IsEmpty(serialized.meta)) {
      const msg = `One of the following must be included data, errors, meta`;
      throw new TopLevelDocumentError(msg);
    }

    // "If a document does not contain a top-level data key - or data is empty,
    // the included member MUST NOT be present either."
    if (IsUndefined(serialized.data) || IsEmpty(serialized.data) && !IsUndefined(serialized.included)) {
      return Chain(serialized)
      .omit('included')
      .omitBy(IsUndefined)
      .value();
    }

    return OmitBy(serialized, IsUndefined);
  }

  return { type, ref, attributes, relationships, serialize };
}

export const Relationships = {
  hasMany: HasMany,
  belongsTo: BelongsTo,
};

export const Registry = DefaultRegistry();
