document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const stripCanvas = document.getElementById('stripCanvas');
    const startButton = document.getElementById('startButton');
    const clearButton = document.getElementById('clearButton');
    const photoCountSelect = document.getElementById('photoCount');
    const photoStripContainer = document.getElementById('photoStripContainer');
    const colorOptions = document.querySelectorAll('.color-option');
    const stripCtx = stripCanvas.getContext('2d');
    const ctx = canvas.getContext('2d');
    
    let photosTaken = 0;
    let photosToTake = 1;
    let capturedPhotos = [];
    let selectedFrameColor = '#f5f7fa'; // Default frame background color

    // Handle color selection for the photo booth frame
    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            colorOptions.forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            selectedFrameColor = option.dataset.color;
        });
    });

    // Initialize camera
    async function initCamera() {
        try {
            const constraints = {
                video: {
                    facingMode: { ideal: 'user' }, // Front-facing camera
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };

            // Attempt to access the camera
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;

            // Set canvas dimensions once video metadata is loaded
            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            };
        } catch (err) {
            console.error("Error accessing camera:", err);

            // Fallback for unsupported constraints
            if (err.name === "OverconstrainedError") {
                alert("The requested camera settings are not supported by your device.");
            } else if (err.name === "NotAllowedError") {
                alert("Camera access was denied. Please allow camera permissions.");
            } else if (err.name === "NotFoundError") {
                alert("No camera found on this device.");
            } else {
                alert("An unexpected error occurred while accessing the camera.");
            }
        }
    }

    // Take picture with countdown
    function takePicture() {
        return new Promise((resolve) => {
            let count = 3;
            const timer = document.getElementById('timer');
            timer.textContent = count;
            timer.style.display = 'flex';

            const countdown = setInterval(() => {
                count--;
                if (count > 0) {
                    timer.textContent = count;
                } else {
                    clearInterval(countdown);
                    timer.style.display = 'none';

                    // Correct the mirroring effect in the captured photo
                    ctx.save();
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    
                    // Flip horizontally to counter the CSS transform
                    ctx.translate(canvas.width, 0);
                    ctx.scale(-1, 1);
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    ctx.restore();
                    
                    const photoUrl = canvas.toDataURL('image/png');
                    capturedPhotos.push(photoUrl);
                    resolve();
                }
            }, 1000);
        });
    }

    // Create photo strip from captured photos
    function createPhotoStrip() {
        // Clear previous photo strips
        photoStripContainer.innerHTML = '';
        photoStripContainer.style.display = 'flex';
    
        // Set strip dimensions based on number of photos
        const stripWidth = 300; // Total width of the strip
        const photoHeight = 225; // Using 4:3 ratio (300 × 0.75 = 225)
        const gap = 1; // Set a small gap (e.g., 5px) between photos
        const sideMargin = 20; // Space on the left and right of each photo
        const topMargin = 50; // Space at the top of the strip
        const stripHeight = photoHeight * capturedPhotos.length + gap * (capturedPhotos.length - 1) + topMargin;
    
        // Set canvas size
        stripCanvas.width = stripWidth;
        stripCanvas.height = stripHeight;
    
        // Draw the selected background color
        stripCtx.fillStyle = selectedFrameColor;
        stripCtx.fillRect(0, 0, stripWidth, stripHeight);
    
        // Draw header
        const gradientHeight = 8;
        stripCtx.fillStyle = '#a5b4fc';
        stripCtx.fillRect(stripWidth * 0.2, 0, stripWidth * 0.6, gradientHeight);
    
        // Draw title
        stripCtx.fillStyle = '#374151';
        stripCtx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
        stripCtx.textAlign = 'center';
        stripCtx.fillText('Photobooth', stripWidth / 2, 30);
    
        // Load and draw each photo
        const loadPhotoPromises = capturedPhotos.map((photoUrl, index) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    const y = topMargin + index * (photoHeight + gap); // Add top margin for the first image and gap for subsequent images
                    
                    // Maintain aspect ratio when drawing the image
                    const aspectRatio = img.width / img.height;
                    let drawWidth = stripWidth - sideMargin * 2; // Reduce width for side margins
                    let drawHeight = drawWidth / aspectRatio;
                    
                    // If the height is too tall, constrain to photoHeight
                    if (drawHeight > photoHeight) {
                        drawHeight = photoHeight;
                        drawWidth = photoHeight * aspectRatio;
                    }
                    
                    // Center the image horizontally with side margins
                    const xOffset = (stripWidth - drawWidth) / 2;
                    stripCtx.drawImage(img, xOffset, y, drawWidth, drawHeight);
                    
                    resolve();
                };
                img.src = photoUrl;
            });
        });
    
        // After all photos are drawn
        Promise.all(loadPhotoPromises).then(() => {
            // Add watermark at the bottom
            stripCtx.font = '14px "Segoe UI", Arial, sans-serif';
            stripCtx.fillStyle = '#9CA3AF';
            stripCtx.textAlign = 'center';
            stripCtx.fillText("By: KEITH | CAMILLE | JERICHO", stripWidth / 2, stripHeight - 15);
    
            // Draw date
            const date = new Date().toLocaleDateString();
            stripCtx.fillStyle = '#6b7280';
            stripCtx.font = '12px "Segoe UI", Arial, sans-serif';
            stripCtx.fillText(date, stripWidth / 2, stripHeight - 35);
    
            // Create final strip image
            const stripUrl = stripCanvas.toDataURL('image/png');
    
            // Create photo strip element
            const photoStrip = document.createElement('div');
            photoStrip.className = 'photo-strip';
            photoStrip.innerHTML = `
                <div class="photo-strip-title">Photobooth Strip</div>
                <img src="${stripUrl}" alt="Photo Strip">
                <button id="saveStripBtn" class="btn btn-custom w-100 mt-2">Save Photo Strip</button>
            `;
            photoStripContainer.appendChild(photoStrip);
    
            // Add save functionality
            const saveStripBtn = document.getElementById('saveStripBtn');
            saveStripBtn.addEventListener('click', () => {
                const link = document.createElement('a');
                link.download = `photostrip_${Date.now()}.png`;
                link.href = stripUrl;
                link.click();
            });
        });
    }

    // Start photo session
    async function startPhotoSession() {
        photosTaken = 0;
        photosToTake = parseInt(photoCountSelect.value);
        capturedPhotos = [];
        startButton.disabled = true;
        photoStripContainer.style.display = 'none';

        while (photosTaken < photosToTake) {
            await takePicture();
            photosTaken++;

            // Add small delay between photos
            if (photosTaken < photosToTake) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // Create photo strip once all photos are taken
        createPhotoStrip();
        startButton.disabled = false;
    }

    // Clear all photos
    function clearPhotos() {
        capturedPhotos = [];
        photoStripContainer.innerHTML = '';
        photoStripContainer.style.display = 'none';
    }

    // Event listeners
    startButton.addEventListener('click', startPhotoSession);
    clearButton.addEventListener('click', clearPhotos);

    // Initialize camera on page load
    initCamera();
});



// Get references to the video and filter dropdown
const video = document.getElementById('video');
const filterSelect = document.getElementById('filterSelect');

// Apply the selected filter to the video
filterSelect.addEventListener('change', (event) => {
    const selectedFilter = event.target.value;
    video.style.filter = selectedFilter; // Apply the filter to the video element
});

// Ensure the filter is applied to the captured photo
const canvas = document.getElementById('canvas');
const startButton = document.getElementById('startButton');

startButton.addEventListener('click', () => {
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Apply the filter to the canvas before drawing the video frame
    context.filter = video.style.filter;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Display the captured photo (you can customize this part)
    const photoStripContainer = document.getElementById('photoStripContainer');
    const img = document.createElement('img');
    img.src = canvas.toDataURL('image/png');
    img.classList.add('photo-strip');
    photoStripContainer.appendChild(img);
    photoStripContainer.style.display = 'flex';
});