// Google Apps Script for Student Registration Form
// Copy this code into your Google Apps Script editor

function doPost(e) {
  try {
    // Get the active spreadsheet
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Parse the incoming data
    var data = JSON.parse(e.postData.contents);
    
    // Get current timestamp
    var timestamp = new Date();
    
    // Handle workshops array (convert to comma-separated string)
    var workshops = '';
    if (data.workshops && Array.isArray(data.workshops)) {
      workshops = data.workshops.join(', ');
    } else if (data.workshops) {
      workshops = data.workshops;
    }
    
    // Prepare the row data (matching your column order)
    var rowData = [
      timestamp,
      data.firstName || '',
      data.lastName || '',
      data.email || '',
      data.phone || '',
      data.university || '',
      data.field || '',
      data.level || '',
      data.graduation || '',
      workshops,
      data.interests || '',
      data.experience || ''
    ];
    
    // Append the data to the sheet
    sheet.appendRow(rowData);
    
    // Optional: Send email notification to organizers
    // Uncomment the lines below and add your email
    /*
    MailApp.sendEmail({
      to: 'mypfe@fss.usf.tn',
      subject: 'New Student Registration - MyPFE 14.0',
      body: 'New student registration received:\n\n' +
            'Name: ' + data.firstName + ' ' + data.lastName + '\n' +
            'Email: ' + data.email + '\n' +
            'Phone: ' + data.phone + '\n' +
            'University: ' + data.university + '\n' +
            'Field: ' + data.field + '\n' +
            'Level: ' + data.level + '\n' +
            'Workshops: ' + workshops + '\n' +
            'Experience: ' + data.experience
    });
    */
    
    // Optional: Send confirmation email to student
    // Uncomment the lines below to enable
    /*
    MailApp.sendEmail({
      to: data.email,
      subject: 'Registration Confirmed - MyPFE 14.0',
      body: 'Dear ' + data.firstName + ',\n\n' +
            'Thank you for registering for MyPFE 14.0!\n\n' +
            'Event Details:\n' +
            'Date: November 22, 2025\n' +
            'Location: Faculty of Sciences of Sfax\n\n' +
            'We look forward to seeing you there!\n\n' +
            'Best regards,\n' +
            'MyPFE 14.0 Team'
    });
    */
    
    // Return success response
    return ContentService.createTextOutput(JSON.stringify({
      'status': 'success',
      'message': 'Registration submitted successfully!'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    // Return error response
    return ContentService.createTextOutput(JSON.stringify({
      'status': 'error',
      'message': error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function (optional - for testing in the editor)
function doGet(e) {
  return ContentService.createTextOutput('Student Registration Handler is running!');
}
