define(function() {
	var dataServices = st.dataServices,
		dataManager = st.dataManager,
		_db = [],
		_cache = [];

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

	function getData(data) {
		return $.isArray(data) ? data[0] : data;
	}

	//模拟服务端异步返回数据,只接受params
	dataServices.add("server", {
		search: function(op) {
			setTimeout(function() {
				var result, filter = buildFilterByParams(op.params);
				result = filter ? _db.filter(filter) : _db;

				op.success && op.success(result);
			}, 100);
		},
		update: function(op) {
			setTimeout(function() {
				var filter = buildFilterByParams(op.params),
					data = getData(op.data);

				if (filter) {
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
		}
	});

	//模拟客户端本地存储s
	dataServices.add("cache", {
		search: function(op) {
			var result, filter = buildFitler(op.filter);
			result = filter ? _cache.filter(filter) : _cache;

			op.success && op.success(result);
		},
		update: function(op) {
			var filter = buildFitler(op.filter),
				data = getData(op.data);

			if (filter) {
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
		}
	});

	function buildFitler(filter) {
		if (filter && typeof filter === 'object') {
			return buildFilterByParams(filter);
		}
		return filter;
	}

	dataManager.add("Table", {
		init: function() {
			this._data = [];
		},
		search: function(policy) {
			var filter =policy ? buildFitler(policy.filter) : null;
			return filter ? this._data.filter(filter) : this._data;
		},
		update: function(data, policy) {
			var isUpdate, _data = this._data,
				updateData,filter;

			policy && (filter = buildFitler(policy.filter));

			if (filter) {
				updateData = getData(data);

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
		checkEmpty: function(data, filter) {
			return data === undefined || data.length === 0;
		},
		clear: function() {
			this._data = [];
		}
	});

	describe('dataServices Test', function() {
		it("update", function(endTest) {
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

		var dm1 = dataManager.create("Table");

		it("add", function() {
			expect(dataManager.find("Table")).toBeDefined();
			expect(dm1).toBeDefined();
		})

		it("update", function() {
			dm1.update([{
				name: 'user1',
				age: 10
			}]);
			expect(dm1._data.length).toBe(1);
			expect(dm1._data[0].name).toBe('user1');
		})

		it("search", function() {
			var result = dm1.search();
			expect(result.length).toBe(1);
			expect(result[0].name).toBe('user1');
		})

		it("update by filter", function() {
			dm1.update({
				name: 'user3',
				age: 10
			}, {
				filter: function(user) {
					return user.name == 'user3';
				}
			});
			expect(dm1._data.length).toBe(2);
			expect(dm1._data[1].name).toBe('user3');

			dm1.update({
				name: 'user3',
				age: 40
			}, {
				filter: function(user) {
					return user.name == 'user3';
				}
			});

			expect(dm1._data.length).toBe(2);
			expect(dm1._data[1].age).toBe(40);
		})

		it("search by filter", function() {
			var result = dm1.search({
				filter: function(user) {
					return user.name == 'user3';
				}
			});
			expect(result.length).toBe(1);
			expect(result[0].age).toBe(40);
		})

		it("search by params", function() {
			var result = dm1.search({
				filter: {
					name: 'user3'
				}
			});
			expect(result.length).toBe(1);
			expect(result[0].age).toBe(40);
		})

		it("get from ds and update", function(endTest) {
			dm1.clear();
			dm1.get({
				dataServices: {
					dsType: 'server'
				}
			}, function(result) {
				expect(result).toBeDefined();
				expect(result[0].name).toBe('user1');
				expect(dm1._data[0].name).toBe('user1');
				endTest();
			})

		})

		it("get from ds and no update", function(endTest) {
			dm1.clear();
			dm1.get({
				update: false,
				dataServices: {
					dsType: 'server'
				}
			}, function(result) {
				expect(dm1._data.length).toBe(0);
				endTest();
			})
		})

		it("set to ds", function(endTest) {
			dm1.set([{
					name: "userUpdate"
				}], {
					dataServices: {
						dsType: 'server'
					}
				},
				function(result) {
					expect(_db.length).toBe(1);
					expect(_db[0].name).toBe('userUpdate');
					endTest();
				})

		})

		it("set to ds by params", function(endTest) {
			dm1.set({
					name: "userUpdate"
				}, {
					params: {
						id: 1
					},
					dataServices: {
						dsType: 'server'
					}
				},
				function(result) {
					expect(_db.length).toBe(2);
					expect(_db[0].name).toBe('userUpdate');
					endTest();
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

			dmTest.get(function(result) {
				expect(result.length).toBe(1);
				expect(result[0].name).toBe('user1');
				expect(dmTest._data[0].name).toBe('user1');

				dmTest.set(result[0], function() {
					expect(_db[1].name).toBe('user1');
					endTest();
				})
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

			dmTest.get(function(result) {
				expect(result.length).toBe(1);
				expect(result[0].name).toBe('user1');
				expect(dmTest._data[0].name).toBe('user1');
				endTest();
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
				}
			}, function(result) {
				expect(result.length).toBe(1);
				expect(result[0].name).toBe('cache2');
				endTest();
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
				}
			}, function(result) {
				expect(result.length).toBe(2);
				endTest();
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
				}
			}, function(result) {
				expect(result.length).toBe(1);
				expect(result[0].name).toBe('cache2');
				endTest();
			})
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

			dmTest.update([{
				id: 2,
				name: "userDM"
			}]);

			dmTest.get({
				params: {
					id: 2
				}
			}, function(result) {
				expect(result.length).toBe(1);
				expect(result[0].name).toBe('cache2');

				dmTest.get({
					way: "dm",
					params: {
						id: 2
					}
				}, function(data) {
					expect(data.length).toBe(1);
					expect(data[0].name).toBe('userDM');
					endTest();
				})

			})
		})

		it("policy - trigger", function(endTest) {
			var defGet, dmTest = dataManager.create('Table', {
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
				}
			}, function(result) {
				expect(result.length).toBe(1);
				expect(result[0].name).toBe('cache1');
				defGet = true;
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

			dmTest.get({
				params: {
					id: 1
				}
			}, function(result) {
				expect(dmTest._data[0].name).toBe('cache1');
				setTimeout(function() {
					expect(done).toBe(true);
					expect(dmTest._data[0].name).toBe('user1');
					endTest();
				}, 350)
			})
		})
	});
});