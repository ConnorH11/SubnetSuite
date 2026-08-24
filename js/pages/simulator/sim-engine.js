// sim-engine.js

import { ipToUint, uintToIp, cidrToMask, getNetAddr, isValidIP, isSameSubnet, maskToCidr, generateMAC, ipInSubnet, getNextIP } from './sim-math.js';
import { createCLI } from './sim-cli.js';
import { makeDraggable } from './sim-ui-utils.js';
import { SimDesktop } from './sim-desktop.js';
import { VENDORS, getPortDisplayName } from './sim-device-templates.js';

export class SimEngine {
    constructor(graph) {
        this.graph = graph;
        this.packetLog = []; // For Wireshark-lite
        this.maxLogEntries = 500;
        this.tickInterval = null;
        this.tickCount = 0;
    }

    // ─── Topology Queries ──────────────────────────

    getNeighbors(nodeId) {
        const n = [];
        this.graph.edges.forEach(edge => {
            if (edge.source === nodeId) n.push({ nodeId: edge.target, port: edge.targetPort, localPort: edge.sourcePort, edge });
            if (edge.target === nodeId) n.push({ nodeId: edge.source, port: edge.sourcePort, localPort: edge.targetPort, edge });
        });
        return n;
    }

    getNeighborNodeIds(nodeId) {
        return this.getNeighbors(nodeId).map(n => n.nodeId);
    }

    // ─── ARP Simulation ────────────────────────────

    resolveARP(srcNodeId, targetIP) {
        const srcNode = this.graph.getNode(srcNodeId);
        if (!srcNode) return null;

        if (srcNode.arpTable.has(targetIP)) {
            return srcNode.arpTable.get(targetIP);
        }

        const targetNode = this.graph.findNodeByIP(targetIP);
        if (!targetNode) return null;

        for (const iface of Object.values(targetNode.interfaces)) {
            if (iface.ip === targetIP) {
                const entry = { mac: iface.mac, interface: '', type: 'dynamic', age: 0 };
                srcNode.arpTable.set(targetIP, entry);

                this._logPacket({
                    type: 'ARP',
                    src: srcNodeId,
                    dst: targetNode.id,
                    info: `Who has ${targetIP}? Tell ${this._getFirstIP(srcNodeId)}`,
                    timestamp: Date.now()
                });

                return entry;
            }
        }
        return null;
    }

    // ─── MAC Table Learning ────────────────────────

    learnMAC(switchNodeId, port, mac, vlan = 1) {
        const sw = this.graph.getNode(switchNodeId);
        if (!sw) return;
        sw.macTable.set(mac, { port, vlan, type: 'dynamic', age: 0 });
    }

    lookupMAC(switchNodeId, mac) {
        const sw = this.graph.getNode(switchNodeId);
        if (!sw) return null;
        return sw.macTable.get(mac) || null;
    }

    // ─── DHCP Simulation ───────────────────────────

    requestDHCP(clientNodeId) {
        const client = this.graph.getNode(clientNodeId);
        if (!client) return { ok: false, reason: 'Client not found' };
        if (client.services?.dhcpClientService === false) {
            this._logPacket({
                type: 'DHCP',
                src: clientNodeId,
                dst: 'broadcast',
                info: 'DHCP Discover not sent: DHCP Client service stopped',
                details: {
                    bootpOp: 'Client service stopped',
                    srcPort: 68,
                    dstPort: 67,
                    messageType: 'Local failure',
                    clientMac: Object.values(client.interfaces || {})[0]?.mac || '',
                    notes: 'The client service must be running before DHCP Discover packets leave the host.'
                }
            });
            return { ok: false, reason: 'DHCP Client service is stopped' };
        }

        const clientIfaceName = Object.keys(client.interfaces || {})[0];
        const clientVlan = clientIfaceName ? this._getEndpointAccessVlan(clientNodeId, clientIfaceName) : null;

        for (const [id, node] of this.graph.nodes.entries()) {
            if (node.dhcpPools && node.dhcpPools.length > 0) {
                if (node.services?.dhcpServer === false) continue;
                for (const pool of node.dhcpPools) {
                    if (!pool.network || !pool.mask) continue;

                    const path = this._bfsPath(clientNodeId, id, clientVlan ? String(clientVlan) : null);
                    if (!path) continue;

                    const cidr = maskToCidr(pool.mask);
                    if (!pool.leases) pool.leases = new Map();

                    const usedIPs = new Set(pool.leases.keys());
                    for (const iface of Object.values(node.interfaces)) {
                        if (iface.ip) usedIPs.add(iface.ip);
                    }
                    if (pool.defaultRouter) usedIPs.add(pool.defaultRouter);

                    const newIP = getNextIP(pool.network, cidr, usedIPs);
                    if (!newIP) continue;

                    const clientIface = Object.values(client.interfaces)[0];
                    if (!clientIface) continue;

                    const clientIfName = Object.keys(client.interfaces)[0];
                    clientIface.ip = newIP;
                    clientIface.subnet = String(cidr);
                    client.gateway = pool.defaultRouter || '';
                    client.dnsServer = pool.dns || client.dnsServer || '';
                    if (!client.services) client.services = {};
                    client.services.dhcpClient = true;
                    client.services.dhcpAssignedIp = newIP;

                    pool.leases.set(newIP, {
                        mac: clientIface.mac,
                        hostname: client.hostname,
                        expires: 'infinite',
                        timestamp: Date.now()
                    });

                    this._logPacket({
                        type: 'DHCP',
                        src: clientNodeId,
                        dst: id,
                        info: `DHCP Discover -> Offer -> Request -> ACK: ${newIP}/${cidr}`,
                        path,
                        details: {
                            bootpOp: 'ACK',
                            srcPort: 67,
                            dstPort: 68,
                            messageType: 'DHCP ACK',
                            offeredIp: newIP,
                            subnetMask: pool.mask,
                            router: pool.defaultRouter || '',
                            dnsServer: pool.dns || '',
                            leaseTime: 'infinite',
                            clientMac: clientIface.mac || ''
                        }
                    });

                    this.graph.notify();
                    return { ok: true, ip: newIP, subnet: cidr, gateway: pool.defaultRouter, dns: pool.dns };
                }
            }
        }

        this._logPacket({
            type: 'DHCP',
            src: clientNodeId,
            dst: 'broadcast',
            info: 'DHCP Discover -> no Offer received',
            details: {
                bootpOp: 'Discover',
                srcPort: 68,
                dstPort: 67,
                messageType: 'DHCP Discover',
                clientVlan: clientVlan || 'unknown',
                clientMac: Object.values(client.interfaces || {})[0]?.mac || '',
                notes: 'No reachable DHCP server answered on this Layer 2 segment.'
            }
        });
        return { ok: false, reason: 'No DHCP server found on the network' };
    }

