import { showToast, exportCSV } from '../utils.js';

// ---- Module-scoped state (reset on each init) ----
let deleteMode, cableMode, cableStart, deviceCounter;
let connections, devices, subnetResults;
let canvasEl, svgEl, wrapperEl;

const ICON_MAP = {
    router: 'icons/router.svg',
    switch: 'icons/switch.svg',
    pc: 'icons/pc.svg',
    firewall: 'icons/firewall.svg',
    laptop: 'icons/laptop.svg',
    l3switch: 'icons/L3switch.svg',
    phone: 'icons/phone.svg',
    printer: 'icons/printer.svg',
    server: 'icons/server.svg',
    cloud: 'icons/cloud.svg'
};
function getIconSrc(type) { return ICON_MAP[type.toLowerCase()] || 'icons/router.svg'; }

// ---- IP helpers (self-contained for the visualizer) ----
function ipToUint(ip) { const p = ip.split('.'); return ((+p[0] << 24) | (+p[1] << 16) | (+p[2] << 8) | (+p[3])) >>> 0; }
function uintToIp(u) { return [(u >>> 24) & 0xff, (u >>> 16) & 0xff, (u >>> 8) & 0xff, u & 0xff].join('.'); }
function cidrToMask(c) { return c === 0 ? '0.0.0.0' : uintToIp((0xffffffff << (32 - c)) >>> 0); }
function isValidIP(ip) { if (!ip) return false; const p = ip.split('.'); if (p.length !== 4) return false; return p.every(s => { const n = parseInt(s, 10); return !isNaN(n) && n >= 0 && n <= 255; }); }
function isValidCIDR(c) { const n = parseInt(c, 10); return !isNaN(n) && n >= 0 && n <= 32; }
function getRandomColor() { const l = '0123456789ABCDEF'; let c = '#'; for (let i = 0; i < 6; i++)c += l[Math.floor(Math.random() * 16)]; return c; }

// ===================== RENDER =====================
export function render() {
    return `
<div class="container ">
 <div class="page-header">
 <h1>VLSM Visualizer</h1>
 <p>Drag network devices onto the canvas, connect them, and auto-allocate subnets.</p>
 </div>

 <div class="card mb-4">
 <div class="card-body">
 <div class="form-group" style="margin-bottom:12px;">
 <label class="form-label" for="vizBase">Base Network IP (CIDR)</label>
 <input type="text" id="vizBase" class="form-control" placeholder="e.g. 192.168.0.0/24" autocomplete="off">
 </div>

 <div class="viz-toolbar flex gap-2" style="padding:0; flex-wrap:wrap; align-items:center;">
 <button id="vizCalcBtn" class="btn btn-primary btn-sm">Calculate Subnets</button>
 <button id="vizDeleteMode" class="btn btn-sm btn-outline-danger">Delete Mode</button>
 <button id="vizCableMode" class="btn btn-sm btn-outline-info">Cable Mode</button>
 <button id="vizClear" class="btn btn-sm btn-outline-secondary">Clear Canvas</button>
 <span class="separator" style="border-left:1px solid #dee2e6; height:24px;"></span>
 <button id="vizResizeW" class="btn btn-sm btn-outline-secondary" title="+500px width">↔ Width</button>
 <button id="vizResizeH" class="btn btn-sm btn-outline-secondary" title="+500px height">↕ Height</button>
 <span class="separator" style="border-left:1px solid #dee2e6; height:24px;"></span>
 <button id="vizSave" class="btn btn-sm btn-outline-secondary">Save</button>
 <button id="vizLoad" class="btn btn-sm btn-outline-secondary">Load</button>
 <button id="vizExportPng" class="btn btn-sm btn-outline-secondary">Export PNG</button>
 <button id="vizAddText" class="btn btn-sm btn-outline-secondary">Add Text</button>
 <button id="vizHelp" class="btn btn-sm btn-outline-secondary ms-auto">Need Help?</button>
 </div>
 </div>
 </div>

 <!-- Help panel -->
 <div id="vizHelpPanel" class="help-panel hidden mb-4">
 <p><strong>What this tool does:</strong></p>
 <p>The VLSM Visualizer lets you drag network devices onto a canvas, connect them with cables,
 and then automatically divides your base network into subnets based on those connections.</p>
 <p><strong>How to use:</strong></p>
 <ul>
 <li>Enter your base network in CIDR form (e.g. 192.168.0.0/24).</li>
 <li>Drag devices (routers, switches, PCs, etc.) from the toolbox onto the canvas.</li>
 <li>Click "Cable Mode," then click two devices to connect them.</li>
 <li>Use "Delete Mode" to remove any devices or cables.</li>
 <li>When ready, click "Calculate Subnets."</li>
 <li>View your subnets in the table and on the canvas (colored outlines and IP labels).</li>
 <li>Export the results to CSV if needed.</li>
 </ul>
 <p class="mt-2" style="margin-bottom:0;">
 <small>Network device icons provided by <a href="https://github.com/ecceman/affinity" target="_blank">ecceman/affinity</a>.</small>
 </p>
 </div>

 <!-- Subnet results table -->
 <div id="vizSubnetResults" class="mb-4" style="display:none;">
 <h4 style="margin-bottom:12px;">Subnetting Results</h4>
 <div class="table-responsive">
 <table class="table table-striped">
 <thead>
 <tr><th>Network/CIDR</th><th>Mask</th><th>First Host</th><th>Last Host</th><th>Broadcast</th><th>Assigned Devices</th></tr>
 </thead>
 <tbody id="vizResultsBody"></tbody>
 </table>
 </div>
 <button id="vizExportCsv" class="btn btn-sm btn-outline-secondary mt-2"> Export CSV</button>
 </div>

 <!-- Toolbox + Canvas -->
 <div class="visualizer-wrapper">
 <div class="toolbox" id="toolbox">
 <h5>Toolbox</h5>
 <hr style="width:100%;border:none;border-top:1px solid #dee2e6;margin:4px 0;">
 <img class="draggable" data-type="router" src="icons/router.svg" alt="Router" title="Router" draggable="true">
 <img class="draggable" data-type="switch" src="icons/switch.svg" alt="Switch" title="Switch" draggable="true">
 <img class="draggable" data-type="pc" src="icons/pc.svg" alt="PC" title="PC" draggable="true">
 <img class="draggable" data-type="firewall" src="icons/firewall.svg" alt="Firewall" title="Firewall" draggable="true">
 <img class="draggable" data-type="laptop" src="icons/laptop.svg" alt="Laptop" title="Laptop" draggable="true">
 <img class="draggable" data-type="l3switch" src="icons/L3switch.svg" alt="L3 Switch" title="Layer 3 Switch" draggable="true">
 <img class="draggable" data-type="phone" src="icons/phone.svg" alt="Phone" title="VoIP Phone" draggable="true">
 <img class="draggable" data-type="printer" src="icons/printer.svg" alt="Printer" title="Printer" draggable="true">
 <img class="draggable" data-type="server" src="icons/server.svg" alt="Server" title="Server" draggable="true">
 <img class="draggable" data-type="cloud" src="icons/cloud.svg" alt="Cloud" title="Cloud" draggable="true">
 </div>
 <div class="canvas-wrapper" id="canvasWrapper">
 <svg id="connectionLayer" xmlns="http://www.w3.org/2000/svg"></svg>
 <div class="canvas-area" id="canvasArea"></div>
 </div>
 </div>
</div>`;
}

