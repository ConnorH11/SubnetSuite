// sim-lab-ui.js

import { makeDraggable } from './sim-ui-utils.js';

export class LabUI {
    constructor(container, engine) {
        this.container = container;
        this.engine = engine;
        this.browserModal = null;
        this.taskPanel = null;
        this.showToolLabsOnly = false;
        this.cleanupTaskResize = null;

        this.engine.subscribe(() => this._updateTaskPanel());
    }

    // ─── Lab Browser Modal ─────────────────────────

    openBrowser() {
        if (this.browserModal) this.browserModal.remove();

        this.browserModal = document.createElement('div');
        this.browserModal.className = 'sim-lab-browser-modal';
        
        const stats = this.engine.getOverallStats();
        
        this.browserModal.innerHTML = `
            <div class="sim-cli-header sim-lab-browser-titlebar">
                <div class="sim-cli-header-left">
                    <i class="bi bi-mortarboard-fill" style="color:#f5a623"></i>
                    <span>Practice Labs Catalog</span>
                </div>
                <div class="sim-cli-header-btns">
                    <button class="sim-cli-close"><i class="bi bi-x"></i></button>
                </div>
            </div>
            <div class="lab-browser-content">
                <div class="lab-browser-sidebar">
                    <div class="lab-stats-box">
                        <div class="stat-row"><span>Total Labs:</span><span>${stats.total}</span></div>
                        <div class="stat-row"><span>Completed:</span><span class="text-success">${stats.completed}</span></div>
                        <div class="stat-row"><span>100% Score:</span><span class="text-warning">${stats.perfect}</span></div>
                    </div>
                    <h4 class="lab-filter-title">Certifications</h4>
                    <ul class="lab-filter-list" id="lab-cert-filter">
                        <li class="active" data-filter="all">All Labs</li>
                        ${this.engine.getCategories().map(c => `<li data-filter="${c}">${c}</li>`).join('')}
                    </ul>
                </div>
                <div class="lab-browser-main">
                    <div class="lab-search-bar">
                        <i class="bi bi-search"></i>
                        <input type="text" id="lab-search" placeholder="Search labs by title, description, or tool..." autocomplete="off">
                        <button class="lab-tool-filter" id="lab-tool-filter" title="Show labs that require installed tools">
                            <i class="bi bi-bag-check"></i>
                            <span>Tool Labs</span>
                        </button>
                    </div>
                    <div class="lab-grid" id="lab-grid"></div>
                </div>
            </div>
        `;

        document.body.appendChild(this.browserModal);
        makeDraggable(this.browserModal, this.browserModal.querySelector('.sim-lab-browser-titlebar'));

        this.browserModal.querySelector('.sim-cli-close').addEventListener('click', () => {
            this.browserModal.remove();
            this.browserModal = null;
        });

        const filterList = this.browserModal.querySelector('#lab-cert-filter');
        filterList.addEventListener('click', (e) => {
            if (e.target.tagName === 'LI') {
                filterList.querySelectorAll('li').forEach(li => li.classList.remove('active'));
                e.target.classList.add('active');
                this._renderLabGrid(e.target.dataset.filter, this.browserModal.querySelector('#lab-search').value);
            }
        });

        this.browserModal.querySelector('#lab-search').addEventListener('input', (e) => {
            const activeFilter = filterList.querySelector('.active').dataset.filter;
            this._renderLabGrid(activeFilter, e.target.value);
        });

        this.browserModal.querySelector('#lab-tool-filter').addEventListener('click', (e) => {
            this.showToolLabsOnly = !this.showToolLabsOnly;
            e.currentTarget.classList.toggle('active', this.showToolLabsOnly);
            const activeFilter = filterList.querySelector('.active').dataset.filter;
            this._renderLabGrid(activeFilter, this.browserModal.querySelector('#lab-search').value);
        });

        this._renderLabGrid('all', '');
    }