    // ─── DNS Resolution ────────────────────────────

    resolveDNS(clientNodeId, hostname) {
        const clientNode = this.graph.getNode(clientNodeId);
        if (clientNode?.services?.dnsClient === false) return { ok: false, reason: 'DNS Client service is stopped' };
        const configuredDns = clientNode?.dnsServer || clientNode?.dns || clientNode?.resolver || '';

        if (configuredDns) {
            const dnsNode = this.graph.findNodeByIP(configuredDns);
            if (!dnsNode) {
                this._logDnsPacket(clientNodeId, configuredDns, hostname, 'Timeout', `Query: ${hostname} -> timeout (${configuredDns} not found)`);
                return { ok: false, reason: `DNS server ${configuredDns} is not reachable` };
            }
            if (dnsNode.services?.dnsServer === false) {
                this._logDnsPacket(clientNodeId, dnsNode.id, hostname, 'Server stopped', `Query: ${hostname} -> no response (DNS service stopped)`);
                return { ok: false, reason: `DNS server ${configuredDns} service is stopped` };
            }

            const reachability = this.ping(clientNodeId, configuredDns);
            if (!reachability.ok) {
                this._logDnsPacket(clientNodeId, dnsNode.id, hostname, 'Timeout', `Query: ${hostname} -> timeout (${reachability.reason})`);
                return { ok: false, reason: `DNS server ${configuredDns} unreachable: ${reachability.reason}` };
            }

            const match = this._findDnsRecord(dnsNode, hostname);
            if (match) {
                this._logDnsPacket(clientNodeId, dnsNode.id, hostname, 'NoError', `Query: ${hostname} -> ${match.value}`, match.value);
                return { ok: true, ip: match.value, server: dnsNode.id };
            }
            this._logDnsPacket(clientNodeId, dnsNode.id, hostname, 'NXDOMAIN', `Query: ${hostname} -> NXDOMAIN`);
            return { ok: false, reason: `DNS server ${configuredDns} has no A record for ${hostname}` };
        }

        for (const [id, node] of this.graph.nodes.entries()) {
            if (node.services?.dnsServer === false) continue;
            const match = this._findDnsRecord(node, hostname);
            if (match) {
                this._logDnsPacket(clientNodeId, id, hostname, 'NoError', `Query: ${hostname} -> ${match.value}`, match.value);
                return { ok: true, ip: match.value, server: id };
            }
        }
        this._logDnsPacket(clientNodeId, 'broadcast', hostname, 'NXDOMAIN', `Query: ${hostname} -> NXDOMAIN`);
        return { ok: false, reason: `Cannot resolve ${hostname}` };
    }

    _logDnsPacket(src, dst, hostname, responseCode, info, answer = '') {
        this._logPacket({
            type: 'DNS',
            src,
            dst,
            info,
            details: {
                transport: 'UDP',
                srcPort: 53000 + Math.floor(Math.random() * 1000),
                dstPort: 53,
                queryName: hostname,
                queryType: 'A',
                responseCode,
                answer
            }
        });
    }

    _findDnsRecord(node, hostname) {
        if (!node?.dnsRecords?.length) return null;
        return node.dnsRecords.find(record =>
            (record.name || '').toLowerCase() === hostname.toLowerCase() && record.type === 'A'
        ) || null;
    }

    // ─── Ping Simulation (Full) ────────────────────

