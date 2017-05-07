---
title: eventproxy 源码解析
type: original
tags: [JavaScript,NodeJS]
categories: [nodeclub源码学习]
date: 2017-05-06 16:09:19
description:
---


EventProxy 仅仅是一个很轻量的工具，但是能够带来一种事件式编程的思维变化。有几个特点：

1. 利用事件机制解耦复杂业务逻辑
2. 移除被广为诟病的深度callback嵌套问题
3. 将串行等待变成并行等待，提升多异步协作场景下的执行效率
4. 友好的Error handling
5. 无平台依赖，适合前后端，能用于浏览器和Node.js
6. 兼容CMD，AMD以及CommonJS模块环境

在nodeclub源码中有一段实现代码如下:

```javascript
// nodeclub 首页路由处理函数
exports.index = function (req, res, next) {
  var page = parseInt(req.query.page, 10) || 1;
  page = page > 0 ? page : 1;
  var tab = req.query.tab || 'all';

  var proxy = new eventproxy();
  proxy.fail(next);

  // 取主题
  var query = {};
  if (!tab || tab === 'all') {
    query.tab = {$ne: 'job'}
  } else {
    if (tab === 'good') {
      query.good = true;
    } else {
      query.tab = tab;
    }
  }

  var limit = config.list_topic_count;
  var options = { skip: (page - 1) * limit, limit: limit, sort: '-top -last_reply_at'};

  Topic.getTopicsByQuery(query, options, proxy.done('topics', function (topics) {
    return topics;
  }));

  // 取排行榜上的用户
  cache.get('tops', proxy.done(function (tops) {
    if (tops) {
      proxy.emit('tops', tops);
    } else {
      User.getUsersByQuery(
        {is_block: false},
        { limit: 10, sort: '-score'},
        proxy.done('tops', function (tops) {
          cache.set('tops', tops, 60 * 1);
          return tops;
        })
      );
    }
  }));
  // END 取排行榜上的用户

  // 取0回复的主题
  cache.get('no_reply_topics', proxy.done(function (no_reply_topics) {
    if (no_reply_topics) {
      proxy.emit('no_reply_topics', no_reply_topics);
    } else {
      Topic.getTopicsByQuery(
        { reply_count: 0, tab: {$ne: 'job'}},
        { limit: 5, sort: '-create_at'},
        proxy.done('no_reply_topics', function (no_reply_topics) {
          cache.set('no_reply_topics', no_reply_topics, 60 * 1);
          return no_reply_topics;
        }));
    }
  }));
  // END 取0回复的主题

  // 取分页数据
  var pagesCacheKey = JSON.stringify(query) + 'pages';
  cache.get(pagesCacheKey, proxy.done(function (pages) {
    if (pages) {
      proxy.emit('pages', pages);
    } else {
      Topic.getCountByQuery(query, proxy.done(function (all_topics_count) {
        var pages = Math.ceil(all_topics_count / limit);
        cache.set(pagesCacheKey, pages, 60 * 1);
        proxy.emit('pages', pages);
      }));
    }
  }));
  // END 取分页数据

  var tabName = renderHelper.tabName(tab);
  proxy.all('topics', 'tops', 'no_reply_topics', 'pages',
    function (topics, tops, no_reply_topics, pages) {
      res.render('index', {
        topics: topics,
        current_page: page,
        list_topic_count: limit,
        tops: tops,
        no_reply_topics: no_reply_topics,
        pages: pages,
        tabs: config.tabs,
        tab: tab,
        pageTitle: tabName && (tabName + '版块'),
      });
    });
};
```

代码中看到了 ``proxy.emit('ev')`` , ``proxy.done('ev',fn)``,``proxy.fail(next)`` 所以要看懂这段代码,就必须了解eventproxy使用方法(当然可以猜测具体的作用)。查看了GitHub上的README,遗憾的是api文档现在不能正常访问了,出于学习的态度,简单的阅读了源码实现:

