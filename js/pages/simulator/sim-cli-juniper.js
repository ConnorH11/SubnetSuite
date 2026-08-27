// sim-cli-juniper.js

import { isValidIP, cidrToMask, getNetAddr, maskToCidr } from './sim-math.js';

export class JuniperCLI {
    constructor(node, notifyGraph) {
        this.node = node;
        this.notifyGraph = notifyGraph;
        this.mode = 'operational'; // operational, configure
        this.hostname = node.hostname || node.name;
        this.history = [];
        this.historyIndex = -1;
        this.configBuffer = []; // uncommitted changes
        this.committed = true;
        if (!this.node.commandHistory) this.node.commandHistory = [];
    }

    getPrompt() {
        if (this.mode === 'operational') return `${this.hostname}> `;
        return `${this.hostname}# `;
    }

    addHistory(cmd) {
        if (cmd && cmd.trim()) {
            this.history.push(cmd);
            if (this.history.length > 100) this.history.shift();
            this.node.commandHistory.push(cmd);
            if (this.node.commandHistory.length > 200) this.node.commandHistory.shift();
        }
        this.historyIndex = this.history.length;
    }

    getPrevHistory() {
        if (this.historyIndex > 0) { this.historyIndex--; return this.history[this.historyIndex]; }
        return this.history[0] || '';
    }

    getNextHistory() {
        if (this.historyIndex < this.history.length - 1) { this.historyIndex++; return this.history[this.historyIndex]; }
        this.historyIndex = this.history.length;
        return '';
    }

    tabComplete(partial) {
        const commands = this.mode === 'operational'
            ? ['show', 'configure', 'ping', 'traceroute', 'request', 'exit', 'quit', 'help']
            : ['set', 'delete', 'show', 'commit', 'rollback', 'run', 'exit', 'quit', 'top', 'up', 'help'];
        return commands.filter(c => c.startsWith(partial.toLowerCase()));
    }

    getAvailableCommands() {
        if (this.mode === 'operational') return ['show', 'configure', 'ping', 'traceroute', 'request', 'exit', 'quit', 'help'];
        return ['set', 'delete', 'show', 'commit', 'rollback', 'run', 'exit', 'quit', 'top', 'up', 'help', 'edit'];
    }

    execute(commandStr) {
        const raw = commandStr.trim();
        if (!raw) return '';
        this.addHistory(raw);
        const cmd = raw.toLowerCase();
        const args = cmd.split(/\s+/);
        const rawArgs = raw.split(/\s+/);

        if (cmd === '?' || cmd === 'help') return this._help();
        if (cmd.endsWith('?')) return this._contextHelp(raw);
        if (cmd.endsWith(' help')) return this._contextHelp(raw.replace(/\s+help$/i, ' ?'));
        if (cmd === 'quit' || cmd === 'exit') return this._exit();

        if (this.mode === 'operational') return this._opMode(cmd, args, rawArgs);
        if (this.mode === 'configure') return this._configMode(cmd, args, rawArgs, raw);

        return `unknown command.`;
    }

    _exit() {
        if (this.mode === 'configure') {
            if (!this.committed) {
                this.mode = 'operational';
                return 'warning: uncommitted changes will be discarded.\nExiting configuration mode';
            }
            this.mode = 'operational';
            return 'Exiting configuration mode';
        }
        return 'Use "logout" to exit.';
    }

    _help() {
        const cmds = this.getAvailableCommands();
        const helpMap = {
            'show': 'Show system information',
            'configure': 'Enter configuration mode',
            'ping': 'Ping remote target',
            'traceroute': 'Trace route to remote host',
            'request': 'Make system-level requests',
            'exit': 'Exit current mode',
            'quit': 'Exit current mode',
            'set': 'Set a parameter',
            'delete': 'Delete a parameter',
            'commit': 'Commit current set of changes',
            'rollback': 'Roll back database to last committed version',
            'run': 'Run an operational-mode command',
            'top': 'Exit to top level of configuration',
            'up': 'Exit one level of configuration',
            'edit': 'Edit a sub-element',
            'help': 'Provide help information',
        };
        let out = 'Possible completions:\n';
        for (const c of cmds) {
            out += `  ${c.padEnd(18)}${helpMap[c] || ''}\n`;
        }
        return out;
    }

