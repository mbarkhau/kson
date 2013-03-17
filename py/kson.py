#!/usr/bin/env python
# coding: utf-8
#
# Copyright (c) 2013, Manuel Barkhau <mbarkhau@gmail.com>
# All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are met:
#
# 1. Redistributions of source code must retain the above copyright notice,
#    this list of conditions and the following disclaimer.
# 2. Redistributions in binary form must reproduce the above copyright notice,
#    this list of conditions and the following disclaimer in the documentation
#    and/or other materials provided with the distribution.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
# IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
# ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
# LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
# (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
# CONSEQUENTIAL DAMAGES LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
# INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
# CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
# ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
# POSSIBILITY OF SUCH DAMAGE.

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
import collections
from base64 import b64encode

try:
    import simplejson as json
except ImportError:
    import json

default_json_dumps = json.dumps
default_json_loads = json.loads

try:
    import ujson
    json_loads = ujson.loads

    def json_dumps(*args, **kwargs):
        kwargs['encode_html_chars'] = False
        return ujson.dumps(*args, **kwargs)
except ImportError:
    json_dumps = default_json_dumps
    json_loads = default_json_loads


_DECODERS = {}
_ENCODERS = {}

CODEC_FACTORIES = {}
SCHEMAS = {}

_verbose = False


def add_schema(schema):
    if isinstance(schema, basestring):
        schema = loads(schema)

    if not schema:
        raise ValueError("Invalid Schema: " + str(schema))

    if 'id' not in schema:
        raise ValueError("Invalid Schema: Missing field 'id'")
    if 'fields' not in schema:
        raise ValueError("Invalid Schema: Missing field 'fields'")
    if 'meta' not in schema:
        raise ValueError("Invalid Schema: Missing field 'meta'")

    assert len(schema['fields']) == len(schema['meta'])

    if _verbose:
        print "Adding new schema: ", schema['id']
        print "\t", schema['fields']
        print "\t", schema['meta']

    SCHEMAS[schema['id']] = schema


def load_schemas(fp_or_filename):
    if isinstance(fp_or_filename, basestring):
        with open(fp_or_filename, 'r') as f:
            data = f.read()
    else:
        data = fp_or_filename.read()
    return loads_schemas(data)


def loads_schemas(schema_data):
    schemas = loads(schema_data)
    if isinstance(schemas, list):
        for s in schemas:
            add_schema(s)
    else:
        add_schema(schemas)


def add_codec(name, codec):
    CODEC_FACTORIES[name] = codec


def codec(codec_or_name):
    """decorator to register a kson codec factory function"""
    if not isinstance(codec_or_name, basestring):
        # assume the argument is the factory function
        codec = codec_or_name
        name = codec.__name__
        CODEC_FACTORIES[name] = codec
        return codec

    name = codec_or_name

    def dec(codec):
        CODEC_FACTORIES[name] = codec
        return codec

    return dec


def dump(data, fp_or_filename, *args, **kwargs):
    data = dumps(data, *args, **kwargs)
    if isinstance(fp_or_filename, basestring):
        with open(fp_or_filename, 'w') as fp:
            fp.write(data)
    else:
        fp_or_filename.write(data)


def load(fp_or_filename, *args, **kwargs):
    if isinstance(fp_or_filename, basestring):
        with open(fp_or_filename, 'r') as f:
            data = f.read()
    else:
        data = fp_or_filename.read()
    return loads(data, *args, **kwargs)


def dumps(data, schema_id, is_sublist=False, *args, **kwargs):
    is_array = schema_id[0] == u"["
    schema_id = schema_id[2:] if is_array else schema_id
    schema = SCHEMAS[schema_id]
    fields = schema['fields']
    meta = schema['meta']
    result = []

    if is_array and not isinstance(data, collections.Iterable):
        raise ValueError("Schema specifies array, got %s" % type(data))

    if not is_array and not isinstance(data, collections.Mapping):
        raise ValueError("Schema specifies object, got %s" % type(data))

    if not is_sublist:
        result.append("[]" + schema_id if is_array else schema_id)

    if not is_array:
        data = [data]

    for obj in data:
        for field, meta_id in zip(fields, meta):
            val = obj.get(field, None)
            if val is not None:
                meta_is_subarray = meta_id and meta_id[0] == u"["
                _meta_id = meta_id[2:] if meta_is_subarray else meta_id
                if _meta_id in SCHEMAS:
                    val = dumps(val, meta_id, True)
                elif _meta_id in _ENCODERS:
                    encoder = _ENCODERS[_meta_id]
                    if meta_is_subarray:
                        for i in xrange(len(val)):
                            val[i] = encoder(val[i], obj)
                    else:
                        val = encoder(val, obj)
            result.append(val)

    if is_sublist:
        return result

    if args or kwargs:
        return default_json_dumps(result, *args, **kwargs)
    return json_dumps(result)


def loads(data, schema_id=None):
    data = json_loads(data) if isinstance(data, basestring) else data
    if not isinstance(data, list) or len(data) == 0:
        return data
    if not (schema_id or isinstance(data[0], basestring)):
        return data

    data_start = 0
    if not schema_id:
        schema_id = data[0]
        data_start = 1

    is_array = schema_id[0] == u"["
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
            meta_is_subarray = meta_id and meta_id[0] == u"["
            _meta_id = meta_id[2:] if meta_is_subarray else meta_id
            if _meta_id in SCHEMAS:
                val = loads(val, meta_id)
            elif _meta_id in _DECODERS:
                decoder = _DECODERS[_meta_id]
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


@codec('prefix')
def prefix_codec(prefix):
    def encoder(val):
        if val.startswith(prefix):
            return val.replace(prefix, "", 1)

    def decoder(val):
        return prefix + val

    return encoder, decoder


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
