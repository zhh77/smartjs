(function() {
    describe('dataManager', function() {

        it("dataServices", function(endTest) {
            //cache数组
            var _cache = [];

            //注册cache的数据服务
            st.dataServices.add("cache", {
                //实现search接口方法
                search: function(op) {
                    var result, filter = op.filter;
                    //过滤数据
                    result = filter ? _cache.filter(filter) : _cache;

                    //执行成功之后的方法
                    op.success && op.success(result);
                },
                //实现update接口方法
                update: function(op) {
                    var filter = op.filter,
                    //测试使用，只更新第一条匹配数据
                        data = st.isArray(data) ? data[0] : data;

                    if (filter) {
                        //查找数据进行更新
                        st.each(_cache, function(i, item) {
                            if (filter(item)) {
                                _cache[i] = data;
                                return false;
                            }
                        })
                    } else {
                        _cache = op.data || [];
                    }

                    op.success && op.success(op.data);
                }
            });

            //更新cache的数据
            st.dataServices.update({
                dsType: 'cache',
                data: [{
                    name: 'user1',
                    age: 20
                }, {
                    name: 'user2',
                    age: 30
                }],
                success: function(result) {
                    expect(_cache.length).toBe(2);
                }
            });

            //查询server的数据
            st.dataServices.search({
                dsType: 'cache',
                filter : function(data){
                    return data.name === 'user1'
                },
                success: function(result) {
                    expect(result.length).toBe(1);
                    expect(result[0].age).toBe(20);
                    endTest();
                }
            });
        })

        it("dataManager", function() {
            //添加一个简单的table类型的数据管理
            st.dataManager.add("Table", {
                init: function() {
                    this._data = [];
                },
                //dm内置查询
                _innerSearch: function(conf) {
                    return conf.filter ? this._data.filter(conf.filter) : this._data;
                },
                //dm内置更新
                _innerUpdate: function(conf) {
                    var isUpdate, _data = this._data,
                        data = conf.data,
                        updateData;

                    if (conf.filter) {
                        updateData = st.isArray(data) ? data[0] : data;
                        //筛选数据
                        _data.forEach(function(item, i) {
                            if (conf.filter(item)) {
                                _data[i] = updateData;
                                isUpdate = true;
                                return false;
                            }
                        })
                        isUpdate || _data.push(updateData);
                    } else {
                        this._data = data || [];
                    }
                    return data;
                },
                //判断数据是否为空
                checkEmpty: function(data, conf) {
                    return data === undefined || data.length === 0;
                },
                //清空数据
                clear: function() {
                    this._data = [];
                }
            });

            //创建一个tabel的manager
            var dm1 = st.dataManager.create("Table");

            //找不到匹配的数据，则插入新数据
            dm1._innerUpdate({
                data: {
                    name: 'user3',
                    age: 10
                },
                //方法过滤器
                filter: function(user) {
                    return user.name == 'user3';
                }
            });
            expect(dm1._data.length).toBe(1);
            expect(dm1._data[0].name).toBe('user3');

            //更新数据
            dm1._innerUpdate({
                data: {
                    name: 'user3',
                    age: 40
                },
                //方法过滤器
                filter: function(user) {
                    return user.name == 'user3';
                }
            });

            //查询数据
            var result = dm1._innerSearch({
                //方法过滤器
                filter: function(user) {
                    return user.name == 'user3';
                }
            });
            expect(result.length).toBe(1);
            expect(result[0].age).toBe(40);
        })
    });
})();