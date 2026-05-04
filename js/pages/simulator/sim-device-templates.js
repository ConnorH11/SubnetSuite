// sim-device-templates.js
// Device template definitions for all vendors and models

export const VENDORS = {
    cisco: { name: 'Cisco', color: '#049fd9', accent: '#005073' },
    juniper: { name: 'Juniper', color: '#84b135', accent: '#3e6617' },
    arista: { name: 'Arista', color: '#4a90d9', accent: '#2a5a8a' },
    generic: { name: 'Generic', color: '#6c757d', accent: '#495057' }
};

export const CABLE_TYPES = {
    copper_straight: { name: 'Copper Straight-Through', color: '#4caf50', dash: 'none', speed: '1Gbps' },
    copper_crossover: { name: 'Copper Crossover', color: '#ff9800', dash: '8,4', speed: '1Gbps' },
    fiber: { name: 'Fiber', color: '#00bcd4', dash: 'none', speed: '10Gbps' },
    serial: { name: 'Serial', color: '#9c27b0', dash: '12,4', speed: '1.544Mbps' },
    console: { name: 'Console', color: '#607d8b', dash: '4,4', speed: 'N/A' }
};

function genMac() {
    const hex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
    return `00:${hex()}:${hex()}:${hex()}:${hex()}:${hex()}`;
}

function makeInterfaces(defs) {
    const ifaces = {};
    for (const d of defs) {
        const base = { ip: '', subnet: '', mac: genMac(), state: d.state || 'up', speed: d.speed || 'auto', duplex: 'auto', description: '' };
        if (d.isSwitch) {
            base.switchportMode = 'access'; // access | trunk
            base.accessVlan = 1;
            base.trunkAllowed = 'all';
            base.stpState = 'forwarding';
            delete base.ip;
            delete base.subnet;
        }
        if (d.vlan !== undefined) base.accessVlan = d.vlan;
        ifaces[d.name] = { ...base, ...d.extra };
    }
    return ifaces;
}

// ═══════════════════════════════════════════════════
// CISCO DEVICES
// ═══════════════════════════════════════════════════

const ciscoRouter4321 = {
    vendor: 'cisco',
    model: 'ISR 4321',
    type: 'router',
    icon: 'bi-router',
    cliType: 'cisco',
    features: ['routing', 'nat', 'acl', 'dhcp', 'ospf', 'eigrp', 'bgp', 'static_routing'],
    hasWebUI: false,
    interfaces: () => makeInterfaces([
        { name: 'GigabitEthernet0/0/0', state: 'down', speed: '1000' },
        { name: 'GigabitEthernet0/0/1', state: 'down', speed: '1000' },
        { name: 'GigabitEthernet0/0/2', state: 'down', speed: '1000' },
        { name: 'GigabitEthernet0/0/3', state: 'down', speed: '1000' },
        { name: 'Serial0/1/0', state: 'down', speed: '1544', extra: { clockRate: '', encapsulation: 'hdlc' } },
        { name: 'Serial0/1/1', state: 'down', speed: '1544', extra: { clockRate: '', encapsulation: 'hdlc' } },
    ]),
    portShortcuts: {
        'g0/0/0': 'GigabitEthernet0/0/0', 'g0/0/1': 'GigabitEthernet0/0/1',
        'g0/0/2': 'GigabitEthernet0/0/2', 'g0/0/3': 'GigabitEthernet0/0/3',
        'gi0/0/0': 'GigabitEthernet0/0/0', 'gi0/0/1': 'GigabitEthernet0/0/1',
        'gi0/0/2': 'GigabitEthernet0/0/2', 'gi0/0/3': 'GigabitEthernet0/0/3',
        's0/1/0': 'Serial0/1/0', 's0/1/1': 'Serial0/1/1',
        'se0/1/0': 'Serial0/1/0', 'se0/1/1': 'Serial0/1/1',
    }
};

