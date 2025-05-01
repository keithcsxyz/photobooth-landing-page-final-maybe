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
    const timer = document.getElementById('timer');

    let photosTaken = 0;
    let photosToTake = 1;
    let capturedPhotos = [];
    let selectedFrameColor = '#f5f7fa';

    // Color selection
    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            colorOptions.forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            selectedFrameColor = option.dataset.color;
        });
    });

    // Filter selection
    filterSelect.addEventListener('change', (e) => {
        video.style.filter = e.target.value;
    });

    // Init camera
    async function initCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: 'user' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            });

            video.srcObject = stream;

            video.onloadedmetadata = () => {
                video.play();
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            };
        } catch (err) {
            console.error("Camera error:", err);
            alert("Camera access failed: " + err.message);
        }
    }

    function takePicture() {
        return new Promise((resolve) => {
            let count = 3;
            timer.textContent = count;
            timer.style.display = 'flex';

            const countdown = setInterval(() => {
                count--;
                if (count > 0) {
                    timer.textContent = count;
                } else {
                    clearInterval(countdown);
                    timer.style.display = 'none';

                    // Mobile fix: crop based on visible part
                    const vw = video.videoWidth;
                    const vh = video.videoHeight;
                    const displayW = video.clientWidth;
                    const displayH = video.clientHeight;

                    // Aspect ratio of video element vs stream
                    const aspectRatioDisplay = displayW / displayH;
                    const aspectRatioStream = vw / vh;

                    let sx = 0, sy = 0, sWidth = vw, sHeight = vh;

                    if (aspectRatioStream > aspectRatioDisplay) {
                        // Crop width
                        sWidth = vh * aspectRatioDisplay;
                        sx = (vw - sWidth) / 2;
                    } else {
                        // Crop height
                        sHeight = vw / aspectRatioDisplay;
                        sy = (vh - sHeight) / 2;
                    }

                    ctx.save();
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.translate(canvas.width, 0);
                    ctx.scale(-1, 1);
                    ctx.filter = filterSelect.value;
                    ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
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
        const gap = 1;
        const sideMargin = 20;
        const topMargin = 50;
        const stripHeight = photoHeight * capturedPhotos.length + gap * (capturedPhotos.length - 1) + topMargin;

        stripCanvas.width = stripWidth;
        stripCanvas.height = stripHeight;

        stripCtx.fillStyle = selectedFrameColor;
        stripCtx.fillRect(0, 0, stripWidth, stripHeight);

        stripCtx.fillStyle = '#a5b4fc';
        stripCtx.fillRect(stripWidth * 0.2, 0, stripWidth * 0.6, 8);

        stripCtx.fillStyle = '#374151';
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
            stripCtx.font = '14px "Segoe UI", Arial, sans-serif';
            stripCtx.fillStyle = '#9CA3AF';
            stripCtx.textAlign = 'center';
            stripCtx.fillText("By: KEITH | CAMILLE | JERICHO", stripWidth / 2, stripHeight - 15);

            const date = new Date().toLocaleDateString();
            stripCtx.fillStyle = '#6b7280';
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