export function copyToClipboard(text, btn) {
 navigator.clipboard.writeText(text).then(() => {
 if (btn) {
 const original = btn.textContent;
 btn.textContent = '✓ Copied';
 btn.classList.add('btn-success');
 setTimeout(() => {
 btn.textContent = original;
 btn.classList.remove('btn-success');
 }, 1500);
 }
 showToast('Copied to clipboard', 'success');
 }).catch(() => {
 showToast('Failed to copy', 'danger');
 });
}

// Make globally accessible for inline onclick handlers
window.copyToClipboard = copyToClipboard;

export function showToast(message, type = 'info') {
 let container = document.querySelector('.toast-container');
 if (!container) {
 container = document.createElement('div');
 container.className = 'toast-container';
 document.body.appendChild(container);
 }
 const toast = document.createElement('div');
 toast.className = `toast toast-${type}`;
 const icons = { success: '✓', danger: '✕', info: '' };
 toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
 container.appendChild(toast);
 setTimeout(() => {
 toast.style.animation = 'toastOut 0.3s ease forwards';
 setTimeout(() => toast.remove(), 300);
 }, 2500);
}

// --- IP Validation ---

export function validateIPv4(ip) {
 if (!ip) return false;
 const parts = ip.split('.');
 if (parts.length !== 4) return false;
 return parts.every(p => {
 const n = parseInt(p, 10);
 return !isNaN(n) && n >= 0 && n <= 255 && String(n) === p;
 });
}

export function validateCIDR(cidr) {
 if (!cidr) return false;
 const clean = cidr.startsWith('/') ? cidr.substring(1) : cidr;
 // Dotted decimal mask
 if (clean.includes('.')) {
 return validateSubnetMask(clean);
 }
 const val = parseInt(clean, 10);
 return !isNaN(val) && val >= 0 && val <= 32;
}

export function validateSubnetMask(mask) {
 if (!mask) return false;
 const parts = mask.split('.');
 if (parts.length !== 4) return false;
 const nums = parts.map(p => parseInt(p, 10));
 if (nums.some(n => isNaN(n) || n < 0 || n > 255)) return false;
 // Convert to 32-bit and check all 1s are contiguous
 const uint = (nums[0] << 24 | nums[1] << 16 | nums[2] << 8 | nums[3]) >>> 0;
 if (uint === 0) return true;
 const inverted = ~uint >>> 0;
 return (inverted & (inverted + 1)) === 0;
}

// --- IP Conversion ---

export function ipToUint(ip) {
 const parts = ip.split('.');
 return ((parseInt(parts[0]) << 24) |
 (parseInt(parts[1]) << 16) |
 (parseInt(parts[2]) << 8) |
 parseInt(parts[3])) >>> 0;
}

export function uintToIp(uint) {
 return [
 (uint >>> 24) & 0xff,
 (uint >>> 16) & 0xff,
 (uint >>> 8) & 0xff,
 uint & 0xff
 ].join('.');
}

export function cidrToMask(cidr) {
 if (cidr === 0) return '0.0.0.0';
 const mask = (0xffffffff << (32 - cidr)) >>> 0;
 return uintToIp(mask);
}

export function maskToCidr(mask) {
 const uint = ipToUint(mask);
 let cidr = 0;
 let check = uint;
 while (check & 0x80000000) {
 cidr++;
 check = (check << 1) >>> 0;
 }
 return cidr;
}

export function cidrToWildcard(cidrOrMask) {
 let prefix;
 if (cidrOrMask.includes('.')) {
 // Dotted decimal mask – invert each octet
 return cidrOrMask.split('.').map(p => 255 - parseInt(p, 10)).join('.');
 }
 const clean = cidrOrMask.startsWith('/') ? cidrOrMask.substring(1) : cidrOrMask;
 prefix = parseInt(clean, 10);
 if (isNaN(prefix)) return '0.0.0.0';
 const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
 return uintToIp((~mask) >>> 0);
}

export function intToIp(int) {
 return uintToIp(int >>> 0);
}

export function uintToBinary(uint) {
 return (uint >>> 0).toString(2).padStart(32, '0');
}

export function getIPClass(firstOctet) {
 if (firstOctet < 128) return 'A';
 if (firstOctet < 192) return 'B';
 if (firstOctet < 224) return 'C';
 if (firstOctet < 240) return 'D';
 return 'E';
}

// --- DOM Helpers ---

export function el(tag, attrs = {}, children = []) {
 const element = document.createElement(tag);
 for (const [key, value] of Object.entries(attrs)) {
 if (key === 'className') element.className = value;
 else if (key === 'innerHTML') element.innerHTML = value;
 else if (key === 'textContent') element.textContent = value;
 else if (key.startsWith('on')) element.addEventListener(key.slice(2).toLowerCase(), value);
 else if (key === 'style' && typeof value === 'object') Object.assign(element.style, value);
 else element.setAttribute(key, value);
 }
 children.forEach(child => {
 if (typeof child === 'string') element.appendChild(document.createTextNode(child));
 else if (child instanceof HTMLElement) element.appendChild(child);
 });
 return element;
}

export function attachValidation(input, validator) {
 const check = () => {
 const val = input.value.trim();
 if (!val) {
 input.classList.remove('is-valid', 'is-invalid');
 return;
 }
 if (validator(val)) {
 input.classList.add('is-valid');
 input.classList.remove('is-invalid');
 } else {
 input.classList.add('is-invalid');
 input.classList.remove('is-valid');
 }
 };
 input.addEventListener('input', check);
 input.addEventListener('blur', check);
}

// --- Export Helpers ---

export function exportCSV(csvContent, filename) {
 const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = filename;
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);
 URL.revokeObjectURL(url);
}

export function parseCIDR(cidrStr) {
 if (!cidrStr) return null;
 const clean = cidrStr.trim().replace(/^\//, '');
 // Dotted-decimal mask
 if (clean.includes('.')) {
 if (!validateSubnetMask(clean)) return null;
 return maskToCidr(clean);
 }
 const val = parseInt(clean, 10);
 if (isNaN(val) || val < 0 || val > 32) return null;
 return val;
}
