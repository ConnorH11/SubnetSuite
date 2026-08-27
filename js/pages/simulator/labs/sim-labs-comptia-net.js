// sim-labs-comptia-net.js

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
    },
    {
        id: 'comptia-net-14',
        certification: 'Network+',
        category: 'Packet Analysis',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'Wireshark DHCP Packet Analysis',
        description: 'Analyze a packet capture and identify the DHCP packet that confirms a client successfully received an address.',
        topology: {
            nodes: [
                { id: 'ANALYST', template: 'linux_pc', x: 220, y: 220, name: 'Analyst-PC' },
                { id: 'SW1', template: 'cisco_switch_2960', x: 360, y: 220, name: 'Capture-SW' },
                { id: 'CLIENT', template: 'windows_pc', x: 460, y: 300, name: 'Client-01' },
                { id: 'DHCP', template: 'linux_server', x: 460, y: 120, name: 'DHCP-Server' }
            ],
            edges: [
                { source: 'ANALYST', sourcePort: 'eth0', target: 'SW1', targetPort: 'FastEthernet0/1', cableType: 'copper_straight' },
                { source: 'CLIENT', sourcePort: 'Ethernet0', target: 'SW1', targetPort: 'FastEthernet0/2', cableType: 'copper_straight' },
                { source: 'DHCP', sourcePort: 'eth0', target: 'SW1', targetPort: 'FastEthernet0/3', cableType: 'copper_straight' }
            ],
            packetLog: [
                { type: 'ARP', src: 'CLIENT', dst: 'DHCP', observer: 'ANALYST', info: 'Who has 192.168.20.1? Tell 0.0.0.0' },
                { type: 'DHCP', src: 'CLIENT', dst: 'DHCP', observer: 'ANALYST', info: 'DHCP Discover xid 0x42a1' },
                { type: 'DHCP', src: 'DHCP', dst: 'CLIENT', observer: 'ANALYST', info: 'DHCP Offer 192.168.20.55/24 router 192.168.20.1' },
                { type: 'DHCP', src: 'CLIENT', dst: 'DHCP', observer: 'ANALYST', info: 'DHCP Request 192.168.20.55' },
                { type: 'DHCP', src: 'DHCP', dst: 'CLIENT', observer: 'ANALYST', info: 'DHCP ACK 192.168.20.55 lease 86400' },
                { type: 'DNS', src: 'CLIENT', dst: 'DHCP', observer: 'ANALYST', info: 'Query: intranet.local A' },
                { type: 'ICMP', src: 'CLIENT', dst: 'DHCP', observer: 'ANALYST', info: 'Echo Request/Reply: 192.168.20.55 -> 192.168.20.10' }
            ],
            preConfig: {
                'ANALYST': { interfaces: { 'eth0': { ip: '192.168.20.100', subnet: '24', state: 'up' } } },
                'CLIENT': { interfaces: { 'Ethernet0': { ip: '192.168.20.55', subnet: '24', state: 'up' } } },
                'DHCP': { interfaces: { 'eth0': { ip: '192.168.20.10', subnet: '24', state: 'up' } } }
            }
        },
        tasks: [
            {
                description: 'Open Packet Capture on Analyst-PC and identify the protocol that assigned the client address',
                hints: ['Look for the Discover, Offer, Request, ACK sequence.', 'Mark one of the DHCP packets as evidence.'],
                checks: [{ type: 'pcap_protocol_identified', node: 'ANALYST', protocol: 'DHCP' }]
            },
            {
                description: 'Confirm the capture includes a DHCP ACK for 192.168.20.55',
                hints: ['The ACK is the server response that finalizes the lease.'],
                checks: [{ type: 'pcap_packet_info_contains', node: 'ANALYST', contains: ['DHCP ACK', '192.168.20.55'] }]
            }
        ]
    },
    {
        id: 'comptia-net-15',
        certification: 'Network+',
        category: 'Linux Troubleshooting',
        difficulty: 'Easy',
        timeEstimate: '15 mins',
        title: 'Linux CLI Network Triage',
        description: 'Use the Linux terminal to inspect addressing, routing, and DNS configuration on a workstation.',
        topology: {
            nodes: [
                { id: 'PC1', template: 'linux_pc', x: 260, y: 220, name: 'Linux-Client' },
                { id: 'GW', template: 'cisco_router_4321', x: 520, y: 220, name: 'Gateway' }
            ],
            edges: [
                { source: 'PC1', sourcePort: 'eth0', target: 'GW', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'PC1': {
                    interfaces: { 'eth0': { ip: '10.40.0.25', subnet: '24', state: 'up' } },
                    gateway: '10.40.0.1'
                },
                'GW': {
                    interfaces: { 'GigabitEthernet0/0/0': { ip: '10.40.0.1', subnet: '24', state: 'up' } }
                }
            }
        },
        tasks: [
            {
                description: 'Run ip addr to verify the client interface address',
                hints: ['Open Terminal on Linux-Client and run "ip addr".'],
                checks: [{ type: 'command_ran', node: 'PC1', command: 'ip addr' }]
            },
            {
                description: 'Run ip route to verify the default gateway',
                hints: ['The route table should show the default route via 10.40.0.1.'],
                checks: [{ type: 'command_ran', node: 'PC1', command: 'ip route' }]
            },
            {
                description: 'Ping the default gateway to confirm local connectivity',
                hints: ['Run "ping 10.40.0.1" from Linux-Client.'],
                checks: [
                    { type: 'command_ran', node: 'PC1', command: 'ping 10.40.0.1' },
                    { type: 'ping_success', source: 'PC1', targetIp: '10.40.0.1' }
                ]
            }
        ]
    },
    {
        id: 'comptia-net-16',
        certification: 'Network+',
        category: 'Troubleshooting',
        difficulty: 'Easy',
        timeEstimate: '15 mins',
        title: 'Scenario: Client Cannot Reach Web Portal',
        description: 'Use real troubleshooting steps to identify and repair a workstation that cannot reach an internal web server on another subnet.',
        topology: {
            nodes: [
                { id: 'PC1', template: 'windows_pc', x: 120, y: 300, name: 'Helpdesk-PC' },
                { id: 'R1', template: 'cisco_router_4321', x: 360, y: 220, name: 'Branch-Gateway' },
                { id: 'SRV1', template: 'linux_server', x: 620, y: 300, name: 'Intranet-Web' }
            ],
            edges: [
                { source: 'PC1', sourcePort: 'Ethernet0', target: 'R1', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_straight' },
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/1', target: 'SRV1', targetPort: 'eth0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'PC1': {
                    interfaces: { 'Ethernet0': { ip: '192.168.10.50', subnet: '24', state: 'up' } },
                    gateway: '192.168.10.254',
                    dnsServer: '172.16.20.10',
                    scenarioState: {
                        ticket: 'User reports the intranet portal will not load. Link light is on and local IP settings were changed this morning.',
                        fault: 'wrong_default_gateway',
                        expectedGateway: '192.168.10.1'
                    },
                    syslogMessages: [
                        '09:03 Helpdesk-PC TCP/IP settings changed by local administrator',
                        '09:05 Browser error: ERR_CONNECTION_TIMED_OUT for http://172.16.20.10',
                        '09:06 ICMP to 192.168.10.1 failed before gateway correction'
                    ],
                    filesystem: {
                        '/': { children: {
                            'home': { children: {
                                'user': { children: {
                                    'ticket.txt': { type: 'file', content: 'Ticket NET-1042: Helpdesk-PC cannot reach http://172.16.20.10. Verify local IP settings, default gateway, and routed connectivity before escalating.' }
                                }}
                            }}
                        }}
                    }
                },
                'R1': {
                    interfaces: {
                        'GigabitEthernet0/0/0': { ip: '192.168.10.1', subnet: '24', state: 'up', description: 'User LAN' },
                        'GigabitEthernet0/0/1': { ip: '172.16.20.1', subnet: '24', state: 'up', description: 'Server LAN' }
                    }
                },
                'SRV1': {
                    interfaces: { 'eth0': { ip: '172.16.20.10', subnet: '24', state: 'up' } },
                    gateway: '172.16.20.1',
                    httpEnabled: true,
                    nodeServices: { http: true },
                    dnsRecords: [{ name: 'intranet.local', type: 'A', value: '172.16.20.10' }],
                    filesystem: {
                        '/': { children: {
                            'var': { children: {
                                'www': { type: 'dir', children: {
                                    'html': { type: 'dir', children: {
                                        'index.html': { type: 'file', content: '<!doctype html><html><body style="font-family:sans-serif;padding:32px"><h1>Intranet Portal</h1><p>Status: online</p><p>SubnetSuite scenario service is reachable.</p></body></html>' }
                                    }}
                                }}
                            }}
                        }}
                    }
                }
            }
        },
        tasks: [
            {
                description: 'Investigate the client IP configuration from Helpdesk-PC',
                hints: ['Open Helpdesk-PC, launch CMD, and run "ipconfig /all".', 'Compare the default gateway to the router interface on the client subnet.'],
                checks: [{ type: 'command_ran', node: 'PC1', command: 'ipconfig', exact: false }]
            },
            {
                description: 'Confirm the local gateway should be Branch-Gateway 192.168.10.1',
                hints: ['Open the Branch-Gateway CLI and use "show ip interface brief".', 'The client LAN interface is GigabitEthernet0/0/0.'],
                checks: [
                    { type: 'command_ran', node: 'R1', command: 'show ip interface brief', commands: ['show ip interface brief', 'sh ip int br', 'show ip int brief'], exact: false },
                    { type: 'interface_ip', node: 'R1', interface: 'GigabitEthernet0/0/0', ip: '192.168.10.1', subnet: '24' }
                ]
            },
            {
                description: 'Correct Helpdesk-PC default gateway to 192.168.10.1',
                hints: ['Use the IP Configuration app on Helpdesk-PC.', 'Only the gateway is wrong. Leave the client IP as 192.168.10.50/24.'],
                checks: [{ type: 'gateway_set', node: 'PC1', expected: '192.168.10.1' }]
            },
            {
                description: 'Verify routed connectivity and web access to Intranet-Web',
                hints: ['From Helpdesk-PC, ping 172.16.20.10.', 'Then open Browser and visit 172.16.20.10 or intranet.local.'],
                checks: [
                    { type: 'command_ran', node: 'PC1', command: 'ping 172.16.20.10', exact: false },
                    { type: 'can_reach', source: 'PC1', destination: 'SRV1' },
                    { type: 'http_success', source: 'PC1', destination: 'SRV1', targetIp: '172.16.20.10' }
                ]
            }
        ]
    },
    {
        id: 'comptia-net-17',
        certification: 'Network+',
        category: 'Troubleshooting',
        difficulty: 'Easy',
        timeEstimate: '15 mins',
        title: 'Scenario: DNS Works by IP, Fails by Name',
        description: 'Troubleshoot a client that can reach a web server by IP address but cannot resolve the intranet hostname.',
        topology: {
            nodes: [
                { id: 'PC1', template: 'windows_pc', x: 120, y: 300, name: 'Accounting-PC' },
                { id: 'SW1', template: 'cisco_switch_2960', x: 300, y: 300, name: 'Access-Switch' },
                { id: 'DNS1', template: 'linux_server', x: 520, y: 180, name: 'DNS-Server' },
                { id: 'WEB1', template: 'linux_server', x: 520, y: 390, name: 'Intranet-Web' }
            ],
            edges: [
                { source: 'PC1', sourcePort: 'Ethernet0', target: 'SW1', targetPort: 'FastEthernet0/1', cableType: 'copper_straight' },
                { source: 'DNS1', sourcePort: 'eth0', target: 'SW1', targetPort: 'FastEthernet0/2', cableType: 'copper_straight' },
                { source: 'WEB1', sourcePort: 'eth0', target: 'SW1', targetPort: 'FastEthernet0/3', cableType: 'copper_straight' }
            ],
            preConfig: {
                'PC1': {
                    interfaces: { 'Ethernet0': { ip: '10.30.0.50', subnet: '24', state: 'up' } },
                    gateway: '10.30.0.1',
                    dnsServer: '10.30.0.254',
                    scenarioState: {
                        ticket: 'Accounting can open http://10.30.0.80 but http://intranet.local fails with a DNS error.',
                        fault: 'wrong_dns_server',
                        expectedDns: '10.30.0.53'
                    },
                    syslogMessages: [
                        '10:14 Browser error: DNS_PROBE_FINISHED_BAD_CONFIG for intranet.local',
                        '10:16 ICMP to 10.30.0.80 succeeded',
                        '10:17 DNS query sent to 10.30.0.254 timed out'
                    ],
                    filesystem: {
                        '/': { children: {
                            'home': { children: {
                                'user': { children: {
                                    'ticket.txt': { type: 'file', content: 'Ticket NET-1088: Accounting-PC reaches 10.30.0.80 by IP but cannot resolve intranet.local. Verify DNS client settings and DNS server records.' }
                                }}
                            }}
                        }}
                    }
                },
                'DNS1': {
                    interfaces: { 'eth0': { ip: '10.30.0.53', subnet: '24', state: 'up' } },
                    dnsRecords: [{ name: 'intranet.local', type: 'A', value: '10.30.0.80' }],
                    nodeServices: { dns: true },
                    syslogMessages: [
                        'named[1182]: zone intranet.local loaded serial 2026082401',
                        'named[1182]: listening on 10.30.0.53#53'
                    ]
                },
                'WEB1': {
                    interfaces: { 'eth0': { ip: '10.30.0.80', subnet: '24', state: 'up' } },
                    gateway: '10.30.0.1',
                    httpEnabled: true,
                    nodeServices: { http: true },
                    filesystem: {
                        '/': { children: {
                            'var': { children: {
                                'www': { type: 'dir', children: {
                                    'html': { type: 'dir', children: {
                                        'index.html': { type: 'file', content: '<!doctype html><html><body style="font-family:sans-serif;padding:32px"><h1>Accounting Intranet</h1><p>DNS repair complete.</p></body></html>' }
                                    }}
                                }}
                            }}
                        }}
                    }
                }
            }
        },
        tasks: [
            {
                description: 'Prove the web server is reachable by IP from Accounting-PC',
                hints: ['Open CMD and run "ping 10.30.0.80".', 'This confirms the network path works before focusing on DNS.'],
                checks: [
                    { type: 'command_ran', node: 'PC1', command: 'ping 10.30.0.80', exact: false },
                    { type: 'can_reach', source: 'PC1', destination: 'WEB1' }
                ]
            },
            {
                description: 'Investigate DNS client settings on Accounting-PC',
                hints: ['Run "ipconfig /all".', 'The DNS server should be 10.30.0.53, not 10.30.0.254.'],
                checks: [{ type: 'command_ran', node: 'PC1', command: 'ipconfig', exact: false }]
            },
            {
                description: 'Correct Accounting-PC DNS Server to 10.30.0.53',
                hints: ['Use the IP Configuration app on Accounting-PC.', 'Set only the DNS Server field to 10.30.0.53.'],
                checks: [{ type: 'dns_set', node: 'PC1', expected: '10.30.0.53' }]
            },
            {
                description: 'Verify intranet.local resolves and loads in the browser',
                hints: ['Run "nslookup intranet.local" from Accounting-PC.', 'Then open Browser and visit intranet.local.'],
                checks: [
                    { type: 'command_ran', node: 'PC1', command: 'nslookup intranet.local', exact: false },
                    { type: 'dns_resolves', source: 'PC1', hostname: 'intranet.local', expected: '10.30.0.80' },
                    { type: 'http_success', source: 'PC1', destination: 'WEB1', targetIp: '10.30.0.80' }
                ]
            }
        ]
    },
    {
        id: 'comptia-net-18',
        certification: 'Network+',
        category: 'Switching',
        difficulty: 'Easy',
        timeEstimate: '15 mins',
        title: 'Scenario: Workstation in Wrong VLAN',
        description: 'Troubleshoot two same-subnet hosts that cannot communicate because one access port is assigned to the wrong VLAN.',
        topology: {
            nodes: [
                { id: 'SW1', template: 'cisco_switch_2960', x: 320, y: 220, name: 'Access-Switch' },
                { id: 'PC1', template: 'windows_pc', x: 140, y: 340, name: 'Sales-PC-1' },
                { id: 'PC2', template: 'windows_pc', x: 500, y: 340, name: 'Sales-PC-2' }
            ],
            edges: [
                { source: 'PC1', sourcePort: 'Ethernet0', target: 'SW1', targetPort: 'FastEthernet0/1', cableType: 'copper_straight' },
                { source: 'PC2', sourcePort: 'Ethernet0', target: 'SW1', targetPort: 'FastEthernet0/2', cableType: 'copper_straight' }
            ],
            preConfig: {
                'SW1': {
                    vlans: { '10': { name: 'SALES' }, '20': { name: 'HR' } },
                    interfaces: {
                        'FastEthernet0/1': { state: 'up', switchportMode: 'access', accessVlan: 10, description: 'Sales-PC-1' },
                        'FastEthernet0/2': { state: 'up', switchportMode: 'access', accessVlan: 20, description: 'Sales-PC-2 wrong VLAN' }
                    },
                    syslogMessages: [
                        '14:03 helpdesk: Sales-PC-2 moved from HR desk to Sales area',
                        '14:05 access-switch: Fa0/2 operational, access VLAN 20'
                    ],
                    scenarioState: {
                        ticket: 'Sales-PC-1 and Sales-PC-2 have valid 10.10.10.x addresses but cannot ping each other after a desk move.',
                        fault: 'wrong_access_vlan',
                        expectedInterface: 'FastEthernet0/2',
                        expectedVlan: '10'
                    }
                },
                'PC1': { interfaces: { 'Ethernet0': { ip: '10.10.10.21', subnet: '24', state: 'up' } } },
                'PC2': { interfaces: { 'Ethernet0': { ip: '10.10.10.22', subnet: '24', state: 'up' } } }
            }
        },
        tasks: [
            {
                description: 'Verify Sales-PC-1 cannot reach Sales-PC-2',
                hints: ['Open CMD on Sales-PC-1 and run "ping 10.10.10.22".', 'The IPs are in the same subnet, so look at Layer 2 next.'],
                checks: [{ type: 'command_ran', node: 'PC1', command: 'ping 10.10.10.22', exact: false }]
            },
            {
                description: 'Inspect access VLAN assignments on Access-Switch',
                hints: ['Run "show vlan brief" and "show interfaces status".', 'Compare Fa0/1 and Fa0/2.'],
                checks: [{ type: 'command_ran', node: 'SW1', commands: ['show vlan brief', 'show interfaces status'], command: 'show vlan brief', exact: false }]
            },
            {
                description: 'Move Fa0/2 into VLAN 10',
                hints: ['interface Fa0/2', 'switchport mode access', 'switchport access vlan 10'],
                checks: [{ type: 'vlan_port_assignment', node: 'SW1', interface: 'FastEthernet0/2', vlanId: '10' }]
            },
            {
                description: 'Verify same-VLAN connectivity between both Sales PCs',
                hints: ['Ping 10.10.10.22 from Sales-PC-1 again.'],
                checks: [{ type: 'can_reach', source: 'PC1', destination: 'PC2' }]
            }
        ]
    },
    {
        id: 'comptia-net-19',
        certification: 'Network+',
        category: 'Switching',
        difficulty: 'Medium',
        timeEstimate: '20 mins',
        title: 'Scenario: Trunk Missing Required VLAN',
        description: 'Troubleshoot same-VLAN hosts across two switches where the trunk does not carry the needed VLAN.',
        topology: {
            nodes: [
                { id: 'SW1', template: 'cisco_switch_2960', x: 240, y: 220, name: 'Access-SW1' },
                { id: 'SW2', template: 'cisco_switch_2960', x: 520, y: 220, name: 'Access-SW2' },
                { id: 'PC1', template: 'linux_pc', x: 120, y: 360, name: 'Ops-PC-1' },
                { id: 'PC2', template: 'linux_pc', x: 640, y: 360, name: 'Ops-PC-2' }
            ],
            edges: [
                { source: 'PC1', sourcePort: 'eth0', target: 'SW1', targetPort: 'FastEthernet0/1', cableType: 'copper_straight' },
                { source: 'SW1', sourcePort: 'GigabitEthernet0/1', target: 'SW2', targetPort: 'GigabitEthernet0/1', cableType: 'copper_crossover' },
                { source: 'PC2', sourcePort: 'eth0', target: 'SW2', targetPort: 'FastEthernet0/1', cableType: 'copper_straight' }
            ],
            preConfig: {
                'SW1': {
                    vlans: { '30': { name: 'OPS' }, '40': { name: 'VOICE' } },
                    interfaces: {
                        'FastEthernet0/1': { state: 'up', switchportMode: 'access', accessVlan: 30 },
                        'GigabitEthernet0/1': { state: 'up', switchportMode: 'trunk', trunkAllowed: '40' }
                    },
                    scenarioState: {
                        ticket: 'Ops PCs on VLAN 30 are split across two access switches and cannot communicate after a trunk change.',
                        fault: 'trunk_allowed_vlan_missing',
                        expectedVlan: '30'
                    }
                },
                'SW2': {
                    vlans: { '30': { name: 'OPS' }, '40': { name: 'VOICE' } },
                    interfaces: {
                        'FastEthernet0/1': { state: 'up', switchportMode: 'access', accessVlan: 30 },
                        'GigabitEthernet0/1': { state: 'up', switchportMode: 'trunk', trunkAllowed: '40' }
                    }
                },
                'PC1': { interfaces: { 'eth0': { ip: '10.30.30.11', subnet: '24', state: 'up' } } },
                'PC2': { interfaces: { 'eth0': { ip: '10.30.30.12', subnet: '24', state: 'up' } } }
            }
        },
        tasks: [
            {
                description: 'Verify Ops-PC-1 cannot reach Ops-PC-2',
                hints: ['Open Terminal on Ops-PC-1 and run "ping 10.30.30.12".'],
                checks: [{ type: 'command_ran', node: 'PC1', command: 'ping 10.30.30.12', exact: false }]
            },
            {
                description: 'Inspect trunk state and allowed VLANs on both switches',
                hints: ['Run "show interfaces switchport" on both switches.', 'Gi0/1 is trunking, but VLAN 30 is missing from the allowed list.'],
                checks: [
                    { type: 'command_ran', node: 'SW1', command: 'show interfaces switchport', exact: false },
                    { type: 'command_ran', node: 'SW2', command: 'show interfaces switchport', exact: false }
                ]
            },
            {
                description: 'Allow VLAN 30 on the Gi0/1 trunk on both switches',
                hints: ['interface Gi0/1', 'switchport trunk allowed vlan 30,40'],
                checks: [
                    { type: 'trunk_allows_vlan', node: 'SW1', interface: 'GigabitEthernet0/1', vlanId: '30' },
                    { type: 'trunk_allows_vlan', node: 'SW2', interface: 'GigabitEthernet0/1', vlanId: '30' }
                ]
            },
            {
                description: 'Verify Ops-PC-1 can now reach Ops-PC-2',
                hints: ['Ping 10.30.30.12 from Ops-PC-1 again.'],
                checks: [{ type: 'can_reach', source: 'PC1', destination: 'PC2' }]
            }
        ]
    },
    {
        id: 'comptia-net-20',
        certification: 'Network+',
        category: 'Infrastructure Services',
        difficulty: 'Medium',
        timeEstimate: '20 mins',
        title: 'Scenario: DHCP Fails on Wrong VLAN',
        description: 'Troubleshoot a Windows workstation that cannot obtain a DHCP lease because its switchport is assigned to the wrong access VLAN.',
        topology: {
            nodes: [
                { id: 'SW1', template: 'cisco_switch_2960', x: 300, y: 220, name: 'Access-Switch' },
                { id: 'DHCP1', template: 'linux_server', x: 120, y: 360, name: 'DHCP-SRV' },
                { id: 'PC1', template: 'windows_pc', x: 500, y: 360, name: 'Support-PC' }
            ],
            edges: [
                { source: 'DHCP1', sourcePort: 'eth0', target: 'SW1', targetPort: 'FastEthernet0/1', cableType: 'copper_straight' },
                { source: 'PC1', sourcePort: 'Ethernet0', target: 'SW1', targetPort: 'FastEthernet0/2', cableType: 'copper_straight' }
            ],
            preConfig: {
                'SW1': {
                    vlans: { '10': { name: 'USERS' }, '20': { name: 'SUPPORT' } },
                    interfaces: {
                        'FastEthernet0/1': { state: 'up', switchportMode: 'access', accessVlan: 20 },
                        'FastEthernet0/2': { state: 'up', switchportMode: 'access', accessVlan: 10 }
                    },
                    scenarioState: {
                        ticket: 'A newly moved Support-PC receives no DHCP address. The DHCP server is online in VLAN 20, but the wall jack was previously used by a standard user workstation.',
                        fault: 'access_vlan_mismatch',
                        expectedVlan: '20'
                    }
                },
                'DHCP1': {
                    interfaces: { 'eth0': { ip: '10.20.20.10', subnet: '24', state: 'up' } },
                    gateway: '10.20.20.1',
                    dnsServer: '10.20.20.10',
                    dhcpPools: [
                        { name: 'SUPPORT_SCOPE', network: '10.20.20.0', mask: '255.255.255.0', defaultRouter: '10.20.20.1', dns: '10.20.20.10' }
                    ]
                },
                'PC1': {
                    interfaces: { 'Ethernet0': { ip: '', subnet: '', state: 'up' } },
                    gateway: '',
                    dnsServer: ''
                }
            }
        },
        tasks: [
            {
                description: 'Attempt to renew the DHCP lease on Support-PC',
                hints: ['Open Support-PC Command Prompt and run "ipconfig /renew".', 'A timeout points to a path or Layer 2 placement issue, not a bad static IP.'],
                checks: [{ type: 'command_ran', node: 'PC1', command: 'ipconfig /renew', exact: false }]
            },
            {
                description: 'Inspect VLAN assignments on Access-Switch',
                hints: ['Run "show vlan brief" or "show interfaces status".', 'Compare the DHCP server port and the workstation port.'],
                checks: [{ type: 'command_ran', node: 'SW1', commands: ['show vlan brief', 'show interfaces status'], command: 'show vlan brief', exact: false }]
            },
            {
                description: 'Move Fa0/2 into the SUPPORT VLAN',
                hints: ['interface Fa0/2', 'switchport mode access', 'switchport access vlan 20'],
                checks: [{ type: 'vlan_port_assignment', node: 'SW1', interface: 'FastEthernet0/2', vlanId: '20' }]
            },
            {
                description: 'Renew DHCP and verify Support-PC receives the correct network settings',
                hints: ['Run "ipconfig /renew" again after fixing the switchport.', 'Use "ipconfig /all" to confirm address, gateway, and DNS.'],
                checks: [
                    { type: 'dhcp_assigned', node: 'PC1', interface: 'Ethernet0', network: '10.20.20.0', subnet: '24', gateway: '10.20.20.1', dns: '10.20.20.10' },
                    { type: 'can_reach', source: 'PC1', destination: 'DHCP1' }
                ]
            }
        ]
    },
    {
        id: 'comptia-net-21',
        certification: 'Network+',
        category: 'Infrastructure Services',
        difficulty: 'Easy',
        timeEstimate: '15 mins',
        title: 'Scenario: DHCP Client Service Stopped',
        description: 'Troubleshoot a Windows workstation that is physically connected to the correct VLAN but cannot renew a DHCP lease because its DHCP Client service is stopped.',
        topology: {
            nodes: [
                { id: 'SW1', template: 'cisco_switch_2960', x: 300, y: 220, name: 'Access-Switch' },
                { id: 'DHCP1', template: 'linux_server', x: 120, y: 360, name: 'DHCP-SRV' },
                { id: 'PC1', template: 'windows_pc', x: 500, y: 360, name: 'Helpdesk-PC' }
            ],
            edges: [
                { source: 'DHCP1', sourcePort: 'eth0', target: 'SW1', targetPort: 'FastEthernet0/1', cableType: 'copper_straight' },
                { source: 'PC1', sourcePort: 'Ethernet0', target: 'SW1', targetPort: 'FastEthernet0/2', cableType: 'copper_straight' }
            ],
            preConfig: {
                'SW1': {
                    vlans: { '20': { name: 'SUPPORT' } },
                    interfaces: {
                        'FastEthernet0/1': { state: 'up', switchportMode: 'access', accessVlan: 20 },
                        'FastEthernet0/2': { state: 'up', switchportMode: 'access', accessVlan: 20 }
                    },
                    scenarioState: {
                        ticket: 'Helpdesk-PC was working yesterday, but now shows an autoconfiguration address and cannot reach internal resources. The switchport and DHCP server configuration were already verified by another technician.',
                        fault: 'dhcp_client_service_stopped'
                    }
                },
                'DHCP1': {
                    interfaces: { 'eth0': { ip: '10.20.20.10', subnet: '24', state: 'up' } },
                    gateway: '10.20.20.1',
                    dnsServer: '10.20.20.10',
                    dhcpPools: [
                        { name: 'SUPPORT_SCOPE', network: '10.20.20.0', mask: '255.255.255.0', defaultRouter: '10.20.20.1', dns: '10.20.20.10' }
                    ],
                    dnsRecords: [{ name: 'support.local', type: 'A', value: '10.20.20.10' }]
                },
                'PC1': {
                    interfaces: { 'Ethernet0': { ip: '', subnet: '', state: 'up' } },
                    gateway: '',
                    dnsServer: '',
                    nodeServices: { dhcpClientService: false },
                    eventLogs: [
                        { time: '08:14:22', level: 'Error', source: 'Dhcp-Client', id: '1001', message: 'Your computer was not assigned an address from the network by the DHCP Server because the DHCP Client service is not running.' },
                        { time: '08:14:20', level: 'Warning', source: 'Service Control Manager', id: '7036', message: 'The DHCP Client service entered the stopped state.' },
                        { time: '08:12:04', level: 'Information', source: 'Tcpip', id: '4201', message: 'The system detected that network adapter Ethernet0 was connected to the network.' }
                    ]
                }
            }
        },
        tasks: [
            {
                description: 'Confirm DHCP renewal fails on Helpdesk-PC',
                hints: ['Open CMD and run "ipconfig /renew".', 'If the VLAN and server are correct, check local client services next.'],
                checks: [{ type: 'command_ran', node: 'PC1', command: 'ipconfig /renew', exact: false }]
            },
            {
                description: 'Start the DHCP Client service',
                hints: ['Open Services and start DHCP Client.', 'CMD alternative: "net start dhcp".'],
                checks: [{ type: 'service_state', node: 'PC1', service: 'dhcpClientService', expected: true }]
            },
            {
                description: 'Renew the lease and verify Helpdesk-PC receives Support network settings',
                hints: ['Run "ipconfig /renew" again.', 'Use "ipconfig /all" to verify gateway and DNS.'],
                checks: [{ type: 'dhcp_assigned', node: 'PC1', interface: 'Ethernet0', network: '10.20.20.0', subnet: '24', gateway: '10.20.20.1', dns: '10.20.20.10' }]
            },
            {
                description: 'Verify Helpdesk-PC can reach the DHCP/DNS server',
                hints: ['Ping 10.20.20.10 from Helpdesk-PC.'],
                checks: [{ type: 'can_reach', source: 'PC1', destination: 'DHCP1' }]
            }
        ]
    },
    {
        id: 'comptia-net-22',
        certification: 'Network+',
        category: 'Infrastructure Services',
        difficulty: 'Easy',
        timeEstimate: '15 mins',
        title: 'Scenario: DNS Client Service Stopped',
        description: 'Troubleshoot a Windows workstation that can reach a server by IP address but cannot resolve its hostname because the DNS Client service is stopped.',
        topology: {
            nodes: [
                { id: 'SW1', template: 'cisco_switch_2960', x: 300, y: 220, name: 'Access-Switch' },
                { id: 'DNS1', template: 'linux_server', x: 120, y: 360, name: 'DNS-SRV' },
                { id: 'WEB1', template: 'linux_server', x: 300, y: 360, name: 'Intranet-Web' },
                { id: 'PC1', template: 'windows_pc', x: 520, y: 360, name: 'FrontDesk-PC' }
            ],
            edges: [
                { source: 'DNS1', sourcePort: 'eth0', target: 'SW1', targetPort: 'FastEthernet0/1', cableType: 'copper_straight' },
                { source: 'WEB1', sourcePort: 'eth0', target: 'SW1', targetPort: 'FastEthernet0/2', cableType: 'copper_straight' },
                { source: 'PC1', sourcePort: 'Ethernet0', target: 'SW1', targetPort: 'FastEthernet0/3', cableType: 'copper_straight' }
            ],
            preConfig: {
                'SW1': {
                    vlans: { '30': { name: 'OFFICE' } },
                    interfaces: {
                        'FastEthernet0/1': { state: 'up', switchportMode: 'access', accessVlan: 30 },
                        'FastEthernet0/2': { state: 'up', switchportMode: 'access', accessVlan: 30 },
                        'FastEthernet0/3': { state: 'up', switchportMode: 'access', accessVlan: 30 }
                    },
                    scenarioState: {
                        ticket: 'FrontDesk-PC can ping the intranet web server by IP, but browser and nslookup fail when using intranet.local. DNS server configuration has already been validated.',
                        fault: 'dns_client_service_stopped'
                    }
                },
                'DNS1': {
                    interfaces: { 'eth0': { ip: '10.30.30.53', subnet: '24', state: 'up' } },
                    dnsRecords: [{ name: 'intranet.local', type: 'A', value: '10.30.30.80' }],
                    nodeServices: { dnsServer: true }
                },
                'WEB1': {
                    interfaces: { 'eth0': { ip: '10.30.30.80', subnet: '24', state: 'up' } },
                    httpEnabled: true,
                    nodeServices: { http: true }
                },
                'PC1': {
                    interfaces: { 'Ethernet0': { ip: '10.30.30.40', subnet: '24', state: 'up' } },
                    gateway: '',
                    dnsServer: '10.30.30.53',
                    nodeServices: { dnsClient: false },
                    eventLogs: [
                        { time: '09:22:10', level: 'Warning', source: 'DNS Client Events', id: '1014', message: 'Name resolution for intranet.local failed because the DNS Client service is not running.' },
                        { time: '09:21:54', level: 'Warning', source: 'Service Control Manager', id: '7036', message: 'The DNS Client service entered the stopped state.' },
                        { time: '09:20:02', level: 'Information', source: 'Tcpip', id: '4201', message: 'Adapter Ethernet0 is configured with DNS server 10.30.30.53.' }
                    ]
                }
            }
        },
        tasks: [
            {
                description: 'Verify IP connectivity to the intranet web server',
                hints: ['Open CMD on FrontDesk-PC and run "ping 10.30.30.80".'],
                checks: [{ type: 'command_ran', node: 'PC1', command: 'ping 10.30.30.80', exact: false }]
            },
            {
                description: 'Confirm name resolution fails for intranet.local',
                hints: ['Run "nslookup intranet.local".', 'Event Viewer may show a DNS Client warning.'],
                checks: [{ type: 'command_ran', node: 'PC1', command: 'nslookup intranet.local', exact: false }]
            },
            {
                description: 'Start the DNS Client service',
                hints: ['Open Services and start DNS Client.', 'CMD alternative: "net start dnscache".'],
                checks: [{ type: 'service_state', node: 'PC1', service: 'dnsClient', expected: true }]
            },
            {
                description: 'Verify intranet.local resolves after the service is started',
                hints: ['Run "nslookup intranet.local" again or use DNS Lookup.'],
                checks: [{ type: 'dns_resolves', source: 'PC1', hostname: 'intranet.local', expected: '10.30.30.80' }]
            }
        ]
    },
    {
        id: 'comptia-net-23',
        certification: 'Network+',
        category: 'Packet Analysis',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'Wireshark DNS NXDOMAIN Analysis',
        description: 'Analyze a DNS packet capture and identify the response proving that the DNS server does not have a matching A record.',
        topology: {
            nodes: [
                { id: 'ANALYST', template: 'linux_pc', x: 220, y: 220, name: 'Analyst-PC' },
                { id: 'SW1', template: 'cisco_switch_2960', x: 360, y: 220, name: 'Capture-SW' },
                { id: 'CLIENT', template: 'windows_pc', x: 500, y: 300, name: 'Client-02' },
                { id: 'DNS', template: 'linux_server', x: 500, y: 120, name: 'DNS-Server' }
            ],
            edges: [
                { source: 'ANALYST', sourcePort: 'eth0', target: 'SW1', targetPort: 'FastEthernet0/1', cableType: 'copper_straight' },
                { source: 'CLIENT', sourcePort: 'Ethernet0', target: 'SW1', targetPort: 'FastEthernet0/2', cableType: 'copper_straight' },
                { source: 'DNS', sourcePort: 'eth0', target: 'SW1', targetPort: 'FastEthernet0/3', cableType: 'copper_straight' }
            ],
            packetLog: [
                { type: 'ARP', src: 'CLIENT', dst: 'DNS', observer: 'ANALYST', info: 'Who has 10.50.0.53? Tell 10.50.0.25' },
                { type: 'DNS', src: 'CLIENT', dst: 'DNS', observer: 'ANALYST', info: 'Query: payroll.local A', details: { transport: 'UDP', srcPort: 53210, dstPort: 53, queryName: 'payroll.local', queryType: 'A', responseCode: 'Pending' } },
                { type: 'DNS', src: 'DNS', dst: 'CLIENT', observer: 'ANALYST', info: 'Response: payroll.local -> NXDOMAIN', details: { transport: 'UDP', srcPort: 53, dstPort: 53210, queryName: 'payroll.local', queryType: 'A', responseCode: 'NXDOMAIN', answer: '' } },
                { type: 'DNS', src: 'CLIENT', dst: 'DNS', observer: 'ANALYST', info: 'Query: intranet.local A', details: { transport: 'UDP', srcPort: 53211, dstPort: 53, queryName: 'intranet.local', queryType: 'A', responseCode: 'Pending' } },
                { type: 'DNS', src: 'DNS', dst: 'CLIENT', observer: 'ANALYST', info: 'Response: intranet.local -> 10.50.0.80', details: { transport: 'UDP', srcPort: 53, dstPort: 53211, queryName: 'intranet.local', queryType: 'A', responseCode: 'NoError', answer: '10.50.0.80' } },
                { type: 'ICMP', src: 'CLIENT', dst: 'DNS', observer: 'ANALYST', info: 'Echo Request/Reply: 10.50.0.25 -> 10.50.0.53' }
            ],
            preConfig: {
                'ANALYST': { interfaces: { 'eth0': { ip: '10.50.0.100', subnet: '24', state: 'up' } } },
                'CLIENT': { interfaces: { 'Ethernet0': { ip: '10.50.0.25', subnet: '24', state: 'up' } }, dnsServer: '10.50.0.53' },
                'DNS': {
                    interfaces: { 'eth0': { ip: '10.50.0.53', subnet: '24', state: 'up' } },
                    dnsRecords: [{ name: 'intranet.local', type: 'A', value: '10.50.0.80' }],
                    nodeServices: { dnsServer: true }
                }
            }
        },
        tasks: [
            {
                description: 'Open Packet Capture on Analyst-PC and identify the DNS traffic',
                hints: ['DNS uses UDP/53 for normal A record lookups.', 'Mark a DNS packet as evidence.'],
                checks: [{ type: 'pcap_protocol_identified', node: 'ANALYST', protocol: 'DNS' }]
            },
            {
                description: 'Mark the DNS response that proves payroll.local does not exist',
                hints: ['Look in the packet details for responseCode NXDOMAIN.', 'The Info field also names payroll.local.'],
                checks: [{ type: 'pcap_packet_info_contains', node: 'ANALYST', contains: ['payroll.local', 'NXDOMAIN'] }]
            }
        ]
    },
    {
        id: 'comptia-net-24',
        certification: 'Network+',
        category: 'Discovery Tools',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'Scenario: Install Nmap to Find an Unknown Web Service',
        description: 'A technician knows a Linux server is reachable, but does not know which service port is open. Install a scanner on the Windows admin workstation and use it to identify the service.',
        topology: {
            nodes: [
                { id: 'SW1', template: 'cisco_switch_2960', x: 320, y: 220, name: 'Access-Switch' },
                { id: 'PC1', template: 'windows_pc', x: 140, y: 340, name: 'Admin-Workstation' },
                { id: 'SRV1', template: 'linux_server', x: 520, y: 340, name: 'Inventory-Web' }
            ],
            edges: [
                { source: 'PC1', sourcePort: 'Ethernet0', target: 'SW1', targetPort: 'FastEthernet0/1', cableType: 'copper_straight' },
                { source: 'SRV1', sourcePort: 'eth0', target: 'SW1', targetPort: 'FastEthernet0/2', cableType: 'copper_straight' }
            ],
            preConfig: {
                'PC1': {
                    interfaces: { 'Ethernet0': { ip: '10.70.10.50', subnet: '24', state: 'up' } },
                    gateway: '10.70.10.1',
                    installedPackages: ['cmd', 'powershell', 'tcpip', 'net-tools', 'system-tools', 'curl', 'openssh-client']
                },
                'SRV1': {
                    interfaces: { 'eth0': { ip: '10.70.10.80', subnet: '24', state: 'up' } },
                    installedPackages: ['bash', 'coreutils', 'iproute2', 'iputils-ping', 'nginx'],
                    services: { nginx: 'active' },
                    nodeServices: { http: true },
                    httpEnabled: true
                }
            }
        },
        tasks: [
            {
                description: 'Confirm the Inventory-Web server is reachable from Admin-Workstation',
                hints: ['Open CMD on Admin-Workstation and run "ping 10.70.10.80".'],
                checks: [
                    { type: 'command_ran', node: 'PC1', command: 'ping 10.70.10.80', exact: false },
                    { type: 'can_reach', source: 'PC1', destination: 'SRV1' }
                ]
            },
            {
                description: 'Install Nmap from the Store on Admin-Workstation',
                hints: ['Open Store on Admin-Workstation.', 'Install the Nmap app from the Networking category.'],
                checks: [{ type: 'package_installed', node: 'PC1', package: 'nmap' }]
            },
            {
                description: 'Run an Nmap scan against Inventory-Web',
                hints: ['Run "nmap 10.70.10.80" from CMD.', 'The scan should identify common open service ports.'],
                checks: [{ type: 'command_ran', node: 'PC1', command: 'nmap 10.70.10.80', exact: false }]
            },
            {
                description: 'Verify web access to the discovered HTTP service',
                hints: ['Open Browser on Admin-Workstation and visit 10.70.10.80.'],
                checks: [{ type: 'http_success', source: 'PC1', destination: 'SRV1', targetIp: '10.70.10.80' }]
            }
        ]
    },
    {
        id: 'comptia-net-25',
        certification: 'Network+',
        category: 'Remote Access',
        difficulty: 'Easy',
        timeEstimate: '15 mins',
        title: 'Scenario: Install PuTTY for Remote Switch/Server Access',
        description: 'An admin workstation can reach a Linux management host, but the required remote access client is missing. Install PuTTY and initiate an SSH session.',
        topology: {
            nodes: [
                { id: 'SW1', template: 'cisco_switch_2960', x: 320, y: 220, name: 'Mgmt-Switch' },
                { id: 'PC1', template: 'windows_pc', x: 140, y: 340, name: 'Admin-PC' },
                { id: 'SRV1', template: 'linux_server', x: 520, y: 340, name: 'Mgmt-Jumpbox' }
            ],
            edges: [
                { source: 'PC1', sourcePort: 'Ethernet0', target: 'SW1', targetPort: 'FastEthernet0/1', cableType: 'copper_straight' },
                { source: 'SRV1', sourcePort: 'eth0', target: 'SW1', targetPort: 'FastEthernet0/2', cableType: 'copper_straight' }
            ],
            preConfig: {
                'PC1': {
                    interfaces: { 'Ethernet0': { ip: '10.85.0.25', subnet: '24', state: 'up' } },
                    installedPackages: ['cmd', 'powershell', 'tcpip', 'net-tools', 'system-tools', 'curl', 'openssh-client']
                },
                'SRV1': {
                    interfaces: { 'eth0': { ip: '10.85.0.10', subnet: '24', state: 'up' } },
                    installedPackages: ['bash', 'coreutils', 'iproute2', 'iputils-ping', 'openssh-server'],
                    services: { ssh: 'active', sshd: 'active' }
                }
            }
        },
        tasks: [
            {
                description: 'Verify Admin-PC can reach Mgmt-Jumpbox',
                hints: ['Open CMD on Admin-PC and run "ping 10.85.0.10".'],
                checks: [
                    { type: 'command_ran', node: 'PC1', command: 'ping 10.85.0.10', exact: false },
                    { type: 'can_reach', source: 'PC1', destination: 'SRV1' }
                ]
            },
            {
                description: 'Install PuTTY from the Store on Admin-PC',
                hints: ['Open Store on Admin-PC.', 'Install PuTTY from the Networking category.'],
                checks: [{ type: 'package_installed', node: 'PC1', package: 'putty' }]
            },
            {
                description: 'Start an SSH session to Mgmt-Jumpbox using PuTTY',
                hints: ['Run "putty 10.85.0.10" or "plink 10.85.0.10" from CMD.'],
                checks: [{ type: 'command_ran', node: 'PC1', commands: ['putty 10.85.0.10', 'plink 10.85.0.10'], command: 'putty 10.85.0.10', exact: false }]
            }
        ]
    },
    {
        id: 'comptia-net-26',
        certification: 'Network+',
        category: 'Operations',
        difficulty: 'Easy',
        timeEstimate: '15 mins',
        title: 'Scenario: Install Git to Pull Network Backups',
        description: 'A junior admin workstation needs Git installed before it can pull the switch backup repository from an internal server.',
        topology: {
            nodes: [
                { id: 'SW1', template: 'cisco_switch_2960', x: 320, y: 220, name: 'Ops-Switch' },
                { id: 'PC1', template: 'windows_pc', x: 140, y: 340, name: 'Ops-Workstation' },
                { id: 'GIT1', template: 'linux_server', x: 520, y: 340, name: 'Config-Repo' }
            ],
            edges: [
                { source: 'PC1', sourcePort: 'Ethernet0', target: 'SW1', targetPort: 'FastEthernet0/1', cableType: 'copper_straight' },
                { source: 'GIT1', sourcePort: 'eth0', target: 'SW1', targetPort: 'FastEthernet0/2', cableType: 'copper_straight' }
            ],
            preConfig: {
                'PC1': {
                    interfaces: { 'Ethernet0': { ip: '10.86.10.25', subnet: '24', state: 'up' } },
                    installedPackages: ['cmd', 'powershell', 'tcpip', 'net-tools', 'system-tools', 'curl', 'openssh-client']
                },
                'GIT1': {
                    interfaces: { 'eth0': { ip: '10.86.10.40', subnet: '24', state: 'up' } },
                    installedPackages: ['bash', 'coreutils', 'git', 'openssh-server'],
                    services: { ssh: 'active', sshd: 'active' }
                }
            }
        },
        tasks: [
            {
                description: 'Verify Ops-Workstation can reach Config-Repo',
                hints: ['Open CMD on Ops-Workstation and run "ping 10.86.10.40".'],
                checks: [
                    { type: 'command_ran', node: 'PC1', command: 'ping 10.86.10.40', exact: false },
                    { type: 'can_reach', source: 'PC1', destination: 'GIT1' }
                ]
            },
            {
                description: 'Install Git from the Store on Ops-Workstation',
                hints: ['Open Store on Ops-Workstation.', 'Install Git from the Developer Tools category.'],
                checks: [{ type: 'package_installed', node: 'PC1', package: 'git' }]
            },
            {
                description: 'Verify Git is available from CMD',
                hints: ['Run "git --version".'],
                checks: [{ type: 'command_ran', node: 'PC1', command: 'git --version', exact: false }]
            },
            {
                description: 'Clone the internal network backup repository',
                hints: ['Run "git clone ssh://10.86.10.40/network-backups".'],
                checks: [{ type: 'command_ran', node: 'PC1', command: 'git clone', exact: false }]
            }
        ]
    },
    {
        id: 'comptia-net-27',
        certification: 'Network+',
        category: 'Packet Analysis',
        difficulty: 'Medium',
        timeEstimate: '20 mins',
        title: 'Scenario: Install tshark to Identify DHCP Traffic',
        description: 'A capture workstation needs Wireshark CLI tools installed before the technician can confirm a client is sending DHCP Discover packets.',
        topology: {
            nodes: [
                { id: 'ANALYST', template: 'linux_pc', x: 180, y: 240, name: 'Capture-Station' },
                { id: 'SW1', template: 'cisco_switch_2960', x: 360, y: 240, name: 'Access-Switch' },
                { id: 'CLIENT', template: 'windows_pc', x: 540, y: 340, name: 'Lobby-PC' },
                { id: 'DHCP1', template: 'linux_server', x: 540, y: 140, name: 'DHCP-Server' }
            ],
            edges: [
                { source: 'ANALYST', sourcePort: 'eth0', target: 'SW1', targetPort: 'FastEthernet0/1', cableType: 'copper_straight' },
                { source: 'CLIENT', sourcePort: 'Ethernet0', target: 'SW1', targetPort: 'FastEthernet0/2', cableType: 'copper_straight' },
                { source: 'DHCP1', sourcePort: 'eth0', target: 'SW1', targetPort: 'FastEthernet0/3', cableType: 'copper_straight' }
            ],
            packetLog: [
                { type: 'DHCP', src: 'CLIENT', dst: 'broadcast', observer: 'ANALYST', info: 'DHCP Discover from Lobby-PC', details: { bootpOp: 'Discover', srcPort: 68, dstPort: 67, messageType: 'DHCP Discover', clientMac: '00:11:22:33:44:55' } },
                { type: 'DHCP', src: 'DHCP1', dst: 'CLIENT', observer: 'ANALYST', info: 'DHCP Offer 10.44.20.75 to Lobby-PC', details: { bootpOp: 'Offer', srcPort: 67, dstPort: 68, messageType: 'DHCP Offer', offeredIp: '10.44.20.75' } },
                { type: 'ARP', src: 'CLIENT', dst: 'broadcast', observer: 'ANALYST', info: 'Who has 10.44.20.1? Tell 10.44.20.75' }
            ],
            preConfig: {
                'ANALYST': {
                    interfaces: { 'eth0': { ip: '10.44.20.100', subnet: '24', state: 'up' } },
                    installedPackages: ['bash', 'coreutils', 'iproute2', 'iputils-ping']
                },
                'CLIENT': { interfaces: { 'Ethernet0': { ip: '', subnet: '', state: 'up' } } },
                'DHCP1': {
                    interfaces: { 'eth0': { ip: '10.44.20.10', subnet: '24', state: 'up' } },
                    nodeServices: { dhcpServer: true }
                }
            }
        },
        tasks: [
            {
                description: 'Install Wireshark CLI tools on Capture-Station',
                hints: ['Use Software Center or run "apt install wireshark".'],
                checks: [{ type: 'package_installed', node: 'ANALYST', package: 'wireshark' }]
            },
            {
                description: 'Run tshark to review captured traffic',
                hints: ['Open Terminal on Capture-Station and run "tshark".'],
                checks: [{ type: 'command_ran', node: 'ANALYST', command: 'tshark', exact: false }]
            },
            {
                description: 'Mark the DHCP Discover packet as evidence',
                hints: ['Open Packet Capture on Capture-Station.', 'DHCP clients send Discover from UDP/68 to UDP/67.'],
                checks: [
                    { type: 'pcap_protocol_identified', node: 'ANALYST', protocol: 'DHCP' },
                    { type: 'pcap_packet_info_contains', node: 'ANALYST', contains: ['DHCP Discover'] }
                ]
            }
        ]
    }
];
