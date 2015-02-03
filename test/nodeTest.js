
	var st = require('./dest/test.js');

	//使用once模式创建promiseEvent
	var events = st.promiseEvent("once");

	//添加回调
	events.add('call1', function(e, text) {
		return text;
	});

	console.log(events.fire('called'));
