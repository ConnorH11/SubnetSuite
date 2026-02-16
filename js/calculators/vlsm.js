import { ipToUint, uintToIp, cidrToMask } from '../utils.js';


export function calculateVLSM(baseNetworkCidr, subnets) {
 const [baseIpStr, cidrStr] = baseNetworkCidr.split('/');
 const baseCidr = parseInt(cidrStr, 10);

 if (isNaN(baseCidr) || baseCidr < 0 || baseCidr > 30) {
 throw new Error('Invalid base network CIDR prefix.');
 }

 const baseMask = baseCidr === 0 ? 0 : (0xffffffff << (32 - baseCidr)) >>> 0;
 let baseIpUint = (ipToUint(baseIpStr) & baseMask) >>> 0;
 const totalAddresses = Math.pow(2, 32 - baseCidr);

 // Sort by host count descending (keeping original index)
 const sorted = subnets
 .map((s, index) => ({ ...s, originalIndex: index }))
 .sort((a, b) => b.hosts - a.hosts);

 const results = [];
 let currentIpUint = baseIpUint;

 for (const entry of sorted) {
 const neededHosts = entry.hosts;

 if (neededHosts <= 0) {
 throw new Error(`Subnet "${entry.label || (entry.originalIndex + 1)}" must require at least 1 host.`);
 }

 // Calculate required bits
 let bits = 0;
 while ((Math.pow(2, bits) - 2) < neededHosts) {
 bits++;
 }

 const cidr = 32 - bits;
 const blockSize = Math.pow(2, bits);

 // Align to block boundary
 if ((currentIpUint & (blockSize - 1)) !== 0) {
 currentIpUint = ((currentIpUint + blockSize) & (~(blockSize - 1) >>> 0)) >>> 0;
 }

 const networkUint = currentIpUint;
 const broadcastUint = (networkUint + blockSize - 1) >>> 0;

 // Check if we've exceeded the base network
 if (broadcastUint >= baseIpUint + totalAddresses) {
 throw new Error(`Not enough address space. Cannot allocate subnet "${entry.label || (entry.originalIndex + 1)}" (needs ${neededHosts} hosts).`);
 }

 const firstHostUint = networkUint + 1;
 const lastHostUint = broadcastUint - 1;
 const allocatedHosts = blockSize - 2;

 results.push({
 originalIndex: entry.originalIndex,
 label: entry.label || `Subnet ${entry.originalIndex + 1}`,
 neededHosts: neededHosts,
 allocatedHosts: allocatedHosts,
 networkAddress: uintToIp(networkUint),
 cidr: cidr,
 cidrNotation: `${uintToIp(networkUint)}/${cidr}`,
 subnetMask: cidrToMask(cidr),
 firstHost: uintToIp(firstHostUint),
 lastHost: uintToIp(lastHostUint),
 broadcastAddress: uintToIp(broadcastUint),
 });

 currentIpUint = (networkUint + blockSize) >>> 0;
 }

 // Sort results back by original index for display
 results.sort((a, b) => a.originalIndex - b.originalIndex);

 return results;
}
