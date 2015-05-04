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
