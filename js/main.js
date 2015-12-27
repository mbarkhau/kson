(function() {
	var win = window, doc = win.document;

	function date_str_coder() {
		function zpad(n) {
			return n > 9 ? n : "0" + n
		};
		return function (val, enc) {
			function intpart(i, j) {
				return parseInt(val.slice(i, j), 10);
			};
			return (enc ? (
					intpart(0, 5) * 10000 +
					intpart(5, 7) * 100 +
					intpart(8, 10)
				) : (
					Math.floor(val / 10000)
					+ "-" +
					zpad(Math.floor((val % 10000) / 100))
					+ "-" +
					zpad(Math.floor(val % 100))
				)
			);
		};
	}

	function date_str_param_coder(args) {
		var year_offset = parseInt(args[0] || 1500),
				year_mul = parseInt(args[1] || 12 * 32),
				month_mul = parseInt(args[2] || 12);

		function zpad(n) {return n > 9 ? n : "0" + n};
		return function (val, enc) {
			if (enc) {
				return (
					(parseInt(val.slice(0, 5), 10) - year_offset) * year_mul +
					parseInt(val.slice(5, 7), 10) * month_mul +
					parseInt(val.slice(8, 10), 10)
				);
			}
			var year = Math.floor(val / year_mul) + year_offset;
			val += year_offset * year_mul;
			return (
				year + "-" +
				zpad(Math.floor((val % year_mul) / month_mul)) + "-" +
				zpad(Math.floor(val % month_mul))
			);
		};
	}
	var CONTENT = [
	//KSON can minify your JSON by extracting redundancies into a schema definition. JSON is readable but not compact.
		'<div id="ke-examples" class="kson-editor">',
			'<div class="ke-data-wrap"></div>',
			'<div class="ke-schema-wrap"></div>',
			'<span class="ke-infotag ke-it-schema">Schema</span>',
			'<span class="ke-infotag ke-it-state">JSON</span>',
			'<div class="ke-controls">',
				'<div class="ke-ctrl ke-ctrl-convert">KSON.stringify</div>',
				'<div class="ke-ctrl ke-ctrl-switcher ke-ctrl-json">1</div>',
				'<div class="ke-ctrl ke-ctrl-switcher">2</div>',
				'<div class="ke-ctrl ke-ctrl-switcher">3</div>',
				'<div class="ke-ctrl ke-ctrl-switcher">4</div>',
				'<div class="ke-ctrl ke-ctrl-switcher">5</div>',
				'<div class="ke-ctrl ke-ctrl-derive">Derive</div>',
			'</div>',
		'</div>',
		'<div class="ke-stats">',
			'<div class="ke-size-info">',
			  '<p>',
				'<span>Size:</span>',
				'<span class="ke-data-bytes"></span>',
				'<span>byte/item</span>',
			  '</p>',
			  '<p>',
				'<span>Break-even: </span>',
				'<span class="ke-breakeven-items"></span>',
				'<span>byte</span>',
			  '</p>',
			  '<p>',
				'<span>Overhead: </span>',
				'<span class="ke-overhead-bytes"></span>',
				'<span>byte</span>',
			  '</p>',
			  '<p>',
				'<span>Decode Time: </span>',
				'<span class="ke-decode-time"></span>',
				'<span>ms</span>',
			  '</p>',
			  '<p>',
				'<span>Encode Time: </span>',
				'<span class="ke-encode-time"></span>',
				'<span>ms</span>',
			  '</p>',
			'</div>',
		'</div>',
		'<div class="ke-bench">',
			'<div class="ke-stat-bar">',
				'<div class="ke-stat-bar-val">',
				'</div>',
				'<div class="ke-stat-bar-err">',
				'</div>',
			'</div>',
			'<div class="ke-stat-bar">',
				'<div class="ke-stat-bar-val">',
				'</div>',
				'<div class="ke-stat-bar-err">',
				'</div>',
			'</div>',
			'<div class="ke-stat-bar">',
				'<div class="ke-stat-bar-val">',
				'</div>',
				'<div class="ke-stat-bar-err">',
				'</div>',
			'</div>',
			'<div class="ke-stat-bar">',
				'<div class="ke-stat-bar-val">',
				'</div>',
				'<div class="ke-stat-bar-err">',
				'</div>',
			'</div>',
		'</div>',
		'<p></p>',
	], SCRIPTS = [
		'js/benchmark.js',
		'js/kson.js',
		'js/codemirror.js',  // TODO (mbarkhau 2015-12-27): update lib
		'//cdnjs.cloudflare.com/ajax/libs/lodash.js/3.3.0/lodash.min.js',
		'//cdnjs.cloudflare.com/ajax/libs/jquery/2.1.3/jquery.min.js',
	], HOLIDAYS = [
		{"day": "2013-01-01", "fixed": true, "name": "New Year’s Day"},
		{"day": "2013-01-21", "fixed": false, "name": "Birthday of Martin Luther King, Jr."},
		{"day": "2013-02-18", "fixed": false, "name": "Washington’s Birthday"},
		{"day": "2013-05-27", "fixed": false, "name": "Memorial Day"},
		{"day": "2013-07-04", "fixed": true, "name": "Independence Day"},
		{"day": "2013-09-02", "fixed": false, "name": "Labor Day"},
		{"day": "2013-10-14", "fixed": false, "name": "Columbus Day"},
		{"day": "2013-11-11", "fixed": true, "name": "Veterans Day"},
		{"day": "2013-11-28", "fixed": false, "name": "Thanksgiving Day"},
		{"day": "2013-12-25", "fixed": true, "name": "Christmas Day"},
		{"day": "2014-01-01", "fixed": true, "name": "New Year’s Day"},
		{"day": "2014-01-20", "fixed": false, "name": "Birthday of Martin Luther King, Jr."},
		{"day": "2014-02-17", "fixed": false, "name": "Washington’s Birthday"},
		{"day": "2014-05-26", "fixed": false, "name": "Memorial Day"},
		{"day": "2014-07-04", "fixed": true, "name": "Independence Day"},
		{"day": "2014-09-01", "fixed": false, "name": "Labor Day"},
		{"day": "2014-10-13", "fixed": false, "name": "Columbus Day"},
		{"day": "2014-11-11", "fixed": true, "name": "Veterans Day"},
		{"day": "2014-11-27", "fixed": false, "name": "Thanksgiving Day"},
		{"day": "2014-12-25", "fixed": true, "name": "Christmas Day"},
		{"day": "2015-01-01", "fixed": true, "name": "New Year’s Day"},
		{"day": "2015-01-19", "fixed": false, "name": "Birthday of Martin Luther King, Jr."},
		{"day": "2015-02-16", "fixed": false, "name": "Washington’s Birthday"},
		{"day": "2015-05-25", "fixed": false, "name": "Memorial Day"},
		{"day": "2015-07-03", "fixed": true, "name": "Independence Day"},
		{"day": "2015-09-07", "fixed": false, "name": "Labor Day"},
		{"day": "2015-10-12", "fixed": false, "name": "Columbus Day"},
		{"day": "2015-11-11", "fixed": true, "name": "Veterans Day"},
		{"day": "2015-11-26", "fixed": false, "name": "Thanksgiving Day"},
		{"day": "2015-12-25", "fixed": true, "name": "Christmas Day"},
		{"day": "2016-01-01", "fixed": true, "name": "New Year’s Day"},
		{"day": "2016-01-18", "fixed": false, "name": "Birthday of Martin Luther King, Jr."},
		{"day": "2016-02-15", "fixed": false, "name": "Washington’s Birthday"},
		{"day": "2016-05-30", "fixed": false, "name": "Memorial Day"},
		{"day": "2016-07-04", "fixed": true, "name": "Independence Day"},
		{"day": "2016-09-05", "fixed": false, "name": "Labor Day"},
		{"day": "2016-10-10", "fixed": false, "name": "Columbus Day"},
		{"day": "2016-11-11", "fixed": true, "name": "Veterans Day"},
		{"day": "2016-11-24", "fixed": false, "name": "Thanksgiving Day"},
		{"day": "2016-12-26", "fixed": true, "name": "Christmas Day"},
		{"day": "2017-01-02", "fixed": true, "name": "New Year’s Day"},
		{"day": "2017-01-18", "fixed": false, "name": "Birthday of Martin Luther King, Jr."},
		{"day": "2017-02-20", "fixed": false, "name": "Washington’s Birthday"},
		{"day": "2017-05-29", "fixed": false, "name": "Memorial Day"},
		{"day": "2017-07-04", "fixed": true, "name": "Independence Day"},
		{"day": "2017-09-04", "fixed": false, "name": "Labor Day"},
		{"day": "2017-10-09", "fixed": false, "name": "Columbus Day"},
		{"day": "2017-11-10", "fixed": true, "name": "Veterans Day"},
		{"day": "2017-11-23", "fixed": false, "name": "Thanksgiving Day"},
		{"day": "2017-12-25", "fixed": true, "name": "Christmas Day"}
	],
	HOLIDAY_NAMES = [
		"New Year’s Day",
		"Birthday of Martin Luther King, Jr.",
		"Washington’s Birthday",
		"Memorial Day",
		"Independence Day",
		"Labor Day",
		"Columbus Day",
		"Veterans Day",
		"Thanksgiving Day",
		"Christmas Day"
	],
	DAYNAMES_ENUM = "enum:" + HOLIDAY_NAMES.join(":"),
	EXAMPLES = [
		{
			"description": "Federal US Holidays",
			"root_id": "event-v1",
			"schemas": {
				"id": "event-v1",
				"fields": ["day", "fixed", "name"]
			},
			"data": HOLIDAYS
		},
		{
			"description": [
				"Federal US Holidays",
				"(with encoded fixed attribute)"
			],
			"root_id": "event-v2",
			"schemas": {
				"id": "event-v2",
				"fields": ["day", "fixed", "name"],
				"meta": [0, "bool", 0]
			},
			"data": HOLIDAYS
		},
		{
			"description": [
				"Federal US Holidays",
				"(with encoded holiday names)"
			],
			"root_id": "event-v3",
			"schemas": {
				"id": "event-v3",
				"fields": ["day", "fixed", "name"],
				"meta": [0, "bool", DAYNAMES_ENUM]
			},
			"data": HOLIDAYS
		},
		{
			"description": [
				"Federal US Holidays ",
				"(with dates using a custom coder)"
			],
			"root_id": "event-v4",
			"schemas": {
				"id": "event-v4",
				"fields": ["day", "fixed", "name"],
				"meta": [
					"date-str",
					"bool",
					DAYNAMES_ENUM,
				]
			},
			"coders": [
				{"id": "date-str", "fn": date_str_coder}
			],
			"data": HOLIDAYS
		},
		{
			"description": [
				"Federal US Holidays ",
				"(with dates using a parameterized custom coder)"
			],
			"root_id": "event-v5",
			"schemas": {
				"id": "event-v5",
				"fields": ["day", "fixed", "name"],
				"meta": [
					"date-str:2010",
					"bool",
					DAYNAMES_ENUM
				]
			},
			"coders": [
				{"id": "date-str", "fn": date_str_param_coder}
			],
			"data": HOLIDAYS
		}
		// TODO: example with codec args in custom codec
		// TODO: example with codec chaining
		// TODO: example with nested schemas
	];
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

	//doc.addEventListener('load', function() {
	setTimeout(function() {
		doc.getElementById('editors').innerHTML = CONTENT.join("\n");

		for (var i = SCRIPTS.length; i--;) {
			var script = doc.createElement("script");
			script.src = SCRIPTS[i];
			script.async = true;
			doc.body.appendChild(script);
		};

		var style = doc.createElement("link");
		style.rel = "stylesheet";
		style.href = "css/codemirror.css";
		doc.body.appendChild(style);
	}, 400);
	function json_str(obj) {
		return JSON.stringify(obj, null, 2);
	};

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

		if (description) {
			if ($.isArray(description)) {
				description = description.join("\n// ");
			}
			init_code.push("// " + description + "\n");
		}
		init_code.push(
			"var root_id = \"" + ex.root_id + "\";\n"
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
			$node: $("#ke-examples"),
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