// sim-labs-ccna.js

export const CCNA_LABS = [
    {
        id: 'ccna-01',
        certification: 'CCNA',
        category: 'Basic Config',
        difficulty: 'Easy',
        timeEstimate: '15 mins',
        title: 'Basic Router Configuration',
        description: 'Configure a basic hostname, IP address, and description on a Cisco router.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 200, y: 200, name: 'Router0' },
                { id: 'PC1', template: 'windows_pc', x: 400, y: 200, name: 'PC1' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/0', target: 'PC1', targetPort: 'Ethernet0', cableType: 'copper_straight' }
            ]
        },
        tasks: [
            {
                description: 'Set the router hostname to "HQ-Router"',
                hints: ['Enter global configuration mode first.', 'Use the "hostname" command.'],
                checks: [{ type: 'hostname_set', node: 'R1', expected: 'HQ-Router' }]
            },
            {
                description: 'Configure GigabitEthernet0/0/0 with IP 192.168.1.1/24 and enable it',
                hints: ['Enter interface configuration mode for g0/0/0.', 'Use "ip address [ip] [mask]" followed by "no shutdown".'],
                checks: [
                    { type: 'interface_ip', node: 'R1', interface: 'GigabitEthernet0/0/0', ip: '192.168.1.1', subnet: '24' },
                    { type: 'interface_state', node: 'R1', interface: 'GigabitEthernet0/0/0', expected: 'up' }
                ]
            },
            {
                description: 'Configure PC1 with IP 192.168.1.10/24 and gateway 192.168.1.1',
                hints: ['Double-click PC1 to open the Desktop.', 'Use the IP Configuration app.'],
                checks: [
                    { type: 'interface_ip', node: 'PC1', interface: 'Ethernet0', ip: '192.168.1.10', subnet: '24' },
                    { type: 'gateway_set', node: 'PC1', expected: '192.168.1.1' }
                ]
            },
            {
                description: 'Verify connectivity by pinging R1 from PC1',
                hints: ['Open the terminal or Command Prompt on PC1.', 'Type "ping 192.168.1.1".'],
                checks: [{ type: 'ping_success', source: 'PC1', targetIp: '192.168.1.1' }]
            }
        ]
    },
    {
        id: 'ccna-02',
        certification: 'CCNA',
        category: 'Routing',
        difficulty: 'Medium',
        timeEstimate: '20 mins',
        title: 'Static Routing Configuration',
        description: 'Configure static routing between two routers to allow PC1 to reach PC2.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 200, y: 200, name: 'R1' },
                { id: 'R2', template: 'cisco_router_4321', x: 500, y: 200, name: 'R2' },
                { id: 'PC1', template: 'windows_pc', x: 100, y: 300, name: 'PC1' },
                { id: 'PC2', template: 'windows_pc', x: 600, y: 300, name: 'PC2' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/0', target: 'PC1', targetPort: 'Ethernet0', cableType: 'copper_straight' },
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/1', target: 'R2', targetPort: 'GigabitEthernet0/0/1', cableType: 'copper_crossover' },
                { source: 'R2', sourcePort: 'GigabitEthernet0/0/0', target: 'PC2', targetPort: 'Ethernet0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'R1': { interfaces: { 'GigabitEthernet0/0/0': { ip: '192.168.1.1', subnet: '24', state: 'up' }, 'GigabitEthernet0/0/1': { ip: '10.0.0.1', subnet: '30', state: 'up' } } },
                'R2': { interfaces: { 'GigabitEthernet0/0/0': { ip: '192.168.2.1', subnet: '24', state: 'up' }, 'GigabitEthernet0/0/1': { ip: '10.0.0.2', subnet: '30', state: 'up' } } },
                'PC1': { interfaces: { 'Ethernet0': { ip: '192.168.1.10', subnet: '24', state: 'up' } }, gateway: '192.168.1.1' },
                'PC2': { interfaces: { 'Ethernet0': { ip: '192.168.2.10', subnet: '24', state: 'up' } }, gateway: '192.168.2.1' }
            }
        },
        tasks: [
            {
                description: 'Configure a static route on R1 to reach PC2\'s network (192.168.2.0/24)',
                hints: ['Use the "ip route" command in global config mode.', 'Syntax: ip route [network] [mask] [next-hop-ip]', 'The next hop is R2\'s Gi0/0/1 IP (10.0.0.2)'],
                checks: [{ type: 'static_route', node: 'R1', network: '192.168.2.0', cidr: '24', nextHop: '10.0.0.2' }]
            },
            {
                description: 'Configure a static route on R2 to reach PC1\'s network (192.168.1.0/24)',
                hints: ['Use the "ip route" command in global config mode.', 'The next hop is R1\'s Gi0/0/1 IP (10.0.0.1)'],
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
        id: 'ccna-03',
        certification: 'CCNA',
        category: 'Switching',
        difficulty: 'Medium',
        timeEstimate: '20 mins',
        title: 'VLANs and Access Ports',
        description: 'Configure VLANs 10 and 20 on a switch and assign access ports.',
        topology: {
            nodes: [
                { id: 'SW1', template: 'cisco_switch_2960', x: 300, y: 200, name: 'SW1' },
                { id: 'PC1', template: 'windows_pc', x: 150, y: 350, name: 'PC1' },
                { id: 'PC2', template: 'windows_pc', x: 450, y: 350, name: 'PC2' }
            ],
            edges: [
                { source: 'SW1', sourcePort: 'FastEthernet0/1', target: 'PC1', targetPort: 'Ethernet0', cableType: 'copper_straight' },
                { source: 'SW1', sourcePort: 'FastEthernet0/2', target: 'PC2', targetPort: 'Ethernet0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'PC1': { interfaces: { 'Ethernet0': { ip: '192.168.10.10', subnet: '24', state: 'up' } } },
                'PC2': { interfaces: { 'Ethernet0': { ip: '192.168.20.10', subnet: '24', state: 'up' } } }
            }
        },
        tasks: [
            {
                description: 'Create VLAN 10 named "SALES" and VLAN 20 named "HR" on SW1',
                hints: ['Use "vlan 10" then "name SALES".', 'Repeat for VLAN 20 and "HR".'],
                checks: [
                    { type: 'vlan_exists', node: 'SW1', vlanId: '10', name: 'SALES' },
                    { type: 'vlan_exists', node: 'SW1', vlanId: '20', name: 'HR' }
                ]
            },
            {
                description: 'Configure FastEthernet0/1 as an access port in VLAN 10',
                hints: ['Enter interface config mode for fa0/1.', 'Use "switchport mode access" and "switchport access vlan 10".'],
                checks: [
                    { type: 'switchport_mode', node: 'SW1', interface: 'FastEthernet0/1', expected: 'access' },
                    { type: 'vlan_port_assignment', node: 'SW1', interface: 'FastEthernet0/1', vlanId: '10' }
                ]
            },
            {
                description: 'Configure FastEthernet0/2 as an access port in VLAN 20',
                hints: ['Enter interface config mode for fa0/2.', 'Use "switchport mode access" and "switchport access vlan 20".'],
                checks: [
                    { type: 'switchport_mode', node: 'SW1', interface: 'FastEthernet0/2', expected: 'access' },
                    { type: 'vlan_port_assignment', node: 'SW1', interface: 'FastEthernet0/2', vlanId: '20' }
                ]
            }
        ]
    },
    {
        id: 'ccna-04',
        certification: 'CCNA',
        category: 'Switching',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'Trunking Configuration',
        description: 'Configure an 802.1Q trunk link between two switches to allow VLANs 10 and 20 to communicate.',
        topology: {
            nodes: [
                { id: 'SW1', template: 'cisco_switch_2960', x: 200, y: 200, name: 'SW1' },
                { id: 'SW2', template: 'cisco_switch_2960', x: 500, y: 200, name: 'SW2' },
                { id: 'PC1', template: 'windows_pc', x: 100, y: 350, name: 'PC1' },
                { id: 'PC2', template: 'windows_pc', x: 600, y: 350, name: 'PC2' }
            ],
            edges: [
                { source: 'SW1', sourcePort: 'GigabitEthernet0/1', target: 'SW2', targetPort: 'GigabitEthernet0/1', cableType: 'copper_crossover' },
                { source: 'SW1', sourcePort: 'FastEthernet0/1', target: 'PC1', targetPort: 'Ethernet0', cableType: 'copper_straight' },
                { source: 'SW2', sourcePort: 'FastEthernet0/1', target: 'PC2', targetPort: 'Ethernet0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'SW1': {
                    vlans: { '10': { name: 'IT' } },
                    interfaces: { 'FastEthernet0/1': { state: 'up', switchportMode: 'access', accessVlan: 10 } }
                },
                'SW2': {
                    vlans: { '10': { name: 'IT' } },
                    interfaces: { 'FastEthernet0/1': { state: 'up', switchportMode: 'access', accessVlan: 10 } }
                },
                'PC1': { interfaces: { 'Ethernet0': { ip: '192.168.10.1', subnet: '24', state: 'up' } } },
                'PC2': { interfaces: { 'Ethernet0': { ip: '192.168.10.2', subnet: '24', state: 'up' } } }
            }
        },
        tasks: [
            {
                description: 'Configure GigabitEthernet0/1 on SW1 as an 802.1q trunk',
                hints: ['Enter interface config mode for Gi0/1.', 'Use "switchport mode trunk".'],
                checks: [{ type: 'trunk_mode', node: 'SW1', interface: 'GigabitEthernet0/1' }]
            },
            {
                description: 'Configure GigabitEthernet0/1 on SW2 as an 802.1q trunk',
                hints: ['Enter interface config mode for Gi0/1 on SW2.', 'Use "switchport mode trunk".'],
                checks: [{ type: 'trunk_mode', node: 'SW2', interface: 'GigabitEthernet0/1' }]
            },
            {
                description: 'Verify connectivity by pinging PC2 from PC1',
                hints: ['Open the terminal on PC1 and ping 192.168.10.2.'],
                checks: [{ type: 'can_reach', source: 'PC1', destination: 'PC2' }]
            }
        ]
    },
    {
        id: 'ccna-05',
        certification: 'CCNA',
        category: 'Routing',
        difficulty: 'Hard',
        timeEstimate: '30 mins',
        title: 'Router on a Stick (Inter-VLAN Routing)',
        description: 'Configure a router and switch to provide routing between VLAN 10 and VLAN 20.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 350, y: 150, name: 'R1' },
                { id: 'SW1', template: 'cisco_switch_2960', x: 350, y: 300, name: 'SW1' },
                { id: 'PC1', template: 'windows_pc', x: 200, y: 400, name: 'PC1' },
                { id: 'PC2', template: 'windows_pc', x: 500, y: 400, name: 'PC2' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/0', target: 'SW1', targetPort: 'GigabitEthernet0/1', cableType: 'copper_straight' },
                { source: 'SW1', sourcePort: 'FastEthernet0/1', target: 'PC1', targetPort: 'Ethernet0', cableType: 'copper_straight' },
                { source: 'SW1', sourcePort: 'FastEthernet0/2', target: 'PC2', targetPort: 'Ethernet0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'PC1': { interfaces: { 'Ethernet0': { ip: '192.168.10.10', subnet: '24', state: 'up' } }, gateway: '192.168.10.1' },
                'PC2': { interfaces: { 'Ethernet0': { ip: '192.168.20.10', subnet: '24', state: 'up' } }, gateway: '192.168.20.1' },
                'SW1': {
                    vlans: { '10': { name: 'VLAN10' }, '20': { name: 'VLAN20' } },
                    interfaces: {
                        'FastEthernet0/1': { state: 'up', switchportMode: 'access', accessVlan: 10 },
                        'FastEthernet0/2': { state: 'up', switchportMode: 'access', accessVlan: 20 }
                    }
                }
            }
        },
        tasks: [
            {
                description: 'Configure Gi0/1 on SW1 as a trunk',
                hints: ['Enter interface config mode.', 'Use "switchport mode trunk".'],
                checks: [{ type: 'trunk_mode', node: 'SW1', interface: 'GigabitEthernet0/1' }]
            },
            {
                description: 'Enable the physical interface Gi0/0/0 on R1',
                hints: ['Enter interface config mode for Gi0/0/0.', 'Use "no shutdown" (do not assign an IP address here).'],
                checks: [{ type: 'interface_state', node: 'R1', interface: 'GigabitEthernet0/0/0', expected: 'up' }]
            },
            {
                description: 'Configure sub-interface Gi0/0/0.10 for VLAN 10 (IP 192.168.10.1/24)',
                hints: ['Use "interface g0/0/0.10".', 'Use "encapsulation dot1q 10".', 'Assign the IP.'],
                checks: [
                    { type: 'interface_ip', node: 'R1', interface: 'GigabitEthernet0/0/0.10', ip: '192.168.10.1', subnet: '24' },
                    { type: 'interface_state', node: 'R1', interface: 'GigabitEthernet0/0/0.10', expected: 'up' }
                ]
            },
            {
                description: 'Configure sub-interface Gi0/0/0.20 for VLAN 20 (IP 192.168.20.1/24)',
                hints: ['Use "interface g0/0/0.20".', 'Use "encapsulation dot1q 20".', 'Assign the IP.'],
                checks: [
                    { type: 'interface_ip', node: 'R1', interface: 'GigabitEthernet0/0/0.20', ip: '192.168.20.1', subnet: '24' },
                    { type: 'interface_state', node: 'R1', interface: 'GigabitEthernet0/0/0.20', expected: 'up' }
                ]
            },
            {
                description: 'Verify routing between VLANs by pinging PC2 from PC1',
                hints: ['Open the terminal on PC1 and ping 192.168.20.10.'],
                checks: [{ type: 'can_reach', source: 'PC1', destination: 'PC2' }]
            }
        ]
    },
    {
        id: 'ccna-06',
        certification: 'CCNA',
        category: 'Routing',
        difficulty: 'Medium',
        timeEstimate: '20 mins',
        title: 'Single-Area OSPFv2',
        description: 'Configure Single-Area OSPF on two routers to enable routing between their attached networks.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 200, y: 200, name: 'R1' },
                { id: 'R2', template: 'cisco_router_4321', x: 500, y: 200, name: 'R2' },
                { id: 'PC1', template: 'windows_pc', x: 100, y: 300, name: 'PC1' },
                { id: 'PC2', template: 'windows_pc', x: 600, y: 300, name: 'PC2' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/0', target: 'PC1', targetPort: 'Ethernet0', cableType: 'copper_straight' },
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/1', target: 'R2', targetPort: 'GigabitEthernet0/0/1', cableType: 'copper_crossover' },
                { source: 'R2', sourcePort: 'GigabitEthernet0/0/0', target: 'PC2', targetPort: 'Ethernet0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'R1': { interfaces: { 'GigabitEthernet0/0/0': { ip: '192.168.1.1', subnet: '24', state: 'up' }, 'GigabitEthernet0/0/1': { ip: '10.0.0.1', subnet: '30', state: 'up' } } },
                'R2': { interfaces: { 'GigabitEthernet0/0/0': { ip: '192.168.2.1', subnet: '24', state: 'up' }, 'GigabitEthernet0/0/1': { ip: '10.0.0.2', subnet: '30', state: 'up' } } },
                'PC1': { interfaces: { 'Ethernet0': { ip: '192.168.1.10', subnet: '24', state: 'up' } }, gateway: '192.168.1.1' },
                'PC2': { interfaces: { 'Ethernet0': { ip: '192.168.2.10', subnet: '24', state: 'up' } }, gateway: '192.168.2.1' }
            }
        },
        tasks: [
            {
                description: 'Enable OSPF process 1 on R1 and advertise the 192.168.1.0/24 and 10.0.0.0/30 networks in area 0',
                hints: ['Use "router ospf 1".', 'Use "network 192.168.1.0 0.0.0.255 area 0".', 'Use "network 10.0.0.0 0.0.0.3 area 0".'],
                checks: [
                    { type: 'ospf_enabled', node: 'R1' },
                    { type: 'ospf_network', node: 'R1', network: '192.168.1.0', wildcard: '0.0.0.255', area: '0' },
                    { type: 'ospf_network', node: 'R1', network: '10.0.0.0', wildcard: '0.0.0.3', area: '0' }
                ]
            },
            {
                description: 'Enable OSPF process 1 on R2 and advertise the 192.168.2.0/24 and 10.0.0.0/30 networks in area 0',
                hints: ['Use "router ospf 1".', 'Use "network 192.168.2.0 0.0.0.255 area 0".', 'Use "network 10.0.0.0 0.0.0.3 area 0".'],
                checks: [
                    { type: 'ospf_enabled', node: 'R2' },
                    { type: 'ospf_network', node: 'R2', network: '192.168.2.0', wildcard: '0.0.0.255', area: '0' },
                    { type: 'ospf_network', node: 'R2', network: '10.0.0.0', wildcard: '0.0.0.3', area: '0' }
                ]
            },
            {
                description: 'Verify connectivity by pinging PC2 from PC1',
                hints: ['Wait a moment for OSPF neighbors to form.', 'Open the PC1 terminal and ping 192.168.2.10.'],
                checks: [{ type: 'can_reach', source: 'PC1', destination: 'PC2' }]
            }
        ]
    },
    {
        id: 'ccna-07',
        certification: 'CCNA',
        category: 'Services',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'DHCP Server Configuration',
        description: 'Configure a Cisco router as a DHCP server for the local network.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 300, y: 150, name: 'R1' },
                { id: 'SW1', template: 'cisco_switch_2960', x: 300, y: 300, name: 'SW1' },
                { id: 'PC1', template: 'windows_pc', x: 200, y: 400, name: 'PC1' },
                { id: 'PC2', template: 'windows_pc', x: 400, y: 400, name: 'PC2' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/0', target: 'SW1', targetPort: 'GigabitEthernet0/1', cableType: 'copper_straight' },
                { source: 'SW1', sourcePort: 'FastEthernet0/1', target: 'PC1', targetPort: 'Ethernet0', cableType: 'copper_straight' },
                { source: 'SW1', sourcePort: 'FastEthernet0/2', target: 'PC2', targetPort: 'Ethernet0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'R1': { interfaces: { 'GigabitEthernet0/0/0': { ip: '192.168.50.1', subnet: '24', state: 'up' } } },
                'SW1': { interfaces: { 'GigabitEthernet0/1': { state: 'up' }, 'FastEthernet0/1': { state: 'up' }, 'FastEthernet0/2': { state: 'up' } } },
                'PC1': { interfaces: { 'Ethernet0': { state: 'up' } }, useDHCP: true },
                'PC2': { interfaces: { 'Ethernet0': { state: 'up' } }, useDHCP: true }
            }
        },
        tasks: [
            {
                description: 'Create a DHCP pool named "LAN_POOL" on R1 for network 192.168.50.0/24',
                hints: ['Use "ip dhcp pool LAN_POOL".', 'Use "network 192.168.50.0 255.255.255.0".'],
                checks: [{ type: 'dhcp_pool', node: 'R1', name: 'LAN_POOL', network: '192.168.50.0', mask: '255.255.255.0' }]
            },
            {
                description: 'Configure the default router (gateway) to be 192.168.50.1 in the pool',
                hints: ['Inside the dhcp pool config, use "default-router 192.168.50.1".'],
                checks: [{ type: 'dhcp_pool', node: 'R1', name: 'LAN_POOL', defaultRouter: '192.168.50.1' }]
            },
            {
                description: 'Configure the DNS server to be 8.8.8.8 in the pool',
                hints: ['Inside the dhcp pool config, use "dns-server 8.8.8.8".'],
                checks: [{ type: 'dhcp_pool', node: 'R1', name: 'LAN_POOL', dns: '8.8.8.8' }]
            },
            {
                description: 'Verify PC1 received an IP address',
                hints: ['Wait a few seconds for DHCP DORA to complete, or restart the PC interface.', 'Check PC1 IP config.'],
                checks: [
                    { type: 'ping_success', source: 'R1', targetIp: '192.168.50.1' } // Soft check, actual implementation would need to check PC IP
                ]
            }
        ]
    },
    {
        id: 'ccna-08',
        certification: 'CCNA',
        category: 'Security',
        difficulty: 'Medium',
        timeEstimate: '20 mins',
        title: 'Standard IPv4 ACL',
        description: 'Configure a Standard ACL to block PC1 from reaching the Server while allowing PC2.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 300, y: 200, name: 'R1' },
                { id: 'SW1', template: 'cisco_switch_2960', x: 200, y: 300, name: 'SW1' },
                { id: 'PC1', template: 'windows_pc', x: 100, y: 400, name: 'PC1' },
                { id: 'PC2', template: 'windows_pc', x: 300, y: 400, name: 'PC2' },
                { id: 'SRV1', template: 'linux_server', x: 500, y: 200, name: 'Server1' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/0', target: 'SW1', targetPort: 'GigabitEthernet0/1', cableType: 'copper_straight' },
                { source: 'SW1', sourcePort: 'FastEthernet0/1', target: 'PC1', targetPort: 'Ethernet0', cableType: 'copper_straight' },
                { source: 'SW1', sourcePort: 'FastEthernet0/2', target: 'PC2', targetPort: 'Ethernet0', cableType: 'copper_straight' },
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/1', target: 'SRV1', targetPort: 'Ethernet0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'R1': {
                    interfaces: {
                        'GigabitEthernet0/0/0': { ip: '192.168.1.1', subnet: '24', state: 'up' },
                        'GigabitEthernet0/0/1': { ip: '10.0.0.1', subnet: '24', state: 'up' }
                    }
                },
                'PC1': { interfaces: { 'Ethernet0': { ip: '192.168.1.10', subnet: '24', state: 'up' } }, gateway: '192.168.1.1' },
                'PC2': { interfaces: { 'Ethernet0': { ip: '192.168.1.20', subnet: '24', state: 'up' } }, gateway: '192.168.1.1' },
                'SRV1': { interfaces: { 'Ethernet0': { ip: '10.0.0.100', subnet: '24', state: 'up' } }, gateway: '10.0.0.1' }
            }
        },
        tasks: [
            {
                description: 'Create access-list 10 to deny PC1 (192.168.1.10)',
                hints: ['Use "access-list 10 deny host 192.168.1.10"'],
                checks: [{ type: 'acl_exists', node: 'R1', aclId: '10' }, { type: 'acl_entry', node: 'R1', aclId: '10', action: 'deny', source: '192.168.1.10' }]
            },
            {
                description: 'Add a permit any statement to access-list 10',
                hints: ['Use "access-list 10 permit any"'],
                checks: [{ type: 'acl_entry', node: 'R1', aclId: '10', action: 'permit', source: 'any' }]
            }
        ]
    },
    {
        id: 'ccna-09',
        certification: 'CCNA',
        category: 'Services',
        difficulty: 'Medium',
        timeEstimate: '20 mins',
        title: 'Static NAT Configuration',
        description: 'Configure static NAT to map an internal server to a public IP.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 300, y: 200, name: 'Gateway' },
                { id: 'SRV1', template: 'linux_server', x: 100, y: 200, name: 'Internal-SRV' },
                { id: 'ISP', template: 'isp_router', x: 500, y: 200, name: 'Internet' }
            ],
            edges: [
                { source: 'SRV1', sourcePort: 'Ethernet0', target: 'R1', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_straight' },
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/1', target: 'ISP', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'R1': {
                    interfaces: {
                        'GigabitEthernet0/0/0': { ip: '192.168.1.1', subnet: '24', state: 'up' },
                        'GigabitEthernet0/0/1': { ip: '203.0.113.2', subnet: '30', state: 'up' }
                    }
                },
                'SRV1': { interfaces: { 'Ethernet0': { ip: '192.168.1.100', subnet: '24', state: 'up' } }, gateway: '192.168.1.1' }
            }
        },
        tasks: [
            {
                description: 'Configure Gi0/0/0 as NAT inside',
                hints: ['Enter interface config mode for Gi0/0/0.', 'Use "ip nat inside".'],
                checks: [{ type: 'nat_inside', node: 'R1', interface: 'GigabitEthernet0/0/0' }]
            },
            {
                description: 'Configure Gi0/0/1 as NAT outside',
                hints: ['Enter interface config mode for Gi0/0/1.', 'Use "ip nat outside".'],
                checks: [{ type: 'nat_outside', node: 'R1', interface: 'GigabitEthernet0/0/1' }]
            },
            {
                description: 'Create a static NAT mapping for 192.168.1.100 to 203.0.113.5',
                hints: ['Use "ip nat inside source static 192.168.1.100 203.0.113.5".'],
                checks: [{ type: 'nat_static', node: 'R1', inside: '192.168.1.100', outside: '203.0.113.5' }]
            }
        ]
    },
    {
        id: 'ccna-10',
        certification: 'CCNA',
        category: 'Security',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'Switch Port Security',
        description: 'Configure switch port security to restrict access to a single MAC address.',
        topology: {
            nodes: [
                { id: 'SW1', template: 'cisco_switch_2960', x: 300, y: 200, name: 'Access-SW' },
                { id: 'PC1', template: 'windows_pc', x: 200, y: 350, name: 'Authorized-PC' },
                { id: 'PC2', template: 'windows_pc', x: 400, y: 350, name: 'Rogue-PC' }
            ],
            edges: [
                { source: 'SW1', sourcePort: 'FastEthernet0/1', target: 'PC1', targetPort: 'Ethernet0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'PC1': { interfaces: { 'Ethernet0': { ip: '192.168.1.10', subnet: '24', state: 'up' } } },
                'PC2': { interfaces: { 'Ethernet0': { ip: '192.168.1.99', subnet: '24', state: 'up' } } }
            }
        },
        tasks: [
            {
                description: 'Enable port security on FastEthernet0/1',
                hints: ['Enter interface config for fa0/1.', 'Make it an access port first: "switchport mode access".', 'Then "switchport port-security".'],
                checks: [
                    { type: 'switchport_mode', node: 'SW1', interface: 'FastEthernet0/1', expected: 'access' }
                ]
            },
            {
                description: 'Set maximum allowed MAC addresses to 1 and violation mode to restrict',
                hints: ['Use "switchport port-security maximum 1".', 'Use "switchport port-security violation restrict".'],
                checks: [
                    { type: 'switchport_mode', node: 'SW1', interface: 'FastEthernet0/1', expected: 'access' } // Soft check
                ]
            }
        ]
    },
    {
        id: 'ccna-11',
        certification: 'CCNA',
        category: 'Switching',
        difficulty: 'Medium',
        timeEstimate: '10 mins',
        title: 'STP Root Guard Configuration',
        description: 'Configure Root Guard on a switch port to prevent a rogue switch from becoming the Root Bridge.',
        topology: {
            nodes: [
                { id: 'CoreSW', template: 'cisco_switch_3560', x: 300, y: 150, name: 'Core-Switch' },
                { id: 'AccSW', template: 'cisco_switch_2960', x: 300, y: 350, name: 'Access-Switch' }
            ],
            edges: [
                { source: 'CoreSW', sourcePort: 'GigabitEthernet0/1', target: 'AccSW', targetPort: 'GigabitEthernet0/1', cableType: 'copper_crossover' }
            ],
            preConfig: {
                'CoreSW': { vlans: { '1': { name: 'default' } } },
                'AccSW': { vlans: { '1': { name: 'default' } } }
            }
        },
        tasks: [
            {
                description: 'Enable Root Guard on Core-Switch interface Gi0/1',
                hints: ['Enter interface config for Gi0/1', 'Use "spanning-tree guard root"'],
                checks: [
                    // this would be a soft check or rely on an exact command match if history checking was implemented.
                    { type: 'interface_state', node: 'CoreSW', interface: 'GigabitEthernet0/1', state: 'up' }
                ]
            }
        ]
    },
    {
        id: 'ccna-12',
        certification: 'CCNA',
        category: 'Routing',
        difficulty: 'Hard',
        timeEstimate: '20 mins',
        title: 'OSPF Cost Manipulation',
        description: 'Change the OSPF cost on an interface to manipulate the routing path.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 200, y: 200, name: 'R1' },
                { id: 'R2', template: 'cisco_router_4321', x: 500, y: 100, name: 'R2' },
                { id: 'R3', template: 'cisco_router_4321', x: 500, y: 300, name: 'R3' },
                { id: 'R4', template: 'cisco_router_4321', x: 800, y: 200, name: 'R4' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/0', target: 'R2', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_crossover' },
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/1', target: 'R3', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_crossover' },
                { source: 'R2', sourcePort: 'GigabitEthernet0/0/1', target: 'R4', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_crossover' },
                { source: 'R3', sourcePort: 'GigabitEthernet0/0/1', target: 'R4', targetPort: 'GigabitEthernet0/0/1', cableType: 'copper_crossover' }
            ],
            preConfig: {
                'R1': { interfaces: { 'GigabitEthernet0/0/0': { ip: '10.1.12.1', subnet: '30', state: 'up' }, 'GigabitEthernet0/0/1': { ip: '10.1.13.1', subnet: '30', state: 'up' } } },
                'R2': { interfaces: { 'GigabitEthernet0/0/0': { ip: '10.1.12.2', subnet: '30', state: 'up' }, 'GigabitEthernet0/0/1': { ip: '10.1.24.2', subnet: '30', state: 'up' } } },
                'R3': { interfaces: { 'GigabitEthernet0/0/0': { ip: '10.1.13.3', subnet: '30', state: 'up' }, 'GigabitEthernet0/0/1': { ip: '10.1.34.3', subnet: '30', state: 'up' } } },
                'R4': { interfaces: { 'GigabitEthernet0/0/0': { ip: '10.1.24.4', subnet: '30', state: 'up' }, 'GigabitEthernet0/0/1': { ip: '10.1.34.4', subnet: '30', state: 'up' } } }
            }
        },
        tasks: [
            {
                description: 'Enable OSPF Process 1 in Area 0 on all routers (Pre-requisite)',
                hints: ['Use "router ospf 1" and "network 10.0.0.0 0.255.255.255 area 0" on all routers.'],
                checks: [
                    { type: 'ospf_enabled', node: 'R1' }, { type: 'ospf_enabled', node: 'R2' },
                    { type: 'ospf_enabled', node: 'R3' }, { type: 'ospf_enabled', node: 'R4' }
                ]
            },
            {
                description: 'Increase the OSPF cost on R1 Gi0/0/0 to 100 to force traffic through R3',
                hints: ['On R1, enter interface Gi0/0/0.', 'Use "ip ospf cost 100".'],
                checks: [
                    { type: 'ospf_enabled', node: 'R1' }
                ]
            }
        ]
    },
    {
        id: 'ccna-13',
        certification: 'CCNA',
        category: 'Discovery',
        difficulty: 'Easy',
        timeEstimate: '10 mins',
        title: 'CDP and LLDP Configuration',
        description: 'Enable and verify Cisco Discovery Protocol and Link Layer Discovery Protocol.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 200, y: 200, name: 'Router1' },
                { id: 'SW1', template: 'cisco_switch_2960', x: 500, y: 200, name: 'Switch1' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/0', target: 'SW1', targetPort: 'GigabitEthernet0/1', cableType: 'copper_straight' }
            ],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Enable LLDP globally on the router',
                hints: ['Use "lldp run" in global config mode.'],
                checks: [{ type: 'lldp_enabled', node: 'R1' }] // Soft check
            },
            {
                description: 'Disable CDP globally on the switch',
                hints: ['Use "no cdp run" in global config mode.'],
                checks: [{ type: 'cdp_disabled', node: 'SW1' }] // Soft check
            }
        ]
    },
    {
        id: 'ccna-14',
        certification: 'CCNA',
        category: 'Security',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'Port-Security Sticky MAC',
        description: 'Configure port-security to dynamically learn and stick a single MAC address.',
        topology: {
            nodes: [
                { id: 'SW1', template: 'cisco_switch_2960', x: 300, y: 200, name: 'Access-SW' },
                { id: 'PC1', template: 'windows_pc', x: 300, y: 400, name: 'Corp-PC' }
            ],
            edges: [
                { source: 'SW1', sourcePort: 'FastEthernet0/1', target: 'PC1', targetPort: 'Ethernet0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'PC1': { interfaces: { 'Ethernet0': { ip: '10.0.0.50', subnet: '24', state: 'up' } } }
            }
        },
        tasks: [
            {
                description: 'Enable port security with sticky MAC learning on Fa0/1',
                hints: ['"switchport mode access"', '"switchport port-security"', '"switchport port-security mac-address sticky"'],
                checks: [{ type: 'switchport_mode', node: 'SW1', interface: 'FastEthernet0/1', expected: 'access' }]
            }
        ]
    },
    {
        id: 'ccna-15',
        certification: 'CCNA',
        category: 'Routing',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'Default Static Route',
        description: 'Configure a default static route to reach the internet via an ISP.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 200, y: 200, name: 'Gateway' },
                { id: 'ISP', template: 'isp_router', x: 600, y: 200, name: 'Internet' },
                { id: 'PC1', template: 'windows_pc', x: 200, y: 400, name: 'LAN-PC' }
            ],
            edges: [
                { source: 'PC1', sourcePort: 'Ethernet0', target: 'R1', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_straight' },
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/1', target: 'ISP', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'R1': { interfaces: { 'GigabitEthernet0/0/0': { ip: '192.168.1.1', subnet: '24', state: 'up' }, 'GigabitEthernet0/0/1': { ip: '203.0.113.2', subnet: '30', state: 'up' } } },
                'PC1': { interfaces: { 'Ethernet0': { ip: '192.168.1.10', subnet: '24', state: 'up' } }, gateway: '192.168.1.1' },
                'ISP': { interfaces: { 'GigabitEthernet0/0/0': { ip: '203.0.113.1', subnet: '30', state: 'up' }, 'Loopback0': { ip: '8.8.8.8', subnet: '32', state: 'up' } } }
            }
        },
        tasks: [
            {
                description: 'Configure a default route on the Gateway pointing to the ISP (203.0.113.1)',
                hints: ['Use "ip route 0.0.0.0 0.0.0.0 203.0.113.1"'],
                checks: [{ type: 'static_route', node: 'R1', network: '0.0.0.0', cidr: '0', nextHop: '203.0.113.1' }]
            },
            {
                description: 'Verify internet reachability',
                hints: ['Ping 8.8.8.8 from LAN-PC.'],
                checks: [{ type: 'can_reach', source: 'PC1', destination: 'ISP' }]
            }
        ]
    },
    {
        id: 'ccna-16',
        certification: 'CCNA',
        category: 'Routing',
        difficulty: 'Medium',
        timeEstimate: '20 mins',
        title: 'Inter-VLAN Routing (Layer 3 Switch)',
        description: 'Configure Switch Virtual Interfaces (SVIs) on a multilayer switch to route between VLANs.',
        topology: {
            nodes: [
                { id: 'SW1', template: 'cisco_switch_3560', x: 300, y: 200, name: 'Core-L3' },
                { id: 'PC1', template: 'windows_pc', x: 150, y: 350, name: 'VLAN10-PC' },
                { id: 'PC2', template: 'windows_pc', x: 450, y: 350, name: 'VLAN20-PC' }
            ],
            edges: [
                { source: 'SW1', sourcePort: 'FastEthernet0/1', target: 'PC1', targetPort: 'Ethernet0', cableType: 'copper_straight' },
                { source: 'SW1', sourcePort: 'FastEthernet0/2', target: 'PC2', targetPort: 'Ethernet0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'SW1': { vlans: { '10': { name: 'IT' }, '20': { name: 'HR' } } },
                'PC1': { interfaces: { 'Ethernet0': { ip: '10.0.10.5', subnet: '24', state: 'up' } }, gateway: '10.0.10.1' },
                'PC2': { interfaces: { 'Ethernet0': { ip: '10.0.20.5', subnet: '24', state: 'up' } }, gateway: '10.0.20.1' }
            }
        },
        tasks: [
            {
                description: 'Enable IP routing on the Layer 3 switch',
                hints: ['Use "ip routing" in global config mode.'],
                checks: [{ type: 'ip_routing', node: 'SW1' }] // Soft check
            },
            {
                description: 'Configure SVI for VLAN 10 (10.0.10.1/24)',
                hints: ['interface vlan 10', 'ip address 10.0.10.1 255.255.255.0', 'no shutdown'],
                checks: [{ type: 'interface_ip', node: 'SW1', interface: 'Vlan10', ip: '10.0.10.1', subnet: '24' }]
            },
            {
                description: 'Configure SVI for VLAN 20 (10.0.20.1/24)',
                hints: ['interface vlan 20', 'ip address 10.0.20.1 255.255.255.0', 'no shutdown'],
                checks: [{ type: 'interface_ip', node: 'SW1', interface: 'Vlan20', ip: '10.0.20.1', subnet: '24' }]
            },
            {
                description: 'Assign Fa0/1 to VLAN 10 and Fa0/2 to VLAN 20 as access ports',
                hints: ['switchport mode access', 'switchport access vlan X'],
                checks: [
                    { type: 'vlan_port_assignment', node: 'SW1', interface: 'FastEthernet0/1', vlanId: '10' },
                    { type: 'vlan_port_assignment', node: 'SW1', interface: 'FastEthernet0/2', vlanId: '20' }
                ]
            }
        ]
    },
    {
        id: 'ccna-17',
        certification: 'CCNA',
        category: 'Security',
        difficulty: 'Hard',
        timeEstimate: '25 mins',
        title: 'Extended IPv4 ACL (Web Traffic)',
        description: 'Configure an Extended ACL to permit HTTP/HTTPS traffic to a web server but deny ICMP pings.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 300, y: 200, name: 'Gateway' },
                { id: 'PC1', template: 'linux_pc', x: 100, y: 300, name: 'Client' },
                { id: 'SRV1', template: 'linux_server', x: 500, y: 300, name: 'Web-Server' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/0', target: 'PC1', targetPort: 'eth0', cableType: 'copper_straight' },
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/1', target: 'SRV1', targetPort: 'eth0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'R1': { interfaces: { 'GigabitEthernet0/0/0': { ip: '192.168.1.1', subnet: '24', state: 'up' }, 'GigabitEthernet0/0/1': { ip: '10.0.0.1', subnet: '24', state: 'up' } } },
                'PC1': { interfaces: { 'eth0': { ip: '192.168.1.10', subnet: '24', state: 'up' } }, gateway: '192.168.1.1' },
                'SRV1': { interfaces: { 'eth0': { ip: '10.0.0.100', subnet: '24', state: 'up' } }, gateway: '10.0.0.1' }
            }
        },
        tasks: [
            {
                description: 'Create extended access-list 110 to deny ICMP from Client to Web-Server',
                hints: ['access-list 110 deny icmp host 192.168.1.10 host 10.0.0.100'],
                checks: [{ type: 'acl_exists', node: 'R1', aclId: '110' }, { type: 'acl_entry', node: 'R1', aclId: '110', action: 'deny' }]
            },
            {
                description: 'Permit TCP port 80 (HTTP) to the Web-Server',
                hints: ['access-list 110 permit tcp any host 10.0.0.100 eq 80'],
                checks: [{ type: 'acl_entry', node: 'R1', aclId: '110', action: 'permit' }]
            },
            {
                description: 'Apply ACL 110 inbound on Gi0/0/0',
                hints: ['interface Gi0/0/0', 'ip access-group 110 in'],
                checks: [{ type: 'acl_applied', node: 'R1', interface: 'GigabitEthernet0/0/0', direction: 'in', aclId: '110' }] // Soft check
            }
        ]
    },
    {
        id: 'ccna-18',
        certification: 'CCNA',
        category: 'Services',
        difficulty: 'Hard',
        timeEstimate: '20 mins',
        title: 'PAT (NAT Overload) Configuration',
        description: 'Configure Port Address Translation (PAT) to allow multiple internal hosts to share a single public IP address.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 300, y: 200, name: 'Gateway' },
                { id: 'SW1', template: 'cisco_switch_2960', x: 150, y: 300, name: 'LAN' },
                { id: 'PC1', template: 'windows_pc', x: 50, y: 400, name: 'PC1' },
                { id: 'PC2', template: 'windows_pc', x: 250, y: 400, name: 'PC2' },
                { id: 'ISP', template: 'isp_router', x: 550, y: 200, name: 'Internet' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/0', target: 'SW1', targetPort: 'GigabitEthernet0/1', cableType: 'copper_straight' },
                { source: 'SW1', sourcePort: 'FastEthernet0/1', target: 'PC1', targetPort: 'Ethernet0', cableType: 'copper_straight' },
                { source: 'SW1', sourcePort: 'FastEthernet0/2', target: 'PC2', targetPort: 'Ethernet0', cableType: 'copper_straight' },
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/1', target: 'ISP', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'R1': { interfaces: { 'GigabitEthernet0/0/0': { ip: '192.168.1.1', subnet: '24', state: 'up' }, 'GigabitEthernet0/0/1': { ip: '203.0.113.2', subnet: '30', state: 'up' } } },
                'PC1': { interfaces: { 'Ethernet0': { ip: '192.168.1.10', subnet: '24', state: 'up' } }, gateway: '192.168.1.1' },
                'PC2': { interfaces: { 'Ethernet0': { ip: '192.168.1.20', subnet: '24', state: 'up' } }, gateway: '192.168.1.1' },
                'ISP': { interfaces: { 'GigabitEthernet0/0/0': { ip: '203.0.113.1', subnet: '30', state: 'up' } } }
            }
        },
        tasks: [
            {
                description: 'Create access-list 1 permitting the 192.168.1.0/24 network',
                hints: ['access-list 1 permit 192.168.1.0 0.0.0.255'],
                checks: [{ type: 'acl_exists', node: 'R1', aclId: '1' }]
            },
            {
                description: 'Configure NAT Overload using the Gi0/0/1 interface IP',
                hints: ['ip nat inside source list 1 interface GigabitEthernet0/0/1 overload'],
                checks: [{ type: 'nat_outside', node: 'R1', interface: 'GigabitEthernet0/0/1' }] // Soft check using standard NAT outside interface verification
            },
            {
                description: 'Set NAT inside and outside interfaces',
                hints: ['Gi0/0/0 is inside, Gi0/0/1 is outside.'],
                checks: [
                    { type: 'nat_inside', node: 'R1', interface: 'GigabitEthernet0/0/0' },
                    { type: 'nat_outside', node: 'R1', interface: 'GigabitEthernet0/0/1' }
                ]
            }
        ]
    },
    {
        id: 'ccna-19',
        certification: 'CCNA',
        category: 'Switching',
        difficulty: 'Medium',
        timeEstimate: '20 mins',
        title: 'EtherChannel (LACP) Configuration',
        description: 'Configure an LACP EtherChannel bundle between two switches for increased bandwidth and redundancy.',
        topology: {
            nodes: [
                { id: 'SW1', template: 'cisco_switch_2960', x: 200, y: 200, name: 'Core1' },
                { id: 'SW2', template: 'cisco_switch_2960', x: 500, y: 200, name: 'Core2' }
            ],
            edges: [
                { source: 'SW1', sourcePort: 'GigabitEthernet0/1', target: 'SW2', targetPort: 'GigabitEthernet0/1', cableType: 'copper_crossover' },
                { source: 'SW1', sourcePort: 'GigabitEthernet0/2', target: 'SW2', targetPort: 'GigabitEthernet0/2', cableType: 'copper_crossover' }
            ],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Configure Port-channel 1 on SW1 using LACP active mode for Gi0/1 and Gi0/2',
                hints: ['interface range Gi0/1 - 2', 'channel-group 1 mode active'],
                checks: [{ type: 'interface_state', node: 'SW1', interface: 'GigabitEthernet0/1', state: 'up' }] // Soft check
            },
            {
                description: 'Configure Port-channel 1 on SW2 using LACP active mode',
                hints: ['interface range Gi0/1 - 2', 'channel-group 1 mode active'],
                checks: [{ type: 'interface_state', node: 'SW2', interface: 'GigabitEthernet0/1', state: 'up' }] // Soft check
            },
            {
                description: 'Set Port-channel 1 on both switches as a trunk',
                hints: ['interface port-channel 1', 'switchport mode trunk'],
                checks: [
                    { type: 'switchport_mode', node: 'SW1', interface: 'Port-channel1', expected: 'trunk' },
                    { type: 'switchport_mode', node: 'SW2', interface: 'Port-channel1', expected: 'trunk' }
                ]
            }
        ]
    },
    {
        id: 'ccna-20',
        certification: 'CCNA',
        category: 'Routing',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'IPv6 Static Routing',
        description: 'Enable IPv6 routing and configure a static route to a remote network.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 200, y: 200, name: 'Router1' },
                { id: 'R2', template: 'cisco_router_4321', x: 500, y: 200, name: 'Router2' },
                { id: 'PC1', template: 'linux_pc', x: 800, y: 200, name: 'Host' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/0', target: 'R2', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_crossover' },
                { source: 'R2', sourcePort: 'GigabitEthernet0/0/1', target: 'PC1', targetPort: 'eth0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'R1': { interfaces: { 'GigabitEthernet0/0/0': { ip: '2001:db8:1::1', subnet: '64', state: 'up', isIPv6: true } } },
                'R2': { interfaces: { 'GigabitEthernet0/0/0': { ip: '2001:db8:1::2', subnet: '64', state: 'up', isIPv6: true }, 'GigabitEthernet0/0/1': { ip: '2001:db8:2::1', subnet: '64', state: 'up', isIPv6: true } } },
                'PC1': { interfaces: { 'eth0': { ip: '2001:db8:2::10', subnet: '64', state: 'up', isIPv6: true } }, gateway: '2001:db8:2::1' }
            }
        },
        tasks: [
            {
                description: 'Enable IPv6 unicast routing globally on R1',
                hints: ['Use "ipv6 unicast-routing"'],
                checks: [{ type: 'ipv6_routing', node: 'R1' }] // Soft check
            },
            {
                description: 'Configure an IPv6 static route on R1 for 2001:db8:2::/64 via 2001:db8:1::2',
                hints: ['ipv6 route 2001:db8:2::/64 2001:db8:1::2'],
                checks: [{ type: 'static_route', node: 'R1', network: '2001:db8:2::', cidr: '64', nextHop: '2001:db8:1::2', isIPv6: true }] // Soft check via logic
            }
        ]
    },
    {
        id: 'ccna-21',
        certification: 'CCNA',
        category: 'Services',
        difficulty: 'Easy',
        timeEstimate: '10 mins',
        title: 'NTP and Syslog',
        description: 'Configure the router to sync time from an NTP server and log messages to a Syslog server.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 200, y: 200, name: 'Gateway' },
                { id: 'Srv', template: 'linux_server', x: 500, y: 200, name: 'Management-Srv' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/0', target: 'Srv', targetPort: 'eth0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'R1': { interfaces: { 'GigabitEthernet0/0/0': { ip: '10.0.0.1', subnet: '24', state: 'up' } } },
                'Srv': { interfaces: { 'eth0': { ip: '10.0.0.100', subnet: '24', state: 'up' } }, gateway: '10.0.0.1' }
            }
        },
        tasks: [
            {
                description: 'Configure the router to use 10.0.0.100 as its NTP server',
                hints: ['Use "ntp server 10.0.0.100"'],
                checks: [{ type: 'ntp_server', node: 'R1', ip: '10.0.0.100' }] // Soft check
            },
            {
                description: 'Configure the router to send logs to the Syslog server at 10.0.0.100',
                hints: ['Use "logging host 10.0.0.100" or "logging 10.0.0.100"'],
                checks: [{ type: 'syslog_server', node: 'R1', ip: '10.0.0.100' }] // Soft check
            }
        ]
    },
    {
        id: 'ccna-22',
        certification: 'CCNA',
        category: 'Security',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'SSH Configuration',
        description: 'Secure management access by enabling SSH on the VTY lines.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 300, y: 200, name: 'R1' }
            ],
            edges: [],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Set hostname to R1 and domain-name to cisco.com',
                hints: ['hostname R1', 'ip domain-name cisco.com'],
                checks: [{ type: 'hostname', node: 'R1', expected: 'R1' }]
            },
            {
                description: 'Generate RSA crypto keys with 1024 modulus',
                hints: ['crypto key generate rsa modulus 1024'],
                checks: [{ type: 'crypto_key', node: 'R1', type: 'rsa' }] // Soft check
            },
            {
                description: 'Create a local user "admin" with secret "cisco123"',
                hints: ['username admin secret cisco123'],
                checks: [{ type: 'local_user', node: 'R1', username: 'admin' }] // Soft check
            },
            {
                description: 'Configure VTY lines 0 4 to use local auth and only accept SSH',
                hints: ['line vty 0 4', 'login local', 'transport input ssh'],
                checks: [{ type: 'vty_config', node: 'R1', transport: 'ssh' }] // Soft check
            }
        ]
    },
    {
        id: 'ccna-23',
        certification: 'CCNA',
        category: 'Routing',
        difficulty: 'Hard',
        timeEstimate: '20 mins',
        title: 'OSPFv3 (IPv6) Configuration',
        description: 'Configure OSPFv3 for IPv6 routing between two routers.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 200, y: 200, name: 'Router1' },
                { id: 'R2', template: 'cisco_router_4321', x: 500, y: 200, name: 'Router2' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/0', target: 'R2', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_crossover' }
            ],
            preConfig: {
                'R1': { interfaces: { 'GigabitEthernet0/0/0': { ip: '2001:db8:12::1', subnet: '64', state: 'up', isIPv6: true }, 'Loopback0': { ip: '2001:db8:1::1', subnet: '128', state: 'up', isIPv6: true } } },
                'R2': { interfaces: { 'GigabitEthernet0/0/0': { ip: '2001:db8:12::2', subnet: '64', state: 'up', isIPv6: true }, 'Loopback0': { ip: '2001:db8:2::2', subnet: '128', state: 'up', isIPv6: true } } }
            }
        },
        tasks: [
            {
                description: 'Enable IPv6 unicast routing on both routers',
                hints: ['ipv6 unicast-routing'],
                checks: [{ type: 'ipv6_routing', node: 'R1' }, { type: 'ipv6_routing', node: 'R2' }] // Soft check
            },
            {
                description: 'Configure an IPv4 Router ID for OSPFv3 on both routers (1.1.1.1 and 2.2.2.2)',
                hints: ['ipv6 router ospf 1', 'router-id 1.1.1.1'],
                checks: [{ type: 'ospfv3_router_id', node: 'R1', id: '1.1.1.1' }] // Soft check
            },
            {
                description: 'Enable OSPFv3 Area 0 on Gi0/0/0 and Loopback0 for both routers',
                hints: ['interface Gi0/0/0', 'ipv6 ospf 1 area 0'],
                checks: [{ type: 'ospfv3_enabled', node: 'R1' }] // Soft check
            }
        ]
    },
    {
        id: 'ccna-24',
        certification: 'CCNA',
        category: 'Switching',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'DTP and VTP Configuration',
        description: 'Configure Dynamic Trunking Protocol (DTP) and VLAN Trunking Protocol (VTP) between switches.',
        topology: {
            nodes: [
                { id: 'SW1', template: 'cisco_switch_3560', x: 200, y: 200, name: 'VTP-Server' },
                { id: 'SW2', template: 'cisco_switch_2960', x: 500, y: 200, name: 'VTP-Client' }
            ],
            edges: [
                { source: 'SW1', sourcePort: 'GigabitEthernet0/1', target: 'SW2', targetPort: 'GigabitEthernet0/1', cableType: 'copper_crossover' }
            ],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Configure SW1 as VTP Server and SW2 as VTP Client in domain "CISCO"',
                hints: ['vtp mode server', 'vtp domain CISCO', 'vtp password secret'],
                checks: [{ type: 'vtp_domain', node: 'SW1', expected: 'CISCO' }, { type: 'vtp_mode', node: 'SW2', expected: 'client' }] // Soft check
            },
            {
                description: 'Configure dynamic desirable mode on SW1 Gi0/1 to form a trunk',
                hints: ['interface Gi0/1', 'switchport mode dynamic desirable'],
                checks: [{ type: 'switchport_mode', node: 'SW1', interface: 'GigabitEthernet0/1', expected: 'dynamic desirable' }] // Soft check
            }
        ]
    },
    {
        id: 'ccna-25',
        certification: 'CCNA',
        category: 'Security',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'VTY Access-Class',
        description: 'Use a standard ACL to restrict Telnet/SSH access to the VTY lines.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 300, y: 200, name: 'Router1' },
                { id: 'Admin', template: 'linux_pc', x: 100, y: 300, name: 'Admin-PC' },
                { id: 'Guest', template: 'linux_pc', x: 500, y: 300, name: 'Guest-PC' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/0', target: 'Admin', targetPort: 'eth0', cableType: 'copper_straight' },
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/1', target: 'Guest', targetPort: 'eth0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'R1': { interfaces: { 'GigabitEthernet0/0/0': { ip: '10.0.10.1', subnet: '24', state: 'up' }, 'GigabitEthernet0/0/1': { ip: '10.0.20.1', subnet: '24', state: 'up' } } },
                'Admin': { interfaces: { 'eth0': { ip: '10.0.10.50', subnet: '24', state: 'up' } }, gateway: '10.0.10.1' },
                'Guest': { interfaces: { 'eth0': { ip: '10.0.20.50', subnet: '24', state: 'up' } }, gateway: '10.0.20.1' }
            }
        },
        tasks: [
            {
                description: 'Create standard ACL 10 to permit the Admin-PC (10.0.10.50)',
                hints: ['access-list 10 permit host 10.0.10.50'],
                checks: [{ type: 'acl_exists', node: 'R1', aclId: '10' }]
            },
            {
                description: 'Apply ACL 10 to VTY lines 0 4 using access-class',
                hints: ['line vty 0 4', 'access-class 10 in'],
                checks: [{ type: 'vty_access_class', node: 'R1', aclId: '10', direction: 'in' }] // Soft check
            }
        ]
    }
];
