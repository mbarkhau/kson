(function() {
	var DEBUG = document.location.hostname != 'mbarkhau.github.io';

	var added_scripts = {};
	var loaded_scripts = {};

	window.load_scripts = function (script_sources, callback_name) {
		for (var i = 0; i < script_sources.length; i++) {
			var src_url = script_sources[i];
			var loaded_callback = (function (src_url) {
				return function() {
					loaded_scripts[src_url] = true;
					var all_loaded = true;
					for (var i = 0; i < script_sources.length; i++) {
						all_loaded = !!(
							all_loaded && loaded_scripts[script_sources[i]]
						);
					};
					// console.log(all_loaded, callback_name, loaded_scripts);
					if (all_loaded) {
						window[callback_name]();
					}
				};
			})(src_url);

			if (loaded_scripts[src_url]) {
				loaded_callback();
			}

			if (added_scripts[src_url] && !loaded_scripts[src_url]) {
				added_scripts[src_url].addEventListener(
					'load', loaded_callback
				);
			}

			if (!added_scripts[src_url]) {
				var script = document.createElement('script');
				added_scripts[src_url] = script;
				script.async = 'async';
				script.type = "text/javascript";
				script.addEventListener('load', loaded_callback);
				if (DEBUG && src_url.slice(0, 2) == 'js') {
					script.src = src_url + "?cb=" + Math.random();
				} else {
					script.src = src_url;
				}
				document.body.appendChild(script);
			}
		};
	};
	var main_deps = [
		"js/codemirror.js",   // TODO (mbarkhau 2015-12-27): update lib
		"https://cdnjs.cloudflare.com/ajax/libs/jquery/2.1.3/jquery.min.js",
		"https://cdnjs.cloudflare.com/ajax/libs/pako/0.2.8/pako_deflate.min.js",
		"js/example_data.js",
		"js/schema_detection.js",
		"js/kson.js",
		"js/util.js",
		"js/main.js"
	];
	load_scripts(main_deps, 'kson_main');
	load_scripts(main_deps.concat([
		"https://cdnjs.cloudflare.com/ajax/libs/benchmark/1.0.0/benchmark.min.js",
		"https://cdnjs.cloudflare.com/ajax/libs/pako/0.2.8/pako_deflate.min.js",
		"js/bench_suite.js"
	]), 'kson_init_benchmarks');
}());