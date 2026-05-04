// sim-lab-engine.js
// Lab loading, validation, grading, and progress tracking engine

import { LABS } from './sim-labs.js';

export class LabEngine {
    constructor(graph, engine) {
        this.graph = graph;
        this.engine = engine;
        this.currentLab = null;
        this.taskResults = [];
        this.subscribers = [];
        this.hintsRevealed = {}; // taskIndex -> hint level revealed
    }

    subscribe(cb) { this.subscribers.push(cb); }
    notify() { this.subscribers.forEach(cb => cb()); }

    // ─── Lab Catalog ──────────────────────────────

    getAllLabs() { return LABS; }

    getLabsByCategory(category) {
        return LABS.filter(l => l.category === category);
    }

    getLabsByCert(cert) {
        return LABS.filter(l => l.certification === cert);
    }

    getLabById(id) {
        return LABS.find(l => l.id === id);
    }

    getCategories() {
        return [...new Set(LABS.map(l => l.certification))];
    }

    // ─── Progress Tracking ────────────────────────

    getProgress() {
        try {
            return JSON.parse(localStorage.getItem('sim_lab_progress') || '{}');
        } catch { return {}; }
    }

    saveProgress(labId, score, total) {
        const progress = this.getProgress();
        const existing = progress[labId];
        // Only update if better score
        if (!existing || score > existing.score) {
            progress[labId] = { score, total, completedAt: Date.now(), attempts: (existing?.attempts || 0) + 1 };
        } else {
            progress[labId].attempts = (existing?.attempts || 0) + 1;
        }
        localStorage.setItem('sim_lab_progress', JSON.stringify(progress));
    }

    getLabProgress(labId) {
        return this.getProgress()[labId] || null;
    }

    getOverallStats() {
        const progress = this.getProgress();
        const total = LABS.length;
        let completed = 0;
        let perfect = 0;
        for (const [id, p] of Object.entries(progress)) {
            if (p.score > 0) completed++;
            if (p.score === p.total) perfect++;
        }
        return { total, completed, perfect };
    }

    // ─── Lab Loading ──────────────────────────────

    loadLab(labId) {
        const lab = this.getLabById(labId);
        if (!lab) return false;

        this.currentLab = lab;
        this.taskResults = lab.tasks.map(() => ({ status: 'pending', message: '' }));
        this.hintsRevealed = {};

        // Clear current topology
        this.graph.clear();

        // Build the topology from the lab definition
        const nodeIdMap = {}; // lab node reference -> actual node ID

        for (const nodeDef of lab.topology.nodes) {
            const node = this.graph.addNode(nodeDef.template, nodeDef.x, nodeDef.y);
            if (node) {
                nodeIdMap[nodeDef.id] = node.id;
                if (nodeDef.name) {
                    node.name = nodeDef.name;
                    node.hostname = nodeDef.name;
                }
                // Apply any pre-configuration
                if (nodeDef.preConfig) {
                    this._applyPreConfig(node, nodeDef.preConfig);
                }
            }
        }

        // Store the node ID mapping for validation
        this.currentLab._nodeIdMap = nodeIdMap;

        // Apply topology-level preConfig (keyed by lab node ref IDs)
        if (lab.topology.preConfig) {
            for (const [ref, config] of Object.entries(lab.topology.preConfig)) {
                const actualId = nodeIdMap[ref];
                if (actualId) {
                    const node = this.graph.getNode(actualId);
                    if (node) this._applyPreConfig(node, config);
                }
            }
        }

        // Build edges
        for (const edgeDef of (lab.topology.edges || [])) {
            const srcId = nodeIdMap[edgeDef.source];
            const tgtId = nodeIdMap[edgeDef.target];
            if (srcId && tgtId) {
                this.graph.addEdge(srcId, edgeDef.sourcePort, tgtId, edgeDef.targetPort, edgeDef.cableType || 'copper_straight');
            }
        }

        this.graph.notify();
        this.notify();
        return true;
    }

