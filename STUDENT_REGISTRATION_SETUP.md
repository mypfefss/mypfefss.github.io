# Student Registration - Google Sheets Integration Setup

## ✅ What We've Done

1. ✅ Created the Google Apps Script code for student registrations
2. ✅ Updated the website code to send student data to Google Sheets
3. ✅ Updated config.js to support both partner and student forms

---

## 🔧 Setup Steps

### Step 1: Create Google Sheet for Students

1. Go to **sheets.google.com**
2. Create a **new spreadsheet**
3. Name it: **MyPFE 14.0 - Student Registrations**
4. In **Row 1**, add these column headers (exactly as shown):

```
Timestamp | First Name | Last Name | Email | Phone | University | Field of Study | Academic Level | Expected Graduation | Workshops | Career Interests | Experience Level
```

### Step 2: Create the Apps Script

1. In your Google Sheet, click **Extensions** → **Apps Script**
2. Delete any default code
3. Copy the code from the file: `STUDENT_REGISTRATION_SCRIPT.js`
4. Paste it into the Apps Script editor
5. **Save** the project as: **Student Registration Handler**

### Step 3: Deploy the Script

1. Click **Deploy** → **New deployment**
2. Click the gear icon ⚙️ → Select **Web app**
3. Fill in:
   - **Description**: `Student Registration Handler`
   - **Execute as**: **Me**
   - **Who has access**: **Anyone**
4. Click **Deploy**
5. **Authorize** the app (follow the prompts)
6. **Copy the Web App URL** (it ends with `/exec`)

### Step 4: Update Config File

1. Open `assets/js/config.js`
2. Find this line:
   ```javascript
   STUDENT_SCRIPT_URL: 'YOUR_STUDENT_SCRIPT_URL_HERE'
   ```
3. Replace `YOUR_STUDENT_SCRIPT_URL_HERE` with your actual URL:
   ```javascript
   STUDENT_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycby.../exec'
   ```
4. **Save** the file

---

## 🧪 Testing

1. Open any page on your website (index.html, about.html, etc.)
2. Click the **"Register Now"** button in the navbar
3. Fill out the registration form with test data
4. Click **"Complete Registration"**
5. Check your Google Sheet - a new row should appear!

---

## 📊 What Data is Collected

The form collects:
- **Personal Info**: First Name, Last Name, Email, Phone
- **Academic Info**: University, Field of Study, Academic Level, Expected Graduation
- **Preferences**: Workshop selections (multiple checkboxes)
- **Additional**: Career Interests, Experience Level
- **Automatic**: Timestamp of submission

---

## 📧 Optional: Email Notifications

### To receive emails when students register:

1. Open your Google Apps Script editor
2. Find these commented lines:
   ```javascript
   /*
   MailApp.sendEmail({
     to: 'mypfe@fss.usf.tn',
     ...
   });
   */
   ```
3. Remove the `/*` and `*/` to uncomment
4. Update the email address if needed
5. Save and redeploy (Deploy → Manage deployments → Edit → New version → Deploy)

### To send confirmation emails to students:

1. Find the second commented email section in the script
2. Uncomment it (remove `/*` and `*/`)
3. Customize the message if desired
4. Save and redeploy

---

## 🎯 Summary

You now have TWO forms connected to Google Sheets:

1. **Partner Form** (on sponsors.html)
   - Saves to: "MyPFE 14.0 - Partner Submissions"
   - Config: `PARTNER_SCRIPT_URL`

2. **Student Registration Form** (modal on all pages)
   - Saves to: "MyPFE 14.0 - Student Registrations"
   - Config: `STUDENT_SCRIPT_URL`

Both forms:
- ✅ Show loading state while submitting
- ✅ Display success/error messages
- ✅ Reset after successful submission
- ✅ Save data to Google Sheets automatically

---

## 🐛 Troubleshooting

**Problem: "Configuration required" error**
- You haven't added the Student Script URL to `config.js` yet
- Make sure you saved the file after editing

**Problem: Form submits but no data in sheet**
- Check that your Google Script URL is correct
- Make sure the URL ends with `/exec`
- Check browser console (F12) for errors

**Problem: Column headers don't match**
- Make sure your Google Sheet headers match exactly:
  `Timestamp | First Name | Last Name | Email | Phone | University | Field of Study | Academic Level | Expected Graduation | Workshops | Career Interests | Experience Level`

---

## ✨ Next Steps

Once you've added your Student Script URL to `config.js`:
- Test the form on all pages
- Enable email notifications if desired
- Share the Google Sheets with your team members
- Set up data validation or conditional formatting in the sheets

---

**Need help?** Check the browser console (F12 → Console tab) for error messages.
