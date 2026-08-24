// sim-cli.js

import { CiscoCLI } from './sim-cli-cisco.js';
import { JuniperCLI } from './sim-cli-juniper.js';
import { isValidIP, getNetAddr } from './sim-math.js';

export function createCLI(node, notifyGraph, engine) {
    switch (node.cliType) {
        case 'cisco': return new CiscoCLI(node, notifyGraph);
        case 'juniper': return new JuniperCLI(node, notifyGraph);
        case 'linux': return new LinuxCLI(node, notifyGraph, engine);
        case 'windows': return new WindowsCLI(node, notifyGraph, engine);
        default: return new CiscoCLI(node, notifyGraph); // fallback
    }
}

// ═══════════════════════════════════════════════════
// ═══════════════════════════════════════════════════
export class LinuxCLI {
    constructor(node, notifyGraph, engine) {
        this.node = node;
        this.notifyGraph = notifyGraph;
        this.engine = engine;
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
        // Package management state
        if (!this.node._installedPackages) {
            this.node._installedPackages = new Set(['bash', 'coreutils', 'net-tools', 'iproute2', 'openssh-server', 'curl', 'wget', 'iputils-ping', 'dnsutils', 'traceroute', 'nano', 'vim-tiny']);
        }
        if (!this.node._services) {
            this.node._services = { ssh: 'active', networking: 'active', cron: 'active' };
        }
        if (!this.node.commandHistory) this.node.commandHistory = [];
        if (!this.node.firewallRules) this.node.firewallRules = [];
    }

    getPrompt() {
        const shortCwd = this.cwd === '/home/user' ? '~' : this.cwd;
        return `${this.user}@${this.hostname}:${shortCwd}$ `;
    }

    addHistory(cmd) {
        if (cmd && cmd.trim()) { this.history.push(cmd); if (this.history.length > 100) this.history.shift(); }
        if (cmd && cmd.trim()) { this.node.commandHistory.push(cmd); if (this.node.commandHistory.length > 200) this.node.commandHistory.shift(); }
        this.historyIndex = this.history.length;
    }
    getPrevHistory() { if (this.historyIndex > 0) { this.historyIndex--; return this.history[this.historyIndex]; } return this.history[0] || ''; }
    getNextHistory() { if (this.historyIndex < this.history.length - 1) { this.historyIndex++; return this.history[this.historyIndex]; } this.historyIndex = this.history.length; return ''; }

    tabComplete(partial) {
        const cmds = ['ping', 'traceroute', 'ifconfig', 'ip', 'route', 'arp', 'netstat', 'nslookup', 'dig', 'curl', 'wget',
                       'ssh', 'telnet', 'ftp', 'cat', 'ls', 'cd', 'pwd', 'mkdir', 'rm', 'echo', 'touch', 'clear', 'man',
                       'hostname', 'whoami', 'uname', 'date', 'uptime', 'free', 'df', 'ps', 'kill', 'history', 'export',
                       'iptables', 'tcpdump', 'nmap', 'ss', 'grep', 'find', 'chmod', 'chown', 'nano', 'vi',
                       'sudo', 'apt', 'apt-get', 'dpkg', 'systemctl', 'service', 'useradd', 'passwd', 'exit', 'help', 'python3', 'node'];
        return cmds.filter(c => c.startsWith(partial.toLowerCase()));
    }

