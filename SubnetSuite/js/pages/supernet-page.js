import { calculateSupernet, aggregateCIDR } from '../calculators/supernet.js';
import { copyToClipboard, showToast } from '../utils.js';

export function render() {
 return `
<div class="container mt-4">
 <div class="page-header">
 <h1>Supernetting / CIDR Aggregation</h1>
 <p>Calculate the smallest supernet for multiple networks, or aggregate CIDRs into a minimal set.</p>
 </div>

 <div class="card mb-4">
 <div class="card-body">
 <div class="form-group">
 <label class="form-label">Mode</label>
 <div class="radio-group" id="supernetMode">
 <input type="radio" name="mode" id="modeSingle" value="supernet" checked>
 <label for="modeSingle">Single Supernet</label>
 <input type="radio" name="mode" id="modeAggregate" value="aggregate">
 <label for="modeAggregate">CIDR Aggregation</label>
 </div>
 </div>

 <div class="form-label mb-2">CIDR Blocks</div>
 <div id="supernetInputs">
 <div class="sn-row flex gap-3 mb-2 items-center">
 <input type="text" class="form-control sn-cidr" placeholder="192.168.0.0/24" autocomplete="off" style="flex:1">
 <button class="btn btn-danger btn-sm btn-icon sn-remove" title="Remove">✕</button>
 </div>
 <div class="sn-row flex gap-3 mb-2 items-center">
 <input type="text" class="form-control sn-cidr" placeholder="192.168.1.0/24" autocomplete="off" style="flex:1">
 <button class="btn btn-danger btn-sm btn-icon sn-remove" title="Remove">✕</button>
 </div>
 </div>

 <div class="flex gap-2 mt-3">
 <button id="snAddRow" class="btn btn-secondary btn-sm">+ Add CIDR</button>
 </div>

 <div class="mt-4">
 <button id="snCalcBtn" class="btn btn-primary">Calculate</button>
 </div>
 <button class="btn btn-outline-secondary btn-sm ms-2" id="helpToggle">Help</button>

 </div>
 </div>

 <div id="helpPanel" class="help-panel hidden">
 <strong>Supernet Mode:</strong> Finds the single smallest CIDR that encompasses all entered networks.<br>
 <strong>Aggregation Mode:</strong> Merges adjacent CIDR blocks into the minimal number of covering blocks.
 </div>

 <div id="snResults"></div>
</div>`;
}

export function init() {
 const container = document.getElementById('supernetInputs');
 const addBtn = document.getElementById('snAddRow');
 const calcBtn = document.getElementById('snCalcBtn');
 const helpToggle = document.getElementById('helpToggle');
 const helpPanel = document.getElementById('helpPanel');

 addBtn.addEventListener('click', () => {
 const row = document.createElement('div');
 row.className = 'sn-row flex gap-3 mb-2 items-center';
 row.innerHTML = `
 <input type="text" class="form-control sn-cidr" placeholder="x.x.x.x/y" autocomplete="off" style="flex:1">
 <button class="btn btn-danger btn-sm btn-icon sn-remove" title="Remove">✕</button>`;
 container.appendChild(row);
 });

 container.addEventListener('click', (e) => {
 if (e.target.classList.contains('sn-remove')) {
 const rows = container.querySelectorAll('.sn-row');
 if (rows.length > 2) e.target.closest('.sn-row').remove();
 else showToast('At least two CIDRs are required', 'danger');
 }
 });

 helpToggle.addEventListener('click', () => {
 helpPanel.classList.toggle('hidden');
 helpToggle.textContent = helpPanel.classList.contains('hidden') ? 'Help' : 'Hide Help';
 });

 calcBtn.addEventListener('click', () => {
 const resultsDiv = document.getElementById('snResults');
 const mode = document.querySelector('input[name="mode"]:checked').value;
 const inputs = [...document.querySelectorAll('.sn-cidr')].map(i => i.value.trim()).filter(Boolean);

 if (inputs.length < 2 && mode === 'supernet') {
 resultsDiv.innerHTML = '<div class="alert alert-warning">Enter at least two CIDR blocks.</div>';
 return;
 }

 try {
 if (mode === 'supernet') {
 const result = calculateSupernet(inputs);
 resultsDiv.innerHTML = `
 <div class="card">
 <div class="card-header">Supernet Result</div>
 <div class="result-panel">
 <div class="result-row">
 <span class="result-label">Supernet CIDR</span>
 <div class="flex items-center gap-2">
 <span class="result-value">${result.cidr}</span>
 <button class="btn btn-sm btn-outline-secondary" onclick="copyToClipboard('${result.cidr}', this)">Copy</button>
 </div>
 </div>
 <div class="result-row">
 <span class="result-label">Subnet Mask</span>
 <span class="result-value">${result.mask}</span>
 </div>
 <div class="result-row">
 <span class="result-label">First Host</span>
 <span class="result-value">${result.firstHost}</span>
 </div>
 <div class="result-row">
 <span class="result-label">Last Host</span>
 <span class="result-value">${result.lastHost}</span>
 </div>
 </div>
 </div>`;
 } else {
 const aggregated = aggregateCIDR(inputs);
 resultsDiv.innerHTML = `
 <div class="card">
 <div class="card-header">Aggregation Result (${aggregated.length} block${aggregated.length > 1 ? 's' : ''})</div>
 <div class="result-panel">
 ${aggregated.map(cidr => `
 <div class="result-row">
 <span class="result-value">${cidr}</span>
 <button class="btn btn-sm btn-outline-secondary" onclick="copyToClipboard('${cidr}', this)">Copy</button>
 </div>`).join('')}
 </div>
 </div>`;
 }
 } catch (err) {
 resultsDiv.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
 }
 });
}
