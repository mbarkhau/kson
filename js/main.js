(function(global) {
	var data_state = 'json';
	var current_data;

	var data_editor;
	var schema_editor;
	var kson_script_overhead;

	function init_script_overhead() {
		jQuery.ajax({
			'method': 'GET',
			'url': "/js/kson.min.js",
			'dataType': "text"			// prevents script evaluation
		}).done(
			function(data) {
				kson_script_overhead = data.length;
				update_stats();
			}
		);
	}

	global.KSON_addSchema_wrapper = function(schema_arg) {
		if (schema_arg instanceof Array) {
			var root_schema = schema_arg[schema_arg.length - 1];
		} else {
			var root_schema = schema_arg;
		}
		global.root_schema_id = root_schema.id;
		return KSON.addSchema(schema_arg);
	};

	global.parse_editors = function() {
		if (!data_editor) {
			return
		}
		var raw_data = data_editor.getValue();
		var schema_init_code = schema_editor.getValue()
			.replace("KSON.addSchema", "KSON_addSchema_wrapper");
		eval(schema_init_code);
		var data;
		if (data_state == 'json') {
			data = JSON.parse(raw_data);
		} else if (data_state == 'kson') {
			data = KSON.parse(raw_data);
		} else {
			console.error("Unknown editor state '" + data_state + "'");
		}

		var raw_kson = KSON.stringify(data, global.root_schema_id);
		var raw_json = JSON.stringify(data)

		return {
			raw_kson: raw_kson,
			raw_json: JSON.stringify(data),
			// gz_kson: pako.deflate(kson_util.str2ab(raw_kson)),
			// gz_json: pako.deflate(kson_util.str2ab(raw_json)),
			pretty_json: kson_util.json_str(data),
			pretty_kson: kson_util.json_str(JSON.parse(raw_kson)),
			parsed: data,
			schema_init_code: schema_init_code
		}
	}

	function update_stats() {
		if (!kson_script_overhead) {
			// wait for ajax call to finish
			return
		}
		current_data = parse_editors();
		// TODO (mbarkhau 2015-12-30): revisit overhead calculation
		//  	after client script compilation is implemented.
		var kson_schema_overhead = current_data.schema_init_code.length;
		var overhead = kson_script_overhead + kson_schema_overhead;
		var itemcount = current_data.parsed.length;
		var json_bpi = current_data.raw_json.length / itemcount;
		var kson_bpi = current_data.raw_kson.length / itemcount;
		var breakeven_itemcount = overhead / (json_bpi - kson_bpi);
		var breakeven_bytes = json_bpi * breakeven_itemcount;

		$('.ke-json-data-bytes').text(json_bpi.toFixed(2));
		$('.ke-kson-data-bytes').text(kson_bpi.toFixed(2));
		$('.ke-breakeven-bytes').text(parseInt(breakeven_bytes, 10));

		$('.ke-stats').css('visibility', 'visible');
	}

	function reset_example(example) {
		data_state = 'json';
		$(".ke-example-controls .ke-ctrl-switcher").removeClass('ke-ctrl-json');
		example.control_node.addClass('ke-ctrl-json');

		schema_editor.setValue(
			kson_util.compile_example_init_code(example)
		);
		data_editor.setValue(
			kson_util.json_str(example.data)
		);
		update_stats();
	}

	function init_examples() {
		var control_container = $(".ke-example-controls");
		for (var i = 0; i < KSON_EXAMPLES.length; i++) {
			var example = KSON_EXAMPLES[i];
			example.control_node = $("<div>" + (i + 1) + "</div>");
			$(example.control_node)
				.addClass('ke-ctrl')
				.addClass('ke-ctrl-switcher');
			control_container.append(example.control_node);
			var click_handler = (function(example) {
				return function() {
					reset_example(example);
				};
			})(example);
			example.control_node.click(click_handler)
		};
	}

	// 'js/benchmark.js',
	// 'js/kson.js',
	// '//cdnjs.cloudflare.com/ajax/libs/lodash.js/3.3.0/lodash.min.js',
	function kson_init_editors() {
		console.log('kson_init_editors');
		var editors_node = $("#ke-editor");
		data_editor = CodeMirror(
			editors_node.find(".ke-data-wrap")[0],
			{mode: {name: "javascript", json: true}, lineWrapping: true}
		);
		schema_editor = CodeMirror(
			editors_node.find(".ke-schema-wrap")[0],
			{mode: "javascript", lineWrapping: true}
		);
		editors_node.css('visibility', 'visible');
	};

	function init_controls() {
		var convert_ctrl = $('.ke-ctrl-convert');
		var data_info_tag = $('.ke-it-state');

		convert_ctrl.click(function() {
			current_data = parse_editors();

			if (data_state == 'json') {
				data_state = 'kson';
				convert_ctrl.text("KSON.parse");
				data_info_tag.text("KSON");
				data_editor.setValue(current_data.pretty_kson);
			} else if (data_state == 'kson') {
				data_state = 'json';
				convert_ctrl.text("KSON.stringify");
				data_info_tag.text("JSON");
				data_editor.setValue(current_data.pretty_json);
			} else {
				console.error("Unknown editor state '" + data_state + "'");
			}
			update_stats();
		});
	};

	global.kson_main = function() {
		console.log('kson_main');
		kson_init_editors();
		init_examples();
		init_controls();
		reset_example(KSON_EXAMPLES[0]);
		init_script_overhead();
	};
}(this));
