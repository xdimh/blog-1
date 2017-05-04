---
title: 什么是JavaScript 事件循环 ?
type: translate
tags: [JavaScript]
categories: [cnodejs源码学习]
date: 2017-05-03 11:33:10
description:
---


　　这篇文章是对个人认为讲解　JavaScript　事件循环比较清楚的一篇英文文章的简单翻译,原文地址是http://altitudelabs.com/blog/what-is-the-javascript-event-loop/。

<!--　more　-->

## 介绍

　　如果你像我一样,喜欢JavaScript,是的,你肯定也会认同,JavaScript这门语言并不完美,严肃的说,没有任何一门计算机语言是完美的。尽管JavaScript确实存在一些缺陷,但我喜欢编写web程序以及如何用JavaScript构建能够连接世界的应用。

　　JavaScript这门语言水很深,他复杂的内部原理需要花费一段时间才能够真正的理解。其中的事件循环机制就不太好理解。很有可能一个多年使用JavaScript进行程序开发的人未必真正理解 JavaScript 的事件循环到底是怎么工作的。不管怎样,通过本篇博客,我希望能够揭示什么是事件循环以及能够让你觉得其实它真的没那么复杂。

## 浏览器中的JavaScript

　　当我们想到JavaScript时，我们通常会在Web浏览器的上下文中考虑它 - 这是有道理的，因为我们大多数情况下是在客户端中(浏览器)运行JavaScript。然后,我们需要清楚的知道(因为这很重要),运行一个web应用,涉及到一系列的技术术语,如 JavaScript 引擎(像chrome V8) , 一系列的Web API(像DOM,BOM),还有事件循环和事件队列。

　　当看到这么多术语,你可能会想,"我的天哪(食屎啦),看起来超级复杂。。。",你的想法有一定道理,但是你很快会看到,应用运行的基本原理其实并没有那么复杂,虽然具体的底层实现超出了我们的范围。

　　在我们深入到事件循环之前,我们需要理解下JavaScript引擎是干什么的?

## JavaScript 引擎

　　事实上,对于JavaScript引擎的实现有很多,但是目前为止最知名的就是谷歌的Chrome 的 V8 引擎(V8 引擎不仅仅只限存在于浏览器,它也存在于服务端,用于解析服务端的JavaScript 代码,如NodeJS)。那么,JavaScript 引擎到底做了些什么呢? 其实很简单,就是逐行逐句的处理JavaScript代码,没错,一次只能处理一句,所以JavaScript是单线程的。这样带来的主要问题是如果你运行的JavaScript语句需要很长时间才能返回,则这个语句后面的所有代码都会被阻塞。我们当然不希望我们写的代码会阻塞,特别是在浏览器端,可以想象一下,如果你在一个网站上点击一个按钮,然后代码就挂起了,你尝试去单击该网站页面上的其他按钮,但是并没有任何响应,会是怎么一种体验。这里最可能的原因是点击按钮触发的代码运行需要很长时间,使得后面的代码被阻塞,导致整个网站UI无法同时再响应用户的交互事件。

　　那么 JavaScript 引擎是如何知道或者怎么做到一次只执行一句JavaScript语句的呢? 答案是通过调用栈,可以将调用栈想象成升降梯,第一个人进入升降梯将会在最后退出升降梯,然而最后一个进入的将会第一个出来。(作者在这里的比喻似乎不太好理解,但是大家肯定都学过数据结构中的栈,其特点就是先进后出)。我们看下下面的例子:

```javascript
/* Within main.js */

var firstFunction = function () {  
  console.log("I'm first!");
};

var secondFunction = function () {  
  firstFunction();
  console.log("I'm second!");
};

secondFunction();

/* Results:
 * => I'm first!
 * => I'm second!
 */
```
然后下面是调用栈中序列情况:

