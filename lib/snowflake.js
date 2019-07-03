/**
 * User: Carter ye
 * Date: 19-6-21
 * Time: 11:24
 * Version: 1.0
 * Description:
 */
const os = require("os");
const moment = require("moment");
var BigInteger = require("./jsbn");
var snowflake = module.exports;
var TOTAL_BITS = 1 << 6;
var DEFAULT_BASE_DATE = "2019-01-01";

/**
 * Bits for [sign-> second-> workId-> sequence]
 */
var signBits = 1;

// the start time, default is 2019-01-01
var baseEpoch = 1546272000;

// delta seconds
var timeBits = 32;

// worker node id bits
var workerBits = 16;

// sequence bits
var seqBits = 15;

/** Volatile fields caused by nextId() */
var sequence;
var lastSecond = -1;

var maxDeltaSeconds;
var maxWorkerId;
var maxSequence;

var timestampShift;
var workerIdShift;

var c_workerId;
var c_sequence;

var c_ip;

var inited = false;
snowflake.init = function (config) {
    console.info("snowflake start to init.......");
    if (config && config.workerBits && !isNaN(config.workerBits) && config.timeBits && !isNaN(config.timeBits) && config.seqBits && !isNaN(config.seqBits)) {
        workerBits = config.workerBits;
        timeBits = config.timeBits;
        seqBits = config.seqBits;
        console.info("using bits in config: workerBits:" + config.workerBits + ", timeBits:" + config.timeBits + ",seqBits:" + config.seqBits);
    } else {
        console.warn("missing workerBits in config, using default workerBits: 16");
        workerBits = 16;
    }

    if (config && config.beginTime) {
        baseEpoch = moment(config.beginTime).unix();
        console.info("using beginTime in config:" + baseEpoch);
    } else {
        console.info("using default beginTime:" + baseEpoch);
    }
    if (config && config.ip) {
        c_ip = config.ip;
    }

    // initialize max value
    maxWorkerId = new BigInteger("-1").xor(new BigInteger("-1").shiftLeft(workerBits)).toRadix(10);
    // maxDeltaSeconds = 4294967295;
    maxDeltaSeconds = new BigInteger("-1").xor(new BigInteger("-1").shiftLeft(timeBits)).toRadix(10);
    maxSequence = new BigInteger("-1").xor(new BigInteger("-1").shiftLeft(seqBits)).toRadix(10);

    c_workerId = Number(getWorkerIdByIP(workerBits));

    var allocateTotalBits = signBits + timeBits + workerBits + seqBits;
    if (allocateTotalBits != TOTAL_BITS) {
        throw new Error('allocate not equals to 64 bits');
    }

    c_sequence = 0;
    if (c_workerId > maxWorkerId || c_workerId < 0) {
        throw new Error('config.worker_id must max than 0 and small than maxWorkerId-[' +
            maxWorkerId + ']');
    }

    // initialize shift
    timestampShift = workerBits + seqBits;
    workerIdShift = seqBits;
    console.info("showflake, workid:" + c_workerId + " initialization done");
    inited = true;
};

snowflake.nextId = function (radix) {
    if (!inited) {
        this.init();
    }

    if (isNaN(radix)) {
        radix = 10;
    }

    let workerId = c_workerId;
    sequence = sequence || c_sequence;

    if (workerId > maxWorkerId || workerId < 0) {
        throw new Error('workerId must max than 0 and small than maxWorkerId-[' +
            maxWorkerId + ']');
    }




    var currentSecond = getCurrentSecond();

    // Clock moved backwards, refuse to generate uid
    if (currentSecond < lastSecond) {
        var refusedSeconds = lastSecond - currentSecond;
        console.error("Clock moved backwards. Refusing for %d seconds", refusedSeconds);
    }

    // At the same second, increase sequence
    if (currentSecond == lastSecond) {
        sequence = (sequence + 1) & maxSequence;
        // Exceed the max sequence, we wait the next second to generate uid
        if (sequence == 0) {
            currentSecond = getNextSecond(lastSecond);
        }

        // At the different second, sequence restart from zero
    } else {
        sequence = 0;
    }

    lastSecond = currentSecond;

    // Allocate bits for UID
    var deltaSeconds = currentSecond - baseEpoch;
    var nfirst = new BigInteger(String(deltaSeconds), 10);
    nfirst = nfirst.shiftLeft(timestampShift);
    var nlast = new BigInteger(String(workerId), 10);
    nlast = nlast.shiftLeft(workerIdShift);
    nlast = nlast.or(new BigInteger(String(sequence), 10));

    var nnextId = nfirst.or(new BigInteger(String(nlast), 10));
    var nextId = nnextId.toRadix(radix);
    return String(nextId);
};


/**
 * Get the worker id by using the last x bits of the local ip address
 * @throws UnknownHostException 
 */
function getWorkerIdByIP(bits) {
    var shift = 64 - bits;
    var address = '192.168.0.1';
    if (c_ip) {
        console.info("using config ip:" + c_ip);
        address = c_ip;
    } else {
        var networkInterfaces = os.networkInterfaces();
        if (networkInterfaces['eth0'] && networkInterfaces['eth0'][0]) {
            address = networkInterfaces['eth0'][0].address;
        } else {
            console.warn("can not find IP address of 'eth0', using default IP " + address + "!");
        }
    }
    var ip = ipV4ToLong(address);
    ip = Number(ip.toString());
    var workerId = (ip << shift) >>> shift;
    return workerId;
}


function ipV4ToLong(ip) {
    var octets = ip.toString().split(".");
    var res = Number(new BigInteger(octets[0]).shiftLeft(24)) + Number(new BigInteger(octets[1]).shiftLeft(16)) +
        Number(new BigInteger(octets[2]).shiftLeft(8)) + Number(octets[3]);

    return res;
}


function getCurrentSecond() {
    var currentSecond = Date.parse(new Date()) / 1000;
    if (currentSecond - baseEpoch > maxDeltaSeconds) {
        throw new Error("Timestamp bits is exhausted. Refusing UID generate. Now: " + currentSecond);
    }

    return currentSecond;
}

/**
 * Get next millisecond
 */
function getNextSecond(lastTimestamp) {
    var timestamp = getCurrentSecond();
    while (timestamp <= lastTimestamp) {
        timestamp = getCurrentSecond();
    }

    return timestamp;
}