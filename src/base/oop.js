"use strict";
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
                    else if (len < 6)
                        return new _obj(args[0], args[1], args[2], args[3], args[4]);
                    else
                    {
                        //性能考虑，大于5个参数才走自动初始化方式
                        var _newObj = new _paramObj;
                        _obj.apply(_newObj,args);
                        return _newObj;
                   }
                }
                //设置指针对象
                self._$indicator = {};
                //设置原型链
                self._$fn = _proto;
                //执行扩展方法
                _onKlassInit.fireWith(self,config);
                //klassInit默认初始化
                self.klassInit && self.klassInit.apply(self, args);
            },
            //方法初始函数，即new klass(param)与klass(param)等效
            _paramObj = function(){};

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

        _obj.fn = _paramObj.prototype = _proto;

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