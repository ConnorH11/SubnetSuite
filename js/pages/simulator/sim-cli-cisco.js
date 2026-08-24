// sim-cli-cisco.js

import { resolveInterfaceName, DEVICE_TEMPLATES, getPortDisplayName } from './sim-device-templates.js';
import { ipToUint, uintToIp, cidrToMask, getNetAddr, isValidIP, maskToCidr } from './sim-math.js';

export class CiscoCLI {
    constructor(node, notifyGraph) {
        this.node = node;
        this.notifyGraph = notifyGraph;
        this.mode = 'user'; // user, priv, config, iface, router_ospf, router_eigrp, router_bgp, vlan, line, dhcp
        this.currentInterface = null;
        this.currentRouterProcess = null;
        this.currentVlan = null;
        this.currentDhcpPool = null;
        this.currentLine = null;
        this.hostname = node.hostname || node.name;
        this.history = [];
        this.historyIndex = -1;
        this.enablePassword = '';
        this.bannerMotd = '';
        this.template = DEVICE_TEMPLATES[node.templateId] || {};
        if (!this.node.commandHistory) this.node.commandHistory = [];
    }

    getPrompt() {
        switch (this.mode) {
            case 'user': return `${this.hostname}>`;
            case 'priv': return `${this.hostname}#`;
            case 'config': return `${this.hostname}(config)#`;
            case 'iface': return `${this.hostname}(config-if)#`;
            case 'router_ospf': return `${this.hostname}(config-router)#`;
            case 'router_eigrp': return `${this.hostname}(config-router)#`;
            case 'router_bgp': return `${this.hostname}(config-router)#`;
            case 'vlan': return `${this.hostname}(config-vlan)#`;
            case 'line': return `${this.hostname}(config-line)#`;
            case 'dhcp': return `${this.hostname}(dhcp-config)#`;
            case 'acl': return `${this.hostname}(config-ext-nacl)#`;
            default: return `${this.hostname}>`;
        }
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
        if (this.historyIndex > 0) {
            this.historyIndex--;
            return this.history[this.historyIndex];
        }
        return this.history[0] || '';
    }

