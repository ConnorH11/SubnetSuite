// sim-cli.js
// CLI Router — delegates to vendor-specific CLI implementations
// Also handles Linux/Windows terminal emulation for PCs and servers

import { CiscoCLI } from './sim-cli-cisco.js';
import { JuniperCLI } from './sim-cli-juniper.js';
import { isValidIP, getNetAddr } from './sim-math.js';

// Factory: create the right CLI for a given node
export function createCLI(node, notifyGraph) {
    switch (node.cliType) {
        case 'cisco': return new CiscoCLI(node, notifyGraph);
        case 'juniper': return new JuniperCLI(node, notifyGraph);
        case 'linux': return new LinuxCLI(node, notifyGraph);
        case 'windows': return new WindowsCLI(node, notifyGraph);
        default: return new CiscoCLI(node, notifyGraph); // fallback
    }
}

// ═══════════════════════════════════════════════════
// LINUX TERMINAL EMULATION
// ═══════════════════════════════════════════════════
export class LinuxCLI {
    constructor(node, notifyGraph) {
        this.node = node;
        this.notifyGraph = notifyGraph;
        this.hostname = node.hostname || node.name;
        this.user = 'root';
        this.cwd = '/home/user';
        this.history = [];
        this.historyIndex = -1;
        this.env = {
            HOME: '/home/user',
            USER: 'root',
            SHELL: '/bin/bash',
            PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
        };
    }

    getPrompt() {
        const shortCwd = this.cwd === '/home/user' ? '~' : this.cwd;
        return `${this.user}@${this.hostname}:${shortCwd}$ `;
    }

    addHistory(cmd) {
        if (cmd && cmd.trim()) { this.history.push(cmd); if (this.history.length > 100) this.history.shift(); }
        this.historyIndex = this.history.length;
    }
    getPrevHistory() { if (this.historyIndex > 0) { this.historyIndex--; return this.history[this.historyIndex]; } return this.history[0] || ''; }
    getNextHistory() { if (this.historyIndex < this.history.length - 1) { this.historyIndex++; return this.history[this.historyIndex]; } this.historyIndex = this.history.length; return ''; }

    tabComplete(partial) {
        const cmds = ['ping', 'traceroute', 'ifconfig', 'ip', 'route', 'arp', 'netstat', 'nslookup', 'dig', 'curl', 'wget',
                       'ssh', 'telnet', 'ftp', 'cat', 'ls', 'cd', 'pwd', 'mkdir', 'rm', 'echo', 'touch', 'clear', 'man',
                       'hostname', 'whoami', 'uname', 'date', 'uptime', 'free', 'df', 'ps', 'kill', 'history', 'export',
                       'iptables', 'tcpdump', 'nmap', 'ss', 'grep', 'find', 'chmod', 'chown', 'nano', 'vi', 'exit', 'help'];
        return cmds.filter(c => c.startsWith(partial.toLowerCase()));
    }

