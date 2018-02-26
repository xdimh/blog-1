---
title: git 和 npm 常用命令汇总
type: original
tags: [git,npm]
categories: [前端大杂烩]
date: 2017-06-24 13:12:17
description: 
---

　　最近几个星期一直忙着公司各种业务,再加上王者农药简直不要太火,一不小心入坑了,所以记录中断了一阵。对于前端开发工程师来说工具中用的最多的莫过于 git 和 npm 了,随着做得业务越来越多,也封装了一些通用组件出来,为了能够更方便的在多个项目之间共享通用组件,也更好的对组件进行维护,所以在公司内部搭了一个私有的npm服务。具体如何搭建可以参考这篇文章:http://www.cnblogs.com/wyzfzu/p/4149310.html,在配置的过程中注意以下几点配置:

```javascript
{  // default system admins
   admins: {
     // name: email
     fengmk2: 'fengmk2@gmail.com',
     admin: 'admin@cnpmjs.org',
     dead_horse: 'dead_horse@qq.com',
   },
  // enable private mode or not
  // private mode: only admins can publish, other users just can sync package from source npm
  // public mode: all users can publish
  enablePrivate: false,

  // registry scopes, if don't set, means do not support scopes
  scopes: [ '@cnpm', '@cnpmtest', '@cnpm-test' ],
 // if set true, will 302 redirect to `nfs.url(dist.key)`
 downloadRedirectToNFS: false,

 // registry url name
 registryHost: 'r.cnpmjs.org'
}
```

如果你不允许其他人未经授权的情况下提交模块到私有npm服务器上,这里enablePrivate 就需要设置为false。此时只有在 admins 中列举的用户才能够提交模块到npm服务器上。如果你希望你上传的组件,模块团队成员其他人也能够下载安装,那么 downloadRedirectToNFS 你就需要设置为true,registryHost 也需要设置成你自己的地址如``http://192.168.1.6:7001`` 上面的scope类似一个命名空间,这样在不同scope中同名的模块也不会出现冲突。


　　搭好了服务器后,我们需要知道一些常用的 npm 命令,首先我们需要新建一个用户,然后登陆npm 服务才能进行提交模块。

* npm adduser

创建用户,通常需要指定 registry, 如果不指定,采用默认的。我们可以通过nrm 这个模块来方便快捷的切换不同的registry。 

```
  npm ---- https://registry.npmjs.org/
  cnpm --- http://r.cnpmjs.org/
* taobao - http://registry.npm.taobao.org/
  edunpm - http://registry.enpmjs.org/
  eu ----- http://registry.npmjs.eu/
  au ----- http://registry.npmjs.org.au/
  sl ----- http://npm.strongloop.com/
  nj ----- https://registry.nodejitsu.com/
  pt ----- http://registry.npmjs.pt/
  yzj ---- http://192.168.101.243:7001/

```
带星号的表示当前正在使用的 registry 。

* npm login 

> npm login is an alias to adduser and behaves exactly the same way.
  
* npm publish 

提交模块到指定的 registry

* npm unpublish [<@scope>/]<pkg>[@<version>] [--force]

删除服务器上的模块,可能有人想知道这里scope 具体使用方式,下面就简单介绍下好了。

scope 就像命名空间一样,不过这个是用在npm 模块上的,如果一个模块以@开通那么他就是一个scope 模块。例如 ``@scope/project-name`` , 每一个npm 用户都有一个默认的scope,这个scope就是用户名, ``@username/project-name`` 。 怎么提交自己的模块到scope中呢?
其实比较简单,只要在 package.json 中name字段加上scope名就行,如下:

```javascript
{
  "name": "@yzj/rn-component",
  "version": "0.1.1"
}
```

安装的时候需要提供包括scope的模块名称,如 ``npm install -S @yzj/rn-component`` ,这样会在你 node_modules 目录出现 @yzj 目录。

