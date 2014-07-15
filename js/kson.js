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
(function (global, module) {

"use strict";

// Encoder/decoder functions are Factory functions that are initialized
// when the schema is loaded. They return function closures that are used
// for the actual decoding.
var CODERS = {
		'enum': function(args) {
			var i = args.unshift(0), arg_indexes = {};
			for (;i--;) {
				arg_indexes[args[i]] = i;
			}
			return function (val, enc) {
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
	},
	SCHEMAS = {
		schema: {
			id: 'schema',
			fields: ['id', 'fields', 'meta'],
			meta: [0, "[]", "[]"]
		}
	},
	plain_id = function(id) {
		return id[0] == "[" ? id.slice(2) : id;
	};


function base_coder(args, codec_id) {
	return function (val, enc) {
		return (
			val == null           ? val :
			codec_id == 'bool'    ? (enc ? val && 1 || 0 : val && true || false) :
			codec_id == 'int36'   ? (enc ? val.toString(36) : parseInt(val, 36)) :
			codec_id == 'date'    ? (enc ? Math.round(val / 1000) : new Date(val * 1000)) :
			codec_id == 'isodate' ? (enc ? val.toISOString(): new Date(Date.parse(val))) :
			val
		);
	};
}

function coder_fn(coders) {
	return function (val, dir) {
		// dir < 0 : encode, dir > 0 : decode
		var len = coders.length,
			i = dir > 0 ? 0 : len - 1,
			end = dir > 0 ? len : -1

		for (; i != end; i += dir) {
			val = coders[i](val, dir != 1);
		}
		return val;
	};
}

function init_coder(meta_id) {
	if (!meta_id || SCHEMAS[meta_id]) {
		return;
	}

	var metas = meta_id.match(/(\\.|[^\|])+/g),
		coder_id, args, coders = [],
		i = metas.length - 1, j;

	for (; i >= 0; i--) {
		coder_id = metas[i];
		args = coder_id.match(/(\\.|[^:])+/g);
		coder_id = args[0];

		if (!coder_id || SCHEMAS[coder_id]) {
			return;
		}

		args = args.slice(1);
		// remove escape chars
		for (j = args.length - 1; j >= 0; j--) {
			args[j] = args[j].replace("\\", "");
		}

		coders.push((CODERS[coder_id] || base_coder)(args, coder_id));
	}

	CODERS[meta_id] = coder_fn(coders);
}

function init_coders(schema) {
	var meta = schema.meta = schema.meta || [],
		i = schema.fields.length - 1;
	for (; i >= 0; i--) {
		meta[i] = meta[i] || 0;
		init_coder(plain_id(meta[i]));
	}
}

function process_val(val, meta_id, recurse, dir) {
	// dir < 0 : encode, dir > 0 : decode
	var i, p_meta_id = plain_id(meta_id),
		coder = CODERS[p_meta_id];

	if (coder && p_meta_id != meta_id) {
		val = val.slice(0); // copy so original reference isn't modified
		for (i = val.length - 1; i >= 0; i--) {
			val[i] = coder(val[i], dir);
		}
		return val;
	}
	return (
		val == null ? val :
		SCHEMAS[p_meta_id] ? recurse(val, meta_id, 1) :
		coder ? coder(val, dir) : val
	);
}

function stringify(data, schema_id, is_subarray) {
	var p_schema_id = plain_id(schema_id),
		schema = SCHEMAS[p_schema_id],
		fields = schema.fields,
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
	var data_length = data.length,
		fields_length = fields.length;

	for (; i < data_length; i++) {
		obj = data[i];
		for (j = 0; j < fields_length; j++) {
			result.push(process_val(
				obj[fields[j]], schema.meta[j], stringify, -1
			));
		}
	}
	return (is_subarray) ? result : JSON.stringify(result);
}

function parse(raw, schema_id, recurse) {
	var data = (typeof raw == 'string') ? JSON.parse(raw) : raw,
		data_length = data.length,
		result = [], tmp_obj,
		i = recurse ? 0 : 1, j;

	if (!schema_id) {
		schema_id = data[0];
	}

	var p_schema_id = plain_id(schema_id),
		schema = SCHEMAS[p_schema_id],
		fields = schema.fields,
		fields_length = fields.length;

	for (; i < data_length; i += fields_length) {
		tmp_obj = {};
		for (j = 0; j < fields_length; j++) {
			tmp_obj[fields[j]] = process_val(
				data[i + j], schema.meta[j], parse, 1
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
	// TODO: with circular schema definitions
	//		we may want to insert the prototype automatically
	//		or at least raise an explicit error.
	if (typeof schema === 'string') {
		schema = parse(schema);
	}
	if (schema instanceof Array) {
		for (var i = 0; i < schema.length; i++) {
			addSchema(schema[i]);
		}
	} else {
		SCHEMAS[schema.id] = schema;
		init_coders(schema);
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
