declare module "tsd" {
    /**
     * Interface for logging metrics: timers, counters and gauges for TSD Aggregator
     *
     * @author mkamel
     *
     */
    export interface Metrics {

        /**
         * Increment the specified counter by 1. All counters are initialized to
         * zero.
         *
         * @param name The name of the counter.
         */
        incrementCounter(name:string): void;

        /**
         * Increment the specified counter by the specified amount. All counters are
         * initialized to zero.
         *
         * @param name The name of the counter.
         * @param value The amount to increment by.
         */
        incrementCounter(name:string, value:number): void ;

        /**
         * Decrement the specified counter by 1. All counters are initialized to
         * zero.
         *
         * @param name The name of the counter.
         */
        decrementCounter(name:string): void;

        /**
         * Decrement the specified counter by the specified amount. All counters are
         * initialized to zero.
         *
         * @param name The name of the counter.
         * @param value The amount to decrement by.
         */
        decrementCounter(name:string, value:number): void ;

        /**
         * Reset the counter to zero. This most commonly used to record a zero-count
         * for a particular counter. If clients wish to record set count metrics
         * then all counters should be reset before conditionally invoking increment
         * and/or decrement.
         *
         * @param name The name of the counter.
         */
        resetCounter(name:string): void;

        /**
         * Start the specified timer measurement.
         *
         * @param name The name of the timer.
         */
        startTimer(name:string): void;

        /**
         * Stop the specified timer measurement.
         *
         * @param name The name of the timer.
         */
        stopTimer(name:string): void;

        /**
         * Set the timer to the specified value. This is most commonly used to
         * record timers from external sources that are not integrated with metrics.
         *
         * @param name The name of the timer.
         * @param duration The duration of the timer in milliseconds.
         */
        setTimer(name:string, durationMilliseconds:number): void;

        /**
         * Set the specified gauge reading.
         *
         * @param name The name of the gauge.
         * @param value The reading on the gauge
         */
        setGauge(name:string, value:number): void;

        /**
         * Add an attribute that describes the captured metrics or context.
         *
         * @param key The name of the attribute.
         * @param value The value of the attribute.
         */
        annotate(key:string, value:string): void;

        /**
         * Close the metrics object. This should complete publication of metrics to
         * the underlying data store. Once the metrics object is closed, no further
         * metrics can be recorded.
         */
        close(): void;
    }
}

