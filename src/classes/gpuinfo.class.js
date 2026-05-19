class GPUinfo {
    constructor(parentId) {
        if (!parentId) throw "Missing parameters";

        this.parent = document.getElementById(parentId);
        this.parent.innerHTML += `<div id="mod_gpuinfo">
            <h1>GPU<i id="mod_gpuinfo_name">--</i></h1>
            <div id="mod_gpuinfo_stats">
                <div>
                    <h1>UTIL<br><i id="mod_gpuinfo_util">N/A</i></h1>
                </div>
                <div>
                    <h1>VRAM<br><i id="mod_gpuinfo_vram">N/A</i></h1>
                </div>
                <div>
                    <h1>TEMP<br><i id="mod_gpuinfo_temp">N/A</i></h1>
                </div>
            </div>
        </div>`;

        this.updateInfo();
        this.infoUpdater = setInterval(() => {
            this.updateInfo();
        }, 2000);
    }

    updateInfo() {
        window.si.graphics().then(data => {
            if (!data || !data.controllers || data.controllers.length === 0) return;
            let gpu = data.controllers[0];
            try {
                let name = (gpu.model || gpu.vendor || "Unknown GPU").substr(0, 24);
                document.getElementById("mod_gpuinfo_name").innerText = name;

                let util = gpu.utilizationGpu;
                document.getElementById("mod_gpuinfo_util").innerText =
                    (util !== null && util !== undefined) ? `${Math.round(util)}%` : "N/A";

                let vramUsed = gpu.memoryUsed;
                let vramTotal = gpu.memoryTotal || gpu.vram;
                if (vramUsed !== null && vramUsed !== undefined && vramTotal) {
                    document.getElementById("mod_gpuinfo_vram").innerText = `${vramUsed}/${vramTotal}M`;
                } else if (vramTotal) {
                    document.getElementById("mod_gpuinfo_vram").innerText = `${vramTotal}MB`;
                } else {
                    document.getElementById("mod_gpuinfo_vram").innerText = "N/A";
                }

                let temp = gpu.temperatureGpu;
                document.getElementById("mod_gpuinfo_temp").innerText =
                    (temp !== null && temp !== undefined) ? `${Math.round(temp)}°C` : "N/A";
            } catch(e) {
                // DOM element being refreshed
            }
        });
    }
}

module.exports = { GPUinfo };
