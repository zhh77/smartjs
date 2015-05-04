/**
    针对于表类型的数据进行管理
    
    Feartures : 
        1. 提供CRUD接口
        2. 内置状态控制


    Update Note：
        + 2014.7 ：Created

    @module DataManager
    @submodule DataManager-Table
*/
_stDefine("dataManager-table", function(st) {
	var isArray = st.isArray,
		isPlainObj = st.isPlainObject,
		_states = ["_$new", "_$selected", "_$updated", "_$deleted"],
		_dtConfig = {
			//分页设置
			pageInf: {
				pageSize: 20,
				groupSize: 20,
				page : 1,
				total: 0
			},
			getField : {
				pageInf : "pageInf",
				result :"result"
			}
		};

	st.dataManager.add("DataTable", {
		init: function(op) {
			var dm = this;
			st.mix(true, op, _dtConfig);

			dm.$store = [];

			if (op.crud) {
				dm.crud.forEach(function(type, conf) {
					dm.initPolicy(conf);
					conf.set && dm.initPolicy(conf.set);
				})
			} else
				op.crud = {};

			//注册处理设置数据方法
			dm._Flow.onBefore("setData", "handleResult", handleResult);
		},
		getKey: function() {
			return this.op.key;
		},
		checkEmpty: function(data, filter) {
			return data == null || data.length === 0;
		},
		clear: function() {
			this.$store = [];
		},
		_innerUpdate: function(config) {
			if (!config)
				return;

			var isReplace = config.updateMode === 'replace',
				updateType = config.updateType,
				filter = config.filter,
				dm = this,
				data = config.data,
				store = dm.$store,
				isOneData = !isArray(data);

			if (updateType === 'find')
				updateFindData(dm, data);
			else if (updateType === 'insert') {
				insertData(dm, data);
			} else if (updateType === 'delete') {
				deleteData(dm, config);
			} else {
				(isArray(data) ? updateData : updateOneData)(dm, data, config, isReplace, updateType === 'save');
			}
			return data;
		},
		store: function(data) {
			if (checkArray(data)) {
				this.$store = data;
			}
		},
		//单条数据更新
		updateOne: function(config) {
			if (!config)
				return;

			buildParamByOne(this, config);
			return this.update(config);
		},
		update: function(config) {
			buildCRUDConfig(this, 'update', config);
			return this.set(config);
		},
		insert: function(config) {
			buildCRUDConfig(this, 'insert', config);
			return this.set(config);
		},
		save: function(config) {
			buildCRUDConfig(this, 'save', config);
			return this.set(config);
		},
		_innerSearch: function(config) {
			return findDm(this, config);
		},
		findOne: function(config) {
			var success;
			if (config) {
				buildParamByOne(this, config);
				success = config.success;
			} else {
				config = {};
			}

			if (success) {
				config.success = function(data) {
					success(data && data[0]);
				}
			}
			return this.find(buildCRUDConfig(this, 'findOne', config, true));
		},
		find: function(config) {
			buildCRUDConfig(this, 'find', config, true)
			initFindConfig(this.op, config);
			return this.get(config);
		},
		removeOne: function(config) {
			if (!config)
				return;

			buildParamByOne(this, config);
			return this.remove(config);
		},
		remove: function(config) {
			return this.update(buildCRUDConfig(this, 'remove', config));
		},
		findWithStates: function(states, config) {
			var stateFilter = [];

			states.forEach(function(state) {
				result[state] = [];
			})

			stateFilter = function(item) {
				states.some(function(state) {
					if (item[state]) {
						result[state].push(item);
						return true;
					}
				})
			}
			return result;
		},
		findByState: function(state, config) {

		},
		setDataSerive: function(conf) {

		}
	});

	function checkArray(data) {
		if (isArray(data))
			return true;

		console.log("存储的数据不正确！");
	}

	function buildCRUDConfig(dm, type, conf, isFind) {
		var defConf = dm.op.crud[type];
		if (!conf)
			conf = {};

		defConf && dm.buildPolicy(conf, defConf);

		if (!isFind && conf.updateType == null)
			conf.updateType = type;

		return conf;
	}

	function initFindConfig(op, config) {
		var changed, pageInf = config.pageInf,
			oldPageInf = op.pageInf;

		if (config.update && !config.updateType)
			config.updateType = 'find';

		if (config.way)
			return;

		if(pageInf && checkChanged(pageInf,oldPageInf,["page","pageSize"]))
			changed = true;
		else
			changed = checkChanged(config,op,["order","group"]);;

		changed && (config.way = 'ds');
	}

	function checkChanged(obj,oldObj,fields){
		var value,changed;
		fields.some(function(field){
			value = obj[field];
			if((value != null) && value == oldObj[field]){
				changed = true;
				return true;
			}
		})
		return changed;
	}

	//生成操作单个的param
	function buildParamByOne(dm, policy) {
		var params, key, keyValue, type;

		if (policy && (params = policy.params) != null) {
			type = typeof params;
			if (type !== 'function') {
				if (type !== 'object' && (key = dm.getKey())) {
					keyValue = params;
					policy.params = params = {};
					params[key] = keyValue;
				}
			}
		}
	}

	function handleResult(e, dm, op, policy, isTrigger) {
		var data = policy.data,pageInf;
		if(data && (pageInf = data[op.getField.pageInf])){
			st.mergeObj(op.pageInf,pageInf);
			policy.data = data[op.getField.result];
		}
	}

	function updateFindData(dm, data) {
		dm.store(data || []);
	}

	function insertData(dm, data) {
		var store = dm.$store;
		if (isArray(data))
			dm.$store = store.concat(data);
		else
			store.push(data);
	}

	function updateItemByFilter(store, data, filter, isReplace) {
		var isUpdated;
		//根据条件检索
		store.forEach(function(item, i) {
			if (filter(item, i)) {
				if (isReplace)
					store[i] = data;
				else
					st.mergeObj(item, data);

				isUpdated = true;
				return false;
			}
		})
		return isUpdated;
	}

	function updateOneData(dm, data, config, isReplace, saveMode) {
		var isUpdated, store = dm.$store;

		if (store.length && config.filter) {
			isUpdated = updateItemByFilter(store, data, config.filter, isReplace);
		}

		//没有更新时插入数据
		saveMode && isUpdated || insertData(dm, [data]);
		return true;
	}

	function updateData(dm, data, config, isReplace, saveMode) {
		var filter, store = dm.$store,
			key = dm.getKey(),
			keyValue, updateNum = 0;

		if (store.length && key) {
			//通过Key来更新
			data.forEach(function(updateItem, i) {
				keyValue = updateItem[key];
				if (!updateItemByFilter(store, updateItem, function(item) {
					return item[key] === keyValue;
				}, isReplace)) {
					//找不到更新项时，插入数据
					if (saveMode) {
						updateNum++;
						insertData(dm, updateItem);
					}
				} else
					updateNum++;
			})
		} else if (saveMode) {
			insertData(dm, data);
			updateNum = data.length;
		}
		return updateNum;
	}

	function findDm(dm, config) {
		var store = dm.$store,
			result = [];

		if (store.length === 0)
			return result;

		if (config && config.filter) {
			forEachByFitler(store, config, function(item) {
				result.push(item);
			}, true);
			return result;
		}
		return result.concat(store);
	}

	function forEachByFitler(data, config, handle, filterMode) {
		var filter, pageInf, index,
			start = 0,
			end = data.length,
			item;

		if (end === 0)
			return;

		if (config) {

			filter = config.filter;
			//判断filterMode下，filter为空时退出
			if (!filter && filterMode)
				return;

			pageInf = config.pageInf;
			//根据分页信息设置检索范围
			if (pageInf && pageInf.page) {
				st.mix(pageinf, _dtConfig.pageInf);
				start = (pageInf.page - 1) * pageInf.pageSize;
				start + pageInf.pageSize > end && (end = start + pageInf.pageSize);
			}
		}

		if (filter) {
			for (; start < end; start++) {
				item = data[start];
				if (filter(item, start, data)) {
					index = handle(item, start, data);
					if (index != null) {
						start = index;
					}
				}
			}
		} else {
			for (; start < end; start++) {
				index = handle(item, start, data);
				if (index != null) {
					start = index;
				}
			}
		}
	}

	function deleteData(dm, config) {
		var filter, store = dm.$store,
			count = 0,
			start = 0,
			end = store.length,
			index, item, handle;

		if (end === 0)
			return;

		if (config && (filter = config.filter)) {
			if (config.preDelete) {
				handle = function(item, index) {
					setState(item, _states[3], true);
				}
			} else {
				handle = function(item, index) {
					store.splice(index, 1);
					count++;
					return --index;
				}
			}
			forEachByFitler(store, config, handle, true);
		} else
			dm.$store = [];

		return count;
	}

	function setState(item, type, value) {
		item[type] = value;
	}
})