    ping(sourceId, targetIp) {
        const srcNode = this.graph.getNode(sourceId);
        if (!srcNode) return { ok: false, reason: 'Invalid source' };
        if (!isValidIP(targetIp)) return { ok: false, reason: 'Invalid destination IP format' };

        const srcIf = this._getFirstConfiguredInterface(sourceId);
        if (!srcIf) return { ok: false, reason: 'Source node has no IP assigned' };

        const destNode = this.graph.findNodeByIP(targetIp);
        if (!destNode) return { ok: false, reason: `Destination host ${targetIp} unreachable` };

        if (!srcNode.powered) return { ok: false, reason: 'Source device is powered off' };
        if (!destNode.powered) return { ok: false, reason: 'Destination device is powered off' };

        const sameSubnetVlan = this._getSameSubnetAccessVlan(sourceId, destNode.id, targetIp);
        const path = this._bfsPath(sourceId, destNode.id, sameSubnetVlan);
        if (!path) return { ok: false, reason: 'Destination host unreachable (no physical path)' };

        const srcCidr = parseInt(srcIf.iface.subnet) || 24;
        const srcNet = getNetAddr(srcIf.iface.ip, srcCidr);

        const destIf = this._findInterfaceWithIP(destNode.id, targetIp);
        if (!destIf) return { ok: false, reason: 'Destination interface not found' };

        const dstCidr = parseInt(destIf.iface.subnet) || 24;
        const dstNet = getNetAddr(destIf.iface.ip, dstCidr);

        if (srcNet !== dstNet) {
            if (!srcNode.gateway && !this._hasRouteFor(sourceId, targetIp)) {
                return { ok: false, reason: `Destination host unreachable. No default gateway configured.` };
            }
            if (srcNode.gateway && !this._hasUsableDefaultGateway(sourceId)) {
                return { ok: false, reason: `Destination host unreachable. Default gateway ${srcNode.gateway} is not reachable from this subnet.` };
            }
            const hasRouter = path.some(id => {
                const n = this.graph.getNode(id);
                return n && (n.type === 'router' || n.type === 'l3switch' || n.type === 'firewall');
            });
            if (!hasRouter) {
                return { ok: false, reason: 'Destination in different subnet but no router in path' };
            }
        }

        for (const nodeId of path) {
            const node = this.graph.getNode(nodeId);
            if (node && node.aclRules && node.aclRules.length > 0) {
                const blocked = this._checkACL(node, srcIf.iface.ip, targetIp);
                if (blocked) {
                    return { ok: false, reason: `Packet denied by ACL on ${node.name}` };
                }
            }
        }

        for (const nodeId of path) {
            const node = this.graph.getNode(nodeId);
            if (!node || !node.powered) return { ok: false, reason: `Device ${node?.name || 'unknown'} is powered off` };
        }

        this.resolveARP(sourceId, targetIp);

        this._learnMACsAlongPath(path);

        const ms = path.length * 8 + Math.floor(Math.random() * 10);

        this._logPacket({
            type: 'ICMP',
            src: sourceId,
            dst: destNode.id,
            info: `Echo Request/Reply: ${srcIf.iface.ip} → ${targetIp} (${ms}ms, TTL=128, ${path.length} hops)`,
            path,
            details: {
                icmpType: 'Echo request/reply',
                sourceIp: srcIf.iface.ip,
                destinationIp: targetIp,
                ttl: 128 - path.length + 1,
                bytes: 32,
                roundTripMs: ms
            }
        });

        srcNode.packetsSent++;
        destNode.packetsReceived++;

        return {
            ok: true,
            path,
            ms,
            ttl: 128 - path.length + 1,
            bytes: 32
        };
    }

    // ─── Traceroute Simulation ─────────────────────

    traceroute(sourceId, targetIp) {
        const result = this.ping(sourceId, targetIp);
        if (!result.path) return result;

        const hops = [];
        for (let i = 0; i < result.path.length; i++) {
            const node = this.graph.getNode(result.path[i]);
            let hopIp = '*';
            if (node) {
                const iface = this._getFirstConfiguredInterface(result.path[i]);
                if (iface) hopIp = iface.iface.ip;
            }
            hops.push({
                hop: i + 1,
                ip: hopIp,
                name: node?.name || '*',
                ms: (i + 1) * 4 + Math.floor(Math.random() * 5)
            });
        }

        return { ok: result.ok, hops, path: result.path };
    }

    // ─── HTTP Simulation ───────────────────────────

    httpRequest(sourceId, targetIp) {
        // 1. Check L3 connectivity (Ping)
        const pingResult = this.ping(sourceId, targetIp);
        if (!pingResult.ok) {
            return { ok: false, status: 0, reason: pingResult.reason };
        }

        // 2. Check if target is a server with HTTP enabled
        const targetNode = this.graph.findNodeByIP(targetIp);
        if (!targetNode) {
            return { ok: false, status: 404, reason: 'Target not found' };
        }

        if (targetNode.type !== 'server' && targetNode.type !== 'cloud') {
            this._logTcpPacket(sourceId, targetNode.id, targetIp, 'RST', 'TCP SYN -> RST: target is not listening as a server', pingResult.path);
            return { ok: false, status: 403, reason: 'Connection Refused: Target is not a server' };
        }

        if (!targetNode.services || !targetNode.services.http) {
            this._logTcpPacket(sourceId, targetNode.id, targetIp, 'RST', 'TCP SYN -> RST: HTTP service not running', pingResult.path);
            return { ok: false, status: 403, reason: 'Connection Refused: HTTP service not running' };
        }

        const firewallDecision = this._hostFirewallDecision(targetNode, '80', 'tcp');
        if (firewallDecision === 'deny') {
            this._logTcpPacket(sourceId, targetNode.id, targetIp, 'Timeout', 'TCP SYN retransmission -> no response: host firewall denied tcp/80', pingResult.path);
            return { ok: false, status: 403, reason: 'Connection timed out: host firewall denied tcp/80' };
        }

        // 3. Get content from server's file system or fallback
        let content = this._readFile(targetNode, '/var/www/html/index.html');

        if (!content) {
            content = `
                <!DOCTYPE html>
                <html>
                <head><title>Welcome to ${targetNode.hostname || targetNode.name}</title></head>
                <body style="font-family: sans-serif; padding: 40px; text-align: center; background: #f0f2f5;">
                    <div style="background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 600px; margin: 0 auto;">
                        <h1 style="color: #0d6efd;">It Works!</h1>
                        <p>This is the default web page for the simulated server <strong>${targetNode.hostname || targetNode.name}</strong>.</p>
                        <p style="color: #6c757d; font-size: 0.9em; margin-top: 20px;">IP Address: ${targetIp}</p>
                    </div>
                </body>
                </html>
            `;
        }

        this._logPacket({
            type: 'TCP/HTTP',
            src: sourceId,
            dst: targetNode.id,
            info: `HTTP GET / (200 OK)`,
            path: pingResult.path,
            details: {
                protocol: 'HTTP',
                method: 'GET',
                path: '/',
                status: '200 OK',
                srcPort: 49152 + Math.floor(Math.random() * 1000),
                dstPort: 80,
                host: targetNode.hostname || targetNode.name
            }
        });

        return { ok: true, status: 200, content, ms: pingResult.ms * 2 };
    }

