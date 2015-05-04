"use strict";
/**
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
_stDefine('aop', function(st) {
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
        st.mergeObj(this, prop);
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
            2. 'once' : 全部事件执行一次，即有执行动作就销毁
            3. 'noBlock' : 非阻塞模式；
        @demo test/base/aop.js [add] {基础}
        @demo test/base/aop.js [Once Mode] {once模式}
        @demo test/base/aop.js [callback mode] {callback模式}
        @demo test/base/aop.js [promise - result] {promise示例}
        @demo test/base/aop.js [noBlock mode] {非阻塞模式}
        @demo test/base/aop.js [Transfer Result] {结果传递}
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
            @demo test/base/aop.js [clear]
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
            @param [priority=0] {number} 权重;预设为0，可以通过配置调整
            @param [mode] {string} 回调模式："once":执行一次
            @chainable
            @demo test/base/aop.js [add]
        */
        function add(name, fn, priority, mode) {
            if (!name && typeof name !== 'string' && !fn)
                return;

            if(typeof (priority) === 'string') {
                mode = priority;
                priority = null;
            }

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
            @demo test/base/aop.js [remove]
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
            @demo test/base/aop.js [fireWith]
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
                    @demo test/base/aop.js [StopPropagation]
                */
                stopPropagation: function() {
                    _stop = true;
                    return this;
                },
                /**
                    完成契约
                    @method resolve 
                    @param [result] {object} 返回结果
                    @demo test/base/aop.js [promise - resolve]
                    @demo test/base/aop.js [promise - multi]
                    @demo test/base/aop.js [promise - noBlock]
                */
                resolve: function(result) {
                    fireCount++;
                    isDefined(result) && (_result = result);
                    _stop ? done() : fireItem();
                },
                /**
                    拒绝契约，在任何一个事件中reject都会停止所有后续promiseEvent的执行
                    @method reject 
                    @param err {object} 拒绝参数
                    @demo test/base/aop.js [promise - reject]
                */
                reject: function(err) {
                    fail(err);
                },
                /**
                    删除当前事件；与promiseEvent.add的'once'模式，不同在于可以手动进行控制
                    @method remove 
                    @chainable
                    @demo test/base/aop.js [promise - remove]
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

            defer = st.Deferred();

            return openPromise(defer, _err);
        }

        /**
            判断是否存在事件回调
            @method has 
            @for promiseEvent
            @param name {string} 事件回调名
            @return {boolean} 是否存在
            @demo test/base/aop.js [has]
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
            /**
             * 获取注册的事件长度/数
             * @method len
             * @return {number} 注册的事件长度/数
             */
            len : function(){
                return _list.len();
            },
            remove: remove,
            /**
                执行回调
                @method fire 
                @for promiseEvent
                @param args {array} 执行参数
                @param [argHandle] {function} 参数处理方法，可以对eventarg进行修改；例如：argHandle(e)
                @return {object} 返回执行结果
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
            @demo test/base/aop.js [Bind Test] {基本注册}
            @demo test/base/aop.js [Bind Child] {子对象注册}
            @demo test/base/aop.js [Custom Interface] {自定义接口}
            @demo test/base/aop.js [callback mode] {callback模式}
            @demo test/base/aop.js [all promise] {promise}
            @demo test/base/aop.js [promise - transfer result] {promise结果传递}
            @demo test/base/aop.js [watch prop change] {属性监听}
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
                    if (st.isArray(trName)) {
                        st.each(trName, function(i, n) {
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
                        _stop, _preventDefault, dTransResolve, oldValue,originFn;

                    //属性模式取出原来的值
                    if(isProp){
                        oldValue = _fnMap[_name];
                        originFn =  baseFn;
                    }
                    else {
                        originFn = _fnMap[_name] || baseFn;
                    }

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
                        st.when(fireResult).then(function(result) {
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
                        @demo test/base/aop.js [preventDefault]
                        @demo test/base/aop.js [stopPropagation && preventDefault]
                    */
                    function preventDefault() {
                        _preventDefault = true;
                        return this;
                    }

                    /**
                        停止当前方法执行和后置所有事件；在属性监听时，则阻止赋值；
                        @method stop
                        @chainable
                        @demo test/base/aop.js [stop]
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
                        whenFire(originFn.apply(_target, checkPropValue(args)), function(result) {
                            if (dTrans && isPromise(result))
                                return;

                            setResult(result);
                            fireAfter();
                        })
                    })

                    if (_done)
                        return _result;

                    defer = st.Deferred();

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
                    st.setObj(_target,_name,bindFn);
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
                @event onHandler
                @for attachTrigger
                @param name [string] 手动触发器名称
                @param trName [string] 注册事件方法的名称
                @param fn [function] 注册事件方法
                @param [priority] [number] 权重设置，同PrmiseEvent 
                @param [mode] [string] 加入的事件模式，同PrmiseEvent
                @chainable
                @demo test/base/aop.js [onHandler]
            */
            onHandler: function(name, trName, fn, priority, mode) {
                find(name, null, true).add(trName, fn, priority, mode);
                return this;
            },
            /**
                执行手动触发的Handler
                @method fireHandler
                @for attachTrigger
                @param name [string] 手动触发器名称
                @param args [array] 执行参数数组
                @return [object] 执行结果
            */
            fireHandler: function(name, args) {
                return fire(name, args);
            },
            /**
                注册[后置的]事件方法;注册后置和对象注入
                @event on
                @for attachTrigger
                @param name {string|object} 目标方法或者属性名称;[object]类型时为对象注入
                @param trName {string} 注册事件方法的名称|属性名称；对象注入模式下，会自动拼接成trName-[名称|属性名]-[注入方式]
                @param fn {function|object} 注册事件方法;对象注入模式下，[object]类型才会生效
                @param [priority] [number] 权重设置，同PrmiseEvent 
                @param [mode] [string] 加入的事件模式，同PrmiseEvent
                @chainable
                @demo test/base/aop.js [Bind Child] {基础注入}
                @demo test/base/aop.js [on - object] {对象注入}
                @demo test/base/aop.js [watch prop change cancel] {属性监听}
            */
            on: function(name, trName, fn, priority, mode) {
                if (typeof name === 'object') {
                    st.each(name, function(target, config) {
                        var arr = target.split(' '),
                            fnName = arr[0],
                            type = arr[1] || trTypes[1],
                            tName = trName + '-' + fnName + '-' + type;

                        if (st.isFunction(config))
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
                @event onBefore
                @for attachTrigger
                @param name [string] 目标方法或者属性名称
                @param trName [string] 注册事件方法的名称
                @param fn [function] 注册事件方法
                @param [priority] [number] 权重设置，同PrmiseEvent 
                @param [mode] [string] 加入的事件模式，同PrmiseEvent
                @chainable
            */
            onBefore: function(name, trName, fn, priority, mode) {
                return bind(name, trName, fn, trTypes[0], priority, mode)
            },
            /**
                注册环绕触发事件
                @event onRound
                @for attachTrigger
                @param name [string] 目标方法或者属性名称
                @param trName [string] 注册事件方法的名称
                @param fn [function] 注册事件方法
                @chainable
                @demo test/base/aop.js [round mode]
            */
            onRound: function(name, trName, fn) {
                return bind(name, trName, fn, trTypes[2])
            },
            /**
                注册错误捕获事件，当执行reject的时候触发
                @event onError
                @for attachTrigger
                @param name [string] 目标方法或者属性名称
                @param trName [string] 注册事件方法的名称
                @param fn [function] 注册事件方法
                @param [mode] [string] 加入的事件模式，同PrmiseEvent
                @chainable
                @demo test/base/aop.js [onError]
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
                @demo test/base/aop.js [offBefore && off]
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
                @demo test/base/aop.js [extend]
            */
            extend: function(prop) {
                var fn;
                st.each(prop, function(n, p) {
                    ((fn = _fnMap[n]) ? _fnMap : _target)[n] = p;
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

        fnInterface = fnInterface ? st.mergeObj(st.copy(_interface),fnInterface) : _interface;

        st.each(fnInterface, function(i, n) {
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
        @demo test/base/aop.js [boot] {基础使用}
        @demo test/base/aop.js [simple Mode] {简单模式}
        @demo test/base/aop.js [promise] {promise示例}
        @demo test/base/aop.js [trigger - end] {promise示例2}
        @demo test/base/aop.js [trigger] {trigger示例}
        @demo test/base/aop.js [trigger - callback mode & interface change] {trigger示例2}
        @demo test/base/aop.js [trigger - transfer Result] {值传递}
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
         * @demo test/base/aop.js [boot with start]
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
                       结束流程。无论是注册的事件方法还是流程方法全部结束
                       @method end
                       @chainable
                       @demo test/base/aop.js [end]
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
                     * @demo test/base/aop.js [reject]
                     */
                    reject: function(comment) {
                        fail(comment);
                    },
                    /**
                       手动指定下一个流程，（指定的流程可以不在order配置中）
                       @method next
                       @param  {string}   nextNode 下一个流程名称
                       @param  {number}   pass     下个流程执行完毕略过的流程数（相对于order）
                       @param  {array}   args     下个流程的参数，只在该流程节点有效，在之后就会恢复成原始参数，如想改变后续参数，请使用changeArgs方法
                       @chainable
                       @demo test/base/aop.js [next]
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
                       改变后续流程的执行参数
                       @method changeArgs
                       @param  {array}   args   执行参数
                       @demo test/base/aop.js [changeArg & originalArgs] {changeArg}
                     */
                    changeArgs: getArgs,
                    /**
                     * 恢复原始执行参数，下个流程中生效，与changeArgs方法对应
                     * @method recoverArgs
                     * @chainable
                     * @demo test/base/aop.js [changeArg & originalArgs] {recoverArgs}
                     */
                    recoverArgs: function() {
                        _args = originalArgs;
                        return this;
                    },
                    __mergePArg: function(arg) {
                        st.mix(arg, d);
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
                    st.when(fnNode.apply(flow, fireArgs)).then(function(result) {
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

            defer = st.Deferred();
            return openPromise(defer, _err);
        }

        /**
         * 启动流程，
         * @method boot
         * @for flowController
         * @param {argument} 流程参数
         * @return {object|promise} 返回执行结果或者promise（异步）
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
});