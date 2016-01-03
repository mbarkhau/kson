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
import os
import re
import sys
import json
import string
import collections
from base64 import b64encode
from datetime import datetime
from calendar import timegm

__version__ = "0.1.0"

PY2 = sys.version < '3'

default_json_loads = json.loads


def default_json_dumps(*args, **kwargs):
    kwargs['separators'] = (",", ":")
    return json.dumps(*args, **kwargs)

try:
    import ujson
    json_loads = ujson.loads

    def json_dumps(*args, **kwargs):
        kwargs['encode_html_chars'] = False
        kwargs['ensure_ascii'] = False
        return ujson.dumps(*args, **kwargs)
except ImportError:
    json_dumps = default_json_dumps
    json_loads = default_json_loads


DECODERS = {}
ENCODERS = {}

CODEC_FACTORIES = {}
SCHEMAS = {}

_verbose = False


def _plain_id(id):
    return id[2:] if id and id[0] == u"[" else id


def baseN(num, b=36, digits=string.digits + string.ascii_letters):
    if num == 0:
        return digits[0]

    if num < 0:
        return "-" + baseN(-num, b, digits)

    d = digits[num % b]
    return baseN(num // b, b, digits).lstrip(digits[0]) + d


## codec management


def add_codec(codec_or_name):
    """decorator to register a kson codec factory function"""
    if not isinstance(codec_or_name, (str, bytes)):
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


def coder_fn(coders):
    def coder(val):
        for c in coders:
            val = c(val)
        return val
    return coder


CODEC_RE = re.compile(r"(?:\\.|[^\|])+")
ARGS_RE = re.compile(r"(?:\\.|[^:])+")


def init_codec(meta_id):
    if not meta_id or meta_id in ENCODERS:
        return

    metas = CODEC_RE.findall(meta_id)

    encoders = []
    decoders = []

    for meta in metas:
        args = ARGS_RE.findall(meta)
        codec_id = args[0]
        if codec_id not in CODEC_FACTORIES:
            return

        args = args[1:]
        for j, arg in enumerate(args):
            args[j] = arg.replace("\\", "")

        enc, dec = CODEC_FACTORIES[codec_id](args)
        encoders.append(enc)
        decoders.append(dec)

    ENCODERS[meta_id] = coder_fn(encoders)
    DECODERS[meta_id] = coder_fn(list(reversed(decoders)))


def init_codecs(schema):
    for meta_id in schema['meta']:
        meta_id = _plain_id(meta_id)
        if meta_id:
            init_codec(meta_id)


# default codecs


@add_codec('suffix')
def suffix_codec(args):
    suffix = args[0]

    def encoder(val):
        if not val.endswith(suffix):
            raise ValueError("Expected %s to have suffix %s" % (val, suffix))
        return val.rsplit(suffix, 1)[0]

    def decoder(raw):
        return raw + suffix

    return encoder, decoder


@add_codec('prefix')
def prefix_codec(args):
    prefix = args[0]

    def encoder(val):
        if not val.startswith(prefix):
            raise ValueError("Expected %s to have prefix %s" % (val, prefix))
        return val.replace(prefix, "", 1)

    def decoder(raw):
        return prefix + raw

    return encoder, decoder


@add_codec('bool')
def bool_codec(args):
    def encoder(val):
        return 1 if val else 0

    def decoder(raw):
        return bool(raw)

    return encoder, decoder


@add_codec('enum')
def enum_codec(args):
    args = args[:]
    args.insert(0, 0)

    def encoder(val):
        try:
            return args.index(val)
        except ValueError:
            return val

    def decoder(raw):
        if isinstance(raw, int):
            return args[raw]
        return raw

    return encoder, decoder


@add_codec('int36')
def int36_codec(args):
    def encoder(val):
        return baseN(val, 36)

    def decoder(val):
        return int(val, 36)

    return encoder, decoder


@add_codec('date')
def date_codec(args):
    def encoder(val):
        return timegm(val.utctimetuple())

    def decoder(val):
        return datetime.utcfromtimestamp(val)

    return encoder, decoder


@add_codec('iso8601')
def isodate_codec(args):
    import iso8601

    def encoder(val):
        return val.isoformat()

    def decoder(val):
        return iso8601.parse_date(val)

    return encoder, decoder


## schema


def add_schema(schema):
    if isinstance(schema, (str, bytes)):
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
        print("Adding new schema: ", schema['id'])
        print("\t", schema['fields'])
        print("\t", schema['meta'])

    init_codecs(schema)
    SCHEMAS[schema['id']] = schema
    return schema


add_schema({
    'id': 'schema',
    'fields': ['id', 'fields', 'meta'],
    'meta': [0, "[]", "[]"]
})


def load_schemas(fp_or_filename):
    if isinstance(fp_or_filename, (str, bytes)):
        with open(fp_or_filename, 'r') as f:
            data = f.read()
    else:
        data = fp_or_filename.read()
    return loads_schemas(data)


def loads_schemas(schema_data):
    schemas = loads(schema_data)
    if isinstance(schemas, list):
        return [add_schema(s) for s in schemas]
    else:
        return [add_schema(schemas)]


## (de)serialization


def _process_val(val, meta_id, recurse, coders):
    if val is None:
        return None

    p_meta_id = _plain_id(meta_id)
    if p_meta_id in SCHEMAS:
        return recurse(val, meta_id, True)

    if p_meta_id in coders:
        coder = coders[p_meta_id]

        if p_meta_id == meta_id:
            return coder(val)

        val = val[:]  # copy so argument isn't modified
        for i, v in enumerate(val):
            val[i] = coder(v)

    return val


def dumps(data, schema_id, is_recurse=False, *args, **kwargs):
    is_array = schema_id[0] == u"["
    schema_id = schema_id[2:] if is_array else schema_id
    schema = SCHEMAS[schema_id]
    fields = schema['fields']
    meta = schema['meta']
    result = []

    err_arg = (schema_id, type(data))
    if is_array and not isinstance(data, collections.Iterable):
        raise ValueError("Schema %s specifies array, got %s" % err_arg)

    if not is_array and not isinstance(data, collections.Mapping):
        raise ValueError("Schema %s specifies object, got %s" % err_arg)

    if not is_recurse:
        result.append("[]" + schema_id if is_array else schema_id)

    if not is_array:
        data = [data]

    for obj in data:
        for field, meta_id in zip(fields, meta):
            result.append(_process_val(
                obj.get(field, None), meta_id, dumps, ENCODERS
            ))

    if is_recurse:
        return result

    if args or kwargs:
        return default_json_dumps(result, *args, **kwargs)
    return json_dumps(result)


def loads(data, schema_id=None, is_recurse=False):
    data = json_loads(data) if isinstance(data, (str, bytes)) else data

    # plain json value or json object
    if not isinstance(data, list) or len(data) == 0:
        return data

    if not (schema_id or
            PY2 and isinstance(data[0], unicode) or
            isinstance(data[0], str)):
        return data

    data_start = 0
    if not schema_id:
        schema_id = data[0]
    if not is_recurse:
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

        obj[fields[j]] = _process_val(val, meta_id, loads, DECODERS)

    if not is_array:
        return obj

    if obj:
        result.append(obj)

    return result


## helpers for dealing with files


def dump(data, fp_or_filename, *args, **kwargs):
    data = dumps(data, *args, **kwargs)
    if isinstance(fp_or_filename, (str, bytes)):
        with open(fp_or_filename, 'w') as fp:
            fp.write(data)
    else:
        fp_or_filename.write(data)


def load(fp_or_filename, *args, **kwargs):
    if isinstance(fp_or_filename, (str, bytes)):
        with open(fp_or_filename, 'r') as f:
            data = f.read()
    else:
        data = fp_or_filename.read()
    return loads(data, *args, **kwargs)


## schema detection


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
            sid, schemas = detect_schemas(value, id_prefix, lvl + 1, idx,
                                          field)
            meta_map[field] = sid
            idx += 1
    return meta_map


def detect_schemas(data, id_prefix=None, lvl=0, idx=0, schema_ext=None):
    if id_prefix is None:
        id_prefix = "auto-schema-" + b64encode(os.urandom(6))
    schema_id = id_prefix + "-" + str(lvl) + "-" + str(idx)
    if schema_ext:
        schema_id += "-" + schema_ext
    fields = set()
    meta_map = {}

    if isinstance(data, (str, bytes)):
        data = json_loads(data)

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
        return 0, tuple()

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
        return "[]" + schema_id, tuple()

    schemas = [s for s in SCHEMAS.values() if s['id'].startswith(id_prefix)]
    schemas = sorted(schemas, key=lambda s: s['id'], reverse=True)
    return schema_id, schemas
