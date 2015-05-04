stDefine('mvvm', function(st) {
	var trim = $.trim;
	var compileProps = {},
		compileEngine = {
			add : function(propName,name,config){
				var prop = compileProps[propName];
				if(!prop){
					prop = compileProps[propName] = st.priorityList("self");
				}
				prop.add(config);
			}
		});
	
	function extendModalByMeta(modal,name,metaModal){
		if(metaModal){
			$.each(metaModal.fields,function(field,config){
				var value;
				if(config)
				{
					config.field && (field = config.field);
					value = config.value;
				}

				st.setObj(modal,name + '.' + field,value)
			})
		}
		return modal;
	}

	function createVM(dom,pageContext){
		var vm,controller = dom.attr("st-controller");
		if(controller && (controller = pageContext.getController(controller))){
			


		}
	}

	compileEngine.add("modal","_baseModal",{
		priority : 1000,
		onCompile : function(value,elem,vm,pageContext){
			var modals = value.split(","),arr,modal,
				modalName,metaModalName,metaModal;

			modals.forEach(function(item){
				arr = item.split(":");

				if(arr.length > 1){
					modalName = trim(itemSettings[0]);
					metaModalName = trim(itemSettings[0]);
				}
				else
					modalName = metaModalName = trim(item);

				metaModal = pageContext.getMetaModal(metaModalName);
				extendModalByMeta(vm,modalName,metaModal);
			})
		}
	});

	compileEngine.add("field","_baseModal",{
		priority : 1000,
		onCompile : function(value,elem,vm,pageContext,attrs){
			
		},
		onLink : function(){

		}
	});
})