// policy = {
// 	get: {
// 		//获取的方式，auto默认方式；dm，只用dm获取；ds，从
// 		way: ""
// 	},
// 	set: {

// 	},
// 	dataServices: [{
// 		//数据服务类型
// 		dsType: str,
// 		//过滤参数
// 		param： obj,
// 		//过滤器
// 		fitler: fn | obj
// 		//更新的数据
// 		data： obj,
// 		//成功以后执行的方法
// 		success: success,
// 		//失败以后执行的方法
// 		error: error

// 	}]
// }

// //服务端的user数据转成前端model数据
// var userData = {
// 	id: 1,
// 	name: "user1",
// 	age: 20,
// 	role: "tester"，
// 	//关联projectid
// 	projectId： 1
// }
// //项目数据的model数据
// var projectData = {
// 	id: 1
// 	name: "smartjs",
// 	ver： "0.3"
// }

// //创建一个object的对象
// var user = dataManager.create("object", {
// 	//设置主键字段
// 	key: "id",
// 	//get动作的策略
// 	get: {
// 		//定义数据服务
// 		dataServices: {
// 			//ajax数据服务
// 			dsType: "ajax",
// 			//默认的请求url地址；根据id查询
// 			url: "services/user/{id}",
// 			//url规则映射
// 			fieldMapping: {
// 				//project的查询地址
// 				project: "services/project/{projectId}"
// 			}
// 		}
// 	}
// })