const ciscoRouter2901 = {
    vendor: 'cisco',
    model: 'ISR 2901',
    type: 'router',
    icon: 'bi-router',
    cliType: 'cisco',
    features: ['routing', 'nat', 'acl', 'dhcp', 'ospf', 'eigrp', 'static_routing'],
    hasWebUI: false,
    interfaces: () => makeInterfaces([
        { name: 'GigabitEthernet0/0', state: 'down', speed: '1000' },
        { name: 'GigabitEthernet0/1', state: 'down', speed: '1000' },
        { name: 'Serial0/0/0', state: 'down', speed: '1544', extra: { clockRate: '', encapsulation: 'hdlc' } },
        { name: 'Serial0/0/1', state: 'down', speed: '1544', extra: { clockRate: '', encapsulation: 'hdlc' } },
    ]),
    portShortcuts: {
        'g0/0': 'GigabitEthernet0/0', 'g0/1': 'GigabitEthernet0/1',
        'gi0/0': 'GigabitEthernet0/0', 'gi0/1': 'GigabitEthernet0/1',
        's0/0/0': 'Serial0/0/0', 's0/0/1': 'Serial0/0/1',
        'se0/0/0': 'Serial0/0/0', 'se0/0/1': 'Serial0/0/1',
    }
};

const ciscoSwitch2960 = {
    vendor: 'cisco',
    model: 'Catalyst 2960',
    type: 'switch',
    icon: 'bi-hdd-network',
    cliType: 'cisco',
    features: ['switching', 'vlan', 'stp', 'port_security', 'etherchannel'],
    hasWebUI: true,
    interfaces: () => makeInterfaces([
        ...Array.from({ length: 24 }, (_, i) => ({
            name: `FastEthernet0/${i + 1}`,
            isSwitch: true,
            speed: '100'
        })),
        { name: 'GigabitEthernet0/1', isSwitch: true, speed: '1000' },
        { name: 'GigabitEthernet0/2', isSwitch: true, speed: '1000' },
    ]),
    portShortcuts: (() => {
        const m = {};
        for (let i = 1; i <= 24; i++) {
            m[`f0/${i}`] = `FastEthernet0/${i}`;
            m[`fa0/${i}`] = `FastEthernet0/${i}`;
        }
        m['g0/1'] = 'GigabitEthernet0/1'; m['g0/2'] = 'GigabitEthernet0/2';
        m['gi0/1'] = 'GigabitEthernet0/1'; m['gi0/2'] = 'GigabitEthernet0/2';
        return m;
    })(),
    sviInterfaces: () => ({ 'Vlan1': { ip: '', subnet: '', mac: genMac(), state: 'up', description: '' } })
};

const ciscoSwitch3560 = {
    vendor: 'cisco',
    model: 'Catalyst 3560',
    type: 'l3switch',
    icon: 'bi-hdd-network-fill',
    cliType: 'cisco',
    features: ['switching', 'routing', 'vlan', 'stp', 'ospf', 'eigrp', 'dhcp', 'etherchannel', 'ip_routing'],
    hasWebUI: true,
    interfaces: () => makeInterfaces([
        ...Array.from({ length: 24 }, (_, i) => ({
            name: `FastEthernet0/${i + 1}`,
            isSwitch: true,
            speed: '100'
        })),
        { name: 'GigabitEthernet0/1', isSwitch: true, speed: '1000' },
        { name: 'GigabitEthernet0/2', isSwitch: true, speed: '1000' },
    ]),
    portShortcuts: (() => {
        const m = {};
        for (let i = 1; i <= 24; i++) {
            m[`f0/${i}`] = `FastEthernet0/${i}`;
            m[`fa0/${i}`] = `FastEthernet0/${i}`;
        }
        m['g0/1'] = 'GigabitEthernet0/1'; m['g0/2'] = 'GigabitEthernet0/2';
        m['gi0/1'] = 'GigabitEthernet0/1'; m['gi0/2'] = 'GigabitEthernet0/2';
        return m;
    })(),
    sviInterfaces: () => ({ 'Vlan1': { ip: '', subnet: '', mac: genMac(), state: 'up', description: '' } })
};

