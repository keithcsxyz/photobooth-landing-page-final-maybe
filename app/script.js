document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const stripCanvas = document.getElementById('stripCanvas');
    const startButton = document.getElementById('startButton');
    const clearButton = document.getElementById('clearButton');
    const photoCountSelect = document.getElementById('photoCount');
    const photoStripContainer = document.getElementById('photoStripContainer');
    const colorOptions = document.querySelectorAll('.color-option');
    const filterSelect = document.getElementById('filterSelect');

    const stripCtx = stripCanvas.getContext('2d');
    const ctx = canvas.getContext('2d');

    let photosTaken = 0;
    let photosToTake = 1;
    let capturedPhotos = [];
    let selectedFrameColor = '#f5f7fa';
    let currentFilter = 'none'; // Store selected filter

    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            colorOptions.forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            selectedFrameColor = option.dataset.color;
        });
    });

    filterSelect.addEventListener('change', (event) => {
        currentFilter = event.target.value;
        video.style.filter = currentFilter;
    });

    async function initCamera() {
        try {
            const constraints = {
                video: {
                    facingMode: { ideal: 'user' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;

            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            };
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Camera error: " + err.message);
        }
    }

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

                    ctx.save();
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.translate(canvas.width, 0);
                    ctx.scale(-1, 1);
                    ctx.filter = currentFilter; // Apply filter here
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    ctx.filter = 'none';
                    ctx.restore();

                    const photoUrl = canvas.toDataURL('image/png');
                    capturedPhotos.push(photoUrl);
                    resolve();
                }
            }, 1000);
        });
    }

    function createPhotoStrip() {
        photoStripContainer.innerHTML = '';
        photoStripContainer.style.display = 'flex';

        const stripWidth = 300;
        const photoHeight = 225;
        const gap = 5;
        const sideMargin = 20;
        const topMargin = 50;
        const stripHeight = photoHeight * capturedPhotos.length + gap * (capturedPhotos.length - 1) + topMargin;

        stripCanvas.width = stripWidth;
        stripCanvas.height = stripHeight;

        stripCtx.fillStyle = selectedFrameColor;
        stripCtx.fillRect(0, 0, stripWidth, stripHeight);

        stripCtx.fillStyle = '#a5b4fc';
        stripCtx.fillRect(stripWidth * 0.2, 0, stripWidth * 0.6, 8);

        stripCtx.fillStyle = '#FFFFFF';
        stripCtx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
        stripCtx.textAlign = 'center';
        stripCtx.fillText('Photobooth', stripWidth / 2, 30);

        const loadPhotoPromises = capturedPhotos.map((photoUrl, index) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    const y = topMargin + index * (photoHeight + gap);
                    const aspectRatio = img.width / img.height;
                    let drawWidth = stripWidth - sideMargin * 2;
                    let drawHeight = drawWidth / aspectRatio;

                    if (drawHeight > photoHeight) {
                        drawHeight = photoHeight;
                        drawWidth = photoHeight * aspectRatio;
                    }

                    const xOffset = (stripWidth - drawWidth) / 2;
                    stripCtx.drawImage(img, xOffset, y, drawWidth, drawHeight);
                    resolve();
                };
                img.src = photoUrl;
            });
        });

        Promise.all(loadPhotoPromises).then(() => {
            const date = new Date().toLocaleDateString();
            stripCtx.fillStyle = '#FFFFFF';
            stripCtx.font = '12px "Segoe UI", Arial, sans-serif';
            stripCtx.fillText(date, stripWidth / 2, stripHeight - 35);

            const stripUrl = stripCanvas.toDataURL('image/png');
            const photoStrip = document.createElement('div');
            photoStrip.className = 'photo-strip';
            photoStrip.innerHTML = `
                <div class="photo-strip-title">Photobooth Strip</div>
                <img src="${stripUrl}" alt="Photo Strip">
                <button id="saveStripBtn" class="btn btn-custom w-100 mt-2">Save Photo Strip</button>
            `;
            photoStripContainer.appendChild(photoStrip);

            const saveStripBtn = document.getElementById('saveStripBtn');
            saveStripBtn.addEventListener('click', () => {
                const link = document.createElement('a');
                link.download = `photostrip_${Date.now()}.png`;
                link.href = stripUrl;
                link.click();
            });
        });
    }

    async function startPhotoSession() {
        photosTaken = 0;
        photosToTake = parseInt(photoCountSelect.value);
        capturedPhotos = [];
        startButton.disabled = true;
        photoStripContainer.style.display = 'none';

        while (photosTaken < photosToTake) {
            await takePicture();
            photosTaken++;

            if (photosTaken < photosToTake) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        createPhotoStrip();
        startButton.disabled = false;
    }

    function clearPhotos() {
        capturedPhotos = [];
        photoStripContainer.innerHTML = '';
        photoStripContainer.style.display = 'none';
    }

    startButton.addEventListener('click', startPhotoSession);
    clearButton.addEventListener('click', clearPhotos);

    initCamera();
});