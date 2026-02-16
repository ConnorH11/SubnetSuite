import { calculateSubnet } from '../calculators/subnet.js';
import { validateIPv4, validateCIDR, attachValidation, copyToClipboard, showToast } from '../utils.js';

export function render() {
 return `
<div class="container mt-4">
 <div class="page-header">
 <h1>IPv4 Subnet Calculator</h1>
 <p>Calculate detailed subnet information from any IPv4 address and CIDR prefix or subnet mask.</p>
 </div>

 <div class="card mb-4">
 <div class="card-body">
 <div class="flex gap-4" style="flex-wrap:wrap;">
 <div class="form-group" style="flex:2; min-width:200px;">
 <label class="form-label" for="subnetIp">IP Address</label>
 <input type="text" id="subnetIp" class="form-control" placeholder="192.168.1.0" autocomplete="off">
 </div>
 <div class="form-group" style="flex:1; min-width:120px;">
 <label class="form-label" for="subnetCidr">CIDR / Mask</label>
 <input type="text" id="subnetCidr" class="form-control" placeholder="/24" autocomplete="off">
 </div>
 <div style="display:flex; align-items:flex-end; padding-bottom:16px;">
 <button id="subnetCalcBtn" class="btn btn-primary">Calculate</button>
 </div>
 </div>
 <button class="btn btn-outline-secondary btn-sm ms-2" id="helpToggle">Help</button>

 </div>
 </div>

 <div id="helpPanel" class="help-panel hidden">
 <strong>How to use:</strong>
 <ul>
 <li>Enter any valid IPv4 address (e.g., <code>192.168.1.100</code>)</li>
 <li>Enter a CIDR prefix (<code>/24</code> or <code>24</code>) or a subnet mask (<code>255.255.255.0</code>)</li>
 <li>Click <strong>Calculate</strong> or press <strong>Enter</strong></li>
 </ul>
 <p class="mt-2">Results include network address, broadcast, usable host range, wildcard mask, binary representations, and IP class.</p>
 </div>

 <div id="subnetResults"></div>

 <div id="subnetHistory" class="history-panel hidden">
 <h4>Recent Calculations</h4>
 <div id="historyList"></div>
 </div>
</div>`;
}

export function init() {
 const ipInput = document.getElementById('subnetIp');
 const cidrInput = document.getElementById('subnetCidr');
 const calcBtn = document.getElementById('subnetCalcBtn');
 const resultsDiv = document.getElementById('subnetResults');
 const helpToggle = document.getElementById('helpToggle');
 const helpPanel = document.getElementById('helpPanel');

 // Validation
 attachValidation(ipInput, validateIPv4);
 attachValidation(cidrInput, validateCIDR);

 // Help toggle
 helpToggle.addEventListener('click', () => {
 helpPanel.classList.toggle('hidden');
 helpToggle.textContent = helpPanel.classList.contains('hidden') ? 'Help' : 'Hide Help';
 });

 // Calculate
 function doCalculate() {
 const ip = ipInput.value.trim();
 const cidr = cidrInput.value.trim();

 if (!ip || !cidr) {
 resultsDiv.innerHTML = '<div class="alert alert-warning">Please enter an IP address and CIDR prefix.</div>';
 return;
 }

 if (!validateIPv4(ip)) {
 resultsDiv.innerHTML = '<div class="alert alert-danger">Invalid IPv4 address.</div>';
 return;
 }

 if (!validateCIDR(cidr)) {
 resultsDiv.innerHTML = '<div class="alert alert-danger">Invalid CIDR prefix or subnet mask.</div>';
 return;
 }

 try {
 const result = calculateSubnet(ip, cidr);
 renderResults(result, resultsDiv);
 saveHistory(ip, cidr);
 } catch (err) {
 resultsDiv.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
 }
 }

 calcBtn.addEventListener('click', doCalculate);

 // Enter key
 [ipInput, cidrInput].forEach(el => {
 el.addEventListener('keydown', (e) => {
 if (e.key === 'Enter') doCalculate();
 });
 });

 // Load history
 loadHistory();
}

function renderResults(r, container) {
 const rows = [
 ['Network Address', r.networkAddress],
 ['CIDR Notation', r.cidrNotation],
 ['Subnet Mask', r.subnetMask],
 ['Wildcard Mask', r.wildcardMask],
 ['Broadcast Address', r.broadcastAddress],
 ['First Usable Host', r.firstHost],
 ['Last Usable Host', r.lastHost],
 ['Total Usable Hosts', r.totalHosts.toLocaleString()],
 ['IP Class', r.ipClass],
 ['IP Binary', r.ipBinary],
 ['Mask Binary', r.maskBinary],
 ['Network Binary', r.networkBinary],
 ];

 const copyAllText = rows.map(([label, val]) => `${label}: ${val}`).join('\n');

 container.innerHTML = `
 <div class="card">
 <div class="card-header flex justify-between items-center">
 <span>Results</span>
 <button class="btn btn-sm btn-outline-secondary" id="copyAllBtn">Copy All</button>
 </div>
 <div class="result-panel">
 ${rows.map(([label, value]) => `
 <div class="result-row">
 <span class="result-label">${label}</span>
 <div class="flex items-center gap-2">
 <span class="result-value">${value}</span>
 <button class="btn btn-sm btn-outline-secondary copy-btn" data-copy="${escapeAttr(String(value))}">Copy</button>
 </div>
 </div>`).join('')}
 </div>
 </div>`;

 // Copy all
 document.getElementById('copyAllBtn').addEventListener('click', function () {
 copyToClipboard(copyAllText, this);
 });

 // Individual copy
 container.querySelectorAll('.copy-btn').forEach(btn => {
 btn.addEventListener('click', function () {
 copyToClipboard(this.dataset.copy, this);
 });
 });
}

function escapeAttr(str) {
 return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const HISTORY_KEY = 'subnetsuite-subnet-history';
const MAX_HISTORY = 10;

function saveHistory(ip, cidr) {
 let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
 const entry = { ip, cidr, time: Date.now() };
 history = [entry, ...history.filter(h => h.ip !== ip || h.cidr !== cidr)].slice(0, MAX_HISTORY);
 localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
 loadHistory();
}

function loadHistory() {
 const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
 const panel = document.getElementById('subnetHistory');
 const list = document.getElementById('historyList');
 if (!panel || !list) return;

 if (history.length === 0) {
 panel.classList.add('hidden');
 return;
 }

 panel.classList.remove('hidden');
 list.innerHTML = history.map(h => {
 const date = new Date(h.time).toLocaleString();
 const cidr = h.cidr.startsWith('/') ? h.cidr : `/${h.cidr}`;
 return `<div class="history-item" data-ip="${h.ip}" data-cidr="${h.cidr}">
 <span>${h.ip}${cidr}</span>
 <span class="timestamp">${date}</span>
 </div>`;
 }).join('');

 // Click to re-calculate
 list.querySelectorAll('.history-item').forEach(item => {
 item.addEventListener('click', () => {
 document.getElementById('subnetIp').value = item.dataset.ip;
 document.getElementById('subnetCidr').value = item.dataset.cidr;
 document.getElementById('subnetCalcBtn').click();
 });
 });
}