    _applyPreConfig(node, config) {
        if (config.interfaces) {
            for (const [ifName, ifConfig] of Object.entries(config.interfaces)) {
                const iface = node.interfaces[ifName];
                if (iface) {
                    if (ifConfig.ip !== undefined) iface.ip = ifConfig.ip;
                    if (ifConfig.subnet !== undefined) iface.subnet = ifConfig.subnet;
                    if (ifConfig.state !== undefined) iface.state = ifConfig.state;
                    if (ifConfig.switchportMode !== undefined) iface.switchportMode = ifConfig.switchportMode;
                    if (ifConfig.accessVlan !== undefined) iface.accessVlan = ifConfig.accessVlan;
                    if (ifConfig.description !== undefined) iface.description = ifConfig.description;
                }
            }
        }
        if (config.gateway !== undefined) node.gateway = config.gateway;
        if (config.hostname !== undefined) { node.hostname = config.hostname; node.name = config.hostname; }
        if (config.vlans) {
            for (const [vid, vlan] of Object.entries(config.vlans)) {
                node.vlans[vid] = vlan;
            }
        }
        if (config.routingTable) {
            node.routingTable = config.routingTable;
        }
        if (config.ospfConfig) {
            Object.assign(node.ospfConfig, config.ospfConfig);
        }
        if (config.eigrpConfig) {
            Object.assign(node.eigrpConfig, config.eigrpConfig);
        }
        if (config.bgpConfig) {
            Object.assign(node.bgpConfig, config.bgpConfig);
        }
        if (config.dhcpPools) {
            node.dhcpPools = config.dhcpPools.map(p => ({ ...p, leases: new Map() }));
        }
        if (config.dnsRecords) {
            node.dnsRecords = config.dnsRecords;
        }
        if (config.aclRules) {
            node.aclRules = config.aclRules;
        }
        if (config.natConfig) {
            Object.assign(node.natConfig, config.natConfig);
        }
    }

    // ─── Validation Engine ────────────────────────

    checkTask(taskIndex) {
        if (!this.currentLab) return { status: 'error', message: 'No lab loaded' };
        const task = this.currentLab.tasks[taskIndex];
        if (!task) return { status: 'error', message: 'Invalid task' };

        const results = [];
        for (const check of task.checks) {
            const result = this._runCheck(check);
            results.push(result);
        }

        const allPassed = results.every(r => r.passed);
        const failedChecks = results.filter(r => !r.passed);

        const status = allPassed ? 'passed' : 'failed';
        const message = allPassed
            ? '✓ All checks passed!'
            : `✗ ${failedChecks.length} check(s) failed:\n${failedChecks.map(r => `  • ${r.message}`).join('\n')}`;

        this.taskResults[taskIndex] = { status, message, details: results };
        this.notify();
        return { status, message, details: results };
    }

    checkAllTasks() {
        if (!this.currentLab) return { score: 0, total: 0, results: [] };

        const results = [];
        let score = 0;

        for (let i = 0; i < this.currentLab.tasks.length; i++) {
            const result = this.checkTask(i);
            results.push(result);
            if (result.status === 'passed') score++;
        }

        const total = this.currentLab.tasks.length;

        // Save progress
        this.saveProgress(this.currentLab.id, score, total);

        this.notify();
        return { score, total, results, perfect: score === total };
    }

