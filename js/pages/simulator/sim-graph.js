// sim-graph.js

import { DEVICE_TEMPLATES, CABLE_TYPES, getPortDisplayName } from './sim-device-templates.js';

export class NetworkGraph {
    constructor() {
        this.nodes = new Map();
        this.edges = new Map();
        this.annotations = []; // text labels on canvas
        this.counters = {};
        this.subscribers = [];
        this.isPlaying = false;
        this.simulationSpeed = 1; // 0.5x, 1x, 2x, 4x
    }

    subscribe(cb) {
        this.subscribers.push(cb);
    }

    notify() {
        this.subscribers.forEach(cb => cb(this));
    }

    // ─── Node Management ───────────────────────────

    addNode(templateId, x, y) {
        const template = DEVICE_TEMPLATES[templateId];
        if (!template) {
            console.error(`Unknown template: ${templateId}`);
            return null;
        }

        const typeKey = `${template.vendor}_${template.type}`;
        if (!this.counters[typeKey]) this.counters[typeKey] = 1;
        const num = this.counters[typeKey]++;
        
        const id = `node_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        
        let name;
        if (template.type === 'pc') name = `PC${num}`;
        else if (template.type === 'server') name = `Server${num}`;
        else if (template.type === 'cloud') name = `Cloud${num}`;
        else if (template.type === 'wireless_ap') name = `AP${num}`;
        else if (template.vendor === 'cisco') {
            if (template.type === 'router') name = `Router${num}`;
            else if (template.type === 'switch' || template.type === 'l3switch') name = `Switch${num}`;
            else if (template.type === 'firewall') name = `ASA${num}`;
            else name = `Device${num}`;
        } else if (template.vendor === 'juniper') {
            if (template.type === 'router') name = `vMX${num}`;
            else if (template.type === 'switch') name = `vEX${num}`;
            else if (template.type === 'firewall') name = `vSRX${num}`;
            else name = `Device${num}`;
        } else if (template.vendor === 'arista') {
            name = `Arista${num}`;
        } else {
            name = `Device${num}`;
        }

        const node = {
            id,
            templateId,
            vendor: template.vendor,
            model: template.model,
            type: template.type,
            os: template.os || null,
            cliType: template.cliType,
            icon: template.icon,
            features: [...template.features],
            hasWebUI: template.hasWebUI,
            name,
            hostname: name,
            x,
            y,
            powered: true,

            interfaces: template.interfaces(),
            sviInterfaces: template.sviInterfaces ? template.sviInterfaces() : {},

            vlans: { 1: { name: 'default' } },
            macTable: new Map(),    // Map<mac, { port, vlan, type: 'dynamic'|'static', age: number }>
            stpConfig: {
                priority: 32768,
                rootBridge: false,
                rootPort: null,
                portStates: {} // portName -> 'forwarding' | 'blocking' | 'listening' | 'learning' | 'disabled'
            },

            routingTable: [],       // [{ network, mask, cidr, nextHop, interface, protocol, metric, ad }]
            arpTable: new Map(),    // Map<ip, { mac, interface, type: 'dynamic'|'static', age: number }>
            gateway: '',

            ospfConfig: { enabled: false, routerId: '', networks: [], areas: {}, neighbors: [] },
            eigrpConfig: { enabled: false, asNumber: null, networks: [] },
            bgpConfig: { enabled: false, asNumber: null, neighbors: [], networks: [] },

            aclRules: [],           // [{ id, type: 'standard'|'extended', entries: [] }]
            natConfig: { insideIfaces: [], outsideIfaces: [], pools: [], staticMaps: [], overload: false },

            dhcpPools: [],          // [{ name, network, mask, defaultRouter, dns, excludeStart, excludeEnd, leases: Map }]
            dnsRecords: [],         // [{ name, type: 'A'|'CNAME'|'MX', value }]
            httpEnabled: false,
            ftpEnabled: false,
            syslogMessages: [],

            services: {
                dhcpClient: false,
                dhcpAssignedIp: null,
            },

            securityZones: {},
            firewallPolicies: [],

            wirelessConfig: template.wirelessConfig ? { ...template.wirelessConfig } : null,

            filesystem: {
                '/': {
                    type: 'dir',
                    children: {
                        'home': { type: 'dir', children: {
                            'user': { type: 'dir', children: {
                                'notes.txt': { type: 'file', content: 'Welcome to the Network Simulator!\nUse the terminal to configure networking.' },
                                'configs': { type: 'dir', children: {} }
                            }}
                        }},
                        'etc': { type: 'dir', children: {
                            'hosts': { type: 'file', content: '127.0.0.1\tlocalhost\n' },
                            'resolv.conf': { type: 'file', content: '# DNS resolver config\n' },
                            'network': { type: 'dir', children: {
                                'interfaces': { type: 'file', content: '# Network interface configuration\nauto eth0\niface eth0 inet dhcp\n' }
                            }}
                        }},
                        'var': { type: 'dir', children: {
                            'log': { type: 'dir', children: {
                                'syslog': { type: 'file', content: '' }
                            }}
                        }},
                        'tmp': { type: 'dir', children: {} }
                    }
                }
            },

            commandHistory: [],

            packetsReceived: 0,
            packetsSent: 0,
            packetsDropped: 0,
        };

        node.portShortcuts = template.portShortcuts || {};

        this.nodes.set(id, node);
        this.notify();
        return node;
    }

    removeNode(id) {
        for (const [edgeId, edge] of this.edges.entries()) {
            if (edge.source === id || edge.target === id) {
                this.edges.delete(edgeId);
            }
        }
        this.nodes.delete(id);
        this.notify();
    }

    updateNode(id, updates) {
        const node = this.nodes.get(id);
        if (node) {
            Object.assign(node, updates);
            this.notify();
        }
    }

    getNode(id) {
        return this.nodes.get(id);
    }

    // ─── Edge Management ───────────────────────────

    addEdge(sourceId, sourcePort, targetId, targetPort, cableType = 'copper_straight') {
        if (sourceId === targetId) return null;

        for (const edge of this.edges.values()) {
            if ((edge.source === sourceId && edge.sourcePort === sourcePort) ||
                (edge.target === sourceId && edge.targetPort === sourcePort) ||
                (edge.source === targetId && edge.sourcePort === targetPort) ||
                (edge.target === targetId && edge.targetPort === targetPort)) {
                return null;
            }
        }

        const id = `edge_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const cable = CABLE_TYPES[cableType] || CABLE_TYPES.copper_straight;

        const edge = {
            id,
            source: sourceId,
            sourcePort,
            target: targetId,
            targetPort,
            cableType,
            cableColor: cable.color,
            cableDash: cable.dash,
            speed: cable.speed,
            status: 'up',
            bandwidth: 0,
        };

        this.edges.set(id, edge);
        this.notify();
        return edge;
    }

