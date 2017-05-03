---
title: Mongoose 学习笔记二 — Query & Population
type: original
description: >-
  数据库操作中查询肯定少不了,Documents 可以通过models的一些静态辅助方法来获取,这些方法可以以两种方式执行。1. 当 callback
  回调函数作为参数传递给这些静态辅助函数的时候,相应的操作会立即执行,并将结果传递给 callback 回调函数。
tags: [Mongoose,Mongodb]
categories: [cnodejs源码学习]
date: 2017-04-27 00:06:04
---

### Query

　　数据库操作中查询肯定少不了,Documents 可以通过models的一些静态辅助方法来获取,这些方法可以以两种方式执行。

1. 当 callback 回调函数作为参数传递给这些静态辅助函数的时候,相应的操作会立即执行,并将结果传递给 callback 回调函数。

    ```javascript
        var Person = mongoose.model('Person', yourSchema);
        
        // find each person with a last name matching 'Ghost', selecting the `name` and `occupation` fields
        Person.findOne({ 'name.last': 'Ghost' }, 'name occupation', function (err, person) {
          if (err) return handleError(err);
          console.log('%s %s is a %s.', person.name.first, person.name.last, person.occupation) // Space Ghost is a talk show host.
        })
    ```
    
    callback 需要接受两个参数,一个是err,一个是result。`` callback(error, result)`` 这种模式,如果有错误,则error为错误对象,result为空,反之error为空,result为返回的结果,可能是文档对象,可能是文档对象数组,或者是文档个数。
    
2. 当没有 callback , Query的实例会被返回,这个相当于promise,通过query对象我们可以进行后续的操作。
    
    ```javascript
    // find each person with a last name matching 'Ghost'
    var query = Person.findOne({ 'name.last': 'Ghost' });
    
    // selecting the `name` and `occupation` fields
    query.select('name occupation');
    
    // execute the query at a later time
    query.exec(function (err, person) {
      if (err) return handleError(err);
      console.log('%s %s is a %s.', person.name.first, person.name.last, person.occupation) // Space Ghost is a talk show host.
    })
    ```
    query 对象提供了一种让你能够链式调用的方法,让你经过一系列处理和过滤后得到最终想要的结果。如下代码:
    
    ```javascript
    // With a JSON doc
    Person.
      find({
        occupation: /host/,
        'name.last': 'Ghost',
        age: { $gt: 17, $lt: 66 },
        likes: { $in: ['vaporizing', 'talking'] }
      }).
      limit(10).
      sort({ occupation: -1 }).
      select({ name: 1, occupation: 1 }).
      exec(callback);
      
    // Using query builder
    Person.
      find({ occupation: /host/ }).
      where('name.last').equals('Ghost').
      where('age').gt(17).lt(66).
      where('likes').in(['vaporizing', 'talking']).
      limit(10).
      sort('-occupation').
      select('name occupation').
      exec(callback);
    ```

### Population

　　在 Mongodb 中并没有像关系数据库中的表一样拥有 join 操作, 能够将多个表连接起来作为结果返回,但 mongoose 提供了Population,让不同集合中的多个 document 可以联系在一起,然后整体作为结果返回,这和关系数据库中的表连接有些类似。

　　首先要连接两个 document ,在创建的时候,这两个 document 需要有对应的关系,像"一对多","多对一","多对多"。如下:

```javascript
var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  
var personSchema = Schema({
  _id     : Number,
  name    : String,
  age     : Number,
  stories : [{ type: Schema.Types.ObjectId, ref: 'Story' }]
});

var storySchema = Schema({
  _creator : { type: Number, ref: 'Person' },
  title    : String,
  fans     : [{ type: Number, ref: 'Person' }]
});

var Story  = mongoose.model('Story', storySchema);
var Person = mongoose.model('Person', personSchema);

```

Person 和 Story 就存在着一种或者多种对应关系, 一个 Person 对应着多个 Story,在Person Schema中表现出来就是有一个 stories 字段,它的值是这个 Person 所拥有的 stories objectId 数组。对于 Story 也同样存在着这样的保存对应关系的字段。在需要 populate 时,就会根据这些关系进行连接填充。首先我们先创建 Person 和 Story :
 
 ```javascript
 //创建 document 并保存对应关系到相应的字段中去。
 var aaron = new Person({ _id: 0, name: 'Aaron', age: 100 });
 
 aaron.save(function (err) {
   if (err) return handleError(err);
   
   var story1 = new Story({
     title: "Once upon a timex.",
     _creator: aaron._id    // assign the _id from the person
   });
   
   story1.save(function (err) {
     if (err) return handleError(err);
     // thats it!
   });
 });
 ```
 
 目前为止,并没有什么特殊的地方,仅仅就是创建了 document 并保存。接下来我们看下 population 的作用,我们 populate story中的 _creator 字段,其实就是 mongoose 通过一定的方式,将 _creator 值(Person 的 object Id),作为查询条件得到对应的Person,然后赋值给story 中的 _creator字段。如下:
 
 ```javascript
 Story
 .findOne({ title: 'Once upon a timex.' })
 .populate('_creator')
 .exec(function (err, story) {
   if (err) return handleError(err);
   console.log('The creator is %s', story._creator.name);
   // prints "The creator is Aaron"
 });
 ```
 其中,populate 方法中的参数 "_creator" 就是 populate path。 上面的方法你可以通过先查询得到对应 objectId 的 Person 文档,然后手动赋值给对应的story _creator达到目的。
 
 ```javascript
 Story.findOne({ title: 'Once upon a timex.' }, function(error, story) {
   if (error) {
     return handleError(error);
   }
   story._creator = aaron;
   console.log(story._creator.name); // prints "Aaron"
 });
 ```
 
 > Note that this only works for single refs. You currently can't manually populate an array of refs.
 
在 populate 的过程中,你可以剔除不需要的字段,仅仅连接你所需要的字段到当前 document 中,比如你只需要 Person 的 name,那么你可以这么干:

```javascript
Story
.findOne({ title: /timex/i })
.populate('_creator', 'name') // only return the Persons name
.exec(function (err, story) {
  if (err) return handleError(err);
  
  console.log('The creator is %s', story._creator.name);
  // prints "The creator is Aaron"
  
  console.log('The creators age is %s', story._creator.age);
  // prints "The creators age is null'
})
```

Populating 多个 Path,如果你同时想要story 中的 _creator 字段和 fans 字段被具体对应的 document 填充,可以通过空格分隔多个 path 作为 populate 方法的参数。如下:

```javascript
Story
.find(...)
.populate('fans _creator') // space delimited path names
.exec()
```

但是在 mongoose 3.6版本以及这个版本之后我们才能这么干,在这之前我们只能通过如下的方式实现相同的目的:
 
 ```javascript
 Story
 .find(...)
 .populate('fans')
 .populate('_creator')
 .exec()
 ```
 
populate 方法支持 Object 对象作为参数,如你想只populate 一定年龄的,只需要填充返回你指定的字段,返回指定数目的documents,那么你可以这么干

```javascript
Story
.find(...)
.populate({
  path: 'fans',
  match: { age: { $gte: 21 }},
  select: 'name -_id',
  options: { limit: 5 }
})
.exec()
```


### 总结

mongoose 给用户提供了便利的方法来查询文档和连接相关的文档,上面只是对用法做了简单的说明,更多的内容大家可以参看官方提供的文档[Query](http://mongoosejs.com/docs/queries.html),[Population](http://mongoosejs.com/docs/populate.html)。