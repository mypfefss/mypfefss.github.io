# Google Sheets Integration - Final Setup Instructions

## ✅ What We've Done So Far

1. ✅ Created Google Sheet with column headers
2. ✅ Created Google Apps Script
3. ✅ Deployed the script as Web App
4. ✅ Updated website code to send data to Google Sheets

## 🔧 Final Step: Add Your Google Script URL

### Step 1: Get Your Web App URL

You should have copied your Google Apps Script Web App URL. It looks like:
```
https://script.google.com/macros/s/AKfycby.../exec
```

### Step 2: Update the Config File

1. Open the file: `assets/js/config.js`
2. Find this line:
   ```javascript
   GOOGLE_SCRIPT_URL: 'YOUR_GOOGLE_SCRIPT_URL_HERE'
   ```
3. Replace `YOUR_GOOGLE_SCRIPT_URL_HERE` with your actual URL:
   ```javascript
   GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycby.../exec'
   ```
4. Save the file

### Step 3: Test the Integration

1. Open your website in a browser
2. Go to the Partners page (`pages/sponsors.html`)
3. Scroll down to the "Become a Partner" form
4. Fill out the form with test data:
   - Company Name: Test Company
   - Contact Person: John Doe
   - Email: test@example.com
   - Phone: +216 12 345 678
   - Message: This is a test submission
5. Click "Submit Partnership Request"
6. You should see a green success message
7. Check your Google Sheet - a new row should appear with the test data!

## 🎉 What Happens Now

When someone fills out the partner form:
1. ✅ Form data is collected
2. ✅ Submit button shows "Submitting..." (disabled)
3. ✅ Data is sent to your Google Apps Script
4. ✅ Script adds a new row to your Google Sheet
5. ✅ User sees success message
6. ✅ Form is reset
7. ✅ You can view all submissions in your Google Sheet

## 📧 Optional: Enable Email Notifications

To receive an email when someone submits the form:

1. Open your Google Apps Script editor
2. Find these commented lines in the script:
   ```javascript
   /*
   MailApp.sendEmail({
     to: 'your-email@example.com',
     ...
   });
   */
   ```
3. Remove the `/*` and `*/` to uncomment
4. Replace `your-email@example.com` with your actual email
5. Save and redeploy the script (Deploy → Manage deployments → Edit → Version: New version → Deploy)

## 🔒 Security Notes

- The Google Script URL is visible in your frontend code (this is normal)
- Only POST requests with the correct data structure will work
- Google Apps Script has built-in rate limiting to prevent abuse
- You can add additional validation in the Apps Script if needed

## 🐛 Troubleshooting

**Problem: Form submits but no data appears in sheet**
- Check that your Google Script URL is correct in `config.js`
- Make sure the URL ends with `/exec`
- Check the browser console for errors (F12 → Console tab)

**Problem: "Configuration required" error**
- You haven't updated the URL in `config.js` yet
- Make sure you saved the file after editing

**Problem: Data appears in wrong columns**
- Check that your Google Sheet column headers match exactly:
  `Timestamp | Company Name | Contact Person | Email | Phone | Message | Status`

## 📊 Managing Submissions

Your Google Sheet now contains all partner submissions. You can:
- Sort and filter submissions
- Add a "Status" column to track follow-ups (New, Contacted, Closed, etc.)
- Export to CSV or Excel
- Share with team members
- Create charts and reports

## 🎯 Next Steps (Optional)

Want to enhance the integration? You can:
- Add the same integration to the student registration form
- Send confirmation emails to partners
- Add spam protection (reCAPTCHA)
- Create automatic email notifications
- Add data validation in the script

---

**Need help?** Check the browser console (F12) for error messages.
