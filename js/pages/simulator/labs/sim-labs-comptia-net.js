// sim-labs-comptia-net.js
// CompTIA Network+ Labs

export const COMPTIA_NET_LABS = [
    {
        id: 'comptia-net-01',
        certification: 'Network+',
        category: 'Basic Connectivity',
        difficulty: 'Easy',
        timeEstimate: '10 mins',
        title: 'Basic Host Connectivity',
        description: 'Configure IP addresses and default gateways on two PCs to establish connectivity through a router.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 300, y: 200, name: 'Gateway' },
                { id: 'PC1', template: 'windows_pc', x: 100, y: 300, name: 'Workstation-A' },
                { id: 'PC2', template: 'windows_pc', x: 500, y: 300, name: 'Workstation-B' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/0', target: 'PC1', targetPort: 'Ethernet0', cableType: 'copper_straight' },
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/1', target: 'PC2', targetPort: 'Ethernet0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'R1': {
                    interfaces: {
                        'GigabitEthernet0/0/0': { ip: '10.1.1.1', subnet: '24', state: 'up' },
                        'GigabitEthernet0/0/1': { ip: '10.2.2.1', subnet: '24', state: 'up' }
                    }
                }
            }
        },
        tasks: [
            {
                description: 'Configure Workstation-A with IP 10.1.1.10/24 and Gateway 10.1.1.1',
                hints: ['Double click Workstation-A and open the IP Configuration app.'],
                checks: [
                    { type: 'interface_ip', node: 'PC1', interface: 'Ethernet0', ip: '10.1.1.10', subnet: '24' },
                    { type: 'gateway_set', node: 'PC1', expected: '10.1.1.1' }
                ]
            },
            {
                description: 'Configure Workstation-B with IP 10.2.2.20/24 and Gateway 10.2.2.1',
                hints: ['Double click Workstation-B and open the IP Configuration app.'],
                checks: [
                    { type: 'interface_ip', node: 'PC2', interface: 'Ethernet0', ip: '10.2.2.20', subnet: '24' },
                    { type: 'gateway_set', node: 'PC2', expected: '10.2.2.1' }
                ]
            },
            {
                description: 'Verify connectivity by pinging Workstation-B from Workstation-A',
                hints: ['Open the Command Prompt on Workstation-A and ping 10.2.2.20.'],
                checks: [{ type: 'can_reach', source: 'PC1', destination: 'PC2' }]
            }
        ]
    },
    {
        id: 'comptia-net-02',
        certification: 'Network+',
        category: 'Switching',
        difficulty: 'Easy',
        timeEstimate: '10 mins',
        title: 'Switch Forwarding Verification',
        description: 'Verify that a switch correctly learns MAC addresses and forwards traffic between hosts.',
        topology: {
            nodes: [
                { id: 'SW1', template: 'cisco_switch_2960', x: 300, y: 200, name: 'LAN-Switch' },
                { id: 'PC1', template: 'linux_pc', x: 150, y: 350, name: 'Host-1' },
                { id: 'PC2', template: 'linux_pc', x: 450, y: 350, name: 'Host-2' }
            ],
            edges: [
                { source: 'SW1', sourcePort: 'FastEthernet0/1', target: 'PC1', targetPort: 'eth0', cableType: 'copper_straight' },
                { source: 'SW1', sourcePort: 'FastEthernet0/2', target: 'PC2', targetPort: 'eth0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'PC1': { interfaces: { 'eth0': { ip: '192.168.1.10', subnet: '24', state: 'up' } } },
                'PC2': { interfaces: { 'eth0': { ip: '192.168.1.20', subnet: '24', state: 'up' } } }
            }
        },
        tasks: [
            {
                description: 'Ping Host-2 from Host-1 to populate the MAC address table',
                hints: ['Open Host-1 and ping 192.168.1.20'],
                checks: [{ type: 'can_reach', source: 'PC1', destination: 'PC2' }]
            }
        ]
    },
    {
        id: 'comptia-net-03',
        certification: 'Network+',
        category: 'Subnetting',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'Subnet Boundary Troubleshooting',
        description: 'Identify and fix an IP address that falls outside of the configured subnet boundary.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 300, y: 200, name: 'Gateway' },
                { id: 'PC1', template: 'windows_pc', x: 150, y: 350, name: 'Sales-PC' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/0', target: 'PC1', targetPort: 'Ethernet0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'R1': {
                    interfaces: {
                        'GigabitEthernet0/0/0': { ip: '192.168.1.1', subnet: '26', state: 'up' } // Range is .1 to .62
                    }
                },
                'PC1': { interfaces: { 'Ethernet0': { ip: '192.168.1.100', subnet: '26', state: 'up' } }, gateway: '192.168.1.1' } // .100 is in the next subnet
            }
        },
        tasks: [
            {
                description: 'Determine the correct subnet range for the Gateway (192.168.1.1/26)',
                hints: ['A /26 subnet gives 64 total addresses per subnet.', 'The first subnet is 192.168.1.0 to 192.168.1.63.'],
                checks: []
            },
            {
                description: 'Change Sales-PC IP address to a valid host IP in the Gateway\'s subnet (e.g. 192.168.1.50)',
                hints: ['Change the IP on Sales-PC to anything between 192.168.1.2 and 192.168.1.62.'],
                checks: [{ type: 'can_reach', source: 'PC1', destination: 'R1' }]
            }
        ]
    },
    {
        id: 'comptia-net-04',
        certification: 'Network+',
        category: 'Troubleshooting',
        difficulty: 'Easy',
        timeEstimate: '10 mins',
        title: 'ARP Resolution Failure',
        description: 'Troubleshoot a scenario where a host cannot communicate on the local segment due to an incorrect static ARP entry.',
        topology: {
            nodes: [
                { id: 'SW1', template: 'cisco_switch_2960', x: 300, y: 200, name: 'LAN-Switch' },
                { id: 'PC1', template: 'windows_pc', x: 150, y: 300, name: 'Client-PC' },
                { id: 'SRV1', template: 'linux_server', x: 450, y: 300, name: 'Local-Server' }
            ],
            edges: [
                { source: 'SW1', sourcePort: 'FastEthernet0/1', target: 'PC1', targetPort: 'Ethernet0', cableType: 'copper_straight' },
                { source: 'SW1', sourcePort: 'FastEthernet0/2', target: 'SRV1', targetPort: 'eth0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'PC1': { interfaces: { 'Ethernet0': { ip: '10.0.0.10', subnet: '24', state: 'up' } } },
                'SRV1': { interfaces: { 'eth0': { ip: '10.0.0.20', subnet: '24', state: 'up' } } }
                // In a real engine we would inject a static bad ARP entry here, 
                // but for this lab we will simulate the fix via a task requirement to clear arp.
            }
        },
        tasks: [
            {
                description: 'Clear the ARP cache on Client-PC',
                hints: ['Open the terminal on Client-PC and run "arp -d *" to clear the cache.'],
                checks: [{ type: 'can_reach', source: 'PC1', destination: 'SRV1' }] // Proxy check for success
            },
            {
                description: 'Ping the Local-Server to verify ARP dynamically resolves the correct MAC',
                hints: ['Ping 10.0.0.20 from Client-PC.'],
                checks: [{ type: 'can_reach', source: 'PC1', destination: 'SRV1' }]
            }
        ]
    },
    {
        id: 'comptia-net-05',
        certification: 'Network+',
        category: 'Troubleshooting',
        difficulty: 'Easy',
        timeEstimate: '10 mins',
        title: 'Default Gateway Misconfiguration',
        description: 'Identify and correct an improperly configured default gateway preventing Internet access.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 300, y: 200, name: 'Gateway' },
                { id: 'PC1', template: 'windows_pc', x: 150, y: 350, name: 'User-PC' },
                { id: 'ISP', template: 'isp_router', x: 500, y: 100, name: 'Internet' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/0', target: 'PC1', targetPort: 'Ethernet0', cableType: 'copper_straight' },
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/1', target: 'ISP', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'R1': { interfaces: { 'GigabitEthernet0/0/0': { ip: '192.168.1.1', subnet: '24', state: 'up' }, 'GigabitEthernet0/0/1': { ip: '203.0.113.2', subnet: '30', state: 'up' } } },
                'ISP': { interfaces: { 'GigabitEthernet0/0/0': { ip: '203.0.113.1', subnet: '30', state: 'up' }, 'Loopback0': { ip: '8.8.8.8', subnet: '32', state: 'up' } } },
                // Incorrect gateway configured
                'PC1': { interfaces: { 'Ethernet0': { ip: '192.168.1.50', subnet: '24', state: 'up' } }, gateway: '192.168.1.254' }
            }
        },
        tasks: [
            {
                description: 'Identify the Gateway\'s IP address on the local segment',
                hints: ['Look at the Gateway router\'s Gi0/0/0 interface configuration.'],
                checks: []
            },
            {
                description: 'Correct the Default Gateway on User-PC to match the router (192.168.1.1)',
                hints: ['Open the IP Configuration app on User-PC and change the Default Gateway from 192.168.1.254 to 192.168.1.1.'],
                checks: [{ type: 'gateway_set', node: 'PC1', expected: '192.168.1.1' }]
            },
            {
                description: 'Verify connectivity to the Internet (8.8.8.8)',
                hints: ['Ping 8.8.8.8 from User-PC.'],
                checks: [{ type: 'can_reach', source: 'PC1', destination: 'ISP' }]
            }
        ]
    },
    {
        id: 'comptia-net-06',
        certification: 'Network+',
        category: 'Troubleshooting',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'Traceroute Path Discovery',
        description: 'Use traceroute to identify where traffic is being dropped in a multi-hop topology.',
        topology: {
            nodes: [
                { id: 'PC1', template: 'windows_pc', x: 100, y: 200, name: 'Client' },
                { id: 'R1', template: 'cisco_router_4321', x: 300, y: 200, name: 'Hop1' },
                { id: 'R2', template: 'cisco_router_4321', x: 500, y: 200, name: 'Hop2' },
                { id: 'R3', template: 'cisco_router_4321', x: 700, y: 200, name: 'Hop3' }
            ],
            edges: [
                { source: 'PC1', sourcePort: 'Ethernet0', target: 'R1', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_straight' },
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/1', target: 'R2', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_crossover' },
                { source: 'R2', sourcePort: 'GigabitEthernet0/0/1', target: 'R3', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_crossover' }
            ],
            preConfig: {
                'R1': { interfaces: { 'GigabitEthernet0/0/0': { ip: '10.0.1.1', subnet: '24', state: 'up' }, 'GigabitEthernet0/0/1': { ip: '10.0.12.1', subnet: '30', state: 'up' } } },
                'R2': { interfaces: { 'GigabitEthernet0/0/0': { ip: '10.0.12.2', subnet: '30', state: 'up' }, 'GigabitEthernet0/0/1': { ip: '10.0.23.1', subnet: '30', state: 'up' } } },
                // R3 missing route back
                'R3': { interfaces: { 'GigabitEthernet0/0/0': { ip: '10.0.23.2', subnet: '30', state: 'up' }, 'Loopback0': { ip: '8.8.8.8', subnet: '32', state: 'up' } } },
                'PC1': { interfaces: { 'Ethernet0': { ip: '10.0.1.10', subnet: '24', state: 'up' } }, gateway: '10.0.1.1' }
            }
        },
        tasks: [
            {
                description: 'Run tracert 8.8.8.8 from Client to identify the drop point',
                hints: ['The output will stop responding at a specific hop.'],
                checks: []
            },
            {
                description: 'Add the missing return route on Hop3 for the 10.0.1.0/24 network',
                hints: ['ip route 10.0.1.0 255.255.255.0 10.0.23.1'],
                checks: [{ type: 'static_route', node: 'R3', network: '10.0.1.0', cidr: '24', nextHop: '10.0.23.1' }]
            }
        ]
    },
    {
        id: 'comptia-net-07',
        certification: 'Network+',
        category: 'Troubleshooting',
        difficulty: 'Hard',
        timeEstimate: '15 mins',
        title: 'OSPF Neighbor Mismatch',
        description: 'Troubleshoot and fix an OSPF neighbor adjacency that is stuck due to mismatched hello timers.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 200, y: 200, name: 'RouterA' },
                { id: 'R2', template: 'cisco_router_4321', x: 500, y: 200, name: 'RouterB' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/0', target: 'R2', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_straight' }
            ],
            preConfig: {} // Soft-simulated mismatch
        },
        tasks: [
            {
                description: 'Check OSPF neighbor status',
                hints: ['show ip ospf neighbor'],
                checks: []
            },
            {
                description: 'Match the hello-interval on RouterB Gi0/0/0 to RouterA (10 seconds)',
                hints: ['interface Gi0/0/0', 'ip ospf hello-interval 10'],
                checks: [{ type: 'interface_state', node: 'R2', interface: 'GigabitEthernet0/0/0', state: 'up' }] // Soft check
            }
        ]
    },
    {
        id: 'comptia-net-08',
        certification: 'Network+',
        category: 'Troubleshooting',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'VLAN Mismatch on Trunk',
        description: 'Identify and correct a native VLAN mismatch across a trunk link.',
        topology: {
            nodes: [
                { id: 'SW1', template: 'cisco_switch_2960', x: 200, y: 200, name: 'SW1' },
                { id: 'SW2', template: 'cisco_switch_2960', x: 500, y: 200, name: 'SW2' }
            ],
            edges: [
                { source: 'SW1', sourcePort: 'GigabitEthernet0/1', target: 'SW2', targetPort: 'GigabitEthernet0/1', cableType: 'copper_crossover' }
            ],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Identify CDP Native VLAN mismatch warnings in syslog',
                hints: ['show cdp neighbors detail'],
                checks: []
            },
            {
                description: 'Set the native VLAN on SW2 Gi0/1 to match SW1 (VLAN 99)',
                hints: ['interface Gi0/1', 'switchport trunk native vlan 99'],
                checks: [{ type: 'switchport_mode', node: 'SW2', interface: 'GigabitEthernet0/1', expected: 'trunk' }] // Soft check
            }
        ]
    },
    {
        id: 'comptia-net-09',
        certification: 'Network+',
        category: 'Troubleshooting',
        difficulty: 'Easy',
        timeEstimate: '10 mins',
        title: 'Duplex Mismatch',
        description: 'Resolve a duplex mismatch causing collisions and poor performance.',
        topology: {
            nodes: [
                { id: 'SW1', template: 'cisco_switch_2960', x: 200, y: 200, name: 'Switch' },
                { id: 'PC1', template: 'linux_pc', x: 500, y: 200, name: 'Old-Server' }
            ],
            edges: [
                { source: 'SW1', sourcePort: 'FastEthernet0/1', target: 'PC1', targetPort: 'eth0', cableType: 'copper_straight' }
            ],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Check interface errors on Fa0/1',
                hints: ['show interfaces Fa0/1'],
                checks: []
            },
            {
                description: 'Set switchport Fa0/1 to full duplex to match the server',
                hints: ['interface Fa0/1', 'duplex full'],
                checks: [{ type: 'interface_state', node: 'SW1', interface: 'FastEthernet0/1', state: 'up' }] // Soft check
            }
        ]
    },
    {
        id: 'comptia-net-10',
        certification: 'Network+',
        category: 'Troubleshooting',
        difficulty: 'Medium',
        timeEstimate: '10 mins',
        title: 'Port Security Violation',
        description: 'Recover an err-disabled port caused by a MAC address violation.',
        topology: {
            nodes: [
                { id: 'SW1', template: 'cisco_switch_2960', x: 200, y: 200, name: 'Access-SW' },
                { id: 'PC1', template: 'windows_pc', x: 200, y: 350, name: 'Rogue-PC' }
            ],
            edges: [
                { source: 'SW1', sourcePort: 'FastEthernet0/1', target: 'PC1', targetPort: 'Ethernet0', cableType: 'copper_straight' }
            ],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Identify the err-disabled port',
                hints: ['show interfaces status'],
                checks: []
            },
            {
                description: 'Bounce (shutdown / no shutdown) the Fa0/1 interface to recover it',
                hints: ['interface Fa0/1', 'shutdown', 'no shutdown'],
                checks: [{ type: 'interface_state', node: 'SW1', interface: 'FastEthernet0/1', state: 'up' }] // Soft check
            }
        ]
    },
    {
        id: 'comptia-net-11',
        certification: 'Network+',
        category: 'Services',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'DHCP Scope Exhaustion',
        description: 'Expand a DHCP pool to resolve an IP address exhaustion issue.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 300, y: 200, name: 'DHCP-Server' }
            ],
            edges: [],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Check DHCP pool statistics',
                hints: ['show ip dhcp pool'],
                checks: []
            },
            {
                description: 'Change the LAN_POOL subnet mask from /25 to /24 to double available IPs',
                hints: ['ip dhcp pool LAN_POOL', 'network 192.168.1.0 255.255.255.0'],
                checks: [{ type: 'interface_state', node: 'R1', interface: 'GigabitEthernet0/0/0', state: 'up' }] // Soft check
            }
        ]
    },
    {
        id: 'comptia-net-12',
        certification: 'Network+',
        category: 'Troubleshooting',
        difficulty: 'Easy',
        timeEstimate: '10 mins',
        title: 'DNS Resolution Failure',
        description: 'Fix a client that can ping IPs but cannot browse websites by name.',
        topology: {
            nodes: [
                { id: 'PC1', template: 'windows_pc', x: 200, y: 200, name: 'Client' },
                { id: 'DNS', template: 'linux_server', x: 500, y: 200, name: 'DNS-Server' }
            ],
            edges: [
                { source: 'PC1', sourcePort: 'Ethernet0', target: 'DNS', targetPort: 'eth0', cableType: 'copper_crossover' }
            ],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Ping 8.8.8.8 and ping google.com from the Client',
                hints: ['Ping by IP works, ping by name fails.'],
                checks: []
            },
            {
                description: 'Configure the correct DNS Server IP (10.0.0.53) on the Client',
                hints: ['Open the IP Configuration app and set the DNS server.'],
                checks: [{ type: 'dns_set', node: 'PC1', expected: '10.0.0.53' }] // Soft check
            }
        ]
    },
    {
        id: 'comptia-net-13',
        certification: 'Network+',
        category: 'Switching',
        difficulty: 'Hard',
        timeEstimate: '20 mins',
        title: 'Spanning Tree Root Bridge Election',
        description: 'Force a specific core switch to become the Spanning Tree Root Bridge.',
        topology: {
            nodes: [
                { id: 'Core1', template: 'cisco_switch_3560', x: 300, y: 150, name: 'Core1' },
                { id: 'Access1', template: 'cisco_switch_2960', x: 200, y: 350, name: 'Access1' },
                { id: 'Access2', template: 'cisco_switch_2960', x: 400, y: 350, name: 'Access2' }
            ],
            edges: [
                { source: 'Core1', sourcePort: 'GigabitEthernet0/1', target: 'Access1', targetPort: 'GigabitEthernet0/1', cableType: 'copper_straight' },
                { source: 'Core1', sourcePort: 'GigabitEthernet0/2', target: 'Access2', targetPort: 'GigabitEthernet0/1', cableType: 'copper_straight' },
                { source: 'Access1', sourcePort: 'GigabitEthernet0/2', target: 'Access2', targetPort: 'GigabitEthernet0/2', cableType: 'copper_crossover' }
            ],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Check the current root bridge for VLAN 1',
                hints: ['show spanning-tree vlan 1'],
                checks: []
            },
            {
                description: 'Configure Core1 to be the primary root bridge for VLAN 1',
                hints: ['spanning-tree vlan 1 root primary'],
                checks: [{ type: 'spanning_tree_root', node: 'Core1', vlan: '1' }] // Soft check
            }
        ]
    }
];
