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
    },
    {
        id: 'comptia-sec-13',
        certification: 'Security+',
        category: 'Host Firewall',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'UFW Host Firewall Rule Configuration',
        description: 'Configure a Linux host firewall to block insecure Telnet while allowing SSH administration.',
        topology: {
            nodes: [
                { id: 'SRV1', template: 'linux_server', x: 350, y: 200, name: 'Secure-App' },
                { id: 'ADMIN', template: 'linux_pc', x: 120, y: 280, name: 'Admin-PC' },
                { id: 'ATTACKER', template: 'linux_pc', x: 580, y: 280, name: 'Untrusted-PC' }
            ],
            edges: [
                { source: 'SRV1', sourcePort: 'eth0', target: 'ADMIN', targetPort: 'eth0', cableType: 'copper_straight' },
                { source: 'SRV1', sourcePort: 'eth1', target: 'ATTACKER', targetPort: 'eth0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'SRV1': {
                    interfaces: {
                        'eth0': { ip: '10.10.10.20', subnet: '24', state: 'up' },
                        'eth1': { ip: '198.51.100.20', subnet: '24', state: 'up' }
                    },
                    installedPackages: ['bash', 'coreutils', 'net-tools', 'iproute2', 'iputils-ping', 'ufw']
                },
                'ADMIN': { interfaces: { 'eth0': { ip: '10.10.10.10', subnet: '24', state: 'up' } } },
                'ATTACKER': { interfaces: { 'eth0': { ip: '198.51.100.50', subnet: '24', state: 'up' } } }
            }
        },
        tasks: [
            {
                description: 'Enable UFW on Secure-App',
                hints: ['Open Terminal on Secure-App and run "ufw enable".'],
                checks: [{ type: 'command_ran', node: 'SRV1', command: 'ufw enable' }]
            },
            {
                description: 'Allow SSH administration on port 22/tcp',
                hints: ['Use "ufw allow 22/tcp".'],
                checks: [{ type: 'firewall_rule', node: 'SRV1', action: 'allow', port: '22', protocol: 'tcp' }]
            },
            {
                description: 'Deny Telnet on port 23/tcp',
                hints: ['Use "ufw deny 23/tcp".'],
                checks: [{ type: 'firewall_rule', node: 'SRV1', action: 'deny', port: '23', protocol: 'tcp' }]
            }
        ]
    },
    {
        id: 'comptia-sec-14',
        certification: 'Security+',
        category: 'Host Firewall',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'Scenario: Host Firewall Blocks Web Access',
        description: 'Troubleshoot a Linux server where ping succeeds and the web service is running, but UFW blocks inbound HTTP.',
        topology: {
            nodes: [
                { id: 'CLIENT', template: 'linux_pc', x: 140, y: 280, name: 'Analyst-PC' },
                { id: 'SRV1', template: 'linux_server', x: 500, y: 280, name: 'DMZ-Web' }
            ],
            edges: [
                { source: 'CLIENT', sourcePort: 'eth0', target: 'SRV1', targetPort: 'eth0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'CLIENT': {
                    interfaces: { 'eth0': { ip: '172.20.5.25', subnet: '24', state: 'up' } }
                },
                'SRV1': {
                    interfaces: { 'eth0': { ip: '172.20.5.80', subnet: '24', state: 'up' } },
                    installedPackages: ['bash', 'coreutils', 'net-tools', 'iproute2', 'iputils-ping', 'dnsutils', 'ufw', 'nginx'],
                    services: { nginx: 'active' },
                    nodeServices: { http: true },
                    httpEnabled: true,
                    firewallEnabled: true,
                    firewallRules: [{ action: 'deny', port: '80', protocol: 'tcp', from: 'Anywhere' }],
                    syslogMessages: [
                        '13:20 nginx[908]: service started successfully',
                        '13:21 ufw[912]: BLOCK IN=eth0 TCP DPT=80 SRC=172.20.5.25',
                        '13:22 monitor[1440]: TCP/80 health check failed from Analyst-PC'
                    ],
                    filesystem: {
                        '/': { children: {
                            'var': { children: {
                                'www': { type: 'dir', children: {
                                    'html': { type: 'dir', children: {
                                        'index.html': { type: 'file', content: '<!doctype html><html><body style="font-family:sans-serif;padding:32px"><h1>DMZ Web</h1><p>Firewall policy now permits HTTP.</p></body></html>' }
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
                description: 'Confirm DMZ-Web is reachable by ICMP from Analyst-PC',
                hints: ['Run "ping 172.20.5.80" from Analyst-PC.', 'Ping working means this is not a cable or IP addressing issue.'],
                checks: [
                    { type: 'command_ran', node: 'CLIENT', command: 'ping 172.20.5.80', exact: false },
                    { type: 'can_reach', source: 'CLIENT', destination: 'SRV1' }
                ]
            },
            {
                description: 'Verify nginx is active on DMZ-Web',
                hints: ['Run "systemctl status nginx" on DMZ-Web.'],
                checks: [
                    { type: 'command_ran', node: 'SRV1', command: 'systemctl status nginx', exact: false },
                    { type: 'service_state', node: 'SRV1', service: 'nginx', expected: 'active' }
                ]
            },
            {
                description: 'Inspect UFW rules and allow HTTP on tcp/80',
                hints: ['Run "ufw status" to see the deny rule.', 'Log Viewer or "journalctl" shows the blocked tcp/80 attempts.', 'Run "ufw allow 80/tcp" to permit web access, or remove the deny with "ufw delete deny 80/tcp".'],
                checks: [
                    { type: 'command_ran', node: 'SRV1', command: 'ufw status', exact: false },
                    { type: 'firewall_allows', node: 'SRV1', port: '80', protocol: 'tcp' }
                ]
            },
            {
                description: 'Verify HTTP access to DMZ-Web',
                hints: ['Open Browser on Analyst-PC and visit 172.20.5.80.'],
                checks: [{ type: 'http_success', source: 'CLIENT', destination: 'SRV1', targetIp: '172.20.5.80' }]
            }
        ]
    },
    {
        id: 'comptia-sec-15',
        certification: 'Security+',
        category: 'Packet Analysis',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'Wireshark Firewall Timeout Analysis',
        description: 'Analyze a packet capture and identify evidence that HTTP traffic is being silently dropped by a firewall rather than refused by a stopped service.',
        topology: {
            nodes: [
                { id: 'ANALYST', template: 'linux_pc', x: 180, y: 220, name: 'Analyst-PC' },
                { id: 'SW1', template: 'cisco_switch_2960', x: 360, y: 220, name: 'Capture-SW' },
                { id: 'CLIENT', template: 'linux_pc', x: 520, y: 300, name: 'Client' },
                { id: 'WEB', template: 'linux_server', x: 520, y: 120, name: 'DMZ-Web' }
            ],
            edges: [
                { source: 'ANALYST', sourcePort: 'eth0', target: 'SW1', targetPort: 'FastEthernet0/1', cableType: 'copper_straight' },
                { source: 'CLIENT', sourcePort: 'eth0', target: 'SW1', targetPort: 'FastEthernet0/2', cableType: 'copper_straight' },
                { source: 'WEB', sourcePort: 'eth0', target: 'SW1', targetPort: 'FastEthernet0/3', cableType: 'copper_straight' }
            ],
            packetLog: [
                { type: 'ARP', src: 'CLIENT', dst: 'WEB', observer: 'ANALYST', info: 'Who has 172.20.5.80? Tell 172.20.5.25' },
                { type: 'ICMP', src: 'CLIENT', dst: 'WEB', observer: 'ANALYST', info: 'Echo Request/Reply: 172.20.5.25 -> 172.20.5.80' },
                { type: 'TCP', src: 'CLIENT', dst: 'WEB', observer: 'ANALYST', info: 'TCP SYN retransmission -> no response: host firewall denied tcp/80', details: { srcPort: 49210, dstPort: 80, destinationIp: '172.20.5.80', flags: 'SYN retransmission', state: 'Timeout' } },
                { type: 'TCP', src: 'CLIENT', dst: 'WEB', observer: 'ANALYST', info: 'TCP SYN retransmission -> no response: host firewall denied tcp/80', details: { srcPort: 49210, dstPort: 80, destinationIp: '172.20.5.80', flags: 'SYN retransmission', state: 'Timeout' } },
                { type: 'DNS', src: 'CLIENT', dst: 'WEB', observer: 'ANALYST', info: 'Query: dmz-web.local -> 172.20.5.80' }
            ],
            preConfig: {
                'ANALYST': { interfaces: { 'eth0': { ip: '172.20.5.100', subnet: '24', state: 'up' } } },
                'CLIENT': { interfaces: { 'eth0': { ip: '172.20.5.25', subnet: '24', state: 'up' } } },
                'WEB': {
                    interfaces: { 'eth0': { ip: '172.20.5.80', subnet: '24', state: 'up' } },
                    httpEnabled: true,
                    nodeServices: { http: true },
                    firewallEnabled: true,
                    firewallRules: [{ action: 'deny', port: '80', protocol: 'tcp', from: 'Anywhere' }]
                }
            }
        },
        tasks: [
            {
                description: 'Open Packet Capture on Analyst-PC and identify the TCP traffic to port 80',
                hints: ['Look for TCP packets with destination port 80.', 'Mark a TCP packet as evidence.'],
                checks: [{ type: 'pcap_protocol_identified', node: 'ANALYST', protocol: 'TCP' }]
            },
            {
                description: 'Mark the packet showing a timeout rather than a connection refused response',
                hints: ['A firewall drop often appears as repeated SYN retransmissions with no response.', 'A stopped service is more likely to return RST.'],
                checks: [{ type: 'pcap_packet_info_contains', node: 'ANALYST', contains: ['SYN retransmission', 'no response'] }]
            }
        ]
    },
    {
        id: 'comptia-sec-16',
        certification: 'Security+',
        category: 'Packet Analysis',
        difficulty: 'Medium',
        timeEstimate: '20 mins',
        title: 'Scenario: Install tcpdump to Prove SSH Brute Force Attempts',
        description: 'A Linux server is logging repeated SSH authentication failures. Install a packet capture utility and collect network evidence that the attempts are hitting TCP/22.',
        topology: {
            nodes: [
                { id: 'SRV1', template: 'linux_server', x: 420, y: 260, name: 'Auth-Server' },
                { id: 'ADMIN', template: 'linux_pc', x: 160, y: 260, name: 'Admin-PC' }
            ],
            edges: [
                { source: 'ADMIN', sourcePort: 'eth0', target: 'SRV1', targetPort: 'eth0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'ADMIN': { interfaces: { 'eth0': { ip: '10.80.0.50', subnet: '24', state: 'up' } } },
                'SRV1': {
                    interfaces: { 'eth0': { ip: '10.80.0.22', subnet: '24', state: 'up' } },
                    installedPackages: ['bash', 'coreutils', 'findutils', 'grep', 'iproute2', 'iputils-ping', 'openssh-server', 'curl', 'wget'],
                    services: { ssh: 'active', sshd: 'active' },
                    syslogMessages: [
                        '14:08 sshd[2112]: Failed password for invalid user admin from 10.80.0.99 port 51844 ssh2',
                        '14:09 sshd[2119]: Failed password for root from 10.80.0.99 port 51846 ssh2',
                        '14:10 sshd[2124]: Connection closed by authenticating user root 10.80.0.99 port 51848'
                    ]
                }
            }
        },
        tasks: [
            {
                description: 'Review SSH-related logs on Auth-Server',
                hints: ['Open Terminal on Auth-Server.', 'Run "journalctl -u ssh" or use the Logs app.'],
                checks: [{ type: 'command_ran', node: 'SRV1', command: 'journalctl -u ssh', exact: false }]
            },
            {
                description: 'Install tcpdump on Auth-Server',
                hints: ['Use Software Center or run "apt install tcpdump".'],
                checks: [{ type: 'package_installed', node: 'SRV1', package: 'tcpdump' }]
            },
            {
                description: 'Run tcpdump to capture SSH traffic on TCP port 22',
                hints: ['A useful command is "tcpdump -i eth0 port 22".'],
                checks: [{ type: 'command_ran', node: 'SRV1', command: 'tcpdump', exact: false }]
            },
            {
                description: 'Confirm the SSH service is still active',
                hints: ['Run "systemctl status ssh" or "systemctl status sshd".'],
                checks: [{ type: 'service_state', node: 'SRV1', service: 'ssh', expected: 'active' }]
            }
        ]
    },
    {
        id: 'comptia-sec-17',
        certification: 'Security+',
        category: 'Packet Analysis',
        difficulty: 'Medium',
        timeEstimate: '20 mins',
        title: 'Scenario: Install Wireshark Tools to Analyze Suspicious DNS',
        description: 'A Windows analyst workstation needs packet analysis tools installed before the analyst can inspect a suspicious DNS capture and identify the malicious lookup.',
        topology: {
            nodes: [
                { id: 'ANALYST', template: 'windows_pc', x: 180, y: 240, name: 'SOC-Workstation' },
                { id: 'SW1', template: 'cisco_switch_2960', x: 360, y: 240, name: 'Capture-Switch' },
                { id: 'CLIENT', template: 'windows_pc', x: 540, y: 340, name: 'User-PC' },
                { id: 'DNS', template: 'linux_server', x: 540, y: 140, name: 'DNS-Server' }
            ],
            edges: [
                { source: 'ANALYST', sourcePort: 'Ethernet0', target: 'SW1', targetPort: 'FastEthernet0/1', cableType: 'copper_straight' },
                { source: 'CLIENT', sourcePort: 'Ethernet0', target: 'SW1', targetPort: 'FastEthernet0/2', cableType: 'copper_straight' },
                { source: 'DNS', sourcePort: 'eth0', target: 'SW1', targetPort: 'FastEthernet0/3', cableType: 'copper_straight' }
            ],
            packetLog: [
                { type: 'DNS', src: 'CLIENT', dst: 'DNS', observer: 'ANALYST', info: 'Query: updates.microsoft.com A', details: { transport: 'UDP', srcPort: 53044, dstPort: 53, queryName: 'updates.microsoft.com', queryType: 'A', responseCode: 'NoError', answer: '13.107.246.45' } },
                { type: 'DNS', src: 'CLIENT', dst: 'DNS', observer: 'ANALYST', info: 'Query: payroll-login.secure-update.example A', details: { transport: 'UDP', srcPort: 53045, dstPort: 53, queryName: 'payroll-login.secure-update.example', queryType: 'A', responseCode: 'NoError', answer: '198.51.100.44' } },
                { type: 'TCP', src: 'CLIENT', dst: 'DNS', observer: 'ANALYST', info: 'TCP SYN 10.90.0.25:50122 -> 198.51.100.44:443', details: { srcPort: 50122, dstPort: 443, flags: 'SYN', destinationIp: '198.51.100.44' } }
            ],
            preConfig: {
                'ANALYST': {
                    interfaces: { 'Ethernet0': { ip: '10.90.0.100', subnet: '24', state: 'up' } },
                    installedPackages: ['cmd', 'powershell', 'tcpip', 'net-tools', 'system-tools', 'curl', 'openssh-client']
                },
                'CLIENT': { interfaces: { 'Ethernet0': { ip: '10.90.0.25', subnet: '24', state: 'up' } }, dnsServer: '10.90.0.53' },
                'DNS': {
                    interfaces: { 'eth0': { ip: '10.90.0.53', subnet: '24', state: 'up' } },
                    nodeServices: { dnsServer: true }
                }
            }
        },
        tasks: [
            {
                description: 'Install Wireshark tools from the Store on SOC-Workstation',
                hints: ['Open Store on SOC-Workstation.', 'Install Wireshark from the Networking category.'],
                checks: [{ type: 'package_installed', node: 'ANALYST', package: 'wireshark' }]
            },
            {
                description: 'Use tshark from CMD to review captured traffic',
                hints: ['Open CMD on SOC-Workstation and run "tshark".'],
                checks: [{ type: 'command_ran', node: 'ANALYST', command: 'tshark', exact: false }]
            },
            {
                description: 'Mark the suspicious DNS lookup as evidence in Packet Capture',
                hints: ['Open Packet Capture on SOC-Workstation.', 'Mark the DNS packet for payroll-login.secure-update.example.'],
                checks: [
                    { type: 'pcap_protocol_identified', node: 'ANALYST', protocol: 'DNS' },
                    { type: 'pcap_packet_info_contains', node: 'ANALYST', contains: ['payroll-login.secure-update.example'] }
                ]
            }
        ]
    },
    {
        id: 'comptia-sec-18',
        certification: 'Security+',
        category: 'Host Firewall',
        difficulty: 'Medium',
        timeEstimate: '20 mins',
        title: 'Scenario: Install iptables to Block a Malicious SSH Source',
        description: 'An internet-facing Linux jump host is receiving SSH attempts from a known-bad source. Install packet filtering tools and add a host firewall rule blocking that source on TCP/22.',
        topology: {
            nodes: [
                { id: 'ADMIN', template: 'linux_pc', x: 160, y: 260, name: 'Admin-PC' },
                { id: 'SRV1', template: 'linux_server', x: 440, y: 260, name: 'Border-Jump' }
            ],
            edges: [
                { source: 'ADMIN', sourcePort: 'eth0', target: 'SRV1', targetPort: 'eth0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'ADMIN': { interfaces: { 'eth0': { ip: '10.88.0.25', subnet: '24', state: 'up' } } },
                'SRV1': {
                    interfaces: { 'eth0': { ip: '10.88.0.22', subnet: '24', state: 'up' } },
                    installedPackages: ['bash', 'coreutils', 'findutils', 'grep', 'iproute2', 'iputils-ping', 'openssh-server'],
                    services: { ssh: 'active', sshd: 'active' },
                    syslogMessages: [
                        '16:40 sshd[4110]: Failed password for root from 198.51.100.66 port 51544 ssh2',
                        '16:41 sshd[4121]: Failed password for admin from 198.51.100.66 port 51546 ssh2',
                        '16:42 sshd[4130]: Accepted publickey for admin from 10.88.0.25 port 51548 ssh2'
                    ]
                }
            }
        },
        tasks: [
            {
                description: 'Review SSH logs and identify the attacking source IP',
                hints: ['Run "journalctl -u ssh" on Border-Jump.', 'Look for repeated failed logins from the same external IP.'],
                checks: [{ type: 'command_ran', node: 'SRV1', command: 'journalctl -u ssh', exact: false }]
            },
            {
                description: 'Install iptables on Border-Jump',
                hints: ['Use Software Center or run "apt install iptables".'],
                checks: [{ type: 'package_installed', node: 'SRV1', package: 'iptables' }]
            },
            {
                description: 'Add an INPUT rule blocking 198.51.100.66 from SSH',
                hints: ['Run "iptables -A INPUT -s 198.51.100.66 -p tcp --dport 22 -j DROP".'],
                checks: [{ type: 'firewall_rule', node: 'SRV1', action: 'deny', port: '22', protocol: 'tcp', from: '198.51.100.66' }]
            },
            {
                description: 'List iptables rules to confirm the drop entry exists',
                hints: ['Run "iptables -L".'],
                checks: [{ type: 'command_ran', node: 'SRV1', command: 'iptables -L', exact: false }]
            }
        ]
    },
    {
        id: 'comptia-sec-19',
        certification: 'Security+',
        category: 'Automation',
        difficulty: 'Easy',
        timeEstimate: '15 mins',
        title: 'Scenario: Install Python for IOC Triage',
        description: 'A SOC workstation has a suspicious indicators file but no scripting runtime. Install Python and run the provided triage script.',
        topology: {
            nodes: [
                { id: 'SOC1', template: 'windows_pc', x: 260, y: 260, name: 'SOC-Analyst' },
                { id: 'DNS', template: 'linux_server', x: 520, y: 260, name: 'DNS-Server' }
            ],
            edges: [
                { source: 'SOC1', sourcePort: 'Ethernet0', target: 'DNS', targetPort: 'eth0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'SOC1': {
                    interfaces: { 'Ethernet0': { ip: '10.91.0.50', subnet: '24', state: 'up' } },
                    installedPackages: ['cmd', 'powershell', 'tcpip', 'net-tools', 'system-tools', 'curl', 'openssh-client'],
                    filesystem: {
                        '/': { type: 'dir', children: {
                            'Users': { type: 'dir', children: {
                                'Admin': { type: 'dir', children: {
                                    'Downloads': { type: 'dir', children: {
                                        'parse_iocs.py': { type: 'file', content: 'print("malicious domain: payroll-login.secure-update.example")' },
                                        'iocs.txt': { type: 'file', content: 'payroll-login.secure-update.example\n198.51.100.44' }
                                    }}
                                }}
                            }}
                        }}
                    }
                },
                'DNS': {
                    interfaces: { 'eth0': { ip: '10.91.0.53', subnet: '24', state: 'up' } },
                    nodeServices: { dnsServer: true }
                }
            }
        },
        tasks: [
            {
                description: 'Install Python from the Store on SOC-Analyst',
                hints: ['Open Store on SOC-Analyst.', 'Install Python from the Developer Tools category.'],
                checks: [{ type: 'package_installed', node: 'SOC1', package: 'python' }]
            },
            {
                description: 'Verify Python launches from CMD',
                hints: ['Run "python" or "python --version".'],
                checks: [{ type: 'command_ran', node: 'SOC1', command: 'python', exact: false }]
            },
            {
                description: 'Run the IOC triage script from Downloads',
                hints: ['Run "python Downloads\\parse_iocs.py" from C:\\Users\\Admin.'],
                checks: [{ type: 'command_ran', node: 'SOC1', command: 'python Downloads\\parse_iocs.py', exact: false }]
            }
        ]
    }
];
