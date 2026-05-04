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
    'simulator': () => import('./pages/simulator-page.js'),
    'flashcards': () => import('./pages/flashcards-page.js'),
    'practice-test': () => import('./pages/practice-test-page.js'),
    'publicip': () => import('./pages/public-ip-page.js'),
    'maclookup': () => import('./pages/mac-lookup-page.js'),
    'cheatsheet': () => import('./pages/cheatsheet-page.js'),
    'overlap': () => import('./pages/overlap-page.js'),
    'headers': () => import('./pages/headers-page.js'),
    'bandwidth': () => import('./pages/bandwidth-page.js'),
    'ports': () => import('./pages/ports-page.js'),
    'about': () => import('./pages/about-page.js'),
};

const seoMetadata = {
    '': { title: 'SubnetSuite – Free Network Toolkit & Simulators', desc: 'Master networking with free IPv4/IPv6 calculators, visual topology builders, simulators, and IT certification practice tests.' },
    'subnet': { title: 'IPv4 Subnet Calculator | SubnetSuite', desc: 'Calculate IPv4 subnets, network IDs, broadcast addresses, and usable host ranges instantly.' },
    'vlsm': { title: 'VLSM Calculator | SubnetSuite', desc: 'Variable Length Subnet Mask (VLSM) calculator to efficiently partition an IP address space.' },
    'supernet': { title: 'Supernetting & Route Summarization | SubnetSuite', desc: 'Calculate supernets and summarize multiple IP networks into a single routing prefix.' },
    'ipv6': { title: 'IPv6 Subnet Calculator | SubnetSuite', desc: 'Easily calculate and expand IPv6 subnets, network ranges, and prefixes.' },
    'acl': { title: 'Cisco ACL Generator | SubnetSuite', desc: 'Generate standard and extended Cisco Access Control Lists (ACLs) quickly and easily.' },
    'route': { title: 'Cisco Route Generator | SubnetSuite', desc: 'Generate static routes, OSPF, and EIGRP configurations for Cisco routers.' },
    'binary': { title: 'Binary to Decimal Calculator | SubnetSuite', desc: 'Convert between binary, decimal, and hexadecimal networking values.' },
    'visualizer': { title: 'Network Topology Visualizer | SubnetSuite', desc: 'Build and visualize network topologies interactively.' },
    'simulator': { title: 'Network Simulator | SubnetSuite', desc: 'Practice Cisco and Juniper CLI commands in a virtual network simulation environment.' },
    'flashcards': { title: 'IT Certification Flashcards | SubnetSuite', desc: 'Study for CCNA, Network+, Security+, and JNCIA with spaced-repetition flashcards.' },
    'practice-test': { title: 'IT Certification Practice Tests | SubnetSuite', desc: 'Take realistic practice exams and PBQs for Cisco CCNA, CompTIA Network+, and more.' }
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
        const rawModule = await loader();
        const module = rawModule.default || rawModule;
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
    updateSEO(route);
    window.scrollTo(0, 0);

    const navCollapse = document.getElementById('navContent');
    if (navCollapse && navCollapse.classList.contains('show')) {
        const bsCollapse = bootstrap.Collapse.getInstance(navCollapse);
        if (bsCollapse) bsCollapse.hide();
    }
}

function updateSEO(route) {
    const meta = seoMetadata[route] || { 
        title: 'SubnetSuite – Advanced Network Toolkit', 
        desc: 'Comprehensive suite of free networking calculators, simulators, and study tools.' 
    };
    
    document.title = meta.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', meta.desc);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', meta.title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', meta.desc);
    document.querySelector('meta[property="twitter:title"]')?.setAttribute('content', meta.title);
    document.querySelector('meta[property="twitter:description"]')?.setAttribute('content', meta.desc);
    
    const canonical = document.getElementById('canonical-link');
    if (canonical) {
        canonical.setAttribute('href', 'https://subnetsuite.com/' + (route ? '#/' + route : ''));
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
