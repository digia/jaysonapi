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
  const { attributes, relationships } = serializerSchema;

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

  function processDataRelationships(data, included) {
    if (IsEmpty(relationships) || IsEmpty(data) || IsEmpty(included)) {
      return void 0;
    }

    const toInclude = Pick(included, Object.keys(relationships));

    if (IsEmpty(toInclude)) {
      return void 0;
    }

    return Reduce(toInclude, (accum, relationData, relationName) => {
      const relation = Get(relationships, relationName);
      const relationSerializer = parseSerializer(relation.serializer);
      const relationParser = relation.relationshipType;
      const parserData = (relationParser.type === 'HasMany')
      ? Get(data, ref)
      : data;

      const parsedRelation = relationParser(relationSerializer, parserData, relationData);

      if (IsNull(parsedRelation)) {
        return accum;
      }

      return Set(accum, relationName, parsedRelation);
    }, {});
  }

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

    const resourceObject = {
      type,
      [ref]: refValue,
      attributes: IsEmpty(serializedAttributes) ? void 0 : serializedAttributes,
      relationships: serializedRelationships,
    };

    return Chain(resourceObject)
    .omitBy(IsUndefined)
    .value();
  }

  /**
   * Serialize Included
   *
   * TODO: Spec calls for including included data, even if its not directly related
   * to the data - they can be related to each other. Currently i don't see a simple
   * way to include non-related data - there isn't a way to specify the serializers for them.
   *
   * @param relationship {object} { address: { serializer: {}, relationship: {} } }
   * @param included {object} { address: [] | {}, phone: [] | {} }
   *
   * @return array
   *
   */
  function processIncluded(included) {
    if (IsEmpty(relationships) || IsEmpty(included)) {
      return void 0;
    }

    const relationshipNameList = Object.keys(relationships);
    const toInclude = Pick(included, relationshipNameList);

    if (IsEmpty(toInclude)) {
      return void 0;
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
      const kL = Object.keys(Omit(c, 'attributes'));

      return Get(c, kL[0]) === Get(cTo, kL[0]) && Get(c, kL[1]) === Get(cTo, kL[1]);
    })
    .value();
  }

  function serialize({ data, included, meta, errors } = {}) { // eslint-disable-line
    const serialized = {
      data: processData(data, included),
      included: processIncluded(included),
      meta,
      errors,
    };

    return OmitBy(serialized, IsUndefined);
  }

  return { type, ref, attributes, relationships, serialize };
}

export const Relationships = {
  hasMany: HasMany,
  belongsTo: BelongsTo,
};

export const Registry = DefaultRegistry();
