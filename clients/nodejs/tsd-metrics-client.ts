///<reference path='metrics.d.ts'/>
///<reference path='log4js.d.ts'/>
import tsdDef = require("tsd");
import log4js = require("log4js");

function assert(condition:boolean, message:string):void {
    if (!condition) {
        throw new Error(message);
    }
}

class CounterSamples {
    private samples:number[] = new Array < number > ();

    constructor() {
        this.reset();
    }

    public reset():void {
        this.samples.unshift(0)
    }

    public increment(value:number):void {
        this.samples[0] += value;
    }

    public toJSON() {
        return this.samples;
    }
}

class TimerSamples {
    private durations:number[] = new Array < number > ();
    private startTime:number;

    public addDuration(duration:number):void {
        this.durations.push(duration);
    }

    public start():void {
        this.startTime = Date.now();

    }

    public stop():void {
        if (this.startTime != undefined) {
            this.addDuration(Date.now() - this.startTime)
        }
        this.startTime = undefined;
    }

    public toJSON() {
        return this.durations;
    }
}

export class TsdMetrics implements tsdDef.Metrics {

    private static s_logger:log4js.Logger;
    private isOpen = true;

    private static logger() {
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
                    },
                ]
            };
            log4js.configure(config, {});

            TsdMetrics.s_logger = log4js.getLogger("tsd-client");
        }
        return TsdMetrics.s_logger;
    }

    //anonymous type for representing the final json blob
    private logEntry:{
        annotations:{[name:string]: string};
        counters:{[name:string]: CounterSamples};
        gauges:{[name:string]: number[]};
        timers:{[name:string]: TimerSamples};
        version:string;
    } = {
        annotations: {},
        counters: {},
        gauges: {},
        timers: {},
        version: "2c"
    };

    private assertIsOpen():void {
        assert(this.isOpen, "Metrics object is not open");
    }

    constructor() {
        this.annotate("initTimestamp", (Date.now() / 1000.0).toString())
    }

    /**
     * Increment the specified counter by the specified amount. All counters are
     * initialized to zero.
     *
     * @param name The name of the counter.
     * @param value The amount to increment by.
     */
    public incrementCounter(name:string, value:number = 1):void {
        this.assertIsOpen();
        if (this.logEntry.counters[name] == undefined) {
            this.logEntry.counters[name] = new CounterSamples();
        }
        this.logEntry.counters[name].increment(value);
    }

    /**
     * Decrement the specified counter by the specified amount. All counters are
     * initialized to zero.
     *
     * @param name The name of the counter.
     * @param value The amount to decrement by.
     */
    public decrementCounter(name:string, value:number = 1) {
        this.incrementCounter(name, -value);
    }

    /**
     * Reset the counter to zero. This most commonly used to record a zero-count
     * for a particular counter. If clients wish to record set count metrics
     * then all counters should be reset before conditionally invoking increment
     * and/or decrement.
     *
     * @param name The name of the counter.
     */
    public resetCounter(name:string) {
        this.assertIsOpen();
        if (this.logEntry.counters[name] == undefined) {
            this.logEntry.counters[name] = new CounterSamples();
        } else {
            this.logEntry.counters[name].reset();
        }
    }

    /**
     * Start the specified timer measurement.
     *
     * @param name The name of the timer.
     */
    public startTimer(name:string) {
        this.assertIsOpen();
        if (this.logEntry.timers[name] == undefined) {
            this.logEntry.timers[name] = new TimerSamples();
        }
        this.logEntry.timers[name].start();
    }

    /**
     * Stop the specified timer measurement.
     *
     * @param name The name of the timer.
     */
    public stopTimer(name:string) {
        this.assertIsOpen();
        assert(this.logEntry.timers[name] != undefined, "Timer does not exist; you must start the timer first")
        this.logEntry.timers[name].stop();
    }

    /**
     * Set the timer to the specified value. This is most commonly used to
     * record timers from external sources that are not integrated with metrics.
     *
     * @param name The name of the timer.
     * @param duration The duration of the timer in milliseconds.
     */
    public setTimer(name:string, durationMilliseconds:number) {
        this.assertIsOpen();
        if (this.logEntry.timers[name] == undefined) {
            this.logEntry.timers[name] = new TimerSamples();
        }
        this.logEntry.timers[name].addDuration(durationMilliseconds);
    }

    /**
     * Set the specified gauge reading.
     *
     * @param name The name of the gauge.
     * @param value The reading on the gauge
     */
    public setGauge(name:string, value:number) {
        this.assertIsOpen();
        if (this.logEntry.gauges[name] == undefined) {
            this.logEntry.gauges[name] = new Array < number > ();
        }
        this.logEntry.gauges[name].push(value);
    }

    /**
     * Add an attribute that describes the captured metrics or context.
     *
     * @param key The name of the attribute.
     * @param value The value of the attribute.
     */
    public annotate(key:string, value:string) {
        this.assertIsOpen();
        this.logEntry.annotations[key] = value;
    }

    /**
     * Close the metrics object. This should complete publication of metrics to
     * the underlying data store. Once the metrics object is closed, no further
     * metrics can be recorded.
     */
    public close() {
        this.assertIsOpen();
        this.annotate("finalTimestamp", (Date.now() / 1000.0).toString());
        for (var timer in this.logEntry.timers) {
            this.logEntry.timers[timer].stop();
        }
        TsdMetrics.logger().info(JSON.stringify(this.logEntry));
        this.isOpen = false;
    }
}
