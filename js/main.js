(function() {
	var win = window,
		doc = win.document;

//	function addHandler(obj, name, cb) {
//		var cbwrap = function(e) {
//			return cb(e || win['event']);
//		};
//		if (doc.addEventListener) {
//			obj.addEventListener(name, cbwrap, false);
//		} else {
//			name = "on" + (({
//				focus: "focusin",
//				blur: "focusout",
//				DOMContentLoaded: "readystatechange"
//			})[name] || name);
//			obj.attachEvent(name, cbwrap);
//		}
//	}

	function json_str(obj) {
		return JSON.stringify(obj, null, 2);
	};

	function update_stats(ctx, data) {
		var compiled_data = JSON.stringify(data, null, 0);
		//console.log("stats", ctx.$node.find(".ke-stats .ke-data-bar"));
		//console.log("stats", compiled_data.length, compiled_data.slice(0, 30));
		ctx.$node.find(".ke-stats .ke-data-bar").val("" + compiled_data.length);
	};

	function reset_example(ctx) {
		var ex = ctx.example,
			description = ex.description,
			init_code = [];

		if (description) {
			if ($.isArray(description)) {
				description = description.join("\n// ");
			}
			init_code.push("// " + description + "\n");
		}
		init_code.push(
			"var root_schema_id = \"" + ex.root_schema_id + "\";\n"
		);

		if (ex.coders) {
			for (var i = 0; i < ex.coders.length; i++) {
				var coder = ex.coders[i],
					fn_str = coder.fn.toString().replace(/\t/g, "  ");
				init_code.push(
					"KSON.coders[\"" + coder.id + "\"] = " + fn_str + ";\n"
				);
			};
		}
		if (ex.schemas) {
			init_code.push(
				"KSON.addSchema(" + json_str(ex.schemas) + ");"
			);
		}

		ctx.$node.data('state', 'json');
		ctx.$node.find(".ke-it-state").html("JSON");
		if (!ex.schema_editor) {
			ex.schema_editor = CodeMirror(
				ctx.$node.find(".ke-schema-wrap")[0],
				{mode:  "javascript"}
			);
			ex.data_editor = CodeMirror(
				ctx.$node.find(".ke-data-wrap")[0],
				{mode: {name: "javascript", json: true}}
			);
		}
		ex.schema_editor.setValue(init_code.join("\n"));
		ex.data_editor.setValue(json_str(ex.data));
		update_stats(ctx, ex.data);
	}
	function get_example_ctx(node) {
		node = node.target && node.target.parentNode.parentNode || node;
		var $node = $(node),
			idx = $node.index(".kson-example", node),
			ex = win.KSON_EXAMPLES[idx];

		return {
			idx: idx,
			example: ex,
			node: node,
			$node: $node,
			init_code: ex.schema_editor && ex.schema_editor.getValue(),
			input_data: ex.data_editor && ex.data_editor.getValue(),
		};	
	}

	var bench_mean_ms = [];

	function update_bench_results($node) {
		$node.find(".ke-stat-bar").each(function(ids, elem) {
			err_node.css({'width': "2%", 'right': "-1%", 'display': "block"});

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
			'maxTime': 0.3,
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
				update_bench_results(ctx.$node);
			}
		})).run();
	}

	function benchmark(e) {
		var ctx = get_example_ctx(e);
		eval(ctx.init_code);
		var data = ctx.example.data;
		while (data.length < 1000) {
			data = data.concat(data);
		}
		ctx.bench_data = data;

		var kson_data = KSON.stringify(data, ctx.example.root_schema_id),
			json_data = JSON.stringify(data),
			setup_code = [
				"var data = " + json_data + ";",
				"var root_schema_id = '" + ctx.example.root_schema_id + "';",
				"var json_data = '" + json_data + "';",
				"var kson_data = '" + kson_data + "';",
			].join("\n"),
			fn_codes = [
				"KSON.stringify(data, root_schema_id);",
				"JSON.stringify(data);",
				"KSON.parse(kson_data);",
				"JSON.parse(json_data);",
			];


		// reset bench contents
		var bar_nodes = $node.find(".ke-stat-bar"),
			err_nodes = $node.find('.ke-stat-bar-err');

		bar_nodes.css({'width': "0"});
		err_nodes.css({'width': "0", 'right': "0", 'display': "none"});

		bench_mean_ms = [];

		// loop over benchmarks
		(function run_next_bench(idx) {
			if (idx >= fn_codes.length) {return;}
			var d = $.Deferred();
			d.done(function() {run_next_bench(idx + 1);});
			run_bench(ctx, idx, setup_code, fn_codes[idx]);
			setTimeout(function(){d.resolve();}, 150);
		})(0);
	}

	function main() {
		// TODO: setup widget html in js

		$(".kson-example").each(function(idx, node) {
			reset_example(get_example_ctx(node));
		});

		$(".ke-controls button.ke-ctrl-bench").click(benchmark);
		$(".ke-controls button.ke-ctrl-reset").click(function(e) {
			var ctx = get_example_ctx(e);
			return reset_example(ctx);
		});
		$(".ke-controls button.ke-ctrl-convert").click(function(e) {
			var ctx = get_example_ctx(e);

			// is expected to set the 'root_schema_id' var
			eval(ctx.init_code);

			if (ctx.$node.data('state') == 'json') {
				ctx.$node.data('state', 'kson');
				ctx.$node.find(".ke-it-state").html("KSON");
				ctx.$node.find(".ke-ctrl-convert").html("KSON.parse");
				var kson_data = JSON.parse(KSON.stringify(
					JSON.parse(ctx.input_data), root_schema_id
				));
				ctx.example.data_editor.setValue(json_str(kson_data));
				update_stats(ctx, kson_data);
			} else {
				ctx.$node.data('state', 'json');
				ctx.$node.find(".ke-it-state").html("JSON");
				ctx.$node.find(".ke-ctrl-convert").html("KSON.stringify");
				ctx.example.data_editor.setValue(
					json_str(KSON.parse(ctx.input_data))
				);
				update_stats(ctx, KSON.parse(ctx.input_data));
			}
		});
	};

	(function loader() {
		if (win.CodeMirror && win.jQuery && win.KSON && win.KSON_EXAMPLES) {
			return main();
		}
		setTimeout(loader, 10);
	})();
}());