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
/**
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
	"use strict"

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
    "use strict"

    //默认权重
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
});;
/**
    面向对象思想的辅助实现模块;
    
    Feartures : 
        1. klass ：类继承；实现执行指针，类常用方法，继承路径
        2. factory ：对象/类工厂方法；

    Update Note：
        + 2014.6 ：Created

    @module OOP
*/
stDefine('oop', function(st) {
    "use strict"

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
});
/**
    过滤器生成器
    
    Feartures : 
        1. 编译字符串过滤，“name = @name and (age > @age and type = @type)”，生产过滤条件参数或者过滤方法
        2. 参数过滤，以参数的方式全部构建"="的方式构建查询方法
        3. 方法过滤
        4. 忽略null的条件
        5. 自定义扩展过滤操作符
        6. 条件&参数合并

    Update Note：
        + 2014.7 ：Created

    @module FilterBuilder
*/
stDefine('filterBuilder', function(st) {
	//空值忽略条件标示符
	var NullIgnoreSign = ["{", "}"],
		//关系字符
		Relations = ["and", "or"],
		isArray = $.isArray;

	/**
	 * 过滤生成器对象
	 * @class FilterBuilder
	 * @constructor
	 * @param {string|function|object} filter 三种类型： 
	 * 1. {string}, 查询字符串
	 * 2. {object}, 参数对象
	 * 3. {function}, 过滤方法
	 * @return {FilterBuilder} 返回过滤生成器对象
	 * @example
	 * 		//查询字符串,{age > @age}用{}包含的条件表示当@age为null的时候，忽略此条件
	 * 		var str = "{age > @age} and (role = @sa or role = @coder) and project = @project";
			
			//创建过滤器
			var filter = st.filterBuilder(str);
			
			//生成过滤方法
			var filterFn = filter.buildFn({
				age : 20,
				sa : 'sa',
				coder : 'coder',
				project : "smartjs"
			});
			
			//定义数据
			var data = [
					{name: "roy",age: 30,role: "coder",project: "smartjs"},
			 		{name: "coder1", age: 20, role: "coder", project: "smartjs"}
			];
			
			//过滤数据
			var result = data.filter(filterFn);
	 */
	function FilterBuilder(filter) {
		if (filter) {
			switch (typeof filter) {
				//查询字符串
				case "string":
					this._conditions = compileStringCondition(filter);
					break;
				//过滤方法
				case "function":
					this._filter = filter;
					break;
				//参数过滤
				case "object":
					this._params = filter;
					break;
			}
		}
	}

	FilterBuilder.prototype = {
		/**
		 * 生成条件参数,当使用查询字符串进行构建过滤器时，根据传入的参数值生产最终的带关系和操作过滤参数
		 * @method buildCondition
		 * @param  {object} params 过滤的参数值
		 * @return {object}   条件参数
		 * @example
		 * 		var str = "age > @age and (role = @sa or role = @coder) and project = @project";
				var filter = st.filterBuilder(str);
		 *
		 * 		//生成条件
		 * 		var conditions = filter.buildCondition({
		 * 			age : 20,
					sa : 'sa',
					coder : 'coder',
					project : "smartjs"
				})

		 * 		//生成的conditions对象
		 * 		{"and":[
		 * 			{"field":"age","operation":">","param":20},
	 * 				{"or":[
	 * 					{"field":"role","operation":"=","param":"sa"},
	 * 					{"field":"role","operation":"=","param":"coder"}
	 * 				]},
		 * 			{"field":"project","operation":"=","param":"smartjs"}
		 * 		]}
		 */
		buildCondition: function(params) {
			if (this._conditions)
				return buildConditions(this._conditions, params);
		},
		/**
		 * 生成过滤方法
		 * @method buildFn
		 * @param  [params] {object}  过滤的参数值
		 * @param  [mergeFilter]  {string|function|object}需要合并的过滤条件
		 * @return {function} 过滤方法
		 * @example
		 * 		//创建role的过滤器
		 * 		var filter = st.filterBuilder("role = @role");
		 *
		 * 		//传入条件参数，合并age的过滤
		 * 		filter.buildFn({role:"sa",age:20},"age > @age")
		 */
		buildFn: function(params, mergeFilter) {
			var self = this,
				conditions, fnFilter, mergeFilterFn;

			//过滤方法模式
			if (self._filter)
				fnFilter = self._filter;
			//条件生成模式
			else if (self._conditions) {
				conditions = this.buildCondition(params);
				if (conditions)
					fnFilter = buildFn(conditions)
			} else if(!mergeFilter)
				//参数过滤非合并参数模式下，根据参数创建过滤方法
				fnFilter = compileObjectCondition(st.mergeObj(params, self._params));

			//存在合并过滤情况下，生成合并过滤方法
			if (mergeFilter) {
				filterType = typeof(mergeFilter);
				if (filterType === 'string')
					mergeFilterFn = (new FilterBuilder(mergeFilter)).buildFn(params);
				else if(filterType === 'function')
					mergeFilterFn = mergeFilter;
			}
			//合并过滤条件
			return st.mergeFn(fnFilter, mergeFilterFn);
		}
	}

	//将对象参数编译成过滤方法
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

	//将过滤字符串编译成过滤条件对象
	function compileStringCondition(filter) {
		var groups = [],
			deep = 0,
			//条件关系链
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

	//编译查询条件组
	function compileGroup(chain, deep, part) {
		var group, arr, condition, len = chain.length - 1;

		arr = part.split(/\s(or|and)\s/g);
		//判断开始是否存在关系表达式
		if (arr[0].length === 0 && Relations.indexOf(arr[1]) > -1) {
			arr.shift();
			chain[len].or = arr.shift() === Relations[1];
		}

		//深度大于关系链时，扩展关系链
		if (deep > len)
			group = chain[deep] = [];
		else {
			group = chain[deep];
			//深度小于关系链时，将关系链最后一项清除，添加到当前group中
			deep < len && group.push(chain.pop());
		} 

		arr.forEach(function(item, i) {
			if (item) {
				//判断为关系参数时，设置条件关系
				if (Relations.indexOf(item) > -1) {
					condition.or = item === Relations[1];
				} else {
					condition = compileConditionStr(item);
					group.push(condition);
				}
			}
		})
	}

	//编译查询条件字符串
	function compileConditionStr(condition) {
		var arr, ignoreNull = false,
			index;

		//判断是否空忽略
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

	//根据过滤条件组生成过滤条件
	function buildConditions(conditions, params) {
		var unit, orGroup, lastOr, or, pass, newGroup, len = conditions.length - 1,
			group = [],
			chain = [group];

		conditions.forEach(function(condition, i) {
			//判断是否pass模式
			if (pass) {
				pass = false;
				lastOr = condition.or;
				return;
			}

			or = condition.or;
			//判断是否为过滤条件组
			if (isArray(condition)) {
				unit = buildConditions(condition, params);
			} else {
				param = condition.param;
				//判断为过滤参数还是过滤值
				if (param.charAt(0) === '@')
					param = st.getObj(params, param.substr(1));

				//判断是否空忽略
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
					//最后一个条件和or关系下，将group设置到关系链开始
					if (or)
						group = chain[0];
				} 
				//在上一个和当前关系不一致时
				else if (i > 0 && !lastOr !== !or) {
					//当前关系为or时，提升or级别，将原有and关系组置于or关系组下
					if (or) {
						//如果存在关系链，在加深一级，否则创建关系链
						if (chain.length > 1) {
							group = chain[0];
							chain = [group];
						} else {
							chain[0] = group = [{
								and: group
							}];
						}
					} else {
						//当前为and时，创建新组，添加到前一个or关系组
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
	//根据条件关系生成过滤方法
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

	//验证关系组条件是否匹配
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

	/**
	 * 判断操作配置对象
	 * @class Operations
	 */
	var Operations = {
		/**
		 * 非判断，在判断操作符之前加入!,则将判断结果取非
		 * @property {operation} ! 
		 * @example
		 * 		//查询name不等于'roy'的数据
		 * 		var filter = "name != 'roy'"
		 */

		/**
		 * 等于判断
		 * @property {operation} = 
		 */
		"=": function(data, param) {
			return data === param;
		},
		/**
		 * 小于判断
		 * @property {operation} < 
		 */
		"<": function(data, param) {
			return data < param;
		},
		/**
		 * 小于等于判断
		 * @property {operation} <=
		 */
		"<=": function(data, param) {
			return data <= param;
		},
		/**
		 * 大于判断
		 * @property {operation} >
		 */
		">": function(data, param) {
			return data > param;
		},
		/**
		 * 大于等于判断
		 * @property {operation} >= 
		 */
		">=": function(data, param) {
			return data >= param;
		},
		/**
		 * 参数中包含数据
		 * @property {operation} in 
		 */
		"in": function(data, param) {
			return getIndex(param, data);
		},
		/**
		 * 数据中包含参数
		 * @property {operation} like 
		 */
		"like": getIndex,
		/**
		 * 以参数为开头
		 * @property {operation} startOf 
		 */
		"startOf": checkStartEnd,
		/**
		 * 以参数为结尾
		 * @property {operation} endOf 
		 * @example
		 * 		//匹配以'es'结尾的name
		 * 		var filter = "name endOf 'es'";
		 */
		"endOf": function(data, param) {
			return checkStartEnd(data, param, true);
		}
	};

	function compare(data, condition) {
		var operation = condition.operation,check,not,result;

		//判断是否为非
		if(operation.charAt(0) === '!'){
			not = 1;
			operation = operation.substring(1);
		}

		result = (check = Operations[operation]) ? check(st.getObj(data, condition.field), condition.param) : false;

		return not ? !result : result;
	}

	return {
		filterBuilder: function(filter) {
			return new FilterBuilder(filter);
		},
		/**
		 * 扩展判断操作符,如：'='比较操作符,name = @name
		 * @method extendOperation
		 * @param  {string} operation 操作名称
		 * @param  {function} checkFn   判断方法
		 * @example
		 * 		//添加大于操作符'>'
		 * 		st.extendOperation('>',function(data, param) {
		 * 			//data为数据，param为条件参数
					return data > param;
				});
		 */
		extendOperation : function(operation,checkFn){
			Operations[operation] = checkFn;
		}
	};
});
/**
    数据管理模块
    
    Feartures : 
        1. dataServices ：数据服务接口
        2. dataManager ：基于策略的数据管理基类
        3. dataPolicyManager ：数据策略管理器；

    Update Note：
        + 2014.7 ：Created

    @module DataManager
*/
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


	/**
	 * 数据服务管理；定义了数据服务的接口和通用操作方法；不能直接使用，必须创建具体类型的数据服务； 
	 * 数据服务的定义就比较广了，可以是具体的对象方式locaStorage，IndexDB，或者是一些行为ajax，comet，websocket；也可以是根据业务规则定义的rest，cache等；
	 * @class dataServices
	 * @constructor
	 * @extends factory
	 * @example
	 * 		//注册cache的数据服务
			dataServices.add("cache", {
				//实现search接口方法
				search: function(op) {
					var result, filter = op.filter;
					//过滤数据
					result = filter ? _cache.filter(filter) : _cache;
					
					//执行成功之后的方法
					op.success && op.success(result);
				},
				//实现update接口方法
				update: function(op) {
					var filter = op.filter,
						data = getData(op.data);

					if (filter) {
						//测试使用，只更新第一条匹配数据
						$.each(_cache, function(i, item) {
							if (filter(item)) {
								_cache[i] = data;
								return false;
							}
						})
					} else {
						_cache = op.data || [];
					}
					op.success && op.success(op.data);
				},
				//实现initOptions接口方法
				initOptions: function(op) {
					//生成fitler，当filter为obj类型时，编译成fn
					op.filter = buildFitler(op.filter || op.params);
				}
			});
	 */
	dataServices = st.factory({
		name: "dataServices",
		proto: {
			/**
			 * 数据服务通用操作方法；直接执行到具体的数据服务的方法上
			 * @method  operate
			 * @param  {string} type 操作类型；1. search; 2. update
			 * @param  {object} op   参数；具体参数同数据服务
			 * @param  {object} op.dsType   数据服务类型
			 * @return {object}      操作结果
			 * @example
			 * 		//执行查询cache的操作
			 * 		var result = dataServices.operate('search',{
			 * 			//设置数据服务类型为cache
			 * 			dsType : 'cache',
			 * 			//过滤参数
			 * 			fitler : {name : 'roy'},
			 * 			//换成的key，cache类型数据服务特有属性参数
			 * 			cacheKey : 'test'
			 * 		});
			 */
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
			/**
			 * 执行数据服务search操作方法
			 * @method  search
			 * @param  {object} op   参数；具体参数同数据服务
			 * @param  {object} op.dsType   数据服务类型
			 * @return {object}      操作结果
			 * @example
			 * 		//使用ajax进行查询
			 * 		dataServices.search({
			 * 			//设置数据服务为ajax类型
			 * 			dsType:'ajax',
			 * 			//服务地址
			 * 			url : 'xxxx',
			 * 			//查询参数
			 * 			param : {name : 'roy'},
			 * 			//成功之后执行的方法
			 * 			success : function(result){...}
			 * 		})
			 */
			search: function(op) {
				return this.operate('search', op);
			},
			/**
			 * 执行数据服务update操作方法
			 * @method  update
			 * @param  {object} op   参数；具体参数同数据服务
			 * @param  {object} op.dsType   数据服务类型
			 * @return {object}      操作结果
		 	 * @example
			 * 		//使用rest进行更新
			 * 		dataServices.update({
			 * 			//设置数据服务为ajax类型
			 * 			dsType:'rest',
			 * 			//rest服务地址
			 * 			url : 'user/update/{id}',
			 * 			//更新参数
			 * 			param : {id : 1 ,name : 'roy'},
			 * 			//成功之后执行的方法
			 * 			success : function(result){...}
			 * 		})
			 */
			update: function(op) {
				return this.operate('update', op);
			}
		},
		/**
		 * 数据服务基类
		 * @class baseDataService
		 */
		base: {
			/**
			 * 查询操作接口  **[接口方法]**
			 * @method  search
			 * @param  {object} op   参数；其他具体参数同见具体数据服务
			 *    @param  {object} op.filter   过滤器
			 *    @param  {object} op.success   成功之后执行的方法
			 *    @param  {object} op.error   失败之后执行的方法
			 * @return {object}      操作结果
			 */
			search: function(op) {},
			/**
			 * 更新操作接口 **[接口方法]**
			 * @method  update
			 * @param  {object} op   参数；其他具体参数同见具体数据服务
			 *    @param  {object} op.filter   过滤器
			 *    @param  {object} op.data   更新数据
			 *    @param  {object} op.success   成功之后执行的方法
			 *    @param  {object} op.error   失败之后执行的方法
			 * @return {object}      操作结果
			 */
			update: function(op) {},
			/**
			 * 通用初始化参数接口 **[接口方法]**
			 * @method  initOptions
			 * @param  {object} op   参数；其他具体参数同见具体数据服务
			 *    @param  {object} op.filter   过滤器
			 *    @param  {object} op.success   成功之后执行的方法
			 *    @param  {object} op.error   失败之后执行的方法
			 * @return {object}      参数
			 */
			initOptions: function(op) {}
		}
	})

	/**
	 * 数据管理器工厂
	 * @class dataManager
	 * @constructor
	 * @extends factory
	 * @example
	 *
	 */
	dataManager = st.factory({
		name: "dataManager",
		type: "class",
		proto: {
			/**
			 * 创建数据管理器
			 * @method create
			 * @param  {string} type 数据管理器类型
			 * @param  {object} op   数据管理参数设置
			 * @return {dataManager}     数据管理对象
			 */
			create: function(type, op) {
				var dm = this.find(type);
				if (dm)
					return new dm(op);
				else
					console.log(type + ",not defined in dataManager");
			}
		},
		/**
		 * 数据管理器基类
		 * @class baseDataManager
		 */
		base: {
			/**
			 * 是否过滤模式
			 * @type {Boolean} _filterMode
			 */
			_filterMode: true,
			//_operations : ["get","set"],
			/**
			 * 数据管理对象的类初始化方法；
			 * @method klassInit
			 * @final
			 * @param op {object}  数据管理设置参数
			 * @return {dataManager}   初始化完成的数据管理对象
			 */
			klassInit: function(op) {
				var dm = st.attachTrigger(this);

				op = dm.op = st.mergeObj(op, _config.dmOp);

				initPolicy(dm, op.get, 'get');
				initPolicy(dm, op.set, 'set');

				initFlow(dm);
				policyManager.applyPolicy(dm, dm._Flow, op);
				this.init(op);
			},
			/**
			 * 数据管理对象的初始化接口方法 **[接口方法]**
			 * @method init
			 * @param  op {object} 数据管理设置参数
			 */
			init: function(op) {},
			/**
			 * 使用dataManager的数据通道进行获取数据
			 * @method get
			 * @param  conf {object} 获取设置参数
			 * @return {object|promise}   查询结果或者promise
			 */
			get: function(conf) {
				var dm = this;
				conf = initConf(dm, conf);
				return whenFlow(dm._Flow.boot(dm, dm.op, conf.policy), conf.success, conf.error);
			},
			/**
			 * 使用dataManager的数据通道进行设置数据
			 * @method set
			 * @param  conf {object} 设置参数
			 * @return {object|promise}   设置结果或者promise
			 */
			set: function(conf) {
				var dm = this;
				conf = initConf(dm, conf);
				return whenFlow(dm._Flow.bootWithStart("setData", [dm, dm.op, conf.policy]), conf.success, conf.error);
			},
			/**
			 * 使用dataManager内置查询(即只在dataManager内部查询，不查询dataService)接口. **[接口方法]**
			 * @method _innerSearch
			 * @param  conf {object} 获取设置参数
			 * @return {object}   查询结果
			 */
			_innerSearch: function(conf) {

			},
			/**
			 * 使用dataManager内置更新(即只在dataManager内部更新，不更新到dataService)接口. **[接口方法]**
			 * @method _innerUpdate
			 * @param  conf {object} 设置参数
			 * @return {object}   设置结果
			 */
			_innerUpdate: function(conf) {

			},
			/**
			 * 检查数据是否为空;数据策略的判断空数据会根据此方法的结果来判断;不同类型的数据管理的判断也不同。
			 * 如：object判断是否为undefined;table判断数据的长度是否大于0
			 * @method checkEmpty
			 * @param  data {object} 检查的数据
			 * @param  conf {object} 设置参数
			 * @return {[type]}  判断是否为空
			 */
			checkEmpty: function(data, conf) {
				return data === undefined;
			},
			//验证方法
			validate: function() {

			},
			/**
			 * 清空数据管理内的数据的方法. **[接口方法]**
			 * @method clear
			 */
			clear: function() {
			},
			/**
			 * 设置dataService的参数,在每次使用数据通道时执行. **[接口方法]**
			 * @method setDataSerive
			 * @param config {object} 设置dataService的参数
			 */
			setDataSerive: function(config) {},
			/**
			 * 初始化策略参数
			 * @method initPolicy
			 * @param  policy {object} 策略设置
			 * @param  type  {type}  操作类型. 
			 *  1. get; 
			 *  2. set;
			 */
			initPolicy: function(policy, type) {
				if (this._filterMode) {
					policy._filterBuilder = policy.filter ? st.filterBuilder(policy.filter) : defFilterBuilder;
				}
			},
			/**
			 * 生成传递的参数
			 * @method buildParam
			 * @param  policy {object}    策略设置
			 * @param  defPolicy {object} 默认的策略设置
			 */
			buildParams: function(policy, defPolicy) {
				buildParams(this, policy, defPolicy);
			},
			/**
			 * 生成策略，对策略参数进行初始化，生成传递参数，合并参数
			 * @method  buildPolicy
			 * @param  policy {object}    策略设置
			 * @param  defPolicy {object}  默认的策略设置
			 */
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

	/*初始化dm的get，set配置*/
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

	/*开启数据传输*/
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

	/*判断并设置定时器*/
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

	/*解析Trigger*/
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
});
/**
    针对于表类型的数据进行管理
    
    Feartures : 
        1. 提供CRUD接口
        2. 内置状态控制


    Update Note：
        + 2014.7 ：Created

    @module DataManager
    @submodule DataManager-Table
*/
stDefine("dataManager-table", function(st) {
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