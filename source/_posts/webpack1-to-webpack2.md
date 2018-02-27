---
title: '升级项目中的 webpack1.x 到 webpack2.x , 完善项目构建打包'
type: original
tags: [webpack]
categories: [构建工具,前端大杂烩]
date: 2017-05-08 16:50:17
description: webpack 是当下最热门的前端资源模块化打包工具。它可以将许多松散的模块按照依赖和规则打包成符合生产环境部署的前端资源。还可以将按需加载的模块进行代码分割。通过 loader 的转换，任何形式的资源都可以视作模块，比如 CommonJS 模块、 AMD 模块、 ES6 模块、CSS、图片、 JSON、Coffeescript、 LESS 等。现在 webpack 版本已经到了2.x,写法改变了不少,但是也带来了更好的特性,所以还是赶紧升级项目中的webpack吧。这篇文章将带你逐步从webpack1.x 升级到 webpack2.x,并提供完善你自己打包构建任务的一些思路。
---
## webpack 中模块解析

在webpack中,webpack解析如下三种类型的文件路径:

* 绝对路径

    ```JavaScript
    import "/home/me/file";
    import "C:\\Users\\me\\file";
    ```
    这种情况因为已经是绝对路径,webpack只需要去对应的路径加载解析模块即可,无需额外的路径解析。
    
* 相对路径

  ```JavaScript
  import "../src/file1";
  import "./file2";

  ```
  当前文件所在的目录为相对路径的上下文目录,通过join 当前文件所在目录和 import 或者 require 指定的目录来获得模块的绝对路径,从而可以正确加载和解析引入的模块。
  
