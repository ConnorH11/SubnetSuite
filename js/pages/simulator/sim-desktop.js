// sim-desktop.js

import { makeDraggable } from './sim-ui-utils.js';
import { WindowManager } from './sim-window-manager.js';
import { createCLI } from './sim-cli.js';
import { isValidIP, cidrToMask, getNetAddr, maskToCidr } from './sim-math.js';

export class SimDesktop {
    constructor(node, engine) {
        this.node = node;
        this.engine = engine;
        this.modal = null;
        this.wm = null;
        this.appIdCounter = 0;
        this.popoutWindow = null;
    }

    render() {
        if (this.modal) this.modal.remove();

        this.modal = document.createElement('div');
        this.modal.className = 'sim-desktop-modal';
        
        const isLinux = this.node.os === 'linux';
        const isServer = this.node.type === 'server';

        const wallpaperStyle = isLinux
            ? 'background: linear-gradient(145deg, #2c001e 0%, #300a24 25%, #44204a 50%, #5e2750 70%, #2c001e 100%);'
            : 'background: linear-gradient(135deg, #0078D4 0%, #005A9E 20%, #004578 40%, #1a3a5c 60%, #0078D4 80%, #2b88d8 100%);';

        const desktopIcons = this._getDesktopIcons(isLinux, isServer);

        this.modal.innerHTML = `
            <div class="sim-cli-header sim-desktop-titlebar">
                <div class="sim-cli-header-left">
                    <span class="sim-cli-vendor-dot" style="background:${isLinux ? '#f5a623' : '#0078d4'}"></span>
                    <span>Desktop — ${this.node.name} (${this.node.model})</span>
                </div>
                <div class="sim-cli-header-btns">
                    <button class="sim-desktop-popout" title="Pop out to separate window"><i class="bi bi-box-arrow-up-right"></i></button>
                    <button class="sim-cli-close"><i class="bi bi-x"></i></button>
                </div>
            </div>
            <div class="wm-desktop-container">
                ${!this.node.powered ? `
                    <div class="wm-powered-off-screen" style="position:absolute; inset:0; background:#0f0f0f; z-index:9999; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff;">
                        <i class="bi bi-power" style="font-size:5rem; color:#444; margin-bottom:20px;"></i>
                        <h2 style="color:#666; font-weight: 300;">No Signal</h2>
                        <button class="btn btn-outline-light mt-4" id="btn-desktop-power-on" style="border-color: #444; color: #aaa;"><i class="bi bi-power"></i> Power On Device</button>
                    </div>
                ` : ''}
                <div class="wm-desktop-area" style="${wallpaperStyle}">
                    <div class="wm-desktop-icons">
                        ${desktopIcons.map(icon => `
                            <div class="wm-desktop-icon" data-app="${icon.id}" title="${icon.label}">
                                <div class="wm-desktop-icon-img">
                                    <i class="bi ${icon.icon}"></i>
                                </div>
                                <span class="wm-desktop-icon-label">${icon.label}</span>
                            </div>
                        `).join('')}
                    </div>

                </div>
                <div class="wm-taskbar ${isLinux ? 'wm-taskbar-linux' : 'wm-taskbar-windows'}">
                    <button class="wm-start-btn" title="Applications">
                        <i class="bi ${isLinux ? 'bi-ubuntu' : 'bi-windows'}"></i>
                    </button>
                    <div class="wm-taskbar-apps"></div>
                    <div class="wm-taskbar-tray">
                        <span class="wm-taskbar-tray-icon"><i class="bi bi-wifi"></i></span>
                        <span class="wm-taskbar-tray-icon"><i class="bi bi-volume-up-fill"></i></span>
                        <span class="wm-taskbar-clock">${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                </div>
                <div class="wm-start-menu hidden">
                    <div class="wm-start-header">${this.node.name}</div>
                    <div class="wm-start-apps"></div>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);
        makeDraggable(this.modal, this.modal.querySelector('.sim-desktop-titlebar'));

        this.wm = new WindowManager(this.modal.querySelector('.wm-desktop-container'));

        const pwrBtn = this.modal.querySelector('#btn-desktop-power-on');
        if (pwrBtn) {
            pwrBtn.addEventListener('click', () => {
                this.node.powered = true;
                for (const iface of Object.values(this.node.interfaces)) iface.state = 'up';
                if (this.engine.graph) this.engine.graph.notify();
                this.render();
            });
        }

        this.modal.querySelector('.sim-desktop-popout').addEventListener('click', () => this._popOutDesktop());
        this.modal.querySelector('.sim-cli-close').addEventListener('click', () => {
            this.modal.remove();
            if (this.popoutWindow && !this.popoutWindow.closed) this.popoutWindow.close();
        });

        this._buildStartMenu();

        const startBtn = this.modal.querySelector('.wm-start-btn');
        const startMenu = this.modal.querySelector('.wm-start-menu');
        startBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            startMenu.classList.toggle('hidden');
        });
        this.modal.addEventListener('click', () => startMenu.classList.add('hidden'));

        this.modal.querySelectorAll('.wm-desktop-icon').forEach(icon => {
            icon.addEventListener('dblclick', (e) => {
                if (!this.node.powered) return;
                e.stopPropagation();
                this._launchApp(icon.dataset.app);
            });
        });

        this.clockInterval = setInterval(() => {
            const clock = this.modal.querySelector('.wm-taskbar-clock');
            if (clock) clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }, 30000);
    }

    _getDesktopIcons(isLinux, isServer) {
        const icons = [
            { id: 'terminal', icon: 'bi-terminal-fill', label: isLinux ? 'Terminal' : 'CMD' },
            { id: 'browser', icon: 'bi-globe2', label: 'Browser' },
            { id: 'files', icon: 'bi-folder-fill', label: isLinux ? 'Files' : 'Explorer' },
            { id: 'ipconfig', icon: 'bi-diagram-3-fill', label: 'IP Config' },
            { id: 'editor', icon: 'bi-file-earmark-text', label: isLinux ? 'Text Editor' : 'Notepad' },
            { id: 'wireshark', icon: 'bi-reception-4', label: 'Wireshark' },
            { id: 'calculator', icon: 'bi-calculator-fill', label: 'Subnet Calc' },
            { id: 'sysinfo', icon: 'bi-info-circle-fill', label: 'System Info' },
            { id: 'netmon', icon: 'bi-activity', label: 'Net Monitor' },
            { id: 'pktgen', icon: 'bi-send-fill', label: 'Packet Gen' },
            { id: 'services', icon: 'bi-sliders', label: 'Services' },
            { id: 'logviewer', icon: 'bi-journal-text', label: isLinux ? 'Logs' : 'Event Viewer' },
            { id: 'appstore', icon: 'bi-bag-fill', label: isLinux ? 'Software Center' : 'Store' },
        ];

        if (isServer) {
            icons.push(
                { id: 'dhcpserver', icon: 'bi-hdd-rack-fill', label: 'DHCP Server' },
                { id: 'dnsserver', icon: 'bi-server', label: 'DNS Server' },
            );
        }

        return icons;
    }

    _launchApp(appId) {
        const appMap = {
            'terminal': () => this._openTerminal(),
            'ipconfig': () => this._openIPConfig(),
            'browser': () => this._openBrowser(),
            'wireshark': () => this._openWireshark(),
            'editor': () => this._openTextEditor(),
            'files': () => this._openFileManager(),
            'sshclient': () => this._openSSHClient(),
            'dns': () => this._openDNSLookup(),
            'calculator': () => this._openSubnetCalc(),
            'sysinfo': () => this._openSystemInfo(),
            'pktgen': () => this._openPacketGen(),
            'netmon': () => this._openNetMonitor(),
            'services': () => this._openServicesManager(),
            'logviewer': () => this._openLogViewer(),
            'dhcpserver': () => this._openDHCPServer(),
            'dnsserver': () => this._openDNSServer(),
            'appstore': () => this._openAppStore(),
        };
        const launcher = appMap[appId];
        if (launcher) launcher();
    }

    _buildStartMenu() {
        const appsContainer = this.modal.querySelector('.wm-start-apps');
        const isServer = this.node.type === 'server';

        const apps = [
            { id: 'terminal', icon: 'bi-terminal-fill', label: 'Terminal', action: () => this._openTerminal() },
            { id: 'ipconfig', icon: 'bi-diagram-3-fill', label: 'IP Configuration', action: () => this._openIPConfig() },
            { id: 'browser', icon: 'bi-globe2', label: 'Web Browser', action: () => this._openBrowser() },
            { id: 'wireshark', icon: 'bi-reception-4', label: 'Packet Capture', action: () => this._openWireshark() },
            { id: 'editor', icon: 'bi-file-earmark-text', label: 'Text Editor', action: () => this._openTextEditor() },
            { id: 'files', icon: 'bi-folder-fill', label: 'File Manager', action: () => this._openFileManager() },
            { id: 'sshclient', icon: 'bi-key-fill', label: 'SSH Client', action: () => this._openSSHClient() },
            { id: 'dns', icon: 'bi-search', label: 'DNS Lookup', action: () => this._openDNSLookup() },
            { id: 'calculator', icon: 'bi-calculator-fill', label: 'Subnet Calculator', action: () => this._openSubnetCalc() },
            { id: 'sysinfo', icon: 'bi-info-circle-fill', label: 'System Info', action: () => this._openSystemInfo() },
            { id: 'pktgen', icon: 'bi-send-fill', label: 'Packet Generator', action: () => this._openPacketGen() },
            { id: 'netmon', icon: 'bi-activity', label: 'Network Monitor', action: () => this._openNetMonitor() },
            { id: 'services', icon: 'bi-sliders', label: 'Services', action: () => this._openServicesManager() },
            { id: 'logviewer', icon: 'bi-journal-text', label: 'Log Viewer', action: () => this._openLogViewer() },
            { id: 'appstore', icon: 'bi-bag-fill', label: 'Software Center', action: () => this._openAppStore() },
        ];

        if (isServer) {
            apps.push(
                { id: 'dhcpserver', icon: 'bi-hdd-rack-fill', label: 'DHCP Server', action: () => this._openDHCPServer() },
                { id: 'dnsserver', icon: 'bi-server', label: 'DNS Server', action: () => this._openDNSServer() },
            );
        }

        for (const app of apps) {
            const item = document.createElement('div');
            item.className = 'wm-start-app-item';
            item.innerHTML = `<i class="bi ${app.icon}"></i><span>${app.label}</span>`;
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                this.modal.querySelector('.wm-start-menu').classList.add('hidden');
                app.action();
            });
            appsContainer.appendChild(item);
        }
    }

    _appId(prefix) { return `${prefix}_${++this.appIdCounter}`; }

    _popOutDesktop() {
        if (this.popoutWindow && !this.popoutWindow.closed) {
            this.popoutWindow.focus();
            return;
        }

        const pop = window.open('', `subnetsuite_device_${this.node.id}`, 'popup=yes,width=1100,height=760,resizable=yes,scrollbars=no');
        if (!pop) {
            alert('Pop-up blocked. Allow pop-ups for this site to open device desktops on another monitor.');
            return;
        }

        this.popoutWindow = pop;
        pop.document.open();
        pop.document.write(`<!doctype html><html><head><title>${this._esc(this.node.name)} - SubnetSuite Device</title></head><body></body></html>`);
        pop.document.close();
        this._copyStylesToPopout(pop.document);

        pop.document.body.className = 'sim-popout-body';
        pop.document.body.appendChild(this.modal);
        this.modal.classList.add('sim-desktop-popped-out');
        this.modal.style.transform = 'none';
        this.modal.style.left = '0';
        this.modal.style.top = '0';
        this.modal.style.right = 'auto';
        this.modal.style.bottom = 'auto';

        if (this.wm?.refreshContext) this.wm.refreshContext();
        pop.addEventListener('beforeunload', () => {
            if (this.modal?.parentElement === pop.document.body) this.modal.remove();
            this.popoutWindow = null;
        });
        pop.focus();
    }

    _copyStylesToPopout(targetDoc) {
        const base = targetDoc.createElement('base');
        base.href = document.baseURI;
        targetDoc.head.appendChild(base);

        document.querySelectorAll('link[rel="stylesheet"], style').forEach(node => {
            const clone = targetDoc.createElement(node.tagName.toLowerCase());
            if (node.tagName.toLowerCase() === 'link') {
                clone.rel = 'stylesheet';
                clone.href = node.href;
            } else {
                clone.textContent = node.textContent;
            }
            targetDoc.head.appendChild(clone);
        });
    }

    // ═══════════════════════════════════════════════
    // ═══════════════════════════════════════════════
    _openTerminal() {
        const id = this._appId('term');
        const content = this.wm.createWindow(id, 'Terminal', 'bi-terminal-fill', { width: 680, height: 420 });
        content.classList.add('wm-terminal');

        const cli = createCLI(this.node, () => this.engine.graph.notify(), this.engine);

        content.innerHTML = `
            <div class="cli-output"><div class="cli-welcome">${this._termWelcome()}</div></div>
            <div class="sim-cli-input-line">
                <span class="cli-prompt">${cli.getPrompt()}</span>
                <input type="text" class="sim-cli-input" autofocus autocomplete="off" spellcheck="false">
            </div>
        `;

        const outDiv = content.querySelector('.cli-output');
        const promptSpan = content.querySelector('.cli-prompt');
        const input = content.querySelector('.sim-cli-input');

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const cmd = input.value;
                input.value = '';
                const echo = document.createElement('div');
                echo.className = 'cli-echo';
                echo.textContent = promptSpan.textContent + cmd;
                outDiv.appendChild(echo);

                if (!cmd) { promptSpan.textContent = cli.getPrompt(); return; }

                let res = cli.execute(cmd);

                if (res && res.startsWith('__PING__')) {
                    this.engine._handlePingOutput(outDiv, input, promptSpan, cli, res.substring(8), this.node.id);
                    return;
                }
                if (res && res.startsWith('__TRACEROUTE__')) {
                    this.engine._handleTracerouteOutput(outDiv, input, promptSpan, cli, res.substring(14), this.node.id);
                    return;
                }
                if (res === '__CLEAR__') { outDiv.innerHTML = ''; promptSpan.textContent = cli.getPrompt(); return; }
                if (res === '__EXIT__') { this.wm.closeWindow(id); return; }
                if (res && res.startsWith('__NSLOOKUP__')) {
                    const hostname = res.substring(12);
                    const result = this.engine.resolveDNS(this.node.id, hostname);
                    res = result.ok ? `Server:  dns-server\nAddress: resolved\n\nName:    ${hostname}\nAddress: ${result.ip}` : `*** Can't find ${hostname}: Non-existent domain`;
                }

