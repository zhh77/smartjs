_stDefine('support', function(st) {

    function each(data,callback) {
        var i, len;
        if (isArray(data)) {
            for (i = 0, len = data.length; i < len; i++) {
                if(callback.call(data,i, data[i]) === false)
                	return;
            }
        } else {
            for (i in data) {
                if(callback.call(data,i,data[i])  === false)
                	return;
            }
        }
    }
    var isArray = Array.isArray;

    function isEmptyObject(obj) {
        var name;
        for (name in obj) {
            return false;
        }
        return true;
    }

    var hasOwn = ({}).hasOwnProperty;

    function isPlainObject(obj) {
        if (obj == null || typeof obj !== "object" || obj.nodeType || (obj === obj.window)) {
            return false;
        }

        if (obj.constructor &&
            !hasOwn.call(obj.constructor.prototype, "isPrototypeOf")) {
            return false;
        }
        return true;
    }

    function isFunction(fn) {
        return typeof fn === 'function';
    }

    return {
        each: each,
        isArray: isArray,
        isEmptyObject: isEmptyObject,
        isPlainObject : isPlainObject,
        isFunction: isFunction
    };
})