    execute(commandStr) {
        const raw = commandStr.trim();
        if (!raw) return '';
        this.addHistory(raw);

        // Handle pipes (simplified)
        if (raw.includes('|')) {
            const parts = raw.split('|').map(s => s.trim());
            let output = this.execute(parts[0]);
            for (let i = 1; i < parts.length; i++) {
                output = this._pipeFilter(output, parts[i]);
            }
            return output;
        }

        const args = raw.split(/\s+/);
        const cmd = args[0].toLowerCase();

        switch (cmd) {
            case 'ping': return this._ping(args);
            case 'traceroute': case 'tracert': return this._traceroute(args);
            case 'ifconfig': return this._ifconfig(args);
            case 'ip': return this._ipCommand(args);
            case 'route': return this._route(args);
            case 'arp': return this._arp(args);
            case 'netstat': case 'ss': return this._netstat();
            case 'nslookup': case 'dig': return this._nslookup(args);
            case 'curl': case 'wget': return this._curl(args);
            case 'ssh': return this._ssh(args);
            case 'telnet': return this._telnet(args);
            case 'hostname': return args[1] ? (() => { this.hostname = args[1]; this.node.name = args[1]; this.node.hostname = args[1]; this.notifyGraph(); return ''; })() : this.hostname;
            case 'whoami': return this.user;
            case 'uname': return args[1] === '-a' ? 'Linux ' + this.hostname + ' 5.15.0-sim #1 SMP x86_64 GNU/Linux' : 'Linux';
            case 'date': return new Date().toString();
            case 'uptime': return ` ${new Date().toLocaleTimeString()} up ${Math.floor(Math.random() * 24)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}, 1 user, load average: 0.00, 0.01, 0.05`;
            case 'free': return '              total        used        free      shared  buff/cache   available\nMem:        8167740     1523456     4891284      167892     1753000     6184000\nSwap:       2097148           0     2097148';
            case 'df': return 'Filesystem     1K-blocks    Used Available Use% Mounted on\n/dev/sda1       51475068 4923456  43912820  11% /\ntmpfs            4083868       0   4083868   0% /dev/shm';
            case 'ps': return '  PID TTY          TIME CMD\n    1 ?        00:00:01 systemd\n  234 tty1     00:00:00 bash\n  567 tty1     00:00:00 ps';
            case 'cat': return this._cat(args);
            case 'ls': return this._ls(args);
            case 'cd': return this._cd(args);
            case 'pwd': return this.cwd;
            case 'mkdir': return this._mkdir(args);
            case 'rm': return this._rm(args);
            case 'touch': return this._touch(args);
            case 'echo': return args.slice(1).join(' ');
            case 'clear': return '__CLEAR__';
            case 'history': return this.history.map((h, i) => `  ${i + 1}  ${h}`).join('\n');
            case 'export': if (args[1]) { const [k, v] = args[1].split('='); this.env[k] = v; } return '';
            case 'env': case 'printenv': return Object.entries(this.env).map(([k, v]) => `${k}=${v}`).join('\n');
            case 'iptables': return this._iptables(args);
            case 'tcpdump': return 'tcpdump: listening on eth0 (simulated)\n^C\n0 packets captured';
            case 'nmap': return args[1] ? `Starting Nmap scan of ${args[1]}...\n22/tcp   open  ssh\n80/tcp   open  http\n443/tcp  open  https\nNmap done: 1 IP address (1 host up) scanned in 0.03 seconds` : 'Usage: nmap <target>';
            case 'man': return args[1] ? `Manual page for ${args[1]}\n\nNAME\n    ${args[1]} - simulated command\n\nDESCRIPTION\n    This is a simulated environment. Type the command for usage info.` : 'What manual page do you want?';
            case 'exit': case 'logout': return '__EXIT__';
            case 'help': return 'Available commands:\n  ping, traceroute, ifconfig, ip, route, arp, netstat, nslookup, dig,\n  curl, wget, ssh, telnet, cat, ls, cd, pwd, mkdir, rm, echo, touch,\n  hostname, whoami, uname, date, uptime, free, df, ps, history,\n  iptables, tcpdump, nmap, clear, exit, help';
            default: return `bash: ${cmd}: command not found`;
        }
    }

    _ping(args) {
        if (args.length < 2) return 'Usage: ping <destination>';
        return `__PING__${args[1]}`;
    }

    _traceroute(args) {
        if (args.length < 2) return 'Usage: traceroute <destination>';
        return `__TRACEROUTE__${args[1]}`;
    }

    _ifconfig(args) {
        let out = '';
        for (const [name, iface] of Object.entries(this.node.interfaces)) {
            out += `${name}: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500\n`;
            if (iface.ip) {
                const cidr = parseInt(iface.subnet) || 24;
                out += `        inet ${iface.ip}  netmask ${_cidrToMaskLocal(cidr)}  broadcast ${iface.ip}\n`;
            }
            if (iface.mac) out += `        ether ${iface.mac}  txqueuelen 1000  (Ethernet)\n`;
            out += `        RX packets ${this.node.packetsReceived}  bytes ${this.node.packetsReceived * 64}\n`;
            out += `        TX packets ${this.node.packetsSent}  bytes ${this.node.packetsSent * 64}\n\n`;
        }
        out += `lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536\n        inet 127.0.0.1  netmask 255.0.0.0\n`;
        return out;
    }

    _ipCommand(args) {
        if (args.length < 2) return 'Usage: ip <addr|route|link|neigh>';
        const sub = args[1];
        if (sub === 'addr' || sub === 'a' || sub === 'address') {
            let out = '1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536\n    inet 127.0.0.1/8 scope host lo\n';
            let idx = 2;
            for (const [name, iface] of Object.entries(this.node.interfaces)) {
                const state = iface.state === 'up' ? 'UP,LOWER_UP' : 'DOWN';
                out += `${idx}: ${name}: <BROADCAST,MULTICAST,${state}> mtu 1500\n`;
                if (iface.mac) out += `    link/ether ${iface.mac}\n`;
                if (iface.ip) out += `    inet ${iface.ip}/${iface.subnet} scope global ${name}\n`;
                idx++;
            }
            return out;
        }
        if (sub === 'route' || sub === 'r') {
            let out = '';
            if (this.node.gateway) out += `default via ${this.node.gateway} dev eth0\n`;
            for (const [name, iface] of Object.entries(this.node.interfaces)) {
                if (iface.ip && iface.state === 'up') {
                    const cidr = parseInt(iface.subnet) || 24;
                    const net = getNetAddr(iface.ip, cidr);
                    out += `${net}/${cidr} dev ${name} proto kernel scope link src ${iface.ip}\n`;
                }
            }
            for (const r of this.node.routingTable) {
                out += `${r.network}/${r.cidr} via ${r.nextHop || 'direct'} dev ${r.interface || 'eth0'}\n`;
            }
            return out || 'No routes configured.';
        }
        if (sub === 'link' || sub === 'l') {
            let out = '1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536\n';
            let idx = 2;
            for (const [name, iface] of Object.entries(this.node.interfaces)) {
                out += `${idx}: ${name}: <BROADCAST,MULTICAST,${iface.state === 'up' ? 'UP' : 'DOWN'}> mtu 1500\n    link/ether ${iface.mac || '00:00:00:00:00:00'}\n`;
                idx++;
            }
            return out;
        }
        if (sub === 'neigh' || sub === 'neighbor') {
            let out = '';
            this.node.arpTable.forEach((entry, ip) => {
                out += `${ip} dev ${entry.interface || 'eth0'} lladdr ${entry.mac || '??:??:??:??:??:??'} ${entry.type === 'static' ? 'PERMANENT' : 'REACHABLE'}\n`;
            });
            return out || 'No ARP entries.';
        }
        return 'Usage: ip <addr|route|link|neigh>';
    }

