import { copyToClipboard } from '../utils.js';

export function render() {
    return `
<div class="container mt-4">
 <div class="page-header">
 <h1>Bandwidth Calculator</h1>
 <p>Calculate file transfer times, convert bandwidth units, and plan network capacity.</p>
 </div>

 <!-- Transfer Time Calculator -->
 <div class="card mb-4">
 <div class="card-header">Transfer Time Calculator</div>
 <div class="card-body">
 <div class="flex gap-4" style="flex-wrap:wrap;">
 <div class="form-group" style="flex:2; min-width:180px;">
 <label class="form-label" for="fileSize">File Size</label>
 <input type="number" id="fileSize" class="form-control" placeholder="100" min="0" step="any" autocomplete="off">
 </div>
 <div class="form-group" style="flex:1; min-width:120px;">
 <label class="form-label" for="fileSizeUnit">Unit</label>
 <select id="fileSizeUnit" class="form-select">
 <option value="B">Bytes</option>
 <option value="KB">KB</option>
 <option value="MB" selected>MB</option>
 <option value="GB">GB</option>
 <option value="TB">TB</option>
 </select>
 </div>
 <div class="form-group" style="flex:2; min-width:180px;">
 <label class="form-label" for="linkSpeed">Link Speed</label>
 <input type="number" id="linkSpeed" class="form-control" placeholder="100" min="0" step="any" autocomplete="off">
 </div>
 <div class="form-group" style="flex:1; min-width:120px;">
 <label class="form-label" for="linkSpeedUnit">Unit</label>
 <select id="linkSpeedUnit" class="form-select">
 <option value="bps">bps</option>
 <option value="Kbps">Kbps</option>
 <option value="Mbps" selected>Mbps</option>
 <option value="Gbps">Gbps</option>
 </select>
 </div>
 </div>
 <button id="calcTransferBtn" class="btn btn-primary">Calculate Transfer Time</button>
 </div>
 </div>

 <div id="transferResults"></div>

 <!-- Unit Converter -->
 <div class="card mb-4">
 <div class="card-header">Bandwidth Unit Converter</div>
 <div class="card-body">
 <div class="flex gap-4" style="flex-wrap:wrap;">
 <div class="form-group" style="flex:2; min-width:180px;">
 <label class="form-label" for="bwValue">Value</label>
 <input type="number" id="bwValue" class="form-control" placeholder="100" min="0" step="any" autocomplete="off">
 </div>
 <div class="form-group" style="flex:1; min-width:120px;">
 <label class="form-label" for="bwUnit">Unit</label>
 <select id="bwUnit" class="form-select">
 <option value="bps">bps</option>
 <option value="Kbps">Kbps</option>
 <option value="Mbps" selected>Mbps</option>
 <option value="Gbps">Gbps</option>
 <option value="Bps">Bytes/s</option>
 <option value="KBps">KB/s</option>
 <option value="MBps">MB/s</option>
 <option value="GBps">GB/s</option>
 </select>
 </div>
 </div>
 <button id="convertBwBtn" class="btn btn-primary">Convert</button>
 </div>
 </div>

 <div id="convertResults"></div>

 <!-- Capacity Planner -->
 <div class="card mb-4">
 <div class="card-header">Capacity Planner</div>
 <div class="card-body">
 <div class="flex gap-4" style="flex-wrap:wrap;">
 <div class="form-group" style="flex:1; min-width:150px;">
 <label class="form-label" for="numUsers">Concurrent Users</label>
 <input type="number" id="numUsers" class="form-control" placeholder="50" min="1" autocomplete="off">
 </div>
 <div class="form-group" style="flex:1; min-width:180px;">
 <label class="form-label" for="perUserBw">Per-User Bandwidth</label>
 <input type="number" id="perUserBw" class="form-control" placeholder="5" min="0" step="any" autocomplete="off">
 </div>
 <div class="form-group" style="flex:1; min-width:120px;">
 <label class="form-label" for="perUserBwUnit">Unit</label>
 <select id="perUserBwUnit" class="form-select">
 <option value="Kbps">Kbps</option>
 <option value="Mbps" selected>Mbps</option>
 <option value="Gbps">Gbps</option>
 </select>
 </div>
 </div>
 <button id="calcCapacityBtn" class="btn btn-primary">Calculate Required Bandwidth</button>
 </div>
 </div>

 <div id="capacityResults"></div>

 <button class="btn btn-outline-secondary btn-sm mb-4" id="helpToggle">Help</button>
 <div id="helpPanel" class="help-panel hidden">
 <strong>How to use:</strong>
 <ul>
 <li><strong>Transfer Time</strong>: Enter file size and link speed to see how long a transfer takes</li>
 <li><strong>Unit Converter</strong>: Enter any bandwidth value to see all equivalent units</li>
 <li><strong>Capacity Planner</strong>: Enter concurrent users and per-user bandwidth to calculate total required capacity</li>
 <li><strong>Note:</strong> 1 byte = 8 bits. Network speeds are typically in bits/s, file sizes in bytes.</li>
 </ul>
 </div>
</div>`;
}

