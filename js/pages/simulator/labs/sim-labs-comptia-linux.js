// sim-labs-comptia-linux.js
// CompTIA Linux+ Labs

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
    }
];
