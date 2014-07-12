_timer_setup = """
from cPickle import dumps as pickle_dumps, loads as pickle_loads
from json import dumps as json_dumps, loads as json_loads
from marshal import dumps as marshal_dumps, loads as marshal_loads
from kson import dumps as kson_dumps, loads as kson_loads, add_schema

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

from timeit import Timer


def timeit(stmt):
    return min(Timer(stmt, setup=_timer_setup).repeat(3, 100))


print "dumps json   ", timeit("json_dumps(l)")
print "dumps kson   ", timeit("kson_dumps(l, '[]test')")

print "loads json   ", timeit("json_loads(raw_json)")
print "loads kson   ", timeit("kson_loads(raw_kson)")

print "dumps pickle ", timeit("pickle_dumps(l)")
print "dumps marshal", timeit("marshal_dumps(l)")

print "loads pickle ", timeit("pickle_loads(raw_pickle)")
print "loads marshal", timeit("marshal_loads(raw_marshal)")