                if (res) {
                    const resDiv = document.createElement('div');
                    resDiv.className = 'cli-response';
                    resDiv.textContent = res;
                    resDiv.style.whiteSpace = 'pre-wrap';
                    outDiv.appendChild(resDiv);
                }
                promptSpan.textContent = cli.getPrompt();
                content.scrollTop = content.scrollHeight;
            } else if (e.key === 'ArrowUp') { e.preventDefault(); const p = cli.getPrevHistory(); if (p !== undefined) input.value = p; }
            else if (e.key === 'ArrowDown') { e.preventDefault(); input.value = cli.getNextHistory() || ''; }
            else if (e.key === 'Tab') {
                e.preventDefault();
                const result = cli.tabComplete(input.value);
                if (Array.isArray(result)) {
                    if (result.length === 1) {
                        input.value = result[0] + ' ';
                    } else if (result.length > 1) {
                        const d = document.createElement('div'); d.className = 'cli-response'; d.textContent = result.join('  ');
                        outDiv.appendChild(d);
                    }
                }
            }
        });
        content.addEventListener('click', () => input.focus());
        setTimeout(() => input.focus(), 100);
    }

    _termWelcome() {
        if (this.node.os === 'linux') return `Welcome to Ubuntu 22.04 LTS (${this.node.hostname})\nType 'help' for available commands.\n`;
        return `Microsoft Windows [Version 10.0.19045]\n(c) Microsoft Corporation. All rights reserved.\n`;
    }

    // ═══════════════════════════════════════════════
    // ═══════════════════════════════════════════════
    _openIPConfig() {
        const id = this._appId('ipconf');
        const content = this.wm.createWindow(id, 'IP Configuration', 'bi-diagram-3-fill', { width: 500, height: 460 });

        this._renderIPConfigUI(content);
    }

    _renderIPConfigUI(content) {
        const firstIf = Object.entries(this.node.interfaces)[0];
        const ifName = firstIf ? firstIf[0] : 'eth0';
        const iface = firstIf ? firstIf[1] : {};

        content.innerHTML = `
            <div class="app-padded">
                <h3 class="app-section-title">Network Interface — ${ifName}</h3>
                <div class="app-form-grid">
                    <div class="sim-form-group">
                        <label>IPv4 Address</label>
                        <input class="sim-input" id="cfg-ip" value="${iface.ip || ''}" placeholder="192.168.1.10">
                    </div>
                    <div class="sim-form-group">
                        <label>Subnet Mask (CIDR)</label>
                        <input class="sim-input" id="cfg-subnet" type="number" min="1" max="32" value="${iface.subnet || ''}" placeholder="24">
                    </div>
                    <div class="sim-form-group">
                        <label>Default Gateway</label>
                        <input class="sim-input" id="cfg-gw" value="${this.node.gateway || ''}" placeholder="192.168.1.1">
                    </div>
                    <div class="sim-form-group">
                        <label>DNS Server</label>
                        <input class="sim-input" id="cfg-dns" value="${this.node.dnsServer || ''}" placeholder="8.8.8.8">
                    </div>
                    <div class="sim-form-group">
                        <label>MAC Address</label>
                        <input class="sim-input" value="${iface.mac || ''}" readonly style="opacity:0.6">
                    </div>
                </div>
                <div class="app-btn-row" style="margin-top: 16px;">
                    <button class="app-btn app-btn-primary" id="btn-apply-ip">Apply</button>
                    <button class="app-btn app-btn-secondary" id="btn-dhcp">Request DHCP</button>
                </div>
                <div id="dhcp-status" class="app-status-msg"></div>
                <h3 class="app-section-title" style="margin-top:24px">Interface Status</h3>
                <div id="if-status-table"></div>
            </div>
        `;

        this._renderIfaceTable(content.querySelector('#if-status-table'));

        content.querySelector('#btn-apply-ip').addEventListener('click', () => {
            if (iface) {
                iface.ip = content.querySelector('#cfg-ip').value;
                iface.subnet = content.querySelector('#cfg-subnet').value;
                this.node.gateway = content.querySelector('#cfg-gw').value;
                this.node.dnsServer = content.querySelector('#cfg-dns').value;
                this.engine.graph.notify();
                this._renderIfaceTable(content.querySelector('#if-status-table'));
                content.querySelector('#dhcp-status').textContent = '✓ IP configuration applied.';
                content.querySelector('#dhcp-status').className = 'app-status-msg success';
            }
        });

        content.querySelector('#btn-dhcp').addEventListener('click', () => {
            const statusEl = content.querySelector('#dhcp-status');
            statusEl.textContent = 'Discovering DHCP server...';
            statusEl.className = 'app-status-msg info';
            setTimeout(() => {
                const result = this.engine.requestDHCP(this.node.id);
                if (result.ok) {
                    content.querySelector('#cfg-ip').value = result.ip;
                    content.querySelector('#cfg-subnet').value = result.subnet;
                    if (result.gateway) content.querySelector('#cfg-gw').value = result.gateway;
                    if (result.dns) content.querySelector('#cfg-dns').value = result.dns;
                    statusEl.textContent = `✓ DHCP: Received ${result.ip}/${result.subnet}`;
                    statusEl.className = 'app-status-msg success';
                    this._renderIfaceTable(content.querySelector('#if-status-table'));
                } else {
                    statusEl.textContent = `✗ ${result.reason}`;
                    statusEl.className = 'app-status-msg error';
                }
            }, 800);
        });
    }

    _renderIfaceTable(container) {
        let html = '<table class="app-table"><thead><tr><th>Interface</th><th>IP</th><th>Subnet</th><th>MAC</th><th>State</th></tr></thead><tbody>';
        for (const [name, iface] of Object.entries(this.node.interfaces)) {
            const stClass = iface.state === 'up' ? 'status-up' : 'status-down';
            html += `<tr><td>${name}</td><td>${iface.ip || '—'}</td><td>${iface.subnet ? '/' + iface.subnet : '—'}</td><td class="mono">${iface.mac || '—'}</td><td><span class="${stClass}">${iface.state}</span></td></tr>`;
        }
        html += '</tbody></table>';
        container.innerHTML = html;
    }

    // ═══════════════════════════════════════════════
    // ═══════════════════════════════════════════════
    _openBrowser() {
        const id = this._appId('browser');
        const content = this.wm.createWindow(id, 'Web Browser', 'bi-globe2', { width: 700, height: 500 });

        content.innerHTML = `
            <div class="browser-toolbar">
                <button class="browser-nav-btn" id="browser-back"><i class="bi bi-arrow-left"></i></button>
                <button class="browser-nav-btn" id="browser-reload"><i class="bi bi-arrow-clockwise"></i></button>
                <input class="browser-url" id="browser-url" placeholder="Enter IP address (e.g., 192.168.1.1)" autocomplete="off">
                <button class="browser-go-btn" id="browser-go"><i class="bi bi-arrow-right-circle-fill"></i></button>
            </div>
            <div class="browser-viewport" id="browser-viewport">
                <div class="browser-home">
                    <i class="bi bi-globe2" style="font-size:48px;opacity:0.3"></i>
                    <p>Enter a device IP address to access its web management interface</p>
                </div>
            </div>
        `;

        const urlInput = content.querySelector('#browser-url');
        const viewport = content.querySelector('#browser-viewport');

        const navigate = () => {
            const url = urlInput.value.trim();
            if (!url) return;
            this._browserNavigate(viewport, url);
        };

        urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') navigate(); });
        content.querySelector('#browser-go').addEventListener('click', navigate);
        content.querySelector('#browser-reload').addEventListener('click', navigate);
    }

    _browserNavigate(viewport, url) {
        let targetIp = url;
        if (!isValidIP(url)) {
            const dnsRes = this.engine.resolveDNS(this.node.id, url);
            if (!dnsRes.ok) {
                viewport.innerHTML = `<div class="browser-error" style="text-align:center;padding:40px;color:var(--sim-text-muted)"><i class="bi bi-exclamation-triangle-fill" style="font-size:48px;color:var(--sim-danger);margin-bottom:16px;display:block"></i><h3>DNS Resolution Failed</h3><p>Could not resolve hostname <strong>${url}</strong></p></div>`;
                return;
            }
            targetIp = dnsRes.ip;
        }

        viewport.innerHTML = `<div class="browser-loading" style="text-align:center;padding:60px;color:var(--sim-text-muted)"><i class="bi bi-arrow-repeat" style="font-size:32px;animation:spin 1s linear infinite;display:block;margin-bottom:16px"></i><p>Connecting to ${targetIp}...</p></div>`;

        setTimeout(() => {
            const targetNode = this.engine.graph.findNodeByIP(targetIp);
            
            if (targetNode && targetNode.hasWebUI && (!targetNode.services || !targetNode.services.http)) {
                const pingRes = this.engine.ping(this.node.id, targetIp);
                if (!pingRes.ok) {
                    viewport.innerHTML = `<div class="browser-error" style="text-align:center;padding:40px;color:var(--sim-text-muted)"><i class="bi bi-x-circle-fill" style="font-size:48px;color:var(--sim-danger);margin-bottom:16px;display:block"></i><h3>ERR_CONNECTION_TIMED_OUT</h3><p>${pingRes.reason}</p></div>`;
                    return;
                }
                this._renderDeviceWebUI(viewport, targetNode);
                return;
            }

            const response = this.engine.httpRequest(this.node.id, targetIp);
            
            if (!response.ok) {
                viewport.innerHTML = `<div class="browser-error" style="text-align:center;padding:40px;color:var(--sim-text-muted)"><i class="bi bi-x-circle-fill" style="font-size:48px;color:var(--sim-danger);margin-bottom:16px;display:block"></i><h3>ERR_CONNECTION_REFUSED</h3><p>${response.reason}</p></div>`;
                return;
            }

            viewport.innerHTML = `<div class="browser-iframe-wrapper" style="width:100%;height:100%;background:white;color:black;overflow:auto;"><iframe style="width:100%;height:100%;border:none;" sandbox="allow-same-origin allow-scripts" srcdoc="${response.content.replace(/"/g, '&quot;')}"></iframe></div>`;
        }, 500);
    }

    _renderDeviceWebUI(viewport, device) {
        const vendorColor = device.vendor === 'cisco' ? '#049fd9' : device.vendor === 'juniper' ? '#84b135' : '#4a90d9';
        
        viewport.innerHTML = `
            <div class="device-webui">
                <div class="webui-sidebar" style="border-right-color:${vendorColor}">
                    <div class="webui-logo" style="background:${vendorColor}">
                        <i class="bi ${device.icon}"></i>
                        <span>${device.name}</span>
                    </div>
                    <nav class="webui-nav">
                        <a class="webui-nav-item active" data-tab="dashboard"><i class="bi bi-speedometer2"></i> Dashboard</a>
                        <a class="webui-nav-item" data-tab="interfaces"><i class="bi bi-ethernet"></i> Interfaces</a>
                        ${device.type === 'switch' || device.type === 'l3switch' ? '<a class="webui-nav-item" data-tab="vlans"><i class="bi bi-diagram-2"></i> VLANs</a>' : ''}
                        ${device.type === 'switch' || device.type === 'l3switch' ? '<a class="webui-nav-item" data-tab="mac"><i class="bi bi-table"></i> MAC Table</a>' : ''}
                        ${device.type === 'firewall' ? '<a class="webui-nav-item" data-tab="policies"><i class="bi bi-shield-check"></i> Policies</a>' : ''}
                        ${device.type === 'server' ? '<a class="webui-nav-item" data-tab="services"><i class="bi bi-gear"></i> Services</a>' : ''}
                        <a class="webui-nav-item" data-tab="system"><i class="bi bi-info-circle"></i> System</a>
                    </nav>
                </div>
                <div class="webui-main" id="webui-content"></div>
            </div>
        `;

        const mainContent = viewport.querySelector('#webui-content');
        this._renderWebuiTab(mainContent, device, 'dashboard');

        viewport.querySelectorAll('.webui-nav-item').forEach(item => {
            item.addEventListener('click', () => {
                viewport.querySelectorAll('.webui-nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                this._renderWebuiTab(mainContent, device, item.dataset.tab);
            });
        });
    }

    _renderWebuiTab(container, device, tab) {
        const ifaceCount = Object.keys(device.interfaces).length;
        const upCount = Object.values(device.interfaces).filter(i => i.state === 'up').length;

        switch (tab) {
            case 'dashboard':
                container.innerHTML = `
                    <h2 class="webui-page-title">Dashboard</h2>
                    <div class="webui-cards">
                        <div class="webui-card"><div class="webui-card-val">${device.model}</div><div class="webui-card-label">Model</div></div>
                        <div class="webui-card"><div class="webui-card-val">${upCount}/${ifaceCount}</div><div class="webui-card-label">Ports Up</div></div>
                        <div class="webui-card"><div class="webui-card-val">${Object.keys(device.vlans).length}</div><div class="webui-card-label">VLANs</div></div>
                        <div class="webui-card"><div class="webui-card-val">${device.macTable.size}</div><div class="webui-card-label">MAC Entries</div></div>
                    </div>
                    <h3 class="webui-section-title">Port Status</h3>
                    <div class="webui-port-grid">${Object.entries(device.interfaces).map(([n, i]) => 
                        `<div class="webui-port ${i.state}" title="${n}: ${i.state}"><span>${getPortDisplayShort(n)}</span></div>`
                    ).join('')}</div>
                `;
                break;
            case 'interfaces':
                container.innerHTML = `
                    <h2 class="webui-page-title">Interfaces</h2>
                    <table class="app-table"><thead><tr><th>Name</th><th>Status</th><th>IP</th><th>Speed</th><th>Mode</th></tr></thead><tbody>
                    ${Object.entries(device.interfaces).map(([n, i]) =>
                        `<tr><td>${n}</td><td><span class="${i.state === 'up' ? 'status-up' : 'status-down'}">${i.state}</span></td><td>${i.ip || '—'}</td><td>${i.speed || 'auto'}</td><td>${i.switchportMode || 'routed'}</td></tr>`
                    ).join('')}
                    </tbody></table>
                `;
                break;
            case 'vlans':
                container.innerHTML = `
                    <h2 class="webui-page-title">VLANs</h2>
                    <table class="app-table"><thead><tr><th>VLAN ID</th><th>Name</th><th>Ports</th></tr></thead><tbody>
                    ${Object.entries(device.vlans).map(([vid, v]) => {
                        const ports = Object.entries(device.interfaces).filter(([_, i]) => i.accessVlan == vid).map(([n]) => getPortDisplayShort(n));
                        return `<tr><td>${vid}</td><td>${v.name}</td><td>${ports.join(', ') || '—'}</td></tr>`;
                    }).join('')}
                    </tbody></table>
                `;
                break;
            case 'mac':
                container.innerHTML = `
                    <h2 class="webui-page-title">MAC Address Table</h2>
                    <table class="app-table"><thead><tr><th>MAC</th><th>VLAN</th><th>Port</th><th>Type</th></tr></thead><tbody>
                    ${device.macTable.size > 0 ? Array.from(device.macTable.entries()).map(([mac, e]) =>
                        `<tr><td class="mono">${mac}</td><td>${e.vlan}</td><td>${e.port}</td><td>${e.type}</td></tr>`
                    ).join('') : '<tr><td colspan="4">No entries</td></tr>'}
                    </tbody></table>
                `;
                break;
            case 'policies':
                container.innerHTML = `
                    <h2 class="webui-page-title">Security Policies</h2>
                    ${device.aclRules.length > 0 ? 
                        `<table class="app-table"><thead><tr><th>ACL</th><th>Type</th><th>Entries</th></tr></thead><tbody>
                        ${device.aclRules.map(a => `<tr><td>${a.id}</td><td>${a.type}</td><td>${a.entries.length}</td></tr>`).join('')}
                        </tbody></table>` : '<p class="webui-empty">No ACL rules configured.</p>'}
                `;
                break;
            case 'services':
                container.innerHTML = `
                    <h2 class="webui-page-title">Services</h2>
                    <div class="webui-service-list">
                        <div class="webui-service"><span class="service-dot ${device.dhcpPools.length > 0 ? 'active' : ''}"></span> DHCP Server (${device.dhcpPools.length} pools)</div>
                        <div class="webui-service"><span class="service-dot ${device.dnsRecords.length > 0 ? 'active' : ''}"></span> DNS Server (${device.dnsRecords.length} records)</div>
                        <div class="webui-service"><span class="service-dot ${device.httpEnabled ? 'active' : ''}"></span> HTTP Server</div>
                        <div class="webui-service"><span class="service-dot ${device.ftpEnabled ? 'active' : ''}"></span> FTP Server</div>
                    </div>
                `;
                break;
            case 'system':
                container.innerHTML = `
                    <h2 class="webui-page-title">System Information</h2>
                    <div class="webui-info-list">
                        <div class="webui-info-row"><span>Hostname</span><span>${device.hostname}</span></div>
                        <div class="webui-info-row"><span>Model</span><span>${device.model}</span></div>
                        <div class="webui-info-row"><span>Vendor</span><span>${device.vendor}</span></div>
                        <div class="webui-info-row"><span>Type</span><span>${device.type}</span></div>
                        <div class="webui-info-row"><span>OS</span><span>${device.os === 'linux' ? 'Linux' : 'Windows'}</span></div>
                        <div class="webui-info-row"><span>Interfaces</span><span>${ifaceCount}</span></div>
                        <div class="webui-info-row"><span>Uptime</span><span>${Math.floor(Math.random()*24)}h ${Math.floor(Math.random()*60)}m</span></div>
                    </div>
                `;
                break;
        }
    }

    // ═══════════════════════════════════════════════
    // ═══════════════════════════════════════════════
    _openWireshark() {
        const id = this._appId('wireshark');
        const content = this.wm.createWindow(id, 'Packet Capture', 'bi-reception-4', { width: 820, height: 560 });
        let selectedPacketId = null;
        let protocolFilter = 'all';
        
        const renderCapture = () => {
            const capturedPackets = this.engine.packetLog.filter(p => p.src === this.node.id || p.dst === this.node.id || p.observer === this.node.id);
            const protocols = Array.from(new Set(capturedPackets.map(p => p.type))).sort();
            const packets = protocolFilter === 'all' ? capturedPackets : capturedPackets.filter(p => p.type === protocolFilter);
            const selectedProtocol = this.node.labAnswers?.pcapProtocol || '';
            const selectedPacket = packets.find(p => String(p.id) === String(selectedPacketId)) || packets[0] || null;
            if (selectedPacket && selectedPacketId == null) selectedPacketId = selectedPacket.id;
            if (!selectedPacket) selectedPacketId = null;
            content.innerHTML = `
                <div class="app-padded">
                    <div class="app-btn-row" style="margin-bottom:12px">
                        <button class="app-btn app-btn-primary" id="btn-refresh-capture"><i class="bi bi-arrow-clockwise"></i> Refresh</button>
                        <button class="app-btn app-btn-secondary" id="btn-clear-capture"><i class="bi bi-trash"></i> Clear</button>
                        <span class="app-badge">${packets.length}/${capturedPackets.length} packets</span>
                        ${selectedProtocol ? `<span class="app-badge">Marked: ${selectedProtocol}</span>` : ''}
                    </div>
                    <div class="app-btn-row" style="margin-bottom:12px; flex-wrap:wrap">
                        <button class="app-btn app-btn-secondary app-btn-sm pcap-filter ${protocolFilter === 'all' ? 'active' : ''}" data-protocol-filter="all">All</button>
                        ${protocols.map(protocol => `<button class="app-btn app-btn-secondary app-btn-sm pcap-filter ${protocolFilter === protocol ? 'active' : ''}" data-protocol-filter="${this._esc(protocol)}">${this._esc(protocol)}</button>`).join('')}
                    </div>
                    <div class="pcap-layout">
                        <div class="pcap-table-pane">
                            <table class="app-table app-table-compact">
                                <thead><tr><th>#</th><th>Time</th><th>Protocol</th><th>Source</th><th>Destination</th><th>Info</th></tr></thead>
                                <tbody>${packets.length > 0 ? packets.map(p => {
                                    const srcName = this._packetEndpointName(p.src);
                                    const dstName = this._packetEndpointName(p.dst);
                                    const typeClass = p.type === 'ICMP' ? 'proto-icmp' : p.type === 'ARP' ? 'proto-arp' : p.type === 'DHCP' ? 'proto-dhcp' : p.type === 'DNS' ? 'proto-dns' : p.type === 'TCP/HTTP' ? 'proto-http' : p.type === 'TCP' ? 'proto-tcp' : '';
                                    return `<tr class="${typeClass} ${String(p.id) === String(selectedPacketId) ? 'pcap-row-selected' : ''}" data-packet-id="${p.id}"><td>${p.id}</td><td>${new Date(p.timestamp).toLocaleTimeString()}</td><td><span class="proto-badge">${p.type}</span></td><td>${srcName}</td><td>${dstName}</td><td class="mono" style="font-size:11px">${this._esc(p.info || '')}</td></tr>`;
                                }).join('') : '<tr><td colspan="6" style="text-align:center;opacity:0.5">No packets captured. Send ping, DHCP, DNS, or browser traffic to see packets.</td></tr>'}</tbody>
                            </table>
                        </div>
                        <div class="pcap-detail-pane">
                            ${selectedPacket ? this._renderPacketDetails(selectedPacket) : '<div class="webui-empty">Select a packet to inspect details.</div>'}
                        </div>
                    </div>
                </div>
            `;
            content.querySelector('#btn-refresh-capture').addEventListener('click', renderCapture);
            content.querySelector('#btn-clear-capture').addEventListener('click', () => { this.engine.clearPacketLog(); selectedPacketId = null; renderCapture(); });
            content.querySelectorAll('[data-protocol-filter]').forEach(btn => {
                btn.addEventListener('click', () => {
                    protocolFilter = btn.dataset.protocolFilter;
                    selectedPacketId = null;
                    renderCapture();
                });
            });
            content.querySelectorAll('[data-packet-id]').forEach(row => {
                row.addEventListener('click', () => {
                    selectedPacketId = row.dataset.packetId;
                    renderCapture();
                });
            });
            content.querySelectorAll('.btn-mark-packet').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.node.labAnswers = this.node.labAnswers || {};
                    this.node.labAnswers.pcapProtocol = btn.dataset.protocol;
                    this.node.labAnswers.pcapPacketInfo = btn.dataset.info || '';
                    this.engine.graph.notify();
                    renderCapture();
                });
            });
        };
        renderCapture();
    }

    _renderPacketDetails(packet) {
        const details = packet.details || {};
        const rows = Object.entries(details).map(([key, value]) => `
            <div class="webui-info-row"><span>${this._formatDetailKey(key)}</span><span>${this._esc(value)}</span></div>
        `).join('');
        const path = Array.isArray(packet.path)
            ? packet.path.map(id => this.engine.graph.getNode(id)?.name || id).join(' -> ')
            : '';
        return `
            <h3 class="app-section-title">Packet ${packet.id}</h3>
            <div class="pcap-detail-card">
                <div class="webui-info-row"><span>Protocol</span><span>${this._esc(packet.type)}</span></div>
                <div class="webui-info-row"><span>Source</span><span>${this._packetEndpointName(packet.src)}</span></div>
                <div class="webui-info-row"><span>Destination</span><span>${this._packetEndpointName(packet.dst)}</span></div>
                <div class="webui-info-row"><span>Info</span><span>${this._esc(packet.info || '')}</span></div>
                ${path ? `<div class="webui-info-row"><span>Path</span><span>${this._esc(path)}</span></div>` : ''}
                ${rows}
            </div>
            <button class="app-btn app-btn-primary app-btn-sm btn-mark-packet" data-protocol="${this._esc(packet.type)}" data-info="${this._esc(packet.info || '')}" style="margin-top:12px">
                <i class="bi bi-bookmark-check"></i> Mark as Evidence
            </button>
        `;
    }

    _packetEndpointName(id) {
        if (id === 'broadcast') return 'Broadcast';
        return this.engine.graph.getNode(id)?.name || id;
    }

    _formatDetailKey(key) {
        return String(key).replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
    }

    // ═══════════════════════════════════════════════
    // ═══════════════════════════════════════════════
    _openTextEditor(initialFile = '', initialContent = '') {
        const id = this._appId('editor');
        const content = this.wm.createWindow(id, initialFile ? `Editor — ${initialFile}` : 'Text Editor', 'bi-file-earmark-text', { width: 550, height: 400 });
        content.classList.add('wm-editor-container');

        content.innerHTML = `
            <div class="editor-toolbar">
                <input class="editor-filename" value="${initialFile}" placeholder="filename.txt">
                <span class="editor-unsaved" style="display:none; color: var(--sim-warning); margin-right: auto; font-weight: bold; font-size: 11px;">* Unsaved</span>
                <button class="app-btn app-btn-primary app-btn-sm" id="btn-save-file"><i class="bi bi-save"></i> Save</button>
                <button class="app-btn app-btn-secondary app-btn-sm" id="btn-new-file"><i class="bi bi-file-earmark-plus"></i> New</button>
            </div>
            <div class="editor-main" style="display: flex; flex: 1; overflow: hidden; background: #fff;">
                <div class="editor-gutter" style="width: 40px; background: #f0f0f0; border-right: 1px solid #ccc; text-align: right; padding: 12px 8px; color: #888; font-family: var(--sim-mono); font-size: 14px; user-select: none; overflow: hidden; line-height: 1.6;">1</div>
                <textarea class="editor-textarea" wrap="off" spellcheck="false" placeholder="Type or paste text here...">${initialContent}</textarea>
            </div>
        `;

        const textarea = content.querySelector('.editor-textarea');
        const gutter = content.querySelector('.editor-gutter');
        const unsavedIndicator = content.querySelector('.editor-unsaved');
        const titleText = content.parentElement.querySelector('.wm-title-text');
        
        let savedContent = initialContent;
        let isUnsaved = false;

        const updateGutter = () => {
            const lines = textarea.value.split('\n').length;
            let gutterHTML = '';
            for (let i = 1; i <= lines; i++) gutterHTML += i + '<br>';
            gutter.innerHTML = gutterHTML;
            if (textarea.value !== savedContent && !isUnsaved) {
                isUnsaved = true;
                unsavedIndicator.style.display = 'block';
                if (!titleText.textContent.startsWith('* ')) titleText.textContent = '* ' + titleText.textContent;
            } else if (textarea.value === savedContent && isUnsaved) {
                isUnsaved = false;
                unsavedIndicator.style.display = 'none';
                if (titleText.textContent.startsWith('* ')) titleText.textContent = titleText.textContent.substring(2);
            }
        };

        textarea.addEventListener('input', updateGutter);
        textarea.addEventListener('scroll', () => {
            gutter.scrollTop = textarea.scrollTop;
        });

        // Keyboard shortcuts
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                textarea.value = textarea.value.substring(0, start) + '    ' + textarea.value.substring(end);
                textarea.selectionStart = textarea.selectionEnd = start + 4;
                updateGutter();
            } else if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                content.querySelector('#btn-save-file').click();
            }
        });

        // Initialize gutter
        updateGutter();

        content.querySelector('#btn-save-file').addEventListener('click', () => {
            const filename = content.querySelector('.editor-filename').value;
            const text = content.querySelector('.editor-textarea').value;
            if (!filename) return;
            const parts = filename.split('/').filter(Boolean);
            const name = parts.pop();
            let dir = this.node.filesystem['/'];
            for (const p of parts) {
                if (!dir.children[p]) dir.children[p] = { type: 'dir', children: {} };
                dir = dir.children[p];
            }
            dir.children[name] = { type: 'file', content: text };
            
            savedContent = text;
            updateGutter();
        });
        
        content.querySelector('#btn-new-file').addEventListener('click', () => {
            this._openTextEditor();
        });
    }

    // ═══════════════════════════════════════════════
    // ═══════════════════════════════════════════════
    _openFileManager() {
        const id = this._appId('files');
        const content = this.wm.createWindow(id, 'File Manager', 'bi-folder-fill', { width: 550, height: 380 });
        this._renderFileManager(content, '/');
    }

    _renderFileManager(content, path) {
        const parts = path.split('/').filter(Boolean);
        let current = this.node.filesystem['/'];
        for (const p of parts) {
            if (current.children && current.children[p]) current = current.children[p];
            else { content.innerHTML = '<p class="app-padded">Path not found.</p>'; return; }
        }
        if (current.type !== 'dir') { content.innerHTML = '<p class="app-padded">Not a directory.</p>'; return; }

        const breadcrumb = '/ ' + parts.join(' / ');
        content.innerHTML = `
            <div class="fm-toolbar"><span class="fm-path">${breadcrumb}</span></div>
            <div class="fm-list">
                ${path !== '/' ? `<div class="fm-item fm-dir" data-path="${'/' + parts.slice(0, -1).join('/')}"><i class="bi bi-arrow-up"></i> ..</div>` : ''}
                ${Object.entries(current.children).sort(([,a],[,b]) => (a.type === 'dir' ? -1 : 1) - (b.type === 'dir' ? -1 : 1)).map(([name, node]) => {
                    const fullPath = path === '/' ? `/${name}` : `${path}/${name}`;
                    const icon = node.type === 'dir' ? 'bi-folder-fill' : 'bi-file-earmark-text';
                    const cls = node.type === 'dir' ? 'fm-dir' : 'fm-file';
                    const size = node.type === 'file' ? `${(node.content || '').length}B` : '';
                    return `<div class="fm-item ${cls}" data-path="${fullPath}" data-type="${node.type}"><i class="bi ${icon}"></i> <span>${name}</span> <span class="fm-size">${size}</span></div>`;
                }).join('')}
            </div>
        `;
        content.querySelectorAll('.fm-item').forEach(item => {
            item.addEventListener('dblclick', () => {
                if (item.dataset.type === 'dir' || item.classList.contains('fm-dir')) {
                    this._renderFileManager(content, item.dataset.path || '/');
                } else {
                    const p = item.dataset.path;
                    const pts = p.split('/').filter(Boolean);
                    const fn = pts.pop();
                    let dir = this.node.filesystem['/'];
                    for (const pt of pts) { if (dir.children[pt]) dir = dir.children[pt]; }
                    const file = dir.children[fn];
                    if (file) this._openTextEditor(p, file.content || '');
                }
            });
        });
    }

    // ═══════════════════════════════════════════════
    // ═══════════════════════════════════════════════
    _openSSHClient() {
        const id = this._appId('ssh');
        const content = this.wm.createWindow(id, 'SSH Client', 'bi-key-fill', { width: 500, height: 300 });
        content.innerHTML = `
            <div class="app-padded">
                <h3 class="app-section-title">SSH Connection</h3>
                <div class="sim-form-group"><label>Host IP</label><input class="sim-input" id="ssh-host" placeholder="192.168.1.1"></div>
                <div class="sim-form-group"><label>Port</label><input class="sim-input" id="ssh-port" value="22"></div>
                <button class="app-btn app-btn-primary" id="btn-ssh-connect" style="margin-top:12px"><i class="bi bi-box-arrow-in-right"></i> Connect</button>
                <div id="ssh-status" class="app-status-msg"></div>
            </div>
        `;
        content.querySelector('#btn-ssh-connect').addEventListener('click', () => {
            const host = content.querySelector('#ssh-host').value;
            const status = content.querySelector('#ssh-status');
            const target = this.engine.graph.findNodeByIP(host);
            if (target && (target.type === 'router' || target.type === 'switch' || target.type === 'l3switch' || target.type === 'firewall')) {
                status.textContent = `Connected to ${target.name}. Opening CLI...`;
                status.className = 'app-status-msg success';
                setTimeout(() => this.engine.openCLI(target.id), 500);
            } else {
                status.textContent = target ? `${target.name} does not support SSH.` : `Connection refused: ${host}`;
                status.className = 'app-status-msg error';
            }
        });
    }

    // ═══════════════════════════════════════════════
    // ═══════════════════════════════════════════════
    _openDNSLookup() {
        const id = this._appId('dns');
        const content = this.wm.createWindow(id, 'DNS Lookup', 'bi-search', { width: 450, height: 320 });
        content.innerHTML = `
            <div class="app-padded">
                <h3 class="app-section-title">DNS Lookup</h3>
                <div class="sim-form-group"><label>Hostname</label><input class="sim-input" id="dns-host" placeholder="server1.lab.local"></div>
                <button class="app-btn app-btn-primary" id="btn-dns-lookup" style="margin-top:12px"><i class="bi bi-search"></i> Lookup</button>
                <pre id="dns-result" class="app-result-box"></pre>
            </div>
        `;
        content.querySelector('#btn-dns-lookup').addEventListener('click', () => {
            const hostname = content.querySelector('#dns-host').value;
            const result = this.engine.resolveDNS(this.node.id, hostname);
            content.querySelector('#dns-result').textContent = result.ok
                ? `Server:  DNS Server\n\nName:    ${hostname}\nAddress: ${result.ip}`
                : `*** Error: ${result.reason}`;
        });
    }

    // ═══════════════════════════════════════════════
    // ═══════════════════════════════════════════════
    _openSubnetCalc() {
        const id = this._appId('calc');
        const content = this.wm.createWindow(id, 'Subnet Calculator', 'bi-calculator-fill', { width: 450, height: 380 });
        content.innerHTML = `
            <div class="app-padded">
                <h3 class="app-section-title">Subnet Calculator</h3>
                <div class="app-form-grid">
                    <div class="sim-form-group"><label>IP Address</label><input class="sim-input" id="calc-ip" placeholder="192.168.1.0"></div>
                    <div class="sim-form-group"><label>CIDR</label><input class="sim-input" id="calc-cidr" type="number" min="0" max="32" placeholder="24"></div>
                </div>
                <button class="app-btn app-btn-primary" id="btn-calc" style="margin-top:12px"><i class="bi bi-calculator"></i> Calculate</button>
                <div id="calc-result" class="app-result-box"></div>
            </div>
        `;
        content.querySelector('#btn-calc').addEventListener('click', () => {
            const ip = content.querySelector('#calc-ip').value;
            const cidr = parseInt(content.querySelector('#calc-cidr').value) || 24;
            if (!isValidIP(ip)) { content.querySelector('#calc-result').textContent = 'Invalid IP address.'; return; }
            const net = getNetAddr(ip, cidr);
            const mask = cidrToMask(cidr);
            const hosts = Math.pow(2, 32 - cidr) - 2;
            content.querySelector('#calc-result').innerHTML = `
                <div class="webui-info-list">
                    <div class="webui-info-row"><span>Network</span><span>${net}/${cidr}</span></div>
                    <div class="webui-info-row"><span>Mask</span><span>${mask}</span></div>
                    <div class="webui-info-row"><span>Usable Hosts</span><span>${hosts > 0 ? hosts : 0}</span></div>
                    <div class="webui-info-row"><span>Wildcard</span><span>${cidrToWildcard(cidr)}</span></div>
                </div>
            `;
        });
    }

    // ═══════════════════════════════════════════════
    // ═══════════════════════════════════════════════
    _openSystemInfo() {
        const id = this._appId('sysinfo');
        const content = this.wm.createWindow(id, 'System Info', 'bi-info-circle-fill', { width: 500, height: 400 });
        const iface = Object.values(this.node.interfaces)[0] || {};
        content.innerHTML = `
            <div class="app-padded">
                <h3 class="app-section-title">System Information</h3>
                <div class="webui-info-list">
                    <div class="webui-info-row"><span>Hostname</span><span>${this.node.hostname}</span></div>
                    <div class="webui-info-row"><span>OS</span><span>${this.node.os === 'linux' ? 'Ubuntu 22.04 LTS' : 'Windows 10 Pro'}</span></div>
                    <div class="webui-info-row"><span>IP Address</span><span>${iface.ip || 'Not configured'}</span></div>
                    <div class="webui-info-row"><span>MAC Address</span><span class="mono">${iface.mac || '—'}</span></div>
                    <div class="webui-info-row"><span>Gateway</span><span>${this.node.gateway || 'Not set'}</span></div>
                    <div class="webui-info-row"><span>Packets Sent</span><span>${this.node.packetsSent}</span></div>
                    <div class="webui-info-row"><span>Packets Received</span><span>${this.node.packetsReceived}</span></div>
                </div>
                <h3 class="app-section-title" style="margin-top:20px">ARP Table</h3>
                <table class="app-table"><thead><tr><th>IP</th><th>MAC</th><th>Type</th></tr></thead><tbody>
                ${this.node.arpTable.size > 0 ? Array.from(this.node.arpTable.entries()).map(([ip, e]) =>
                    `<tr><td>${ip}</td><td class="mono">${e.mac}</td><td>${e.type}</td></tr>`
                ).join('') : '<tr><td colspan="3">No entries</td></tr>'}
                </tbody></table>
                <h3 class="app-section-title" style="margin-top:20px">Routing Table</h3>
                <table class="app-table"><thead><tr><th>Destination</th><th>Gateway</th><th>Protocol</th></thead><tbody>
                ${this.node.routingTable.length > 0 ? this.node.routingTable.map(r =>
                    `<tr><td>${r.network}/${r.cidr}</td><td>${r.nextHop || 'direct'}</td><td>${r.protocol}</td></tr>`
                ).join('') : '<tr><td colspan="3">No routes</td></tr>'}
                </tbody></table>
            </div>
        `;
    }

    // ═══════════════════════════════════════════════
    // ═══════════════════════════════════════════════
    _openPacketGen() {
        const id = this._appId('pktgen');
        const content = this.wm.createWindow(id, 'Packet Generator', 'bi-send-fill', { width: 450, height: 350 });
        content.innerHTML = `
            <div class="app-padded">
                <h3 class="app-section-title">Packet Generator</h3>
                <div class="sim-form-group"><label>Destination IP</label><input class="sim-input" id="pkt-dst" placeholder="192.168.1.1"></div>
                <div class="sim-form-group"><label>Protocol</label>
                    <select class="sim-input" id="pkt-proto"><option>ICMP (Ping)</option><option>ARP Request</option></select>
                </div>
                <div class="sim-form-group"><label>Count</label><input class="sim-input" id="pkt-count" type="number" value="4" min="1" max="100"></div>
                <button class="app-btn app-btn-primary" id="btn-send-pkt" style="margin-top:12px"><i class="bi bi-send-fill"></i> Send</button>
                <pre id="pkt-result" class="app-result-box" style="margin-top:12px"></pre>
            </div>
        `;
        content.querySelector('#btn-send-pkt').addEventListener('click', () => {
            const dst = content.querySelector('#pkt-dst').value;
            const result = this.engine.ping(this.node.id, dst);
            content.querySelector('#pkt-result').textContent = result.ok
                ? `✓ Ping successful: ${result.ms}ms, TTL=${result.ttl}, ${result.path.length} hops`
                : `✗ Failed: ${result.reason}`;
        });
    }

    // ═══════════════════════════════════════════════
    // ═══════════════════════════════════════════════
    _openNetMonitor() {
        const id = this._appId('netmon');
        const content = this.wm.createWindow(id, 'Network Monitor', 'bi-activity', { width: 500, height: 350 });

        const render = () => {
            const edges = this.engine.graph.getConnectedEdges(this.node.id);
            content.innerHTML = `
                <div class="app-padded">
                    <h3 class="app-section-title">Connected Links</h3>
                    <button class="app-btn app-btn-secondary app-btn-sm" id="btn-refresh-mon" style="margin-bottom:12px"><i class="bi bi-arrow-clockwise"></i> Refresh</button>
                    <table class="app-table"><thead><tr><th>Local Port</th><th>Remote Device</th><th>Remote Port</th><th>Status</th><th>Cable</th></tr></thead><tbody>
                    ${edges.map(e => {
                        const isSource = e.source === this.node.id;
                        const remoteId = isSource ? e.target : e.source;
                        const remote = this.engine.graph.getNode(remoteId);
                        return `<tr><td>${isSource ? e.sourcePort : e.targetPort}</td><td>${remote?.name || '?'}</td><td>${isSource ? e.targetPort : e.sourcePort}</td><td><span class="${e.status === 'up' ? 'status-up' : 'status-down'}">${e.status}</span></td><td>${e.cableType || 'copper'}</td></tr>`;
                    }).join('') || '<tr><td colspan="5">No connections</td></tr>'}
                    </tbody></table>
                    <h3 class="app-section-title" style="margin-top:16px">Statistics</h3>
                    <div class="webui-info-list">
                        <div class="webui-info-row"><span>Packets Sent</span><span>${this.node.packetsSent}</span></div>
                        <div class="webui-info-row"><span>Packets Received</span><span>${this.node.packetsReceived}</span></div>
                        <div class="webui-info-row"><span>Packets Dropped</span><span>${this.node.packetsDropped}</span></div>
                    </div>
                </div>
            `;
            content.querySelector('#btn-refresh-mon')?.addEventListener('click', render);
        };
        render();
    }

    // ═══════════════════════════════════════════════
    // ═══════════════════════════════════════════════
    _openServicesManager() {
        const id = this._appId('services');
        const content = this.wm.createWindow(id, 'Services', 'bi-sliders', { width: 640, height: 440 });
        if (!this.node.services) this.node.services = {};
        if (!this.node._services) this.node._services = {};

        const render = () => {
            const services = this._serviceCatalog();
            content.innerHTML = `
                <div class="app-padded">
                    <div class="app-header-row">
                        <h3 class="app-section-title">Services</h3>
                        <span class="app-badge">${services.length} services</span>
                    </div>
                    <table class="app-table">
                        <thead><tr><th>Name</th><th>Description</th><th>Status</th><th>Action</th></tr></thead>
                        <tbody>
                        ${services.map(service => {
                            const running = this._getDesktopServiceState(service);
                            return `
                                <tr>
                                    <td>${service.name}</td>
                                    <td>${service.description}</td>
                                    <td><span class="${running ? 'status-up' : 'status-down'}">${running ? 'Running' : 'Stopped'}</span></td>
                                    <td>
                                        <button class="app-btn ${running ? 'app-btn-danger' : 'app-btn-primary'} app-btn-sm" data-service="${service.id}" data-state="${running ? 'stop' : 'start'}">
                                            <i class="bi ${running ? 'bi-stop-fill' : 'bi-play-fill'}"></i> ${running ? 'Stop' : 'Start'}
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                        </tbody>
                    </table>
                    <div id="services-status" class="app-status-msg info">Service changes apply immediately to simulator connectivity and troubleshooting tools.</div>
                </div>
            `;

            content.querySelectorAll('[data-service]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const service = services.find(item => item.id === btn.dataset.service);
                    if (!service) return;
                    this._setDesktopServiceState(service, btn.dataset.state === 'start');
                    this._appendServiceEvent(service, btn.dataset.state === 'start');
                    this.engine.graph.notify();
                    render();
                });
            });
        };
        render();
    }

    _serviceCatalog() {
        const isLinux = this.node.os === 'linux';
        const services = isLinux
            ? [
                { id: 'networking', name: 'networking', description: 'Interface and route initialization' },
                { id: 'ssh', name: 'ssh', description: 'Remote shell access' },
                { id: 'ufw', name: 'ufw', description: 'Host firewall policy' },
                { id: 'http', name: 'nginx/apache2', description: 'HTTP web service' },
            ]
            : [
                { id: 'dhcpClientService', name: 'DHCP Client', description: 'Obtains automatic IPv4 configuration' },
                { id: 'dnsClient', name: 'DNS Client', description: 'Resolves hostnames for local apps' },
                { id: 'firewall', name: 'Windows Defender Firewall', description: 'Applies host firewall rules' },
                { id: 'http', name: 'World Wide Web Publishing', description: 'HTTP web service' },
            ];

        if (this.node.type === 'server') {
            services.push(
                { id: 'dhcpServer', name: 'DHCP Server', description: 'Offers IPv4 leases to clients' },
                { id: 'dnsServer', name: 'DNS Server', description: 'Answers local zone lookups' },
            );
        }

        return services;
    }

    _getDesktopServiceState(service) {
        switch (service.id) {
            case 'networking':
                return Object.values(this.node.interfaces || {}).some(iface => iface.state === 'up');
            case 'ssh':
                return (this.node._services?.ssh || this.node._services?.sshd || 'active') === 'active';
            case 'ufw':
            case 'firewall':
                return !!this.node.firewallEnabled;
            case 'http':
                return !!this.node.httpEnabled;
            case 'dhcpServer':
                return this.node.services?.dhcpServer === undefined ? (this.node.dhcpPools || []).length > 0 : this.node.services.dhcpServer !== false;
            case 'dnsServer':
                return this.node.services?.dnsServer === undefined ? (this.node.dnsRecords || []).length > 0 : this.node.services.dnsServer !== false;
            case 'dhcpClientService':
                return this.node.services?.dhcpClientService !== false;
            case 'dnsClient':
                return this.node.services?.dnsClient !== false;
            default:
                return true;
        }
    }

    _setDesktopServiceState(service, running) {
        if (!this.node.services) this.node.services = {};
        if (!this.node._services) this.node._services = {};
        switch (service.id) {
            case 'networking':
                Object.values(this.node.interfaces || {}).forEach(iface => { iface.state = running ? 'up' : 'down'; });
                this.node._services.networking = running ? 'active' : 'inactive';
                break;
            case 'ssh':
                this.node._services.ssh = running ? 'active' : 'inactive';
                this.node._services.sshd = running ? 'active' : 'inactive';
                break;
            case 'ufw':
            case 'firewall':
                this.node.firewallEnabled = running;
                break;
            case 'http':
                this.node.httpEnabled = running;
                this.node._services.w3svc = running ? 'active' : 'inactive';
                this.node._services.nginx = running ? 'active' : 'inactive';
                this.node._services.apache2 = running ? 'active' : 'inactive';
                this.node._services.httpd = running ? 'active' : 'inactive';
                break;
            case 'dhcpServer':
                this.node.services.dhcpServer = running;
                break;
            case 'dnsServer':
                this.node.services.dnsServer = running;
                break;
            case 'dhcpClientService':
                this.node.services.dhcpClientService = running;
                break;
            case 'dnsClient':
                this.node.services.dnsClient = running;
                break;
        }
    }

    _appendServiceEvent(service, running) {
        const name = service.name || service.id;
        if (this.node.os === 'linux') {
            if (!this.node.syslogMessages) this.node.syslogMessages = [];
            this.node.syslogMessages.push(`${new Date().toISOString()} ${this.node.name} systemd[1]: ${running ? 'Started' : 'Stopped'} ${name}.`);
            return;
        }

        if (!this.node.eventLogs) this.node.eventLogs = [];
        this.node.eventLogs.push({
            time: new Date().toLocaleString(),
            level: 'Information',
            source: 'Service Control Manager',
            id: running ? '7036' : '7035',
            message: `The ${name} service entered the ${running ? 'running' : 'stopped'} state.`
        });
    }

    // ═══════════════════════════════════════════════
    // ═══════════════════════════════════════════════
    _openLogViewer() {
        const id = this._appId('log');
        const isWindows = this.node.os !== 'linux';
        const content = this.wm.createWindow(id, isWindows ? 'Event Viewer' : 'Log Viewer', 'bi-journal-text', { width: 720, height: 470 });

        const render = (filter = 'all') => {
            const events = isWindows ? this._windowsEventRows() : this._linuxLogRows();
            const filtered = filter === 'all' ? events : events.filter(event => event.level === filter || event.source === filter);
            const levels = Array.from(new Set(events.map(event => event.level))).filter(Boolean);
            const sources = Array.from(new Set(events.map(event => event.source))).filter(Boolean);

            content.innerHTML = `
                <div class="app-padded">
                    <div class="app-header-row">
                        <h3 class="app-section-title">${isWindows ? 'Event Viewer' : 'System Logs'}</h3>
                        <span class="app-badge">${filtered.length} events</span>
                    </div>
                    <div class="app-btn-row" style="margin-bottom:12px; flex-wrap:wrap">
                        <button class="app-btn app-btn-secondary app-btn-sm log-filter ${filter === 'all' ? 'active' : ''}" data-filter="all">All</button>
                        ${levels.map(level => `<button class="app-btn app-btn-secondary app-btn-sm log-filter ${filter === level ? 'active' : ''}" data-filter="${this._esc(level)}">${this._esc(level)}</button>`).join('')}
                        ${sources.map(source => `<button class="app-btn app-btn-secondary app-btn-sm log-filter ${filter === source ? 'active' : ''}" data-filter="${this._esc(source)}">${this._esc(source)}</button>`).join('')}
                    </div>
                    <table class="app-table app-table-compact">
                        <thead><tr><th>Time</th><th>Level</th><th>Source</th><th>Event ID</th><th>Message</th></tr></thead>
                        <tbody>
                            ${filtered.map(event => `
                                <tr class="log-row-${event.level.toLowerCase()}">
                                    <td class="mono">${this._esc(event.time)}</td>
                                    <td><span class="log-level log-level-${event.level.toLowerCase()}">${this._esc(event.level)}</span></td>
                                    <td>${this._esc(event.source)}</td>
                                    <td class="mono">${this._esc(event.id || '-')}</td>
                                    <td>${this._esc(event.message)}</td>
                                </tr>
                            `).join('') || '<tr><td colspan="5">No log entries.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            `;

            content.querySelectorAll('.log-filter').forEach(btn => {
                btn.addEventListener('click', () => render(btn.dataset.filter));
            });
        };

        render();
    }

    _windowsEventRows() {
        const seeded = (this.node.eventLogs || []).map(event => ({
            time: event.time || new Date().toLocaleString(),
            level: event.level || 'Information',
            source: event.source || 'System',
            id: event.id || event.eventId || '',
            message: event.message || ''
        }));

        const generated = [
            { level: this.node.services?.dhcpClientService === false ? 'Error' : 'Information', source: 'Dhcp-Client', id: '1001', message: this.node.services?.dhcpClientService === false ? 'The DHCP Client service is stopped. Address renewal requests will not be sent.' : 'The DHCP Client service is running.' },
            { level: this.node.services?.dnsClient === false ? 'Warning' : 'Information', source: 'DNS Client Events', id: '1014', message: this.node.services?.dnsClient === false ? 'Name resolution is unavailable because the DNS Client service is stopped.' : 'DNS Client service is running.' },
            { level: this.node.firewallEnabled ? 'Information' : 'Warning', source: 'Windows Firewall', id: '2004', message: this.node.firewallEnabled ? 'Windows Defender Firewall is enabled.' : 'Windows Defender Firewall is disabled.' },
        ].map(event => ({ time: 'Now', ...event }));

        return [...seeded, ...generated];
    }

    _linuxLogRows() {
        const seeded = (this.node.eventLogs || []).map(event => ({
            time: event.time || new Date().toLocaleString(),
            level: event.level || 'info',
            source: event.source || 'systemd',
            id: event.id || '',
            message: event.message || ''
        }));
        const syslog = (this.node.syslogMessages || []).map(message => {
            const level = /fail|error|denied|timeout/i.test(message) ? 'error' : /warn/i.test(message) ? 'warning' : 'info';
            return { time: 'syslog', level, source: this._extractLogSource(message), id: '', message };
        });
        const services = Object.entries(this.node._services || {}).map(([name, state]) => ({
            time: 'Now',
            level: state === 'active' ? 'info' : 'warning',
            source: 'systemd',
            id: '',
            message: `${name}.service is ${state || 'unknown'}`
        }));
        return [...seeded, ...syslog, ...services];
    }

    _extractLogSource(message) {
        const match = String(message).match(/\s([a-zA-Z0-9_.-]+)(?:\[\d+\])?:/);
        return match ? match[1] : 'syslog';
    }

    // ═══════════════════════════════════════════════
    // ═══════════════════════════════════════════════
    _openDHCPServer() {
        const id = this._appId('dhcpsrv');
        const content = this.wm.createWindow(id, 'DHCP Server', 'bi-hdd-rack-fill', { width: 720, height: 520 });
        if (!this.node.services) this.node.services = {};
        if (this.node.services.dhcpServer === undefined) this.node.services.dhcpServer = (this.node.dhcpPools || []).length > 0;
        if (!this.node.dhcpPools) this.node.dhcpPools = [];

        const renderPools = () => {
            const serviceActive = this.node.services.dhcpServer !== false;
            const totalLeases = this.node.dhcpPools.reduce((sum, pool) => sum + this._normalizeLeaseMap(pool).size, 0);
            content.innerHTML = `
                <div class="app-padded">
                    <div class="app-header-row">
                        <h3 class="app-section-title">DHCP Server</h3>
                        <span class="app-badge ${serviceActive ? 'badge-success' : 'badge-danger'}">${serviceActive ? 'Running' : 'Stopped'}</span>
                    </div>
                    <div class="app-btn-row" style="margin-bottom:12px">
                        <button class="app-btn ${serviceActive ? 'app-btn-danger' : 'app-btn-primary'} app-btn-sm" id="btn-toggle-dhcp">
                            <i class="bi ${serviceActive ? 'bi-stop-fill' : 'bi-play-fill'}"></i> ${serviceActive ? 'Stop Service' : 'Start Service'}
                        </button>
                        <button class="app-btn app-btn-primary app-btn-sm" id="btn-add-pool"><i class="bi bi-plus-lg"></i> Add Pool</button>
                        <button class="app-btn app-btn-secondary app-btn-sm" id="btn-clear-leases"><i class="bi bi-x-circle"></i> Clear Leases</button>
                        <span class="app-badge">${this.node.dhcpPools.length} pools</span>
                        <span class="app-badge">${totalLeases} leases</span>
                    </div>
                    ${this.node.dhcpPools.map((pool, idx) => {
                        const validation = this._validateDhcpPool(pool);
                        const leaseRows = Array.from(this._normalizeLeaseMap(pool).entries());
                        return `
                        <div class="dhcp-pool-card">
                            <div class="pool-header">
                                <span>${this._esc(pool.name || `Pool${idx + 1}`)}</span>
                                <span class="app-badge ${validation.ok ? 'badge-success' : 'badge-warning'}">${validation.ok ? 'Scope valid' : 'Needs attention'}</span>
                                <button class="app-btn app-btn-sm app-btn-danger" data-del="${idx}"><i class="bi bi-trash"></i></button>
                            </div>
                            <div class="app-form-grid">
                                <div class="sim-form-group"><label>Pool Name</label><input class="sim-input pool-field" data-idx="${idx}" data-field="name" value="${this._esc(pool.name || '')}"></div>
                                <div class="sim-form-group"><label>Network</label><input class="sim-input pool-field" data-idx="${idx}" data-field="network" value="${this._esc(pool.network || '')}"></div>
                                <div class="sim-form-group"><label>Mask</label><input class="sim-input pool-field" data-idx="${idx}" data-field="mask" value="${this._esc(pool.mask || '')}"></div>
                                <div class="sim-form-group"><label>Default Router</label><input class="sim-input pool-field" data-idx="${idx}" data-field="defaultRouter" value="${this._esc(pool.defaultRouter || '')}"></div>
                                <div class="sim-form-group"><label>DNS Server</label><input class="sim-input pool-field" data-idx="${idx}" data-field="dns" value="${this._esc(pool.dns || '')}"></div>
                            </div>
                            <div class="pool-leases">${validation.messages.join(' | ')}</div>
                            <table class="app-table app-table-compact" style="margin-top:8px">
                                <thead><tr><th>Lease IP</th><th>Hostname</th><th>MAC</th><th>Age</th><th></th></tr></thead>
                                <tbody>
                                ${leaseRows.map(([ip, lease]) => `
                                    <tr>
                                        <td class="mono">${ip}</td>
                                        <td>${this._esc(lease.hostname || 'unknown')}</td>
                                        <td class="mono">${lease.mac || '-'}</td>
                                        <td>${this._leaseAge(lease.timestamp)}</td>
                                        <td><button class="app-btn app-btn-sm app-btn-secondary" data-release="${idx}:${ip}">Release</button></td>
                                    </tr>
                                `).join('') || '<tr><td colspan="5">No active leases.</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    `; }).join('') || '<p>No DHCP pools configured.</p>'}
                    <div id="dhcp-manager-status" class="app-status-msg ${serviceActive ? 'info' : 'error'}">
                        ${serviceActive ? 'DHCP service will answer requests reachable on the correct VLAN/path.' : 'DHCP service is stopped; clients will time out on renew.'}
                    </div>
                </div>
            `;

            content.querySelector('#btn-toggle-dhcp')?.addEventListener('click', () => {
                this.node.services.dhcpServer = !serviceActive;
                this.engine.graph.notify();
                renderPools();
            });

            content.querySelector('#btn-add-pool')?.addEventListener('click', () => {
                this.node.dhcpPools.push({ name: `Pool${this.node.dhcpPools.length + 1}`, network: '', mask: '255.255.255.0', defaultRouter: '', dns: '', leases: new Map() });
                this.node.services.dhcpServer = true;
                renderPools();
            });

            content.querySelector('#btn-clear-leases')?.addEventListener('click', () => {
                this.node.dhcpPools.forEach(pool => this._normalizeLeaseMap(pool).clear());
                this.engine.graph.notify();
                renderPools();
            });

            content.querySelectorAll('[data-del]').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.node.dhcpPools.splice(parseInt(btn.dataset.del), 1);
                    renderPools();
                });
            });

            content.querySelectorAll('[data-release]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const [poolIdx, ip] = btn.dataset.release.split(':');
                    const pool = this.node.dhcpPools[parseInt(poolIdx, 10)];
                    if (pool) this._normalizeLeaseMap(pool).delete(ip);
                    this.engine.graph.notify();
                    renderPools();
                });
            });

            content.querySelectorAll('.pool-field').forEach(input => {
                input.addEventListener('change', () => {
                    const pool = this.node.dhcpPools[parseInt(input.dataset.idx)];
                    if (pool) pool[input.dataset.field] = input.value;
                    this.engine.graph.notify();
                });
            });
        };
        renderPools();
    }

    // ═══════════════════════════════════════════════
    // ═══════════════════════════════════════════════
    _openDNSServer() {
        const id = this._appId('dnssrv');
        const content = this.wm.createWindow(id, 'DNS Server', 'bi-server', { width: 680, height: 500 });
        if (!this.node.services) this.node.services = {};
        if (this.node.services.dnsServer === undefined) this.node.services.dnsServer = (this.node.dnsRecords || []).length > 0;
        if (!this.node.dnsRecords) this.node.dnsRecords = [];

        const renderRecords = () => {
            const serviceActive = this.node.services.dnsServer !== false;
            const duplicates = this._getDuplicateDnsRecordKeys();
            content.innerHTML = `
                <div class="app-padded">
                    <div class="app-header-row">
                        <h3 class="app-section-title">DNS Server</h3>
                        <span class="app-badge ${serviceActive ? 'badge-success' : 'badge-danger'}">${serviceActive ? 'Running' : 'Stopped'}</span>
                    </div>
                    <div class="app-btn-row" style="margin-bottom:12px">
                        <button class="app-btn ${serviceActive ? 'app-btn-danger' : 'app-btn-primary'} app-btn-sm" id="btn-toggle-dns">
                            <i class="bi ${serviceActive ? 'bi-stop-fill' : 'bi-play-fill'}"></i> ${serviceActive ? 'Stop Service' : 'Start Service'}
                        </button>
                        <button class="app-btn app-btn-primary app-btn-sm" id="btn-add-record"><i class="bi bi-plus-lg"></i> Add Record</button>
                        <span class="app-badge">${this.node.dnsRecords.length} records</span>
                    </div>
                    <div class="app-form-grid" style="margin-bottom:12px">
                        <div class="sim-form-group"><label>Test Name</label><input class="sim-input" id="dns-test-name" placeholder="portal.local"></div>
                        <div class="sim-form-group"><label>Result</label><div id="dns-test-result" class="app-inline-result">Not queried</div></div>
                    </div>
                    <button class="app-btn app-btn-secondary app-btn-sm" id="btn-test-dns" style="margin-bottom:12px"><i class="bi bi-search"></i> Query Local Zone</button>
                    <table class="app-table"><thead><tr><th>Name</th><th>Type</th><th>Value</th><th>Status</th><th></th></tr></thead><tbody>
                    ${this.node.dnsRecords.map((rec, idx) => {
                        const key = `${(rec.name || '').toLowerCase()}|${rec.type || 'A'}`;
                        const validation = this._validateDnsRecord(rec, duplicates.has(key));
                        return `
                        <tr class="${validation.ok ? '' : 'app-row-warning'}">
                            <td><input class="sim-input dns-field" data-idx="${idx}" data-field="name" value="${this._esc(rec.name || '')}" style="width:140px"></td>
                            <td><select class="sim-input dns-field" data-idx="${idx}" data-field="type" style="width:80px"><option ${rec.type === 'A' ? 'selected' : ''}>A</option><option ${rec.type === 'CNAME' ? 'selected' : ''}>CNAME</option><option ${rec.type === 'MX' ? 'selected' : ''}>MX</option></select></td>
                            <td><input class="sim-input dns-field" data-idx="${idx}" data-field="value" value="${this._esc(rec.value || '')}" style="width:140px"></td>
                            <td>${validation.message}</td>
                            <td><button class="app-btn app-btn-sm app-btn-danger" data-del="${idx}"><i class="bi bi-trash"></i></button></td>
                        </tr>
                    `; }).join('') || '<tr><td colspan="5">No records. Click Add to create one.</td></tr>'}
                    </tbody></table>
                    <div class="app-status-msg ${serviceActive ? 'info' : 'error'}">
                        ${serviceActive ? 'DNS service answers A-record lookups from reachable clients configured to use this server.' : 'DNS service is stopped; configured clients will fail name resolution.'}
                    </div>
                </div>
            `;
            content.querySelector('#btn-toggle-dns')?.addEventListener('click', () => {
                this.node.services.dnsServer = !serviceActive;
                this.engine.graph.notify();
                renderRecords();
            });
            content.querySelector('#btn-add-record')?.addEventListener('click', () => {
                this.node.dnsRecords.push({ name: '', type: 'A', value: '' });
                this.node.services.dnsServer = true;
                renderRecords();
            });
            content.querySelector('#btn-test-dns')?.addEventListener('click', () => {
                const name = content.querySelector('#dns-test-name').value.trim();
                const result = content.querySelector('#dns-test-result');
                if (!serviceActive) {
                    result.textContent = 'SERVFAIL: DNS service stopped';
                    result.className = 'app-inline-result error';
                    return;
                }
                const match = this.node.dnsRecords.find(record => record.type === 'A' && (record.name || '').toLowerCase() === name.toLowerCase());
                result.textContent = match ? `${match.name} -> ${match.value}` : `NXDOMAIN: ${name || '(blank)'}`;
                result.className = `app-inline-result ${match ? 'success' : 'error'}`;
            });
            content.querySelectorAll('[data-del]').forEach(btn => {
                btn.addEventListener('click', () => { this.node.dnsRecords.splice(parseInt(btn.dataset.del), 1); renderRecords(); });
            });
            content.querySelectorAll('.dns-field').forEach(input => {
                input.addEventListener('change', () => {
                    const rec = this.node.dnsRecords[parseInt(input.dataset.idx)];
                    if (rec) rec[input.dataset.field] = input.value;
                    this.engine.graph.notify();
                });
            });
        };
        renderRecords();
    }

    _normalizeLeaseMap(pool) {
        if (!pool.leases) pool.leases = new Map();
        if (!(pool.leases instanceof Map)) pool.leases = new Map(Object.entries(pool.leases));
        return pool.leases;
    }

    _validateDhcpPool(pool) {
        const messages = [];
        const cidr = maskToCidr(pool.mask || '24');
        if (!pool.name) messages.push('missing name');
        if (!isValidIP(pool.network)) messages.push('invalid network');
        if (!isValidIP(pool.defaultRouter)) messages.push('invalid default router');
        if (pool.dns && !isValidIP(pool.dns)) messages.push('invalid DNS option');
        if (isValidIP(pool.network) && isValidIP(pool.defaultRouter) && getNetAddr(pool.defaultRouter, cidr) !== getNetAddr(pool.network, cidr)) {
            messages.push('router outside scope');
        }
        return {
            ok: messages.length === 0,
            messages: messages.length ? messages : [`${pool.network || '0.0.0.0'}/${cidr}`, `${this._normalizeLeaseMap(pool).size} active lease(s)`]
        };
    }

    _validateDnsRecord(record, duplicate) {
        if (!record.name) return { ok: false, message: 'Missing name' };
        if (!record.value) return { ok: false, message: 'Missing value' };
        if (duplicate) return { ok: false, message: 'Duplicate name/type' };
        if (record.type === 'A' && !isValidIP(record.value)) return { ok: false, message: 'A value must be IPv4' };
        return { ok: true, message: 'OK' };
    }

    _getDuplicateDnsRecordKeys() {
        const counts = new Map();
        for (const record of this.node.dnsRecords || []) {
            const key = `${(record.name || '').toLowerCase()}|${record.type || 'A'}`;
            counts.set(key, (counts.get(key) || 0) + 1);
        }
        return new Set(Array.from(counts.entries()).filter(([, count]) => count > 1).map(([key]) => key));
    }

    _leaseAge(timestamp) {
        if (!timestamp) return '-';
        const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m`;
        return `${Math.floor(minutes / 60)}h`;
    }

    _esc(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ═══════════════════════════════════════════════
    // ═══════════════════════════════════════════════
    _openAppStore() {
        const id = this._appId('appstore');
        const isLinux = this.node.os === 'linux';
        const content = this.wm.createWindow(id, isLinux ? 'Software Center' : 'App Store', 'bi-bag-fill', { width: 640, height: 500 });

        const STORE_APPS = [
            { id: 'python3', name: 'Python 3', icon: 'bi-filetype-py', category: 'Development', desc: 'Interactive high-level programming language', size: '5.1 MB' },
            { id: 'nodejs', name: 'Node.js', icon: 'bi-filetype-js', category: 'Development', desc: 'Event-based server-side JavaScript engine', size: '12.3 MB' },
            { id: 'git', name: 'Git', icon: 'bi-git', category: 'Development', desc: 'Distributed version control system', size: '3.8 MB' },
            { id: 'vim', name: 'Vim', icon: 'bi-braces', category: 'Development', desc: 'Advanced text editor', size: '1.5 MB' },
            { id: 'nginx', name: 'Nginx', icon: 'bi-hdd-network-fill', category: 'Networking', desc: 'High-performance web server', size: '2.0 MB' },
            { id: 'apache2', name: 'Apache2', icon: 'bi-hdd-network-fill', category: 'Networking', desc: 'Apache HTTP web server', size: '3.5 MB' },
            { id: 'nmap', name: 'Nmap', icon: 'bi-radar', category: 'Networking', desc: 'Network exploration and security scanner', size: '4.3 MB' },
            { id: 'wireshark', name: 'Wireshark CLI', icon: 'bi-reception-4', category: 'Networking', desc: 'Network traffic analyzer (CLI tools)', size: '6.1 MB' },
            { id: 'snmpd', name: 'SNMP Daemon', icon: 'bi-broadcast-pin', category: 'Networking', desc: 'SNMP agent for monitoring', size: '768 KB' },
            { id: 'docker.io', name: 'Docker', icon: 'bi-box-seam-fill', category: 'System', desc: 'Linux container runtime', size: '48.1 MB' },
            { id: 'htop', name: 'htop', icon: 'bi-speedometer2', category: 'System', desc: 'Interactive process viewer', size: '256 KB' },
            { id: 'tmux', name: 'tmux', icon: 'bi-layout-split', category: 'System', desc: 'Terminal multiplexer', size: '512 KB' },
            { id: 'fail2ban', name: 'Fail2Ban', icon: 'bi-shield-lock-fill', category: 'Security', desc: 'Intrusion prevention framework', size: '1.3 MB' },
            { id: 'ufw', name: 'UFW', icon: 'bi-bricks', category: 'Security', desc: 'Uncomplicated Firewall', size: '384 KB' },
            { id: 'mysql-server', name: 'MySQL', icon: 'bi-database-fill', category: 'Databases', desc: 'MySQL relational database server', size: '24.6 MB' },
            { id: 'postgresql', name: 'PostgreSQL', icon: 'bi-database-fill-gear', category: 'Databases', desc: 'Object-relational SQL database', size: '18.4 MB' },
        ];

        const hasConnectivity = () => {
            const iface = Object.values(this.node.interfaces)[0];
            return iface && iface.ip && iface.state === 'up' && this.node.gateway;
        };

        // Initialize installed packages on node if not present
        if (!this.node._installedPackages) {
            this.node._installedPackages = new Set(['bash', 'coreutils', 'net-tools', 'iproute2', 'openssh-server', 'curl', 'wget', 'iputils-ping', 'dnsutils', 'traceroute', 'nano', 'vim-tiny']);
        }

        const renderStore = (filter = 'All') => {
            const connected = hasConnectivity();

            const categories = ['All', ...new Set(STORE_APPS.map(a => a.category))];
            const filtered = filter === 'All' ? STORE_APPS : STORE_APPS.filter(a => a.category === filter);

            content.innerHTML = `
                <div style="display:flex;flex-direction:column;height:100%">
                    <div style="padding:12px 16px;background:var(--sim-bg-card);border-bottom:1px solid var(--sim-border);display:flex;align-items:center;justify-content:space-between;gap:12px">
                        <div style="display:flex;align-items:center;gap:8px">
                            <i class="bi bi-bag-fill" style="font-size:18px;color:var(--sim-accent)"></i>
                            <strong style="font-size:14px">${isLinux ? 'Software Center' : 'Store'}</strong>
                        </div>
                        <div style="display:flex;align-items:center;gap:6px">
                            <span style="width:8px;height:8px;border-radius:50%;background:${connected ? '#4caf50' : '#ef5350'};box-shadow:0 0 6px ${connected ? '#4caf5088' : '#ef535088'}"></span>
                            <span style="font-size:11px;color:var(--sim-text-secondary)">${connected ? 'Connected' : 'No Internet'}</span>
                        </div>
                    </div>
                    <div style="padding:8px 16px;display:flex;gap:6px;flex-wrap:wrap;border-bottom:1px solid var(--sim-border)">
                        ${categories.map(c => `<button class="store-cat-btn ${c === filter ? 'active' : ''}" data-cat="${c}" style="padding:4px 12px;border-radius:12px;border:1px solid var(--sim-border);background:${c === filter ? 'var(--sim-accent)' : 'var(--sim-bg-input)'};color:${c === filter ? '#fff' : 'var(--sim-text-secondary)'};font-size:11px;cursor:pointer">${c}</button>`).join('')}
                    </div>
                    ${!connected ? `
                        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;color:var(--sim-text-muted)">
                            <i class="bi bi-wifi-off" style="font-size:48px;margin-bottom:16px;opacity:0.4"></i>
                            <h3 style="margin:0 0 8px;font-weight:600">No Internet Connection</h3>
                            <p style="margin:0;font-size:13px;text-align:center;max-width:300px">This device needs a valid IP address and default gateway to download applications. Configure your network settings first.</p>
                        </div>
                    ` : `
                        <div style="flex:1;overflow-y:auto;padding:12px 16px">
                            <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));gap:10px">
                                ${filtered.map(app => {
                                    const installed = this.node._installedPackages.has(app.id);
                                    return `
                                        <div class="store-app-card" style="background:var(--sim-bg-card);border:1px solid var(--sim-border);border-radius:8px;padding:12px;display:flex;gap:12px;align-items:flex-start;transition:border-color 0.2s" onmouseover="this.style.borderColor='var(--sim-accent)'" onmouseout="this.style.borderColor='var(--sim-border)'">
                                            <div style="width:40px;height:40px;border-radius:10px;background:${installed ? 'linear-gradient(135deg,#4caf50,#2e7d32)' : 'linear-gradient(135deg,var(--sim-accent),#1565c0)'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
                                                <i class="bi ${app.icon}" style="font-size:18px;color:#fff"></i>
                                            </div>
                                            <div style="flex:1;min-width:0">
                                                <div style="font-weight:600;font-size:13px;color:var(--sim-text)">${app.name}</div>
                                                <div style="font-size:11px;color:var(--sim-text-secondary);margin:2px 0 6px">${app.desc}</div>
                                                <div style="display:flex;justify-content:space-between;align-items:center">
                                                    <span style="font-size:10px;color:var(--sim-text-muted)">${app.size}</span>
                                                    <button class="store-install-btn" data-app="${app.id}" style="padding:3px 14px;border-radius:6px;border:none;font-size:11px;font-weight:600;cursor:pointer;background:${installed ? '#ef5350' : 'var(--sim-accent)'};color:#fff">
                                                        ${installed ? 'Remove' : 'Install'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `}
                </div>
            `;

            // Bind category buttons
            content.querySelectorAll('.store-cat-btn').forEach(btn => {
                btn.addEventListener('click', () => renderStore(btn.dataset.cat));
            });

            // Bind install/remove buttons
            content.querySelectorAll('.store-install-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const appId = btn.dataset.app;
                    if (this.node._installedPackages.has(appId)) {
                        this.node._installedPackages.delete(appId);
                        if (this.engine.handlePackageChange) this.engine.handlePackageChange(this.node.id, appId, false);
                    } else {
                        this.node._installedPackages.add(appId);
                        if (this.engine.handlePackageChange) this.engine.handlePackageChange(this.node.id, appId, true);
                    }
                    renderStore(filter);
                });
            });
        };

        renderStore();
    }
}

function getPortDisplayShort(name) {
    return name.replace('GigabitEthernet', 'Gi').replace('FastEthernet', 'Fa').replace('TenGigabitEthernet', 'Te').replace('Serial', 'Se').replace('Ethernet', 'Et');
}

function cidrToWildcard(cidr) {
    const mask = (0xffffffff << (32 - cidr)) >>> 0;
    const wildcard = (~mask) >>> 0;
    return [(wildcard >>> 24) & 0xff, (wildcard >>> 16) & 0xff, (wildcard >>> 8) & 0xff, wildcard & 0xff].join('.');
}
