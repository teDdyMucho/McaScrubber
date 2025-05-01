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
    
    // Webhook URL for n8n
    const webhookUrl = 'https://primary-production-166e.up.railway.app/webhook-test/75c06d22-e3bb-46b6-a96e-c16980992a38';
    
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
        
        const imagePreview = document.createElement('div');
        imagePreview.className = 'image-preview';
        
        const img = document.createElement('img');
        img.src = imageData;
        img.alt = imageName || 'Uploaded image';
        
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
        
        // Prepare JSON data instead of FormData
        const jsonData = {
            aiPrompt: aiPrompt,
            images: uploadedImages.map((image, index) => ({
                name: image.name || `screenshot_${index}.png`,
                data: image.data,  // Already base64 encoded
                type: image.data.split(',')[0].split(':')[1].split(';')[0]
            }))
        };
        
        // Set up headers for JSON
        const headers = { 
            ...authHeaders,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        // Send JSON data to webhook
        fetch(webhookUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(jsonData),
            mode: 'cors'
        })
        .then(response => {
            console.log('Response status:', response.status);
            console.log('Response headers:', [...response.headers.entries()]);
            
            // Check if response is ok (status in the range 200-299)
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(`HTTP error ${response.status}: ${text}`);
                });
            }
            
            // Check if the response is JSON or text
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return response.json().then(data => {
                    console.log('Response data (JSON):', data);
                    return { isJson: true, data };
                });
            } else {
                return response.text().then(text => {
                    console.log('Response data (Text):', text);
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
            
            // Log request details for debugging
            console.log('Request URL:', webhookUrl);
            console.log('Request headers:', headers);
            console.log('FormData entries:', [...formData.entries()].map(entry => {
                // Don't log the full blob data, just the name and type
                if (entry[1] instanceof Blob) {
                    return [entry[0], `Blob(${entry[1].type}, ${entry[1].size} bytes)`];
                }
                return entry;
            }));
            
            // Reset button state
            sendButton.disabled = false;
            sendButton.textContent = 'Send to n8n';
        });
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
        
        if (isJson && typeof data === 'object') {
            responseContent.textContent = JSON.stringify(data, null, 2);
        } else {
            // Handle text response
            responseContent.textContent = data;
        }
        
        // Create view button for full-screen mode
        const viewButton = document.createElement('button');
        viewButton.className = 'view-btn';
        viewButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"></path><path d="M9 21H3v-6"></path><path d="M21 3l-7 7"></path><path d="M3 21l7-7"></path></svg>';
        viewButton.title = 'View full screen';
        viewButton.addEventListener('click', () => openFullScreenView(responseContent.textContent));
        
        // Create a wrapper for the response content and view button
        const responseWrapper = document.createElement('div');
        responseWrapper.className = 'response-wrapper';
        
        // Clear previous response and add new one with the view button
        responseContainer.innerHTML = '';
        responseWrapper.appendChild(responseContent);
        responseWrapper.appendChild(viewButton);
        responseContainer.appendChild(responseWrapper);
    }
    
    function clearAllImages() {
        uploadedImages.length = 0;
        imagePreviewContainer.innerHTML = '';
        showNoImagesMessage();
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
    function openFullScreenView(content) {
        // Create full-screen overlay
        const overlay = document.createElement('div');
        overlay.className = 'fullscreen-overlay';
        
        // Create container for content and controls
        const container = document.createElement('div');
        container.className = 'fullscreen-container';
        
        // Create text display area
        const textDisplay = document.createElement('pre');
        textDisplay.className = 'fullscreen-text';
        textDisplay.textContent = content;
        
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
        let currentFontSize = 14;
        
        // Apply initial font size
        textDisplay.style.fontSize = `${currentFontSize}px`;
        
        // Add event listeners for font size controls
        decreaseFontBtn.addEventListener('click', () => {
            if (currentFontSize > 8) {
                currentFontSize -= 2;
                textDisplay.style.fontSize = `${currentFontSize}px`;
            }
        });
        
        increaseFontBtn.addEventListener('click', () => {
            if (currentFontSize < 36) {
                currentFontSize += 2;
                textDisplay.style.fontSize = `${currentFontSize}px`;
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
        container.appendChild(textDisplay);
        
        overlay.appendChild(container);
        document.body.appendChild(overlay);
    }
});