    _logTcpPacket(sourceId, destId, destIp, state, info, path = []) {
        this._logPacket({
            type: 'TCP',
            src: sourceId,
            dst: destId,
            info,
            path,
            details: {
                srcPort: 49152 + Math.floor(Math.random() * 1000),
                dstPort: 80,
                destinationIp: destIp,
                flags: state === 'RST' ? 'SYN, RST' : 'SYN retransmission',
                state
            }
        });
    }

    _hostFirewallDecision(node, port, protocol = 'tcp') {
        if (!node?.firewallEnabled) return 'allow';
        const rules = node.firewallRules || [];
        for (let i = rules.length - 1; i >= 0; i--) {
            const rule = rules[i];
            const portMatches = String(rule.port) === String(port);
            const protocolMatches = !rule.protocol || rule.protocol === protocol;
            if (portMatches && protocolMatches) return rule.action === 'deny' ? 'deny' : 'allow';
        }
        return 'allow';
    }

    _readFile(node, path) {
        const parts = String(path || '').split('/').filter(Boolean);
        let current = node.filesystem?.['/'];
        for (const part of parts) {
            if (!current?.children?.[part]) return '';
            current = current.children[part];
        }
        return current?.type === 'file' ? current.content || '' : '';
    }

    // ─── ACL Check ─────────────────────────────────

    _checkACL(node, srcIP, dstIP) {
        for (const acl of node.aclRules) {
            for (const entry of acl.entries) {
                if (acl.type === 'standard') {
                    if (entry.source === 'any' || entry.source === srcIP) {
                        return entry.action === 'deny';
                    }
                } else {
                    const srcMatch = entry.source === 'any' || entry.source === srcIP;
                    const dstMatch = !entry.destination || entry.destination === 'any' || entry.destination === dstIP;
                    if (srcMatch && dstMatch) {
                        return entry.action === 'deny';
                    }
                }
            }
        }
        return false; // implicit deny is not enforced in simulation for simplicity
    }

    // ─── Path Finding ──────────────────────────────

