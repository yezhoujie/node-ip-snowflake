//this is the example.
var snowflake = require('../lib/snowflake');

/***************************************************/
//only run snowflake nextId
// var snowflake = require('../').Snowflake;
// console.log(snowflake.nextId());
function withCustomConfig(){
    var config = {
        timeBits: 32,
        workerBits: 16,
        seqBits: 15,
        ip: '10.10.9.10',
        beginTime: "2019-01-01"
    };
    snowflake.init(config);
    for(var i =0 ; i < 10; i++){
        console.log(snowflake.nextId(36));
    }
}


function usingDefaultConfig(){
    console.log(snowflake.nextId(10));
}

usingDefaultConfig();
withCustomConfig();