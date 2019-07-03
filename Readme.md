node-ip-snowflake

[![Build Status](https://travis-ci.com/yezhoujie/node-ip-snowflake.svg?branch=master)](https://travis-ci.com/yezhoujie/node-ip-snowflake)

[中文文档](Readme-CN.md)
==============

node-ip-snowflake is a node.js clone and some updateing for [snowflake-uid](https://github.com/johnhuang-cn/snowflake-uid).

It referenced the baidu's implementaton of [https://github.com/baidu/uid-generator](https://github.com/baidu/uid-generator).  But this generator is a simpler and non-db implementation, the default generator uses the last 16bit value of the ip address as the worker id, 32 bits for timestamp, and 15 bits for sequence. So it can generate 32768 sequence/second for each instance for about 128 years.

- advantage
  1. no need to assign datacenterId and workerId by using zookeeper or something else, it will generate workerId by IP address automatic
  2. it is very suitable for docker containners or other stateless services running in kubernetes or other clusters.
  3. it can avoid the digital progress problem in js, and can convert to some common HEX like 10,16,32
  4. you can using the custom config according your IP configuation.


## Snowflake

\*\* Snowflake algorithm：\*\* An unique id consists of worker node, timestamp and sequence within that timestamp. Usually, it is a 64 bits number\(long\), and the default bits of that three fields are as follows:

| sign | delta seconds | worker node id | sequence |
| :---: | :---: | :---: | :---: |
| 1 bit | 32 bits | 16bits | 15bits |

* sign\(1bit\)  
  The highest bit is always 0.

* delta seconds \(32 bits\)  
  The next 32 bits, represents delta seconds since a customer epoch\(2019-01-01\). The maximum time will be 128 years.

* worker id \(16 bits\)  
  The next 16 bits, represents the worker node id, maximum value will be 65536
. Why set 16 bits instead of the 22 bits of baidu's implementation is because usually we set the CIDR of k8s env is /16. 16 bits can guarantee that each instance has an unique worker id. If you can set the network CIDR to /24, you can increase the worker id bits, and decrease the time bits and sequence bits.

* sequence \(15 bits\)  
  the last 15 bits, represents sequence within the one second, maximum is 32768
 per second for one instance by default.


you can change the last three bits(delta seconds,  worker id, sequence) by yourself depending your network settings, (total bits must equals to 64).


### how to use
```
// only run example
npm install
node examples/example.js
```

--------------------------
```
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
//only run snowflake nextId with default setting, and get ID in HEX 10.
var snowflake = require('node-ip-snowflake').Snowflake;
var id = snowflake.nextId(); // use default setting
console.log(id);
//only run snowflake nextId with default setting, and get ID in HEX 36. 
var snowflake = require('node-ip-snowflake').Snowflake;
var id = snowflake.nextId(36); // use default setting
console.log(id);
```

---------------------------
```
//using custom settting.<br>
var snowflake = require('node-ip-snowflake').Snowflake;<br>
 let config = {
       timeBits: 32,
       workerBits: 16,
       seqBits: 15,
       ip: '10.10.9.10',
       beginTime: "2019-01-01"
   };
 snowflake.init(config);
var id = snowflake.nextId(16); // return a ID in HEX 16
console.log(id);
```

----------------------------

### initialization configurations( init(config) )
- **workerBits**: it is the CIDR in your cluster if your CIDR is /24, then it should be 24, other than one of your instance can be assgin to the same worker id. **default:16**
- **timeBits**: represents delta seconds since a customer epoch(see beginTime config below). you can increase or decrease by yourself according workerBits setting. **default:32**
- **seqBits**: represents sequence within the one second, you can increase or decrease by yourself according workerBits setting. **default:15**

**(important: whatever how you change the three configuration abouve, the sum of  workerBits+timeBits+seqBits should be 63)**

- **ip**: the program will get your IP by getting eth0, if you don't have a network adapter named eth0, you should get the IP address by yourself, and call the init fucntion using this ip, otherwise, **the default IP will be: 192.168.0.1**
- **beginTime**: the begin date the ID will generated, and maximun time for this program available will calculated by this configuartion, for example, if the beginTime is '2019-01-01' and the program will no longer generate new ID 128 years later since '2019-01-01'. **default: '2019-01-01'**

**attention: beginTime should not be changed after it has been setted, and started to generate ID in your production env. otherwise you might get the same ID.**

### fucntion nextId(HEX)
- the fucntion nextId(HEX) has a parameter HEX, it can be set to convert your result ID in a particular HEX. it have been tested in HEX 2, 10, 16, 32, 36
- you can just call nextId() and get the result in HEX 10
- you should not treat the result in HEX 2, 10 as a Number, because in js it has a digital progress problem.

### see examples/example.js