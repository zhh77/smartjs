(function() {

    describe('Util Test', function() {
        it("slice arguments", function() {
            function test() {
                return st.sliceArgs(arguments, 1);
            }
            expect(test(1, 2, 3, 4).join(',')).toBe('2,3,4');
        })

        var person = {
            name: "piter",
            age: 10,
            child: [{
                name: 'lily'
            }]
        };

        it("copy", function() {
            var obj = st.copy(person);
            expect(obj.child).toBeDefined();
            expect(obj.age).toBe(10);
            expect(obj.name).toBe('piter');
            expect(obj.child[0].name).toBe('lily');
        })

        it("deep copy", function() {
            var obj = st.copy(true, person);

            expect(obj.child).toBeDefined();
            expect(obj.age).toBe(10);

            obj.name = "b";
            obj.child[0].name = 'tracy';

            expect(person.name).toBe('piter');
            expect(person.child[0].name).toBe('lily');
        })

        it("merge Obj", function() {
            var obj = {
                name: 'a'
            };

            //根据person的数据进行合并
            st.mergeObj(obj, person);

            //child被复制
            expect(obj.child).toBeDefined();
            //age被复制
            expect(obj.age).toBe(10);
            //name不为null，未被复制
            expect(obj.name).toBe('a');
        })

        it("merge Obj - deep copy", function() {
            var obj = {
                name: 'a'
            };

            st.mergeObj(true, obj, person);

            expect(obj.child).toBeDefined();
            expect(obj.age).toBe(10);
            expect(obj.name).toBe('a');

            //obj.child[0].name = 'tracy';
            //expect(person.child[0].name).toBe('lily');
        })

        it("merge Obj - exclude", function() {
            var obj = {
                name: 'a',
                age: 10,
                project: {
                    name: "project1",
                    state: 'testing'
                }
            };

            var mObj = st.mergeObj(true, {
                age: 20
            }, obj, ["age", "project.state"]);

            expect(mObj.age).toBe(20);
            expect(mObj.name).toBe("a");
            expect(mObj.project.state).toBeUndefined();;

        })

        var user1 = {
            name: "user",
            project1: {
                role: "sa"
            }
        };

        it("setObj - base", function() {
            st.setObj(user1, "age", 10);
            st.setObj(user1, "project1.level", 1);
            st.setObj(user1, "project2.role", 'pm');

            expect(user1.age).toBe(10);
            expect(user1.project1.level).toBe(1);
            expect(user1.project2).toBeDefined();
            expect(user1.project2.role).toBe("pm");
        });

        it("setObj - root mode", function() {
            st.setObj(user1, "user1.age", 20, true);
            expect(user1.age).toBe(20);
        });

        it("setObj - mix mode", function() {
            st.setObj(user1, "project1", {
                level: 2,
                status: 'coding'
            }, 'mix');
            expect(user1.project1.level).toBe(2);
            expect(user1.project1.status).toBe('coding');
        });

        it("setObj - merge and root mode", function() {
            st.setObj(user1, "user1.project1", {
                level: 3,
                status: 'testing',
                module: 'core'
            }, 'merge', true);
            expect(user1.project1.level).toBe(2);
            expect(user1.project1.status).toBe('coding');
            expect(user1.project1.module).toBe('core');
        });

        it("getObj", function() {
            expect(st.getObj(user1, "name")).toBe('user');
            expect(st.getObj(user1, "project1.level")).toBe(2);
            expect(st.getObj(user1, "user.project2.role", true)).toBe('pm');
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
            list.remove(function(item){
                if(item === 1)
                    //结束匹配
                    return "done";
            })

            //按优先级小到大循环
            list.each(true,function(item) {
                result.push(item);
            })

            expect(result + '').toBe('-1,0,5,10');
        });
    })
})();