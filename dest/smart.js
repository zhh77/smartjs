'use strict';
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
})(window);;/**
	工具包模块

	Feartures : 
		1. 基础公共方法
		2. 基础公共对象

	Update Note：
		+ 2014.8.06 加入priorityList
		+ 2014.5 ：Created
		
	@module Util
*/
stDefine('util', function(st) {
	/**
        util常用公共方法
        @class util
    */
    var util = {
		sliceArgs: sliceArgs,
		copy: copy,
		injectFn: injectFn,
		mergeFn: mergeFn,
		mergeObj: mergeObj,
		getObj: getObj,
		setObj: setObj,
		priorityList: priorityList
	};

	/**
        将argument转换成array
        @method sliceArgs
        @param args {function} argument对象
        @param [start = 0] {number} 开始位置
        @return [array] 返回转换的数组
        @example
        	 function test() {
        	 	//从第二个参数开发返回
                return st.sliceArgs(arguments, 1);
            }
            expect(test(1, 2, 3, 4).join(',')).toBe('2,3,4');
    */
	function sliceArgs(args, start) {
		return Array.prototype.slice.call(args, start || 0);
	}

	function isPlainObject(obj) {
		return $.isPlainObject(obj);
	}

	/**
        复制数据方法,支持对象字面量和数组的复制
        @method copy
        @todo：st内部对象的复制功能
        @param deep {boolean} 是否深度复制
        @param obj {object | array} 注入的方法名
        @return 返回复制之后的对象
    */
	function copy(deep, obj) {
		if (typeof deep !== 'boolean') {
			obj = deep;
			deep = false;
		}
		return $.extend(deep, {}, obj)
	}

    /**
        在目标对象方法中注入方法，返回结果
        @method injectFn
        @param target {object} 注入的目标对象
        @param name {string} 注入的方法名
        @param fn {function} 注入方法
        @param [before] {boolean} 是否前置注入，默认后置
        @param [stopOnFalse] {boolean} 是否开启返回值为false停止后续执行
        @example 
        	var result = [],
                target = {
                    test: function(arr) {
                        arr.push("test");
                    }
                };

                
            function fn(arr) {
                arr.push("inject");
            }
            
            //向target注入方法fn
            st.injectFn(target, "test", fn);

            target.test(result);

            //结果执行注入函数fn
            expect(result + '').toBe('test,inject');
    */
	function injectFn(target, name, fn, before, stopOnFalse) {
		if (!target && !name)
			return;

		var targetFn = target[name];
		target[name] = before ? mergeFn(fn, targetFn, stopOnFalse) : mergeFn(targetFn, fn, stopOnFalse);
	}

	/**
        合并方法，返回结果
        @method mergeFn
        @param fn {function} 目标方法
        @param mergeFn {function} 合并方法，合并的方法始终在后执行
        @param [stopOnFalse] {boolean} 是否开启返回值为false停止后续执行
        @return [function] 返回合并之后的新方法
        @example
        	var result = [],
                fn1, fn2, fn3;

            //合并方法1
            fn1 = function(arr) {
                arr.push("fn1");
                return false;
            }
            //合并方法2
            fn2 = function(arr) {
                arr.push("fn2");
            }

            //将fn1和fn2合并成一个新方法fn3，并开启stopOnFalse
            fn3 = st.mergeFn(fn1, fn2, true);

            fn3(result);
            //最终因为fn1执行返回false，fn2不执行，
            expect(result + '').toBe('fn1');
    */
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

	/**
        合并默认数据方法,将obj中不空的内容从defObj中复制
        @method mergeObj
        @param [deep] {Number} 是否深度合并
        @param obj {function} 合并对象
        @param defObj {function} 默认对象
        @param [exclude] {array|function} 排除合并的设置
        @return [function] 返回合并之后的对象；如obj不为空时返回obj，否则返回新对象
        @example
        	var person = {
	            name: "piter",
	            age: 10,
	            child: [{
	                name: 'lily'
	            }]
	        };

	        var obj = {
                name: 'a'
            };

            //根据person的数据进行合并
            st.mergeObj(obj, person);

            //child被复制
            expect(obj.child).toBeDefined();

            //age被复制
            expect(obj.age).toBe(10);

            //name不为null，未被复制
            expect(obj.name).toBe('a');
    */
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

	/**
        获取对象的属性或方法，支持命名空间方式获取
        @method getObj
        @param target {object} 目标对象
        @param ns {string} 属性名称或者相对于target的路径，使用"."进行分割
        @param [root] {boolean} 是否从根开始，默认从target子开始；从根开始则忽略ns的第一级
        @return [object] 返回获取的属性或者方法
        @example
        	//等同于user.project.name
        	st.getObj(user,'project.name');
			
			//等同于user.name
        	st.getObj(user,'u.name',true);

    */
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

	/**
        设置对象的属性或方法，支持命名空间方式设置
        @method setObj
        @param target {object} 目标对象
        @param ns {string} 属性名称或者相对于target的路径，使用"."进行分割
        @param value {object} 设置的值
        @param [mode] {string} 值设置的方式,目标对象和值都为object类型有效，默认为替换；"merge" : 合并默认值；"extend" : extend方式合并值；
        @param [root] {boolean} 是否从根开始，默认从target子开始；从根开始则忽略ns的第一级
        @return [object] 返回获取的属性或者方法
        @example

        	//等同于 user.name = 'roy'
        	st.setObj(user,'name','roy');

			//等同于 user.project.name = 'smartjs';
        	st.setObj(user,'project.name','smartjs');

        	//等同于 st.mergeObj(user.project,{name:'smartjs'});
        	st.setObj(user,'project',{name:'smartjs'},"merge");

    */
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

	/**
		权重列表,根据权重的由大到小进入插入。
		具有两种item模式：
			1. 默认，正常item，手动设置priority
			2. self，读取item的priority属性
		@class priorityList
		@constructor
		@param [mode] {string} item模式 
		@param [defaultPriority=0] {number} item模式 
		@example
			var list = st.priorityList();
	*/
	function priorityList(mode, defaultPriority) {
		var _maxPriority = 0,
			_minPriority = 0,
			isSelf = mode === 'self',
			_list = [],
			_priority = defaultPriority || 0;

		function getItem(item) {
			return isSelf ? item : item.target;
		}

		 /**
            执行回调
            @method add
            @param item {Object} 添加对象
            @param [priority] {number} 权重
            @chainable
            @example 
	            //添加项
	            list.add(1).add(0);

	            //根据priority添加项
	            list.add(10, 10).add(5, 5).add(-1, -1);

	            //最终存储为[10,5,1,0,-1]
        */
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

		/**
            执行回调
            @method remove
            @param filter {function} 过滤函数，返回值：
             1. {boolean}：是否匹配；
             2. 'break' : 结束匹配；
             3. 'done' : 完成匹配
            @chainable
            @example 
	           	//删除 item为1的项
	            list.remove(function(item){
	                if(item === 1)
	                	//结束匹配
	                    return "done";
	            })
        */
		function remove(filter) {
			var type = typeof filter;
			if (type === 'function') {
				var i = 0,
					result, item;
				for (; item = _list[i]; i++) {
					result = filter(getItem(item), i, _list);
					//break立即退出
					if (result === 'break')
						break;

					if (result) {
						_list.splice(i, 1);
						i--;
						//完成退出
						if (result === 'done')
							break;
					}
				}
			} else if (type === 'number')
				_list.splice(i, 1);

			return this;
		}

		/**
           	循环列表方法，默认根据priority大到小
            @method each
            @param [desc] {boolean} 是否降序，即根据priority由小到大
            @param handler {function} 循环处理函数
            @chainable
			@example 
				 //按优先级大到小循环
	            list.each(function(item) {
	                result.push(item);
	            })
	            expect(result + '').toBe('10,5,1,0,-1');

				//按优先级小到大循环
	            list.each(true,function(item) {
	                result.push(item);
	            })
	            expect(result + '').toBe('-1,0,1,5,10');
        */
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
			/**
				根据序号获取item
				@method at
				@param index {number} 序号
				@return {object} 返回item
			*/
			at: function(index) {
				var item = _list[index];
				return item && getItem(item);
			},
			/**
				清除所有项
				@method clear
				@chainable
			*/
			clear: function() {
				_list = [];
				_maxPriority = _minPriority = 0;
				return this;
			},
			/**
				获取列表长度
				@method len
				@return {number} 列表长度
			*/
			len: function() {
				return _list.length;
			}
		};

	}

	return util;
});/**
    面向切面编程的辅助模块
    
    Feartures : 
        1. promiseEvent ：基于promise和event机制的回调管理
        2. trigger ：对象触发器
        3. flowController ：流程/生命周期控制器

    Update Note：
        + 2014.8.06 ：将priorityList应用到promiseEvent中
        + 2014.6.13 ：trigger添加属性变化监听支持
        + 2014.6.11 ：promiseEvent添加非阻塞模式
        + 2014.5 ：Created

    @module AOP
*/
stDefine('aop', function(st) {
    var sliceArgs = st.sliceArgs;

    //设置默认权重
    st.conf("aop-Priority", 0);

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

    /**
        基于事件和promise的回调管理，类似于jquery的callbacks，但具有结果传递，优先级，事件参数，promise控制等功能；
        默认注册的事件都是按照优先级，依次执行，无论同步还是异步；但在非阻塞模式下，则事件不会等待上一个执行完毕（异步），
        直接回依次执行，只是在最后的结果中会等待所有的事件执行完毕之后才返回
        @class promiseEvent
        @constructor
        @param [mode] {string} promiseEvent的模式，可以混用；
            1. 默认；event模式，所有的注册的事件，执行时，第一个事件参数为e（详细说明见promiseEvent-EventArg）
            2. 'callback' : 回调模式; 与event模式对立，执行时不会添加事件参数e
            2. 'none' : 全部事件执行一次，即有执行动作就销毁
            3. 'noBlock' : 非阻塞模式；
        @example

            //使用once和callback模式创建promiseEvent
            var calls = st.promiseEvent("once callback")
    */
    function promiseEvent(mode) {
        var _mode, _callbackMode, _noBlock,
            _onceMode,
            _list = st.priorityList("self", st.conf("aop-Priority"));

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

        /**
            清空所有事件回调
            @method clear 
            @chainable
            @example
                //清除calls下面注册的事件
                calls.clear();
        */
        function clear() {
            _list.clear();
            return this;
        }

        /**
            添加事件回调方法
            @method add 
            @param name {string} 事件回调名
            @param fn {string} 事件回调方法
            @param [priority=0] {number} 权重
            @param [mode] {string} 回调模式："once":执行一次
            @chainable
            @example

                //注册事件
                calls.add('call1', function(e, text) {})

                //自定义priority注册事件
                calls.add('call2', function(e, text) {},100)

                //单once模式注册
                calls.add('call3', function(e, text) {},'mode')

                //所有设置
                calls.add('call4', function(e, text) {},50,'mode')
                


                //返回promise
                call.add("promiseCall", function(e, name) {
                    //异步的方法
                    async(function() {
                        e.resolve();
                    });
                    return e.promise();
                });
                


                //result传递
                var resultCalls = st.promiseEvent();
                resultCalls.add("c1", function(e) {
                    //传递结果（promise下的resolve与return效果相同）
                    return "c1";
                }).add("c2", function(e) {
                    //e.result是由c1返回过来的值
                    return e.result + ",c2";
                });
                


                //callbak 模式下添加事件
                var calls1 = st.promiseEvent("callback");

                //没有eventArg参数
                calls1.add("c1", function(name) {
                });
        */
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

        /**
            删除事件回调方法
            @method remove 
            @param name {string} 事件回调名
            @chainable
            @example
                //注册事件
                calls.add('call1', function(e, text) {})

                //删除事件
                calls.remove('call1');
                
        */
        function remove(name) {
            _list.remove(function(item) {
                return item.name === name;
            })
            return this;
        }

        /**
            根据上下文对象执行回调;fire方法的增强
            @method fireWith 
            @param context {object} 上下文对象
            @param args {array} 执行参数
            @param [argHandle] {function} 参数处理方法，可以对eventarg进行修改；例如：argHandle(e)
            @return {object|promise} 返回执行结果
            @example
                //使用context上下执行
                calls.fireWith(context,[param1,param2],function(e){
                    //此处在e(EventArg)初始化时，进行扩展
                })
        */
        function fireWith(context, args, argHandle) {
            var i = 0,
                fireCount = 0,
                itemNoBlock,
                len = _list.len(),
                item, defer, _result, _err, d, _stop, _done;

            if (!len)
                return;

            if (typeof argHandle !== 'function')
                argHandle = null;

            /**
                promiseEvent中事件回调的EventArg(e)参数对象;通过EventArg可以对事件进行阻止冒泡、promise、事件删除还有结果传递等控制；
                EventArg针对上下文对象（比较trigger和flowController）下，具有的独立的方法；
                @class EventArg
            */
            d = buildPromiseArg({
                /**
                    停止所有后续事件执行
                    @method stopPropagation 
                    @chainable
                    @example
                        calls.add("c1", function(e) {
                            //阻止冒泡
                            e.stopPropagation();
                        })
                        .add("c2", function() {});

                        //只执行了c1
                        calls.fire();
                */
                stopPropagation: function() {
                    _stop = true;
                    return this;
                },
                /**
                    完成契约
                    @method resolve 
                    @param [result] {object} 返回结果
                    @example
                        var pCalls = st.promiseEvent();

                        pCalls.add("c1", function(e, name) {
                            //延迟100ms
                            setTimeout(function() {
                                //完成promise,并返回结果
                                e.resolve(name + ',resolve!');
                            }, 100);
                            //返回promise
                            return e.promise();
                        });
                        
                        //使用when来监控promiseEvent的执行，使用done来处理执行完毕的方法
                        $.when(pCalls.fire("call")).done(function(data) {
                            expect(data).toBe('call,resolve!');
                        });

                */
                resolve: function(result) {
                    fireCount++;
                    isDefined(result) && (_result = result);
                    _stop ? done() : fireItem();
                },
                /**
                    拒绝契约，在任何一个事件中reject都会停止所有后续promiseEvent的执行
                    @method resolve 
                    @param err {object} 拒绝参数
                    @example
                        pCalls.add("c1", function(e, name) {
                            //延迟100ms
                            setTimeout(function() {
                                //拒绝promise,并返回结果
                                e.reject(name + ',reject!');
                            }, 100);

                            //返回promise
                            return e.promise();
                        });

                        //使用when来监控promiseEvent的执行，使用fail捕获reject
                        $.when(pCalls.fire("call")).fail(function(data) {
                            expect(data).toBe('call,reject!');
                            testCall();
                        });
                */
                reject: function(err) {
                    fail(err);
                },
                /**
                    删除当前事件；与promiseEvent.add的'once'模式，不同在于可以手动进行控制
                    @method remove 
                    @chainable
                    @example
                         calls.add("onceTest", function(e) {
                            //删除"onceTest"这个事件；
                            e.remove();
                        });
                        //执行后才会触发删除
                        calls.fire();

                        //"onceTest"已经不在calls中
                        expect(calls.has("onceTest")).toBe(false);
                */
                remove: function() {
                    _list.remove(--i);
                    len--;
                    return this;
                }
            });

            //callback模式下不用添加事件参数
            if (!_callbackMode) {
                args = args ? [d].concat(args) : [d];
                argHandle && argHandle(d);
            }

            function done() {
                _onceMode && clear();
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

        /**
            判断是否存在事件回调
            @method has 
            @for promiseEvent
            @param name {string} 事件回调名
            @return {boolean} 是否存在
            @example 
                //判断是否注册了"call1"的event
                if(calls.has("call1"))
                    .........
        */
        function has(name) {
            var result = false;
            _list.each(function(item) {
                if (item.name === name) {
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
            /**
                执行回调
                @method fire 
                @for promiseEvent
                @param args {array} 执行参数
                @param [argHandle] {function} 参数处理方法，可以对eventarg进行修改；例如：argHandle(e)
                @return {object} 返回执行结果
                @example
                    //注册call1
                    calls.add('call1', function(e, text) {
                        alert(text);
                    })

                    //执行call1，返回called
                    calls.fire('called');
                    
                    //使用eventArg控制
                    calls.add("c1", function(e) {
                        //阻止后续回调
                        e.stopPropagation();
                    })
                    .add("c2", function() {
                    });

                    //只执行了c1
                    calls.fire();



                    //promise模式下
                    calls.add("c1", function(e, name) {
                        setTimeout(function() {
                            e.resolve(name + '-c1');
                        }, 100);
                        return e.promise();
                    });
                    
                    //使用when来监控返回的result
                    $.when(calls.fire("call")).done(function(result) {

                    }.fail(function(error){

                    }));
                    


                    //noBlock模式的promiseEvents;
                    var noBlockCalls = st.promiseEvent("noBlock");

                    //第一个回调延迟100
                    noBlockCalls.add("c1", function(e) {
                        setTimeout(function() {
                            result.push('c1');
                            e.resolve();
                        }, 100);
                        return e.promise();
                    });

                    //第二个正常执行
                    noBlockCalls.add("c2", function(e) {
                        result.push('c2');
                    });

                    //第三个回调延迟50
                    noBlockCalls.add("c3", function(e) {
                        setTimeout(function() {
                            result.push('c3');
                            e.resolve();
                        }, 50);
                        return e.promise();
                    });

                    $.when(noBlockCalls.fire()).done(function(data) {
                        //最终执行顺序是c2-c3-c1
                        expect(result + '').toBe('c2,c3,c1');
                        testCall();
                    });
            */
            fire: function() {
                return fireWith(null, sliceArgs(arguments));
            },
            fireWith: fireWith,
            clear: clear
        }
    }

    //trigger的接口设置
    var _interface = {
            onHandler: "onHandler",
            fireHandler: "fireHandler",
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

    /**
            给对象添加触发器功能,在目标对象上加入触发器功能，目标对象的方法就会具有方法和属性注入功能；所有注入方法使用promiseEvent管理
            目前有四种注入方式： 
            1. before，前置注入，在目标方法执行之前执行；
            2. after，后置执行，在目标方法执行之后执行；
            3. round，环绕，将目标方法包装，自定义控制；
            4. error，错误，捕获reject的事件；
            
            @class attachTrigger
            @constructor
            @param target [object] 目标对象
            @param [mode] [string] 注入前置和后置所采用的promiseEvent的模式，具体见promsieEvent的add
            @param [fnInterface] {object} ；自定义接口方法；在使用attachTrigger方法后，会在target上附加一些控制方法，为了避免重名和控制对外的方法，使用fnInterface来自定义
            @return {trigger} 返回附加上了trigger的对象;
            @example
                 var obj1 = {
                    test: function(name) {
                        result.push(name);
                    }
                };

                //给obj1对象附上触发器功能
                st.attachTrigger(obj1);
                
                //直接初始化成trigger对象
                var obj2 = st.attachTrigger({
                    test: function(name) {
                        result.push(name);
                    }
                });
                
                //定制trigger的接口方法
                 var obj3 = st.attachTrigger({
                    test: function(name) {
                        result.push(name);
                    }
                }, {
                    //屏蔽trigger的on方法
                    on: null,
                    //将trigger的onBebefore方法名改成bind
                    onBefore: "bind"
                })
    */
    function attachTrigger(target, mode, fnInterface) {
        if (!target && typeof target !== 'object')
            return;

        var _trMap = {},
            _fnMap = {},
            _mode, _eventMode,
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
                baseFn = _fnMap[_name] = st.getObj(_target, _name);
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

                    /**
                        trigger下的事件参数，由EventArg扩展而来
                        @class EventArg(trigger)
                        @extends EventArg
                    */
                    /**
                        阻止默认的方法执行；
                        @method preventDefault
                        @chainable
                        @example
                            var obj = st.attachTrigger({
                                test: function(name) {
                                    result.push(name);
                                }
                            });

                            obj.onBefore('test', 'testBefore', function(e, name) {
                                result.push(name + '-before1');
                                //阻止前置后续的事件&阻止默认方法
                                e.stopPropagation().preventDefault();
                            })

                            obj.onBefore('test', 'testAfter', function(e, name) {
                                result.push(name + '-before2');
                            })

                            obj.on('test', 'testBefore2', function(e, name) {
                                result.push(name + '-after');
                            })

                            obj.test('call');
                            //最终输出前置call-before1和后置
                            expect(result.join(',')).toBe('call-before1,call-after');
                    */
                    function preventDefault() {
                        _preventDefault = true;
                        return this;
                    }

                    /**
                        停止当前方法执行和后置所有事件；在属性监听时，则阻止赋值；
                        @method stop
                        @chainable
                        @example
                            var obj = st.attachTrigger({
                                test: function(name) {
                                    result.push(name);
                                }
                            });

                            obj.onBefore('test', 'testBefore', function(e, name) {
                                result.push(name + '-before1');
                                //停止执行
                                e.stop();
                            })

                            obj.onBefore('test', 'testBefore2', function(e, name) {
                                result.push(name + '-before2');
                            })

                            obj.on('test', 'testAfter', function(e, name) {
                                result.push(name + '-after');
                            })

                            obj.test('call');

                            //最终只输入前置call-before1
                            expect(result.join(',')).toBe('call-before1');
                    */
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

                    /*合并事件回调参数*/
                    function mergeArg(d) {
                        isDefined(_result) && (d.result = _result);

                        d.preventDefault = preventDefault;
                        d.stop = st.mergeFn(d.stopPropagation, stopFn);
                        dTrans && dTrans.__mergePArg && dTrans.__mergePArg(d);
                    }

                    /*判断传递的属性值*/
                    function checkPropValue(args) {
                        if (isProp) {
                            if (isDefined(_result))
                                return [_result, oldValue];
                            else
                                args.push(oldValue);
                        }
                        return args;
                    }

                    /*执行后置注入方法*/
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
                        propObj = index > 0 ? st.getObj(_target, name.substring(0, index)) : _target;

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

        function fire(name, args, argHandle, type) {
            var tr = find(name, type);
            if (tr)
                return tr.fireWith(this, args, argHandle);
        }

        var prop = {
            /**
                注册手动的触发的Handler
                @method onHandler
                @for attachTrigger
                @param name [string] 目标方法或者属性名称
                @param trName [string] 注册事件方法的名称
                @param fn [function] 注册事件方法
                @param [priority] [number] 权重设置，同PrmiseEvent 
                @param [mode] [string] 加入的事件模式，同PrmiseEvent
                @chainable
                @example
                    
            */
            onHandler: function(name, trName, fn, priority, mode) {
                find(name, null, true).add(trName, fn, priority, mode);
                return this;
            },
            /**
                执行手动触发的Handler
                @method fireHandler
                @for attachTrigger
                @param name [string] 目标方法或者属性名称
                @param args [array] 执行参数数组
                @return [object] 执行结果
                @example
                    
            */
            fireHandler: function(name, args) {
                return fire(name, args);
            },
            /**
                注册[后置的]事件方法;注册后置和对象注入
                @method on
                @for attachTrigger
                @param name {string|object} 目标方法或者属性名称;[object]类型时为对象注入
                @param trName {string} 注册事件方法的名称|属性名称；对象注入模式下，会自动拼接成trName-[名称|属性名]-[注入方式]
                @param fn {function|object} 注册事件方法;对象注入模式下，[object]类型才会生效
                @param [priority] [number] 权重设置，同PrmiseEvent 
                @param [mode] [string] 加入的事件模式，同PrmiseEvent
                @chainable
                @example
                    var result = [], obj = st.attachTrigger({
                        //方法
                        test: function(name) {
                            result.push(name);
                        },
                        //子对象
                        child : {
                            test : function(name){
                                result.push(name);
                            }
                        }，
                        //属性
                        prop : 1
                    });

                    //注册前置
                    obj.onBefore("test", "addBefore", function(e, name) {
                        result.push('before-' + name)
                    })
                    //注册后置
                    .on("test", "addAfter", function(e, name) {
                        result.push('after-' + name)
                    });

                    //执行test方法
                    obj.test('bind');
                    //前后置正确触发
                    expect(result.join(',')).toBe("before-bind,bind,after-bind");
                    

                    //支持子对象方法注册
                    obj.onBefore("child.test", "addBefore", function(e, name) {
                        result.push('before-' + name)
                    }).on("child.test", "addAfter", function(e, name) {
                        result.push('after-' + name)
                    });

                    //属性监听只有before，after两种方法注入类型，不支持round环绕模式。
                    //before：主要使用在做值变化的控制，比如是否需要更新，或者改变更新的值等等。
                    //after：在after则是无法干预值的变化，因此只是做监听使用；

                    
                    //注册属性监听，回调方法中有三个参数,事件参数e；更新的值value；原来的值oldValue
                     obj.onBefore('prop', 'testBefore', function(e, value,oldValue) {
                        result.push(value + '-before-' + oldValue);
                    })
                    
                    obj.on('prop', 'testAfter', function(e, value,oldValue) {
                        result.push(value + '-after-' + oldValue);
                    })
                    
                    expect(obj.prop).toBe(1);

                    obj.prop = 2;
                    //输出前后置监听
                    expect(result.join(',')).toBe('2-before-1,2-after-1');
                    expect(obj.prop).toBe(2);
                    
                    //前置中干预赋值
                    obj.onBefore('prop', 'testBefore', function(e, value) {
                        result.push(value + '-before');
                        //停止方法，阻止赋值行为
                        e.stop();
                    })


                    //对象注入例子
                    var obj = st.attachTrigger({
                        test: function(name) {
                            result.push(name);
                        }
                    });

                    //对象注入
                    obj.on({
                        //简单的注入后置方法
                        test : function(e,name){
                            result.push('after');
                        },
                        //注入前置&注入参数设置
                        'test before' : {
                            //注入方法
                            fn : function(e,name){
                                result.push('before');
                            },
                            //注入权重
                            priority : 100,
                            //注入模式
                            mode : 'once'
                        }
                    },"onObject");

                    obj.test('call');
                    expect(result.join(',')).toBe('before,call,after');
            */
            on: function(name, trName, fn, priority, mode) {
                if (typeof name === 'object') {
                    $.each(name, function(target, config) {
                        var arr = target.split(' '),
                            fnName = arr[0],
                            type = arr[1] || trTypes[1],
                            tName = trName + '-' + fnName + '-' + type;

                        if ($.isFunction(config))
                            bind(fnName, tName, config, type);
                        else
                            bind(fnName, tName, config.fn, type, config.priority, config.mode);
                    })

                } else
                    bind(name, trName, fn, trTypes[1], priority, mode);
                return this;
            },
            /**
                注册前置的事件方法
                @method onBefore
                @for attachTrigger
                @param name [string] 目标方法或者属性名称
                @param trName [string] 注册事件方法的名称
                @param fn [function] 注册事件方法
                @param [priority] [number] 权重设置，同PrmiseEvent 
                @param [mode] [string] 加入的事件模式，同PrmiseEvent
                @chainable
                @example
                    //见on方法
            */
            onBefore: function(name, trName, fn, priority, mode) {
                return bind(name, trName, fn, trTypes[0], priority, mode)
            },
            /**
                注册环绕触发事件
                @method onRound
                @for attachTrigger
                @param name [string] 目标方法或者属性名称
                @param trName [string] 注册事件方法的名称
                @param fn [function] 注册事件方法
                @chainable
                @example
                     var obj3 = st.attachTrigger({
                        test: function(name) {
                            result.push(name);
                        }
                    });

                    //注册环绕事件，事件方法参数第一为fn为原方法，后面的为执行参数
                    obj3.onRound("test", "roundTest", function(fn, name) {
                        result.push('before');
                        //执行原有方法
                        fn(name);
                        result.push('after');
                    });

                    obj3.test('round');
                    expect(result.join(',')).toBe("before,round,after");
            */
            onRound: function(name, trName, fn) {
                return bind(name, trName, fn, trTypes[2])
            },
            /**
                注册错误捕获事件，当执行reject的时候触发
                @method onError
                @for attachTrigger
                @param name [string] 目标方法或者属性名称
                @param trName [string] 注册事件方法的名称
                @param fn [function] 注册事件方法
                @param [mode] [string] 加入的事件模式，同PrmiseEvent
                @chainable
                @example
                    var testError = st.attachTrigger({
                        test: function(name) {
                            var e = $.Deferred();
                            setTimeout(function() {
                                //拒绝契约
                                 e.reject('reject');
                            }, 100);
                            return e.promise();
                        }
                    });
                    //注册错误捕获事件
                    testError.onError("test","triggerError",function(err,name){
                          expect(err).toBe('reject');
                          expect(name).toBe('call');
                          testCall();
                    })
                    testError.test('call');
            */
            onError: function(name, trName, fn, mode) {
                return bind(name, trName, fn, trTypes[3], mode)
            },
            /**
                注销注册的后置事件方法
                @method off
                @for attachTrigger
                @param name [string] 目标方法或者属性名称
                @param [trName] [string|array] 注册事件方法的名称：
                        1. 空为清除所有
                        2. 字符串为单个
                        3. 数组为多个
                @chainable
                @example
                    //注册后置testAfter
                    obj.on('test', 'testAfter', function(e, name) {
                        result.push(name + '-after');
                    })

                    //注销单个后置
                    obj.off('test', 'testAfter');
            */
            off: function(name, trName) {
                remove(name, trTypes[1], trName);
                return _target;
            },
            /**
                注销注册的前置事件方法
                @method offBefore
                @for attachTrigger
                @param name [string] 目标方法或者属性名称
                @param [trName] [string|array] 注册事件方法的名称：
                        1. 空为清除所有
                        2. 字符串为单个
                        3. 数组为多个
                @chainable
                @example
                    //注册前置testBefore
                    obj.onBefore('test', 'testBefore', function(e, name) {
                        result.push(name + '-before1');
                    })

                    //注册前置testBefore2
                    obj.onBefore('test', 'testBefore2', function(e, name) {
                        result.push(name + '-before2');
                    })

                    //注销多个前置
                    obj.offBefore('test', ['testBefore', 'testBefore2']);
            */
            offBefore: function(name, trName) {
                remove(name, trTypes[0], trName);
                return _target;
            },
            /**
                扩展对象；（在使用触发器注册后，原始方法不会直接在目标对象下，因此使用obj.test = xx的方式来扩展会替换到所有的注册事件）
                @method extend
                @for attachTrigger
                @param prop [object] 目标方法或者属性名称
                @chainable
                @example
                     var obj = st.attachTrigger({
                        test: function(name) {
                            result.push(name);
                        }
                    });
                    obj.extend({
                        test : function(name){
                            result.push(name + '-extend')
                        }
                    })
            */
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

    /* 应用接口 */
    function applyInterface(target, fnInterface, prop) {
        var fn;

        fnInterface = fnInterface ? $.extend({}, _interface, fnInterface) : _interface;

        $.each(fnInterface, function(i, n) {
            if (n && (fn = prop[i])) {
                target[n] = fn;
            }
        })
    }

    /**
        流程或者生命周期管理器。控制流程的走向，流程扩展，注入控制等等；FlowController是基于trigger封装，具有所有trigger的特性；
        @class flowController
        @constructor
        @param op {object} 参数设置 ： 
            @param op.flow {object} 流程对象
            @param [op.order] {array} 流程顺序
            @param [op.trigger] {bool|object} trigger设置
                @param [op.trigger.mode] {object} trigger的mode设置
                @param [op.trigger.iFace] {object} trigger的接口方法设置
            @param [op.mode] {object} 流程的模式， 
            1. 默认为EventArg模式
            2. 'simple', 简单模式不带流程中不带EventArg参数

        @return {flowController} 返回流程控制器
        @example
            //以widget简单的的生命周期为例
            var flow = st.flowController({
                flow: {
                    init: function(e, name, op) {
                        log(name, 'init');
                        //input的进入buildInput流程
                        if (name === 'input')
                            //指定进入buildInput，同时指定的参数
                            e.next("buildInput", [op.type]);
                        //进入cancel流程
                        else if (name === 'cancel')
                            e.next('cancel')
                    },
                    buildInput: function(e, type) {
                        log('buildInput');
                        //返回传递结果
                        return type;
                    },
                    cancel: function(e) {
                        log('cancel');
                        e.end();
                    },
                    render: function(e, name, op) {
                        //判断是否存在传递结果
                        e.result && log(e.result);
                        log('render');
                    },
                    complete: function(e, name, op) {
                        log('complete');
                    }
                },
                //设定执行流程
                order: ["init", "render", "complete"]
            });


            
            //简单流程，流程中不带事件参数EventArg
            var simpleFlow = st.flowController({
                flow: {
                    init: function(name, op) {
                        log(name, 'init');
                    },
                    render: function(name, op) {
                        log('render');
                    },
                    complete: function(name, op) {
                        log('complete');
                    }
                },
                order: ["init", "render", "complete"],
                //简单模式
                mode: "simple"
            });

            //异步的流程,开启trigger
            var triggerFlow = st.flowController({
                flow: {
                    init: function(e, name, op) {
                        //模拟异步
                        setTimeout(function() {
                            log(name, 'init');
                            e.resolve();
                        }, 100)
                        return e.promise();
                    },
                    render: function(e, name, op) {
                        log('render');
                    },
                    complete: function(e, name, op) {
                        log('complete');
                    }
                },
                order: ["init", "render", "complete"],
                trigger: true
            });

            //在init之前注入
            triggerFlow.onBefore("init", "initBefore", function(e, name, op) {
                log('initBefore');
            }, "once");

            //在init之后注入异步
            triggerFlow.on("init", "initAfter", function(e, name, op) {
                setTimeout(function() {
                    log('initAfter');
                    e.resolve();
                }, 100)
                return e.promise();
            }, "once");

            //使用when来捕获异步的流程执行结果
            $.when(triggerFlow.boot("div")).done(function() {
                expect(arr + '').toBe('initBefore,div,init,initAfter,render,complete');
            })
    */
    function flowController(op) {
        var flow, order, trigger, mode;
        if (!op)
            return;

        flow = op.flow;
        order = op.order;
        trigger = op.trigger;
        mode = op.mode;

        trigger && attachTrigger(flow, trigger.mode, trigger.iFace);

        /**
         * 已手动设定流程开始的节点启动流程
         * @method bootWithStart
         * @for flowController
         * @param  {string} start 流程开始的节点
         * @param  {array} args  执行参数
         * @return {object|promise} 返回执行结果或者promise（异步）
         * @example
         *      //从render阶段开始构建div
                flow.bootWithStart('render', ["div"]);

                //略过了render阶段
                expect(arr + '').toBe('render,complete');
         */
        function bootWithStart(start, args) {
            var _next = start,
                _nextArgs, _done,
                i = -1,
                _result,
                d, _args, originalArgs,
                _stop, defer, _err;

            if (mode !== "simple") {
                /**
                    flowController下的事件参数，由EventArg(trigger)扩展而来，具有EventArg(trigger)的所有特性;
                    其中stop方法为结束当前流程节点；
                    @class EventArg(flowController)
                    @extends EventArg(trigger)
                */
                d = buildPromiseArg({
                    /**
                     * 结束流程。无论是注册的事件方法还是流程方法全部结束
                     * @method end
                     * @chainable
                     * @example
                     *      triggerFlow.onBefore("init", "initBefore", function(e, name, op) {
                                setTimeout(function() {
                                    log('initBefore');
                                    //停止流程
                                    e.end().resolve();
                                }, 100)
                                return e.promise();
                            }, "once");

                            $.when(triggerFlow.boot("div")).done(function() {
                                //执行了注入事件initBefore后停止流程
                                expect(arr + '').toBe('initBefore');
                            })
                     */
                    end: function() {
                        _stop = true;
                        return this;
                    },
                    resolve: function(result) {
                        isDefined(result) && (_result = result);
                        _stop ? done() : next();
                    },
                    /**
                     * 拒绝契约同时设置流程状态为失败，结束流程
                     * @method reject
                     * @param {object} comment 拒绝的说明或参数
                     * @example
                     *      flowReject.onBefore("init", "initBefore", function(e, name, op) {
                                setTimeout(function() {
                                    //拒绝契约，结束流程
                                    e.reject("initBefore-reject");
                                }, 100)
                                return e.promise();
                            });
                            
                            //使用fail来捕获
                            $.when(flowReject.boot('boot')).fail(function(err) {
                                expect(err).toBe('initBefore-reject');
                            });
                     */
                    reject: function(comment) {
                        fail(comment);
                    },
                    /**
                     * 手动指定下一个流程，（指定的流程可以不在order配置中）
                     * @method next
                     * @param  {string}   nextNode 下一个流程名称
                     * @param  {number}   pass     下个流程执行完毕略过的流程数（相对于order）
                     * @param  {array}   args     下个流程的参数，只在该流程节点有效，在之后就会恢复成原始参数，如想改变后续参数，请使用changeArgs方法
                     * @chainable
                     */
                    next: function(nextNode, pass, args) {
                        _next = nextNode;
                        if (typeof pass !== "number")
                            args = pass;
                        else
                            i += pass;

                        args && (_nextArgs = [d].concat(args));
                        return this;
                    },
                    /**
                     * 改变后续流程的执行参数
                     * @method changeArgs
                     * @param  {array}   args   执行参数
                     */
                    changeArgs: getArgs,
                    /**
                     * 恢复原始执行参数，下个流程中生效，与changeArgs方法对应
                     * @method recoverArgs
                     * @chainable
                     */
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

        /**
         * 启动流程，
         * @method boot
         * @for flowController
         * @param {argument} 流程参数
         * @return {object|promise} 返回执行结果或者promise（异步）
         * @example
         *      //执行构建div的流程
                flow.boot("div");
                
                //正常输出init，render，complete三个流程
                expect(arr + '').toBe('div,init,render,complete');

                //执行构建input的流程，设置input的type
                flow.boot("input", {
                    type: 'text'
                });

                //除正常流程外，在init后进入buildInput流程
                expect(arr + '').toBe('input,init,buildInput,text,render,complete');
         */
        flow.boot = function() {
            return bootWithStart(null, sliceArgs(arguments));
        }

        flow.bootWithStart = bootWithStart;
        return flow;
    }

    return {
        promiseEvent: promiseEvent,
        attachTrigger: attachTrigger,
        flowController: flowController
    };
});;/**
    面向对象思想的辅助实现模块;
    
    Feartures : 
        1. klass ：类继承；实现执行指针，类常用方法，继承路径
        2. factory ：对象/类工厂方法；

    Update Note：
        + 2014.6 ：Created

    @module OOP
*/
stDefine('oop', function(st) {
    //初始化扩展函数
    var _onKlassInit = st.promiseEvent(),
        /**
         * klass的基类对象
         * @class klassBase
         */
        _klassBase = {
            /**
                调用原型链方法
                @method callProto
                @param name {string} 需要执行的原型链方法名
                @param [args] {array} 执行参数
                @return [object] 返回执行结果
            */
            callProto : function(name,args){
                var fn = this._$fn[name];
                if(fn)
                    return fn.apply(this,args);
            },
            /**
                获取基类对象
                @method getBase
                @param [baseName] {string} 基类名称,不设置则返回父类
                @return [object] 返回基类 
            */
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
            /**
             * 调用基类的方法
             * @method  callBase
             * @param  {string} fnName   方法名称
             * @param  {string} [baseName] 基类名称
             * @param  {array} [args]    方法参数数组
             * @return {object}  执行结果       
             */
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
            /**
             * 类扩展方法
             * @method extend
             * @param  {object} prop 扩展的属性和方法对象
             * @chainable
             */
            extend: function(prop) {
                $.extend(this, prop);
                return this;
            }
        };

    st.conf('oop-KlassBase',_klassBase);

    /**
        js类创建，具有执行指针功能(解决了多级继承域对象的问题)

        此外提供两种全局扩展方式： 
            1. 基于原形链的基类扩展，使用st.conf('oop-KlassBase')，可以取到基类对象进行扩展
            2. 在类初始化时，对实例化的对象进行扩展，可以使用st.onKlassInit对象进行添加扩展方法。st.onKlassInit 是promiseEvent对象，st.onKlassInit(obj,config);

        @class klass
        @constructor
        @extend klassBase
        @param {string} name 类名称
        @param {object} prop 类的属性和方法
        @param {klass|object|function} [parent] 父类
        @param {object} [config] 扩展参数
        @return {klass} 返回类
        @example
            //创建一个class
            var User = st.klass('User',{
                klassInit:function(name){
                    this.name = name;
                },
                say: function(text) {
                    return this.name + ',' + text;
                }
            });

            //实例化一个User
            var xiaoming = new User('小明');
            
            //方法实例化
            var xiaozhang = User('小张');



            
            //多级继承例子。在多级继承中有一种场景每个子类方法都会调用父类的方法，而方法中又会使用到当前对象的属性，则问题就来了；
            //如果是采用的parent.xxx然后传递this下的属性值过去，则没太大的问题。backbone就采用的这种。
            //另外像base.js直接改写原始方法，将父对象封入闭包中，也无问题。只是这种限制比较大，只能调用父类的同名方法。
            //而dojo采用的是this.parent.xxx.call(this)的方式，则就会悲剧了，死循环就来了。
            //导致这样的原因就是将this带入parent方法后，父类又执行this.parent。而这是this则是子类的对象，那么方法就只会不停的调用parent的方法。
            //在smartjs中klass调用父类方法由callBae这个方法来代理，同时使用指针来记录方法的执行轨迹，这样保证了从子到根的各级调用

            var user2 = st.klass('user2', {
                say: function(text) {
                    //调用父类
                    return this.callBase('say', [text]) + "-lv2";
                }
            }, User);

            var user3 = st.klass('user3', {
                say: function(text) {
                    //调用父类
                    return this.callBase('say', [text]) + "-lv3";
                }
            }, User);

            var user4 = st.klass('user4', {
                say: function(text) {
                    //调用父类
                    return this.callBase('say', [text]) + "-lv4";
                }
            }, user3);

            var roy = new user4('roy');
            
            //继承路径
            expect(roy._$inheirts + '').toBe('user4,user3,user2,user');

            //依次执行到根，正确将当前的this对象的值输出
            expect(roy.say('hello')).toBe('roy,hello-lv2-lv3-lv4');

            //从3级开始执行
            expect(roy.callBase('say', ['hello'])).toBe("roy,hello-lv2-lv3");

            //指定从user开始执行
            expect(roy.callBase('say', 'user', ['hello'])).toBe("roy,hello");

            //上向略过2级执行
            expect(roy.callBase('say', 2, ['hello'])).toBe("roy,hello-lv2");
    */
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
    
    /**
     * factory并不只是指的是工厂模式。在factory要求定义一个基础对象，这个对象可以是基类，也可以是模板对象或者是接口。然后factory就已此基础对象为基础，其他添加或者创建的对象，继承或者是复制基础对象的属性和方法。factory在提供一系列方法来对这些对象做控制。
        factory经过简单的处理可以实现工厂、外观、模板等设计模式。
     * @class factory
     * @constructor
     * @extends klass
     * @param  {string} name        工厂名称
     * @param  {object} base        基类对象，所有在工厂中添加的对象都以base为基础
     * @param  {object} [proto]     工厂的扩展属性和方法对象
     * @param  {string} [type]      工厂的类型； 
     * 1. 默认:类实例化后的对象；
     * 2. class：类对象，未实例化；
     * 3. merge：对象复制合并
     * @param  {boolean} [initDefault] 是否将base设置成为默认的对象；当使用factory.get找不到对象时返回默认对象
     * @return {factory}  返回创建的工厂对象
     * @example
     *     //widget基类
            var baseWidget = {
                //widget类型
                type: '',
                //widget的渲染方法
                render: function(id) {
                    return this.type + ':' + id;
                }
            };

            //一个widget工厂
            var widgetFactory = st.factory('wdigetfactory', baseWidget);

            //添加一个input
            widgetFactory.add('input', {
                type: 'input'
            })

            //找到添加的input
            var input = widgetFactory.find('input');

            //输出
            expect(input.render('txt')).toBe("input:txt");


            //添加一个number类型的input
            var num = widgetFactory.add('number', {
                type: 'input[number]'
                //指定父类为input
            }, 'input')

            //输出
            expect(num.render('txtNum')).toBe("input[number]:txtNum");



            // class mode
            var f1 = st.factory({
                name: 'classMode',
                //设置class类型
                type: 'class',
                base: {
                    klassInit: function(name) {
                        this.name = name;
                    }

                }
            });

            var c1 = f1.add('c1', {
                type: 'c1'
            });

            expect(c1.fn).toBeDefined();
            //需要初始化
            var c = new c1('class1');
            expect(c.type).toBe("c1");
            expect(c.name).toBe("class1");



            //merget mode
             var f2 = st.factory({
                name: 'copyMode',
                //设置merge类型
                type: 　'merge',
                //设置默认模式
                initDefault: true,
                base: {
                    name: 'copy',
                    project: {
                        name: 'smartjs'
                    }
                }
            })

            var c = f2.add('c1', {
                name: 'c1',
                project: {
                    role: 'pm'
                }
            });
            
            expect(f2.find().name).toBe("copy");
            expect(c.name).toBe("c1");
            expect(c.project.name).toBe("smartjs");
            expect(c.project.role).toBe("pm");

     */
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

        /**
         * 使用工厂创建产品方法，但不注册到factory中
         * @method build
         * @param  {string} name   产品名称
         * @param  {object} item   产品特性
         * @param  {string} [parent] 父类名称，注册到factory中产品名称
         * @return {object|klass}  返回创建的产品
         * @example
         * 
         */
        function build(name, item, parent) {
            parent = parent ? find(parent) || _base : _base;

            if (mergeMode)
                return st.mergeObj(true, item, parent);
            else {
                item = klass(name, item, parent);
                return klassMode ? item : new item;
            }
        }

        /**
         * 添加产品方法，注册到factory中
         * @method add
         * @param  {string} name   产品名称
         * @param  {object} item   产品特性
         * @param  {string} [parent] 父类名称，注册到factory中产品名称
         * @return {object|klass}  返回创建的产品
         * @example
         * 
         */
        function add(name, item, parent) {
            return (_store[name] = build(name, item, parent));
        }

        /**
         * 查找注册的产品
         * @method find
         * @param  {string} name   产品名称
         * @param  {object} defaultMode   是否在找不到产品的时候返回默认产品
         * @return {object} 返回查找的产品
         * @example
         * 
         */
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

        /**
         * 将注册的产品设置成默认产品
         * @method setDefault
         * @param  {string} name   产品名称
         * @chainable
         * @example
         * 
         */
        function setDefault(name) {
            _defaultItem = get(name, true);
            return this;
        }

         /**
         * 在工厂中移除注册的产品
         * @method remove
         * @param  {string} name   产品名称
         * @chainable
         * @example
         * 
         */
        function remove(name) {
            delete _store[name];
        }

        proto = $.extend({
            build: build,
            add: add,
            find: find,
            remove: remove,
            setDefault: setDefault,
            /**
             * 执行工厂中产品的方法
             * @method fire
             * @param  {string} name 方法名称
             * @param  {array} [args] 执行参数
             */
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
})