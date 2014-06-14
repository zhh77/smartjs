define(function() {

    describe('PromiseEvent Test', function() {
        var calls = st.promiseEvent(),
            result;

        beforeEach(function() {
            result = [];
        })

        calls.add('call1', function(d, text) {
            result.push(text);
        })

        it("Add", function() {
            calls.fire('called');
            expect(result.join(',')).toBe('called');
        })

        it("Remove", function() {
            calls.remove('call1');
            calls.fire('called');
            expect(result.join(',')).toBe('');
        })

        it("Priority", function() {
            var arrP = [10, 5, null, 100, 10],
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

        it("Reset", function() {
            calls.clear();
            calls.fire();
            expect(result.length).toBe(0);
        })

        it("Callback fire remove", function() {
            calls.add("onceTest", function(d) {
                d.remove();
            });
            calls.fire();
            expect(calls.has("onceTest")).toBe(false);
        })

        it("StopPropagation", function() {
            calls.clear();
            calls.add("c1", function(d) {
                d.stopPropagation();
            }).add("c2", function() {
                result.push("c2");
            });
            calls.fire();
            expect(result.length).toBe(0);
        })



        it("Once Mode", function() {
            var onceCalls = st.promiseEvent("once");
            onceCalls.add("c1", function() {
                result.push("c1");
            });
            onceCalls.fire();
            expect(onceCalls.has('c1')).toBe(false);
        })

        it("Transfer Result", function() {
            var resultCalls = st.promiseEvent();
            resultCalls.add("c1", function(d) {
                return "c1";
            }).add("c2", function(d) {
                return d.result + ",c2";
            });
            expect(resultCalls.fire()).toBe('c1,c2');
        })

        it("callback mode", function() {
            var calls = st.promiseEvent("callback");
            calls.add("c1", function(name) {
                result.push(name + '-c1');
            }).add("c2", function(name) {
                result.push(name + '-c2');
                return result;
            });
            expect(calls.fire("call") + '').toBe('call-c1,call-c2');
        })

        var pCalls;
        beforeEach(function() {
            pCalls = st.promiseEvent();
        });

        it("promise - resolve", function(testCall) {
            pCalls.add("c1", function(d, name) {
                setTimeout(function() {
                    result.push(name);
                    d.resolve();
                }, 100);
                return d.promise();
            });

            pCalls.fire("call");
            setTimeout(function() {
                expect(result.join(',')).toBe('call');
                testCall();
            }, 100)
        })

        it("promise - result", function(testCall) {

            pCalls.add("c1", function(d, name) {
                setTimeout(function() {
                    d.resolve(name + ',resolve!');
                }, 100);
                return d.promise();
            });

            $.when(pCalls.fire("call")).done(function(data) {
                expect(data).toBe('call,resolve!');
                testCall()
            });
        })

        it("promise - reject", function(testCall) {
            pCalls.add("c1", function(d, name) {
                setTimeout(function() {
                    d.reject(name + ',reject!');
                }, 100);
                return d.promise();
            });

            $.when(pCalls.fire("call")).fail(function(data) {
                expect(data).toBe('call,reject!');
                testCall();
            });
        })

        it("promise - multi", function(testCall) {
            pCalls.add("c1", function(d, name) {
                setTimeout(function() {
                    d.resolve(name + '-c1');
                }, 100);
                return d.promise();
            });

            pCalls.add("c2", function(d, name) {
                return d.result + '-c2';
            });

            pCalls.add("c3", function(d, name) {
                setTimeout(function() {
                    d.resolve(d.result + '-c3');
                }, 100);
                return d.promise();
            });

            $.when(pCalls.fire("call")).done(function(data) {
                expect(data).toBe('call-c1-c2-c3');
                testCall();
            });
        })

        it("noBlock mode", function(testCall) {
            //创建一个noBlock模式的promiseEvents;
            var noBlockCalls = st.promiseEvent("noBlock");

            //第一个回调延迟100
            noBlockCalls.add("c1", function(d) {
                setTimeout(function() {
                    result.push('c1');
                    d.resolve();
                }, 100);
                return d.promise();
            });

            //第二个正常执行
            noBlockCalls.add("c2", function(d) {
                result.push('c2');
            });

            //第三个回调延迟50
            noBlockCalls.add("c3", function(d) {
                setTimeout(function() {
                    result.push('c3');
                    d.resolve();
                }, 50);
                return d.promise();
            });

            $.when(noBlockCalls.fire()).done(function(data) {
                //最终执行顺序是c2-c3-c1
                expect(result + '').toBe('c2,c3,c1');
                testCall();
            });
        })

        it("promise - noBlock", function(testCall) {
            var noBlockCalls2 = st.promiseEvent();
            //第一个回调延迟100
            noBlockCalls2.add("c1", function(d) {
                setTimeout(function() {
                    result.push('c1');
                    d.resolve();
                }, 100);
                //在返回promise的时候，指定noBlock模式
                return d.promise("noBlock");
            });
            //第二个正常执行
            noBlockCalls2.add("c2", function(d) {
                result.push('c2');
            });
            //第三个回调延迟100
            noBlockCalls2.add("c3", function(d) {
                setTimeout(function() {
                    result.push('c3');
                    d.resolve();
                }, 100);
                return d.promise();
            });

            $.when(noBlockCalls2.fire()).done(function(data) {
                //最终执行顺序是c2-c1-c3
                expect(result + '').toBe('c2,c1,c3');
                testCall();
            });
        })
    })

    describe('Trigger Test', function() {
        var result, obj = st.attachTrigger({
                test: function(name) {
                    result.push(name);
                }
            });

        beforeEach(function() {
            result = [];
        });

        it("Bind Test", function() {
            obj.onBefore("test", "addBefore", function(d, name) {
                result.push('before-' + name)
            }).on("test", "addAfter", function(d, name) {
                result.push('after-' + name)
            });
            obj.test('bind');
            expect(result.join(',')).toBe("before-bind,bind,after-bind");
        })

        it("Custom Interface", function() {
            var obj1 = st.attachTrigger({
                test: function(name) {
                    result.push(name);
                }
            }, {
                on: null,
                onBefore: "bind"
            })

            obj1.bind("test", "addBefore", function(d, name) {
                result.push('before-' + name);
            });

            obj1.test('bind');

            expect(obj1.onBefore).toBeUndefined();
            expect(obj1.on).toBeUndefined();
            expect(result.join(',')).toBe("before-bind,bind");
        })

        it("callback mode", function() {
            var obj2 = st.attachTrigger({
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
            var obj3 = st.attachTrigger({
                test: function(name) {
                    result.push(name);
                }
            });

            obj3.onRound("test", "roundTest", function(fn, name) {
                result.push('before');
                fn(name);
                result.push('after');
            });

            obj3.test('round');
            expect(result.join(',')).toBe("before,round,after");
        })

        it("promise - resolve", function(testCall) {
            var obj = st.attachTrigger({
                test: function(name) {
                    result.push(name);
                }
            });

            obj.onBefore('test', 'testBefore', function(d, name) {
                setTimeout(function() {
                    result.push(name + '-before1');
                    d.resolve();
                }, 100);
                return d.promise();
            })

            obj.onBefore('test', 'testBefore2', function(d, name) {
                result.push(name + '-before2');
            })

            obj.on('test', 'testBefore2', function(d, name) {
                setTimeout(function() {
                    result.push(name + '-after');
                    d.resolve();
                }, 100);
                return d.promise();
            })

            $.when(obj.test('call')).done(function() {
                expect(result.join(',')).toBe('call-before1,call-before2,call,call-after');
                testCall();
            })
        })

        it("all promise", function(testCall) {
            var obj = st.attachTrigger({
                test: function(name) {
                    var d = $.Deferred();
                    setTimeout(function() {
                        result.push(name);
                        d.resolve();
                    }, 100);
                    return d.promise();
                }
            });

            obj.onBefore('test', 'testBefore', function(d, name) {
                setTimeout(function() {
                    result.push(name + '-before');
                    d.resolve();
                }, 100);
                return d.promise();
            })

            obj.on('test', 'testAfter', function(d, name) {
                setTimeout(function() {
                    result.push(name + '-after');
                    d.resolve();
                }, 100);
                return d.promise();
            })

            $.when(obj.test('call')).done(function() {
                expect(result.join(',')).toBe('call-before,call,call-after');
                testCall();
            })

        })

        it("promise - transfer result", function(testCall) {
            var obj = st.attachTrigger({
                test: function(name) {
                    var d = $.Deferred();
                    setTimeout(function() {
                        d.resolve(name + '-base');
                    }, 100);
                    return d.promise();
                },
                testReturn: function(name) {
                    return name + "-base"
                }
            });

            obj.on('test', 'testAfter', function(d, name) {
                setTimeout(function() {
                    d.resolve(d.result + '-after');
                }, 100);
                return d.promise();
            })

            obj.on('testReturn', 'testAfter', function(d, name) {
                setTimeout(function() {
                    d.resolve(d.result + '-after');
                }, 100);
                return d.promise();
            })

            $.when(obj.test('call')).done(function(data) {
                expect(data).toBe('call-base-after');
                $.when(obj.testReturn('call2')).done(function(data) {
                    expect(data).toBe('call2-base-after');
                    testCall();
                });

            });

        })

        var rejectTest = st.attachTrigger({
            testReject: function() {
                result.push("base");
            },
            test: function(name) {
                var d = $.Deferred();
                setTimeout(function() {
                    result.push("base");
                    name == "call2" ? d.reject('reject') : d.resolve();
                }, 100);
                return d.promise();
            }
        });

        rejectTest.onBefore('testReject', 'testBefore', function(d, name) {
            result.push('before');
            d.reject("beforeReject");
            return d.promise();
        })

        rejectTest.onBefore('test', 'testBefore', function(d, name) {
            setTimeout(function() {
                result.push('before');
                name == "call1" ? d.reject("beforeReject") : d.resolve();
            }, 100);
            return d.promise();
        })

        rejectTest.on('test', 'testAfter', function(d, name) {
            setTimeout(function() {
                result.push('after');
                d.reject("afterReject");
            }, 100);
            return d.promise();
        })

        it("reject", function(testCall) {
            $.when(rejectTest.testReject('call1')).fail(function(err) {
                expect(err).toBe('beforeReject');
                expect(result.join(',')).toBe('before');
                testCall();
            });

        })

        it("promise - before reject", function(testCall) {
            $.when(rejectTest.test('call1')).fail(function(err) {
                expect(err).toBe('beforeReject');
                expect(result.join(',')).toBe('before');
                testCall();
            });
        })

        it("promise - base reject", function(testCall) {
            $.when(rejectTest.test('call2')).fail(function(err) {
                expect(err).toBe('reject');
                expect(result.join(',')).toBe('before,base');
                testCall();
            });
        })

        it("promise - after reject", function(testCall) {
            $.when(rejectTest.test('call3')).fail(function(err) {
                expect(err).toBe('afterReject');
                expect(result.join(',')).toBe('before,base,after');
                testCall();
            });
        })

        it("stopPropagation", function() {
            var obj = st.attachTrigger({
                test: function(name) {
                    result.push(name);
                }
            });

            obj.onBefore('test', 'testBefore', function(d, name) {
                result.push(name + '-before1');
                d.stopPropagation();
            })

            obj.onBefore('test', 'testBefore2', function(d, name) {
                result.push(name + '-before2');
            })

            obj.on('test', 'testBefore2', function(d, name) {
                result.push(name + '-after');
            })

            obj.test('call');
            expect(result.join(',')).toBe('call-before1,call,call-after');

        })

        it("preventDefault", function() {
            var obj = st.attachTrigger({
                test: function(name) {
                    result.push(name);
                }
            });

            obj.onBefore('test', 'testBefore', function(d, name) {
                result.push(name + '-before1');
                d.preventDefault();
            })

            obj.onBefore('test', 'testBefore2', function(d, name) {
                result.push(name + '-before2');
            })

            obj.on('test', 'testAfter', function(d, name) {
                result.push(name + '-after');
            })

            obj.test('call');
            expect(result.join(',')).toBe('call-before1,call-before2,call-after');

        })

        it("stop", function() {
            var obj = st.attachTrigger({
                test: function(name) {
                    result.push(name);
                }
            });

            obj.onBefore('test', 'testBefore', function(d, name) {
                result.push(name + '-before1');
                d.stop();
            })

            obj.onBefore('test', 'testAfter', function(d, name) {
                result.push(name + '-before2');
            })

            obj.on('test', 'testBefore2', function(d, name) {
                result.push(name + '-after');
            })

            obj.test('call');
            expect(result.join(',')).toBe('call-before1');

        })

        it("stopPropagation && preventDefault", function() {
            var obj = st.attachTrigger({
                test: function(name) {
                    result.push(name);
                }
            });

            obj.onBefore('test', 'testBefore', function(d, name) {
                result.push(name + '-before1');
                d.stopPropagation().preventDefault();
            })

            obj.onBefore('test', 'testAfter', function(d, name) {
                result.push(name + '-before2');
            })

            obj.on('test', 'testBefore2', function(d, name) {
                result.push(name + '-after');
            })

            obj.test('call');
            expect(result.join(',')).toBe('call-before1,call-after');

        })

        it("offBefore && off", function() {
            var obj = st.attachTrigger({
                test: function(name) {
                    result.push(name);
                }
            });

            obj.onBefore('test', 'testBefore', function(d, name) {
                result.push(name + '-before1');
            })

            obj.onBefore('test', 'testBefore2', function(d, name) {
                result.push(name + '-before2');
            })

            obj.on('test', 'testAfter', function(d, name) {
                result.push(name + '-after');
            })

            obj.offBefore('test', ['testBefore', 'testBefore2']).off('test', ['testAfter']);

            obj.test('call');
            expect(result.join(',')).toBe('call');

        })


    });

    describe("property trigger", function() {
        var result;
        beforeEach(function() {
            result = [];
        })

        it("watch prop change", function() {
            var obj = st.attachTrigger({
                test: 1
            });

            obj.onBefore('test', 'testBefore', function(d, value,oldValue) {
                result.push(value + '-before-' + oldValue);
            })

            obj.on('test', 'testAfter', function(d, value,oldValue) {
                result.push(value + '-after-' + oldValue);
            })

            obj.test;
            expect(obj.test).toBe(1);
            obj.test = 2;
            expect(result.join(',')).toBe('2-before-1,2-after-1');
            expect(obj.test).toBe(2);

        })

        it("watch prop change cancel", function() {
            var obj = st.attachTrigger({
                test: 1
            });

            obj.onBefore('test', 'testBefore', function(d, value) {
                result.push(value + '-before');
                //停止方法，阻止赋值行为
                d.stop();
            })

            obj.on('test', 'testAfter', function(d, value) {
                result.push(value + '-after');
            })

            obj.test = 2;

            expect(result.join(',')).toBe('2-before');
            expect(obj.test).toBe(1);
        })

         it("watch prop change value", function() {
            var obj = st.attachTrigger({
                test: 1
            });

            //改变传递值只有在前置中有效
            obj.onBefore('test', 'testBefore', function(d, value,oldValue) {
                result.push('before:[' + value + ',' + oldValue + ',' + d.result +']');
                return ++value;
            })

            obj.onBefore('test', 'testBefore2', function(d, value,oldValue) {
                result.push('before2:[' + value + ',' + oldValue + ',' + d.result +']');
                return ++d.result;
            })

            //后置得到前面正确修改的值
            obj.on('test', 'testAfter', function(d, value,oldValue) {
                result.push('after:[' + value + ',' + oldValue + ',' + d.result +']');
            })

            obj.test = 2;

            expect(result.join(',')).toBe('before:[2,1,undefined],before2:[2,1,3],after:[4,1,4]');
            expect(obj.test).toBe(4);
        })
    })

    describe("flowController", function() {
        var log = function() {
            arr.push.apply(arr, arguments)
        }, arr, html;

        beforeEach(function() {
            arr = [];
            html = [];
        })

        var flow = st.flowController({
            flow: {
                init: function(e, name, op) {
                    log(name, 'init');
                    if (name === 'input')
                        e.next("buildInput", [op.type]);
                    else if (name === 'cancel')
                        e.next('cancel')
                },
                buildInput: function(e, type) {
                    log('buildInput');
                    return type;
                },
                cancel: function(e) {
                    log('cancel');
                    e.end();
                },
                render: function(e, name, op) {
                    e.result && log(e.result);
                    log('render');
                },
                complete: function(e, name, op) {
                    log('complete');
                }
            },
            order: ["init", "render", "complete"]
        });

        it("boot", function() {
            flow.boot("div");
            expect(arr + '').toBe('div,init,render,complete');
        })

        it("next", function() {
            flow.boot("input", {
                type: 'text'
            });
            expect(arr + '').toBe('input,init,buildInput,text,render,complete');
        })

        it("end", function() {
            flow.boot("cancel");
            expect(arr + '').toBe('cancel,init,cancel');
        })

        it("boot with start", function() {
            flow.bootWithStart('render', ["div"]);
            expect(arr + '').toBe('render,complete');
        })

        it("simple Mode", function() {
            var flow = st.flowController({
                flow: {
                    init: function(name, op) {
                        log(name, 'init');
                    },
                    render: function(name, op) {
                        log('render');
                    },
                    complete: function(name, op) {
                        log('complete');
                    }
                },
                order: ["init", "render", "complete"],
                mode: "simple"
            })

            flow.boot("boot");
            expect(arr + '').toBe('boot,init,render,complete');
        })

        var promiseFlow = st.flowController({
            flow: {
                init: function(e, name, op) {
                    setTimeout(function() {
                        log(name, 'init');
                        if (name === 'input')
                            e.next("buildInput", [op.type]);
                        else if (name === 'cancel')
                            e.next('cancel')

                        e.resolve();
                    }, 100)
                    return e.promise();
                },
                buildInput: function(e, type) {
                    setTimeout(function() {
                        log('buildInput');
                        e.resolve(type);
                    }, 100)
                    return e.promise();
                },
                cancel: function(e) {
                    setTimeout(function() {
                        log('cancel');
                        e.end().resolve();
                    }, 100)
                    return e.promise();

                },
                render: function(e, name, op) {
                    e.result && log(e.result);
                    log('render');
                },
                complete: function(e, name, op) {
                    log('complete');
                }
            },
            order: ["init", "render", "complete"]
        });


        it("promise", function(testCall) {
            $.when(promiseFlow.boot("div")).done(function() {
                expect(arr + '').toBe('div,init,render,complete');
                testCall();
            })
        })

        it("promise - next", function(testCall) {
            $.when(promiseFlow.boot("input", {
                type: 'text'
            })).done(function() {
                expect(arr + '').toBe('input,init,buildInput,text,render,complete');
                testCall();
            });

        })

        it("promise - end", function(testCall) {
            $.when(promiseFlow.boot("cancel")).done(function() {
                expect(arr + '').toBe('cancel,init,cancel');
                testCall();
            })
        })

        var triggerFlow = st.flowController({
            flow: {
                init: function(e, name, op) {
                    setTimeout(function() {
                        log(name, 'init');
                        e.resolve();
                    }, 100)
                    return e.promise();
                },
                render: function(e, name, op) {
                    log('render');
                },
                complete: function(e, name, op) {
                    log('complete');
                }
            },
            order: ["init", "render", "complete"],
            trigger: true
        });

        it("trigger", function(testCall) {
            triggerFlow.onBefore("init", "initBefore", function(e, name, op) {
                log('initBefore');
            }, "once");

            triggerFlow.on("init", "initAfter", function(e, name, op) {
                setTimeout(function() {
                    log('initAfter');
                    e.resolve();
                }, 100)
                return e.promise();
            }, "once");

            $.when(triggerFlow.boot("div")).done(function() {
                expect(arr + '').toBe('initBefore,div,init,initAfter,render,complete');
                testCall();
            })
        })

        it("trigger - next", function(testCall) {
            triggerFlow.onBefore("init", "initBefore", function(e, name, op) {
                setTimeout(function() {
                    log('initBefore');
                    e.next('complete').resolve();
                }, 100)
                return e.promise();
            }, "once");

            $.when(triggerFlow.boot("div")).done(function() {
                expect(arr + '').toBe('initBefore,div,init,complete');
                testCall();
            })

        })

        it("trigger - end", function(testCall) {
            triggerFlow.onBefore("init", "initBefore", function(e, name, op) {
                setTimeout(function() {
                    log('initBefore');
                    e.end().resolve();
                }, 100)
                return e.promise();
            }, "once");

            $.when(triggerFlow.boot("div")).done(function() {
                expect(arr + '').toBe('initBefore');
                testCall();
            })
        })

        it("trigger - stopPropagation", function(testCall) {
            triggerFlow.onBefore("init", "initBefore", function(e, name, op) {
                setTimeout(function() {
                    log('initBefore');
                    e.stopPropagation().resolve();
                }, 100)
                return e.promise();
            }, "once");

            triggerFlow.onBefore("init", "initBefore2", function(e, name, op) {
                log('initBefore2');
            }, "once");

            $.when(triggerFlow.boot("div")).done(function() {
                expect(arr + '').toBe('initBefore,div,init,render,complete');
                testCall();
            })
        })

        it("trigger - preventDefault", function(testCall) {
            triggerFlow.onBefore("init", "initBefore", function(e, name, op) {
                setTimeout(function() {
                    log('initBefore');
                    e.preventDefault().resolve();
                }, 100)
                return e.promise();
            }, 10, "once");

            triggerFlow.on("init", "initAfter", function(e, name, op) {
                log('initAfter');
            }, "once");

            $.when(triggerFlow.boot("div")).done(function() {
                expect(arr + '').toBe('initBefore,initBefore2,initAfter,render,complete');
                testCall();
            })
        })

        it("trigger - stop", function(testCall) {
            triggerFlow.onBefore("init", "initBefore", function(e, name, op) {
                setTimeout(function() {
                    log('initBefore');
                    e.stop().resolve();
                }, 100)
                return e.promise();
            }, "once");

            triggerFlow.onBefore("init", "initBefore2", function(e, name, op) {
                log('initBefore2');
            }, "once");

            triggerFlow.on("init", "initAfter", function(e, name, op) {
                log('initAfter');
            }, "once");

            $.when(triggerFlow.boot("div")).done(function() {
                expect(arr + '').toBe('initBefore,render,complete');
                testCall();
            });
        })

        it("trigger - transfer Result", function(testCall) {
            var flow = st.flowController({
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

        var _err, flowReject = st.flowController({
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

        it("reject", function(testCall) {

            $.when(flowReject.boot('boot')).fail(function(err) {
                expect(err + '').toBe('init-reject');
                testCall();
            });
        })

        it("trigger - reject", function(testCall) {
            flowReject.onBefore("init", "initBefore", function(e, name, op) {
                setTimeout(function() {
                    e.reject("initBefore-reject");
                }, 100)
                return e.promise();
            });

            $.when(flowReject.boot('boot')).done(function(result) {
                arr = result;
            }).fail(function(err) {
                expect(arr + '').toBe('');
                expect(err + '').toBe('initBefore-reject');
                testCall();
            });
        })

        it("trigger - callback mode & interface change", function(testCall) {
            var flow = st.flowController({
                flow: {
                    init: function(e, name, op) {
                        setTimeout(function() {
                            log(name, 'init');
                            e.resolve();
                        }, 100)
                        return e.promise();
                    },
                    render: function(e, name, op) {
                        log('render');
                    },
                    complete: function(e, name, op) {
                        log('complete');
                    }

                },
                order: ["init", "render", "complete"],
                trigger: {
                    mode: "callback",
                    iFace: {
                        on: "bind"
                    }
                }
            });

            flow.bind('init', 'initAfter', function(name, op) {
                log(name + '-initAfter');
            })

            $.when(flow.boot('boot')).done(function() {
                expect(arr + '').toBe('boot,init,boot-initAfter,render,complete');
                testCall();
            });
        })

        it("simple mode & trigger callback mode", function(testCall) {
            var flow = st.flowController({
                flow: {
                    init: function(name, op) {
                        log(name, 'init');
                    },
                    render: function(name, op) {
                        log('render');
                    },
                    complete: function(name, op) {
                        log('complete');
                    }

                },
                order: ["init", "render", "complete"],
                mode: "simple",
                trigger: {
                    mode: "callback"
                }
            });

            flow.on('init', 'initAfter', function(name, op) {
                log(name + '-initAfter');
            })

            $.when(flow.boot('boot')).done(function() {
                expect(arr + '').toBe('boot,init,boot-initAfter,render,complete');
                testCall();
            });
        })

        it("all trigger", function(testCall) {
            var flow = st.flowController({
                flow: {
                    init: function(e, name, op) {
                        log(name, 'init');

                    },
                    render: function(e, name, op) {
                        setTimeout(function() {
                            log('render');
                            e.resolve();
                        }, 100)
                        return e.promise();
                    },
                    complete: function(e, name, op) {
                        log('complete');
                    }
                },
                order: ["init", "render", "complete"],
                trigger: true
            });

            flow.on('init', 'initAfter', function(e, name, op) {
                log('initAfter');
            })

            // flow.on('render', 'rendertAfter', function(e,name, op) {
            //     log('rendertAfter');
            // })

            $.when(flow.boot('boot')).done(function() {
                // expect(arr + '').toBe('boot,init,initAfter,render,rendertAfter,complete');
                expect(arr + '').toBe('boot,init,initAfter,render,complete');
                testCall();
            });
        });
    })
})