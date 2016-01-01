(function(global) {
	function mk_bench_step(setup_code, fn_code, result_id, next_step) {
		return function(){
			(new Benchmark("", {
				'setup': setup_code,
				'fn': fn_code,
				'maxTime': 0.1,
				'minSamples': 5,
				'async': true,
				'onComplete': function() {
					var mean_ms = 1000 * this.stats.mean,
						err_ms = mean_ms * (this.stats.rme / 100),
						res = {mean_ms: mean_ms, err_ms: err_ms};
					console.log(fn_code, mean_ms, err_ms);
					// update_graphs();
					if (next_step) {
						setTimeout(next_step, 50);
					}
				}
			})).run();
		};
	}

	global.refesh_bench_stats = function () {
		var data = parse_editors();
		if (!data) {
			return
		}
		var setup = [
			"var parsed = " + data.raw_json + ";",
			"var root_schema_id = '" + global.root_schema_id + "';",
			"var raw_json = '" + data.raw_json + "';",
			"var raw_kson = '" + data.raw_kson + "';"
		].join("\n");
		var fn_codes = [
			"JSON.parse(raw_json);",
			"KSON.parse(raw_kson);",
			"JSON.stringify(parsed);",
			"KSON.stringify(parsed, root_schema_id);"
		];

		// clear any previous results
		$('.ke-time-result').text("-");

		var s3 = mk_bench_step(setup, fn_codes[3], 'kson-encode-time');
		var s2 = mk_bench_step(setup, fn_codes[2], 'json-encode-time', s3);
		var s1 = mk_bench_step(setup, fn_codes[1], 'kson-decode-time', s2);
		var s0 = mk_bench_step(setup, fn_codes[0], 'json-decode-time', s1);
		setTimeout(s0, 50);   // start the chain
	}

	function update_graphs(values) {
		if (!values) {
			values = {
				'json-decode-time': 10 + Math.random() * 100,
				'kson-decode-time': 10 + Math.random() * 100,
				'json-encode-time': 10 + Math.random() * 100,
				'kson-encode-time': 10 + Math.random() * 100,
				'json-decode-time-err': 2 + Math.random() * 10,
				'kson-decode-time-err': 2 + Math.random() * 10,
				'json-encode-time-err': 2 + Math.random() * 10,
				'kson-encode-time-err': 2 + Math.random() * 10,
				'json-net-latency': 100 + Math.random() * 30,
				'kson-net-latency': 100 + Math.random() * 15,
				'json-net-total-latency': 130 + Math.random() * 50,
				'kson-net-total-latency': 130 + Math.random() * 20
			};
		};

		var max_ms = Math.max(
			values['json-decode-time'] + values['json-decode-time-err'],
			values['kson-decode-time'] + values['kson-decode-time-err'],
			values['json-encode-time'] + values['json-encode-time-err'],
			values['kson-encode-time'] + values['kson-encode-time-err'],
			values['json-net-latency'],
			values['kson-net-latency'],
			values['json-net-total-latency'],
			values['kson-net-total-latency']
		);

		var container_width = $('.ke-bars').width();

		function ms_to_px(ms) {
			// log scale width calculation
			// return (Math.log(ms) / Math.log(max_ms)) * container_width;
			var px_per_ms = container_width / max_ms;
			return parseInt(ms * px_per_ms);
		}

		function update_bar(result_id) {
			var bar_node = $('.ke-' + result_id);
			if (!bar_node[0]) {
				return;
			}

			var err_result_id = result_id + '-err';
			var result_value = values[result_id];
			var result_error = values[err_result_id];

			if (result_value) {
				bar_node.css('visibility', 'visible');
				bar_node.find('.ke-stat-bar-val').css(
					'width', ms_to_px(result_value) + "px"
				).text(parseInt(result_value));
				var err_px_width = ms_to_px(result_error);
				if (err_px_width > 5) {
					// +1 for the border of the error bar
					// note: there mustn't be whitespace between the
					// value and error bars
					var err_px_offset = parseInt(err_px_width / 2 + 1);
					bar_node.find('.ke-stat-bar-err').css({
						'width': err_px_width + "px",
					 	'margin-left': "-" + err_px_offset + "px"
					})
				}
			} else {
				bar_node.css('visibility', 'hidden');
			}
		}
		$.each(values, update_bar);
		$('.ke-bench').css('visibility', 'visible');
	}
	global.kson_init_benchmarks = function() {
		console.log('kson_init_benchmarks');
		//setTimeout(refesh_bench_stats, 1000);
	};
}(this));