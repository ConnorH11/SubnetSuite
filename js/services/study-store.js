export const StudyStore = {
    FC_PROGRESS_KEY: 'subnetsuite_fc_progress',
    PT_HISTORY_KEY: 'subnetsuite_pt_history',

    // --- Flashcards ---
    getFlashcardProgress() {
        return JSON.parse(localStorage.getItem(this.FC_PROGRESS_KEY)) || {};
    },
    
    saveFlashcardProgress(progress) {
        localStorage.setItem(this.FC_PROGRESS_KEY, JSON.stringify(progress));
    },

    getCardState(cardId) {
        const progress = this.getFlashcardProgress();
        return progress[cardId] || {
            status: 'new', // 'new', 'learning', 'graduated'
            step: 0,
            ease: 2.5,
            interval: 0,
            nextReviewDate: 0
        };
    },

    updateCardState(cardId, rating) {
        const state = this.getCardState(cardId);
        const now = Date.now();
        const MINUTE = 60 * 1000;
        const DAY = 24 * 60 * 60 * 1000;
        
        if (state.status === 'new' || state.status === 'learning') {
            state.status = 'learning';
            if (rating === 'again') {
                state.step = 0;
                state.nextReviewDate = now + (1 * MINUTE);
            } else if (rating === 'hard') {
                state.nextReviewDate = now + (5 * MINUTE);
            } else if (rating === 'good') {
                if (state.step === 0) {
                    state.step = 1;
                    state.nextReviewDate = now + (10 * MINUTE);
                } else {
                    state.status = 'graduated';
                    state.interval = 1;
                    state.nextReviewDate = now + (1 * DAY);
                }
            } else if (rating === 'easy') {
                state.status = 'graduated';
                state.interval = 4;
                state.nextReviewDate = now + (4 * DAY);
            }
        } else {
            if (rating === 'again') {
                state.status = 'learning';
                state.step = 0;
                state.ease = Math.max(1.3, state.ease - 0.2);
                state.interval = 0;
                state.nextReviewDate = now + (1 * MINUTE);
            } else if (rating === 'hard') {
                state.ease = Math.max(1.3, state.ease - 0.15);
                state.interval = state.interval * 1.2;
                state.nextReviewDate = now + (state.interval * DAY);
            } else if (rating === 'good') {
                state.interval = state.interval * state.ease;
                state.nextReviewDate = now + (state.interval * DAY);
            } else if (rating === 'easy') {
                state.ease += 0.15;
                state.interval = state.interval * state.ease * 1.3;
                state.nextReviewDate = now + (state.interval * DAY);
            }
        }

        const progress = this.getFlashcardProgress();
        progress[cardId] = state;
        this.saveFlashcardProgress(progress);
        
        return state;
    },

    getDueCards(allCardIds) {
        const progress = this.getFlashcardProgress();
        const now = Date.now();
        const newCards = [];
        const learningCards = [];
        const reviewCards = [];

        for (const id of allCardIds) {
            const state = progress[id];
            if (!state) {
                newCards.push(id);
            } else if (state.nextReviewDate <= now) {
                if (state.status === 'learning') {
                    learningCards.push(id);
                } else if (state.status === 'graduated') {
                    reviewCards.push(id);
                }
            }
        }

        return { newCards, learningCards, reviewCards };
    },

    // --- Practice Tests ---
    getTestHistory() {
        return JSON.parse(localStorage.getItem(this.PT_HISTORY_KEY)) || [];
    },
    
    saveTestResult(result) {
        const history = this.getTestHistory();
        history.push({
            id: Date.now().toString(),
            date: new Date().toISOString(),
            ...result
        });
        localStorage.setItem(this.PT_HISTORY_KEY, JSON.stringify(history));
    },

    // --- Data Management (Backup/Restore) ---
    exportData() {
        const data = {
            flashcards: this.getFlashcardProgress(),
            practiceTests: this.getTestHistory()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `subnetsuite_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.flashcards) {
                localStorage.setItem(this.FC_PROGRESS_KEY, JSON.stringify(data.flashcards));
            }
            if (data.practiceTests) {
                localStorage.setItem(this.PT_HISTORY_KEY, JSON.stringify(data.practiceTests));
            }
            return true;
        } catch (e) {
            console.error('Failed to import data:', e);
            return false;
        }
    }
};
