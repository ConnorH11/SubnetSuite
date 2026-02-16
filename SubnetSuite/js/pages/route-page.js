import { generateRoute } from '../generators/route.js';
import { copyToClipboard } from '../utils.js';

export function render() {
 return `
<div class="container mt-4">
 <div class="page-header">
 <h1>Route Generator</h1>
 <p>Generate routing configurations for Cisco and Juniper devices.</p>
 </div>

 <div class="card mb-4">
 <div class="card-body">
 <div class="flex gap-4" style="flex-wrap:wrap;">
 <div class="form-group" style="flex:1; min-width:150px;">
 <label class="form-label">Vendor</label>
 <select id="routeVendor" class="form-select">
 <option value="cisco">Cisco</option>
 <option value="juniper">Juniper</option>
 </select>
 </div>
 <div class="form-group" style="flex:1; min-width:150px;">
 <label class="form-label">Protocol</label>
 <select id="routeProtocol" class="form-select">
 <option value="static">Static Route</option>
 <option value="ospf">OSPF</option>
 <option value="bgp">BGP</option>
 <option value="rip">RIP</option>
 <option value="eigrp">EIGRP</option>
 </select>
 </div>
 </div>

 <!-- Static fields -->
 <div id="staticFields" class="protocol-fields">
 <div class="flex gap-4" style="flex-wrap:wrap;">
 <div class="form-group" style="flex:1; min-width:160px;">
 <label class="form-label">Destination IP</label>
 <input type="text" id="staticDestIp" class="form-control" placeholder="10.0.0.0" autocomplete="off">
 </div>
 <div class="form-group" style="flex:1; min-width:160px;">
 <label class="form-label">Mask / CIDR</label>
 <input type="text" id="staticMask" class="form-control" placeholder="255.255.255.0 or /24" autocomplete="off">
 </div>
 <div class="form-group" style="flex:1; min-width:160px;">
 <label class="form-label">Next Hop</label>
 <input type="text" id="staticNextHop" class="form-control" placeholder="192.168.1.1" autocomplete="off">
 </div>
 </div>
 </div>

 <!-- OSPF fields -->
 <div id="ospfFields" class="protocol-fields hidden">
 <div class="flex gap-4" style="flex-wrap:wrap;">
 <div class="form-group" style="flex:1;min-width:120px;">
 <label class="form-label">Process ID</label>
 <input type="text" id="ospfProcessId" class="form-control" placeholder="1" autocomplete="off">
 </div>
 <div class="form-group" style="flex:1;min-width:120px;">
 <label class="form-label">Area</label>
 <input type="text" id="ospfArea" class="form-control" placeholder="0" autocomplete="off">
 </div>
 <div class="form-group" style="flex:1;min-width:160px;">
 <label class="form-label">Network</label>
 <input type="text" id="ospfNetwork" class="form-control" placeholder="10.0.0.0" autocomplete="off">
 </div>
 <div class="form-group" style="flex:1;min-width:160px;">
 <label class="form-label">Wildcard</label>
 <input type="text" id="ospfWildcard" class="form-control" placeholder="0.0.0.255" autocomplete="off">
 </div>
 </div>
 </div>

 <!-- BGP fields -->
 <div id="bgpFields" class="protocol-fields hidden">
 <div class="flex gap-4" style="flex-wrap:wrap;">
 <div class="form-group" style="flex:1;min-width:120px;">
 <label class="form-label">Local AS Number</label>
 <input type="text" id="bgpAsn" class="form-control" placeholder="65001" autocomplete="off">
 </div>
 <div class="form-group" style="flex:1;min-width:160px;">
 <label class="form-label">Neighbor IP</label>
 <input type="text" id="bgpNeighborIp" class="form-control" placeholder="10.0.0.2" autocomplete="off">
 </div>
 <div class="form-group" style="flex:1;min-width:120px;">
 <label class="form-label">Remote AS</label>
 <input type="text" id="bgpRemoteAs" class="form-control" placeholder="65002" autocomplete="off">
 </div>
 <div class="form-group" style="flex:1;min-width:160px;">
 <label class="form-label">Router ID (optional)</label>
 <input type="text" id="bgpRouterId" class="form-control" placeholder="1.1.1.1" autocomplete="off">
 </div>
 </div>
 </div>

 <!-- RIP fields -->
 <div id="ripFields" class="protocol-fields hidden">
 <div class="flex gap-4" style="flex-wrap:wrap;">
 <div class="form-group" style="flex:1;min-width:120px;">
 <label class="form-label">Version</label>
 <select id="ripVersion" class="form-select">
 <option value="2">Version 2</option>
 <option value="1">Version 1</option>
 </select>
 </div>
 <div class="form-group" style="flex:2;min-width:200px;">
 <label class="form-label">Network</label>
 <input type="text" id="ripNetwork" class="form-control" placeholder="10.0.0.0" autocomplete="off">
 </div>
 </div>
 </div>

 <!-- EIGRP fields -->
 <div id="eigrpFields" class="protocol-fields hidden">
 <div class="flex gap-4" style="flex-wrap:wrap;">
 <div class="form-group" style="flex:1;min-width:120px;">
 <label class="form-label">AS Number</label>
 <input type="text" id="eigrpAsn" class="form-control" placeholder="100" autocomplete="off">
 </div>
 <div class="form-group" style="flex:1;min-width:200px;">
 <label class="form-label">Network</label>
 <input type="text" id="eigrpNetwork" class="form-control" placeholder="10.0.0.0" autocomplete="off">
 </div>
 <div class="form-group" style="flex:1;min-width:160px;">
 <label class="form-label">Wildcard (optional)</label>
 <input type="text" id="eigrpWildcard" class="form-control" placeholder="0.0.0.255" autocomplete="off">
 </div>
 </div>
 </div>

 <button id="routeGenBtn" class="btn btn-primary mt-4">Generate Route</button>
 <button class="btn btn-outline-secondary btn-sm ms-2" id="helpToggle">Help</button>

 </div>
 </div>

 <div id="helpPanel" class="help-panel hidden">
 <strong>Supported protocols:</strong> Static, OSPF, BGP, RIP, EIGRP<br>
 <strong>Note:</strong> EIGRP is Cisco-proprietary and not supported on Juniper.
 </div>

 <div id="routeOutput" class="hidden">
 <div class="card">
 <div class="card-header flex justify-between items-center">
 <span>Generated Configuration</span>
 <button class="btn btn-sm btn-outline-secondary" id="routeCopyBtn">Copy</button>
 </div>
 <div class="card-body">
 <textarea id="routeText" class="output-area" readonly></textarea>
 </div>
 </div>
 </div>
</div>`;
}

