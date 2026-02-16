import { calculateIPv6 } from '../calculators/ipv6.js';
import { copyToClipboard } from '../utils.js';

export function render() {
 return `
<div class="container mt-4">
 <div class="page-header">
 <h1>IPv6 Calculator</h1>
 <p>Expand, compress, and subnet IPv6 addresses.</p>
 </div>

 <div class="card mb-4">
 <div class="card-body">
 <div class="form-group">
 <label class="form-label" for="ipv6Input">IPv6 Address with Prefix</label>
 <input type="text" id="ipv6Input" class="form-control" placeholder="2001:db8::/48" autocomplete="off">
 </div>
 <div class="form-group">
 <label class="form-label" for="ipv6Subnets">Number of Subnets (optional)</label>
 <input type="number" id="ipv6Subnets" class="form-control" placeholder="4" min="1" style="max-width:200px;">
 </div>
 <button id="ipv6CalcBtn" class="btn btn-primary">Calculate</button>
 <button class="btn btn-outline-secondary btn-sm ms-2" id="helpToggle">Help</button>

 </div>
 </div>

 <div id="helpPanel" class="help-panel hidden">
 <strong>How to use:</strong>
 <ul>
 <li>Enter an IPv6 address with a prefix (e.g., <code>2001:db8::/48</code>)</li>
 <li>Optionally specify the number of subnets to create</li>
 <li>View the expanded form, compressed form, and address range</li>
 </ul>
 </div>

 <div id="ipv6Results"></div>
</div>`;
}

export function init() {
 const calcBtn = document.getElementById('ipv6CalcBtn');
 const helpToggle = document.getElementById('helpToggle');
 const helpPanel = document.getElementById('helpPanel');

 helpToggle.addEventListener('click', () => {
 helpPanel.classList.toggle('hidden');
 helpToggle.textContent = helpPanel.classList.contains('hidden') ? 'Help' : 'Hide Help';
 });

 calcBtn.addEventListener('click', () => {
 const input = document.getElementById('ipv6Input').value.trim();
 const subnetCount = parseInt(document.getElementById('ipv6Subnets').value, 10);
 const resultsDiv = document.getElementById('ipv6Results');

 if (!input) {
 resultsDiv.innerHTML = '<div class="alert alert-warning">Please enter an IPv6 address with prefix.</div>';
 return;
 }

 try {
 const result = calculateIPv6(input, subnetCount);

 let html = `
 <div class="card mb-4">
 <div class="card-header">IPv6 Details</div>
 <div class="result-panel">
 <div class="result-row">
 <span class="result-label">Expanded</span>
 <div class="flex items-center gap-2">
 <span class="result-value">${result.expanded}</span>
 <button class="btn btn-sm btn-outline-secondary" onclick="copyToClipboard('${result.expanded}', this)">Copy</button>
 </div>
 </div>
 <div class="result-row">
 <span class="result-label">Compressed</span>
 <div class="flex items-center gap-2">
 <span class="result-value">${result.compressed}</span>
 <button class="btn btn-sm btn-outline-secondary" onclick="copyToClipboard('${result.compressed}', this)">Copy</button>
 </div>
 </div>
 <div class="result-row">
 <span class="result-label">Prefix Length</span>
 <span class="result-value">/${result.prefix}</span>
 </div>
 <div class="result-row">
 <span class="result-label">Range Start</span>
 <span class="result-value">${result.rangeStart}</span>
 </div>
 <div class="result-row">
 <span class="result-label">Range End</span>
 <span class="result-value">${result.rangeEnd}</span>
 </div>
 </div>
 </div>`;

 if (result.subnetError) {
 html += `<div class="alert alert-danger">${result.subnetError}</div>`;
 } else if (result.subnets && result.subnets.length > 0) {
 html += `
 <div class="card">
 <div class="card-header">Subnets (/${result.newPrefix})</div>
 <div class="table-responsive">
 <table class="table table-striped">
 <thead><tr><th>#</th><th>Subnet</th></tr></thead>
 <tbody>
 ${result.subnets.map((s, i) => `
 <tr>
 <td>${i + 1}</td>
 <td class="text-mono">${s.cidr}</td>
 </tr>`).join('')}
 </tbody>
 </table>
 </div>
 </div>`;
 }

 resultsDiv.innerHTML = html;
 } catch (err) {
 resultsDiv.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
 }
 });

 document.getElementById('ipv6Input').addEventListener('keydown', (e) => {
 if (e.key === 'Enter') calcBtn.click();
 });
}
