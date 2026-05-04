import { NetworkGraph } from './simulator/sim-graph.js';
import { SimulatorUI } from './simulator/sim-ui.js';
import { SimEngine } from './simulator/sim-engine.js';
import { PALETTE_CATEGORIES, CABLE_TYPES, DEVICE_TEMPLATES } from './simulator/sim-device-templates.js';
import { LabEngine } from './simulator/sim-lab-engine.js';
import { LabUI } from './simulator/sim-lab-ui.js';

export default {
    render() {
        return `
<div class="page-header">
    <div class="d-flex justify-content-between align-items-center">
        <div>
            <h2>Network Simulator</h2>
            <p class="text-muted">A full-featured network simulator with routing, switching, and end-device emulation.</p>
        </div>
        <div>
            <button class="btn btn-outline-primary btn-sm" onclick="document.getElementById('sim-help').classList.toggle('hidden')">
                <i class="bi bi-question-circle"></i> Help
            </button>
        </div>
    </div>
</div>

<div id="sim-help" class="help-panel hidden mb-3">
    <strong>How to use the Network Simulator:</strong>
    <ul>
        <li>Drag devices from the left palette onto the canvas.</li>
        <li>Select the connection tool <i class="bi bi-ethernet"></i> to link devices.</li>
        <li>Double-click a device to open its CLI or Desktop environment.</li>
        <li>Right-click nodes for power, web UI, CLI, and delete options.</li>
    </ul>
</div>

<div class="simulator-wrapper">
    <div class="sim-app-container" id="simulator-app">
        <aside class="sim-palette" id="sim-palette">
            <div class="sim-palette-header">
                <h3><i class="bi bi-cpu"></i> Device Palette</h3>
                <button class="sim-palette-collapse" id="btn-palette-collapse" title="Toggle Palette"><i class="bi bi-chevron-left"></i></button>
            </div>
            <div class="sim-palette-search">
                <i class="bi bi-search"></i>
                <input type="text" id="sim-palette-search" placeholder="Search devices..." autocomplete="off">
            </div>
            <div class="sim-palette-items" id="sim-palette-items">
                ${PALETTE_CATEGORIES.map(cat => `
                    <div class="sim-palette-category">
                        <div class="sim-palette-cat-header" data-cat="${cat.name}">
                            <i class="bi ${cat.icon}"></i>
                            <span>${cat.name}</span>
                            <i class="bi bi-chevron-down cat-chevron"></i>
                        </div>
                        <div class="sim-palette-cat-items">
                            ${cat.items.map(item => {
            const template = DEVICE_TEMPLATES[item.templateId];
            return `
                                <div class="sim-device-item" draggable="true" data-template="${item.templateId}">
                                    <i class="bi ${template ? template.icon : 'bi-cpu'}"></i>
                                    <span class="device-item-label">${item.label}</span>
                                </div>
                                `;
        }).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="sim-palette-footer">
                <div class="cable-type-select">
                    <label>Cable Type</label>
                    <select class="form-select form-select-sm" id="sim-cable-type">
                        ${Object.entries(CABLE_TYPES).map(([key, cable]) =>
            `<option value="${key}">${cable.name}</option>`
        ).join('')}
                    </select>
                </div>
            </div>
        </aside>

        <div class="sim-workspace">
            <div class="sim-topbar">
                <div class="sim-topbar-left">
                    <div class="sim-tool-group">
                        <button class="sim-tool-btn active" data-tool="select" title="Select / Drag (Esc)"><i class="bi bi-cursor"></i></button>
                        <button class="sim-tool-btn" data-tool="connect" title="Connect Cable (C)"><i class="bi bi-ethernet"></i></button>
                    </div>
                    <div class="sim-tool-group">
                        <button class="sim-tool-btn" id="sim-btn-labs" title="Practice Labs"><i class="bi bi-list-task text-primary"></i> Labs</button>
                    </div>
                    <div class="sim-tool-group">
                        <button class="sim-tool-btn" id="sim-btn-play" title="Start Simulation"><i class="bi bi-play-fill text-success"></i></button>
                        <button class="sim-tool-btn" id="sim-btn-pause" title="Pause Simulation"><i class="bi bi-pause-fill text-warning"></i></button>
                    </div>
                </div>
                <div class="sim-topbar-center">
                    <span class="sim-topbar-title">Active Topology</span>
                </div>
                <div class="sim-topbar-right">
                    <div class="sim-tool-group">
                        <button class="sim-tool-btn" id="sim-btn-save" title="Save Topology"><i class="bi bi-save"></i></button>
                        <button class="sim-tool-btn" id="sim-btn-load" title="Load Topology"><i class="bi bi-folder2-open"></i></button>
                        <button class="sim-tool-btn" id="sim-btn-savefile" title="Export to File"><i class="bi bi-download"></i></button>
                        <button class="sim-tool-btn" id="sim-btn-loadfile" title="Import from File"><i class="bi bi-upload"></i></button>
                    </div>
                    <div class="sim-tool-group">
                        <button class="sim-tool-btn" id="sim-btn-zoomin" title="Zoom In"><i class="bi bi-zoom-in"></i></button>
                        <button class="sim-tool-btn" id="sim-btn-zoomout" title="Zoom Out"><i class="bi bi-zoom-out"></i></button>
                        <button class="sim-tool-btn" id="sim-btn-zoomfit" title="Fit to Screen"><i class="bi bi-aspect-ratio"></i></button>
                    </div>
                    <div class="sim-tool-group">
                        <button class="sim-tool-btn text-danger" id="sim-btn-clear" title="Clear All"><i class="bi bi-trash"></i></button>
                    </div>
                </div>
            </div>

            <div class="sim-canvas-viewport" data-tool="select">
                <div id="sim-world">
                    <svg id="sim-edges-layer" overflow="visible"></svg>
                    <div id="sim-nodes-layer"></div>
                    <div id="sim-labels-layer"></div>
                </div>
                <div class="sim-minimap">
                    <canvas class="sim-minimap-canvas" width="180" height="120"></canvas>
                </div>
            </div>

            <div class="sim-status-bar">
                <span class="status-item"><i class="bi bi-pc-display"></i> <span id="sb-nodes">0</span> devices</span>
                <span class="status-item"><i class="bi bi-ethernet"></i> <span id="sb-edges">0</span> links</span>
                <span class="status-item"><i class="bi bi-pause-fill text-warning"></i> <span id="sb-state">Paused</span></span>
            </div>
        </div>

        <aside class="sim-inspector hidden" id="sim-inspector">
            <div class="inspector-header">
                <div class="inspector-icon"><i class="bi bi-hdd"></i></div>
                <div class="inspector-title">
                    <h3>Device</h3>
                    <span>Type</span>
                </div>
                <button class="inspector-close" title="Close"><i class="bi bi-x"></i></button>
            </div>
            <div class="inspector-body">
                <div class="inspector-empty">
                    <i class="bi bi-cursor-text"></i>
                    <p>Click a device to inspect it</p>
                </div>
            </div>
    </div>
</div>

<!-- Static Feedback Form -->
<div class="container mt-4 mb-5" style="max-width: 1000px;">
    <div class="card shadow-sm border-0">
        <div class="card-body">
            <h5 class="card-title text-primary"><i class="bi bi-chat-left-text-fill me-2"></i>Simulator Feedback</h5>
            <p class="text-muted small">Submit bugs or feature requests directly to the developer.</p>
            <form id="simFeedbackForm" class="row g-3">
                <div class="col-md-3">
                    <label class="form-label fw-bold small text-secondary mb-1">Feedback Type</label>
                    <select class="form-select" id="feedbackType">
                        <option value="Bug Report">Bug Report</option>
                        <option value="Feature Request">Feature Request</option>
                        <option value="General Feedback">General Feedback</option>
                    </select>
                </div>
                <div class="col-md-7">
                    <label class="form-label fw-bold small text-secondary mb-1">Details</label>
                    <textarea class="form-control" id="feedbackDetails" rows="3" placeholder="Describe the bug or feature in detail..." style="resize: none;" required></textarea>
                </div>
                <div class="col-md-2 d-flex flex-column justify-content-end">
                    <button type="button" class="btn btn-primary w-100 fw-bold" id="btn-submit-feedback" style="height: 48px;">
                        <i class="bi bi-envelope-fill me-1"></i> Send
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>
`;
    },

    init() {
        const container = document.getElementById('simulator-app');
        if (!container) return;

        const graph = new NetworkGraph();
        const engine = new SimEngine(graph);
        const ui = new SimulatorUI(container, graph, engine);

        // Init Lab System
        const labEngine = new LabEngine(graph, engine);
        const labUI = new LabUI(container, labEngine);

        // Topbar tools
        container.querySelectorAll('.sim-tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => ui.setTool(btn.dataset.tool));
        });

        // Open Labs Browser
        container.querySelector('#sim-btn-labs')?.addEventListener('click', () => {
            labUI.openBrowser();
        });

        // Close inspector
        container.querySelector('.inspector-close').addEventListener('click', () => ui.selectNode(null));

        // Clear
        container.querySelector('#sim-btn-clear')?.addEventListener('click', () => {
            if (confirm('Clear the entire topology?')) {
                graph.clear();
                ui.selectNode(null);
            }
        });

        // Palette drag
        container.querySelectorAll('.sim-device-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', item.dataset.template);
                e.dataTransfer.effectAllowed = 'copy';
            });
        });

        // Palette category collapse
        container.querySelectorAll('.sim-palette-cat-header').forEach(header => {
            header.addEventListener('click', () => {
                const items = header.nextElementSibling;
                items.classList.toggle('collapsed');
                header.querySelector('.cat-chevron').classList.toggle('rotated');
            });
        });

        // Palette search
        container.querySelector('#sim-palette-search')?.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            container.querySelectorAll('.sim-device-item').forEach(item => {
                const label = item.querySelector('.device-item-label').textContent.toLowerCase();
                item.style.display = label.includes(q) ? '' : 'none';
            });
        });

        // Palette collapse button
        container.querySelector('#btn-palette-collapse')?.addEventListener('click', () => {
            container.querySelector('.sim-palette').classList.toggle('collapsed');
        });

        // Cable type selector
        container.querySelector('#sim-cable-type')?.addEventListener('change', (e) => {
            ui.selectedCableType = e.target.value;
        });

        // Simulation controls
        container.querySelector('#sim-btn-play')?.addEventListener('click', () => engine.startSimulation());
        container.querySelector('#sim-btn-pause')?.addEventListener('click', () => engine.stopSimulation());

        // Save/Load
        container.querySelector('#sim-btn-save')?.addEventListener('click', () => {
            const name = prompt('Save topology as:', 'default');
            if (name) {
                graph.saveToLocalStorage(name);
                alert(`Topology "${name}" saved!`);
            }
        });

        container.querySelector('#sim-btn-load')?.addEventListener('click', () => {
            const saved = graph.getSavedTopologies();
            if (saved.length === 0) { alert('No saved topologies found.'); return; }
            const name = prompt(`Load topology:\n\nAvailable: ${saved.join(', ')}`, saved[0]);
            if (name) {
                if (graph.loadFromLocalStorage(name)) {
                    ui.selectNode(null);
                    alert(`Topology "${name}" loaded!`);
                } else {
                    alert('Failed to load topology.');
                }
            }
        });

        container.querySelector('#sim-btn-savefile')?.addEventListener('click', () => {
            const json = graph.exportTopology();
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'network-topology.json';
            a.click();
            URL.revokeObjectURL(url);
        });

        // File load via hidden input
        const loadFileInput = document.createElement('input');
        loadFileInput.type = 'file';
        loadFileInput.accept = '.json';
        loadFileInput.style.display = 'none';
        document.body.appendChild(loadFileInput);

        container.querySelector('#sim-btn-loadfile')?.addEventListener('click', () => {
            loadFileInput.click();
        });

        loadFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                if (graph.importTopology(reader.result)) {
                    ui.selectNode(null);
                }
            };
            reader.readAsText(file);
        });

        // Zoom buttons
        container.querySelector('#sim-btn-zoomin')?.addEventListener('click', () => {
            ui.transform.scale = Math.min(3, ui.transform.scale * 1.2);
            ui.applyTransform();
        });
        container.querySelector('#sim-btn-zoomout')?.addEventListener('click', () => {
            ui.transform.scale = Math.max(0.15, ui.transform.scale * 0.8);
            ui.applyTransform();
        });
        container.querySelector('#sim-btn-zoomfit')?.addEventListener('click', () => {
            ui.transform = { x: 0, y: 0, scale: 1 };
            ui.applyTransform();
        });

        // Keyboard shortcuts
        const handleKeyDown = (e) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
            if (e.key === 'Escape') ui.setTool('select');
            if (e.key === 'c' || e.key === 'C') ui.setTool('connect');
        };
        window.addEventListener('keydown', handleKeyDown);

        // Feedback Form Logic
        const submitFeedbackBtn = document.querySelector('#btn-submit-feedback');
        if (submitFeedbackBtn) {
            submitFeedbackBtn.addEventListener('click', async () => {
                const type = document.querySelector('#feedbackType').value;
                const details = document.querySelector('#feedbackDetails').value;
                if (!details.trim()) {
                    alert('Please provide some details before submitting.');
                    return;
                }
                
                // Set loading state
                const originalBtnHtml = submitFeedbackBtn.innerHTML;
                submitFeedbackBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Sending...';
                submitFeedbackBtn.disabled = true;

                const payload = {
                    access_key: '2552c28f-c0de-442e-beaa-86bd422f467e',
                    subject: `[SubnetSuite Simulator] ${type}`,
                    from_name: 'SubnetSuite Simulator',
                    Feedback_Type: type,
                    Details: details
                };

                try {
                    const response = await fetch('https://api.web3forms.com/submit', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify(payload)
                    });

                    const result = await response.json();
                    
                    // Reset UI
                    submitFeedbackBtn.innerHTML = originalBtnHtml;
                    submitFeedbackBtn.disabled = false;
                    
                    const form = document.querySelector('#simFeedbackForm');
                    const existingAlert = form.nextElementSibling;
                    if (existingAlert && existingAlert.classList.contains('alert')) {
                        existingAlert.remove();
                    }

                    if (response.ok) {
                        document.querySelector('#feedbackDetails').value = '';
                        const alertHtml = `
                            <div class="alert alert-success mt-3 py-2 fade show" role="alert">
                                <i class="bi bi-check-circle-fill me-2"></i><strong>Success!</strong> Your feedback has been sent directly to the developer.
                            </div>
                        `;
                        form.insertAdjacentHTML('afterend', alertHtml);
                        setTimeout(() => {
                            const alertNode = form.nextElementSibling;
                            if (alertNode && alertNode.classList.contains('alert')) alertNode.remove();
                        }, 5000);
                    } else {
                        throw new Error(result.message || 'Failed to send feedback');
                    }
                } catch (error) {
                    // Reset UI on error
                    submitFeedbackBtn.innerHTML = originalBtnHtml;
                    submitFeedbackBtn.disabled = false;
                    
                    const form = document.querySelector('#simFeedbackForm');
                    const existingAlert = form.nextElementSibling;
                    if (existingAlert && existingAlert.classList.contains('alert')) existingAlert.remove();
                    
                    const alertHtml = `
                        <div class="alert alert-danger mt-3 py-2 fade show" role="alert">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i><strong>Error:</strong> Could not send feedback. Please try again later.
                        </div>
                    `;
                    form.insertAdjacentHTML('afterend', alertHtml);
                }
            });
        }

        return () => {
            graph.clear();
            engine.stopSimulation();
            window.removeEventListener('keydown', handleKeyDown);
            loadFileInput.remove();
        };
    }
};
