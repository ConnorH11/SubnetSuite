// sim-labs-comptia-sec.js

export const COMPTIA_SEC_LABS = [
    {
        id: 'comptia-sec-01',
        certification: 'Security+',
        category: 'Firewall / ACLs',
        difficulty: 'Medium',
        timeEstimate: '20 mins',
        title: 'Stateless Firewalling',
        description: 'Use a router as a stateless firewall to block traffic from an untrusted host while allowing others.',
        topology: {
            nodes: [
                { id: 'FW', template: 'cisco_router_4321', x: 300, y: 200, name: 'Border-FW' },
                { id: 'SW1', template: 'cisco_switch_2960', x: 150, y: 300, name: 'LAN-Switch' },
                { id: 'Hacker', template: 'linux_pc', x: 500, y: 100, name: 'Untrusted-Host' },
                { id: 'User', template: 'windows_pc', x: 500, y: 300, name: 'Trusted-Host' },
                { id: 'Server', template: 'linux_server', x: 150, y: 400, name: 'Corp-Server' }
            ],
            edges: [
                { source: 'FW', sourcePort: 'GigabitEthernet0/0/0', target: 'SW1', targetPort: 'GigabitEthernet0/1', cableType: 'copper_straight' },
                { source: 'FW', sourcePort: 'GigabitEthernet0/0/1', target: 'Hacker', targetPort: 'eth0', cableType: 'copper_straight' },
                { source: 'FW', sourcePort: 'GigabitEthernet0/0/2', target: 'User', targetPort: 'Ethernet0', cableType: 'copper_straight' },
                { source: 'SW1', sourcePort: 'FastEthernet0/1', target: 'Server', targetPort: 'eth0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'FW': {
                    interfaces: {
                        'GigabitEthernet0/0/0': { ip: '192.168.100.1', subnet: '24', state: 'up' },
                        'GigabitEthernet0/0/1': { ip: '203.0.113.1', subnet: '30', state: 'up' },
                        'GigabitEthernet0/0/2': { ip: '198.51.100.1', subnet: '30', state: 'up' }
                    }
                },
                'Hacker': { interfaces: { 'eth0': { ip: '203.0.113.2', subnet: '30', state: 'up' } }, gateway: '203.0.113.1' },
                'User': { interfaces: { 'Ethernet0': { ip: '198.51.100.2', subnet: '30', state: 'up' } }, gateway: '198.51.100.1' },
                'Server': { interfaces: { 'eth0': { ip: '192.168.100.10', subnet: '24', state: 'up' } }, gateway: '192.168.100.1' }
            }
        },
        tasks: [
            {
                description: 'Create access-list 101 to deny the Untrusted-Host (203.0.113.2) from reaching Corp-Server (192.168.100.10)',
                hints: ['Use "access-list 101 deny ip host 203.0.113.2 host 192.168.100.10"'],
                checks: [{ type: 'acl_exists', node: 'FW', aclId: '101' }, { type: 'acl_entry', node: 'FW', aclId: '101', action: 'deny' }]
            },
            {
                description: 'Add a permit any any statement to access-list 101',
                hints: ['Use "access-list 101 permit ip any any"'],
                checks: [{ type: 'acl_entry', node: 'FW', aclId: '101', action: 'permit' }]
            }
        ]
    },
    {
        id: 'comptia-sec-02',
        certification: 'Security+',
        category: 'Port Security',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'Mitigating MAC Flooding',
        description: 'Configure switch port security to prevent MAC flooding attacks on an access port.',
        topology: {
            nodes: [
                { id: 'SW1', template: 'cisco_switch_2960', x: 300, y: 200, name: 'Access-SW' },
                { id: 'PC1', template: 'windows_pc', x: 300, y: 350, name: 'Workstation' }
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
                description: 'Enable port security on FastEthernet0/1',
                hints: ['Make it an access port first: "switchport mode access", then "switchport port-security"'],
                checks: [{ type: 'switchport_mode', node: 'SW1', interface: 'FastEthernet0/1', expected: 'access' }]
            }
        ]
    },
    {
        id: 'comptia-sec-03',
        certification: 'Security+',
        category: 'Layer 2 Security',
        difficulty: 'Hard',
        timeEstimate: '20 mins',
        title: 'DHCP Snooping & DAI',
        description: 'Configure DHCP Snooping to prevent a rogue DHCP server from issuing IPs on the network.',
        topology: {
            nodes: [
                { id: 'SW1', template: 'cisco_switch_2960', x: 300, y: 200, name: 'Access-SW' },
                { id: 'DHCP', template: 'linux_server', x: 300, y: 100, name: 'Trusted-DHCP' },
                { id: 'Rogue', template: 'linux_pc', x: 100, y: 300, name: 'Rogue-DHCP' },
                { id: 'PC1', template: 'windows_pc', x: 500, y: 300, name: 'Victim-PC' }
            ],
            edges: [
                { source: 'DHCP', sourcePort: 'eth0', target: 'SW1', targetPort: 'GigabitEthernet0/1', cableType: 'copper_straight' },
                { source: 'Rogue', sourcePort: 'eth0', target: 'SW1', targetPort: 'FastEthernet0/1', cableType: 'copper_straight' },
                { source: 'PC1', sourcePort: 'Ethernet0', target: 'SW1', targetPort: 'FastEthernet0/2', cableType: 'copper_straight' }
            ],
            preConfig: {
                'DHCP': { interfaces: { 'eth0': { ip: '192.168.1.100', subnet: '24', state: 'up' } } }
            }
        },
        tasks: [
            {
                description: 'Enable DHCP Snooping globally and on VLAN 1',
                hints: ['Use "ip dhcp snooping" and "ip dhcp snooping vlan 1".'],
                checks: [{ type: 'dhcp_snooping', node: 'SW1', expected: true }] // Soft check
            },
            {
                description: 'Trust the port connected to the legitimate DHCP Server (Gi0/1)',
                hints: ['Enter interface config for Gi0/1.', 'Use "ip dhcp snooping trust".'],
                checks: [{ type: 'interface_state', node: 'SW1', interface: 'GigabitEthernet0/1', state: 'up' }]
            }
        ]
    },
    {
        id: 'comptia-sec-04',
        certification: 'Security+',
        category: 'Identity & Access',
        difficulty: 'Medium',
        timeEstimate: '20 mins',
        title: 'AAA via RADIUS',
        description: 'Configure a router to authenticate administrative logins using an external RADIUS server.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 200, y: 200, name: 'Gateway' },
                { id: 'Radius', template: 'linux_server', x: 500, y: 200, name: 'RADIUS-Server' }
            ],
            edges: [
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/0', target: 'Radius', targetPort: 'eth0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'R1': { interfaces: { 'GigabitEthernet0/0/0': { ip: '10.0.0.1', subnet: '24', state: 'up' } } },
                'Radius': { interfaces: { 'eth0': { ip: '10.0.0.100', subnet: '24', state: 'up' } }, gateway: '10.0.0.1' }
            }
        },
        tasks: [
            {
                description: 'Enable AAA new-model',
                hints: ['Use "aaa new-model" in global config.'],
                checks: [{ type: 'aaa_enabled', node: 'R1' }] // Soft check
            },
            {
                description: 'Define the RADIUS server 10.0.0.100 with key "secret123"',
                hints: ['radius server RADIUS1', 'address ipv4 10.0.0.100 auth-port 1812 acct-port 1813', 'key secret123'],
                checks: [{ type: 'radius_server', node: 'R1', ip: '10.0.0.100' }] // Soft check
            },
            {
                description: 'Configure the default login authentication to use the RADIUS group',
                hints: ['aaa authentication login default group radius local'],
                checks: [{ type: 'aaa_auth_login', node: 'R1', method: 'radius' }] // Soft check
            }
        ]
    },
    {
        id: 'comptia-sec-05',
        certification: 'Security+',
        category: 'Firewall / ACLs',
        difficulty: 'Medium',
        timeEstimate: '20 mins',
        title: 'DMZ Isolation',
        description: 'Configure ACLs to allow the Internet to reach the DMZ web server, but prevent the DMZ from initiating connections to the internal LAN.',
        topology: {
            nodes: [
                { id: 'FW', template: 'cisco_router_4321', x: 400, y: 200, name: 'Border-Router' },
                { id: 'LAN', template: 'cisco_switch_2960', x: 200, y: 300, name: 'LAN-Switch' },
                { id: 'DMZ', template: 'cisco_switch_2960', x: 600, y: 300, name: 'DMZ-Switch' },
                { id: 'PC1', template: 'windows_pc', x: 200, y: 400, name: 'Internal-PC' },
                { id: 'Web', template: 'linux_server', x: 600, y: 400, name: 'Public-Web' },
                { id: 'ISP', template: 'isp_router', x: 400, y: 50, name: 'Internet' }
            ],
            edges: [
                { source: 'FW', sourcePort: 'GigabitEthernet0/0/0', target: 'ISP', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_straight' },
                { source: 'FW', sourcePort: 'GigabitEthernet0/0/1', target: 'LAN', targetPort: 'GigabitEthernet0/1', cableType: 'copper_straight' },
                { source: 'FW', sourcePort: 'GigabitEthernet0/0/2', target: 'DMZ', targetPort: 'GigabitEthernet0/1', cableType: 'copper_straight' },
                { source: 'LAN', sourcePort: 'FastEthernet0/1', target: 'PC1', targetPort: 'Ethernet0', cableType: 'copper_straight' },
                { source: 'DMZ', sourcePort: 'FastEthernet0/1', target: 'Web', targetPort: 'eth0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'FW': {
                    interfaces: {
                        'GigabitEthernet0/0/0': { ip: '203.0.113.1', subnet: '30', state: 'up' }, // Outside
                        'GigabitEthernet0/0/1': { ip: '10.0.10.1', subnet: '24', state: 'up' }, // Inside LAN
                        'GigabitEthernet0/0/2': { ip: '172.16.50.1', subnet: '24', state: 'up' } // DMZ
                    }
                },
                'PC1': { interfaces: { 'Ethernet0': { ip: '10.0.10.50', subnet: '24', state: 'up' } }, gateway: '10.0.10.1' },
                'Web': { interfaces: { 'eth0': { ip: '172.16.50.100', subnet: '24', state: 'up' } }, gateway: '172.16.50.1' }
            }
        },
        tasks: [
            {
                description: 'Create an ACL to deny traffic from DMZ (172.16.50.0/24) to LAN (10.0.10.0/24)',
                hints: ['access-list 105 deny ip 172.16.50.0 0.0.0.255 10.0.10.0 0.0.0.255'],
                checks: [{ type: 'acl_exists', node: 'FW', aclId: '105' }]
            },
            {
                description: 'Permit all other IP traffic from the DMZ',
                hints: ['access-list 105 permit ip any any'],
                checks: [{ type: 'acl_exists', node: 'FW', aclId: '105' }]
            },
            {
                description: 'Apply the ACL inbound on the DMZ interface (Gi0/0/2)',
                hints: ['interface Gi0/0/2', 'ip access-group 105 in'],
                checks: [{ type: 'acl_applied', node: 'FW', interface: 'GigabitEthernet0/0/2', direction: 'in', aclId: '105' }] // Soft check
            }
        ]
    },
    {
        id: 'comptia-sec-06',
        certification: 'Security+',
        category: 'Identity & Access',
        difficulty: 'Hard',
        timeEstimate: '20 mins',
        title: 'IEEE 802.1X Port Authentication',
        description: 'Configure a switch to require 802.1X authentication before granting network access.',
        topology: {
            nodes: [
                { id: 'SW1', template: 'cisco_switch_2960', x: 300, y: 200, name: 'Access-SW' },
                { id: 'Radius', template: 'linux_server', x: 500, y: 100, name: 'RADIUS-Srv' },
                { id: 'PC1', template: 'windows_pc', x: 100, y: 300, name: 'Supplicant' }
            ],
            edges: [
                { source: 'SW1', sourcePort: 'GigabitEthernet0/1', target: 'Radius', targetPort: 'eth0', cableType: 'copper_straight' },
                { source: 'SW1', sourcePort: 'FastEthernet0/1', target: 'PC1', targetPort: 'Ethernet0', cableType: 'copper_straight' }
            ],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Enable AAA and configure RADIUS server (10.0.0.100)',
                hints: ['aaa new-model', 'radius server RADIUS', 'address ipv4 10.0.0.100'],
                checks: [{ type: 'radius_server', node: 'SW1', ip: '10.0.0.100' }] // Soft check
            },
            {
                description: 'Enable 802.1X globally on the switch',
                hints: ['dot1x system-auth-control'],
                checks: [{ type: 'interface_state', node: 'SW1', interface: 'FastEthernet0/1', state: 'up' }] // Soft check
            },
            {
                description: 'Configure Fa0/1 for dot1x port-control auto',
                hints: ['interface Fa0/1', 'authentication port-control auto', 'dot1x pae authenticator'],
                checks: [{ type: 'interface_state', node: 'SW1', interface: 'FastEthernet0/1', state: 'up' }] // Soft check
            }
        ]
    },
    {
        id: 'comptia-sec-07',
        certification: 'Security+',
        category: 'Monitoring',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'Port Mirroring (SPAN) for IDS',
        description: 'Configure a Switched Port Analyzer (SPAN) session to mirror traffic to an Intrusion Detection System.',
        topology: {
            nodes: [
                { id: 'SW1', template: 'cisco_switch_2960', x: 300, y: 200, name: 'Core-SW' },
                { id: 'FW', template: 'cisco_router_4321', x: 300, y: 50, name: 'Firewall' },
                { id: 'IDS', template: 'linux_server', x: 600, y: 200, name: 'IDS-Sensor' }
            ],
            edges: [
                { source: 'SW1', sourcePort: 'GigabitEthernet0/1', target: 'FW', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_straight' },
                { source: 'SW1', sourcePort: 'GigabitEthernet0/2', target: 'IDS', targetPort: 'eth0', cableType: 'copper_straight' }
            ],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Configure monitor session 1 to use Gi0/1 as the source port for both tx and rx',
                hints: ['monitor session 1 source interface Gi0/1 both'],
                checks: [{ type: 'interface_state', node: 'SW1', interface: 'GigabitEthernet0/2', state: 'up' }] // Soft check
            },
            {
                description: 'Configure monitor session 1 to use Gi0/2 as the destination port',
                hints: ['monitor session 1 destination interface Gi0/2'],
                checks: [{ type: 'interface_state', node: 'SW1', interface: 'GigabitEthernet0/2', state: 'up' }] // Soft check
            }
        ]
    },
    {
        id: 'comptia-sec-08',
        certification: 'Security+',
        category: 'VPN',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'VPN Split Tunneling',
        description: 'Configure an ACL used by an AnyConnect/IPsec profile to permit only corporate subnets through the tunnel.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 300, y: 200, name: 'VPN-Gateway' }
            ],
            edges: [],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Create an extended ACL named SPLIT_TUNNEL to permit traffic to 10.0.0.0/8',
                hints: ['ip access-list extended SPLIT_TUNNEL', 'permit ip 10.0.0.0 0.255.255.255 any'],
                checks: [{ type: 'acl_exists', node: 'R1', aclId: 'SPLIT_TUNNEL' }] // Soft check
            }
        ]
    },
    {
        id: 'comptia-sec-09',
        certification: 'Security+',
        category: 'Network Security',
        difficulty: 'Hard',
        timeEstimate: '15 mins',
        title: 'IPv6 RA Guard',
        description: 'Configure IPv6 Router Advertisement (RA) Guard to prevent unauthorized rogue routers from assigning IPv6 addresses.',
        topology: {
            nodes: [
                { id: 'SW1', template: 'cisco_switch_2960', x: 300, y: 200, name: 'Access-SW' }
            ],
            edges: [],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Enable IPv6 snooping globally',
                hints: ['ipv6 nd inspection policy NDS', 'ipv6 nd raguard policy RAG'],
                checks: [{ type: 'interface_state', node: 'SW1', interface: 'FastEthernet0/1', state: 'up' }] // Soft check
            },
            {
                description: 'Apply RA Guard to untrusted ports',
                hints: ['interface range FastEthernet0/1 - 24', 'ipv6 nd raguard attach-policy RAG'],
                checks: [{ type: 'interface_state', node: 'SW1', interface: 'FastEthernet0/1', state: 'up' }] // Soft check
            }
        ]
    },
    {
        id: 'comptia-sec-10',
        certification: 'Security+',
        category: 'Network Security',
        difficulty: 'Hard',
        timeEstimate: '20 mins',
        title: 'Control Plane Policing (CoPP)',
        description: 'Configure CoPP to limit the rate of ICMP traffic sent to the router\'s control plane.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 300, y: 200, name: 'Core-Router' }
            ],
            edges: [],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Create an ACL to match ICMP traffic',
                hints: ['access-list 100 permit icmp any any'],
                checks: [{ type: 'acl_exists', node: 'R1', aclId: '100' }]
            },
            {
                description: 'Create a class-map and policy-map to police ICMP',
                hints: ['class-map match-all ICMP_CLASS', 'match access-group 100', 'policy-map COPP_POLICY', 'class ICMP_CLASS', 'police 8000 conform-action transmit exceed-action drop'],
                checks: [{ type: 'interface_state', node: 'R1', interface: 'GigabitEthernet0/0/0', state: 'up' }] // Soft check
            },
            {
                description: 'Apply the policy-map to the control-plane',
                hints: ['control-plane', 'service-policy input COPP_POLICY'],
                checks: [{ type: 'interface_state', node: 'R1', interface: 'GigabitEthernet0/0/0', state: 'up' }] // Soft check
            }
        ]
    },
    {
        id: 'comptia-sec-11',
        certification: 'Security+',
        category: 'Firewall',
        difficulty: 'Hard',
        timeEstimate: '30 mins',
        title: 'Zone-Based Firewall',
        description: 'Configure a Zone-Based Firewall on a Cisco router to inspect traffic between INSIDE and OUTSIDE zones.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 300, y: 200, name: 'FW-Router' }
            ],
            edges: [],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Create security zones INSIDE and OUTSIDE',
                hints: ['zone security INSIDE', 'zone security OUTSIDE'],
                checks: [{ type: 'interface_state', node: 'R1', interface: 'GigabitEthernet0/0/0', state: 'up' }] // Soft check
            },
            {
                description: 'Assign interfaces to zones',
                hints: ['interface Gi0/0/0', 'zone-member security INSIDE'],
                checks: [{ type: 'interface_state', node: 'R1', interface: 'GigabitEthernet0/0/0', state: 'up' }] // Soft check
            },
            {
                description: 'Create a zone-pair and apply an inspect policy',
                hints: ['zone-pair security IN-TO-OUT source INSIDE destination OUTSIDE', 'service-policy type inspect MY_POLICY'],
                checks: [{ type: 'interface_state', node: 'R1', interface: 'GigabitEthernet0/0/0', state: 'up' }] // Soft check
            }
        ]
    },
    {
        id: 'comptia-sec-12',
        certification: 'Security+',
        category: 'Network Security',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'NAT Security (Hide Internal Topology)',
        description: 'Configure dynamic NAT with Overload to obfuscate the internal addressing scheme from the Internet.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 300, y: 200, name: 'Gateway' }
            ],
            edges: [],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Configure NAT inside and outside interfaces',
                hints: ['interface Gi0/0/0', 'ip nat inside', 'interface Gi0/0/1', 'ip nat outside'],
                checks: [{ type: 'nat_inside', node: 'R1', interface: 'GigabitEthernet0/0/0' }] // Soft check
            },
            {
                description: 'Create an ACL and apply NAT overload',
                hints: ['access-list 1 permit 10.0.0.0 0.255.255.255', 'ip nat inside source list 1 interface Gi0/0/1 overload'],
                checks: [{ type: 'nat_outside', node: 'R1', interface: 'GigabitEthernet0/0/1' }] // Soft check
            }
        ]
    }
];
