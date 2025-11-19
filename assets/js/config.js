// Google Apps Script Configuration
// Replace the URL below with your actual Google Apps Script Web App URL
// You'll get this URL after deploying your Apps Script

const CONFIG = {
    // Your Google Apps Script Web App URL goes here
    // It should look like: https://script.google.com/macros/s/AKfycby.../exec
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxqFBT2NKzN3lRwdFFHfQteRAfupClDppAlw9LP4fbgU2V0ytcKyFy8L98WL9UMFuFfOQ/exec'
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
