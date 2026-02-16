export function render() {
  return `
<div class="mt-5">
  <div class="text-center mb-5">
    <h1 style="font-size:3rem; font-weight:700; letter-spacing:-0.02em;">Subnet Suite</h1>
    <p class="lead text-muted">The ultimate tool for all your subnetting needs.</p>
  </div>

  <h4 class="mt-5 mb-3">Calculators</h4>
  <div class="row">
    ${card('IPv4 Subnet Calculator', 'Calculate network information for an IP address and subnet mask.', '#/subnet')}
    ${card('VLSM Calculator', 'Perform Variable Length Subnet Masking for efficient subnet allocation.', '#/vlsm')}
    ${card('Supernetting Tool', 'Combine multiple subnets into a larger network.', '#/supernet')}
    ${card('IPv6 Subnetting', 'Calculate network information based on IPv6 addresses and subnet masks.', '#/ipv6')}
    ${card('Binary Calculator', 'Add and subtract binary.', '#/binary')}
    ${card('Subnet Cheat Sheet', 'Full CIDR reference table with masks, wildcards, and host counts.', '#/cheatsheet')}
    ${card('CIDR Overlap Checker', 'Detect overlapping or conflicting IP address ranges.', '#/overlap')}
    ${card('Bandwidth Calculator', 'Transfer time estimates, unit conversion, and capacity planning.', '#/bandwidth')}
  </div>

  <h4 class="mt-5 mb-3">Tools</h4>
  <div class="row">
    ${card('Network Visualizer', 'Create graphical representations of your subnetted networks.', '#/visualizer')}
    ${card('Binary, Hex, and Decimal Converter', 'Convert Binary, Hexadecimal, and Decimal numbers.', '#/converter')}
    ${card('Public IP &amp; Privacy Check', 'View your public IP, ISP, and check for WebRTC leaks.', '#/publicip')}
    ${card('MAC Vendor Lookup', 'Identify the manufacturer of a network device by MAC address.', '#/maclookup')}
    ${card('Packet Header Visualizer', 'Interactive bit-level diagrams of common protocol headers.', '#/headers')}
    ${card('Port Reference', 'Searchable table of well-known TCP/UDP ports and their services.', '#/ports')}
  </div>

  <h4 class="mt-5 mb-3">Generators</h4>
  <div class="row">
    ${card('ACL Generator', 'Generate Cisco and Juniper ACLs.', '#/acl')}
    ${card('Route Generator', 'Generate Cisco and Juniper routing configurations.', '#/route')}
  </div>
</div>`;
}

function card(title, desc, href) {
  return `
    <div class="col-md-4 mb-4">
      <a href="${href}" class="card h-100 shadow-sm tool-card text-decoration-none">
        <div class="card-body text-center">
          <h5 class="card-title">${title}</h5>
          <p class="card-text text-muted">${desc}</p>
        </div>
      </a>
    </div>`;
}

export function init() { }
