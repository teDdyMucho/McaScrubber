document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const pasteButton = document.getElementById('pasteButton');
    const uploadButton = document.getElementById('uploadButton');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const sendButton = document.getElementById('sendButton');
    const clearButton = document.getElementById('clearButton');
    const responseContainer = document.getElementById('responseContainer');
    
    // Store uploaded images
    const uploadedImages = [];
    
    // Direct URL to Railway backend
    const webhookUrl = 'https://primary-production-6722.up.railway.app/webhook/34315acb-a2fe-4d8f-9803-cdd663bf1625';
    
    // Header Authentication credentials
    const authHeaders = {
        // Based on the error message, we need to use the Authorization header instead
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJsb2FuLW9mZmljZXItcG9ydGFsIiwiaWF0IjoxNjgyNTk1MzY3fQ.Qz2KhCypSXnVJRv8DuLXbW4ZVeYS7gX5M2jQ8PwT3Rk'
    };
    
    // Event Listeners
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileUpload);
    pasteButton.addEventListener('click', focusForPaste);
    sendButton.addEventListener('click', sendImagesToWebhook);
    clearButton.addEventListener('click', clearAllImages);
    
    // Drag and drop functionality
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    });
    
    // Paste functionality
    document.addEventListener('paste', (e) => {
        const items = e.clipboardData.items;
        
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                addImageFromFile(blob);
            }
        }
    });
    
    // Functions
    function handleFileUpload(e) {
        handleFiles(e.target.files);
        fileInput.value = ''; // Reset file input
    }
    
    function handleFiles(files) {
        for (let i = 0; i < files.length; i++) {
            if (files[i].type.startsWith('image/')) {
                addImageFromFile(files[i]);
            } else if (files[i].type === 'application/pdf') {
                handlePdfFile(files[i]);
            }
        }
    }
    
    function addImageFromFile(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const imageData = e.target.result;
            addImageToPreview(imageData, file.name);
            uploadedImages.push({
                name: file.name,
                data: imageData
            });
            
            updateButtonStates();
        };
        
        reader.readAsDataURL(file);
    }
    
    // Handle PDF files and convert each page to PNG
    function handlePdfFile(file) {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const typedArray = new Uint8Array(e.target.result);
                const pdf = await pdfjsLib.getDocument(typedArray).promise;
                const numPages = pdf.numPages;
                
                // Show loading message
                const loadingMsg = document.createElement('div');
                loadingMsg.className = 'loading-message';
                loadingMsg.textContent = `Converting PDF: 0/${numPages} pages`;
                document.body.appendChild(loadingMsg);
                
                // Process each page
                for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                    // Update loading message
                    loadingMsg.textContent = `Converting PDF: ${pageNum}/${numPages} pages`;
                    
                    // Get the page
                    const page = await pdf.getPage(pageNum);
                    const viewport = page.getViewport({ scale: 1.5 }); // Adjust scale as needed
                    
                    // Create a canvas for rendering
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    
                    // Render the PDF page to the canvas
                    await page.render({
                        canvasContext: context,
                        viewport: viewport
                    }).promise;
                    
                    // Convert canvas to image data
                    const imageData = canvas.toDataURL('image/png');
                    const pageName = `${file.name.replace('.pdf', '')}_page_${pageNum}.png`;
                    
                    // Add the image to preview
                    addImageToPreview(imageData, pageName);
                    uploadedImages.push({
                        name: pageName,
                        data: imageData
                    });
                }
                
                // Remove loading message
                document.body.removeChild(loadingMsg);
                updateButtonStates();
            } catch (error) {
                console.error('Error processing PDF:', error);
                alert('Failed to process PDF. Please try again.');
            }
        };
        
        reader.readAsArrayBuffer(file);
    }
    
    function addImageToPreview(imageData, imageName) {
        // Remove "no images" message if it exists
        const noImagesMsg = imagePreviewContainer.querySelector('.no-images');
        if (noImagesMsg) {
            noImagesMsg.remove();
        }
        
        // Add styles for the enhanced preview if not already added
        if (!document.getElementById('enhanced-preview-styles')) {
            const previewStyles = document.createElement('style');
            previewStyles.id = 'enhanced-preview-styles';
            previewStyles.textContent = `
                .image-preview {
                    position: relative;
                    margin: 10px;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 3px 10px rgba(0,0,0,0.1);
                    transition: transform 0.2s, box-shadow 0.2s;
                    background-color: #fff;
                }
                .image-preview:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 5px 15px rgba(0,0,0,0.15);
                }
                .image-preview img {
                    display: block;
                    max-width: 100%;
                    height: auto;
                    border-radius: 6px 6px 0 0;
                }
                .image-preview .image-info {
                    padding: 8px 10px;
                    background-color: #f8f9fa;
                    border-top: 1px solid #eee;
                    font-size: 12px;
                    color: #666;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .image-preview .delete-btn {
                    position: absolute;
                    top: 5px;
                    right: 5px;
                    width: 24px;
                    height: 24px;
                    background-color: rgba(255,255,255,0.8);
                    border: none;
                    border-radius: 50%;
                    font-size: 16px;
                    line-height: 1;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background-color 0.2s;
                }
                .image-preview .delete-btn:hover {
                    background-color: rgba(255,0,0,0.1);
                }
                .image-preview .view-btn {
                    background: none;
                    border: none;
                    color: #3498db;
                    cursor: pointer;
                    font-size: 12px;
                    padding: 0;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .image-preview .view-btn:hover {
                    text-decoration: underline;
                }
                #image-preview-container {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    justify-content: flex-start;
                    margin-top: 15px;
                }
            `;
            document.head.appendChild(previewStyles);
        }
        
        const imagePreview = document.createElement('div');
        imagePreview.className = 'image-preview';
        
        const img = document.createElement('img');
        img.src = imageData;
        img.alt = imageName || 'Uploaded image';
        
        // Add click to view full size
        img.addEventListener('click', () => {
            const html = `
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%">
                    <img src='${imageData}' alt='${imageName || "Uploaded image"}' style="max-width:90vw;max-height:70vh;border-radius:18px;box-shadow:0 4px 32px rgba(0,0,0,0.18);margin-bottom:18px;" />
                    <div style="color:#555;font-size:1.1em;margin-bottom:8px;">${imageName ? imageName.replace(/</g,'&lt;').replace(/>/g,'&gt;') : ''}</div>
                </div>`;
            openFullScreenView(html, true);
        });
        
        // Create image info section
        const imageInfo = document.createElement('div');
        imageInfo.className = 'image-info';
        
        // Display file name or default name
        const nameSpan = document.createElement('span');
        nameSpan.textContent = imageName ? 
            (imageName.length > 20 ? imageName.substring(0, 17) + '...' : imageName) : 
            'Screenshot';
        
        // Add view button
        const viewBtn = document.createElement('button');
        viewBtn.className = 'view-btn';
        viewBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> View';
        viewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openFullScreenView(`<img src="${imageData}" style="max-width:100%;max-height:90vh;display:block;margin:0 auto;">`, true);
        });
        
        // Add delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.title = 'Delete image';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = Array.from(imagePreviewContainer.children).indexOf(imagePreview);
            if (index !== -1) {
                uploadedImages.splice(index, 1);
                imagePreview.remove();
                updateButtonStates();
                
                // Show "no images" message if no images left
                if (uploadedImages.length === 0) {
                    showNoImagesMessage();
                }
            }
        });
        
        // Assemble the preview
        imageInfo.appendChild(nameSpan);
        imageInfo.appendChild(viewBtn);
        imagePreview.appendChild(img);
        imagePreview.appendChild(deleteBtn);
        imagePreviewContainer.appendChild(imagePreview);
    }
    
    function focusForPaste() {
        // Create a temporary contenteditable element to focus for paste
        const tempElement = document.createElement('div');
        tempElement.contentEditable = true;
        tempElement.style.position = 'absolute';
        tempElement.style.left = '-9999px';
        document.body.appendChild(tempElement);
        tempElement.focus();
        
        // Show a notification to the user
        const notification = document.createElement('div');
        notification.textContent = 'Press Ctrl+V to paste your screenshot';
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.padding = '10px 20px';
        notification.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        notification.style.color = 'white';
        notification.style.borderRadius = '5px';
        notification.style.zIndex = '1000';
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            document.body.removeChild(notification);
            document.body.removeChild(tempElement);
        }, 3000);
    }
    
    function sendImagesToWebhook() {
        if (uploadedImages.length === 0) return;
        
        // Disable send button and show loading state
        sendButton.disabled = true;
        sendButton.textContent = 'Sending...';
        
        // Get AI Prompt from localStorage
        const aiPrompt = localStorage.getItem('aiPrompt') || '';
        
        // Prepare data for the request
        const formData = new FormData();
        formData.append('aiPrompt', aiPrompt);
        
        // Add each image to the form data
        uploadedImages.forEach((image, index) => {
            // Convert base64 to blob
            const byteString = atob(image.data.split(',')[1]);
            const mimeType = image.data.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            
            const blob = new Blob([ab], { type: mimeType });
            formData.append(`image_${index}`, blob, image.name || `screenshot_${index}.png`);
        });
        
        // Show a message that we're sending the request
        showResponse('Sending images to the server...', false);
        
        // Use a direct fetch approach with proper headers
        fetch(webhookUrl, {
            method: 'POST',
            headers: authHeaders,
            body: formData
        })
        .then(response => {
            console.log('Response status:', response.status);
            console.log('Response headers:', [...response.headers.entries()]);
            
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(`HTTP error ${response.status}: ${text}`);
                });
            }
            
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return response.json().then(data => {
                    return { isJson: true, data };
                });
            } else {
                return response.text().then(text => {
                    return { isJson: false, data: text };
                });
            }
        })
        .then(result => {
            // Display response based on type
            showResponse(result.data, result.isJson);
            
            // Reset button state
            sendButton.disabled = false;
            sendButton.textContent = 'Send to n8n';
        })
        .catch(error => {
            // Display error
            showResponse(`Failed to send images to webhook: ${error.message}`, false);
            console.error('Error sending images to webhook:', error);
            
            // Reset button state
            sendButton.disabled = false;
            sendButton.textContent = 'Send to n8n';
        });
    }
    
    // Helper function to create response iframe
    function createResponseIframe() {
        const iframe = document.createElement('iframe');
        iframe.id = 'responseIframe';
        iframe.name = 'responseIframe';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        return iframe;
    }
    
    function showResponse(data, isJson = true) {
        // Remove "no response" message if it exists
        const noResponseMsg = responseContainer.querySelector('.no-response');
        if (noResponseMsg) {
            noResponseMsg.remove();
        }
        
        // Create response content
        const responseContent = document.createElement('div');
        responseContent.className = 'response-content';
        
        // Add styles for the formatted response
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .mca-report {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 100%;
                overflow-x: auto;
            }
            .mca-report h2 {
                color: #2c3e50;
                border-bottom: 2px solid #3498db;
                padding-bottom: 8px;
                margin-top: 25px;
            }
            .mca-report table {
                border-collapse: collapse;
                width: 100%;
                margin: 15px 0;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .mca-report th {
                background-color: #f2f2f2;
                font-weight: bold;
                text-align: left;
                padding: 12px 8px;
                border: 1px solid #ddd;
            }
            .mca-report td {
                padding: 10px 8px;
                border: 1px solid #ddd;
            }
            .mca-report tr:nth-child(even) {
                background-color: #f9f9f9;
            }
            .mca-report tr:hover {
                background-color: #f1f1f1;
            }
            .mca-report hr {
                border: 0;
                height: 1px;
                background: #ddd;
                margin: 20px 0;
            }
            .mca-report ul, .mca-report ol {
                padding-left: 20px;
            }
            .mca-report li {
                margin-bottom: 8px;
            }
            .mca-report strong {
                color: #2c3e50;
            }
            .mca-report .highlight {
                background-color: #ffffcc;
                padding: 2px 4px;
                border-radius: 3px;
            }
        `;
        document.head.appendChild(styleElement);
        
        if (isJson && typeof data === 'object') {
            // Format JSON data into a nice UI
            try {
                responseContent.innerHTML = formatMCAResponse(data);
            } catch (error) {
                console.error('Error formatting response:', error);
                responseContent.innerHTML = `<div class="mca-report"><h2>⚠️ Formatting Error</h2><p>Could not format the response: ${error.message}</p><pre>${JSON.stringify(data, null, 2)}</pre></div>`;
            }
        } else {
            // Try to parse text as JSON
            try {
                const jsonData = typeof data === 'string' ? JSON.parse(data) : data;
                responseContent.innerHTML = formatMCAResponse(jsonData);
            } catch (error) {
                // If not JSON or formatting fails, display as markdown if it looks like markdown
                if (typeof data === 'string' && (data.includes('#') || data.includes('|'))) {
                    responseContent.innerHTML = convertMarkdownToHTML(data);
                } else {
                    responseContent.innerHTML = `<div class="mca-report"><pre>${data}</pre></div>`;
                }
            }
        }
        
        // Create view button for full-screen mode
        const viewButton = document.createElement('button');
        viewButton.className = 'view-btn';
        viewButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"></path><path d="M9 21H3v-6"></path><path d="M21 3l-7 7"></path><path d="M3 21l7-7"></path></svg>';
        viewButton.title = 'View full screen';
        viewButton.addEventListener('click', () => {
            // Always create a new, robust modal for preview
            let htmlPreview = '';
            if (isJson && typeof data === 'object') {
                htmlPreview = formatMCAResponse(data);
            } else if (typeof data === 'string' && (data.includes('#') || data.includes('|'))) {
                htmlPreview = convertMarkdownToHTML(data);
            } else {
                htmlPreview = `<div class="mca-report"><pre>${data}</pre></div>`;
            }
            showIsolatedPreviewModal(htmlPreview);
        });

// --- Robust, isolated modal preview ---
function showIsolatedPreviewModal(htmlContent) {
    // Remove any existing preview modal
    const existing = document.getElementById('robust-preview-modal');
    if (existing) existing.remove();

    // Overlay
    const overlay = document.createElement('div');
    overlay.id = 'robust-preview-modal';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0,0,0,0.92)';
    overlay.style.zIndex = '99999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';

    // Modal content
    const modal = document.createElement('div');
    modal.style.background = '#fff';
    modal.style.borderRadius = '12px';
    modal.style.boxShadow = '0 8px 40px rgba(0,0,0,0.25)';
    modal.style.maxWidth = '960px';
    modal.style.width = '90vw';
    modal.style.maxHeight = '90vh';
    modal.style.overflow = 'auto';
    modal.style.padding = '32px 24px';
    modal.style.position = 'relative';

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.title = 'Close';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '16px';
    closeBtn.style.right = '24px';
    closeBtn.style.fontSize = '2rem';
    closeBtn.style.background = '#e74c3c';
    closeBtn.style.color = '#fff';
    closeBtn.style.border = 'none';
    closeBtn.style.borderRadius = '50%';
    closeBtn.style.width = '40px';
    closeBtn.style.height = '40px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.display = 'flex';
    closeBtn.style.alignItems = 'center';
    closeBtn.style.justifyContent = 'center';
    closeBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
    closeBtn.addEventListener('click', () => overlay.remove());

    // Escape key closes modal
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            overlay.remove();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);

    // Inject content
    modal.innerHTML = htmlContent;
    modal.appendChild(closeBtn);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

        
        // Create a wrapper for the response content and view button
        const responseWrapper = document.createElement('div');
        responseWrapper.className = 'response-wrapper';
        
        // Clear previous response and add new one with the view button
        responseContainer.innerHTML = '';
        responseWrapper.appendChild(responseContent);
        responseWrapper.appendChild(viewButton);
        responseContainer.appendChild(responseWrapper);
    }
    
    // Function to format MCA response data into HTML
    function formatMCAResponse(data) {
        // If data is already HTML-like, return it
        if (typeof data === 'string' && data.trim().startsWith('<')) {
            return data;
        }
        
        // Default template if we can't determine the structure
        let html = '<div class="mca-report">';
        
        // Try to identify if this is MCA data with monthly overview
        if (data.monthlyOverview || data.monthly_overview) {
            const overview = data.monthlyOverview || data.monthly_overview;
            html += `<h2>📊 Monthly Overview</h2><table><thead><tr>`;
            
            // Add table headers
            const headers = Object.keys(overview[0] || {});
            headers.forEach(header => {
                const formattedHeader = header
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, c => c.toUpperCase());
                html += `<th>${formattedHeader}</th>`;
            });
            html += `</tr></thead><tbody>`;
            
            // Add table rows
            overview.forEach(row => {
                html += `<tr>`;
                headers.forEach(key => {
                    html += `<td>${row[key] || ''}</td>`;
                });
                html += `</tr>`;
            });
            html += `</tbody></table>`;
        }
        
        // Add MCA indicators section if available
        if (data.mcaIndicators || data.mca_indicators) {
            const indicators = data.mcaIndicators || data.mca_indicators;
            html += `<hr><h2>💡 Indicators of MCA (Merchant Cash Advance) Funding</h2>`;
            
            // Process each indicator
            if (Array.isArray(indicators)) {
                indicators.forEach((indicator, index) => {
                    html += `<h3>${index + 1}. ${indicator.title || 'Indicator'}</h3>`;
                    if (indicator.description) {
                        html += `<p>${indicator.description}</p>`;
                    }
                    if (indicator.items && Array.isArray(indicator.items)) {
                        html += `<ul>`;
                        indicator.items.forEach(item => {
                            html += `<li>${item}</li>`;
                        });
                        html += `</ul>`;
                    }
                });
            } else if (typeof indicators === 'object') {
                // If it's a single object with properties
                Object.keys(indicators).forEach(key => {
                    html += `<h3>${key}</h3>`;
                    if (typeof indicators[key] === 'string') {
                        html += `<p>${indicators[key]}</p>`;
                    } else if (Array.isArray(indicators[key])) {
                        html += `<ul>`;
                        indicators[key].forEach(item => {
                            html += `<li>${item}</li>`;
                        });
                        html += `</ul>`;
                    }
                });
            }
        }
        
        // Add funding sources if available
        if (data.fundingSources || data.funding_sources) {
            const sources = data.fundingSources || data.funding_sources;
            html += `<h3>Large/Unusual Deposits Followed by Structured Repayments</h3>`;
            html += `<table><thead><tr><th>Funder / Source</th><th>Amount</th><th>Frequency</th><th>Notes</th></tr></thead><tbody>`;
            
            sources.forEach(source => {
                html += `<tr>
                    <td><strong>${source.name || source.funder || ''}</strong></td>
                    <td>${source.amount || ''}</td>
                    <td>${source.frequency || ''}</td>
                    <td>${source.notes || ''}</td>
                </tr>`;
            });
            html += `</tbody></table>`;
        }
        
        // Add payment patterns if available
        if (data.paymentPatterns || data.payment_patterns) {
            const patterns = data.paymentPatterns || data.payment_patterns;
            html += `<h3>MCA Payment Patterns:</h3>`;
            html += `<ul>`;
            if (Array.isArray(patterns)) {
                patterns.forEach(pattern => {
                    html += `<li>${pattern}</li>`;
                });
            } else if (typeof patterns === 'string') {
                html += `<li>${patterns}</li>`;
            }
            html += `</ul>`;
        }
        
        // If we couldn't identify a specific structure, just display the JSON
        if (html === '<div class="mca-report">') {
            html += `<pre>${JSON.stringify(data, null, 2)}</pre>`;
        }
        
        html += '</div>';
        return html;
    }
    
    // Function to convert markdown to HTML
    function convertMarkdownToHTML(markdown) {
        if (!markdown) return '';
        
        let html = '<div class="mca-report">';
        
        // Split by lines
        const lines = markdown.split('\n');
        let inTable = false;
        let tableHeaders = [];
        let tableRows = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Handle headings
            if (line.startsWith('# ')) {
                html += `<h1>${line.substring(2)}</h1>`;
            } else if (line.startsWith('## ')) {
                html += `<h2>${line.substring(3)}</h2>`;
            } else if (line.startsWith('### ')) {
                html += `<h3>${line.substring(4)}</h3>`;
            } else if (line.startsWith('#### ')) {
                html += `<h4>${line.substring(5)}</h4>`;
            } else if (line.startsWith('##### ')) {
                html += `<h5>${line.substring(6)}</h5>`;
            } else if (line.startsWith('###### ')) {
                html += `<h6>${line.substring(7)}</h6>`;
            }
            // Handle horizontal rule
            else if (line === '---' || line === '***' || line === '___') {
                html += '<hr>';
            }
            // Handle tables
            else if (line.includes('|')) {
                if (!inTable) {
                    inTable = true;
                    tableHeaders = line.split('|')
                        .map(header => header.trim())
                        .filter(header => header !== '');
                    
                    // Skip the separator line
                    if (i + 1 < lines.length && lines[i + 1].includes('|-')) {
                        i++;
                    }
                } else if (!line.includes('|-')) {
                    tableRows.push(
                        line.split('|')
                            .map(cell => cell.trim())
                            .filter(cell => cell !== '')
                    );
                }
                
                // Check if this is the last line of the table
                if (i + 1 >= lines.length || !lines[i + 1].includes('|')) {
                    html += '<table><thead><tr>';
                    tableHeaders.forEach(header => {
                        html += `<th>${header}</th>`;
                    });
                    html += '</tr></thead><tbody>';
                    
                    tableRows.forEach(row => {
                        html += '<tr>';
                        row.forEach((cell, index) => {
                            if (index < tableHeaders.length) {
                                html += `<td>${cell}</td>`;
                            }
                        });
                        html += '</tr>';
                    });
                    
                    html += '</tbody></table>';
                    inTable = false;
                    tableHeaders = [];
                    tableRows = [];
                }
            }
            // Handle lists
            else if (line.startsWith('- ') || line.startsWith('* ')) {
                let j = i;
                html += '<ul>';
                while (j < lines.length && (lines[j].trim().startsWith('- ') || lines[j].trim().startsWith('* '))) {
                    html += `<li>${lines[j].trim().substring(2)}</li>`;
                    j++;
                }
                html += '</ul>';
                i = j - 1;
            }
            // Handle numbered lists
            else if (/^\d+\.\s/.test(line)) {
                let j = i;
                html += '<ol>';
                while (j < lines.length && /^\d+\.\s/.test(lines[j].trim())) {
                    html += `<li>${lines[j].trim().replace(/^\d+\.\s/, '')}</li>`;
                    j++;
                }
                html += '</ol>';
                i = j - 1;
            }
            // Handle paragraphs
            else if (line !== '') {
                html += `<p>${line}</p>`;
            }
        }
        
        updateButtonStates();
    }
    
    function showNoImagesMessage() {
        const noImagesMsg = document.createElement('p');
        noImagesMsg.className = 'no-images';
        noImagesMsg.textContent = 'No screenshots uploaded yet';
        imagePreviewContainer.appendChild(noImagesMsg);
    }
    
    function updateButtonStates() {
        const hasImages = uploadedImages.length > 0;
        sendButton.disabled = !hasImages;
        clearButton.disabled = !hasImages;
    }

        
// Function to convert markdown to HTML
function convertMarkdownToHTML(markdown) {
    if (!markdown) return '';
    
    let html = '<div class="mca-report">';
    
    // Split by lines
    const lines = markdown.split('\n');
    let inTable = false;
    let tableHeaders = [];
    let tableRows = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Handle headings
        if (line.startsWith('# ')) {
            html += `<h1>${line.substring(2)}</h1>`;
        } else if (line.startsWith('## ')) {
            html += `<h2>${line.substring(3)}</h2>`;
        } else if (line.startsWith('### ')) {
            html += `<h3>${line.substring(4)}</h3>`;
        } else if (line.startsWith('#### ')) {
            html += `<h4>${line.substring(5)}</h4>`;
        } else if (line.startsWith('##### ')) {
            html += `<h5>${line.substring(6)}</h5>`;
        } else if (line.startsWith('###### ')) {
            html += `<h6>${line.substring(7)}</h6>`;
        }
        // Handle horizontal rule
        else if (line === '---' || line === '***' || line === '___') {
            html += '<hr>';
        }
        // Handle tables
        else if (line.includes('|')) {
            if (!inTable) {
                inTable = true;
                tableHeaders = line.split('|')
                    .map(header => header.trim())
                    .filter(header => header !== '');
                
                // Skip the separator line
                if (i + 1 < lines.length && lines[i + 1].includes('|-')) {
                    i++;
                }
            } else if (!line.includes('|-')) {
                tableRows.push(
                    line.split('|')
                        .map(cell => cell.trim())
                        .filter(cell => cell !== '')
                );
            }
            
            // Check if this is the last line of the table
            if (i + 1 >= lines.length || !lines[i + 1].includes('|')) {
                html += '<table><thead><tr>';
                tableHeaders.forEach(header => {
                    html += `<th>${header}</th>`;
                });
                html += '</tr></thead><tbody>';
                
                tableRows.forEach(row => {
                    html += '<tr>';
                    row.forEach((cell, index) => {
                        if (index < tableHeaders.length) {
                            html += `<td>${cell}</td>`;
                        }
                    });
                    html += '</tr>';
                });
                
                html += '</tbody></table>';
                inTable = false;
                tableHeaders = [];
                tableRows = [];
            }
        }
        // Handle lists
        else if (line.startsWith('- ') || line.startsWith('* ')) {
            let j = i;
            html += '<ul>';
            while (j < lines.length && (lines[j].trim().startsWith('- ') || lines[j].trim().startsWith('* '))) {
                html += `<li>${lines[j].trim().substring(2)}</li>`;
                j++;
            }
            html += '</ul>';
            i = j - 1;
        }
        // Handle numbered lists
        else if (/^\d+\.\s/.test(line)) {
            let j = i;
            html += '<ol>';
            while (j < lines.length && /^\d+\.\s/.test(lines[j].trim())) {
                html += `<li>${lines[j].trim().replace(/^\d+\.\s/, '')}</li>`;
                j++;
            }
            html += '</ol>';
            i = j - 1;
        }
        // Handle paragraphs
        else if (line !== '') {
            html += `<p>${line}</p>`;
        }
    }
    
    updateButtonStates();
}

function showNoImagesMessage() {
    const noImagesMsg = document.createElement('p');
    noImagesMsg.className = 'no-images';
    noImagesMsg.textContent = 'No screenshots uploaded yet';
    imagePreviewContainer.appendChild(noImagesMsg);
}

function updateButtonStates() {
    const hasImages = uploadedImages.length > 0;
    sendButton.disabled = !hasImages;
    clearButton.disabled = !hasImages;
}

// Function to open full-screen view of text content
function openFullScreenView(content, isHTML = false) {
    // Create full-screen overlay
    const overlay = document.createElement('div');
    overlay.className = 'fullscreen-overlay';
    
    // Create container for content and controls
    const container = document.createElement('div');
    container.className = 'fullscreen-container';
    
    // Create controls container
    const controls = document.createElement('div');
    controls.className = 'fullscreen-controls';
    
    // Create font size controls
    const decreaseFontBtn = document.createElement('button');
    decreaseFontBtn.className = 'font-control-btn';
    decreaseFontBtn.innerHTML = 'A-';
    decreaseFontBtn.title = 'Decrease font size';
    
    const increaseFontBtn = document.createElement('button');
    increaseFontBtn.className = 'font-control-btn';
    increaseFontBtn.innerHTML = 'A+';
    increaseFontBtn.title = 'Increase font size';
    
    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-fullscreen-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.title = 'Close full screen view';
    
    // Current font size (in pixels)
    let currentFontSize = 16;
    
    let contentElement;
    if (isHTML) {
        contentElement = document.createElement('div');
        contentElement.className = 'fullscreen-html';
        // Inject styles for .mca-report if not already present
        if (!document.getElementById('fullscreen-mca-style')) {
            const style = document.createElement('style');
            style.id = 'fullscreen-mca-style';
            style.textContent = `
                .mca-report {
                    font-family: Arial, sans-serif;
                    line-height: 1.7;
                    background: #fff;
                    color: #222;
                    padding: 32px 24px;
                    border-radius: 12px;
                    box-shadow: 0 4px 24px rgba(0,0,0,0.08);
                    max-width: 900px;
                    margin: 0 auto;
                }
                .mca-report h1, .mca-report h2, .mca-report h3 { margin-top: 1.2em; }
                .mca-report table { width: 100%; border-collapse: collapse; margin: 1em 0; }
                .mca-report th, .mca-report td { border: 1px solid #ddd; padding: 8px; }
                .mca-report th { background: #f8f8f8; }
                .mca-report ul, .mca-report ol { margin-left: 2em; }
                .mca-report pre { background: #f5f5f5; padding: 12px; border-radius: 6px; }
            `;
            document.head.appendChild(style);
        }
        contentElement.innerHTML = content;
    } else {
        contentElement = document.createElement('pre');
        contentElement.className = 'fullscreen-text';
        contentElement.textContent = content;
        contentElement.style.fontSize = `${currentFontSize}px`;
    }
    
    // Add event listeners for font size controls (only for text)
    decreaseFontBtn.addEventListener('click', () => {
        if (!isHTML && currentFontSize > 8) {
            currentFontSize -= 2;
            contentElement.style.fontSize = `${currentFontSize}px`;
        }
    });
    
    increaseFontBtn.addEventListener('click', () => {
        if (!isHTML && currentFontSize < 36) {
            currentFontSize += 2;
            contentElement.style.fontSize = `${currentFontSize}px`;
        }
    });
    
    // Add event listener for close button
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
    });
    
    // Add escape key listener to close the overlay
    const escKeyHandler = (e) => {
        if (e.key === 'Escape') {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', escKeyHandler);
        }
    };
    document.addEventListener('keydown', escKeyHandler);
    
    // Assemble the UI
    controls.appendChild(decreaseFontBtn);
    controls.appendChild(increaseFontBtn);
    controls.appendChild(closeBtn);
    
    container.appendChild(controls);
    container.appendChild(contentElement);
    
    overlay.appendChild(container);
    document.body.appendChild(overlay);
}