// //首先通过id=1的条件，查询user
// user.get({
// 	//设置查询参数，默认匹配key字段
// 	params: 1,
// 	//执行成功，数据填充到dm，并执行成功方法
// 	success: function(result) {
// 		//进行数据渲染
// 		renderUser(result);
// 	}
// })

// //当需要查询项目信息时
// user.get({
// 	//查询的字段；dm会根据field匹配到fieldMapping的ajax设置，从而拿到数据
// 	field: "project",
// 	//执行成功，数据填充到dm，并执行成功方法
// 	success: function(result) {
// 		//进行数据渲染
// 		renderProject(result);
// 	}
// })

// //如果采用第二种方式，我们在查询玩user后，想延迟10s在加载project信息，那么应该怎么做？
// //答案是:使用dataManager的trigger

// var user = dataManager.create("object", {
// 	//设置主键字段
// 	key: "id",
// 	//get动作的策略
// 	get: {
// 		//定义数据服务
// 		dataServices: {
// 			//ajax数据服务
// 			dsType: "ajax",
// 			//默认的请求url地址；根据id查询
// 			url: "services/user/{id}"
// 		},
// 		//定义触发器
// 		trigger: [{
// 			name: "get project",
// 			//延迟10s
// 			delay: 10000,
// 			field: "project",
// 			dataServices: {
// 				//ajax数据服务
// 				dsType: "ajax",
// 				//project的查询地址
// 				url: "services/project/{projectId}",
// 			},
// 			//触发器执行成功，数据填充到dm数据的project字段中，并执行成功方法
// 			success: function(result) {
// 				//进行数据渲染
// 				renderProject(result);
// 			}
// 		}]
// 	}
// })
// //首先通过id=1的条件，查询user
// user.get({
// 	//设置查询参数，默认匹配key字段
// 	params: 1,
// 	//执行成功，数据填充到dm，并执行成功方法
// 	success: function(result) {
// 		//进行数据渲染
// 		renderUser(result);
// 	}
// })