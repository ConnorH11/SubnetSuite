// sim-labs-juniper.js
// Juniper Certification Labs

export const JUNIPER_LABS = [
    {
        id: 'junos-01',
        certification: 'JNCIA',
        category: 'Basic Config',
        difficulty: 'Easy',
        timeEstimate: '15 mins',
        title: 'Basic JunOS Configuration',
        description: 'Configure a hostname and root authentication on a Juniper vQFX.',
        topology: {
            nodes: [
                { id: 'SW1', template: 'juniper_vqfx', x: 300, y: 200, name: 'Amnesiac' }
            ]
        },
        tasks: [
            {
                description: 'Set the hostname to "Core-SW1"',
                hints: ['Enter configuration mode ("configure").', 'Use "set system host-name Core-SW1".'],
                checks: [{ type: 'hostname_set', node: 'SW1', expected: 'Core-SW1' }]
            }
        ]
    },
    {
        id: 'junos-02',
        certification: 'JNCIA',
        category: 'Routing',
        difficulty: 'Medium',
        timeEstimate: '20 mins',
        title: 'Static Routing on JunOS',
        description: 'Configure static routing between two Juniper routers.',
        topology: {
            nodes: [
                { id: 'R1', template: 'juniper_mx204', x: 200, y: 200, name: 'R1' },
                { id: 'R2', template: 'juniper_mx204', x: 500, y: 200, name: 'R2' },
                { id: 'PC1', template: 'linux_pc', x: 100, y: 300, name: 'PC1' },
                { id: 'PC2', template: 'linux_pc', x: 600, y: 300, name: 'PC2' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'ge-0/0/0', target: 'PC1', targetPort: 'eth0', cableType: 'copper_straight' },
                { source: 'R1', sourcePort: 'ge-0/0/1', target: 'R2', targetPort: 'ge-0/0/1', cableType: 'copper_straight' },
                { source: 'R2', sourcePort: 'ge-0/0/0', target: 'PC2', targetPort: 'eth0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'R1': { interfaces: { 'ge-0/0/0': { ip: '192.168.1.1', subnet: '24', state: 'up' }, 'ge-0/0/1': { ip: '10.0.0.1', subnet: '30', state: 'up' } } },
                'R2': { interfaces: { 'ge-0/0/0': { ip: '192.168.2.1', subnet: '24', state: 'up' }, 'ge-0/0/1': { ip: '10.0.0.2', subnet: '30', state: 'up' } } },
                'PC1': { interfaces: { 'eth0': { ip: '192.168.1.10', subnet: '24', state: 'up' } }, gateway: '192.168.1.1' },
                'PC2': { interfaces: { 'eth0': { ip: '192.168.2.10', subnet: '24', state: 'up' } }, gateway: '192.168.2.1' }
            }
        },
        tasks: [
            {
                description: 'Configure a static route on R1 to reach PC2\'s network (192.168.2.0/24)',
                hints: ['set routing-options static route 192.168.2.0/24 next-hop 10.0.0.2'],
                checks: [{ type: 'static_route', node: 'R1', network: '192.168.2.0', cidr: '24', nextHop: '10.0.0.2' }]
            },
            {
                description: 'Configure a static route on R2 to reach PC1\'s network (192.168.1.0/24)',
                hints: ['set routing-options static route 192.168.1.0/24 next-hop 10.0.0.1'],
                checks: [{ type: 'static_route', node: 'R2', network: '192.168.1.0', cidr: '24', nextHop: '10.0.0.1' }]
            },
            {
                description: 'Verify connectivity by pinging PC2 from PC1',
                hints: ['Open the PC1 terminal and ping 192.168.2.10.'],
                checks: [{ type: 'can_reach', source: 'PC1', destination: 'PC2' }]
            }
        ]
    },
    {
        id: 'junos-03',
        certification: 'JNCIA',
        category: 'Switching',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'EX Switch VLAN Configuration',
        description: 'Configure VLANs and assign interfaces on a Juniper EX switch.',
        topology: {
            nodes: [
                { id: 'SW1', template: 'juniper_ex3400', x: 300, y: 200, name: 'EX-SW1' },
                { id: 'PC1', template: 'linux_pc', x: 150, y: 350, name: 'PC1' },
                { id: 'PC2', template: 'linux_pc', x: 450, y: 350, name: 'PC2' }
            ],
            edges: [
                { source: 'SW1', sourcePort: 'ge-0/0/0', target: 'PC1', targetPort: 'eth0', cableType: 'copper_straight' },
                { source: 'SW1', sourcePort: 'ge-0/0/1', target: 'PC2', targetPort: 'eth0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'PC1': { interfaces: { 'eth0': { ip: '10.10.10.10', subnet: '24', state: 'up' } } },
                'PC2': { interfaces: { 'eth0': { ip: '10.10.10.20', subnet: '24', state: 'up' } } }
            }
        },
        tasks: [
            {
                description: 'Create VLAN "SALES" with vlan-id 10',
                hints: ['set vlans SALES vlan-id 10'],
                checks: [{ type: 'vlan_exists', node: 'SW1', vlanId: '10', name: 'SALES' }]
            },
            {
                description: 'Assign ge-0/0/0 to VLAN 10 as an access port',
                hints: ['set interfaces ge-0/0/0 unit 0 family ethernet-switching interface-mode access vlan members SALES'],
                checks: [{ type: 'vlan_port_assignment', node: 'SW1', interface: 'ge-0/0/0', vlanId: '10' }]
            },
            {
                description: 'Assign ge-0/0/1 to VLAN 10 as an access port',
                hints: ['set interfaces ge-0/0/1 unit 0 family ethernet-switching interface-mode access vlan members SALES'],
                checks: [{ type: 'vlan_port_assignment', node: 'SW1', interface: 'ge-0/0/1', vlanId: '10' }]
            }
        ]
    },
    {
        id: 'junos-04',
        certification: 'JNCIA',
        category: 'Routing',
        difficulty: 'Hard',
        timeEstimate: '20 mins',
        title: 'Single-Area OSPF Configuration',
        description: 'Configure OSPF Area 0 on two Juniper routers and establish an adjacency.',
        topology: {
            nodes: [
                { id: 'R1', template: 'juniper_mx204', x: 200, y: 200, name: 'MX-R1' },
                { id: 'R2', template: 'juniper_mx204', x: 500, y: 200, name: 'MX-R2' },
                { id: 'PC1', template: 'linux_pc', x: 100, y: 300, name: 'PC1' },
                { id: 'PC2', template: 'linux_pc', x: 600, y: 300, name: 'PC2' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'ge-0/0/0', target: 'PC1', targetPort: 'eth0', cableType: 'copper_straight' },
                { source: 'R1', sourcePort: 'ge-0/0/1', target: 'R2', targetPort: 'ge-0/0/1', cableType: 'copper_straight' },
                { source: 'R2', sourcePort: 'ge-0/0/0', target: 'PC2', targetPort: 'eth0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'R1': { interfaces: { 'ge-0/0/0': { ip: '10.1.1.1', subnet: '24', state: 'up' }, 'ge-0/0/1': { ip: '172.16.0.1', subnet: '30', state: 'up' } } },
                'R2': { interfaces: { 'ge-0/0/0': { ip: '10.2.2.1', subnet: '24', state: 'up' }, 'ge-0/0/1': { ip: '172.16.0.2', subnet: '30', state: 'up' } } },
                'PC1': { interfaces: { 'eth0': { ip: '10.1.1.10', subnet: '24', state: 'up' } }, gateway: '10.1.1.1' },
                'PC2': { interfaces: { 'eth0': { ip: '10.2.2.10', subnet: '24', state: 'up' } }, gateway: '10.2.2.1' }
            }
        },
        tasks: [
            {
                description: 'Configure OSPF Area 0 on MX-R1 for both interfaces',
                hints: ['set protocols ospf area 0.0.0.0 interface ge-0/0/0', 'set protocols ospf area 0.0.0.0 interface ge-0/0/1'],
                checks: [{ type: 'ospf_enabled', node: 'R1' }] // Soft check
            },
            {
                description: 'Configure OSPF Area 0 on MX-R2 for both interfaces',
                hints: ['set protocols ospf area 0.0.0.0 interface ge-0/0/0', 'set protocols ospf area 0.0.0.0 interface ge-0/0/1'],
                checks: [{ type: 'ospf_enabled', node: 'R2' }] // Soft check
            },
            {
                description: 'Verify connectivity by pinging PC2 from PC1',
                hints: ['Ping 10.2.2.10 from PC1 terminal.'],
                checks: [{ type: 'can_reach', source: 'PC1', destination: 'PC2' }]
            }
        ]
    },
    {
        id: 'junos-05',
        certification: 'JNCIA',
        category: 'Routing',
        difficulty: 'Hard',
        timeEstimate: '25 mins',
        title: 'BGP Peering',
        description: 'Establish an eBGP session between two Juniper devices.',
        topology: {
            nodes: [
                { id: 'R1', template: 'juniper_mx204', x: 200, y: 200, name: 'AS100-R1' },
                { id: 'R2', template: 'juniper_mx204', x: 500, y: 200, name: 'AS200-R2' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'ge-0/0/1', target: 'R2', targetPort: 'ge-0/0/1', cableType: 'copper_straight' }
            ],
            preConfig: {
                'R1': { interfaces: { 'ge-0/0/1': { ip: '10.0.0.1', subnet: '30', state: 'up' } } },
                'R2': { interfaces: { 'ge-0/0/1': { ip: '10.0.0.2', subnet: '30', state: 'up' } } }
            }
        },
        tasks: [
            {
                description: 'Configure autonomous-system 100 on AS100-R1',
                hints: ['set routing-options autonomous-system 100'],
                checks: [{ type: 'bgp_enabled', node: 'R1', asNumber: 100 }]
            },
            {
                description: 'Configure autonomous-system 200 on AS200-R2',
                hints: ['set routing-options autonomous-system 200'],
                checks: [{ type: 'bgp_enabled', node: 'R2', asNumber: 200 }]
            },
            {
                description: 'Establish eBGP peering on AS100-R1 to 10.0.0.2',
                hints: ['set protocols bgp group eBGP type external', 'set protocols bgp group eBGP peer-as 200', 'set protocols bgp group eBGP neighbor 10.0.0.2'],
                checks: [{ type: 'bgp_neighbor', node: 'R1', neighborIp: '10.0.0.2', remoteAs: 200 }]
            }
        ]
    },
    {
        id: 'junos-06',
        certification: 'JNCIA',
        category: 'Services',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'JunOS DHCP Server',
        description: 'Configure a Juniper SRX to act as a DHCP server for the local LAN.',
        topology: {
            nodes: [
                { id: 'SRX', template: 'juniper_srx300', x: 300, y: 200, name: 'Branch-FW' },
                { id: 'PC1', template: 'windows_pc', x: 300, y: 400, name: 'LAN-PC' }
            ],
            edges: [
                { source: 'SRX', sourcePort: 'ge-0/0/0', target: 'PC1', targetPort: 'Ethernet0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'SRX': { interfaces: { 'ge-0/0/0': { ip: '10.50.50.1', subnet: '24', state: 'up' } } }
            }
        },
        tasks: [
            {
                description: 'Configure an address pool for 10.50.50.0/24',
                hints: ['set system services dhcp-local-server group LAN interface ge-0/0/0.0', 'set access address-assignment pool LAN-POOL family inet network 10.50.50.0/24'],
                checks: [{ type: 'dhcp_pool', node: 'SRX', network: '10.50.50.0', cidr: '24' }] // Future expansion check
            },
            {
                description: 'Verify PC1 obtains an IP address via DHCP',
                hints: ['Open PC1 and use "ipconfig /renew" in the command prompt.'],
                checks: [{ type: 'interface_state', node: 'PC1', interface: 'Ethernet0', state: 'up' }] // Soft check
            }
        ]
    },
    {
        id: 'junos-07',
        certification: 'JNCIA',
        category: 'Security',
        difficulty: 'Medium',
        timeEstimate: '20 mins',
        title: 'Static NAT Configuration',
        description: 'Configure static NAT on a Juniper SRX to allow external access to an internal web server.',
        topology: {
            nodes: [
                { id: 'SRX', template: 'juniper_srx300', x: 300, y: 200, name: 'Border-FW' },
                { id: 'SRV1', template: 'linux_server', x: 150, y: 300, name: 'Web-Server' },
                { id: 'PC1', template: 'linux_pc', x: 550, y: 200, name: 'Internet-PC' }
            ],
            edges: [
                { source: 'SRX', sourcePort: 'ge-0/0/1', target: 'SRV1', targetPort: 'eth0', cableType: 'copper_straight' },
                { source: 'SRX', sourcePort: 'ge-0/0/0', target: 'PC1', targetPort: 'eth0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'SRX': { interfaces: { 'ge-0/0/0': { ip: '203.0.113.1', subnet: '30', state: 'up' }, 'ge-0/0/1': { ip: '192.168.1.1', subnet: '24', state: 'up' } } },
                'SRV1': { interfaces: { 'eth0': { ip: '192.168.1.100', subnet: '24', state: 'up' } }, gateway: '192.168.1.1' },
                'PC1': { interfaces: { 'eth0': { ip: '203.0.113.2', subnet: '30', state: 'up' } }, gateway: '203.0.113.1' }
            }
        },
        tasks: [
            {
                description: 'Create a static NAT rule mapping 203.0.113.10 to 192.168.1.100',
                hints: ['set security nat static rule-set RS1 from zone untrust', 'set security nat static rule-set RS1 rule R1 match destination-address 203.0.113.10/32', 'set security nat static rule-set RS1 rule R1 then static-nat prefix 192.168.1.100/32'],
                checks: [{ type: 'interface_state', node: 'SRX', interface: 'ge-0/0/0', state: 'up' }] // Soft check
            },
            {
                description: 'Create a security policy allowing traffic from untrust to trust for the server',
                hints: ['set security policies from-zone untrust to-zone trust policy PERMIT-WEB match source-address any destination-address SERVER application any', 'set security policies from-zone untrust to-zone trust policy PERMIT-WEB then permit'],
                checks: [{ type: 'interface_state', node: 'SRX', interface: 'ge-0/0/0', state: 'up' }] // Soft check
            }
        ]
    },
    {
        id: 'junos-08',
        certification: 'JNCIA',
        category: 'Security',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'Source NAT (PAT) Configuration',
        description: 'Configure source NAT so internal users can access the Internet sharing the SRX external IP.',
        topology: {
            nodes: [
                { id: 'SRX', template: 'juniper_srx300', x: 300, y: 200, name: 'Border-FW' },
                { id: 'PC1', template: 'windows_pc', x: 150, y: 300, name: 'Internal-PC' },
                { id: 'ISP', template: 'isp_router', x: 550, y: 200, name: 'Internet' }
            ],
            edges: [
                { source: 'SRX', sourcePort: 'ge-0/0/1', target: 'PC1', targetPort: 'Ethernet0', cableType: 'copper_straight' },
                { source: 'SRX', sourcePort: 'ge-0/0/0', target: 'ISP', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'SRX': { interfaces: { 'ge-0/0/0': { ip: '198.51.100.2', subnet: '30', state: 'up' }, 'ge-0/0/1': { ip: '10.0.0.1', subnet: '24', state: 'up' } } },
                'PC1': { interfaces: { 'Ethernet0': { ip: '10.0.0.50', subnet: '24', state: 'up' } }, gateway: '10.0.0.1' },
                'ISP': { interfaces: { 'GigabitEthernet0/0/0': { ip: '198.51.100.1', subnet: '30', state: 'up' }, 'Loopback0': { ip: '8.8.8.8', subnet: '32', state: 'up' } } }
            }
        },
        tasks: [
            {
                description: 'Configure source NAT interface-based (PAT) for traffic from trust to untrust',
                hints: ['set security nat source rule-set SNAT from zone trust', 'set security nat source rule-set SNAT to zone untrust', 'set security nat source rule-set SNAT rule R1 match source-address 10.0.0.0/24', 'set security nat source rule-set SNAT rule R1 then source-nat interface'],
                checks: [{ type: 'interface_state', node: 'SRX', interface: 'ge-0/0/0', state: 'up' }] // Soft check
            }
        ]
    },
    {
        id: 'junos-09',
        certification: 'JNCIA',
        category: 'VPN',
        difficulty: 'Hard',
        timeEstimate: '30 mins',
        title: 'IPsec Site-to-Site VPN',
        description: 'Configure a route-based IPsec VPN between two Juniper SRX firewalls.',
        topology: {
            nodes: [
                { id: 'SRX1', template: 'juniper_srx300', x: 200, y: 200, name: 'SiteA-FW' },
                { id: 'SRX2', template: 'juniper_srx300', x: 600, y: 200, name: 'SiteB-FW' },
                { id: 'PC1', template: 'windows_pc', x: 100, y: 300, name: 'SiteA-PC' },
                { id: 'PC2', template: 'windows_pc', x: 700, y: 300, name: 'SiteB-PC' }
            ],
            edges: [
                { source: 'SRX1', sourcePort: 'ge-0/0/0', target: 'SRX2', targetPort: 'ge-0/0/0', cableType: 'copper_straight' },
                { source: 'SRX1', sourcePort: 'ge-0/0/1', target: 'PC1', targetPort: 'Ethernet0', cableType: 'copper_straight' },
                { source: 'SRX2', sourcePort: 'ge-0/0/1', target: 'PC2', targetPort: 'Ethernet0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'SRX1': { interfaces: { 'ge-0/0/0': { ip: '1.1.1.1', subnet: '30', state: 'up' }, 'ge-0/0/1': { ip: '192.168.10.1', subnet: '24', state: 'up' }, 'st0.0': { ip: '172.16.1.1', subnet: '30', state: 'up' } } },
                'SRX2': { interfaces: { 'ge-0/0/0': { ip: '1.1.1.2', subnet: '30', state: 'up' }, 'ge-0/0/1': { ip: '192.168.20.1', subnet: '24', state: 'up' }, 'st0.0': { ip: '172.16.1.2', subnet: '30', state: 'up' } } },
                'PC1': { interfaces: { 'Ethernet0': { ip: '192.168.10.10', subnet: '24', state: 'up' } }, gateway: '192.168.10.1' },
                'PC2': { interfaces: { 'Ethernet0': { ip: '192.168.20.10', subnet: '24', state: 'up' } }, gateway: '192.168.20.1' }
            }
        },
        tasks: [
            {
                description: 'Configure IKE phase 1 and IPsec phase 2 proposals/policies on both SRXs',
                hints: ['Configure ike proposal, policy, gateway', 'Configure ipsec proposal, policy, vpn using st0.0'],
                checks: [{ type: 'interface_state', node: 'SRX1', interface: 'st0.0', state: 'up' }] // Soft check
            },
            {
                description: 'Add static routes over the st0.0 tunnel interface',
                hints: ['On SiteA: set routing-options static route 192.168.20.0/24 next-hop st0.0'],
                checks: [{ type: 'interface_state', node: 'SRX2', interface: 'st0.0', state: 'up' }] // Soft check
            }
        ]
    },
    {
        id: 'junos-10',
        certification: 'JNCIA',
        category: 'Routing',
        difficulty: 'Medium',
        timeEstimate: '20 mins',
        title: 'Route Filters and Policies',
        description: 'Configure a routing policy to filter specific routes from being exported into OSPF.',
        topology: {
            nodes: [
                { id: 'R1', template: 'juniper_mx204', x: 300, y: 200, name: 'MX-R1' },
                { id: 'R2', template: 'juniper_mx204', x: 600, y: 200, name: 'MX-R2' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'ge-0/0/0', target: 'R2', targetPort: 'ge-0/0/0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'R1': { interfaces: { 'ge-0/0/0': { ip: '10.0.0.1', subnet: '30', state: 'up' }, 'lo0': { ip: '1.1.1.1', subnet: '32', state: 'up' }, 'lo0.1': { ip: '2.2.2.2', subnet: '32', state: 'up' } } },
                'R2': { interfaces: { 'ge-0/0/0': { ip: '10.0.0.2', subnet: '30', state: 'up' } } }
            }
        },
        tasks: [
            {
                description: 'Configure OSPF between R1 and R2',
                hints: ['set protocols ospf area 0.0.0.0 interface ge-0/0/0.0'],
                checks: [{ type: 'ospf_enabled', node: 'R1' }]
            },
            {
                description: 'Create a policy EXPORT-OSPF that accepts 1.1.1.1/32 but rejects 2.2.2.2/32',
                hints: ['set policy-options policy-statement EXPORT-OSPF term 1 from route-filter 1.1.1.1/32 exact', 'set policy-options policy-statement EXPORT-OSPF term 1 then accept', 'set policy-options policy-statement EXPORT-OSPF term 2 then reject'],
                checks: [{ type: 'ospf_enabled', node: 'R2' }] // Soft check
            },
            {
                description: 'Apply the export policy to OSPF on R1',
                hints: ['set protocols ospf export EXPORT-OSPF'],
                checks: [{ type: 'ospf_enabled', node: 'R1' }] // Soft check
            }
        ]
    },
    {
        id: 'junos-11',
        certification: 'JNCIA',
        category: 'Routing',
        difficulty: 'Hard',
        timeEstimate: '20 mins',
        title: 'IS-IS Configuration',
        description: 'Configure IS-IS routing protocol for an IPv4/IPv6 dual-stack topology.',
        topology: {
            nodes: [
                { id: 'R1', template: 'juniper_mx204', x: 200, y: 200, name: 'MX1' },
                { id: 'R2', template: 'juniper_mx204', x: 500, y: 200, name: 'MX2' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'ge-0/0/0', target: 'R2', targetPort: 'ge-0/0/0', cableType: 'copper_straight' }
            ],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Configure ISO family on loopback and physical interfaces',
                hints: ['set interfaces lo0 unit 0 family iso address 49.0001.0000.0000.0001.00'],
                checks: [{ type: 'interface_state', node: 'R1', interface: 'lo0', state: 'up' }] // Soft check
            },
            {
                description: 'Enable IS-IS under protocols',
                hints: ['set protocols isis interface ge-0/0/0.0', 'set protocols isis interface lo0.0'],
                checks: [{ type: 'interface_state', node: 'R1', interface: 'ge-0/0/0', state: 'up' }] // Soft check
            }
        ]
    },
    {
        id: 'junos-12',
        certification: 'JNCIA',
        category: 'Routing',
        difficulty: 'Hard',
        timeEstimate: '25 mins',
        title: 'BGP Route Reflector',
        description: 'Configure a Juniper router as an iBGP route reflector.',
        topology: {
            nodes: [
                { id: 'RR', template: 'juniper_mx204', x: 400, y: 150, name: 'RR' },
                { id: 'C1', template: 'juniper_mx204', x: 200, y: 300, name: 'Client1' },
                { id: 'C2', template: 'juniper_mx204', x: 600, y: 300, name: 'Client2' }
            ],
            edges: [
                { source: 'RR', sourcePort: 'ge-0/0/0', target: 'C1', targetPort: 'ge-0/0/0', cableType: 'copper_straight' },
                { source: 'RR', sourcePort: 'ge-0/0/1', target: 'C2', targetPort: 'ge-0/0/0', cableType: 'copper_straight' }
            ],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Configure RR with cluster-id 1.1.1.1',
                hints: ['set protocols bgp group IBGP cluster 1.1.1.1'],
                checks: [{ type: 'interface_state', node: 'RR', interface: 'ge-0/0/0', state: 'up' }] // Soft check
            },
            {
                description: 'Add clients to the IBGP group',
                hints: ['set protocols bgp group IBGP neighbor 10.0.1.2'],
                checks: [{ type: 'interface_state', node: 'RR', interface: 'ge-0/0/1', state: 'up' }] // Soft check
            }
        ]
    },
    {
        id: 'junos-13',
        certification: 'JNCIA',
        category: 'Routing',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'BGP Local Preference',
        description: 'Use a routing policy to manipulate BGP local preference for incoming routes.',
        topology: {
            nodes: [
                { id: 'R1', template: 'juniper_mx204', x: 200, y: 200, name: 'R1' }
            ],
            edges: [],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Create a policy SET-LOCAL-PREF setting local-preference to 200',
                hints: ['set policy-options policy-statement SET-LOCAL-PREF term 1 then local-preference 200', 'then accept'],
                checks: [{ type: 'interface_state', node: 'R1', interface: 'ge-0/0/0', state: 'up' }] // Soft check
            },
            {
                description: 'Apply the policy as an import policy to BGP',
                hints: ['set protocols bgp group EBGP import SET-LOCAL-PREF'],
                checks: [{ type: 'interface_state', node: 'R1', interface: 'ge-0/0/0', state: 'up' }] // Soft check
            }
        ]
    },
    {
        id: 'junos-14',
        certification: 'JNCIA',
        category: 'Security',
        difficulty: 'Medium',
        timeEstimate: '20 mins',
        title: 'Firewall Filters (Stateless)',
        description: 'Apply a stateless firewall filter to protect the routing engine from SSH brute-force.',
        topology: {
            nodes: [
                { id: 'R1', template: 'juniper_mx204', x: 300, y: 200, name: 'Router' }
            ],
            edges: [],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Create firewall filter RE-PROTECT to allow SSH from 10.0.0.0/8 and deny other SSH',
                hints: ['set firewall filter RE-PROTECT term ALLOW-SSH from source-address 10.0.0.0/8', 'from protocol tcp destination-port 22'],
                checks: [{ type: 'interface_state', node: 'R1', interface: 'lo0', state: 'up' }] // Soft check
            },
            {
                description: 'Apply the filter to the loopback interface inbound',
                hints: ['set interfaces lo0 unit 0 family inet filter input RE-PROTECT'],
                checks: [{ type: 'interface_state', node: 'R1', interface: 'lo0', state: 'up' }] // Soft check
            }
        ]
    },
    {
        id: 'junos-15',
        certification: 'JNCIA',
        category: 'Routing',
        difficulty: 'Hard',
        timeEstimate: '25 mins',
        title: 'Logical Systems',
        description: 'Configure multiple isolated routing instances (logical systems) on a single physical router.',
        topology: {
            nodes: [
                { id: 'R1', template: 'juniper_mx204', x: 300, y: 200, name: 'Core-Router' }
            ],
            edges: [],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Create logical system LS1 and assign ge-0/0/0 to it',
                hints: ['set logical-systems LS1 interfaces ge-0/0/0 unit 0 family inet address 10.0.0.1/24'],
                checks: [{ type: 'interface_state', node: 'R1', interface: 'ge-0/0/0', state: 'up' }] // Soft check
            },
            {
                description: 'Create logical system LS2 and configure OSPF within it',
                hints: ['set logical-systems LS2 protocols ospf area 0 interface ge-0/0/1.0'],
                checks: [{ type: 'interface_state', node: 'R1', interface: 'ge-0/0/1', state: 'up' }] // Soft check
            }
        ]
    },
    {
        id: 'junos-16',
        certification: 'JNCIA',
        category: 'Services',
        difficulty: 'Medium',
        timeEstimate: '20 mins',
        title: 'Class of Service (CoS)',
        description: 'Configure basic traffic classification and forwarding classes.',
        topology: {
            nodes: [
                { id: 'R1', template: 'juniper_mx204', x: 300, y: 200, name: 'Router' }
            ],
            edges: [],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Map DSCP EF (101110) to expedited-forwarding class',
                hints: ['set class-of-service classifiers dscp CLASSIFIER1 forwarding-class expedited-forwarding loss-priority low code-points ef'],
                checks: [{ type: 'interface_state', node: 'R1', interface: 'ge-0/0/0', state: 'up' }] // Soft check
            },
            {
                description: 'Apply the classifier to ge-0/0/0',
                hints: ['set class-of-service interfaces ge-0/0/0 unit 0 classifiers dscp CLASSIFIER1'],
                checks: [{ type: 'interface_state', node: 'R1', interface: 'ge-0/0/0', state: 'up' }] // Soft check
            }
        ]
    },
    {
        id: 'junos-17',
        certification: 'JNCIA',
        category: 'Routing',
        difficulty: 'Hard',
        timeEstimate: '20 mins',
        title: 'OSPF Virtual Links',
        description: 'Configure an OSPF virtual link through a transit area to connect a disconnected area to Area 0.',
        topology: {
            nodes: [
                { id: 'R1', template: 'juniper_mx204', x: 200, y: 200, name: 'R1' }
            ],
            edges: [],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Configure a virtual link in Area 1 pointing to router-id 2.2.2.2',
                hints: ['set protocols ospf area 0.0.0.1 virtual-link neighbor-id 2.2.2.2 transit-area 0.0.0.1'],
                checks: [{ type: 'interface_state', node: 'R1', interface: 'ge-0/0/0', state: 'up' }] // Soft check
            }
        ]
    },
    {
        id: 'junos-18',
        certification: 'JNCIA',
        category: 'Services',
        difficulty: 'Hard',
        timeEstimate: '20 mins',
        title: 'PIM Sparse Mode',
        description: 'Configure Protocol Independent Multicast (PIM) Sparse Mode and an RP.',
        topology: {
            nodes: [
                { id: 'R1', template: 'juniper_mx204', x: 300, y: 200, name: 'Router' }
            ],
            edges: [],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Enable PIM on all interfaces',
                hints: ['set protocols pim interface all mode sparse'],
                checks: [{ type: 'interface_state', node: 'R1', interface: 'ge-0/0/0', state: 'up' }] // Soft check
            },
            {
                description: 'Set the local RP address to 1.1.1.1',
                hints: ['set protocols pim rp local address 1.1.1.1'],
                checks: [{ type: 'interface_state', node: 'R1', interface: 'ge-0/0/0', state: 'up' }] // Soft check
            }
        ]
    },
    {
        id: 'junos-19',
        certification: 'JNCIA',
        category: 'Management',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'SNMPv3 Configuration',
        description: 'Configure SNMPv3 for secure network monitoring.',
        topology: {
            nodes: [
                { id: 'R1', template: 'juniper_mx204', x: 300, y: 200, name: 'Router' }
            ],
            edges: [],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Create an SNMPv3 user "monitor" with auth SHA and priv AES',
                hints: ['set snmp v3 usm local-engine user monitor authentication-sha authentication-password ...'],
                checks: [{ type: 'interface_state', node: 'R1', interface: 'ge-0/0/0', state: 'up' }] // Soft check
            }
        ]
    },
    {
        id: 'junos-20',
        certification: 'JNCIA',
        category: 'Routing',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'OSPFv3 (IPv6)',
        description: 'Enable OSPFv3 for IPv6 routing.',
        topology: {
            nodes: [
                { id: 'R1', template: 'juniper_mx204', x: 300, y: 200, name: 'Router' }
            ],
            edges: [],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Enable OSPFv3 on interface ge-0/0/0.0 in Area 0',
                hints: ['set protocols ospf3 area 0.0.0.0 interface ge-0/0/0.0'],
                checks: [{ type: 'interface_state', node: 'R1', interface: 'ge-0/0/0', state: 'up' }] // Soft check
            }
        ]
    }
];
