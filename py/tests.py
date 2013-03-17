#!/usr/bin/env python
import os
import kson
import json

BASEPATH = os.path.abspath(os.path.dirname(__file__) + "/..")
FIXTURES_PATH = BASEPATH + "/test_data/"

with open(FIXTURES_PATH + "movie_schemas.json", 'r') as f:
    MOVIE_SCHEMAS = json.load(f)

with open(FIXTURES_PATH + "movies.json", 'r') as f:
    MOVIE_DATA = json.load(f)


def minify(s):
    return s.replace(" ", "").replace("\n", "")


def data_eq(a, b):
    return json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True)


FAMILY_SCHEMAS = """[
    "[]schema",
    "grand_parent", ["par_field"], ["parent"],
    "parent", ["kid_a_field", "kid_b_field"], ["kid_a", "kid_b"],
    "kid_a", ["a_field", "a_arr_field"], [0, "[]"],
    "kid_b", ["b_field", "b_arr_field"], [0, "[]"]
]"""


FAMILY_OBJ = {
    'par_field': {
        'kid_a_field': {
            'a_field': "a_val",
            'a_arr_field': ["a_arr_val_1", "a_arr_val_2"]
        },
        'kid_b_field': {
            'b_field': "b_val",
            'b_arr_field': ["b_arr_val_1", "b_arr_val_2"]
        }
    }
}

FAMILY_KSON = minify("""
    ["grand_parent", [
        ["a_val", ["a_arr_val_1", "a_arr_val_2"]],
        ["b_val", ["b_arr_val_1", "b_arr_val_2"]]
    ]]
""")


def test_schema_validation():
    test_schema = {}
    try:
        kson.add_schema(test_schema)
        assert False, "fail for schema missing id"
    except ValueError:
        pass

    test_schema['id'] = 'test_schema'

    try:
        kson.add_schema(test_schema)
        assert False, "fail for schema missing fields"
    except ValueError:
        pass

    test_schema['fields'] = ['first', 'second']

    try:
        kson.add_schema(test_schema)
        assert False, "fail for schema missing meta"
    except ValueError:
        pass

    test_schema['meta'] = [0]

    try:
        kson.add_schema(test_schema)
        assert False, "fail for 'fields', 'meta' missmatch"
    except AssertionError:
        pass

    test_schema['meta'] = [0, 0]

    kson.add_schema(test_schema)
    assert 'test_schema' in kson.SCHEMAS


def test_schema_loading():
    assert 'schema' in kson.SCHEMAS

    kson.add_schema({
        'id': 'dict_schema',
        'fields': ['first', 'second'],
        'meta': [0, 0]
    })

    schema = kson.SCHEMAS['dict_schema']
    assert schema['fields'] == ['first', 'second']
    assert schema['meta'] == [0, 0]

    kson.add_schema("""
        {
            "id": "json_schema",
            "fields": ["first", "second"],
            "meta": [0, 0]
        }
    """)

    schema = kson.SCHEMAS['json_schema']
    assert schema['fields'] == ['first', 'second']
    assert schema['meta'] == [0, 0]

    kson.add_schema("""
        ["schema", "kson_schema", ["first", "second"], [0, 0]]
    """)
    schema = kson.SCHEMAS['kson_schema']
    assert schema['fields'] == ['first', 'second']
    assert schema['meta'] == [0, 0]


def test_multi_schema_loading():
    kson.load_schemas(FIXTURES_PATH + "movie_schemas.kson")
    assert kson.SCHEMAS['movies'] == MOVIE_SCHEMAS['movies']
    assert kson.SCHEMAS['movies-status'] == MOVIE_SCHEMAS['movies-status']
    assert kson.SCHEMAS['movies-content'] == MOVIE_SCHEMAS['movies-content']
    assert kson.SCHEMAS['movies-item'] == MOVIE_SCHEMAS['movies-item']


def test_load_file():
    kson.load_schemas(FIXTURES_PATH + "movie_schemas.kson")
    movies = kson.load(FIXTURES_PATH + "movies.kson")
    assert data_eq(movies, MOVIE_DATA)


def test_basic_loads():
    kson.add_schema("""["schema", "basic", ["a", "b", "c"], [0, 0, "[]"]]""")
    data = kson.loads("""
        ["[]basic", "foo", "bar", ["biz", "baz"], "one", "two", [1,2,3,4,5]]
    """)

    assert len(data) == 2
    assert data[0] == {'a': "foo", 'b': "bar", 'c': ["biz", "baz"]}
    assert data[1] == {'a': "one", 'b': "two", 'c': [1, 2, 3, 4, 5]}


def test_nested_loads():
    kson.loads_schemas(FAMILY_SCHEMAS)
    data = kson.loads(FAMILY_KSON)
    par_field = data['par_field']
    kid_a = par_field['kid_a_field']
    kid_b = par_field['kid_b_field']

    assert len(data) == 1
    assert set(data.keys()) == set(['par_field'])
    assert set(par_field.keys()) == set(['kid_a_field', 'kid_b_field'])
    assert set(kid_a.keys()) == set(['a_field', 'a_arr_field'])
    assert set(kid_b.keys()) == set(['b_field', 'b_arr_field'])


def test_dumps():
    kson.loads_schemas(FAMILY_SCHEMAS)
    kson_data = kson.dumps(FAMILY_OBJ, 'grand_parent')
    assert kson_data == FAMILY_KSON


def test_round_trip():
    kson.loads_schemas(FAMILY_SCHEMAS)
    family_obj = kson.loads(kson.dumps(FAMILY_OBJ, 'grand_parent'))
    assert data_eq(family_obj, FAMILY_OBJ)


def test_decode_loads():
    pass
