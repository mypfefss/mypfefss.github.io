// ── API base URL ───────────────────────────────────────────────────────────────
// Change this to your deployed FastAPI Cloud URL once deployed.
// Leave empty string to skip the API and use Google Apps Script only.
const API_BASE = '';

// ── Google Apps Script Configuration ──────────────────────────────────────────
const CONFIG = {
    PARTNER_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxqFBT2NKzN3lRwdFFHfQteRAfupClDppAlw9LP4fbgU2V0ytcKyFy8L98WL9UMFuFfOQ/exec',
    STUDENT_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxVreXbhYPJIs2_SeI9DD0Bw1K1sDj3xjl9zLBjHRMtKbSMCHsSVVW8tuXZV-nXMlbr/exec'
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API_BASE, CONFIG };
}