![npm scope](http://rainypin.qiniudn.com/blog/images/npm-scope.png)

可以在package.json 文件中看到具体的依赖

```
"dependencies": {
    "@yzj/rn-component": "^0.1.1"
}
```

scope 带来的好处,这样能够清楚的知道哪些模块是公共npm下载的,哪些是私有npm上的,如果哪天公共模块不能满足需求,我们在其基础之上改了代码,发布成同名的模块,我们最好在前面带个scope 这样能够很好很清晰的进行区分。

* npm owner add <user> [<@scope>/]<pkg>
 
给项目添加维护人员。如果一个模块有好几个人共同维护提交,那么就需要通过这个命令,添加共同维护人员。

* npm owner rm <user> [<@scope>/]<pkg>
   
看名字就是删除某个维护人员

* npm owner ls [<@scope>/]<pkg> 

列举出这个模块的所有维护人员。


## Git 常用命令汇总

如果我们在github上面看到一个好的项目,但是我们想改变其源码使其能够契合我们的业务场景,可以通过命令:

``git clone project-url [rename]`` 

克隆远程仓库到本地。然后通过 ``git pull`` 同步远程最新内容到本地。这个时候往往我们处于本地的master分支上,如果你想看本地又多少分支,可以通过命令 ``git branch`` 查看,其中分支名前面带星号的是我们正处于的分支。

```
* master
```
如果你还想知道远程仓库有几个分支,可以通过命令 ``git branch -a`` 来查看

```
* master
  remotes/blog/master
```
如果这个时候,我们不想直接在master上修改代码,我们可以通过命令``git checkout  -b new_branch_name``从master创建分支 new_branch_name 并切换到这个分支上。当你修改完代码后,你可以通过命令``git status``看下我们有几个文件被修改,这些修改的内容有没有处于待提交状态

```
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git checkout -- <file>..." to discard changes in working directory)

        modified:   .deploy_git (new commits)
        modified:   source/_posts/event-proxy.md
        modified:   source/_posts/fe-event-loop.md
        modified:   source/_posts/webpack1-to-webpack2.md
        modified:   themes/weekly/source/js/coupon.js
        modified:   themes/weekly/source/js/couponfs.js

Untracked files:
  (use "git add <file>..." to include in what will be committed)

        public/
        source/_drafts/
        source/_posts/git-and-npm.md

```

可以看到有些文件虽然被修改了 但是还是处于untracked状态,那么我们可以通过``git add . `` 命令一次将显示的所有untracked文件变成待提交状态。这个时候我们就可以通过``git commit -m 'msg'`` 来提交这次修改,如果我们想把这个分支也同步到远程仓库去就需要通过命令``git push origin new_branch_name`` , 这样远程仓库就也有一个和本地一样的分支,团队中的其他成员就可以checkout,并在同一个分支上进行就改,如果不需要将这个分支push到远程仓库,那么你也可以通过``git checkout master `` 先切换到master分支,然后通过命令 ``git merge new_branch_name`` 将分支内容合并到本地master 分支上,然后``git pull && git add . && git commit -m 'msg' && git push origin master`` 将master新提交的内容同步到远程。然后通过命令 ``git branch -d new_branch_name``删除本地分支。 当代码到达一个阶段趋于稳定后,我们就会进行一个发版,这个时候就需要给代码打一个tag,作为一个阶段节点,我们可以通过命令``git tag -a v1.1.4 -m '版本更新内容'`` 新建一个tag,这个时候如果发现我们tag版本更新内容写错了,我们可以将刚刚建立的tag,删除掉,通过``git tag -d v1.1.4`` 重新建一个,然后我们将tag标签push到远程仓库 ``git push origin v1.1.4``。


## Git 常见问题 

1. 如何删除远程仓库的一次错误提交 ?
    
    * git reset commit-id 
     
        本地先切换到正确提交节点
    
    * git push origin -d branch-name / git push origin :branch-name 
        
        上面两种方式选一种删除远程分支
        
    * git push origin branch-name
        
        将本地分支重新推送到远程
    

2. 如何删除远程仓库的一次错误tag ?

    * git tag -d <tagname> && git push origin :refs/tags/<tagname>
     
        删除本地tag,然后推送一个空tag到远程,等同于删除远程tag


3. 如何解决更新的时候因为本地有修改,不能成功更新的问题?
    
    * git stash 
        
        暂存本地修改内容
    
    * git pull 
        
        拉取更新
    
    * git stash pop 
        
        弹出本地内容进行合并,如果有冲突则进行冲突解决

4. 如何从tag检出代码?
        
    * git checkout -b branch_name tag_name


## 参考 
1. http://zengrong.net/post/1746.htm
2. http://zengrong.net/post/1746.htm
3. https://docs.npmjs.com/getting-started/scoped-packages
