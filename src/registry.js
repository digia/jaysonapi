import {
  set as Set,
  get as Get,
  isNull as IsNull,
  clone as Clone,
  omit as Omit,
} from 'lodash';


// In memory shared registry.
let registry = {};

export default function SerializerRegister() {
  function register(name, serializer) {
    Set(registry, name.toLowerCase(), serializer);

    return this;
  }

  function all() {
    return Clone(registry);
  }

  function get(name) {
    return Get(registry, name.toLowerCase(), null);
  }

  function has(name) {
    return !IsNull(get(name.toLowerCase()));
  }

  function remove(name) {
    registry = Omit(registry, name.toLowerCase());

    return this;
  }

  function empty() {
    registry = {};

    return this;
  }

  return { register, all, get, has, remove, empty };
}