    _route(args) {
        if (args.length >= 2 && args[1] === '-n') {
            let out = 'Kernel IP routing table\nDestination     Gateway         Genmask         Flags Metric Ref    Use Iface\n';
            if (this.node.gateway) out += `0.0.0.0         ${this.node.gateway.padEnd(16)}0.0.0.0         UG    100    0        0 eth0\n`;
            for (const [name, iface] of Object.entries(this.node.interfaces)) {
                if (iface.ip) {
                    const cidr = parseInt(iface.subnet) || 24;
                    const net = getNetAddr(iface.ip, cidr);
                    out += `${net.padEnd(16)}${'0.0.0.0'.padEnd(16)}${_cidrToMaskLocal(cidr).padEnd(16)}U     100    0        0 ${name}\n`;
                }
            }
            return out;
        }
        return 'Usage: route [-n]';
    }

    _arp(args) {
        if (args[1] === '-a' || args.length === 1) {
            let out = '';
            this.node.arpTable.forEach((entry, ip) => {
                out += `? (${ip}) at ${entry.mac || '(incomplete)'} [ether] on ${entry.interface || 'eth0'}\n`;
            });
            return out || 'No ARP entries.';
        }
        return 'Usage: arp [-a]';
    }

    _netstat() {
        return 'Active Internet connections (servers and established)\nProto Recv-Q Send-Q Local Address           Foreign Address         State\ntcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN\ntcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN';
    }

    _nslookup(args) {
        if (args.length < 2) return 'Usage: nslookup <hostname>';
        const hostname = args[1];
        return `__NSLOOKUP__${hostname}`;
    }

    _curl(args) {
        if (args.length < 2) return 'Usage: curl <url>';
        return `__CURL__${args[1]}`;
    }

    _ssh(args) {
        if (args.length < 2) return 'Usage: ssh <user@host>';
        return `__SSH__${args[1]}`;
    }

    _telnet(args) {
        if (args.length < 2) return 'Usage: telnet <host> [port]';
        return `__TELNET__${args[1]}__${args[2] || '23'}`;
    }

    // ─── Filesystem Operations ─────────────────────
    _resolvePath(p) {
        let target = p;
        if (!target.startsWith('/')) {
            target = this.cwd + '/' + target;
        }
        // Normalize
        const parts = target.split('/').filter(Boolean);
        const resolved = [];
        for (const part of parts) {
            if (part === '..') resolved.pop();
            else if (part !== '.') resolved.push(part);
        }
        return '/' + resolved.join('/');
    }

    _getNode(path) {
        const parts = path.split('/').filter(Boolean);
        let current = this.node.filesystem['/'];
        for (const part of parts) {
            if (!current || current.type !== 'dir' || !current.children[part]) return null;
            current = current.children[part];
        }
        return current;
    }

    _cat(args) {
        if (args.length < 2) return 'Usage: cat <file>';
        const path = this._resolvePath(args[1]);
        const node = this._getNode(path);
        if (!node) return `cat: ${args[1]}: No such file or directory`;
        if (node.type === 'dir') return `cat: ${args[1]}: Is a directory`;
        return node.content || '';
    }