    _contextHelp(raw) {
        const beforeQuestion = raw.replace(/\?$/, '').trim().toLowerCase();
        const tokens = beforeQuestion.split(/\s+/).filter(Boolean);
        if (!tokens.length) return this._help();

        const format = entries => entries
            .map(([cmd, desc]) => `  ${cmd.padEnd(28)}${desc}`)
            .join('\n');

        const op = {
            show: [['arp', 'Show ARP table'], ['bgp summary', 'Show BGP peers'], ['chassis hardware', 'Show hardware inventory'], ['configuration', 'Show active configuration'], ['ethernet-switching table', 'Show learned MAC addresses'], ['interfaces', 'Show interface details'], ['interfaces terse', 'Show compact interface status'], ['ospf neighbor', 'Show OSPF adjacencies'], ['route', 'Show routing table'], ['system uptime', 'Show uptime'], ['version', 'Show Junos version'], ['vlans', 'Show VLAN table']],
            request: [['system reboot', 'Reboot the simulated device']],
            configure: [['<cr>', 'Enter configuration mode']],
            ping: [['host', 'Ping remote target']],
            traceroute: [['host', 'Trace route to remote target']]
        };
        const cfg = {
            set: [['interfaces', 'Configure interfaces'], ['protocols', 'Configure routing protocols'], ['routing-options', 'Configure static routes'], ['security', 'Configure zones and policies'], ['system', 'Configure system settings'], ['vlans', 'Configure VLANs']],
            'set interfaces': [['<interface>', 'Interface name such as ge-0/0/0']],
            'set interfaces ge-0/0/0': [['description', 'Interface description'], ['disable', 'Administratively disable'], ['unit', 'Logical unit configuration']],
            'set interfaces ge-0/0/0 unit 0 family inet': [['address', 'IPv4 address and prefix']],
            'set routing-options': [['static', 'Static route configuration']],
            'set routing-options static route': [['A.B.C.D/M', 'Destination prefix']],
            'set protocols': [['bgp', 'Border Gateway Protocol'], ['ospf', 'Open Shortest Path First']],
            'set vlans': [['NAME', 'VLAN name']],
            delete: [['interfaces', 'Delete interface configuration'], ['routing-options', 'Delete routing options'], ['vlans', 'Delete VLAN configuration']],
            show: [['| compare', 'Show candidate diff'], ['configuration', 'Show configuration']],
            commit: [['check', 'Validate candidate configuration'], ['confirmed', 'Commit with automatic rollback timer']]
        };

        const table = this.mode === 'operational' ? op : cfg;
        const line = tokens.join(' ');
        if (table[line]) return format(table[line]);
        if (tokens.length === 1) {
            const matches = this.getAvailableCommands().filter(c => c.startsWith(tokens[0]));
            if (matches.length) return format(matches.map(c => [c, '']));
        }
        return 'unknown command.';
    }

    // ─── OPERATIONAL MODE ──────────────────────────
    _opMode(cmd, args, rawArgs) {
        if (cmd === 'configure' || cmd === 'edit') {
            this.mode = 'configure';
            return 'Entering configuration mode\n\n[edit]';
        }

        if (cmd.startsWith('ping ')) {
            if (args.length < 2) return 'error: missing host';
            return `__PING__${args[1]}`;
        }

        if (cmd.startsWith('traceroute ')) {
            return `__TRACEROUTE__${args[1]}`;
        }

        // ═══ SHOW COMMANDS ═══
        if (cmd.startsWith('show ')) return this._showCommands(cmd, args);

        return `unknown command.`;
    }

