export function render() {
    return `
<div class="container mt-4">
 <div class="page-header">
 <h1>Public IP & Privacy Check</h1>
 <p>Detect your public IP, ISP, location, and check for WebRTC IP leaks.</p>
 </div>

 <div id="ipLoading" class="card mb-4">
 <div class="card-body text-center" style="padding:40px;">
 <p class="text-muted">Detecting your public IP address...</p>
 </div>
 </div>

 <div id="ipResults" class="hidden"></div>

 <div class="card mt-6">
 <div class="card-header"> WebRTC Leak Test</div>
 <div class="card-body">
 <p class="text-secondary mb-3">WebRTC can reveal your real IP address even when using a VPN.</p>
 <button id="webrtcBtn" class="btn btn-secondary">Run WebRTC Leak Test</button>
 <div id="webrtcResults" class="mt-4"></div>
 </div>
 </div>

 <div class="card mt-6">
 <div class="card-header">Browser Info</div>
 <div class="card-body">
 <div class="result-panel">
 <div class="result-row">
 <span class="result-label">User Agent</span>
 <span class="result-value" style="font-size:var(0.75rem);word-break:break-all;">${navigator.userAgent}</span>
 </div>
 <div class="result-row">
 <span class="result-label">Platform</span>
 <span class="result-value">${navigator.platform || 'N/A'}</span>
 </div>
 <div class="result-row">
 <span class="result-label">Language</span>
 <span class="result-value">${navigator.language}</span>
 </div>
 </div>
 </div>
 </div>
</div>`;
}

export function init() {
    // Fetch public IP
    fetch('https://ipapi.co/json/')
        .then(r => r.json())
        .then(data => {
            document.getElementById('ipLoading').classList.add('hidden');
            const resultsDiv = document.getElementById('ipResults');
            resultsDiv.classList.remove('hidden');
            resultsDiv.innerHTML = `
 <div class="card">
 <div class="card-header">Your Public IP Information</div>
 <div class="result-panel">
 <div class="result-row">
 <span class="result-label">IP Address</span>
 <div class="flex items-center gap-2">
 <span class="result-value">${data.ip || 'N/A'}</span>
 <button class="btn btn-sm btn-outline-secondary" onclick="copyToClipboard('${data.ip}', this)">Copy</button>
 </div>
 </div>
 <div class="result-row">
 <span class="result-label">City</span>
 <span class="result-value">${data.city || 'N/A'}</span>
 </div>
 <div class="result-row">
 <span class="result-label">Region</span>
 <span class="result-value">${data.region || 'N/A'}</span>
 </div>
 <div class="result-row">
 <span class="result-label">Country</span>
 <span class="result-value">${data.country_name || 'N/A'}</span>
 </div>
 <div class="result-row">
 <span class="result-label">ISP / Org</span>
 <span class="result-value">${data.org || 'N/A'}</span>
 </div>
 <div class="result-row">
 <span class="result-label">IP Version</span>
 <span class="result-value">${data.version || 'N/A'}</span>
 </div>
 </div>
 </div>`;
        })
        .catch(() => {
            document.getElementById('ipLoading').innerHTML =
                '<div class="card-body"><div class="alert alert-danger">Failed to detect public IP. The API may be unavailable.</div></div>';
        });

    // WebRTC leak test
    document.getElementById('webrtcBtn').addEventListener('click', () => {
        const resultsDiv = document.getElementById('webrtcResults');
        resultsDiv.innerHTML = '<p class="text-muted">Testing...</p>';

        const ips = new Set();
        try {
            const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
            pc.createDataChannel('');
            pc.createOffer().then(offer => pc.setLocalDescription(offer));
            pc.onicecandidate = (event) => {
                if (!event.candidate) {
                    pc.close();
                    if (ips.size === 0) {
                        resultsDiv.innerHTML = '<div class="alert alert-success">No WebRTC IP leak detected. Your VPN is likely working properly.</div>';
                    } else {
                        resultsDiv.innerHTML = `
 <div class="alert alert-warning">
 WebRTC revealed the following IP(s):<br>
 ${[...ips].map(ip => `<code>${ip}</code>`).join(', ')}
 </div>`;
                    }
                    return;
                }
                const candidate = event.candidate.candidate;
                const ipMatch = candidate.match(/([0-9]{1,3}\.){3}[0-9]{1,3}/);
                if (ipMatch) ips.add(ipMatch[0]);
            };
        } catch (err) {
            resultsDiv.innerHTML = '<div class="alert alert-info">WebRTC is not supported in this browser.</div>';
        }
    });
}