    _ls(args) {
        const showAll = args.includes('-a') || args.includes('-la') || args.includes('-al');
        const showLong = args.includes('-l') || args.includes('-la') || args.includes('-al');
        const target = args.find(a => !a.startsWith('-') && a !== 'ls') || '.';
        const path = this._resolvePath(target);
        const node = this._getNode(path);
        if (!node) return `ls: cannot access '${target}': No such file or directory`;
        if (node.type !== 'dir') return target;

        const entries = Object.entries(node.children);
        if (showAll) entries.unshift(['.', { type: 'dir' }], ['..', { type: 'dir' }]);

        if (showLong) {
            let out = `total ${entries.length}\n`;
            for (const [name, child] of entries) {
                const perm = child.type === 'dir' ? 'drwxr-xr-x' : '-rw-r--r--';
                const size = child.content ? child.content.length : 4096;
                out += `${perm}  1 root root ${String(size).padStart(6)} Apr 23 12:00 ${name}\n`;
            }
            return out;
        }
        return entries.map(([name, child]) => child.type === 'dir' ? `\x1b[34m${name}\x1b[0m` : name).join('  ');
    }

    _cd(args) {
        const target = args[1] || '/home/user';
        const path = this._resolvePath(target);
        const node = this._getNode(path);
        if (!node) return `bash: cd: ${target}: No such file or directory`;
        if (node.type !== 'dir') return `bash: cd: ${target}: Not a directory`;
        this.cwd = path;
        return '';
    }

    _mkdir(args) {
        if (args.length < 2) return 'Usage: mkdir <directory>';
        const path = this._resolvePath(args[1]);
        const parts = path.split('/').filter(Boolean);
        const dirName = parts.pop();
        const parentPath = '/' + parts.join('/');
        const parent = this._getNode(parentPath);
        if (!parent || parent.type !== 'dir') return `mkdir: cannot create directory '${args[1]}': No such file or directory`;
        if (parent.children[dirName]) return `mkdir: cannot create directory '${args[1]}': File exists`;
        parent.children[dirName] = { type: 'dir', children: {} };
        return '';
    }

    _rm(args) {
        if (args.length < 2) return 'Usage: rm <file>';
        const target = args.find(a => !a.startsWith('-') && a !== 'rm');
        if (!target) return 'Usage: rm <file>';
        const path = this._resolvePath(target);
        const parts = path.split('/').filter(Boolean);
        const name = parts.pop();
        const parentPath = '/' + parts.join('/');
        const parent = this._getNode(parentPath);
        if (!parent || !parent.children[name]) return `rm: cannot remove '${target}': No such file or directory`;
        delete parent.children[name];
        return '';
    }

    _touch(args) {
        if (args.length < 2) return 'Usage: touch <file>';
        const path = this._resolvePath(args[1]);
        const parts = path.split('/').filter(Boolean);
        const fileName = parts.pop();
        const parentPath = '/' + parts.join('/');
        const parent = this._getNode(parentPath);
        if (!parent || parent.type !== 'dir') return `touch: cannot touch '${args[1]}': No such file or directory`;
        if (!parent.children[fileName]) {
            parent.children[fileName] = { type: 'file', content: '' };
        }
        return '';
    }

    _iptables(args) {
        if (args.includes('-L')) {
            return 'Chain INPUT (policy ACCEPT)\ntarget     prot opt source               destination\n\nChain FORWARD (policy ACCEPT)\ntarget     prot opt source               destination\n\nChain OUTPUT (policy ACCEPT)\ntarget     prot opt source               destination';
        }
        return 'Usage: iptables [-L]';
    }

    _pipeFilter(input, filterCmd) {
        const parts = filterCmd.split(/\s+/);
        if (parts[0] === 'grep' && parts[1]) {
            const pattern = parts[1].toLowerCase();
            return input.split('\n').filter(line => line.toLowerCase().includes(pattern)).join('\n');
        }
        if (parts[0] === 'head') {
            const n = parseInt(parts[1]) || 10;
            return input.split('\n').slice(0, n).join('\n');
        }
        if (parts[0] === 'tail') {
            const n = parseInt(parts[1]) || 10;
            return input.split('\n').slice(-n).join('\n');
        }
        if (parts[0] === 'wc') {
            const lines = input.split('\n');
            return `${lines.length} ${input.split(/\s+/).length} ${input.length}`;
        }
        if (parts[0] === 'sort') {
            return input.split('\n').sort().join('\n');
        }
        return input;
    }
}

// ═══════════════════════════════════════════════════
// WINDOWS CMD EMULATION
// ═══════════════════════════════════════════════════
export class WindowsCLI {
    constructor(node, notifyGraph) {
        this.node = node;
        this.notifyGraph = notifyGraph;
        this.hostname = node.hostname || node.name;
        this.cwd = 'C:\\Users\\Admin';
        this.history = [];
        this.historyIndex = -1;
        this.env = {
            COMPUTERNAME: node.hostname || node.name,
            USERNAME: 'Admin',
            USERPROFILE: 'C:\\Users\\Admin',
            HOMEDRIVE: 'C:',
            HOMEPATH: '\\Users\\Admin',
            OS: 'Windows_NT',
            PROCESSOR_ARCHITECTURE: 'AMD64',
            SystemRoot: 'C:\\Windows',
            TEMP: 'C:\\Users\\Admin\\AppData\\Local\\Temp',
        };
    }

