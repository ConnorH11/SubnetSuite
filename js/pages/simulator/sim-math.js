// sim-math.js
// Utility functions for IPv4 subnetting and packet routing maths

export function ipToUint(ip) {
    if (!ip) return 0;
    const p = ip.split('.');
    if (p.length !== 4) return 0;
    return ((+p[0] << 24) | (+p[1] << 16) | (+p[2] << 8) | +p[3]) >>> 0;
}

export function uintToIp(u) {
    return [(u >>> 24) & 0xff, (u >>> 16) & 0xff, (u >>> 8) & 0xff, u & 0xff].join('.');
}

export function cidrToMask(c) {
    if (c === 0) return '0.0.0.0';
    return uintToIp((0xffffffff << (32 - c)) >>> 0);
}

export function maskToCidr(mask) {
    if (!mask || !mask.includes('.')) return parseInt(mask) || 24;
    const uint = ipToUint(mask);
    let cidr = 0;
    let check = uint;
    for (let i = 31; i >= 0; i--) {
        if ((check >>> i) & 1) cidr++;
        else break;
    }
    return cidr;
}

export function getNetAddr(ip, cidr) {
    if (!ip || cidr == null) return null;
    return uintToIp((ipToUint(ip) & ((0xffffffff << (32 - cidr)) >>> 0)) >>> 0);
}

export function getBroadcastAddr(ip, cidr) {
    if (!ip || cidr == null) return null;
    const netUint = (ipToUint(ip) & ((0xffffffff << (32 - cidr)) >>> 0)) >>> 0;
    const hostBits = (32 - cidr);
    const broadcastUint = (netUint | ((1 << hostBits) - 1)) >>> 0;
    return uintToIp(broadcastUint);
}

export function getWildcard(cidr) {
    return uintToIp(~((0xffffffff << (32 - cidr)) >>> 0) >>> 0);
}

export function isValidIP(ip) {
    if (!ip) return false;
    const p = ip.split('.');
    if (p.length !== 4) return false;
    return p.every(s => { 
        const n = +s; 
        return Number.isInteger(n) && n >= 0 && n <= 255 && String(n) === s; 
    });
}

export function isSameSubnet(ip1, cidr1, ip2, cidr2) {
    const net1 = getNetAddr(ip1, cidr1);
    const net2 = getNetAddr(ip2, cidr2 !== undefined ? cidr2 : cidr1);
    return net1 === net2;
}

export function generateMAC() {
    const hex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
    return `00:${hex()}:${hex()}:${hex()}:${hex()}:${hex()}`;
}

export function ipInSubnet(ip, network, cidr) {
    const netAddr = getNetAddr(network, cidr);
    const testNet = getNetAddr(ip, cidr);
    return netAddr === testNet;
}

// Get next available IP in a subnet (for DHCP)
export function getNextIP(network, cidr, excludeSet) {
    const netUint = ipToUint(network);
    const mask = (0xffffffff << (32 - cidr)) >>> 0;
    const start = (netUint & mask) + 1; // skip network address
    const end = (netUint | ~mask) >>> 0; // broadcast
    
    for (let i = start; i < end; i++) {
        const ip = uintToIp(i >>> 0);
        if (!excludeSet || !excludeSet.has(ip)) return ip;
    }
    return null;
}
