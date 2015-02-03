'use strict';
/*
    SmartJS基础模块

    Feartures : 
        1. 基础公共方法
        2. 基础公共对象

    Update Note：
        + 2014.10.16 getObj和setObj支持array设置和获取
        + 2014.8.06 加入priorityList
        + 2014.5 ：Created
        
    @module Core
*/
(function(gbl) {
    var _config = {},
        st = {
            __smartJs: '0.5.0',
            noop: function() {},
            define : stDefine
        };

    gbl._smartJS = st;

    if (gbl.st == null)
        gbl.st = st;

     gbl._stDefine = stDefine;
     
    /*
     * SmartJS 模块定义方法
     * @method stDefine
     * @param  {string}   name 模块名
     * @param  {Function} fn   模块定义方法；fn(st,fnConf):
     *                         st: smartJS对象;
     *                         fnConf : 配置参数设置方法
     * @return {st}  st模块方法
     * @demo test/base/base.js [stDefine]
     */
     function stDefine(name, fn) {
        var mod = fn(st);
        if (mod) {
            for (var name in mod) {
                st[name] = mod[name];
            }
        }

        gbl.define && gbl.define(name, function() {
            return mod;
        })
    }

})(window);

/**
    SmartJS基础模块

    Feartures : 
        1. 基础公共方法
        2. 基础公共对象

    Update Note：
        + 2014.10.16 getObj和setObj支持array设置和获取
        + 2014.8.06 加入priorityList
        + 2014.5 ：Created
        
    @module Base
*/
_stDefine("base",function(st) {
    /**
     * SmartJS避免混淆的方法;
     * SmartJS默认在使用window._smartJS；同时会判断window.st是否被占用，如果没占用的话，会同样映射到window.st;
     * noConflict接受一个字符名(window下)或者对象，smartjs会同步到这个对象
     * @method noConflict
     * @param  {string|object} extreme 扩展名或者是对象
     * @return {_smartJS}  smartJS对象
     * @demo test/base/base.js [noConfilict]
     */
    function noConflict(extreme) {
        if (typeof extreme === 'string')
            gbl[extreme] = st;
        else if (extreme)
            st = mergeObj(extreme, st);
        return st;
    }

    var _config = {};

    /**
     * 基础方法
     * @class common
     */

    /**
       SmartJS的配置公共参数方法
       @method  conf
       @param  {string} name 参数名
       @param  {object} conf 参数
       @param  {string} [mode='merge'] 参数设置模式，默认
                             1. merge,合并模式；
                             2. mix,混入模式；只应用原来没有的设置
                             3. replace,完全替换原来设置
       @param  {boolean} [deep] 是否深度拷贝拷贝，当mode为'merge'和'mix'有效
       @demo test/base/base.js [conf]
     */
    function conf(name, config, mode, deep) {
        var oldConfig = _config[name];

        if (config === undefined)
            return oldConfig;
        else {
            if (typeof(mode) === 'boolean') {
                deep = mode;
                mode = null;
            }

            if (mode !== 'replace' && oldConfig) {
                config = (mode === 'mix' ? mix : mergeObj)(deep || false, oldConfig, config);
            }

            _config[name] = config;
        }
    }


    /**
      将argument转换成array
      @method sliceArgs
      @param args {function} argument对象
      @param [start = 0] {number} 开始位置
      @return [array] 返回转换的数组
      @demo test/base/base.js [slice arguments]
    */
    function sliceArgs(args, start) {
        return Array.prototype.slice.call(args, start || 0);
    }

    /*
      复制数据方法,支持对象字面量和数组的复制
      @method copy
      @todo：st内部对象的复制功能
      @param deep {boolean} 是否深度复制
      @param obj {object | array} 注入的方法名
      @param [exclude] {array|function} 排除合并的设置
      @return 返回复制之后的对象
      @demo test/base/base.js [copy]
      @demo test/base/base.js [deep copy]
    */
    function copy(deep, obj, exclude) {
        var args = _buildMergeArgs(arguments);
        return _copy(args[0], args[1], args[2]);
    }

    function _copy(deep, obj, exclude, group) {
        var type = typeof obj,
            copyObj, ns;

        //构建排除方法
        exclude = _buildExclude(exclude);

        if (st.isPlainObject(obj)) {
            copyObj = {};
            group || (group = '');

            st.each(obj, function(name, value) {
                ns = group + name;
                if (!exclude || exclude(ns))
                    copyObj[name] = _copy(deep, value, exclude, ns + '.');
            })
        } else if (st.isArray(obj)) {
            copyObj = [];

            st.each(obj, function(i, item) {
                copyObj.push(copy(deep, item, exclude));
            })
        } else
            copyObj = obj;

        return copyObj;
    }

    function _buildExclude(exclude) {
        if (exclude && !st.isFunction(exclude)) {
            return function(name) {
                return exclude.indexOf(name) === -1;
            }
        }
        return exclude;
    }

    function _mergeObj(isMerge, deep, obj, defObj, group, fnCheck) {
        var prop, valueType, propType;
        st.each(defObj, function(name, value) {
            var ng = group + name;
            //判断是否拷贝
            if ((fnCheck && fnCheck(ng, value) === false))
                return;

            ng += '.';

            if ((prop = obj[name]) == null) {
                obj[name] = _copy(deep, value, fnCheck, ng);
            } else if (deep && st.isPlainObject(prop) && st.isPlainObject(value)) {
                _mergeObj(isMerge, deep, prop, value, ng, fnCheck);
            } else if (isMerge)
                obj[name] = value;
        });
        return obj;
    }

    function _isDefined(name, value) {
        return value !== undefined;
    }

    function _buildMergeArgs(args) {
            args = sliceArgs(args);
            if (typeof args[0] !== 'boolean') {
                for (var i = args.length; i > 0; i--) {
                    args[i] = args[i - 1];
                };
                args[0] = false;
            }
            return args;
        }
        /**
            合并默认数据方法,将obj中不空的内容从defObj中复制
            @method mergeObj
            @param [deep] {boolean} 是否深度合并
            @param obj {function} 合并对象
            @param defObj {function} 默认对象
            @param [exclude] {array|function} 排除合并的设置
            @param [isMix] {boolean} 排除合并的设置
            @return [function] 返回合并之后的对象；如obj不为空时返回obj，否则返回新对象
         */
    function mergeObj(deep, obj, defObj, exclude, isMix) {
        var fnCheck, args = _buildMergeArgs(arguments);

        if (args[2] == null || st.isEmptyObject(args[2]))
            return args[1];

        fnCheck = _buildExclude(args[3]);

        if (args[4])
            fnCheck = mergeFn(_isDefined, fnCheck);

        if (!args[1])
            return _copy(deep, args[2], args[3]);
        else
            return _mergeObj(!args[4], args[0], args[1], args[2], '', fnCheck);
    }

    /**
        合并默认数据方法,将obj中不空的内容从defObj中复制
        @method mix
        @param [deep] {Number} 是否深度合并
        @param obj {function} 合并对象
        @param defObj {function} 默认对象
        @param [exclude] {array|function} 排除合并的设置
        @return [function] 返回合并之后的对象；如obj不为空时返回obj，否则返回新对象
        @demo test/base/base.js [mix obj] {对象混入}
        @demo test/base/base.js [mix Obj - deep copy] {对象深度混入}
        @demo test/base/base.js [mix Obj - exclude] {混入-排除模式}
    */
    function mix(deep, obj, defObj, exclude) {
        var args = _buildMergeArgs(arguments);
        return mergeObj(args[0], args[1], args[2], args[3], true);
    }

    /**
       合并多个对象
       @method mergeMulti
       @param  {boolean}  deep  是否深度合并
       @param  {array}  合并的对象集合
       @param  {Boolean} [isMix]  是否为mix模式，默认是merge模式
       @param  {array|function}  [exclude]  排除合并的设置
       @return {object} 返回合并对象
       @demo test/base/base.js [mergeMulti]
     */
    function mergeMulti(deep, objs, isMix, exclude) {
        var args = _buildMergeArgs(arguments),
            obj, len;
        deep = args[0];
        isMix = args[2];
        exclude = _buildExclude(args[3]);

        if ((objs = args[1]) && (len = objs.length)) {
            obj = objs[0];
            for (var i = 1; i < len; i++) {
                obj = mergeObj(deep, obj, objs[i], exclude, isMix);
            }
        }
        return obj;
    }

    /**
       在目标对象方法中注入方法，返回结果
       @method injectFn
       @param target {object} 注入的目标对象
       @param name {string} 注入的方法名
       @param fn {function} 注入方法
       @param [before] {boolean} 是否前置注入，默认后置
       @param [stopOnFalse] {boolean} 是否开启返回值为false停止后续执行
       @demo test/base/base.js [inject function] {方法注入（默认后置）}
       @demo test/base/base.js [inject function -- before] {前置方法注入}
       @demo test/base/base.js [inject function -- stopOnFalse] {stopOnFalse模式}
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
      @demo test/base/base.js [merge function] {方法合并}
      @demo test/base/base.js [merge function - stopOnFalse] {stopOnFalse模式}
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

    function _getObjProp(name) {
        var index;
        name = name.replace(/\[([\d]*?)]/g, function(s, num) {
            index = num;
            return '';
        });

        return {
            name: name,
            index: index
        };
    }

    /**
        获取对象的属性或方法，支持命名空间方式获取
        @method getObj
        @param target {object} 目标对象
        @param ns {string} 属性名称或者相对于target的路径，使用"."进行分割
        @param [root] {boolean} 是否从根开始，默认从target子开始；从根开始则忽略ns的第一级
        @return [object] 返回获取的属性或者方法
        @demo test/base/base.js [getObj]
    */
    function getObj(target, ns, root) {
        var obj = target,
            result;
        result = handleObj(target, ns, root, function(i, name, len) {
            var prop = _getObjProp(name);

            obj = obj[prop.name];

            if (obj && prop.index)
                obj = obj[prop.index];

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
        @param [mode] {string} 值设置的方式,目标对象和值都为object类型有效，默认为替换；"mix" : 混入合并默认值；"merge" : 复制合并值；
        @param [root] {boolean} 是否从根开始，默认从target子开始；从根开始则忽略ns的第一级
        @return [object] 返回获取的属性或者方法
        @demo test/base/base.js [setObj - base] {base}
        @demo test/base/base.js [setObj - root mode] {root mode}
        @demo test/base/base.js [setObj - merge mode] {merge mode}
        @demo test/base/base.js [setObj - mix and root mode] {mix and root mode}
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
            var prop = _getObjProp(name),
                setValue;
            _prop = obj[prop.name];
            if (prop.index) {
                _prop || (_prop = []);
                setValue = function(_value) {
                    _prop[prop.index] = _value;
                    return (obj[prop.name] = _prop);
                }
            } else {
                setValue = function(_value) {
                    return (obj[prop.name] = _value);
                }
            }

            if (i === len - 1) {
                if (mode && st.isPlainObject(_prop))
                    (mode === 'merge' ? mergeObj : mix)(true, _prop, value);
                else
                    setValue(value);
            } else {
                obj = st.isPlainObject(_prop) ? _prop : (setValue({}));
            }
        })
        return result === null ? result : obj;
    }

    var escapeMap = {
        "<": "&#60;",
        ">": "&#62;",
        '"': "&#34;",
        "'": "&#39;",
        "&": "&#38;"
    };

    function applyToStr(obj) {
        if (typeof obj === 'function')
            obj = obj();

        return obj + '';
    }

    function getEscape(s) {
        return escapeMap[s];
    }
    var encodeHandler = {
        html: function(content) {
            return content.replace(/&(?![\w#]+;)|[<>"']/g, getEscape);
        },
        url: function(content) {
            return encodeURIComponent(content);
        }
    };

    /**
     * 编码方法
     * @method encode
     * @param  {string|function} content 编码内容或者是获取编码内容打的方法
     * @param  {string} type   编码类型;
     *                         1. html:html编码
     *                         2. url:url编码
     * @return {string}   编码后的内容
     */
    function encode(content, type) {
        var encodeFn = encodeHandler[type] || encodeHandler.html;
        return encodeFn(applyToStr(content));
    }

    var formatEncode = {
        '@': 'url',
        '$': 'html',
        '#': false
    };

    var _regxFromat = /\{{([\s\S]*?)}}/g;

    /**
     * 文本格式化方法
     * @method format
     * @param  {string} tmpl       模板内容
     * @param  {object} data       填充的数据对象
     * @param  {string} encodeType 编码类型，html,url
     * @return {string}     格式化后的文本内容
     */
    function format(tmpl, data, encodeType) {
        if (tmpl && data) {
            return tmpl.replace(_regxFromat, function(s, field) {
                var enType = formatEncode[field.charAt(0)],
                    content;
                if (enType != null) {
                    field = field.substr(1);
                } else
                    enType = encodeType;

                content = st.getObj(data, field);
                return content == null ? '' : enType ? encode(content, enType) : content;
            });
        }
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
        @demo test/base/base.js [priorityList]
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
        */
        function add(item, priority) {
            var len = _list.length,
                itemPriority;
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
                        itemPriority = _list[i].priority;
                        if ((itemPriority == null ? _priority : itemPriority) < priority) {
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

    return {
        noConflict:noConflict,
        conf: conf,
        sliceArgs: sliceArgs,
        copy: copy,
        mix: mix,
        mergeObj: mergeObj,
        mergeMulti: mergeMulti,
        injectFn: injectFn,
        mergeFn: mergeFn,
        getObj: getObj,
        setObj: setObj,
        encode: encode,
        format: format,
        priorityList: priorityList
    }
});

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
/**
    面向对象思想的辅助实现模块;
    
    Feartures : 
        1. klass ：类继承；实现执行指针，类常用方法，继承路径
        2. factory ：对象/类工厂方法；

    Update Note：
        + 2014.6 ：Created

    @module OOP
*/
_stDefine('oop', function(st) {
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
                @demo test/base/oop.js [klassBase - callProto] {执行原型链方法}
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
                @demo test/base/oop.js [klassBase - getBase] {获取基类对象}
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
               调用基类的方法
               @method  callBase
               @param  {string} fnName   方法名称
               @param  {string} [baseName] 基类名称
               @param  {array} [args]    方法参数数组
               @return {object}  执行结果
               @demo test/base/oop.js [klassBase - callBase] {调用父类}
               @demo test/base/oop.js [muilt heirht - callBase] {多级继承示例}
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
               类扩展方法
               @method extend
               @param  {object} prop 扩展的属性和方法对象
               @chainable
               @demo test/base/oop.js [klassBase - extend] {类扩展}
             */
            extend: function(prop) {
                st.mergeObj(this, prop);
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
        @demo test/base/oop.js [class init] {实例化}
        @demo test/base/oop.js [inheirt] {类继承}
        @demo test/base/oop.js [klass prop check] {继承特性检查}
        @demo test/base/oop.js [muilt heirht - callBase] {多级继承}
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
            _proto = st.mergeObj(_obj.prototype, _klassBase);

        _obj.fn = _proto;

        st.mergeMulti([_proto, _prop,{
            //类标示
            _$klass: true,
            //类名
            _$kName: name,
            //继承链
            _$inheirts: _inheirts
        }]);

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
     * @demo test/base/oop.js [factory inheirt] {继承}
     * @demo test/base/oop.js [factory class mode] {类继承模式}
     * @demo test/base/oop.js [factory merge mode] {对象合并模式}
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
           使用工厂创建产品方法，但不注册到factory中
           @method build
           @param  {string} name   产品名称
           @param  {object} item   产品特性
           @param  {string} [parent] 父类名称，注册到factory中产品名称
           @return {object|klass}  返回创建的产品
           @demo test/base/oop.js [factory build]
         */
        function build(name, item, parent) {
            parent = parent ? find(parent) || _base : _base;

            item._$fType = name;

            if (mergeMode)
                return st.mix(true, item, parent);
            else {
                item = klass(name, item, parent);
                return klassMode ? item : new item;
            }
        }

        /**
           添加产品方法，注册到factory中
           @method add
           @param  {string} name   产品名称
           @param  {object} item   产品特性
           @param  {string} [parent] 父类名称，注册到factory中产品名称
           @return {object|klass}  返回创建的产品
           @demo test/base/oop.js [factory add]
         */
        function add(name, item, parent) {
            return (_store[name] = build(name, item, parent));
        }

        /**
           查找注册的产品
           @method find
           @param  {string} name   产品名称
           @param  {object} defaultMode   是否在找不到产品的时候返回默认产品
           @return {object} 返回查找的产品
         */
        function find(name, defaultMode) {
            var obj;
            if (arguments.length === 0)
                return _defaultItem;

            if (name && (obj = _store[name])) {
                return obj;
            }
            return defaultMode ? _defaultItem : undefined;
        }

        /**
           将注册的产品设置成默认产品
           @method setDefault
           @param  {string} name   产品名称
           @chainable
           @demo test/base/oop.js [setDefault]
         */
        function setDefault(name) {
            _defaultItem = find(name, true);
            return this;
        }

         /**
           在工厂中移除注册的产品
           @method remove
           @param  {string} name   产品名称
           @chainable
         */
        function remove(name) {
            delete _store[name];
        }

        proto = st.mergeObj({
            build: build,
            add: add,
            find: find,
            remove: remove,
            setDefault: setDefault,
            /**
               执行工厂中产品的方法,不会返回结果;当工厂类型为class时，则执行的则是原型链上的方法
               @method fire
               @param  {string} name 方法名称
               @param  {array} [args] 执行参数
               @param  {function} [handler] 处理方法
               @demo test/base/oop.js [fire]
             */
            fire : function(name,args,handler){
                var fn,result,self = this;
                st.each(_store,function(n,item){
                    if(item){
                        item.fn && (item = item.fn);
                        if(fn = item[name])
                        {
                            result = fn.apply(item,args);
                            handler && handler.call(self,item,result);
                        }
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