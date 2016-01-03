(function(global) {
	function json_str(obj) {
		return JSON.stringify(obj, null, 2);
	}

	function compile_example_init_code(example) {
		var init_code = [];
		var description = example.description;

		if (description) {
			if ($.isArray(description)) {
				description = description.join("\n// ");
			}
			init_code.push("// " + description + "\n");
		}

		if (example.coders) {
			for (var i = 0; i < example.coders.length; i++) {
				var coder = example.coders[i];
				var fn_str = coder.fn.toString().replace(/\t/g, "  ");
				init_code.push(
					"KSON.coders[\"" + coder.id + "\"] = " + fn_str + ";\n"
				);
			};
		}
		if (example.schemas) {
			init_code.push(
				"KSON.addSchema(" + json_str(example.schemas) + ");"
			);
		}
		return init_code.join("\n");
	}

	/*
	 * By AJ ONeal @coolaj86
	 *
	 * https://coolaj86.com/articles/unicode-string-to-a-utf-8-typed-array-buffer-in-javascript/
	 */
	function unicodeStringToTypedArray(s) {
		var escstr = encodeURIComponent(s);
		var binstr = escstr.replace(/%([0-9A-F]{2})/g, function(match, p1) {
			return String.fromCharCode('0x' + p1);
		});
		var ua = new Uint8Array(binstr.length);
		Array.prototype.forEach.call(binstr, function (ch, i) {
			ua[i] = ch.charCodeAt(0);
		});
		return ua;
	}
	function deflate(data) {
		// level 1 is the default compression level used by nginx
		// http://nginx.org/en/docs/http/ngx_http_gzip_module.html#gzip_comp_level
		return pako.deflate(unicodeStringToTypedArray(data), {level: 1});
	}

	global.kson_util = {
		json_str: json_str,
		compile_example_init_code: compile_example_init_code,
		str2ab: unicodeStringToTypedArray,
		deflate: deflate
	};
}(this));