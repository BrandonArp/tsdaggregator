var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var log4js = require("log4js");
var events = require("events");

/**
* Class for managing samples for a counter
*/
var CounterSamples = (function () {
    function CounterSamples() {
        this.samples = new Array();
        this.lastIndex = 0;
        this.reset();
    }
    /**
    * Create a new sample for the counter with value of zero
    */
    CounterSamples.prototype.reset = function () {
        this.lastIndex = this.samples.push(0) - 1;
    };

    /**
    * Increment the current sample
    * @param value Signed value to increment the sample byt
    */
    CounterSamples.prototype.increment = function (value) {
        this.samples[this.lastIndex] += value;
    };

    CounterSamples.prototype.toJSON = function () {
        return this.samples;
    };
    return CounterSamples;
})();

/**
* Class for creating duration sample for a timer
*/
var TimerSamples = (function () {
    function TimerSamples() {
        this.durations = new Array();
    }
    /**
    * Add explicit timer duration
    * @param duration
    */
    TimerSamples.prototype.addDuration = function (duration) {
        this.durations.push(duration);
    };

    /**
    * Start a new timer
    */
    TimerSamples.prototype.start = function () {
        this.startTime = Date.now();
    };

    /**
    * Stop the current timer
    */
    TimerSamples.prototype.stop = function () {
        if (this.startTime != undefined) {
            this.addDuration(Date.now() - this.startTime);
        }
        this.startTime = undefined;
    };

    TimerSamples.prototype.toJSON = function () {
        return this.durations;
    };
    return TimerSamples;
})();

var Lazy = (function () {
    function Lazy(factory) {
        this.factory = factory;
    }
    Lazy.prototype.getValue = function () {
        if (this.value == undefined) {
            this.value = this.factory();
        }
        return this.value;
    };
    return Lazy;
})();

