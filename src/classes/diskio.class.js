class DiskIO {
    constructor(parentId) {
        if (!parentId) throw "Missing parameters";

        this.parent = document.getElementById(parentId);
        this.parent.innerHTML += `<div id="mod_diskio">
            <div id="mod_diskio_innercontainer">
                <h1>DISK I/O<i>READ / WRITE, MB/S</i></h1>
                <h2>ACTIVITY<i id="mod_diskio_current">-- R / -- W</i></h2>
                <canvas id="mod_diskio_canvas_top"></canvas>
                <canvas id="mod_diskio_canvas_bottom"></canvas>
                <h3>UNAVAILABLE</h3>
            </div>
        </div>`;

        this.current = document.querySelector("#mod_diskio_innercontainer > h2 > i");
        this._pb = require("pretty-bytes");

        let TimeSeries = require("smoothie").TimeSeries;
        let SmoothieChart = require("smoothie").SmoothieChart;

        let chartOptions = [{
            limitFPS: 40,
            responsive: true,
            millisPerPixel: 70,
            interpolation: 'linear',
            grid: {
                millisPerLine: 5000,
                fillStyle: 'transparent',
                strokeStyle: `rgba(${window.theme.r},${window.theme.g},${window.theme.b},0.4)`,
                verticalSections: 3,
                borderVisible: false
            },
            labels: {
                fontSize: 10,
                fillStyle: `rgb(${window.theme.r},${window.theme.g},${window.theme.b})`,
                precision: 2
            }
        }];
        chartOptions.push(Object.assign({}, chartOptions[0]));
        chartOptions[0].minValue = 0;
        chartOptions[1].maxValue = 0;

        this.series = [new TimeSeries(), new TimeSeries()];
        this.charts = [new SmoothieChart(chartOptions[0]), new SmoothieChart(chartOptions[1])];

        this.charts[0].addTimeSeries(this.series[0], {lineWidth: 1.7, strokeStyle: `rgb(${window.theme.r},${window.theme.g},${window.theme.b})`});
        this.charts[1].addTimeSeries(this.series[1], {lineWidth: 1.7, strokeStyle: `rgb(${window.theme.r},${window.theme.g},${window.theme.b})`});

        this.charts[0].streamTo(document.getElementById("mod_diskio_canvas_top"), 1000);
        this.charts[1].streamTo(document.getElementById("mod_diskio_canvas_bottom"), 1000);

        this._available = null;
        this.updateInfo();
        this.infoUpdater = setInterval(() => {
            this.updateInfo();
        }, 1000);
    }

    updateInfo() {
        let time = new Date().getTime();
        window.si.disksIO().then(data => {
            if (!data || data.rIO_sec === null || data.rIO_sec === undefined) {
                if (this._available !== false) {
                    this._available = false;
                    document.querySelector("div#mod_diskio").setAttribute("class", "offline");
                }
                this.series[0].append(time, 0);
                this.series[1].append(time, 0);
                return;
            }
            if (this._available !== true) {
                this._available = true;
                document.querySelector("div#mod_diskio").setAttribute("class", "");
            }

            let readMB = (data.rIO_sec || 0) / 1048576;
            let writeMB = (data.wIO_sec || 0) / 1048576;

            let max0 = this.series[0].maxValue;
            let max1 = -this.series[1].minValue;
            if (max0 > max1) {
                this.series[1].minValue = -max0;
            } else if (max1 > max0) {
                this.series[0].maxValue = max1;
            }

            this.series[0].append(time, readMB);
            this.series[1].append(time, -writeMB);

            try {
                this.current.innerText = `R ${readMB.toFixed(2)} / W ${writeMB.toFixed(2)} MB/S`;
            } catch(e) {}
        });
    }
}

module.exports = { DiskIO };