const ciscoSwitch3850 = {
    vendor: 'cisco',
    model: 'Catalyst 3850',
    type: 'l3switch',
    icon: 'bi-hdd-network-fill',
    cliType: 'cisco',
    features: ['switching', 'routing', 'vlan', 'stp', 'ospf', 'eigrp', 'acl', 'dhcp', 'port_security', 'etherchannel', 'ip_routing'],
    hasWebUI: true,
    interfaces: () => makeInterfaces([
        ...Array.from({ length: 24 }, (_, i) => ({
            name: `GigabitEthernet1/0/${i + 1}`,
            isSwitch: true,
            speed: '1000'
        })),
        { name: 'TenGigabitEthernet1/1/1', isSwitch: true, speed: '10000' },
        { name: 'TenGigabitEthernet1/1/2', isSwitch: true, speed: '10000' },
    ]),
    portShortcuts: (() => {
        const m = {};
        for (let i = 1; i <= 24; i++) {
            m[`g1/0/${i}`] = `GigabitEthernet1/0/${i}`;
            m[`gi1/0/${i}`] = `GigabitEthernet1/0/${i}`;
        }
        m['te1/1/1'] = 'TenGigabitEthernet1/1/1'; m['te1/1/2'] = 'TenGigabitEthernet1/1/2';
        return m;
    })(),
    sviInterfaces: () => ({ 'Vlan1': { ip: '', subnet: '', mac: genMac(), state: 'up', description: '' } })
};

const ciscoASA5506 = {
    vendor: 'cisco',
    model: 'ASA 5506-X',
    type: 'firewall',
    icon: 'bi-shield-lock-fill',
    cliType: 'cisco',
    features: ['firewall', 'nat', 'acl', 'vpn', 'routing', 'static_routing'],
    hasWebUI: true,
    interfaces: () => makeInterfaces([
        { name: 'GigabitEthernet1/1', state: 'down', speed: '1000', extra: { nameif: 'inside', securityLevel: 100 } },
        { name: 'GigabitEthernet1/2', state: 'down', speed: '1000', extra: { nameif: 'outside', securityLevel: 0 } },
        { name: 'GigabitEthernet1/3', state: 'down', speed: '1000', extra: { nameif: 'dmz', securityLevel: 50 } },
        { name: 'GigabitEthernet1/4', state: 'down', speed: '1000', extra: { nameif: '', securityLevel: 0 } },
        { name: 'GigabitEthernet1/5', state: 'down', speed: '1000', extra: { nameif: '', securityLevel: 0 } },
        { name: 'GigabitEthernet1/6', state: 'down', speed: '1000', extra: { nameif: '', securityLevel: 0 } },
        { name: 'Management1/1', state: 'down', speed: '1000', extra: { nameif: 'management', securityLevel: 100 } },
    ]),
    portShortcuts: (() => {
        const m = {};
        for (let i = 1; i <= 6; i++) { m[`g1/${i}`] = `GigabitEthernet1/${i}`; m[`gi1/${i}`] = `GigabitEthernet1/${i}`; }
        m['m1/1'] = 'Management1/1'; m['mgmt1/1'] = 'Management1/1';
        return m;
    })()
};

// ═══════════════════════════════════════════════════
// JUNIPER DEVICES
// ═══════════════════════════════════════════════════

const juniperEX3400 = {
    vendor: 'juniper',
    model: 'EX3400',
    type: 'switch',
    icon: 'bi-hdd-network',
    cliType: 'juniper',
    features: ['switching', 'vlan', 'stp', 'lacp'],
    hasWebUI: true,
    interfaces: () => makeInterfaces([
        ...Array.from({ length: 24 }, (_, i) => ({
            name: `ge-0/0/${i}`,
            isSwitch: true,
            speed: '1000'
        })),
        { name: 'xe-0/1/0', isSwitch: true, speed: '10000' },
        { name: 'xe-0/1/1', isSwitch: true, speed: '10000' },
    ]),
    portShortcuts: {}
};