    execute(commandStr) {
        const raw = commandStr.trim();
        if (!raw) return '';
        this.addHistory(raw);

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
            case 'sudo': return this._sudo(args);
            case 'apt': case 'apt-get': return this._apt(args);
            case 'dpkg': return this._dpkg(args);
            case 'systemctl': return this._systemctl(args);
            case 'service': return this._service(args);
            case 'useradd': return args[1] ? `useradd: user '${args[1]}' created` : 'Usage: useradd <username>';
            case 'passwd': return args[1] ? `passwd: password for '${args[1]}' updated successfully` : 'Usage: passwd <username>';
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
            case 'ps': return args[1] === 'aux' ? this._psAux() : '  PID TTY          TIME CMD\n    1 ?        00:00:01 systemd\n  234 tty1     00:00:00 bash\n  567 tty1     00:00:00 ps';
            case 'cat': return this._cat(args);
            case 'ls': return this._ls(args);
            case 'cd': return this._cd(args);
            case 'pwd': return this.cwd;
            case 'mkdir': return this._mkdir(args);
            case 'rm': return this._rm(args);
            case 'touch': return this._touch(args);
            case 'echo': return this._echo(args);
            case 'clear': return '__CLEAR__';
            case 'history': return this.history.map((h, i) => `  ${i + 1}  ${h}`).join('\n');
            case 'export': if (args[1]) { const [k, v] = args[1].split('='); this.env[k] = v; } return '';
            case 'env': case 'printenv': return Object.entries(this.env).map(([k, v]) => `${k}=${v}`).join('\n');
            case 'iptables': 
                if (!this.node._installedPackages.has('iptables')) return 'bash: iptables: command not found';
                return this._iptables(args);
            case 'tcpdump': 
                if (!this.node._installedPackages.has('tcpdump')) return 'bash: tcpdump: command not found';
                return 'tcpdump: listening on eth0 (simulated)\n^C\n0 packets captured';
            case 'nmap': 
                if (!this.node._installedPackages.has('nmap')) return 'bash: nmap: command not found';
                return args[1] ? `Starting Nmap scan of ${args[1]}...\n22/tcp   open  ssh\n80/tcp   open  http\n443/tcp  open  https\nNmap done: 1 IP address (1 host up) scanned in 0.03 seconds` : 'Usage: nmap <target>';
            case 'git':
                if (!this.node._installedPackages.has('git')) return 'bash: git: command not found';
                if (args[1] === 'status') return 'On branch main\nYour branch is up to date with \'origin/main\'.\n\nnothing to commit, working tree clean';
                if (args[1] === 'clone') return `Cloning into '${args[2] || 'repo'}'...\nremote: Enumerating objects: 12, done.\nremote: Counting objects: 100% (12/12), done.\nremote: Total 12 (delta 0), reused 0 (delta 0)\nUnpacking objects: 100% (12/12), done.`;
                if (args[1] === 'add') return '';
                if (args[1] === 'commit') return '[main ed48a12] Simulated commit\n 1 file changed, 1 insertion(+)';
                if (args[1] === 'push') return 'Enumerating objects: 5, done.\nWriting objects: 100% (5/5), 412 bytes | 412.00 KiB/s, done.\nTotal 5 (delta 2), reused 0 (delta 0)\nTo https://github.com/sim/repo.git\n   main..main';
                return 'Usage: git <clone|status|add|commit|push>';
            case 'docker':
                if (!this.node._installedPackages.has('docker.io')) return 'bash: docker: command not found';
                if (args[1] === 'ps') return 'CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES\na1b2c3d4e5f6   nginx     "nginx"   2 hours ago   Up 2 hours   80/tcp    web-server';
                if (args[1] === 'run') return `Unable to find image '${args[2] || 'hello-world'}:latest' locally\nlatest: Pulling from library/${args[2] || 'hello-world'}\nDigest: sha256:7e9b6e7ba284\nStatus: Downloaded newer image for ${args[2] || 'hello-world'}:latest\n\nHello from Docker!\nThis message shows that your installation appears to be working correctly.`;
                return 'Usage: docker <ps|run>';
            case 'ufw':
                if (!this.node._installedPackages.has('ufw')) return 'bash: ufw: command not found';
                return this._ufw(args);
            case 'fail2ban-client': case 'fail2ban':
                if (!this.node._installedPackages.has('fail2ban')) return `bash: ${cmd}: command not found`;
                if (args[1] === 'status') return 'Status\n|- Number of jail:\t1\n`- Jail list:\tsshd';
                return 'Usage: fail2ban-client <status>';
            case 'tmux':
                if (!this.node._installedPackages.has('tmux')) return 'bash: tmux: command not found';
                return '[detached (from session 0)]';
            case 'nginx':
                if (!this.node._installedPackages.has('nginx')) return 'bash: nginx: command not found';
                if (args[1] === '-t') return 'nginx: the configuration file /etc/nginx/nginx.conf syntax is ok\nnginx: configuration file /etc/nginx/nginx.conf test is successful';
                return 'nginx is a background service. Use "systemctl status nginx" to manage it.';
            case 'apache2':
                if (!this.node._installedPackages.has('apache2')) return 'bash: apache2: command not found';
                return 'apache2 is a background service. Use "systemctl status apache2" to manage it.';
            case 'snmpd': case 'snmp':
                if (!this.node._installedPackages.has('snmpd')) return `bash: ${cmd}: command not found`;
                return 'snmpd is a background daemon. Use "systemctl status snmpd" to manage it.';
            case 'mysql':
                if (!this.node._installedPackages.has('mysql-server')) return 'bash: mysql: command not found';
                return 'Welcome to the MySQL monitor.  Commands end with ; or \\g.\nYour MySQL connection id is 8\nServer version: 8.0.32-0ubuntu0.22.04.2 (Ubuntu)\n\nmysql> exit\nBye';
            case 'psql': case 'postgresql':
                if (!this.node._installedPackages.has('postgresql')) return `bash: ${cmd}: command not found`;
                return 'psql (14.7 (Ubuntu 14.7-0ubuntu0.22.04.1))\nType "help" for help.\n\npostgres=# \\q';
            case 'wireshark': case 'wireshark-cli': case 'tshark':
                if (!this.node._installedPackages.has('wireshark')) return `bash: ${cmd}: command not found`;
                if (cmd === 'wireshark') return 'wireshark: cannot open display: :0\nUse wireshark-cli or tshark for CLI captures.';
                return 'Capturing on eth0\n1  0.000000   10.0.0.1 → 10.0.0.2   TCP 74 54321 → 80 [SYN] Seq=0 Win=64240 Len=0\n2  0.001200   10.0.0.2 → 10.0.0.1   TCP 74 80 → 54321 [SYN, ACK] Seq=0 Ack=1 Win=65535 Len=0\n^C\n2 packets captured';
            case 'node': case 'nodejs':
                if (!this.node._installedPackages.has('nodejs')) return `bash: ${cmd}: command not found`;
                if (args[1]) return `Executing ${args[1]}...\nServer running at http://localhost:3000/`;
                return 'Welcome to Node.js v18.13.0.\nType ".help" for more information.\n> .exit\n';
            case 'man': return args[1] ? `Manual page for ${args[1]}\n\nNAME\n    ${args[1]} - simulated command\n\nDESCRIPTION\n    This is a simulated environment. Type the command for usage info.` : 'What manual page do you want?';
            case 'exit': case 'logout': return '__EXIT__';
            case 'help': return 'Available commands:\n  ping, traceroute, ifconfig, ip, route, arp, netstat, nslookup, dig,\n  curl, wget, ssh, telnet, cat, ls, cd, pwd, mkdir, rm, echo, touch,\n  hostname, whoami, uname, date, uptime, free, df, ps, history,\n  sudo, apt, dpkg, systemctl, service, useradd, passwd,\n  iptables, tcpdump, nmap, git, docker, ufw, tmux, mysql, psql, node,\n  clear, exit, help';
            default: 
                if (cmd === 'python3' && this.node._installedPackages.has('python3')) return 'Python 3.10.12 (main, Nov 20 2023, 15:14:05) [GCC 11.4.0] on linux\nType "help", "copyright", "credits" or "license" for more information.\n>>> exit()\n';
                if ((cmd === 'nano' || cmd === 'vim' || cmd === 'vi') && (this.node._installedPackages.has('nano') || this.node._installedPackages.has('vim'))) {
                    return 'Terminal UI not supported in simulation. Please use the Desktop Text Editor application.';
                }
                if (cmd === 'htop' && this.node._installedPackages.has('htop')) return 'Terminal UI not supported in simulation. Please use the Desktop System Info application.';
                return `bash: ${cmd}: command not found`;
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
        return entries.map(([name, child]) => child.type === 'dir' ? `${name}/` : name).join('  ');
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

    _echo(args) {
        const redirectIdx = args.findIndex(a => a === '>' || a === '>>');
        if (redirectIdx === -1) return args.slice(1).join(' ');

        const target = args[redirectIdx + 1];
        if (!target) return 'bash: syntax error near unexpected token `newline`';

        const path = this._resolvePath(target);
        const parts = path.split('/').filter(Boolean);
        const fileName = parts.pop();
        const parent = this._getNode('/' + parts.join('/'));
        if (!parent || parent.type !== 'dir') return `bash: ${target}: No such file or directory`;

        let text = args.slice(1, redirectIdx).join(' ');
        text = text.replace(/^['"]|['"]$/g, '');
        const existing = parent.children[fileName];
        const current = existing?.type === 'file' ? existing.content || '' : '';
        parent.children[fileName] = {
            type: 'file',
            content: args[redirectIdx] === '>>' && current ? current + '\n' + text : text
        };
        this.notifyGraph();
        return '';
    }

    _ufw(args) {
        const action = args[1];
        if (action === 'enable') {
            this.node.firewallEnabled = true;
            return 'Firewall is active and enabled on system startup';
        }
        if (action === 'disable') {
            this.node.firewallEnabled = false;
            return 'Firewall stopped and disabled on system startup';
        }
        if (action === 'status') {
            const status = this.node.firewallEnabled ? 'active' : 'inactive';
            const rules = (this.node.firewallRules || []).map(rule =>
                `${String(rule.port + '/' + (rule.protocol || 'tcp')).padEnd(26)}${rule.action.toUpperCase().padEnd(12)}${rule.from || 'Anywhere'}`
            );
            return `Status: ${status}\n\nTo                         Action      From\n--                         ------      ----\n${rules.join('\n') || '(no rules)'}`;
        }
        if (action === 'allow' || action === 'deny') {
            const spec = args[2] || '';
            const [port, protocol = 'tcp'] = spec.split('/');
            if (!port) return `Usage: ufw ${action} <port>/<protocol>`;
            this.node.firewallRules.push({ action, port, protocol, from: 'Anywhere' });
            this.notifyGraph();
            return `Rule added\nRule added (v6)`;
        }
        return 'Usage: ufw <status|enable|disable|allow|deny>';
    }

    _iptables(args) {
        if (args.includes('-L')) {
            return 'Chain INPUT (policy ACCEPT)\ntarget     prot opt source               destination\n\nChain FORWARD (policy ACCEPT)\ntarget     prot opt source               destination\n\nChain OUTPUT (policy ACCEPT)\ntarget     prot opt source               destination';
        }
        return 'Usage: iptables [-L]';
    }

    _sudo(args) {
        if (args.length < 2) return 'usage: sudo <command>';
        // sudo just re-executes the rest of the command as-is
        const subCommand = args.slice(1).join(' ');
        return this.execute(subCommand);
    }

    _apt(args) {
        if (args.length < 2) return 'Usage: apt <install|remove|update|upgrade|list|search|show> [package]';
        const sub = args[1].toLowerCase();
        const pkg = args[2];

        const AVAILABLE_PACKAGES = {
            'python3': { ver: '3.10.12-1', size: '5,124 kB', desc: 'Interactive high-level object-oriented language' },
            'nginx': { ver: '1.18.0-6', size: '2,048 kB', desc: 'Small, powerful, scalable web/reverse proxy server' },
            'apache2': { ver: '2.4.52-1', size: '3,456 kB', desc: 'Apache HTTP Server' },
            'docker.io': { ver: '20.10.21-0', size: '48,128 kB', desc: 'Linux container runtime' },
            'nmap': { ver: '7.93+dfsg-1', size: '4,256 kB', desc: 'The Network Mapper' },
            'git': { ver: '2.34.1-1', size: '3,840 kB', desc: 'Fast, scalable, distributed revision control system' },
            'htop': { ver: '3.2.1-1', size: '256 kB', desc: 'Interactive process viewer' },
            'vim': { ver: '8.2.3995-1', size: '1,536 kB', desc: 'Vi IMproved - enhanced vi editor' },
            'tmux': { ver: '3.2a-4', size: '512 kB', desc: 'Terminal multiplexer' },
            'mysql-server': { ver: '8.0.32-0', size: '24,576 kB', desc: 'MySQL database server' },
            'postgresql': { ver: '14+238', size: '18,432 kB', desc: 'Object-relational SQL database' },
            'nodejs': { ver: '18.13.0+dfsg1-1', size: '12,288 kB', desc: 'Event-based server-side javascript engine' },
            'openssh-client': { ver: '1:8.9p1-3', size: '1,024 kB', desc: 'Secure shell (SSH) client' },
            'iptables': { ver: '1.8.7-1', size: '384 kB', desc: 'Administration tools for packet filtering' },
            'tcpdump': { ver: '4.99.1-3', size: '512 kB', desc: 'Command-line network traffic analyzer' },
            'net-tools': { ver: '1.60+git-5', size: '384 kB', desc: 'NET-3 networking toolkit' },
            'snmpd': { ver: '5.9.1+dfsg-1', size: '768 kB', desc: 'SNMP daemon for network management' },
            'fail2ban': { ver: '0.11.2-6', size: '1,280 kB', desc: 'Ban hosts that cause multiple auth errors' },
            'ufw': { ver: '0.36.1-4', size: '384 kB', desc: 'Program for managing a firewall' },
            'wireshark': { ver: '3.6.12-1', size: '6,144 kB', desc: 'Network traffic analyzer (CLI tools)' },
        };

        switch (sub) {
            case 'update':
                return `Hit:1 http://archive.ubuntu.com/ubuntu jammy InRelease\nGet:2 http://archive.ubuntu.com/ubuntu jammy-updates InRelease [119 kB]\nGet:3 http://security.ubuntu.com/ubuntu jammy-security InRelease [110 kB]\nGet:4 http://archive.ubuntu.com/ubuntu jammy-backports InRelease [108 kB]\nFetched 337 kB in 2s (169 kB/s)\nReading package lists... Done\nBuilding dependency tree... Done\nReading state information... Done\n${Object.keys(AVAILABLE_PACKAGES).length} packages can be upgraded. Run 'apt upgrade' to see them.`;

            case 'upgrade':
                return 'Reading package lists... Done\nBuilding dependency tree... Done\nCalculating upgrade... Done\n0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.';

            case 'install':
                if (!pkg) return 'E: You must specify at least one package to install.';
                if (this.node._installedPackages.has(pkg)) {
                    return `Reading package lists... Done\nBuilding dependency tree... Done\n${pkg} is already the newest version.\n0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.`;
                }
                if (!AVAILABLE_PACKAGES[pkg]) {
                    return `Reading package lists... Done\nBuilding dependency tree... Done\nE: Unable to locate package ${pkg}`;
                }
                const pkgInfo = AVAILABLE_PACKAGES[pkg];
                this.node._installedPackages.add(pkg);
                if (this.engine && this.engine.handlePackageChange) this.engine.handlePackageChange(this.node.id, pkg, true);
                return `Reading package lists... Done\nBuilding dependency tree... Done\nThe following NEW packages will be installed:\n  ${pkg}\n0 upgraded, 1 newly installed, 0 to remove and 0 not upgraded.\nNeed to get ${pkgInfo.size} of archives.\nAfter this operation, ${parseInt(pkgInfo.size) * 3} kB of additional disk space will be used.\nGet:1 http://archive.ubuntu.com/ubuntu jammy/main amd64 ${pkg} amd64 ${pkgInfo.ver} [${pkgInfo.size}]\nFetched ${pkgInfo.size} in 1s (${parseInt(pkgInfo.size)} kB/s)\nSelecting previously unselected package ${pkg}.\n(Reading database ... 64218 files and directories currently installed.)\nPreparing to unpack .../${pkg}_${pkgInfo.ver}_amd64.deb ...\nUnpacking ${pkg} (${pkgInfo.ver}) ...\nSetting up ${pkg} (${pkgInfo.ver}) ...\nProcessing triggers for man-db (2.10.2-1) ...`;

            case 'remove': case 'purge':
                if (!pkg) return 'E: You must specify at least one package to remove.';
                if (!this.node._installedPackages.has(pkg)) {
                    return `Package '${pkg}' is not installed, so not removed`;
                }
                this.node._installedPackages.delete(pkg);
                if (this.engine && this.engine.handlePackageChange) this.engine.handlePackageChange(this.node.id, pkg, false);
                return `Reading package lists... Done\nBuilding dependency tree... Done\nThe following packages will be REMOVED:\n  ${pkg}\n0 upgraded, 0 newly installed, 1 to remove and 0 not upgraded.\n(Reading database ... 64218 files and directories currently installed.)\nRemoving ${pkg} ...\nProcessing triggers for man-db (2.10.2-1) ...`;

            case 'list':
                if (args[2] === '--installed') {
                    return Array.from(this.node._installedPackages).sort().map(p => {
                        const info = AVAILABLE_PACKAGES[p];
                        return `${p}/${info ? info.ver : 'now'} [installed]`;
                    }).join('\n');
                }
                return Object.entries(AVAILABLE_PACKAGES).map(([name, info]) => {
                    const installed = this.node._installedPackages.has(name);
                    return `${name}/${info.ver} amd64 ${installed ? '[installed]' : ''}`;
                }).join('\n');

            case 'search':
                if (!pkg) return 'E: You must give at least one search pattern';
                const results = Object.entries(AVAILABLE_PACKAGES).filter(([name, info]) =>
                    name.includes(pkg.toLowerCase()) || info.desc.toLowerCase().includes(pkg.toLowerCase())
                );
                return results.length > 0
                    ? results.map(([name, info]) => `${name} - ${info.desc}`).join('\n')
                    : `No packages found matching '${pkg}'.`;

            case 'show':
                if (!pkg) return 'E: You must specify a package name';
                const si = AVAILABLE_PACKAGES[pkg];
                if (!si) return `E: No packages found for ${pkg}`;
                return `Package: ${pkg}\nVersion: ${si.ver}\nPriority: optional\nSection: net\nInstalled-Size: ${parseInt(si.size) * 3} kB\nMaintainer: Ubuntu Developers\nArchitecture: amd64\nDescription: ${si.desc}\nHomepage: https://packages.ubuntu.com/${pkg}`;

            default:
                return 'Usage: apt <install|remove|update|upgrade|list|search|show> [package]';
        }
    }

    _dpkg(args) {
        if (args.includes('-l') || args.includes('--list')) {
            let out = 'Desired=Unknown/Install/Remove/Purge/Hold\n| Status=Not/Inst/Conf-files/Unpacked/halF-conf/Half-inst/trig-aWait/Trig-pend\n||/ Name                    Version          Architecture Description\n+++-=======================-================-============-==================================\n';
            for (const pkg of Array.from(this.node._installedPackages).sort()) {
                out += `ii  ${pkg.padEnd(24)}0.0.0            amd64        Installed package\n`;
            }
            return out;
        }
        return 'Usage: dpkg [-l | --list]';
    }

    _systemctl(args) {
        if (args.length < 2) return 'Usage: systemctl <start|stop|restart|status|enable|disable|list-units> [service]';
        const action = args[1].toLowerCase();
        const svcName = args[2]?.replace('.service', '');

        if (action === 'list-units' || action === 'list') {
            let out = 'UNIT                        LOAD   ACTIVE SUB     DESCRIPTION\n';
            for (const [name, status] of Object.entries(this.node._services)) {
                const sub = status === 'active' ? 'running' : 'dead';
                out += `${(name + '.service').padEnd(28)}loaded ${status.padEnd(7)}${sub.padEnd(8)}${name} service\n`;
            }
            out += `\n${Object.keys(this.node._services).length} loaded units listed.`;
            return out;
        }

        if (!svcName) return `Usage: systemctl ${action} <service>`;

        switch (action) {
            case 'status':
                const st = this.node._services[svcName];
                if (!st) return `Unit ${svcName}.service could not be found.`;
                const dot = st === 'active' ? '●' : '○';
                return `${dot} ${svcName}.service - ${svcName} daemon\n     Loaded: loaded (/lib/systemd/system/${svcName}.service; enabled)\n     Active: ${st} (${st === 'active' ? 'running' : 'dead'}) since ${new Date().toUTCString()}\n   Main PID: ${Math.floor(Math.random() * 9000) + 1000} (${svcName})\n      Tasks: ${Math.floor(Math.random() * 8) + 1}\n     Memory: ${Math.floor(Math.random() * 128) + 4}.${Math.floor(Math.random() * 9)}M\n        CPU: ${Math.floor(Math.random() * 500)}ms`;
            case 'start':
                this.node._services[svcName] = 'active';
                if (svcName === 'nginx' || svcName === 'apache2') {
                    this.node.services = this.node.services || {};
                    this.node.services.http = true;
                    this.node.httpEnabled = true;
                }
                return '';
            case 'stop':
                if (this.node._services[svcName]) {
                    this.node._services[svcName] = 'inactive';
                    if (svcName === 'nginx' || svcName === 'apache2') {
                        this.node.services = this.node.services || {};
                        this.node.services.http = false;
                        this.node.httpEnabled = false;
                    }
                } else {
                    return `Failed to stop ${svcName}.service: Unit ${svcName}.service not found.`;
                }
                return '';
            case 'restart':
                this.node._services[svcName] = 'active';
                if (svcName === 'nginx' || svcName === 'apache2') {
                    this.node.services = this.node.services || {};
                    this.node.services.http = true;
                    this.node.httpEnabled = true;
                }
                return '';
            case 'enable':
                if (!this.node._services[svcName]) this.node._services[svcName] = 'inactive';
                return `Created symlink /etc/systemd/system/multi-user.target.wants/${svcName}.service → /lib/systemd/system/${svcName}.service.`;
            case 'disable':
                return `Removed /etc/systemd/system/multi-user.target.wants/${svcName}.service.`;
            default:
                return `Unknown command: ${action}`;
        }
    }

    _service(args) {
        if (args.length < 3) return 'Usage: service <name> <start|stop|restart|status>';
        const svcName = args[1];
        const action = args[2].toLowerCase();
        // Delegate to systemctl
        return this._systemctl(['systemctl', action, svcName]);
    }

    _psAux() {
        const procs = [
            { user: 'root', pid: 1, cpu: '0.0', mem: '0.1', vsz: 167936, rss: 11584, cmd: '/sbin/init' },
            { user: 'root', pid: 2, cpu: '0.0', mem: '0.0', vsz: 0, rss: 0, cmd: '[kthreadd]' },
            { user: 'root', pid: 234, cpu: '0.0', mem: '0.1', vsz: 21448, rss: 5312, cmd: '/lib/systemd/systemd-journald' },
            { user: 'root', pid: 267, cpu: '0.0', mem: '0.1', vsz: 21944, rss: 5848, cmd: '/lib/systemd/systemd-udevd' },
            { user: 'systemd+', pid: 312, cpu: '0.0', mem: '0.1', vsz: 89968, rss: 6196, cmd: '/lib/systemd/systemd-resolved' },
            { user: 'root', pid: 480, cpu: '0.0', mem: '0.2', vsz: 15420, rss: 7360, cmd: 'sshd: /usr/sbin/sshd -D' },
            { user: 'root', pid: 567, cpu: '0.0', mem: '0.0', vsz: 6112, rss: 2216, cmd: '/usr/sbin/cron -f' },
            { user: 'root', pid: Math.floor(Math.random() * 9000) + 1000, cpu: '0.0', mem: '0.2', vsz: 8940, rss: 5372, cmd: '-bash' },
            { user: 'root', pid: Math.floor(Math.random() * 9000) + 1000, cpu: '0.0', mem: '0.1', vsz: 10656, rss: 3340, cmd: 'ps aux' },
        ];
        let out = 'USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\n';
        for (const p of procs) {
            out += `${p.user.padEnd(10)}${String(p.pid).padEnd(6)}${p.cpu.padEnd(5)}${p.mem.padEnd(5)}${String(p.vsz).padEnd(8)}${String(p.rss).padEnd(6)}?        Ss   ${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}   0:00 ${p.cmd}\n`;
        }
        return out;
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
            `\nOS Name:                   Microsoft Windows` +
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
        if (sub === 'os') return `Caption                  Version       BuildNumber  OSArchitecture\nMicrosoft Windows        10.0.19045    19045        64-bit`;
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

function _cidrToMaskLocal(c) {
    if (c === 0) return '0.0.0.0';
    const u = (0xffffffff << (32 - c)) >>> 0;
    return [(u >>> 24) & 0xff, (u >>> 16) & 0xff, (u >>> 8) & 0xff, u & 0xff].join('.');
}
