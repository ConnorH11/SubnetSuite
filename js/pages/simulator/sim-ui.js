// sim-ui.js

import { VENDORS, CABLE_TYPES, getPortDisplayName } from './sim-device-templates.js';

export class SimulatorUI {
    constructor(container, graph, engine) {
        this.container = container;
        this.graph = graph;
        this.engine = engine;

        this.viewport = container.querySelector('.sim-canvas-viewport');
        this.world = container.querySelector('#sim-world');
        this.nodesLayer = container.querySelector('#sim-nodes-layer');
        this.edgesLayer = container.querySelector('#sim-edges-layer');
        this.labelsLayer = container.querySelector('#sim-labels-layer');

        this.inspector = container.querySelector('#sim-inspector');
        this.inspectorBody = container.querySelector('.inspector-body');

        this.transform = { x: 0, y: 0, scale: 1 };
        this.tool = 'select';
        this.selectedNodeId = null;
        this.selectedCableType = 'copper_straight';

        this.isPanning = false;
        this.panStart = { x: 0, y: 0 };
        this.isDraggingNode = false;
        this.dragNodeId = null;
        this.connectingFromId = null;
        this.connectingFromPort = null;

        this.undoStack = [];
        this.redoStack = [];

        this.initEvents();
        this.graph.subscribe(() => this.render());
    }

    setTool(tool) {
        this.tool = tool;
        this.viewport.dataset.tool = tool;
        this.connectingFromId = null;

        document.querySelectorAll('.sim-tool-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.tool === tool);
        });

