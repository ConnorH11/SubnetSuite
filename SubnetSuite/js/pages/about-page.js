export function render() {
    return `
<div class="container mt-4">
 <div class="page-header">
 <h1>About SubnetSuite</h1>
 <p>A free, open-source network toolkit built for students and professionals.</p>
 </div>

 <div class="card shadow-sm mb-4">
 <div class="card-body">
 <h3 class="mb-3">What is SubnetSuite?</h3>
 <p>SubnetSuite is a comprehensive collection of networking tools designed to make subnetting, network design, and configuration tasks fast and intuitive. Every calculation runs entirely in your browser — no data is sent to any server.</p>

 <hr>

 <h4 class="mb-3"> Features</h4>
 <ul class="text-muted" style="padding-left:20px;">
 <li class="mb-2"><strong>IPv4 Subnet Calculator</strong> — Full subnet details from any IP/CIDR</li>
 <li class="mb-2"><strong>VLSM Calculator</strong> — Efficient variable-length subnet allocation</li>
 <li class="mb-2"><strong>Supernetting / CIDR Aggregation</strong> — Combine multiple networks</li>
 <li class="mb-2"><strong>IPv6 Calculator</strong> — Expand, compress, and subnet IPv6 addresses</li>
 <li class="mb-2"><strong>ACL Generator</strong> — Cisco & Juniper access control lists</li>
 <li class="mb-2"><strong>Route Generator</strong> — Static, OSPF, BGP, RIP, EIGRP configs</li>
 <li class="mb-2"><strong>Network Visualizer</strong> — Drag-and-drop topology builder with VLSM</li>
 <li class="mb-2"><strong>Binary Calculator</strong> — Binary arithmetic with BigInt precision</li>
 <li class="mb-2"><strong>Base Converter</strong> — Decimal, hex, and binary conversion</li>
 <li class="mb-2"><strong>Public IP Check</strong> — IP detection with WebRTC leak test</li>
 <li class="mb-2"><strong>MAC Address Lookup</strong> — OUI vendor identification</li>
 </ul>

 <hr>

 <h4 class="mb-3"> Technology</h4>
 <p>Built with HTML5, CSS3, and Vanilla JavaScript — no frameworks, no build tools, no dependencies. Designed for speed, simplicity, and privacy.</p>

 <hr>

 <h4 class="mb-3"> Author</h4>
 <p>Created by <a href="https://connorhorning.com" target="_blank">Connor Horning</a> as a Capstone project. Contributions and feedback are welcome!</p>

 <hr>

 <div class="text-center mt-4">
 <a href="https://buymeacoffee.com/ez4ii6xvrk" target="_blank" class="btn btn-primary">
 ☕ Buy Me a Coffee
 </a>
 </div>
 </div>
 </div>
</div>`;
}

export function init() { }
