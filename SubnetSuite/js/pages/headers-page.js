export function render() {
 return `
<div class="container mt-4">
 <div class="page-header">
 <h1>Packet Header Visualizer</h1>
 <p>Interactive bit-level diagrams of common protocol headers. Click any field for details.</p>
 </div>

 <div class="card mb-4">
 <div class="card-body">
 <label class="form-label">Protocol</label>
 <div class="flex gap-2" style="flex-wrap:wrap;">
 <button class="btn btn-primary proto-btn active" data-proto="ipv4">IPv4</button>
 <button class="btn btn-outline-secondary proto-btn" data-proto="tcp">TCP</button>
 <button class="btn btn-outline-secondary proto-btn" data-proto="udp">UDP</button>
 <button class="btn btn-outline-secondary proto-btn" data-proto="icmp">ICMP</button>
 <button class="btn btn-outline-secondary proto-btn" data-proto="ethernet">Ethernet</button>
 </div>
 </div>
 </div>

 <div class="card mb-4">
 <div class="card-header" id="headerTitle">IPv4 Header</div>
 <div class="card-body">
 <div class="bit-ruler" id="bitRuler"></div>
 <div class="header-grid" id="headerGrid"></div>
 </div>
 </div>

 <div class="card" id="fieldDetail" style="display:none;">
 <div class="card-header" id="fieldName">Select a field</div>
 <div class="result-panel" id="fieldBody"></div>
 </div>
</div>`;
}

export function init() {
 const grid = document.getElementById('headerGrid');
 const ruler = document.getElementById('bitRuler');
 const title = document.getElementById('headerTitle');
 const detailCard = document.getElementById('fieldDetail');
 const fieldName = document.getElementById('fieldName');
 const fieldBody = document.getElementById('fieldBody');

 let rulerHtml = '';
 for (let i = 0; i < 32; i++) {
 rulerHtml += `<div class="bit-num">${i}</div>`;
 }
 ruler.innerHTML = rulerHtml;

 renderProtocol('ipv4');

 document.querySelectorAll('.proto-btn').forEach(btn => {
 btn.addEventListener('click', () => {
 document.querySelectorAll('.proto-btn').forEach(b => {
 b.classList.remove('btn-primary', 'active');
 b.classList.add('btn-outline-secondary');
 });
 btn.classList.remove('btn-outline-secondary');
 btn.classList.add('btn-primary', 'active');
 renderProtocol(btn.dataset.proto);
 detailCard.style.display = 'none';
 });
 });

 function renderProtocol(proto) {
 const spec = PROTOCOLS[proto];
 title.textContent = spec.title;

 let html = '';
 spec.fields.forEach((field, idx) => {
 const color = FIELD_COLORS[idx % FIELD_COLORS.length];
 html += `<div class="header-field"
 style="grid-column: span ${field.bits}; background:${color}; cursor:pointer;"
 data-idx="${idx}" data-proto="${proto}">
 <div class="field-label">${field.name}</div>
 <div class="field-bits">${field.bits}b</div>
 </div>`;
 });
 grid.innerHTML = html;

 grid.querySelectorAll('.header-field').forEach(el => {
 el.addEventListener('click', () => {
 const idx = parseInt(el.dataset.idx);
 const field = spec.fields[idx];
 showDetail(field, el.style.background);
 });
 });
 }

 function showDetail(field, color) {
 detailCard.style.display = '';
 fieldName.innerHTML = `<span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:${color};margin-right:8px;vertical-align:middle;"></span>${field.name}`;

 let html = `
 <div class="result-row">
 <span class="result-label">Size</span>
 <span class="result-value">${field.bits} bit${field.bits > 1 ? 's' : ''} (${field.bits >= 8 ? (field.bits / 8) + ' byte' + (field.bits / 8 > 1 ? 's' : '') : field.bits + ' bit' + (field.bits > 1 ? 's' : '')})</span>
 </div>
 <div class="result-row">
 <span class="result-label">Description</span>
 <span class="result-value">${field.desc}</span>
 </div>`;

 if (field.values) {
 html += `<div class="result-row">
 <span class="result-label">Common Values</span>
 <span class="result-value">${field.values}</span>
 </div>`;
 }

 fieldBody.innerHTML = html;
 }

 if (!document.getElementById('header-viz-styles')) {
 const style = document.createElement('style');
 style.id = 'header-viz-styles';
 style.textContent = `
 .bit-ruler {
 display: grid;
 grid-template-columns: repeat(32, 1fr);
 gap: 1px;
 margin-bottom: 2px;
 user-select: none;
 }
 .bit-num {
 text-align: center;
 font-size: 10px;
 font-family: 'Consolas', monospace;
 color: #999;
 padding: 2px 0;
 }
 .header-grid {
 display: grid;
 grid-template-columns: repeat(32, 1fr);
 gap: 2px;
 }
 .header-field {
 border-radius: 3px;
 padding: 10px 4px;
 text-align: center;
 transition: all 0.15s ease;
 min-height: 56px;
 display: flex;
 flex-direction: column;
 justify-content: center;
 align-items: center;
 border: 1px solid rgba(0,0,0,0.1);
 overflow: hidden;
 }
 .header-field:hover {
 filter: brightness(1.15);
 transform: translateY(-1px);
 box-shadow: 0 2px 8px rgba(0,0,0,0.2);
 }
 .field-label {
 font-size: 11px;
 font-weight: 700;
 color: #1a1a1a;
 line-height: 1.2;
 overflow-wrap: break-word;
 word-break: normal;
 hyphens: none;
 white-space: nowrap;
 }
 .header-field[style*="span 2"] .field-label,
 .header-field[style*="span 3"] .field-label,
 .header-field[style*="span 4"] .field-label {
 white-space: normal;
 overflow-wrap: normal;
 }
 .field-bits {
 font-size: 9px;
 color: rgba(0,0,0,0.5);
 margin-top: 2px;
 font-family: 'Consolas', monospace;
 }
 @media (max-width: 768px) {
 .header-grid { grid-template-columns: repeat(16, 1fr); }
 .bit-ruler { grid-template-columns: repeat(16, 1fr); }
 .bit-num:nth-child(n+17) { display: none; }
 .field-label { font-size: 9px; white-space: normal; }
 }
 `;
 document.head.appendChild(style);
 }
}

