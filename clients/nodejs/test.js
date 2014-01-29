tsd = require('./tsd-metrics-client')

for (var i = 0; i < 3; ++i) {
    var mm = {
        self:this,
        m: new tsd.TsdMetrics(),
        r: function () {
            this.m.startTimer("timer1");
            this.m.incrementCounter("hello", Math.floor(Math.random() * 10.0));
            this.m.decrementCounter("world");
            this.m.resetCounter("world");
            this.m.decrementCounter("world", 4);
            this.m.setGauge("gg", Math.random() * 1000);
        },
        timer1Test: function (m) {
            m.stopTimer("timer1");
            m.startTimer("timer2");
            m.startTimer("timer3");
            m.startTimer("timer1");
            setTimeout(this.timer2Test(m), 500);
        },
        timer2Test: function (m) {
            m.stopTimer("timer1");
            m.stopTimer("timer2");
            m.setTimer("Timer4", 20);
            m.setTimer("Timer4", 30);
            m.close();
        }
    };
    mm.r();
    setTimeout(mm.timer1Test(mm.m), 200);

}
