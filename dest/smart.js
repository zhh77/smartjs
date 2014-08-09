/************************************* Smart JS **************************
NOTE: smartjs入口 
Features：
    1.smartjs模块定义方法，兼容requirejs和seajs
    2.conf配置管理方法

Update Note：
    2014.6 ：Created

Needs：util
    
****************************************************************************/

(function(win) {
	
	var _config = {}, 
		st = win.st = {
			conf: function(name, conf) {
				if (conf === undefined)
					return _config[name];
				else
					_config[name] = conf;
			}
		};

	win.stDefine = function(name, fn) {
		var module = fn(st);
		if (module) {
			$.extend(st, module);
		}
		
		win.define && define(name,function(){
			return module;
		})
	}
	return st;
})(window);;/************************************* Smart JS **************************
NOTE: util常用工具包 
Features：

Update Note：
    2014.6 ：Created

Needs：util
    
****************************************************************************/
stDefine('util', function(st) {
	"use strict"

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

	//在目标对象方法中注入方法，返回结果
	function injectFn(target, name, fn, before, stopOnFalse) {
		if (!target && !name)
			return;

		var targetFn = target[name];
		target[name] = before ? mergeFn(fn, targetFn, stopOnFalse) : mergeFn(targetFn, fn, stopOnFalse);
	}

	//合并方法，返回结果
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
			//判断是否拷贝
			if ((fnCheck && fnCheck(group + name) === false))
				return;

			var ng = group + name + '.';
			if (value != null) {
				if ((prop = obj[name]) == null) {
					if (deep) {
						if ($.isArray(value))
							value = [].concat(value);
						else if (isPlainObject(value))
							value = _mergeObj(deep, {}, value, ng, fnCheck)
					}
					obj[name] = value;

				} else if (deep && isPlainObject(prop) && isPlainObject(value)) {
					_mergeObj(deep, prop, value, ng, fnCheck);
				}
			}
		});
		return obj;
	}

	//合并默认数据方法,将obj中不空的内容从defObj中复制
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

	function priorityList(mode, defaultPriority) {
		var _maxPriority = 0,
			_minPriority = 0,
			isSelf = mode === 'self',
			_list = [],
			_priority = defaultPriority || 0;

		function getItem(item) {
			return isSelf ? item : item.target;
		}

		function add(item, priority) {
			var len = _list.length;
			if (isSelf)
				priority = item.priority;

			if (priority == null)
				priority = _priority;

			if (!isSelf) {
				item = {
					target: item,
					priority: priority
				}
			}

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
					for (var i = 1; i < len; i++) {
						if (_list[i].priority < priority) {
							break;
						}
					}

					if (i > len) {
						_minPriority = priority;
					}
					_list.splice(i, 0, item);
				}
			}
			return this;
		}

		function remove(filter) {
			var type = typeof filter;
			if (type === 'function') {
				var i = 0,
					result, item;
				for (; item = _list[i]; i++) {
					if (result = filter(getItem(item), i, _list)) {
						_list.splice(i, 1);
						i--;
						if (result === 'break')
							break;
					}
				}
			} else if (type === 'number')
				_list.splice(i, 1);

			return this;
		}

		function each(desc, handler) {
			var i, step, item;
			if (_list.length === 0)
				return this;

			if (typeof desc === 'function') {
				handler = desc;
				desc = false;
			}

			if (desc) {
				i = _list.length - 1;
				step = -1;
			} else {
				i = 0;
				step = 1;
			}
			for (; item = _list[i]; i += step) {
				if (handler(getItem(item), i, _list) === false) {
					break;
				}
			}
			return this;
		}

		return {
			add: add,
			remove: remove,
			each: each,
			at: function(index) {
				var item = _list[index];
				return item && getItem(item);
			},
			clear: function() {
				_list = [];
				_maxPriority = _minPriority = 0;
			},
			len: function() {
				return _list.length;
			}
		};

	}



	return {
		sliceArgs: sliceArgs,
		copy: copy,
		injectFn: injectFn,
		mergeFn: mergeFn,
		mergeObj: mergeObj,
		getObj: getObj,
		setObj: setObj,
		priorityList: priorityList
	};
});
/************************************* Smart JS **************************
NOTE: aop模块 
Features：
    1.promiseEvent ：基于promise和event机制的回调管理
    2.trigger ：对象触发器
    3.flowController ：流程/生命周期控制器

Update Note：
    2014.5 ：Created
    2014.6.11 ：promiseEvent添加非阻塞模式
    2014.6.13 ：trigger添加属性变化监听支持
Needs：util
****************************************************************************/
stDefine('aop', function(st) {
    "use strict"

    //默认权重
    var sliceArgs = st.sliceArgs;

    //设置默认权重
    st.conf("aop-Priority",0);

    function isDefined(data) {
        return data !== undefined;
    }

    function PromiseSign(mode) {
        this.mode = mode;
    }

    //promise参数对象
    function PromiseArg(prop) {
        $.extend(this, prop);
        this.promise = function(mode) {
            return new PromiseSign(mode);
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
        var _mode, _callbackMode, _noBlock,
            _onceMode,
            _list = st.priorityList("self",st.conf("aop-Priority"));

        if (mode) {
            _mode = mode.split(' ');
            _onceMode = checkMode('once');
            _callbackMode = checkMode('callback');
            //非阻塞模式
            _noBlock = checkMode('noBlock');
            _mode = null;
        }

        function checkMode(m) {
            return _mode.indexOf(m) > -1;
        }

        function reset() {
            _list.clear();
        }

        //添加事件
        function add(name, fn, priority, mode) {
            if (!name && typeof name !== 'string' && !fn)
                return;

            _list.add({
                name: name,
                fn: fn,
                priority: priority,
                mode: mode
            });
            return this;
        }

        function remove(name) {
            _list.remove(function(item){
                return item.name === name;
            })
            return this;
        }

        function fire(context, args, dHandle) {
            var i = 0,
                fireCount = 0,
                itemNoBlock,
                len = _list.len(),
                item, defer, _result, _err, d, _stop, _done;

            if (!len)
                return;

            if (typeof dHandle !== 'function')
                dHandle = null;

            //创建事件参数
            d = buildPromiseArg({
                //停止后续回调
                stopPropagation: function() {
                    _stop = true;
                    return this;
                },
                resolve: function(result) {
                    fireCount++;
                    isDefined(result) && (_result = result);
                    _stop ? done() : fireItem();
                },
                reject: function(err) {
                    fail(err);
                },
                //删除当前事件
                remove: function() {
                    _list.remove(--i);
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

            function fireItem(noblock) {
                var result;

                isDefined(_result) && (d.result = _result);

                if (i < len) {
                    if (item = _list.at(i++)) {

                        item.mode === 'once' && d.remove();

                        result = item.fn.apply(context, args);

                        if (isPromise(result)) {
                            if (_noBlock)
                                fireItem();
                            //单项noBlock模式
                            else if (result.mode === "noBlock") {
                                itemNoBlock = true;
                                fireItem();
                            }
                        } else
                            d.resolve(result);
                    }
                } else {
                    //noblock模式下，判断执行数
                    if (!(itemNoBlock || _noBlock) || fireCount === len)
                        done();
                }
            }

            fireItem();

            if (_done) {
                return _result;
            }

            defer = $.Deferred();

            return openPromise(defer, _err);
        }

        function has(name) {
            var result = false;
            _list.each(function(item){
                 if (item.name === name)
                 {
                    result = true;
                     return false;
                 }
                   
            })
            return result;
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

    //trigger的接口设置
    var _interface = {
        onHandler : "onHandler",
        fireHandler : "fireHandler",
        on: "on",
        onBefore: "onBefore",
        onRound: "onRound",
        onError: "onError",
        off: "off",
        offBefore: "offBefore",
        extend: "extend"
    },
        //注入类型
        trTypes = ['before', 'after', 'round', 'error'],
        defineProperty = Object.defineProperty;

    //附加触发器

    function attachTrigger(target, mode, fnInterface) {
        if (!target && typeof target !== 'object')
            return;

        var _trMap = {}, _fnMap = {}, _mode, _eventMode,
            _target = target;


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
                    tr = map[type] = promiseEvent(type === trTypes[3] ? "callback" : _mode);
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

        //方法注入

        function bind(name, trName, fn, type, priority, mode) {
            var args = arguments,
                argsLen = args.length,
                baseFn = _fnMap[name],
                _name = name,
                _fn = fn,
                _type, _priority, _mode,
                roundMode, _targetFn, i = 3,
                arg, argType, bindFn, isProp;

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
                baseFn = _fnMap[_name] = st.getObj(_target,_name);
                if (!baseFn)
                    return;

                //是否为属性绑定
                isProp = typeof baseFn !== 'function';

                if (isProp) {

                    //判断是否roundMode,支持属性定义
                    if (roundMode || !defineProperty)
                        return;

                    baseFn = function(value) {
                        return _fnMap[_name] = value;
                    }
                }

                bindFn = function() {
                    var _result, d, dTrans, _err, _done, defer, callArgs, args = callArgs = sliceArgs(arguments),
                        _stop, _preventDefault, dTransResolve, oldValue;

                    //属性模式取出原来的值
                    isProp && (oldValue = _fnMap[_name]);

                    function done() {
                        _done = true;
                        //恢复传递的事件resolve方法
                        dTrans && dTransResolve && (dTrans.resolve = dTransResolve);
                        defer && defer.resolve(_result);
                    }

                    function fail(err) {
                        _err = err;
                        defer && defer.reject(err);
                        fire(_name, [err].concat(args), null, trTypes[3])
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
                        d.stop = st.mergeFn(d.stopPropagation, stopFn);
                        dTrans && dTrans.__mergePArg && dTrans.__mergePArg(d);
                    }

                    //判断传递的属性值

                    function checkPropValue(args) {
                        if (isProp) {
                            if (isDefined(_result))
                                return [_result, oldValue];
                            else
                                args.push(oldValue);
                        }
                        return args;
                    }

                    //执行后置注入方法

                    function fireAfter() {
                        if (_stop) {
                            done();
                            return;
                        }

                        whenFire(fire.call(_target, _name, checkPropValue(callArgs), mergeArg), function(result) {
                            setResult(result);
                            done();
                        })
                    }

                    //执行前置注入方法
                    whenFire(fire.call(_target, _name, checkPropValue(callArgs), mergeArg, trTypes[0]), function(result) {
                        setResult(result);
                        if (_preventDefault) {
                            fireAfter();
                            return;
                        }
                        //传递参数赋值
                        dTrans && isDefined(_result) && (dTrans.result = _result);

                        //执行当前方法
                        whenFire(baseFn.apply(_target, checkPropValue(args)), function(result) {
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

                //处理属性绑定
                if (isProp) {
                    var index = name.lastIndexOf("."),
                        propName = index > 0 ? name.substring(index + 1) : name,
                        propObj = index > 0 ? st.getObj(_target,name.substring(0,index)) : _target;

                    //属性绑定
                    defineProperty(propObj, propName, {
                        get: function() {
                            return _fnMap[name];
                        },
                        set: bindFn
                    });
                } else //方法绑定
                    _target[_name] = bindFn;
            }

            if (roundMode) {
                //加入环绕方法，将原方法置入第一个参数
                _targetFn = _target[_name];
                _target[_name] = function() {
                    var args = sliceArgs(arguments);
                    args.unshift(_targetFn);
                    _fn.apply(self, args);
                }
            } else //非环绕模式下添加触发回调
                find(_name, _type, true).add(trName, _fn, _priority, _mode);

            return _target;
        }

        function fire(name, args, dHandle, type) {
            var tr = find(name, type);
            if (tr)
                return tr.fireWith(this, args, dHandle);
        }

        var prop = {
            onHandler : function(name,trName,fn,priority,mode){
                find(name,null, true).add(trName, fn, priority, mode);
                return this;
            },
            fireHandler : function(name, args){
                return fire(name,args);
            },
            on: function(name, trName, fn, priority, mode) {
                return bind(name, trName, fn, trTypes[1], priority, mode)
            },
            onBefore: function(name, trName, fn, priority, mode) {
                return bind(name, trName, fn, trTypes[0], priority, mode)
            },
            onRound: function(name, trName, fn) {
                return bind(name, trName, fn, trTypes[2])
            },
            onError :function(name, trName, fn,mode) {
                return bind(name, trName, fn, trTypes[3],mode)
            },
            off: function(name, trName) {
                remove(name, trTypes[1], trName);
                return _target;
            },
            offBefore: function(name, trName) {
                remove(name, trTypes[0], trName);
                return _target;
            },
            extend: function(prop) {
                var fn;
                $.each(prop, function(n, p) {
                    ((fn = _fnMap[n]) ? _fnMap : _target)[name] = fn;
                })
                return _target;
            }
        };

        applyInterface(target, fnInterface, prop);
        return target;
    }

    function applyInterface(target, fnInterface, prop) {
        var fn;

        fnInterface = fnInterface ? $.extend({}, _interface, fnInterface) : _interface;

        $.each(fnInterface, function(i, n) {
            if (n && (fn = prop[i])) {
                target[n] = fn;
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
                        st.mergeObj(arg, d);
                        arg.end = st.mergeFn(arg.stop, arg.end);
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

    return {
        promiseEvent: promiseEvent,
        attachTrigger: attachTrigger,
        flowController: flowController
    };
});
/************************************* Smart JS **************************
NOTE: oop模块 
Features：
    1.klass ：类继承；实现执行指针，类常用方法，继承路径
    2.factory ：对象/类工厂方法；

Update Note：
    2014.6 ：Created

Needs：util
    
****************************************************************************/
stDefine('oop', function(st) {
    "use strict"

    //初始化扩展函数
    var _onKlassInit = st.promiseEvent(),
        _klassBase = {
            //执行原型链方法
            callProto : function(name,args){
                var fn = this._$fn[name];
                if(fn)
                    return fn.apply(this,args);
            },
            //获取基类对象
            getBase: function(baseName) {
                var self = this,
                    parent = self._$super;

                if (baseName && typeof baseName == 'number')
                    baseName = self._$inheirts[baseName];


                if (parent) {
                    if (baseName) {
                        while (parent && parent._$kName != baseName) {
                            parent = parent._$super;
                        }
                    } else if (parent._$kName == self._$kName) {
                        return null;
                    }
                }
                return parent;
            },
            //执行基类对象
            callBase: function(fnName, baseName, args) {
                var self = this,
                    base = self._$super,
                    fn, result, current, indicator = self._$indicator;

                if (!base)
                    return;

                if (arguments.length < 3) {
                    args = baseName;
                    baseName = null;
                }

                if (baseName)
                    base = self.getBase(baseName);
                else if (current = indicator[fnName])
                    base = current._$super || current.fn._$super || current;

                if (base && (fn = base[fnName])) {
                    indicator[fnName] = base;
                    result = fn.apply(this, args);
                    indicator[fnName] = null;
                }
                return result;
            },
            //类扩展方法
            extend: function(prop) {
                $.extend(this, prop);
            }
        };

    st.conf('oop-KlassBase',_klassBase);

    function klass(name, prop, parent, config) {
        var _super, _proto, _prop = prop,
            _inheirts = [name],
            _obj = function() {
                var self = this,
                    args = arguments,
                    len = args.length;

                //自执行初始化判断
                if (!(self instanceof _obj)) {
                    if (len === 0)
                        return new _obj();
                    if (len < 4)
                        return new _obj(args[0], args[1], args[2]);
                    else if (len < 7)
                        return new _obj(args[0], args[1], args[2], args[3], args[4], args[5]);
                    else
                        return new _obj(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8]);
                }
                //设置指针对象
                self._$indicator = {};
                //设置原型链
                self._$fn = _proto;
                //执行扩展方法
                _onKlassInit.fireWith(self,config);
                //klassInit默认初始化
                self.klassInit && self.klassInit.apply(self, args);
            }

        if (parent) {
            _super = parent.prototype || parent;
            _proto = _obj.prototype = Object.create(_super);
            _proto._$super = _super;
            _proto.constructor = parent;
            //添加父的继承路径
            if (_super._$inheirts)
                _inheirts = _inheirts.concat(_super._$inheirts);
            else
                _inheirts.push(parent.name);
        } else
            _proto = $.extend(_obj.prototype, _klassBase);

        _obj.fn = _proto;
        $.extend(_proto, _prop, {
            //类标示
            _$klass: true,
            //类名
            _$kName: name,
            //继承链
            _$inheirts: _inheirts
        });
        return _obj;
    }

    // _onKlassInit.add('attachTrigger', function(config) {
    //     var trigger = config.trigger;
    //     trigger && st.attachTrigger(this, trigger.iFace, trigger.mode);
    // })

    function factory(name, base, proto, type, initDefault) {
        var _store = {}, _base = base,
            _proto, _type, _initDefault,
            args = arguments,
            argsLen = args.length,
            argType,arg, i = 2,
            mergeMode, klassMode, needInit, _defaultItem;


        if(argsLen === 1 && typeof name === 'object'){
            _base = name.base;
            _proto = name.proto;
            _type = name.type;
            _initDefault  = name.initDefault;
            name = name.name;
        }
        else if (argsLen > i) {
            for (; i < argsLen; i++) {
                if (arg = args[i]) {
                    argType = typeof arg;
                    if (argType === 'object')
                        _proto = arg;
                    else if (argType === 'string')
                        _type = arg;
                    else if (argType === 'boolean')
                        _initDefault = arg;
                }
            }
        }

        if (_type === 'merge')
            mergeMode = true;
        else if (_type === 'class')
            klassMode = true;
        else
            needInit = true;

        mergeMode || (_base = klass(name + '_base',_base));

        //设置默认项
        _initDefault && (_defaultItem = needInit ? new _base : _base);

        function build(name, item, parent) {
            parent = parent ? find(parent) || _base : _base;

            if (mergeMode)
                return st.mergeObj(true, item, parent);
            else {
                item = klass(name, item, parent);
                return klassMode ? item : new item;
            }
        }

        function add(name, item, parent) {
            return (_store[name] = build(name, item, parent));
        }

        function find(name, defaultMode) {
            var obj;
            if (arguments.length === 0)
                return _defaultItem;

            if (name && (obj = _store[name])) {
                obj._itemType = type;
                return obj;
            }
            return defaultMode ? _defaultItem : null;
        }

        function setDefault(name) {
            _defaultItem = get(name, true);
        }

        function remove(name) {
            delete _store[name];
        }

        proto = $.extend({
            build: build,
            add: add,
            find: find,
            remove: remove,
            setDefault: setDefault,
            fire : function(name,args){
                var fn;
                $.each(_store,function(n,item){
                    if(item && (fn = item[name])){
                        fn.apply(null,args);
                    }
                })
            }
        }, _proto);

        return klass(name, proto, null, {
            trigger: true
        })();


    }

    return {
        klass: klass,
        onKlassInit : _onKlassInit,
        factory: factory
    };
});/************************************* Smart JS **************************
NOTE: 过滤器 
Features：
    1. 编译字符串过滤，“name = @name and (age > @age and type = @type)”

Update Note：
    2014.6 ：Created

Needs：util,aop,oop
    
****************************************************************************/
stDefine('filter', function(st) {

	var NullIgnoreSign = ["{", "}"]
	Relations = ["and", "or"],
		isArray = $.isArray;

	function Filter(filter) {
		if (filter) {
			switch (typeof filter) {
				case "string":
					this._conditions = compileStringCondition(filter);
					break;
				case "function":
					this._filter = filter;
					break;
				case "object":
					this._params = filter;
					break;
			}
		}
	}

	Filter.prototype = {
		buildCondition: function(params) {
			if (this._conditions)
				return buildConditions(this._conditions, params);
		},
		buildFn: function(params, mergeFilter) {
			var self = this,
				conditions, fnFilter, mergeFilterFn;

			if (self._filter)
				fnFilter = self._filter;
			else if (self._conditions) {
				conditions = this.buildCondition(params);
				if (conditions)
					fnFilter = buildFn(conditions)
			} else if(!mergeFilter)
				fnFilter = compileObjectCondition(st.mergeObj(params, self._params));

			if (mergeFilter) {
				filterType = typeof(mergeFilter);
				if (filterType === 'string')
					mergeFilterFn = (new Filter(mergeFilter)).buildFn(params);
				else if(filterType === 'function')
					mergeFilterFn = mergeFilter;
			}

			return st.mergeFn(fnFilter, mergeFilterFn);
		}
	}

	function compileObjectCondition(obj) {
		return function(item) {
			var check = true;
			$.each(obj, function(name, value) {
				if (item[name] !== value) {
					check = false;
					return check;
				}
			})
			return check;
		}
	}

	function compileStringCondition(filter) {
		var groups = [],
			deep = 0,
			chain = [groups];

		filter.split('(').forEach(function(part, i) {
			if (i === 0) {
				compileGroup(chain, deep, part)
			} else {
				part.split(')').forEach(function(exp, i) {
					i > 0 ? deep-- : deep++;

					compileGroup(chain, deep, exp);
				})
			}
		})
		return groups.length ? groups : null;
		//console.log(groups);
	}

	function compileGroup(chain, deep, part) {
		var group, arr, condition, len = chain.length - 1;

		arr = part.split(/\s(or|and)\s/g);
		if (arr[0].length === 0 && Relations.indexOf(arr[1]) > -1) {
			arr.shift();
			chain[len].or = arr.shift() === Relations[1];
		}

		if (deep === len) {
			group = chain[deep];
		} else if (deep > len)
			group = chain[deep] = [];
		else {
			group = chain[deep];
			group.push(chain.pop());
		}

		arr.forEach(function(item, i) {
			if (item) {
				if (Relations.indexOf(item) > -1) {
					condition.or = item === Relations[1];
				} else {
					condition = compileConditionStr(item);
					group.push(condition);
				}
			}
		})
	}

	function compileConditionStr(condition) {
		var arr, ignoreNull = false,
			index;

		if (condition.charAt(0) === NullIgnoreSign[0]) {
			index = condition.lastIndexOf(NullIgnoreSign[1]);
			if (index > 1) {
				condition = condition.substring(1, index);
				ignoreNull = true;
			} else {
				condition = condition.substring(1);
			}
		}

		arr = condition.split(' ').filter(function(item) {
			return item.length > 0;
		});

		return {
			ignoreNull: ignoreNull,
			field: arr[0],
			operation: arr[1],
			param: arr[2]
		};
	}

	function buildConditions(conditions, params) {
		var unit, orGroup, lastOr, or, pass, newGroup, len = conditions.length - 1,
			group = [],
			chain = [group];

		conditions.forEach(function(condition, i) {

			if (pass) {
				pass = false;
				lastOr = condition.or;
				return;
			}

			or = condition.or;
			if (isArray(condition)) {
				unit = buildConditions(condition, params);
			} else {
				param = condition.param;
				if (param.charAt(0) === '@')
					param = st.getObj(params, param.substr(1));

				if (condition.ignoreNull && param == null) {
					or && (pass = true);
					unit = null;
				} else {
					unit = {
						field: condition.field,
						operation: condition.operation,
						param: param
					};
				}
			}
			if (unit) {
				if (i === len) {
					if (or)
						group = chain[0];
				} else if (i > 0 && !lastOr !== !or) {
					if (or) {
						if (chain.length > 1) {
							group = chain[0];
							chain = [group];
						} else {
							chain[0] = group = [{
								and: group
							}];
						}
					} else {
						newGroup = [];
						chain.push(newGroup);
						group.push({
							and: newGroup
						});
						group = newGroup;
					}
				}
				group.push(unit);
			}
			if (or)
				orGroup = true;

			lastOr = or;
		})
		group = chain[0];
		if (group.length)
			return orGroup ? {
				or: group
			} : {
				and: group
			};
	}

	function buildFn(conditions) {
		return function(data) {
			var result = true,
				isOr;
			$.each(conditions, function(relation, condition) {
				if (!checkGroup(data, condition, relation === 'or')) {
					result = false;
				}
			})
			return result;
		}
	}

	function checkGroup(data, condistions, isOr) {
		var group, result;
		condistions.some(function(condition, i) {
			if (condition.field) {
				result = compare(data, condition);
			} else {
				if (group = condition.or)
					result = checkGroup(data, group, true);
				else if (group = condition.and)
					result = checkGroup(data, group, false);
			}
			if(isOr && result)
				return true;
			else if (!isOr && !result)
				return true;
		})
		return result;
	}

	function getIndex(datas, data) {
		if (data && datas && datas.length && datas.indexOf)
			return datas.indexOf(String(data)) > -1;

		return false;
	}

	function checkStartEnd(datas, data, endOf) {
		if (data && datas && datas.length && datas.substr) {
			data = String(data);
			return (endOf ? datas.substr(datas.length - data.length) : datas.substr(0, data.length)) === data;
		}
		return false;
	}

	var Operations = {
		"=": function(data, param) {
			return data === param;
		},
		"<": function(data, param) {
			return data < param;
		},
		"<=": function(data, param) {
			return data <= param;
		},
		">": function(data, param) {
			return data > param;
		},
		">=": function(data, param) {
			return data >= param;
		},
		"in": function(data, param) {
			return getIndex(param, data);
		},
		"like": getIndex,
		"startOf": checkStartEnd,
		"endOf": function(data, param) {
			return checkStartEnd(data, param, true);
		}
	};

	function compare(data, condition) {
		var check = Operations[condition.operation];
		return check ? check(st.getObj(data, condition.field), condition.param) : false;

	}

	return {
		filterBuilder: function(filter) {
			return new Filter(filter);
		}
	};
});/************************************* Smart JS **************************
NOTE: dataManager数据管理 
Features：
    1.dataServices ：数据服务接口
    2.dataManager ：基于策略的数据管理基类；
    2.dataPolicyManager ：数据策略管理器；

Update Note：
    2014.6 ：Created

Needs：util,aop,oop
    
****************************************************************************/
stDefine('dataManager', function(st) {

	var dataManager, policyManager, dataServices,
		_config = {
			ignoreMerges: ["params", "filter", "_filterBuilder"],
			dmOp: {
				set: {},
				get: {}
			}
		},
		defFilterBuilder = st.filterBuilder(),
		promiseEvent = st.promiseEvent,
		isFunction = $.isFunction;


	//数据服务
	dataServices = st.factory({
		name: "dataServices",
		proto: {
			//通过操作方法；type：操作类型; op：操作参数
			operate: function(type, op) {
				var ds = this.find(op.dsType);
				if (ds) {
					if (type !== 'initOptions') {
						ds.initOptions(op);
					}
					return ds[type](op);
				} else
					throw op.dsType + ",not defined in dataServices!";
			},
			//查询方法；op：操作参数
			search: function(op) {
				return this.operate('search', op);
			},
			//更新方法；op：操作参数
			update: function(op) {
				return this.operate('update', op);
			}
		},
		base: {
			//查询接口
			search: function(op) {},
			//更新接口
			update: function(op) {},
			//通用初始化参数接口
			initOptions: function(op) {}
		}
	})

	//数据管理器
	dataManager = st.factory({
		name: "dataManager",
		type: "class",
		proto: {
			//创建dm方法
			create: function(type, op) {
				var dm = this.find(type);
				if (dm)
					return new dm(op);
				else
					console.log(type + ",not defined in dataManager");
			}
		},
		base: {
			_filterMode: true,
			//_operations : ["get","set"],
			klassInit: function(op) {
				var dm = st.attachTrigger(this);

				op = dm.op = st.mergeObj(op, _config.dmOp);

				initPolicy(dm, op.get, 'get');
				initPolicy(dm, op.set, 'set');

				initFlow(dm);
				policyManager.applyPolicy(dm, dm._Flow, op);
				this.init(op);
			},
			//dm初始化方法
			init: function(op) {},
			//获取数据
			get: function(conf) {
				var dm = this;
				conf = initConf(dm, conf);
				return whenFlow(dm._Flow.boot(dm, dm.op, conf.policy), conf.success, conf.error);
			},
			//设置数据
			set: function(conf) {
				var dm = this;
				conf = initConf(dm, conf);
				return whenFlow(dm._Flow.bootWithStart("setData", [dm, dm.op, conf.policy]), conf.success, conf.error);
			},
			//dm内置查询
			_innerSearch: function(op) {

			},
			//dm内置更新
			_innerUpdate: function(op) {

			},
			//检查数据是否为空
			checkEmpty: function(data, conf) {
				return data === undefined;
			},
			//验证方法
			validate: function() {

			},
			//清空方法
			clear: function() {

			},
			//初始化数据服务配置方法
			setDataSerive: function(config) {},
			initPolicy: function(policy, type) {
				if (this._filterMode) {
					policy._filterBuilder = policy.filter ? st.filterBuilder(policy.filter) : defFilterBuilder;
				}
			},
			buildParams: function(policy, defPolicy) {
				buildParams(this, policy, defPolicy);
			},
			buildPolicy: function(policy, defPolicy) {
				this.buildParams(policy, defPolicy)
				st.mergeObj(policy, defPolicy, _config.ignoreMerges);
			}
		}
	});

	function initFlow(dm) {
		dm._Flow = st.flowController({
			flow: {
				buildGetPolicy: function(e, dm, op, policy, isTrigger) {
					//合并策略
					dm.buildPolicy(policy, op.get);
				},
				getData: function(e, dm, op, policy, isTrigger) {
					var result = searchDM(dm, policy);
					e.__getDone = true;
					if (checkEmpty(dm, result, policy)) {
						e.next("getFromDs");
					} else {
						e.next("getFromDm");
					}
					return result;
				},
				getFromDm: function(e, dm, op, policy, isTrigger) {
					var result = e.__getDone ? e.result : searchDM(dm, policy);
					if (!policy.update)
						e.end();

					return result;
				},
				getFromDs: function(e, dm, op, policy, isTrigger) {
					var success, ds = getDs(policy, op);
					if (ds) {
						success = function(result) {
							if (policy.update !== false) {
								dm.set(buildGetSetPolicy(dm, result, policy,
									function(result) {
										e.end().resolve(result);
									}, e.reject));

							} else {
								e.end().resolve(result);
							}
						}

						openDatatransfer('search', ds, dm, policy, success, e.reject);
						return e.promise();
					} else {
						e.end().resolve(searchDM(dm, policy));
					}
				},
				setData: function(e, dm, op, policy, isTrigger) {
					//合并策略
					dm.buildPolicy(policy, op.set);
					e.next(policy.way === 'ds' ? 'setToDs' : 'setToDm');
				},
				setToDm : function(e, dm, op, policy, isTrigger){
					if(policy.way !== 'dm')
						e.next('setToDs');
					return dm._innerUpdate(policy);;
				},
				setToDs: function(e, dm, op, policy, isTrigger) {
					var success, error, ds = getDs(policy, op),
						isPending = policy.pending !== false;

					if (ds) {
						if (isPending) {
							success = e.resolve;
							error = e.reject;
						} else {
							e.resolve(data);
						}

						openDatatransfer('update', ds, dm, policy, success, error);

						if (isPending)
							return e.promise();
					}
				}
			},
			order: ["buildGetPolicy", "getData", "setData"],
			trigger: true
		});
	}

	function initPolicy(dm, policy, type) {
		if (policy) {
			dm.initPolicy(policy, type);
			if (policy.get && (type === 'get' || type === 'trigger'))
				dm.initPolicy(policy.get, 'set');
		}
	}

	//初始化dm的get，set配置

	function initConf(dm, conf) {
		if (!conf) {
			conf = {};
		}
		var success = conf.success,
			error = conf.error;

		conf.success = null;
		conf.error = null;

		return {
			policy: conf,
			success: success,
			error: error
		};
	}

	function checkEmpty(dm, data, policy) {
		return (dm.op.checkEmpty || dm.checkEmpty)(data, policy)
	}

	function whenFlow(fireResult, success, error) {
		var d = $.Deferred();
		$.when(fireResult).done(function(result) {
			success && success(result);
			d.resolve(result);
		}).fail(function(err) {
			error && error(err);
			d.resolve(err);
		})
		return d.promise();
	}

	function buildParams(dm, policy, mgPolicy) {
		if(policy._$builded)
			return;
		
		var mgParams, pType, params = policy.params;

		//条件参数处理
		if (isFunction(params)) {
			params = policy.params = params.apply(null, [dm, policy]);
		}

		if (mgPolicy && policy.mergeFilter !== false) {
			mgParams = mgPolicy.params;

			if (isFunction(mgParams)) {
				mgParams = mgParams.apply(null, [dm, policy]);
			}

			if (params) {
				pType = typeof params;
				if (pType === typeof mgParams && pType === 'object') {
					//合并条件参数
					st.mergeObj(params, mgParams);
				}
			} else {
				policy.params = mgParams;
			}
		}
		if (dm._filterMode) {
			var filterBuilder = mgPolicy && mgPolicy._filterBuilder || defFilterBuilder;
			policy.filter = filterBuilder.buildFn(policy.params, policy.filter);
		}
		policy._$builded = true;
	}

	function buildGetSetPolicy(dm, data, policy, success, error) {
		var setPolicy = {
			data: data,
			filter: policy.filter,
			params: policy.params,
			way: 'dm',
			pending: false,
			success: success,
			error: error
		};

		if (policy.set) {
			dm.buildPolicy(policy.set, setPolicy);
			return policy.set
		}
		return setPolicy;
	}

	function searchDM(dm, policy) {
		return dm._innerSearch(policy);
	}

	function getDs() {
		var args = arguments,
			len = args.length,
			i = 0,
			ds;

		for (; i < len; i++) {
			if ((arg = args[i]) && (ds = arg.dataServices))
				return ds;
		};
	}

	//开启数据传输

	function openDatatransfer(type, ds, dm, policy, success, error) {
		var dsOp, fnDsQueue, i = 0;

		function buildDsOp(op) {
			var conf = $.extend(true, {}, op, policy);
			conf.success = success;
			conf.error = error;
			dm.setDataSerive(conf);
			return conf;
		}
		if ($.isArray(ds)) {
			fnDsQueue = function() {
				if (dsOp = ds[i++]) {
					dsOp = buildDsOp(dsOp);
					dsOp.success = function(result) {
						checkEmpty(dm, result, policy) ? fnDsQueue() : success(result);
					}
					dataServices.operate(type, dsOp);
				} else
					success(data);
			}
			fnDsQueue();
		} else
			dataServices.operate(type, buildDsOp(ds));
	}

	//策略管理器
	policyManager = st.factory({
		name: "DataPolicyManager",
		type: 'copy',
		proto: {
			applyPolicy: function(dm, flow, op) {
				this.fire('init', [dm, flow, op]);
			}
		},
		base: {
			init: function(dm, flow, op) {

			}
		}
	});

	policyManager.add("getWay", {
		init: function(dm, flow, op) {
			flow.onBefore("getData", "checkGetWay", function(e, dm, op, policy) {
				var way = policy.way,
					node;
				if (way) {
					if (way === 'ds') {
						node = 'getFromDs';
					} else if (way === 'dm') {
						node = 'getFromDm';
					}
					node && e.next(node).stop();
				}
			})

		}
	});

	//判断并设置定时器

	function checkTimer(id, timer, fn, dm) {
		if (!timer)
			return fn;

		var timers = dm.__timers;
		if (!__timers) {
			timers = dm.__timers = {};
			dm.stopTimer = function(id) {
				var ts = this.__timers,
					no;
				if ($.isEmptyObject(ts))
					return;

				if (id) {
					if (no = ts[id]) {
						ts[id] = null;
						clearInterval(no);
					}
				} else {
					$.each(ts, function(i, no) {
						no && clearInterval(no);
					});
					this.__timers = {};
				}

			}
		}
		return function() {
			timers[id] = setInterval(fn, timer)
		}
	}

	//解析Trigger

	function compileTrigger(i, conf, dm, flow, op) {
		var flowNode, fnRemove, conf = initConf(dm,conf),
			trPolicy = conf.policy,
			isDef = trPolicy.def,
			setPolicy = trPolicy.set,
			pos = trPolicy.position,
			delay = trPolicy.delay || 0,
			timer = trPolicy.timer,
			userfulLife = trPolicy.userfulLife;

		initPolicy(dm, trPolicy, 'trigger');

		//判断注入的流程节点
		flowNode = trPolicy.def ? "buildGetPolicy" : (pos === "get" ? "getData" : (pos === "dm" ? "getFromDm" : "getFromDs"));

		//注入Handler
		// success = st.mergeFn(trPolicy.success, function(result) {
		// 	dm.fireHandler("trigger", [result, trPolicy]);
		// });

		//有效期
		if (userfulLife) {
			if (userfulLife === "once") {
				fnRemove = function() {
					return true;
				}
			} else if (isFunction(userfulLife)) {
				fnRemove = userfulLife;
			}
		}

		flow.on(flowNode, "trigger", function(e, dm, op, policy, isTrigger) {
			var fnRequest, ds, _policy, fnSuccess;
			if (isTrigger)
				return;

			//默认时与get动作policy合并
			if (isDef) {
				dm.buildPolicy(policy, trPolicy);
				return;
			}

			_policy = $.extend({
				mergeFilter: false,
				way: 'ds',
			}, trPolicy);

			//合并filter
			buildParams(dm, _policy, policy);

			fnRequest = function() {
				whenFlow(dm._Flow.bootWithStart("getData", [dm, dm.op, _policy, true]), conf.success, conf.error).always(function(result) {
					dm.fireHandler("trigger", [result, _policy]);
				});
			}

			setTimeout(checkTimer(i, timer, fnRequest, dm), delay);
		})
	}

	//添加触发器
	policyManager.add("trigger", {
		init: function(dm, flow, op) {
			var trigger = op.get && op.get.trigger;
			if (trigger) {

				$.each(trigger, function(i, trPolicy) {
					compileTrigger(i, trPolicy, dm, flow, op);
				});
				op.get.trigger = null;
			}
		}
	});

	return {
		dataManager: dataManager,
		dataPolicyManager: policyManager,
		dataServices: dataServices
	};
});stDefine("dataManager-table", function(st) {
	var isArray = $.isArray,
		isPlainObj = $.isPlainObject,
		_states = ["_$new", "_$selected", "_$updated", "_$deleted"],
		_dtConfig = {
			//分页设置
			pageInf: {
				pageSize: 20,
				groupSize: 20,
				page : 1,
				total: 0
			},
			getField : {
				pageInf : "pageInf",
				result :　"result"
			}
		};

	st.dataManager.add("DataTable", {
		init: function(op) {
			var dm = this;
			st.mergeObj(true, op, _dtConfig);

			dm.$store = [];

			if (op.crud) {
				dm.crud.forEach(function(type, conf) {
					dm.initPolicy(conf);
					conf.set && dm.initPolicy(conf.set);
				})
			} else
				op.crud = {};

			//注册处理设置数据方法
			dm._Flow.onBefore("setData", "handleResult", handleResult);
		},
		getKey: function() {
			return this.op.key;
		},
		checkEmpty: function(data, filter) {
			return data == null || data.length === 0;
		},
		clear: function() {
			this.$store = [];
		},
		_innerUpdate: function(config) {
			if (!config)
				return;

			var isReplace = config.updateMode === 'replace',
				updateType = config.updateType,
				filter = config.filter,
				dm = this,
				data = config.data,
				store = dm.$store,
				isOneData = !isArray(data);

			if (updateType === 'find')
				updateFindData(dm, data);
			else if (updateType === 'insert') {
				insertData(dm, data);
			} else if (updateType === 'delete') {
				deleteData(dm, config);
			} else {
				(isArray(data) ? updateData : updateOneData)(dm, data, config, isReplace, updateType === 'save');
			}
			return data;
		},
		store: function(data) {
			if (checkArray(data)) {
				this.$store = data;
			}
		},
		//单条数据更新
		updateOne: function(config) {
			if (!config)
				return;

			buildParamByOne(this, config);
			return this.update(config);
		},
		update: function(config) {
			buildCRUDConfig(this, 'update', config);
			return this.set(config);
		},
		insert: function(config) {
			buildCRUDConfig(this, 'insert', config);
			return this.set(config);
		},
		save: function(config) {
			buildCRUDConfig(this, 'save', config);
			return this.set(config);
		},
		_innerSearch: function(config) {
			return findDm(this, config);
		},
		findOne: function(config) {
			var success;
			if (config) {
				buildParamByOne(this, config);
				success = config.success;
			} else {
				config = {};
			}

			if (success) {
				config.success = function(data) {
					success(data && data[0]);
				}
			}
			return this.find(buildCRUDConfig(this, 'findOne', config, true));
		},
		find: function(config) {
			buildCRUDConfig(this, 'find', config, true)
			initFindConfig(this.op, config);
			return this.get(config);
		},
		removeOne: function(config) {
			if (!config)
				return;

			buildParamByOne(this, config);
			return this.remove(config);
		},
		remove: function(config) {
			return this.update(buildCRUDConfig(this, 'remove', config));
		},
		findWithStates: function(states, config) {
			var stateFilter = [];

			states.forEach(function(state) {
				result[state] = [];
			})

			stateFilter = function(item) {
				states.some(function(state) {
					if (item[state]) {
						result[state].push(item);
						return true;
					}
				})
			}
			return result;
		},
		findByState: function(state, config) {

		},
		setDataSerive: function(conf) {

		}
	});

	function checkArray(data) {
		if (isArray(data))
			return true;

		console.log("存储的数据不正确！");
	}

	function buildCRUDConfig(dm, type, conf, isFind) {
		var defConf = dm.op.crud[type];
		if (!conf)
			conf = {};

		defConf && dm.buildPolicy(conf, defConf);

		if (!isFind && conf.updateType == null)
			conf.updateType = type;

		return conf;
	}

	function initFindConfig(op, config) {
		var changed, pageInf = config.pageInf,
			oldPageInf = op.pageInf;

		if (config.update && !config.updateType)
			config.updateType = 'find';

		if (config.way)
			return;

		if(pageInf && checkChanged(pageInf,oldPageInf,["page","pageSize"]))
			changed = true;
		else
			changed = checkChanged(config,op,["order","group"]);;

		changed && (config.way = 'ds');
	}

	function checkChanged(obj,oldObj,fields){
		var value,changed;
		fields.some(function(field){
			value1 = obj[field];
			if((value != null) && value == oldObj[field]){
				changed = true;
				return true;
			}
		})
		return changed;
	}

	//生成操作单个的param
	function buildParamByOne(dm, policy) {
		var params, key, keyValue, type;

		if (policy && (params = policy.params) != null) {
			type = typeof params;
			if (type !== 'function') {
				if (type !== 'object' && (key = dm.getKey())) {
					keyValue = params;
					policy.params = params = {};
					params[key] = keyValue;
				}
			}
		}
	}

	function handleResult(e, dm, op, policy, isTrigger) {
		var data = policy.data,pageInf;
		if(data && (pageInf = data[op.getField.pageInf])){
			$.extend(op.pageInf,pageInf);
			policy.data = data[op.getField.result];
		}
	}

	function updateFindData(dm, data) {
		dm.store(data || []);
	}

	function insertData(dm, data) {
		var store = dm.$store;
		if (isArray(data))
			dm.$store = store.concat(data);
		else
			store.push(data);
	}

	function updateItemByFilter(store, data, filter, isReplace) {
		var isUpdated;
		//根据条件检索
		store.forEach(function(item, i) {
			if (filter(item, i)) {
				if (isReplace)
					store[i] = data;
				else
					$.extend(item, data);

				isUpdated = true;
				return false;
			}
		})
		return isUpdated;
	}

	function updateOneData(dm, data, config, isReplace, saveMode) {
		var isUpdated, store = dm.$store;

		if (store.length && config.filter) {
			isUpdated = updateItemByFilter(store, data, config.filter, isReplace);
		}

		//没有更新时插入数据
		saveMode && isUpdated || insertData(dm, [data]);
		return true;
	}

	function updateData(dm, data, config, isReplace, saveMode) {
		var filter, store = dm.$store,
			key = dm.getKey(),
			keyValue, updateNum = 0;

		if (store.length && key) {
			//通过Key来更新
			data.forEach(function(updateItem, i) {
				keyValue = updateItem[key];
				if (!updateItemByFilter(store, updateItem, function(item) {
					return item[key] === keyValue;
				}, isReplace)) {
					//找不到更新项时，插入数据
					if (saveMode) {
						updateNum++;
						insertData(dm, updateItem);
					}
				} else
					updateNum++;
			})
		} else if (saveMode) {
			insertData(dm, data);
			updateNum = data.length;
		}
		return updateNum;
	}

	function findDm(dm, config) {
		var store = dm.$store,
			result = [];

		if (store.length === 0)
			return result;

		if (config && config.filter) {
			forEachByFitler(store, config, function(item) {
				result.push(item);
			}, true);
			return result;
		}
		return result.concat(store);
	}

	function forEachByFitler(data, config, handle, filterMode) {
		var filter, pageInf, index,
			start = 0,
			end = data.length,
			item;

		if (end === 0)
			return;

		if (config) {

			filter = config.filter;
			//判断filterMode下，filter为空时退出
			if (!filter && filterMode)
				return;

			pageInf = config.pageInf;
			//根据分页信息设置检索范围
			if (pageInf && pageInf.page) {
				st.mergeObj(pageinf, _dtConfig.pageInf);
				start = (pageInf.page - 1) * pageInf.pageSize;
				start + pageInf.pageSize > end && (end = start + pageInf.pageSize);
			}
		}

		if (filter) {
			for (; start < end; start++) {
				item = data[start];
				if (filter(item, start, data)) {
					index = handle(item, start, data);
					if (index != null) {
						start = index;
					}
				}
			}
		} else {
			for (; start < end; start++) {
				index = handle(item, start, data);
				if (index != null) {
					start = index;
				}
			}
		}
	}

	function deleteData(dm, config) {
		var filter, store = dm.$store,
			count = 0,
			start = 0,
			end = store.length,
			index, item, handle;

		if (end === 0)
			return;

		if (config && (filter = config.filter)) {
			if (config.preDelete) {
				handle = function(item, index) {
					setState(item, _states[3], true);
				}
			} else {
				handle = function(item, index) {
					store.splice(index, 1);
					count++;
					return --index;
				}
			}
			forEachByFitler(store, config, handle, true);
		} else
			dm.$store = [];

		return count;
	}

	function setState(item, type, value) {
		item[type] = value;
	}
})

// policy = {
// 	get: {
// 		//获取的方式，auto默认方式；dm，只用dm获取；ds，从
// 		way: ""
// 	},
// 	set: {

// 	},
// 	dataServices: [{
// 		//数据服务类型
// 		dsType: str,
// 		//过滤参数
// 		param： obj,
// 		//过滤器
// 		fitler: fn | obj
// 		//更新的数据
// 		data： obj,
// 		//成功以后执行的方法
// 		success: success,
// 		//失败以后执行的方法
// 		error: error

// 	}]
// }

// //服务端的user数据转成前端model数据
// var userData = {
// 	id: 1,
// 	name: "user1",
// 	age: 20,
// 	role: "tester"，
// 	//关联projectid
// 	projectId： 1
// }
// //项目数据的model数据
// var projectData = {
// 	id: 1
// 	name: "smartjs",
// 	ver： "0.3"
// }

// //创建一个object的对象
// var user = dataManager.create("object", {
// 	//设置主键字段
// 	key: "id",
// 	//get动作的策略
// 	get: {
// 		//定义数据服务
// 		dataServices: {
// 			//ajax数据服务
// 			dsType: "ajax",
// 			//默认的请求url地址；根据id查询
// 			url: "services/user/{id}",
// 			//url规则映射
// 			fieldMapping: {
// 				//project的查询地址
// 				project: "services/project/{projectId}"
// 			}
// 		}
// 	}
// })

// //首先通过id=1的条件，查询user
// user.get({
// 	//设置查询参数，默认匹配key字段
// 	params: 1,
// 	//执行成功，数据填充到dm，并执行成功方法
// 	success: function(result) {
// 		//进行数据渲染
// 		renderUser(result);
// 	}
// })

// //当需要查询项目信息时
// user.get({
// 	//查询的字段；dm会根据field匹配到fieldMapping的ajax设置，从而拿到数据
// 	field: "project",
// 	//执行成功，数据填充到dm，并执行成功方法
// 	success: function(result) {
// 		//进行数据渲染
// 		renderProject(result);
// 	}
// })

// //如果采用第二种方式，我们在查询玩user后，想延迟10s在加载project信息，那么应该怎么做？
// //答案是:使用dataManager的trigger

// var user = dataManager.create("object", {
// 	//设置主键字段
// 	key: "id",
// 	//get动作的策略
// 	get: {
// 		//定义数据服务
// 		dataServices: {
// 			//ajax数据服务
// 			dsType: "ajax",
// 			//默认的请求url地址；根据id查询
// 			url: "services/user/{id}"
// 		},
// 		//定义触发器
// 		trigger: [{
// 			name: "get project",
// 			//延迟10s
// 			delay: 10000,
// 			field: "project",
// 			dataServices: {
// 				//ajax数据服务
// 				dsType: "ajax",
// 				//project的查询地址
// 				url: "services/project/{projectId}",
// 			},
// 			//触发器执行成功，数据填充到dm数据的project字段中，并执行成功方法
// 			success: function(result) {
// 				//进行数据渲染
// 				renderProject(result);
// 			}
// 		}]
// 	}
// })
// //首先通过id=1的条件，查询user
// user.get({
// 	//设置查询参数，默认匹配key字段
// 	params: 1,
// 	//执行成功，数据填充到dm，并执行成功方法
// 	success: function(result) {
// 		//进行数据渲染
// 		renderUser(result);
// 	}
// })