        if (tool === 'select') this.removePreviewEdge();
    }

    clientToWorld(clientX, clientY) {
        const rect = this.viewport.getBoundingClientRect();
        return {
            x: (clientX - rect.left - this.transform.x) / this.transform.scale,
            y: (clientY - rect.top - this.transform.y) / this.transform.scale,
        };
    }

    applyTransform() {
        this.world.style.transform = `translate(${this.transform.x}px, ${this.transform.y}px) scale(${this.transform.scale})`;
        this._updateMiniMap();
        this._updateStatusBar();
    }

    initEvents() {
        this.viewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.1 : 0.9;
            const newScale = Math.min(3, Math.max(0.15, this.transform.scale * factor));
            const rect = this.viewport.getBoundingClientRect();
            const cx = e.clientX - rect.left;
            const cy = e.clientY - rect.top;
            this.transform.x = cx - (cx - this.transform.x) * (newScale / this.transform.scale);
            this.transform.y = cy - (cy - this.transform.y) * (newScale / this.transform.scale);
            this.transform.scale = newScale;
            this.applyTransform();
        });

        this.viewport.addEventListener('mousedown', (e) => {
            if (e.button === 0 && !e.target.closest('.sim-node')) {
                this.isPanning = true;
                this.panStart = { x: e.clientX - this.transform.x, y: e.clientY - this.transform.y };
                if (this.selectedNodeId) this.selectNode(null);
                if (this.tool === 'connect') {
                    this.connectingFromId = null;
                    this.connectingFromPort = null;
                    this.removePreviewEdge();
                }
            }
        });

        this.viewport.addEventListener('dragover', (e) => e.preventDefault());
        this.viewport.addEventListener('drop', (e) => {
            e.preventDefault();
            const templateId = e.dataTransfer.getData('text/plain');
            if (templateId) {
                const pos = this.clientToWorld(e.clientX, e.clientY);
                this.graph.addNode(templateId, pos.x, pos.y);
                this.setTool('select');
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isPanning) {
                this.transform.x = e.clientX - this.panStart.x;
                this.transform.y = e.clientY - this.panStart.y;
                this.applyTransform();
            } else if (this.isDraggingNode && this.dragNodeId) {
                const pos = this.clientToWorld(e.clientX, e.clientY);
                this.graph.updateNode(this.dragNodeId, { x: pos.x, y: pos.y });
            } else if (this.tool === 'connect' && this.connectingFromId) {
                const pos = this.clientToWorld(e.clientX, e.clientY);
                this.updatePreviewEdge(pos);
            }
        });

        window.addEventListener('mouseup', () => {
            this.isPanning = false;
            this.isDraggingNode = false;
            this.dragNodeId = null;
        });

        window.addEventListener('keydown', (e) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (this.selectedNodeId) {
                    this.graph.removeNode(this.selectedNodeId);
                    this.selectNode(null);
                }
            }
            if (e.key === 'Escape') this.setTool('select');
            if (e.key === 'c' || e.key === 'C') this.setTool('connect');
            if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) this._undo();
        });

        this.viewport.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const nodeEl = e.target.closest('.sim-node');
            if (nodeEl) {
                this._showContextMenu(e.clientX, e.clientY, nodeEl.dataset.id);
            }
        });
    }

    // ─── Context Menu ──────────────────────────────

    _showContextMenu(x, y, nodeId) {
        document.getElementById('sim-context-menu')?.remove();
        const node = this.graph.getNode(nodeId);
        if (!node) return;

        const isDesktopDevice = node.type === 'pc' || (node.type === 'server' && node.os !== 'linux');
        const isCliDevice = ['router', 'switch', 'l3switch', 'firewall'].includes(node.type) || (node.type === 'server' && node.os === 'linux');

        const menu = document.createElement('div');
        menu.id = 'sim-context-menu';
        menu.className = 'sim-context-menu';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;

        let html = `<div class="ctx-header">${node.name} <span class="ctx-model">${node.model}</span></div>`;

        if (isDesktopDevice && node.powered) {
            html += `<div class="ctx-item" data-action="desktop"><i class="bi bi-window-desktop"></i> Open Desktop</div>`;
        }
        if (isCliDevice && node.powered) {
            html += `<div class="ctx-item" data-action="cli"><i class="bi bi-terminal"></i> Open CLI</div>`;
        }
        if (node.powered) {
            html += `<div class="ctx-separator"></div>`;
        }
        html += `<div class="ctx-item" data-action="power"><i class="bi bi-power"></i> ${node.powered ? 'Power Off' : 'Power On'}</div>`;
        html += `<div class="ctx-item" data-action="rename"><i class="bi bi-pencil"></i> Rename</div>`;
        html += `<div class="ctx-item ctx-danger" data-action="delete"><i class="bi bi-trash"></i> Delete</div>`;

        menu.innerHTML = html;
        document.body.appendChild(menu);

        menu.querySelectorAll('.ctx-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = item.dataset.action;
                menu.remove();

                switch (action) {
                    case 'desktop': this.engine.openDesktop(nodeId); break;
                    case 'cli': this.engine.openCLI(nodeId); break;
                    case 'power':
                        node.powered = !node.powered;
                        if (!node.powered) {
                            // shut all interfaces
                            for (const iface of Object.values(node.interfaces)) iface.state = 'down';
                        } else {
                            for (const iface of Object.values(node.interfaces)) iface.state = 'up';
                        }
                        this.graph.notify();
                        break;
                    case 'rename':
                        const newName = prompt('Enter new name:', node.name);
                        if (newName) { node.name = newName; node.hostname = newName; this.graph.notify(); }
                        break;
                    case 'delete':
                        this.graph.removeNode(nodeId);
                        this.selectNode(null);
                        break;
                }
            });
        });

        setTimeout(() => {
            const close = (e) => {
                if (!menu.contains(e.target)) { menu.remove(); window.removeEventListener('mousedown', close, true); }
            };
            window.addEventListener('mousedown', close, true);
        }, 0);
    }



    // ─── Node Rendering ────────────────────────────

    createNodeElement(node) {
        const vendor = VENDORS[node.vendor] || VENDORS.generic;
        const el = document.createElement('div');
        el.className = `sim-node ${node.id === this.selectedNodeId ? 'selected' : ''} ${!node.powered ? 'powered-off' : ''}`;
        el.dataset.id = node.id;
        el.style.left = `${node.x}px`;
        el.style.top = `${node.y}px`;

        const primaryIP = this.graph.getPrimaryIP(node.id);
        const statusColor = node.powered ? '#4caf50' : '#f44336';
        const health = this._nodeHealth(node);

        el.innerHTML = `
            <div class="sim-node-badge" style="background:${vendor.color}" title="${vendor.name} ${node.model}"></div>
            <div class="sim-node-status-led" style="background:${statusColor}"></div>
            <i class="bi ${node.icon}" style="color:${vendor.color}"></i>
            <div class="sim-node-label">${node.name}</div>
            ${primaryIP ? `<div class="sim-node-ip">${primaryIP}</div>` : ''}
            ${health ? `<div class="sim-node-alert ${health.level}" title="${health.message}"><i class="bi ${health.icon}"></i></div>` : ''}
            <div class="sim-port-hint"></div>
        `;

        el.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            if (e.button !== 0) return;

            if (this.tool === 'select') {
                this.selectNode(node.id);
                this.isDraggingNode = true;
                this.dragNodeId = node.id;
            } else if (this.tool === 'connect') {
                this.showPortPicker(e.clientX, e.clientY, node.id, (port) => {
                    if (!this.connectingFromId) {
                        this.connectingFromId = node.id;
                        this.connectingFromPort = port;
                    } else if (this.connectingFromId !== node.id) {
                        this.graph.addEdge(this.connectingFromId, this.connectingFromPort, node.id, port, this.selectedCableType);
                        this.connectingFromId = null;
                        this.connectingFromPort = null;
                        this.removePreviewEdge();
                    }
                });
            }
        });

        el.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            if (!node.powered) return; // Cannot access if powered off
            if (node.type === 'pc' || (node.type === 'server' && node.os !== 'linux')) {
                this.engine.openDesktop(node.id);
            } else if (['router', 'switch', 'l3switch', 'firewall'].includes(node.type) || (node.type === 'server' && node.os === 'linux')) {
                this.engine.openCLI(node.id);
            }
        });

        return el;
    }

    showPortPicker(x, y, nodeId, onSelect) {
        document.getElementById('sim-port-picker')?.remove();
        const available = this.graph.getAvailablePorts(nodeId);
        if (available.length === 0) {
            alert('No available ports on this device.');
            this.connectingFromId = null;
            this.connectingFromPort = null;
            this.removePreviewEdge();
            return;
        }

        const picker = document.createElement('div');
        picker.id = 'sim-port-picker';
        picker.className = 'sim-port-picker';
        picker.style.left = `${x}px`;
        picker.style.top = `${y}px`;

        picker.innerHTML = `<div class="port-picker-header">Select Port</div>` +
            available.map(p => `<div class="port-option" data-port="${p}"><span class="port-dot"></span>${getPortDisplayName(p)}</div>`).join('');

        document.body.appendChild(picker);

        picker.querySelectorAll('.port-option').forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                onSelect(opt.dataset.port);
                picker.remove();
            });
        });

        setTimeout(() => {
            const outsideClick = (e) => {
                if (picker.contains(e.target)) return;
                picker.remove();
                window.removeEventListener('mousedown', outsideClick, true);
            };
            window.addEventListener('mousedown', outsideClick, true);
        }, 0);
    }

    removePreviewEdge() {
        document.getElementById('sim-preview-edge')?.remove();
    }

    updatePreviewEdge(targetPos) {
        const sourceNode = this.graph.nodes.get(this.connectingFromId);
        if (!sourceNode) return;

        let preview = document.getElementById('sim-preview-edge');
        if (!preview) {
            preview = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            preview.id = 'sim-preview-edge';
            preview.setAttribute('class', 'sim-edge-preview');
            this.edgesLayer.appendChild(preview);
        }

        const d = this.calculateBezier(sourceNode.x, sourceNode.y, targetPos.x, targetPos.y);
        preview.setAttribute('d', d);
    }

    calculateBezier(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const sag = Math.min(dist * 0.15, 40);
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        return `M ${x1} ${y1} Q ${mx} ${my + sag} ${x2} ${y2}`;
    }

    // ─── Render Loop ───────────────────────────────

    render() {
        const existingNodeEls = new Set(Array.from(this.nodesLayer.children).map(n => n.dataset.id));

        this.graph.nodes.forEach((node, id) => {
            let el = this.nodesLayer.querySelector(`[data-id="${id}"]`);
            if (!el) {
                el = this.createNodeElement(node);
                this.nodesLayer.appendChild(el);
            } else {
                el.style.left = `${node.x}px`;
                el.style.top = `${node.y}px`;
                el.className = `sim-node ${id === this.selectedNodeId ? 'selected' : ''} ${!node.powered ? 'powered-off' : ''}`;
                
                const label = el.querySelector('.sim-node-label');
                if (label) label.textContent = node.name;

                const primaryIP = this.graph.getPrimaryIP(node.id);
                let ipLabel = el.querySelector('.sim-node-ip');
                if (primaryIP) {
                    if (ipLabel) ipLabel.textContent = primaryIP;
                    else {
                        ipLabel = document.createElement('div');
                        ipLabel.className = 'sim-node-ip';
                        ipLabel.textContent = primaryIP;
                        el.appendChild(ipLabel);
                    }
                } else if (ipLabel) {
                    ipLabel.remove();
                }

                const led = el.querySelector('.sim-node-status-led');
                if (led) led.style.background = node.powered ? '#4caf50' : '#f44336';

                const health = this._nodeHealth(node);
                let alert = el.querySelector('.sim-node-alert');
                if (health) {
                    if (!alert) {
                        alert = document.createElement('div');
                        el.appendChild(alert);
                    }
                    alert.className = `sim-node-alert ${health.level}`;
                    alert.title = health.message;
                    alert.innerHTML = `<i class="bi ${health.icon}"></i>`;
                } else if (alert) {
                    alert.remove();
                }
            }
            existingNodeEls.delete(id);
        });

        existingNodeEls.forEach(id => {
            this.nodesLayer.querySelector(`[data-id="${id}"]`)?.remove();
        });

        this.edgesLayer.innerHTML = '';

        this.graph.edges.forEach((edge, id) => {
            const src = this.graph.nodes.get(edge.source);
            const tgt = this.graph.nodes.get(edge.target);
            if (!src || !tgt) return;

            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const cable = CABLE_TYPES[edge.cableType] || CABLE_TYPES.copper_straight;
            const edgeColor = edge.status === 'up' ? cable.color : '#f44336';

            path.setAttribute('class', `sim-edge ${edge.status}`);
            path.setAttribute('d', this.calculateBezier(src.x, src.y, tgt.x, tgt.y));
            path.setAttribute('stroke', edgeColor);
            if (cable.dash !== 'none') path.setAttribute('stroke-dasharray', cable.dash);
            path.dataset.id = id;

            path.addEventListener('mousedown', (e) => {
                if (e.button === 0 && this.tool === 'select') {
                    e.stopPropagation();
                    if (confirm(`Delete cable between ${getPortDisplayName(edge.sourcePort)} and ${getPortDisplayName(edge.targetPort)}?`)) {
                        this.graph.removeEdge(id);
                    }
                }
            });

            group.appendChild(path);

            const mx = (src.x + tgt.x) / 2;
            const my = (src.y + tgt.y) / 2;
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', mx);
            label.setAttribute('y', my - 10);
            label.setAttribute('class', 'sim-edge-label');
            label.textContent = `${getPortDisplayName(edge.sourcePort)} ↔ ${getPortDisplayName(edge.targetPort)}`;
            group.appendChild(label);

            this.edgesLayer.appendChild(group);
        });

        this.updateInspector();
        this._updateMiniMap();
        this._updateStatusBar();
    }

    _nodeHealth(node) {
        if (!node.powered) return { level: 'danger', icon: 'bi-power', message: 'Device is powered off' };
        const ifaces = Object.values(node.interfaces || {});
        if (ifaces.length && ifaces.every(iface => iface.state !== 'up')) {
            return { level: 'danger', icon: 'bi-ethernet', message: 'All interfaces are down' };
        }
        const primaryIP = this.graph.getPrimaryIP(node.id);
        if ((node.type === 'pc' || node.type === 'server') && !primaryIP) {
            return { level: 'warning', icon: 'bi-exclamation-triangle-fill', message: 'No configured IP address' };
        }
        if (node.services?.dhcpClientService === false) {
            return { level: 'warning', icon: 'bi-sliders', message: 'DHCP Client service is stopped' };
        }
        if (node.services?.dnsClient === false) {
            return { level: 'warning', icon: 'bi-sliders', message: 'DNS Client service is stopped' };
        }
        if (node.firewallEnabled) {
            return { level: 'info', icon: 'bi-shield-lock-fill', message: 'Host firewall is enabled' };
        }
        return null;
    }

    selectNode(id) {
        this.selectedNodeId = id;
        this.render();
        if (id) {
            this.inspector.classList.remove('hidden');
        } else {
            this.inspector.classList.add('hidden');
        }
    }

    // ─── Inspector ─────────────────────────────────

    updateInspector() {
        if (!this.selectedNodeId) return;
        const node = this.graph.getNode(this.selectedNodeId);
        if (!node) { this.selectNode(null); return; }

        const vendor = VENDORS[node.vendor] || VENDORS.generic;
        const isDesktopDevice = node.type === 'pc' || (node.type === 'server' && node.os !== 'linux');
        const isCliDevice = ['router', 'switch', 'l3switch', 'firewall'].includes(node.type) || (node.type === 'server' && node.os === 'linux');

        let html = `
            <div class="insp-section">
                <div class="sim-form-group">
                    <label>Device Name</label>
                    <input class="sim-input" id="prop-name" value="${node.name}">
                </div>
                <div class="insp-badge-row">
                    <span class="insp-vendor-badge" style="background:${vendor.color}">${vendor.name}</span>
                    <span class="insp-model-badge">${node.model}</span>
                </div>
            </div>
        `;

        const disabledAttr = !node.powered ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : '';
        if (isDesktopDevice) {
            html += `
                <div class="insp-section">
                    <button class="sim-action-btn sim-btn-play" style="width:100%; justify-content:center" id="btn-open-desktop" ${disabledAttr}>
                        <i class="bi bi-window-desktop"></i> Open Desktop
                    </button>
                    <p class="insp-hint">${!node.powered ? 'Device must be powered on to access desktop.' : 'Access Terminal, IP Config, Browser, Wireshark, and more.'}</p>
                </div>
            `;
        }
        if (isCliDevice) {
            html += `
                <div class="insp-section">
                    <button class="sim-action-btn sim-btn-play" style="width:100%; justify-content:center" id="btn-open-cli" ${disabledAttr}>
                        <i class="bi bi-terminal"></i> Open ${node.cliType === 'juniper' ? 'JunOS' : node.cliType === 'linux' ? 'Linux' : 'IOS'} CLI
                    </button>
                    <p class="insp-hint">${!node.powered ? 'Device must be powered on to access CLI.' : (node.cliType === 'juniper' ? 'Juniper JunOS CLI with set/commit model.' : node.cliType === 'linux' ? 'Standard Linux Terminal with bash and systemctl.' : 'Cisco IOS CLI with full routing, switching, and security config.')}</p>
                </div>
            `;
        }

        const ifCount = Object.keys(node.interfaces).length;
        const upCount = Object.values(node.interfaces).filter(i => i.state === 'up').length;
        html += `
            <div class="insp-section">
                <h4 class="insp-section-title">Interfaces <span class="insp-count">${upCount}/${ifCount} up</span></h4>
                <div class="insp-interfaces-list">
                    ${Object.entries(node.interfaces).slice(0, 6).map(([name, iface]) => `
                        <div class="insp-iface-row">
                            <span class="iface-led ${iface.state === 'up' && node.powered ? 'led-green' : 'led-red'}"></span>
                            <span class="iface-name">${getPortDisplayName(name)}</span>
                            <span class="iface-ip">${iface.ip || (iface.switchportMode ? `VLAN ${iface.accessVlan || 1}` : '—')}</span>
                        </div>
                    `).join('')}
                    ${ifCount > 6 ? `<div class="insp-more">+ ${ifCount - 6} more interfaces</div>` : ''}
                </div>
            </div>
        `;

        html += `
            <div class="insp-section">
                <h4 class="insp-section-title">Features</h4>
                <div class="insp-features">${node.features.map(f => `<span class="insp-feature-tag">${f}</span>`).join('')}</div>
            </div>
            <div class="insp-section">
                <button class="sim-action-btn" style="width:100%; justify-content:center" id="btn-export-device-config">
                    <i class="bi bi-clipboard"></i> Copy Device Config
                </button>
                <p class="insp-hint">Copy a study-friendly snapshot of this device's current interfaces, services, and tables.</p>
            </div>
        `;

        this.inspectorBody.innerHTML = html;

        this.inspectorBody.querySelector('#prop-name')?.addEventListener('change', (e) => {
            this.graph.updateNode(node.id, { name: e.target.value, hostname: e.target.value });
        });
        this.inspectorBody.querySelector('#btn-open-desktop')?.addEventListener('click', () => {
            if (!node.powered) return;
            this.engine.openDesktop(node.id);
        });
        this.inspectorBody.querySelector('#btn-open-cli')?.addEventListener('click', () => {
            if (!node.powered) return;
            this.engine.openCLI(node.id);
        });
        this.inspectorBody.querySelector('#btn-export-device-config')?.addEventListener('click', async () => {
            await this._copyText(this._deviceConfigExport(node));
            this._showToast(`${node.name} config copied.`);
        });

        this.inspector.querySelector('.inspector-icon i').className = `bi ${node.icon}`;
        this.inspector.querySelector('.inspector-icon i').style.color = vendor.color;
        this.inspector.querySelector('.inspector-title h3').textContent = node.name;
        this.inspector.querySelector('.inspector-title span').textContent = `${vendor.name} ${node.type}`;
    }

    _deviceConfigExport(node) {
        if (node.cliType === 'cisco') return this._ciscoConfigExport(node);
        if (node.cliType === 'juniper') return this._juniperConfigExport(node);
        if (node.os === 'linux') return this._linuxConfigExport(node);
        if (node.os === 'windows') return this._windowsConfigExport(node);
        return this._genericConfigExport(node);
    }

    _ciscoConfigExport(node) {
        const lines = ['!', `hostname ${node.hostname || node.name}`, '!'];
        for (const [id, vlan] of Object.entries(node.vlans || {})) {
            if (String(id) !== '1') lines.push(`vlan ${id}`, ` name ${vlan.name || 'VLAN' + id}`, '!');
        }
        for (const [name, iface] of Object.entries(node.interfaces || {})) {
            lines.push(`interface ${name}`);
            if (iface.description) lines.push(` description ${iface.description}`);
            if (iface.switchportMode) {
                lines.push(` switchport mode ${iface.switchportMode}`);
                if (iface.switchportMode === 'access') lines.push(` switchport access vlan ${iface.accessVlan || 1}`);
                if (iface.switchportMode === 'trunk') lines.push(` switchport trunk allowed vlan ${iface.trunkAllowed || 'all'}`);
            }
            if (iface.ip) lines.push(` ip address ${iface.ip} ${this._cidrToMask(iface.subnet || 24)}`);
            lines.push(iface.state === 'down' ? ' shutdown' : ' no shutdown', '!');
        }
        for (const route of node.routingTable || []) {
            lines.push(`ip route ${route.network} ${route.mask || this._cidrToMask(route.cidr || 24)} ${route.nextHop || route.interface || '0.0.0.0'}`);
        }
        return lines.join('\n');
    }

    _juniperConfigExport(node) {
        const lines = [`set system host-name ${node.hostname || node.name}`];
        for (const [name, iface] of Object.entries(node.interfaces || {})) {
            if (iface.ip) lines.push(`set interfaces ${name} unit 0 family inet address ${iface.ip}/${iface.subnet || 24}`);
            if (iface.description) lines.push(`set interfaces ${name} description "${iface.description}"`);
            if (iface.state === 'down') lines.push(`set interfaces ${name} disable`);
        }
        for (const route of node.routingTable || []) {
            lines.push(`set routing-options static route ${route.network}/${route.cidr || 24} next-hop ${route.nextHop || 'discard'}`);
        }
        return lines.join('\n');
    }

    _linuxConfigExport(node) {
        const lines = [`# ${node.name} Linux network snapshot`, '$ ip addr'];
        for (const [name, iface] of Object.entries(node.interfaces || {})) {
            lines.push(`${name}: ${iface.state || 'down'} ${iface.ip ? iface.ip + '/' + (iface.subnet || 24) : 'no address'} ${iface.mac || ''}`.trim());
        }
        lines.push('', '$ ip route');
        if (node.gateway) lines.push(`default via ${node.gateway} dev ${Object.keys(node.interfaces || {})[0] || 'eth0'}`);
        for (const route of node.routingTable || []) lines.push(`${route.network}/${route.cidr || 24} via ${route.nextHop || 'direct'} dev ${route.interface || 'eth0'}`);
        lines.push('', '$ systemctl --state=running');
        for (const [name, state] of Object.entries(node._services || {})) lines.push(`${name}.service ${state}`);
        return lines.join('\n');
    }

    _windowsConfigExport(node) {
        const lines = [`REM ${node.name} Windows network snapshot`, 'ipconfig /all'];
        for (const [name, iface] of Object.entries(node.interfaces || {})) {
            lines.push(`${name}: ${iface.ip || '169.254.x.x'}/${iface.subnet || '16'} gateway=${node.gateway || '-'} dns=${node.dnsServer || '-'} mac=${iface.mac || '-'}`);
        }
        lines.push('', 'net start');
        const services = [
            ['DHCP Client', node.services?.dhcpClientService !== false],
            ['DNS Client', node.services?.dnsClient !== false],
            ['Windows Defender Firewall', !!node.firewallEnabled],
            ['World Wide Web Publishing Service', !!node.httpEnabled],
        ];
        for (const [name, running] of services) lines.push(`${running ? 'RUNNING' : 'STOPPED'} ${name}`);
        return lines.join('\n');
    }

    _genericConfigExport(node) {
        return JSON.stringify({
            name: node.name,
            model: node.model,
            interfaces: node.interfaces,
            services: node.services,
            routingTable: node.routingTable
        }, null, 2);
    }

    _cidrToMask(cidr) {
        const c = parseInt(cidr, 10) || 24;
        const mask = (0xffffffff << (32 - c)) >>> 0;
        return [(mask >>> 24) & 255, (mask >>> 16) & 255, (mask >>> 8) & 255, mask & 255].join('.');
    }

    async _copyText(text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            const input = document.createElement('textarea');
            input.value = text;
            input.style.position = 'fixed';
            input.style.opacity = '0';
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            input.remove();
        }
    }

    _showToast(message) {
        document.querySelector('#sim-toast')?.remove();
        const toast = document.createElement('div');
        toast.id = 'sim-toast';
        toast.className = 'sim-toast success';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
    }

    // ─── Mini Map ──────────────────────────────────

    _updateMiniMap() {
        const miniMap = this.container.querySelector('.sim-minimap-canvas');
        if (!miniMap) return;

        const ctx = miniMap.getContext('2d');
        const w = miniMap.width;
        const h = miniMap.height;
        ctx.clearRect(0, 0, w, h);

        if (this.graph.nodes.size === 0) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        this.graph.nodes.forEach(n => {
            if (n.x < minX) minX = n.x;
            if (n.y < minY) minY = n.y;
            if (n.x > maxX) maxX = n.x;
            if (n.y > maxY) maxY = n.y;
        });

        const pad = 100;
        minX -= pad; minY -= pad; maxX += pad; maxY += pad;
        const rangeX = maxX - minX || 1;
        const rangeY = maxY - minY || 1;
        const scale = Math.min(w / rangeX, h / rangeY);

        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        this.graph.edges.forEach(edge => {
            const src = this.graph.nodes.get(edge.source);
            const tgt = this.graph.nodes.get(edge.target);
            if (!src || !tgt) return;
            ctx.beginPath();
            ctx.moveTo((src.x - minX) * scale, (src.y - minY) * scale);
            ctx.lineTo((tgt.x - minX) * scale, (tgt.y - minY) * scale);
            ctx.stroke();
        });

        this.graph.nodes.forEach(node => {
            const vendor = VENDORS[node.vendor] || VENDORS.generic;
            ctx.fillStyle = node.powered ? vendor.color : '#666';
            const nx = (node.x - minX) * scale;
            const ny = (node.y - minY) * scale;
            ctx.fillRect(nx - 3, ny - 3, 6, 6);
        });

        const vpRect = this.viewport.getBoundingClientRect();
        const vx = (-this.transform.x / this.transform.scale - minX) * scale;
        const vy = (-this.transform.y / this.transform.scale - minY) * scale;
        const vw = (vpRect.width / this.transform.scale) * scale;
        const vh = (vpRect.height / this.transform.scale) * scale;
        ctx.strokeStyle = '#0d6efd';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(vx, vy, vw, vh);
    }

    _updateStatusBar() {
        const bar = this.container.querySelector('.sim-status-bar');
        if (!bar) return;
        const nodeCount = this.graph.nodes.size;
        const edgeCount = this.graph.edges.size;
        const playing = this.graph.isPlaying;
        bar.innerHTML = `
            <span class="status-item"><i class="bi bi-hdd-network"></i> ${nodeCount} devices</span>
            <span class="status-item"><i class="bi bi-ethernet"></i> ${edgeCount} links</span>
            <span class="status-item"><i class="bi bi-${playing ? 'play-fill' : 'pause-fill'}"></i> ${playing ? 'Running' : 'Paused'}</span>
            <span class="status-item">Zoom: ${Math.round(this.transform.scale * 100)}%</span>
        `;
    }

    // ─── Undo ──────────────────────────────────────

    _undo() {
        console.log('Undo not yet fully implemented');
    }

    // ─── Packet Animation ──────────────────────────

    async animatePacketSequence(path) {
        for (let i = 0; i < path.length - 1; i++) {
            const src = this.graph.getNode(path[i]);
            const dst = this.graph.getNode(path[i + 1]);
            if (!src || !dst) continue;

            const pkt = document.createElement('div');
            pkt.className = 'sim-packet';
            pkt.style.left = `${src.x}px`;
            pkt.style.top = `${src.y}px`;
            this.world.appendChild(pkt);
            pkt.getBoundingClientRect(); // force reflow
            pkt.style.left = `${dst.x}px`;
            pkt.style.top = `${dst.y}px`;
            await new Promise(r => setTimeout(r, 400));
            pkt.remove();
        }
    }
}