    _showCommands(cmd, args) {
        // show interfaces terse
        if (cmd.match(/show\s+int(erfaces)?\s+t(erse)?/)) {
            return this._showInterfacesTerse();
        }
        // show interfaces
        if (cmd.match(/show\s+int(erfaces)?$/)) {
            return this._showInterfacesDetail();
        }
        // show route
        if (cmd.match(/show\s+route$/)) {
            return this._showRoute();
        }
        // show configuration
        if (cmd.match(/show\s+config(uration)?$/)) {
            return this._showConfiguration();
        }
        // show ospf neighbor
        if (cmd.match(/show\s+ospf\s+neigh(bor)?/)) {
            return this._showOspfNeighbor();
        }
        // show arp
        if (cmd.match(/show\s+arp/)) {
            return this._showArp();
        }
        // show ethernet-switching table
        if (cmd.match(/show\s+eth(ernet-switching)?\s+table/)) {
            return this._showMacTable();
        }
        // show vlans
        if (cmd.match(/show\s+vlans/)) {
            return this._showVlans();
        }
        // show version
        if (cmd.match(/show\s+ver(sion)?/)) {
            return this._showVersion();
        }
        // show bgp summary
        if (cmd.match(/show\s+bgp\s+sum(mary)?/)) {
            return this._showBgpSummary();
        }
        // show chassis hardware
        if (cmd.match(/show\s+chassis\s+hard(ware)?/)) {
            return `Hardware inventory:\nItem             Version  Part number  Serial number     Description\nChassis                                SIM${Math.floor(Math.random()*10000)}          ${this.node.model}\nRouting Engine   REV 01   xxx-xxxx-xx  SIM${Math.floor(Math.random()*10000)}          RE-S-1800x4`;
        }
        // show system uptime
        if (cmd.match(/show\s+system\s+uptime/)) {
            return `Current time: ${new Date().toISOString()}\nSystem booted: --- (simulated)\nProtocols started: ---`;
        }
        // show | compare (configuration diff)
        if (cmd.match(/show\s+\|\s+compare/)) {
            if (this.configBuffer.length === 0) return '(no uncommitted changes)';
            return this.configBuffer.map(c => `+ ${c}`).join('\n');
        }
        return `unknown command.`;
    }

    _showInterfacesTerse() {
        let out = 'Interface               Admin Link Proto    Local\n';
        for (const [name, iface] of Object.entries(this.node.interfaces)) {
            const admin = iface.state === 'up' ? 'up' : 'down';
            const link = admin;
            const local = iface.ip ? `${iface.ip}/${iface.subnet}` : '';
            out += `${name.padEnd(24)}${admin.padEnd(6)}${link.padEnd(6)}inet     ${local}\n`;
        }
        return out;
    }

    _showInterfacesDetail() {
        let out = '';
        for (const [name, iface] of Object.entries(this.node.interfaces)) {
            out += `Physical interface: ${name}, ${iface.state === 'up' ? 'Enabled' : 'Administratively down'}\n`;
            out += `  Link-level type: Ethernet, MTU: 1514, Speed: ${iface.speed || 'auto'}\n`;
            if (iface.mac) out += `  Current address: ${iface.mac}\n`;
            if (iface.ip) out += `  Protocol inet, MTU: 1500\n    Local: ${iface.ip}/${iface.subnet}\n`;
            if (iface.description) out += `  Description: ${iface.description}\n`;
            out += '\n';
        }
        return out;
    }

