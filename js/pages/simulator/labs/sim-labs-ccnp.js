// sim-labs-ccnp.js
// CCNP Certification Labs

export const CCNP_LABS = [
    {
        id: 'ccnp-01',
        certification: 'CCNP',
        category: 'Routing',
        difficulty: 'Hard',
        timeEstimate: '30 mins',
        title: 'Multi-Area OSPFv2',
        description: 'Configure Multi-Area OSPF. R1 and R2 are in Area 0, R2 and R3 are in Area 1.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 200, y: 200, name: 'R1' },
                { id: 'R2', template: 'cisco_router_4321', x: 400, y: 200, name: 'R2' },
                { id: 'R3', template: 'cisco_router_4321', x: 600, y: 200, name: 'R3' },
                { id: 'PC1', template: 'windows_pc', x: 100, y: 300, name: 'PC1' },
                { id: 'PC3', template: 'windows_pc', x: 700, y: 300, name: 'PC3' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/0', target: 'PC1', targetPort: 'Ethernet0', cableType: 'copper_straight' },
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/1', target: 'R2', targetPort: 'GigabitEthernet0/0/1', cableType: 'copper_crossover' },
                { source: 'R2', sourcePort: 'GigabitEthernet0/0/2', target: 'R3', targetPort: 'GigabitEthernet0/0/1', cableType: 'copper_crossover' },
                { source: 'R3', sourcePort: 'GigabitEthernet0/0/0', target: 'PC3', targetPort: 'Ethernet0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'R1': { interfaces: { 'GigabitEthernet0/0/0': { ip: '192.168.1.1', subnet: '24', state: 'up' }, 'GigabitEthernet0/0/1': { ip: '10.0.12.1', subnet: '30', state: 'up' } } },
                'R2': { interfaces: { 'GigabitEthernet0/0/1': { ip: '10.0.12.2', subnet: '30', state: 'up' }, 'GigabitEthernet0/0/2': { ip: '10.0.23.2', subnet: '30', state: 'up' } } },
                'R3': { interfaces: { 'GigabitEthernet0/0/1': { ip: '10.0.23.3', subnet: '30', state: 'up' }, 'GigabitEthernet0/0/0': { ip: '192.168.3.1', subnet: '24', state: 'up' } } },
                'PC1': { interfaces: { 'Ethernet0': { ip: '192.168.1.10', subnet: '24', state: 'up' } }, gateway: '192.168.1.1' },
                'PC3': { interfaces: { 'Ethernet0': { ip: '192.168.3.10', subnet: '24', state: 'up' } }, gateway: '192.168.3.1' }
            }
        },
        tasks: [
            {
                description: 'Configure OSPF Process 1 on R1 for Area 0',
                hints: ['Use "router ospf 1".', 'Network 192.168.1.0 0.0.0.255 area 0', 'Network 10.0.12.0 0.0.0.3 area 0'],
                checks: [
                    { type: 'ospf_enabled', node: 'R1' },
                    { type: 'ospf_network', node: 'R1', network: '10.0.12.0', wildcard: '0.0.0.3', area: '0' }
                ]
            },
            {
                description: 'Configure R2 as an ABR (Area 0 and Area 1)',
                hints: ['Network 10.0.12.0 0.0.0.3 area 0', 'Network 10.0.23.0 0.0.0.3 area 1'],
                checks: [
                    { type: 'ospf_enabled', node: 'R2' },
                    { type: 'ospf_network', node: 'R2', network: '10.0.12.0', wildcard: '0.0.0.3', area: '0' },
                    { type: 'ospf_network', node: 'R2', network: '10.0.23.0', wildcard: '0.0.0.3', area: '1' }
                ]
            },
            {
                description: 'Configure OSPF Process 1 on R3 for Area 1',
                hints: ['Network 10.0.23.0 0.0.0.3 area 1', 'Network 192.168.3.0 0.0.0.255 area 1'],
                checks: [
                    { type: 'ospf_enabled', node: 'R3' },
                    { type: 'ospf_network', node: 'R3', network: '10.0.23.0', wildcard: '0.0.0.3', area: '1' }
                ]
            },
            {
                description: 'Verify end-to-end connectivity (PC1 to PC3)',
                hints: ['Ping 192.168.3.10 from PC1.'],
                checks: [{ type: 'can_reach', source: 'PC1', destination: 'PC3' }]
            }
        ]
    },
    {
        id: 'ccnp-02',
        certification: 'CCNP',
        category: 'Routing',
        difficulty: 'Hard',
        timeEstimate: '35 mins',
        title: 'Basic eBGP Configuration',
        description: 'Configure eBGP peerings between two autonomous systems.',
        topology: {
            nodes: [
                { id: 'ISP1', template: 'cisco_router_4321', x: 200, y: 200, name: 'ISP1' },
                { id: 'ISP2', template: 'cisco_router_4321', x: 500, y: 200, name: 'ISP2' },
                { id: 'S1', template: 'linux_server', x: 100, y: 300, name: 'S1' },
                { id: 'S2', template: 'linux_server', x: 600, y: 300, name: 'S2' }
            ],
            edges: [
                { source: 'ISP1', sourcePort: 'GigabitEthernet0/0/1', target: 'ISP2', targetPort: 'GigabitEthernet0/0/1', cableType: 'copper_crossover' },
                { source: 'ISP1', sourcePort: 'GigabitEthernet0/0/0', target: 'S1', targetPort: 'Ethernet0', cableType: 'copper_straight' },
                { source: 'ISP2', sourcePort: 'GigabitEthernet0/0/0', target: 'S2', targetPort: 'Ethernet0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'ISP1': { interfaces: { 'GigabitEthernet0/0/1': { ip: '172.16.0.1', subnet: '30', state: 'up' }, 'GigabitEthernet0/0/0': { ip: '8.8.8.1', subnet: '24', state: 'up' } } },
                'ISP2': { interfaces: { 'GigabitEthernet0/0/1': { ip: '172.16.0.2', subnet: '30', state: 'up' }, 'GigabitEthernet0/0/0': { ip: '1.1.1.1', subnet: '24', state: 'up' } } },
                'S1': { interfaces: { 'Ethernet0': { ip: '8.8.8.8', subnet: '24', state: 'up' } }, gateway: '8.8.8.1' },
                'S2': { interfaces: { 'Ethernet0': { ip: '1.1.1.2', subnet: '24', state: 'up' } }, gateway: '1.1.1.1' }
            }
        },
        tasks: [
            {
                description: 'Configure BGP AS 100 on ISP1 and peer with ISP2 (AS 200)',
                hints: ['router bgp 100', 'neighbor 172.16.0.2 remote-as 200'],
                checks: [
                    { type: 'bgp_enabled', node: 'ISP1', asNumber: 100 },
                    { type: 'bgp_neighbor', node: 'ISP1', neighborIp: '172.16.0.2', remoteAs: 200 }
                ]
            },
            {
                description: 'Advertise the 8.8.8.0/24 network into BGP on ISP1',
                hints: ['network 8.8.8.0 mask 255.255.255.0'],
                checks: [{ type: 'bgp_network', node: 'ISP1', network: '8.8.8.0' }]
            },
            {
                description: 'Configure BGP AS 200 on ISP2 and peer with ISP1',
                hints: ['router bgp 200', 'neighbor 172.16.0.1 remote-as 100'],
                checks: [
                    { type: 'bgp_enabled', node: 'ISP2', asNumber: 200 },
                    { type: 'bgp_neighbor', node: 'ISP2', neighborIp: '172.16.0.1', remoteAs: 100 }
                ]
            },
            {
                description: 'Advertise the 1.1.1.0/24 network into BGP on ISP2',
                hints: ['network 1.1.1.0 mask 255.255.255.0'],
                checks: [{ type: 'bgp_network', node: 'ISP2', network: '1.1.1.0' }]
            },
            {
                description: 'Verify connectivity by pinging S2 from S1',
                hints: ['Wait for BGP peering to establish and routes to exchange.'],
                checks: [{ type: 'can_reach', source: 'S1', destination: 'S2' }]
            }
        ]
    },
    {
        id: 'ccnp-03',
        certification: 'CCNP',
        category: 'Routing',
        difficulty: 'Hard',
        timeEstimate: '30 mins',
        title: 'EIGRP Autonomous System Config',
        description: 'Configure EIGRP routing between two routers and verify route propagation.',
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
                description: 'Configure EIGRP AS 100 on R1 and advertise networks',
                hints: ['Use "router eigrp 100".', 'Use "network 10.0.0.0" and "network 192.168.1.0".'],
                checks: [
                    { type: 'eigrp_enabled', node: 'R1', asNumber: 100 },
                    { type: 'eigrp_network', node: 'R1', network: '10.0.0.0' },
                    { type: 'eigrp_network', node: 'R1', network: '192.168.1.0' }
                ]
            },
            {
                description: 'Configure EIGRP AS 100 on R2 and advertise networks',
                hints: ['Use "router eigrp 100".', 'Use "network 10.0.0.0" and "network 192.168.2.0".'],
                checks: [
                    { type: 'eigrp_enabled', node: 'R2', asNumber: 100 },
                    { type: 'eigrp_network', node: 'R2', network: '10.0.0.0' },
                    { type: 'eigrp_network', node: 'R2', network: '192.168.2.0' }
                ]
            },
            {
                description: 'Verify connectivity by pinging PC2 from PC1',
                hints: ['Ping 192.168.2.10 from PC1.'],
                checks: [{ type: 'can_reach', source: 'PC1', destination: 'PC2' }]
            }
        ]
    },
    {
        id: 'ccnp-04',
        certification: 'CCNP',
        category: 'Switching',
        difficulty: 'Hard',
        timeEstimate: '20 mins',
        title: 'Spanning Tree Optimization',
        description: 'Configure Root Bridge priority and ensure loop-free topology.',
        topology: {
            nodes: [
                { id: 'Core', template: 'cisco_switch_3560', x: 350, y: 150, name: 'CoreSW' },
                { id: 'Acc1', template: 'cisco_switch_2960', x: 200, y: 300, name: 'Access1' },
                { id: 'Acc2', template: 'cisco_switch_2960', x: 500, y: 300, name: 'Access2' }
            ],
            edges: [
                { source: 'Core', sourcePort: 'GigabitEthernet0/1', target: 'Acc1', targetPort: 'GigabitEthernet0/1', cableType: 'copper_crossover' },
                { source: 'Core', sourcePort: 'GigabitEthernet0/2', target: 'Acc2', targetPort: 'GigabitEthernet0/1', cableType: 'copper_crossover' },
                { source: 'Acc1', sourcePort: 'GigabitEthernet0/2', target: 'Acc2', targetPort: 'GigabitEthernet0/2', cableType: 'copper_crossover' }
            ],
            preConfig: {
                'Core': { vlans: { '10': { name: 'VLAN10' } } },
                'Acc1': { vlans: { '10': { name: 'VLAN10' } } },
                'Acc2': { vlans: { '10': { name: 'VLAN10' } } }
            }
        },
        tasks: [
            {
                description: 'Make CoreSW the primary root bridge for VLAN 10',
                hints: ['Use "spanning-tree vlan 10 root primary" OR "spanning-tree vlan 10 priority 24576".'],
                checks: [{ type: 'stp_priority', node: 'Core', vlanId: '10', expected: 24576 }]
            }
        ]
    },
    {
        id: 'ccnp-05',
        certification: 'CCNP',
        category: 'Routing',
        difficulty: 'Hard',
        timeEstimate: '25 mins',
        title: 'Route Redistribution (OSPF & EIGRP)',
        description: 'Configure mutual route redistribution between OSPF and EIGRP routing domains.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 200, y: 200, name: 'OSPF-Core' },
                { id: 'R2', template: 'cisco_router_4321', x: 400, y: 200, name: 'ASBR' },
                { id: 'R3', template: 'cisco_router_4321', x: 600, y: 200, name: 'EIGRP-Core' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/0', target: 'R2', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_crossover' },
                { source: 'R2', sourcePort: 'GigabitEthernet0/0/1', target: 'R3', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_crossover' }
            ],
            preConfig: {
                'R1': { interfaces: { 'GigabitEthernet0/0/0': { ip: '10.1.12.1', subnet: '30', state: 'up' }, 'Loopback0': { ip: '1.1.1.1', subnet: '32', state: 'up' } } },
                'R2': { interfaces: { 'GigabitEthernet0/0/0': { ip: '10.1.12.2', subnet: '30', state: 'up' }, 'GigabitEthernet0/0/1': { ip: '10.1.23.2', subnet: '30', state: 'up' } } },
                'R3': { interfaces: { 'GigabitEthernet0/0/0': { ip: '10.1.23.3', subnet: '30', state: 'up' }, 'Loopback0': { ip: '3.3.3.3', subnet: '32', state: 'up' } } }
            }
        },
        tasks: [
            {
                description: 'Configure OSPF 1 on R1 and R2, and EIGRP 100 on R2 and R3',
                hints: ['Ensure the ASBR (R2) has both OSPF and EIGRP configured for their respective links.'],
                checks: [
                    { type: 'ospf_enabled', node: 'R1' }, { type: 'ospf_enabled', node: 'R2' },
                    { type: 'eigrp_enabled', node: 'R2', asNumber: 100 }, { type: 'eigrp_enabled', node: 'R3', asNumber: 100 }
                ]
            },
            {
                description: 'Redistribute EIGRP 100 into OSPF 1 on ASBR',
                hints: ['On R2: "router ospf 1"', '"redistribute eigrp 100 subnets"'],
                checks: [{ type: 'ospf_enabled', node: 'R2' }] // Soft check, relies on logic being typed
            },
            {
                description: 'Redistribute OSPF 1 into EIGRP 100 on ASBR',
                hints: ['On R2: "router eigrp 100"', '"redistribute ospf 1 metric 100000 1 255 1 1500"'],
                checks: [{ type: 'eigrp_enabled', node: 'R2', asNumber: 100 }] // Soft check
            }
        ]
    },
    {
        id: 'ccnp-06',
        certification: 'CCNP',
        category: 'Services',
        difficulty: 'Hard',
        timeEstimate: '30 mins',
        title: 'VRF Lite Configuration',
        description: 'Configure Virtual Routing and Forwarding (VRF) to isolate two distinct customer networks on the same router.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 400, y: 200, name: 'PE-Router' },
                { id: 'CustA1', template: 'linux_pc', x: 200, y: 150, name: 'Cust-A-Site1' },
                { id: 'CustA2', template: 'linux_pc', x: 600, y: 150, name: 'Cust-A-Site2' },
                { id: 'CustB1', template: 'linux_pc', x: 200, y: 250, name: 'Cust-B-Site1' },
                { id: 'CustB2', template: 'linux_pc', x: 600, y: 250, name: 'Cust-B-Site2' }
            ],
            edges: [
                { source: 'CustA1', sourcePort: 'eth0', target: 'R1', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_straight' },
                { source: 'CustA2', sourcePort: 'eth0', target: 'R1', targetPort: 'GigabitEthernet0/0/1', cableType: 'copper_straight' },
                { source: 'CustB1', sourcePort: 'eth0', target: 'R1', targetPort: 'GigabitEthernet0/0/2', cableType: 'copper_straight' },
                { source: 'CustB2', sourcePort: 'eth0', target: 'R1', targetPort: 'GigabitEthernet0/0/3', cableType: 'copper_straight' }
            ],
            preConfig: {
                'CustA1': { interfaces: { 'eth0': { ip: '10.0.0.10', subnet: '24', state: 'up' } }, gateway: '10.0.0.1' },
                'CustA2': { interfaces: { 'eth0': { ip: '10.0.1.10', subnet: '24', state: 'up' } }, gateway: '10.0.1.1' },
                // Cust B overlaps IP space intentionally
                'CustB1': { interfaces: { 'eth0': { ip: '10.0.0.10', subnet: '24', state: 'up' } }, gateway: '10.0.0.1' },
                'CustB2': { interfaces: { 'eth0': { ip: '10.0.1.10', subnet: '24', state: 'up' } }, gateway: '10.0.1.1' }
            }
        },
        tasks: [
            {
                description: 'Create VRFs "CUST_A" and "CUST_B" on the PE-Router',
                hints: ['Use "ip vrf CUST_A" and "ip vrf CUST_B".'],
                checks: [{ type: 'vrf_exists', node: 'R1', vrfName: 'CUST_A' }] // Future check implementation
            },
            {
                description: 'Assign interfaces and IPs for Cust A (Gi0/0/0 and Gi0/0/1)',
                hints: ['Use "ip vrf forwarding CUST_A" on Gi0/0/0 and Gi0/0/1', 'Configure IP 10.0.0.1/24 on Gi0/0/0', 'Configure IP 10.0.1.1/24 on Gi0/0/1'],
                checks: [
                    { type: 'interface_ip', node: 'R1', interface: 'GigabitEthernet0/0/0', ip: '10.0.0.1', subnet: '24' },
                    { type: 'interface_ip', node: 'R1', interface: 'GigabitEthernet0/0/1', ip: '10.0.1.1', subnet: '24' }
                ]
            },
            {
                description: 'Assign interfaces and IPs for Cust B (Gi0/0/2 and Gi0/0/3)',
                hints: ['Use "ip vrf forwarding CUST_B" on Gi0/0/2 and Gi0/0/3', 'Configure IP 10.0.0.1/24 on Gi0/0/2', 'Configure IP 10.0.1.1/24 on Gi0/0/3'],
                checks: [
                    { type: 'interface_ip', node: 'R1', interface: 'GigabitEthernet0/0/2', ip: '10.0.0.1', subnet: '24' },
                    { type: 'interface_ip', node: 'R1', interface: 'GigabitEthernet0/0/3', ip: '10.0.1.1', subnet: '24' }
                ]
            }
        ]
    },
    {
        id: 'ccnp-07',
        certification: 'CCNP',
        category: 'Routing',
        difficulty: 'Hard',
        timeEstimate: '25 mins',
        title: 'BGP Route Reflector',
        description: 'Configure an iBGP Route Reflector to avoid the need for a full-mesh topology.',
        topology: {
            nodes: [
                { id: 'RR', template: 'cisco_router_4321', x: 400, y: 150, name: 'RouteReflector' },
                { id: 'C1', template: 'cisco_router_4321', x: 200, y: 300, name: 'Client1' },
                { id: 'C2', template: 'cisco_router_4321', x: 600, y: 300, name: 'Client2' }
            ],
            edges: [
                { source: 'RR', sourcePort: 'GigabitEthernet0/0/0', target: 'C1', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_crossover' },
                { source: 'RR', sourcePort: 'GigabitEthernet0/0/1', target: 'C2', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_crossover' }
            ],
            preConfig: {
                'RR': { interfaces: { 'GigabitEthernet0/0/0': { ip: '10.0.1.1', subnet: '30', state: 'up' }, 'GigabitEthernet0/0/1': { ip: '10.0.2.1', subnet: '30', state: 'up' } } },
                'C1': { interfaces: { 'GigabitEthernet0/0/0': { ip: '10.0.1.2', subnet: '30', state: 'up' }, 'Loopback0': { ip: '1.1.1.1', subnet: '32', state: 'up' } } },
                'C2': { interfaces: { 'GigabitEthernet0/0/0': { ip: '10.0.2.2', subnet: '30', state: 'up' }, 'Loopback0': { ip: '2.2.2.2', subnet: '32', state: 'up' } } }
            }
        },
        tasks: [
            {
                description: 'Configure iBGP AS 65000 on the RouteReflector and peer with both clients',
                hints: ['router bgp 65000', 'neighbor 10.0.1.2 remote-as 65000', 'neighbor 10.0.2.2 remote-as 65000'],
                checks: [
                    { type: 'bgp_enabled', node: 'RR', asNumber: 65000 },
                    { type: 'bgp_neighbor', node: 'RR', neighborIp: '10.0.1.2', remoteAs: 65000 },
                    { type: 'bgp_neighbor', node: 'RR', neighborIp: '10.0.2.2', remoteAs: 65000 }
                ]
            },
            {
                description: 'Set both neighbors as route-reflector-clients on the RouteReflector',
                hints: ['neighbor 10.0.1.2 route-reflector-client', 'neighbor 10.0.2.2 route-reflector-client'],
                checks: [{ type: 'bgp_enabled', node: 'RR', asNumber: 65000 }] // Soft check
            }
        ]
    },
    {
        id: 'ccnp-08',
        certification: 'CCNP',
        category: 'Routing',
        difficulty: 'Hard',
        timeEstimate: '20 mins',
        title: 'Policy-Based Routing (PBR)',
        description: 'Use route maps and ACLs to force specific traffic over a non-optimal path.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 200, y: 200, name: 'Gateway' },
                { id: 'R2', template: 'cisco_router_4321', x: 500, y: 100, name: 'ISP-Fast' },
                { id: 'R3', template: 'cisco_router_4321', x: 500, y: 300, name: 'ISP-Slow' },
                { id: 'PC1', template: 'linux_pc', x: 100, y: 150, name: 'VIP-User' },
                { id: 'PC2', template: 'linux_pc', x: 100, y: 300, name: 'Guest-User' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/0', target: 'R2', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_straight' },
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/1', target: 'R3', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_straight' },
                { source: 'PC1', sourcePort: 'eth0', target: 'R1', targetPort: 'GigabitEthernet0/0/2', cableType: 'copper_straight' },
                { source: 'PC2', sourcePort: 'eth0', target: 'R1', targetPort: 'GigabitEthernet0/0/3', cableType: 'copper_straight' }
            ],
            preConfig: {
                'R1': {
                    interfaces: {
                        'GigabitEthernet0/0/0': { ip: '203.0.113.1', subnet: '30', state: 'up' },
                        'GigabitEthernet0/0/1': { ip: '198.51.100.1', subnet: '30', state: 'up' },
                        'GigabitEthernet0/0/2': { ip: '10.0.10.1', subnet: '24', state: 'up' },
                        'GigabitEthernet0/0/3': { ip: '10.0.20.1', subnet: '24', state: 'up' }
                    }
                },
                'PC1': { interfaces: { 'eth0': { ip: '10.0.10.10', subnet: '24', state: 'up' } }, gateway: '10.0.10.1' },
                'PC2': { interfaces: { 'eth0': { ip: '10.0.20.10', subnet: '24', state: 'up' } }, gateway: '10.0.20.1' }
            }
        },
        tasks: [
            {
                description: 'Create an ACL to match Guest-User traffic (10.0.20.0/24)',
                hints: ['access-list 10 permit 10.0.20.0 0.0.0.255'],
                checks: [{ type: 'acl_exists', node: 'R1', aclId: '10' }]
            },
            {
                description: 'Create a route-map to set next-hop to ISP-Slow (198.51.100.2) for Guest traffic',
                hints: ['route-map GUEST_TRAFFIC permit 10', 'match ip address 10', 'set ip next-hop 198.51.100.2'],
                checks: [{ type: 'acl_exists', node: 'R1', aclId: '10' }] // Soft check
            },
            {
                description: 'Apply the route-map to the incoming interface for Guest-User (Gi0/0/3)',
                hints: ['interface GigabitEthernet0/0/3', 'ip policy route-map GUEST_TRAFFIC'],
                checks: [{ type: 'interface_state', node: 'R1', interface: 'GigabitEthernet0/0/3', state: 'up' }] // Soft check
            }
        ]
    },
    {
        id: 'ccnp-09',
        certification: 'CCNP',
        category: 'Routing',
        difficulty: 'Hard',
        timeEstimate: '20 mins',
        title: 'OSPF Virtual Links',
        description: 'Configure an OSPF Virtual Link to connect a disconnected area to the backbone (Area 0).',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 200, y: 200, name: 'ABR-Area0' },
                { id: 'R2', template: 'cisco_router_4321', x: 500, y: 200, name: 'Transit-Area1' },
                { id: 'R3', template: 'cisco_router_4321', x: 800, y: 200, name: 'Disconnected-Area2' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/0', target: 'R2', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_crossover' },
                { source: 'R2', sourcePort: 'GigabitEthernet0/0/1', target: 'R3', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_crossover' }
            ],
            preConfig: {
                'R1': { interfaces: { 'GigabitEthernet0/0/0': { ip: '10.1.12.1', subnet: '30', state: 'up' }, 'Loopback0': { ip: '1.1.1.1', subnet: '32', state: 'up' } } },
                'R2': { interfaces: { 'GigabitEthernet0/0/0': { ip: '10.1.12.2', subnet: '30', state: 'up' }, 'GigabitEthernet0/0/1': { ip: '10.1.23.2', subnet: '30', state: 'up' }, 'Loopback0': { ip: '2.2.2.2', subnet: '32', state: 'up' } } },
                'R3': { interfaces: { 'GigabitEthernet0/0/0': { ip: '10.1.23.3', subnet: '30', state: 'up' }, 'Loopback0': { ip: '3.3.3.3', subnet: '32', state: 'up' } } }
            }
        },
        tasks: [
            {
                description: 'Configure OSPF Area 1 between R1 and R2, and Area 2 between R2 and R3',
                hints: ['Ensure standard OSPF networks are advertised into the correct areas.'],
                checks: [
                    { type: 'ospf_enabled', node: 'R1' }, { type: 'ospf_enabled', node: 'R2' }, { type: 'ospf_enabled', node: 'R3' }
                ]
            },
            {
                description: 'Configure a virtual-link through Area 1 between R1 and R2',
                hints: ['On R1: "area 1 virtual-link 2.2.2.2"', 'On R2: "area 1 virtual-link 1.1.1.1"'],
                checks: [{ type: 'ospf_enabled', node: 'R1' }] // Soft check
            }
        ]
    },
    {
        id: 'ccnp-10',
        certification: 'CCNP',
        category: 'High Availability',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'HSRP Configuration',
        description: 'Configure Hot Standby Router Protocol to provide a resilient default gateway for end hosts.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 300, y: 150, name: 'Active-GW' },
                { id: 'R2', template: 'cisco_router_4321', x: 500, y: 150, name: 'Standby-GW' },
                { id: 'SW1', template: 'cisco_switch_2960', x: 400, y: 300, name: 'LAN-Switch' },
                { id: 'PC1', template: 'windows_pc', x: 400, y: 400, name: 'LAN-PC' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/0', target: 'SW1', targetPort: 'FastEthernet0/1', cableType: 'copper_straight' },
                { source: 'R2', sourcePort: 'GigabitEthernet0/0/0', target: 'SW1', targetPort: 'FastEthernet0/2', cableType: 'copper_straight' },
                { source: 'PC1', sourcePort: 'Ethernet0', target: 'SW1', targetPort: 'FastEthernet0/3', cableType: 'copper_straight' }
            ],
            preConfig: {
                'R1': { interfaces: { 'GigabitEthernet0/0/0': { ip: '192.168.1.2', subnet: '24', state: 'up' } } },
                'R2': { interfaces: { 'GigabitEthernet0/0/0': { ip: '192.168.1.3', subnet: '24', state: 'up' } } },
                'PC1': { interfaces: { 'Ethernet0': { ip: '192.168.1.100', subnet: '24', state: 'up' } }, gateway: '192.168.1.1' }
            }
        },
        tasks: [
            {
                description: 'Configure HSRP group 1 with Virtual IP 192.168.1.1 on both routers',
                hints: ['interface Gi0/0/0', 'standby 1 ip 192.168.1.1'],
                checks: [{ type: 'interface_state', node: 'R1', interface: 'GigabitEthernet0/0/0', state: 'up' }] // Soft check
            },
            {
                description: 'Set Active-GW priority to 110 and enable preemption',
                hints: ['standby 1 priority 110', 'standby 1 preempt'],
                checks: [{ type: 'interface_state', node: 'R1', interface: 'GigabitEthernet0/0/0', state: 'up' }] // Soft check
            }
        ]
    },
    {
        id: 'ccnp-11',
        certification: 'CCNP',
        category: 'Routing',
        difficulty: 'Hard',
        timeEstimate: '20 mins',
        title: 'BGP Prefix-List Filtering',
        description: 'Filter specific routes from being advertised to a BGP peer using prefix-lists.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 200, y: 200, name: 'AS100' },
                { id: 'R2', template: 'cisco_router_4321', x: 500, y: 200, name: 'AS200' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/0', target: 'R2', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'R1': { interfaces: { 'GigabitEthernet0/0/0': { ip: '10.0.0.1', subnet: '30', state: 'up' }, 'Loopback0': { ip: '192.168.1.1', subnet: '24', state: 'up' }, 'Loopback1': { ip: '192.168.2.1', subnet: '24', state: 'up' } } },
                'R2': { interfaces: { 'GigabitEthernet0/0/0': { ip: '10.0.0.2', subnet: '30', state: 'up' } } }
            }
        },
        tasks: [
            {
                description: 'Configure eBGP between R1 (AS100) and R2 (AS200)',
                hints: ['router bgp 100', 'neighbor 10.0.0.2 remote-as 200'],
                checks: [{ type: 'bgp_enabled', node: 'R1', asNumber: 100 }]
            },
            {
                description: 'Create prefix-list FILTER_NET2 to deny 192.168.2.0/24 and permit all else',
                hints: ['ip prefix-list FILTER_NET2 deny 192.168.2.0/24', 'ip prefix-list FILTER_NET2 permit 0.0.0.0/0 le 32'],
                checks: [{ type: 'bgp_enabled', node: 'R1', asNumber: 100 }] // Soft check
            },
            {
                description: 'Apply the prefix-list outbound to R2',
                hints: ['neighbor 10.0.0.2 prefix-list FILTER_NET2 out'],
                checks: [{ type: 'bgp_enabled', node: 'R1', asNumber: 100 }] // Soft check
            }
        ]
    },
    {
        id: 'ccnp-12',
        certification: 'CCNP',
        category: 'Routing',
        difficulty: 'Hard',
        timeEstimate: '20 mins',
        title: 'BGP Local Preference',
        description: 'Manipulate BGP outbound path selection using the Local Preference attribute.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 200, y: 150, name: 'AS100-Primary' },
                { id: 'R2', template: 'cisco_router_4321', x: 200, y: 350, name: 'AS100-Backup' },
                { id: 'ISP', template: 'cisco_router_4321', x: 600, y: 250, name: 'AS200-ISP' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/0', target: 'R2', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_crossover' },
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/1', target: 'ISP', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_straight' },
                { source: 'R2', sourcePort: 'GigabitEthernet0/0/1', target: 'ISP', targetPort: 'GigabitEthernet0/0/1', cableType: 'copper_straight' }
            ],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Configure iBGP between Primary and Backup (AS100)',
                hints: ['Use router bgp 100 and peer using physical IPs.'],
                checks: [{ type: 'bgp_enabled', node: 'R1', asNumber: 100 }] // Soft check
            },
            {
                description: 'Set default Local Preference on Primary to 200 to prefer it for outbound traffic',
                hints: ['bgp default local-preference 200'],
                checks: [{ type: 'bgp_enabled', node: 'R1', asNumber: 100 }] // Soft check
            }
        ]
    },
    {
        id: 'ccnp-13',
        certification: 'CCNP',
        category: 'Routing',
        difficulty: 'Hard',
        timeEstimate: '25 mins',
        title: 'BGP AS-Path Prepending',
        description: 'Manipulate BGP inbound path selection by prepending AS numbers to less preferred routes.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 200, y: 150, name: 'AS100-Primary' },
                { id: 'R2', template: 'cisco_router_4321', x: 200, y: 350, name: 'AS100-Backup' },
                { id: 'ISP', template: 'cisco_router_4321', x: 600, y: 250, name: 'AS200-ISP' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/0', target: 'R2', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_crossover' },
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/1', target: 'ISP', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_straight' },
                { source: 'R2', sourcePort: 'GigabitEthernet0/0/1', target: 'ISP', targetPort: 'GigabitEthernet0/0/1', cableType: 'copper_straight' }
            ],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Create a route-map PREPEND on Backup router that sets AS-Path prepend 100 100',
                hints: ['route-map PREPEND permit 10', 'set as-path prepend 100 100'],
                checks: [{ type: 'bgp_enabled', node: 'R2', asNumber: 100 }] // Soft check
            },
            {
                description: 'Apply PREPEND outbound to the ISP on Backup router',
                hints: ['neighbor [ISP_IP] route-map PREPEND out'],
                checks: [{ type: 'bgp_enabled', node: 'R2', asNumber: 100 }] // Soft check
            }
        ]
    },
    {
        id: 'ccnp-14',
        certification: 'CCNP',
        category: 'Routing',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'EIGRP Stub Routing',
        description: 'Configure a remote site router as an EIGRP stub to limit query scope.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 200, y: 200, name: 'HQ' },
                { id: 'R2', template: 'cisco_router_4321', x: 600, y: 200, name: 'Branch' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/0', target: 'R2', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_straight' }
            ],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Configure EIGRP 1 on both routers',
                hints: ['router eigrp 1', 'network ...'],
                checks: [{ type: 'eigrp_enabled', node: 'R1', asNumber: 1 }]
            },
            {
                description: 'Configure the Branch router as an EIGRP stub (connected summary)',
                hints: ['eigrp stub connected summary'],
                checks: [{ type: 'eigrp_enabled', node: 'R2', asNumber: 1 }] // Soft check
            }
        ]
    },
    {
        id: 'ccnp-15',
        certification: 'CCNP',
        category: 'Routing',
        difficulty: 'Hard',
        timeEstimate: '20 mins',
        title: 'OSPF NSSA Configuration',
        description: 'Configure an OSPF area as a Not-So-Stubby Area (NSSA) to allow external routes from an ASBR.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 200, y: 200, name: 'ABR' },
                { id: 'R2', template: 'cisco_router_4321', x: 500, y: 200, name: 'ASBR' },
                { id: 'R3', template: 'cisco_router_4321', x: 800, y: 200, name: 'External' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/0', target: 'R2', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_crossover' },
                { source: 'R2', sourcePort: 'GigabitEthernet0/0/1', target: 'R3', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_straight' }
            ],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Configure Area 1 between ABR and ASBR as an NSSA',
                hints: ['area 1 nssa'],
                checks: [{ type: 'ospf_enabled', node: 'R1' }] // Soft check
            },
            {
                description: 'Redistribute static route into OSPF on the ASBR',
                hints: ['redistribute static subnets'],
                checks: [{ type: 'ospf_enabled', node: 'R2' }] // Soft check
            }
        ]
    },
    {
        id: 'ccnp-16',
        certification: 'CCNP',
        category: 'Routing',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'OSPF Area Route Summarization',
        description: 'Configure an ABR to summarize internal OSPF routes before advertising them to Area 0.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 300, y: 200, name: 'ABR' },
                { id: 'R2', template: 'cisco_router_4321', x: 600, y: 200, name: 'Internal' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/0', target: 'R2', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_straight' }
            ],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Configure ABR to summarize Area 1 networks (10.1.0.0/16)',
                hints: ['area 1 range 10.1.0.0 255.255.0.0'],
                checks: [{ type: 'ospf_enabled', node: 'R1' }] // Soft check
            }
        ]
    },
    {
        id: 'ccnp-17',
        certification: 'CCNP',
        category: 'Routing',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'BGP Peer Groups',
        description: 'Use BGP peer groups to simplify configuration of multiple iBGP neighbors.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 300, y: 100, name: 'Core' },
                { id: 'R2', template: 'cisco_router_4321', x: 200, y: 300, name: 'Edge1' },
                { id: 'R3', template: 'cisco_router_4321', x: 400, y: 300, name: 'Edge2' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/0', target: 'R2', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_straight' },
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/1', target: 'R3', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_straight' }
            ],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Create a BGP peer-group named INTERNAL and set remote-as 100',
                hints: ['neighbor INTERNAL peer-group', 'neighbor INTERNAL remote-as 100'],
                checks: [{ type: 'bgp_enabled', node: 'R1', asNumber: 100 }] // Soft check
            },
            {
                description: 'Assign Edge1 and Edge2 to the INTERNAL peer group',
                hints: ['neighbor [IP] peer-group INTERNAL'],
                checks: [{ type: 'bgp_enabled', node: 'R1', asNumber: 100 }] // Soft check
            }
        ]
    },
    {
        id: 'ccnp-18',
        certification: 'CCNP',
        category: 'VPN',
        difficulty: 'Hard',
        timeEstimate: '35 mins',
        title: 'IPsec over GRE',
        description: 'Configure a GRE tunnel and encrypt it using an IPsec profile.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 200, y: 200, name: 'SiteA' },
                { id: 'R2', template: 'cisco_router_4321', x: 600, y: 200, name: 'SiteB' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/0', target: 'R2', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_straight' }
            ],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Configure Tunnel 0 with GRE and IP addresses',
                hints: ['interface Tunnel 0', 'tunnel source ...', 'tunnel destination ...'],
                checks: [{ type: 'interface_state', node: 'R1', interface: 'Tunnel0', state: 'up' }] // Soft check
            },
            {
                description: 'Create IPsec transform-set and profile',
                hints: ['crypto ipsec transform-set TS esp-aes esp-sha-hmac', 'crypto ipsec profile IPSEC_PROF'],
                checks: [{ type: 'interface_state', node: 'R1', interface: 'Tunnel0', state: 'up' }] // Soft check
            },
            {
                description: 'Apply the IPsec profile to the GRE tunnel',
                hints: ['tunnel protection ipsec profile IPSEC_PROF'],
                checks: [{ type: 'interface_state', node: 'R1', interface: 'Tunnel0', state: 'up' }] // Soft check
            }
        ]
    },
    {
        id: 'ccnp-19',
        certification: 'CCNP',
        category: 'Services',
        difficulty: 'Hard',
        timeEstimate: '20 mins',
        title: 'Multicast PIM Sparse Mode',
        description: 'Configure PIM Sparse Mode to enable multicast routing between sites.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 200, y: 200, name: 'Source-R' },
                { id: 'R2', template: 'cisco_router_4321', x: 500, y: 200, name: 'RP' },
                { id: 'R3', template: 'cisco_router_4321', x: 800, y: 200, name: 'Receiver-R' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/0', target: 'R2', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_straight' },
                { source: 'R2', sourcePort: 'GigabitEthernet0/0/1', target: 'R3', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_straight' }
            ],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Enable multicast routing globally on all routers',
                hints: ['ip multicast-routing'],
                checks: [{ type: 'interface_state', node: 'R1', interface: 'GigabitEthernet0/0/0', state: 'up' }] // Soft check
            },
            {
                description: 'Enable PIM sparse mode on all transit interfaces',
                hints: ['ip pim sparse-mode'],
                checks: [{ type: 'interface_state', node: 'R2', interface: 'GigabitEthernet0/0/0', state: 'up' }] // Soft check
            },
            {
                description: 'Configure R2 Loopback0 as the static Rendezvous Point (RP)',
                hints: ['ip pim rp-address 2.2.2.2'],
                checks: [{ type: 'interface_state', node: 'R3', interface: 'GigabitEthernet0/0/0', state: 'up' }] // Soft check
            }
        ]
    },
    {
        id: 'ccnp-20',
        certification: 'CCNP',
        category: 'Routing',
        difficulty: 'Hard',
        timeEstimate: '20 mins',
        title: 'OSPFv3 Route Summarization',
        description: 'Configure IPv6 route summarization on an OSPFv3 ABR.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 300, y: 200, name: 'ABR' },
                { id: 'R2', template: 'cisco_router_4321', x: 600, y: 200, name: 'Internal' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/0', target: 'R2', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_straight' }
            ],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Configure ABR to summarize IPv6 Area 1 networks (2001:db8:1::/48)',
                hints: ['ipv6 router ospf 1', 'area 1 range 2001:db8:1::/48'],
                checks: [{ type: 'ospfv3_enabled', node: 'R1' }] // Soft check
            }
        ]
    }
];
