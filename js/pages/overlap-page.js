import { copyToClipboard, showToast } from '../utils.js';

export function render() {
 return `
<div class="container mt-4">
 <div class="page-header">
 <h1>CIDR Overlap Checker</h1>
 <p>Check if multiple CIDR blocks overlap — essential for IP address planning and conflict detection.</p>
 </div>

 <div class="card mb-4">
 <div class="card-body">
 <div class="form-group">
 <label class="form-label" for="overlapInput">CIDR Blocks (one per line)</label>
 <textarea id="overlapInput" class="form-control text-mono" rows="6" placeholder="192.168.1.0/24&#10;192.168.1.128/25&#10;10.0.0.0/8&#10;172.16.0.0/12"></textarea>
 </div>
 <div class="flex gap-3">
 <button id="overlapCheckBtn" class="btn btn-primary">Check Overlaps</button>
 <button id="overlapClearBtn" class="btn btn-outline-secondary">Clear</button>
 </div>
 <button class="btn btn-outline-secondary btn-sm ms-2" id="helpToggle">Help</button>

 </div>
 </div>

 <div id="helpPanel" class="help-panel hidden">
 <strong>How to use:</strong>
 <ul>
 <li>Enter two or more CIDR blocks, one per line (e.g., <code>192.168.1.0/24</code>)</li>
 <li>Click <strong>Check Overlaps</strong> to detect conflicts</li>
 <li>Overlapping pairs will be highlighted in red</li>
 <li>Non-overlapping blocks will be marked green</li>
 </ul>
 </div>

 <div id="overlapResults"></div>
</div>`;
}

export function init() {
 const input = document.getElementById('overlapInput');
 const checkBtn = document.getElementById('overlapCheckBtn');
 const clearBtn = document.getElementById('overlapClearBtn');
 const resultsDiv = document.getElementById('overlapResults');
 const helpToggle = document.getElementById('helpToggle');
 const helpPanel = document.getElementById('helpPanel');

 helpToggle.addEventListener('click', () => {
 helpPanel.classList.toggle('hidden');
 helpToggle.textContent = helpPanel.classList.contains('hidden') ? 'Help' : 'Hide Help';
 });

 clearBtn.addEventListener('click', () => {
 input.value = '';
 resultsDiv.innerHTML = '';
 });

 checkBtn.addEventListener('click', () => {
 const lines = input.value.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);

 if (lines.length < 2) {
 resultsDiv.innerHTML = '<div class="alert alert-warning">Enter at least two CIDR blocks to check for overlaps.</div>';
 return;
 }

 // Parse all CIDRs
 const networks = [];
 for (const line of lines) {
 try {
 const parsed = parseCIDR(line);
 networks.push(parsed);
 } catch (err) {
 resultsDiv.innerHTML = `<div class="alert alert-danger">Invalid CIDR: <code>${line}</code> — ${err.message}</div>`;
 return;
 }
 }

 // Check all pairs for overlap
 const overlaps = [];
 for (let i = 0; i < networks.length; i++) {
 for (let j = i + 1; j < networks.length; j++) {
 if (rangesOverlap(networks[i], networks[j])) {
 overlaps.push([i, j]);
 }
 }
 }

 // Track which CIDRs are involved in overlaps
 const conflicted = new Set();
 overlaps.forEach(([i, j]) => { conflicted.add(i); conflicted.add(j); });

 // Build results
 let html = '';

 if (overlaps.length === 0) {
 html += '<div class="alert alert-success" style="margin-bottom:var(16px);"><strong>No overlaps detected!</strong> All CIDR blocks are cleanly separated.</div>';
 } else {
 html += `<div class="alert alert-danger" style="margin-bottom:var(16px);"><strong>${overlaps.length} overlap${overlaps.length > 1 ? 's' : ''} detected!</strong></div>`;

 // Overlap details
 html += '<div class="card mb-4"><div class="card-header">Conflicting Pairs</div><div class="result-panel">';
 overlaps.forEach(([i, j]) => {
 const a = networks[i];
 const b = networks[j];
 const relationship = getRelationship(a, b);
 html += `<div class="result-row" style="border-left-color:#dc3545;">
 <span class="result-label" style="color:#dc3545;">${a.cidr} ↔ ${b.cidr}</span>
 <span class="result-value">${relationship}</span>
 </div>`;
 });
 html += '</div></div>';
 }

 // Summary table of all blocks
 html += '<div class="card"><div class="card-header">All Blocks</div><div style="overflow-x:auto;"><table class="table"><thead><tr><th>CIDR</th><th>Network</th><th>Broadcast</th><th>Hosts</th><th>Status</th></tr></thead><tbody>';

 networks.forEach((net, idx) => {
 const status = conflicted.has(idx)
 ? '<span style="color:#dc3545;font-weight:600;">Overlap</span>'
 : '<span style="color:#198754;font-weight:600;">Clean</span>';
 const rowStyle = conflicted.has(idx) ? ' style="background:rgba(248,113,113,0.06);"' : '';
 html += `<tr${rowStyle}>
 <td class="text-mono"><strong>${net.cidr}</strong></td>
 <td class="text-mono">${uint2ip(net.network)}</td>
 <td class="text-mono">${uint2ip(net.broadcast)}</td>
 <td>${net.totalHosts.toLocaleString()}</td>
 <td>${status}</td>
 </tr>`;
 });

 html += '</tbody></table></div></div>';

 resultsDiv.innerHTML = html;
 });
}

// --- Helpers ---

function parseCIDR(str) {
 const parts = str.trim().split('/');
 if (parts.length !== 2) throw new Error('Expected format: IP/prefix');
 const prefix = parseInt(parts[1], 10);
 if (isNaN(prefix) || prefix < 0 || prefix > 32) throw new Error('Prefix must be 0-32');

 const octets = parts[0].split('.');
 if (octets.length !== 4) throw new Error('Invalid IPv4 address');
 const nums = octets.map(o => parseInt(o, 10));
 if (nums.some(n => isNaN(n) || n < 0 || n > 255)) throw new Error('Octets must be 0-255');

 const ip = ((nums[0] << 24) | (nums[1] << 16) | (nums[2] << 8) | nums[3]) >>> 0;
 const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
 const network = (ip & mask) >>> 0;
 const broadcast = (network | (~mask >>> 0)) >>> 0;
 const totalHosts = Math.pow(2, 32 - prefix);

 return {
 cidr: `${uint2ip(network)}/${prefix}`,
 ip, prefix, mask, network, broadcast, totalHosts
 };
}

function rangesOverlap(a, b) {
 // Two CIDR blocks overlap if either contains the other's network or broadcast
 return (a.network <= b.broadcast && b.network <= a.broadcast);
}

function getRelationship(a, b) {
 if (a.network === b.network && a.broadcast === b.broadcast) {
 return 'Identical ranges';
 }
 if (a.network <= b.network && a.broadcast >= b.broadcast) {
 return `${b.cidr} is contained within ${a.cidr}`;
 }
 if (b.network <= a.network && b.broadcast >= a.broadcast) {
 return `${a.cidr} is contained within ${b.cidr}`;
 }
 return 'Partial overlap';
}

function uint2ip(uint) {
 return [
 (uint >>> 24) & 0xff,
 (uint >>> 16) & 0xff,
 (uint >>> 8) & 0xff,
 uint & 0xff
 ].join('.');
}