* 模块路径
 
  ```javascript
  import "module";
  import "module/lib/file";

  ```
  如果是模块路径的话,webpack会在 ``resolve.modules`` 指定的目录中搜索,同时会查看 ``resolve.alias``的别名设置,如果设置了对应的别名还会进行相应的别名替换,具体详细的替换规则参看官方文档[resolve alias](https://webpack.js.org/configuration/resolve/#resolve-alias)。当然这种模块引入方式,最后会去``node_modules``中搜索对应的模块。 
  
  一旦根据上面的规则得到了模块的路径,webpack 模块解析器会根据下面两种情况进行相应的模块加载:
  
  1. 如果模块路径指向文件
  
        * 如果路径包含文件扩展名,那么直接打包指定的模块内容。
       
        * 如果文件扩展名未指定,则会去查看 ``resolve.extension`` 的配置,解析器会尝试去寻找文件的扩展名为``resolve.extension``指定值的模块文件。__注意:如果你不想配置可选扩展名,那么可以通过设置``resolve.enforceExtension``为 true 强制提供文件扩展名__
        
  2. 如果模块路径指向一个目录
     
     * 如果该目录底下存在 package.json 文件,然后会查看 ``resolve.mainFields`` 的配置,按照配置的字段顺序,去package.json 文件中找,找到哪个就是哪个,具体参看官方文档[resolve.mainFields](https://webpack.js.org/configuration/resolve/#resolve-mainfields)。
     
     * 如果不存在 package.json 文件,或者是 ``resolve.mainFields`` 指定的文件路径不正确,解析器则会依次去搜索 ``resolve.mainFiles`` 指定的文件名称,按顺序找到哪个算哪个。默认值为``mainFiles: ["index"]``
     
     * 文件扩展名和前面一样,使用``resolve.extensions``选项。
  
  
  
  ## webpack1.x 到 webpack2.x 变化的地方
  
  * resolve.root, resolve.fallback, resolve.modulesDirectories 被一个单独的选项 resolve.modules 取代。
  
  ```JavaScript
    
      resolve: {
      -    extensions: ['', '.js', '.jsx', '.scss'],
      -    alias: {},
      -    root: [
      +    extensions: ['.js', '.jsx', '.scss'],
      +    alias: {
      +      echarts$ : path.resolve(__dirname, '../src/base/echarts-3.5.4.js')
      +    },
      +    modules: [
             path.resolve('src'),
      -      path.resolve('src/components')
      +      path.resolve('src/components'),
      +      'node_modules'
           ]
      -  }
      
  ```
    
  * module.loaders 改为 module.rules
  
    ```JavaScript
      module: {
    -   loaders: [
    +   rules: [
          {
            test: /\.css$/,
    -       loaders: [
    -         "style-loader",
    -         "css-loader?modules=true"
    +       use: [
    +         {
    +           loader: "style-loader"
    +         },
    +         {
    +           loader: "css-loader",
    +           options: {
    +             modules: true
    +           }
    +         }
            ]
          }]
     }
     
    ```
  
  * 取消「在模块名中自动添加 -loader 后缀」
    
    在引用loader的是候默认不能省略loader后缀,除非按如下方式显示指明:
    
    ```
    + resolveLoader: {
    +   moduleExtensions: ["-loader"]
    + }
    ```
    所以像之前的 babel-loader, 都不能写成babel 需要显示写成babel-loader。
    
  * OccurrenceOrderPlugin
    
    将短的id分配给使用频率高的模块,webpack2对此插件会默认加载,所以在webpack2 配置文件中不需要加载 ``OccurrenceOrderPlugin``。
  
  * DedupePlugin 
    
    去除重复模块,减少bundle的大小,但是webapck2 本身的功能就已经支持了,所以不再需要该插件。
    
  * ExtractTextWebpackPlugin - 破坏性改动
  
    对于这个插件的使用方式,改动还是很多的:
    
    * ExtractTextPlugin.extract
    
        对于loader中,webpack2 你需要这么写:
        
        ```javascript
            module: {
              rules: [
                {
                  test: /.css$/,
            -      loader: ExtractTextPlugin.extract("style-loader", "css-loader", { publicPath: "/dist" })
            +      use: ExtractTextPlugin.extract({
            +        fallback: "style-loader", // 无法提取的样式,最后还是采用内联。
            +        use: "css-loader",
            +        publicPath: "/dist" // 这里可以不提供,默认会使用output中的publicPath, 如果提供了,会优先使用这里的publicPath 指定的值。
            +      })
                }
              ]
            }
        ```
    * new ExtractTextPlugin({options}) 
    
      在 plugins 中还是需要进行修改,不然打包会出错。
      
      ```JavaScript
      -  new ExtractTextPlugin("bundle.css", { allChunks: true, disable: false })
      +  new ExtractTextPlugin({
      +    filename: "bundle.css",
      +    disable: false,
      +    allChunks: true
      +  })
      ]
      ```
      
 关于webpack1.x 到 webpack2.x 更多的变化参看官方文档https://doc.webpack-china.org/guides/migrating/。
 
 ## 代码分割
 
 最初搭建项目前端架构的时候,没有特别信任webpack的代码分割功能,总觉得webpack不能很好的识别代码中引入的第三方库,并成功提取出来,合并成一个文件。所以对像 ``react``, `react-dom`, ``react-redux``, ``redux``,``zepto``,``echarts``第三方库,都采用UMD(页面标签)引入方式,通过在webpack中配置externals 实现在代码中通过ES6 import 方式进行引入,所以 externals 也是挺乱的:
 
 ```git
 -  externals: {
 -    'Zepto': '$',
 -    'react': 'React',
 -    'React': 'React',
 -    'ReactDOM': 'ReactDOM',
 -    'react-dom': 'ReactDOM',
 -    'react/lib/ReactDOM': 'ReactDOM',
 -    'react/lib/ReactComponentWithPureRenderMixin': 'React.addons.PureRenderMixin',
 -    'ReactRouter': 'ReactRouter',
 -    'Redux': 'Redux',
 -    'ReactRedux': 'ReactRedux',
 -    'echarts': 'echarts'
    }
 ```
 但这样会造成一些问题:
  
 1. 最后在项目打包发布的时候,第三方库需要自己通过gulp写合并压缩命名的构建任务,导致构建任务复杂化。
 
 2. 通过UMD方式引入第三方库,需要人为维护第三方库的版本更新,容易造成团队中成员使用的第三方库版本不一致。
 
所以基于上面的问题,决定通过这次webpack1.x 到 webpack2.x 的升级顺带将第三方库采用CMD方式引入,具体提取抽离交由 webpack 代码分割特性进行处理。webpack 可以完成两类代码分割任务:

#### 1. 分割资源，实现缓存资源和并行加载资源。

   * 分割第三方库(vendor)
   
     一个典型的应用程序，会依赖于许多提供框架/功能需求的第三方库代码。不同于应用程序代码，这些第三方库代码不会频繁修改。如果我们将这些库(library)中的代码，保留在与应用程序代码相独立的 bundle 中，我们就可以利用浏览器缓存机制，把这些文件长时间地缓存在用户机器上。
    
     webpack 提供了 CommonsChunkPlugin 插件,用于完成第三方JS库的代码分割,具体如下:
     
     ```JavaScript
       // 在 entry 中指定要抽离的第三方 JS 库。
       entry: {
         "vendor": ['react','react-dom','react-router','redux','react-redux','n-zepto','echarts','moment'],
         "bundle": path.resolve('src/') + '/index.js'
       }
        
       // 在 plugins 中添加 CommonsChunkPlugin 插件,并指定提取出来第三方库文件的名称。
       plugins : [
         new webpack.optimize.CommonsChunkPlugin({
               name: "vendor" // 和 entry 中指定的名称对应
         })
       ]
     ```
     
   * 分离 CSS 
     
     在代码中,引入的样式资源,我们可以将样式代码分离到单独的 bundle 中，与应用程序的逻辑分离。 这加强了样式的可缓存性，并且使得浏览器能够并行加载应用程序代码中的样式文件，避免无样式内容造成的闪烁问题。通过 webpack 的 ExtractTextWebpackPlugin 完成样式的提取。具体的用法参看前面的 __ExtractTextWebpackPlugin - 破坏性改动__。

#### 2. 按需加载

对于一个项目,像单页应用,展示首页时往往不需要将所有资源都加载到浏览器端,这样的好处就是能够是减少首屏渲染时间,所以 webpack 提供了相应的方法,让你指定代码分割点,可以实现对应的代码按需加载。这里我们通过 ``require.ensure(dependencies: String[], callback: function(require), errorCallback: function(error), chunkName: String)`` 来定义分割点。
    
  * dependencies 
        
    定义callback执行依赖的模块。
    
  * callback 
       
    当所有dependencies定义的依赖加载完后,callback 就会被执行,require 作为参数传入,在callback中 require 引入的模块都会被合并成一个chunk, 然后在程序用到的时候,动态加载。
    
  * errorCallback 
        
    依赖加载失败回调
  
  * chunkName
     
    合并后的按需加载块的名称,如果这里不指定,默认会按照output中定义的 filename 定义的名称格式来,其中的 ``[name]`` 被块 ``[id]`` 替换。所以得到的文件名称如下图:
        
   ![id加chunkhash:8加version](http://rainypin.qiniudn.com/blog/images/chunk-name.png)
    
   指定名称后:
    
   ```JavaScript
    {
      path: '/home/order-detail', // 订单分析 -> 订单明细
      onEnter: routeAuths.onSubRouteEnter.bind(routeAuths),
      getComponents: (nextState, callback) => {
        require.ensure([], function(require) {
          callback(null, require('./pages/dashboard/order-detail'))
        },'order-detail')
      }
    }
   ```
       
  ![chunkname加chunkhash:8加version](http://rainypin.qiniudn.com/blog/images/chunk-name-2.png)
    
   
## npm prune 后通过 npm shrinkwrap 锁定依赖包版本

在维护老项目的时候,经常会遇到因为包版本的升级,导致项目打包失败的问题,或者也遇到过,在你电脑上运行没问题的代码,然后在同事电脑上安装完依赖包却报错。因为 npm 包管理工具在安装一个包后,在package.json中记录的版本是一个范围,如下:

![package,json](http://rainypin.qiniudn.com/blog/images/pkg.png)

如上面的 react-router 指定的是2.8.1以上的版本,然后现在可以用的版本已经是 3.x 了,并且有不少的改动,如果别的同事直接 ``npm install`` 安装的 react-router 可能就是最新版本,所以可能就会导致程序运行出错,所以我们可以通过``npm shrinkwrap``命令,生成当前正在使用的包版本信息文件npm-shrinkwrap.json,然后提交到代码仓库,其他同事通过 ``npm install`` 依赖包的时候,会先读取 npm-shrinkwrap.json 版本信息,然后进行安装,这样就能保证每个人电脑上依赖包版本的一致,也使得后面代码的维护更加简单。更多内容可以参考 [npm shrinkwrap 官方说明](https://docs.npmjs.com/cli/shrinkwrap)。

__注:如果执行npm shrinkwrap 命令失败,可能是因为你直接安装了一些依赖包,但并没有记录在package.json文件中导致的,可以通过npm prune移除这些未记录在package.json的包后,再通过npm shrinkwrap 尝试生成版本信息文件。__


## 完善项目构建打包 

由于之前项目打包构建针对不同情况的配置直接写在打包任务中,导致构建任务变得复杂,不够清晰,也不便于和后端联调,所以这次对其做了一些调整,前端代码其实主要会根据三种情况进行不同的打包,分别是本地调试,接近发布状态的调试,发布打包,所以针对三种情况分离出特有的配置内容和公共的配置内容如下:


![三种情况打包配置](http://rainypin.qiniudn.com/blog/images/webpack.png)


三种情况特有配置分别对应文件:local.js , beta.js , release.js。除了特有的配置,文件中还包含了每种情况环境常量,如打包后文件存放路径,publicPath 等。

![打包构建目录结构](http://rainypin.qiniudn.com/blog/images/package.png)

local.js, beta.js, release.js 配置内容结构大致如下:

```javascript
"use strict";

const webpack = require('webpack'),
      path = require('path'),
      util = require('../lib/util.js');

let constants = {
    // 不同情况环境常量
};

let webpackConfig = {
    // 特有webpack打包配置
};

module.exports = {
  constants,
  webpack : webpackConfig
};

```
最后在 package.json 加入针对不同情况的打包命令:

```javascript
"scripts": {
    "local": "gulp build -h", // 针对本地开发自测打包,同时开启mock服务,相当于gulp build -l -h
    "beta": "gulp build -b", // 预发布状态打包测试,会打出sourcemap,便于调试定位问题。
    "release": "gulp build -r" // 发布打包,会将打完包的文件发布到cdn上
}
```


## 参考文档

1. [webpack docs](https://doc.webpack-china.org/) 
2. [npm shrinkwrap](https://docs.npmjs.com/cli/shrinkwrap)

 
