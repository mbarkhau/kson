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
( // Module boilerplate to support browser globals and browserify and AMD.
  typeof define === "function" ? function (m) { define("kson-js", m); } :
  typeof exports === "object" ? function (m) { module.exports = m(); } :
  function(m){ this.KSON = m(); }
)(function () {

// Encoder/decoder functions are Factory functions that are initialized
// when the schema is loaded. They return function closures that are used
// for the actual decoding.
var ENCODERS = {
		'enum': function(args) {
			return function (raw) {return args.indexOf(raw);};
		},
		'prefix': function (args) {
			var prefix = new RegExp("^" + args[0])
			return function (val) {
				return val.replace(prefix, "");
			};
		},
		'suffix': function (args) {
			var suffix = new RegExp(args[0] + "$")
			return function (val) {
				return val.replace(suffix, "");
			};
		},
		'date': function(val) {
			return (+val).toString(36);
		}
	},
	DECODERS = {
		'enum': function(args) {
			return function (val) {return args[val]; };
		},
		'prefix': function (args) {
			return function (raw) {return args[0] + raw;};
		},
		'suffix': function (args) {
			return function (raw) {return raw + args[0];};
		},
		'date': function(raw) {
			return new Date(parseInt(raw, 36));
		}
	},
	SCHEMAS = {};

function addCodec(name, encoder, decoder){
	ENCODERS[name] = encoder;
	DECODERS[name] = decoder;
}

function addSchema(schema) {
	if (typeof schema === 'string') {
		schema = parse(schema);
	}
	if (typeof schema.id == 'undefined') {
		// assume array of schemas
		for (var i = schema.length - 1; i >= 0; i--) {
			addSchema(schema[i]);
		};
	} else {
		initCodecs(schema);
		SCHEMAS[schema.id] = schema;
	}
}

function plain_id(id) {
	return id && (id[0] == "[" ? id.slice(2) : id);
}

function coder_fn(coders, dir) {
	return function (val) {
		var len = coders.length,
			i = dir > 0 ? 0 : len - 1,
			end = dir > 0 ? len : -1;

		for (; i != end; i += dir) {
			val = coders[i](val);
		}
		return val;
	};
}

function initCodecs(schema) {
	var i, j, k, meta_id, id, metas, args, encoders, decoders;
	for (i = schema.meta.length - 1; i >= 0; i--) {
		meta_id = plain_id(schema.meta[i]);
		if (!meta_id) {
			continue;
		}
		metas = meta_id.match(/(\\.|[^\|])+/g);
		if (ENCODERS[metas[0]] || ENCODERS[meta_id]) {
			continue;
		}
		encoders = [];
		decoders = [];
		for (j = metas.length - 1; j >= 0; j--) {
			args = metas[j].match(/(\\.|[^:])+/g);
			id = args[0];
			if (!ENCODERS[id]) {return}
			args = args.slice(1);
			// remove escape chars
			for (var k = args.length - 1; k >= 0; k--) {
				args[k] = args[k].replace("\\:", ":");
			}
			encoders[j] = ENCODERS[id](args);
			decoders[j] = DECODERS[id](args);
		}

		ENCODERS[meta_id] = coder_fn(encoders, 1);
		DECODERS[meta_id] = coder_fn(decoders, -1);
	};
}

function process_val(val, meta_id, codecs, subprocess) {
	var i, p_meta_id = plain_id(meta_id),
		coder = codecs[p_meta_id];
	if (val !== null && val !== undefined) {
		if (SCHEMAS[p_meta_id]) {
			val = subprocess(val, meta_id, 1);
		} else if (coder) {
			if (p_meta_id == meta_id) {
				val = coder(val);
			} else {
				val = val.slice(0); // clone so we don't modify argument
				for (i = val.length - 1; i >= 0; i--) {
					val[i] = coder(val[i]);
				}
			}
		}
	}
	return val;
}

function stringify(data, schema_id, is_subarray) {
	var p_schema_id = plain_id(schema_id),
		schema = SCHEMAS[p_schema_id],
		fields = schema.fields,
		fields_length = fields.length,
		meta = schema.meta,
		i, j, obj,
		result = [];

	if (!is_subarray) {
		result[0] = schema_id;
	}
	if (p_schema_id == schema_id) {
		data = [data];
	}
	var data_length = data.length;

	for (i = 0; i < data_length; i++) {
		obj = data[i];
		for (j = 0; j < fields_length; j++) {
			result.push(process_val(
				obj[fields[j]], meta[j], ENCODERS, stringify
			));
		}
	}
	return (is_subarray) ? result : JSON.stringify(result);
}

function parse(raw, schema_id) {
	var data = (typeof raw == 'string') ? JSON.parse(raw) : raw,
		data_length = data.length,
		result = [], tmp_obj,
		i = 0, j;

	if (!schema_id) {
		schema_id = data[0];
		i = 1;
	}
	var p_schema_id = plain_id(schema_id),
		schema = SCHEMAS[p_schema_id],
		fields = schema.fields,
		meta = schema.meta,
		fields_length = fields.length;

	for (; i < data_length; i += fields_length) {
		tmp_obj = {};
		for (j = 0; j < fields_length; j++) {
			tmp_obj[fields[j]] = process_val(
				data[i + j], meta[j], DECODERS, parse
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

// add the schema schema
addSchema({
	id: 'schema',
	fields: ['id', 'fields', 'meta'],
	meta: [0, "[]", "[]"]
});

// equivalent in KSON (if the schema schema were already bootstrapped)
// addSchema('["schema", ["id", "fields", "meta"], [0,0,0]]');

// exports
return {
	addCodec: addCodec,
	addSchema: addSchema,
	parse: parse,
	stringify: stringify
};

});
