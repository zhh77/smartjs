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
})(window);;
/************************************* Smart JS **************************
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
	function injectFn(target, name, fn, before,stopOnFalse) {
		if (!target && !name)
			return;

		var targetFn = target[name];
		target[name] = before ? mergeFn(fn,targetFn,stopOnFalse) : mergeFn(targetFn,fn,stopOnFalse);
	}

	//合并方法，返回结果
	function mergeFn(fn, mergeFn,stopOnFalse) {
		if (!mergeFn)
			return fn;

		if (!fn)
			return mergeFn;

		return function() {
			var self = this,
				result, args = arguments;

			result = fn.apply(self, args);
			if(stopOnFalse && result === false)
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

		return _mergeObj(deep,obj || {} , defObj, '', fnCheck);
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

	return {
		sliceArgs: sliceArgs,
		copy: copy,
		injectFn: injectFn,
		mergeFn: mergeFn,
		mergeObj: mergeObj,
		getObj: getObj,
		setObj: setObj
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
            _list,
            _defPriority = st.conf("aop-Priority"),
            _maxPriority,
            _minPriority;

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
            _list = [];
            _maxPriority = _minPriority = _defPriority;
            return false;
        }

        reset();

        //添加事件
        function add(name, fn, priority, mode) {
            if (!name && typeof name !== 'string' && !fn)
                return;

            if (priority == null)
                priority = _defPriority;
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
                fireCount = 0,
                itemNoBlock,
                len = _list.length,
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

            function fireItem(noblock) {
                var result;

                isDefined(_result) && (d.result = _result);

                if (i < len) {
                    if (item = _list[i++]) {

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

    //trigger的接口设置
    var _interface = {
        on: "on",
        onBefore: "onBefore",
        onRound: "onRound",
        off: "off",
        offBefore: "offBefore",
        extend: "extend"
    },
        //注入类型
        trTypes = ['before', 'after', 'round', 'exception'],
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
                baseFn = _fnMap[_name] = _target[_name];
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

                if (isProp) {
                    //属性绑定
                    defineProperty(_target, name, {
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
            on: function(name, trName, fn, priority, mode) {
                return bind(name, trName, fn, trTypes[1], priority, mode)
            },
            onBefore: function(name, trName, fn, priority, mode) {
                return bind(name, trName, fn, trTypes[0], priority, mode)
            },
            onRound: function(name, trName, fn) {
                return bind(name, trName, fn, trTypes[2])
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
		dsConfig = {
			set: {},
			get: {}
		}, promiseEvent;

	promiseEvent = st.promiseEvent;


	//数据服务
	dataServices = st.factory({
		name: "dataServices",
		type: 'merge',
		proto: {
			operate: function(type, op) {
				var ds = this.find(op.dsType);
				if (ds) {
					if(type !== 'initOptions'){
						ds.initOptions(op);
					}
					return ds[type](op);
				} else
					throw op.dsType + ",not defined in dataServices!";
			},
			search: function(op) {
				return this.operate('search', op);
			},
			update: function(op) {
				return this.operate('update', op);
			}
		},
		base: {
			search: function(op) {},
			update: function(op) {},
			initOptions : function(op){
			}
		}
	})

	function isFunction(fn) {
		return typeof fn === 'function';
	}

	//在success中注入委托
	function injectFireHandler(dm, handler,conf) {
		return st.mergeFn(conf.success, function(result) {
			dm.fireHandler(handler, [result, conf]);
		})
	}

	//初始化dm的get，set配置
	function initConf(dm, type, conf) {
		if (!conf) {
			conf = {};
		}
		var success = injectFireHandler(dm, type, conf),
			error = conf.error;

		conf.success = null;
		conf.error = null;

		return {
			policy: conf,
			success: success,
			error: error
		};
	}

	//数据管理
	dataManager = st.factory({
		name: "dataManager",
		type: "class",
		proto: {
			create: function(name, op) {
				var dm = this.find(name);
				if (dm)
					return new dm(op);
				else
					console.log(name + ",not defined in dataManager");
			},
			//生成fitler方法
			buildFilter: function(filter,conf) {
				if (filter && !$.isFunction(filter)) {
					if ($.isPlainObject(filter)) {
						return function(item) {
							var check = true;
							$.each(filter, function(name, value) {
								if (item[name] !== value) {
									check = false;
									return check;
								}
							})
							return check;
						}
					}
				}
				return filter;
			}
		},
		base: {
			klassInit: function(op) {
				var dm = this;
				op = dm.op = st.mergeObj(op, dsConfig);
				op.handler = {};
				//添加委托处理器
				dm.addHandler("get", "set");
				initFlow(dm);
				policyManager.applyPolicy(dm, dm._Flow, op);
				this.init(op);
			},
			//dm初始化方法
			init: function(op) {

			},
			//获取数据
			get: function(conf) {
				var dm = this;
				conf = initConf(dm, "get", conf);
				return whenFlow(dm._Flow.boot(dm, dm.op, conf.policy), conf.success, conf.error);
			},
			//设置数据
			set: function(conf) {
				var dm = this;
				conf = initConf(dm, "set", conf);
				return whenFlow(dm._Flow.bootWithStart("setData", [dm, dm.op, conf.policy]), conf.success, conf.error);
			},
			//注册方法到事件委托，handler委托名称：get，set，trigger
			onHandler: function(handler, fnName, fn, priority, mode) {
				if (handler = this.op.handler[handler])
					return handler.add(fnName, fn, priority, mode);
			},
			//添加事件委托
			addHandler: function() {
				var handler = this.op.handler,
					mode = "callback";

				$.each(arguments, function(i, name) {
					handler[name] = promiseEvent(mode);
				})
			},
			//执行事件委托
			fireHandler: function(name, args) {
				var dm = this,
					handler = dm.op.handler[name];
				if (handler)
					return handler.fireWith(dm, args);
			},
			//dm内置查询
			innerSearch: function(op) {

			},
			//dm内置更新
			innerUpdate: function(op) {

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
			setDataSerive : function(config){

			}
		}
	});

	function checkEmpty(dm, data, policy) {
		return (dm.op.checkEmpty || dm.checkEmpty)(data, policy)
	}

	function whenFlow(fireResult, success, error) {
		return $.when(fireResult).then(success, error);
	}

	//编译字符串过滤如 name > @name and (age < @age or type = '')
	function compileFilter(policy){
		var filter = policy.filter;
		if(typeof filter === "string")
		{

		}
	}

	function mergeFilter(policy, mgPolicy, args) {
		var mgParams, mgPType, mgFilter, params = policy.params,
			pType = typeof params,isMergeFilter;

		//条件参数处理
		if (pType === 'function') {
			params = params.apply(null, args);
		}

		if (mgPolicy) {
			mgParams = mgPolicy.params;
			mgPType = typeof mgParams;
			mgFilter = mgPolicy.filter;

			if (mgPType === 'function') {
				mgParams = mgParams.apply(null, args);
				mgPType = typeof mgParams;
			}

			if (params) {
				if (pType === mgPType && pType === 'object') {
					//合并条件参数
					st.mergeObj(params, mgParams);
					isMergeFilter = true;
				}
			} else {
				if (mgParams)
					params = mgParams;
				else
					isMergeFilter = true;
			}
		}

		policy.params = params;

		//合并过滤方法
		if(isMergeFilter && mgFilter)
			st.injectFn(policy, 'filter', mgFilter, false, true);
		else
			policy.filter == null && (policy.filter = params);
		return policy;
	}

	function mergePolicy(policy, mgPolicy, args) {
		//合并过滤条件
		policy.mergeFilter !== false && mergeFilter(policy, mgPolicy, args);

		//合并策略
		st.mergeObj(policy, mgPolicy, ["filter", "params"]);
		return policy;
	}

	function buildGetSetPolicy(dm, data, policy, success, error) {
		var setPolicy = {
			data: data,
			filter: policy.filter,
			params: policy.params,
			updateToDs: false,
			pending: false,
			success: success,
			error: error
		};
		policy.set && (setPolicy = mergePolicy(policy.set, setPolicy, [dm, policy]));

		return setPolicy;
	}

	function searchDM(dm, policy) {
		return dm.innerSearch(policy);
	}

	function initFlow(dm) {
		dm._Flow = st.flowController({
			flow: {
				buildGetPolicy: function(e, dm, op, policy) {
					//合并策略
					mergePolicy(policy, op.get, [dm, policy]);
				},
				getData: function(e, dm, op, policy) {
					var result = searchDM(dm, policy);
					e.__getDone = true;
					if (checkEmpty(dm, result, policy)) {
						e.next("getFromDs");
					} else {
						e.next("getFromDm");
					}
					return result;
				},
				getFromDm: function(e, dm, op, policy) {
					e.end();
					if (!e.__getDone)
						return searchDM(dm, policy);
				},
				getFromDs: function(e, dm, op, policy) {
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
				setData: function(e, dm, op, policy) {
					//合并策略
					mergePolicy(policy, op.set, [dm, policy]);

					if (policy.updateToDs !== false) {
						e.next('setToDs');
					}
					return dm.innerUpdate(policy);;
				},
				setToDs: function(e, dm, op, policy) {
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
			var conf = $.extend(true,{},op,policy);
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
	function compileTrigger(i, trPolicy, dm, flow, op) {
		var flowNode, fnRemove, isDef = trPolicy.def,
			setPolicy = trPolicy.set,
			pos = trPolicy.position,
			delay = trPolicy.delay || 0,
			timer = trPolicy.timer,
			error = trPolicy.error,
			userfulLife = trPolicy.userfulLife;

		//判断注入的流程节点
		flowNode = trPolicy.def ? "buildGetPolicy" : (pos === "get" ? "getData" : (pos === "dm" ? "getFromDm" : "getFromDs"));

		//注入Handler
		success = injectFireHandler(dm, "trigger", trPolicy);

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

		flow.on(flowNode, "trigger", function(e, dm, op, policy) {
			var fnRequest, ds, _policy, fnSuccess;
			//默认时与get动作policy合并
			if (isDef) {
				mergePolicy(policy, trPolicy, [dm, policy]);
				return;
			}

			_policy = $.extend({}, trPolicy);

			//合并filter
			mergeFilter(_policy, trPolicy.mergeFilter ? policy : null, [dm, policy]);

			ds = getDs(_policy, op);

			if (ds) {
				fnSuccess = function(result) {
					if (_policy.update !== false) {
						dm.set(buildGetSetPolicy(dm, result, _policy, success, error));
					} else
						success(result);
				}

				fnRequest = function() {
					openDatatransfer('search', ds, dm, _policy, fnSuccess, error);
				};

				setTimeout(checkTimer(i, timer, fnRequest, dm), delay);
			}
		})
	}

	//添加触发器
	policyManager.add("trigger", {
		init: function(dm, flow, op) {
			var trigger = op.get && op.get.trigger;
			if (trigger) {
				//添加trigger的委托处理器
				dm.addHandler("trigger");

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
})