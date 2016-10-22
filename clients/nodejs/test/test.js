tsd = require('../lib/tsd-metrics-client')
colors = require('colors');

tsd.TsdMetrics.CONSOLE_ECHO = true;
function defaultLog(message) {
    if (Object.keys(arguments).length === 1) {
        console.log(message.yellow);
    } else {
        var args = arguments;
        delete args[0];
        console.log(message.yellow, args);
    }
}
var tests = [
    function test1(done) {
        var m = new tsd.TsdMetrics();

        defaultLog("start timer1");
        m.startTimer("timer1");

        var tmp = Math.floor(Math.random() * 50.0);
        defaultLog("increment counter 'hello' by " + tmp)
        m.incrementCounter("hello", tmp);

        defaultLog("decrement counter 'world'")
        m.decrementCounter("world");

        defaultLog("reset counter 'world'")
        m.resetCounter("world");

        tmp = Math.floor(Math.random() * 50.0);
        defaultLog("decrement counter 'world' by " + tmp)
        m.decrementCounter("world", tmp);

        tmp = Math.random() * 1000;
        defaultLog("set gauge 'gg' to " + tmp)
        m.setGauge("gg", tmp);

        tmp = Math.random() * 1000;
        defaultLog("set gauge 'gg' to " + tmp)
        m.setGauge("gg", tmp);

        setTimeout(function () {
            defaultLog("stop timer1 after ~750ms");
            m.stopTimer("timer1");
            m.close();
            done();
        }, 750);
    },

    function test2(done) {
        var m = new tsd.TsdMetrics();

        defaultLog("start timer1");
        m.startTimer("timer1");

        defaultLog("start timer2");
        m.startTimer("timer2");

        defaultLog("start timer3");
        m.startTimer("timer3");

        setTimeout(function () {
            defaultLog("stop timer1 after ~750ms");
            m.stopTimer("timer1");
            defaultLog("start timer1");
            m.startTimer("timer1");
            setTimeout(function () {
                defaultLog("stop timer2 after ~" + (750 + 150) + "ms");
                m.stopTimer("timer2");
                setTimeout(function () {
                    defaultLog("stop timer2 after ~" + (450 + 150) + "ms");
                    m.stopTimer("timer1")
                    defaultLog("close and auto stop timer3 after ~" + (750 + 150 + 450) + "ms")
                    m.close();
                    done();
                }, 450);
            }, 150);
        }, 750);
    },
    function test3(done) {
        var m = new tsd.TsdMetrics();
        m.addListener("error", function(err){console.log(err.toString().red)});

        var tmp = Math.floor(Math.random() * 50.0);
        defaultLog("increment counter 'hello' by " + tmp)
        m.incrementCounter("hello", tmp);

        tmp = Math.random() * 1000;
        defaultLog("set gauge 'gg' to " + tmp)
        m.setGauge("gg", tmp);

        defaultLog("closing");
        m.close();
        defaultLog("closing again");
        m.close();
        done();
    }
];

var count = 0;
function functionName(fun) {
    var ret = fun.toString();
    ret = ret.substr('function '.length);
    ret = ret.substr(0, ret.indexOf('('));
    return ret;
}
function executeTests() {
    if (count < tests.length) {
        defaultLog('==========================================');
        defaultLog(("Executing " + functionName(tests[count])));
        defaultLog("==========================================");
        tests[count++](executeTests);
    }
}
executeTests();