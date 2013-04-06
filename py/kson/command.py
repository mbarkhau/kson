#!/usr/bin/env python
"""KSON: Keystripped Schemafied Object Notation v0.1

KSON is a simple data interchange format based on JSON. It has a more
compact serialized representation and requires only a minimal javscript
library to parse and serialize. KSON removes keys from its serailized
representation and defines an extensible codec mechanism to further
reduce the size of serialized data. KSON uses a simple schema format
to describe arbitrarrily nested objects.

Usage:
    kson introspect [-s <schema>] [-vj] [-i <input>] [-o <output>]
    kson convert -s <schema> [-vj] [-i <input>] [-o <output>]
    
Options:
    --version               Show version
    -h --help               Show help
    -v --verbose            Show schema data and compression info
    -i --input=<input>      Input file
    -s --schema=<schema>    Schema name or file in KSON or JSON format
    -o --output=<output>    Output file (defaults to)
    -j --json               Write output as JSON instead of KSON
"""

__version__ = __doc__.split("\n")[0][46:]

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

def main(args):
    from docopt import docopt
    opts = docopt(__doc__, args, version=__version__)

    global _verbose
    _verbose = opts['--verbose']

    in_data = read(opts)
    schema = opts['--schema']

    if opts['introspect']:
        sid, schemas = kson.detect_schemas(in_data, id_prefix=schema)
        write(opts, json.dumps(schemas, indent=4))

    if opts['convert']:
        if schema not in kson.SCHEMAS:
            kson.load_schemas(schema)


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