    _showRoute() {
        let out = 'inet.0: routes\n';
        out += 'Destination        Gateway            Flags  Pref  Metric  Interface\n';
        for (const [name, iface] of Object.entries(this.node.interfaces)) {
            if (iface.ip && iface.state === 'up') {
                const cidr = parseInt(iface.subnet) || 24;
                const net = getNetAddr(iface.ip, cidr);
                out += `${(net + '/' + cidr).padEnd(19)}${'Local'.padEnd(19)}${'D'.padEnd(7)}${String(0).padEnd(6)}${String(0).padEnd(8)}${name}\n`;
            }
        }
        for (const r of this.node.routingTable) {
            const flag = r.protocol === 'static' ? 'S' : r.protocol === 'ospf' ? 'O' : r.protocol === 'bgp' ? 'B' : '?';
            const pref = r.ad || (r.protocol === 'static' ? 5 : r.protocol === 'ospf' ? 10 : 170);
            const dest = `${r.network}/${r.cidr}`;
            out += `${dest.padEnd(19)}${(r.nextHop || 'Local').padEnd(19)}${flag.padEnd(7)}${String(pref).padEnd(6)}${String(r.metric || 0).padEnd(8)}${r.interface || ''}\n`;
        }
        return out;
    }

    _showConfiguration() {
        let out = '## Last changed: ' + new Date().toISOString() + '\n\n';
        out += 'system {\n';
        out += `    host-name ${this.hostname};\n`;
        out += '}\n';

        out += 'interfaces {\n';
        for (const [name, iface] of Object.entries(this.node.interfaces)) {
            out += `    ${name} {\n`;
            if (iface.description) out += `        description "${iface.description}";\n`;
            if (iface.state === 'down') out += `        disable;\n`;
            if (iface.ip) {
                out += `        unit 0 {\n`;
                out += `            family inet {\n`;
                out += `                address ${iface.ip}/${iface.subnet};\n`;
                out += `            }\n`;
                out += `        }\n`;
            }
            out += `    }\n`;
        }
        out += '}\n';

        if (this.node.routingTable.filter(r => r.protocol === 'static').length > 0 || this.node.ospfConfig.enabled || this.node.bgpConfig.enabled) {
            out += 'routing-options {\n';
            for (const r of this.node.routingTable.filter(r => r.protocol === 'static')) {
                out += `    static {\n        route ${r.network}/${r.cidr} next-hop ${r.nextHop || r.interface};\n    }\n`;
            }
            out += '}\n';
        }

        if (this.node.ospfConfig.enabled) {
            out += 'protocols {\n    ospf {\n';
            for (const n of this.node.ospfConfig.networks) {
                out += `        area ${n.area} {\n            interface ${n.network};\n        }\n`;
            }
            out += '    }\n}\n';
        }

        if (this.node.bgpConfig.enabled) {
            out += 'protocols {\n    bgp {\n';
            for (const n of this.node.bgpConfig.neighbors) {
                out += `        group external {\n            neighbor ${n.ip} {\n                peer-as ${n.remoteAs};\n            }\n        }\n`;
            }
            out += '    }\n}\n';
        }

        if (this.node.type === 'firewall') {
            out += 'security {\n    zones {\n';
            for (const [name, iface] of Object.entries(this.node.interfaces)) {
                if (iface.zone) {
                    out += `        security-zone ${iface.zone} {\n            interfaces {\n                ${name}.0;\n            }\n        }\n`;
                }
            }
            out += '    }\n}\n';
        }

        return out;
    }

    _showOspfNeighbor() {
        if (!this.node.ospfConfig.enabled) return "OSPF instance is not running";
        let out = 'Address          Interface              State     ID               Pri  Dead\n';
        for (const n of this.node.ospfConfig.neighbors) {
            out += `${(n.address || '').padEnd(17)}${(n.interface || '').padEnd(23)}${(n.state || 'Full').padEnd(10)}${(n.routerId || '').padEnd(17)}${String(n.priority || 128).padEnd(5)}${n.deadTime || '30'}\n`;
        }
        if (this.node.ospfConfig.neighbors.length === 0) out += 'No OSPF neighbors found.';
        return out;
    }

    _showArp() {
        let out = 'MAC Address       Address         Interface       Flags\n';
        this.node.arpTable.forEach((entry, ip) => {
            out += `${(entry.mac || '').padEnd(18)}${ip.padEnd(16)}${(entry.interface || '').padEnd(16)}none\n`;
        });
        if (this.node.arpTable.size === 0) out += 'No ARP entries.';
        return out;
    }