export function init() {
    const helpToggle = document.getElementById('helpToggle');
    const helpPanel = document.getElementById('helpPanel');

    helpToggle.addEventListener('click', () => {
        helpPanel.classList.toggle('hidden');
        helpToggle.textContent = helpPanel.classList.contains('hidden') ? 'Help' : 'Hide Help';
    });

    // --- Transfer Time ---
    document.getElementById('calcTransferBtn').addEventListener('click', () => {
        const size = parseFloat(document.getElementById('fileSize').value);
        const sizeUnit = document.getElementById('fileSizeUnit').value;
        const speed = parseFloat(document.getElementById('linkSpeed').value);
        const speedUnit = document.getElementById('linkSpeedUnit').value;
        const resultsDiv = document.getElementById('transferResults');

        if (isNaN(size) || size <= 0 || isNaN(speed) || speed <= 0) {
            resultsDiv.innerHTML = '<div class="alert alert-warning">Enter a valid file size and link speed.</div>';
            return;
        }

        const bytes = size * BYTE_MULTIPLIERS[sizeUnit];
        const bits = bytes * 8;
        const bitsPerSec = speed * BIT_MULTIPLIERS[speedUnit];
        const seconds = bits / bitsPerSec;

        resultsDiv.innerHTML = `
 <div class="card mb-4">
 <div class="card-header">Transfer Time Result</div>
 <div class="result-panel">
 <div class="result-row">
 <span class="result-label">File Size</span>
 <span class="result-value">${formatBytes(bytes)}</span>
 </div>
 <div class="result-row">
 <span class="result-label">Link Speed</span>
 <span class="result-value">${formatBitsPerSec(bitsPerSec)}</span>
 </div>
 <div class="result-row">
 <span class="result-label">Transfer Time</span>
 <span class="result-value"><strong>${formatDuration(seconds)}</strong></span>
 </div>
 <div class="result-row">
 <span class="result-label">Exact Seconds</span>
 <span class="result-value">${seconds.toFixed(3)}s</span>
 </div>
 </div>
 </div>`;
    });

    // --- Bandwidth Converter ---
    document.getElementById('convertBwBtn').addEventListener('click', () => {
        const value = parseFloat(document.getElementById('bwValue').value);
        const unit = document.getElementById('bwUnit').value;
        const resultsDiv = document.getElementById('convertResults');

        if (isNaN(value) || value < 0) {
            resultsDiv.innerHTML = '<div class="alert alert-warning">Enter a valid value.</div>';
            return;
        }

        // Convert to bits per second first
        let bps;
        if (unit.endsWith('ps') && !unit.endsWith('Bps') && unit !== 'bps') {
            bps = value * BIT_MULTIPLIERS[unit];
        } else if (unit === 'bps') {
            bps = value;
        } else {
            // Bytes/sec units
            bps = value * BYTE_TO_BIT_MULTIPLIERS[unit];
        }

        const rows = [
            ['Bits per second (bps)', (bps).toLocaleString(undefined, { maximumFractionDigits: 2 })],
            ['Kilobits per second (Kbps)', (bps / 1e3).toLocaleString(undefined, { maximumFractionDigits: 4 })],
            ['Megabits per second (Mbps)', (bps / 1e6).toLocaleString(undefined, { maximumFractionDigits: 6 })],
            ['Gigabits per second (Gbps)', (bps / 1e9).toLocaleString(undefined, { maximumFractionDigits: 8 })],
            ['', ''],
            ['Bytes per second (B/s)', (bps / 8).toLocaleString(undefined, { maximumFractionDigits: 2 })],
            ['Kilobytes per second (KB/s)', (bps / 8 / 1e3).toLocaleString(undefined, { maximumFractionDigits: 4 })],
            ['Megabytes per second (MB/s)', (bps / 8 / 1e6).toLocaleString(undefined, { maximumFractionDigits: 6 })],
            ['Gigabytes per second (GB/s)', (bps / 8 / 1e9).toLocaleString(undefined, { maximumFractionDigits: 8 })],
        ];

        resultsDiv.innerHTML = `
 <div class="card mb-4">
 <div class="card-header">Conversion Results</div>
 <div class="result-panel">
 ${rows.map(([label, val]) => {
            if (!label) return '<div style="border-top:1px solid #dee2e6; margin:4px 0;"></div>';
            return `<div class="result-row">
 <span class="result-label">${label}</span>
 <span class="result-value">${val}</span>
 </div>`;
        }).join('')}
 </div>
 </div>`;
    });

    // --- Capacity Planner ---
    document.getElementById('calcCapacityBtn').addEventListener('click', () => {
        const users = parseInt(document.getElementById('numUsers').value);
        const perUser = parseFloat(document.getElementById('perUserBw').value);
        const perUserUnit = document.getElementById('perUserBwUnit').value;
        const resultsDiv = document.getElementById('capacityResults');

        if (isNaN(users) || users <= 0 || isNaN(perUser) || perUser <= 0) {
            resultsDiv.innerHTML = '<div class="alert alert-warning">Enter valid user count and per-user bandwidth.</div>';
            return;
        }

        const perUserBps = perUser * BIT_MULTIPLIERS[perUserUnit];
        const totalBps = perUserBps * users;

        // Recommend link speed tier
        const tiers = [
            { name: 'Fast Ethernet', speed: 100e6 },
            { name: 'Gigabit Ethernet', speed: 1e9 },
            { name: '2.5GBase-T', speed: 2.5e9 },
            { name: '5GBase-T', speed: 5e9 },
            { name: '10 Gigabit Ethernet', speed: 10e9 },
            { name: '25 Gigabit Ethernet', speed: 25e9 },
            { name: '40 Gigabit Ethernet', speed: 40e9 },
            { name: '100 Gigabit Ethernet', speed: 100e9 },
        ];
        const recommended = tiers.find(t => t.speed >= totalBps) || tiers[tiers.length - 1];
        const utilization = (totalBps / recommended.speed * 100).toFixed(1);

        resultsDiv.innerHTML = `
 <div class="card mb-4">
 <div class="card-header">Capacity Calculation</div>
 <div class="result-panel">
 <div class="result-row">
 <span class="result-label">Concurrent Users</span>
 <span class="result-value">${users.toLocaleString()}</span>
 </div>
 <div class="result-row">
 <span class="result-label">Per-User Bandwidth</span>
 <span class="result-value">${perUser} ${perUserUnit}</span>
 </div>
 <div class="result-row">
 <span class="result-label">Total Required</span>
 <span class="result-value"><strong>${formatBitsPerSec(totalBps)}</strong></span>
 </div>
 <div class="result-row">
 <span class="result-label">Recommended Link</span>
 <span class="result-value">${recommended.name} (${formatBitsPerSec(recommended.speed)})</span>
 </div>
 <div class="result-row">
 <span class="result-label">Utilization</span>
 <span class="result-value">${utilization}%</span>
 </div>
 </div>
 </div>`;
    });
}

