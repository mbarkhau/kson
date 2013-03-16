#!/usr/bin/env python
"""KSON: Keystripped Schemafied Object Notation v0.1

KSON is a simple data interchange format based on JSON. It has a more
compact serialized representation and requires only a minimal javscript
library to parse and serialize. KSON removes keys from its serailized
representation and defines an extensible codec mechanism to further
reduce the size of serialized data. KSON uses a simple schema format
to describe arbitrarrily nested objects.

Usage:
    kson -i <json-input> -s <schema-file> [-o <kson-output>] [-v]
    kson --auto-schema <schema-name> -i <example-json-input>
         [-o <schema-output>] [-vj]

Options:
    --version               Show version
    -v --verbose            Show schema data and compression info
    -i --input=<input>      Input file
    -s --schema=<schema>    Schema file in KSON or JSON format
    -o --output=<output>    Output file (defaults to)
    -j --json               Write schema-output as JSON instead of KSON
"""
import os
import sys
from base64 import b64encode

try:
    import ujson as json

    def json_dumps(*args, **kwargs):
        kwargs['encode_html_chars'] = False
        return json.dumps(*args, **kwargs)
except ImportError:
    import json
    json_dumps = json.dumps

json_loads = json.loads


DECODERS = {}
ENCODERS = {}
SCHEMAS = {}

_verbose = False


def add_schema(schema):
    if isinstance(schema, basestring):
        schema = loads(schema)

    if _verbose:
        print "Adding new schema: ", schema['id']
        print "\t", schema['fields']
        print "\t", schema['meta']

    if 'id' not in schema:
        raise ValueError("Invalid Schema: Missing field 'id'")
    if 'fields' not in schema:
        raise ValueError("Invalid Schema: Missing field 'fields'")
    if 'meta' not in schema:
        raise ValueError("Invalid Schema: Missing field 'meta'")

    assert len(schema['fields']) == len(schema['meta'])

    SCHEMAS[schema['id']] = schema


def add_codec(name, decoder, encoder):
    DECODERS[name] = decoder
    ENCODERS[name] = encoder


def encoder(name):
    """decorator to register a kson encoder function"""
    def _dec(fn):
        ENCODERS[name] = fn
        return fn
    return _dec


def decoder(name):
    """decorator to register a kson decoder function"""
    def _dec(fn):
        DECODERS[name] = fn
        return fn
    return _dec


def dump(data, fp, *args, **kwargs):
    return fp.write(dumps(data, *args, **kwargs))


def load(fp, *args, **kwargs):
    return loads(fp.read(), *args, **kwargs)


def dumps(data, schema_id, is_sublist=False):
    is_array = schema_id[0] is "["
    schema_id = schema_id[2:] if is_array else schema_id
    schema = SCHEMAS[schema_id]
    fields = schema['fields']
    meta = schema['meta']
    result = []

    if not is_sublist:
        result.append("[]" + schema_id if is_array else schema_id)

    if not is_array:
        data = [data]

    for obj in data:
        for field, meta_id in zip(fields, meta):
            val = obj.get(field, None)
            if val is not None:
                meta_is_subarray = meta_id and meta_id[0] == "["
                _meta_id = meta_id[2:] if meta_is_subarray else meta_id
                if _meta_id in SCHEMAS:
                    val = dumps(val, meta_id, True)
                elif _meta_id in ENCODERS:
                    encoder = ENCODERS[_meta_id]
                    if meta_is_subarray:
                        for i in xrange(len(val)):
                            val[i] = encoder(val[i], obj)
                    else:
                        val = encoder(val, obj)
            result.append(val)

    if is_sublist:
        return result
    return json_dumps(result)


def loads(data, schema_id=None):
    data = json_loads(data) if isinstance(data, basestring) else data
    if not isinstance(data, list) or len(data) == 0:
        return data
    if not isinstance(data[0], basestring):
        return data

    data_start = 0
    if not schema_id:
        schema_id = data[0]
        data_start = 1

    is_array = schema_id[0] == "["
    if is_array:
        schema_id = schema_id[2:]
        result = []

    schema = SCHEMAS[schema_id]
    fields = schema['fields']
    len_fields = len(fields)
    meta = schema['meta']
    obj = None

    for i, val in enumerate(data[data_start:]):
        j = i % len_fields
        if j == 0:
            if obj and is_array:
                result.append(obj)
            obj = {}

        meta_id = meta[j]

        if val is not None:
            meta_is_subarray = meta_id and meta_id[0] == "["
            _meta_id = meta_id[2:] if meta_is_subarray else meta_id
            if _meta_id in SCHEMAS:
                val = loads(val, meta_id)
            elif _meta_id in DECODERS:
                decoder = DECODERS[_meta_id]
                if meta_is_subarray:
                    for k in xrange(len(val)):
                        val[i] = decoder(val[i], obj)
                else:
                    val = decoder(val, obj)

        obj[fields[j]] = val

    if not is_array:
        return obj

    if obj:
        result.append(obj)
    return result


add_schema({
    'id': 'schema',
    'fields': ['id', 'fields', 'meta'],
    'meta': [0, "[]", "[]"]
})