const juniperVQFX = {
    vendor: 'juniper',
    model: 'vQFX',
    type: 'l3switch',
    icon: 'bi-hdd-network-fill',
    cliType: 'juniper',
    features: ['switching', 'routing', 'vlan', 'stp', 'ospf', 'bgp'],
    hasWebUI: true,
    interfaces: () => makeInterfaces([
        ...Array.from({ length: 12 }, (_, i) => ({
            name: `xe-0/0/${i}`,
            isSwitch: true,
            speed: '10000'
        }))
    ]),
    portShortcuts: {}
};

const juniperSRX300 = {
    vendor: 'juniper',
    model: 'SRX300',
    type: 'firewall',
    icon: 'bi-shield-lock-fill',
    cliType: 'juniper',
    features: ['firewall', 'nat', 'routing', 'ospf', 'bgp', 'vpn', 'static_routing'],
    hasWebUI: true,
    interfaces: () => makeInterfaces([
        { name: 'ge-0/0/0', state: 'down', speed: '1000', extra: { zone: 'trust' } },
        { name: 'ge-0/0/1', state: 'down', speed: '1000', extra: { zone: 'untrust' } },
        { name: 'ge-0/0/2', state: 'down', speed: '1000', extra: { zone: '' } },
        { name: 'ge-0/0/3', state: 'down', speed: '1000', extra: { zone: '' } },
        { name: 'ge-0/0/4', state: 'down', speed: '1000', extra: { zone: '' } },
        { name: 'ge-0/0/5', state: 'down', speed: '1000', extra: { zone: '' } },
    ]),
    portShortcuts: {}
};

const juniperMX204 = {
    vendor: 'juniper',
    model: 'MX204',
    type: 'router',
    icon: 'bi-router',
    cliType: 'juniper',
    features: ['routing', 'ospf', 'bgp', 'mpls', 'nat', 'acl', 'static_routing'],
    hasWebUI: false,
    interfaces: () => makeInterfaces([
        { name: 'ge-0/0/0', state: 'down', speed: '1000' },
        { name: 'ge-0/0/1', state: 'down', speed: '1000' },
        { name: 'ge-0/0/2', state: 'down', speed: '1000' },
        { name: 'ge-0/0/3', state: 'down', speed: '1000' },
        { name: 'xe-0/1/0', state: 'down', speed: '10000' },
        { name: 'xe-0/1/1', state: 'down', speed: '10000' },
    ]),
    portShortcuts: {}
};

// ═══════════════════════════════════════════════════
// ARISTA DEVICES
// ═══════════════════════════════════════════════════

const arista7050 = {
    vendor: 'arista',
    model: '7050X3',
    type: 'l3switch',
    icon: 'bi-hdd-network-fill',
    cliType: 'cisco', // Arista EOS is very similar to Cisco IOS
    features: ['switching', 'routing', 'vlan', 'stp', 'ospf', 'bgp', 'acl', 'ip_routing', 'mlag'],
    hasWebUI: true,
    interfaces: () => makeInterfaces([
        ...Array.from({ length: 24 }, (_, i) => ({
            name: `Ethernet${i + 1}`,
            isSwitch: true,
            speed: '10000'
        })),
    ]),
    portShortcuts: (() => {
        const m = {};
        for (let i = 1; i <= 24; i++) {
            m[`et${i}`] = `Ethernet${i}`;
            m[`e${i}`] = `Ethernet${i}`;
        }
        return m;
    })()
};

// ═══════════════════════════════════════════════════
// GENERIC END DEVICES
// ═══════════════════════════════════════════════════