const FIELD_COLORS = [
 '#e8a541', '#38bdf8', '#a78bfa', '#34d399',
 '#fb923c', '#f472b6', '#60a5fa', '#fbbf24',
 '#c084fc', '#2dd4bf', '#f87171', '#a3e635',
];

const PROTOCOLS = {
 ipv4: {
 title: 'IPv4 Header (20 bytes minimum)',
 fields: [
 { name: 'Ver', bits: 4, desc: 'IP version number. Always 4 for IPv4.', values: '4' },
 { name: 'IHL', bits: 4, desc: 'Internet Header Length in 32-bit words. Minimum 5 (20 bytes).', values: '5 (no options) to 15' },
 { name: 'DSCP', bits: 6, desc: 'Differentiated Services Code Point for QoS classification.', values: '0 (default), 46 (EF), 34 (AF41)' },
 { name: 'ECN', bits: 2, desc: 'Explicit Congestion Notification. Signals congestion without dropping packets.', values: '00 (not capable), 11 (CE)' },
 { name: 'Total Len', bits: 16, desc: 'Total packet size (header + data) in bytes. Max 65,535.', values: '20 to 65535' },
 { name: 'ID', bits: 16, desc: 'Unique datagram identifier for fragment reassembly.', values: 'Set by sender' },
 { name: 'Flg', bits: 3, desc: 'Fragmentation control. Bit 1: DF (Don\'t Fragment). Bit 2: MF (More Fragments).', values: '010 (DF), 001 (MF)' },
 { name: 'Frag Offset', bits: 13, desc: 'Fragment offset relative to the original datagram, in 8-byte units.', values: '0 for unfragmented' },
 { name: 'TTL', bits: 8, desc: 'Time to Live. Decremented at each hop; packet dropped at 0.', values: '64 (Linux), 128 (Win), 255 (Cisco)' },
 { name: 'Proto', bits: 8, desc: 'Next-level protocol in the data portion.', values: '1 (ICMP), 6 (TCP), 17 (UDP), 89 (OSPF)' },
 { name: 'Checksum', bits: 16, desc: 'Header-only error check. Recomputed each hop (TTL changes).', values: 'Calculated' },
 { name: 'Source IP', bits: 32, desc: '32-bit address of the sender.', values: '192.168.1.1' },
 { name: 'Dest IP', bits: 32, desc: '32-bit address of the recipient.', values: '10.0.0.1' },
 ]
 },
 tcp: {
 title: 'TCP Header (20 bytes minimum)',
 fields: [
 { name: 'Src Port', bits: 16, desc: 'Sending application port. Ephemeral range: 49152-65535.', values: '80, 443, 22, 53' },
 { name: 'Dst Port', bits: 16, desc: 'Receiving application port.', values: '80 (HTTP), 443 (HTTPS), 22 (SSH)' },
 { name: 'Seq Number', bits: 32, desc: 'Byte offset of the first data byte in this segment.', values: 'Random ISN' },
 { name: 'Ack Number', bits: 32, desc: 'Next expected sequence number. Valid when ACK flag is set.', values: 'Peer seq + len' },
 { name: 'Off', bits: 4, desc: 'Data offset: header length in 32-bit words. Min 5.', values: '5 to 15' },
 { name: 'Rsv', bits: 3, desc: 'Reserved. Must be zero.', values: '000' },
 { name: 'Flags', bits: 9, desc: 'NS, CWR, ECE, URG, ACK, PSH, RST, SYN, FIN.', values: 'SYN, SYN-ACK, FIN-ACK' },
 { name: 'Window', bits: 16, desc: 'Receive window size in bytes for flow control.', values: '5840, 65535 (scaled)' },
 { name: 'Checksum', bits: 16, desc: 'Covers header, data, and pseudo-header (src/dst IPs).', values: 'Calculated' },
 { name: 'Urg Ptr', bits: 16, desc: 'Offset to last urgent byte. Only valid with URG flag.', values: '0 (typically)' },
 ]
 },
 udp: {
 title: 'UDP Header (8 bytes)',
 fields: [
 { name: 'Src Port', bits: 16, desc: 'Sending application port. Optional (may be 0).', values: '53, 67, 69, 161' },
 { name: 'Dst Port', bits: 16, desc: 'Receiving application port.', values: '53 (DNS), 67 (DHCP), 69 (TFTP)' },
 { name: 'Length', bits: 16, desc: 'Total UDP datagram length in bytes. Min 8 (header only).', values: '8 to 65535' },
 { name: 'Checksum', bits: 16, desc: 'Optional in IPv4 (0 = disabled), mandatory in IPv6.', values: 'Calculated or 0' },
 ]
 },
 icmp: {
 title: 'ICMP Header (8 bytes)',
 fields: [
 { name: 'Type', bits: 8, desc: 'ICMP message type.', values: '0 (Reply), 3 (Unreach), 8 (Request), 11 (TTL Exceeded)' },
 { name: 'Code', bits: 8, desc: 'Sub-type providing additional context.', values: '0 (Net), 1 (Host), 3 (Port)' },
 { name: 'Checksum', bits: 16, desc: 'Error check over entire ICMP message.', values: 'Calculated' },
 { name: 'ID', bits: 16, desc: 'Matches requests to replies. Typically the process ID.', values: 'PID' },
 { name: 'Seq', bits: 16, desc: 'Incremented per request. Detects lost replies.', values: '1, 2, 3 ...' },
 ]
 },
 ethernet: {
 title: 'Ethernet II Frame (14 bytes)',
 fields: [
 { name: 'Dest MAC', bits: 48, desc: 'Destination MAC address. Broadcast: FF:FF:FF:FF:FF:FF.', values: 'AA:BB:CC:DD:EE:FF' },
 { name: 'Src MAC', bits: 48, desc: 'Source MAC address.', values: '00:1A:2B:3C:4D:5E' },
 { name: 'EtherType', bits: 16, desc: 'Payload protocol identifier.', values: '0x0800 (IPv4), 0x86DD (IPv6), 0x0806 (ARP)' },
 ]
 }
};
