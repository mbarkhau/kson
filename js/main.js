(function(global) {
	var data_state = 'json';
	var current_data;

	var data_editor;
	var schema_editor;
	var kson_script_overhead;
	var doc_elem_count = 100;

	function init_script_overhead() {
		jQuery.ajax({
			'method': 'GET',
			'url': "js/kson.min.js",
			'dataType': "text"			// prevents script evaluation
		}).done(
			// TODO (mbarkhau 2016-01-02):
			//		use this to measure current connection
			function(data) {
				kson_script_overhead = data.length;
				console.log("overhead_init");
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
		var raw_json = JSON.stringify(data);

		var bench_data = JSON.parse(JSON.stringify(data));
		if (!bench_data instanceof Array) {
			bench_data = [bench_data];
		}
		var bench_data_len = bench_data.length;
		var grow_by_elems = doc_elem_count - bench_data_len;

		for (var i = 0; i < grow_by_elems; i++) {
			var rand_idx = Math.floor(Math.random() * bench_data_len);
			bench_data.push(bench_data[rand_idx]);
		}
		if (grow_by_elems < 0) {
			bench_data = bench_data.slice(0, bench_data_len + grow_by_elems)
		}

		var raw_kson_bench_data = KSON.stringify(
			bench_data, global.root_schema_id
		);
		var raw_json_bench_data = JSON.stringify(bench_data);
		return {
			parsed: data,
			schema_init_code: schema_init_code,

			raw_kson: raw_kson,
			pretty_kson: kson_util.json_str(JSON.parse(raw_kson)),
			raw_json: JSON.stringify(data),
			pretty_json: kson_util.json_str(data),

			raw_kson_bench_data: raw_kson_bench_data,
			raw_json_bench_data: raw_json_bench_data,
			gz_kson: pako.deflate(kson_util.str2ab(raw_kson_bench_data)),
			gz_json: pako.deflate(kson_util.str2ab(raw_json_bench_data))
		}
	}

	function update_stats() {
		current_data = parse_editors();
		if (!(kson_script_overhead && current_data)) {
			// wait for ajax call to finish
			return
		}

		// TODO (mbarkhau 2015-12-30): revisit overhead calculation
		//  	after client script compilation is implemented.
		var kson_schema_overhead = current_data.schema_init_code.length;
		var overhead = kson_script_overhead + kson_schema_overhead;
		var json_doc_bytes = current_data.raw_json.length;
		var kson_doc_bytes = current_data.raw_kson.length;
		var itemcount = current_data.parsed.length;
		var json_bpi = json_doc_bytes / itemcount;
		var kson_bpi = kson_doc_bytes / itemcount;

		$('.ke-kson-bytes-per-item').text(kson_bpi.toFixed(2));
		$('.ke-json-bytes-per-item').text(json_bpi.toFixed(2));

		$('.ke-stats').css('visibility', 'visible');
	}

	function reset_example(example) {
		data_state = 'json';
		$(".ke-example-controls .ke-ctrl-switcher")
			.removeClass('ke-ctrl-active');
		example.control_node.addClass('ke-ctrl-active');
		$('.ke-ctrl-convert').text("KSON.stringify");

		schema_editor.setValue(
			kson_util.compile_example_init_code(example)
		);
		data_editor.setValue(
			kson_util.json_str(example.data)
		);

		update_stats();
		kson_update_graphs(kson_reset_bench_values());
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
			example.control_node.click(
				$.proxy(reset_example, null, example)
			);
		}
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
		global.test_test = data_editor;
		schema_editor = CodeMirror(
			editors_node.find(".ke-schema-wrap")[0],
			{mode: "javascript", lineWrapping: true}
		);
		editors_node.css('visibility', 'visible');
	};

	function init_controls() {
		var convert_ctrl = $('.ke-ctrl-convert');
		var data_info_tag = $('.ke-it-state');
		var doc_size_ctrl = $('.ke-ctrl-doc-size')

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

		doc_size_ctrl.change(function() {
			doc_elem_count = parseInt(doc_size_ctrl.val());
			update_stats();
			kson_update_graphs(kson_recalc_bench_values());
		});
	};

	global.kson_main = function() {
		console.log('kson_main');
		kson_init_editors();
		init_examples();
		init_controls();
		reset_example(KSON_EXAMPLES[2]);
		init_script_overhead();
	};
}(this));