const linuxPC = {
    vendor: 'generic',
    model: 'Linux Workstation',
    type: 'pc',
    os: 'linux',
    icon: 'bi-pc-display',
    cliType: 'linux',
    features: ['desktop', 'terminal'],
    hasWebUI: false,
    interfaces: () => makeInterfaces([
        { name: 'eth0', state: 'up', speed: '1000' }
    ]),
    portShortcuts: {}
};

const windowsPC = {
    vendor: 'generic',
    model: 'Windows Workstation',
    type: 'pc',
    os: 'windows',
    icon: 'bi-pc-display',
    cliType: 'windows',
    features: ['desktop', 'terminal'],
    hasWebUI: false,
    interfaces: () => makeInterfaces([
        { name: 'Ethernet0', state: 'up', speed: '1000' }
    ]),
    portShortcuts: {}
};

const linuxServer = {
    vendor: 'generic',
    model: 'Linux Server',
    type: 'server',
    os: 'linux',
    icon: 'bi-server',
    cliType: 'linux',
    features: ['desktop', 'terminal', 'dhcp_server', 'dns_server', 'http_server', 'ftp_server', 'syslog_server'],
    hasWebUI: true,
    interfaces: () => makeInterfaces([
        { name: 'eth0', state: 'up', speed: '1000' },
        { name: 'eth1', state: 'up', speed: '1000' },
    ]),
    portShortcuts: {}
};

const windowsServer = {
    vendor: 'generic',
    model: 'Windows Server',
    type: 'server',
    os: 'windows',
    icon: 'bi-server',
    cliType: 'windows',
    features: ['desktop', 'terminal', 'dhcp_server', 'dns_server', 'http_server', 'ftp_server'],
    hasWebUI: true,
    interfaces: () => makeInterfaces([
        { name: 'Ethernet0', state: 'up', speed: '1000' },
        { name: 'Ethernet1', state: 'up', speed: '1000' },
    ]),
    portShortcuts: {}
};

const wirelessAP = {
    vendor: 'generic',
    model: 'Wireless Access Point',
    type: 'wireless_ap',
    icon: 'bi-wifi',
    cliType: 'none',
    features: ['wireless'],
    hasWebUI: true,
    interfaces: () => makeInterfaces([
        { name: 'Ethernet0', state: 'up', speed: '1000' },
    ]),
    portShortcuts: {},
    wirelessConfig: { ssid: 'LabWiFi', channel: 6, security: 'WPA2', password: 'labpass123' }
};

const cloudGateway = {
    vendor: 'generic',
    model: 'Internet Cloud',
    type: 'cloud',
    icon: 'bi-cloud-fill',
    cliType: 'none',
    features: [],
    hasWebUI: false,
    interfaces: () => makeInterfaces([
        { name: 'Ethernet0', state: 'up', speed: '10000' },
        { name: 'Ethernet1', state: 'up', speed: '10000' },
    ]),
    portShortcuts: {}
};

const ispRouter = {
    vendor: 'generic',
    model: 'ISP Gateway',
    type: 'router',
    icon: 'bi-globe-americas',
    cliType: 'none',
    features: ['routing'],
    hasWebUI: false,
    interfaces: () => makeInterfaces([
        { name: 'Ethernet0', state: 'up', speed: '10000', extra: { ip: '8.8.8.8', subnet: '24' } },
        { name: 'Ethernet1', state: 'up', speed: '10000', extra: { ip: '1.1.1.1', subnet: '24' } },
    ]),
    portShortcuts: {}
};

const wanEmulator = {
    vendor: 'generic',
    model: 'WAN Emulator',
    type: 'cloud',
    icon: 'bi-activity',
    cliType: 'none',
    features: ['delay'],
    hasWebUI: true,
    interfaces: () => makeInterfaces([
        { name: 'Ethernet0', state: 'up', speed: '1000' },
        { name: 'Ethernet1', state: 'up', speed: '1000' },
    ]),
    portShortcuts: {}
};

