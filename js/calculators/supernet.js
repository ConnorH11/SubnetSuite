import { ipToUint, uintToIp, cidrToMask } from '../utils.js';


export function calculateSupernet(cidrs) {
 if (!cidrs || cidrs.length < 2) {
 throw new Error('Enter at least two subnets to calculate a supernet.');
 }

 const networks = cidrs.map(cidr => {
 const parts = cidr.trim().split('/');
 if (parts.length !== 2) throw new Error(`Invalid CIDR: ${cidr}`);
 const prefix = parseInt(parts[1], 10);
 if (isNaN(prefix) || prefix < 0 || prefix > 32) throw new Error(`Invalid prefix in: ${cidr}`);
 return { address: ipToUint(parts[0]), prefix };
 });

 const first = Math.min(...networks.map(n => n.address));
 const last = Math.max(...networks.map(n => n.address));
 const xor = (first ^ last) >>> 0;

 let commonPrefix = 0;
 for (let i = 31; i >= 0; i--) {
 if ((xor & (1 << i)) === 0) {
 commonPrefix++;
 } else {
 break;
 }
 }

 const supernetMask = commonPrefix === 0 ? 0 : (0xffffffff << (32 - commonPrefix)) >>> 0;
 const supernetAddress = (first & supernetMask) >>> 0;

 for (const net of networks) {
 const mask = (0xffffffff << (32 - net.prefix)) >>> 0;
 const subnetNetwork = (net.address & mask) >>> 0;
 if (((subnetNetwork & supernetMask) >>> 0) !== supernetAddress) {
 throw new Error(`CIDR block ${uintToIp(net.address)}/${net.prefix} does not fit within ${uintToIp(supernetAddress)}/${commonPrefix}.`);
 }
 }

 const firstHost = commonPrefix >= 31 ? supernetAddress : supernetAddress + 1;
 const lastHost = commonPrefix >= 31
 ? supernetAddress
 : ((supernetAddress | (~supernetMask >>> 0)) - 1) >>> 0;

 return {
 cidr: `${uintToIp(supernetAddress)}/${commonPrefix}`,
 network: uintToIp(supernetAddress),
 mask: uintToIp(supernetMask),
 firstHost: uintToIp(firstHost),
 lastHost: uintToIp(lastHost),
 prefix: commonPrefix,
 };
}


export function aggregateCIDR(cidrs) {
 if (!cidrs || cidrs.length === 0) {
 throw new Error('Enter at least one CIDR block.');
 }

 const blocks = cidrs.map(cidr => {
 const parts = cidr.trim().split('/');
 if (parts.length !== 2) throw new Error(`Invalid CIDR format: ${cidr}`);
 const prefix = parseInt(parts[1], 10);
 if (isNaN(prefix) || prefix < 0 || prefix > 32) throw new Error(`Invalid prefix in: ${cidr}`);
 const ipUint = ipToUint(parts[0]);
 const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
 const network = (ipUint & mask) >>> 0;
 return { network, prefix };
 });

 blocks.sort((a, b) => {
 if (a.network !== b.network) return a.network - b.network;
 return a.prefix - b.prefix;
 });

 const merged = [];

 for (const block of blocks) {
 merged.push(block);

 while (merged.length >= 2) {
 const b1 = merged.pop();
 const b2 = merged.pop();

 const combined = tryMerge(b2, b1);
 if (combined) {
 merged.push(combined);
 } else {
 merged.push(b2);
 merged.push(b1);
 break;
 }
 }
 }

 return merged
 .map(b => `${uintToIp(b.network)}/${b.prefix}`)
 .sort();
}


function tryMerge(a, b) {
 if (a.prefix !== b.prefix) return null;

 const mask = (0xffffffff << (33 - a.prefix)) >>> 0;

 if (((a.network & mask) >>> 0) === ((b.network & mask) >>> 0)) {
 return {
 network: Math.min(a.network, b.network),
 prefix: a.prefix - 1,
 };
 }

 return null;
}