* 首先是Main.js 匿名主函数被调用:

  ![调用栈初始状态](http://altitudelabs.com/blog/content/images/2014/Jul/1-u51csgcFDi7SYoxnFljJ6w.png)

* secondFunction 方法被调用:

  ![secondFunction被调用](http://altitudelabs.com/blog/content/images/2014/Jul/1-QY4CM881bCmS908GSwlJiA.png)
  
* 调用 secondFunction 后导致 firstFunction 被调用:

  ![firstFunction被调用](http://altitudelabs.com/blog/content/images/2014/Jul/1-pnI4YwJpXzt1mt1leOGl2Q.png)

* 执行 firstFunction 在控制台中打印了 "I'm first!",执行完后 firstFunction 中没有更多的语句可以被执行了,所以 firstFunction 被移出了调用栈:

  ![firstFunction返回](http://altitudelabs.com/blog/content/images/2014/Jul/1-AKybdhXXHbkvL6Eg4pNxDQ.png)
  
* 执行继续,到 secondFunction 中,"I’m second!" 输出到控制台,同样 secondFunction 中没有其他更多的代码要被执行了,所以也从调用栈中移出了。以此类推,最后调用栈会置空。

  ![调用栈移出secondFunction](http://altitudelabs.com/blog/content/images/2014/Jul/1-Wx7x-aKIq2o7DmWlejRpeQ.png)
  

## 额,好的,但是我们能来讨论下事件循环吗?

　　现在我们了解了JavaScript 引擎中的调用栈是怎么工作的,我们继续回到刚才说到代码阻塞那里,我们知道我们应该去避免它,但是应该怎么做呢?幸运的是 JavaScript 提供了一种机制,它通过异步函数,不要担心,异步函数其实和其他函数没什么区别,唯一区别是异步函数并不会立即马上执行,会在后面某个时间点被触发执行。如果你用过setTimeout函数,你已经对异步函数熟悉了。我们来看下下面的例子:

```JavaScript
/* Within main.js */

var firstFunction = function () {  
 console.log("I'm first!");
};

var secondFunction = function () {  
 setTimeout(firstFunction, 5000);
 console.log("I'm second!");
};

secondFunction();

/* Results:
 * => I'm second!
 * (And 5 seconds later)
 * => I'm first!
 */
```
同样我们接下来看下调用栈中序列情况:

* 在 secondFunction 执行到被放入调用栈之后,setTimeout 函数被调用,同样也放入了调用栈。

  ![异步函数](http://altitudelabs.com/blog/content/images/2014/Jul/1-s7d9UjolRGGjqFtfK0wZ8w.png)
  
* 在 setTimeout 函数执行之后,有个特别的地方,浏览器将 setTimeout 的回调函数(在上面例子中,firstFunction) 放在了一个可以称为事件表(Event Table)的地方。 为了便于理解,我们可以将这个事件表想象成注册表:调用栈告诉事件表注册特定的函数,只有当特定的事件发生了,这个函数才能被执行(应该是放入事件队列)。然后当事件发生后,事件表就会简单的将函数移动到事件队列(Event Queue)中。此事件队列的美妙之处在于,它只是函数等待被调用和移动到调用栈的一个临时存放区域。

* 你可能会问,"既然这样,那么事件队列里的这些函数什么时候会被移动到调用栈中执行?" 其实JavaScript引擎遵循着非常简单的规则:底层会有程序时不时的检查下调用栈是否为空,不管什么时候一旦为空,那么该程序会检查事件队列里是否会有正在等待被执行的函数。如果有,队列中的第一个函数会被移动到调用栈中然后被执行。如果事件队列为空,这个监视程序将会一直保持运行,瞧! 我刚刚描述的就是臭名昭着的事件循环(Event Loop)！

* 现在回到刚才的例子,执行setTimeout 函数,将回调函数(例子中:firstFunction) 移动到事件记录表中,并且按照五秒的时间延时进行注册:
  
  ![在 setTimeout 执行之后](http://altitudelabs.com/blog/content/images/2014/Jul/1-XdKOatkDmsr-ft3nYs5wdQ.png)
  
* 这是另一个“啊哈！”的时刻 - 注意一旦回调函数被移动到事件表，没有任何东西(后面的代码)被阻塞！程序继续运行。
  
  ![在 secondFunction 执行之后](http://altitudelabs.com/blog/content/images/2014/Jul/1-f2g4OgjfB7WXfWuOJUTY5Q.png)
  
* 在幕后,事件表会时不时监视是否有事件发生从而触发将对应的函数移动到事件队列中等待被执行。在我们例子中,secondFunction 和 main.js 都完成了执行,调用栈为空。

  ![在 main 执行结束后 ](http://altitudelabs.com/blog/content/images/2014/Jul/1-wLH1GZRlFvc0ZDawOB1XAQ.png)
  
* 在某一时刻,回调函数放在事件表中的时间将超过5秒。当发生这种情况时,事件表将firstFunction移动到事件队列中。
  
  ![过了5秒后](http://altitudelabs.com/blog/content/images/2014/Jul/1-0oy202Rt-94BDKOxKURVtw.png)

* 在事件循环不断监视调用栈是否为空,现在确实是空的时候,调用fistFunction,创建一个新的调用栈来执行代码。

  ![执行firstFunction](http://altitudelabs.com/blog/content/images/2014/Jul/1-9Vpvh23CJNmxHVbkwrNpyQ.png)
  
* 在执行完firstFunction之后,进入了一个新的状态,这个状态调用栈为空,事件记录表为空,事件队列也为空。监视程序一种保持运行,一旦事件队列中存在待执行的函数,就会重复前面的步骤,执行函数,这就是事件循环。

  ![此时状态](http://altitudelabs.com/blog/content/images/2014/Jul/1-MmPtbaLvP54DuH-jHAjEXg.png)
  
  
## 总结

　　我第一个承认我的解释掩盖了JavaScript引擎，事件表，事件队列和事件循环底层的实际实现细节。 然而，对于我们绝大多数人来说，我们只需要对JavaScript执行异步功能时发生的情况有一个坚实的基础理解就可以了。 并且，我希望上面的解释能够对你理解事件循环有帮助，这将是我们作为Web开发人员所必需要了解的。