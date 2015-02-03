(function () {
    describe('OOP Test', function () {
        it("klass prop check", function () {
            var user = st.klass("user", {
                klassInit: function (name) {
                    this.name = name;
                },
                say: function (text) {
                    return this.name + ',' + text;
                }
            });

            expect(user.fn._$klass).toBe(true);
            expect(user.fn._$kName).toBe('user');
            expect(user.fn._$inheirts + '').toBe('user');
        })

        it("class init", function () {
            var user = st.klass("user", {
                klassInit: function (name) {
                    this.name = name;
                },
                say: function (text) {
                    return this.name + ',' + text;
                }
            });

            var user1 = new user('roy'),
            //执行方法与实例化等效
                user2 = user('tracy');

            expect(user1.name).toBe('roy');
            expect(user1.say('hello')).toBe('roy,hello');
            expect(user2.name).toBe('tracy');
            expect(user2.say('hello')).toBe('tracy,hello');
        })

        //继承测试
        it("inheirt", function () {
            var user = st.klass("user", {
                klassInit: function (name) {
                    this.name = name;
                },
                say: function (text) {
                    return this.name + ',' + text;
                }
            });

            var user1 = st.klass("user1", {
                name: 'user1',
                //自初始化方法为：klassInit，在实例化时执行
                klassInit: function () {
                }
            }, user);

            var roy = user1('roy');

            expect(roy.name).toBe('user1');
            expect(roy.say('hello')).toBe('user1,hello');
        })

        //调用父类测试
        it("klassBase - callProto", function () {
            var Animate = st.klass("Animate", {
                klassInit: function (name) {
                    this.name = name;
                },
                say: function (text) {
                    return this.name + ':' + text;
                }
            });

            var chicken = new Animate('chicken');
            chicken.say = function (text) {
                //调用原型链方法
                return '[Bird]' + this.callProto('say', [text]);
            };

            expect(chicken.say('hello')).toBe('[Bird]chicken:hello');
        })

        it("klassBase - getBase", function () {
            var Animate = st.klass("Animate", {
                klassInit: function (name) {
                    this.name = name;
                },
                say: function (text) {
                    return this.name + ':' + text;
                }
            });

            //继承user
            var Bird = st.klass("Bird", {
                //重写say方法
                say: function (text) {
                    //根据名称向上找到父类原型
                    var parent = this.getBase('Animate');

                    //调用原型链方法
                    return '[Bird]' + parent.say.call(this, text);
                }
            }, Animate);

            var chicken = new Bird('chicken');
            expect(chicken.say('hello')).toBe('[Bird]chicken:hello');
        })

        //扩展例子
        it("klassBase - extend", function () {
            var Animate = st.klass("Animate", {
                klassInit: function (name) {
                    this.name = name;
                },
                say: function (text) {
                    return this.name + ':' + text;
                }
            });

            var chicken = new Animate('chicken');

            //扩展等同于 chicken.say = xxx
            chicken.extend({
                say: function (text) {
                    return 'hello';
                }
            });

            expect(chicken.say('hello')).toBe('hello');
        })

        it("klassBase - callBase", function () {
            var Animate = st.klass("Animate", {
                klassInit: function (name) {
                    this.name = name;
                },
                say: function (text) {
                    return this.name + ':' + text;
                }
            });

            //继承user
            var Bird = st.klass("Bird", {
                //重写say方法
                say: function (text) {
                    //调用基类方法
                    return '[Bird]' + this.callBase('say', [text]);
                }
            }, Animate);

            var chicken = new Bird('chicken');
            expect(chicken.say('hello')).toBe('[Bird]chicken:hello');
        })

        it("muilt heirht - callBase", function () {
            //创建一个class
            var User = st.klass('user', {
                klassInit: function (name) {
                    this.name = name;
                },
                say: function (text) {
                    return this.name + ',' + text;
                }
            });

            //实例化一个User
            var xiaoming = new User('小明');

            //方法实例化
            var xiaozhang = User('小张');

            //多级继承例子。在多级继承中有一种场景每个子类方法都会调用父类的方法，而方法中又会使用到当前对象的属性，则问题就来了；
            //如果是采用的parent.xxx然后传递this下的属性值过去，则没太大的问题。backbone就采用的这种。
            //另外像base.js直接改写原始方法，将父对象封入闭包中，也无问题。只是这种限制比较大，只能调用父类的同名方法。
            //而dojo采用的是this.parent.xxx.call(this)的方式，则就会悲剧了，死循环就来了。
            //导致这样的原因就是将this带入parent方法后，父类又执行this.parent。而这是this则是子类的对象，那么方法就只会不停的调用parent的方法。
            //在smartjs中klass调用父类方法由callBae这个方法来代理，同时使用指针来记录方法的执行轨迹，这样保证了从子到根的各级调用

            var user2 = st.klass('user2', {
                say: function (text) {
                    //调用父类
                    return this.callBase('say', [text]) + "-lv2";
                }
            }, User);

            var user3 = st.klass('user3', {
                say: function (text) {
                    //调用父类
                    return this.callBase('say', [text]) + "-lv3";
                }
            }, user2);

            var user4 = st.klass('user4', {
                say: function (text) {
                    //调用父类
                    return this.callBase('say', [text]) + "-lv4";
                }
            }, user3);

            var roy = new user4('roy');

            //继承路径
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

        it("factory add", function () {
            //widget基类
            var baseWidget = {
                //widget类型
                type: '',
                //widget的渲染方法
                render: function (id) {
                    return this.type + ':' + id;
                }
            };

            //一个widget工厂
            var widgetFactory = st.factory('wdigetfactory', baseWidget);

            //添加一个input
            widgetFactory.add('input', {
                type: 'input'
            })

            //找到添加的input
            var input = widgetFactory.find('input');

            //_$fType为注册的类型名
            expect(input._$fType).toBe('input');

            //输出
            expect(input.render('txt')).toBe("input:txt");
        });

        it("factory inheirt", function () {
            //一个widget工厂
            var widgetFactory = st.factory('wdigetfactory', {
                //widget类型
                type: '',
                //widget的渲染方法
                render: function (id) {
                    return this.type + ':' + id;
                }
            });

            //添加一个input
            widgetFactory.add('input', {
                type: 'input'
            })
            //添加一个number类型的input
            var num = widgetFactory.add('number', {
                type: 'input[number]'
            }, 'input')

            expect(num.render('txtNum')).toBe("input[number]:txtNum");
        });

        it("factory class mode", function () {
            var f1 = st.factory({
                name: 'classMode',
                //设置class类型
                type: 'class',
                base: {
                    klassInit: function (name) {
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

        it("factory merge mode", function () {
            var f2 = st.factory({
                name: 'copyMode',
                //设置merge类型
                type:'merge',
                //设置默认模式
                initDefault:true,
                base:{
                    name: 'copy',
                    project :{
                    name: 'smartjs'
                }
            }
        });

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

    it("factory build", function () {
        //一个widget工厂
        var widgetFactory = st.factory('wdigetfactory', {
            //widget类型
            type: '',
            //widget的渲染方法
            render: function (id) {
                return this.type + ':' + id;
            }
        }, 'class');

        var Tab = widgetFactory.build('Tab', {type: 'Tab'});

        expect(widgetFactory.find('Tab')).toBeUndefined();

        var tab1 = new Tab();

        expect(tab1.render('tab1')).toBe('Tab:tab1');
    })

    it("fire", function () {
        var widgetFactory = st.factory('wdigetfactory', {
            type: '',
            render: function (id) {
                return this.type + ':' + id;
            }
        });

        widgetFactory.add('Panel', {
            type: 'Panel'
        });
        widgetFactory.add('Tab', {
            type: 'Tab'
        });

        var ret = '';
        //执行每个widget的render方法；
        widgetFactory.fire('render', ['id'], function (item, result) {
            //this为widgetFactory；item为产品；result为render执行结果
            ret += result + '-';
        })

        expect(ret).toBe('Panel:id-Tab:id-');
    })

    it("setDefault", function () {
        //一个widget工厂
        var widgetFactory = st.factory({
            //工厂名
            name: 'wdigetfactory',
            //工厂类型
            type: 'class',
            //基类对象
            base: {
                //widget类型
                type: '',
                //widget的渲染方法
                render: function (id) {
                    return this.type + ':' + id;
                }
            }
        });

        widgetFactory.add('Panel', {type: 'Panel'});

        //将Panel设置成默认项
        widgetFactory.setDefault('Panel')

        //Tab未注册，但参数中设置了返回默认，则会返回Panel
        var Tab = widgetFactory.find('Tab', true);

        var tab1 = new Tab();

        expect(tab1.render('tab1')).toBe('Panel:tab1');
    })
});
})
();
