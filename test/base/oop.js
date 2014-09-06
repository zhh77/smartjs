(function() {


    describe('OOP Test', function() {
        var user = st.klass("user", {
            klassInit: function(name) {
                this.name = name;
            },
            say: function(text) {
                return this.name + ',' + text;
            }
        }),
            result = [];

        it("klass prop check", function() {
            expect(user.fn._$klass).toBe(true);
            expect(user.fn._$kName).toBe('user');
            expect(user.fn._$inheirts + '').toBe('user');
        })

        it("class init", function() {
            var user1 = new user('roy'),
                //执行方法与实例化等效
                user2 = user('tracy');

            expect(user1.name).toBe('roy');
            expect(user1.say('hello')).toBe('roy,hello');
            expect(user2.name).toBe('tracy');
            expect(user2.say('hello')).toBe('tracy,hello');
        })



        var user1 = st.klass("user1", {
            name: 'user1',
            //自初始化方法为：klassInit，在实例化时执行
            klassInit: function() {}
        }, user);

        //继承测试
        it("inheirt", function() {

            var roy = user1('roy');

            expect(roy.name).toBe('user1');
            expect(roy.say('hello')).toBe('user1,hello');
        })

        //调用父类测试
        it("klassBase - callBase", function() {
            var roy = user1();
            roy.callBase('klassInit', ['roy']);
            expect(roy.name).toBe('roy');
        })

        //扩展例子
        it("klassBase - extend", function() {
            var roy = user1();
            roy.extend({
                say: function() {
                    return "extend";
                }
            });

            expect(roy.say()).toBe('extend');
            expect(roy.callBase('say', ['extend'])).toBe("user1,extend");
        })

        it("muilt heirht - callBase", function() {
            var User = st.klass("user", {
                klassInit: function(name) {
                    this.name = name;
                },
                say: function(text) {
                    return this.name + ',' + text;
                }
            })

            var user2 = st.klass('user2', {
                say: function(text) {
                    return this.callBase('say', [text]) + "-lv2";
                }
            }, User);

            var user3 = st.klass('user3', {
                say: function(text) {
                    return this.callBase('say', [text]) + "-lv3";
                }
            }, user2);

            var user4 = st.klass('user4', {
                say: function(text) {
                    return this.callBase('say', [text]) + "-lv4";
                }
            }, user3);

            var roy = new user4('roy');
            expect(roy._$inheirts + '').toBe('user4,user3,user2,user');
            //依次执行到根，正确将当前的this对象的值输出
            expect(roy.say('hello')).toBe('roy,hello-lv2-lv3-lv4');

            //从3级开始执行
            expect(roy.callBase('say', ['hello'])).toBe("roy,hello-lv2-lv3");

            //指定从user开始执行
            expect(roy.callBase('say', 'user', ['hello'])).toBe("roy,hello");

            //上向略过2级执行
            expect(roy.callBase('say', 2, ['hello'])).toBe("roy,hello-lv2");

        })

        //widget基类
        var baseWidget = {
            //widget类型
            type: '',
            //widget的渲染方法
            render: function(id) {
                return this.type + ':' + id;
            }
        };

        //一个widget工厂
        var widgetFactory = st.factory('wdigetfactory', baseWidget);

        //添加一个input
        widgetFactory.add('input', {
            type: 'input'
        })

        it("factory add", function() {
            //找到添加的input
            var input = widgetFactory.find('input');
            expect(input).toBeDefined();
            //输出
            expect(input.render('txt')).toBe("input:txt");
        });

        it("factory inheirt", function() {
            //添加一个number类型的input
            var num = widgetFactory.add('number', {
                type: 'input[number]'
            }, 'input')

            expect(num.render('txtNum')).toBe("input[number]:txtNum");
        });

        it("factory class mode", function() {
            var f1 = st.factory({
                name: 'classMode',
                //设置class类型
                type: 'class',
                base: {
                    klassInit: function(name) {
                        this.name = name;
                    }

                }
            });

            var c1 = f1.add('c1', {
                type: 'c1'
            });

            expect(c1.fn).toBeDefined();
            //需要初始化
            var c = new c1('class1');
            expect(c.type).toBe("c1");
            expect(c.name).toBe("class1");
        });

        it("factory merge mode", function() {
            var f2 = st.factory({
                name: 'copyMode',
                //设置merge类型
                type: 　'merge',
                //设置默认模式
                initDefault: true,
                base: {
                    name: 'copy',
                    project: {
                        name: 'smartjs'
                    }
                }
            })

            var c = f2.add('c1', {
                name: 'c1',
                project: {
                    role: 'pm'
                }
            });

            expect(f2.find().name).toBe("copy");
            expect(c.name).toBe("c1");
            expect(c.project.name).toBe("smartjs");
            expect(c.project.role).toBe("pm");
        });
    });
})();