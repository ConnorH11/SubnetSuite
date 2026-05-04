import { AVAILABLE_CERTS, loadCertData } from '../data/cert-data-index.js';
import { StudyStore } from '../services/study-store.js';

let currentCert = null;
let activeCards = [];
let currentIndex = 0;
let isFlipped = false;

export default {
    render() {
        return `
<div class="page-header">
    <div class="d-flex justify-content-between align-items-center">
        <div>
            <h2>Spaced Repetition Flashcards</h2>
            <p class="text-muted">Master networking concepts using scientifically proven spaced repetition.</p>
        </div>
        <div id="fc-header-actions"></div>
    </div>
</div>

<div class="fc-container" id="fc-app">
    <div id="fc-dashboard">
        <!-- Dashboard rendered here -->
    </div>

    <div id="fc-config-view" class="d-none">
        <div class="card shadow-sm p-4">
            <h4 class="mb-4"><i class="bi bi-gear-fill me-2"></i>Configure Study Session</h4>
            <h5 id="fc-config-title" class="text-primary mb-3"></h5>
            <div class="mb-4">
                <label class="form-label fw-bold">Select Domains to Study</label>
                <div class="border rounded p-3" id="fc-domain-list" style="max-height: 250px; overflow-y: auto; background: var(--sim-bg-secondary);"></div>
            </div>
            <button class="btn btn-primary btn-lg" id="btn-start-studying">Start Studying</button>
        </div>
    </div>
    
    <div id="fc-study-view" class="d-none">
        <div class="fc-study-header">
            <h4 id="fc-study-title" class="mb-0 text-primary"></h4>
            <div class="fc-stats">
                <span class="fc-stat-new" title="New Cards"><i class="bi bi-asterisk"></i> <span id="fc-count-new">0</span></span>
                <span class="fc-stat-learn" title="Learning"><i class="bi bi-arrow-repeat"></i> <span id="fc-count-learn">0</span></span>
                <span class="fc-stat-review" title="To Review"><i class="bi bi-check-all"></i> <span id="fc-count-review">0</span></span>
            </div>
        </div>

        <div class="fc-card-scene" id="fc-card-scene">
            <div class="fc-card shadow-sm" id="fc-card">
                <div class="fc-card-face fc-card-front">
                    <div class="fc-card-domain" id="fc-card-domain"></div>
                    <div id="fc-card-front-content"></div>
                </div>
                <div class="fc-card-face fc-card-back">
                    <div id="fc-card-back-content"></div>
                </div>
            </div>
        </div>

        <div class="text-center mb-4">
            <button class="btn btn-outline-primary btn-lg px-5" id="btn-show-answer">Show Answer</button>
        </div>

        <div class="fc-controls" id="fc-controls">
            <button class="btn fc-btn fc-btn-again shadow-sm" data-rating="again">
                <span>Again</span><small id="fc-int-again">< 1m</small>
            </button>
            <button class="btn fc-btn fc-btn-hard shadow-sm" data-rating="hard">
                <span>Hard</span><small id="fc-int-hard">5m</small>
            </button>
            <button class="btn fc-btn fc-btn-good shadow-sm" data-rating="good">
                <span>Good</span><small id="fc-int-good">10m</small>
            </button>
            <button class="btn fc-btn fc-btn-easy shadow-sm" data-rating="easy">
                <span>Easy</span><small id="fc-int-easy">4d</small>
            </button>
        </div>
    </div>
    
    <div id="fc-empty-view" class="d-none fc-empty-state">
        <div class="fc-empty-icon"><i class="bi bi-emoji-sunglasses"></i></div>
        <h3>You're all caught up!</h3>
        <p class="text-muted">You have reviewed all scheduled cards for this certification.</p>
        <button class="btn btn-primary mt-3" id="btn-back-dashboard">Back to Dashboard</button>
    </div>
</div>
`;
    },

    init() {
        this.renderDashboard();

        document.getElementById('btn-show-answer')?.addEventListener('click', () => {
            this.flipCard();
        });

        document.querySelectorAll('.fc-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const rating = e.currentTarget.getAttribute('data-rating');
                this.handleRating(rating);
            });
        });

        document.getElementById('btn-back-dashboard')?.addEventListener('click', () => {
            document.getElementById('fc-empty-view').classList.add('d-none');
            this.renderDashboard();
        });

        document.getElementById('btn-start-studying')?.addEventListener('click', () => {
            this.startStudySession();
        });
        
        return () => {
            currentCert = null;
            activeCards = [];
        };
    },

    renderDashboard() {
        const app = document.getElementById('fc-dashboard');
        const studyView = document.getElementById('fc-study-view');
        const configView = document.getElementById('fc-config-view');
        const headerActions = document.getElementById('fc-header-actions');
        
        studyView.classList.add('d-none');
        configView.classList.add('d-none');
        app.classList.remove('d-none');
        
        headerActions.innerHTML = `
            <input type="file" id="fc-import-file" accept=".json" style="display:none;">
            <button class="btn btn-outline-secondary btn-sm me-2" id="btn-fc-import" title="Restore Progress"><i class="bi bi-upload"></i> Restore</button>
            <button class="btn btn-outline-primary btn-sm" id="btn-fc-export" title="Backup Progress"><i class="bi bi-download"></i> Backup</button>
        `;

        document.getElementById('btn-fc-export').addEventListener('click', () => StudyStore.exportData());
        
        const fileInput = document.getElementById('fc-import-file');
        document.getElementById('btn-fc-import').addEventListener('click', () => fileInput.click());
        
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

        let html = '<div class="row">';
        
        AVAILABLE_CERTS.forEach(cert => {
            html += `
            <div class="col-md-6 mb-4">
                <div class="card h-100 shadow-sm fc-cert-card" data-cert="${cert.id}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title text-primary mb-0">${cert.name}</h5>
                            <i class="bi bi-stack" style="font-size: 1.2rem; color: var(--bs-secondary)"></i>
                        </div>
                        <p class="card-text text-muted small mb-4">${cert.description}</p>
                        <button class="btn btn-outline-primary btn-sm w-100 btn-study-cert" data-cert="${cert.id}">Study Now</button>
                    </div>
                </div>
            </div>`;
        });
        
        html += '</div>';
        app.innerHTML = html;

        document.querySelectorAll('.btn-study-cert').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const certId = e.target.getAttribute('data-cert');
                this.showConfigView(certId);
            });
        });
    },

    showConfigView(certId) {
        currentCert = AVAILABLE_CERTS.find(c => c.id === certId);
        if (!currentCert) return;

        document.getElementById('fc-dashboard').classList.add('d-none');
        document.getElementById('fc-config-view').classList.remove('d-none');

        const headerActions = document.getElementById('fc-header-actions');
        headerActions.innerHTML = '<button class="btn btn-outline-secondary btn-sm" id="btn-back-to-dash"><i class="bi bi-arrow-left"></i> Back</button>';
        document.getElementById('btn-back-to-dash').addEventListener('click', () => {
            document.getElementById('fc-config-view').classList.add('d-none');
            this.renderDashboard();
        });

        document.getElementById('fc-config-title').innerText = currentCert.name;
        
        const list = document.getElementById('fc-domain-list');
        list.innerHTML = currentCert.domains.map(d => `
            <div class="form-check mb-2">
                <input class="form-check-input fc-domain-cb" type="checkbox" value="${d.id}" id="fc_dom_${d.id}" checked>
                <label class="form-check-label" for="fc_dom_${d.id}">${d.name}</label>
            </div>
        `).join('');
    },

    async startStudySession() {
        const selectedDomains = Array.from(document.querySelectorAll('.fc-domain-cb:checked')).map(cb => cb.value);
        if (selectedDomains.length === 0) {
            alert('Please select at least one domain to study.');
            return;
        }

        const data = await loadCertData(currentCert.id);
        const allFlashcards = data.flashcards || [];
        
        const flashcards = allFlashcards.filter(f => selectedDomains.includes(f.domain));
        
        const allCardIds = flashcards.map(f => f.id);
        const due = StudyStore.getDueCards(allCardIds);
        
        activeCards = [...due.newCards, ...due.learningCards, ...due.reviewCards].map(id => {
            return flashcards.find(f => f.id === id);
        });

        document.getElementById('fc-config-view').classList.add('d-none');
        
        const headerActions = document.getElementById('fc-header-actions');
        headerActions.innerHTML = '<button class="btn btn-outline-secondary btn-sm" id="btn-exit-study"><i class="bi bi-arrow-left"></i> Exit Session</button>';
        document.getElementById('btn-exit-study').addEventListener('click', () => {
            document.getElementById('fc-study-view').classList.add('d-none');
            this.renderDashboard();
        });

        if (activeCards.length === 0) {
            document.getElementById('fc-study-view').classList.add('d-none');
            document.getElementById('fc-empty-view').classList.remove('d-none');
            return;
        }

        document.getElementById('fc-study-view').classList.remove('d-none');
        document.getElementById('fc-study-title').innerText = currentCert.name;
        
        currentIndex = 0;
        this.updateStats(due);
        this.loadNextCard();
    },

    loadNextCard() {
        if (activeCards.length === 0) {
            document.getElementById('fc-study-view').classList.add('d-none');
            document.getElementById('fc-empty-view').classList.remove('d-none');
            return;
        }

        const cardObj = activeCards[0];
        const cardEl = document.getElementById('fc-card');
        
        cardEl.style.transition = 'none';
        cardEl.classList.remove('is-flipped');
        
        void cardEl.offsetWidth;
        
        cardEl.style.transition = '';
        
        isFlipped = false;
        document.getElementById('btn-show-answer').classList.remove('d-none');
        document.getElementById('fc-controls').classList.remove('show');

        const domainName = currentCert.domains.find(d => d.id === cardObj.domain)?.name || cardObj.domain;
        document.getElementById('fc-card-domain').innerText = domainName;
        document.getElementById('fc-card-front-content').innerHTML = cardObj.front;
        document.getElementById('fc-card-back-content').innerHTML = cardObj.back;

        this.updateIntervalLabels(cardObj.id);
    },

    flipCard() {
        if (isFlipped) return;
        isFlipped = true;
        document.getElementById('fc-card').classList.add('is-flipped');
        document.getElementById('btn-show-answer').classList.add('d-none');
        document.getElementById('fc-controls').classList.add('show');
    },

    handleRating(rating) {
        const cardObj = activeCards.shift(); // Remove from front
        
        const newState = StudyStore.updateCardState(cardObj.id, rating);
        
        if (newState.status === 'learning' || rating === 'again' || rating === 'hard') {
            if (newState.nextReviewDate <= Date.now() + 15 * 60 * 1000) {
                activeCards.push(cardObj);
            }
        }

        const allCardIds = [cardObj.id, ...activeCards.map(c => c.id)];
        const due = StudyStore.getDueCards(allCardIds);
        this.updateStats(due);

        this.loadNextCard();
    },

    updateStats(due) {
        document.getElementById('fc-count-new').innerText = due.newCards.length;
        document.getElementById('fc-count-learn').innerText = due.learningCards.length;
        document.getElementById('fc-count-review').innerText = due.reviewCards.length;
    },

    updateIntervalLabels(cardId) {
        const state = StudyStore.getCardState(cardId);
        
        let againInt = '< 1m';
        let hardInt = '5m';
        let goodInt = '10m';
        let easyInt = '4d';

        if (state.status === 'graduated') {
            const currentInt = state.interval;
            againInt = '< 1m';
            hardInt = this.formatInterval(currentInt * 1.2);
            goodInt = this.formatInterval(currentInt * state.ease);
            easyInt = this.formatInterval(currentInt * state.ease * 1.3);
        } else if (state.status === 'learning' && state.step > 0) {
            goodInt = '1d';
        }

        document.getElementById('fc-int-again').innerText = againInt;
        document.getElementById('fc-int-hard').innerText = hardInt;
        document.getElementById('fc-int-good').innerText = goodInt;
        document.getElementById('fc-int-easy').innerText = easyInt;
    },

    formatInterval(days) {
        if (days < 1) return '1d';
        const d = Math.round(days);
        if (d < 30) return d + 'd';
        const m = Math.round(d / 30);
        if (m < 12) return m + 'mo';
        return Math.round(m / 12) + 'y';
    }
};
