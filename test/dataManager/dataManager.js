(function() {
	var dataServices = st.dataServices,
		dataManager = st.dataManager,
		_db = [],
		_cache = [];

	//将params解析成过滤方法
	function buildFilterByParams(params) {
		if (params) {
			return function(item) {
				var check = true;
				$.each(params, function(name, value) {
					if (item[name] !== value) {
						check = false;
						return check;
					}
				})
				return check;
			}
		}
	}

	//取对象数据，测试使用array只取第一条
	function getData(data) {
		return $.isArray(data) ? data[0] : data;
	}

	function buildFitler(filter) {
		if (filter && typeof filter === 'object') {
			return buildFilterByParams(filter);
		}
		return filter;
	}

	//模拟服务端异步返回数据,只接受params
	dataServices.add("server", {
		search: function(op) {
			//模拟异步查询
			setTimeout(function() {
				var result,
					filter = op.filter;

				result = filter ? _db.filter(filter) : _db;

				op.success && op.success(result);
			}, 100);
		},
		update: function(op) {
			//模拟异步更新
			setTimeout(function() {
				var filter = op.filter,
					data = getData(op.data);

				if (filter) {
					//测试使用，只更新第一条匹配数据
					$.each(_db, function(i, item) {
						if (filter(item)) {
							_db[i] = data;
							return false;
						}
					})
				} else {
					_db = op.data || [];
				}

				op.success && op.success(op.data);

			}, 100);
		},
		initOptions: function(op) {
			//初始化设置参数将params编译成filter过滤方法
			op.filter = buildFilterByParams(op.params);
		}
	});

	//模拟客户端本地存储
	dataServices.add("cache", {
		search: function(op) {
			var result, filter = op.filter;

			result = filter ? _cache.filter(filter) : _cache;

			op.success && op.success(result);
		},
		update: function(op) {
			var filter = op.filter,
				data = getData(op.data);

			if (filter) {
				//测试使用，只更新第一条匹配数据
				$.each(_cache, function(i, item) {
					if (filter(item)) {
						_cache[i] = data;
						return false;
					}
				})
			} else {
				_cache = op.data || [];
			}
			op.success && op.success(op.data);
		},
		initOptions: function(op) {
			//生成fitler，当filter为obj类型时，编译成fn
			op.filter = buildFitler(op.filter || op.params);
		}
	});


	//添加一个简单的table类型的数据管理
	dataManager.add("Table", {
		init: function() {
			this._data = [];
		},
		//dm内置查询
		_innerSearch: function(conf) {
			var filter = conf ? buildFitler(conf.filter) : null;
			return filter ? this._data.filter(filter) : this._data;
		},
		//dm内置更新
		_innerUpdate: function(conf) {
			var isUpdate, _data = this._data,
				data = conf.data,
				updateData, filter;

			conf && (filter = buildFitler(conf.filter));

			if (filter) {
				updateData = getData(data);
				//筛选数据
				_data.forEach(function(item, i) {
					if (filter(item)) {
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

	describe('dataServices Test', function() {
		it("update", function(endTest) {
			//更新server的数据
			dataServices.update({
				dsType: 'server',
				data: [{
					name: 'user1',
					age: 20
				}, {
					name: 'user2',
					age: 30
				}],
				success: function(result) {
					expect(_db.length).toBe(2);
					endTest();
				}
			});
		})

		it("search", function(endTest) {
			//重新server的数据
			dataServices.search({
				dsType: 'server',
				params: {
					name: 'user1'
				},
				success: function(result) {
					expect(result.length).toBe(1);
					expect(result[0].age).toBe(20);
					endTest()
				}
			});

		})
	});

	describe('dataManager Test', function() {
		beforeEach(function() {
			_db = [{
				id: 1,
				name: 'user1',
				age: 20
			}, {
				id: 2,
				name: 'user2',
				age: 30
			}];

			_cache = [{
				id: 1,
				name: 'cache1',
				age: 20
			}, {
				id: 2,
				name: 'cache2',
				age: 20
			}];
		})

		//创建一个tabel的manager
		var dm1 = dataManager.create("Table");

		it("add", function() {
			expect(dataManager.find("Table")).toBeDefined();
			expect(dm1).toBeDefined();
		})

		it("update", function() {
			dm1._innerUpdate({
				data: [{
					name: 'user1',
					age: 10
				}]
			});
			expect(dm1._data.length).toBe(1);
			expect(dm1._data[0].name).toBe('user1');
		})

		it("search", function() {
			var result = dm1._innerSearch();
			expect(result.length).toBe(1);
			expect(result[0].name).toBe('user1');
		})

		it("update by filter", function() {
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
			expect(dm1._data.length).toBe(2);
			expect(dm1._data[1].name).toBe('user3');

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

			expect(dm1._data.length).toBe(2);
			expect(dm1._data[1].age).toBe(40);
		})

		it("search by filter", function() {
			var result = dm1._innerSearch({
				//方法过滤器
				filter: function(user) {
					return user.name == 'user3';
				}
			});
			expect(result.length).toBe(1);
			expect(result[0].age).toBe(40);
		})

		it("search by params", function() {
			var result = dm1._innerSearch({
				//参数过滤器
				filter: {
					name: 'user3'
				}
			});
			expect(result.length).toBe(1);
			expect(result[0].age).toBe(40);
		})

		it("get from ds and update", function(endTest) {
			dm1.clear();
			//首先会在dm内部查询，找不到数据然后在到server上查询
			dm1.get({
				//设置数据服务为server
				dataServices: {
					dsType: 'server'
				},
				success: function(result) {
					expect(result).toBeDefined();
					expect(result[0].name).toBe('user1');
					expect(dm1._data[0].name).toBe('user1');
					endTest();
				}
			})
		})

		it("get from ds and no update", function(endTest) {
			dm1.clear();
			dm1.get({
				//设置查询不更新
				update: false,
				dataServices: {
					dsType: 'server'
				},
				success: function(result) {
					expect(dm1._data.length).toBe(0);
					endTest();
				}
			})
		})

		it("set to ds", function(endTest) {
			//更新到ds
			dm1.set({
				data: [{
					name: "userUpdate"
				}],
				dataServices: {
					dsType: 'server'
				},
				success: function(result) {
					expect(_db.length).toBe(1);
					expect(_db[0].name).toBe('userUpdate');
					endTest();
				}
			})

		})

		it("set to ds by params", function(endTest) {
			//根据条件更新到ds，条件同时在dm和ds中生效
			dm1.set({
				data: [{
					name: "userUpdate"
				}],
				params: {
					id: 1
				},
				dataServices: {
					dsType: 'server'
				},
				success: function(result) {
					expect(_db.length).toBe(2);
					expect(_db[0].name).toBe('userUpdate');
					endTest();
				}
			})
		})

		it("option", function(endTest) {
			var dmTest = dataManager.create('Table', {
				get: {
					params: {
						id: 1
					}
				},
				set: {
					params: {
						id: 2
					}
				},
				dataServices: {
					dsType: 'server'
				}
			});

			dmTest.get({
				success: function(result) {
					expect(result.length).toBe(1);
					expect(result[0].name).toBe('user1');
					expect(dmTest._data[0].name).toBe('user1');

					dmTest.set({
						data: result[0],
						success: function() {
							expect(_db[1].name).toBe('user1');
							endTest();
						}
					})
				}
			})
		})

		it("multi ds", function(endTest) {
			_cache = [];

			var dmTest = dataManager.create('Table', {
				get: {
					params: {
						id: 1
					}
				},
				dataServices: [{
					dsType: 'cache'
				}, {
					dsType: 'server'
				}]
			});

			dmTest.get({
				success: function(result) {
					expect(result.length).toBe(1);
					expect(result[0].name).toBe('user1');
					expect(dmTest._data[0].name).toBe('user1');
					endTest();
				}
			})
		})

		it("merge Params", function(endTest) {
			var dmTest = dataManager.create('Table', {
				get: {
					update: false,
					params: {
						age: 20
					}
				},
				dataServices: {
					dsType: 'cache'
				}
			});

			dmTest.get({
				params: {
					id: 2
				},
				success: function(result) {
					expect(result.length).toBe(1);
					expect(result[0].name).toBe('cache2');
					endTest();
				}
			})
		})

		it("no merge Params", function(endTest) {
			var dmTest = dataManager.create('Table', {
				get: {
					update: false,
					params: {
						id: 2
					}
				},
				dataServices: {
					dsType: 'cache'
				}
			});

			dmTest.get({
				mergeFilter: false,
				params: {
					age: 20
				},
				success: function(result) {
					expect(result.length).toBe(2);
					endTest();
				}
			})
		})

		it("merge filter", function(endTest) {
			var dmTest = dataManager.create('Table', {
				get: {
					update: false,
					filter: function(item) {
						return item.age === 20;
					}
				},
				dataServices: {
					dsType: 'cache'
				}
			});

			dmTest.get({
				filter: function(item) {
					return item.id === 2;
				},
				success: function(result) {
					expect(result.length).toBe(1);
					expect(result[0].name).toBe('cache2');
					endTest();
				}
			})
		})

		it("trigger - get & set", function(endTest) {
			var dmHandler = dataManager.create('Table', {
				get: {
					update: false
				},
				dataServices: {
					dsType: 'server'
				}
			});

			dmHandler.on("set", "getHandle", function(e) {
				expect(dmHandler._data[0].name).toBe('user1');

				endTest();
			})

			dmHandler.on("get", "getHandle", function(e) {
				expect(e.result.length).toBe(1);
				expect(e.result[0].name).toBe('user1');

				dmHandler.set({
					data: e.result
				});

			})

			dmHandler.get({
				params: {
					id: 1
				}
			});
		})


		it("policy - get way", function(endTest) {
			var dmTest = dataManager.create('Table', {
				get: {
					way: "ds",
					update: false
				},
				dataServices: {
					dsType: 'cache'
				}
			});

			dmTest._innerUpdate({
				data: [{
					id: 2,
					name: "userDM"
				}]
			});

			dmTest.get({
				params: {
					id: 2
				},
				success: function(result) {
					expect(result.length).toBe(1);
					expect(result[0].name).toBe('cache2');

					dmTest.get({
						way: "dm",
						params: {
							id: 2
						},
						success: function(data) {
							expect(data.length).toBe(1);
							expect(data[0].name).toBe('userDM');
							endTest();
						}
					})
				}
			})
		})

		it("policy - trigger", function(endTest) {
			var defGet,
				dmTest = dataManager.create('Table', {
					get: {
						way: "ds",
						trigger: [{
							def: true,
							dataServices: {
								dsType: 'cache'
							}
						}, {
							mergeFilter: true,
							pending: true,
							dataServices: {
								dsType: 'server'
							},
							success: function(result) {
								expect(result[0].name).toBe('user1');
								expect(defGet).toBe(true);
								expect(dmTest._data[0].name).toBe('user1');
								endTest();
							}
						}]
					}
				});

			dmTest.get({
				params: {
					id: 1
				},
				success: function(result) {
					expect(result.length).toBe(1);
					expect(result[0].name).toBe('cache1');
					defGet = true;
				}
			})
		})

		it("policy - trigger - delay", function(endTest) {
			var done, dmTest = dataManager.create('Table', {
					get: {
						way: "ds",
						trigger: [{
							def: true,
							dataServices: {
								dsType: 'cache'
							}
						}, {
							name: "delayLoad",
							mergeFilter: true,
							pending: true,
							delay: 200,
							dataServices: {
								dsType: 'server'
							},
							success: function() {
								done = true;
							}
						}]
					}
				});

			dmTest.onHandler("trigger", "triggerHandler", function(e,result, trigger) {
				expect(trigger.name).toBe("delayLoad");
				expect(done).toBe(true);
				expect(dmTest._data[0].name).toBe('user1');
				endTest();
			})

			dmTest.get({
				params: {
					id: 1
				},
				success: function(result) {
					expect(dmTest._data[0].name).toBe('cache1');
				}
			})
		})
	});
})();