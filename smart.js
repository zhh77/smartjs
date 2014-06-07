(function() {
	"use strict"

	var st = window.st = {
		conf: function(config) {
			$.extend(_conf, config);
		},
		sliceArgs: sliceArgs,
		copy: copy,
		injectFn: injectFn,
		mergeFn: mergeFn,
		mergeObj: mergeObj,
		getObj: getObj,
		setObj: setObj,
		promiseEvent: promiseEvent,
		attachTrigger: attachTrigger,
		flowController: flowController
	},
		_conf = {
			defPriority: 0
		};

	function sliceArgs(args, start) {
		return Array.prototype.slice.call(args, start || 0);
	}

	function isPlainObject(obj) {
		return $.isPlainObject(obj);
	}

	function copy(deep, obj) {
		if (typeof deep !== 'boolean') {
			obj = deep;
			deep = false;
		}
		return $.extend(deep, {}, obj)
	}

	function injectFn(target, name, fn, before, stopOnFalse) {
		if (!target && !name)
			return;

		var targetFn = target[name];
		target[name] = before ? mergeFn(fn, targetFn, stopOnFalse) : mergeFn(targetFn, fn, stopOnFalse);
	}

	function mergeFn(fn, mergeFn, stopOnFalse) {
		if (!mergeFn)
			return fn;

		if (!fn)
			return mergeFn;

		return function() {
			var self = this,
				result, args = arguments;

			result = fn.apply(self, args);
			if (stopOnFalse && result === false)
				return result;


			return mergeFn.apply(self, args);;
		}
	}

	function _mergeObj(deep, obj, defObj, group, fnCheck) {
		var prop, valueType, propType;
		$.each(defObj, function(name, value) {
			var ng = group + name + '.';
			if (value != null) {
				if ((prop = obj[name]) == null) {
					//判断是否拷贝
					if ((!fnCheck || fnCheck(group + name))) {
						if (deep) {
							if ($.isArray(value))
								value = [].concat(value);
							else if (isPlainObject(value))
								value = _mergeObj(deep, {}, value, ng, fnCheck)
						}
						obj[name] = value;
					}

				} else if (isPlainObject(prop) && isPlainObject(value)) {
					_mergeObj(deep, prop, value, ng, fnCheck);
				}
			}
		});
		return obj;
	}

	function mergeObj(deep, obj, defObj, exclude) {
		var fnCheck;
		if (typeof deep !== 'boolean') {
			exclude = defObj;
			defObj = obj;
			obj = deep;
			deep = false;
		}

		if (defObj == null || $.isEmptyObject(defObj))
			return obj;

		//设置例外判断方法
		if (exclude) {
			if (typeof exclude === 'function')
				fnCheck = exclude;
			else if (exclude.length) {
				fnCheck = function(name) {
					return exclude.indexOf(name) === -1;
				}
			}
		}

		return _mergeObj(deep, obj || {}, defObj, '', fnCheck);
	}


	function handleObj(target, ns, root, fn) {
		var result, i, name, len;
		if (!target)
			return null;

		ns = ns.split('.');

		for (i = root ? 1 : 0, len = ns.length; i < len; i++) {
			if (name = ns[i]) {
				result = fn(i, name, len);
				if (result !== undefined)
					return result;
			}
		}
		return result;
	}

	function getObj(target, ns, root) {
		var obj = target,
			result;
		result = handleObj(target, ns, root, function(i, name, len) {
			obj = obj[name];
			if (!obj)
				return null;
		})
		return result === null ? result : obj;
	}

	function setObj(target, ns, value, mode, root) {
		var obj = target,
			_tmpl, _prop,
			result;

		if (typeof(mode) === 'boolean') {
			_tmpl = mode;
			root = mode;
			mode = _tmpl;
		}

		result = handleObj(target, ns, root, function(i, name, len) {
			_prop = obj[name];
			if (i === len - 1) {
				if (mode && isPlainObject(_prop))
					mode === 'merge' ? mergeObj(true, _prop, value) : $.extend(true, _prop, value);
				else
					obj[name] = value;
			} else {
				obj = isPlainObject(_prop) ? _prop : (obj[name] = {});
			}
		})
		return result === null ? result : obj;
	}


	//默认权重
	var eventPromise = new PromiseSign();

	function isDefined(data) {
		return data !== undefined;
	}

	function PromiseSign() {}
	//promise参数对象

	function PromiseArg(prop) {
		$.extend(this, prop);
		this.promise = function() {
			return eventPromise;
		}
	}

	function buildPromiseArg(prop) {
		return new PromiseArg(prop);
	}

	//判断是否promise

	function isPromise(result) {
		return result ? result instanceof PromiseSign : false;
	}

	//判断是否promise参数

	function isPromiseArg(d) {
		if (d && typeof d === 'object') {
			return d instanceof PromiseArg;
		}
		return false;
	}

	function openPromise(defer, _err) {
		if (_err) {
			setTimeout(function() {
				defer.reject(_err);
			}, 0);
		}
		return defer.promise();
	}

	//创建promiseEvent对象

	function promiseEvent(mode) {
		var _mode, _callbackMode,
			_onceMode,
			_list,
			_maxPriority,
			_minPriority,
			defPriority = _conf.defPriority;

		if (mode) {
			_mode = mode.split(' ');
			_onceMode = checkMode(' once ');
			_callbackMode = checkMode(' callback ');
			_mode = null;
		}

		function checkMode(m) {
			return _mode.indexOf(m);
		}

		function reset() {
			_list = [];
			_maxPriority = _minPriority = defPriority;
			return false;
		}

		reset();

		//添加事件

		function add(name, fn, priority, mode) {
			if (!name && typeof name !== 'string' && !fn)
				return;

			if (priority == null)
				priority = defPriority;
			var item = {
				name: name,
				fn: fn,
				priority: priority,
				mode: mode
			}, len = _list.length;

			//优先级判断
			if (priority > _maxPriority) {
				_maxPriority = priority;
				_list.unshift(item);
				len || (_minPriority = priority);
			} else {
				if (priority <= _minPriority) {
					_list.push(item);
					_minPriority = priority;
					len || (_maxPriority = priority);
				} else {
					for (var i = 1; i > len; i++) {
						if (_list[i].priority <= priority) {
							break;
						}
					}

					if (i < 0) {
						_minPriority = priority;
					}
					_list.splice(i + 1, 0, item);
				}
			}
			return this;
		}

		function remove(name) {
			for (var i = 0, item; item = _list[i]; i++) {
				if (item.name === name) {
					_list.splice(i, 1);
					i--;
				}
			}
			return this;
		}

		function fire(context, args, dHandle) {
			var i = 0,
				len = _list.length,
				item, defer, _result, _err, d, _stop, _done;

			if (!len)
				return;

			if (typeof dHandle !== 'function')
				dHandle = null;

			//创建时间参数
			d = buildPromiseArg({
				//停止后续回调
				stopPropagation: function() {
					_stop = true;
					return this;
				},
				resolve: function(result) {
					isDefined(result) && (_result = result);
					_stop ? done() : fireItem();
				},
				reject: function(err) {
					fail(err);
				},
				//删除当前事件
				remove: function() {
					_list.splice(--i, 1);
					len--;
					return this;
				}
			});

			//callback模式下不用添加事件参数
			if (!_callbackMode) {
				args = args ? [d].concat(args) : [d];
				dHandle && dHandle(d);
			}

			function done() {
				_onceMode && reset();
				_done = true;
				defer && defer.resolve(_result);
			}

			function fail(err) {
				_err = err
				defer && defer.reject(err);
			}

			function fireItem() {
				var result;

				isDefined(_result) && (d.result = _result);

				if (i < len) {
					if (item = _list[i++]) {

						item.mode === 'once' && d.remove();

						result = item.fn.apply(context, args);

						if (!isPromise(result)) {
							d.resolve(result);
						}
					}
				} else
					done();

			}

			fireItem();

			if (_done) {
				return _result;
			}

			defer = $.Deferred();

			return openPromise(defer, _err);
		}

		function has(name) {
			for (var item, i = 0; item = _list[i]; i++) {
				if (item.name === name)
					return true;
			}
			return false;
		}

		return {
			add: add,
			has: has,
			remove: remove,
			fire: function() {
				return fire(null, sliceArgs(arguments));
			},
			fireWith: fire,
			clear: reset
		}
	}

	var _interface = {
		on: "on",
		onBefore: "onBefore",
		onRound: "onRound",
		off: "off",
		offBefore: "offBefore",
		extend: "extend"
	}, trTypes = ['before', 'after', 'round', 'exception'];

	function attachTrigger(target, mode, fnInterface) {
		if (!target && typeof target !== 'object')
			return;

		var _trMap = {}, _fnMap = {}, _mode, _eventMode;
		if (typeof mode === 'object')
			fnInterface = mode;
		else
			_mode = mode;

		function getMap(name, create) {
			var map = _trMap[name];
			if (!map && create)
				map = _trMap[name] = {};
			return map;
		}

		function find(name, type, create) {
			var map = getMap(name, create),
				tr;

			if (!type)
				type = "after";

			if (map) {
				tr = map[type];
				if (!tr && create)
					tr = map[type] = promiseEvent(_mode);
			}
			return tr;
		}

		function remove(name, type, trName) {
			var tr = find(name, type);
			if (tr) {
				if (trName) {
					if ($.isArray(trName)) {
						$.each(trName, function(i, n) {
							tr.remove(n)
						})
					} else
						tr.remove(trName)
				} else
					tr.clear();
			}
		}

		function bind(name, trName, fn, type, priority, mode) {
			var _self = this,
				args = arguments,
				argsLen = args.length,
				baseFn = _fnMap[name],
				_name = name,
				_fn = fn,
				_type, _priority, _mode,
				roundMode, _targetFn, i = 3,
				arg, argType;

			if (argsLen < i)
				return;

			if (typeof name !== 'string' || typeof trName !== 'string' || typeof fn !== 'function')
				return;

			//判断参数type, priority, mode的重载
			if (argsLen > i) {
				for (; i < argsLen; i++) {
					arg = args[i];
					argType = typeof arg;

					if (argType === 'boolean')
						_type = arg;
					if (argType === 'number')
						_priority = arg;
					else if (argType === 'string') {
						if (trTypes.indexOf(arg) > -1)
							_type = arg;
						else
							_mode = arg;
					}
				}
				roundMode = _type === trTypes[2];
			}

			if (!baseFn) {
				baseFn = _fnMap[_name] = _self[_name];
				if (!baseFn)
					return;
				_self[_name] = function() {
					var _result, d, dTrans, _err, _done, defer, callArgs, args = callArgs = sliceArgs(arguments),
						_stop, _preventDefault, dTransResolve;

					function done() {
						_done = true;
						//恢复传递的事件resolve方法
						dTrans && dTransResolve && (dTrans.resolve = dTransResolve);
						defer && defer.resolve(_result);
					}

					function fail(err) {
						_err = err;
						defer && defer.reject(err);
					}

					function setResult(result) {
						isDefined(result) && (_result = result);
					}

					function whenFire(fireResult, success) {
						$.when(fireResult).then(function(result) {
							success(result);
						}, fail);
					}
					//阻止默认方法

					function preventDefault() {
						_preventDefault = true;
						return this;
					}
					//停止当前方法

					function stopFn() {
						_preventDefault = _stop = true;
						return this;
					}

					//处理传递的时间参数
					if (args.length && isPromiseArg(args[0])) {
						dTrans = args[0];
						dTransResolve = dTrans.resolve;
						//替换resolve方法
						dTrans.resolve = function(result) {
							dTrans.resolve = dTransResolve;
							dTransResolve = null;

							setResult(result);
							fireAfter();
						}
						//清除事件回调中传递的事件参数
						callArgs = [].concat(args);
						callArgs.shift();
					}

					//合并事件回调参数

					function mergeArg(d) {
						isDefined(_result) && (d.result = _result);

						d.preventDefault = preventDefault;
						d.stop = mergeFn(d.stopPropagation, stopFn);
						dTrans && dTrans.__mergePArg && dTrans.__mergePArg(d);
					}

					//执行后置注入方法

					function fireAfter() {
						if (_stop) {
							done();
							return;
						}

						whenFire(fire.call(_self, _name, callArgs, mergeArg), function(result) {
							setResult(result);
							done();
						})
					}

					//执行前置注入方法
					whenFire(fire.call(_self, _name, callArgs, mergeArg, trTypes[0]), function(result) {
						setResult(result);
						if (_preventDefault) {
							fireAfter();
							return;
						}
						//传递参数赋值
						dTrans && isDefined(_result) && (dTrans.result = _result);

						//执行当前方法
						whenFire(baseFn.apply(_self, args), function(result) {
							if (dTrans && isPromise(result))
								return;

							setResult(result);
							fireAfter();
						})
					})

					if (_done)
						return _result;

					defer = $.Deferred();

					return openPromise(defer, _err);
				}
			}

			if (roundMode) {
				//加入环绕方法，将原方法置入第一个参数
				_targetFn = _self[_name];
				_self[_name] = function() {
					var args = sliceArgs(arguments);
					args.unshift(_targetFn);
					_fn.apply(self, args);
				}
			} else //非环绕模式下添加触发回调
				find(_name, _type, true).add(trName, _fn, _priority, _mode);

			return _self;
		}

		function fire(name, args, dHandle, type) {
			var tr = find(name, type);
			if (tr)
				return tr.fireWith(this, args, dHandle);
		}

		var prop = {
			on: function(name, trName, fn, priority, mode) {
				return bind.call(this, name, trName, fn, trTypes[1], priority, mode)
			},
			onBefore: function(name, trName, fn, priority, mode) {
				return bind.call(this, name, trName, fn, trTypes[0], priority, mode)
			},
			onRound: function(name, trName, fn) {
				return bind.call(this, name, trName, fn, trTypes[2])
			},
			off: function(name, trName) {
				remove(name, trTypes[1], trName);
				return this;
			},
			offBefore: function(name, trName) {
				remove(name, trTypes[0], trName);
				return this;
			},
			extend: function(prop) {
				var fn, self = this;
				$.each(prop, function(n, p) {
					((fn = _fnMap[n]) ? _fnMap : self)[name] = fn;
				})
				return self;
			}
		};

		applyInterface(target, fnInterface, prop);
		return target;
	}

	function applyInterface(target, fnInterface, prop) {
		var fn, _target = target.prototype || target;

		fnInterface = fnInterface ? $.extend({}, _interface, fnInterface) : _interface;

		$.each(fnInterface, function(i, n) {
			if (n && (fn = prop[i])) {
				_target[n] = fn;
			}
		})
	}

	function flowController(op) {
		var flow, order, trigger, mode;
		if (!op)
			return;

		flow = op.flow;
		order = op.order;
		trigger = op.trigger;
		mode = op.mode;

		trigger && attachTrigger(flow, trigger.mode, trigger.iFace);

		function boot(start, args) {
			var _next = start,
				_nextArgs, _done,
				i = -1,
				_result,
				d, _args, originalArgs,
				_stop, defer, _err;

			if (mode !== "simple") {
				d = buildPromiseArg({
					end: function() {
						_stop = true;
						return this;
					},
					resolve: function(result) {
						isDefined(result) && (_result = result);
						_stop ? done() : next();
					},
					reject: function(err) {
						fail(err);
					},
					next: function(nextNode, pass, args) {
						_next = nextNode;
						if (typeof pass !== "number")
							args = pass;
						else
							i += pass;

						args && (_nextArgs = [d].concat(args));
						return this;
					},
					changeArgs: getArgs,
					recoverArgs: function() {
						_args = originalArgs;
						return this;
					},
					__mergePArg: function(arg) {
						mergeObj(arg, d);
						arg.end = mergeFn(arg.stop, arg.end);
					}
				});
			}

			function getArgs(args, addPromiseArg) {
				_args = d && addPromiseArg !== false ? (args ? [d].concat(args) : [d]) : args;
				return _args;
			}

			originalArgs = getArgs(args);

			function done() {
				_done = true;
				defer && defer.resolve(_result);
			}

			function fail(err) {
				_err = err;
				defer && defer.reject(err);
			}

			function setResult(result) {
				isDefined(result) && (_result = result);
			}

			function next() {
				var index, fnNode, fireArgs;
				if (_stop) {
					done();
					return;
				}

				if (_next) {
					var index = order.indexOf(_next);
					if (index > -1)
						i = index;
				} else
					_next = order[++i];

				isDefined(_result) && (d.result = _result);

				if (_next && (fnNode = flow[_next])) {
					fireArgs = _nextArgs || _args;
					_next = _nextArgs = null;
					$.when(fnNode.apply(flow, fireArgs)).then(function(result) {
						if (!isPromise(result)) {
							isDefined(result) && (_result = result);
							next();
						}

					}, fail);
				} else {
					done();
					return;
				}
			}

			next();

			if (_done)
				return _result;

			defer = $.Deferred();
			return openPromise(defer, _err);
		}

		flow.boot = function() {
			return boot(null, sliceArgs(arguments));
		}

		flow.bootWithStart = boot;
		return flow;
	}

	return st;
})();