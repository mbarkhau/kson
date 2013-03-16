#!/usr/bin/env python
import kson

TEST_SCHEMA = {
    'id': 'dict_schema',
    'fields': ['first', 'second'],
    'meta': [0, 0]
}

JSON_TEST_SCHEMA = """
{
    "id": "json_schema",
    "fields": ["first", "second"],
    "meta": [0, 0]
}
"""

KSON_TEST_SCHEMA = """
    ["schema", "kson_schema", ["first", "second"], [0, 0]]
"""


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

    kson.add_schema(TEST_SCHEMA)
    schema = kson.SCHEMAS['dict_schema']
    assert schema['fields'] == ['first', 'second']
    assert schema['meta'] == [0, 0]

    kson.add_schema(JSON_TEST_SCHEMA)
    schema = kson.SCHEMAS['json_schema']
    assert schema['fields'] == ['first', 'second']
    assert schema['meta'] == [0, 0]

    kson.add_schema(KSON_TEST_SCHEMA)
    schema = kson.SCHEMAS['kson_schema']
    assert schema['fields'] == ['first', 'second']
    assert schema['meta'] == [0, 0]


def test_loads():
    # kson.loads()
    pass
