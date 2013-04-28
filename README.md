KSON: Keystripped Schemafied Object Notation
============================================

KSON is a simple data interchange format based on JSON. Its serialized
representation doesn't contain the redundant keys of typical json 
documents and more compact representations of values are possible through
an extensible encoding/decoding mechanism.

KSON uses a simple schema format to describe arbitrarrily nested objects
and encoded types. The minified and gzipped javascript library is < 1K.


Usage in javascript
-------------------

    // Load schema definitions

    var movie_schemas = [
      {
        "id": "role",
        "fields": ["name", "character"],
        "meta": [0, 0]
      },{
        "id": "movie",
        "fields": ["title", "year", "rating", "cover", "actors"],
        "meta": [0, 0, 0, "prefix:http\://movies.db/covers/|suffix.jpg", "[]role"]
      }
    ];
    KSON.addSchema(movie_schemas);

    var movies = [
      {
       "title": "Forrest Gump",
       "year": 1994,
       "rating": 8.7,
       "cover": "http://movies.db/covers/8.jpg",
       "actors": [
        {"name": "Tom Hanks", "character": "Forest Gump"},
        {"name": "Robin Wright", "character": "Jenny Curran"},
        {"name": "Gary Sinise", "character": "Lieutenant Dan Taylor"}
       ]
      },
      {
        "title": "Toy Story",
        ...
      }
      ...
    ];

    // pretty printing is not part of the library
    console.log(KSON.stringify(movies, "[]movie"));
    [
      "[]movie",
      "Forest Gump",
      1994,
      8.7,
      "8",
      [
        ["Tom Hanks", "Forest Gump"],
        ["Robin Wright", "Jenny Curran"],
        ["Gary Sinise", "Lieutenant Dan Taylor"]
      ],
      "Toy Story",
      ...
    ]

    // Of course the "movie" and "role" schema definitions may also be
    // serialized to KSON using the "schema" schema:

    var schema_data = KSON.stringify(movie_schemas, "[]schema")
    console.log(schema_data);

    ["[]schema","role",["name","character"],[0, 0],"movie",
      ["title","year","rating","cover","actors"],
      [0,0,0,"prefix:http\://movies.db/covers/|suffix:.jpg","[]role"]]

    // Likewise schemas can be initialized with a kson document
    KSON.addSchema(schema_data);

FAQ
---

Q: Why should I use this instead of JSON/MessagePack/Thrift/...?
A: Unless you are targeting the browser you probably shouldn't. If you
   are, then the size and speed of the javascript libraries for these
   formats may make KSON a favorable option.

Q: Is KSON faster/smaller/better than JSON?
A: Tests using node.js indicate that parsing is marginally slower. This
   should be outweighed by faster transmission speed of signifigantly less
   data. See the node.js benchmarks for more info.

Q: Is this a drop in replacement for JSON?
A: No, you will need to write schema definitions for your data. Automatic
   schema detection based on example data may help in getting started. Also
   see "restrictions" in the Specification.

Q: Why yet another a schema format for JSON?
A: Existing JSON schema formats include extrenious information to the
   purpose of KSON and would require larger javascript library for
   parsing and serialization.

Q: Is there language support for php/ruby/java/c...?
A: Currently javascript and python are supported. Porting to other
   languages with existing JSON support should be fairly easy and patches
   are very welcome.


Schema Specification
--------------------

A KSON schema consists of three fields:
    id              *string* identifier
    fields          *array* of field names
    meta            *array* signifying the types associated with
                    corresponding elements in the *fields* array.

A schema only defines one object. Nesting is accomplished by referencing
subschemas via their id in the meta array.

An element of *meta* specifies the content of the element of *fields* at
the same index. The lengths of the *fields* and *meta* arrays must be equal.
An element of *meta* must be one of the following:
    0                field contains a plain value of type
                     *string*, *boolean*, *number*, *null*.
    "[]"             *array* of plain values
    "schema-id"      *string* reference the schema of a nested object
    "[]schema-id"    
    "codec-id"
    "[]codec-id"


The top level elements of a KSON document must be either an *array* of
objects or an *object*. A plain value or an *array* of plain values
cannot be serialized.


Codecs
------

Decoders are executed in the order of their definition in the meta field.
The decoder is passed the value to decode as the first argument and the
intermediate data object as the second. The intermediate object will have
the values of all previous fields decoded and applied.


Included codecs:

  enum:a:b:c:d   "a" -> 0, "b" -> 1, ...
  prefix:egg     "eggbacon" -> "bacon"
  suffix:bacon   "eggsausagebacon" -> "eggsausage"
  bool           true -> 1, false -> 0
  date           new Date() -> 1364938727390
  int36          1364938727390 -> "hf1lcnka"


Codec chaining

  prefix:egg|suffix:bacon    "eggsausagebacon" -> "sausage"
  date|int36    new Date() -> "hf1lcnka"


Custom codecs are registered using factory functions in the following manner.

    KSON.coders["my_coder_id"] = function(args) {
        // args is a string array from a schemas meta field
        // enum:a:b:c:d -> args == ["a", "b", "c", "d"]

        return function (val, encode) {
            // The actual encoding/decoding function
            return encode ? encode_op(val) : decode_op(val);
        }
    }

Schema Validation
-----------------

The python library validates schemas and codec definitions, the javascript
library does not. Invalid schema definition loaded with the javascript
library may parse or stringify bad data without any throwing any errors.

Common errors include:
    - Loading a schema before the custom codecs it uses have been registered.
    - Loading a schema before the subschemas on which it depends have been
      loaded. Note that schemas are loaded in the order they appear in a file,
      so dependent schmas schould come after those they depend uppon.
    - Circularly dependent schmas (including schemas which depend on 
      themselves) are possible by using a stub schema, which only specifies
      an id and no fields. This can be replaced by the propper schema with
      the same id, after its dependencies have been loaded.
    - Loading a json encoded schema. The argument of the KSON.addSchema
      function may be either a KSON encoded schema or schemas, an already
      decoded schema or an array of schemas. It is however fairly simple to
      load json encoded schemas: KSON.addSchema(JSON.parse(raw_json_schemas));

The python library will warn about these and other issues, so use it to


Installation
------------

    $ pip install kson

Automatic schema detection:
  
    $ kson --auto-detect data.json --id schema_id


Development
-----------

    $ git clone git@bitbucket.org:mbarkhau/kson.git
    $ npm install uglify-js -g
    $ npm install benchmark microtime

    $ pip install py.test

    $ make test
    $ make bench
    $ make minify


