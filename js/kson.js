/**
 * Copyright (c) 2013, Manuel Barkhau <mbarkhau@gmail.com>
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * CONSEQUENTIAL DAMAGES LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 *
 * KSON: Keyless Schemafied Object Notation
 *
 * A serialization format with two goals in mind:
 *	1. Easily parsable using only a small javascript library.
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
(function (global, module) {

"use strict";

var SCHEMAS = {
		// default schema (meta) schema
		// needed to parse schemas in KSON format
		schema: {
			id: 'schema',
			fields: ['id', 'fields', 'meta'],
			meta: [0, "[]", "[]"]
		}
	},
	// Encoder/decoder functions are Factory functions that are
	// initialized when a schema is loaded. They return function
	// closures that are used for the actual encoding/decoding.
	CODERS = {
		'enum': function(args) {
			var i = args.unshift(0),
				arg_indexes = {};
			for (;i--;) {
				arg_indexes[args[i]] = i;
			}
			return function (val, enc) {
				// If the value is not enumerated in the definition
				// the value is used as is. This is an issue if the
				// field value is an int within the range of the
				// enumerated values as it will be decoded incorrectly.
				return (enc ?
					arg_indexes[val] || val:
					args[val] || val
				);
			};
		},
		'prefix': function (args) {
			var prefix = new RegExp("^" + args[0]);
			return function (val, enc) {
				return enc ? val.replace(prefix, "") : args[0] + val;
			};
		},
		'suffix': function (args) {
			var suffix = new RegExp(args[0] + "$");
			return function (val, enc) {
				return enc ? val.replace(suffix, "") : val + args[0];
			};
		}
		// TODO: add build options to include various coders
		// I don't think this one will be used often enough to warrant
		// inclusion in the default build.

		// 'offsetint': function (args) {
		// 	var offset = parseInt(args[0], 10);
		// 	return function (val, enc) {
		// 		return enc ? val - offset : val + offset;
		// 	};
		// },
	},
	// This holds the results of calls to 'coder_fn' based
	// on configurations used by schemas.
	meta_coders = {};


function plain_id(id) {
	return id[0] == "[" ? id.slice(2) : id;
}

function base_coder(args, codec_id) {
	return function (val, enc) {
		return (
			val == null ?
				val
			: codec_id == 'bool' ?
				(enc ? val && 1 || 0			: val && true || false)
			// Numbers less than 100 000 000 are shorter or equivalent
			// in length to a base 36 encoded number in base 10, because
			// base 36 requires two extra bytes for the quotes. One could
			// do a decoder which will parse strings as base36 and numbers
			// are just returned as is, and an encoder which will only
			// .toString(36) for values > 10^8
			//: codec_id == 'int36' ?
			//	(enc ? val.toString(36) 		: parseInt(val, 36))
			: codec_id == 'date' ?
				(enc ? Math.round(val / 1000) 	: new Date(val * 1000))
			: codec_id == 'isodate' ?
				(enc ? val.toISOString() 		: new Date(Date.parse(val)))
			: val
		);
	};
}


// Parses the coder definitions
function init_meta_coders(schema) {
	function init_meta_coder(meta_id) {
		function coder_fn(coders) {
			return function (val, dir) {
				// dir < 0 : encoed
				// dir > 0 : decode
				var len = coders.length,
					cur = dir > 0 ? 0 : len - 1,
					end = dir > 0 ? len : -1

				for (; cur != end; cur += dir) {
					val = coders[cur](val, dir != 1);
				}
				return val;
			};
		}

		function parse_coders() {
			// multiple coders for same field are separated by "|" (pipe characters)
			var metas = meta_id.match(/(\\.|[^\|])+/g),
				coder_id, args, coders = [],
				i = metas.length, j;

			for (; i--;) {
				coder_id = metas[i];
				args = coder_id.match(/(\\.|[^:])+/g);
				coder_id = args[0];

				// strip off coder id leaving only coder arguments
				args = args.slice(1);
				// remove escape chars
				for (j = args.length; j--;) {
					args[j] = args[j].replace("\\", "");
				}

				coders.push((CODERS[coder_id] || base_coder)(args, coder_id));
			}
			return coders;
		}
		if (
			meta_id 				// 0 placeholder (no coder)
			&& !SCHEMAS[meta_id]	// schema/not a coder
		) {
			meta_coders[meta_id] = coder_fn(parse_coders(meta_id));
		}
	}

	var meta = schema['meta'] = schema['meta'] || [],
		i = schema['fields'].length;
	for (;i--;) {
		(meta[i] = meta[i] || 0) && init_meta_coder(plain_id(meta[i]));
	}
}

function process_val(val, meta_id, recurse, dir) {
	// dir < 0 : encode, dir > 0 : decode
	var i, p_meta_id = plain_id(meta_id),
		coder = meta_coders[p_meta_id];

	if (coder && p_meta_id != meta_id) {
		val = val.slice(0); // copy so original reference isn't modified
		for (i = val.length; i--;) {
			val[i] = coder(val[i], dir);
		}
		return val;
	}
	return (
		val == null			? val :
		SCHEMAS[p_meta_id]	? recurse(val, meta_id, 1) :
		coder				? coder(val, dir) : val
	);
}

function stringify(data, schema_id, is_subarray) {
	var p_schema_id = plain_id(schema_id),
		i = 0, j, obj,
		result = [];

	if ((data instanceof Array) && schema_id[0] != "[") {
		schema_id = "[]" + schema_id;
	}
	if (!is_subarray) {
		result[0] = schema_id;
	}
	if (p_schema_id == schema_id) {
		data = [data];
	}
	var schema = SCHEMAS[p_schema_id],
		fields = schema['fields'],
		data_length = data.length,
		fields_length = fields.length;

	for (; i < data_length; i++) {
		obj = data[i];
		for (j = 0; j < fields_length; j++) {
			result.push(process_val(
				obj[fields[j]], schema['meta'][j], stringify, -1
			));
		}
	}
	return (is_subarray) ? result : JSON.stringify(result);
}

function parse(raw, schema_id, recurse) {
	var data = (typeof raw == 'string') ? JSON.parse(raw) : raw,
		result = [], tmp_obj,
		i = recurse ? 0 : 1, j;

	if (!schema_id) {
		schema_id = data[0];
	}

	var p_schema_id = plain_id(schema_id),
		schema = SCHEMAS[p_schema_id],
		fields = schema['fields'],
		data_length = data.length,
		fields_length = fields.length;

	for (; i < data_length; i += fields_length) {
		tmp_obj = {};
		for (j = 0; j < fields_length; j++) {
			tmp_obj[fields[j]] = process_val(
				data[i + j], schema['meta'][j], parse, 1
			);
		}

		if (schema_id != p_schema_id) {
			result.push(tmp_obj);
		} else {
			return tmp_obj;
		}
	}
	return result;
}

/**
 * Initialize a schema or an array of schemas from
 *  - a javascript object
 *  - a JSON encoded schema string
 *  - a KSON encoded schema string.
 */
function addSchema(schema) {
	// TODO: with circular schema definitions it may be
	//		better to insert the prototype automatically
	//		or at least raise an explicit error.
	if (typeof schema === 'string') {
		schema = parse(schema);
	}
	if (schema instanceof Array) {
		// Order is important here
		// (independent schemas must be loaded first)
		for (var i = schema.length; i--;) {
			addSchema(schema[i]);
		}
	} else {
		SCHEMAS[schema['id']] = schema;
		init_meta_coders(schema);
	}
}

// exports
global.KSON = module.exports = {
	coders: CODERS,
	addSchema: addSchema,

	parse: parse,
	stringify: stringify
};

})(this, typeof module == "undefined" ? {} : module);
