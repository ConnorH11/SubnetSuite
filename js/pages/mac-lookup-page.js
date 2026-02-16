import { copyToClipboard, showToast } from '../utils.js';

export function render() {
 return `
<div class="container mt-4">
 <div class="page-header">
 <h1>MAC Address Lookup</h1>
 <p>Look up the vendor or manufacturer associated with any MAC address OUI.</p>
 </div>

 <div class="card mb-4">
 <div class="card-body">
 <div class="form-group">
 <label class="form-label" for="macInput">MAC Address</label>
 <input type="text" id="macInput" class="form-control text-mono" placeholder="AA:BB:CC:DD:EE:FF" autocomplete="off">
 <div class="form-hint">Supports formats: AA:BB:CC:DD:EE:FF, AABB.CCDD.EEFF, AA-BB-CC-DD-EE-FF</div>
 </div>
 <button id="macLookupBtn" class="btn btn-primary">Look Up</button>
 <button class="btn btn-outline-secondary btn-sm ms-2" id="helpToggle">Help</button>

 </div>
 </div>

 <div id="helpPanel" class="help-panel hidden">
 <strong>How to use:</strong>
 <ul>
 <li>Enter a full or partial MAC address (at least 6 hex characters for OUI)</li>
 <li>Click <strong>Look Up</strong> to query the vendor database</li>
 <li>Results include the company name and address if available</li>
 </ul>
 <p class="mt-2"><em>Uses the maclookup.app API. Results may be limited by API availability.</em></p>
 </div>

 <div id="macResults"></div>
</div>`;
}

export function init() {
 const lookupBtn = document.getElementById('macLookupBtn');
 const macInput = document.getElementById('macInput');
 const helpToggle = document.getElementById('helpToggle');
 const helpPanel = document.getElementById('helpPanel');

 helpToggle.addEventListener('click', () => {
 helpPanel.classList.toggle('hidden');
 helpToggle.textContent = helpPanel.classList.contains('hidden') ? 'Help' : 'Hide Help';
 });

 lookupBtn.addEventListener('click', doLookup);
 macInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLookup(); });

 function doLookup() {
 const raw = macInput.value.trim();
 const resultsDiv = document.getElementById('macResults');

 if (!raw) {
 resultsDiv.innerHTML = '<div class="alert alert-warning">Please enter a MAC address.</div>';
 return;
 }

 // Normalize: remove all separators
 const cleaned = raw.replace(/[:\-\.]/g, '').toLowerCase();
 if (!/^[0-9a-f]{6,12}$/.test(cleaned)) {
 resultsDiv.innerHTML = '<div class="alert alert-danger">Invalid MAC address format.</div>';
 return;
 }

 resultsDiv.innerHTML = '<div class="card"><div class="card-body text-center"><p class="text-muted">Looking up vendor...</p></div></div>';

 fetch(`https://api.maclookup.app/v2/macs/${cleaned}`)
 .then(r => {
 if (!r.ok) throw new Error(`API returned ${r.status}`);
 return r.json();
 })
 .then(data => {
 if (!data.found || !data.company) {
 resultsDiv.innerHTML = '<div class="alert alert-info">No vendor found for this MAC address.</div>';
 return;
 }
 resultsDiv.innerHTML = `
 <div class="card">
 <div class="card-header">Vendor Information</div>
 <div class="result-panel">
 <div class="result-row">
 <span class="result-label">MAC Address</span>
 <span class="result-value">${raw}</span>
 </div>
 <div class="result-row">
 <span class="result-label">Company</span>
 <div class="flex items-center gap-2">
 <span class="result-value">${data.company}</span>
 <button class="btn btn-sm btn-outline-secondary" onclick="copyToClipboard('${data.company}', this)">Copy</button>
 </div>
 </div>
 ${data.address ? `
 <div class="result-row">
 <span class="result-label">Address</span>
 <span class="result-value">${data.address}</span>
 </div>` : ''}
 ${data.country ? `
 <div class="result-row">
 <span class="result-label">Country</span>
 <span class="result-value">${data.country}</span>
 </div>` : ''}
 </div>
 </div>`;
 })
 .catch(err => {
 resultsDiv.innerHTML = `<div class="alert alert-danger">Failed to look up MAC address. The API may be unavailable or blocking browser requests. Error: ${err.message}</div>`;
 });
 }
}
