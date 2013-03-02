/* KSON: Keyless Schemafied Object Notation
 *
 * A serialization format with two goals in mind:
 *	1. Easily parsable using minimal javascript.
 *	2. Reduce serialized size compared to JSON.
 * 
 * 1. is accomplished by using the (comparativly fast) JSON parse/stringify
 *	functions, thus reducing the task of KSON to packing/unpacking the values
 *	according to a predefined schema. This also greatly reduces the size of
 *	the library which is downloaded to the browser, compared with other
 *	serialization formats (gzipped KSON is < 1K).
 * 2. is accomplished by eliminating often redundant keys and by extending
 *	native JSON datatypes with an encoding/decoding mechanism. Codecs allow
 *	for a compact serialized data representation.
 */
!(function (global) {

var DECODERS = {}, ENCODERS = {}, SCHEMAS = {};

function addSchema(schema) {
	if (typeof schema === 'string') {
		schema = parse(schema);
	}
	SCHEMAS[schema.id] = schema;
}

function addCodec(name, decoder, encoder){
	DECODERS[name] = decoder;
	ENCODERS[name] = encoder;
}

function stringify(data, schema_id, is_subarray) {
	var is_array = schema_id[0] === "[",
		schema_id = is_array ? schema_id.slice(2) : schema_id,
		schema = SCHEMAS[schema_id],
		fields = schema.fields,
		fields_length = fields.length,
		meta = schema.meta, meta_id, meta_is_subarray,
		i, j, k, obj, val, encoder,
		result = [];

	if (!is_subarray) {
		result[0] = (is_array) ? "[]" + schema_id : schema_id;
	}
	if (!is_array) {
		data = [data];
	}
	var data_length = data.length;

	for (i = 0; i < data_length; i++) {
		obj = data[i];
		for (j = 0; j < fields_length; j++) {
			val = obj[fields[j]];
			if (val !== null && val !== undefined) {
				meta_id = meta[j];
				meta_is_subarray = meta_id && meta_id[0] === "[";
				if (meta_is_subarray) {
					meta_id = meta_id.slice(2);
				}
				encoder = ENCODERS[meta_id];
				schema = SCHEMAS[meta_id];
				if (schema) {
					val = stringify(val, meta[j], 1);
				} else if (encoder) {
					if (meta_is_subarray) {
						for (k = val.length - 1; k >= 0; k--) {
							val[k] = encoder(val[k], obj);
						}
					} else {
						val = encoder(val, obj);
					}
				}
			}
			result.push(val);
		}
	}
	return (is_subarray) ? result : JSON.stringify(result);
}

function parse(raw, schema_id) {
	var data = (typeof raw === 'string') ? JSON.parse(raw) : raw,
		data_length = data.length,
		is_array, meta_is_subarray,
		result, tmp_obj, val,
		decoder, schema, meta_id,
		i = 0, j, k;

	if (!schema_id) {
		schema_id = data[0];
		i = 1;
	}

	is_array = schema_id[0] === "[";
	if (is_array) {
		schema_id = schema_id.slice(2);
		result = [];
	}
	schema = SCHEMAS[schema_id];

	var fields = schema.fields,
		meta = schema.meta,
		fields_length = fields.length;

	for (; i < data_length; i += fields_length) {
		tmp_obj = {};
		for (j = 0; j < fields_length; j++) {
			val = data[i + j];
			if (val !== null && val !== undefined) {
				meta_id = meta[j];
				meta_is_subarray = meta_id && meta_id[0] === "[";
				if (meta_is_subarray) {
					meta_id = meta_id.slice(2);
				}
				decoder = DECODERS[meta_id];
				schema = SCHEMAS[meta_id];
				if (schema) {
					val = parse(val, meta[j]);
				} else if (decoder) {
					if (meta_is_subarray) {
						for (k = val.length - 1; k >= 0; k--) {
							val[k] = decoder(val[k], tmp_obj);
						}
					} else {
						val = decoder(val, tmp_obj);
					}
				}
			}
			tmp_obj[fields[j]] = val;
		}
		if (is_array) {
			result.push(tmp_obj);
		} else {
			return tmp_obj;
		}
	}
	return result;
}


// addCodec('flagset',
// 	function (raw) {
//         var base2 = parseInt(raw, 36).toString(2),
// 	        flags = [false, false, false, false, false, false];
// 	    for (var i = base2.length - 1; i >= 0; i--) {
// 	    	base2[i]
// 	    }
//         return flags;
// 	},
// 	function(flags) {
//         s = ""
//         for b in arguments
//             s = (0 + b) + s
//         return parseInt(s, 2).toString(36);
// 	}
// );

// add the schema schema
addSchema({
	id: 'schema',
	fields: ['id', 'fields', 'meta'],
	meta: [0, "[]", "[]"]
});

// equivalent in KSON (if the schema schema were already bootstrapped)
// addSchema('["schema", ["id", "fields", "meta"], [0,0,0]]');

// console.log(SCHEMAS);
// var raw_test = '["schema","test",["a","b","c"],[0,"foo",0]]';
// console.log(raw_test);
// var parsed_test = parse(raw_test);
// console.log(parsed_test);
// var stringified_test = stringify(parsed_test, 'schema');
// console.log(stringified_test);

// addSchema('["schema","child",["child_a","child_b"],[0,0]]');
// addSchema('["schema","parent",["parent_a","parent_b"],["child","child"]]');

// var test_data = [
// {
// 	parent_a: {
// 		child_a: [1,2,3,4],
// 		child_b: "foobar"
// 	},
// 	parent_b: {
// 		child_a: null,
// 		child_b: true
// 	}
// },
// {
// 	parent_a: {
// 		child_a: ["one", "two", "three"],
// 		child_b: "barbaz"
// 	},
// 	parent_b: null
// }
// ];
// console.log(test_data);
// console.log(stringify(test_data, '[]parent'));
// console.log(parse(stringify(test_data, '[]parent')));

// exports
return global.KSON = {
	addCodec: addCodec,
	addSchema: addSchema,
	parse: parse,
	stringify: stringify,
	encoders: ENCODERS,
	decoders: DECODERS
};

})(this);
