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
    'converter': { title: 'Base Converter | SubnetSuite', desc: 'Convert numbers between binary, octal, decimal, and hexadecimal bases for networking and computer science.' },
    'visualizer': { title: 'Network Topology Visualizer | SubnetSuite', desc: 'Build and visualize network topologies interactively.' },
    'simulator': { title: 'Network Simulator | SubnetSuite', desc: 'Practice Cisco and Juniper CLI commands in a virtual network simulation environment.' },
    'flashcards': { title: 'IT Certification Flashcards | SubnetSuite', desc: 'Study for CCNA, Network+, Security+, and JNCIA with spaced-repetition flashcards.' },
    'practice-test': { title: 'IT Certification Practice Tests | SubnetSuite', desc: 'Take realistic practice exams and PBQs for Cisco CCNA, CompTIA Network+, and more.' },
    'publicip': { title: 'Public IP Checker | SubnetSuite', desc: 'Check your current public IPv4 and IPv6 address, ISP, location, and network details instantly.' },
    'maclookup': { title: 'MAC Vendor Lookup | SubnetSuite', desc: 'Lookup MAC address vendor, OUI, and manufacturer details instantly using our comprehensive database.' },
    'cheatsheet': { title: 'Subnetting Cheat Sheet | SubnetSuite', desc: 'Quick reference subnetting cheat sheet for IPv4 CIDR block sizes, wildcard masks, and usable host counts.' },
    'overlap': { title: 'CIDR Overlap Checker | SubnetSuite', desc: 'Check for overlapping IP subnets and CIDR blocks to prevent routing conflicts in your network design.' },
    'headers': { title: 'Packet Headers Reference | SubnetSuite', desc: 'Interactive reference diagrams for IPv4, IPv6, TCP, UDP, and Ethernet packet headers and fields.' },
    'bandwidth': { title: 'Bandwidth Calculator | SubnetSuite', desc: 'Calculate network bandwidth, file download/upload times, and data transfer rates across different connection speeds.' },
    'ports': { title: 'Common Network Ports Reference | SubnetSuite', desc: 'Searchable directory of common TCP and UDP network ports, protocols, and services for IT networking.' },
    'about': { title: 'About SubnetSuite | Free Network Toolkit', desc: 'Learn about SubnetSuite, our mission to provide high-quality free networking tools, calculators, and simulators.' }
};

let currentCleanup = null;

async function navigateTo(path) {
    const app = document.getElementById('app');
    if (!app) return;

    let route = path.replace(/^\/+/, '').replace(/\/index\.html$/, '').replace(/\/+$/, '');
    if (route === 'index.html') route = '';

    route = route.toLowerCase();
    const legacyMap = {
        'ipsubnet': 'subnet',
        'routegenerator': 'route',
        'maclookup': 'maclookup',
        'binarycalc': 'binary',
        'publicip': 'publicip',
        'supernetting': 'supernet',
        'aclgenerator': 'acl',
        'pingtraceroute': 'publicip'
    };
    if (legacyMap[route]) {
        route = legacyMap[route];
        history.replaceState(null, '', '/' + route + '/');
    }

    const loader = routes[route];

    if (!loader) {
        app.innerHTML = `
      <div class="text-center mt-5">
        <h1>404</h1>
        <p>Page not found</p>
        <a href="/" class="btn btn-primary mt-3" data-route="">Go Home</a>
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
        <a href="/" class="btn btn-primary mt-3" data-route="">Go Home</a>
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
        const canonicalUrl = route ? `https://subnetsuite.com/${route}/` : 'https://subnetsuite.com/';
        canonical.setAttribute('href', canonicalUrl);
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

function onPopState() {
    navigateTo(window.location.pathname);
}

function handleLinkClicks(e) {
    const link = e.target.closest('a');
    if (!link || !link.href) return;
    
    // Check if it's an internal route link
    if (link.hasAttribute('data-route') || link.href.startsWith(window.location.origin)) {
        // Exclude external links, new tabs, or anchor links that don't match the SPA pattern
        if (link.getAttribute('target') === '_blank' || link.getAttribute('rel') === 'external') return;
        
        e.preventDefault();
        const url = new URL(link.href);
        if (window.location.pathname !== url.pathname) {
            history.pushState(null, '', url.pathname);
            navigateTo(url.pathname);
        }
    }
}

function init() {
    initTheme();

    const darkBtn = document.getElementById('darkModeToggle');
    if (darkBtn) darkBtn.addEventListener('click', toggleTheme);

    window.addEventListener('popstate', onPopState);
    document.body.addEventListener('click', handleLinkClicks);
    
    onPopState();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