# TODO: codecs
#   iso date
#   prefix/suffix
#   enum (fallback to value)
#   	bool should turn out to be enum(false, true)
def detect_codecs(data, schema_id):
    return 0


def compact_schemas(base_schema_id):
    def replace_schema(old_sid, new_sid):
        for schema in SCHEMAS.values():
            meta = schema['meta']
            for i, meta_id in enumerate(meta):
                if meta_id == old_sid:
                    meta[i] = new_sid
        del SCHEMAS[old_sid]

    done = False
    while not done:
        done = True
        for a_sid, a_schema in SCHEMAS.items():
            if not a_sid.startswith(base_schema_id):
                continue

            a_fields = a_schema['fields']
            a_meta = a_schema['meta']
            for b_sid, b_schema in SCHEMAS.items():
                if not b_sid.startswith(base_schema_id):
                    continue
                if a_sid == b_sid:
                    continue

                b_fields = b_schema['fields']
                b_meta = b_schema['meta']

                if a_fields == b_fields and a_meta == b_meta:
                    replace_schema(b_sid, a_sid)
                    done = False
                    break
            if not done:
                break


def detect_meta(obj, id_prefix, lvl):
    idx = 0
    meta_map = {}
    for field, value in obj.items():
        if isinstance(value, dict) or isinstance(value, list):
            meta_map[field] = detect_schemas(value, id_prefix, lvl + 1, idx)
            idx += 1
    return meta_map


def detect_schemas(data, id_prefix=None, lvl=0, idx=0):
    if id_prefix is None:
        id_prefix = "auto-schema-" + b64encode(os.urandom(6))
    schema_id = id_prefix + "-" + str(lvl) + "-" + str(idx)
    fields = set()
    meta_map = {}
    if isinstance(data, dict):
        fields.update(data.keys())
        meta_map.update(detect_meta(data, id_prefix, lvl))
    elif isinstance(data, list):
        for obj in data:
            if isinstance(obj, dict):
                fields.update(obj.keys())
                meta_map.update(detect_meta(obj, id_prefix, lvl))
    else:
        raise ValueError("Top level must be a dict or list")

    if len(fields) == 0:
        if isinstance(data, list):
            return "[]"
        return 0

    fields = sorted(list(fields))

    add_schema({
        'id': schema_id,
        'fields': fields,
        'meta': [meta_map.get(f, 0) for f in fields]
    })

    if lvl == 0:
        compact_schemas(id_prefix)
        detect_codecs(data, schema_id)

    if isinstance(data, list):
        return "[]" + schema_id
    return schema_id


_timer_setup = """
from cPickle import dumps as pickle_dumps, loads as pickle_loads
from json import dumps as json_dumps, loads as json_loads
from marshal import dumps as marshal_dumps, loads as marshal_loads
from __main__ import dumps as kson_dumps, loads as kson_loads, add_schema

def mkd(n):
    return {
        'id': n,
        'value_a': n * 2,
        'value_b': str(n*n)
    }
l = [mkd(i) for i in range(1000)]

add_schema('["schema", "test", ["id", "value_a", "value_b"], [0, 0, 0]]')

raw_pickle = pickle_dumps(l)
raw_marshal = marshal_dumps(l)
raw_json = json_dumps(l)
raw_kson = kson_dumps(l, '[]test')
"""


def bench():
    from timeit import Timer

    def timeit(stmt):
        return min(Timer(stmt, setup=_timer_setup).repeat(3, 100))

    print "dumps pickle ", timeit("pickle_dumps(l)")
    print "dumps marshal", timeit("marshal_dumps(l)")
    print "dumps json   ", timeit("json_dumps(l)")
    print "dumps kson   ", timeit("kson_dumps(l, '[]test')")

    print "loads pickle ", timeit("pickle_loads(raw_pickle)")
    print "loads marshal", timeit("marshal_loads(raw_marshal)")
    print "loads json   ", timeit("json_loads(raw_json)")
    print "loads kson   ", timeit("kson_loads(raw_kson)")


def main(args):
    from docopt import docopt
    opts = docopt(__doc__, args, version='KSON v0.1')

    global _verbose
    _verbose = opts['--verbose']

    if opts['--auto-schema']:
        pass

    print opts
    return 0

    # movies = json_loads(open("movies.json").read())
    # movie_schema_id = detect_schemas(movies, "movies")
    # print len(json.dumps(movies))
    # print len(dumps(movies, movie_schema_id))

    # books = json_loads(open("books.json").read())
    # books_schema_id = detect_schemas(books, "books")
    # print len(json.dumps(books))
    # print len(dumps(books, books_schema_id))

    # apis = json_loads(open("apis.json").read())
    # apis_schema_id = detect_schemas(apis, "apis")
    # print len(json.dumps(apis))
    # print len(dumps(apis, apis_schema_id))

    api_description = json.loads(open("api_description.json").read())
    api_description_schema_id = detect_schemas(api_description, "apidesc")
    print len(json.dumps(api_description))
    print len(dumps(api_description, api_description_schema_id))

    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
