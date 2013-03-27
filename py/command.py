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
    kson bench

Options:
    --version               Show version
    -v --verbose            Show schema data and compression info
    -i --input=<input>      Input file
    -s --schema=<schema>    Schema file in KSON or JSON format
    -o --output=<output>    Output file (defaults to)
    -j --json               Write schema-output as JSON instead of KSON
"""

__version__ = __doc__.split("\n")[0][46:]

import sys
from kson import load, dump, dumps, load_schemas, detect_schemas

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
    opts = docopt(__doc__, args, version=__version__)

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