    _showMacTable() {
        let out = 'MAC flags       (S - static MAC, D - dynamic MAC)\nEthernet switching table : entries\n';
        out += 'VLAN   MAC address        Type      Age  Interfaces\n';
        this.node.macTable.forEach((entry, mac) => {
            out += `${String(entry.vlan || 1).padEnd(7)}${mac.padEnd(19)}${(entry.type === 'static' ? 'S' : 'D').padEnd(10)}${String(entry.age || '-').padEnd(5)}${entry.port}\n`;
        });
        if (this.node.macTable.size === 0) out += 'No MAC entries.';
        return out;
    }

    _showVlans() {
        let out = 'Routing instance        VLAN name        Tag          Interfaces\n';
        for (const [vid, vlan] of Object.entries(this.node.vlans)) {
            const ports = [];
            for (const [pname, iface] of Object.entries(this.node.interfaces)) {
                if (iface.accessVlan == vid) ports.push(pname);
            }
            out += `default-switch          ${(vlan.name || 'default').padEnd(17)}${vid.padEnd(13)}${ports.join(', ')}\n`;
        }
        return out;
    }

    _showVersion() {
        return `Hostname: ${this.hostname}\nModel: ${this.node.model}\nJunos: 21.4R3-S5\nKernel: JUNOS (simulated)\n`;
    }

    _showBgpSummary() {
        if (!this.node.bgpConfig.enabled) return 'BGP is not running';
        let out = `Groups: 1 Peers: ${this.node.bgpConfig.neighbors.length} Down peers: 0\n`;
        out += 'Peer                     AS      InPkt     OutPkt    OutQ   Flaps Last Up/Dwn State\n';
        for (const n of this.node.bgpConfig.neighbors) {
            out += `${n.ip.padEnd(25)}${String(n.remoteAs).padEnd(8)}${String(0).padEnd(10)}${String(0).padEnd(10)}${String(0).padEnd(7)}${String(0).padEnd(6)}Establ\n`;
        }
        return out;
    }

    // ─── CONFIGURE MODE ────────────────────────────
    _configMode(cmd, args, rawArgs, raw) {
        // run command (execute operational mode from config)
        if (cmd.startsWith('run ')) {
            const savedMode = this.mode;
            this.mode = 'operational';
            const result = this.execute(raw.substring(4));
            this.mode = savedMode;
            return result;
        }

        // commit
        if (cmd === 'commit') {
            this.committed = true;
            this.configBuffer = [];
            this.notifyGraph();
            return 'commit complete';
        }

        // rollback
        if (cmd === 'rollback' || cmd === 'rollback 0') {
            this.committed = true;
            this.configBuffer = [];
            return 'load complete';
        }

        // show
        if (cmd.startsWith('show')) {
            return this._showCommands(cmd, args);
        }

        // set commands
        if (cmd.startsWith('set ')) {
            this.committed = false;
            this.configBuffer.push(raw);
            return this._setCommand(cmd, args, rawArgs);
        }

        // delete commands
        if (cmd.startsWith('delete ')) {
            this.committed = false;
            this.configBuffer.push(raw);
            return this._deleteCommand(cmd, args);
        }

        return `syntax error.`;
    }

