SHELL = /bin/sh

minify:
	@uglifyjs js/kson.js -cm > js/kson.min.js 2> /dev/null
	@echo -ne "js/kson.js -> js/kson.min.js : "
	@cat js/kson.min.js | wc -c
	@echo -ne "gzipped js/kson.min.js       : "
	@cat js/kson.min.js | gzip | wc -c
test:
	@py.test py/
	@node js/test_kson.js
bench:
	@node js/bench_kson.js
package_js:
	@tar -czf kson.tar.gz -C js/ package.json kson.js kson.min.js
package_py:
	@cd py/; python setup.py sdist
all: test bench minify package_js package_py
