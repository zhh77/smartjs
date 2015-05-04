'use strict';
//smartj for node
(function(gbl) {
    var _config = {},
        st = {
            __smartJs: '0.5.0',
            stDefine: stDefine,
            noop: function() {}
        };

    module.exports = st;
    gbl._stDefine = stDefine;

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

})(global);
