import { ipToUint, uintToIp, cidrToMask, uintToBinary, getIPClass, maskToCidr } from '../utils.js';


export function calculateSubnet(ipStr, cidrInput) {
 // Parse CIDR
 let cidr;
 let cidrStr = String(cidrInput).trim();

 if (cidrStr.includes('.')) {
 // Dotted-decimal mask – convert to CIDR
 cidr = maskToCidr(cidrStr);
 } else {
 cidr = parseInt(cidrStr.replace(/^\//, ''), 10);
 }

 if (isNaN(cidr) || cidr < 0 || cidr > 32) {
 throw new Error('Invalid CIDR prefix. Must be between 0 and 32.');
 }

 const ipUint = ipToUint(ipStr);
 const mask = cidr === 0 ? 0 : (0xffffffff << (32 - cidr)) >>> 0;
 const wildcard = (~mask) >>> 0;

 const networkUint = (ipUint & mask) >>> 0;
 const broadcastUint = (networkUint | wildcard) >>> 0;

 // Host range
 let firstHostUint, lastHostUint, totalHosts;

 if (cidr >= 31) {
 // /31 point-to-point or /32 host route
 firstHostUint = networkUint;
 lastHostUint = broadcastUint;
 totalHosts = cidr === 32 ? 1 : 2;
 } else {
 firstHostUint = networkUint + 1;
 lastHostUint = broadcastUint - 1;
 totalHosts = Math.pow(2, 32 - cidr) - 2;
 }

 // IP class
 const firstOctet = (ipUint >>> 24) & 0xff;
 const ipClass = getIPClass(firstOctet);

 // Binary representations
 const ipBinary = uintToBinary(ipUint);
 const maskBinary = uintToBinary(mask);
 const networkBinary = uintToBinary(networkUint);

 // Format binary with dots between octets
 const formatBinary = (bin) =>
 `${bin.substring(0, 8)}.${bin.substring(8, 16)}.${bin.substring(16, 24)}.${bin.substring(24, 32)}`;

 return {
 inputIP: ipStr,
 cidr: cidr,
 networkAddress: uintToIp(networkUint),
 subnetMask: uintToIp(mask),
 wildcardMask: uintToIp(wildcard),
 broadcastAddress: uintToIp(broadcastUint),
 firstHost: uintToIp(firstHostUint),
 lastHost: uintToIp(lastHostUint),
 totalHosts: totalHosts,
 ipClass: ipClass,
 cidrNotation: `${uintToIp(networkUint)}/${cidr}`,
 // Binary
 ipBinary: formatBinary(ipBinary),
 maskBinary: formatBinary(maskBinary),
 networkBinary: formatBinary(networkBinary),
 // Raw uint values for further calculations
 _networkUint: networkUint,
 _broadcastUint: broadcastUint,
 _firstHostUint: firstHostUint,
 _lastHostUint: lastHostUint,
 };
}
