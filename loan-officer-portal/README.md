# Loan Officer Portal for Merchant Cash Advance

A web application designed for loan officers specializing in merchant cash advances. This portal allows officers to easily capture, manage, and send screenshots to an n8n webhook for processing.

## Features

- Screenshot capture integration with Windows Snipping Tool (Win+Shift+S)
- Multiple screenshot upload capability
- Paste functionality for quick screenshot addition
- Drag and drop support for image files
- Individual screenshot deletion
- Batch deletion of all screenshots
- Send screenshots to n8n webhook
- Response display from webhook

## Setup Instructions

1. Clone or download this repository to your local machine
2. Open the `js/script.js` file and update the `webhookUrl` variable with your actual n8n webhook URL
3. Open the `index.html` file in your web browser to use the application

## Usage

1. **Taking Screenshots**:
   - Press `Win+Shift+S` to use the Windows Snipping Tool
   - Select the area you want to capture
   - Either paste directly into the application or click the "Paste Screenshot" button

2. **Uploading Images**:
   - Click the upload area or the "Upload Files" button
   - Select one or more image files from your computer
   - Alternatively, drag and drop image files into the upload area

3. **Managing Screenshots**:
   - View all uploaded screenshots in the preview section
   - Remove individual screenshots by clicking the "×" button on each image
   - Clear all screenshots by clicking the "Delete All" button

4. **Sending to n8n**:
   - Click the "Send to n8n" button to transmit all screenshots to your webhook
   - View the response from n8n in the Response section

## Technical Details

- Built with vanilla HTML, CSS, and JavaScript
- No external dependencies required
- Responsive design that works on various screen sizes

## Webhook Integration

The application sends images to the specified n8n webhook URL using a `FormData` object with the following structure:
- Each image is attached as a file with the key `image_0`, `image_1`, etc.
- The original filename is preserved when available

## Customization

You can customize the application by:
- Modifying the CSS in `css/styles.css` to match your branding
- Updating the webhook handling in `js/script.js` to match your n8n workflow requirements
