export const AVAILABLE_CERTS = [
    {
        id: 'ccna',
        name: 'Cisco CCNA (200-301)',
        description: 'Network fundamentals, IP connectivity, security fundamentals, and automation.',
        domains: [
            { id: '1.0', name: '1.0 Network Fundamentals' },
            { id: '2.0', name: '2.0 Network Access' },
            { id: '3.0', name: '3.0 IP Connectivity' },
            { id: '4.0', name: '4.0 IP Services' },
            { id: '5.0', name: '5.0 Security Fundamentals' },
            { id: '6.0', name: '6.0 Automation and Programmability' }
        ]
    },
    {
        id: 'netplus',
        name: 'CompTIA Network+ (N10-008)',
        description: 'Networking concepts, infrastructure, network operations, security, and troubleshooting.',
        domains: [
            { id: '1.0', name: '1.0 Networking Fundamentals' },
            { id: '2.0', name: '2.0 Network Implementations' },
            { id: '3.0', name: '3.0 Network Operations' },
            { id: '4.0', name: '4.0 Network Security' },
            { id: '5.0', name: '5.0 Network Troubleshooting' }
        ]
    },
    {
        id: 'secplus',
        name: 'CompTIA Security+ (SY0-701)',
        description: 'General security concepts, threats, vulnerabilities, and mitigation techniques.',
        domains: [
            { id: '1.0', name: '1.0 General Security Concepts' },
            { id: '2.0', name: '2.0 Threats, Vulnerabilities, and Mitigations' },
            { id: '3.0', name: '3.0 Security Architecture' },
            { id: '4.0', name: '4.0 Security Operations' },
            { id: '5.0', name: '5.0 Security Program Management and Oversight' }
        ]
    },
    {
        id: 'encor',
        name: 'Cisco CCNP ENCOR (350-401)',
        description: 'Core enterprise network technologies including dual stack architecture, virtualization, infrastructure, and automation.',
        domains: [
            { id: '1.0', name: '1.0 Architecture' },
            { id: '2.0', name: '2.0 Virtualization' },
            { id: '3.0', name: '3.0 Infrastructure' },
            { id: '4.0', name: '4.0 Network Assurance' },
            { id: '5.0', name: '5.0 Security and Automation' }
        ]
    },
    {
        id: 'jncia',
        name: 'Juniper JNCIA-Junos (JN0-104)',
        description: 'Networking fundamentals, Junos OS fundamentals, user interfaces, configuration, and routing.',
        domains: [
            { id: '1.0', name: '1.0 Networking Fundamentals' },
            { id: '2.0', name: '2.0 Junos OS Fundamentals' },
            { id: '3.0', name: '3.0 User Interfaces' },
            { id: '4.0', name: '4.0 Configuration Basics' },
            { id: '5.0', name: '5.0 Operational Monitoring and Maintenance' }
        ]
    }
];

export async function loadCertData(certId) {
    if (certId === 'ccna') {
        const module = await import('./cert-ccna.js');
        return module.data;
    } else if (certId === 'netplus') {
        const module = await import('./cert-netplus.js');
        return module.data;
    } else if (certId === 'secplus') {
        const module = await import('./cert-secplus.js');
        return module.data;
    } else if (certId === 'encor') {
        const module = await import('./cert-encor.js');
        return module.data;
    } else if (certId === 'jncia') {
        const module = await import('./cert-jncia.js');
        return module.data;
    }
    throw new Error('Certification data not found');
}
