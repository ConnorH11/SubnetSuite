export function expandIPv6(ip) {
 if (ip.includes('::')) {
 const parts = ip.split('::');
 const left = parts[0] ? parts[0].split(':') : [];
 const right = parts[1] ? parts[1].split(':') : [];
 const fill = new Array(8 - (left.length + right.length)).fill('0000');
 const full = [...left, ...fill, ...right];
 return full.map(part => part.padStart(4, '0')).join(':');
 } else {
 return ip.split(':').map(part => part.padStart(4, '0')).join(':');
 }
}


export function compressIPv6(ipv6) {
 const sections = ipv6.split(':').map(part => part.replace(/^0+/, '') || '0');

 // Find longest run of consecutive "0" sections
 let bestStart = -1, bestLen = 0, currStart = -1, currLen = 0;
 for (let i = 0; i <= sections.length; i++) {
 if (i < sections.length && sections[i] === '0') {
 if (currStart === -1) currStart = i;
 currLen++;
 } else {
 if (currLen > bestLen) {
 bestStart = currStart;
 bestLen = currLen;
 }
 currStart = -1;
 currLen = 0;
 }
 }

 // Replace longest zero-run with "::"
 if (bestLen > 1) {
 sections.splice(bestStart, bestLen, '');
 if (bestStart === 0) sections.unshift('');
 if (bestStart + bestLen === 8) sections.push('');
 }

 return sections.join(':').replace(/:{3,}/, '::').toLowerCase();
}


export function ipv6ToBinary(ip) {
 return expandIPv6(ip)
 .split(':')
 .map(h => parseInt(h, 16).toString(2).padStart(16, '0'))
 .join('');
}


export function binaryToIPv6(bin) {
 const hexGroups = [];
 for (let i = 0; i < 128; i += 16) {
 hexGroups.push(parseInt(bin.slice(i, i + 16), 2).toString(16));
 }
 return compressIPv6(hexGroups.join(':'));
}


export function intToBinary(n, bits) {
 return n.toString(2).padStart(bits, '0');
}


export function calculateIPv6(input, subnetCount) {
 if (!input.includes('/')) {
 throw new Error('Enter an IPv6 address with a prefix, e.g., 2001:db8::/64');
 }

 const [ipPart, prefixStr] = input.split('/');
 const prefix = parseInt(prefixStr, 10);

 if (isNaN(prefix) || prefix < 0 || prefix > 128) {
 throw new Error('Invalid prefix. Must be between 0 and 128.');
 }

 const expanded = expandIPv6(ipPart);
 const compressed = compressIPv6(expanded);
 const baseBinary = ipv6ToBinary(expanded).substring(0, prefix);
 const hostBits = 128 - prefix;

 const rangeStart = compressIPv6(binaryToIPv6(baseBinary.padEnd(128, '0')));
 const rangeEnd = compressIPv6(binaryToIPv6(baseBinary.padEnd(128, '1')));

 const result = {
 expanded,
 compressed,
 prefix,
 rangeStart,
 rangeEnd,
 subnets: null,
 };

 // Generate subnets if requested
 if (!isNaN(subnetCount) && subnetCount > 0) {
 const neededBits = Math.ceil(Math.log2(subnetCount));
 const newPrefix = prefix + neededBits;

 if (newPrefix > 128) {
 result.subnetError = `Not enough bits to create ${subnetCount} subnets from /${prefix}`;
 } else {
 result.newPrefix = newPrefix;
 result.subnets = [];

 for (let i = 0; i < subnetCount; i++) {
 const subnetBinary = baseBinary + intToBinary(i, neededBits).padEnd(hostBits, '0');
 const subnetAddress = binaryToIPv6(subnetBinary);
 result.subnets.push({
 address: subnetAddress,
 prefix: newPrefix,
 cidr: `${subnetAddress}/${newPrefix}`,
 });
 }
 }
 }

 return result;
}
