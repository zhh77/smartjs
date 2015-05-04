_stDefine('support', function(st) {

	var methods = ["each",
					"isArray","isEmptyObject","isPlainObject","isFunction",
					"Deferred","when"];

	var supports = {};

	methods.forEach(function(name){
		supports[name] = $[name];
	});

	return supports;
})