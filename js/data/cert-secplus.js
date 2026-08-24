/* 
 * PROCEDURALLY GENERATED CERTIFICATION DATA
 * Generated for secplus 
 * Contains 6 unique flashcards and 15 procedural practice questions.
 */

export const data = {
    "flashcards": [
        {
            "id": "secplus_fc_1000",
            "domain": "1.0",
            "front": "What is the principle of Least Privilege?",
            "back": "Giving users only the permissions necessary to do their job."
        },
        {
            "id": "secplus_fc_1001",
            "domain": "2.0",
            "front": "What is a zero-day vulnerability?",
            "back": "A vulnerability that is unknown to the vendor and has no patch."
        },
        {
            "id": "secplus_fc_1002",
            "domain": "3.0",
            "front": "What does IPsec ESP provide?",
            "back": "Encryption and authentication for the payload."
        },
        {
            "id": "secplus_fc_1003",
            "domain": "4.0",
            "front": "What is the purpose of a SIEM?",
            "back": "Centralized log aggregation and security event correlation."
        },
        {
            "id": "secplus_fc_1004",
            "domain": "5.0",
            "front": "What is MFA?",
            "back": "Multi-Factor Authentication (requires two or more distinct types of authentication factors)."
        },
        {
            "id": "secplus_fc_1005",
            "domain": "2.0",
            "front": "What attack intercepts communication between two parties?",
            "back": "On-path / Man-in-the-Middle (MitM) attack."
        }
    ],
    "questions": [
        {
            "domain": "1.0",
            "type": "multiple-choice",
            "text": "A company needs to protect customer data at rest in a database. The same key is used to encrypt and decrypt the records. Which cryptographic method is being used?",
            "options": [
                "Asymmetric encryption",
                "Symmetric encryption",
                "Hashing",
                "Steganography"
            ],
            "answer": [
                "Symmetric encryption"
            ],
            "explanation": "Symmetric encryption uses the same secret key for encryption and decryption and is commonly used for bulk data protection.",
            "id": "secplus_q_crypto_sym_2000"
        },
        {
            "domain": "1.0",
            "type": "multiple-choice",
            "text": "A security analyst must verify that a downloaded firmware file has not changed since the vendor published it. Which cryptographic control best satisfies this requirement?",
            "options": [
                "Hash comparison",
                "Full-disk encryption",
                "Key escrow",
                "Certificate pinning"
            ],
            "answer": [
                "Hash comparison"
            ],
            "explanation": "A hash provides an integrity check. If the locally computed hash matches the vendor's published hash, the file is unlikely to have been altered.",
            "id": "secplus_q_crypto_hash_2001"
        },
        {
            "domain": "1.0",
            "type": "multiple-choice",
            "text": "A user encrypts a message with a recipient's public key. Which key is required to decrypt the message?",
            "options": [
                "The sender's public key",
                "The sender's private key",
                "The recipient's private key",
                "The recipient's public key"
            ],
            "answer": [
                "The recipient's private key"
            ],
            "explanation": "In asymmetric encryption, data encrypted with a public key can only be decrypted with the matching private key.",
            "id": "secplus_q_crypto_asym_2002"
        },
        {
            "domain": "3.0",
            "type": "multiple-choice",
            "text": "A switchport is configured with an unused native VLAN and DTP is disabled. Which attack is this configuration primarily intended to reduce?",
            "options": [
                "VLAN hopping",
                "DNS cache poisoning",
                "Credential stuffing",
                "Birthday attack"
            ],
            "answer": [
                "VLAN hopping"
            ],
            "explanation": "Disabling dynamic trunk negotiation and avoiding user traffic on the native VLAN are common controls against VLAN hopping techniques.",
            "id": "secplus_q_vlan_hopping_2003"
        },
        {
            "domain": "4.0",
            "type": "multiple-choice",
            "text": "An analyst reviews a capture and sees repeated ARP replies claiming that the attacker's MAC address owns the default gateway IP. Which control would best help prevent this on access switches?",
            "options": [
                "Dynamic ARP Inspection",
                "Port forwarding",
                "Split tunneling",
                "DNSSEC"
            ],
            "answer": [
                "Dynamic ARP Inspection"
            ],
            "explanation": "Dynamic ARP Inspection validates ARP messages against trusted bindings, reducing ARP spoofing and poisoning attacks.",
            "id": "secplus_q_l2_dai_2004"
        },
        {
            "domain": "1.0",
            "type": "multiple-choice",
            "text": "Which option is a digital signature primarily used to provide?",
            "options": [
                "Confidentiality only",
                "Integrity, authentication, and non-repudiation",
                "Network address translation",
                "Data compression"
            ],
            "answer": [
                "Integrity, authentication, and non-repudiation"
            ],
            "explanation": "Digital signatures use asymmetric cryptography to prove who signed data and whether the signed data changed.",
            "id": "secplus_q_crypto_sig_2005"
        },
        {
            "domain": "2.0",
            "type": "multiple-choice",
            "text": "Which well-known port is utilized by the IMAP protocol?",
            "options": [
                "587",
                "25",
                "110",
                "143"
            ],
            "answer": [
                "143"
            ],
            "explanation": "IMAP uses port 143. Note that the other options belong to similar protocols in the same category.",
            "id": "secplus_q_1000"
        },
        {
            "domain": "4.0",
            "type": "multiple-choice",
            "text": "Which mechanism is specifically designed to mitigate VLAN Hopping attacks?",
            "options": [
                "Root Guard",
                "IP Source Guard",
                "Disabling DTP and using dedicated native VLANs",
                "BPDU Guard"
            ],
            "answer": [
                "Disabling DTP and using dedicated native VLANs"
            ],
            "explanation": "Disabling DTP and using dedicated native VLANs is the primary defense against VLAN Hopping.",
            "id": "secplus_q_1001"
        },
        {
            "domain": "4.0",
            "type": "multiple-choice",
            "text": "Which mechanism is specifically designed to mitigate DHCP Starvation attacks?",
            "options": [
                "BPDU Guard",
                "Root Guard",
                "IP Source Guard",
                "DHCP Snooping"
            ],
            "answer": [
                "DHCP Snooping"
            ],
            "explanation": "DHCP Snooping is the primary defense against DHCP Starvation.",
            "id": "secplus_q_1002"
        },
        {
            "domain": "2.0",
            "type": "multiple-choice",
            "text": "Which well-known port is utilized by the POP3 protocol?",
            "options": [
                "587",
                "110",
                "25",
                "143"
            ],
            "answer": [
                "110"
            ],
            "explanation": "POP3 uses port 110. Note that the other options belong to similar protocols in the same category.",
            "id": "secplus_q_1003"
        },
        {
            "domain": "2.0",
            "type": "multiple-choice",
            "text": "Which well-known port is utilized by the HTTPS protocol?",
            "options": [
                "636",
                "22",
                "993",
                "443"
            ],
            "answer": [
                "443"
            ],
            "explanation": "HTTPS uses port 443. Note that the other options belong to similar protocols in the same category.",
            "id": "secplus_q_1004"
        },
        {
            "domain": "4.0",
            "type": "multiple-choice",
            "text": "Which mechanism is specifically designed to mitigate ARP Spoofing attacks?",
            "options": [
                "Root Guard",
                "Dynamic ARP Inspection (DAI)",
                "IP Source Guard",
                "BPDU Guard"
            ],
            "answer": [
                "Dynamic ARP Inspection (DAI)"
            ],
            "explanation": "Dynamic ARP Inspection (DAI) is the primary defense against ARP Spoofing.",
            "id": "secplus_q_1005"
        },
        {
            "domain": "2.0",
            "type": "multiple-choice",
            "text": "Which well-known port is utilized by the NTP protocol?",
            "options": [
                "161",
                "123",
                "53",
                "67"
            ],
            "answer": [
                "123"
            ],
            "explanation": "NTP uses port 123. Note that the other options belong to similar protocols in the same category.",
            "id": "secplus_q_1006"
        },
        {
            "domain": "2.0",
            "type": "multiple-choice",
            "text": "Which well-known port is utilized by the IMAPS protocol?",
            "options": [
                "993",
                "636",
                "443",
                "22"
            ],
            "answer": [
                "993"
            ],
            "explanation": "IMAPS uses port 993. Note that the other options belong to similar protocols in the same category.",
            "id": "secplus_q_1007"
        },
        {
            "domain": "2.0",
            "type": "multiple-choice",
            "text": "Which well-known port is utilized by the DNS protocol?",
            "options": [
                "161",
                "123",
                "67",
                "53"
            ],
            "answer": [
                "53"
            ],
            "explanation": "DNS uses port 53. Note that the other options belong to similar protocols in the same category.",
            "id": "secplus_q_1008"
        },
        {
            "domain": "2.0",
            "type": "multiple-choice",
            "text": "Which well-known port is utilized by the DHCP protocol?",
            "options": [
                "53",
                "161",
                "67",
                "123"
            ],
            "answer": [
                "67"
            ],
            "explanation": "DHCP uses port 67. Note that the other options belong to similar protocols in the same category.",
            "id": "secplus_q_1009"
        },
        {
            "domain": "2.0",
            "type": "multiple-choice",
            "text": "Which well-known port is utilized by the SMTP (Submission) protocol?",
            "options": [
                "110",
                "143",
                "25",
                "587"
            ],
            "answer": [
                "587"
            ],
            "explanation": "SMTP (Submission) uses port 587. Note that the other options belong to similar protocols in the same category.",
            "id": "secplus_q_1010"
        },
        {
            "domain": "2.0",
            "type": "multiple-choice",
            "text": "Which well-known port is utilized by the SMTP protocol?",
            "options": [
                "110",
                "587",
                "143",
                "25"
            ],
            "answer": [
                "25"
            ],
            "explanation": "SMTP uses port 25. Note that the other options belong to similar protocols in the same category.",
            "id": "secplus_q_1011"
        },
        {
            "domain": "2.0",
            "type": "multiple-choice",
            "text": "Which well-known port is utilized by the SSH protocol?",
            "options": [
                "22",
                "443",
                "993",
                "636"
            ],
            "answer": [
                "22"
            ],
            "explanation": "SSH uses port 22. Note that the other options belong to similar protocols in the same category.",
            "id": "secplus_q_1012"
        },
        {
            "domain": "2.0",
            "type": "multiple-choice",
            "text": "Which well-known port is utilized by the SNMP protocol?",
            "options": [
                "123",
                "53",
                "161",
                "67"
            ],
            "answer": [
                "161"
            ],
            "explanation": "SNMP uses port 161. Note that the other options belong to similar protocols in the same category.",
            "id": "secplus_q_1013"
        },
        {
            "domain": "2.0",
            "type": "multiple-choice",
            "text": "Which well-known port is utilized by the LDAPS protocol?",
            "options": [
                "443",
                "993",
                "636",
                "22"
            ],
            "answer": [
                "636"
            ],
            "explanation": "LDAPS uses port 636. Note that the other options belong to similar protocols in the same category.",
            "id": "secplus_q_1014"
        }
    ]
};