    _runCheck(check) {
        const nodeId = this._resolveNodeRef(check.node);
        if (!nodeId && check.type !== 'ping_success' && check.type !== 'can_reach') {
            return { passed: false, message: `Device "${check.node}" not found in topology` };
        }

        const node = nodeId ? this.graph.getNode(nodeId) : null;

        switch (check.type) {
            case 'hostname_set':
                return this._checkHostname(node, check);
            case 'interface_ip':
                return this._checkInterfaceIP(node, check);
            case 'interface_state':
                return this._checkInterfaceState(node, check);
            case 'interface_description':
                return this._checkInterfaceDescription(node, check);
            case 'route_exists':
                return this._checkRouteExists(node, check);
            case 'default_route':
                return this._checkDefaultRoute(node, check);
            case 'gateway_set':
                return this._checkGateway(node, check);
            case 'vlan_exists':
                return this._checkVlanExists(node, check);
            case 'vlan_port_assignment':
                return this._checkVlanPort(node, check);
            case 'trunk_mode':
                return this._checkTrunkMode(node, check);
            case 'ospf_enabled':
                return this._checkOspfEnabled(node, check);
            case 'ospf_network':
                return this._checkOspfNetwork(node, check);
            case 'ospf_router_id':
                return this._checkOspfRouterId(node, check);
            case 'eigrp_enabled':
                return this._checkEigrpEnabled(node, check);
            case 'eigrp_network':
                return this._checkEigrpNetwork(node, check);
            case 'bgp_enabled':
                return this._checkBgpEnabled(node, check);
            case 'bgp_neighbor':
                return this._checkBgpNeighbor(node, check);
            case 'bgp_network':
                return this._checkBgpNetwork(node, check);
            case 'acl_exists':
                return this._checkAclExists(node, check);
            case 'acl_entry':
                return this._checkAclEntry(node, check);
            case 'dhcp_pool':
                return this._checkDhcpPool(node, check);
            case 'nat_inside':
                return this._checkNatInside(node, check);
            case 'nat_outside':
                return this._checkNatOutside(node, check);
            case 'nat_static':
                return this._checkNatStatic(node, check);
            case 'stp_priority':
                return this._checkStpPriority(node, check);
            case 'ping_success':
                return this._checkPing(check);
            case 'can_reach':
                return this._checkCanReach(check);
            case 'static_route':
                return this._checkStaticRoute(node, check);
            case 'switchport_mode':
                return this._checkSwitchportMode(node, check);
            default:
                return { passed: false, message: `Unknown check type: ${check.type}` };
        }
    }

    _resolveNodeRef(ref) {
        if (!ref || !this.currentLab?._nodeIdMap) return null;
        return this.currentLab._nodeIdMap[ref] || null;
    }

    // ─── Individual Check Implementations ─────────

    _checkHostname(node, check) {
        const expected = check.expected.toLowerCase();
        const actual = (node.hostname || node.name || '').toLowerCase();
        return {
            passed: actual === expected,
            message: actual === expected
                ? `Hostname is correctly set to "${check.expected}"`
                : `Hostname should be "${check.expected}" but is "${node.hostname || node.name}"`
        };
    }

    _checkInterfaceIP(node, check) {
        const allIf = { ...node.interfaces, ...(node.sviInterfaces || {}) };
        const iface = allIf[check.interface];
        if (!iface) return { passed: false, message: `Interface ${check.interface} not found` };

        const ipMatch = iface.ip === check.ip;
        const subnetMatch = !check.subnet || String(iface.subnet) === String(check.subnet);

        return {
            passed: ipMatch && subnetMatch,
            message: ipMatch && subnetMatch
                ? `${check.interface} correctly configured with ${check.ip}/${check.subnet || iface.subnet}`
                : `${check.interface} should have IP ${check.ip}${check.subnet ? '/' + check.subnet : ''} but has ${iface.ip || 'none'}${iface.subnet ? '/' + iface.subnet : ''}`
        };
    }

    _checkInterfaceState(node, check) {
        const allIf = { ...node.interfaces, ...(node.sviInterfaces || {}) };
        const iface = allIf[check.interface];
        if (!iface) return { passed: false, message: `Interface ${check.interface} not found` };

        return {
            passed: iface.state === check.expected,
            message: iface.state === check.expected
                ? `${check.interface} is ${check.expected}`
                : `${check.interface} should be ${check.expected} but is ${iface.state}`
        };
    }

    _checkInterfaceDescription(node, check) {
        const iface = node.interfaces[check.interface];
        if (!iface) return { passed: false, message: `Interface ${check.interface} not found` };
        const actual = (iface.description || '').toLowerCase();
        const expected = check.expected.toLowerCase();
        return {
            passed: actual.includes(expected),
            message: actual.includes(expected)
                ? `${check.interface} description is set`
                : `${check.interface} needs a description containing "${check.expected}"`
        };
    }

