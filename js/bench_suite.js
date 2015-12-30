(function(global) {
	function run_bench(setup_code, fn_code) {
		(new Benchmark("", {
			'setup': setup_code,
			'fn': fn_code,
			'maxTime': 0.1,
			'minSamples': 5,
			'onComplete': function() {
				var mean_ms = 1000 * this.stats.mean,
					err_ms = mean_ms * (this.stats.rme / 100),
					res = {mean_ms: mean_ms, err_ms: err_ms};
				console.log(fn_code, mean_ms, err_ms);
			}
		})).run();

	}

	function mk_bench_step(setup_code, fn_code, result_node, next_step) {
		return function(){
			run_bench(setup_code, fn_code);
			if (next_step) {
				setTimeout(next_step, 50);
			}
		};
	}

	global.refesh_bench_stats = function () {
		var data = parse_editors();
		if (!data) {
			return
		}
		var setup_code = [
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

		var node_3 = $('.ke-json-decode-time');
		var node_2 = $('.ke-kson-decode-time');
		var node_1 = $('.ke-json-encode-time');
		var node_0 = $('.ke-kson-encode-time');

		var step_3 = mk_bench_step(setup_code, fn_codes[3], node_3);
		var step_2 = mk_bench_step(setup_code, fn_codes[2], node_2, step_3);
		var step_1 = mk_bench_step(setup_code, fn_codes[1], node_1, step_2);
		var step_0 = mk_bench_step(setup_code, fn_codes[0], node_0, step_1);
		setTimeout(step_0, 50);   // start the chain
	}

	global.kson_init_benchmarks = function() {
		console.log('kson_init_benchmarks');
	};
}(this));