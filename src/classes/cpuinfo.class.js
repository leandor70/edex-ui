class Cpuinfo {
    constructor(parentId) {
        if (!parentId) throw "Missing parameters";

        // Create initial DOM
        this.parent = document.getElementById(parentId);
        this.parent.innerHTML += `<div id="mod_cpuinfo">
        </div>`;
        this.container = document.getElementById("mod_cpuinfo");

        // Init Smoothie
        let TimeSeries = require("smoothie").TimeSeries;
        let SmoothieChart = require("smoothie").SmoothieChart;

        this.series = [];
        this.charts = [];
        window.si.cpu().then(data => {
            let divide = Math.floor(data.cores/2);
            this.divide = divide;
            this.numCores = data.cores;
            this.coreTemps = [];
            this.loadHistory = [];

            let cpuName = data.manufacturer+data.brand;
            cpuName = cpuName.substr(0, 30);
            cpuName.substr(0, Math.min(cpuName.length, cpuName.lastIndexOf(" ")));

            let innercontainer = document.createElement("div");
            innercontainer.setAttribute("id", "mod_cpuinfo_innercontainer");
            innercontainer.innerHTML = `<h1>CPU USAGE<i>${cpuName}</i></h1>
                <div>
                    <h1># <em>1</em> - <em>${divide}</em><br>
                    <i id="mod_cpuinfo_usagecounter0">Avg. --%</i></h1>
                    <canvas id="mod_cpuinfo_canvas_0" height="60"></canvas>
                </div>
                <div>
                    <h1># <em>${divide+1}</em> - <em>${data.cores}</em><br>
                    <i id="mod_cpuinfo_usagecounter1">Avg. --%</i></h1>
                    <canvas id="mod_cpuinfo_canvas_1" height="60"></canvas>
                </div>
                <div id="mod_cpuinfo_stats">
                    <div>
                        <h1>TEMP<br>
                        <i id="mod_cpuinfo_temp">--°C</i></h1>
                    </div>
                    <div>
                        <h1>SPD<br>
                        <i id="mod_cpuinfo_speed_min">--GHz</i></h1>
                    </div>
                    <div>
                        <h1>MAX<br>
                        <i id="mod_cpuinfo_speed_max">--GHz</i></h1>
                    </div>
                    <div>
                        <h1>TASKS<br>
                        <i id="mod_cpuinfo_tasks">---</i></h1>
                    </div>
                    <div>
                        <h1>LOAD<br>
                        <i id="mod_cpuinfo_load">--%</i></h1>
                    </div>
                </div>`;
            this.container.append(innercontainer);

            // Gauge + heatmap row (3.1 + 3.2)
            const GAUGE_R = 38;
            const GAUGE_TRACK = (0.75 * 2 * Math.PI * GAUGE_R).toFixed(2);
            let vizRow = document.createElement("div");
            vizRow.id = "mod_cpuinfo_viz_row";
            vizRow.innerHTML = `<svg viewBox="0 0 100 100" id="mod_cpuinfo_gauge_svg">
                <circle cx="50" cy="50" r="${GAUGE_R}" id="mod_cpuinfo_gauge_track" stroke-dasharray="${GAUGE_TRACK} 10000"/>
                <circle cx="50" cy="50" r="${GAUGE_R}" id="mod_cpuinfo_gauge_fill"/>
                <text x="50" y="50" id="mod_cpuinfo_gauge_text">0%</text>
            </svg>
            <div id="mod_cpuinfo_heatmap"></div>`;
            let heatmap = vizRow.querySelector("#mod_cpuinfo_heatmap");
            for (let i = 0; i < data.cores; i++) {
                let cell = document.createElement("div");
                cell.className = "cpu_heat_cell";
                cell.id = `cpu_heat_${i}`;
                heatmap.appendChild(cell);
            }
            innercontainer.append(vizRow);

            // Load average row (3.5)
            let loadavgRow = document.createElement("div");
            loadavgRow.id = "mod_cpuinfo_loadavg";
            loadavgRow.innerHTML = `<span>1m: <em id="mod_cpuinfo_avg1">--%</em></span><span>5m: <em id="mod_cpuinfo_avg5">--%</em></span><span>15m: <em id="mod_cpuinfo_avg15">--%</em></span>`;
            innercontainer.append(loadavgRow);

            for (var i = 0; i < 2; i++) {
                this.charts.push(new SmoothieChart({
                    limitFPS: 30,
                    responsive: true,
                    millisPerPixel: 50,
                    grid:{
                        fillStyle:'transparent',
                        strokeStyle:'transparent',
                        verticalSections:0,
                        borderVisible:false
                    },
                    labels:{
                        disabled: true
                    },
                    yRangeFunction: () => {
                        return {min:0,max:100};
                    }
                }));
            }

            for (var i = 0; i < data.cores; i++) {
                // Create TimeSeries
                this.series.push(new TimeSeries());

                let serie = this.series[i];
                let options = {
                    lineWidth: 1.7,
                    strokeStyle: `rgb(${window.theme.r},${window.theme.g},${window.theme.b})`
                };

                if (i < divide) {
                    this.charts[0].addTimeSeries(serie, options);
                } else {
                    this.charts[1].addTimeSeries(serie, options);
                }
            }

            for (var i = 0; i < 2; i++) {
                this.charts[i].streamTo(document.getElementById(`mod_cpuinfo_canvas_${i}`), 500);
            }

            // Init updater
            this.updatingCPUload = false;
            this.updateCPUload();
            this.updateCPUtemp();
            this.updatingCPUspeed = false;
            this.updateCPUspeed();
            this.updatingCPUtasks = false;
            this.updateCPUtasks();
            this.loadUpdater = setInterval(() => {
                this.updateCPUload();
            }, 500);
            this.tempUpdater = setInterval(() => {
                this.updateCPUtemp();
            }, 2000);
            this.speedUpdater = setInterval(() => {
                this.updateCPUspeed();
            }, 1000);
            this.tasksUpdater = setInterval(() => {
                this.updateCPUtasks();
            }, 5000);
        });
    }
    updateCPUload() {
        if (this.updatingCPUload) return;
        this.updatingCPUload = true;
        window.si.currentLoad().then(data => {
            let average = [[], []];

            if (!data.cpus) return; // Prevent memleak in rare case where systeminformation takes extra time to retrieve CPU info (see github issue #216)

            data.cpus.forEach((e, i) => {
                this.series[i].append(new Date().getTime(), e.load);

                if (i < this.divide) {
                    average[0].push(e.load);
                } else {
                    average[1].push(e.load);
                }

                // Update heatmap cell (3.2 + 3.5)
                let cell = document.getElementById(`cpu_heat_${i}`);
                if (cell) {
                    let opacity = Math.max(0.06, e.load / 100 * 0.9);
                    cell.style.background = `rgba(${window.theme.r}, ${window.theme.g}, ${window.theme.b}, ${opacity.toFixed(2)})`;
                    let tempStr = (this.coreTemps[i] && this.coreTemps[i] > 0) ? ` | ${this.coreTemps[i]}°C` : "";
                    cell.title = `Core ${i + 1}: ${Math.round(e.load)}%${tempStr}`;
                }
            });
            average.forEach((stats, i) => {
                average[i] = Math.round(stats.reduce((a, b) => a + b, 0)/stats.length);

                try {
                    document.getElementById(`mod_cpuinfo_usagecounter${i}`).innerText = `Avg. ${average[i]}%`;
                } catch(e) {
                    // Fail silently, DOM element is probably getting refreshed (new theme, etc)
                }
            });
            try {
                let totalAvg = Math.round((average[0] + average[1]) / 2);
                document.getElementById("mod_cpuinfo_load").innerText = `${totalAvg}%`;

                // Update SVG gauge (3.1)
                const gaugeTrack = 179.07;
                let gaugeFill = (totalAvg / 100) * gaugeTrack;
                let gaugeFillEl = document.getElementById("mod_cpuinfo_gauge_fill");
                if (gaugeFillEl) gaugeFillEl.style.strokeDasharray = `${gaugeFill.toFixed(2)} 10000`;
                let gaugeTextEl = document.getElementById("mod_cpuinfo_gauge_text");
                if (gaugeTextEl) gaugeTextEl.textContent = `${totalAvg}%`;

                // Update load average history (3.5)
                if (this.loadHistory) {
                    this.loadHistory.push(totalAvg);
                    if (this.loadHistory.length > 1800) this.loadHistory.shift();
                    const len = this.loadHistory.length;
                    let a1 = Math.round(this.loadHistory.slice(-120).reduce((a,b)=>a+b,0) / Math.min(len,120));
                    let a5 = Math.round(this.loadHistory.slice(-600).reduce((a,b)=>a+b,0) / Math.min(len,600));
                    let a15 = Math.round(this.loadHistory.reduce((a,b)=>a+b,0) / len);
                    let e1 = document.getElementById("mod_cpuinfo_avg1");
                    let e5 = document.getElementById("mod_cpuinfo_avg5");
                    let e15 = document.getElementById("mod_cpuinfo_avg15");
                    if (e1) e1.textContent = `${a1}%`;
                    if (e5) e5.textContent = `${a5}%`;
                    if (e15) e15.textContent = `${a15}%`;
                }

                if (totalAvg > 85) {
                    let container = document.getElementById("mod_cpuinfo");
                    if (container && !container.classList.contains("glitching")) {
                        container.classList.add("glitching");
                        setTimeout(() => container.classList.remove("glitching"), 500);
                    }
                }
            } catch(e) {}
            this.updatingCPUload = false;
        });
    }
    updateCPUtemp() {
        window.si.cpuTemperature().then(data => {
            try {
                let temp = (data && data.max !== null && data.max !== undefined && data.max > 0)
                    ? `${data.max}°C`
                    : "N/A";
                document.getElementById("mod_cpuinfo_temp").innerText = temp;
                // Store per-core temps for heatmap tooltips (3.5)
                if (data && Array.isArray(data.cores) && data.cores.length > 0) {
                    this.coreTemps = data.cores;
                }
            } catch(e) {
                // See above notice
            }
        });
    }
    updateCPUspeed() {
        if (this.updatingCPUspeed) return;
        this.updatingCPUspeed = true
        window.si.cpu().then(data => {
            try {
                document.getElementById("mod_cpuinfo_speed_min").innerText = `${data.speed}GHz`;
                document.getElementById("mod_cpuinfo_speed_max").innerText = `${data.speedMax}GHz`;
            } catch(e) {
                // See above notice
            }
            this.updatingCPUspeed = false;
        });
    }
    updateCPUtasks() {
        if (this.updatingCPUtasks) return;
        this.updatingCPUtasks = true;
        window.si.processes().then(data => {
            try {
                document.getElementById("mod_cpuinfo_tasks").innerText = `${data.all}`;
            } catch(e) {
                // See above notice
            }
            this.updatingCPUtasks = false;
        });
    }
}

module.exports = {
    Cpuinfo
};
