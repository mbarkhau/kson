(function() {
	var win = window, doc = win.document;

	function main() {

	}

	(function loader(){
		if (win.KSON && win.CodeMirror && win.Examples) {
			return main();
		}
		setTimeout(loader, 10);
	})();
}());