```JavaScript
!(function (name, definition) {
  // Check define
  var hasDefine = typeof define === 'function',
    // Check exports
    hasExports = typeof module !== 'undefined' && module.exports;

  if (hasDefine) {
    // AMD Module or CMD Module
    define('eventproxy_debug', function () {return function () {};}); // 定义一个eventproxy_debug 模块，返回一个空函数作为debug函数。
    define(['eventproxy_debug'], definition); // 依赖前面定义的模块，作为debug参数传入definition中。
  } else if (hasExports) {
    // Node.js Module
    module.exports = definition(require('debug')('eventproxy'));
    // debug 模块，一个简单的输出调试信息模块
  } else {
    // Assign to common namespaces or simply the global object (window)
    this[name] = definition();
  }
})('EventProxy', function (debug){
    // ...
});
```

首先是定义了一系列的环境支持。像AMD,CMD,UMD,CommonJS。EventProxy 是最终的模块名称,真正的定义需要传入一个debug函数。其实就是日志输出工具,接下来就是具体的定义和实现:

```JavaScript
EventProxy.prototype.addListener = function(ev, callback) {
  //....
}
EventProxy.prototype.bind = EventProxy.prototype.addListener;
EventProxy.prototype.on = EventProxy.prototype.addListener;
EventProxy.prototype.subscribe = EventProxy.prototype.addListener;

```
注册事件函数和它的一系列别名,别名也是挺多的。

```javascript
EventProxy.prototype.headbind = function (ev, callback) {
    // ...
    debug('Add listener for %s', ev);
    this._callbacks[ev] = this._callbacks[ev] || [];
    this._callbacks[ev].unshift(callback);
    return this;
}
```
代码比较简单,直接说下具体的作用吧,headbind 顾名思义,就是绑定的同时通过数组的unshift函数将事件回调函数放在最前面,接下来是解绑事件函数:

```JavaScript
 EventProxy.prototype.removeListener = function (eventname, callback) {
    var calls = this._callbacks;
    if (!eventname) {
      debug('Remove all listeners');
      this._callbacks = {};
    } else {
      if (!callback) {
        debug('Remove all listeners of %s', eventname);
        calls[eventname] = [];
      } else {
        var list = calls[eventname];
        if (list) {
          var l = list.length;
          for (var i = 0; i < l; i++) {
            if (callback === list[i]) {
              debug('Remove a listener of %s', eventname);
              list[i] = null;
            }
          }
        }
      }
    }
    return this;
  };
```

这个函数作用很简单就是删除(其实是对数组中相应元素下标置为null)绑定的事件回调函数,如果没有指明删除具体哪个回调函数 callback ，则删除这个事件上绑定的所有回调函数,如果连eventname都没有提供则删除所有事件上绑定的所有回调函数,这个方法的别名,``unbind``。还有根据前面两个绑定和解绑衍生出来的几个方法,``removeAllListeners``,``bindForAll``,``unbindForAll``。 在all事件上绑定处理函数,意味着任何事件触发都会执行all事件上的回调函数,下面源码一看就一目了然了:

```JavaScript
EventProxy.prototype.trigger = function (eventname, data) {
    var list, ev, callback, i, l;
    var both = 2; // 设置为2的目的是，第一次先执行具体事件上的回调函数，第二次执行绑定在ALL_EVENT上的回调函数。
    var calls = this._callbacks;
    debug('Emit event %s with data %j', eventname, data);
    while (both--) {
      ev = both ? eventname : ALL_EVENT;
      list = calls[ev];
      if (list) {
        for (i = 0, l = list.length; i < l; i++) {
          if (!(callback = list[i])) { //如果callback为null，回调函数数组中剔除空元素，修正循环下标和数组长度。
            list.splice(i, 1);
            i--;
            l--;
          } else {
            var args = [];
            var start = both ? 1 : 0; // 如果是具体事件上的回调函数执行，参数不包括事件名称，如果是ALL_EVENT上的回调函数
            //执行，参数包括事件名称。
            for (var j = start; j < arguments.length; j++) {
              args.push(arguments[j]);
            }
            callback.apply(this, args);
          }
        }
      }
    }
    return this;
  };
```

