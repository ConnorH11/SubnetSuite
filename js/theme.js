const STORAGE_KEY = 'subnetsuite-theme';

export function initTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark') {
        document.body.classList.add('dark-mode');
        updateToggle(true);
    }
}

export function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
    updateToggle(isDark);
}

function updateToggle(isDark) {
    const btn = document.getElementById('darkModeToggle');
    if (!btn) return;
    btn.textContent = isDark ? 'Light Mode' : 'Dark Mode';
}
