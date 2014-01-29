var log4js = require("log4js");

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

var CounterSamples = (function () {
    function CounterSamples() {
        this.samples = new Array();
        this.reset();
    }
    CounterSamples.prototype.reset = function () {
        this.samples.unshift(0);
    };

    CounterSamples.prototype.increment = function (value) {
        this.samples[0] += value;
    };

    CounterSamples.prototype.toJSON = function () {
        return this.samples;
    };
    return CounterSamples;
})();

var TimerSamples = (function () {
    function TimerSamples() {
        this.durations = new Array();
    }
    TimerSamples.prototype.addDuration = function (duration) {
        this.durations.push(duration);
    };

    TimerSamples.prototype.start = function () {
        this.startTime = Date.now();
    };

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

var TsdMetrics = (function () {
    function TsdMetrics() {
        this.isOpen = true;
        //anonymous type for representing the final json blob
        this.logEntry = {
            annotations: {},
            counters: {},
            gauges: {},
            timers: {},
            version: "2c"
        };
        this.annotate("initTimestamp", (Date.now() / 1000.0).toString());
    }
    TsdMetrics.logger = function () {
        if (TsdMetrics.s_logger == null) {
            var config = {
                appenders: [
                    {
                        type: "console",
                        layout: {
                            type: "pattern",
                            pattern: "%m"
                        },
                        category: "tsd-client"
                    },
                    {
                        type: "file",
                        filename: "tsd-query.log",
                        maxLogSize: 32 * 1024 * 1024,
                        backups: 1000,
                        layout: {
                            type: "pattern",
                            pattern: "%m"
                        },
                        category: "tsd-client"
                    }
                ]
            };
            log4js.configure(config, {});

            TsdMetrics.s_logger = log4js.getLogger("tsd-client");
        }
        return TsdMetrics.s_logger;
    };

    TsdMetrics.prototype.assertIsOpen = function () {
        assert(this.isOpen, "Metrics object is not open");
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
        this.assertIsOpen();
        if (this.logEntry.counters[name] == undefined) {
            this.logEntry.counters[name] = new CounterSamples();
        } else {
            this.logEntry.counters[name].reset();
        }
    };

    /**
    * Start the specified timer measurement.
    *
    * @param name The name of the timer.
    */
    TsdMetrics.prototype.startTimer = function (name) {
        this.assertIsOpen();
        if (this.logEntry.timers[name] == undefined) {
            this.logEntry.timers[name] = new TimerSamples();
        }
        this.logEntry.timers[name].start();
    };

    /**
    * Stop the specified timer measurement.
    *
    * @param name The name of the timer.
    */
    TsdMetrics.prototype.stopTimer = function (name) {
        this.assertIsOpen();
        assert(this.logEntry.timers[name] != undefined, "Timer does not exist; you must start the timer first");
        this.logEntry.timers[name].stop();
    };

    /**
    * Set the timer to the specified value. This is most commonly used to
    * record timers from external sources that are not integrated with metrics.
    *
    * @param name The name of the timer.
    * @param duration The duration of the timer in milliseconds.
    */
    TsdMetrics.prototype.setTimer = function (name, durationMilliseconds) {
        this.assertIsOpen();
        if (this.logEntry.timers[name] == undefined) {
            this.logEntry.timers[name] = new TimerSamples();
        }
        this.logEntry.timers[name].addDuration(durationMilliseconds);
    };

    /**
    * Set the specified gauge reading.
    *
    * @param name The name of the gauge.
    * @param value The reading on the gauge
    */
    TsdMetrics.prototype.setGauge = function (name, value) {
        this.assertIsOpen();
        if (this.logEntry.gauges[name] == undefined) {
            this.logEntry.gauges[name] = new Array();
        }
        this.logEntry.gauges[name].push(value);
    };

    /**
    * Add an attribute that describes the captured metrics or context.
    *
    * @param key The name of the attribute.
    * @param value The value of the attribute.
    */
    TsdMetrics.prototype.annotate = function (key, value) {
        this.assertIsOpen();
        this.logEntry.annotations[key] = value;
    };

    /**
    * Close the metrics object. This should complete publication of metrics to
    * the underlying data store. Once the metrics object is closed, no further
    * metrics can be recorded.
    */
    TsdMetrics.prototype.close = function () {
        this.assertIsOpen();
        this.annotate("finalTimestamp", (Date.now() / 1000.0).toString());
        for (var timer in this.logEntry.timers) {
            this.logEntry.timers[timer].stop();
        }
        TsdMetrics.logger().info(JSON.stringify(this.logEntry));
        this.isOpen = false;
    };
    return TsdMetrics;
})();
exports.TsdMetrics = TsdMetrics;
