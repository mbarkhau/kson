#!/usr/bin/env python
"""KSON: Keystripped Schemafied Object Notation

KSON is a simple data interchange format based on JSON. It has a more
compact serialized representation and requires only a minimal javscript
library to parse and serialize. KSON removes keys from its serailized
representation and defines an extensible codec mechanism to further
reduce the size of serialized data. KSON uses a simple schema format
to describe arbitrarrily nested objects.

Usage:
    kson introspect [-s <id>] [-vj] [-i <input>] [-o <output>]
    kson convert (<schemas>...) [-s <id>] [-vj] [-i <input>] [-o <output>]
                                [--out_schema_id=<id>]
    kson convert [-vj] [-i <input>] [-o <output>]

Options:
    --version               Show version
    -h --help               Show help
    -v --verbose            Show schema data and compression info
    -i --input=<input>      Input file
    -o --output=<output>    Output file (defaults to)
    -j --json               Write output as JSON instead of KSON
    -s --schema_id=<id>     Explicitly specify schema when schema file is
                            ambiguous about the top level schema.
    --out_schema_id=<id>    Use different schema for output during conversion
"""

import sys
import kson
import json


def read(opts):
    if opts['--input']:
        with open(opts['--input'], 'r') as f:
            return f.read()

    return sys.stdin.read()


def write(opts, data):
    if opts['--output']:
        with open(opts['--output'], 'w') as f:
            f.write(data)
    else:
        sys.stdout.write(data)
        sys.stdout.write("\n")


def find_top_schema(schemas):
    def is_sub_schema(schema):
        for s in schemas:
            if schema['id'] in s['meta'] or "[]" + schema['id'] in s['meta']:
                return True
        return False

    top_schema = None
    for s in schemas:
        if is_sub_schema(s):
            continue
        if top_schema:
            return None
        return s

    return top_schema


def load_schemas(opts):
    paths = opts['<schemas>']
    if not paths:
        return []

    schemas = []
    for p in paths:
        schemas += kson.load_schemas(p)
    return schemas


def main(args):
    from docopt import docopt
    opts = docopt(__doc__, args, version=kson.__version__)

    global _verbose
    _verbose = opts['--verbose']

    schema_id = opts['--schema_id']
    loaded_schemas = load_schemas(opts)
    in_data = read(opts)

    if opts['introspect']:
        sid, schemas = kson.detect_schemas(in_data, id_prefix=schema_id)
        write(opts, json.dumps(schemas, indent=4))

    if opts['convert']:
        if not schema_id and not opts['<schemas>']:
            schema_id = "schema"

        if schema_id:
            if schema_id in kson.SCHEMAS:
                schema = kson.SCHEMAS[schema_id]
            else:
                ids = ", ".join(kson.SCHEMAS.keys())
                print "schema_id '%s' not found in: %s" % (schema_id, ids)
                return 1
        elif loaded_schemas:
            schema = find_top_schema(loaded_schemas)
        else:
            schema = None

        if schema:
            schema_id = schema['id']
        else:
            print "unable to determine appropriate schema for conversion"
            return 1

        in_data = json.loads(in_data)
        if isinstance(in_data, list):
            schema_id = "[]" + schema_id
        write(opts, kson.dumps(in_data, schema_id))

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

    # api_description = json.loads(open("api_description.json").read())
    # api_description_schema_id = detect_schemas(api_description, "apidesc")
    # print len(json.dumps(api_description))
    # print len(dumps(api_description, api_description_schema_id))

    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