    getPrompt() { return `${this.cwd}>`; }

    addHistory(cmd) { if (cmd && cmd.trim()) { this.history.push(cmd); if (this.history.length > 100) this.history.shift(); } this.historyIndex = this.history.length; }
    getPrevHistory() { if (this.historyIndex > 0) { this.historyIndex--; return this.history[this.historyIndex]; } return this.history[0] || ''; }
    getNextHistory() { if (this.historyIndex < this.history.length - 1) { this.historyIndex++; return this.history[this.historyIndex]; } this.historyIndex = this.history.length; return ''; }

    tabComplete(partial) {
        return ['ping', 'tracert', 'ipconfig', 'netstat', 'arp', 'nslookup', 'route', 'hostname',
                'systeminfo', 'cls', 'dir', 'echo', 'exit', 'help', 'netsh', 'pathping', 'whoami',
                'tasklist', 'type', 'cd', 'mkdir', 'rmdir', 'del', 'copy', 'set', 'ver', 'getmac',
                'net', 'wmic', 'shutdown', 'taskkill', 'findstr', 'more', 'tree', 'chkdsk', 'sfc',
                'powershell', 'gpresult', 'nbtstat']
            .filter(c => c.startsWith(partial.toLowerCase()));
    }

    execute(commandStr) {
        const raw = commandStr.trim();
        if (!raw) return '';
        this.addHistory(raw);

        // Handle pipes (simplified)
        if (raw.includes('|')) {
            const parts = raw.split('|').map(s => s.trim());
            let output = this.execute(parts[0]);
            for (let i = 1; i < parts.length; i++) {
                output = this._pipeFilter(output, parts[i]);
            }
            return output;
        }

        const args = raw.split(/\s+/);
        const cmd = args[0].toLowerCase();

        switch (cmd) {
            case 'ping': return args.length < 2 ? 'Usage: ping <destination>' : `__PING__${args[1]}`;
            case 'tracert': return args.length < 2 ? 'Usage: tracert <destination>' : `__TRACEROUTE__${args[1]}`;
            case 'pathping': return args.length < 2 ? 'Usage: pathping <destination>' : `__TRACEROUTE__${args[1]}`;
            case 'ipconfig': return this._ipconfig(args);
            case 'netstat': return this._netstat(args);
            case 'arp': return this._arp(args);
            case 'nslookup': return args.length < 2 ? 'Usage: nslookup <hostname>' : `__NSLOOKUP__${args[1]}`;
            case 'route': return this._route(args);
            case 'hostname': return args[1] ? (() => { this.hostname = args[1]; this.node.name = args[1]; this.node.hostname = args[1]; this.env.COMPUTERNAME = args[1]; this.notifyGraph(); return ''; })() : this.hostname;
            case 'systeminfo': return this._systeminfo();
            case 'cls': return '__CLEAR__';
            case 'dir': return this._dir(args);
            case 'cd': case 'chdir': return this._cd(args);
            case 'type': return this._type(args);
            case 'mkdir': case 'md': return this._mkdir(args);
            case 'rmdir': case 'rd': return args.length < 2 ? 'The syntax of the command is incorrect.' : 'Directory removed.';
            case 'del': case 'erase': return args.length < 2 ? 'The syntax of the command is incorrect.' : 'File(s) deleted.';
            case 'copy': return args.length < 3 ? 'The syntax of the command is incorrect.' : '        1 file(s) copied.';
            case 'echo': return args.slice(1).join(' ');
            case 'exit': return '__EXIT__';
            case 'netsh': return this._netsh(args);
            case 'whoami': return `${this.hostname}\\Admin`;
            case 'ver': return '\nMicrosoft Windows [Version 10.0.19045.3693]';
            case 'set': return this._set(args);
            case 'getmac': return this._getmac();
            case 'tasklist': return this._tasklist();
            case 'taskkill': return args.length < 2 ? 'ERROR: Invalid syntax.' : `SUCCESS: The process with PID ${Math.floor(Math.random()*9000)+1000} has been terminated.`;
            case 'net': return this._net(args);
            case 'wmic': return this._wmic(args);
            case 'shutdown': return 'System shutdown initiated. (simulated)';
            case 'findstr': return args.length < 2 ? 'FINDSTR: Bad command line' : '(no matches found in simulated environment)';
            case 'tree': return 'C:\\Users\\Admin\n├── Desktop\n├── Documents\n├── Downloads\n└── AppData';
            case 'chkdsk': return 'Windows has scanned the file system and found no problems.\n No further action is required.';
            case 'sfc': return args.includes('/scannow') ? 'Beginning system scan. This process will take some time.\n\nWindows Resource Protection did not find any integrity violations.' : 'Usage: sfc /scannow';
            case 'gpresult': return `Computer Name:     ${this.hostname}\nUser Name:         ${this.hostname}\\Admin\nDomain:            WORKGROUP\nApplied Group Policy Objects: None`;
            case 'nbtstat': return this._nbtstat(args);
            case 'powershell': return 'Windows PowerShell\nCopyright (C) Microsoft Corporation.\n\nPS C:\\Users\\Admin> (type commands or "exit" to return to CMD)';
            case 'help': return 'Available commands:\n  ping         tracert      ipconfig     netstat      arp\n  nslookup     route        hostname     systeminfo   cls\n  dir          cd           type         mkdir        rmdir\n  del          copy         echo         set          ver\n  getmac       whoami       tasklist     taskkill     net\n  wmic         netsh        pathping     findstr      tree\n  chkdsk       sfc          gpresult     nbtstat      shutdown\n  powershell   exit         help';
            default: return `'${cmd}' is not recognized as an internal or external command,\noperable program or batch file.`;
        }
    }