/**
* Node JS class for publishing metrics as  time series data (TSD).
* For more information see:
*
* https://wiki.groupondev.com/TsdAggregator
*/
var TsdMetrics = (function (_super) {
    __extends(TsdMetrics, _super);
    function TsdMetrics() {
        _super.call(this);
        /**
        *
        */
        this.isOpen = true;
        //anonymous type for representing the final json blob
        this.logEntry = {
            annotations: {},
            counters: {},
            gauges: {},
            timers: {},
            version: "2c"
        };

        //according to http://nodejs.org/docs/v0.3.5/api/events.html#events.EventEmitter
        //if an error event is emitted and nothing was listening, the process will exist, so we are adding this
        //do-nothing listener in order not to exist the process
        this.addListener("error", function (error) {
        });
        this.annotate("initTimestamp", (Date.now() / 1000.0).toString());
    }
    /**
    * Assert that a condition is true and emit an error event and
    * @param condition
    * @param message
    * @returns {boolean}
    */
    TsdMetrics.prototype.assert = function (condition, message) {
        if (!condition) {
            this.emit("error", new Error(message));
            return false;
        }
        return true;
    };

    TsdMetrics.prototype.assertIsOpen = function () {
        return this.assert(this.isOpen, "Metrics object was not opened or it's already closed");
    };

    /**
    * Increment the specified counter by the specified amount. All counters are
    * initialized to zero.
    *
    * @param name The name of the counter.
    * @param value The amount to increment by.
    */
    TsdMetrics.prototype.incrementCounter = function (name, value) {
        if (typeof value === "undefined") { value = 1; }
        this.assertIsOpen();
        if (this.logEntry.counters[name] == undefined) {
            this.logEntry.counters[name] = new CounterSamples();
        }
        this.logEntry.counters[name].increment(value);
    };

    /**
    * Decrement the specified counter by the specified amount. All counters are
    * initialized to zero.
    *
    * @param name The name of the counter.
    * @param value The amount to decrement by.
    */
    TsdMetrics.prototype.decrementCounter = function (name, value) {
        if (typeof value === "undefined") { value = 1; }
        this.incrementCounter(name, -value);
    };

    /**
    * Reset the counter to zero. This most commonly used to record a zero-count
    * for a particular counter. If clients wish to record set count metrics
    * then all counters should be reset before conditionally invoking increment
    * and/or decrement.
    *
    * @param name The name of the counter.
    */
    TsdMetrics.prototype.resetCounter = function (name) {
        if (this.assertIsOpen()) {
            if (this.logEntry.counters[name] == undefined) {
                this.logEntry.counters[name] = new CounterSamples();
            } else {
                this.logEntry.counters[name].reset();
            }
        }
    };

    /**
    * Start the specified timer measurement.
    *
    * @param name The name of the timer.
    */
    TsdMetrics.prototype.startTimer = function (name) {
        if (this.assertIsOpen()) {
            if (this.logEntry.timers[name] == undefined) {
                this.logEntry.timers[name] = new TimerSamples();
            }
            this.logEntry.timers[name].start();
        }
    };

    /**
    * Stop the specified timer measurement.
    *
    * @param name The name of the timer.
    */
    TsdMetrics.prototype.stopTimer = function (name) {
        if (this.assertIsOpen()) {
            this.assert(this.logEntry.timers[name] != undefined, "Timer does not exist; you must start the timer first");
            this.logEntry.timers[name].stop();
        }
    };

    /**
    * Set the timer to the specified value. This is most commonly used to
    * record timers from external sources that are not integrated with metrics.
    *
    * @param name The name of the timer.
    * @param duration The duration of the timer in milliseconds.
    */
    TsdMetrics.prototype.setTimer = function (name, durationMilliseconds) {
        if (this.assertIsOpen()) {
            if (this.logEntry.timers[name] == undefined) {
                this.logEntry.timers[name] = new TimerSamples();
            }
            this.logEntry.timers[name].addDuration(durationMilliseconds);
        }
    };

    /**
    * Set the specified gauge reading.
    *
    * @param name The name of the gauge.
    * @param value The reading on the gauge
    */
    TsdMetrics.prototype.setGauge = function (name, value) {
        if (this.assertIsOpen()) {
            if (this.logEntry.gauges[name] == undefined) {
                this.logEntry.gauges[name] = new Array();
            }
            this.logEntry.gauges[name].push(value);
        }
    };

    /**
    * Add an attribute that describes the captured metrics or context.
    *
    * @param key The name of the attribute.
    * @param value The value of the attribute.
    */
    TsdMetrics.prototype.annotate = function (key, value) {
        if (this.assertIsOpen()) {
            this.logEntry.annotations[key] = value;
        }
    };

    /**
    * Close the metrics object. This should complete publication of metrics to
    * the underlying data store. Once the metrics object is closed, no further
    * metrics can be recorded.
    */
    TsdMetrics.prototype.close = function () {
        if (this.assertIsOpen()) {
            this.annotate("finalTimestamp", (Date.now() / 1000.0).toString());
            for (var timer in this.logEntry.timers) {
                this.logEntry.timers[timer].stop();
            }
            TsdMetrics.LOGGER.getValue().info(JSON.stringify(this.logEntry));
            this.isOpen = false;
        }
    };
    TsdMetrics.MAX_LOG_SIZE = 32 * 1024 * 1024;

    TsdMetrics.LOG_BACKUPS = 10;

    TsdMetrics.CONSOLE_ECHO = false;

    TsdMetrics.LOGGER = new Lazy(function () {
        var appendersArray = [
            {
                type: "file",
                filename: "tsd-query.log",
                maxLogSize: TsdMetrics.MAX_LOG_SIZE,
                backups: TsdMetrics.LOG_BACKUPS,
                layout: {
                    type: "pattern",
                    pattern: "%m"
                },
                category: "tsd-client"
            }
        ];
        if (TsdMetrics.CONSOLE_ECHO) {
            appendersArray.push({
                type: "console",
                layout: {
                    type: "pattern",
                    pattern: "%m"
                },
                category: "tsd-client"
            });
        }
        var config = {
            appenders: appendersArray
        };

        log4js.configure(config, {});

        return log4js.getLogger("tsd-client");
    });
    return TsdMetrics;
})(events.EventEmitter);
exports.TsdMetrics = TsdMetrics;
