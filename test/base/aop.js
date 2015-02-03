(function() {
	var $ = window.jQuery || st;
	
    describe('PromiseEvent Test', function() {


        it("add", function(endTest) {
            //标准模式
            var events = st.promiseEvent(),
                result = [];

            //注册事件
            events.add('call1', function(e, text) {
                result.push('call1');
            });

            //自定义priority注册事件
            events.add('call2', function(e, text) {
                result.push('call2');
            },100);

            //单once模式注册
            events.add('call3', function(e, text) {
                result.push('call3');
            },'once');

            //所有设置
            events.add('call4', function(e, text) {
                result.push('call4');
            },50,'once');

            //返回promise
            events.add("promiseCall", function(e, text) {
                //异步的方法
                setTimeout(function() {
                    result.push('promiseCall');
                    e.resolve();
                },0);
                return e.promise();
            },20);

            //回调中如果存在promise需要,st.when来获取结果
            st.when(events.fire('test')).done(function(){
                expect(result.join('-')).toBe('call2-call4-promiseCall-call1-call3');
                endTest();
            });
        })

        it("Remove", function() {
            var calls = st.promiseEvent(),
                result = [];
            //添加事件
            calls.add('call1', function(e, text) {
                result.push(text);
            })
            //删除事件
            calls.remove('call1');
            calls.fire('called');
            //无事件执行
            expect(result.length).toBe(0);
        })

        it("has", function() {
            var calls = st.promiseEvent();

            calls.add("call1", function(e) {});

            //判断是否注册了"call1"的event
            expect(calls.has("call1")).toBeTruthy();
        })


        it("Priority", function() {
            var calls = st.promiseEvent(),
                result = [],
                arrP = [10, 5, null, 100, 10],
                len = arrP.length,
                i = 0,
                p;

            var addCall = function(name, p) {
                calls.add(name, function() {
                    result.push(name);
                }, p)
            }

            for (; i < len; i++) {
                if (p = arrP[i]) {
                    addCall(i + '-' + p, p)
                } else {
                    addCall(i + '-d')
                }
            }

            calls.fire();
            expect(result.join(',')).toBe('3-100,0-10,4-10,1-5,2-d');
        })

        it("clear", function() {
            var events = st.promiseEvent();

            //添加回调
            events.add('call1', function(e, text) {});
            events.add('call2', function(e, text) {});

            //回调事件总数为2
            expect(events.len()).toBe(2);

            //清除events下面注册的事件
            events.clear();

            //回调事件总数为0
            expect(events.len()).toBe(0);
        })

        it("remove",function(){
            var events = st.promiseEvent();

            //注册事件
            events.add('call1', function(e, text) {});

            //删除事件
            events.remove('call1');

            expect(events.len()).toBe(0);
        })


        it("StopPropagation", function() {
            var calls = st.promiseEvent(),
                result = [];

            calls.add("c1", function(e) {
                //停止执行
                e.stopPropagation();
            }).add("c2", function() {
                result.push("c2");
            });
            calls.fire();
            expect(result.length).toBe(0);
        })

        it("fireWith", function() {
            var events = st.promiseEvent(),
                target = {
                    name: 'target'
                };

            //注册事件
            events.add('call1', function(e, text) {
                return this.name + '-' + text + '-' + e.extend();
            });

            //使用fireWith执行
            var result = events.fireWith(target, ['test'], function(e) {
                //扩展事件参数；只会在这一次的fire中生效
                e.extend = function() {
                    return 'extend';
                }
            })

            expect(result).toBe('target-test-extend');
        })

        it("Once Mode", function() {
            //已once模式创建事件管理
            var onceCalls = st.promiseEvent("once"),
                result = [];

            onceCalls.add("c1", function() {
                result.push("c1");
            });
            //执行之后即销毁
            onceCalls.fire();
            expect(onceCalls.has('c1')).toBe(false);
        })

        it("Transfer Result", function() {
            var resultCalls = st.promiseEvent();
            resultCalls.add("c1", function(e) {
                return "c1";
            }).add("c2", function(e) {
                return e.result + ",c2";
            });
            expect(resultCalls.fire()).toBe('c1,c2');
        })

        it("callback mode", function() {
            //callback模式创建
            var calls = st.promiseEvent("callback"),
                result = [];

            //没有eventArg参数
            calls.add("c1", function(name) {
                result.push(name + '-c1');
            }).add("c2", function(name) {
                result.push(name + '-c2');
                return result;
            });
            expect(calls.fire("call") + '').toBe('call-c1,call-c2');
        })


        it("promise - resolve", function(testCall) {
            var pCalls = st.promiseEvent(),
                result = [];

            pCalls.add("c1", function(e, name) {
                setTimeout(function() {
                    result.push(name);
                    e.resolve();
                }, 100);
                return e.promise();
            });

            pCalls.fire("call");
            setTimeout(function() {
                expect(result.join(',')).toBe('call');
                testCall();
            }, 100)
        })

        it("promise - remove", function() {
            var calls = st.promiseEvent(),
                result = [];

            calls.add("onceTest", function(e) {
                //删除"onceTest"这个事件；
                e.remove();
            });
            //执行后才会触发删除
            calls.fire();

            //"onceTest"已经不在calls中
            expect(calls.has("onceTest")).toBe(false);
        })

        it("promise - result", function(testCall) {
            var pCalls = st.promiseEvent(),
                result = [];

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
                testCall();
            });
        })

        it("promise - reject", function(testCall) {
            var pCalls = st.promiseEvent(),
                result = [];

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
        })

        it("promise - multi", function(testCall) {
            var pCalls = st.promiseEvent(),
                result = [];

            pCalls.add("c1", function(e, name) {
                setTimeout(function() {
                    e.resolve(name + '-c1');
                }, 100);
                return e.promise();
            });

            pCalls.add("c2", function(e, name) {
                return e.result + '-c2';
            });

            pCalls.add("c3", function(e, name) {
                setTimeout(function() {
                    e.resolve(e.result + '-c3');
                }, 100);
                return e.promise();
            });

            $.when(pCalls.fire("call")).done(function(data) {
                expect(data).toBe('call-c1-c2-c3');
                testCall();
            });
        })

        it("noBlock mode", function(testCall) {
            //创建一个noBlock模式的promiseEvents;
            var noBlockCalls = st.promiseEvent("noBlock"),
                result = [];

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
        })

        it("promise - noBlock", function(testCall) {
            var noBlockCalls2 = st.promiseEvent(),
                result = [];
            //第一个回调延迟100
            noBlockCalls2.add("c1", function(e) {
                setTimeout(function() {
                    result.push('c1');
                    e.resolve();
                }, 100);
                //在返回promise的时候，指定noBlock模式
                return e.promise("noBlock");
            });
            //第二个正常执行
            noBlockCalls2.add("c2", function(e) {
                result.push('c2');
            });
            //第三个回调延迟100
            noBlockCalls2.add("c3", function(e) {
                setTimeout(function() {
                    result.push('c3');
                    e.resolve();
                }, 100);
                return e.promise();
            });

            $.when(noBlockCalls2.fire()).done(function(data) {
                //最终执行顺序是c2-c1-c3
                expect(result + '').toBe('c2,c1,c3');
                testCall();
            });
        })
    })

    describe('Trigger Test', function() {
        it("Bind Test", function() {
            var result = [], obj = st.attachTrigger({
                test: function(name) {
                    result.push(name);
                }
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
        })

        it("Bind Child", function() {
            var result = [], obj = st.attachTrigger({
                test: {
                    child: function(name) {
                        result.push(name);
                    }
                }
            });
            //注册子对象方法
            obj.onBefore("test.child", "addBefore", function(e, name) {
                result.push('before-' + name)
            }).on("test.child", "addAfter", function(e, name) {
                result.push('after-' + name)
            });
            obj.test.child('bind');
            expect(result.join(',')).toBe("before-bind,bind,after-bind");
        })

        it("Custom Interface", function() {
            var result = [], obj1 = st.attachTrigger({
                test: function(name) {
                    result.push(name);
                }
            }, {
                //屏蔽trigger的on方法
                on: null,
                //将trigger的onBebefore方法名改成bind
                onBefore: "bind"
            })

            obj1.bind("test", "addBefore", function(e, name) {
                result.push('before-' + name);
            });

            obj1.test('bind');

            expect(obj1.onBefore).toBeUndefined();
            expect(obj1.on).toBeUndefined();
            expect(result.join(',')).toBe("before-bind,bind");
        })

        it("callback mode", function() {
            var result = [],obj2 = st.attachTrigger({
                test: function(name) {
                    result.push(name);
                }
            }, "callback");

            obj2.onBefore("test", "addBefore", function(name) {
                result.push('before-' + name);
            }).on("test", "addAfter", function(name) {
                result.push('after-' + name)
            });
            obj2.test('bind');
            expect(result.join(',')).toBe("before-bind,bind,after-bind");
        })

        it("round mode", function() {
            var result = [],obj3 = st.attachTrigger({
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
        })

        it("onHandler", function() {
            var obj = st.attachTrigger({
                test: function(text) {
                    //手动执行handler
                    return this.fireHandler('handler', [text, "run"]);
                }
            });

            //注册handler1
            obj.onHandler('handler', 'handler1', function(e, text, state) {
                //返回结果
                return text + '-' + state + '-' + 'handler1';
            })

            //注册handler2
            obj.onHandler('handler', 'handler2', function(e, text, state) {
                //接受handler1结果
                return e.result + '-' + 'handler2';
            })

            expect(obj.test('test')).toBe('test-run-handler1-handler2');
        })

        it("promise - resolve", function(testCall) {
            var result = [],obj = st.attachTrigger({
                test: function(name) {
                    result.push(name);
                }
            });

            obj.onBefore('test', 'testBefore', function(e, name) {
                setTimeout(function() {
                    result.push(name + '-before1');
                    e.resolve();
                }, 100);
                return e.promise();
            })

            obj.onBefore('test', 'testBefore2', function(e, name) {
                result.push(name + '-before2');
            })

            obj.on('test', 'testBefore2', function(e, name) {
                setTimeout(function() {
                    result.push(name + '-after');
                    e.resolve();
                }, 100);
                return e.promise();
            })

            $.when(obj.test('call')).done(function() {
                expect(result.join(',')).toBe('call-before1,call-before2,call,call-after');
                testCall();
            })
        })

        it("all promise", function(testCall) {
            var result = [],obj = st.attachTrigger({
                test: function(name) {
                    //在原始方法中使用jquery的deferred
                    var e = $.Deferred();
                    setTimeout(function() {
                        result.push(name);
                        e.resolve();
                    }, 100);
                    return e.promise();
                }
            });

            //前置promise
            obj.onBefore('test', 'testBefore', function(e, name) {
                setTimeout(function() {
                    result.push(name + '-before');
                    e.resolve();
                }, 100);
                return e.promise();
            })

            //后置promise
            obj.on('test', 'testAfter', function(e, name) {
                setTimeout(function() {
                    result.push(name + '-after');
                    e.resolve();
                }, 100);
                return e.promise();
            })

            $.when(obj.test('call')).done(function() {
                expect(result.join(',')).toBe('call-before,call,call-after');
                testCall();
            })

        })

        it("promise - transfer result", function(testCall) {
            var obj = st.attachTrigger({
                test: function(name) {
                    var e = $.Deferred();
                    setTimeout(function() {
                        e.resolve(name + '-base');
                    }, 100);
                    return e.promise();
                },
                testReturn: function(name) {
                    return name + "-base"
                }
            });

            obj.on('test', 'testAfter', function(e, name) {
                setTimeout(function() {
                    e.resolve(e.result + '-after');
                }, 100);
                return e.promise();
            })

            obj.on('testReturn', 'testAfter', function(e, name) {
                setTimeout(function() {
                    e.resolve(e.result + '-after');
                }, 100);
                return e.promise();
            })

            $.when(obj.test('call')).done(function(data) {
                expect(data).toBe('call-base-after');
                $.when(obj.testReturn('call2')).done(function(data) {
                    expect(data).toBe('call2-base-after');
                    testCall();
                });

            });

        })

        it("reject", function(testCall) {
            var result = [], rejectTest = st.attachTrigger({
                testReject: function() {
                    result.push("base");
                }
            });

            rejectTest.onBefore('testReject', 'testBefore', function(e, name) {
                result.push('before');
                e.reject("beforeReject");
                return e.promise();
            })


            $.when(rejectTest.testReject('call1')).fail(function(err) {
                expect(err).toBe('beforeReject');
                expect(result.join(',')).toBe('before');
                testCall();
            });

        })

        it("promise - before reject", function(testCall) {
            var result = [], rejectTest = st.attachTrigger({
                test: function(name) {
                    var e = $.Deferred();
                    setTimeout(function() {
                        result.push("base");
                    }, 100);
                    return e.promise();
                }
            });

            rejectTest.onBefore('test', 'testBefore', function(e, name) {
                setTimeout(function() {
                    result.push('before');
                    e.reject("beforeReject");
                }, 100);
                return e.promise();
            })

            $.when(rejectTest.test('call1')).fail(function(err) {
                expect(err).toBe('beforeReject');
                expect(result.join(',')).toBe('before');
                testCall();
            });
        })

        it("promise - base reject", function(testCall) {
            var result = [], rejectTest = st.attachTrigger({
                test: function(name) {
                    var e = $.Deferred();
                    setTimeout(function() {
                        result.push("base");
                        e.reject('reject');
                    }, 100);
                    return e.promise();
                }
            });

            rejectTest.onBefore('test', 'testBefore', function(e, name) {
                setTimeout(function() {
                    result.push('before');
                    e.resolve();
                }, 100);
                return e.promise();
            })

            $.when(rejectTest.test('call2')).fail(function(err) {
                expect(err).toBe('reject');
                expect(result.join(',')).toBe('before,base');
                testCall();
            });
        })

        it("promise - after reject", function(testCall) {
            var result = [], rejectTest = st.attachTrigger({
                test: function(name) {
                    var e = $.Deferred();
                    setTimeout(function() {
                        result.push("base");
                        e.resolve();
                    }, 100);
                    return e.promise();
                }
            });
            rejectTest.on('test', 'testAfter', function(e, name) {
                setTimeout(function() {
                    result.push('after');
                    e.reject("afterReject");
                }, 100);
                return e.promise();
            })

            $.when(rejectTest.test('call3')).fail(function(err) {
                expect(err).toBe('afterReject');
                expect(result.join(',')).toBe('base,after');
                testCall();
            });
        })

        it("onError", function(testCall) {
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
            testError.onError("test", "triggerError", function(err, name) {
                expect(err).toBe('reject');
                expect(name).toBe('call');
                testCall();
            })
            testError.test('call');
        })

        it("stopPropagation", function() {
            var result = [],obj = st.attachTrigger({
                test: function(name) {
                    result.push(name);
                }
            });

            obj.onBefore('test', 'testBefore', function(e, name) {
                result.push(name + '-before1');
                e.stopPropagation();
            })

            obj.onBefore('test', 'testBefore2', function(e, name) {
                result.push(name + '-before2');
            })

            obj.on('test', 'testBefore2', function(e, name) {
                result.push(name + '-after');
            })

            obj.test('call');
            expect(result.join(',')).toBe('call-before1,call,call-after');

        })

        it("preventDefault", function() {
            var result = [],obj = st.attachTrigger({
                test: function(name) {
                    result.push(name);
                }
            });

            obj.onBefore('test', 'testBefore', function(e, name) {
                result.push(name + '-before1');
                //阻止前置后续的事件&阻止默认方法
                e.preventDefault();
            })

            obj.onBefore('test', 'testBefore2', function(e, name) {
                result.push(name + '-before2');
            })

            obj.on('test', 'testAfter', function(e, name) {
                result.push(name + '-after');
            })

            obj.test('call');
            expect(result.join(',')).toBe('call-before1,call-before2,call-after');

        })

        it("stop", function() {
            var result = [],obj = st.attachTrigger({
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

        })

        it("stopPropagation && preventDefault", function() {
            var result = [],obj = st.attachTrigger({
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

        })

        it("offBefore && off", function() {
            var result = [],obj = st.attachTrigger({
                test: function(name) {
                    result.push(name);
                }
            });
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

            //注册后置testAfter
            obj.on('test', 'testAfter', function(e, name) {
                result.push(name + '-after');
            })

            //注销单个后置
            obj.off('test', 'testAfter');

            obj.test('call');
            expect(result.join(',')).toBe('call');

        })

        it("on - object", function() {
            var result = [],obj = st.attachTrigger({
                test: function(name) {
                    result.push(name);
                }
            });

            //对象注入
            obj.on({
                //简单的注入后置方法
                test: function(e, name) {
                    result.push('after');
                },
                //注入前置&注入参数设置
                'test before': {
                    //注入方法
                    fn: function(e, name) {
                        result.push('before');
                    },
                    //注入权重
                    priority: 100,
                    //注入模式
                    mode: 'once'
                }
            }, "onObject");

            obj.test('call');
            expect(result.join(',')).toBe('before,call,after');
        })

        it("extend", function() {
            var result = [], obj = st.attachTrigger({
                test: function(name) {
                    result.push(name);
                }
            });

            //注册后置testAfter
            obj.on('test', 'testAfter', function(e, name) {
                result.push('after');
            });

            //扩展替换test
            obj.extend({
                test : function(name){
                    result.push(name + ':extend')
                }
            });

            obj.test('test');

            expect(result.join('-')).toBe('test:extend-after');
        })
    });

    describe("property trigger", function() {
        it("watch prop change", function() {
            var result = [],obj = st.attachTrigger({
                test: 1
            });
            //属性监听只有before，after两种方法注入类型，不支持round环绕模式。
            //before：主要使用在做值变化的控制，比如是否需要更新，或者改变更新的值等等。
            //after：在after则是无法干预值的变化，因此只是做监听使用；

            //回调方法中有三个参数,事件参数e；更新的值value；原来的值oldValue
            obj.onBefore('test', 'testBefore', function(e, value, oldValue) {
                result.push(value + '-before-' + oldValue);
            })

            obj.on('test', 'testAfter', function(e, value, oldValue) {
                result.push(value + '-after-' + oldValue);
            })

            expect(obj.test).toBe(1);

            obj.test = 2;
            //输出前后置监听
            expect(result.join(',')).toBe('2-before-1,2-after-1');
            expect(obj.test).toBe(2);

        })

        it("watch prop change cancel", function() {
            var result = [],obj = st.attachTrigger({
                test: 1
            });

            obj.onBefore('test', 'testBefore', function(e, value) {
                result.push(value + '-before');
                //停止方法，阻止赋值行为
                e.stop();
            })

            obj.on('test', 'testAfter', function(e, value) {
                result.push(value + '-after');
            })

            obj.test = 2;
            //最终更新失败，输出前置的监听内容
            expect(result.join(',')).toBe('2-before');
            expect(obj.test).toBe(1);
        })

        it("watch prop change value", function() {
            var result = [],obj = st.attachTrigger({
                test: 1
            });

            //改变传递值只有在前置中有效
            obj.onBefore('test', 'testBefore', function(e, value, oldValue) {
                result.push('before:[' + value + ',' + oldValue + ',' + e.result + ']');
                return ++value;
            })

            obj.onBefore('test', 'testBefore2', function(e, value, oldValue) {
                result.push('before2:[' + value + ',' + oldValue + ',' + e.result + ']');
                return ++e.result;
            })

            //后置得到前面正确修改的值
            obj.on('test', 'testAfter', function(e, value, oldValue) {
                result.push('after:[' + value + ',' + oldValue + ',' + e.result + ']');
            })

            obj.test = 2;

            expect(result.join(',')).toBe('before:[2,1,undefined],before2:[2,1,3],after:[4,1,4]');
            expect(obj.test).toBe(4);
        })

        it("watch child prop", function() {
            var result = [],obj = st.attachTrigger({
                child: {
                    test: 1
                }
            });
            //回调方法中有三个参数,事件参数e；更新的值value；原来的值oldValue
            obj.onBefore('child.test', 'testBefore', function(e, value, oldValue) {
                result.push(value + '-before-' + oldValue);
            })

            obj.on('child.test', 'testAfter', function(e, value, oldValue) {
                result.push(value + '-after-' + oldValue);
            })

            expect(obj.child.test).toBe(1);

            obj.child.test = 2;
            //输出前后置监听
            expect(result.join(',')).toBe('2-before-1,2-after-1');
            expect(obj.child.test).toBe(2);

        })
    })

    describe("flowController", function() {
        it("boot", function() {
            //以widget简单的的生命周期为例
            var result = [],flow = st.flowController({
                flow: {
                    init: function(e, name, op) {
                        result.push(name, 'init');
                    },
                    render: function(e, name, op) {
                        result.push('render');
                    },
                    complete: function(e, name, op) {
                        result.push('complete');
                    }
                },
                //设定执行流程
                order: ["init", "render", "complete"]
            });
            //执行构建div的流程
            flow.boot("div");

            //正常输出init，render，complete三个流程
            expect(result + '').toBe('div,init,render,complete');
        })

        it("next", function() {
            var result = [],flow = st.flowController({
                flow: {
                    init: function(e, name, op) {
                        result.push(name, 'init');
                        //input的进入buildInput流程
                        if (name === 'input')
                        //指定进入buildInput，同时指定的参数
                            e.next("buildInput", [op.type]);
                    },
                    buildInput: function(e, type) {
                        result.push('buildInput');
                        //返回传递结果
                        return type;
                    },
                    render: function(e, name, op) {
                        //判断是否存在传递结果
                        e.result && result.push(e.result);
                        result.push('render');
                    },
                    complete: function(e, name, op) {
                        result.push('complete');
                    }
                },
                //设定执行流程
                order: ["init", "render", "complete"]
            });

            //执行构建input的流程，设置input的type
            flow.boot("input", {
                type: 'text'
            });

            //除正常流程外，在init后进入buildInput流程
            expect(result + '').toBe('input,init,buildInput,text,render,complete');
        })

        it("end", function() {
            var result = [],flow = st.flowController({
                flow: {
                    init: function(e, name, op) {
                        result.push(name, 'init');
                        //进入cancel流程
                        if (name === 'cancel')
                            e.next('cancel');
                    },
                    cancel: function(e) {
                        result.push('cancel');
                        e.end();
                    },
                    render: function(e, name, op) {
                        //判断是否存在传递结果
                        e.result && result.push(e.result);
                        result.push('render');
                    },
                    complete: function(e, name, op) {
                        result.push('complete');
                    }
                },
                //设定执行流程
                order: ["init", "render", "complete"]
            });
            flow.boot("cancel");
            expect(result + '').toBe('cancel,init,cancel');
        })

        it("boot with start", function() {
            var result = [],flow = st.flowController({
                flow: {
                    init: function(e, name, op) {
                        result.push(name, 'init');
                    },
                    render: function(e, name, op) {
                        result.push('render');
                    },
                    complete: function(e, name, op) {
                        result.push('complete');
                    }
                },
                //设定执行流程
                order: ["init", "render", "complete"]
            });

            //从render阶段开始构建div
            flow.bootWithStart('render', ["div"]);

            //略过了render阶段
            expect(result + '').toBe('render,complete');
        })

        it("simple Mode", function() {
            //简单流程，流程中不带事件参数EventArg（对应trigger和promiseEvent的callback模式）
            var result=[], flow = st.flowController({
                flow: {
                    init: function(name, op) {
                        result.push(name, 'init');
                    },
                    render: function(name, op) {
                        result.push('render');
                    },
                    complete: function(name, op) {
                        result.push('complete');
                    }
                },
                order: ["init", "render", "complete"],
                //简单模式（同promiseEvent mode设置）
                mode: "simple"
            })

            flow.boot("boot");
            expect(result + '').toBe('boot,init,render,complete');
        })

        it("changeArg & originalArgs", function() {
            var result = [],flow = st.flowController({
                flow: {
                    init: function(e, name) {
                        result.push(name,'init');
                        //改变下个流程的方法参数
                        e.changeArgs(['text']);
                    },
                    render: function(e,type) {
                        result.push('render',type);
                        //恢复原始参数
                        e.recoverArgs();
                    },
                    complete: function(e, name) {
                        result.push('complete',name);
                    }
                },
                //设定执行流程
                order: ["init", "render", "complete"]
            });

            flow.boot("input");

            expect(result + '').toBe('input,init,render,text,complete,input');
        })

        it("promise", function(testCall) {
            var result = [], promiseFlow = st.flowController({
                flow: {
                    init: function(e, name, op) {
                        setTimeout(function() {
                            result.push(name, 'init');
                            e.resolve();
                        }, 100)
                        return e.promise();
                    },
                    render: function(e, name, op) {
                        result.push('render');
                    },
                    complete: function(e, name, op) {
                        result.push('complete');
                    }
                },
                order: ["init", "render", "complete"]
            });

            $.when(promiseFlow.boot("div")).done(function() {
                expect(result + '').toBe('div,init,render,complete');
                testCall();
            })
        })

        it("promise - next", function(testCall) {
            var result = [], promiseFlow = st.flowController({
                flow: {
                    init: function(e, name, op) {
                        setTimeout(function() {
                            result.push(name, 'init');
                            if (name === 'input')
                                e.next("buildInput", [op.type]);

                            e.resolve();
                        }, 100)
                        return e.promise();
                    },
                    buildInput: function(e, type) {
                        setTimeout(function() {
                            result.push('buildInput');
                            e.resolve(type);
                        }, 100)
                        return e.promise();
                    },
                    render: function(e, name, op) {
                        e.result && result.push(e.result);
                        result.push('render');
                    },
                    complete: function(e, name, op) {
                        result.push('complete');
                    }
                },
                order: ["init", "render", "complete"]
            });

            $.when(promiseFlow.boot("input", {
                type: 'text'
            })).done(function() {
                expect(result + '').toBe('input,init,buildInput,text,render,complete');
                testCall();
            });

        })

        it("promise - end", function(testCall) {
            var result = [], promiseFlow = st.flowController({
                flow: {
                    init: function(e, name, op) {
                        setTimeout(function() {
                            result.push(name, 'init');
                            if (name === 'cancel')
                                e.next('cancel')

                            e.resolve();
                        }, 100)
                        return e.promise();
                    },
                    cancel: function(e) {
                        setTimeout(function() {
                            result.push('cancel');
                            e.end().resolve();
                        }, 100)
                        return e.promise();

                    },
                    render: function(e, name, op) {
                        e.result && result.push(e.result);
                        result.push('render');
                    },
                    complete: function(e, name, op) {
                        result.push('complete');
                    }
                },
                order: ["init", "render", "complete"]
            });
            $.when(promiseFlow.boot("cancel")).done(function() {
                expect(result + '').toBe('cancel,init,cancel');
                testCall();
            })
        })

        it("trigger", function(testCall) {
            //异步的流程，使用trigger
            var result = [], triggerFlow = st.flowController({
                flow: {
                    init: function(e, name, op) {
                        //模拟异步
                        setTimeout(function() {
                            result.push(name, 'init');
                            e.resolve();
                        }, 100)
                        return e.promise();
                    },
                    render: function(e, name, op) {
                        result.push('render');
                    },
                    complete: function(e, name, op) {
                        result.push('complete');
                    }
                },
                order: ["init", "render", "complete"],
                trigger: true
            });

            //在init之前注入
            triggerFlow.onBefore("init", "initBefore", function(e, name, op) {
                result.push('initBefore');
            });

            //在init之后注入异步
            triggerFlow.on("init", "initAfter", function(e, name, op) {
                setTimeout(function() {
                    result.push('initAfter');
                    e.resolve();
                }, 100)
                return e.promise();
            });

            //使用when来捕获异步的流程执行结果
            $.when(triggerFlow.boot("div")).done(function() {
                expect(result + '').toBe('initBefore,div,init,initAfter,render,complete');
                testCall();
            })
        })

        it("trigger - next", function(testCall) {
            //异步的流程，使用trigger
            var result = [], triggerFlow = st.flowController({
                flow: {
                    init: function(e, name, op) {
                        //模拟异步
                        setTimeout(function() {
                            result.push(name, 'init');
                            e.resolve();
                        }, 100)
                        return e.promise();
                    },
                    render: function(e, name, op) {
                        result.push('render');
                    },
                    complete: function(e, name, op) {
                        result.push('complete');
                    }
                },
                order: ["init", "render", "complete"],
                trigger: true
            });

            triggerFlow.onBefore("init", "initBefore", function(e, name, op) {
                setTimeout(function() {
                    result.push('initBefore');
                    e.next('complete').resolve();
                }, 100)
                return e.promise();
            });

            $.when(triggerFlow.boot("div")).done(function() {
                expect(result + '').toBe('initBefore,div,init,complete');
                testCall();
            })

        })

        it("trigger - end", function(testCall) {
            //异步的流程，使用trigger
            var result = [], triggerFlow = st.flowController({
                flow: {
                    init: function(e, name, op) {
                        //模拟异步
                        setTimeout(function() {
                            result.push(name, 'init');
                            e.resolve();
                        }, 100)
                        return e.promise();
                    },
                    render: function(e, name, op) {
                        result.push('render');
                    },
                    complete: function(e, name, op) {
                        result.push('complete');
                    }
                },
                order: ["init", "render", "complete"],
                trigger: true
            });

            triggerFlow.onBefore("init", "initBefore", function(e, name, op) {
                setTimeout(function() {
                    result.push('initBefore');
                    //停止流程
                    e.end().resolve();
                }, 100)
                return e.promise();
            });

            $.when(triggerFlow.boot("div")).done(function() {
                //执行了注入事件initBefore后停止流程
                expect(result + '').toBe('initBefore');
                testCall();
            })
        })

        it("trigger - stopPropagation", function(testCall) {
            //异步的流程，使用trigger
            var result = [], triggerFlow = st.flowController({
                flow: {
                    init: function(e, name, op) {
                        //模拟异步
                        setTimeout(function() {
                            result.push(name, 'init');
                            e.resolve();
                        }, 100)
                        return e.promise();
                    },
                    render: function(e, name, op) {
                        result.push('render');
                    },
                    complete: function(e, name, op) {
                        result.push('complete');
                    }
                },
                order: ["init", "render", "complete"],
                trigger: true
            });

            triggerFlow.onBefore("init", "initBefore", function(e, name, op) {
                setTimeout(function() {
                    result.push('initBefore');
                    e.stopPropagation().resolve();
                }, 100)
                return e.promise();
            });

            triggerFlow.onBefore("init", "initBefore2", function(e, name, op) {
                result.push('initBefore2');
            });

            $.when(triggerFlow.boot("div")).done(function() {
                expect(result + '').toBe('initBefore,div,init,render,complete');
                testCall();
            })
        })

        it("trigger - preventDefault", function(testCall) {
            //异步的流程，使用trigger
            var result = [], triggerFlow = st.flowController({
                flow: {
                    init: function(e, name, op) {
                        //模拟异步
                        setTimeout(function() {
                            result.push(name, 'init');
                            e.resolve();
                        }, 100)
                        return e.promise();
                    },
                    render: function(e, name, op) {
                        result.push('render');
                    },
                    complete: function(e, name, op) {
                        result.push('complete');
                    }
                },
                order: ["init", "render", "complete"],
                trigger: true
            });

            triggerFlow.onBefore("init", "initBefore", function(e, name, op) {
                setTimeout(function() {
                    result.push('initBefore');
                    e.preventDefault().resolve();
                }, 100)
                return e.promise();
            }, 10);

            triggerFlow.on("init", "initAfter", function(e, name, op) {
                result.push('initAfter');
            });

            $.when(triggerFlow.boot("div")).done(function() {
                expect(result + '').toBe('initBefore,initAfter,render,complete');
                testCall();
            })
        })

        it("trigger - stop", function(testCall) {
            //异步的流程，使用trigger
            var result = [], triggerFlow = st.flowController({
                flow: {
                    init: function(e, name, op) {
                        //模拟异步
                        setTimeout(function() {
                            result.push(name, 'init');
                            e.resolve();
                        }, 100)
                        return e.promise();
                    },
                    render: function(e, name, op) {
                        result.push('render');
                    },
                    complete: function(e, name, op) {
                        result.push('complete');
                    }
                },
                order: ["init", "render", "complete"],
                trigger: true
            });

            triggerFlow.onBefore("init", "initBefore", function(e, name, op) {
                setTimeout(function() {
                    result.push('initBefore');
                    e.stop().resolve();
                }, 100)
                return e.promise();
            });

            triggerFlow.onBefore("init", "initBefore2", function(e, name, op) {
                result.push('initBefore2');
            });

            triggerFlow.on("init", "initAfter", function(e, name, op) {
                result.push('initAfter');
            });

            $.when(triggerFlow.boot("div")).done(function() {
                expect(result + '').toBe('initBefore,render,complete');
                testCall();
            });
        })

        it("trigger - transfer Result", function(testCall) {
            var result = [], flow = st.flowController({
                flow: {
                    init: function(e, name, op) {
                        setTimeout(function() {
                            e.resolve(e.result + '-init');
                        }, 100)
                        return e.promise();
                    },
                    render: function(e, name, op) {
                        e.resolve(e.result + '-render');
                    },
                    complete: function(e, name, op) {
                        e.resolve(e.result + '-complete');
                    }
                },
                order: ["init", "render", "complete"],
                trigger: true
            });

            flow.onBefore("init", "initBefore", function(e, name, op) {
                setTimeout(function() {
                    e.resolve(name + '-initBefore');
                }, 100)
                return e.promise();
            });

            flow.onBefore("init", "initBefore2", function(e, name, op) {
                e.resolve(e.result + '-initBefore2');
            });

            flow.on("init", "initAfter", function(e, name, op) {
                e.resolve(e.result + '-initAfter');
            });


            $.when(flow.boot('boot')).done(function(result) {
                expect(result + '').toBe('boot-initBefore-initBefore2-init-initAfter-render-complete');
                testCall();
            })

        })

        it("reject", function(testCall) {
            var flowReject = st.flowController({
                flow: {
                    init: function(e, name, op) {
                        setTimeout(function() {
                            e.reject('init-reject');
                        }, 100)
                        return e.promise();
                    },
                    render: function(e, name, op) {
                        e.resolve(e.result + '-render');
                    },
                    complete: function(e, name, op) {
                        e.resolve(e.result + '-complete');
                    }
                },
                order: ["init", "render", "complete"],
                trigger: true
            });

            $.when(flowReject.boot('boot')).fail(function(err) {
                expect(err + '').toBe('init-reject');
                testCall();
            });
        })

        it("trigger - reject", function(testCall) {
            var result, flowReject = st.flowController({
                flow: {
                    init: function(e, name, op) {
                        setTimeout(function() {
                            e.reject('init-reject');
                        }, 100)
                        return e.promise();
                    },
                    render: function(e, name, op) {
                        e.resolve(e.result + '-render');
                    },
                    complete: function(e, name, op) {
                        e.resolve(e.result + '-complete');
                    }
                },
                order: ["init", "render", "complete"],
                trigger: true
            });

            flowReject.onBefore("init", "initBefore", function(e, name, op) {
                setTimeout(function() {
                    //拒绝契约，结束流程
                    e.reject("initBefore-reject");
                }, 100)
                return e.promise();
            });

            $.when(flowReject.boot('boot')).done(function(data) {
                result = data;
            }).fail(function(err) {
                expect(result).toBeUndefined();
                expect(err + '').toBe('initBefore-reject');
                testCall();
            });
        })

        it("trigger - callback mode & interface change", function(testCall) {
            var result=[], flow = st.flowController({
                flow: {
                    init: function(e, name, op) {
                        setTimeout(function() {
                            result.push(name, 'init');
                            e.resolve();
                        }, 100)
                        return e.promise();
                    },
                    render: function(e, name, op) {
                        result.push('render');
                    },
                    complete: function(e, name, op) {
                        result.push('complete');
                    }

                },
                order: ["init", "render", "complete"],
                trigger: {
                    //设置trigger的模式，同trigger的mode
                    mode: "callback",
                    //接口设置，将on设置成on
                    iFace: {
                        on: "bind"
                    }
                }
            });

            flow.bind('init', 'initAfter', function(name, op) {
                result.push(name + '-initAfter');
            })

            $.when(flow.boot('boot')).done(function() {
                expect(result + '').toBe('boot,init,boot-initAfter,render,complete');
                testCall();
            });
        })

        it("simple mode & trigger callback mode", function(testCall) {
            var result=[],flow = st.flowController({
                flow: {
                    init: function(name, op) {
                        result.push(name, 'init');
                    },
                    render: function(name, op) {
                        result.push('render');
                    },
                    complete: function(name, op) {
                        result.push('complete');
                    }

                },
                order: ["init", "render", "complete"],
                mode: "simple",
                trigger: {
                    mode: "callback"
                }
            });

            flow.on('init', 'initAfter', function(name, op) {
                result.push(name + '-initAfter');
            })

            $.when(flow.boot('boot')).done(function() {
                expect(result + '').toBe('boot,init,boot-initAfter,render,complete');
                testCall();
            });
        })

        it("all trigger", function(testCall) {
            var result=[], flow = st.flowController({
                flow: {
                    init: function(e, name, op) {
                        result.push(name, 'init');

                    },
                    render: function(e, name, op) {
                        setTimeout(function() {
                            result.push('render');
                            e.resolve();
                        }, 100)
                        return e.promise();
                    },
                    complete: function(e, name, op) {
                        result.push('complete');
                    }
                },
                order: ["init", "render", "complete"],
                trigger: true
            });

            flow.on('init', 'initAfter', function(e, name, op) {
                result.push('initAfter');
            })

            // flow.on('render', 'rendertAfter', function(e,name, op) {
            //     result.push('rendertAfter');
            // })

            $.when(flow.boot('boot')).done(function() {
                // expect(result + '').toBe('boot,init,initAfter,render,rendertAfter,complete');
                expect(result + '').toBe('boot,init,initAfter,render,complete');
                testCall();
            });
        });
    })
})();
