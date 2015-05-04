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
_stDefine('filterBuilder', function(st) {
	//空值忽略条件标示符
	var NullIgnoreSign = ["{", "}"],
		//关系字符
		Relations = ["and", "or"],
		isArray = st.isArray;

	/**
	   过滤生成器对象；可以使用：条件字符串；参数；方法来构建； 
	   条件字符串的过滤操作见[Operations](Operations.html)
	   @class FilterBuilder
	   @constructor
	   @param {string|function|object} filter 三种类型： 
	   1. {string}, 查询字符串
	   2. {object}, 参数对象
	   3. {function}, 过滤方法
	   @return {FilterBuilder} 返回过滤生成器对象
	   @example
	   		//定义数据
			var data = [
					{name: "roy",age: 30,role: "sa",project: "smartjs"},
					{name: "roy",age: 30,role: "coder",project: "smartdoc"},
			 		{name: "coder1", age: 20, role: "coder", project: "smartjs"}
			];
	   
	   		//查询字符串,{age > @age}用{}包含的条件表示当@age为null的时候，忽略此条件
	   		var str = "{age > @age} and (role = @sa or role = @coder) and {project = @project}";
			
			//创建字符串过滤器
			var strFilter = st.filterBuilder(str);
			
			//生成过滤方法
			var fnFilterCoder = strFilter.buildFn({
				coder : 'coder',
			});

			//过滤所有coder
			var coders = data.filter(fnFilterCoder);

			expect(coders.length).toBe(2);
			expect(coders[0].name).toBe('roy');
			expect(coders[1].name).toBe('coder1');

			//再次生成smartjs项目年纪大于20的coder或sa
			var filterFn = strFilter.buildFn({
				age : 20,
				coder : 'coder',
				sa : 'sa',
				project : 'smartjs'
			});
			
			var member = data.filter(filterFn);
			expect(member.length).toBe(1);
			expect(member[0].name).toBe('roy');
			
			
			//创建过滤器
			var paramFilter = st.filterBuilder();

			//根据参数创建过滤方法
			var filterFn2 = paramFilter.buildFn({
				name : 'coder1'
			});

			var coder1 = data.filter(filterFn2);

			expect(coder1.length).toBe(1);
			expect(coder1[0].name).toBe('coder1');
			
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
		   		var str = "age > @age and (role = @sa or role = @coder) and project = @project";
				var filter = st.filterBuilder(str);
		  
		   		//生成条件
		   		var conditions = filter.buildCondition({
		   			age : 20,
					sa : 'sa',
					coder : 'coder',
					project : "smartjs"
				})

				log(conditions);

		   		// 生成的conditions对象
		   		// {"and":[
		   		// 	 {"field":"age","operation":">","param":20},
	   			// 	 {"or":[
	   			// 		{"field":"role","operation":"=","param":"sa"},
	   			// 		{"field":"role","operation":"=","param":"coder"}
	   			// 	 ]},
		   		// 	 {"field":"project","operation":"=","param":"smartjs"}
		   		// ]}
		 */
		buildCondition: function(params) {
			if (this._conditions)
				return buildConditions(this._conditions, params);
		},
		/**
		 * 生成过滤方法
		 * @method buildFn
		 * @param  [params] {object}  过滤的参数值
		 * @param  [mergeFilter]  {string|function|object} 需要合并的过滤条件;合并全部都为and
		 * @return {function} 过滤方法
		 * @example
		 * 		var data = [
		 * 			{name : 'sa1', role : 'sa', age : 33},
		 * 			{name : 'sa2', role : 'sa', age : 25}
		 * 		];
		 * 		
		 * 		//创建role的过滤器
		 * 		var filter = st.filterBuilder("role = @role");
		 *
		 * 		//传入条件参数，并追加age的过滤
		 * 		var filterFn = filter.buildFn({role:"sa",age:30},"age > @age");
		 *
		 * 		var sa = data.filter(filterFn);
		 * 		expect(sa.length).toBe(1);
		 * 		expect(sa[0].name).toBe('sa1')
		 * 		
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
				fnFilter = compileObjectCondition(st.mix(params, self._params));

			//存在合并过滤情况下，生成合并过滤方法
			if (mergeFilter) {
				filterType = typeof(mergeFilter);
				if (filterType === 'string')
					mergeFilterFn = (new FilterBuilder(mergeFilter)).buildFn(params);
				else if(filterType === 'function')
					mergeFilterFn = mergeFilter;
			}
			//合并过滤条件
			return st.mergeFn(fnFilter, mergeFilterFn,true);
		}
	}

	//将对象参数编译成过滤方法
	function compileObjectCondition(obj) {
		return function(item) {
			var check = true;
			st.each(obj, function(name, value) {
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
			st.each(conditions, function(relation, condition) {
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
	 * 针对过滤器条件字符串的条件过滤操作；预设了基础操作；另外可以通过<code>st.extendOperation(operation,checkFn)</code>进行扩展和重写
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
		   扩展判断操作符,如：'='比较操作符,name = @name
		   @method extendOperation
		   @param  {string} operation 操作名称
		   @param  {function} checkFn   判断方法
		   @example
		   		//添加大于操作符'>'
		   		st.extendOperation('>',function(data, param) {
		   			//data为数据，param为条件参数
					return data > param;
				});
		 */
		extendOperation : function(operation,checkFn){
			Operations[operation] = checkFn;
		}
	};
})