    getNextHistory() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            return this.history[this.historyIndex];
        }
        this.historyIndex = this.history.length;
        return '';
    }

    tabComplete(partial) {
        const commands = this.getAvailableCommands();
        const matches = commands.filter(c => c.startsWith(partial.toLowerCase()));
        if (matches.length === 1) return matches[0];
        if (matches.length > 1) return matches;
        return null;
    }

    getAvailableCommands() {
        switch (this.mode) {
            case 'user': return ['enable', 'exit', 'ping', 'traceroute', 'show', 'terminal', 'logout'];
            case 'priv': return ['configure', 'clear', 'copy', 'debug', 'disable', 'exit', 'logout', 'ping', 'traceroute', 'reload', 'show', 'terminal', 'write', 'undebug'];
            case 'config': return ['access-list', 'banner', 'do', 'enable', 'end', 'exit', 'hostname', 'interface', 'ip', 'line', 'no', 'router', 'service', 'spanning-tree', 'switchport', 'username', 'vlan'];
            case 'iface': return ['description', 'duplex', 'end', 'exit', 'ip', 'mac-address', 'no', 'shutdown', 'speed', 'switchport'];
            case 'router_ospf': return ['end', 'exit', 'network', 'no', 'passive-interface', 'router-id', 'default-information'];
            case 'router_eigrp': return ['end', 'exit', 'network', 'no', 'passive-interface'];
            case 'router_bgp': return ['end', 'exit', 'neighbor', 'network', 'no'];
            case 'vlan': return ['end', 'exit', 'name', 'no'];
            case 'dhcp': return ['default-router', 'dns-server', 'end', 'exit', 'network', 'no'];
            default: return [];
        }
    }

    execute(commandStr) {
        const raw = commandStr.trim();
        if (!raw) return '';
        
        this.addHistory(raw);
        const cmd = raw.toLowerCase();
        const args = cmd.split(/\s+/);
        const rawArgs = raw.split(/\s+/);

        // ═══ UNIVERSAL COMMANDS ═══
        if (cmd === 'exit') return this._exit();
        if (cmd === 'end') { this.mode = 'priv'; return ''; }
        if (cmd === '?' || cmd === 'help') return this._help();
        if (cmd.endsWith('?')) return this._contextHelp(raw);
        if (cmd.endsWith(' help')) return this._contextHelp(raw.replace(/\s+help$/i, ' ?'));

        // 'do' command in config modes
        if (cmd.startsWith('do ') && this.mode !== 'user' && this.mode !== 'priv') {
            const savedMode = this.mode;
            this.mode = 'priv';
            const result = this.execute(raw.substring(3));
            this.mode = savedMode;
            return result;
        }

        // ═══ MODE: USER EXEC ═══
        if (this.mode === 'user') {
            if (cmd === 'enable' || cmd === 'en') { this.mode = 'priv'; return ''; }
            if (cmd.startsWith('show ') || cmd.startsWith('sh ')) return this._showCommands(cmd, args);
            if (cmd.startsWith('ping ')) return this._ping(args);
            if (cmd.startsWith('traceroute ') || cmd.startsWith('trace ')) return this._traceroute(args);
            return `% Invalid input detected at '^' marker.\n\n% Type "?" for a list of available commands.`;
        }

        // ═══ MODE: PRIVILEGED EXEC ═══
        if (this.mode === 'priv') {
            if (cmd === 'disable' || cmd === 'dis') { this.mode = 'user'; return ''; }
            if (cmd === 'configure terminal' || cmd === 'conf t') {
                this.mode = 'config';
                return 'Enter configuration commands, one per line.  End with CNTL/Z.';
            }
            if (cmd.startsWith('show ') || cmd.startsWith('sh ')) return this._showCommands(cmd, args);
            if (cmd.startsWith('ping ')) return this._ping(args);
            if (cmd.startsWith('traceroute ') || cmd.startsWith('trace ')) return this._traceroute(args);
            if (cmd === 'write memory' || cmd === 'wr' || cmd === 'write' || cmd === 'copy run start' || cmd === 'copy running-config startup-config') {
                return 'Building configuration...\n[OK]';
            }
            if (cmd.startsWith('clear ')) return this._clearCommands(cmd, args);
            if (cmd === 'reload') return '% System will reload in 0 seconds\n% Simulated reload complete.';
            return `% Invalid input detected at '^' marker.`;
        }

        // ═══ MODE: GLOBAL CONFIG ═══
        if (this.mode === 'config') return this._configMode(cmd, args, rawArgs);

        // ═══ MODE: INTERFACE CONFIG ═══
        if (this.mode === 'iface') return this._ifaceMode(cmd, args, rawArgs);

        // ═══ MODE: ROUTER OSPF ═══
        if (this.mode === 'router_ospf') return this._ospfMode(cmd, args);

        // ═══ MODE: ROUTER EIGRP ═══
        if (this.mode === 'router_eigrp') return this._eigrpMode(cmd, args);

        // ═══ MODE: ROUTER BGP ═══
        if (this.mode === 'router_bgp') return this._bgpMode(cmd, args);

        // ═══ MODE: VLAN CONFIG ═══
        if (this.mode === 'vlan') return this._vlanMode(cmd, args, rawArgs);

        // ═══ MODE: DHCP CONFIG ═══
        if (this.mode === 'dhcp') return this._dhcpMode(cmd, args);

        return `% Unrecognized command`;
    }

    // ─── EXIT Logic ────────────────────────────────
    _exit() {
        switch (this.mode) {
            case 'iface': this.mode = 'config'; this.currentInterface = null; break;
            case 'router_ospf': case 'router_eigrp': case 'router_bgp': this.mode = 'config'; this.currentRouterProcess = null; break;
            case 'vlan': this.mode = 'config'; this.currentVlan = null; break;
            case 'line': this.mode = 'config'; this.currentLine = null; break;
            case 'dhcp': this.mode = 'config'; this.currentDhcpPool = null; break;
            case 'config': this.mode = 'priv'; break;
            case 'priv': this.mode = 'user'; break;
            case 'user': return 'Use "logout" to exit.';
            default: this.mode = 'priv';
        }
        return '';
    }

    // ─── HELP ──────────────────────────────────────
    _help() {
        const cmds = this.getAvailableCommands();
        const helpMap = {
            'enable': 'Turn on privileged commands',
            'disable': 'Turn off privileged commands',
            'exit': 'Exit from current mode',
            'end': 'Return to privileged EXEC mode',
            'ping': 'Send echo messages',
            'traceroute': 'Trace route to destination',
            'show': 'Show running system information',
            'configure': 'Enter configuration mode',
            'write': 'Write running configuration to memory',
            'copy': 'Copy from one file to another',
            'clear': 'Reset functions',
            'reload': 'Halt and perform a cold restart',
            'hostname': "Set system's network name",
            'interface': 'Select an interface to configure',
            'ip': 'Global IP configuration subcommands',
            'no': 'Negate a command or set its defaults',
            'router': 'Enable a routing process',
            'vlan': 'Configure VLAN parameters',
            'access-list': 'Add an access list entry',
            'description': 'Interface specific description',
            'shutdown': 'Shutdown the selected interface',
            'switchport': 'Set switching mode characteristics',
            'speed': 'Set speed on interface',
            'duplex': 'Configure duplex operation',
            'network': 'Specify a network to announce',
            'neighbor': 'Specify a neighbor router',
            'passive-interface': 'Suppress routing updates on interface',
            'router-id': 'Specify router-id',
            'default-router': 'Default routers for DHCP',
            'dns-server': 'DNS servers for DHCP',
            'name': 'Set VLAN name',
            'line': 'Configure a terminal line',
            'banner': 'Define a login banner',
            'service': 'Modify use of network based services',
            'spanning-tree': 'Configure spanning tree',
            'do': 'Execute privileged EXEC command from config mode',
            'username': 'Establish User Name Authentication',
            'default-information': 'Control distribution of default information',
            'debug': 'Debugging functions',
            'undebug': 'Disable debugging functions',
            'terminal': 'Set terminal line parameters',
            'logout': 'Exit from the EXEC',
            'mac-address': 'Manually set interface MAC address',
        };
        let out = '';
        for (const c of cmds) {
            out += `  ${c.padEnd(22)} ${helpMap[c] || ''}\n`;
        }
        return out;
    }

    _contextHelp(raw) {
        const beforeQuestion = raw.replace(/\?$/, '').trim().toLowerCase();
        const tokens = beforeQuestion.split(/\s+/).filter(Boolean);
        const commandLine = tokens.join(' ');

        if (tokens.length === 0) return this._help();

        const format = entries => entries
            .map(([cmd, desc]) => `  ${cmd.padEnd(24)} ${desc}`)
            .join('\n');

        const tables = {
            user: {
                'show': [['arp', 'ARP table'], ['cdp', 'CDP information'], ['clock', 'Display the system clock'], ['history', 'Display command history'], ['interfaces', 'Interface status and configuration'], ['ip', 'IP information'], ['version', 'System hardware and software status']],
                'ping': [['A.B.C.D', 'Ping destination address'], ['WORD', 'Ping destination hostname']],
                'traceroute': [['A.B.C.D', 'Trace route to destination address']]
            },
            priv: {
                'configure': [['terminal', 'Configure from the terminal']],
                'show': [['access-lists', 'List access lists'], ['arp', 'ARP table'], ['cdp', 'CDP information'], ['clock', 'Display the system clock'], ['history', 'Display command history'], ['interfaces', 'Interface status and configuration'], ['ip', 'IP information'], ['mac', 'MAC address table'], ['running-config', 'Current operating configuration'], ['vlan', 'VLAN status'], ['version', 'System hardware and software status']],
                'show ip': [['bgp', 'BGP information'], ['dhcp', 'DHCP information'], ['interface', 'IP interface status'], ['nat', 'NAT information'], ['ospf', 'OSPF information'], ['protocols', 'Routing protocol status'], ['route', 'IP routing table']],
                'show mac': [['address-table', 'MAC forwarding table']],
                'show vlan': [['brief', 'VLAN summary']],
                'copy': [['running-config startup-config', 'Copy running configuration to startup configuration']],
                'clear': [['arp', 'Clear ARP cache'], ['ip route', 'Clear routing table'], ['mac address-table', 'Clear MAC table']],
                'terminal': [['length', 'Set terminal page length'], ['monitor', 'Copy debug output to terminal']]
            },
            config: {
                'interface': [['FastEthernet0/1', 'FastEthernet interface'], ['GigabitEthernet0/0/0', 'GigabitEthernet interface'], ['Serial0/0/0', 'Serial interface'], ['Vlan1', 'VLAN interface']],
                'ip': [['access-list', 'Named access-list'], ['dhcp', 'DHCP server configuration'], ['domain-name', 'Define default domain name'], ['name-server', 'Specify DNS servers'], ['nat', 'NAT configuration commands'], ['route', 'Establish static routes'], ['routing', 'Enable IP routing']],
                'ip dhcp': [['excluded-address', 'Prevent DHCP from assigning addresses'], ['pool', 'Configure a DHCP address pool']],
                'ip nat': [['inside', 'Inside NAT translation'], ['pool', 'Define NAT pool'], ['source', 'Source address translation']],
                'router': [['bgp', 'Border Gateway Protocol'], ['eigrp', 'Enhanced Interior Gateway Routing Protocol'], ['ospf', 'Open Shortest Path First']],
                'spanning-tree': [['vlan', 'VLAN spanning-tree configuration']],
                'vlan': [['<1-4094>', 'VLAN ID']],
                'line': [['console', 'Primary terminal line'], ['vty', 'Virtual terminal']]
            },
            iface: {
                'ip': [['access-group', 'Apply an access list'], ['address', 'Set the IP address of an interface'], ['helper-address', 'Specify a DHCP relay address'], ['nat', 'NAT interface commands'], ['ospf', 'OSPF interface commands']],
                'ip address': [['A.B.C.D', 'IP address'], ['dhcp', 'IP address negotiated via DHCP']],
                'ip nat': [['inside', 'Inside interface for NAT'], ['outside', 'Outside interface for NAT']],
                'switchport': [['access', 'Set access mode characteristics'], ['mode', 'Set trunking mode'], ['trunk', 'Set trunking characteristics'], ['voice', 'Voice appliance attributes']],
                'switchport mode': [['access', 'Set trunking mode to ACCESS'], ['trunk', 'Set trunking mode to TRUNK']],
                'switchport access': [['vlan', 'Set VLAN when interface is in access mode']],
                'switchport trunk': [['allowed', 'Set allowed VLAN characteristics'], ['native', 'Set trunking native characteristics']],
                'no': [['ip', 'Interface IP commands'], ['shutdown', 'Enable selected interface']],
                'duplex': [['auto', 'Enable AUTO duplex configuration'], ['full', 'Force full duplex'], ['half', 'Force half duplex']],
                'speed': [['10', 'Force 10 Mbps operation'], ['100', 'Force 100 Mbps operation'], ['1000', 'Force 1000 Mbps operation'], ['auto', 'Enable AUTO speed configuration']]
            },
            router_ospf: {
                'network': [['A.B.C.D', 'Network number'], ['area', 'Set OSPF area ID']],
                'passive-interface': [['default', 'Suppress routing updates on all interfaces'], ['INTERFACE', 'Suppress routing updates on one interface']],
                'router-id': [['A.B.C.D', 'Manually configured router ID']]
            },
            router_eigrp: {
                'network': [['A.B.C.D', 'Network number']],
                'passive-interface': [['default', 'Suppress routing updates on all interfaces'], ['INTERFACE', 'Suppress routing updates on one interface']]
            },
            router_bgp: {
                'neighbor': [['A.B.C.D', 'Neighbor address']],
                'network': [['A.B.C.D', 'Network number']]
            },
            vlan: {
                'name': [['WORD', 'ASCII name for the VLAN']]
            },
            dhcp: {
                'network': [['A.B.C.D', 'Network number'], ['A.B.C.D', 'Network mask']],
                'default-router': [['A.B.C.D', 'Router address for DHCP clients']],
                'dns-server': [['A.B.C.D', 'DNS server address']]
            }
        };

        const modeTable = tables[this.mode] || {};
        if (modeTable[commandLine]) return format(modeTable[commandLine]);

        const topMatches = this.getAvailableCommands().filter(c => c.startsWith(tokens[0]));
        if (tokens.length === 1 && topMatches.length) {
            return topMatches.map(c => `  ${c}`).join('\n');
        }

        return '% Unrecognized command';
    }

    // ─── SHOW COMMANDS ─────────────────────────────
    _showCommands(cmd, args) {
        // show ip interface brief
        if (cmd.match(/^sh(ow)?\s+ip\s+int(erface)?\s+b(rief)?/)) {
            return this._showIpIntBrief();
        }
        // show interfaces
        if (cmd.match(/^sh(ow)?\s+int(erfaces)?$/)) {
            return this._showInterfaces();
        }
        // show interfaces status
        if (cmd.match(/^sh(ow)?\s+int(erfaces)?\s+status$/)) {
            return this._showInterfacesStatus();
        }
        // show interfaces switchport
        if (cmd.match(/^sh(ow)?\s+int(erfaces)?\s+switchport$/)) {
            return this._showInterfacesSwitchport();
        }
        // show running-config
        if (cmd.match(/^sh(ow)?\s+run(ning-config)?$/)) {
            return this._showRunningConfig();
        }
        // show ip route
        if (cmd.match(/^sh(ow)?\s+ip\s+route$/)) {
            return this._showIpRoute();
        }
        // show vlan brief
        if (cmd.match(/^sh(ow)?\s+vlan\s+b(rief)?$/)) {
            return this._showVlanBrief();
        }
        // show mac address-table
        if (cmd.match(/^sh(ow)?\s+mac\s+add(ress)?(-table)?$/)) {
            return this._showMacTable();
        }
        // show arp
        if (cmd.match(/^sh(ow)?\s+arp$/)) {
            return this._showArp();
        }
        // show ip ospf neighbor
        if (cmd.match(/^sh(ow)?\s+ip\s+ospf\s+neigh(bor)?$/)) {
            return this._showOspfNeighbors();
        }
        // show spanning-tree
        if (cmd.match(/^sh(ow)?\s+span(ning-tree)?$/)) {
            return this._showSpanningTree();
        }
        // show access-lists
        if (cmd.match(/^sh(ow)?\s+access-list(s)?$/)) {
            return this._showAccessLists();
        }
        // show ip nat translations
        if (cmd.match(/^sh(ow)?\s+ip\s+nat\s+trans(lations)?$/)) {
            return this._showNatTranslations();
        }
        // show ip dhcp binding
        if (cmd.match(/^sh(ow)?\s+ip\s+dhcp\s+bind(ing)?$/)) {
            return this._showDhcpBindings();
        }
        // show version
        if (cmd.match(/^sh(ow)?\s+ver(sion)?$/)) {
            return this._showVersion();
        }
        // show ip protocols
        if (cmd.match(/^sh(ow)?\s+ip\s+proto(cols)?$/)) {
            return this._showIpProtocols();
        }
        // show cdp neighbors
        if (cmd.match(/^sh(ow)?\s+cdp\s+neigh(bors)?$/)) {
            return this._showCdpNeighbors();
        }
        // show ip bgp
        if (cmd.match(/^sh(ow)?\s+ip\s+bgp$/)) {
            return this._showBgp();
        }
        // show clock
        if (cmd.match(/^sh(ow)?\s+clock$/)) {
            return new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString();
        }
        // show history
        if (cmd.match(/^sh(ow)?\s+history$/)) {
            return this.history.slice(-20).map((h, i) => `  ${i + 1}  ${h}`).join('\n');
        }
        return `% Invalid show command. Type "show ?" for options.`;
    }

    _showIpIntBrief() {
        let out = 'Interface'.padEnd(30) + 'IP-Address'.padEnd(18) + 'OK? Method Status                Protocol\n';
        const allIf = { ...this.node.interfaces, ...this.node.sviInterfaces };
        for (const [name, iface] of Object.entries(allIf)) {
            const ip = iface.ip || 'unassigned';
            const st = iface.state === 'up' ? 'up' : 'administratively down';
            const proto = iface.state === 'up' ? 'up' : 'down';
            out += `${name.padEnd(30)}${ip.padEnd(18)}YES  manual ${st.padEnd(22)} ${proto}\n`;
        }
        return out;
    }

    _showInterfaces() {
        let out = '';
        const allIf = { ...this.node.interfaces, ...this.node.sviInterfaces };
        for (const [name, iface] of Object.entries(allIf)) {
            const st = iface.state === 'up' ? 'up' : 'administratively down';
            out += `${name} is ${st}, line protocol is ${iface.state === 'up' ? 'up' : 'down'}\n`;
            if (iface.description) out += `  Description: ${iface.description}\n`;
            if (iface.mac) out += `  Hardware is GigabitEthernet, address is ${iface.mac}\n`;
            if (iface.ip) out += `  Internet address is ${iface.ip}/${iface.subnet}\n`;
            out += `  MTU 1500 bytes, BW ${iface.speed || '1000000'} Kbit/sec\n`;
            out += `  Duplex ${iface.duplex || 'auto'}, Speed ${iface.speed || 'auto'}\n`;
            out += '\n';
        }
        return out;
    }

    _showInterfacesStatus() {
        let out = 'Port          Name               Status       Vlan       Duplex  Speed Type\n';
        for (const [name, iface] of Object.entries(this.node.interfaces)) {
            const port = getPortDisplayName(name).padEnd(13);
            const desc = (iface.description || '').slice(0, 18).padEnd(18);
            const status = (iface.state === 'up' ? 'connected' : 'notconnect').padEnd(12);
            const vlan = (iface.switchportMode === 'trunk' ? 'trunk' : String(iface.accessVlan || 1)).padEnd(10);
            const duplex = (iface.duplex || 'auto').padEnd(8);
            const speed = String(iface.speed || 'auto').padEnd(6);
            out += `${port} ${desc} ${status} ${vlan} ${duplex}${speed} 10/100/1000BaseTX\n`;
        }
        return out;
    }

    _showInterfacesSwitchport() {
        let out = '';
        for (const [name, iface] of Object.entries(this.node.interfaces)) {
            if (!iface.switchportMode) continue;
            const mode = iface.switchportMode || 'access';
            out += `Name: ${getPortDisplayName(name)}\n`;
            out += `Switchport: Enabled\n`;
            out += `Administrative Mode: ${mode === 'trunk' ? 'trunk' : 'static access'}\n`;
            out += `Operational Mode: ${mode === 'trunk' ? 'trunk' : 'static access'}\n`;
            out += `Access Mode VLAN: ${iface.accessVlan || 1} (${this.node.vlans[iface.accessVlan || 1]?.name || 'default'})\n`;
            out += `Trunking Native Mode VLAN: ${iface.nativeVlan || 1} (${this.node.vlans[iface.nativeVlan || 1]?.name || 'default'})\n`;
            out += `Trunking VLANs Enabled: ${iface.trunkAllowed || 'all'}\n\n`;
        }
        return out || '% No switchport interfaces found.';
    }

    _showRunningConfig() {
        let out = 'Building configuration...\n\nCurrent configuration:\n!\n';
        out += `! Last configuration change at ${new Date().toLocaleTimeString()}\n!\n`;
        out += `version 15.2\n`;
        out += `hostname ${this.hostname}\n!\n`;

        if (this.bannerMotd) out += `banner motd ^${this.bannerMotd}^\n!\n`;

        const allIf = { ...this.node.interfaces, ...this.node.sviInterfaces };
        for (const [name, iface] of Object.entries(allIf)) {
            out += `interface ${name}\n`;
            if (iface.description) out += ` description ${iface.description}\n`;
            if (iface.ip) out += ` ip address ${iface.ip} ${cidrToMask(parseInt(iface.subnet) || 24)}\n`;
            else out += ` no ip address\n`;
            if (iface.switchportMode === 'trunk') {
                out += ` switchport mode trunk\n`;
                if (iface.trunkAllowed !== 'all') out += ` switchport trunk allowed vlan ${iface.trunkAllowed}\n`;
            } else if (iface.switchportMode === 'access') {
                if (iface.accessVlan && iface.accessVlan !== 1) out += ` switchport access vlan ${iface.accessVlan}\n`;
                out += ` switchport mode access\n`;
            }
            if (iface.state === 'down') out += ` shutdown\n`;
            out += `!\n`;
        }

        for (const [vid, vlan] of Object.entries(this.node.vlans)) {
            if (vid !== '1') {
                out += `vlan ${vid}\n`;
                if (vlan.name) out += ` name ${vlan.name}\n`;
                out += `!\n`;
            }
        }

        const staticRoutes = this.node.routingTable.filter(r => r.protocol === 'static');
        for (const r of staticRoutes) {
            out += `ip route ${r.network} ${cidrToMask(r.cidr)} ${r.nextHop || r.interface}\n`;
        }

        if (this.node.ospfConfig.enabled) {
            out += `!\nrouter ospf 1\n`;
            if (this.node.ospfConfig.routerId) out += ` router-id ${this.node.ospfConfig.routerId}\n`;
            for (const n of this.node.ospfConfig.networks) {
                out += ` network ${n.network} ${n.wildcard} area ${n.area}\n`;
            }
            out += `!\n`;
        }

        if (this.node.eigrpConfig.enabled) {
            out += `!\nrouter eigrp ${this.node.eigrpConfig.asNumber}\n`;
            for (const n of this.node.eigrpConfig.networks) {
                out += ` network ${n}\n`;
            }
            out += `!\n`;
        }

        if (this.node.bgpConfig.enabled) {
            out += `!\nrouter bgp ${this.node.bgpConfig.asNumber}\n`;
            for (const n of this.node.bgpConfig.neighbors) {
                out += ` neighbor ${n.ip} remote-as ${n.remoteAs}\n`;
            }
            for (const n of this.node.bgpConfig.networks) {
                out += ` network ${n.network} mask ${n.mask}\n`;
            }
            out += `!\n`;
        }

        for (const acl of this.node.aclRules) {
            for (const entry of acl.entries) {
                if (acl.type === 'standard') {
                    out += `access-list ${acl.id} ${entry.action} ${entry.source}\n`;
                } else {
                    out += `access-list ${acl.id} ${entry.action} ${entry.protocol} ${entry.source} ${entry.destination}\n`;
                }
            }
        }

        for (const pool of this.node.dhcpPools) {
            out += `!\nip dhcp pool ${pool.name}\n`;
            if (pool.network) out += ` network ${pool.network} ${pool.mask}\n`;
            if (pool.defaultRouter) out += ` default-router ${pool.defaultRouter}\n`;
            if (pool.dns) out += ` dns-server ${pool.dns}\n`;
            out += `!\n`;
        }

        if (this.node.natConfig.insideIfaces.length > 0 || this.node.natConfig.outsideIfaces.length > 0) {
            for (const sm of this.node.natConfig.staticMaps) {
                out += `ip nat inside source static ${sm.inside} ${sm.outside}\n`;
            }
        }

        out += `!\nend`;
        return out;
    }

    _showIpRoute() {
        let out = `Codes: C - connected, S - static, O - OSPF, D - EIGRP, B - BGP\n\n`;
        const allIf = { ...this.node.interfaces, ...this.node.sviInterfaces };
        for (const [name, iface] of Object.entries(allIf)) {
            if (iface.ip && iface.state === 'up') {
                const cidr = parseInt(iface.subnet) || 24;
                const net = getNetAddr(iface.ip, cidr);
                out += `C    ${net}/${cidr} is directly connected, ${name}\n`;
            }
        }
        for (const r of this.node.routingTable) {
            const code = r.protocol === 'static' ? 'S' :
                         r.protocol === 'ospf' ? 'O' :
                         r.protocol === 'eigrp' ? 'D' :
                         r.protocol === 'bgp' ? 'B' : '?';
            const ad = r.ad !== undefined ? `[${r.ad}/${r.metric || 0}]` : '';
            if (r.nextHop) {
                out += `${code}    ${r.network}/${r.cidr} ${ad} via ${r.nextHop}\n`;
            } else {
                out += `${code}    ${r.network}/${r.cidr} ${ad} is directly connected, ${r.interface}\n`;
            }
        }
        if (out.split('\n').length <= 3) out += '% No routes in routing table.\n';
        return out;
    }

    _showVlanBrief() {
        let out = 'VLAN Name                             Status    Ports\n';
        out +=    '---- -------------------------------- --------- ------------------------\n';
        for (const [vid, vlan] of Object.entries(this.node.vlans)) {
            const ports = [];
            for (const [pname, iface] of Object.entries(this.node.interfaces)) {
                if (iface.accessVlan == vid && iface.switchportMode === 'access') {
                    ports.push(getPortDisplayName(pname));
                }
            }
            out += `${vid.padEnd(5)}${(vlan.name || 'VLAN' + vid).padEnd(33)} active    ${ports.join(', ')}\n`;
        }
        return out;
    }

    _showMacTable() {
        let out = '          Mac Address Table\n-------------------------------------------\n';
        out += 'Vlan    Mac Address       Type        Ports\n';
        out += '----    -----------       --------    -----\n';
        if (this.node.macTable.size === 0) {
            out += '% No entries in MAC address table.\n';
        }
        this.node.macTable.forEach((entry, mac) => {
            out += `${String(entry.vlan || 1).padEnd(8)}${mac.padEnd(18)}${(entry.type || 'DYNAMIC').padEnd(12)}${entry.port}\n`;
        });
        return out;
    }

    _showArp() {
        let out = 'Protocol  Address          Age (min)   Hardware Addr   Type   Interface\n';
        if (this.node.arpTable.size === 0) {
            out += '% No ARP entries.\n';
        }
        this.node.arpTable.forEach((entry, ip) => {
            out += `Internet  ${ip.padEnd(17)}${String(entry.age || 0).padEnd(12)}${(entry.mac || '').padEnd(16)}ARPA   ${entry.interface || ''}\n`;
        });
        return out;
    }

    _showOspfNeighbors() {
        let out = 'Neighbor ID     Pri   State           Dead Time   Address         Interface\n';
        if (!this.node.ospfConfig.enabled) return '% OSPF is not enabled.';
        if (this.node.ospfConfig.neighbors.length === 0) {
            return out + '% No OSPF neighbors.';
        }
        for (const n of this.node.ospfConfig.neighbors) {
            out += `${(n.routerId || '').padEnd(16)}${String(n.priority || 1).padEnd(6)}${(n.state || 'FULL/DR').padEnd(16)}${(n.deadTime || '00:00:30').padEnd(12)}${(n.address || '').padEnd(16)}${n.interface || ''}\n`;
        }
        return out;
    }

    _showSpanningTree() {
        let out = '';
        for (const [vid, vlan] of Object.entries(this.node.vlans)) {
            out += `\nVLAN${vid.padStart(4, '0')}\n`;
            out += `  Spanning tree enabled protocol ieee\n`;
            out += `  Root ID    Priority    ${this.node.stpConfig.priority + parseInt(vid)}\n`;
            out += `  Bridge ID  Priority    ${this.node.stpConfig.priority + parseInt(vid)}\n`;
            out += `\nInterface           Role  Sts   Cost      Prio.Nbr  Type\n`;
            out += `------------------- ----- ----- --------- --------- ----\n`;
            for (const [pname, iface] of Object.entries(this.node.interfaces)) {
                if (iface.switchportMode && (iface.accessVlan == vid || iface.switchportMode === 'trunk')) {
                    const role = this.node.stpConfig.rootPort === pname ? 'Root' : 'Desg';
                    const sts = iface.stpState === 'forwarding' ? 'FWD' : iface.stpState === 'blocking' ? 'BLK' : 'LRN';
                    out += `${getPortDisplayName(pname).padEnd(20)}${role.padEnd(6)}${sts.padEnd(6)}${String(iface.speed === '100' ? 19 : 4).padEnd(10)}128.1     P2p\n`;
                }
            }
        }
        return out || '% STP not enabled on this device.';
    }

    _showAccessLists() {
        if (this.node.aclRules.length === 0) return '% No access lists configured.';
        let out = '';
        for (const acl of this.node.aclRules) {
            out += `${acl.type === 'standard' ? 'Standard' : 'Extended'} IP access list ${acl.id}\n`;
            for (let i = 0; i < acl.entries.length; i++) {
                const e = acl.entries[i];
                out += `    ${(i + 1) * 10} ${e.action} ${e.protocol || ''} ${e.source} ${e.destination || ''}\n`;
            }
        }
        return out;
    }

    _showNatTranslations() {
        let out = 'Pro Inside global      Inside local       Outside local      Outside global\n';
        for (const sm of this.node.natConfig.staticMaps) {
            out += `--- ${sm.outside.padEnd(19)}${sm.inside.padEnd(19)}---                ---\n`;
        }
        if (this.node.natConfig.staticMaps.length === 0) out += '% No NAT translations.\n';
        return out;
    }

    _showDhcpBindings() {
        let out = 'Bindings from all pools not associated with VRF:\n';
        out += 'IP address          Client-ID           Lease expiration\n';
        for (const pool of this.node.dhcpPools) {
            if (pool.leases) {
                pool.leases.forEach((lease, ip) => {
                    out += `${ip.padEnd(20)}${(lease.mac || '').padEnd(20)}${lease.expires || 'infinite'}\n`;
                });
            }
        }
        return out;
    }

    _showVersion() {
        return `Cisco IOS Software, Version 15.2(4)M7\n` +
               `ROM: System Bootstrap\n` +
               `${this.hostname} uptime is ${Math.floor(Math.random() * 24)} hours, ${Math.floor(Math.random() * 60)} minutes\n` +
               `System image file is "flash:c2900-universalk9-mz.SPA.152-4.M7.bin"\n` +
               `\nProcessor: Simulated\n` +
               `${Object.keys(this.node.interfaces).length} ${this.node.type === 'router' ? 'GigabitEthernet/Serial' : 'FastEthernet/GigabitEthernet'} interfaces\n` +
               `256K bytes of non-volatile configuration memory.\n` +
               `Configuration register is 0x2102`;
    }

    _showIpProtocols() {
        let out = '';
        if (this.node.ospfConfig.enabled) {
            out += `Routing Protocol is "ospf 1"\n`;
            out += `  Router ID: ${this.node.ospfConfig.routerId || 'not set'}\n`;
            out += `  Networks:\n`;
            for (const n of this.node.ospfConfig.networks) out += `    ${n.network} ${n.wildcard} area ${n.area}\n`;
            out += '\n';
        }
        if (this.node.eigrpConfig.enabled) {
            out += `Routing Protocol is "eigrp ${this.node.eigrpConfig.asNumber}"\n`;
            out += `  Networks:\n`;
            for (const n of this.node.eigrpConfig.networks) out += `    ${n}\n`;
            out += '\n';
        }
        if (this.node.bgpConfig.enabled) {
            out += `Routing Protocol is "bgp ${this.node.bgpConfig.asNumber}"\n`;
            out += `  Neighbors:\n`;
            for (const n of this.node.bgpConfig.neighbors) out += `    ${n.ip} remote-as ${n.remoteAs}\n`;
            out += '\n';
        }
        if (!out) out = '% No routing protocol is configured.';
        return out;
    }

    _showCdpNeighbors() {
        return 'Capability Codes: R - Router, T - Trans Bridge, B - Source Route Bridge\n' +
               '                  S - Switch, H - Host, I - IGMP, r - Repeater\n\n' +
               'Device ID        Local Intrfce     Holdtme    Capability  Platform  Port ID\n' +
               '% CDP neighbor discovery is simulated.';
    }

    _showBgp() {
        if (!this.node.bgpConfig.enabled) return '% BGP is not enabled.';
        let out = `BGP table version is 1, local router ID is ${this.node.ospfConfig.routerId || '0.0.0.0'}\n`;
        out += `Status codes: s suppressed, d damped, h history, * valid, > best\n`;
        out += `   Network          Next Hop            Metric LocPrf Weight Path\n`;
        for (const n of this.node.bgpConfig.networks) {
            out += `*> ${n.network.padEnd(18)}0.0.0.0                  0         32768 i\n`;
        }
        return out;
    }

    // ─── PING / TRACEROUTE ─────────────────────────
    _ping(args) {
        if (args.length < 2) return '% Incomplete command.';
        const target = args[1];
        if (!isValidIP(target)) return `% Invalid IP address: ${target}`;
        return `__PING__${JSON.stringify({ target, count: 5 })}`;
    }

    _traceroute(args) {
        if (args.length < 2) return '% Incomplete command.';
        return `__TRACEROUTE__${args[1]}`;
    }

    // ─── CLEAR COMMANDS ────────────────────────────
    _clearCommands(cmd, args) {
        if (cmd.match(/clear\s+arp/i)) {
            this.node.arpTable.clear();
            this.notifyGraph();
            return 'ARP table cleared.';
        }
        if (cmd.match(/clear\s+mac\s+add/i)) {
            this.node.macTable.clear();
            this.notifyGraph();
            return 'MAC address table cleared.';
        }
        if (cmd.match(/clear\s+ip\s+route/i)) {
            this.node.routingTable = this.node.routingTable.filter(r => r.protocol === 'connected');
            this.notifyGraph();
            return 'IP routing table cleared.';
        }
        return '% Incomplete clear command.';
    }

    // ─── GLOBAL CONFIG MODE ────────────────────────
    _configMode(cmd, args, rawArgs) {
        // hostname
        if (cmd.startsWith('hostname ') && args.length >= 2) {
            this.hostname = rawArgs[1];
            this.node.hostname = rawArgs[1];
            this.node.name = rawArgs[1];
            this.notifyGraph();
            return '';
        }

        // interface
        if (cmd.startsWith('interface ') || cmd.startsWith('int ')) {
            const ifInput = rawArgs.slice(1).join(' ');
            const resolved = resolveInterfaceName(this.template, ifInput);
            
            if (this.node.interfaces[resolved]) {
                this.mode = 'iface';
                this.currentInterface = resolved;
                return '';
            }
            if (this.node.sviInterfaces && this.node.sviInterfaces[resolved]) {
                this.mode = 'iface';
                this.currentInterface = resolved;
                return '';
            }
            if (resolved.match(/^vlan\s*\d+$/i) || ifInput.match(/^vlan\s*\d+$/i)) {
                const vlanNum = resolved.match(/\d+/);
                if (vlanNum) {
                    const sviName = `Vlan${vlanNum[0]}`;
                    if (!this.node.sviInterfaces[sviName]) {
                        const genMac = () => {
                            const hex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
                            return `00:${hex()}:${hex()}:${hex()}:${hex()}:${hex()}`;
                        };
                        this.node.sviInterfaces[sviName] = { ip: '', subnet: '', mac: genMac(), state: 'up', description: '' };
                    }
                    this.mode = 'iface';
                    this.currentInterface = sviName;
                    return '';
                }
            }
            return `% Invalid interface type and number`;
        }

        // vlan
        if (cmd.startsWith('vlan ') && args.length >= 2) {
            const vid = parseInt(args[1]);
            if (vid >= 2 && vid <= 4094) {
                if (!this.node.vlans[vid]) this.node.vlans[vid] = { name: `VLAN${vid}` };
                this.mode = 'vlan';
                this.currentVlan = vid;
                this.notifyGraph();
                return '';
            }
            return '% VLAN ID out of range (2-4094).';
        }

        // ip route (static routing)
        if (cmd.startsWith('ip route ') && args.length >= 5) {
            const network = args[2];
            const mask = args[3];
            const nextHopOrIface = args[4];
            
            if (!isValidIP(network)) return '% Invalid network address.';
            
            const cidr = maskToCidr(mask);
            this.node.routingTable.push({
                network, mask, cidr,
                nextHop: isValidIP(nextHopOrIface) ? nextHopOrIface : '',
                interface: !isValidIP(nextHopOrIface) ? nextHopOrIface : '',
                protocol: 'static',
                metric: 0,
                ad: 1
            });
            this.notifyGraph();
            return '';
        }

        // no ip route
        if (cmd.startsWith('no ip route ') && args.length >= 5) {
            const network = args[3];
            const mask = args[4];
            this.node.routingTable = this.node.routingTable.filter(r => !(r.network === network && r.mask === mask && r.protocol === 'static'));
            this.notifyGraph();
            return '';
        }

        // router ospf
        if (cmd.startsWith('router ospf')) {
            this.node.ospfConfig.enabled = true;
            this.mode = 'router_ospf';
            this.notifyGraph();
            return '';
        }

        // router eigrp
        if (cmd.startsWith('router eigrp ') && args.length >= 3) {
            this.node.eigrpConfig.enabled = true;
            this.node.eigrpConfig.asNumber = parseInt(args[2]);
            this.mode = 'router_eigrp';
            this.notifyGraph();
            return '';
        }

        // router bgp
        if (cmd.startsWith('router bgp ') && args.length >= 3) {
            this.node.bgpConfig.enabled = true;
            this.node.bgpConfig.asNumber = parseInt(args[2]);
            this.mode = 'router_bgp';
            this.notifyGraph();
            return '';
        }

        // access-list (standard)
        if (cmd.startsWith('access-list ')) {
            return this._parseAccessList(cmd, args);
        }

        // ip dhcp pool
        if (cmd.startsWith('ip dhcp pool ') && args.length >= 4) {
            const poolName = rawArgs[3];
            let pool = this.node.dhcpPools.find(p => p.name === poolName);
            if (!pool) {
                pool = { name: poolName, network: '', mask: '', defaultRouter: '', dns: '', excludeStart: '', excludeEnd: '', leases: new Map() };
                this.node.dhcpPools.push(pool);
            }
            this.currentDhcpPool = pool;
            this.mode = 'dhcp';
            return '';
        }

        // ip dhcp excluded-address
        if (cmd.startsWith('ip dhcp excluded-address ')) {
            return '';
        }

        // ip nat inside source static
        if (cmd.startsWith('ip nat inside source static ') && args.length >= 7) {
            this.node.natConfig.staticMaps.push({ inside: args[5], outside: args[6] });
            this.notifyGraph();
            return '';
        }

        // ip nat inside source list ... overload
        if (cmd.includes('ip nat inside source list')) {
            this.node.natConfig.overload = cmd.includes('overload');
            return '';
        }

        // ip routing (for L3 switches)
        if (cmd === 'ip routing') {
            return '';
        }

        // spanning-tree vlan priority
        if (cmd.startsWith('spanning-tree vlan ')) {
            const vlanId = args[2];
            this.node.stpConfig.vlanPriorities = this.node.stpConfig.vlanPriorities || {};
            if (args[3] === 'priority') {
                const priority = parseInt(args[4]) || 32768;
                this.node.stpConfig.priority = priority;
                this.node.stpConfig.vlanPriorities[vlanId] = priority;
            } else if (args[3] === 'root' && args[4] === 'primary') {
                this.node.stpConfig.rootBridge = true;
                this.node.stpConfig.priority = 24576;
                this.node.stpConfig.vlanPriorities[vlanId] = 24576;
            }
            this.notifyGraph();
            return '';
        }

        // line
        if (cmd.startsWith('line ')) {
            this.mode = 'line';
            return '';
        }

        // banner motd
        if (cmd.startsWith('banner motd ')) {
            this.bannerMotd = rawArgs.slice(2).join(' ').replace(/\^/g, '');
            return '';
        }

        // no commands
        if (cmd.startsWith('no ')) {
            if (cmd.startsWith('no vlan ')) {
                const vid = parseInt(args[2]);
                if (this.node.vlans[vid]) {
                    delete this.node.vlans[vid];
                    this.notifyGraph();
                }
                return '';
            }
            if (cmd.startsWith('no router ospf')) {
                this.node.ospfConfig.enabled = false;
                this.node.ospfConfig.networks = [];
                this.notifyGraph();
                return '';
            }
            if (cmd.startsWith('no access-list ')) {
                const aclId = args[2];
                this.node.aclRules = this.node.aclRules.filter(a => a.id !== aclId);
                this.notifyGraph();
                return '';
            }
            return '';
        }

        // enable password / secret
        if (cmd.startsWith('enable password ') || cmd.startsWith('enable secret ')) {
            this.enablePassword = args[2];
            return '';
        }

        return `% Invalid input detected at '^' marker.`;
    }

    // ─── INTERFACE CONFIG MODE ─────────────────────
    _ifaceMode(cmd, args, rawArgs) {
        const iface = this.node.interfaces[this.currentInterface] || this.node.sviInterfaces[this.currentInterface];
        if (!iface) return '% Interface not found.';

        // ip address
        if (cmd.startsWith('ip address ') && args.length >= 4) {
            iface.ip = args[2];
            const mask = args[3];
            if (mask.includes('.')) {
                iface.subnet = String(maskToCidr(mask));
            } else {
                iface.subnet = mask;
            }
            this.notifyGraph();
            return '';
        }

        // no ip address
        if (cmd === 'no ip address') {
            iface.ip = '';
            iface.subnet = '';
            this.notifyGraph();
            return '';
        }

        // shutdown / no shutdown
        if (cmd === 'shutdown' || cmd === 'shut') {
            iface.state = 'down';
            this.notifyGraph();
            return `%LINK-5-CHANGED: Interface ${this.currentInterface}, changed state to administratively down\n%LINEPROTO-5-UPDOWN: Line protocol on Interface ${this.currentInterface}, changed state to down`;
        }
        if (cmd === 'no shutdown' || cmd === 'no shut') {
            iface.state = 'up';
            this.notifyGraph();
            return `%LINK-5-CHANGED: Interface ${this.currentInterface}, changed state to up\n%LINEPROTO-5-UPDOWN: Line protocol on Interface ${this.currentInterface}, changed state to up`;
        }

        // description
        if (cmd.startsWith('description ')) {
            iface.description = rawArgs.slice(1).join(' ');
            return '';
        }

        // switchport mode
        if (cmd === 'switchport mode access') {
            iface.switchportMode = 'access';
            this.notifyGraph();
            return '';
        }
        if (cmd === 'switchport mode trunk') {
            iface.switchportMode = 'trunk';
            this.notifyGraph();
            return '';
        }

        // switchport access vlan
        if (cmd.startsWith('switchport access vlan ') && args.length >= 4) {
            const vid = parseInt(args[3]);
            if (!this.node.vlans[vid]) this.node.vlans[vid] = { name: `VLAN${vid}` };
            iface.accessVlan = vid;
            this.notifyGraph();
            return '';
        }

        // switchport trunk allowed vlan
        if (cmd.startsWith('switchport trunk allowed vlan ')) {
            iface.trunkAllowed = rawArgs.slice(5).join(' ');
            return '';
        }

        // speed
        if (cmd.startsWith('speed ')) {
            iface.speed = args[1];
            return '';
        }

        // duplex
        if (cmd.startsWith('duplex ')) {
            iface.duplex = args[1];
            return '';
        }

        // ip nat inside/outside
        if (cmd === 'ip nat inside') {
            if (!this.node.natConfig.insideIfaces.includes(this.currentInterface))
                this.node.natConfig.insideIfaces.push(this.currentInterface);
            return '';
        }
        if (cmd === 'ip nat outside') {
            if (!this.node.natConfig.outsideIfaces.includes(this.currentInterface))
                this.node.natConfig.outsideIfaces.push(this.currentInterface);
            return '';
        }

        // ip access-group
        if (cmd.startsWith('ip access-group ')) {
            iface.aclApplied = iface.aclApplied || {};
            iface.aclApplied[args[3] || 'in'] = args[2];
            this.notifyGraph();
            return '';
        }

        // clock rate (serial)
        if (cmd.startsWith('clock rate ') || cmd.startsWith('clockrate ')) {
            iface.clockRate = args[args.length - 1];
            return '';
        }

        // encapsulation
        if (cmd.startsWith('encapsulation ')) {
            iface.encapsulation = args[1];
            return '';
        }

        // channel-group (EtherChannel)
        if (cmd.startsWith('channel-group ')) {
            return '';
        }

        return `% Invalid input detected at '^' marker.`;
    }

    // ─── OSPF CONFIG MODE ──────────────────────────
    _ospfMode(cmd, args) {
        // network <ip> <wildcard> area <id>
        if (cmd.startsWith('network ') && args.length >= 5) {
            this.node.ospfConfig.networks.push({
                network: args[1],
                wildcard: args[2],
                area: args[4]
            });
            this.notifyGraph();
            return '';
        }
        // router-id
        if (cmd.startsWith('router-id ') && args.length >= 2) {
            this.node.ospfConfig.routerId = args[1];
            this.notifyGraph();
            return '';
        }
        // passive-interface
        if (cmd.startsWith('passive-interface ')) {
            return '';
        }
        // default-information originate
        if (cmd.startsWith('default-information originate')) {
            return '';
        }
        // no network
        if (cmd.startsWith('no network ') && args.length >= 6) {
            const net = args[2];
            const wc = args[3];
            this.node.ospfConfig.networks = this.node.ospfConfig.networks.filter(n => !(n.network === net && n.wildcard === wc));
            this.notifyGraph();
            return '';
        }
        return `% Invalid input detected at '^' marker.`;
    }

    // ─── EIGRP CONFIG MODE ─────────────────────────
    _eigrpMode(cmd, args) {
        if (cmd.startsWith('network ') && args.length >= 2) {
            this.node.eigrpConfig.networks.push(args[1]);
            this.notifyGraph();
            return '';
        }
        if (cmd.startsWith('no network ') && args.length >= 3) {
            this.node.eigrpConfig.networks = this.node.eigrpConfig.networks.filter(n => n !== args[2]);
            this.notifyGraph();
            return '';
        }
        return `% Invalid input detected at '^' marker.`;
    }

    // ─── BGP CONFIG MODE ───────────────────────────
    _bgpMode(cmd, args) {
        // neighbor <ip> remote-as <asn>
        if (cmd.startsWith('neighbor ') && args.length >= 4 && args[2] === 'remote-as') {
            this.node.bgpConfig.neighbors.push({
                ip: args[1],
                remoteAs: parseInt(args[3])
            });
            this.notifyGraph();
            return '';
        }
        // network <ip> mask <mask>
        if (cmd.startsWith('network ') && args.length >= 4) {
            this.node.bgpConfig.networks.push({
                network: args[1],
                mask: args[3] || '255.255.255.0'
            });
            this.notifyGraph();
            return '';
        }
        return `% Invalid input detected at '^' marker.`;
    }

    // ─── VLAN CONFIG MODE ──────────────────────────
    _vlanMode(cmd, args, rawArgs) {
        if (cmd.startsWith('name ') && args.length >= 2) {
            if (this.node.vlans[this.currentVlan]) {
                this.node.vlans[this.currentVlan].name = rawArgs.slice(1).join(' ');
                this.notifyGraph();
            }
            return '';
        }
        return `% Invalid input detected at '^' marker.`;
    }

    // ─── DHCP CONFIG MODE ──────────────────────────
    _dhcpMode(cmd, args) {
        if (!this.currentDhcpPool) return '% No DHCP pool context.';

        if (cmd.startsWith('network ') && args.length >= 3) {
            this.currentDhcpPool.network = args[1];
            this.currentDhcpPool.mask = args[2];
            this.notifyGraph();
            return '';
        }
        if (cmd.startsWith('default-router ') && args.length >= 2) {
            this.currentDhcpPool.defaultRouter = args[1];
            return '';
        }
        if (cmd.startsWith('dns-server ') && args.length >= 2) {
            this.currentDhcpPool.dns = args[1];
            return '';
        }
        return `% Invalid input detected at '^' marker.`;
    }

    // ─── ACL PARSING ───────────────────────────────
    _parseAccessList(cmd, args) {
        if (args.length < 3) return '% Incomplete access-list command.';
        const id = args[1];
        const numId = parseInt(id);
        
        let acl = this.node.aclRules.find(a => a.id === id);
        if (!acl) {
            acl = { id, type: (numId >= 1 && numId <= 99) ? 'standard' : 'extended', entries: [] };
            this.node.aclRules.push(acl);
        }

        const action = args[2]; // permit or deny
        if (action !== 'permit' && action !== 'deny') return '% Invalid action.';

        if (acl.type === 'standard') {
            acl.entries.push({ action, source: args[3] || 'any' });
        } else {
            acl.entries.push({
                action,
                protocol: args[3] || 'ip',
                source: args[4] || 'any',
                destination: args.slice(5).join(' ') || 'any'
            });
        }
        this.notifyGraph();
        return '';
    }
}