    _checkRouteExists(node, check) {
        const found = node.routingTable.some(r =>
            r.network === check.network && String(r.cidr) === String(check.cidr)
        );
        return {
            passed: found,
            message: found
                ? `Route to ${check.network}/${check.cidr} exists`
                : `Route to ${check.network}/${check.cidr} not found in routing table`
        };
    }

    _checkDefaultRoute(node, check) {
        const found = node.routingTable.some(r =>
            r.network === '0.0.0.0' && (r.cidr === 0 || r.cidr === '0')
        );
        return {
            passed: found,
            message: found
                ? `Default route (0.0.0.0/0) is configured`
                : `Default route (0.0.0.0/0) not found`
        };
    }

    _checkGateway(node, check) {
        return {
            passed: node.gateway === check.expected,
            message: node.gateway === check.expected
                ? `Default gateway is ${check.expected}`
                : `Default gateway should be ${check.expected} but is "${node.gateway || 'not set'}"`
        };
    }

    _checkVlanExists(node, check) {
        const exists = node.vlans[check.vlanId] !== undefined;
        const nameMatch = !check.name || (node.vlans[check.vlanId]?.name || '').toLowerCase() === check.name.toLowerCase();
        return {
            passed: exists && nameMatch,
            message: exists && nameMatch
                ? `VLAN ${check.vlanId}${check.name ? ' (' + check.name + ')' : ''} exists`
                : exists ? `VLAN ${check.vlanId} exists but name should be "${check.name}"` : `VLAN ${check.vlanId} not found`
        };
    }

    _checkVlanPort(node, check) {
        const iface = node.interfaces[check.interface];
        if (!iface) return { passed: false, message: `Interface ${check.interface} not found` };
        const inVlan = String(iface.accessVlan) === String(check.vlanId);
        return {
            passed: inVlan,
            message: inVlan
                ? `${check.interface} is in VLAN ${check.vlanId}`
                : `${check.interface} should be in VLAN ${check.vlanId} but is in VLAN ${iface.accessVlan || 1}`
        };
    }

    _checkTrunkMode(node, check) {
        const iface = node.interfaces[check.interface];
        if (!iface) return { passed: false, message: `Interface ${check.interface} not found` };
        return {
            passed: iface.switchportMode === 'trunk',
            message: iface.switchportMode === 'trunk'
                ? `${check.interface} is configured as trunk`
                : `${check.interface} should be trunk but is ${iface.switchportMode || 'access'}`
        };
    }

    _checkSwitchportMode(node, check) {
        const iface = node.interfaces[check.interface];
        if (!iface) return { passed: false, message: `Interface ${check.interface} not found` };
        return {
            passed: iface.switchportMode === check.expected,
            message: iface.switchportMode === check.expected
                ? `${check.interface} is in ${check.expected} mode`
                : `${check.interface} should be ${check.expected} but is ${iface.switchportMode || 'none'}`
        };
    }

    _checkOspfEnabled(node, check) {
        return {
            passed: node.ospfConfig.enabled === true,
            message: node.ospfConfig.enabled ? 'OSPF is enabled' : 'OSPF is not enabled'
        };
    }

    _checkOspfNetwork(node, check) {
        const found = node.ospfConfig.networks.some(n =>
            n.network === check.network && n.wildcard === check.wildcard && String(n.area) === String(check.area)
        );
        return {
            passed: found,
            message: found
                ? `OSPF network ${check.network} ${check.wildcard} area ${check.area} is configured`
                : `OSPF network statement for ${check.network} ${check.wildcard} area ${check.area} not found`
        };
    }

    _checkOspfRouterId(node, check) {
        return {
            passed: node.ospfConfig.routerId === check.expected,
            message: node.ospfConfig.routerId === check.expected
                ? `OSPF Router ID is ${check.expected}`
                : `OSPF Router ID should be ${check.expected} but is "${node.ospfConfig.routerId || 'not set'}"`
        };
    }

