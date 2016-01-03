(function(global) {
	var current_values;

	global.kson_reset_bench_values = function() {
		current_values = {
			'kson-encode-time': 0,
			'kson-encode-time-err': 0,
			'kson-decode-time': 0,
			'kson-decode-time-err': 0,
			'kson-net-latency': 0,
			'kson-total-latency': 0,
			'kson-net-gz-latency': 0,
			'kson-total-gz-latency': 0,
			'json-encode-time': 0,
			'json-encode-time-err': 0,
			'json-decode-time': 0,
			'json-decode-time-err': 0,
			'json-net-latency': 0,
			'json-total-latency': 0,
			'json-net-gz-latency': 0,
			'json-total-gz-latency': 0
		};
		return current_values;
	}

	var net_options = {
		"GPRS"	: {rtt_ms: 500, bps: 50000 / 8},
		"2G"	: {rtt_ms: 300, bps: 250000 / 8},
		"3G"	: {rtt_ms: 100, bps: 750000 / 8},
		"DSL"	: {rtt_ms: 5, bps: 2000000 / 8}
	};
	var current_net;

	global.kson_recalc_bench_values = function() {
		var data = parse_editors();
		var cv = current_values;
		var cn = current_net;

		var kson_bytes = data.raw_kson_bench_data.length;
		var kson_gz_bytes = data.gz_kson.length;;
		var json_bytes = data.raw_json_bench_data.length;
		var json_gz_bytes = data.gz_json.length;

		var kson_transfer_ms = kson_bytes / (cn.bps / 1000);
		var kson_gz_transfer_ms = kson_gz_bytes / (cn.bps / 1000);
		var json_transfer_ms = json_bytes / (cn.bps / 1000);
		var json_gz_transfer_ms = json_gz_bytes / (cn.bps / 1000);

		var kson_net_latency = cn.rtt_ms + kson_transfer_ms;
		var kson_gz_net_latency = cn.rtt_ms + kson_gz_transfer_ms;
		var json_net_latency = cn.rtt_ms + json_transfer_ms;
		var json_gz_net_latency = cn.rtt_ms + json_gz_transfer_ms;

		cv['kson-net-latency'] = kson_net_latency;
		cv['kson-net-gz-latency'] = kson_gz_net_latency;
		cv['json-net-latency'] = json_net_latency;
		cv['json-net-gz-latency'] = json_gz_net_latency;

		if (cv['kson-encode-time'] && cv['kson-decode-time']) {
			cv['kson-total-latency'] = (
				kson_net_latency +
				cv['kson-encode-time'] +
				cv['kson-decode-time']
			);
			cv['kson-total-gz-latency'] = (
				kson_gz_net_latency +
				cv['kson-encode-time'] +
				cv['kson-decode-time']
			);
		}
		if (cv['json-encode-time'] && cv['json-decode-time']) {
			cv['json-total-latency'] = (
				json_net_latency +
				cv['json-encode-time'] +
				cv['json-decode-time']
			);
			cv['json-total-gz-latency'] = (
				json_gz_net_latency +
				cv['json-encode-time'] +
				cv['json-decode-time']
			);
		}
		return cv;
	}

	function mk_result_cb(result_id, next_step) {
		return function() {
			var mean_ms = 1000 * this.stats.mean;
			var err_ms = mean_ms * (this.stats.rme / 100);
			current_values[result_id] = mean_ms;
			current_values[result_id + '-err'] = err_ms;

			kson_update_graphs(kson_recalc_bench_values());
			if (next_step) {
				setTimeout(next_step, 50);
			}
		}
	}

	function mk_bench_step(setup_code, fn_code, result_id, next_step) {
		return function(){
			(new Benchmark("", {
				'setup': setup_code,
				'fn': fn_code,
				'maxTime': 0.1,
				'minSamples': 5,
				'async': true,
				'onComplete': mk_result_cb(result_id, next_step)
			})).run();
		};
	}

	global.refesh_bench_stats = function () {
		var data = parse_editors();
		if (!data) {
			return
		}
		kson_update_graphs(kson_reset_bench_values());
		var setup = [
			"var parsed = " + data.raw_json_bench_data + ";",
			"var root_schema_id = '" + global.root_schema_id + "';",
			"var raw_json = '" + data.raw_json_bench_data + "';",
			"var raw_kson = '" + data.raw_kson_bench_data + "';"
		].join("\n");

		var fn_codes = [
			"KSON.stringify(parsed, root_schema_id);",
			"KSON.parse(raw_kson);",
			"JSON.stringify(parsed);",
			"JSON.parse(raw_json);",
		];

		// clear any previous results
		$('.ke-time-result').text("-");

		var s3 = mk_bench_step(setup, fn_codes[3], 'json-decode-time');
		var s2 = mk_bench_step(setup, fn_codes[2], 'json-encode-time', s3);
		var s1 = mk_bench_step(setup, fn_codes[1], 'kson-decode-time', s2);
		var s0 = mk_bench_step(setup, fn_codes[0], 'kson-encode-time', s1);
		setTimeout(s0, 50);   // start the chain
	}

	global.kson_update_graphs = function (values) {
		if (!values) {
			// Random test values for testing
			values = {
				'kson-encode-time': 10 + Math.random() * 100,
				'kson-encode-time-err': 2 + Math.random() * 10,
				'kson-decode-time': 10 + Math.random() * 100,
				'kson-decode-time-err': 2 + Math.random() * 10,
				'kson-net-latency': 100 + Math.random() * 15,
				'kson-total-latency': 130 + Math.random() * 20,
				'kson-net-gz-latency': 100 + Math.random() * 15,
				'kson-total-gz-latency': 130 + Math.random() * 20,
				'json-encode-time': 10 + Math.random() * 100,
				'json-encode-time-err': 2 + Math.random() * 10,
				'json-decode-time': 10 + Math.random() * 100,
				'json-decode-time-err': 2 + Math.random() * 10,
				'json-net-latency': 100 + Math.random() * 30,
				'json-total-latency': 130 + Math.random() * 50,
				'json-net-gz-latency': 100 + Math.random() * 30,
				'json-total-gz-latency': 130 + Math.random() * 50
			};
		};

		var max_ms = Math.max(
			values['kson-encode-time'] + values['kson-encode-time-err'],
			values['kson-decode-time'] + values['kson-decode-time-err'],
			values['kson-net-latency'],
			values['kson-total-latency'],
			values['kson-net-gz-latency'],
			values['kson-total-gz-latency'],
			values['json-encode-time'] + values['json-encode-time-err'],
			values['json-decode-time'] + values['json-decode-time-err'],
			values['json-net-latency'],
			values['json-total-latency'],
			values['json-net-gz-latency'],
			values['json-total-gz-latency']
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
			var val_node = bar_node.find('.ke-stat-bar-val');
			var err_node = bar_node.find('.ke-stat-bar-err');

			if (!bar_node[0]) {
				return;
			}

			var err_result_id = result_id + '-err';
			var result_value = values[result_id];
			var result_error = values[err_result_id];

			var bar_px_width = ms_to_px(result_value);
			var err_px_width = ms_to_px(result_error);
			// +1 for the border of the error bar
			// note: there mustn't be whitespace between the
			// value and error bars
			var err_px_offset = parseInt(err_px_width / 2 + 1);

			if (!result_value) {
				bar_node.css('visibility', 'hidden');
				return;
			}
			bar_node.css('visibility', 'visible');

			val_node
				.css('width', bar_px_width + "px")
				.html(result_value.toFixed(3) + "&nbsp;ms");

			if (err_px_width > 5) {
				err_node.css({
					'width': err_px_width + "px",
				 	'margin-left': "-" + err_px_offset + "px"
				}).show();
			} else {
				err_node.hide();
			}
		}

		$.each(values, update_bar);
		$('.ke-bench').css('visibility', 'visible');
	}

	function reset_network(net_option) {
		$(".ke-network-controls .ke-ctrl-switcher")
			.removeClass('ke-ctrl-active');
		net_option.control_node.addClass('ke-ctrl-active');
		current_net = net_option;
		kson_update_graphs(kson_recalc_bench_values());
	}

	function init_net_controls() {
		var control_container = $(".ke-network-controls");
		$.each(net_options, function (net_id, net_option) {
			net_option.control_node = $("<div>" + net_id + "</div>");
			$(net_option.control_node)
				.addClass('ke-ctrl')
				.addClass('ke-ctrl-switcher');
			control_container.append(net_option.control_node);
			net_option.control_node.click(
				$.proxy(reset_network, null, net_option)
			);
		});
	}

	global.kson_init_benchmarks = function() {
		console.log('kson_init_benchmarks');
		init_net_controls();
		kson_reset_bench_values();
		reset_network(net_options["DSL"]);
		$('.ke-ctrl-run-benchmark').click(refesh_bench_stats);
	};
}(this));