// ═══════════════════════════════════════════════════
// TEMPLATE REGISTRY
// ═══════════════════════════════════════════════════

export const DEVICE_TEMPLATES = {
    // Cisco
    'cisco_router_2901': ciscoRouter2901,
    'cisco_router_4321': ciscoRouter4321,
    'cisco_switch_2960': ciscoSwitch2960,
    'cisco_switch_3560': ciscoSwitch3560,
    'cisco_switch_3850': ciscoSwitch3850,
    'cisco_asa_5506': ciscoASA5506,
    // Juniper
    'juniper_ex3400': juniperEX3400,
    'juniper_vqfx': juniperVQFX,
    'juniper_srx300': juniperSRX300,
    'juniper_mx204': juniperMX204,
    // Arista
    'arista_7050': arista7050,
    // End devices
    'linux_pc': linuxPC,
    'windows_pc': windowsPC,
    'linux_server': linuxServer,
    'windows_server': windowsServer,
    'wireless_ap': wirelessAP,
    'cloud': cloudGateway,
    'isp_router': ispRouter,
    'wan_emulator': wanEmulator
};

// Palette categories for the UI
export const PALETTE_CATEGORIES = [
    {
        name: 'End Devices',
        icon: 'bi-pc-display',
        items: [
            { templateId: 'linux_pc', label: 'Linux PC' },
            { templateId: 'windows_pc', label: 'Windows PC' },
            { templateId: 'linux_server', label: 'Linux Server' },
            { templateId: 'windows_server', label: 'Windows Server' },
        ]
    },
    {
        name: 'Cisco',
        icon: 'bi-router',
        items: [
            { templateId: 'cisco_router_2901', label: 'ISR 2901 Router' },
            { templateId: 'cisco_router_4321', label: 'ISR 4321 Router' },
            { templateId: 'cisco_switch_2960', label: 'Catalyst 2960 Switch' },
            { templateId: 'cisco_switch_3560', label: 'Catalyst 3560 L3 Switch' },
            { templateId: 'cisco_switch_3850', label: 'Catalyst 3850 L3 Switch' },
            { templateId: 'cisco_asa_5506', label: 'ASA 5506-X Firewall' },
        ]
    },
    {
        name: 'Juniper',
        icon: 'bi-hdd-network',
        items: [
            { templateId: 'juniper_mx204', label: 'MX204 Router' },
            { templateId: 'juniper_ex3400', label: 'EX3400 Switch' },
            { templateId: 'juniper_vqfx', label: 'vQFX L3 Switch' },
            { templateId: 'juniper_srx300', label: 'SRX300 Firewall' },
        ]
    },
    {
        name: 'Arista',
        icon: 'bi-hdd-network-fill',
        items: [
            { templateId: 'arista_7050', label: '7050X3 L3 Switch' },
        ]
    },
    {
        name: 'Other',
        icon: 'bi-cloud',
        items: [
            { templateId: 'wireless_ap', label: 'Wireless AP' },
            { templateId: 'isp_router', label: 'ISP Gateway' },
            { templateId: 'wan_emulator', label: 'WAN Emulator' },
            { templateId: 'cloud', label: 'Internet Cloud' },
        ]
    }
];

// Helper: resolve interface shortcut to full name
export function resolveInterfaceName(template, shortName) {
    if (!template || !template.portShortcuts) return shortName;
    const lower = shortName.toLowerCase();
    return template.portShortcuts[lower] || shortName;
}

// Helper: get short display name for interface
export function getPortDisplayName(fullName) {
    return fullName
        .replace('GigabitEthernet', 'Gi')
        .replace('FastEthernet', 'Fa')
        .replace('TenGigabitEthernet', 'Te')
        .replace('Serial', 'Se')
        .replace('Ethernet', 'Et')
        .replace('Management', 'Mgmt');
}