export function init() {
 const protocolSelect = document.getElementById('routeProtocol');
 const genBtn = document.getElementById('routeGenBtn');
 const helpToggle = document.getElementById('helpToggle');
 const helpPanel = document.getElementById('helpPanel');

 helpToggle.addEventListener('click', () => {
 helpPanel.classList.toggle('hidden');
 helpToggle.textContent = helpPanel.classList.contains('hidden') ? 'Help' : 'Hide Help';
 });

 // Toggle protocol fields
 const toggleFields = () => {
 document.querySelectorAll('.protocol-fields').forEach(el => el.classList.add('hidden'));
 const protocol = protocolSelect.value;
 const fieldId = protocol + 'Fields';
 const el = document.getElementById(fieldId);
 if (el) el.classList.remove('hidden');
 };
 protocolSelect.addEventListener('change', toggleFields);
 toggleFields();

 // Generate
 genBtn.addEventListener('click', () => {
 const protocol = protocolSelect.value;
 const vendor = document.getElementById('routeVendor').value;
 const outputDiv = document.getElementById('routeOutput');
 const textarea = document.getElementById('routeText');

 const params = { vendor, protocol };

 // Collect fields based on protocol
 if (protocol === 'static') {
 params.destIp = document.getElementById('staticDestIp').value.trim();
 params.mask = document.getElementById('staticMask').value.trim();
 params.nextHop = document.getElementById('staticNextHop').value.trim();
 } else if (protocol === 'ospf') {
 params.processId = document.getElementById('ospfProcessId').value.trim();
 params.area = document.getElementById('ospfArea').value.trim();
 params.network = document.getElementById('ospfNetwork').value.trim();
 params.wildcard = document.getElementById('ospfWildcard').value.trim();
 } else if (protocol === 'bgp') {
 params.asn = document.getElementById('bgpAsn').value.trim();
 params.neighbor = document.getElementById('bgpNeighborIp').value.trim();
 params.remoteAs = document.getElementById('bgpRemoteAs').value.trim();
 params.routerId = document.getElementById('bgpRouterId').value.trim();
 } else if (protocol === 'rip') {
 params.ripVersion = document.getElementById('ripVersion').value;
 params.network = document.getElementById('ripNetwork').value.trim();
 } else if (protocol === 'eigrp') {
 params.asn = document.getElementById('eigrpAsn').value.trim();
 params.network = document.getElementById('eigrpNetwork').value.trim();
 params.wildcard = document.getElementById('eigrpWildcard').value.trim();
 }

 try {
 const result = generateRoute(params);
 textarea.value = result;
 outputDiv.classList.remove('hidden');
 } catch (err) {
 textarea.value = `Error: ${err.message}`;
 outputDiv.classList.remove('hidden');
 }
 });

 // Copy
 document.getElementById('routeCopyBtn').addEventListener('click', function () {
 copyToClipboard(document.getElementById('routeText').value, this);
 });
}
