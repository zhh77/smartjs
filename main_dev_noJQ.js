define(function() {
    requirejs.config({
        baseUrl: 'src/',
        paths: {
            lib: '../lib',
            test: '../test'
        }
    });


    var libs = ["base/define"],
        res = ['base/base', 'base/support', 'base/deferred','base/aop', 'base/oop',
                'dataManager/filterBuilder', 'dataManager/dataManager', 'dataManager/dataManager-table'
              ],
        fns = [];


    function reqJS(_res, success) {
        var path = _res.shift();
        if(path) {
            require([path], function() {
                reqJS(_res,success)
            });
        }
        else
            success && success();
    }

    reqJS(libs,function(){
        reqJS([].concat(res), function() {
            for (var i = 0, fn; fn = fns[i]; i++) {
                fn(res);
            }
        });

    });

    return function stDevReady(fn) {
        fns.push(fn);
    };
});