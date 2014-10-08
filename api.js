YUI.add("yuidoc-meta", function(Y) {
   Y.YUIDoc = { meta: {
    "classes": [
        "EventArg",
        "EventArg(flowController)",
        "EventArg(trigger)",
        "FilterBuilder",
        "Operations",
        "attachTrigger",
        "baseDataManager",
        "baseDataService",
        "dataManager",
        "dataServices",
        "factory",
        "flowController",
        "klass",
        "klassBase",
        "priorityList",
        "promiseEvent",
        "util"
    ],
    "modules": [
        "AOP",
        "DataManager",
        "DataManager-Table",
        "FilterBuilder",
        "OOP",
        "Util"
    ],
    "allModules": [
        {
            "displayName": "AOP",
            "name": "AOP",
            "description": "面向切面编程的辅助模块\n\nFeartures : \n    1. promiseEvent ：基于promise和event机制的回调管理\n    2. trigger ：对象触发器\n    3. flowController ：流程/生命周期控制器\n\nUpdate Note：\n    + 2014.8.06 ：将priorityList应用到promiseEvent中\n    + 2014.6.13 ：trigger添加属性变化监听支持\n    + 2014.6.11 ：promiseEvent添加非阻塞模式\n    + 2014.5 ：Created",
            "classes": [
                {
                    "name": "promiseEvent"
                },
                {
                    "name": "EventArg"
                },
                {
                    "name": "attachTrigger"
                },
                {
                    "name": "EventArg(trigger)"
                },
                {
                    "name": "flowController"
                },
                {
                    "name": "EventArg(flowController)"
                }
            ]
        },
        {
            "displayName": "DataManager",
            "name": "DataManager",
            "description": "数据管理模块\n\nFeartures : \n    1. dataServices ：数据服务接口\n    2. dataManager ：基于策略的数据管理基类\n    3. dataPolicyManager ：数据策略管理器；\n\nUpdate Note：\n    + 2014.7 ：Created",
            "classes": [
                {
                    "name": "dataServices"
                },
                {
                    "name": "baseDataService"
                },
                {
                    "name": "dataManager"
                },
                {
                    "name": "baseDataManager"
                }
            ]
        },
        {
            "displayName": "DataManager-Table",
            "name": "DataManager-Table",
            "description": "针对于表类型的数据进行管理\n\nFeartures : \n    1. 提供CRUD接口\n    2. 内置状态控制\n\n\nUpdate Note：\n    + 2014.7 ：Created",
            "classes": null
        },
        {
            "displayName": "FilterBuilder",
            "name": "FilterBuilder",
            "description": "过滤器生成器\n\nFeartures : \n    1. 编译字符串过滤，“name = @name and (age > @age and type = @type)”，生产过滤条件参数或者过滤方法\n    2. 参数过滤，以参数的方式全部构建\"=\"的方式构建查询方法\n    3. 方法过滤\n    4. 忽略null的条件\n    5. 自定义扩展过滤操作符\n    6. 条件&参数合并\n\nUpdate Note：\n    + 2014.7 ：Created",
            "classes": [
                {
                    "name": "FilterBuilder"
                },
                {
                    "name": "Operations"
                }
            ]
        },
        {
            "displayName": "OOP",
            "name": "OOP",
            "description": "面向对象思想的辅助实现模块;\n\nFeartures : \n    1. klass ：类继承；实现执行指针，类常用方法，继承路径\n    2. factory ：对象/类工厂方法；\n\nUpdate Note：\n    + 2014.6 ：Created",
            "classes": [
                {
                    "name": "klassBase"
                },
                {
                    "name": "klass"
                },
                {
                    "name": "factory"
                }
            ]
        },
        {
            "displayName": "Util",
            "name": "Util",
            "description": "工具包模块\n\nFeartures : \n\t1. 基础公共方法\n\t2. 基础公共对象\n\nUpdate Note：\n\t+ 2014.8.06 加入priorityList\n\t+ 2014.5 ：Created",
            "classes": [
                {
                    "name": "util"
                },
                {
                    "name": "priorityList"
                }
            ]
        }
    ]
} };
});