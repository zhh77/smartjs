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
                if (!exclude || exclude(ns,value))
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