    _checkEigrpEnabled(node, check) {
        const asMatch = !check.asNumber || node.eigrpConfig.asNumber === check.asNumber;
        return {
            passed: node.eigrpConfig.enabled && asMatch,
            message: node.eigrpConfig.enabled && asMatch
                ? `EIGRP AS ${check.asNumber || ''} is enabled`
                : `EIGRP${check.asNumber ? ' AS ' + check.asNumber : ''} is not enabled`
        };
    }

    _checkEigrpNetwork(node, check) {
        const found = node.eigrpConfig.networks.some(n => n === check.network);
        return {
            passed: found,
            message: found
                ? `EIGRP network ${check.network} is advertised`
                : `EIGRP network ${check.network} not found`
        };
    }

    _checkBgpEnabled(node, check) {
        const asMatch = !check.asNumber || node.bgpConfig.asNumber === check.asNumber;
        return {
            passed: node.bgpConfig.enabled && asMatch,
            message: node.bgpConfig.enabled && asMatch
                ? `BGP AS ${check.asNumber || ''} is enabled`
                : `BGP${check.asNumber ? ' AS ' + check.asNumber : ''} is not enabled`
        };
    }

    _checkBgpNeighbor(node, check) {
        const found = node.bgpConfig.neighbors.some(n =>
            n.ip === check.neighborIp && (!check.remoteAs || n.remoteAs === check.remoteAs)
        );
        return {
            passed: found,
            message: found
                ? `BGP neighbor ${check.neighborIp} remote-as ${check.remoteAs || '?'} configured`
                : `BGP neighbor ${check.neighborIp}${check.remoteAs ? ' remote-as ' + check.remoteAs : ''} not found`
        };
    }

    _checkBgpNetwork(node, check) {
        const found = node.bgpConfig.networks.some(n => n.network === check.network);
        return {
            passed: found,
            message: found
                ? `BGP network ${check.network} is advertised`
                : `BGP network ${check.network} not found`
        };
    }

    _checkAclExists(node, check) {
        const found = node.aclRules.some(a => a.id === check.aclId);
        return {
            passed: found,
            message: found
                ? `ACL ${check.aclId} exists`
                : `ACL ${check.aclId} not found`
        };
    }

    _checkAclEntry(node, check) {
        const acl = node.aclRules.find(a => a.id === check.aclId);
        if (!acl) return { passed: false, message: `ACL ${check.aclId} not found` };
        const found = acl.entries.some(e =>
            e.action === check.action && e.source === check.source
        );
        return {
            passed: found,
            message: found
                ? `ACL ${check.aclId} has ${check.action} entry for ${check.source}`
                : `ACL ${check.aclId} missing ${check.action} entry for ${check.source}`
        };
    }

    _checkDhcpPool(node, check) {
        const pool = node.dhcpPools.find(p => {
            if (check.name && p.name !== check.name) return false;
            if (check.network && p.network !== check.network) return false;
            return true;
        });
        if (!pool) return { passed: false, message: `DHCP pool${check.name ? ' "' + check.name + '"' : ''} not found` };

        const checks = [];
        if (check.network && pool.network !== check.network) checks.push(`network should be ${check.network}`);
        if (check.mask && pool.mask !== check.mask) checks.push(`mask should be ${check.mask}`);
        if (check.defaultRouter && pool.defaultRouter !== check.defaultRouter) checks.push(`default-router should be ${check.defaultRouter}`);
        if (check.dns && pool.dns !== check.dns) checks.push(`dns-server should be ${check.dns}`);

        return {
            passed: checks.length === 0,
            message: checks.length === 0
                ? `DHCP pool "${pool.name}" is correctly configured`
                : `DHCP pool issues: ${checks.join('; ')}`
        };
    }

    _checkNatInside(node, check) {
        const found = node.natConfig.insideIfaces.includes(check.interface);
        return {
            passed: found,
            message: found
                ? `${check.interface} is configured as NAT inside`
                : `${check.interface} should be configured as NAT inside`
        };
    }