    _bfsPath(startId, endId, vlanId = null) {
        const queue = [{ id: startId, path: [startId] }];
        const visited = new Set([startId]);

        while (queue.length > 0) {
            const current = queue.shift();
            if (current.id === endId) return current.path;

            for (const neighbor of this.getNeighborNodeIds(current.id)) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    const edge = this._getEdgeBetween(current.id, neighbor);
                    if (edge && edge.status === 'up' && this._edgeAllowsVlan(edge, current.id, neighbor, vlanId)) {
                        queue.push({ id: neighbor, path: [...current.path, neighbor] });
                    }
                }
            }
        }
        return null;
    }

    _getSameSubnetAccessVlan(sourceId, destId, targetIp) {
        const srcIf = this._getFirstConfiguredInterface(sourceId);
        const destIf = this._findInterfaceWithIP(destId, targetIp);
        if (!srcIf || !destIf) return null;

        const srcCidr = parseInt(srcIf.iface.subnet) || 24;
        const destCidr = parseInt(destIf.iface.subnet) || 24;
        if (getNetAddr(srcIf.iface.ip, srcCidr) !== getNetAddr(destIf.iface.ip, destCidr)) return null;

        const srcVlan = this._getEndpointAccessVlan(sourceId, srcIf.name);
        const dstVlan = this._getEndpointAccessVlan(destId, destIf.name);
        if (srcVlan == null || dstVlan == null) return null;
        if (String(srcVlan) !== String(dstVlan)) return '__VLAN_MISMATCH__';
        return String(srcVlan);
    }

    _getEndpointAccessVlan(nodeId, ifaceName) {
        const neighbor = this.graph.getNeighborOnPort(nodeId, ifaceName);
        if (!neighbor) return null;
        const neighborNode = this.graph.getNode(neighbor.nodeId);
        const neighborIface = neighborNode?.interfaces?.[neighbor.port];
        if (neighborNode && (neighborNode.type === 'switch' || neighborNode.type === 'l3switch') && neighborIface) {
            return neighborIface.accessVlan || 1;
        }
        const node = this.graph.getNode(nodeId);
        const iface = node?.interfaces?.[ifaceName];
        return iface?.accessVlan || 1;
    }

    _edgeAllowsVlan(edge, currentId, neighborId, vlanId) {
        if (!vlanId) return true;
        if (vlanId === '__VLAN_MISMATCH__') return false;

        const current = this.graph.getNode(currentId);
        const neighbor = this.graph.getNode(neighborId);
        if (!current || !neighbor) return false;

        const currentPort = edge.source === currentId ? edge.sourcePort : edge.targetPort;
        const neighborPort = edge.source === neighborId ? edge.sourcePort : edge.targetPort;
        const currentIface = current.interfaces?.[currentPort];
        const neighborIface = neighbor.interfaces?.[neighborPort];

        const currentIsSwitch = current.type === 'switch' || current.type === 'l3switch';
        const neighborIsSwitch = neighbor.type === 'switch' || neighbor.type === 'l3switch';

        if (currentIsSwitch && neighborIsSwitch) {
            return this._switchportCarriesVlan(currentIface, vlanId) && this._switchportCarriesVlan(neighborIface, vlanId);
        }
        if (currentIsSwitch) return this._switchportCarriesVlan(currentIface, vlanId);
        if (neighborIsSwitch) return this._switchportCarriesVlan(neighborIface, vlanId);
        return true;
    }

    _switchportCarriesVlan(iface, vlanId) {
        if (!iface || iface.state !== 'up') return false;
        if (iface.switchportMode === 'trunk') {
            return this._trunkAllowsVlan(iface.trunkAllowed || 'all', vlanId);
        }
        return String(iface.accessVlan || 1) === String(vlanId);
    }

    _trunkAllowsVlan(allowed, vlanId) {
        if (!allowed || String(allowed).toLowerCase() === 'all') return true;
        const vlan = Number(vlanId);
        return String(allowed).split(',').some(part => {
            const token = part.trim();
            if (!token) return false;
            if (token.includes('-')) {
                const [start, end] = token.split('-').map(Number);
                return vlan >= start && vlan <= end;
            }
            return String(Number(token)) === String(vlan);
        });
    }

    _getEdgeBetween(a, b) {
        for (const edge of this.graph.edges.values()) {
            if ((edge.source === a && edge.target === b) || (edge.source === b && edge.target === a)) {
                return edge;
            }
        }
        return null;
    }

    // ─── Helper Queries ────────────────────────────

    _getFirstIP(nodeId) {
        const node = this.graph.getNode(nodeId);
        if (!node) return '';
        for (const iface of Object.values(node.interfaces)) {
            if (iface.ip) return iface.ip;
        }
        return '';
    }

    _getFirstConfiguredInterface(nodeId) {
        const node = this.graph.getNode(nodeId);
        if (!node) return null;
        for (const [name, iface] of Object.entries(node.interfaces)) {
            if (iface.ip && iface.state === 'up') return { name, iface };
        }
        for (const [name, iface] of Object.entries(node.sviInterfaces || {})) {
            if (iface.ip && iface.state === 'up') return { name, iface };
        }
        return null;
    }

    _findInterfaceWithIP(nodeId, ip) {
        const node = this.graph.getNode(nodeId);
        if (!node) return null;
        for (const [name, iface] of Object.entries(node.interfaces)) {
            if (iface.ip === ip) return { name, iface };
        }
        for (const [name, iface] of Object.entries(node.sviInterfaces || {})) {
            if (iface.ip === ip) return { name, iface };
        }
        return null;
    }

    _hasRouteFor(nodeId, ip) {
        const node = this.graph.getNode(nodeId);
        if (!node) return false;
        for (const route of node.routingTable) {
            if (ipInSubnet(ip, route.network, route.cidr)) return true;
        }
        return node.routingTable.some(r => r.network === '0.0.0.0' && r.cidr === 0);
    }

    _hasUsableDefaultGateway(nodeId) {
        const node = this.graph.getNode(nodeId);
        if (!node?.gateway || !isValidIP(node.gateway)) return false;

        const srcIf = this._getFirstConfiguredInterface(nodeId);
        if (!srcIf) return false;

        const cidr = parseInt(srcIf.iface.subnet) || 24;
        if (!isSameSubnet(srcIf.iface.ip, cidr, node.gateway)) return false;

        const gatewayNode = this.graph.findNodeByIP(node.gateway);
        if (!gatewayNode?.powered) return false;

        const path = this._bfsPath(nodeId, gatewayNode.id);
        if (!path) return false;

        return path.some(id => {
            const pathNode = this.graph.getNode(id);
            return pathNode && (pathNode.type === 'router' || pathNode.type === 'l3switch' || pathNode.type === 'firewall');
        });
    }

    _learnMACsAlongPath(path) {
        for (const nodeId of path) {
            const node = this.graph.getNode(nodeId);
            if (!node) continue;
            if (node.type === 'switch' || node.type === 'l3switch') {
                const neighbors = this.getNeighbors(nodeId);
                for (const n of neighbors) {
                    const nNode = this.graph.getNode(n.nodeId);
                    if (!nNode) continue;
                    for (const iface of Object.values(nNode.interfaces)) {
                        if (iface.mac) {
                            this.learnMAC(nodeId, n.localPort, iface.mac, iface.accessVlan || 1);
                        }
                    }
                }
            }
        }
    }

    // ─── Packet Log (Wireshark-lite) ───────────────

    _logPacket(entry) {
        entry.id = this.packetLog.length;
        entry.timestamp = entry.timestamp || Date.now();
        entry.details = entry.details || this._inferPacketDetails(entry);
        this.packetLog.push(entry);
        if (this.packetLog.length > this.maxLogEntries) {
            this.packetLog.shift();
        }
    }

    _inferPacketDetails(entry) {
        if (entry.type === 'ARP') return { opcode: 'request/reply', summary: entry.info || '' };
        if (entry.type === 'DHCP') return { srcPort: 68, dstPort: 67, messageType: this._inferDhcpMessage(entry.info), summary: entry.info || '' };
        if (entry.type === 'DNS') return { srcPort: 53000, dstPort: 53, queryType: 'A', responseCode: entry.info?.includes('NXDOMAIN') ? 'NXDOMAIN' : 'NoError', summary: entry.info || '' };
        if (entry.type === 'ICMP') return { icmpType: 'Echo', summary: entry.info || '' };
        if (entry.type === 'TCP/HTTP') return { protocol: 'HTTP', dstPort: 80, summary: entry.info || '' };
        return { summary: entry.info || '' };
    }

    _inferDhcpMessage(info = '') {
        if (/ack/i.test(info)) return 'DHCP ACK';
        if (/offer/i.test(info)) return 'DHCP Offer';
        if (/request/i.test(info)) return 'DHCP Request';
        if (/discover/i.test(info)) return 'DHCP Discover';
        return 'DHCP';
    }

    clearPacketLog() {
        this.packetLog = [];
    }

    // ─── Simulation Tick ───────────────────────────

    startSimulation() {
        if (this.tickInterval) return;
        this.graph.isPlaying = true;
        this.tickInterval = setInterval(() => this.tick(), 1000);
        this.graph.notify();
    }

    stopSimulation() {
        if (this.tickInterval) clearInterval(this.tickInterval);
        this.tickInterval = null;
        this.graph.isPlaying = false;
        this.graph.notify();
    }

    tick() {
        this.tickCount++;

        this.graph.nodes.forEach(node => {
            node.arpTable.forEach((entry, ip) => {
                entry.age = (entry.age || 0) + 1;
                if (entry.type === 'dynamic' && entry.age > 300) {
                    node.arpTable.delete(ip);
                }
            });
            node.macTable.forEach((entry, mac) => {
                entry.age = (entry.age || 0) + 1;
                if (entry.type === 'dynamic' && entry.age > 300) {
                    node.macTable.delete(mac);
                }
            });
        });

        this.graph.edges.forEach(edge => {
            const srcNode = this.graph.getNode(edge.source);
            const tgtNode = this.graph.getNode(edge.target);
            if (srcNode && tgtNode) {
                const srcIface = srcNode.interfaces[edge.sourcePort];
                const tgtIface = tgtNode.interfaces[edge.targetPort];
                if (srcIface && tgtIface) {
                    edge.status = (srcIface.state === 'up' && tgtIface.state === 'up' && srcNode.powered && tgtNode.powered) ? 'up' : 'down';
                }
            }
        });
    }

    // ─── Open CLI Modal ────────────────────────────

    openCLI(nodeId) {
        const node = this.graph.getNode(nodeId);
        if (!node) return;

        const cli = createCLI(node, () => this.graph.notify(), this);
        const vendorInfo = VENDORS[node.vendor] || VENDORS.generic;

        const modal = document.createElement('div');
        modal.className = 'sim-cli-modal';
        modal.innerHTML = `
            <div class="sim-cli-header" style="background: ${vendorInfo.accent}">
                <div class="sim-cli-header-left">
                    <span class="sim-cli-vendor-dot" style="background:${vendorInfo.color}"></span>
                    <span>${node.cliType === 'juniper' ? 'JunOS' : node.cliType === 'cisco' ? 'Cisco IOS' : 'Terminal'} — ${node.name} (${node.model})</span>
                </div>
                <div class="sim-cli-header-btns">
                    <button class="sim-cli-btn-min" title="Minimize"><i class="bi bi-dash"></i></button>
                    <button class="sim-cli-btn-max" title="Maximize"><i class="bi bi-square"></i></button>
                    <button class="sim-cli-close" title="Close"><i class="bi bi-x"></i></button>
                </div>
            </div>
            <div class="sim-cli-body">
                <div class="cli-output">
                    <div class="cli-welcome">${this._getWelcomeBanner(node)}</div>
                </div>
                <div class="sim-cli-input-line">
                    <span class="cli-prompt">${cli.getPrompt()}</span>
                    <input type="text" class="sim-cli-input" autofocus autocomplete="off" spellcheck="false">
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const outDiv = modal.querySelector('.cli-output');
        const promptSpan = modal.querySelector('.cli-prompt');
        const input = modal.querySelector('.sim-cli-input');

        const processCommand = (rawCmd) => {
            const cmdEcho = document.createElement('div');
            cmdEcho.className = 'cli-echo';
            cmdEcho.textContent = promptSpan.textContent + rawCmd;
            outDiv.appendChild(cmdEcho);

            if (!rawCmd) {
                promptSpan.textContent = cli.getPrompt();
                return;
            }

            let res = cli.execute(rawCmd);

            if (res && res.startsWith('__PING__')) {
                const targetIp = res.substring(8);
                this._handlePingOutput(outDiv, input, promptSpan, cli, targetIp, nodeId);
                return;
            }
            if (res && res.startsWith('__TRACEROUTE__')) {
                const targetIp = res.substring(14);
                this._handleTracerouteOutput(outDiv, input, promptSpan, cli, targetIp, nodeId);
                return;
            }
            if (res === '__CLEAR__') {
                outDiv.innerHTML = '';
                promptSpan.textContent = cli.getPrompt();
                return;
            }
            if (res === '__EXIT__') {
                modal.remove();
                return;
            }
            if (res && res.startsWith('__NSLOOKUP__')) {
                const hostname = res.substring(12);
                const result = this.resolveDNS(nodeId, hostname);
                res = result.ok ? `Server:  dns-server\nAddress: resolved\n\nName:    ${hostname}\nAddress: ${result.ip}` : `*** Can't find ${hostname}: Non-existent domain`;
            }
            if (res && res.startsWith('__SSH__')) {
                res = 'SSH connection simulated. Use device CLI directly.';
            }
            if (res && res.startsWith('__TELNET__')) {
                res = 'Telnet connection simulated. Use device CLI directly.';
            }
            if (res && res.startsWith('__CURL__')) {
                res = `curl: (7) Failed to connect - simulated response`;
            }

            if (res) {
                const resDiv = document.createElement('div');
                resDiv.className = 'cli-response';
                resDiv.textContent = res;
                resDiv.style.whiteSpace = 'pre-wrap';
                outDiv.appendChild(resDiv);
            }

            promptSpan.textContent = cli.getPrompt();
            modal.querySelector('.sim-cli-body').scrollTop = modal.querySelector('.sim-cli-body').scrollHeight;
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const cmd = input.value;
                input.value = '';
                processCommand(cmd);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prev = cli.getPrevHistory();
                if (prev !== undefined) input.value = prev;
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                const next = cli.getNextHistory();
                input.value = next || '';
            } else if (e.key === 'Tab') {
                e.preventDefault();
                const partial = input.value;
                const result = cli.tabComplete(partial);
                if (Array.isArray(result)) {
                    if (result.length === 1) {
                        input.value = result[0] + ' ';
                    } else if (result.length > 1) {
                        const resDiv = document.createElement('div');
                        resDiv.className = 'cli-response';
                        resDiv.textContent = result.join('  ');
                        outDiv.appendChild(resDiv);
                    }
                }
            } else if (e.key === 'l' && e.ctrlKey) {
                e.preventDefault();
                outDiv.innerHTML = '';
            }
        });

        modal.querySelector('.sim-cli-btn-max').addEventListener('click', () => {
            modal.classList.toggle('maximized');
        });
        modal.querySelector('.sim-cli-btn-min').addEventListener('click', () => {
            modal.classList.toggle('minimized');
        });
        modal.querySelector('.sim-cli-close').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', () => input.focus());
        makeDraggable(modal, modal.querySelector('.sim-cli-header'));
        
        setTimeout(() => input.focus(), 100);
    }

    _getWelcomeBanner(node) {
        if (node.cliType === 'cisco') {
            return `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n  Cisco IOS Software, Version 15.2\n  ${node.model}\n  Copyright (c) Cisco Systems, Inc.\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nPress RETURN to get started.\n`;
        }
        if (node.cliType === 'juniper') {
            return `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n  Juniper Networks JunOS 21.4R3\n  ${node.model}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${node.hostname}> `;
        }
        if (node.cliType === 'linux') {
            return `Last login: ${new Date().toDateString()} ${new Date().toLocaleTimeString()}\n${node.hostname}: ~$`;
        }
        if (node.cliType === 'windows') {
            return `Microsoft Windows [Version 10.0.19045]\n(c) Microsoft Corporation. All rights reserved.\n`;
        }
        return 'Press RETURN to get started.';
    }

    _handlePingOutput(outDiv, input, promptSpan, cli, targetIp, sourceId) {
        const request = this._parsePingRequest(targetIp, cli);
        const result = this.ping(sourceId, request.target);
        
        const headerDiv = document.createElement('div');
        headerDiv.className = 'cli-response';
        headerDiv.style.whiteSpace = 'pre-wrap';

        if (cli instanceof Object && cli.constructor.name === 'WindowsCLI') {
            headerDiv.textContent = `\nPinging ${request.target} with 32 bytes of data:${request.continuous ? '\nControl-C to stop.' : ''}\n`;
        } else if (cli.constructor.name === 'LinuxCLI') {
            headerDiv.textContent = `PING ${request.target} (${request.target}) 56(84) bytes of data.`;
        } else {
            headerDiv.textContent = `Type escape sequence to abort.\nSending ${request.count}, 100-byte ICMP Echos to ${request.target}, timeout is 2 seconds:`;
        }
        outDiv.appendChild(headerDiv);

        let count = 0;
        const total = request.continuous ? 100 : request.count;
        let stopped = false;
        input.readOnly = true;

        const stopPing = (e) => {
            if (e.ctrlKey && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                stopped = true;
            }
        };
        input.addEventListener('keydown', stopPing);

        const finish = () => {
            clearInterval(interval);
            input.removeEventListener('keydown', stopPing);
            input.readOnly = false;
            const statsDiv = document.createElement('div');
            statsDiv.className = 'cli-response';
            statsDiv.style.whiteSpace = 'pre-wrap';
            if (result.ok) {
                if (cli.constructor.name === 'LinuxCLI') {
                    statsDiv.textContent = `\n--- ${request.target} ping statistics ---\n${count} packets transmitted, ${count} received, 0% packet loss\nrtt min/avg/max = ${result.ms}/${result.ms+1}/${result.ms+3} ms`;
                } else if (cli.constructor.name === 'WindowsCLI') {
                    statsDiv.textContent = `${stopped ? '\n^C' : ''}\nPing statistics for ${request.target}:\n    Packets: Sent = ${count}, Received = ${count}, Lost = 0 (0% loss),\nApproximate round trip times in milli-seconds:\n    Minimum = ${result.ms}ms, Maximum = ${result.ms+3}ms, Average = ${result.ms+1}ms`;
                } else {
                    statsDiv.textContent = `\nSuccess rate is 100 percent (${count}/${count}), round-trip min/avg/max = ${result.ms}/${result.ms+1}/${result.ms+3} ms`;
                }
            } else {
                statsDiv.textContent = `\n${result.reason}`;
            }
            outDiv.appendChild(statsDiv);
            promptSpan.textContent = cli.getPrompt();
            outDiv.parentElement.scrollTop = outDiv.parentElement.scrollHeight;
        };

        const interval = setInterval(() => {
            if (stopped) {
                finish();
                return;
            }
            count++;
            const replyDiv = document.createElement('div');
            replyDiv.className = 'cli-response';
            if (result.ok) {
                const ms = result.ms + Math.floor(Math.random() * 3);
                if (cli.constructor.name === 'LinuxCLI') {
                    replyDiv.textContent = `64 bytes from ${request.target}: icmp_seq=${count} ttl=${result.ttl || 64} time=${ms} ms`;
                } else if (cli.constructor.name === 'WindowsCLI') {
                    replyDiv.textContent = `Reply from ${request.target}: bytes=${result.bytes || 32} time=${ms}ms TTL=${result.ttl || 128}`;
                } else {
                    replyDiv.textContent = `!`; // Cisco style
                    replyDiv.style.display = 'inline';
                }
            } else {
                if (cli.constructor.name === 'LinuxCLI') {
                    replyDiv.textContent = `From ${request.target}: Destination Host Unreachable`;
                } else if (cli.constructor.name === 'WindowsCLI') {
                    replyDiv.textContent = `Request timed out.`;
                } else {
                    replyDiv.textContent = `.`;
                    replyDiv.style.display = 'inline';
                }
            }
            outDiv.appendChild(replyDiv);
            outDiv.parentElement.scrollTop = outDiv.parentElement.scrollHeight;

            if (count >= total) {
                finish();
            }
        }, 500);
    }

    _parsePingRequest(payload, cli) {
        try {
            const parsed = JSON.parse(payload);
            return {
                target: parsed.target,
                count: parsed.count || (cli.constructor.name === 'CiscoCLI' ? 5 : 4),
                continuous: !!parsed.continuous
            };
        } catch {
            return {
                target: payload,
                count: cli.constructor.name === 'CiscoCLI' ? 5 : 4,
                continuous: false
            };
        }
    }

    _handleTracerouteOutput(outDiv, input, promptSpan, cli, targetIp, sourceId) {
        const result = this.traceroute(sourceId, targetIp);

        const headerDiv = document.createElement('div');
        headerDiv.className = 'cli-response';
        headerDiv.style.whiteSpace = 'pre-wrap';
        headerDiv.textContent = `Tracing route to ${targetIp} over a maximum of 30 hops:\n`;
        outDiv.appendChild(headerDiv);

        if (!result.hops || result.hops.length === 0) {
            const errDiv = document.createElement('div');
            errDiv.className = 'cli-response';
            errDiv.textContent = result.reason || 'Trace failed.';
            outDiv.appendChild(errDiv);
            promptSpan.textContent = cli.getPrompt();
            return;
        }

        let i = 0;
        const interval = setInterval(() => {
            if (i >= result.hops.length) {
                clearInterval(interval);
                const doneDiv = document.createElement('div');
                doneDiv.className = 'cli-response';
                doneDiv.textContent = '\nTrace complete.';
                outDiv.appendChild(doneDiv);
                promptSpan.textContent = cli.getPrompt();
                outDiv.parentElement.scrollTop = outDiv.parentElement.scrollHeight;
                return;
            }
            const hop = result.hops[i];
            const hopDiv = document.createElement('div');
            hopDiv.className = 'cli-response';
            hopDiv.textContent = `  ${String(hop.hop).padStart(2)}  ${String(hop.ms).padStart(4)} ms   ${String(hop.ms + 1).padStart(4)} ms   ${String(hop.ms + 2).padStart(4)} ms   ${hop.ip} [${hop.name}]`;
            outDiv.appendChild(hopDiv);
            outDiv.parentElement.scrollTop = outDiv.parentElement.scrollHeight;
            i++;
        }, 300);
    }

    // ─── Open Desktop ──────────────────────────────

    openDesktop(nodeId) {
        const node = this.graph.getNode(nodeId);
        if (!node) return;
        const desktop = new SimDesktop(node, this);
        desktop.render();
    }

    handlePackageChange(nodeId, appId, isInstall) {
        const node = this.graph.getNode(nodeId);
        if (!node) return;
        if (!node._services) node._services = {};
        
        if (appId === 'nginx' || appId === 'apache2') {
            node.services = node.services || {};
            node.services.http = isInstall;
            node.httpEnabled = isInstall;
            if (isInstall) node._services[appId] = 'active';
            else delete node._services[appId];
        } else if (['mysql-server', 'postgresql', 'snmpd', 'docker.io'].includes(appId)) {
            if (isInstall) node._services[appId] = 'active';
            else delete node._services[appId];
        }
        this.graph.notify();
    }
}
