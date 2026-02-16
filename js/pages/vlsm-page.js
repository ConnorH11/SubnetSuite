import { calculateVLSM } from '../calculators/vlsm.js';
import { validateIPv4, copyToClipboard, exportCSV, showToast } from '../utils.js';

export function render() {
 return `
<div class="container mt-4">
 <div class="page-header">
 <h1>VLSM Calculator</h1>
 <p>Allocate variable-length subnets from a base network to minimize IP address waste.</p>
 </div>

 <div class="card mb-4">
 <div class="card-body">
 <div class="form-group">
 <label class="form-label" for="vlsmBase">Base Network (CIDR)</label>
 <input type="text" id="vlsmBase" class="form-control" placeholder="192.168.1.0/24" autocomplete="off">
 </div>

 <div class="form-label mb-2">Subnet Requirements</div>
 <div id="vlsmSubnets">
 <div class="vlsm-row flex gap-3 mb-2 items-center">
 <input type="text" class="form-control vlsm-label" placeholder="Label (optional)" style="flex:2">
 <input type="number" class="form-control vlsm-hosts" placeholder="Hosts needed" min="1" style="flex:1">
 <button class="btn btn-danger btn-sm btn-icon vlsm-remove" title="Remove">✕</button>
 </div>
 </div>

 <div class="flex gap-2 mt-3">
 <button id="vlsmAddRow" class="btn btn-secondary btn-sm">+ Add Subnet</button>
 </div>

 <div class="flex gap-3 mt-4">
 <button id="vlsmCalcBtn" class="btn btn-primary">Calculate VLSM</button>
 <button id="vlsmExportBtn" class="btn btn-secondary btn-sm hidden"> Export CSV</button>
 </div>
 <button class="btn btn-outline-secondary btn-sm ms-2" id="helpToggle">Help</button>

 </div>
 </div>

 <div id="helpPanel" class="help-panel hidden">
 <strong>How to use:</strong>
 <ul>
 <li>Enter a base network in CIDR notation (e.g., <code>10.0.0.0/24</code>)</li>
 <li>Add subnet requirements with the number of hosts needed</li>
 <li>Optionally label each subnet (e.g., "Sales", "Engineering")</li>
 <li>Click <strong>Calculate VLSM</strong> to allocate subnets</li>
 <li>Export results as CSV for documentation</li>
 </ul>
 <p class="mt-2">Subnets are allocated from largest to smallest requirements to optimize address space utilization.</p>
 </div>

 <div id="vlsmResults"></div>
</div>`;
}

let lastResults = null;

export function init() {
 const addBtn = document.getElementById('vlsmAddRow');
 const calcBtn = document.getElementById('vlsmCalcBtn');
 const exportBtn = document.getElementById('vlsmExportBtn');
 const helpToggle = document.getElementById('helpToggle');
 const helpPanel = document.getElementById('helpPanel');
 const container = document.getElementById('vlsmSubnets');

 // Add row
 addBtn.addEventListener('click', () => addRow(container));

 // Remove row delegation
 container.addEventListener('click', (e) => {
 if (e.target.classList.contains('vlsm-remove')) {
 const rows = container.querySelectorAll('.vlsm-row');
 if (rows.length > 1) e.target.closest('.vlsm-row').remove();
 else showToast('At least one subnet is required', 'danger');
 }
 });

 // Help toggle
 helpToggle.addEventListener('click', () => {
 helpPanel.classList.toggle('hidden');
 helpToggle.textContent = helpPanel.classList.contains('hidden') ? 'Help' : 'Hide Help';
 });

 // Calculate
 calcBtn.addEventListener('click', doCalculate);

 // Export
 exportBtn.addEventListener('click', doExport);
}

function addRow(container) {
 const row = document.createElement('div');
 row.className = 'vlsm-row flex gap-3 mb-2 items-center';
 row.innerHTML = `
 <input type="text" class="form-control vlsm-label" placeholder="Label (optional)" style="flex:2">
 <input type="number" class="form-control vlsm-hosts" placeholder="Hosts needed" min="1" style="flex:1">
 <button class="btn btn-danger btn-sm btn-icon vlsm-remove" title="Remove">✕</button>`;
 container.appendChild(row);
}

function doCalculate() {
 const base = document.getElementById('vlsmBase').value.trim();
 const resultsDiv = document.getElementById('vlsmResults');
 const exportBtn = document.getElementById('vlsmExportBtn');

 if (!base.includes('/')) {
 resultsDiv.innerHTML = '<div class="alert alert-warning">Enter a base network in CIDR notation, e.g. 192.168.1.0/24</div>';
 return;
 }

 const rows = document.querySelectorAll('.vlsm-row');
 const subnets = [];
 for (const row of rows) {
 const label = row.querySelector('.vlsm-label').value.trim();
 const hosts = parseInt(row.querySelector('.vlsm-hosts').value, 10);
 if (isNaN(hosts) || hosts <= 0) {
 resultsDiv.innerHTML = '<div class="alert alert-danger">All subnets must have a valid host count (≥ 1).</div>';
 return;
 }
 subnets.push({ label: label || `Subnet ${subnets.length + 1}`, hosts });
 }

 try {
 lastResults = calculateVLSM(base, subnets);
 renderResults(lastResults, resultsDiv);
 exportBtn.classList.remove('hidden');
 } catch (err) {
 resultsDiv.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
 exportBtn.classList.add('hidden');
 }
}

function renderResults(results, container) {
 container.innerHTML = `
 <div class="table-responsive">
 <table class="table table-striped">
 <thead>
 <tr>
 <th>Label</th>
 <th>Network</th>
 <th>Mask</th>
 <th>First Host</th>
 <th>Last Host</th>
 <th>Broadcast</th>
 <th>Needed</th>
 <th>Allocated</th>
 </tr>
 </thead>
 <tbody>
 ${results.map(r => `
 <tr>
 <td><strong>${r.label}</strong></td>
 <td class="text-mono">${r.cidrNotation}</td>
 <td class="text-mono">${r.subnetMask}</td>
 <td class="text-mono">${r.firstHost}</td>
 <td class="text-mono">${r.lastHost}</td>
 <td class="text-mono">${r.broadcastAddress}</td>
 <td>${r.neededHosts}</td>
 <td>${r.allocatedHosts}</td>
 </tr>`).join('')}
 </tbody>
 </table>
 </div>`;
}

function doExport() {
 if (!lastResults || lastResults.length === 0) return;
 const header = 'Label,Network,CIDR,Subnet Mask,First Host,Last Host,Broadcast,Needed Hosts,Allocated Hosts\n';
 const rows = lastResults.map(r =>
 `${r.label},${r.networkAddress},/${r.cidr},${r.subnetMask},${r.firstHost},${r.lastHost},${r.broadcastAddress},${r.neededHosts},${r.allocatedHosts}`
 ).join('\n');
 exportCSV(header + rows, 'vlsm_results.csv');
 showToast('CSV exported', 'success');
}
