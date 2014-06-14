define(function(){
	require(['main.js'],function(stReady){
		stReady(function(res){
            var param = location.search,start,end;

            if(param.length)
            {
                index = param.indexOf('md=') + 3;
                end = param.indexOf('&',index);
                param = param.substring(index,end > 0 ? end : param.length);
                require(['test/' + param],function(){
                    jasmine.getEnv().execute();
                });
            }

            var html = [],item;
            for(var i = 0,len = res.length;i < len;i++){
                item = res[i];
                html.push("<li", item === param ? " class='selected'>" : ">","<a href='?md=",item,"'>",item ,"</a></li>");
            }

            $('#testMenu').html(html.join(''))
        })
	})

});