    _renderLabGrid(certFilter, searchQuery) {
        const grid = this.browserModal.querySelector('#lab-grid');
        let labs = this.engine.getAllLabs();

        if (certFilter !== 'all') {
            labs = labs.filter(l => l.certification === certFilter);
        }
        if (this.showToolLabsOnly) {
            labs = labs.filter(l => this._requiredTools(l).length > 0);
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            labs = labs.filter(l => {
                const tools = this._requiredTools(l).join(' ').toLowerCase();
                return l.title.toLowerCase().includes(q) ||
                    l.description.toLowerCase().includes(q) ||
                    l.category.toLowerCase().includes(q) ||
                    tools.includes(q);
            });
        }

        if (labs.length === 0) {
            grid.innerHTML = '<div class="lab-empty">No labs match your filters.</div>';
            return;
        }

        const getDiffClass = (diff) => {
            switch(diff.toLowerCase()) {
                case 'easy': return 'diff-easy';
                case 'medium': return 'diff-medium';
                case 'hard': return 'diff-hard';
                default: return '';
            }
        };

        grid.innerHTML = labs.map(lab => {
            const progress = this.engine.getLabProgress(lab.id);
            const requiredTools = this._requiredTools(lab);
            let progressHtml = '';
            if (progress) {
                const percent = Math.round((progress.score / progress.total) * 100);
                const color = percent === 100 ? '#4caf50' : '#f5a623';
                progressHtml = `
                    <div class="lab-card-progress">
                        <div class="lab-card-progress-bar" style="width:${percent}%; background:${color}"></div>
                    </div>
                    <div class="lab-card-score" style="color:${color}">${progress.score}/${progress.total} Tasks</div>
                `;
            }

            return `
                <div class="lab-card" data-id="${lab.id}">
                    <div class="lab-card-header">
                        <span class="lab-card-cert">${lab.certification}</span>
                        <span class="lab-card-diff ${getDiffClass(lab.difficulty)}">${lab.difficulty}</span>
                    </div>
                    <h3 class="lab-card-title">${lab.title}</h3>
                    <p class="lab-card-desc">${lab.description}</p>
                    ${requiredTools.length ? `
                        <div class="lab-card-tools">
                            ${requiredTools.map(tool => `<span><i class="bi bi-bag-check"></i> ${this._esc(tool)}</span>`).join('')}
                        </div>
                    ` : ''}
                    <div class="lab-card-meta">
                        <span><i class="bi bi-clock"></i> ${lab.timeEstimate}</span>
                        <span><i class="bi bi-tags"></i> ${lab.category}</span>
                    </div>
                    ${progressHtml}
                    <button class="app-btn app-btn-primary btn-load-lab" style="margin-top:16px;width:100%">
                        ${progress ? 'Continue Lab' : 'Start Lab'}
                    </button>
                </div>
            `;
        }).join('');

        grid.querySelectorAll('.lab-card').forEach(card => {
            card.querySelector('.btn-load-lab').addEventListener('click', () => {
                this.engine.loadLab(card.dataset.id);
                this.browserModal.remove();
                this.browserModal = null;
                this.openTaskPanel();
            });
        });
    }

    _requiredTools(lab) {
        const tools = [];
        for (const task of lab.tasks || []) {
            for (const check of task.checks || []) {
                if (check.type === 'package_installed' && check.package) tools.push(check.package);
            }
        }
        return [...new Set(tools)].slice(0, 4);
    }

    // ─── Task Panel ────────────────────────────────

    openTaskPanel() {
        if (!this.engine.currentLab) return;
        if (!this.taskPanel) {
            this.taskPanel = document.createElement('div');
            this.taskPanel.className = 'sim-task-panel collapsed';
            
            const handle = document.createElement('div');
            handle.className = 'sim-task-panel-resize';
            this.taskPanel.appendChild(handle);

            document.body.appendChild(this.taskPanel);
        }

        let toggleBtn = document.getElementById('btn-toggle-tasks');
        if (!toggleBtn) {
            toggleBtn = document.createElement('button');
            toggleBtn.id = 'btn-toggle-tasks';
            toggleBtn.className = 'sim-tool-btn';
            toggleBtn.title = 'Toggle Lab Tasks';
            toggleBtn.innerHTML = '<i class="bi bi-list-check"></i>';
            const rightGroup = this.container.querySelector('.sim-topbar-right .sim-tool-group:first-child');
            if (rightGroup) rightGroup.insertBefore(toggleBtn, rightGroup.firstChild);

            toggleBtn.addEventListener('click', () => {
                this.taskPanel.classList.toggle('collapsed');
                toggleBtn.classList.toggle('active');
            });
        }
        
        this.taskPanel.classList.remove('collapsed');
        toggleBtn.classList.add('active');
        this._updateTaskPanel();
    }