    removeEdge(id) {
        this.edges.delete(id);
        this.notify();
    }

    // ─── Queries ───────────────────────────────────

    getAvailablePorts(nodeId) {
        const node = this.getNode(nodeId);
        if (!node) return [];
        const used = new Set();
        this.edges.forEach(e => {
            if (e.source === nodeId) used.add(e.sourcePort);
            if (e.target === nodeId) used.add(e.targetPort);
        });
        return Object.keys(node.interfaces).filter(p => !used.has(p));
    }

    getConnectedEdges(nodeId) {
        const edges = [];
        this.edges.forEach((e, id) => {
            if (e.source === nodeId || e.target === nodeId) edges.push(e);
        });
        return edges;
    }

    getNeighborOnPort(nodeId, port) {
        for (const edge of this.edges.values()) {
            if (edge.source === nodeId && edge.sourcePort === port) {
                return { nodeId: edge.target, port: edge.targetPort, edge };
            }
            if (edge.target === nodeId && edge.targetPort === port) {
                return { nodeId: edge.source, port: edge.sourcePort, edge };
            }
        }
        return null;
    }

    // ─── Topology Save / Load ──────────────────────

    exportTopology() {
        const data = {
            version: 2,
            timestamp: Date.now(),
            counters: { ...this.counters },
            nodes: [],
            edges: [],
            annotations: [...this.annotations]
        };

        this.nodes.forEach((node, id) => {
            const serialNode = { ...node };
            serialNode.macTable = Object.fromEntries(node.macTable);
            serialNode.arpTable = Object.fromEntries(node.arpTable);
            serialNode._installedPackages = node._installedPackages instanceof Set
                ? Array.from(node._installedPackages)
                : (node._installedPackages || []);
            serialNode.dhcpPools = node.dhcpPools.map(p => ({
                ...p,
                leases: p.leases ? Object.fromEntries(p.leases) : {}
            }));
            data.nodes.push(serialNode);
        });

        this.edges.forEach((edge, id) => {
            data.edges.push({ ...edge });
        });

        return JSON.stringify(data, null, 2);
    }

