(function() {
    describe('ststem', function() {
        it('_stDefine', function() {
            window._stDefine('mod', function(st, fnConf) {
                //如果需要自动扩展或者兼容require模块化的话，返回object对象即可
                return {
                    testMod: 'testMod'
                };
            })

            expect(st.testMod).toBe('testMod');
        })

        it('noConfilict', function() {
        	var $ = {};

            //smartjs与$合并
            window._smartJS.noConflict($);
            expect($.__smartJs).toBeDefined();
        })

        it('conf', function() {
           st.conf('testConfig',{
                name : 'test'
           });
           var config = st.conf('testConfig');
           expect(config).toBeDefined();
           expect(config.name).toBe('test');

           //扩展
           st.conf('testConfig',{
                type : 'config'
           });

           config = st.conf('testConfig');
           expect(config.name).toBe('test');
           expect(config.type).toBe('config');

        })
    })

    describe('Util Test', function() {
        it("slice arguments", function() {
            function test() {
                return st.sliceArgs(arguments, 1);
            }
            expect(test(1, 2, 3, 4).join(',')).toBe('2,3,4');
        })

        it("copy", function() {
            var person = {
                name: "piter",
                age: 10,
                child: [{
                    name: 'lily'
                }]
            };

            var obj = st.copy(person);

            expect(obj.child).toBeDefined();
            expect(obj.age).toBe(10);
            expect(obj.name).toBe('piter');
            expect(obj.child[0].name).toBe('lily');
        })

        it("deep copy", function() {
            var person = {
                name: "piter",
                age: 10,
                child: [{
                    name: 'lily'
                }]
            };

            var obj = st.copy(true, person);

            expect(obj.child).toBeDefined();
            expect(obj.age).toBe(10);

            obj.name = "b";
            obj.child[0].name = 'tracy';

            expect(person.name).toBe('piter');
            expect(person.child[0].name).toBe('lily');
        })

        it("mix Obj", function() {
            var person = {
                name: "piter",
                age: 10,
                child: [{
                    name: 'lily'
                }]
            };

            var obj = {
                name: 'a'
            };

            //根据person的数据进行合并
            st.mix(obj, person);

            //child被复制
            expect(obj.child).toBeDefined();
            //age被复制
            expect(obj.age).toBe(10);
            //name不为null，未被复制
            expect(obj.name).toBe('a');
        })

        it("mix Obj - deep copy", function() {
            var person = {
                name: "piter",
                age: 10,
                child: [{
                    name: 'lily'
                }]
            };

            var obj = {
                name: 'a'
            };

            st.mix(true, obj, person);

            expect(obj.child).toBeDefined();
            expect(obj.age).toBe(10);
            expect(obj.name).toBe('a');

            //obj.child[0].name = 'tracy';
            //expect(person.child[0].name).toBe('lily');
        })

        it("mix Obj - exclude", function() {
            var obj = {
                name: 'a',
                age: 10,
                project: {
                    name: "project1",
                    state: 'testing'
                }
            };

            var mObj = st.mix(true, {
                age: 20
            }, obj, ["age", "project.state"]);

            expect(mObj.age).toBe(20);
            expect(mObj.name).toBe("a");
            expect(mObj.project.state).toBeUndefined();;

        })

        it("mergeMulti", function() {
            var obj0 = {
                name: 'obj0'
            },
            obj1 = {
                name: 'obj1',
                age: 10
            },
            obj2 = {
                name: 'obj2',
                sex : 'male'
            }

            //使用mix方式合并多个对象
            var mObj = st.mergeMulti(true,[obj0,obj1,obj2],true,["age"]);

            expect(mObj.age).toBeUndefined();
            expect(mObj.name).toBe("obj0");
            expect(mObj.sex).toBe("male");
        })

        it("setObj - base", function() {
            var user1 = {
                name: "user",
                project1: {
                    role: "sa"
                },
                friends: ['user2']
            };

            //简单赋值
            st.setObj(user1, "age", 10);

            //子对象赋值
            st.setObj(user1, "project1.level", 1);

            //设置数组
            st.setObj(user1, "friends[1]", 'user3');

            //构建不存在的project2对象
            st.setObj(user1, "project2.role", 'pm');

            expect(user1.age).toBe(10);
            expect(user1.project1.level).toBe(1);
            expect(user1.friends.length).toBe(2);
            expect(user1.project2).toBeDefined();
            expect(user1.project2.role).toBe("pm");
        });

        it("setObj - root mode", function() {
            var user1 = {
                name: "user",
                project1: {
                    role: "sa"
                },
                friends: ['user2']
            };

            st.setObj(user1, "user1.age", 20, true);

            expect(user1.age).toBe(20);
        });

        it("setObj - merge mode", function() {
            var user1 = {
                name: "user",
                project1: {
                    role: "sa"
                },
                friends: ['user2']
            };

            st.setObj(user1, "project1", {
                level: 2,
                status: 'coding'
            }, 'merge');

            expect(user1.project1.level).toBe(2);
            expect(user1.project1.status).toBe('coding');
        });

        it("setObj - mix and root mode", function() {
            var user1 = {
                name: "user",
                project1: {
                    role: "sa"
                },
                friends: ['user2']
            };

            st.setObj(user1, "user1.project1", {
                level: 3,
                status: 'testing',
                module: 'core'
            }, 'mix', true);

            expect(user1.project1.level).toBe(3);
            expect(user1.project1.status).toBe('testing');
            expect(user1.project1.module).toBe('core');
        });

        it("getObj", function() {
            var user1 = {
                name: "user",
                project1: {
                    level:2,
                    role: "sa"
                },
                friends: ['user2','user3']
            };

            expect(st.getObj(user1, "name")).toBe('user');
            expect(st.getObj(user1, "project1.level")).toBe(2);
            expect(st.getObj(user1, "friends[1]")).toBe('user3');
            expect(st.getObj(user1, "a")).toBe(null);
        });

        it("merge function", function() {
            var result = [],
                fn1, fn2, fn3, fn4;

            fn1 = function(arr) {
                arr.push("fn1");
            }

            fn2 = function(arr) {
                arr.push("fn2");
            }

            fn3 = st.mergeFn(fn1, fn2);

            fn3(result);
            expect(result + '').toBe('fn1,fn2');
        })

        it("merge function - stopOnFalse", function() {
            var result = [],
                fn1, fn2, fn3;

            //合并方法1
            fn1 = function(arr) {
                    arr.push("fn1");
                    return false;
                }
                //合并方法2
            fn2 = function(arr) {
                arr.push("fn2");
            }

            //将fn1和fn2合并成一个新方法fn3，并开启stopOnFalse
            fn3 = st.mergeFn(fn1, fn2, true);

            fn3(result);
            //最终因为fn1执行返回false，fn2不执行，
            expect(result + '').toBe('fn1');
        })

        it("inject function", function() {
            var result = [],
                target = {
                    test: function(arr) {
                        arr.push("test");
                    }
                };


            function fn(arr) {
                arr.push("inject");
            }

            //向target注入方法fn
            st.injectFn(target, "test", fn);

            target.test(result);

            //结果执行注入函数fn
            expect(result + '').toBe('test,inject');
        })

        it("inject function -- before", function() {
            var result = [],
                target = {
                    test: function(arr) {
                        arr.push("test");
                    }
                };


            function fn(arr) {
                arr.push("inject");
            }

            st.injectFn(target, "test", fn, true);

            target.test(result);
            expect(result + '').toBe('inject,test');
        })

        it("inject function -- stopOnFalse", function() {
            var result = [],
                target = {
                    test: function(arr) {
                        arr.push("test");

                    }
                };


            function fn(arr) {
                arr.push("inject");
                return false;
            }

            st.injectFn(target, "test", fn, true, true);

            target.test(result);
            expect(result + '').toBe('inject');
        })

        it("priorityList", function() {
            var list = st.priorityList(),
                result = [];

            //添加项
            list.add(1).add(0).add(10, 10).add(5, 5).add(-1, -1);

            //10为第一个
            expect(list.at(0)).toBe(10);


            //按优先级大到小循环
            list.each(function(item) {
                result.push(item);
            })

            expect(result + '').toBe('10,5,1,0,-1');

            result = [];

            //删除 item为1的项
            list.remove(function(item) {
                if (item === 1)
                //结束匹配
                    return "done";
            })

            //按优先级小到大循环
            list.each(true, function(item) {
                result.push(item);
            })

            expect(result + '').toBe('-1,0,5,10');
        });
    })
})();
