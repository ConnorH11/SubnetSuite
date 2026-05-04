import { AVAILABLE_CERTS, loadCertData } from '../data/cert-data-index.js';
import { StudyStore } from '../services/study-store.js';

let currentCert = null;
let allQuestions = [];
let testQuestions = [];
let userAnswers = {};
let flaggedQuestions = new Set();
let currentIdx = 0;
let gradingMode = 'end'; // 'instant' or 'end'
let isReviewMode = false;

export default {
    render() {
        return `
<div class="page-header">
    <div class="d-flex justify-content-between align-items-center">
        <div>
            <h2>Practice Tests</h2>
            <p class="text-muted">Test your knowledge with realistic multiple-choice and PBQ scenarios.</p>
        </div>
        <div id="pt-header-actions"></div>
    </div>
</div>

<div class="pt-container" id="pt-app">
    <!-- Config View -->
    <div id="pt-config-view">
        <div class="pt-config-panel">
            <h4 class="mb-4"><i class="bi bi-gear-fill me-2"></i>Configure Exam</h4>
            
            <div class="row mb-4">
                <div class="col-md-6">
                    <label class="form-label fw-bold">Select Certification</label>
                    <select class="form-select" id="pt-cert-select">
                        <option value="">-- Choose a Cert --</option>
                        ${AVAILABLE_CERTS.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label fw-bold">Number of Questions</label>
                    <input type="number" class="form-control" id="pt-q-count" value="10" min="1" max="90">
                </div>
                <div class="col-md-3">
                    <label class="form-label fw-bold">Grading Mode</label>
                    <select class="form-select" id="pt-mode-select">
                        <option value="end">Grade at End</option>
                        <option value="instant">Instant Grading</option>
                    </select>
                </div>
            </div>

            <div class="mb-4" id="pt-domain-container" style="display:none;">
                <label class="form-label fw-bold">Select Exam Topics (Domains)</label>
                <div class="pt-domain-list" id="pt-domain-list"></div>
            </div>

            <button class="btn btn-primary btn-lg" id="btn-start-test" disabled>Start Practice Test</button>
        </div>
    </div>

    <!-- Exam View -->
    <div id="pt-exam-view" class="d-none">
        <div class="pt-exam-layout">
            <div class="pt-sidebar">
                <div class="pt-sidebar-header">
                    <span id="pt-progress-text">Question 1 of 10</span>
                </div>
                <div class="pt-nav-grid" id="pt-nav-grid"></div>
            </div>
            
            <div class="pt-main">
                <div class="pt-header">
                    <div>
                        <span class="badge bg-secondary me-2" id="pt-domain-badge">Domain</span>
                        <span class="badge bg-primary" id="pt-type-badge">Multiple Choice</span>
                    </div>
                    <button class="btn btn-outline-warning btn-sm" id="btn-flag"><i class="bi bi-flag"></i> Flag for Review</button>
                </div>
                
                <div class="pt-content">
                    <h5 id="pt-q-text" class="mb-4"></h5>
                    <div id="pt-options-container"></div>
                    <div id="pt-explanation-container" class="pt-explanation d-none"></div>
                </div>
                
                <div class="pt-footer">
                    <button class="btn btn-outline-secondary" id="btn-prev-q">Previous</button>
                    <div>
                        <button class="btn btn-info me-2 d-none" id="btn-grade-instant">Check Answer</button>
                        <button class="btn btn-primary" id="btn-next-q">Next</button>
                        <button class="btn btn-success d-none" id="btn-submit-exam">Submit Exam</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Results View -->
    <div id="pt-results-view" class="d-none">
        <div class="pt-result-card shadow-sm">
            <div class="pt-score-circle" id="pt-score-circle">
                <h2 id="pt-score-pct">0%</h2>
                <span id="pt-score-text">0 / 0</span>
            </div>
            <h3 id="pt-result-title" class="mb-3"></h3>
            <p class="text-muted" id="pt-result-msg"></p>
            <div class="mt-4">
                <button class="btn btn-primary me-2" id="btn-review-exam">Review Answers</button>
                <button class="btn btn-outline-secondary" id="btn-new-exam">Take Another Test</button>
            </div>
        </div>
    </div>
</div>
`;
    },

    init() {
        document.getElementById('pt-cert-select')?.addEventListener('change', async (e) => {
            const certId = e.target.value;
            const domainContainer = document.getElementById('pt-domain-container');
            const startBtn = document.getElementById('btn-start-test');
            
            if (!certId) {
                domainContainer.style.display = 'none';
                startBtn.disabled = true;
                return;
            }

            currentCert = AVAILABLE_CERTS.find(c => c.id === certId);
            const data = await loadCertData(certId);
            allQuestions = data.questions || [];

            this.renderDomainList();
            domainContainer.style.display = 'block';
            startBtn.disabled = false;
        });

        document.getElementById('btn-start-test')?.addEventListener('click', () => this.startTest());

        document.getElementById('btn-prev-q')?.addEventListener('click', () => this.navigateQ(-1));
        document.getElementById('btn-next-q')?.addEventListener('click', () => this.navigateQ(1));
        document.getElementById('btn-flag')?.addEventListener('click', () => this.toggleFlag());
        document.getElementById('btn-grade-instant')?.addEventListener('click', () => this.gradeInstant());
        document.getElementById('btn-submit-exam')?.addEventListener('click', () => this.submitExam());

        document.getElementById('btn-review-exam')?.addEventListener('click', () => this.startReviewMode());
        document.getElementById('btn-new-exam')?.addEventListener('click', () => {
            document.getElementById('pt-results-view').classList.add('d-none');
            document.getElementById('pt-config-view').classList.remove('d-none');
            this.renderHeaderActions();
        });

        this.renderHeaderActions();

        return () => {
            currentCert = null;
            allQuestions = [];
            testQuestions = [];
        };
    },

    renderHeaderActions() {
        const headerActions = document.getElementById('pt-header-actions');
        headerActions.innerHTML = `
            <input type="file" id="pt-import-file" accept=".json" style="display:none;">
            <button class="btn btn-outline-secondary btn-sm me-2" id="btn-pt-import" title="Restore Progress"><i class="bi bi-upload"></i> Restore</button>
            <button class="btn btn-outline-primary btn-sm" id="btn-pt-export" title="Backup Progress"><i class="bi bi-download"></i> Backup</button>
        `;

        document.getElementById('btn-pt-export').addEventListener('click', () => StudyStore.exportData());
        
        const fileInput = document.getElementById('pt-import-file');
        document.getElementById('btn-pt-import').addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (StudyStore.importData(ev.target.result)) {
                    alert('Progress restored successfully!');
                } else {
                    alert('Failed to restore progress. Invalid file format.');
                }
                fileInput.value = '';
            };
            reader.readAsText(file);
        });
    },

    renderDomainList() {
        const list = document.getElementById('pt-domain-list');
        list.innerHTML = currentCert.domains.map(d => `
            <div class="form-check mb-2">
                <input class="form-check-input pt-domain-cb" type="checkbox" value="${d.id}" id="dom_${d.id}" checked>
                <label class="form-check-label" for="dom_${d.id}">${d.name}</label>
            </div>
        `).join('');
    },

    startTest() {
        const selectedDomains = Array.from(document.querySelectorAll('.pt-domain-cb:checked')).map(cb => cb.value);
        if (selectedDomains.length === 0) {
            alert('Please select at least one exam topic.');
            return;
        }

        let filteredQs = allQuestions.filter(q => selectedDomains.includes(q.domain));
        if (filteredQs.length === 0) {
            alert('No questions available for the selected domains.');
            return;
        }

        filteredQs = filteredQs.sort(() => Math.random() - 0.5);
        const count = parseInt(document.getElementById('pt-q-count').value) || 10;
        testQuestions = filteredQs.slice(0, count);
        
        gradingMode = document.getElementById('pt-mode-select').value;
        userAnswers = {};
        flaggedQuestions.clear();
        currentIdx = 0;
        isReviewMode = false;

        document.getElementById('pt-config-view').classList.add('d-none');
        document.getElementById('pt-exam-view').classList.remove('d-none');
        
        const headerActions = document.getElementById('pt-header-actions');
        headerActions.innerHTML = '<button class="btn btn-outline-danger btn-sm" id="btn-quit-test"><i class="bi bi-x-circle"></i> Quit Test</button>';
        document.getElementById('btn-quit-test').addEventListener('click', () => {
            if (confirm('Are you sure you want to quit? Your progress will be lost.')) {
                document.getElementById('pt-exam-view').classList.add('d-none');
                document.getElementById('pt-config-view').classList.remove('d-none');
                this.renderHeaderActions();
            }
        });

        this.renderNavGrid();
        this.loadQuestion();
    },

    renderNavGrid() {
        const grid = document.getElementById('pt-nav-grid');
        grid.innerHTML = testQuestions.map((_, i) => `
            <button class="pt-nav-btn ${i === currentIdx ? 'active' : ''} ${userAnswers[i] ? 'answered' : ''} ${flaggedQuestions.has(i) ? 'flagged' : ''}" data-idx="${i}">
                ${i + 1}
            </button>
        `).join('');

        document.querySelectorAll('.pt-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                currentIdx = parseInt(e.target.getAttribute('data-idx'));
                this.loadQuestion();
            });
        });
    },

    loadQuestion() {
        const q = testQuestions[currentIdx];
        document.getElementById('pt-progress-text').innerText = `Question ${currentIdx + 1} of ${testQuestions.length}`;
        document.getElementById('pt-domain-badge').innerText = `Domain ${q.domain}`;
        document.getElementById('pt-type-badge').innerText = q.type === 'pbq' ? 'Performance Based' : 'Multiple Choice';
        document.getElementById('pt-q-text').innerText = q.text;
        
        const expContainer = document.getElementById('pt-explanation-container');
        expContainer.classList.add('d-none');
        expContainer.innerHTML = '';

        const flagBtn = document.getElementById('btn-flag');
        if (flaggedQuestions.has(currentIdx)) {
            flagBtn.classList.replace('btn-outline-warning', 'btn-warning');
        } else {
            flagBtn.classList.replace('btn-warning', 'btn-outline-warning');
        }

        document.getElementById('btn-prev-q').disabled = currentIdx === 0;
        const isLast = currentIdx === testQuestions.length - 1;
        document.getElementById('btn-next-q').classList.toggle('d-none', isLast && !isReviewMode);
        document.getElementById('btn-submit-exam').classList.toggle('d-none', !isLast || isReviewMode);
        
        const instantBtn = document.getElementById('btn-grade-instant');
        if (gradingMode === 'instant' && !isReviewMode) {
            instantBtn.classList.remove('d-none');
        } else {
            instantBtn.classList.add('d-none');
        }

        this.renderOptions(q);
        this.renderNavGrid(); // update active state
    },

    renderOptions(q) {
        const container = document.getElementById('pt-options-container');
        let html = '';
        
        const savedAnswer = userAnswers[currentIdx] || (q.type === 'pbq' ? {} : []);

        if (q.type === 'pbq') {
            html += '<div class="pt-pbq-container">';
            q.matchLabels.forEach(label => {
                const selectedVal = savedAnswer[label] || '';
                html += `
                <div class="pt-pbq-slot">
                    <strong>${label}</strong>
                    <select class="form-select form-select-sm pt-pbq-select" data-label="${label}" ${isReviewMode ? 'disabled' : ''}>
                        <option value="">-- Select Match --</option>
                        ${q.options.map(opt => `<option value="${opt}" ${selectedVal === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                    </select>
                </div>`;
            });
            html += '</div>';
            container.innerHTML = html;

            if (!isReviewMode) {
                container.querySelectorAll('select').forEach(sel => {
                    sel.addEventListener('change', () => {
                        const ansObj = userAnswers[currentIdx] || {};
                        ansObj[sel.getAttribute('data-label')] = sel.value;
                        userAnswers[currentIdx] = ansObj;
                        this.renderNavGrid();
                    });
                });
            }
        } else {
            const isMulti = q.answer.length > 1;
            const inputType = isMulti ? 'checkbox' : 'radio';
            
            q.options.forEach((opt, i) => {
                const isChecked = savedAnswer.includes(opt);
                html += `
                <label class="pt-option ${isChecked ? 'selected' : ''} ${this.getReviewClass(q, opt)}">
                    <input type="${inputType}" name="q_opt" value="${opt}" ${isChecked ? 'checked' : ''} ${isReviewMode ? 'disabled' : ''}>
                    <span>${opt}</span>
                </label>`;
            });
            container.innerHTML = html;

            if (!isReviewMode) {
                container.querySelectorAll('input').forEach(input => {
                    input.addEventListener('change', () => {
                        if (isMulti) {
                            const checked = Array.from(container.querySelectorAll('input:checked')).map(el => el.value);
                            userAnswers[currentIdx] = checked;
                        } else {
                            userAnswers[currentIdx] = [input.value];
                        }
                        container.querySelectorAll('.pt-option').forEach(optEl => {
                            optEl.classList.toggle('selected', optEl.querySelector('input').checked);
                        });
                        this.renderNavGrid();
                    });
                });
            }
        }

        if (isReviewMode || (gradingMode === 'instant' && this.hasGradedInstant[currentIdx])) {
            this.showExplanation(q);
        }
    },

    getReviewClass(q, opt) {
        if (!isReviewMode && !(gradingMode === 'instant' && this.hasGradedInstant[currentIdx])) return '';
        const isCorrectOpt = q.answer.includes(opt);
        const savedAnswer = userAnswers[currentIdx] || [];
        const isSelected = savedAnswer.includes(opt);

        if (isCorrectOpt) return 'correct';
        if (isSelected && !isCorrectOpt) return 'incorrect';
        return '';
    },

    navigateQ(dir) {
        currentIdx += dir;
        this.loadQuestion();
    },

    toggleFlag() {
        if (flaggedQuestions.has(currentIdx)) {
            flaggedQuestions.delete(currentIdx);
        } else {
            flaggedQuestions.add(currentIdx);
        }
        const flagBtn = document.getElementById('btn-flag');
        flagBtn.classList.toggle('btn-warning');
        flagBtn.classList.toggle('btn-outline-warning');
        this.renderNavGrid();
    },

    hasGradedInstant: {},

    gradeInstant() {
        if (!userAnswers[currentIdx] || (Array.isArray(userAnswers[currentIdx]) && userAnswers[currentIdx].length === 0)) {
            alert('Please select an answer first.');
            return;
        }
        if (!this.hasGradedInstant) this.hasGradedInstant = {};
        this.hasGradedInstant[currentIdx] = true;
        this.loadQuestion(); // Reload to show styling and explanation
        document.getElementById('btn-grade-instant').disabled = true;
    },

    showExplanation(q) {
        const expContainer = document.getElementById('pt-explanation-container');
        expContainer.classList.remove('d-none');
        
        let correctHtml = '';
        if (q.type === 'pbq') {
            correctHtml = '<strong>Correct Matches:</strong><ul>' + 
                Object.entries(q.answer).map(([k,v]) => `<li>${k} &rarr; ${v}</li>`).join('') + '</ul>';
        } else {
            correctHtml = '<strong>Correct Answer:</strong> ' + q.answer.join(', ');
        }

        expContainer.innerHTML = `
            ${correctHtml}
            <div class="mt-2"><strong>Explanation:</strong> ${q.explanation}</div>
        `;
    },

    submitExam() {
        if (!isReviewMode) {
            const unanswered = testQuestions.length - Object.keys(userAnswers).length;
            if (unanswered > 0) {
                if (!confirm(`You have ${unanswered} unanswered questions. Submit anyway?`)) return;
            }
        }

        let score = 0;
        testQuestions.forEach((q, i) => {
            const ans = userAnswers[i];
            if (!ans) return;

            if (q.type === 'pbq') {
                let correctCount = 0;
                let totalCount = Object.keys(q.answer).length;
                for (let key in q.answer) {
                    if (ans[key] === q.answer[key]) correctCount++;
                }
                if (correctCount === totalCount) score++; // Strictly all or nothing for simplicity
            } else {
                if (ans.length === q.answer.length && ans.every(a => q.answer.includes(a))) {
                    score++;
                }
            }
        });

        const pct = Math.round((score / testQuestions.length) * 100);
        
        document.getElementById('pt-exam-view').classList.add('d-none');
        document.getElementById('pt-results-view').classList.remove('d-none');
        document.getElementById('pt-header-actions').innerHTML = '';

        document.getElementById('pt-score-pct').innerText = `${pct}%`;
        document.getElementById('pt-score-text').innerText = `${score} / ${testQuestions.length}`;
        
        const circle = document.getElementById('pt-score-circle');
        const title = document.getElementById('pt-result-title');
        const msg = document.getElementById('pt-result-msg');

        if (pct >= 80) {
            circle.style.borderColor = 'var(--bs-success)';
            title.innerText = 'Pass!';
            title.className = 'mb-3 text-success';
            msg.innerText = 'Great job! You have demonstrated a solid understanding of these topics.';
        } else {
            circle.style.borderColor = 'var(--bs-danger)';
            title.innerText = 'Keep Studying';
            title.className = 'mb-3 text-danger';
            msg.innerText = 'You did not reach the 80% passing threshold. Review your answers and try again.';
        }

        StudyStore.saveTestResult({
            cert: currentCert.id,
            score: score,
            total: testQuestions.length,
            pct: pct
        });
    },

    startReviewMode() {
        isReviewMode = true;
        currentIdx = 0;
        document.getElementById('pt-results-view').classList.add('d-none');
        document.getElementById('pt-exam-view').classList.remove('d-none');
        
        const headerActions = document.getElementById('pt-header-actions');
        headerActions.innerHTML = '<button class="btn btn-outline-primary btn-sm" id="btn-back-results"><i class="bi bi-arrow-left"></i> Back to Results</button>';
        document.getElementById('btn-back-results').addEventListener('click', () => {
            document.getElementById('pt-exam-view').classList.add('d-none');
            document.getElementById('pt-results-view').classList.remove('d-none');
            headerActions.innerHTML = '';
        });

        this.loadQuestion();
    }
};