    importTopology(jsonStr) {
        try {
            const data = JSON.parse(jsonStr);
            this.clear();
            this.counters = data.counters || {};
            this.annotations = data.annotations || [];

            for (const nodeData of data.nodes) {
                nodeData.macTable = new Map(Object.entries(nodeData.macTable || {}));
                nodeData.arpTable = new Map(Object.entries(nodeData.arpTable || {}));
                nodeData._installedPackages = new Set(nodeData._installedPackages || []);
                nodeData.dhcpPools = (nodeData.dhcpPools || []).map(p => ({
                    ...p,
                    leases: new Map(Object.entries(p.leases || {}))
                }));
                this.nodes.set(nodeData.id, nodeData);
            }

            for (const edgeData of data.edges) {
                this.edges.set(edgeData.id, edgeData);
            }

            this.notify();
            return true;
        } catch (e) {
            console.error('Import failed:', e);
            return false;
        }
    }

    saveToLocalStorage(name = 'default') {
        try {
            localStorage.setItem(`sim_topology_${name}`, this.exportTopology());
            return true;
        } catch (e) {
            console.error('Save failed:', e);
            return false;
        }
    }

    loadFromLocalStorage(name = 'default') {
        const data = localStorage.getItem(`sim_topology_${name}`);
        if (!data) return false;
        return this.importTopology(data);
    }

    getSavedTopologies() {
        const topologies = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('sim_topology_')) {
                topologies.push(key.replace('sim_topology_', ''));
            }
        }
        return topologies;
    }

    // ─── Utility ───────────────────────────────────

    clear() {
        this.nodes.clear();
        this.edges.clear();
        this.annotations = [];
        this.counters = {};
        this.notify();
    }

    getNodesByType(type) {
        const result = [];
        this.nodes.forEach(n => { if (n.type === type) result.push(n); });
        return result;
    }

    findNodeByIP(ip) {
        for (const node of this.nodes.values()) {
            for (const iface of Object.values(node.interfaces)) {
                if (iface.ip === ip && iface.state === 'up') return node;
            }
            for (const svi of Object.values(node.sviInterfaces || {})) {
                if (svi.ip === ip && svi.state === 'up') return node;
            }
        }
        return null;
    }

    findNodeByMAC(mac) {
        const normalizedMac = mac.toLowerCase();
        for (const node of this.nodes.values()) {
            for (const iface of Object.values(node.interfaces)) {
                if (iface.mac && iface.mac.toLowerCase() === normalizedMac) return node;
            }
        }
        return null;
    }

    getPrimaryIP(nodeId) {
        const node = this.getNode(nodeId);
        if (!node) return null;
        for (const iface of Object.values(node.interfaces)) {
            if (iface.ip) return iface.ip;
        }
        for (const svi of Object.values(node.sviInterfaces || {})) {
            if (svi.ip) return svi.ip;
        }
        return null;
    }

    getInterfaceByIP(nodeId, ip) {
        const node = this.getNode(nodeId);
        if (!node) return null;
        for (const [name, iface] of Object.entries(node.interfaces)) {
            if (iface.ip === ip) return { name, iface };
        }
        for (const [name, svi] of Object.entries(node.sviInterfaces || {})) {
            if (svi.ip === ip) return { name, iface: svi };
        }
        return null;
    }
}
