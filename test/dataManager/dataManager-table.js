(function() {
	var dataServices = st.dataServices,
		dataManager = st.dataManager,
		_db = [],
		_cache = [];

	function buildFilterByParams(params) {
		if (params) {
			return function(item) {
				var check = true;
				st.each(params, function(name, value) {
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
		return st.isArray(data) ? data[0] : data;
	}
	//模拟服务端异步返回数据,只接受params
	dataServices.add("server1", {
		search: function(op) {
			setTimeout(function() {
				var result, filter = op.filter;

				result = filter ? _db.filter(filter) : _db;

				op.success && op.success(result);
			}, 100);
		},
		update: function(op) {
			setTimeout(function() {
				var filter = op.fitler,
					data = getData(op.data);

				if (filter) {
					st.each(_db, function(i, item) {
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
			if (typeof(op.filter) !== 'function')
				op.filter = buildFilterByParams(op.params);
		}
	});

	//模拟客户端本地存储s
	dataServices.add("cache1", {
		search: function(op) {
			var result, filter = op.filter;

			result = filter ? _cache.filter(filter) : _cache;

			op.success && op.success(result);
		},
		update: function(op) {
			var filter = op.filter,
				data = getData(op.data);

			if (filter) {
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
		},
		initOptions: function(op) {
			//生成fitler，当filter为obj类型时，编译成fn
			op.filter = buildFitler(op.filter);

		}
	});

	function getResult(result, field) {
		var arr = [];
		result.forEach(function(item) {
			arr.push(item[field || 'id']);
		})
		return arr.join();
	}

	describe('update', function() {

		var dt = dataManager.create("DataTable", {
			key: "id",
			dataServices: {
				dsType: "server1"
			}
		});


		beforeEach(function() {
			_db = [{
				id: 1,
				name: 'server1',
				age: 20
			}, {
				id: 2,
				name: 'server2',
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

			dt.store([{
				id: 1,
				name: 'user1',
				age: 20
			}, {
				id: 2,
				name: 'user2',
				age: 30
			}]);
		})

		it("store", function() {
			dt.store([{
				id: 0,
				name: 'user1',
				age: 10
			}]);
			expect(dt.$store.length).toBe(1);
			expect(dt.$store[0].name).toBe('user1');
		})

		it("insert", function(endTest) {
			dt.insert({
				data: {
					id: 3,
					name: 'user3',
					age: 20
				},
				success: function() {
					expect(dt.$store.length).toBe(3);
					expect(dt.$store[2].name).toBe('user3');
					endTest();
				}

			});
		})

		it("update one", function(endTest) {
			dt.updateOne({
				data: {
					age: 22
				},
				params: {
					id: 1
				},
				success: function() {
					expect(dt.$store[0].age).toBe(22);
					endTest();
				}

			});
		})

		it("update one by key", function(endTest) {
			dt.updateOne({
				data: {
					age: 30
				},
				params: 1,
				success: function() {
					expect(dt.$store[0].age).toBe(30);
					endTest();
				}
			});
		})

		it("update", function(endTest) {
			dt.update({
				data: [{
					id: 0,
					name: 'user0',
					age: 10
				}, {
					id: 1,
					name: 'user11',
					age: 12
				}, {
					id: 2,
					name: 'user22',
					age: 40
				}],
				success: function() {
					expect(getResult(dt.$store)).toBe("1,2");
					expect(getResult(dt.$store, 'name')).toBe("user11,user22");
					expect(getResult(dt.$store, 'age')).toBe("12,40");

					endTest();
				}
			});
		})

		it("save", function(endTest) {
			dt.save({
				data: [{
					id: 0,
					name: 'user0',
					age: 10
				}, {
					id: 1,
					name: 'user11',
					age: 12
				}, {
					id: 2,
					name: 'user22',
					age: 40
				}],
				success: function() {
					expect(getResult(dt.$store)).toBe("1,2,0");
					expect(getResult(dt.$store, 'name')).toBe("user11,user22,user0");
					expect(getResult(dt.$store, 'age')).toBe("12,40,10");

					endTest();
				}
			});
		})

		it("find one", function(endTest) {
			dt.findOne({
				params: {
					id: 1
				},
				success: function(result) {
					expect(result.name).toBe('user1');
				}
			});

			dt.findOne({
				params: {
					id: 0
				},
				success: function(result) {
					expect(result).toBeUndefined();
					endTest();
				}
			});
		})

		it("find one by key", function(endTest) {
			dt.findOne({
				params: 2,
				success: function(result) {
					expect(result.name).toBe('user2');
					endTest();
				}
			});
		})

		it("find", function(endTest) {

			dt.store([{
				id: 1,
				name: 'user1',
				age: 20
			}, {
				id: 2,
				name: 'user2',
				age: 30
			}, {
				id: 3,
				name: 'user2',
				age: 30
			}]);

			dt.find({
				params: {
					age: 30
				},
				success: function(result) {
					expect(getResult(result)).toBe("2,3");
					endTest();
				}
			});

		})
	});

	describe('filter', function() {
		beforeEach(function() {

			_db = [{
				name: "roy",
				age: 30,
				role: "coder",
				project: "smartjs"
			}, {
				name: "coder1",
				age: 20,
				role: "coder",
				project: "smartjs"
			}, {
				name: "sa1-ui",
				age: 33,
				role: "sa",
				project: "smartui"
			}, {
				name: "coder2-ui",
				age: 18,
				role: "coder",
				project: "smartui"
			}, {
				name: "sa2",
				age: 31,
				role: "sa",
				project: "smartjs"
			}, {
				name: "tester1-ui",
				age: 27,
				role: "tester",
				project: "smartui"
			}, {
				name: "tester2",
				age: 24,
				role: "tester",
				project: "smartjs"
			}, {
				name: "tester3",
				age: 22,
				role: "tester",
				project: "smartjs"
			}, ];

		})

		function getResult(result, field) {
			var data = [];
			result && result.forEach(function(item) {
				data.push(item[field || 'name']);
			});
			return data.join();
		}
		var dt = dataManager.create("DataTable", {
			dataServices: {
				dsType: "server1"
			}
		});

		it("one condition", function(endTest) {
			dt.find({
				filter: "name = @name",
				params: {
					name: 'roy'
				},
				success: function(result) {
					expect(getResult(result)).toBe('roy');
					endTest();
				}
			})
		})

		it("relation or", function(endTest) {
			dt.find({
				update : true,
				set : {
					updateType : "insert",
				},
				filter: "role = @sa or role = @coder",
				params: {
					sa: 'sa',
					coder: 'coder'
				},
				success: function(result) {
					expect(getResult(result, "role")).toBe('coder,coder,sa,coder,sa');
					endTest();
				}
			})
		})

		it("dm find", function(endTest) {
			dt.find({
				way : "dm",
				filter: "role = @role and age > @age",
				params: {
					role: 'sa',
					age : 20
				},
				success: function(result) {
					expect(getResult(result, "role")).toBe('sa,sa');
					endTest();
				}
			})
		})
	})
})();