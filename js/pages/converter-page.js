import { copyToClipboard } from '../utils.js';

export function render() {
 return `
<div class="container mt-4">
 <div class="page-header">
 <h1>Base Converter</h1>
 <p>Convert numbers between decimal, hexadecimal, and binary formats.</p>
 </div>

 <div class="card mb-4">
 <div class="card-body">
 <div class="form-group">
 <label class="form-label" for="convInput">Input Value</label>
 <input type="text" id="convInput" class="form-control text-mono" placeholder="Enter a number" autocomplete="off">
 </div>
 <div class="form-group">
 <label class="form-label">Input Format</label>
 <div class="radio-group">
 <input type="radio" name="convFormat" id="fmtDecimal" value="decimal" checked>
 <label for="fmtDecimal">Decimal</label>
 <input type="radio" name="convFormat" id="fmtBinary" value="binary">
 <label for="fmtBinary">Binary</label>
 <input type="radio" name="convFormat" id="fmtHex" value="hex">
 <label for="fmtHex">Hexadecimal</label>
 </div>
 </div>
 <button id="convBtn" class="btn btn-primary">Convert</button>
 <button class="btn btn-outline-secondary btn-sm ms-2" id="helpToggle">Help</button>

 </div>
 </div>

 <div id="helpPanel" class="help-panel hidden">
 <strong>How to use:</strong>
 <ul>
 <li>Enter a number and select its format</li>
 <li>Click <strong>Convert</strong> to see all three representations</li>
 </ul>
 </div>

 <div id="convResults"></div>
</div>`;
}

export function init() {
 const convBtn = document.getElementById('convBtn');
 const helpToggle = document.getElementById('helpToggle');
 const helpPanel = document.getElementById('helpPanel');
 const convInput = document.getElementById('convInput');

 helpToggle.addEventListener('click', () => {
 helpPanel.classList.toggle('hidden');
 helpToggle.textContent = helpPanel.classList.contains('hidden') ? 'Help' : 'Hide Help';
 });

 convBtn.addEventListener('click', doConvert);
 convInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doConvert(); });

 function doConvert() {
 const input = convInput.value.trim();
 const format = document.querySelector('input[name="convFormat"]:checked').value;
 const resultsDiv = document.getElementById('convResults');

 if (!input) {
 resultsDiv.innerHTML = '<div class="alert alert-warning">Please enter a value.</div>';
 return;
 }

 let decimalValue;
 try {
 if (format === 'binary') {
 if (!/^[01]+$/.test(input)) throw new Error('Invalid binary number.');
 decimalValue = parseInt(input, 2);
 } else if (format === 'hex') {
 if (!/^[0-9a-fA-F]+$/.test(input)) throw new Error('Invalid hexadecimal number.');
 decimalValue = parseInt(input, 16);
 } else {
 if (!/^\d+$/.test(input)) throw new Error('Invalid decimal number.');
 decimalValue = parseInt(input, 10);
 }

 const binaryResult = decimalValue.toString(2);
 const hexResult = decimalValue.toString(16).toUpperCase();

 resultsDiv.innerHTML = `
 <div class="card">
 <div class="card-header">Conversion Result</div>
 <div class="result-panel">
 <div class="result-row">
 <span class="result-label">Decimal</span>
 <div class="flex items-center gap-2">
 <span class="result-value">${decimalValue}</span>
 <button class="btn btn-sm btn-outline-secondary" onclick="copyToClipboard('${decimalValue}', this)">Copy</button>
 </div>
 </div>
 <div class="result-row">
 <span class="result-label">Binary</span>
 <div class="flex items-center gap-2">
 <span class="result-value">${binaryResult}</span>
 <button class="btn btn-sm btn-outline-secondary" onclick="copyToClipboard('${binaryResult}', this)">Copy</button>
 </div>
 </div>
 <div class="result-row">
 <span class="result-label">Hexadecimal</span>
 <div class="flex items-center gap-2">
 <span class="result-value">${hexResult}</span>
 <button class="btn btn-sm btn-outline-secondary" onclick="copyToClipboard('${hexResult}', this)">Copy</button>
 </div>
 </div>
 </div>
 </div>`;
 } catch (err) {
 resultsDiv.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
 }
 }
}
