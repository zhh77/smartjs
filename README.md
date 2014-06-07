smartjs 

ver 0.1

author Roy Zhang

content : promiseEvent; trigger; flowContoller

1.Util

//合并默认数据方法,将obj中不空的内容从defObj中复制
st.mergeObj(deep, obj, defObj, exclude)


//在目标对象方法中注入方法，返回结果
st.injectFn(target, name, fn, before,stopOnFalse)

//合并方法，返回结果
st.mergeFn(fn, mergeFn,stopOnFalse)

2.PromiseEvent
基于事件和promise的回调管理，类似于jquery的callbacks，但具有结果传递，优先级，事件参数，promise控制等功能


  var events = st.promiseEvent(mode);
  
  events.add(name,function(e,arg,……){
  
  },priority,eventMode)
  
  event.fire(arg);
  
  mode ：once和callback两种模式,(callback模式不会加入事件参数)
  name ：加入的事件名称
  priority ：权重设置
  eventMode ：加入的事件模式；once
  
  e.stopProgation() 阻止后续回调
  e.result 上一个回调的结果
  e.remove() 删除当前回调
  e.promise() 返回契约
  e.resolve() 解决契约
  e.reject() 拒绝契约

3.Trigger
触发器，在对象上计入触发器功能，目标对象会具有方法注入功能，注入的类型有before，after和round环绕三种



