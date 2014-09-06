'use strict';
/**
    过滤器生成器
    
    Feartures : 
        1. 编译字符串过滤，“name = @name and (age > @age and type = @type)”，生产过滤条件参数或者过滤方法
        2. 参数过滤，以参数的方式全部构建"="的方式构建查询方法
        3. 方法过滤
        4. 忽略null的条件
        5. 自定义扩展过滤操作符
        6. 条件&参数合并

    Update Note：
        + 2014.7 ：Created

    @module FilterBuilder
*/
stDefine('filterBuilder', function(st) {
	//空值忽略条件标示符
	var NullIgnoreSign = ["{", "}"],
		//关系字符
		Relations = ["and", "or"],
		isArray = $.isArray;

	/**
	 * 过滤生成器对象
	 * @class FilterBuilder
	 * @constructor
	 * @param {string|function|object} filter 三种类型： 
	 * 1. {string}, 查询字符串
	 * 2. {object}, 参数对象
	 * 3. {function}, 过滤方法
	 * @return {FilterBuilder} 返回过滤生成器对象
	 * @example
	 * 		//查询字符串,{age > @age}用{}包含的条件表示当@age为null的时候，忽略此条件
	 * 		var str = "{age > @age} and (role = @sa or role = @coder) and project = @project";
			
			//创建过滤器
			var filter = st.filterBuilder(str);
			
			//生成过滤方法
			var filterFn = filter.buildFn({
				age : 20,
				sa : 'sa',
				coder : 'coder',
				project : "smartjs"
			});
			
			//定义数据
			var data = [
					{name: "roy",age: 30,role: "coder",project: "smartjs"},
			 		{name: "coder1", age: 20, role: "coder", project: "smartjs"}
			];
			
			//过滤数据
			var result = data.filter(filterFn);
	 */
	function FilterBuilder(filter) {
		if (filter) {
			switch (typeof filter) {
				//查询字符串
				case "string":
					this._conditions = compileStringCondition(filter);
					break;
				//过滤方法
				case "function":
					this._filter = filter;
					break;
				//参数过滤
				case "object":
					this._params = filter;
					break;
			}
		}
	}

	FilterBuilder.prototype = {
		/**
		 * 生成条件参数,当使用查询字符串进行构建过滤器时，根据传入的参数值生产最终的带关系和操作过滤参数
		 * @method buildCondition
		 * @param  {object} params 过滤的参数值
		 * @return {object}   条件参数
		 * @example
		 * 		var str = "age > @age and (role = @sa or role = @coder) and project = @project";
				var filter = st.filterBuilder(str);
		 *
		 * 		//生成条件
		 * 		var conditions = filter.buildCondition({
		 * 			age : 20,
					sa : 'sa',
					coder : 'coder',
					project : "smartjs"
				})

		 * 		//生成的conditions对象
		 * 		{"and":[
		 * 			{"field":"age","operation":">","param":20},
	 * 				{"or":[
	 * 					{"field":"role","operation":"=","param":"sa"},
	 * 					{"field":"role","operation":"=","param":"coder"}
	 * 				]},
		 * 			{"field":"project","operation":"=","param":"smartjs"}
		 * 		]}
		 */
		buildCondition: function(params) {
			if (this._conditions)
				return buildConditions(this._conditions, params);
		},
		/**
		 * 生成过滤方法
		 * @method buildFn
		 * @param  [params] {object}  过滤的参数值
		 * @param  [mergeFilter]  {string|function|object}需要合并的过滤条件
		 * @return {function} 过滤方法
		 * @example
		 * 		//创建role的过滤器
		 * 		var filter = st.filterBuilder("role = @role");
		 *
		 * 		//传入条件参数，合并age的过滤
		 * 		filter.buildFn({role:"sa",age:20},"age > @age")
		 */
		buildFn: function(params, mergeFilter) {
			var self = this,filterType,
				conditions, fnFilter, mergeFilterFn;

			//过滤方法模式
			if (self._filter)
				fnFilter = self._filter;
			//条件生成模式
			else if (self._conditions) {
				conditions = this.buildCondition(params);
				if (conditions)
					fnFilter = buildFn(conditions)
			} else if(!mergeFilter)
				//参数过滤非合并参数模式下，根据参数创建过滤方法
				fnFilter = compileObjectCondition(st.mergeObj(params, self._params));

			//存在合并过滤情况下，生成合并过滤方法
			if (mergeFilter) {
				filterType = typeof(mergeFilter);
				if (filterType === 'string')
					mergeFilterFn = (new FilterBuilder(mergeFilter)).buildFn(params);
				else if(filterType === 'function')
					mergeFilterFn = mergeFilter;
			}
			//合并过滤条件
			return st.mergeFn(fnFilter, mergeFilterFn);
		}
	}

	//将对象参数编译成过滤方法
	function compileObjectCondition(obj) {
		return function(item) {
			var check = true;
			$.each(obj, function(name, value) {
				if (item[name] !== value) {
					check = false;
					return check;
				}
			})
			return check;
		}
	}

	//将过滤字符串编译成过滤条件对象
	function compileStringCondition(filter) {
		var groups = [],
			deep = 0,
			//条件关系链
			chain = [groups];

		filter.split('(').forEach(function(part, i) {
			if (i === 0) {
				compileGroup(chain, deep, part)
			} else {
				part.split(')').forEach(function(exp, i) {
					i > 0 ? deep-- : deep++;

					compileGroup(chain, deep, exp);
				})
			}
		})
		return groups.length ? groups : null;
		//console.log(groups);
	}

	//编译查询条件组
	function compileGroup(chain, deep, part) {
		var group, arr, condition, len = chain.length - 1;

		arr = part.split(/\s(or|and)\s/g);
		//判断开始是否存在关系表达式
		if (arr[0].length === 0 && Relations.indexOf(arr[1]) > -1) {
			arr.shift();
			chain[len].or = arr.shift() === Relations[1];
		}

		//深度大于关系链时，扩展关系链
		if (deep > len)
			group = chain[deep] = [];
		else {
			group = chain[deep];
			//深度小于关系链时，将关系链最后一项清除，添加到当前group中
			deep < len && group.push(chain.pop());
		} 

		arr.forEach(function(item, i) {
			if (item) {
				//判断为关系参数时，设置条件关系
				if (Relations.indexOf(item) > -1) {
					condition.or = item === Relations[1];
				} else {
					condition = compileConditionStr(item);
					group.push(condition);
				}
			}
		})
	}

	//编译查询条件字符串
	function compileConditionStr(condition) {
		var arr, ignoreNull = false,
			index;

		//判断是否空忽略
		if (condition.charAt(0) === NullIgnoreSign[0]) {
			index = condition.lastIndexOf(NullIgnoreSign[1]);
			if (index > 1) {
				condition = condition.substring(1, index);
				ignoreNull = true;
			} else {
				condition = condition.substring(1);
			}
		}

		arr = condition.split(' ').filter(function(item) {
			return item.length > 0;
		});

		return {
			ignoreNull: ignoreNull,
			field: arr[0],
			operation: arr[1],
			param: arr[2]
		};
	}

	//根据过滤条件组生成过滤条件
	function buildConditions(conditions, params) {
		var unit, orGroup, lastOr, or, pass, newGroup,param, len = conditions.length - 1,
			group = [],
			chain = [group];

		conditions.forEach(function(condition, i) {
			//判断是否pass模式
			if (pass) {
				pass = false;
				lastOr = condition.or;
				return;
			}

			or = condition.or;
			//判断是否为过滤条件组
			if (isArray(condition)) {
				unit = buildConditions(condition, params);
			} else {
				param = condition.param;
				//判断为过滤参数还是过滤值
				if (param.charAt(0) === '@')
					param = st.getObj(params, param.substr(1));

				//判断是否空忽略
				if (condition.ignoreNull && param == null) {
					or && (pass = true);
					unit = null;
				} else {
					unit = {
						field: condition.field,
						operation: condition.operation,
						param: param
					};
				}
			}
			if (unit) {
				if (i === len) {
					//最后一个条件和or关系下，将group设置到关系链开始
					if (or)
						group = chain[0];
				} 
				//在上一个和当前关系不一致时
				else if (i > 0 && !lastOr !== !or) {
					//当前关系为or时，提升or级别，将原有and关系组置于or关系组下
					if (or) {
						//如果存在关系链，在加深一级，否则创建关系链
						if (chain.length > 1) {
							group = chain[0];
							chain = [group];
						} else {
							chain[0] = group = [{
								and: group
							}];
						}
					} else {
						//当前为and时，创建新组，添加到前一个or关系组
						newGroup = [];
						chain.push(newGroup);
						group.push({
							and: newGroup
						});
						group = newGroup;
					}
				}
				group.push(unit);
			}
			if (or)
				orGroup = true;

			lastOr = or;
		})
		group = chain[0];
		if (group.length)
			return orGroup ? {
				or: group
			} : {
				and: group
			};
	}
	//根据条件关系生成过滤方法
	function buildFn(conditions) {
		return function(data) {
			var result = true,
				isOr;
			$.each(conditions, function(relation, condition) {
				if (!checkGroup(data, condition, relation === 'or')) {
					result = false;
				}
			})
			return result;
		}
	}

	//验证关系组条件是否匹配
	function checkGroup(data, condistions, isOr) {
		var group, result;
		condistions.some(function(condition, i) {
			if (condition.field) {
				result = compare(data, condition);
			} else {
				if (group = condition.or)
					result = checkGroup(data, group, true);
				else if (group = condition.and)
					result = checkGroup(data, group, false);
			}
			if(isOr && result)
				return true;
			else if (!isOr && !result)
				return true;
		})
		return result;
	}

	function getIndex(datas, data) {
		if (data && datas && datas.length && datas.indexOf)
			return datas.indexOf(String(data)) > -1;

		return false;
	}

	function checkStartEnd(datas, data, endOf) {
		if (data && datas && datas.length && datas.substr) {
			data = String(data);
			return (endOf ? datas.substr(datas.length - data.length) : datas.substr(0, data.length)) === data;
		}
		return false;
	}

	/**
	 * 判断操作配置对象
	 * @class Operations
	 */
	var Operations = {
		/**
		 * 非判断，在判断操作符之前加入!,则将判断结果取非
		 * @property {operation} ! 
		 * @example
		 * 		//查询name不等于'roy'的数据
		 * 		var filter = "name != 'roy'"
		 */

		/**
		 * 等于判断
		 * @property {operation} = 
		 */
		"=": function(data, param) {
			return data === param;
		},
		/**
		 * 小于判断
		 * @property {operation} < 
		 */
		"<": function(data, param) {
			return data < param;
		},
		/**
		 * 小于等于判断
		 * @property {operation} <=
		 */
		"<=": function(data, param) {
			return data <= param;
		},
		/**
		 * 大于判断
		 * @property {operation} >
		 */
		">": function(data, param) {
			return data > param;
		},
		/**
		 * 大于等于判断
		 * @property {operation} >= 
		 */
		">=": function(data, param) {
			return data >= param;
		},
		/**
		 * 参数中包含数据
		 * @property {operation} in 
		 */
		"in": function(data, param) {
			return getIndex(param, data);
		},
		/**
		 * 数据中包含参数
		 * @property {operation} like 
		 */
		"like": getIndex,
		/**
		 * 以参数为开头
		 * @property {operation} startOf 
		 */
		"startOf": checkStartEnd,
		/**
		 * 以参数为结尾
		 * @property {operation} endOf 
		 * @example
		 * 		//匹配以'es'结尾的name
		 * 		var filter = "name endOf 'es'";
		 */
		"endOf": function(data, param) {
			return checkStartEnd(data, param, true);
		}
	};

	function compare(data, condition) {
		var operation = condition.operation,check,not,result;

		//判断是否为非
		if(operation.charAt(0) === '!'){
			not = 1;
			operation = operation.substring(1);
		}

		result = (check = Operations[operation]) ? check(st.getObj(data, condition.field), condition.param) : false;

		return not ? !result : result;
	}

	return {
		filterBuilder: function(filter) {
			return new FilterBuilder(filter);
		},
		/**
		 * 扩展判断操作符,如：'='比较操作符,name = @name
		 * @method extendOperation
		 * @param  {string} operation 操作名称
		 * @param  {function} checkFn   判断方法
		 * @example
		 * 		//添加大于操作符'>'
		 * 		st.extendOperation('>',function(data, param) {
		 * 			//data为数据，param为条件参数
					return data > param;
				});
		 */
		extendOperation : function(operation,checkFn){
			Operations[operation] = checkFn;
		}
	};
});/**
    数据管理模块
    
    Feartures : 
        1. dataServices ：数据服务接口
        2. dataManager ：基于策略的数据管理基类
        3. dataPolicyManager ：数据策略管理器；

    Update Note：
        + 2014.7 ：Created

    @module DataManager
*/
stDefine('dataManager', function(st) {

	var dataManager, policyManager, dataServices,
		_config = {
			ignoreMerges: ["params", "filter", "_filterBuilder"],
			dmOp: {
				set: {},
				get: {}
			}
		},
		defFilterBuilder = st.filterBuilder(),
		promiseEvent = st.promiseEvent,
		isFunction = $.isFunction;


	/**
	 * 数据服务管理；定义了数据服务的接口和通用操作方法；不能直接使用，必须创建具体类型的数据服务； 
	 * 数据服务的定义就比较广了，可以是具体的对象方式locaStorage，IndexDB，或者是一些行为ajax，comet，websocket；也可以是根据业务规则定义的rest，cache等；
	 * @class dataServices
	 * @constructor
	 * @extends factory
	 * @example
	 * 		//注册cache的数据服务
			dataServices.add("cache", {
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
				//实现initOptions接口方法
				initOptions: function(op) {
					//生成fitler，当filter为obj类型时，编译成fn
					op.filter = buildFitler(op.filter || op.params);
				}
			});
	 */
	dataServices = st.factory({
		name: "dataServices",
		proto: {
			/**
			 * 数据服务通用操作方法；直接执行到具体的数据服务的方法上
			 * @method  operate
			 * @param  {string} type 操作类型；1. search; 2. update
			 * @param  {object} op   参数；具体参数同数据服务
			 * @param  {object} op.dsType   数据服务类型
			 * @return {object}      操作结果
			 * @example
			 * 		//执行查询cache的操作
			 * 		var result = dataServices.operate('search',{
			 * 			//设置数据服务类型为cache
			 * 			dsType : 'cache',
			 * 			//过滤参数
			 * 			fitler : {name : 'roy'},
			 * 			//换成的key，cache类型数据服务特有属性参数
			 * 			cacheKey : 'test'
			 * 		});
			 */
			operate: function(type, op) {
				var ds = this.find(op.dsType);
				if (ds) {
					if (type !== 'initOptions') {
						ds.initOptions(op);
					}
					return ds[type](op);
				} else
					throw op.dsType + ",not defined in dataServices!";
			},
			/**
			 * 执行数据服务search操作方法
			 * @method  search
			 * @param  {object} op   参数；具体参数同数据服务
			 * @param  {object} op.dsType   数据服务类型
			 * @return {object}      操作结果
			 * @example
			 * 		//使用ajax进行查询
			 * 		dataServices.search({
			 * 			//设置数据服务为ajax类型
			 * 			dsType:'ajax',
			 * 			//服务地址
			 * 			url : 'xxxx',
			 * 			//查询参数
			 * 			param : {name : 'roy'},
			 * 			//成功之后执行的方法
			 * 			success : function(result){...}
			 * 		})
			 */
			search: function(op) {
				return this.operate('search', op);
			},
			/**
			 * 执行数据服务update操作方法
			 * @method  update
			 * @param  {object} op   参数；具体参数同数据服务
			 * @param  {object} op.dsType   数据服务类型
			 * @return {object}      操作结果
		 	 * @example
			 * 		//使用rest进行更新
			 * 		dataServices.update({
			 * 			//设置数据服务为ajax类型
			 * 			dsType:'rest',
			 * 			//rest服务地址
			 * 			url : 'user/update/{id}',
			 * 			//更新参数
			 * 			param : {id : 1 ,name : 'roy'},
			 * 			//成功之后执行的方法
			 * 			success : function(result){...}
			 * 		})
			 */
			update: function(op) {
				return this.operate('update', op);
			}
		},
		/**
		 * 数据服务基类
		 * @class baseDataService
		 */
		base: {
			/**
			 * 查询操作接口  **[接口方法]**
			 * @method  search
			 * @param  {object} op   参数；其他具体参数同见具体数据服务
			 *    @param  {object} op.filter   过滤器
			 *    @param  {object} op.success   成功之后执行的方法
			 *    @param  {object} op.error   失败之后执行的方法
			 * @return {object}      操作结果
			 */
			search: function(op) {},
			/**
			 * 更新操作接口 **[接口方法]**
			 * @method  update
			 * @param  {object} op   参数；其他具体参数同见具体数据服务
			 *    @param  {object} op.filter   过滤器
			 *    @param  {object} op.data   更新数据
			 *    @param  {object} op.success   成功之后执行的方法
			 *    @param  {object} op.error   失败之后执行的方法
			 * @return {object}      操作结果
			 */
			update: function(op) {},
			/**
			 * 通用初始化参数接口 **[接口方法]**
			 * @method  initOptions
			 * @param  {object} op   参数；其他具体参数同见具体数据服务
			 *    @param  {object} op.filter   过滤器
			 *    @param  {object} op.success   成功之后执行的方法
			 *    @param  {object} op.error   失败之后执行的方法
			 * @return {object}      参数
			 */
			initOptions: function(op) {}
		}
	})

	/**
	 * 数据管理器工厂
	 * @class dataManager
	 * @constructor
	 * @extends factory
	 * @example
	 *
	 */
	dataManager = st.factory({
		name: "dataManager",
		type: "class",
		proto: {
			/**
			 * 创建数据管理器
			 * @method create
			 * @param  {string} type 数据管理器类型
			 * @param  {object} op   数据管理参数设置
			 * @return {dataManager}     数据管理对象
			 */
			create: function(type, op) {
				var dm = this.find(type);
				if (dm)
					return new dm(op);
				else
					console.log(type + ",not defined in dataManager");
			}
		},
		/**
		 * 数据管理器基类
		 * @class baseDataManager
		 */
		base: {
			/**
			 * 是否过滤模式
			 * @type {Boolean} _filterMode
			 */
			_filterMode: true,
			//_operations : ["get","set"],
			/**
			 * 数据管理对象的类初始化方法；
			 * @method klassInit
			 * @final
			 * @param op {object}  数据管理设置参数
			 * @return {dataManager}   初始化完成的数据管理对象
			 */
			klassInit: function(op) {
				var dm = st.attachTrigger(this);

				op = dm.op = st.mergeObj(op, _config.dmOp);

				initPolicy(dm, op.get, 'get');
				initPolicy(dm, op.set, 'set');

				initFlow(dm);
				policyManager.applyPolicy(dm, dm._Flow, op);
				this.init(op);
			},
			/**
			 * 数据管理对象的初始化接口方法 **[接口方法]**
			 * @method init
			 * @param  op {object} 数据管理设置参数
			 */
			init: function(op) {},
			/**
			 * 使用dataManager的数据通道进行获取数据
			 * @method get
			 * @param  conf {object} 获取设置参数
			 * @return {object|promise}   查询结果或者promise
			 */
			get: function(conf) {
				var dm = this;
				conf = initConf(dm, conf);
				return whenFlow(dm._Flow.boot(dm, dm.op, conf.policy), conf.success, conf.error);
			},
			/**
			 * 使用dataManager的数据通道进行设置数据
			 * @method set
			 * @param  conf {object} 设置参数
			 * @return {object|promise}   设置结果或者promise
			 */
			set: function(conf) {
				var dm = this;
				conf = initConf(dm, conf);
				return whenFlow(dm._Flow.bootWithStart("setData", [dm, dm.op, conf.policy]), conf.success, conf.error);
			},
			/**
			 * 使用dataManager内置查询(即只在dataManager内部查询，不查询dataService)接口. **[接口方法]**
			 * @method _innerSearch
			 * @param  conf {object} 获取设置参数
			 * @return {object}   查询结果
			 */
			_innerSearch: function(conf) {

			},
			/**
			 * 使用dataManager内置更新(即只在dataManager内部更新，不更新到dataService)接口. **[接口方法]**
			 * @method _innerUpdate
			 * @param  conf {object} 设置参数
			 * @return {object}   设置结果
			 */
			_innerUpdate: function(conf) {

			},
			/**
			 * 检查数据是否为空;数据策略的判断空数据会根据此方法的结果来判断;不同类型的数据管理的判断也不同。
			 * 如：object判断是否为undefined;table判断数据的长度是否大于0
			 * @method checkEmpty
			 * @param  data {object} 检查的数据
			 * @param  conf {object} 设置参数
			 * @return {[type]}  判断是否为空
			 */
			checkEmpty: function(data, conf) {
				return data === undefined;
			},
			//验证方法
			validate: function() {

			},
			/**
			 * 清空数据管理内的数据的方法. **[接口方法]**
			 * @method clear
			 */
			clear: function() {
			},
			/**
			 * 设置dataService的参数,在每次使用数据通道时执行. **[接口方法]**
			 * @method setDataSerive
			 * @param config {object} 设置dataService的参数
			 */
			setDataSerive: function(config) {},
			/**
			 * 初始化策略参数
			 * @method initPolicy
			 * @param  policy {object} 策略设置
			 * @param  type  {type}  操作类型. 
			 *  1. get; 
			 *  2. set;
			 */
			initPolicy: function(policy, type) {
				if (this._filterMode) {
					policy._filterBuilder = policy.filter ? st.filterBuilder(policy.filter) : defFilterBuilder;
				}
			},
			/**
			 * 生成传递的参数
			 * @method buildParam
			 * @param  policy {object}    策略设置
			 * @param  defPolicy {object} 默认的策略设置
			 */
			buildParams: function(policy, defPolicy) {
				buildParams(this, policy, defPolicy);
			},
			/**
			 * 生成策略，对策略参数进行初始化，生成传递参数，合并参数
			 * @method  buildPolicy
			 * @param  policy {object}    策略设置
			 * @param  defPolicy {object}  默认的策略设置
			 */
			buildPolicy: function(policy, defPolicy) {
				this.buildParams(policy, defPolicy)
				st.mergeObj(policy, defPolicy, _config.ignoreMerges);
			}
		}
	});

	function initFlow(dm) {
		dm._Flow = st.flowController({
			flow: {
				buildGetPolicy: function(e, dm, op, policy, isTrigger) {
					//合并策略
					dm.buildPolicy(policy, op.get);
				},
				getData: function(e, dm, op, policy, isTrigger) {
					var result = searchDM(dm, policy);
					e.__getDone = true;
					if (checkEmpty(dm, result, policy)) {
						e.next("getFromDs");
					} else {
						e.next("getFromDm");
					}
					return result;
				},
				getFromDm: function(e, dm, op, policy, isTrigger) {
					var result = e.__getDone ? e.result : searchDM(dm, policy);
					if (!policy.update)
						e.end();

					return result;
				},
				getFromDs: function(e, dm, op, policy, isTrigger) {
					var success, ds = getDs(policy, op);
					if (ds) {
						success = function(result) {
							if (policy.update !== false) {
								dm.set(buildGetSetPolicy(dm, result, policy,
									function(result) {
										e.end().resolve(result);
									}, e.reject));

							} else {
								e.end().resolve(result);
							}
						}

						openDatatransfer('search', ds, dm, policy, success, e.reject);
						return e.promise();
					} else {
						e.end().resolve(searchDM(dm, policy));
					}
				},
				setData: function(e, dm, op, policy, isTrigger) {
					//合并策略
					dm.buildPolicy(policy, op.set);
					e.next(policy.way === 'ds' ? 'setToDs' : 'setToDm');
				},
				setToDm : function(e, dm, op, policy, isTrigger){
					if(policy.way !== 'dm')
						e.next('setToDs');
					return dm._innerUpdate(policy);;
				},
				setToDs: function(e, dm, op, policy, isTrigger) {
					var success, error, ds = getDs(policy, op),
						isPending = policy.pending !== false;

					if (ds) {
						if (isPending) {
							success = e.resolve;
							error = e.reject;
						} else {
							e.resolve(data);
						}

						openDatatransfer('update', ds, dm, policy, success, error);

						if (isPending)
							return e.promise();
					}
				}
			},
			order: ["buildGetPolicy", "getData", "setData"],
			trigger: true
		});
	}

	function initPolicy(dm, policy, type) {
		if (policy) {
			dm.initPolicy(policy, type);
			if (policy.get && (type === 'get' || type === 'trigger'))
				dm.initPolicy(policy.get, 'set');
		}
	}

	/*初始化dm的get，set配置*/
	function initConf(dm, conf) {
		if (!conf) {
			conf = {};
		}
		var success = conf.success,
			error = conf.error;

		conf.success = null;
		conf.error = null;

		return {
			policy: conf,
			success: success,
			error: error
		};
	}

	function checkEmpty(dm, data, policy) {
		return (dm.op.checkEmpty || dm.checkEmpty)(data, policy)
	}

	function whenFlow(fireResult, success, error) {
		var d = $.Deferred();
		$.when(fireResult).done(function(result) {
			success && success(result);
			d.resolve(result);
		}).fail(function(err) {
			error && error(err);
			d.resolve(err);
		})
		return d.promise();
	}

	function buildParams(dm, policy, mgPolicy) {
		if(policy._$builded)
			return;
		
		var mgParams, pType, params = policy.params;

		//条件参数处理
		if (isFunction(params)) {
			params = policy.params = params.apply(null, [dm, policy]);
		}

		if (mgPolicy && policy.mergeFilter !== false) {
			mgParams = mgPolicy.params;

			if (isFunction(mgParams)) {
				mgParams = mgParams.apply(null, [dm, policy]);
			}

			if (params) {
				pType = typeof params;
				if (pType === typeof mgParams && pType === 'object') {
					//合并条件参数
					st.mergeObj(params, mgParams);
				}
			} else {
				policy.params = mgParams;
			}
		}
		if (dm._filterMode) {
			var filterBuilder = mgPolicy && mgPolicy._filterBuilder || defFilterBuilder;
			policy.filter = filterBuilder.buildFn(policy.params, policy.filter);
		}
		policy._$builded = true;
	}

	function buildGetSetPolicy(dm, data, policy, success, error) {
		var setPolicy = {
			data: data,
			filter: policy.filter,
			params: policy.params,
			way: 'dm',
			pending: false,
			success: success,
			error: error
		};

		if (policy.set) {
			dm.buildPolicy(policy.set, setPolicy);
			return policy.set
		}
		return setPolicy;
	}

	function searchDM(dm, policy) {
		return dm._innerSearch(policy);
	}

	function getDs() {
		var args = arguments,
			len = args.length,
			i = 0,
			ds,arg;

		for (; i < len; i++) {
			if ((arg = args[i]) && (ds = arg.dataServices))
				return ds;
		};
	}

	/*开启数据传输*/
	function openDatatransfer(type, ds, dm, policy, success, error) {
		var dsOp, fnDsQueue, i = 0;

		function buildDsOp(op) {
			var conf = $.extend(true, {}, op, policy);
			conf.success = success;
			conf.error = error;
			dm.setDataSerive(conf);
			return conf;
		}
		if ($.isArray(ds)) {
			fnDsQueue = function() {
				if (dsOp = ds[i++]) {
					dsOp = buildDsOp(dsOp);
					dsOp.success = function(result) {
						checkEmpty(dm, result, policy) ? fnDsQueue() : success(result);
					}
					dataServices.operate(type, dsOp);
				} else
					success(data);
			}
			fnDsQueue();
		} else
			dataServices.operate(type, buildDsOp(ds));
	}

	//策略管理器
	policyManager = st.factory({
		name: "DataPolicyManager",
		type: 'copy',
		proto: {
			applyPolicy: function(dm, flow, op) {
				this.fire('init', [dm, flow, op]);
			}
		},
		base: {
			init: function(dm, flow, op) {

			}
		}
	});

	policyManager.add("getWay", {
		init: function(dm, flow, op) {
			flow.onBefore("getData", "checkGetWay", function(e, dm, op, policy) {
				var way = policy.way,
					node;
				if (way) {
					if (way === 'ds') {
						node = 'getFromDs';
					} else if (way === 'dm') {
						node = 'getFromDm';
					}
					node && e.next(node).stop();
				}
			})

		}
	});

	/*判断并设置定时器*/
	function checkTimer(id, timer, fn, dm) {
		if (!timer)
			return fn;

		var timers = dm.__timers;
		if (!__timers) {
			timers = dm.__timers = {};
			dm.stopTimer = function(id) {
				var ts = this.__timers,
					no;
				if ($.isEmptyObject(ts))
					return;

				if (id) {
					if (no = ts[id]) {
						ts[id] = null;
						clearInterval(no);
					}
				} else {
					$.each(ts, function(i, no) {
						no && clearInterval(no);
					});
					this.__timers = {};
				}

			}
		}
		return function() {
			timers[id] = setInterval(fn, timer)
		}
	}

	/*解析Trigger*/
	function compileTrigger(i, conf, dm, flow, op) {
		var flowNode, fnRemove, conf = initConf(dm,conf),
			trPolicy = conf.policy,
			isDef = trPolicy.def,
			setPolicy = trPolicy.set,
			pos = trPolicy.position,
			delay = trPolicy.delay || 0,
			timer = trPolicy.timer,
			userfulLife = trPolicy.userfulLife;

		initPolicy(dm, trPolicy, 'trigger');

		//判断注入的流程节点
		flowNode = trPolicy.def ? "buildGetPolicy" : (pos === "get" ? "getData" : (pos === "dm" ? "getFromDm" : "getFromDs"));

		//注入Handler
		// success = st.mergeFn(trPolicy.success, function(result) {
		// 	dm.fireHandler("trigger", [result, trPolicy]);
		// });

		//有效期
		if (userfulLife) {
			if (userfulLife === "once") {
				fnRemove = function() {
					return true;
				}
			} else if (isFunction(userfulLife)) {
				fnRemove = userfulLife;
			}
		}

		flow.on(flowNode, "trigger", function(e, dm, op, policy, isTrigger) {
			var fnRequest, ds, _policy, fnSuccess;
			if (isTrigger)
				return;

			//默认时与get动作policy合并
			if (isDef) {
				dm.buildPolicy(policy, trPolicy);
				return;
			}

			_policy = $.extend({
				mergeFilter: false,
				way: 'ds',
			}, trPolicy);

			//合并filter
			buildParams(dm, _policy, policy);

			fnRequest = function() {
				whenFlow(dm._Flow.bootWithStart("getData", [dm, dm.op, _policy, true]), conf.success, conf.error).always(function(result) {
					dm.fireHandler("trigger", [result, _policy]);
				});
			}

			setTimeout(checkTimer(i, timer, fnRequest, dm), delay);
		})
	}

	//添加触发器
	policyManager.add("trigger", {
		init: function(dm, flow, op) {
			var trigger = op.get && op.get.trigger;
			if (trigger) {

				$.each(trigger, function(i, trPolicy) {
					compileTrigger(i, trPolicy, dm, flow, op);
				});
				op.get.trigger = null;
			}
		}
	});

	return {
		dataManager: dataManager,
		dataPolicyManager: policyManager,
		dataServices: dataServices
	};
});/**
    针对于表类型的数据进行管理
    
    Feartures : 
        1. 提供CRUD接口
        2. 内置状态控制


    Update Note：
        + 2014.7 ：Created

    @module DataManager
    @submodule DataManager-Table
*/
stDefine("dataManager-table", function(st) {
	var isArray = $.isArray,
		isPlainObj = $.isPlainObject,
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
				result :　"result"
			}
		};

	st.dataManager.add("DataTable", {
		init: function(op) {
			var dm = this;
			st.mergeObj(true, op, _dtConfig);

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
			$.extend(op.pageInf,pageInf);
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
					$.extend(item, data);

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
				st.mergeObj(pageinf, _dtConfig.pageInf);
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