// sim-labs-comptia-linux.js

export const COMPTIA_LINUX_LABS = [
    {
        id: 'comptia-linux-01',
        certification: 'Linux+',
        category: 'Networking',
        difficulty: 'Easy',
        timeEstimate: '10 mins',
        title: 'Linux Server IP Configuration',
        description: 'Configure a static IP address on an Ubuntu Server to bring it onto the network.',
        topology: {
            nodes: [
                { id: 'SW1', template: 'cisco_switch_2960', x: 200, y: 200, name: 'CoreSwitch' },
                { id: 'SRV1', template: 'linux_server', x: 400, y: 200, name: 'Ubuntu-Web' },
                { id: 'PC1', template: 'linux_pc', x: 200, y: 400, name: 'Admin-PC' }
            ],
            edges: [
                { source: 'SW1', sourcePort: 'FastEthernet0/1', target: 'SRV1', targetPort: 'eth0', cableType: 'copper_straight' },
                { source: 'SW1', sourcePort: 'FastEthernet0/2', target: 'PC1', targetPort: 'eth0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'PC1': { interfaces: { 'eth0': { ip: '192.168.10.50', subnet: '24', state: 'up' } } }
            }
        },
        tasks: [
            {
                description: 'Configure the Ubuntu-Web server eth0 interface with IP 192.168.10.100/24',
                hints: ['Double click Ubuntu-Web to open the Desktop/CLI.', 'In the simulator, you can use the desktop Network app or standard CLI depending on support.'],
                checks: [
                    { type: 'interface_ip', node: 'SRV1', interface: 'eth0', ip: '192.168.10.100', subnet: '24' }
                ]
            },
            {
                description: 'Verify connectivity by pinging the Ubuntu-Web server from the Admin-PC',
                hints: ['Open the Admin-PC terminal and ping 192.168.10.100.'],
                checks: [{ type: 'can_reach', source: 'PC1', destination: 'SRV1' }]
            }
        ]
    },
    {
        id: 'comptia-linux-02',
        certification: 'Linux+',
        category: 'Services',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'Web Server Verification',
        description: 'Verify that the web server is reachable via HTTP across a routed network.',
        topology: {
            nodes: [
                { id: 'R1', template: 'cisco_router_4321', x: 300, y: 200, name: 'Router' },
                { id: 'SRV1', template: 'linux_server', x: 100, y: 200, name: 'Apache-Server' },
                { id: 'PC1', template: 'linux_pc', x: 500, y: 200, name: 'Client-PC' }
            ],
            edges: [
                { source: 'SRV1', sourcePort: 'eth0', target: 'R1', targetPort: 'GigabitEthernet0/0/0', cableType: 'copper_straight' },
                { source: 'R1', sourcePort: 'GigabitEthernet0/0/1', target: 'PC1', targetPort: 'eth0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'R1': {
                    interfaces: {
                        'GigabitEthernet0/0/0': { ip: '172.16.10.1', subnet: '24', state: 'up' },
                        'GigabitEthernet0/0/1': { ip: '192.168.5.1', subnet: '24', state: 'up' }
                    }
                },
                'SRV1': { interfaces: { 'eth0': { ip: '172.16.10.80', subnet: '24', state: 'up' } }, gateway: '172.16.10.1' },
                'PC1': { interfaces: { 'eth0': { ip: '192.168.5.50', subnet: '24', state: 'up' } }, gateway: '192.168.5.1' }
            }
        },
        tasks: [
            {
                description: 'Ensure Client-PC can ping the Apache-Server',
                hints: ['Ping 172.16.10.80 from the Client-PC terminal.'],
                checks: [{ type: 'can_reach', source: 'PC1', destination: 'SRV1' }]
            },
            {
                description: 'Verify HTTP access (simulated check)',
                hints: ['Use the Desktop Web Browser app on Client-PC to navigate to http://172.16.10.80'],
                checks: [{ type: 'can_reach', source: 'PC1', destination: 'SRV1' }] // Using can_reach as proxy for HTTP check
            }
        ]
    },
    {
        id: 'comptia-linux-03',
        certification: 'Linux+',
        category: 'Security',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'iptables Firewall Configuration',
        description: 'Configure basic iptables rules to allow SSH and drop everything else on an external interface.',
        topology: {
            nodes: [
                { id: 'SRV1', template: 'linux_server', x: 300, y: 200, name: 'Web-Firewall' },
                { id: 'PC1', template: 'linux_pc', x: 100, y: 200, name: 'External-PC' }
            ],
            edges: [
                { source: 'SRV1', sourcePort: 'eth0', target: 'PC1', targetPort: 'eth0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'SRV1': { interfaces: { 'eth0': { ip: '203.0.113.10', subnet: '24', state: 'up' } } },
                'PC1': { interfaces: { 'eth0': { ip: '203.0.113.50', subnet: '24', state: 'up' } } }
            }
        },
        tasks: [
            {
                description: 'Allow incoming SSH (port 22) traffic on eth0',
                hints: ['iptables -A INPUT -i eth0 -p tcp --dport 22 -j ACCEPT'],
                checks: [{ type: 'command_run', node: 'SRV1', command: 'iptables -A INPUT -i eth0 -p tcp --dport 22 -j ACCEPT' }]
            },
            {
                description: 'Set default INPUT policy to DROP',
                hints: ['iptables -P INPUT DROP'],
                checks: [{ type: 'command_run', node: 'SRV1', command: 'iptables -P INPUT DROP' }]
            }
        ]
    },
    {
        id: 'comptia-linux-04',
        certification: 'Linux+',
        category: 'Automation',
        difficulty: 'Easy',
        timeEstimate: '10 mins',
        title: 'Cron Job Configuration',
        description: 'Schedule a script to run automatically at specific intervals using cron.',
        topology: {
            nodes: [
                { id: 'SRV1', template: 'linux_server', x: 300, y: 200, name: 'Linux-Srv' }
            ],
            edges: [],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Open the crontab for editing',
                hints: ['crontab -e'],
                checks: [{ type: 'command_run', node: 'SRV1', command: 'crontab -e' }]
            },
            {
                description: 'Add a job to run /usr/local/bin/backup.sh every day at 2:00 AM',
                hints: ['Add "0 2 * * * /usr/local/bin/backup.sh" to the crontab.'],
                checks: [{ type: 'command_run', node: 'SRV1', command: '0 2 * * *' }] // Soft check simulation
            }
        ]
    },
    {
        id: 'comptia-linux-05',
        certification: 'Linux+',
        category: 'Security',
        difficulty: 'Medium',
        timeEstimate: '15 mins',
        title: 'SSH Key-Based Authentication',
        description: 'Generate an SSH key pair and configure it for passwordless login.',
        topology: {
            nodes: [
                { id: 'PC1', template: 'linux_pc', x: 200, y: 200, name: 'Admin-PC' },
                { id: 'SRV1', template: 'linux_server', x: 500, y: 200, name: 'Remote-Srv' }
            ],
            edges: [
                { source: 'PC1', sourcePort: 'eth0', target: 'SRV1', targetPort: 'eth0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'PC1': { interfaces: { 'eth0': { ip: '192.168.1.10', subnet: '24', state: 'up' } } },
                'SRV1': { interfaces: { 'eth0': { ip: '192.168.1.20', subnet: '24', state: 'up' } } }
            }
        },
        tasks: [
            {
                description: 'Generate an RSA SSH key pair on Admin-PC',
                hints: ['ssh-keygen -t rsa'],
                checks: [{ type: 'command_run', node: 'PC1', command: 'ssh-keygen' }]
            },
            {
                description: 'Copy the public key to Remote-Srv',
                hints: ['ssh-copy-id user@192.168.1.20'],
                checks: [{ type: 'command_run', node: 'PC1', command: 'ssh-copy-id' }]
            }
        ]
    },
    {
        id: 'comptia-linux-06',
        certification: 'Linux+',
        category: 'Administration',
        difficulty: 'Easy',
        timeEstimate: '10 mins',
        title: 'File Permissions & Ownership',
        description: 'Modify file permissions and ownership using chmod and chown.',
        topology: {
            nodes: [
                { id: 'SRV1', template: 'linux_server', x: 300, y: 200, name: 'File-Server' }
            ],
            edges: [],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Create a file named "secret.txt"',
                hints: ['touch secret.txt'],
                checks: [{ type: 'command_run', node: 'SRV1', command: 'touch secret.txt' }]
            },
            {
                description: 'Change ownership to user "admin" and group "finance"',
                hints: ['chown admin:finance secret.txt'],
                checks: [{ type: 'command_run', node: 'SRV1', command: 'chown admin:finance secret.txt' }]
            },
            {
                description: 'Set permissions so only the owner can read/write (600)',
                hints: ['chmod 600 secret.txt'],
                checks: [{ type: 'command_run', node: 'SRV1', command: 'chmod 600 secret.txt' }]
            }
        ]
    },
    {
        id: 'comptia-linux-07',
        certification: 'Linux+',
        category: 'Storage',
        difficulty: 'Hard',
        timeEstimate: '20 mins',
        title: 'LVM Volume Expansion',
        description: 'Extend a Logical Volume using the LVM toolset.',
        topology: {
            nodes: [
                { id: 'SRV1', template: 'linux_server', x: 300, y: 200, name: 'Database-Srv' }
            ],
            edges: [],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Extend the Logical Volume /dev/vg01/lv_data by 5GB',
                hints: ['lvextend -L +5G /dev/vg01/lv_data'],
                checks: [{ type: 'command_run', node: 'SRV1', command: 'lvextend' }]
            },
            {
                description: 'Resize the ext4 filesystem to use the new space',
                hints: ['resize2fs /dev/vg01/lv_data'],
                checks: [{ type: 'command_run', node: 'SRV1', command: 'resize2fs' }]
            }
        ]
    },
    {
        id: 'comptia-linux-08',
        certification: 'Linux+',
        category: 'Services',
        difficulty: 'Medium',
        timeEstimate: '20 mins',
        title: 'DNS BIND Configuration',
        description: 'Configure a basic BIND DNS zone file for a domain.',
        topology: {
            nodes: [
                { id: 'SRV1', template: 'linux_server', x: 300, y: 200, name: 'DNS-Srv' }
            ],
            edges: [],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Edit the named.conf file to add zone "example.com"',
                hints: ['vi /etc/named.conf'],
                checks: [{ type: 'command_run', node: 'SRV1', command: 'vi /etc/named.conf' }] // Soft check
            },
            {
                description: 'Restart the BIND service',
                hints: ['systemctl restart named'],
                checks: [{ type: 'command_run', node: 'SRV1', command: 'systemctl restart named' }]
            }
        ]
    },
    {
        id: 'comptia-linux-09',
        certification: 'Linux+',
        category: 'Administration',
        difficulty: 'Easy',
        timeEstimate: '10 mins',
        title: 'Systemd Service Management',
        description: 'Enable, start, and check the status of a service using systemctl.',
        topology: {
            nodes: [
                { id: 'SRV1', template: 'linux_server', x: 300, y: 200, name: 'App-Srv' }
            ],
            edges: [],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Enable the httpd service to start on boot',
                hints: ['systemctl enable httpd'],
                checks: [{ type: 'command_run', node: 'SRV1', command: 'systemctl enable httpd' }]
            },
            {
                description: 'Start the httpd service immediately',
                hints: ['systemctl start httpd'],
                checks: [{ type: 'command_run', node: 'SRV1', command: 'systemctl start httpd' }]
            },
            {
                description: 'Verify the status of the httpd service',
                hints: ['systemctl status httpd'],
                checks: [{ type: 'command_run', node: 'SRV1', command: 'systemctl status httpd' }]
            }
        ]
    },
    {
        id: 'comptia-linux-10',
        certification: 'Linux+',
        category: 'Administration',
        difficulty: 'Easy',
        timeEstimate: '10 mins',
        title: 'User and Group Management',
        description: 'Create a new user, add them to a group, and set their password.',
        topology: {
            nodes: [
                { id: 'SRV1', template: 'linux_server', x: 300, y: 200, name: 'Auth-Srv' }
            ],
            edges: [],
            preConfig: {}
        },
        tasks: [
            {
                description: 'Create a new user named "jdoe"',
                hints: ['useradd jdoe'],
                checks: [{ type: 'command_run', node: 'SRV1', command: 'useradd jdoe' }]
            },
            {
                description: 'Add "jdoe" to the "wheel" (sudo) group',
                hints: ['usermod -aG wheel jdoe'],
                checks: [{ type: 'command_run', node: 'SRV1', command: 'usermod -aG wheel jdoe' }]
            },
            {
                description: 'Set a password for "jdoe"',
                hints: ['passwd jdoe'],
                checks: [{ type: 'command_run', node: 'SRV1', command: 'passwd jdoe' }]
            }
        ]
    },
    {
        id: 'comptia-linux-11',
        certification: 'Linux+',
        category: 'Troubleshooting',
        difficulty: 'Easy',
        timeEstimate: '15 mins',
        title: 'Scenario: Web Service Is Down',
        description: 'Diagnose a Linux web server that responds to ping but refuses HTTP because the web service is stopped.',
        topology: {
            nodes: [
                { id: 'PC1', template: 'linux_pc', x: 160, y: 280, name: 'Admin-PC' },
                { id: 'SRV1', template: 'linux_server', x: 480, y: 280, name: 'Ubuntu-Web' }
            ],
            edges: [
                { source: 'PC1', sourcePort: 'eth0', target: 'SRV1', targetPort: 'eth0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'PC1': {
                    interfaces: { 'eth0': { ip: '192.168.60.10', subnet: '24', state: 'up' } },
                    dnsServer: '192.168.60.80'
                },
                'SRV1': {
                    interfaces: { 'eth0': { ip: '192.168.60.80', subnet: '24', state: 'up' } },
                    installedPackages: ['bash', 'coreutils', 'net-tools', 'iproute2', 'iputils-ping', 'dnsutils', 'nginx'],
                    services: { nginx: 'inactive' },
                    nodeServices: { http: false },
                    httpEnabled: false,
                    syslogMessages: [
                        '11:42 systemd[1]: nginx.service: Deactivated successfully.',
                        '11:43 monitor[2201]: HTTP check failed for 192.168.60.80:80',
                        '11:44 kernel: eth0 link is up'
                    ],
                    filesystem: {
                        '/': { children: {
                            'var': { children: {
                                'www': { type: 'dir', children: {
                                    'html': { type: 'dir', children: {
                                        'index.html': { type: 'file', content: '<!doctype html><html><body style="font-family:sans-serif;padding:32px"><h1>Ubuntu Web Service</h1><p>nginx is running.</p></body></html>' }
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
                description: 'Confirm the server is reachable at Layer 3',
                hints: ['From Admin-PC, run "ping 192.168.60.80".', 'If ping works, focus on the application service.'],
                checks: [
                    { type: 'command_ran', node: 'PC1', command: 'ping 192.168.60.80', exact: false },
                    { type: 'can_reach', source: 'PC1', destination: 'SRV1' }
                ]
            },
            {
                description: 'Check nginx service status on Ubuntu-Web',
                hints: ['Open Terminal on Ubuntu-Web and run "systemctl status nginx".', 'For more evidence, run "journalctl -u nginx" or open Log Viewer.'],
                checks: [{ type: 'command_ran', node: 'SRV1', command: 'systemctl status nginx', exact: false }]
            },
            {
                description: 'Start the nginx service',
                hints: ['Run "systemctl start nginx".', 'You can also run "systemctl status nginx" again to confirm it is active.'],
                checks: [{ type: 'service_state', node: 'SRV1', service: 'nginx', expected: 'active' }]
            },
            {
                description: 'Verify HTTP access to Ubuntu-Web',
                hints: ['From Admin-PC, open Browser and visit 192.168.60.80.'],
                checks: [{ type: 'http_success', source: 'PC1', destination: 'SRV1', targetIp: '192.168.60.80' }]
            }
        ]
    },
    {
        id: 'comptia-linux-12',
        certification: 'Linux+',
        category: 'Services',
        difficulty: 'Medium',
        timeEstimate: '20 mins',
        title: 'Scenario: Install and Enable a Missing Web Service',
        description: 'A newly provisioned Linux server has network connectivity but no web service installed. Install nginx, start it, and verify clients can reach the service.',
        topology: {
            nodes: [
                { id: 'SW1', template: 'cisco_switch_2960', x: 320, y: 220, name: 'Access-Switch' },
                { id: 'PC1', template: 'linux_pc', x: 140, y: 340, name: 'Admin-PC' },
                { id: 'SRV1', template: 'linux_server', x: 520, y: 340, name: 'New-Web' }
            ],
            edges: [
                { source: 'PC1', sourcePort: 'eth0', target: 'SW1', targetPort: 'FastEthernet0/1', cableType: 'copper_straight' },
                { source: 'SRV1', sourcePort: 'eth0', target: 'SW1', targetPort: 'FastEthernet0/2', cableType: 'copper_straight' }
            ],
            preConfig: {
                'PC1': {
                    interfaces: { 'eth0': { ip: '192.168.90.25', subnet: '24', state: 'up' } }
                },
                'SRV1': {
                    interfaces: { 'eth0': { ip: '192.168.90.80', subnet: '24', state: 'up' } },
                    installedPackages: ['bash', 'coreutils', 'findutils', 'grep', 'iproute2', 'iputils-ping', 'curl', 'wget', 'openssh-server'],
                    services: { ssh: 'active', networking: 'active' },
                    nodeServices: { http: false },
                    httpEnabled: false,
                    filesystem: {
                        '/': { children: {
                            'var': { children: {
                                'www': { type: 'dir', children: {
                                    'html': { type: 'dir', children: {
                                        'index.html': { type: 'file', content: '<!doctype html><html><body style="font-family:sans-serif;padding:32px"><h1>New-Web</h1><p>nginx was installed and started.</p></body></html>' }
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
                description: 'Confirm New-Web is reachable over the network',
                hints: ['From Admin-PC, run "ping 192.168.90.80".'],
                checks: [
                    { type: 'command_ran', node: 'PC1', command: 'ping 192.168.90.80', exact: false },
                    { type: 'can_reach', source: 'PC1', destination: 'SRV1' }
                ]
            },
            {
                description: 'Install nginx on New-Web',
                hints: ['Use Software Center or run "apt install nginx".'],
                checks: [{ type: 'package_installed', node: 'SRV1', package: 'nginx' }]
            },
            {
                description: 'Start the nginx service',
                hints: ['Run "systemctl start nginx".'],
                checks: [{ type: 'service_state', node: 'SRV1', service: 'nginx', expected: 'active' }]
            },
            {
                description: 'Verify HTTP access from Admin-PC',
                hints: ['Open Browser on Admin-PC and visit 192.168.90.80.'],
                checks: [{ type: 'http_success', source: 'PC1', destination: 'SRV1', targetIp: '192.168.90.80' }]
            }
        ]
    },
    {
        id: 'comptia-linux-13',
        certification: 'Linux+',
        category: 'Security',
        difficulty: 'Medium',
        timeEstimate: '20 mins',
        title: 'Scenario: Install Fail2Ban for SSH Protection',
        description: 'A Linux jump host is receiving repeated SSH login failures. Install Fail2Ban, confirm the service is active, and review jail status.',
        topology: {
            nodes: [
                { id: 'SRV1', template: 'linux_server', x: 420, y: 260, name: 'Jump-Host' },
                { id: 'PC1', template: 'linux_pc', x: 160, y: 260, name: 'Admin-PC' }
            ],
            edges: [
                { source: 'PC1', sourcePort: 'eth0', target: 'SRV1', targetPort: 'eth0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'PC1': { interfaces: { 'eth0': { ip: '10.95.0.25', subnet: '24', state: 'up' } } },
                'SRV1': {
                    interfaces: { 'eth0': { ip: '10.95.0.10', subnet: '24', state: 'up' } },
                    installedPackages: ['bash', 'coreutils', 'findutils', 'grep', 'iproute2', 'iputils-ping', 'openssh-server', 'curl', 'wget'],
                    services: { ssh: 'active', sshd: 'active' },
                    syslogMessages: [
                        '15:08 sshd[3301]: Failed password for invalid user test from 10.95.0.88 port 41440 ssh2',
                        '15:09 sshd[3312]: Failed password for root from 10.95.0.88 port 41442 ssh2',
                        '15:10 sshd[3320]: Failed password for admin from 10.95.0.88 port 41444 ssh2'
                    ]
                }
            }
        },
        tasks: [
            {
                description: 'Review SSH authentication failures on Jump-Host',
                hints: ['Run "journalctl -u ssh" on Jump-Host.', 'The logs show repeated failed passwords from one source.'],
                checks: [{ type: 'command_ran', node: 'SRV1', command: 'journalctl -u ssh', exact: false }]
            },
            {
                description: 'Install Fail2Ban on Jump-Host',
                hints: ['Use Software Center or run "apt install fail2ban".'],
                checks: [{ type: 'package_installed', node: 'SRV1', package: 'fail2ban' }]
            },
            {
                description: 'Verify the Fail2Ban service is active',
                hints: ['Run "systemctl status fail2ban".'],
                checks: [{ type: 'service_state', node: 'SRV1', service: 'fail2ban', expected: 'active' }]
            },
            {
                description: 'Review Fail2Ban jail status',
                hints: ['Run "fail2ban-client status".'],
                checks: [{ type: 'command_ran', node: 'SRV1', command: 'fail2ban-client status', exact: false }]
            }
        ]
    },
    {
        id: 'comptia-linux-14',
        certification: 'Linux+',
        category: 'Containers',
        difficulty: 'Medium',
        timeEstimate: '20 mins',
        title: 'Scenario: Install Docker and Validate a Test Container',
        description: 'A Linux server is ready for containerized workloads but the container runtime is missing. Install Docker, run a test container, and verify it appears in the container list.',
        topology: {
            nodes: [
                { id: 'SRV1', template: 'linux_server', x: 420, y: 260, name: 'Container-Host' },
                { id: 'PC1', template: 'linux_pc', x: 160, y: 260, name: 'Admin-PC' }
            ],
            edges: [
                { source: 'PC1', sourcePort: 'eth0', target: 'SRV1', targetPort: 'eth0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'PC1': { interfaces: { 'eth0': { ip: '192.168.95.25', subnet: '24', state: 'up' } } },
                'SRV1': {
                    interfaces: { 'eth0': { ip: '192.168.95.50', subnet: '24', state: 'up' } },
                    installedPackages: ['bash', 'coreutils', 'findutils', 'grep', 'iproute2', 'iputils-ping', 'curl', 'wget'],
                    services: { networking: 'active' }
                }
            }
        },
        tasks: [
            {
                description: 'Confirm Container-Host is reachable from Admin-PC',
                hints: ['From Admin-PC, run "ping 192.168.95.50".'],
                checks: [
                    { type: 'command_ran', node: 'PC1', command: 'ping 192.168.95.50', exact: false },
                    { type: 'can_reach', source: 'PC1', destination: 'SRV1' }
                ]
            },
            {
                description: 'Install Docker on Container-Host',
                hints: ['Use Software Center or run "apt install docker.io".'],
                checks: [{ type: 'package_installed', node: 'SRV1', package: 'docker.io' }]
            },
            {
                description: 'Run a test nginx container',
                hints: ['Run "docker run nginx".'],
                checks: [{ type: 'command_ran', node: 'SRV1', command: 'docker run nginx', exact: false }]
            },
            {
                description: 'List containers and verify the nginx container is present',
                hints: ['Run "docker ps".'],
                checks: [{ type: 'command_ran', node: 'SRV1', command: 'docker ps', exact: false }]
            }
        ]
    },
    {
        id: 'comptia-linux-15',
        certification: 'Linux+',
        category: 'Change Control',
        difficulty: 'Easy',
        timeEstimate: '15 mins',
        title: 'Scenario: Install Git for Configuration Change Tracking',
        description: 'A Linux administrator needs to clone the approved configuration repository before editing service files on a server.',
        topology: {
            nodes: [
                { id: 'SRV1', template: 'linux_server', x: 420, y: 260, name: 'Config-Worker' },
                { id: 'REPO', template: 'linux_server', x: 160, y: 260, name: 'Repo-Server' }
            ],
            edges: [
                { source: 'SRV1', sourcePort: 'eth0', target: 'REPO', targetPort: 'eth0', cableType: 'copper_straight' }
            ],
            preConfig: {
                'SRV1': {
                    interfaces: { 'eth0': { ip: '10.96.0.30', subnet: '24', state: 'up' } },
                    installedPackages: ['bash', 'coreutils', 'findutils', 'grep', 'iproute2', 'iputils-ping', 'openssh-client']
                },
                'REPO': {
                    interfaces: { 'eth0': { ip: '10.96.0.10', subnet: '24', state: 'up' } },
                    installedPackages: ['bash', 'coreutils', 'git', 'openssh-server'],
                    services: { ssh: 'active', sshd: 'active' }
                }
            }
        },
        tasks: [
            {
                description: 'Verify Config-Worker can reach Repo-Server',
                hints: ['Run "ping 10.96.0.10" from Config-Worker.'],
                checks: [
                    { type: 'command_ran', node: 'SRV1', command: 'ping 10.96.0.10', exact: false },
                    { type: 'can_reach', source: 'SRV1', destination: 'REPO' }
                ]
            },
            {
                description: 'Install Git on Config-Worker',
                hints: ['Use Software Center or run "apt install git".'],
                checks: [{ type: 'package_installed', node: 'SRV1', package: 'git' }]
            },
            {
                description: 'Clone the approved configuration repository',
                hints: ['Run "git clone ssh://10.96.0.10/etc-configs".'],
                checks: [{ type: 'command_ran', node: 'SRV1', command: 'git clone', exact: false }]
            },
            {
                description: 'Check repository status before making changes',
                hints: ['Run "git status".'],
                checks: [{ type: 'command_ran', node: 'SRV1', command: 'git status', exact: false }]
            }
        ]
    }
];
