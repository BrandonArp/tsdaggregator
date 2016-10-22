///<reference path='metrics.d.ts'/>
///<reference path='log4js.d.ts'/>
/// <reference path="node.d.ts" />
import tsdDef = require("tsd");
import log4js = require("log4js");
import events = require("events");

/**
 * Class for managing samples for a counter
 */
class CounterSamples {
    private samples:number[] = new Array < number >();
    private lastIndex:number = 0;

    constructor() {
        this.reset();
    }

    /**
     * Create a new sample for the counter with value of zero
     */
    public reset():void {
        this.lastIndex = this.samples.push(0) - 1
    }

    /**
     * Increment the current sample
     * @param value Signed value to increment the sample byt
     */
    public increment(value:number):void {
        this.samples[this.lastIndex] += value;
    }

    public toJSON() {
        return this.samples;
    }
}

/**
 * Class for creating duration sample for a timer
 */
class TimerSamples {
    private durations:number[] = new Array < number >();
    private startTime:number;

    /**
     * Add explicit timer duration
     * @param duration
     */
    public addDuration(duration:number):void {
        this.durations.push(duration);
    }

    /**
     * Start a new timer
     */
    public start():void {
        this.startTime = Date.now();
    }

    /**
     * Stop the current timer
     */
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

class Lazy<T> {
    private factory:()=>T;
    private value:T;

    constructor(factory:()=>T) {
        this.factory = factory;
    }

    public getValue():T {
        if (this.value == undefined) {
            this.value = this.factory();
        }
        return this.value;
    }
}

/**
 * Node JS class for publishing metrics as  time series data (TSD).
 * For more information see:
 *
 * https://wiki.groupondev.com/TsdAggregator
 */
export class TsdMetrics extends events.EventEmitter implements tsdDef.Metrics {
    /**
     * Sets the maximums size of log in bytes before rolling a new file
     * Default: 32 MB
     * @type {number}
     */
    public static MAX_LOG_SIZE:number = 32 * 1024 * 1024;
    /**
     * Sets the maximum number of log files backup to retain.
     * Default: 10
     * @type {number}
     */
    public static LOG_BACKUPS:number = 10;
    /**
     * Sets a flag to output the metrics to console in addition to the query file
     * Default: false
     * @type {boolean}
     */
    public static CONSOLE_ECHO:boolean = false;

    /**
     * Singleton instance of the
     */
    private static LOGGER:Lazy<log4js.Logger> =
        new Lazy<log4js.Logger>(() => {
            var appendersArray:any = [
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
                appendersArray.push(
                    {
                        type: "console",
                        layout: {
                            type: "pattern",
                            pattern: "%m"
                        },
                        category: "tsd-client"
                    }
                );
            }
            var config = {
                appenders: appendersArray
            };

            log4js.configure(config, {});

            return log4js.getLogger("tsd-client");
        });

    /**
     *
     */
    private isOpen:boolean = true;

    /**
     * Assert that a condition is true and emit an error event and
     * @param condition
     * @param message
     * @returns {boolean}
     */
    private assert(condition:boolean, message:string):boolean {
        if (!condition) {
            this.emit("error", new Error(message));
            return false;
        }
        return true;
    }

    //anonymous type for representing the final json blob
    private logEntry:{
        annotations:{[name:string]: string
        };
        counters:{[name:string]: CounterSamples
        };
        gauges:{[name:string]: number[]
        };
        timers:{[name:string]: TimerSamples
        };
        version:string;
    } = {
        annotations: {},
        counters: {},
        gauges: {},
        timers: {},
        version: "2c"
    };

    private assertIsOpen():boolean {
        return this.assert(this.isOpen, "Metrics object was not opened or it's already closedo");
    }

    constructor() {
        super();
        //according to http://nodejs.org/docs/v0.3.5/api/events.html#events.EventEmitter
        //if an error event is emitted and nothing was listening, the process will exist, so we are adding this
        //do-nothing listener in order not to exist the process
        this.addListener("error", (error)=> {
        });
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
        if (this.assertIsOpen()) {
            if (this.logEntry.counters[name] == undefined) {
                this.logEntry.counters[name] = new CounterSamples();
            } else {
                this.logEntry.counters[name].reset();
            }
        }
    }

    /**
     * Start the specified timer measurement.
     *
     * @param name The name of the timer.
     */
    public startTimer(name:string) {
        if (this.assertIsOpen()) {
            if (this.logEntry.timers[name] == undefined) {
                this.logEntry.timers[name] = new TimerSamples();
            }
            this.logEntry.timers[name].start();
        }
    }

    /**
     * Stop the specified timer measurement.
     *
     * @param name The name of the timer.
     */
    public stopTimer(name:string) {
        if (this.assertIsOpen()) {
            this.assert(this.logEntry.timers[name] != undefined, "Timer does not exist; you must start the timer first")
            this.logEntry.timers[name].stop();
        }
    }

    /**
     * Set the timer to the specified value. This is most commonly used to
     * record timers from external sources that are not integrated with metrics.
     *
     * @param name The name of the timer.
     * @param duration The duration of the timer in milliseconds.
     */
    public setTimer(name:string, durationMilliseconds:number) {
        if (this.assertIsOpen()) {
            if (this.logEntry.timers[name] == undefined) {
                this.logEntry.timers[name] = new TimerSamples();
            }
            this.logEntry.timers[name].addDuration(durationMilliseconds);
        }
    }

    /**
     * Set the specified gauge reading.
     *
     * @param name The name of the gauge.
     * @param value The reading on the gauge
     */
    public setGauge(name:string, value:number) {
        if (this.assertIsOpen()) {
            if (this.logEntry.gauges[name] == undefined) {
                this.logEntry.gauges[name] = new Array < number >();
            }
            this.logEntry.gauges[name].push(value);
        }
    }

    /**
     * Add an attribute that describes the captured metrics or context.
     *
     * @param key The name of the attribute.
     * @param value The value of the attribute.
     */
    public annotate(key:string, value:string) {
        if (this.assertIsOpen()) {
            this.logEntry.annotations[key] = value;
        }
    }

    /**
     * Close the metrics object. This should complete publication of metrics to
     * the underlying data store. Once the metrics object is closed, no further
     * metrics can be recorded.
     */
    public close() {
        if (this.assertIsOpen()) {
            this.annotate("finalTimestamp", (Date.now() / 1000.0).toString());
            for (var timer in this.logEntry.timers) {
                this.logEntry.timers[timer].stop();
            }
            TsdMetrics.LOGGER.getValue().info(JSON.stringify(this.logEntry));
            this.isOpen = false;
        }
    }
}
