// Google Apps Script Configuration
// Replace the URLs below with your actual Google Apps Script Web App URLs
// You'll get these URLs after deploying your Apps Scripts

const CONFIG = {
    // Partner Form - Google Apps Script Web App URL
    PARTNER_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxqFBT2NKzN3lRwdFFHfQteRAfupClDppAlw9LP4fbgU2V0ytcKyFy8L98WL9UMFuFfOQ/exec',
    
    // Student Registration Form - Google Apps Script Web App URL
    // Replace this with your student registration script URL
    STUDENT_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxVreXbhYPJIs2_SeI9DD0Bw1K1sDj3xjl9zLBjHRMtKbSMCHsSVVW8tuXZV-nXMlbr/exec'
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
