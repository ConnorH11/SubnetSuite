import { copyToClipboard } from '../utils.js';

export function render() {
    return `
<div class="container mt-4">
 <div class="page-header">
 <h1>Subnet Cheat Sheet</h1>
 <p>Complete IPv4 subnet reference — every CIDR prefix from /0 to /32 with mask, wildcard, and host counts.</p>
 </div>

 <div class="card mb-4">
 <div class="card-header flex justify-between items-center">
 <span>IPv4 Subnet Reference Table</span>
 <button class="btn btn-sm btn-outline-secondary" id="copyTableBtn">Copy Table</button>
 </div>
 <div style="overflow-x:auto;">
 <table class="table table-striped table-hover" id="cheatTable">
 <thead>
 <tr>
 <th>CIDR</th>
 <th>Subnet Mask</th>
 <th>Wildcard Mask</th>
 <th>Total Addresses</th>
 <th>Usable Hosts</th>
 <th>Class</th>
 </tr>
 </thead>
 <tbody id="cheatBody"></tbody>
 </table>
 </div>
 </div>

 <div class="card mb-4">
 <div class="card-header">Quick Reference — Private Ranges (RFC 1918)</div>
 <div class="result-panel">
 <div class="result-row">
 <span class="result-label">Class A Private</span>
 <span class="result-value">10.0.0.0/8 &nbsp; (10.0.0.0 – 10.255.255.255)</span>
 </div>
 <div class="result-row">
 <span class="result-label">Class B Private</span>
 <span class="result-value">172.16.0.0/12 &nbsp; (172.16.0.0 – 172.31.255.255)</span>
 </div>
 <div class="result-row">
 <span class="result-label">Class C Private</span>
 <span class="result-value">192.168.0.0/16 &nbsp; (192.168.0.0 – 192.168.255.255)</span>
 </div>
 <div class="result-row">
 <span class="result-label">Loopback</span>
 <span class="result-value">127.0.0.0/8 &nbsp; (127.0.0.1 – 127.255.255.254)</span>
 </div>
 <div class="result-row">
 <span class="result-label">Link-Local (APIPA)</span>
 <span class="result-value">169.254.0.0/16 &nbsp; (169.254.0.1 – 169.254.255.254)</span>
 </div>
 </div>
 </div>

 <div class="card">
 <div class="card-header">Common Subnet Sizes</div>
 <div class="result-panel">
 <div class="result-row">
 <span class="result-label">/30 — Point-to-Point</span>
 <span class="result-value">2 usable hosts — ideal for router-to-router links</span>
 </div>
 <div class="result-row">
 <span class="result-label">/31 — RFC 3021</span>
 <span class="result-value">2 addresses, no broadcast — for point-to-point only</span>
 </div>
 <div class="result-row">
 <span class="result-label">/32 — Host Route</span>
 <span class="result-value">Single host — used in routing tables and loopbacks</span>
 </div>
 <div class="result-row">
 <span class="result-label">/24 — Standard LAN</span>
 <span class="result-value">254 usable hosts — most common small network size</span>
 </div>
 <div class="result-row">
 <span class="result-label">/16 — Large Network</span>
 <span class="result-value">65,534 usable hosts — enterprise campus networks</span>
 </div>
 <div class="result-row">
 <span class="result-label">/8 — Very Large</span>
 <span class="result-value">16,777,214 usable hosts — ISP-scale allocations</span>
 </div>
 </div>
 </div>
</div>`;
}

export function init() {
    const tbody = document.getElementById('cheatBody');
    const rows = [];
    const textRows = [];

    for (let cidr = 0; cidr <= 32; cidr++) {
        const mask = cidr === 0 ? 0 : (0xffffffff << (32 - cidr)) >>> 0;
        const wildcard = (~mask) >>> 0;
        const totalAddresses = Math.pow(2, 32 - cidr);
        let usableHosts;
        if (cidr === 32) usableHosts = 1;
        else if (cidr === 31) usableHosts = 2;
        else if (cidr >= 1) usableHosts = totalAddresses - 2;
        else usableHosts = totalAddresses - 2;

        const maskStr = uint2ip(mask);
        const wildcardStr = uint2ip(wildcard);

        // Determine default classful note
        let classNote = '';
        if (cidr === 8) classNote = 'A';
        else if (cidr === 16) classNote = 'B';
        else if (cidr === 24) classNote = 'C';

        const highlight = (cidr === 8 || cidr === 16 || cidr === 24 || cidr === 30 || cidr === 32)
            ? ' class="highlight-row"' : '';

        rows.push(`<tr${highlight}>
 <td><strong>/${cidr}</strong></td>
 <td class="text-mono">${maskStr}</td>
 <td class="text-mono">${wildcardStr}</td>
 <td>${totalAddresses.toLocaleString()}</td>
 <td>${usableHosts.toLocaleString()}</td>
 <td>${classNote}</td>
 </tr>`);

        textRows.push(`/${cidr}\t${maskStr}\t${wildcardStr}\t${totalAddresses}\t${usableHosts}\t${classNote}`);
    }

    tbody.innerHTML = rows.join('');

    // Copy table
    document.getElementById('copyTableBtn').addEventListener('click', function () {
        const header = 'CIDR\tSubnet Mask\tWildcard Mask\tTotal Addresses\tUsable Hosts\tClass';
        const text = header + '\n' + textRows.join('\n');
        copyToClipboard(text, this);
    });
}

function uint2ip(uint) {
    return [
        (uint >>> 24) & 0xff,
        (uint >>> 16) & 0xff,
        (uint >>> 8) & 0xff,
        uint & 0xff
    ].join('.');
}
