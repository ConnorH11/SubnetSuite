import { cidrToWildcard, intToIp } from '../utils.js';


export function generateACL(params) {
 const { vendor, type, action, protocol, sourceIp, sourceCidr, destIp, destCidr, sourcePort, destPort } = params;

 if (!sourceIp || !destIp) {
 throw new Error('Source and Destination IP are required.');
 }

 if (vendor === 'cisco') {
 return generateCisco(type, action, protocol, sourceIp, sourceCidr, destIp, destCidr, sourcePort, destPort);
 } else if (vendor === 'juniper') {
 return generateJuniper(action, protocol, sourceIp, sourceCidr, destIp, destCidr, sourcePort, destPort);
 }

 throw new Error('Unknown vendor.');
}

function generateCisco(type, action, protocol, sIp, sCidr, dIp, dCidr, sPort, dPort) {
 let ciscoProto = protocol === 'any' ? 'ip' : protocol;
 let acl = `access-list 100 ${action} ${ciscoProto} `;

 acl += formatCiscoAddress(sIp, sCidr);
 if (sPort && (protocol === 'tcp' || protocol === 'udp')) {
 acl += ` eq ${sPort}`;
 }
 acl += ' ';
 acl += formatCiscoAddress(dIp, dCidr);
 if (dPort && (protocol === 'tcp' || protocol === 'udp')) {
 acl += ` eq ${dPort}`;
 }

 return acl;
}

function formatCiscoAddress(ip, cidr) {
 if (!cidr || cidr === '/32' || cidr === '32') return `host ${ip}`;
 if (cidr === '/0' || cidr === '0' || ip === 'any') return 'any';
 const wildcard = cidrToWildcard(cidr);
 return `${ip} ${wildcard}`;
}

function generateJuniper(action, protocol, sIp, sCidr, dIp, dCidr, sPort, dPort) {
 let termName = action === 'deny' ? `block-${protocol}` : `allow-${protocol}`;

 let config = `term ${termName} {\n`;
 config += ` from {\n`;
 config += ` source-address {\n`;
 config += ` ${formatJuniperAddress(sIp, sCidr)};\n`;
 config += ` }\n`;
 config += ` destination-address {\n`;
 config += ` ${formatJuniperAddress(dIp, dCidr)};\n`;
 config += ` }\n`;

 if (protocol === 'any' || protocol === 'ip') {
 config += ` protocol all;\n`;
 } else {
 config += ` protocol ${protocol};\n`;
 }

 if (sPort && (protocol === 'tcp' || protocol === 'udp')) {
 config += ` source-port ${sPort};\n`;
 }
 if (dPort && (protocol === 'tcp' || protocol === 'udp')) {
 config += ` destination-port ${dPort};\n`;
 }

 config += ` }\n`;
 config += ` then {\n`;
 config += ` ${action === 'deny' ? 'discard' : 'accept'};\n`;
 config += ` }\n`;
 config += `}`;

 return config;
}

function formatJuniperAddress(ip, cidr) {
 if (!cidr) return `${ip}/32`;
 if (cidr.startsWith('/')) return `${ip}${cidr}`;
 return `${ip}/${cidr}`;
}
