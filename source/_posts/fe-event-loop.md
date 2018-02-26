---
title: JavaScript 和 NodeJS 事件循环
type: original
tags: [NodeJS,JavaScript]
categories: [NodeJS,nodeclub源码学习]
date: 2017-05-05 11:20:12
description:
---


## 写在前面

　　在学习nodeclub源码的过程中,遇到了[eventproxy](https://github.com/JacksonTian/eventproxy) 这个解决金字塔回调问题的框架,为了更好的理解代码和出于好奇心,看了下 eventproxy 的源码实现,其中看到一段代码如下:

```javascript
var later = (typeof setImmediate !== 'undefined' && setImmediate) ||
(typeof process !== 'undefined' && process.nextTick) || function (fn) {
    setTimeout(fn, 0);
};
```
对setImmediate,process.nextTick,setTimeout 三者的区别不是很清晰,甚至对process.nextTick的作用和传入回调的执行时机也并不清楚。所以要弄清楚这些内容,就必须搞清楚 NodeJS 事件循环。

## JavaScript 浏览器端的事件循环

　　在深入到NodeJS的事件循环之前我们先来了解下浏览器端的事件循环,因为JavaScript是单线程的,如果没有事件循环机制的话,页面UI会因为一个耗时操作而卡死,详细内容见我之前的一篇翻译[什么是JavaScript 事件循环 ?](http://weeklyweb.info/2017/05/03/javascript-event-loop/)。这里只是做简单的介绍。

![Event-Loop](http://rainypin.qiniudn.com/blog/images/event-loop.png)

如图所示,在JS程序执行的时候,同步的 JavaScript 代码会在调用栈中被执行,异步的代码,如按钮点击事件处理函数,定时器,在图中就是webapis部分,在特定的事件触发或者时间到了定时器指定的耗时后,会从webapis区域移到任务队列部分,如果此时调用栈为空,没有任何代码正在执行的话,事件循环机制就会从队列中选择第一个待被执行的任务到调用栈中进行执行。那么 NodeJS 中的事件循环是怎样的呢?


## NodeJS 事件循环

　　相比浏览器中的事件循环,在NodeJS中要更加复杂一些,当 Node.js 启动时，它会初始化event loop，处理提供的代码（代码里可能会有异步API调用，timer，以及process.nextTick()），然后开始处理event loop。NodeJS中的事件循环分为几个阶段,按顺序执行。如下图:

![NodeJS Event Loop Phases](https://cdn-images-1.medium.com/max/1600/1*Qmtck5vGwGU3pMoMq0WhXg.png)

每个阶段都有一个FIFO(先进先出)的回调函数队列,并且各个阶段都有自己特有的操作,当事件循环进入到一个特定的阶段中,会先执行这些阶段特有的操作后,开始执行队列中的回调函数,一直到队列中的回调函数执行完,或者到达执行上限为止,事件循环才会进入下一个阶段。

## 阶段概述

* __timers__ : 这个阶段执行setTimeout()和setInterval()设定的回调。
* __I/O callbacks__ : 执行几乎所有的回调，除了close回调，timer的回调，和setImmediate()的回调。
* __idle, prepare__ : 仅内部使用。
* __poll__ : 获取新的I/O事件；node会在适当条件下阻塞在这里。
* __check__ : 执行setImmediate()设定的回调。
* __close callbacks__: 执行比如socket.on('close', ...)的回调。

## 阶段详情

主要详细说明下几个相对比较特殊的阶段。

### timers 

timers阶段,如上所述,这个阶段执行setTimeout()和setInterval()设定的回调。但仅仅能做到尽可能的按照定时器设定的时间点去执行回调函数,例如``setTimeout(fn,1000);``这里虽然设定了1s后执行fn,但是并不能真正保证1s后fn就会被执行,1s这个时间是最好的情况下,系统的调度程序或者其他正在执行的回调函数都有可能使其大于1s后,fn才会被执行。

### poll

poll 阶段有两个功能:

* 执行那些定时器触发的回调函数代码
* 处理poll队列中的事件

当事件循环进入了poll阶段并且没有相关的定时器调度,会有两种情况:

* 当poll队列不为空的情况,队列里面的回调函数会被执行,直到达到上限。
* 如果poll队列为空,又会出现两种情况:
    * 如果有代码调用了 ``setImmediate()``, 则事件循环会结束poll阶段,转而到check阶段执行由``setImmediate()``传入的脚本代码。
    * 如果没有调用``setImmediate()``,则事件循环会一直在该阶段等待新的待执行的回调函数加入到poll队列,然后立即执行它。

一旦poll队列为空,事件循环会检查timers阶段队列中是否有回调函数(定时器已经触发的回调函数),如果有则结束poll阶段,转而到timers阶段执行该阶段队列中的回调方法。

### check

这个阶段允许你立即执行脚本,当poll阶段空闲且有脚本通过``setImmediate()``加入到队列中时。

## setImmediate() vs setTimeout()

对于这两个方法的区别只要记住两点就行了:

* setImmediate()被设计在 poll 阶段结束后立即执行回调。
* setTimeout()被设计在指定下限时间到达后执行回调。

两者的调用顺序根据不同的上下文而呈现不同。如果都在main中调用,两者的调用顺序不定,如果都在I/O中被调用,如下:

```JavaScript
// timeout_vs_immediate.js
var fs = require('fs')

fs.readFile(__filename, () => {
  setTimeout(() => {
    console.log('timeout')
  }, 0)
  setImmediate(() => {
    console.log('immediate')
  })
})
```
则 ``setImmediate()`` 传入的回调始终先于 ``setTimeout()`` 被调用。


## process.nextTick()

到了重点需要理解的部分了，``process.nextTick()``。因为从技术上来说，它并不是event loop的一部分。可以看到``process.nextTick()``并不在上面的图中,虽然说它是异步回调API的一部分。相反的，process.nextTick()会把回调塞入nextTickQueue，nextTickQueue将在当前阶段的当前操作完成后处理，不管目前处于event loop的哪个阶段。所以,``process.nextTick() `` 不管在任何时候调用，都会在所处的这个阶段最后，在event loop进入下个阶段前，处理完所有nextTickQueue里的回调。这就会带来一个问题,如果递归调用``process.nextTick()``,就会导致poll阶段被饿死,因为程序一直在执行nextTickQueue里的回调。

## process.nextTick() vs setImmediate()

这两个方法很相似,作用也类似,但是还是有区别的:

* ``process.nextTick()`` 在同一个阶段会被立即执行。
* ``setImmediate()`` 会在接下来的迭代或者事件循环的一个循环被执行。

从本质上说,两个方法的名称应该对调,``process.nextTick()`` 其实触发的更加及时。但这算是NodeJS API设计的遗留问题吧,也不可能去变更了,毕竟一变更,不知多少npm模块会受到影响。

## 最后 

我们推荐优先使用``setImmediate()``,因为它更加好理解,拥有更好的兼容性。


## 参考内容

1. [The Node.js Event Loop, Timers, and process.nextTick()](https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/)
2. [Node Event Loop](https://medium.com/@ehnertm/node-event-loop-838c13a7c4e)
3. [Node.js的event loop及timer/setImmediate/nextTick](https://github.com/creeperyang/blog/issues/26)