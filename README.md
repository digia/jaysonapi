# jaysonapi

[![Build Status](https://secure.travis-ci.org/digia/jaysonapi.svg?branch=master)](http://travis-ci.org/digia/jaysonapi)

jaysonapi is a framework agnostic [JSON API](http://jsonapi.org/) v1.0.0 serializer.
jaysonapi provides more of a functional approach to serializing your data.
Define a serializer with a type and schema, and call serialize on it passing in
the data, included, meta, errors, etc. as a plain object.

## Installation
`$ npm install jaysonapi`

## Documentation

#### Overview
`Serializer(type, schema, configuration)`
- type: The resource type. Refering to data.type.
- schema: An object holding the information on how to serialize the data.
  - attributes: An array of attributes to keep from the data.
  - relationships: An object of defining relationships for the resource object.
    - serializer: Object|String used to serialize this relationship. Can be an
                object containing type and attributes, a string refering to the
                serializers name within the registry, or a serializer.
    - relationshipType: Function defining how the relationships are related.
                      HasMany and BelongTo relationships are built into the
                      library.
  - links: An object containg a self and related function.
- configuration
  - ref: The attributes to use as the reference. Defaults to 'id'.

## Usage
- [Basic Usage](#basic-usage)
- [Compound Document Usage](#compound-document-usage)

#### Example 1: Basic Usage

```javascript
// user-serializer.js
import Serializer from 'jaysonapi';

export default const UserSerializer = Serializer('user', {
  attributes: ['name', 'email'],
  links: {
    self: data => 'http://example.com/api/user/${data.id}',
  }
});
```

```javascript
// user-handler.js
import UserSerializer from './user-serializer';

// Assuming your using some MVC style library/framework and you're within a
// handler function.
handler(request, response) {
  // ... fetch user from db ...

  const userData = user.toJSON(); // Returns a object with user's attributes

  // user.toJSON() output example:
  // {
  //   id: 1,
  //   name: 'John Doe',
  //   email: 'jdoe@example.com',
  // }

  const jsonapi = UserSerializer.serialize({ data: userData });

  response(jsonapi); // Response will JSON.stringify on most frameworks.
}
```

```javascript
// Serializer will generate
{
  data: {
    id: 1,
    type: "user",
    attributes: {
      name: "John Doe",
      email: "jdoe@example.com"
    },
    links: {
      self: 'http://example.com/api/user/1',
    }
  }
}
```

<a name="compound-document-usage" />
#### Example 2: Compound Document Usage
```javascript
// account-serializer.js
import Serializer, {
  Registry,
  Relationships,
} from 'jaysonapi';


export default const AccountSerializer = Serializer('account', {
  attributes: ['organization', 'phone'],
  relationships: {
    user: {
      serializer: 'User',
      relationshipType: Relationships.hasMany('accountId'),
    },
  },
});

Registry.register('Account', AccountSerializer);
```

```javascript
// user-serializer.js
import Serializer, {
  Registry,
  Relationships,
} from 'jaysonapi';


export default const UserSerializer = Serializer('user', {
  attributes: ['name', 'email'],
  relationships: {
    account: {
      serializer: 'Account',
      relationshipType: Relationships.belongsTo('accountId'),
    },
  },
});

Registry.register('User', UserSerializer);
```

```javascript
// user-handler.js
import UserSerializer from './user-serializer';


// Assuming your using some MVC style library/framework and you're within a
// handler function.
handler(request, response) {
  // ... fetch user from db ...

  const userData = user.toJSON(); // Returns a object with user's attributes
  const accountData = user.related('account').toJSON();
  const toSerialize = {
    data: userData,
    included: {
      account: accountData,
    },
  };
  const jsonapi = UserSerializer.serialize(toSerialize);

  response(jsonapi); // Response will JSON.stringify on most frameworks.
}
```

```javascript
// Serializer will generate
{
  data: {
    id: 1,
    type: "user",
    attributes: {
      name: "John Doe",
      email: "jdoe@example.com"
    },
    relationships: {
      account: {
        id: 99,
        type: 'account',
      },
    },
  },
  included: [
    {
      id: 99,
      type: 'account',
      attributes: {
        organization: 'ABC Company Co.',
        phone: '8001231234',
      }
    },
  ]
}
```

## TODO
As of v2.0.0 jaysonapi implements the majority&mdash;if not all&mdash;of the
"must" in JSON API v1.0. There are a few feature which are not yet support
&mdash;they're in the works. Additionally some configuration options are being
worked on. Refer to the list below, contributions are more than welcomed!

- Add more documentation to this README
- Including resources not related to the data resource.
- Inflection
- ...finish this todo list

#### License
jaysonapi source code is under [MIT License](https://github.com/digia/jaysonapi/blob/master/LICENSE).
