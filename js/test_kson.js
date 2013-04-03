var KSON = require("./kson.js"),
    fs = require("fs"),
    files = {},
    tests = {};

tests.load_schema = function() {
    KSON.addSchema('["schema", "test_schema", ["field_1", "field_2"], [0, 0]]');
    var data = KSON.parse('["test_schema", "foo", "bar"]');
    assert(data.field_1 == "foo");
    assert(data.field_2 == "bar");
};

tests.load_multiple_schemas = function() {
    KSON.addSchema('["[]schema",' +
        '"test_schema_a", ["fa1", "fa2"], [0, 0],' +
        '"test_schema_b", ["fb1", "fb2"], [0, 0]' +
    ']');
    var data = KSON.parse('["test_schema_a", "foo", "bar"]');
    assert(data.fa1 == "foo");
    assert(data.fa2 == "bar");
    var data = KSON.parse('["test_schema_b", "foo", "bar"]');
    assert(data.fb1 == "foo");
    assert(data.fb2 == "bar");
};

tests.array_fields = function() {
    KSON.addSchema('["schema", "array_schema", ["arr_field"], ["[]", 0]]');
    var data = KSON.parse('["array_schema", ["foo", "bar"]]');
    assert(data.arr_field[0] == "foo");
    assert(data.arr_field[1] == "bar");
};

tests.nested_schemas = function() {
    KSON.addSchema('["[]schema",' +
        '"parent", ["p_field", "p_child"], [0, "child"],' +
        '"child", ["cf1", "cf2"], [0, 0]' +
    ']');
    var data = KSON.parse('["parent", "foo", ["bar", "baz"]]');
    assert(data.p_field == "foo");
    assert(data.p_child.cf1 == "bar");
    assert(data.p_child.cf2 == "baz");
};

tests.nested_array = function() {
    KSON.addSchema('["[]schema",' +
        '"parent", ["p_field", "p_child"], [0, "[]child"],' +
        '"child", ["cf1", "cf2"], [0, 0]' +
    ']');
    var data = KSON.parse('["parent", "foo", ["bar", "baz", "bat", "buz"]]');
    assert(data.p_field == "foo");
    assert(data.p_child[0].cf1 == "bar");
    assert(data.p_child[0].cf2 == "baz");
    assert(data.p_child[1].cf1 == "bat");
    assert(data.p_child[1].cf2 == "buz");
};

tests.round_trip = function() {
    KSON.addSchema('["[]schema",' +
        '"parent", ["p_field", "p_child"], [0, "child"],' +
        '"child", ["cf1", "cf2"], [0, 0]' +
    ']');
    var obj = {
        p_field: "foo",
        p_child: {cf1: 1, cf2: 2}
    };
    var raw = KSON.stringify(obj, "parent");
    assert(raw == '["parent","foo",[1,2]]');
    assert(JSON.stringify(KSON.parse(raw)) == JSON.stringify(obj));
};

tests.array_round_trip = function() {
    KSON.addSchema('["[]schema",' +
        '"parent", ["p_field", "p_child"], [0, "child"],' +
        '"child", ["cf1", "cf2"], [0, 0]' +
    ']');
    var arr = [{
        p_field: "foo",
        p_child: {cf1: 1, cf2: 2}
    },{
        p_field: "bar",
        p_child: {cf1: 1, cf2: 2}
    }];
    var raw = KSON.stringify(arr, "[]parent");
    assert(raw == '["[]parent","foo",[1,2],"bar",[1,2]]');
    assert(JSON.stringify(KSON.parse(raw)) == JSON.stringify(arr));
};

tests.codec_round_trip = function() {
    KSON.addSchema('["schema",' +
        '"codec_test", ["c_field", "c_arr"], ["date|int36", "[]enum:a:b:c"]' +
    ']');

    var date = new Date(1776, 0, 1, 0, 0, 0, 0),
        data = {
        c_field: date,
        c_arr: ["a", "a", "b", "b", "c", "a", "b", "a"]
    };
    var raw = KSON.stringify(data, "codec_test");
    assert(raw == '["codec_test","-264fhjts0",[0,0,1,1,2,0,1,0]]');
    assert(JSON.stringify(KSON.parse(raw)) == JSON.stringify(data));
    assert(+KSON.parse(raw).c_field == +date)
};

tests.codec_chaining = function() {
    KSON.addSchema('["schema",' +
        '"codec_chain_test",' + 
        '["c_image_path"],' +
        '["prefix:/static/images/|suffix:.png"]' +
    ']');
    var data = [
        {c_image_path: "/static/images/foo.png"},
        {c_image_path: "/static/images/bar.png"},
        {c_image_path: "/static/images/baz.png"},
    ];
    var raw = KSON.stringify(data, "[]codec_chain_test");
    assert(raw == '["[]codec_chain_test","foo","bar","baz"]');
    assert(JSON.stringify(KSON.parse(raw)) == JSON.stringify(data));
};

tests.movies = function() {
    KSON.addSchema(files["test_data/movie_schemas.kson"]);
    var k_movie_data = files["test_data/movies.kson"],
        j_movie_data = files["test_data/movies.json"],
        k_movies = KSON.parse(k_movie_data),
        j_movies = JSON.parse(j_movie_data),
        k_raw = KSON.stringify(k_movies, "movies");

    assert(k_movies.content.movies[0].cover_big == j_movies.content.movies[0].cover_big);
    assert(k_raw == KSON.stringify(j_movies, "movies"));
    assert(k_raw.length * 2 < j_movie_data.length);
};

function assert(cond, msg) {
    if (!cond) {
        throw new Error(msg);
    }
}


function run_tests() {
    for (var test_name in tests) {
        try {
            tests[test_name]();
            console.log(test_name + "...ok");
        } catch (ex) {
            console.log(test_name + "...fail");
            console.log(ex.stack);
        }
    };
}

function read_files(filenames, callback){
    (function read_file(i) {
        if (!i) {
            i = 0;
        }
        if (i < filenames.length) {
            fs.readFile(filenames[i], 'utf-8', function(err, data) {
                files[filenames[i]] = data;
                read_file(i + 1);
            });
        } else {
            callback();
        }
    })();
}

read_files([
    "test_data/movie_schemas.json",
    "test_data/movie_schemas.kson",
    "test_data/movies.json",
    "test_data/movies.kson"
], run_tests);