both 设置成2,就是执行完一次对于事件回调函数后,还要再执行一次all事件上的回调函数,也是很嗨的。然后它的别名也是蛮多的,``emit``,``fire``,所以最上面源码中的``proxy.emit``也就知道作用了。接下来继续看源代码:

```JavaScript
  EventProxy.prototype.once = function (ev, callback) {
    var self = this;
    //包装回调函数，执行完后自己解绑。
    var wrapper = function () {
      callback.apply(self, arguments);
      self.unbind(ev, wrapper);
    };
    this.bind(ev, wrapper);
    return this;
  };
```

通过对callback 进行一层包装,包装后的函数会在运行callback后 `` self.unbind(ev, wrapper);`` 进行自我解绑,从而使得callback只会触发执行一次。

```javascript
 // 方法使用优先级 setImmediate -> nextTick -> setTimeout
  var later = (typeof setImmediate !== 'undefined' && setImmediate) ||
    (typeof process !== 'undefined' && process.nextTick) || function (fn) {
    setTimeout(fn, 0);
  };
```
这里定义了异步方法,各个方法的区别和有关事件循环的内容可以参看我总结的另一篇文章[JavaScript & NodeJS 事件循环](http://weeklyweb.info/2017/05/05/fe-event-loop/)。

```javascript
   //使得触发事件行为变成异步
  EventProxy.prototype.emitLater = function () {
    var self = this;
    var args = arguments;
    later(function () {
      self.trigger.apply(self, args);
    });
  };
```
不知道emitLater这个方法使用场景,根据代码可以知道就是延迟触发事件,不明觉厉了。

```javascript
  // 绑定完事件回调后立马先触发一次
  EventProxy.prototype.immediate = function (ev, callback, data) {
    this.bind(ev, callback); // 绑定事件
    this.trigger(ev, data); // 立马触发
    return this;
  };
  EventProxy.prototype.asap = EventProxy.prototype.immediate;
```
 
immediate 方法和它的别名asap,作用就是绑定事件函数后立马执行。

```javascript
  var _assign = function (eventname1, eventname2, cb, once) {
    var proxy = this;
    var argsLength = arguments.length;
    var times = 0;
    var flag = {};

    // Check the arguments length.
    //必须提供至少3个参数
    if (argsLength < 3) {
      return this;
    }

    var events = SLICE.call(arguments, 0, -2);
    var callback = arguments[argsLength - 2];
    var isOnce = arguments[argsLength - 1];

    // Check the callback type.
    if (typeof callback !== "function") {
      return this;
    }
    debug('Assign listener for events %j, once is %s', events, !!isOnce);
    var bind = function (key) { //计数 收集数据
      var method = isOnce ? "once" : "bind";
      proxy[method](key, function (data) {
        proxy._fired[key] = proxy._fired[key] || {};
        proxy._fired[key].data = data;
        if (!flag[key]) {
          flag[key] = true;
          times++;
        }
      });
    };

    var length = events.length;
    for (var index = 0; index < length; index++) {
      bind(events[index]);
    }

    var _all = function (event) {
      if (times < length) { // 用来保证是否所有事件都已经触发过
        return; 
      }
      if (!flag[event]) { // 确保是提供的参数中包含的事件被触发
        return;
      }
      var data = [];
      for (var index = 0; index < length; index++) {
        data.push(proxy._fired[events[index]].data); // 收集所有数据
      }
      if (isOnce) { // 是否只需要触发一次
        proxy.unbindForAll(_all);
      }
      debug('Events %j all emited with data %j', events, data);
      callback.apply(null, data); // 调用回调函数
    };
    proxy.bindForAll(_all); // 将新够造的回调函数
  };
```

该方法的作用是收集前面事件触发后传给回调函数的数据，然后最后构成一个数据数组，传给callback（cb）如果调用时传入的 once 为 true,则这个callback 只会被调用一次否则会多次被调用。这个方法是一个内部方法,其中暴露给用户使用的是下面的方法:

```JavaScript
  EventProxy.prototype.all = function (eventname1, eventname2, callback) {
    var args = CONCAT.apply([], arguments);
    args.push(true);
    _assign.apply(this, args); 
    return this;
  };
  EventProxy.prototype.assign = EventProxy.prototype.all;
  
  EventProxy.prototype.tail = function () {
      var args = CONCAT.apply([], arguments);
      args.push(false);
      _assign.apply(this, args);
      return this;
  };
  EventProxy.prototype.assignAll = EventProxy.prototype.tail;
  EventProxy.prototype.assignAlways = EventProxy.prototype.tail;
```

* all 方法,别名 assign 

    绑定一系列事件，当这些事件都触发了，callback会被执行一次,执行完就解绑自己,所以后续不会再被触发执行。

* tail 方法,别名 assignAll , assignAlways
    
    绑定一些事件，当所有事件都触发了，callback 会被触发，以后只要这些事件中的事件再次被触发，callback都会被执行。
    
```javascript
 EventProxy.prototype.fail = function (callback) {
    var that = this;

    that.once('error', function () {
      that.unbind();
      // put all arguments to the error handler
      // fail(function(err, args1, args2, ...){})
      callback.apply(null, arguments);
    });
    return this;
  };

  EventProxy.prototype.throw = function () {
    var that = this;
    that.emit.apply(that, ['error'].concat(SLICE.call(arguments)));
  };
```

* fail 方法

  绑定事件到error上,当出现error事件的时候,执行回调函数,并解绑所有的事件绑定。
  
* throw 
   
  error 事件触发的缩写。通过throw方法,就可以触发fail方法绑定的回调函数,这里``proxy.fail(next)``,这边错误发生执行的回调函数就是next。
  
  
 ```javascript
   EventProxy.prototype.done = function (handler, callback) {
     var that = this;
     //重新返回一个回调函数
     return function (err, data) {
       if (err) {
         // put all arguments to the error handler
         // 如果出现错误,则直接出发erorr事件,并返回
         return that.emit.apply(that, ['error'].concat(SLICE.call(arguments)));
       }
 
       // callback(err, args1, args2, ...)
       // 获取到数据,剔除err参数
       var args = SLICE.call(arguments, 1);
       
       // 如果handler是字符串
       if (typeof handler === 'string') {
         // getAsync(query, ep.done('query'));
         // or
         // getAsync(query, ep.done('query', function (data) {
         //   return data.trim();
         // }));
         //存在callback
         if (callback) {
           // 获取 callback 处理的数据。
           // only replace the args when it really return a result
           return that.emit(handler, callback.apply(null, args));
         } else {
           // put all arguments to the done handler
           //ep.done('some');
           //ep.on('some', function(args1, args2, ...){});
           // 如果callback 未提供,直接触发事件,参数为新回调函数获取到的内容
           return that.emit.apply(that, [handler].concat(args));
         }
       }
 
       // speed improve for mostly case: `callback(err, data)`
       // 如果handler提供的是function 且 则直接执行
       if (arguments.length <= 2) {
         return handler(data);
       }
 
       // callback(err, args1, args2, ...)
       handler.apply(null, args);
     };
 };
 ```
 
 * done 方法
    
   事件回调包装函数,handler 事件名称,callback 结果数据处理函数,返回新的结果数据。具体解释参看源码中的注释,主要分几种情况:
    * handler 参数提供且为字符串
        1. 如果提供了 callback 结果处理函数
            
           调用 ``that.emit(handler, callback.apply(null, args));`` 作为参数的数据是经过 callback 处理后的值。
        
        2. 如果未提供 callback 参数
            
           调用 ``that.emit.apply(that, [handler].concat(args));`` 数据参数为 handler 加上 args(异步操作结果数据) 。
           
    * handler 为 Function
        1. 如果异步操作结果数据的参数只有两个,类似这种情形``callback(err,data)`` 则直接调用``handler(data);``。
        2. 如果异步操作结果数据的参数不止两个,类似``callback(err,arg1,arg2,...)`` 这种,则调用``handler.apply(null, args);``。
        
## 最后

虽然eventproxy的源代码比较简单,但是在阅读的过程中也添加了部分注释,有兴趣可以看下,地址:https://github.com/xdimh/eventproxy-comments/blob/master/eventproxy.js