    _pipeFilter(input, filterCmd) {
        const parts = filterCmd.split(/\s+/);
        if (parts[0].toLowerCase() === 'findstr' && parts[1]) {
            const pattern = parts[1].toLowerCase().replace(/"/g, '');
            return input.split('\n').filter(l => l.toLowerCase().includes(pattern)).join('\n') || '(no matches)';
        }
        if (parts[0].toLowerCase() === 'more') return input;
        if (parts[0].toLowerCase() === 'sort') return input.split('\n').sort().join('\n');
        return input;
    }

    _ipconfig(args) {
        const detailed = args.includes('/all');
        let out = '\nWindows IP Configuration\n\n';
        for (const [name, iface] of Object.entries(this.node.interfaces)) {
            out += `Ethernet adapter ${name}:\n\n`;
            if (detailed) {
                out += `   Description . . . . . . . . . . . : Intel(R) I211 Gigabit\n`;
                out += `   Physical Address. . . . . . . . . : ${(iface.mac || '00-00-00-00-00-00').replace(/:/g, '-').toUpperCase()}\n`;
                out += `   DHCP Enabled. . . . . . . . . . . : ${this.node.services?.dhcpClient ? 'Yes' : 'No'}\n`;
            }
            if (iface.ip) {
                out += `   IPv4 Address. . . . . . . . . . . : ${iface.ip}\n`;
                out += `   Subnet Mask . . . . . . . . . . . : ${_cidrToMaskLocal(parseInt(iface.subnet) || 24)}\n`;
                out += `   Default Gateway . . . . . . . . . : ${this.node.gateway || ''}\n`;
            } else {
                out += `   Media State . . . . . . . . . . . : Media disconnected\n`;
            }
            out += '\n';
        }
        return out;
    }

    _arp(args) {
        if (args[1] === '-a') {
            let out = '\n  Interface: ' + (Object.values(this.node.interfaces)[0]?.ip || '0.0.0.0') + '\n';
            out += '  Internet Address      Physical Address      Type\n';
            this.node.arpTable.forEach((entry, ip) => {
                out += `  ${ip.padEnd(22)}${(entry.mac || '').replace(/:/g, '-').padEnd(22)}${entry.type || 'dynamic'}\n`;
            });
            if (this.node.arpTable.size === 0) out += '  No ARP entries.\n';
            return out;
        }
        return 'Usage: arp -a';
    }

    _route(args) {
        if (args[1] === 'print' || args.length === 1) {
            let out = '===========================================================================\nActive Routes:\nNetwork Destination        Netmask          Gateway       Interface  Metric\n';
            if (this.node.gateway) {
                out += `          0.0.0.0          0.0.0.0    ${this.node.gateway.padEnd(14)}${(Object.values(this.node.interfaces)[0]?.ip || '').padEnd(11)}    25\n`;
            }
            for (const [name, iface] of Object.entries(this.node.interfaces)) {
                if (iface.ip) {
                    const cidr = parseInt(iface.subnet) || 24;
                    const net = getNetAddr(iface.ip, cidr);
                    out += `    ${net.padEnd(18)}${_cidrToMaskLocal(cidr).padEnd(17)}${'On-link'.padEnd(14)}${iface.ip.padEnd(11)}    25\n`;
                }
            }
            out += '===========================================================================';
            return out;
        }
        return 'Usage: route print';
    }

    _netsh(args) {
        if (args.length >= 4 && args[1] === 'interface' && args[2] === 'ip' && args[3] === 'show') {
            return this._ipconfig(['ipconfig', '/all']);
        }
        if (args.length >= 3 && args[1] === 'wlan' && args[2] === 'show') {
            return 'There is no wireless interface on the system.';
        }
        if (args.length >= 4 && args[1] === 'firewall' && args[2] === 'show' && args[3] === 'state') {
            return 'Firewall status:\n  Profile = Standard\n  Operational mode = Enable\n  Exception mode = Enable';
        }
        return 'Usage: netsh interface ip show config\n       netsh wlan show interfaces\n       netsh firewall show state';
    }

    _netstat(args) {
        let out = '\nActive Connections\n\n  Proto  Local Address          Foreign Address        State\n';
        out += '  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING\n';
        out += '  TCP    0.0.0.0:445            0.0.0.0:0              LISTENING\n';
        out += '  TCP    0.0.0.0:3389           0.0.0.0:0              LISTENING\n';
        out += '  TCP    0.0.0.0:5040           0.0.0.0:0              LISTENING\n';
        const iface = Object.values(this.node.interfaces)[0];
        if (iface?.ip) {
            out += `  TCP    ${iface.ip}:139       0.0.0.0:0              LISTENING\n`;
            out += `  UDP    ${iface.ip}:137       *:*\n`;
            out += `  UDP    ${iface.ip}:138       *:*\n`;
        }
        return out;
    }

    _systeminfo() {
        const iface = Object.values(this.node.interfaces)[0] || {};
        return `\nHost Name:                 ${this.hostname}` +
            `\nOS Name:                   Microsoft Windows 10 Pro` +
            `\nOS Version:                10.0.19045 N/A Build 19045` +
            `\nOS Manufacturer:           Microsoft Corporation` +
            `\nSystem Type:               x64-based PC` +
            `\nProcessor(s):              1 Processor(s) Installed.` +
            `\n                           [01]: Intel64 Family 6 Model 142` +
            `\nTotal Physical Memory:     8,192 MB` +
            `\nAvailable Physical Memory: 4,891 MB` +
            `\nDomain:                    WORKGROUP` +
            `\nLogon Server:              \\\\${this.hostname}` +
            `\nNetwork Card(s):           ${Object.keys(this.node.interfaces).length} NIC(s) Installed.` +
            Object.entries(this.node.interfaces).map(([name, i], idx) =>
                `\n                           [${String(idx + 1).padStart(2, '0')}]: Intel I211 Gigabit` +
                (i.ip ? `\n                                 ${i.ip}` : '\n                                 Media disconnected')
            ).join('');
    }

    _dir(args) {
        let out = ` Volume in drive C has no label.\n Volume Serial Number is 7A2B-3C4D\n\n Directory of ${this.cwd}\n\n`;
        out += `04/23/2026  12:00 PM    <DIR>          .\n`;
        out += `04/23/2026  12:00 PM    <DIR>          ..\n`;

        // Use virtual filesystem if available
        const fsNode = this._getFsNode(this.cwd);
        if (fsNode && fsNode.type === 'dir') {
            let fileCount = 0, totalSize = 0;
            for (const [name, child] of Object.entries(fsNode.children)) {
                if (child.type === 'dir') {
                    out += `04/23/2026  12:00 PM    <DIR>          ${name}\n`;
                } else {
                    const size = (child.content || '').length;
                    fileCount++;
                    totalSize += size;
                    out += `04/23/2026  12:00 PM    ${String(size).padStart(14)} ${name}\n`;
                }
            }
            out += `               ${fileCount} File(s)    ${String(totalSize).padStart(10)} bytes\n`;
        } else {
            out += `04/23/2026  12:00 PM             1,234 notes.txt\n`;
            out += `               1 File(s)          1,234 bytes\n`;
        }
        return out;
    }

    _cd(args) {
        if (!args[1]) return this.cwd;
        if (args[1] === '..') {
            const parts = this.cwd.split('\\').filter(Boolean);
            if (parts.length > 1) parts.pop();
            this.cwd = parts.join('\\');
            return '';
        }
        return '';
    }

    _type(args) {
        if (args.length < 2) return 'The syntax of the command is incorrect.';
        // Try virtual filesystem
        const fsNode = this._getFsNode(this.cwd);
        if (fsNode && fsNode.type === 'dir') {
            const file = fsNode.children[args[1]];
            if (file && file.type === 'file') return file.content || '';
        }
        return `The system cannot find the file specified.`;
    }

    _mkdir(args) {
        if (args.length < 2) return 'The syntax of the command is incorrect.';
        const fsNode = this._getFsNode(this.cwd);
        if (fsNode && fsNode.type === 'dir') {
            fsNode.children[args[1]] = { type: 'dir', children: {} };
        }
        return '';
    }

    _getFsNode(winPath) {
        // Map Windows path to virtual filesystem
        const normalized = winPath.replace(/^C:\\?/i, '/').replace(/\\/g, '/');
        const parts = normalized.split('/').filter(Boolean);
        let current = this.node.filesystem?.['/'];
        if (!current) return null;
        for (const part of parts) {
            if (!current.children || !current.children[part]) return null;
            current = current.children[part];
        }
        return current;
    }

    _set(args) {
        if (args.length === 1) return Object.entries(this.env).map(([k, v]) => `${k}=${v}`).join('\n');
        if (args[1]) {
            const [key, ...vals] = args[1].split('=');
            if (vals.length > 0) this.env[key] = vals.join('=');
            else return this.env[key] || `Environment variable ${key} not defined`;
        }
        return '';
    }

    _getmac() {
        let out = '\nPhysical Address    Transport Name\n=================== ==========================================================\n';
        for (const [name, iface] of Object.entries(this.node.interfaces)) {
            out += `${(iface.mac || '00-00-00-00-00-00').replace(/:/g, '-').toUpperCase()}   \\Device\\Tcpip_{${name}}\n`;
        }
        return out;
    }

    _tasklist() {
        return `\nImage Name                     PID Session Name        Mem Usage\n========================= ======== ================ ===========\nSystem Idle Process              0 Services                   8 K\nSystem                           4 Services               1,024 K\nsmss.exe                       312 Services                 456 K\ncsrss.exe                      480 Services               4,816 K\nsvchost.exe                    720 Services              12,340 K\nlsass.exe                      764 Services               8,192 K\nexplorer.exe                  2140 Console              45,240 K\ncmd.exe                       ${Math.floor(Math.random() * 9000) + 1000} Console               3,456 K\ntasklist.exe                  ${Math.floor(Math.random() * 9000) + 1000} Console               4,100 K`;
    }

    _net(args) {
        if (args.length < 2) return 'The syntax of this command is:\n  NET [ USER | VIEW | USE | SHARE | START | STOP ]';
        const sub = args[1].toLowerCase();
        if (sub === 'user') return `\nUser accounts for \\\\${this.hostname}\n\n-------------------------------------------------------------------------------\nAdmin                    Guest\nThe command completed successfully.`;
        if (sub === 'view') return `Server Name            Remark\n-------------------------------------------------------------------------------\n\\\\${this.hostname}`;
        if (sub === 'share') return `\nShare name   Resource                        Remark\n-------------------------------------------------------------------------------\nC$           C:\\                              Default share\nIPC$                                          Remote IPC\nADMIN$       C:\\Windows                       Remote Admin`;
        if (sub === 'start') return 'These Windows services are started:\n   DHCP Client\n   DNS Client\n   Server\n   Workstation';
        return `The syntax of this command is:\n  NET ${args[1]} [options]`;
    }

    _wmic(args) {
        if (args.length < 2) return 'Usage: wmic [os|cpu|memorychip|diskdrive|nic] get [properties]';
        const sub = args[1].toLowerCase();
        if (sub === 'os') return `Caption                  Version       BuildNumber  OSArchitecture\nMicrosoft Windows 10 Pro 10.0.19045    19045        64-bit`;
        if (sub === 'cpu') return `Name                                      NumberOfCores  MaxClockSpeed\nIntel(R) Core(TM) i7-8550U @ 1.80GHz     4              1800`;
        if (sub === 'memorychip') return `Capacity         Speed  Manufacturer\n8589934592       2400   Samsung`;
        if (sub === 'diskdrive') return `Model                    Size\nSamsung SSD 860 EVO      256060514304`;
        if (sub === 'nic') {
            let out = 'Name                               MACAddress           NetEnabled\n';
            for (const [name, iface] of Object.entries(this.node.interfaces)) {
                out += `Intel I211 ${name.padEnd(25)}${(iface.mac || '').replace(/:/g, '-').toUpperCase().padEnd(21)}${iface.state === 'up' ? 'TRUE' : 'FALSE'}\n`;
            }
            return out;
        }
        return `Alias not found: ${args[1]}`;
    }

    _nbtstat(args) {
        if (args.includes('-n')) {
            const iface = Object.values(this.node.interfaces)[0];
            return `\nLocal Area Connection:\nNode IpAddress: [${iface?.ip || '0.0.0.0'}] Scope Id: []\n\n    NetBIOS Local Name Table\n\n    Name               Type         Status\n    ----------------------------------------\n    ${this.hostname.padEnd(15)}  <00>  UNIQUE      Registered\n    WORKGROUP       <00>  GROUP       Registered`;
        }
        return 'Usage: nbtstat [-n | -r]';
    }
}

// Helper — local CIDR to mask (avoids circular import issues)
function _cidrToMaskLocal(c) {
    if (c === 0) return '0.0.0.0';
    const u = (0xffffffff << (32 - c)) >>> 0;
    return [(u >>> 24) & 0xff, (u >>> 16) & 0xff, (u >>> 8) & 0xff, u & 0xff].join('.');
}
