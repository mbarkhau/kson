(function() {
	var win = window, doc = win.document;

	var IDX = 0, STATE = 'json';

	function compile_schema(schema) {
		var s_fields = schema['fields'];
		var s_meta = schema['meta'];
		var fields = [];
		var meta = [];
		if (_.isPlainObject(s_fields)) {
			_.forEach(s_fields, function(i, k, l) {
				meta[meta.length] = s_fields[k] || 0;
				fields[fields.length] = k;
			});
		} else {
			fields = s_fields;
		}
		if (s_meta) {
			meta = s_meta;
		}
		while (meta.length < fields.length) {
			meta[meta.length] = 0;
		}
		return win.KSON.stringify({
			'id': schema['id'],
			'fields': fields,
			'meta': meta
		}, 'schema');
	}

	function update_stats(ctx, data) {
		var $stats = ctx.$node.find(".ke-stats"),
			itemcount = ctx.example.data.length,
			compiled_data = JSON.stringify(data, null, 0),
			size_per_entry = compiled_data.length / itemcount,
			overhead_bytes = 2;

		$stats.find(".ke-overhead-bytes").text("" + overhead_bytes);
		$stats.find(".ke-data-bytes").text("" + size_per_entry);
		$stats.find(".ke-breakeven-bytes").text("" + "test");
	};

	function reset_example(ctx) {
		var ex = ctx.example,
			description = ex.description,
			init_code = [];
		STATE = 'json';

		$(($(".ke-ctrl-switcher")
			.removeClass("ke-ctrl-json")
			.removeClass("ke-ctrl-kson")
		)[IDX]).addClass("ke-ctrl-json");

		ctx.$node.data('state', 'json');
		ctx.$node.find(".ke-it-state").html("JSON");
		if (!ex.schema_editor) {
			ex.schema_editor = CodeMirror(
				ctx.$node.find(".ke-schema-wrap")[0],
				{mode: "javascript", lineWrapping: true}
			);
		}
		if (!ex.data_editor) {
			ex.data_editor = CodeMirror(
				ctx.$node.find(".ke-data-wrap")[0],
				{mode: {name: "javascript", json: true}, lineWrapping: true}
			);
		}
		ex.init_code = init_code.join("\n");
		ex.input_data = json_str(ex.data);

		ex.schema_editor.setValue(ex.init_code);
		ex.data_editor.setValue(ex.input_data);
		update_stats(ctx, ex.data);
	}

	function get_example_ctx(idx) {
		var ex = EXAMPLES[idx];
		if (idx > 0) {
			ex.schema_editor = EXAMPLES[0].schema_editor;
			ex.data_editor = EXAMPLES[0].data_editor;
		}
		return {
			idx: idx,
			example: ex,
			$node: $("#ke-editor"),
			init_code: ex.schema_editor && ex.schema_editor.getValue(),
			input_data: ex.data_editor && ex.data_editor.getValue(),
		};
	}

	var bench_mean_ms = [];

	function update_bench_results() {
		var max_mean = Math.max.apply(null, bench_mean_ms);
		console.log("bench", max_mean, bench_mean_ms);
		return;
		$(".ke-bench .ke-stat-bar").each(function(idx, elem) {
			elem.css({'width': "2%", 'right': "-1%", 'display': "block"});

			console.log("bench", name, mean_ms, err_ms, this.stats.rme);
			console.log(ctx.bench_data.length, mean_ms / ctx.bench_data.length,
						this.stats);

			// defer update so browser sees the bar with previous width
			setTimeout(function() {
				bar_node.css({'width': "50%"});
			}, 0);
		});
	};

	function run_bench(ctx, idx, setup_code, fn_code) {
		var label_node = $(ctx.$node.find(".ke-stat-bar-label")[idx]),
			bar_node = $(ctx.$node.find(".ke-stat-bar")[idx]),
			err_node = bar_node.find('.ke-stat-bar-err'),
			val_node = label_node.find('.ke-stat-bar-label-val'),
			name_node = label_node.find('.ke-stat-bar-label-name'),
			name = fn_code.split("(").shift();

		name_node.html(name);

		(new Benchmark(name, {
			'setup': setup_code,
			'fn': fn_code,
			'maxTime': 0.01,
			'minSamples': 5,
			'onComplete': function() {
				var mean_ms = 1000 * this.stats.mean,
					err_ms = mean_ms * (this.stats.rme / 100),
					res = {mean_ms: mean_ms, err_ms: err_ms};

				bar_node.data('bench_results', res);
				val_node.html(
					Math.round(mean_ms) + "±" + Math.round(err_ms) + "ms"
				);

				bench_mean_ms.push(mean_ms);
				update_bench_results();
			}
		})).run();
	}

	function benchmark(e) {
		var ctx = get_example_ctx(IDX);
		eval(ctx.init_code);
		var data = ctx.example.data;
		while (data.length < 1000) {
			data = data.concat(data);
		}
		ctx.bench_data = data;

		var kson_data = KSON.stringify(data, ctx.example.root_id),
			json_data = JSON.stringify(data),
			setup_code = [
				"var data = " + json_data + ";",
				"var root_id = '" + ctx.example.root_id + "';",
				"var json_data = '" + json_data + "';",
				"var kson_data = '" + kson_data + "';",
			].join("\n"),
			fn_codes = [
				"KSON.stringify(data, root_id);",
				"JSON.stringify(data);",
				"KSON.parse(kson_data);",
				"JSON.parse(json_data);",
			];


		// reset bench contents
		var bar_nodes = ctx.$node.find(".ke-stat-bar"),
			err_nodes = ctx.$node.find('.ke-stat-bar-err');

		bar_nodes.css({'width': "0"});
		err_nodes.css({'width': "0", 'right': "0", 'display': "none"});

		bench_mean_ms = [];

		// loop over benchmarks
		(function run_next_bench(idx) {
			if (idx >= fn_codes.length) {return;}
			console.log(idx);
			var d = $.Deferred();
			d.done(function() {run_next_bench(idx + 1);});
			run_bench(ctx, idx, setup_code, fn_codes[idx]);
			setTimeout(function(){d.resolve();}, 150);
		})(0);
	}

	function main() {
		reset_example(get_example_ctx(IDX));

		$(".ke-controls .ke-ctrl-switcher").click(function(e) {
			var new_idx = parseInt(e.target.innerText) - 1;
			if (new_idx != IDX) {
				IDX = new_idx;
				reset_example(get_example_ctx(IDX));
			} else {
				STATE = (STATE == 'kson' ? 'json' : 'kson');
				var ctx = get_example_ctx(IDX),
					switcher = $($(".ke-ctrl-switcher")[IDX]);
				eval(ctx.init_code);
				ctx.$node.data('state', STATE);
				ctx.$node.find(".ke-it-state").html(STATE.toUpperCase());
				if (STATE == 'json') {
					ctx.example.data_editor.setValue(
						json_str(KSON.parse(ctx.input_data))
					);
					update_stats(ctx, KSON.parse(ctx.input_data));
					switcher.removeClass("ke-ctrl-kson")
							.addClass("ke-ctrl-json");
				} else {
					var kson_data = JSON.parse(KSON.stringify(
						JSON.parse(ctx.input_data), root_id
					));
					ctx.example.data_editor.setValue(json_str(kson_data));
					update_stats(ctx, kson_data);
					switcher.removeClass("ke-ctrl-json")
							.addClass("ke-ctrl-kson");
				}
			}
		});

		$(".ke-controls .ke-ctrl-convert").click(function(e) {
			var ctx = get_example_ctx(IDX),
				switcher = $($(".ke-ctrl-switcher")[IDX]);

			// is expected to set the 'root_id' var
			eval(ctx.init_code);

			if (ctx.$node.data('state') == 'json') {
				ctx.$node.data('state', 'kson');
				ctx.$node.find(".ke-it-state").html("KSON");
				ctx.$node.find(".ke-ctrl-convert").html("KSON.parse");
				var kson_data = JSON.parse(KSON.stringify(
					JSON.parse(ctx.input_data), root_id
				));
				ctx.example.data_editor.setValue(json_str(kson_data));
				update_stats(ctx, kson_data);
				switcher.removeClass("ke-ctrl-json")
							.addClass("ke-ctrl-kson")
			} else {
				ctx.$node.data('state', 'json');
				ctx.$node.find(".ke-it-state").html("JSON");
				ctx.$node.find(".ke-ctrl-convert").html("KSON.stringify");
				ctx.example.data_editor.setValue(
					json_str(KSON.parse(ctx.input_data))
				);
				update_stats(ctx, KSON.parse(ctx.input_data))
				switcher.removeClass("ke-ctrl-kson")
						.addClass("ke-ctrl-json");
			}
			benchmark();
		});
		$(".ke-controls .ke-ctrl-derive").click(function(e) {
			console.log("Derive Schema");
		});
	};

	(function loader() {
		if (win.jQuery && win.CodeMirror) {return main();}
		setTimeout(loader, 20);
	})();
}());