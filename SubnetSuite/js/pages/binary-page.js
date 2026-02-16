import { copyToClipboard } from '../utils.js';

export function render() {
 return `
<div class="container mt-4">
 <div class="page-header">
 <h1>Binary Calculator</h1>
 <p>Perform binary addition and subtraction with arbitrary precision.</p>
 </div>

 <div class="card mb-4">
 <div class="card-body">
 <div class="form-group">
 <label class="form-label" for="bin1">Binary Number 1</label>
 <input type="text" id="bin1" class="form-control text-mono" placeholder="11010110" autocomplete="off">
 </div>
 <div class="form-group">
 <label class="form-label" for="bin2">Binary Number 2</label>
 <input type="text" id="bin2" class="form-control text-mono" placeholder="10101010" autocomplete="off">
 </div>
 <div class="flex gap-3">
 <button id="binAddBtn" class="btn btn-primary">➕ Add</button>
 <button id="binSubBtn" class="btn btn-secondary">➖ Subtract</button>
 </div>
 <button class="btn btn-outline-secondary btn-sm ms-2" id="helpToggle">Help</button>

 </div>
 </div>

 <div id="helpPanel" class="help-panel hidden">
 <strong>How to use:</strong>
 <ul>
 <li>Enter two binary numbers (only <code>0</code> and <code>1</code>)</li>
 <li>Click <strong>Add</strong> or <strong>Subtract</strong></li>
 <li>Results are shown in both binary and decimal</li>
 <li>Uses BigInt for arbitrary precision</li>
 </ul>
 </div>

 <div id="binResults"></div>
</div>`;
}

export function init() {
 const bin1 = document.getElementById('bin1');
 const bin2 = document.getElementById('bin2');
 const addBtn = document.getElementById('binAddBtn');
 const subBtn = document.getElementById('binSubBtn');
 const resultsDiv = document.getElementById('binResults');
 const helpToggle = document.getElementById('helpToggle');
 const helpPanel = document.getElementById('helpPanel');

 helpToggle.addEventListener('click', () => {
 helpPanel.classList.toggle('hidden');
 helpToggle.textContent = helpPanel.classList.contains('hidden') ? 'Help' : 'Hide Help';
 });

 function validateBinary(val) { return /^[01]+$/.test(val); }

 function doOp(op) {
 const v1 = bin1.value.trim();
 const v2 = bin2.value.trim();
 if (!validateBinary(v1) || !validateBinary(v2)) {
 resultsDiv.innerHTML = '<div class="alert alert-danger">Please enter valid binary numbers (0s and 1s only).</div>';
 return;
 }
 const a = BigInt('0b' + v1);
 const b = BigInt('0b' + v2);
 const result = op === 'add' ? a + b : a - b;
 const label = op === 'add' ? 'Sum' : 'Difference';
 const binaryStr = result.toString(2);
 const decimalStr = result.toString(10);

 resultsDiv.innerHTML = `
 <div class="card">
 <div class="card-header">${label}</div>
 <div class="result-panel">
 <div class="result-row">
 <span class="result-label">${label} (Binary)</span>
 <div class="flex items-center gap-2">
 <span class="result-value">${binaryStr}</span>
 <button class="btn btn-sm btn-outline-secondary" onclick="copyToClipboard('${binaryStr}', this)">Copy</button>
 </div>
 </div>
 <div class="result-row">
 <span class="result-label">${label} (Decimal)</span>
 <div class="flex items-center gap-2">
 <span class="result-value">${decimalStr}</span>
 <button class="btn btn-sm btn-outline-secondary" onclick="copyToClipboard('${decimalStr}', this)">Copy</button>
 </div>
 </div>
 </div>
 </div>`;
 }

 addBtn.addEventListener('click', () => doOp('add'));
 subBtn.addEventListener('click', () => doOp('sub'));
}