    _checkNatOutside(node, check) {
        const found = node.natConfig.outsideIfaces.includes(check.interface);
        return {
            passed: found,
            message: found
                ? `${check.interface} is configured as NAT outside`
                : `${check.interface} should be configured as NAT outside`
        };
    }

    _checkNatStatic(node, check) {
        const found = node.natConfig.staticMaps.some(m =>
            m.inside === check.inside && m.outside === check.outside
        );
        return {
            passed: found,
            message: found
                ? `Static NAT ${check.inside} → ${check.outside} configured`
                : `Static NAT ${check.inside} → ${check.outside} not found`
        };
    }

    _checkStpPriority(node, check) {
        return {
            passed: node.stpConfig.priority === check.expected,
            message: node.stpConfig.priority === check.expected
                ? `STP priority is ${check.expected}`
                : `STP priority should be ${check.expected} but is ${node.stpConfig.priority}`
        };
    }

    _checkStaticRoute(node, check) {
        const found = node.routingTable.some(r =>
            r.network === check.network &&
            String(r.cidr) === String(check.cidr) &&
            r.protocol === 'static' &&
            (!check.nextHop || r.nextHop === check.nextHop)
        );
        return {
            passed: found,
            message: found
                ? `Static route to ${check.network}/${check.cidr}${check.nextHop ? ' via ' + check.nextHop : ''} exists`
                : `Static route to ${check.network}/${check.cidr}${check.nextHop ? ' via ' + check.nextHop : ''} not found`
        };
    }

    _checkPing(check) {
        const srcId = this._resolveNodeRef(check.source);
        const targetIp = check.targetIp;
        if (!srcId) return { passed: false, message: `Source device "${check.source}" not found` };

        const result = this.engine.ping(srcId, targetIp);
        return {
            passed: result.ok,
            message: result.ok
                ? `Ping from ${check.source} to ${targetIp} succeeded (${result.ms}ms)`
                : `Ping from ${check.source} to ${targetIp} failed: ${result.reason}`
        };
    }

    _checkCanReach(check) {
        const srcId = this._resolveNodeRef(check.source);
        const dstId = this._resolveNodeRef(check.destination);
        if (!srcId) return { passed: false, message: `Source "${check.source}" not found` };
        if (!dstId) return { passed: false, message: `Destination "${check.destination}" not found` };

        // Get an IP from the destination
        const dstNode = this.graph.getNode(dstId);
        const dstIp = this.graph.getPrimaryIP(dstId);
        if (!dstIp) return { passed: false, message: `Destination "${check.destination}" has no IP configured` };

        const result = this.engine.ping(srcId, dstIp);
        return {
            passed: result.ok,
            message: result.ok
                ? `${check.source} can reach ${check.destination}`
                : `${check.source} cannot reach ${check.destination}: ${result.reason}`
        };
    }

    // ─── Hints ────────────────────────────────────

    getHint(taskIndex) {
        if (!this.currentLab) return null;
        const task = this.currentLab.tasks[taskIndex];
        if (!task || !task.hints || task.hints.length === 0) return null;

        const currentLevel = this.hintsRevealed[taskIndex] || 0;
        if (currentLevel >= task.hints.length) return null;

        this.hintsRevealed[taskIndex] = currentLevel + 1;
        this.notify();
        return task.hints[currentLevel];
    }

    getRevealedHints(taskIndex) {
        if (!this.currentLab) return [];
        const task = this.currentLab.tasks[taskIndex];
        if (!task || !task.hints) return [];
        const level = this.hintsRevealed[taskIndex] || 0;
        return task.hints.slice(0, level);
    }

    hasMoreHints(taskIndex) {
        if (!this.currentLab) return false;
        const task = this.currentLab.tasks[taskIndex];
        if (!task || !task.hints) return false;
        return (this.hintsRevealed[taskIndex] || 0) < task.hints.length;
    }

    // ─── Reset ────────────────────────────────────

    resetLab() {
        if (this.currentLab) {
            this.loadLab(this.currentLab.id);
        }
    }

    closeLab() {
        this.currentLab = null;
        this.taskResults = [];
        this.hintsRevealed = {};
        this.notify();
    }
}
