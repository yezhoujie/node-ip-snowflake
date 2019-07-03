node-ip-snowflake

[![Build Status](https://travis-ci.com/yezhoujie/node-ip-snowflake.svg?branch=master)](https://travis-ci.com/yezhoujie/node-ip-snowflake)
==============

node-ip-snowflake 是根据java版的[snowflake-uid](https://github.com/johnhuang-cn/snowflake-uid). 做了nodejs的实现和一些修改.同时感谢[node-snowflake](http://github.com/kurten/node-snowflake.git)提供tiwtter版的代码。


node-ip-snowflake是基于Twitter Snowflake算法的分布式ID生成器，参考了百度的实现[https://github.com/baidu/uid-generator](https://github.com/baidu/uid-generator). 不过相对来说要更简单并且不依赖于DB。其默认实现使用32位的时间，16位的worker id和最后的15位用于生成序列。提供单实例每秒32768个序列号，可使用128年。

- 优点
  1. 不需要利用zookeeper或者数据库来分配datacenterId 和 workerId给各个示例，程序会自动根据实例或者pod的IP生成唯一的workId(前提是配置的worker id位 和你的网络CIDR配置相对应)。
  2. 他非常适合在docker容器中或者k8s集群这种无状态的服务中使用，因为省去了分发datacenterId 和 workerId的操作
  3. 他能避免js中Number长度过长引起的精度丢失问题, 也可以转成需要的一些进制，比如 2进制，10进制，16进制，36进制等.
  4. 你可以根据你自己的IP配置来配置程序的各种参数。

## Snowflake

\*\* Snowflake 算法：\*\* 一种分布式唯一ID的算法， 通过每个实例拥有唯一的workerId, 结合时间戳, 相同时间戳内的顺序来生成的。一般来说，他是一个64位的数字, 64位数字的分布图如下:

| sign | delta seconds | worker node id | sequence |
| :---: | :---: | :---: | :---: |
| 1 bit | 32 bits | 16bits | 15bits |

* 标志位\(1bit\)
  他是最高位，总是为0.  

* 时间戳位\(32 bits\)  
  接下来的32位代表时间戳从一个自定义的起始时间开始计算（后面参数介绍会讲到), 默认最大的可用时间可以到128年以后.

* worker id位 \(16 bits\)  
  接下来的16位, 代表是哪个实例生成的这个编号，默认支持65536个实例同时生成ID. 为什么用16位替换百度的22位？因为我们在集群里或者k8s中通常设置CIDR为/16. 16位可以保证每个实例的IP可以获取到一个唯一的workerId. 如果你的CIDR为/24， 那么你可以增加这个位数从16位到24位，同时减少时间戳位和顺序位的位数。

* 顺序位 \(15 bits\)  
  最后的15位为顺序位, 表明同一个workerId, 同一秒钟可以产生多少个不同的ID，默认为32768个ID,每秒。

**你可以根据自己的网络配置，更改最后的三个数据段中的位数（时间戳位, worker id位, 顺序位), 但是需要注意的是,最终所有的位数加在一起一定要等于64.**

### 如何使用
```
// 仅仅是运行样例代码
npm install
node examples/example.js
```

--------------------------
```
//从npm仓库下载依赖
npm i node-ip-snowflake
```
```
// in package.json
.....
  "dependencies": {
    ......
    "node-ip-snowflake": "^1.0.1"
  }
.....
```
```
// 使用默认配置，来生成ID,并返回10进制的结果
var snowflake = require('node-ip-snowflake').Snowflake;
var id = snowflake.nextId(); // use default setting
console.log(id);
//使用默认配置，来生成ID,并返回36进制的结果 
var snowflake = require('node-ip-snowflake').Snowflake;
var id = snowflake.nextId(36); // use default setting
console.log(id);
```

---------------------------
```
//自定义配置初始化
var snowflake = require('node-ip-snowflake').Snowflake;<br>
 let config = {
       timeBits: 32,
       workerBits: 16,
       seqBits: 15,
       ip: '10.10.9.10',
       beginTime: "2019-01-01"
   };
 snowflake.init(config);
var id = snowflake.nextId(16); // 返回一个16进制的结果
console.log(id);
```

----------------------------

### 初始化配置项( init(config) )
- **workerBits**: 根据你集群中的CIDR配置来设置， 如果CIDR是/24, 那么就设置成24，如果比匹配的话，能会造成一些实例获取到相同的workerId, **默认为:16**
- **timeBits**: 代表从开始时间起（见beginTime配置）代表时间戳的位数. 你需要配合workerBits的配置来适当的减少或增加位数值。 **默认:32**
- **seqBits**: 代表顺序值的位数大小。改位数的大小影响一个实例在同一秒中可以生产的ID数。你需要配合workerBits的配置来适当的减少或增加位数值. **默认:15**

**(注意事项: 不管你如何配置上面三个位数的值，要注意的是, 最终所有的的位数相加一定要等于63**

- **ip**: 该程序会自动获取你的eth0网卡来获取当前的IP地址,如果你的实例不存在该名称的网卡，那么你需要自己获取该实例的IP地址，并在初始化中传进来，否则程序会默认使用**192.168.0.1**这个IP. 
- **beginTime**: 改程序默认配置下可以正常工作128年，这个参数就代表了开始工作的时间，如果你设置了改参数为'2019-01-01', 那个么这个程序就会在'2019-01-01'之后的128年正常工作。**默认: '2019-01-01'**

**注意事项: beginTime这个参数在一旦被设置并开始在你的生产环境是使用，那么请不要轻易修改他，这样会造成可能会生成出重复的ID！！！！**

### 方法 nextId(HEX)
- 该方法有一个HEX参数，用于表示返回结果的进制，你可以设置成你想要的进制，避免后期转换出现数字精度问题。目前已测试的有2，10，16，32，36进制。
- 直接调用 nextId() 会返回默认10进制的结果。
- 如果返回的是2进制，或者是10进制，请不要以Number类型来对待他，否者会出现精度损失问题。

### 使用样例参照 examples/example.js