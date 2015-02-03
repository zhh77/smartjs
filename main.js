define(function() {
    requirejs.config({
        baseUrl: 'src/',
        paths: {
            lib: '../lib',
            dest: '../dest',
            test: '../test',
        }
    });

    var libs = ["lib/jquery",'dest/smart-jq.min','dest/smart-dataManager.min'],
   		res = ['base/base','base/aop', 'base/oop',
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
        //reqJS([].concat(res), function() {
            for (var i = 0, fn; fn = fns[i]; i++) {
                fn(res);
            }
        //});
    });


    return function stDevReady(fn) {
        fns.push(fn);
    };
});