    _setCommand(cmd, args, rawArgs) {
        // set system host-name <name>
        if (cmd.match(/^set\s+system\s+host-name\s+/)) {
            this.hostname = rawArgs[3];
            this.node.hostname = rawArgs[3];
            this.node.name = rawArgs[3];
            return '';
        }

        // set interfaces <iface> unit 0 family inet address <ip/cidr>
        if (cmd.match(/^set\s+interfaces\s+\S+\s+unit\s+0\s+family\s+inet\s+address\s+/)) {
            const ifName = args[2];
            const addrCidr = args[8]; // e.g., "192.168.1.1/24"
            const iface = this.node.interfaces[ifName];
            if (!iface) return `error: interface ${ifName} not found`;
            
            const parts = addrCidr.split('/');
            iface.ip = parts[0];
            iface.subnet = parts[1] || '24';
            return '';
        }

        // set interfaces <iface> description "text"
        if (cmd.match(/^set\s+interfaces\s+\S+\s+description\s+/)) {
            const ifName = args[2];
            const iface = this.node.interfaces[ifName];
            if (!iface) return `error: interface ${ifName} not found`;
            iface.description = rawArgs.slice(4).join(' ').replace(/"/g, '');
            return '';
        }

        // set interfaces <iface> disable
        if (cmd.match(/^set\s+interfaces\s+\S+\s+disable$/)) {
            const ifName = args[2];
            const iface = this.node.interfaces[ifName];
            if (iface) iface.state = 'down';
            return '';
        }

        // set routing-options static route <prefix> next-hop <ip>
        if (cmd.match(/^set\s+routing-options\s+static\s+route\s+/)) {
            const prefix = args[4]; // e.g., "0.0.0.0/0"
            const nextHop = args[6];
            const parts = prefix.split('/');
            this.node.routingTable.push({
                network: parts[0], cidr: parseInt(parts[1]) || 0, mask: cidrToMask(parseInt(parts[1]) || 0),
                nextHop: nextHop || '', interface: '', protocol: 'static', metric: 0, ad: 5
            });
            return '';
        }

        // set protocols ospf area <id> interface <iface>
        if (cmd.match(/^set\s+protocols\s+ospf\s+area\s+/)) {
            this.node.ospfConfig.enabled = true;
            const area = args[4];
            const ifaceArg = args.indexOf('interface');
            if (ifaceArg > -1 && args[ifaceArg + 1]) {
                this.node.ospfConfig.networks.push({ network: args[ifaceArg + 1], wildcard: '0.0.0.0', area });
            }
            return '';
        }

        // set protocols bgp group <name> neighbor <ip> peer-as <asn>
        if (cmd.match(/^set\s+protocols\s+bgp\s+group\s+/)) {
            this.node.bgpConfig.enabled = true;
            const neighborIdx = args.indexOf('neighbor');
            const peerAsIdx = args.indexOf('peer-as');
            if (neighborIdx > -1 && peerAsIdx > -1) {
                this.node.bgpConfig.neighbors.push({
                    ip: args[neighborIdx + 1],
                    remoteAs: parseInt(args[peerAsIdx + 1])
                });
            }
            return '';
        }

        // set security zones security-zone <name> interfaces <iface>
        if (cmd.match(/^set\s+security\s+zones\s+security-zone\s+/)) {
            const zone = args[4];
            const ifIdx = args.indexOf('interfaces');
            if (ifIdx > -1) {
                const ifName = args[ifIdx + 1].replace('.0', '');
                const iface = this.node.interfaces[ifName];
                if (iface) iface.zone = zone;
            }
            return '';
        }

        // set vlans <name> vlan-id <id>
        if (cmd.match(/^set\s+vlans\s+\S+\s+vlan-id\s+/)) {
            const vlanName = args[2];
            const vid = parseInt(args[4]);
            if (vid >= 1 && vid <= 4094) {
                this.node.vlans[vid] = { name: vlanName };
            }
            return '';
        }

        return '';
    }

    _deleteCommand(cmd, args) {
        // delete interfaces <iface> unit 0
        if (cmd.match(/^delete\s+interfaces\s+\S+\s+unit/)) {
            const ifName = args[2];
            const iface = this.node.interfaces[ifName];
            if (iface) { iface.ip = ''; iface.subnet = ''; }
            return '';
        }

        // delete routing-options static route <prefix>
        if (cmd.match(/^delete\s+routing-options\s+static\s+route\s+/)) {
            const prefix = args[4];
            const parts = prefix.split('/');
            this.node.routingTable = this.node.routingTable.filter(r => !(r.network === parts[0] && r.cidr === parseInt(parts[1])));
            return '';
        }

        return '';
    }
}
