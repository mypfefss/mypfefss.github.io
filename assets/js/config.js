// ── API base URL ───────────────────────────────────────────────────────────────
// Use the local backend on localhost, and FastAPI Cloud in production.
const API_BASE = ['127.0.0.1', 'localhost'].includes(
    typeof window !== 'undefined' ? window.location.hostname : ''
)
    ? 'http://127.0.0.1:8000'
    : 'https://mypfe.fastapicloud.dev';

// ── Google Apps Script Configuration ──────────────────────────────────────────
const CONFIG = {
    PARTNER_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxqFBT2NKzN3lRwdFFHfQteRAfupClDppAlw9LP4fbgU2V0ytcKyFy8L98WL9UMFuFfOQ/exec',
    STUDENT_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxVreXbhYPJIs2_SeI9DD0Bw1K1sDj3xjl9zLBjHRMtKbSMCHsSVVW8tuXZV-nXMlbr/exec'
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API_BASE, CONFIG };
}
