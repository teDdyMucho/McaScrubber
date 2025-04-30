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
    const webhookUrl = 'https://primary-production-c8d0.up.railway.app/webhook/edbc7b39-04dc-4cc6-a8d0-b47d0c9c853f';
    
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
        
        // Prepare data for webhook
        const formData = new FormData();
        
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
        
        // Send data to webhook
        fetch(webhookUrl, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            // Check if the response is JSON or text
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return response.json().then(data => ({ isJson: true, data }));
            } else {
                return response.text().then(text => ({ isJson: false, data: text }));
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
            showResponse('Failed to send images to webhook. Please try again.', false);
            console.error('Error sending images to webhook:', error);
            
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
        
        // Clear previous response and add new one
        responseContainer.innerHTML = '';
        responseContainer.appendChild(responseContent);
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
});
