export function generateRoute(params) {
 const { vendor, protocol } = params;

 if (vendor === 'cisco') {
 return generateCiscoRoute(protocol, params);
 } else if (vendor === 'juniper') {
 return generateJuniperRoute(protocol, params);
 }

 throw new Error('Unknown vendor.');
}

function generateCiscoRoute(protocol, p) {
 switch (protocol) {
 case 'static': {
 if (!p.destIp || !p.mask || !p.nextHop) return 'Error: Please fill in all fields.';
 let finalMask = p.mask;
 if (p.mask.startsWith('/')) finalMask = cidrToMaskLocal(p.mask.substring(1));
 return `ip route ${p.destIp} ${finalMask} ${p.nextHop}`;
 }
 case 'ospf': {
 if (!p.processId || !p.area || !p.network || !p.wildcard) return 'Error: Please fill in all fields.';
 return `router ospf ${p.processId}\n network ${p.network} ${p.wildcard} area ${p.area}`;
 }
 case 'bgp': {
 if (!p.asn || !p.neighbor || !p.remoteAs) return 'Error: Please fill in all fields.';
 let config = `router bgp ${p.asn}\n`;
 if (p.routerId) config += ` bgp router-id ${p.routerId}\n`;
 config += ` neighbor ${p.neighbor} remote-as ${p.remoteAs}`;
 return config;
 }
 case 'rip': {
 if (!p.network) return 'Error: Please enter a network.';
 return `router rip\n version ${p.ripVersion || '2'}\n network ${p.network}`;
 }
 case 'eigrp': {
 if (!p.asn || !p.network) return 'Error: Please fill in AS Number and Network.';
 let config = `router eigrp ${p.asn}\n`;
 config += p.wildcard ? ` network ${p.network} ${p.wildcard}` : ` network ${p.network}`;
 return config;
 }
 default:
 return '';
 }
}

function generateJuniperRoute(protocol, p) {
 switch (protocol) {
 case 'static': {
 if (!p.destIp || !p.mask || !p.nextHop) return 'Error: Please fill in all fields.';
 let destination = p.destIp;
 destination += p.mask.startsWith('/') ? p.mask : `/${p.mask}`;
 return `set routing-options static route ${destination} next-hop ${p.nextHop}`;
 }
 case 'ospf': {
 if (!p.area || !p.network) return 'Error: Please fill in all fields.';
 return `set protocols ospf area ${p.area} interface ${p.network}`;
 }
 case 'bgp': {
 if (!p.asn || !p.neighbor || !p.remoteAs) return 'Error: Please fill in all fields.';
 let config = `set routing-options autonomous-system ${p.asn}\n`;
 config += `set protocols bgp group external-peers type external\n`;
 config += `set protocols bgp group external-peers neighbor ${p.neighbor} peer-as ${p.remoteAs}`;
 return config;
 }
 case 'rip': {
 if (!p.network) return 'Error: Please enter a network/interface.';
 return `set protocols rip group rip-group neighbor ${p.network}`;
 }
 case 'eigrp':
 return 'Error: EIGRP is a Cisco proprietary protocol and is not supported on Juniper devices.';
 default:
 return '';
 }
}

function cidrToMaskLocal(cidr) {
 let prefix = parseInt(cidr, 10);
 if (isNaN(prefix) || prefix < 0 || prefix > 32) return '255.255.255.0';
 let mask = (0xffffffff << (32 - prefix)) >>> 0;
 return `${(mask >>> 24) & 255}.${(mask >>> 16) & 255}.${(mask >>> 8) & 255}.${mask & 255}`;
}
