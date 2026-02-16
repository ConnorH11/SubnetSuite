import { initTheme, toggleTheme } from './theme.js';

const routes = {
    '': () => import('./pages/home.js'),
    'subnet': () => import('./pages/subnet-page.js'),
    'vlsm': () => import('./pages/vlsm-page.js'),
    'supernet': () => import('./pages/supernet-page.js'),
    'ipv6': () => import('./pages/ipv6-page.js'),
    'acl': () => import('./pages/acl-page.js'),
    'route': () => import('./pages/route-page.js'),
    'binary': () => import('./pages/binary-page.js'),
    'converter': () => import('./pages/converter-page.js'),
    'visualizer': () => import('./pages/visualizer-page.js'),
    'publicip': () => import('./pages/public-ip-page.js'),
    'maclookup': () => import('./pages/mac-lookup-page.js'),
    'cheatsheet': () => import('./pages/cheatsheet-page.js'),
    'overlap': () => import('./pages/overlap-page.js'),
    'headers': () => import('./pages/headers-page.js'),
    'bandwidth': () => import('./pages/bandwidth-page.js'),
    'ports': () => import('./pages/ports-page.js'),
    'about': () => import('./pages/about-page.js'),
};

let currentCleanup = null;

async function navigateTo(path) {
    const app = document.getElementById('app');
    if (!app) return;

    const route = path.replace(/^#?\/?/, '');
    const loader = routes[route];

    if (!loader) {
        app.innerHTML = `
      <div class="text-center mt-5">
        <h1>404</h1>
        <p>Page not found</p>
        <a href="#/" class="btn btn-primary mt-3">Go Home</a>
      </div>`;
        return;
    }

    if (currentCleanup && typeof currentCleanup === 'function') {
        currentCleanup();
        currentCleanup = null;
    }

    try {
        const module = await loader();
        app.innerHTML = module.render();
        if (module.init) {
            currentCleanup = module.init() || null;
        }
    } catch (err) {
        console.error('Page load error:', err);
        app.innerHTML = `
      <div class="text-center mt-5">
        <h1>Error</h1>
        <p>Failed to load page.</p>
        <a href="#/" class="btn btn-primary mt-3">Go Home</a>
      </div>`;
    }

    updateActiveNav(route);
    window.scrollTo(0, 0);

    // Close mobile nav on route change
    const navCollapse = document.getElementById('navContent');
    if (navCollapse && navCollapse.classList.contains('show')) {
        const bsCollapse = bootstrap.Collapse.getInstance(navCollapse);
        if (bsCollapse) bsCollapse.hide();
    }
}

function updateActiveNav(route) {
    document.querySelectorAll('[data-route]').forEach(link => {
        if (link.getAttribute('data-route') === route) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

function onHashChange() {
    navigateTo(window.location.hash || '#/');
}

function init() {
    initTheme();

    const darkBtn = document.getElementById('darkModeToggle');
    if (darkBtn) darkBtn.addEventListener('click', toggleTheme);

    window.addEventListener('hashchange', onHashChange);
    onHashChange();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
