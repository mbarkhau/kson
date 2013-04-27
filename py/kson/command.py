#!/usr/bin/env python
"""KSON: Keystripped Schemafied Object Notation

KSON is a simple data interchange format based on JSON. It has a more
compact serialized representation and requires only a minimal javscript
library to parse and serialize. KSON removes keys from its serailized
representation and defines an extensible codec mechanism to further
reduce the size of serialized data. KSON uses a simple schema format
to describe arbitrarrily nested objects.

Usage:
    kson introspect [-jp] [-i <input>] [-o <output>] [--schema_id <id>]
    kson (j2k|k2j|k2k|j2j) [<schemas>...] [-i <input>] [-o <output>] [-p]
        [--schema_id <id>] [--out_schema_id=<id>]

Options:
    --version               Show version
    -h --help               Show help
    -i --input=<input>      Input file
    -o --output=<output>    Output file (defaults to)
    -j --json               Write output as JSON instead of KSON
    -s --schema_id=<id>     Explicitly specify schema (required if schema
                            file is ambiguous about the top level schema.)
    -p --pretty             Indentat output
    --out_schema_id=<id>    Use different schema for output during conversion
"""

import sys
import json

try:
    import kson
except ImportError:
    # some setup to run from dev environment
    from os.path import abspath, dirname, join, pardir
    sys.path.insert(0, abspath(join(dirname(__file__), pardir)))

from kson import __version__, SCHEMAS
from kson import dumps, loads, load_schemas, detect_schemas


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
            return None, False
        top_schema = s['id']

    return top_schema, True


def load_opts_schemas(opts):
    paths = opts['<schemas>']
    if not paths:
        return []

    schemas = []
    for p in paths:
        schemas += load_schemas(p)
    return schemas


def introspect(opts, in_data, schema_id=None):
    sid, schemas = detect_schemas(read(opts), id_prefix=opts['--schema_id'])

    if opts['--json']:
        schema_data = json.dumps(schemas, indent=4)
    else:
        schema_data = dumps(schemas, 'schema')

    write(opts, schema_data)
    return 0


def init_schemas(opts):
    loaded_schemas = load_opts_schemas(opts)

    in_schema_id = opts['--schema_id']

    if loaded_schemas and not in_schema_id:
        in_schema_id, ok = find_top_schema(loaded_schemas)
        if not ok:
            sys.stderr.write("--schema_id=<id> required\n")
            return None, None, False

    if not in_schema_id:
        sys.stderr.write("--schema_id=<id> required\n")
        return None, None, False

    out_schema_id = opts['--out_schema_id'] or in_schema_id

    in_schema = SCHEMAS.get(in_schema_id, None)
    out_schema = SCHEMAS.get(out_schema_id, None)

    if not in_schema:
        err_arg = (in_schema_id, ", ".join(SCHEMAS.keys()))
        sys.stderr.write("--schema_id '%s' not found in: %s\n" % err_arg)
        return None, None, False

    if not out_schema:
        err_arg = (out_schema_id, ", ".join(SCHEMAS.keys()))
        sys.stderr.write("--out_schema_id '%s' not found in: %s\n" % err_arg)
        return None, None, False

    return in_schema, out_schema, True


def convert(opts):
    if not opts['j2j']:
        in_schema, out_schema, ok = init_schemas(opts)

        if not ok:
            return 1

    in_data = read(opts)

    if opts['j2k'] or opts['j2j']:
        in_data = json.loads(in_data)

    if opts['k2j'] or opts['k2k']:
        in_data = loads(in_data, in_schema['id'])

    indent = 4 if opts['--pretty'] else None

    if opts['k2j'] or opts['j2j']:
        out_data = json.dumps(in_data, indent=indent)

    if opts['j2k'] or opts['k2k']:
        out_data = dumps(in_data, out_schema['id'], indent=4)

    write(opts, out_data)
    return 0


def main(args=sys.argv[1:]):
    from docopt import docopt
    opts = docopt(__doc__, args, version=__version__)

    if opts['introspect']:
        return introspect(opts)

    return convert(opts)


if __name__ == '__main__':
    sys.exit(main())