// ===================== INIT =====================
export function init() {
    // Reset all state
    deleteMode = false;
    cableMode = false;
    cableStart = null;
    deviceCounter = 0;
    connections = [];
    devices = {};
    subnetResults = [];

    canvasEl = document.getElementById('canvasArea');
    svgEl = document.getElementById('connectionLayer');
    wrapperEl = document.getElementById('canvasWrapper');

    // ---- Help toggle ----
    const helpBtn = document.getElementById('vizHelp');
    const helpPanel = document.getElementById('vizHelpPanel');
    helpBtn.addEventListener('click', () => {
        helpPanel.classList.toggle('hidden');
    });

    // ---- Toolbox drag ----
    document.querySelectorAll('.toolbox .draggable').forEach(icon => {
        icon.addEventListener('dragstart', e => {
            e.dataTransfer.setData('type', icon.dataset.type);
            e.dataTransfer.setData('icon', icon.src);
        });
    });
    canvasEl.addEventListener('dragover', e => e.preventDefault());

    // ---- Drop onto canvas ----
    canvasEl.addEventListener('drop', e => {
        e.preventDefault();
        if (deleteMode) return;
        const type = e.dataTransfer.getData('type');
        const iconSrc = e.dataTransfer.getData('icon');
        if (!type || !iconSrc) return;

        const canvasRect = canvasEl.getBoundingClientRect();
        let dropX = e.clientX - canvasRect.left - 25;
        let dropY = e.clientY - canvasRect.top - 25;
        dropX = Math.max(0, Math.min(dropX, canvasRect.width - 50));
        dropY = Math.max(0, Math.min(dropY, canvasRect.height - 50));

        createDevice(type, iconSrc, dropX, dropY);
    });

    document.getElementById('vizDeleteMode').addEventListener('click', () => {
        deleteMode = !deleteMode;
        cableMode = false;
        cableStart = null;
        canvasEl.style.cursor = deleteMode ? 'not-allowed' : 'default';
        const delBtn = document.getElementById('vizDeleteMode');
        const cabBtn = document.getElementById('vizCableMode');
        delBtn.className = deleteMode ? 'btn btn-sm btn-danger' : 'btn btn-sm btn-outline-danger';
        cabBtn.className = 'btn btn-sm btn-outline-info';
        Object.values(devices).forEach(d => { if (d.element) d.element.style.outline = 'none'; });
    });

    document.getElementById('vizCableMode').addEventListener('click', () => {
        cableMode = !cableMode;
        deleteMode = false;
        cableStart = null;
        canvasEl.style.cursor = cableMode ? 'crosshair' : 'default';
        const cabBtn = document.getElementById('vizCableMode');
        const delBtn = document.getElementById('vizDeleteMode');
        cabBtn.className = cableMode ? 'btn btn-sm btn-info' : 'btn btn-sm btn-outline-info';
        delBtn.className = 'btn btn-sm btn-outline-danger';
        Object.values(devices).forEach(d => { if (d.element) d.element.style.outline = 'none'; });
    });

    // ---- Canvas click: cable mode handler ----
    canvasEl.addEventListener('click', e => {
        if (cableMode && e.target.classList.contains('draggable-device')) {
            const clicked = e.target;
            if (!cableStart) {
                cableStart = clicked;
                clicked.style.outline = '2px dashed #198754';
            } else {
                if (cableStart === clicked) { cableStart.style.outline = 'none'; cableStart = null; return; }
                if (cableStart.dataset.id === clicked.dataset.id) { alert('Cannot connect a device to itself.'); return; }
                const alreadyConnected = connections.some(c =>
                    (c.from === cableStart && c.to === clicked) || (c.from === clicked && c.to === cableStart)
                );
                if (alreadyConnected) { alert('These devices are already connected.'); cableStart.style.outline = 'none'; cableStart = null; return; }
                drawSvgLine(cableStart, clicked);
                cableStart.style.outline = 'none';
                clicked.style.outline = 'none';
                cableStart = null;
            }
        } else if (cableMode && !e.target.classList.contains('draggable-device')) {
            if (cableStart) { cableStart.style.outline = 'none'; cableStart = null; }
        }
    });

    // ---- Clear canvas ----
    document.getElementById('vizClear').addEventListener('click', () => {
        Object.values(devices).forEach(d => {
            if (d.element) d.element.remove();
            if (d.labelElement) d.labelElement.remove();
            if (d.ipAddressElement) d.ipAddressElement.remove();
            if (d.interfaceLabels) Object.values(d.interfaceLabels).forEach(l => l.remove());
        });
        while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
        document.querySelectorAll('.subnet-outline').forEach(o => o.remove());
        document.querySelectorAll('.custom-textbox').forEach(t => t.remove());

        Object.keys(devices).forEach(k => delete devices[k]);
        connections.length = 0;
        deviceCounter = 0;
        subnetResults.length = 0;
        deleteMode = false; cableMode = false;
        canvasEl.style.cursor = 'default';
        document.getElementById('vizDeleteMode').className = 'btn btn-sm btn-outline-danger';
        document.getElementById('vizCableMode').className = 'btn btn-sm btn-outline-info';
        document.getElementById('vizResultsBody').innerHTML = '';
        document.getElementById('vizSubnetResults').style.display = 'none';
    });

    // ---- Add Text ----
    document.getElementById('vizAddText').addEventListener('click', () => {
        const tb = document.createElement('div');
        tb.className = 'custom-textbox';
        tb.contentEditable = 'true';
        tb.innerText = 'Editable Text';
        tb.style.position = 'absolute';
        const centerX = wrapperEl.scrollLeft + (wrapperEl.clientWidth / 2);
        const centerY = wrapperEl.scrollTop + (wrapperEl.clientHeight / 2);
        tb.style.left = `${centerX - 50}px`;
        tb.style.top = `${centerY - 20}px`;
        canvasEl.appendChild(tb);
        makeDraggable(tb, null, null);
        tb.addEventListener('mousedown', e => { if (deleteMode) e.stopPropagation(); });
        tb.addEventListener('click', e => { if (deleteMode) { tb.remove(); e.stopPropagation(); } });
        tb.addEventListener('dblclick', () => tb.focus());
    });

    // ---- Canvas resize ----
    document.getElementById('vizResizeW').addEventListener('click', e => {
        e.preventDefault();
        const cw = parseInt(canvasEl.style.width) || canvasEl.offsetWidth;
        canvasEl.style.width = `${cw + 500}px`;
        canvasEl.style.minWidth = canvasEl.style.width;
        svgEl.style.width = canvasEl.style.width;
    });
    document.getElementById('vizResizeH').addEventListener('click', e => {
        e.preventDefault();
        const ch = parseInt(wrapperEl.style.height) || wrapperEl.offsetHeight;
        wrapperEl.style.height = `${ch + 500}px`;
    });

    // ---- Calculate subnets ----
    document.getElementById('vizCalcBtn').addEventListener('click', calculateSubnets);

    // ---- Export CSV ----
    document.getElementById('vizExportCsv').addEventListener('click', () => {
        if (subnetResults.length === 0) { alert('No subnet data to export.'); return; }
        let csv = 'Network Address/CIDR,Subnet Mask,First Usable Host,Last Usable Host,Broadcast Address,Assigned Devices\n';
        subnetResults.forEach(s => {
            const devDisplay = s.deviceIdsInSubnet.map(id => {
                const d = devices[id];
                if (!d) return id;
                let ip = '';
                if (d.ipAddress) ip = d.ipAddress;
                else if (d.interfaceIPs) {
                    if (d.interfaceIPs[`subnet_${s.networkAddress}`]) ip = d.interfaceIPs[`subnet_${s.networkAddress}`];
                    else if (s.deviceIdsInSubnet.length === 2) { const other = s.deviceIdsInSubnet.find(x => x !== id); if (other && d.interfaceIPs[other]) ip = d.interfaceIPs[other]; }
                }
                return `${d.customName || d.labelElement?.innerText || d.id}${ip ? ` (${ip})` : ''}`;
            }).join(' | ');
            csv += `"${s.networkAddress}/${s.cidr}","${s.subnetMask}","${s.firstHost}","${s.lastHost}","${s.broadcastAddress}","${devDisplay}"\n`;
        });
        exportCSV(csv, 'subnet_results.csv');
    });

    // ---- Export PNG ----
    document.getElementById('vizExportPng').addEventListener('click', exportPng);

    // ---- Save ----
    document.getElementById('vizSave').addEventListener('click', () => {
        const state = {
            deviceCounter,
            devices: Object.values(devices).map(d => ({
                id: d.id, type: d.type,
                left: d.element.style.left, top: d.element.style.top,
                customName: d.customName, connections: d.connections
            })),
            connections: connections.map(c => ({ fromId: c.fromDevice.id, toId: c.toDevice.id }))
        };
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'network_topology.json';
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        showToast('Topology saved', 'success');
    });

    // ---- Load ----
    document.getElementById('vizLoad').addEventListener('click', () => {
        const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
        input.addEventListener('change', e => {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                try {
                    const state = JSON.parse(ev.target.result);
                    loadState(state);
                    showToast('Topology loaded', 'success');
                } catch (err) { alert('Failed to load state. Invalid JSON file.'); }
            };
            reader.readAsText(file);
        });
        input.click();
    });

    // ---- Cleanup ----
    return () => {
        devices = {};
        connections = [];
        subnetResults = [];
    };

    // ===================================================================
    // INNER FUNCTIONS (closure over canvasEl, svgEl, devices, etc.)
    // ===================================================================

    function createDevice(type, iconSrc, x, y, customName, forceId) {
        const id = forceId || `device_${deviceCounter}`;
        if (!forceId) deviceCounter++;

        const node = document.createElement('img');
        node.src = iconSrc || getIconSrc(type);
        node.className = 'draggable-device device-icon';
        node.style.position = 'absolute';
        node.style.zIndex = '2';
        node.style.width = '50px'; node.style.height = '50px';
        node.style.left = `${x}px`; node.style.top = `${y}px`;
        node.dataset.id = id; node.dataset.type = type;
        node.draggable = false;

        const typeCount = Object.values(devices).filter(d => d.type === type).length + 1;
        const label = document.createElement('div');
        label.innerText = customName || `${type} ${typeCount}`;
        label.className = 'device-label';
        label.contentEditable = 'plaintext-only';
        label.title = 'Click to rename';
        label.style.position = 'absolute';
        label.style.textAlign = 'center';
        label.style.width = '80px';
        label.style.height = '15px';
        label.style.left = `${x + 25 - 40}px`;
        label.style.top = `${y + 55}px`;
        label.style.zIndex = '3';
        label.addEventListener('blur', () => { if (devices[id]) devices[id].customName = label.innerText; });

        canvasEl.appendChild(node);
        canvasEl.appendChild(label);

        devices[id] = {
            id, type, element: node, labelElement: label, connections: [],
            ipAddress: null, ipAddressElement: null,
            interfaceIPs: {}, interfaceLabels: {},
            customName: label.innerText
        };

        makeDraggable(node, label, devices[id]);
        return devices[id];
    }

    function makeDraggable(el, label, device) {
        if (el.dataset.draggableInitialized) return;
        el.dataset.draggableInitialized = 'true';
        let offsetX = 0, offsetY = 0;
        const isTextbox = el.classList.contains('custom-textbox');

        el.onmousedown = function (e) {
            if (e.button !== 0 || cableMode || (deleteMode && !isTextbox)) return;
            if (deleteMode && isTextbox) { /* allow textbox click delete */ }
            else if (deleteMode) return;

            const canvasRect = canvasEl.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();
            offsetX = e.clientX - elRect.left;
            offsetY = e.clientY - elRect.top;

            document.onmousemove = function (eMove) {
                let newX = eMove.clientX - canvasRect.left - offsetX;
                let newY = eMove.clientY - canvasRect.top - offsetY;
                const elW = parseInt(el.style.width) || elRect.width;
                const elH = parseInt(el.style.height) || elRect.height;
                newX = Math.max(0, Math.min(newX, canvasRect.width - elW));
                newY = Math.max(0, Math.min(newY, canvasRect.height - elH));
                el.style.left = `${newX}px`;
                el.style.top = `${newY}px`;

                if (label && device) {
                    const iconW = parseInt(device.element.style.width) || 50;
                    const iconH = parseInt(device.element.style.height) || 50;
                    const labelW = parseInt(label.style.width) || 80;
                    const labelH = parseInt(label.style.height) || 15;
                    label.style.left = `${newX + (iconW / 2) - (labelW / 2)}px`;
                    label.style.top = `${newY + iconH + 5}px`;

                    if (device.ipAddressElement) {
                        const ipW = device.ipAddressElement.offsetWidth;
                        device.ipAddressElement.style.left = `${newX + (iconW / 2) - (ipW / 2)}px`;
                        device.ipAddressElement.style.top = `${newY + iconH + labelH + 10}px`;
                    }
                }

                // Update interface labels
                if (device?.interfaceLabels) {
                    Object.entries(device.interfaceLabels).forEach(([key, ifLabel]) => {
                        if (key.startsWith('subnet_')) {
                            positionLabelNearDevice(device.element, ifLabel, 'gateway', null);
                        } else {
                            const peer = devices[key]?.element;
                            if (peer) positionLabelNearDevice(el, ifLabel, 'left', peer);
                        }
                    });
                }
                // Update peer interface labels & SVG lines
                connections.forEach(conn => {
                    if (conn.from === el && conn.toDevice?.interfaceLabels?.[device.id]) {
                        positionLabelNearDevice(conn.to, conn.toDevice.interfaceLabels[device.id], 'right', el);
                    }
                    if (conn.to === el && conn.fromDevice?.interfaceLabels?.[device.id]) {
                        positionLabelNearDevice(conn.from, conn.fromDevice.interfaceLabels[device.id], 'left', el);
                    }
                    if (conn.from === el || conn.to === el) {
                        updateLinePosition(conn.from, conn.to, conn.line);
                    }
                });
            };
            document.onmouseup = function () { document.onmousemove = null; document.onmouseup = null; };
        };

        el.onclick = function (e) {
            if (isTextbox) return;
            if (deleteMode) {
                // Remove connections
                for (let i = connections.length - 1; i >= 0; i--) {
                    if (connections[i].from === el || connections[i].to === el) {
                        const conn = connections[i];
                        const fromId = conn.fromDevice?.id, toId = conn.toDevice?.id;
                        if (fromId && devices[fromId]?.interfaceLabels?.[toId]) { devices[fromId].interfaceLabels[toId].remove(); delete devices[fromId].interfaceLabels[toId]; if (devices[fromId].interfaceIPs) delete devices[fromId].interfaceIPs[toId]; }
                        if (toId && devices[toId]?.interfaceLabels?.[fromId]) { devices[toId].interfaceLabels[fromId].remove(); delete devices[toId].interfaceLabels[fromId]; if (devices[toId].interfaceIPs) delete devices[toId].interfaceIPs[fromId]; }
                        conn.line.remove();
                        connections.splice(i, 1);
                    }
                }
                if (label) label.remove();
                const devId = el.dataset.id;
                if (devId && devices[devId]) {
                    const dev = devices[devId];
                    if (dev.ipAddressElement) dev.ipAddressElement.remove();
                    if (dev.interfaceLabels) Object.values(dev.interfaceLabels).forEach(l => l.remove());
                    Object.values(devices).forEach(d => {
                        if (d.connections) d.connections = d.connections.filter(cid => cid !== devId);
                        if (d.interfaceIPs) delete d.interfaceIPs[devId];
                        if (d.interfaceLabels?.[devId]) { d.interfaceLabels[devId].remove(); delete d.interfaceLabels[devId]; }
                    });
                    delete devices[devId];
                }
                el.remove();
                e.stopPropagation();
            }
        };
    }

    // ---- SVG line drawing ----
    function updateLinePosition(fromEl, toEl, line) {
        const fr = fromEl.getBoundingClientRect();
        const tr = toEl.getBoundingClientRect();
        const cr = canvasEl.getBoundingClientRect();
        line.setAttribute('x1', fr.left + fr.width / 2 - cr.left);
        line.setAttribute('y1', fr.top + fr.height / 2 - cr.top);
        line.setAttribute('x2', tr.left + tr.width / 2 - cr.left);
        line.setAttribute('y2', tr.top + tr.height / 2 - cr.top);
    }

    function drawSvgLine(fromEl, toEl) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('stroke', '#0d6efd');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('pointer-events', 'stroke');
        line.style.cursor = 'pointer';
        updateLinePosition(fromEl, toEl, line);

        const fromId = fromEl.dataset.id, toId = toEl.dataset.id;
        const fromDev = devices[fromId], toDev = devices[toId];
        connections.push({ from: fromEl, to: toEl, line, fromDevice: fromDev, toDevice: toDev });
        if (fromDev && toDev) { fromDev.connections.push(toId); toDev.connections.push(fromId); }

        line.addEventListener('click', e => {
            if (deleteMode) {
                svgEl.removeChild(line);
                for (let i = connections.length - 1; i >= 0; i--) {
                    if (connections[i].line === line) {
                        const conn = connections[i];
                        if (conn.fromDevice?.interfaceIPs?.[conn.toDevice?.id]) delete conn.fromDevice.interfaceIPs[conn.toDevice.id];
                        if (conn.fromDevice?.interfaceLabels?.[conn.toDevice?.id]) { conn.fromDevice.interfaceLabels[conn.toDevice.id].remove(); delete conn.fromDevice.interfaceLabels[conn.toDevice.id]; }
                        if (conn.toDevice?.interfaceIPs?.[conn.fromDevice?.id]) delete conn.toDevice.interfaceIPs[conn.fromDevice.id];
                        if (conn.toDevice?.interfaceLabels?.[conn.fromDevice?.id]) { conn.toDevice.interfaceLabels[conn.fromDevice.id].remove(); delete conn.toDevice.interfaceLabels[conn.fromDevice.id]; }
                        if (conn.fromDevice) conn.fromDevice.connections = conn.fromDevice.connections.filter(cid => cid !== conn.toDevice?.id);
                        if (conn.toDevice) conn.toDevice.connections = conn.toDevice.connections.filter(cid => cid !== conn.fromDevice?.id);
                        connections.splice(i, 1);
                        break;
                    }
                }
                e.stopPropagation();
            }
        });
        svgEl.appendChild(line);
    }

    // ---- Interface label positioning (matches original exactly) ----
    function positionLabelNearDevice(deviceEl, labelEl, side, relatedEl) {
        const dr = deviceEl.getBoundingClientRect();
        const cr = canvasEl.getBoundingClientRect();
        labelEl.style.width = '';
        const lr = labelEl.getBoundingClientRect();
        let targetX, targetY;

        if (relatedEl) {
            const rr = relatedEl.getBoundingClientRect();
            const vecX = (rr.left + rr.width / 2) - (dr.left + dr.width / 2);
            const vecY = (rr.top + rr.height / 2) - (dr.top + dr.height / 2);
            const dist = Math.sqrt(vecX * vecX + vecY * vecY) || 1;
            const f = 0.25;
            const lpX = (dr.left + dr.width / 2) + vecX * f;
            const lpY = (dr.top + dr.height / 2) + vecY * f;
            const perpX = (side === 'left' ? -vecY / dist * 15 : vecY / dist * 15);
            const perpY = (side === 'left' ? vecX / dist * 15 : -vecX / dist * 15);
            targetX = lpX + perpX - cr.left - (lr.width / 2);
            targetY = lpY + perpY - cr.top - (lr.height / 2);
        } else if (side === 'gateway') {
            targetX = (dr.left + dr.width / 2 - cr.left) - (lr.width / 2);
            targetY = (dr.top - cr.top) - lr.height - 5;
        } else {
            targetX = dr.left - cr.left;
            targetY = dr.top - cr.top + dr.height + 5;
        }
        labelEl.style.position = 'absolute';
        labelEl.style.left = `${targetX}px`;
        labelEl.style.top = `${targetY}px`;
        labelEl.style.fontSize = '10px';
        labelEl.style.zIndex = '10';
    }

    // ===================================================================
    // SUBNETTING ENGINE (faithful port of original)
    // ===================================================================

    function assignIPAddresses(groupDeviceIds, subnetInfo) {
        const { firstHostUint, lastHostUint, cidr, networkAddress } = subnetInfo;
        let currentIpUint = firstHostUint;
        const groupDevs = groupDeviceIds.map(id => devices[id]).filter(Boolean);
        const routers = groupDevs.filter(d => d.type.toLowerCase() === 'router' || d.type.toLowerCase() === 'l3switch');
        const endDevices = groupDevs.filter(d => d.type.toLowerCase() !== 'router' && d.type.toLowerCase() !== 'l3switch');

        if (routers.length === 2 && endDevices.length === 0 && cidr === 30) {
            // P2P router link
            if (currentIpUint <= lastHostUint) { routers[0].interfaceIPs = routers[0].interfaceIPs || {}; routers[0].interfaceIPs[routers[1].id] = uintToIp(currentIpUint++); }
            if (currentIpUint <= lastHostUint) { routers[1].interfaceIPs = routers[1].interfaceIPs || {}; routers[1].interfaceIPs[routers[0].id] = uintToIp(currentIpUint++); }
        } else if (routers.length >= 1) {
            // Router acts as gateway
            const router = routers[0];
            if (currentIpUint <= lastHostUint) { router.interfaceIPs = router.interfaceIPs || {}; router.interfaceIPs[`subnet_${networkAddress}`] = uintToIp(currentIpUint++); }
            endDevices.forEach(d => { if (currentIpUint <= lastHostUint) d.ipAddress = uintToIp(currentIpUint++); });
        } else if (endDevices.length > 0) {
            endDevices.forEach(d => { if (currentIpUint <= lastHostUint) d.ipAddress = uintToIp(currentIpUint++); });
        }
    }

    function autoSubnet(baseCidrStr, groups) {
        const [baseIpStr, cidrStr] = baseCidrStr.split('/');
        if (!isValidIP(baseIpStr) || !isValidCIDR(cidrStr)) { alert('Invalid IP address or CIDR prefix.'); return; }
        const baseIpUint = ipToUint(baseIpStr);
        const baseCidr = parseInt(cidrStr, 10);
        let nextNet = baseIpUint;
        subnetResults = [];

        // Clear previous IPs and labels
        Object.values(devices).forEach(d => {
            d.ipAddress = null;
            if (d.ipAddressElement) { d.ipAddressElement.remove(); d.ipAddressElement = null; }
            d.interfaceIPs = {};
            if (d.interfaceLabels) { Object.values(d.interfaceLabels).forEach(l => l.remove()); d.interfaceLabels = {}; }
            if (d.element) { d.element.style.backgroundColor = ''; d.element.style.border = ''; }
        });
        document.querySelectorAll('.subnet-outline').forEach(o => o.remove());

        // Sort groups (largest first)
        groups.sort((a, b) => {
            const aDevs = a.map(id => devices[id]).filter(Boolean);
            const bDevs = b.map(id => devices[id]).filter(Boolean);
            const aP2P = aDevs.length === 2 && aDevs.every(d => d.type.toLowerCase() === 'router' || d.type.toLowerCase() === 'l3switch');
            const bP2P = bDevs.length === 2 && bDevs.every(d => d.type.toLowerCase() === 'router' || d.type.toLowerCase() === 'l3switch');
            const hA = aDevs.length + (aDevs.some(d => d.type.toLowerCase() === 'router' || d.type.toLowerCase() === 'l3switch') && aDevs.length > 0 ? 1 : 0) - (aP2P ? 1 : 0);
            const hB = bDevs.length + (bDevs.some(d => d.type.toLowerCase() === 'router' || d.type.toLowerCase() === 'l3switch') && bDevs.length > 0 ? 1 : 0) - (bP2P ? 1 : 0);
            return hB - hA;
        });

        let ok = true;
        groups.forEach((groupIds, index) => {
            if (!ok) return;
            const groupDevs = groupIds.map(id => devices[id]).filter(Boolean);
            if (groupDevs.length === 0) return;
            const routers = groupDevs.filter(d => d.type.toLowerCase() === 'router' || d.type.toLowerCase() === 'l3switch');
            const allConsumers = groupDevs;
            let subnetCidr, neededHosts;

            if (routers.length === 2 && allConsumers.length === 2) {
                subnetCidr = 30; neededHosts = 2;
            } else {
                neededHosts = 0;
                if (routers.length >= 1) neededHosts += 1; // gateway
                neededHosts += allConsumers.filter(d => d.type.toLowerCase() !== 'router' && d.type.toLowerCase() !== 'l3switch').length;
                if (neededHosts === 0 && allConsumers.length > 0) neededHosts = allConsumers.length;
                else if (neededHosts === 0) return;
                if (neededHosts === 1) neededHosts = 2;
                let hb = 0; while ((Math.pow(2, hb) - 2) < neededHosts) hb++;
                subnetCidr = 32 - hb;
                if (subnetCidr < 0) subnetCidr = 0;
            }

            const hostBits = 32 - subnetCidr;
            const blockSize = Math.pow(2, hostBits);
            if ((nextNet & (blockSize - 1)) !== 0) nextNet = (nextNet + blockSize) & (~(blockSize - 1));
            const netAddr = nextNet;
            const firstHost = netAddr + 1;
            const lastHost = netAddr + blockSize - 2;
            const broadcast = netAddr + blockSize - 1;

            if (broadcast >= (baseIpUint + Math.pow(2, 32 - baseCidr))) {
                alert(`Not enough IP addresses remaining. Cannot allocate subnet ${index + 1}.`);
                subnetResults = []; ok = false; return;
            }
            if (lastHost < firstHost && subnetCidr < 31) { nextNet += blockSize; return; }

            const info = {
                networkAddress: uintToIp(netAddr), cidr: subnetCidr, subnetMask: cidrToMask(subnetCidr),
                firstHost: uintToIp(firstHost), lastHost: uintToIp(lastHost), broadcastAddress: uintToIp(broadcast),
                deviceIdsInSubnet: [...groupIds], color: getRandomColor(),
                networkAddressUint: netAddr, firstHostUint: firstHost, lastHostUint: lastHost
            };
            subnetResults.push(info);
            assignIPAddresses(groupIds, info);
            nextNet += blockSize;
        });

        if (!ok) {
            document.getElementById('vizResultsBody').innerHTML = '';
            document.getElementById('vizSubnetResults').style.display = 'none';
            document.querySelectorAll('.subnet-outline').forEach(o => o.remove());
        }
    }

    function renderInterfaceLabels() {
        Object.values(devices).forEach(device => {
            const isRouter = ['router', 'l3switch'].includes(device.type.toLowerCase());
            if (device.interfaceLabels) {
                Object.keys(device.interfaceLabels).forEach(key => {
                    if (!isRouter || !device.interfaceIPs || !device.interfaceIPs[key]) {
                        device.interfaceLabels[key].remove(); delete device.interfaceLabels[key];
                    }
                });
            }
            if (!isRouter || !device.interfaceIPs) return;
            if (!device.interfaceLabels) device.interfaceLabels = {};

            Object.entries(device.interfaceIPs).forEach(([key, ip]) => {
                let isGateway = key.startsWith('subnet_');
                let peerDev = isGateway ? null : devices[key];
                if (!isGateway && !peerDev) {
                    if (device.interfaceLabels[key]) { device.interfaceLabels[key].remove(); delete device.interfaceLabels[key]; }
                    return;
                }

                let label = device.interfaceLabels[key];
                if (!label) {
                    label = document.createElement('div');
                    label.className = 'interface-ip-label';
                    if (isGateway) label.classList.add('gateway-ip-label');
                    canvasEl.appendChild(label);
                    device.interfaceLabels[key] = label;
                }
                label.innerText = ip;
                if (isGateway) positionLabelNearDevice(device.element, label, 'gateway', null);
                else if (peerDev) positionLabelNearDevice(device.element, label, 'left', peerDev.element);
            });
        });
    }

    function getSubnetsFromRouterInterfaces() {
        const subnets = [];
        const visitedForGrouping = new Set();

        // 1. Router-to-Router P2P links
        Object.values(devices).forEach(dev => {
            if (dev.type.toLowerCase() !== 'router' && dev.type.toLowerCase() !== 'l3switch') return;
            dev.connections.forEach(peerId => {
                const peer = devices[peerId];
                if (peer && (peer.type.toLowerCase() === 'router' || peer.type.toLowerCase() === 'l3switch')) {
                    const pairKey = [dev.id, peerId].sort().join('-');
                    if (!subnets.some(s => s.length === 2 && [s[0], s[1]].sort().join('-') === pairKey)) {
                        subnets.push([dev.id, peerId]);
                        visitedForGrouping.add(dev.id);
                        visitedForGrouping.add(peerId);
                    }
                }
            });
        });

        // 2. Router-to-LAN segments
        Object.values(devices).forEach(routerDev => {
            if (routerDev.type.toLowerCase() !== 'router' && routerDev.type.toLowerCase() !== 'l3switch') return;
            routerDev.connections.forEach(directPeerId => {
                const directPeer = devices[directPeerId];
                if (!directPeer || directPeer.type.toLowerCase() === 'router' || directPeer.type.toLowerCase() === 'l3switch') return;
                const segment = new Set([routerDev.id]);
                const queue = [directPeerId];
                const visited = new Set([routerDev.id, directPeerId]);

                if (visitedForGrouping.has(directPeerId) && subnets.some(s => s.includes(directPeerId) && s.includes(routerDev.id) && s.length > 2)) return;
                if (visitedForGrouping.has(directPeerId) && !subnets.flat().includes(directPeerId)) { /* ok */ }
                else if (visitedForGrouping.has(directPeerId) && !subnets.some(s => s.length === 2 && s.includes(directPeerId) && s.includes(routerDev.id))) return;

                segment.add(directPeerId);
                while (queue.length > 0) {
                    const curId = queue.shift();
                    const cur = devices[curId];
                    cur.connections.forEach(nId => {
                        const neighbor = devices[nId];
                        if (neighbor && !visited.has(nId) && neighbor.type.toLowerCase() !== 'router' && neighbor.type.toLowerCase() !== 'l3switch') {
                            let inOther = false;
                            for (const sn of subnets) { if (sn.length > 2 && sn.includes(nId) && !sn.includes(routerDev.id)) { inOther = true; break; } }
                            if (inOther) return;
                            visited.add(nId); segment.add(nId); queue.push(nId);
                        }
                    });
                }
                const arr = Array.from(segment);
                const exists = subnets.some(s => s.length === arr.length && s.every(id => arr.includes(id)));
                if (!exists && arr.length > 1) {
                    const isP2P = subnets.some(p => p.length === 2 && arr.every(id => p.includes(id)) && p.every(id => arr.includes(id)));
                    if (!isP2P || arr.length > 2) { subnets.push(arr); arr.forEach(id => visitedForGrouping.add(id)); }
                }
            });
        });

        // 3. Isolated groups (non-router segments)
        const allGrouped = new Set(subnets.flat());
        Object.keys(devices).forEach(devId => {
            if (!allGrouped.has(devId)) {
                const seg = new Set();
                const queue = [devId];
                const vis = new Set();
                while (queue.length > 0) {
                    const curId = queue.shift();
                    if (vis.has(curId) || (devices[curId].type.toLowerCase() === 'router' || devices[curId].type.toLowerCase() === 'l3switch')) continue;
                    vis.add(curId); seg.add(curId); allGrouped.add(curId);
                    devices[curId].connections.forEach(nId => { if (!vis.has(nId) && !allGrouped.has(nId)) queue.push(nId); });
                }
                if (seg.size > 0) subnets.push(Array.from(seg));
            }
        });

        return subnets;
    }

    function calculateSubnets() {
        const base = document.getElementById('vizBase').value.trim();
        if (!base.includes('/')) { alert('Enter a base network with CIDR (e.g., 192.168.0.0/24)'); return; }

        const groups = getSubnetsFromRouterInterfaces();
        if (groups.length === 0 && Object.keys(devices).length > 0) {
            const all = Object.keys(devices);
            if (all.length > 0) {
                alert('No distinct subnets detected. Treating all devices as one segment.');
                groups.push(all);
            } else { alert('The canvas is empty.'); return; }
        } else if (groups.length === 0) { alert('The canvas is empty.'); return; }

        autoSubnet(base, groups);

        const tbody = document.getElementById('vizResultsBody');
        const wrapper = document.getElementById('vizSubnetResults');
        tbody.innerHTML = '';
        if (!subnetResults || subnetResults.length === 0) {
            wrapper.style.display = 'none';
            document.querySelectorAll('.subnet-outline').forEach(o => o.remove());
            return;
        }

        subnetResults.forEach(subnet => {
            const row = document.createElement('tr');
            row.style.borderLeft = `6px solid ${subnet.color}`;
            const devDisplay = subnet.deviceIdsInSubnet.map(devId => {
                const d = devices[devId]; if (!d) return devId;
                let ip = '';
                if (d.ipAddress) ip = d.ipAddress;
                else if (d.interfaceIPs) {
                    if (d.interfaceIPs[`subnet_${subnet.networkAddress}`]) ip = d.interfaceIPs[`subnet_${subnet.networkAddress}`];
                    else if (subnet.deviceIdsInSubnet.length === 2) {
                        const other = subnet.deviceIdsInSubnet.find(x => x !== devId);
                        if (other && d.interfaceIPs[other]) ip = d.interfaceIPs[other];
                    }
                }
                return `${d.customName || d.labelElement?.innerText || d.id}${ip ? ` (${ip})` : ''}`;
            }).join(', ');

            row.innerHTML = `<td>${subnet.networkAddress}/${subnet.cidr}</td><td>${subnet.subnetMask}</td><td>${subnet.firstHost}</td><td>${subnet.lastHost}</td><td>${subnet.broadcastAddress}</td><td>${devDisplay}</td>`;
            tbody.appendChild(row);

            // Subnet outline on canvas
            const elems = subnet.deviceIdsInSubnet.map(id => devices[id]?.element).filter(Boolean);
            if (elems.length > 0) {
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                const cr = canvasEl.getBoundingClientRect();
                elems.forEach(el => {
                    const r = el.getBoundingClientRect();
                    const l = r.left - cr.left, t = r.top - cr.top;
                    minX = Math.min(minX, l); minY = Math.min(minY, t);
                    maxX = Math.max(maxX, l + r.width); maxY = Math.max(maxY, t + r.height);
                });
                const outline = document.createElement('div');
                outline.className = 'subnet-outline';
                outline.style.position = 'absolute';
                outline.style.border = `2px dashed ${subnet.color}`;
                outline.style.left = `${minX - 20}px`; outline.style.top = `${minY - 20}px`;
                outline.style.width = `${maxX - minX + 40}px`; outline.style.height = `${maxY - minY + 40}px`;
                outline.style.zIndex = '0'; outline.style.borderRadius = '10px';
                canvasEl.appendChild(outline);
            }
        });
        wrapper.style.display = 'block';
        renderInterfaceLabels();

        // Update device visuals
        Object.values(devices).forEach(device => {
            if (device.ipAddress && device.element) {
                if (!device.ipAddressElement) {
                    device.ipAddressElement = document.createElement('div');
                    device.ipAddressElement.className = 'device-ip-display';
                    device.ipAddressElement.style.position = 'absolute';
                    device.ipAddressElement.style.fontSize = '10px';
                    device.ipAddressElement.style.zIndex = '3';
                    canvasEl.appendChild(device.ipAddressElement);
                }
                device.ipAddressElement.innerText = device.ipAddress;
                const dr = device.element.getBoundingClientRect();
                const cr = canvasEl.getBoundingClientRect();
                const mainLH = device.labelElement ? device.labelElement.offsetHeight : 15;
                const ipW = device.ipAddressElement.offsetWidth;
                const iconW = parseInt(device.element.style.width) || 50;
                device.ipAddressElement.style.left = (dr.left - cr.left + iconW / 2 - ipW / 2) + 'px';
                device.ipAddressElement.style.top = (dr.top - cr.top + (parseInt(device.element.style.height) || 50) + mainLH + 10) + 'px';
            } else if (device.ipAddressElement) { device.ipAddressElement.remove(); device.ipAddressElement = null; }

            const ownSubnet = subnetResults.find(s => s.deviceIdsInSubnet.includes(device.id));
            if (ownSubnet && device.element) device.element.style.border = `2px solid ${ownSubnet.color}`;
            else if (device.element) device.element.style.border = '';
        });
    }

    // ---- Save/Load helpers ----
    function loadState(state) {
        document.getElementById('vizClear').click();
        deviceCounter = state.deviceCounter || 0;

        if (state.devices) {
            state.devices.forEach(d => {
                const iconSrc = getIconSrc(d.type);
                const x = parseInt(d.left) || 0;
                const y = parseInt(d.top) || 0;
                createDevice(d.type, iconSrc, x, y, d.customName, d.id);
            });
        }
        if (state.connections) {
            state.connections.forEach(c => {
                const from = devices[c.fromId], to = devices[c.toId];
                if (from && to) drawSvgLine(from.element, to.element);
            });
        }
    }

    // ---- PNG Export (SVG rasterization approach) ----
    async function exportPng() {
        const container = document.createElement('div');
        container.style.cssText = 'position:absolute;top:-9999px;left:-9999px;background:#fff;padding:20px;z-index:-1;';
        document.body.appendChild(container);

        // Clone results table if visible
        const results = document.getElementById('vizSubnetResults');
        if (results && results.style.display !== 'none') {
            const clone = results.cloneNode(true);
            clone.style.marginBottom = '20px'; clone.style.display = 'block';
            const csvBtn = clone.querySelector('#vizExportCsv'); if (csvBtn) csvBtn.remove();
            container.appendChild(clone);
        }

        // Clone canvas wrapper
        const cloned = wrapperEl.cloneNode(true);
        cloned.style.overflow = 'visible';
        cloned.style.height = 'auto'; cloned.style.width = 'auto';
        cloned.style.position = 'relative';
        cloned.style.border = '1px solid #ccc';
        cloned.style.minWidth = `${wrapperEl.scrollWidth}px`;
        cloned.style.minHeight = `${wrapperEl.scrollHeight}px`;
        container.appendChild(cloned);

        // Rasterize SVG icons to PNG data URIs
        const images = cloned.querySelectorAll('img');
        const promises = Array.from(images).map(img => new Promise(resolve => {
            if (!img.src || !img.src.endsWith('.svg')) { resolve(); return; }
            const tmp = new Image(); tmp.crossOrigin = 'Anonymous';
            tmp.onload = function () {
                const c = document.createElement('canvas');
                c.width = parseInt(img.style.width) || tmp.naturalWidth || 50;
                c.height = parseInt(img.style.height) || tmp.naturalHeight || 50;
                const ctx = c.getContext('2d');
                ctx.drawImage(tmp, 0, 0, c.width, c.height);
                try { img.src = c.toDataURL('image/png'); } catch (e) { /* taint fallback */ }
                resolve();
            };
            tmp.onerror = () => resolve();
            tmp.src = img.src + '?t=' + Date.now();
        }));

        try {
            await Promise.all(promises);

            // Use html2canvas if available, otherwise fallback to simple Canvas render
            if (typeof html2canvas === 'function') {
                const canvas = await html2canvas(container, { backgroundColor: '#ffffff', useCORS: true, allowTaint: true, logging: false, scale: 2 });
                const link = document.createElement('a');
                link.download = 'network_topology_report.png';
                link.href = canvas.toDataURL();
                link.click();
            } else {
                // Fallback: simple canvas-based export
                const c = document.createElement('canvas');
                const w = Math.max(wrapperEl.scrollWidth, 800);
                const h = Math.max(wrapperEl.scrollHeight, 600);
                c.width = w; c.height = h;
                const ctx = c.getContext('2d');
                ctx.fillStyle = '#1e293b'; ctx.fillRect(0, 0, w, h);

                // Draw connections
                ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2;
                connections.forEach(conn => {
                    const fEl = conn.fromDevice?.element, tEl = conn.toDevice?.element;
                    if (!fEl || !tEl) return;
                    const fx = parseInt(fEl.style.left) + 25, fy = parseInt(fEl.style.top) + 25;
                    const tx = parseInt(tEl.style.left) + 25, ty = parseInt(tEl.style.top) + 25;
                    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
                });

                // Draw device labels & types
                ctx.font = '12px Inter, sans-serif'; ctx.fillStyle = '#f1f5f9'; ctx.textAlign = 'center';
                Object.values(devices).forEach(dev => {
                    const x = parseInt(dev.element.style.left), y = parseInt(dev.element.style.top);
                    ctx.strokeStyle = subnetResults.find(s => s.deviceIdsInSubnet.includes(dev.id))?.color || '#3b82f6';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x, y, 50, 50);
                    ctx.font = '9px Inter'; ctx.fillStyle = '#94a3b8';
                    ctx.fillText(dev.type, x + 25, y + 28);
                    ctx.font = '12px Inter, sans-serif'; ctx.fillStyle = '#f1f5f9';
                    ctx.fillText(dev.customName || dev.labelElement?.innerText || dev.id, x + 25, y + 68);
                    if (dev.ipAddress) {
                        ctx.fillStyle = '#06b6d4';
                        ctx.fillText(dev.ipAddress, x + 25, y + 80);
                        ctx.fillStyle = '#f1f5f9';
                    }
                });

                c.toBlob(blob => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = 'network_topology_report.png';
                    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                });
            }
        } catch (err) {
            console.error('Export failed:', err);
            alert('Failed to export PNG.');
        }
        if (document.body.contains(container)) document.body.removeChild(container);
        showToast('PNG exported', 'success');
    }
}