    _updateTaskPanel() {
        if (!this.taskPanel || !this.engine.currentLab) return;

        const lab = this.engine.currentLab;
        const results = this.engine.taskResults;
        const requiredTools = this._requiredTools(lab);
        
        let score = 0;
        results.forEach(r => { if (r.status === 'passed') score++; });

        this.taskPanel.innerHTML = `
            <div class="sim-task-panel-resize"></div>
            <div class="task-panel-header">
                <h3>${lab.title}</h3>
                <div class="task-panel-meta">
                    <span class="badge-cert">${lab.certification}</span>
                    <span class="badge-score">${score}/${lab.tasks.length} Passed</span>
                </div>
                <div class="task-panel-actions">
                    <button class="app-btn app-btn-secondary app-btn-sm" id="btn-grade-all"><i class="bi bi-check-all"></i> Grade All</button>
                    <button class="app-btn app-btn-danger app-btn-sm" id="btn-close-lab"><i class="bi bi-x"></i> Exit Lab</button>
                </div>
            </div>
            <div class="task-panel-body">
                <p class="task-panel-desc">${lab.description}</p>
                ${this._scenarioBriefingHtml(lab)}
                ${requiredTools.length ? `
                    <div class="task-toolbox">
                        <div class="task-toolbox-title"><i class="bi bi-bag-check"></i> Required Add-ons</div>
                        <div class="task-toolbox-list">
                            ${requiredTools.map(tool => `<span>${this._esc(tool)}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
                <div class="task-list">
                    ${lab.tasks.map((task, idx) => {
                        const res = results[idx];
                        let icon = 'bi-circle';
                        let cls = '';
                        if (res.status === 'passed') { icon = 'bi-check-circle-fill'; cls = 'task-passed'; }
                        else if (res.status === 'failed') { icon = 'bi-x-circle-fill'; cls = 'task-failed'; }

                        const hintsRevealed = this.engine.getRevealedHints(idx);
                        const hasMoreHints = this.engine.hasMoreHints(idx);

                        return `
                            <div class="task-item ${cls}">
                                <div class="task-header">
                                    <div class="task-icon"><i class="bi ${icon}"></i></div>
                                    <div class="task-desc">${idx + 1}. ${task.description}</div>
                                    <button class="app-btn app-btn-sm btn-check-task" data-idx="${idx}">Check</button>
                                </div>
                                ${res.message && res.status !== 'pending' ? `<div class="task-result-msg ${cls}">${res.message.replace(/\\n/g, '<br>')}</div>` : ''}
                                
                                <div class="task-hints">
                                    ${hintsRevealed.map((h, i) => `<div class="task-hint"><i class="bi bi-lightbulb-fill"></i> <strong>Hint ${i+1}:</strong> ${h}</div>`).join('')}
                                    ${hasMoreHints ? `<button class="btn-hint" data-idx="${idx}">Show Hint</button>` : ''}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        this.taskPanel.querySelector('#btn-grade-all').addEventListener('click', () => {
            const res = this.engine.checkAllTasks();
            if (res.perfect) this._showSuccessConfetti();
        });

        this.taskPanel.querySelector('#btn-close-lab').addEventListener('click', () => {
            this.engine.closeLab();
            if (this.cleanupTaskResize) this.cleanupTaskResize();
            this.taskPanel.remove();
            this.taskPanel = null;
            document.getElementById('btn-toggle-tasks')?.remove();
        });

        makeDraggable(this.taskPanel, this.taskPanel.querySelector('.task-panel-header'));
        this._attachTaskPanelResize();

        this.taskPanel.querySelectorAll('.btn-check-task').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                const res = this.engine.checkTask(idx);
                
                const allPassed = this.engine.taskResults.every(r => r.status === 'passed');
                if (res.status === 'passed' && allPassed) {
                    this.engine.saveProgress(lab.id, lab.tasks.length, lab.tasks.length);
                    this._showSuccessConfetti();
                }
            });
        });

        this.taskPanel.querySelectorAll('.btn-hint').forEach(btn => {
            btn.addEventListener('click', () => {
                this.engine.getHint(parseInt(btn.dataset.idx));
            });
        });
    }

    _scenarioBriefingHtml(lab) {
        const configs = Object.values(lab.topology?.preConfig || {});
        const scenario = configs.map(config => config.scenarioState).find(Boolean);
        if (!scenario?.ticket) return '';

        return `
            <div class="task-hint" style="margin:0 0 14px 0;">
                <i class="bi bi-ticket-detailed-fill"></i>
                <strong>Ticket:</strong> ${scenario.ticket}
            </div>
        `;
    }

    _attachTaskPanelResize() {
        if (this.cleanupTaskResize) this.cleanupTaskResize();
        const handle = this.taskPanel?.querySelector('.sim-task-panel-resize');
        if (!handle) return;

        let isResizing = false;
        const onMouseDown = (e) => {
            isResizing = true;
            e.preventDefault();
        };
        const onMouseMove = (e) => {
            if (!isResizing || !this.taskPanel) return;
            const width = window.innerWidth - e.clientX;
            if (width > 250 && width < 800) {
                this.taskPanel.style.width = `${width}px`;
            }
        };
        const onMouseUp = () => {
            isResizing = false;
        };

        handle.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        this.cleanupTaskResize = () => {
            handle.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            this.cleanupTaskResize = null;
        };
    }

    _showSuccessConfetti() {
        const duration = 3000;
        const end = Date.now() + duration;

        const frame = () => {
            const conf = document.createElement('div');
            conf.className = 'sim-confetti';
            conf.style.left = Math.random() * 100 + 'vw';
            conf.style.backgroundColor = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722'][Math.floor(Math.random() * 16)];
            document.body.appendChild(conf);

            setTimeout(() => conf.remove(), 2000);

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        };
        frame();

        const successModal = document.createElement('div');
        successModal.className = 'sim-lab-success-modal';
        const review = this._completionReview();
        successModal.innerHTML = `
            <div class="success-content">
                <i class="bi bi-award-fill"></i>
                <h2>Lab Completed!</h2>
                <p>Great job! You've successfully completed all tasks for "${this.engine.currentLab.title}".</p>
                ${review}
                <button class="app-btn app-btn-primary" id="btn-success-close">Awesome</button>
            </div>
        `;
        document.body.appendChild(successModal);
        successModal.querySelector('#btn-success-close').addEventListener('click', () => successModal.remove());
    }

    _completionReview() {
        const lab = this.engine.currentLab;
        if (!lab) return '';
        const configs = Object.values(lab.topology?.preConfig || {});
        const scenario = configs.map(config => config.scenarioState).find(Boolean) || {};
        const commands = [];
        this.engine.graph.nodes.forEach(node => {
            (node.commandHistory || []).slice(-4).forEach(cmd => commands.push(`${node.name}: ${cmd}`));
        });
        const packetCount = this.engine.engine?.packetLog?.length || 0;

        return `
            <div class="lab-review">
                <div class="lab-review-row"><span>Certification</span><strong>${lab.certification || 'Practice'}</strong></div>
                <div class="lab-review-row"><span>Objective Area</span><strong>${lab.category || 'Troubleshooting'}</strong></div>
                ${scenario.fault ? `<div class="lab-review-row"><span>Root Cause</span><strong>${this._prettyFault(scenario.fault)}</strong></div>` : ''}
                <div class="lab-review-row"><span>Tasks Passed</span><strong>${lab.tasks.length}/${lab.tasks.length}</strong></div>
                <div class="lab-review-row"><span>Packets Reviewed</span><strong>${packetCount}</strong></div>
                ${commands.length ? `
                    <div class="lab-review-commands">
                        <strong>Recent Commands</strong>
                        <pre>${this._esc(commands.slice(-6).join('\n'))}</pre>
                    </div>
                ` : ''}
            </div>
        `;
    }

    _prettyFault(fault) {
        return String(fault).replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
    }

    _esc(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}
