define(function() {
	var filter, result, datas = [{
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

	function filterData(query, params, field) {
		var checkFn, result = [];
		checkFn = query.buildFn(params);
		datas.filter(checkFn).forEach(function(item) {
			result.push(item[field || 'name']);
		});
		return result.join();
	}

	describe('string condition', function() {
		var str;
		it("single condition", function() {
			str = "name = @name";
			filter = st.filterBuilder(str);
			result = filterData(filter,{
				name : 'roy'
			});
			expect(result).toBe('roy');

		})

		it("multi condition", function() {
			str = "role = @sa or role = @coder";
			filter = st.filterBuilder(str);
			result = filterData(filter,{
				sa : 'sa',
				coder : 'coder'
			},"role");
			expect(result).toBe('coder,coder,sa,coder,sa');
		})

		it("group", function() {
			str = "age > @age and (role = @sa or role = @coder) and project = @project";
			filter = st.filterBuilder(str);
			result = filterData(filter,{
				age : 20,
				sa : 'sa',
				coder : 'coder',
				project : "smartjs"
			});
			expect(result).toBe('roy,sa2');
		})

		it("ignore null condition", function() {
			str = "{name = @name} and {role = @role} and project = @project";
			filter = st.filterBuilder(str);
			result = filterData(filter,{
				role : "tester",
				project : "smartjs"
			});
			expect(result).toBe('tester2,tester3');

			//去掉role，只有project生效
			result = filterData(filter,{
				project : "smartui"
			},'project');
			expect(result).toBe('smartui,smartui,smartui');
		})

		it(">= and <=", function() {
			str = "age >= @minAge and age <= @maxAge";
			filter = st.filterBuilder(str);
			result = filterData(filter,{
				minAge : 20,
				maxAge : 30
			},"age");
			expect(result).toBe('30,20,27,24,22');
		})

		it("in", function() {
			str = "role in @roles";
			filter = st.filterBuilder(str);
			result = filterData(filter,{
				roles : ["sa","coder"]
			},"role");
			expect(result).toBe('coder,coder,sa,coder,sa');
		})

		it("like", function() {
			str = "name like @sign";
			filter = st.filterBuilder(str);
			result = filterData(filter,{
				sign : "1"
			});
			expect(result).toBe('coder1,sa1-ui,tester1-ui');
		})

		it("startOf", function() {
			str = "name startOf @name";
			filter = st.filterBuilder(str);
			result = filterData(filter,{
				name : "tester"
			});
			expect(result).toBe('tester1-ui,tester2,tester3');
		})

		it("endOf", function() {
			str = "name endOf @name";
			filter = st.filterBuilder(str);
			result = filterData(filter,{
				name : "-ui"
			});
			expect(result).toBe('sa1-ui,coder2-ui,tester1-ui');
		})
	})

	// describe("other type of condition",function(){
	// 	it("function", function() {

	// 		filter = st.filterBuilder(function(data){
	// 			return data.name === 'roy';
	// 		});
	// 		result = filterData(filter);

	// 		expect(result).toBe('roy');
	// 	})

	// 	it("object", function() {

	// 		filter = st.filterBuilder({
	// 			role : 'sa'
	// 		});
	// 		result = filterData(filter);

	// 		expect(result).toBe('sa1-ui,sa2');

	// 		//合并条件
	// 		result = filterData(filter,{
	// 			age : 33
	// 		});

	// 		expect(result).toBe('sa1-ui');

	// 		//重写条件
	// 		result = filterData(filter,{
	// 			role : 'tester',
	// 			project : 'smartui'
	// 		});

	// 		expect(result).toBe('tester1-ui');
	// 	})
	// })


	//var str = "name = @name and age > @age1 or type = @type and project = @project";
	// var str = "name = @name or age > @age1 and type = @type or project = @project";
	// var str = "name = @name and (age > @age1 or type = @type) and project = @project";
	// var filter = st.filterBuilder(str);
	// console.log(filter._conditions);
	// console.log(JSON.stringify(buildConditions(filter._conditions)))

	// function buildConditions(conditions, params) {
	// 	var unit, orGroup, lastOr, or, pass, newGroup, len = conditions.length - 1,
	// 		group = [],
	// 		chain = [group];

	// 	conditions.forEach(function(condition, i) {

	// 		if (pass) {
	// 			pass = false;
	// 			lastOr = condition.or;
	// 			return;
	// 		}

	// 		or = condition.or;
	// 		if (isArray(condition)) {
	// 			unit = buildConditions(condition, params);
	// 		} else {
	// 			param = condition.param;
	// 			if (param.charAt(0) === '@')
	// 				param = st.getObj(params, param.substr(1));

	// 			if (condition.ignoreNull && param == null) {
	// 				or && (pass = true);
	// 				unit = null;
	// 			} else {
	// 				unit = {
	// 					field : condition.field,
	// 					operation : condition.operation,
	// 					param : param
	// 				};
	// 			}
	// 		}
	// 		if (unit) {
	// 			if (i === len) {
	// 				if (or)
	// 					group = chain[0];
	// 			} else if (i > 0 && !lastOr !== !or) {
	// 				if (or) {
	// 					if (chain.length > 1) {
	// 						group = chain[0];
	// 						chain = [group];
	// 					} else {
	// 						chain[0] = group = [{
	// 							and: group
	// 						}];
	// 					}
	// 				} else {
	// 					newGroup = [];
	// 					chain.push(newGroup);
	// 					group.push({
	// 						and: newGroup
	// 					});
	// 					group = newGroup;
	// 				}
	// 			}
	// 			group.push(unit);
	// 		}
	// 		if (or)
	// 			orGroup = true;

	// 		lastOr = or;
	// 	})
	// 	group = chain[0];
	// 	if (group.length)
	// 		return orGroup ? {
	// 			or: group
	// 		} : {
	// 			and: group
	// 		};
	// }

})