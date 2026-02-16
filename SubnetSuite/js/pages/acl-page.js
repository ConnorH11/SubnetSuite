import { generateACL } from '../generators/acl.js';
import { copyToClipboard } from '../utils.js';

export function render() {
 return `
<div class="container mt-4">
 <div class="page-header">
 <h1>ACL Generator</h1>
 <p>Generate access control lists for Cisco and Juniper network devices.</p>
 </div>

 <div class="card mb-4">
 <div class="card-body">
 <div class="flex gap-4" style="flex-wrap:wrap;">
 <div class="form-group" style="flex:1; min-width:150px;">
 <label class="form-label">Vendor</label>
 <select id="aclVendor" class="form-select">
 <option value="cisco">Cisco</option>
 <option value="juniper">Juniper</option>
 </select>
 </div>
 <div class="form-group" style="flex:1; min-width:150px;">
 <label class="form-label">ACL Type</label>
 <select id="aclType" class="form-select">
 <option value="extended">Extended</option>
 <option value="standard">Standard</option>
 </select>
 </div>
 <div class="form-group" style="flex:1; min-width:120px;">
 <label class="form-label">Action</label>
 <select id="aclAction" class="form-select">
 <option value="permit">Permit</option>
 <option value="deny">Deny</option>
 </select>
 </div>
 <div class="form-group" style="flex:1; min-width:120px;">
 <label class="form-label">Protocol</label>
 <select id="aclProtocol" class="form-select">
 <option value="ip">IP</option>
 <option value="tcp">TCP</option>
 <option value="udp">UDP</option>
 <option value="icmp">ICMP</option>
 <option value="any">Any</option>
 </select>
 </div>
 </div>

 <div class="flex gap-4" style="flex-wrap:wrap;">
 <div class="form-group" style="flex:2; min-width:180px;">
 <label class="form-label">Source IP</label>
 <input type="text" id="aclSourceIp" class="form-control" placeholder="192.168.1.0" autocomplete="off">
 </div>
 <div class="form-group" style="flex:1; min-width:100px;">
 <label class="form-label">Source CIDR</label>
 <input type="text" id="aclSourceCidr" class="form-control" placeholder="/24" autocomplete="off">
 </div>
 <div class="form-group port-field" style="flex:1; min-width:100px;">
 <label class="form-label">Source Port</label>
 <input type="text" id="aclSourcePort" class="form-control" placeholder="Optional" autocomplete="off">
 </div>
 </div>

 <div class="flex gap-4" style="flex-wrap:wrap;">
 <div class="form-group" style="flex:2; min-width:180px;">
 <label class="form-label">Destination IP</label>
 <input type="text" id="aclDestIp" class="form-control" placeholder="10.0.0.0" autocomplete="off">
 </div>
 <div class="form-group" style="flex:1; min-width:100px;">
 <label class="form-label">Dest CIDR</label>
 <input type="text" id="aclDestCidr" class="form-control" placeholder="/8" autocomplete="off">
 </div>
 <div class="form-group port-field" style="flex:1; min-width:100px;">
 <label class="form-label">Dest Port</label>
 <input type="text" id="aclDestPort" class="form-control" placeholder="Optional" autocomplete="off">
 </div>
 </div>

 <button id="aclGenBtn" class="btn btn-primary mt-2">Generate ACL</button>
 <button class="btn btn-outline-secondary btn-sm ms-2" id="helpToggle">Help</button>

 </div>
 </div>

 <div id="helpPanel" class="help-panel hidden">
 <strong>How to use:</strong>
 <ul>
 <li>Select vendor, ACL type, action, and protocol</li>
 <li>Enter source and destination IP addresses with CIDR prefixes</li>
 <li>Optionally specify source/destination ports (TCP/UDP only)</li>
 <li>Click <strong>Generate ACL</strong> to create the configuration</li>
 </ul>
 </div>

 <div id="aclOutput" class="hidden">
 <div class="card">
 <div class="card-header flex justify-between items-center">
 <span>Generated ACL</span>
 <button class="btn btn-sm btn-outline-secondary" id="aclCopyBtn">Copy</button>
 </div>
 <div class="card-body">
 <textarea id="aclText" class="output-area" readonly></textarea>
 </div>
 </div>
 </div>
</div>`;
}

export function init() {
 const genBtn = document.getElementById('aclGenBtn');
 const helpToggle = document.getElementById('helpToggle');
 const helpPanel = document.getElementById('helpPanel');
 const protocolSelect = document.getElementById('aclProtocol');

 helpToggle.addEventListener('click', () => {
 helpPanel.classList.toggle('hidden');
 helpToggle.textContent = helpPanel.classList.contains('hidden') ? 'Help' : 'Hide Help';
 });

 // Toggle port inputs based on protocol
 const togglePorts = () => {
 const protocol = protocolSelect.value;
 const disable = protocol === 'ip' || protocol === 'icmp' || protocol === 'any';
 document.querySelectorAll('.port-field input').forEach(input => {
 input.disabled = disable;
 if (disable) input.value = '';
 });
 };
 protocolSelect.addEventListener('change', togglePorts);
 togglePorts();

 // Generate
 genBtn.addEventListener('click', () => {
 const outputDiv = document.getElementById('aclOutput');
 const textarea = document.getElementById('aclText');

 try {
 const result = generateACL({
 vendor: document.getElementById('aclVendor').value,
 type: document.getElementById('aclType').value,
 action: document.getElementById('aclAction').value,
 protocol: protocolSelect.value,
 sourceIp: document.getElementById('aclSourceIp').value.trim(),
 sourceCidr: document.getElementById('aclSourceCidr').value.trim(),
 destIp: document.getElementById('aclDestIp').value.trim(),
 destCidr: document.getElementById('aclDestCidr').value.trim(),
 sourcePort: document.getElementById('aclSourcePort').value.trim(),
 destPort: document.getElementById('aclDestPort').value.trim(),
 });

 textarea.value = result;
 outputDiv.classList.remove('hidden');
 } catch (err) {
 textarea.value = `Error: ${err.message}`;
 outputDiv.classList.remove('hidden');
 }
 });

 // Copy
 document.getElementById('aclCopyBtn').addEventListener('click', function () {
 const text = document.getElementById('aclText').value;
 copyToClipboard(text, this);
 });
}