// --- Constants ---
const BYTE_MULTIPLIERS = { B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12 };
const BIT_MULTIPLIERS = { bps: 1, Kbps: 1e3, Mbps: 1e6, Gbps: 1e9 };
const BYTE_TO_BIT_MULTIPLIERS = { Bps: 8, KBps: 8e3, MBps: 8e6, GBps: 8e9 };

function formatDuration(seconds) {
    if (seconds < 0.001) return `${(seconds * 1e6).toFixed(0)} μs`;
    if (seconds < 1) return `${(seconds * 1000).toFixed(1)} ms`;
    if (seconds < 60) return `${seconds.toFixed(2)} seconds`;
    if (seconds < 3600) {
        const m = Math.floor(seconds / 60);
        const s = Math.round(seconds % 60);
        return `${m} min ${s} sec`;
    }
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.round(seconds % 60);
    if (h >= 24) {
        const d = Math.floor(h / 24);
        const rh = h % 24;
        return `${d} day${d > 1 ? 's' : ''} ${rh}h ${m}m`;
    }
    return `${h}h ${m}m ${s}s`;
}

function formatBytes(bytes) {
    if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(2)} TB`;
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(2)} MB`;
    if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(2)} KB`;
    return `${bytes} B`;
}

function formatBitsPerSec(bps) {
    if (bps >= 1e9) return `${(bps / 1e9).toFixed(2)} Gbps`;
    if (bps >= 1e6) return `${(bps / 1e6).toFixed(2)} Mbps`;
    if (bps >= 1e3) return `${(bps / 1e3).toFixed(2)} Kbps`;
    return `${bps} bps`;
}
