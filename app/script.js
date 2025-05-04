document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById("video");
  const canvas = document.getElementById("canvas");
  const stripCanvas = document.getElementById("stripCanvas");
  const startButton = document.getElementById("startButton");
  const clearButton = document.getElementById("clearButton");
  const photoCountSelect = document.getElementById("photoCount");
  const photoStripContainer = document.getElementById("photoStripContainer");
  const colorOptions = document.querySelectorAll(".color-option");
  const filterSelect = document.getElementById("filterSelect");

  const stripCtx = stripCanvas.getContext("2d");
  const ctx = canvas.getContext("2d");

  let photosTaken = 0;
  let photosToTake = 1;
  let capturedPhotos = [];
  let selectedFrameColor = "#f5f7fa";
  let currentFilter = "none"; // Store selected filter
  let isMirrored = true; // default to mirrored

  const toggleMirrorBtn = document.getElementById("toggleMirrorBtn");

  toggleMirrorBtn.addEventListener("click", () => {
    isMirrored = !isMirrored;
    toggleMirrorBtn.textContent = `Mirror: ${isMirrored ? "On" : "Off"}`;
    updateVideoMirror();
  });

  function updateVideoMirror() {
    if (isMirrored) {
      video.style.transform = "scaleX(-1)";
    } else {
      video.style.transform = "scaleX(1)";
    }
  }

  colorOptions.forEach((option) => {
    option.addEventListener("click", () => {
      colorOptions.forEach((o) => o.classList.remove("selected"));
      option.classList.add("selected");
      selectedFrameColor = option.dataset.color;
    });
  });

  const customColorInput = document.getElementById("customColor");
  customColorInput.addEventListener("input", (event) => {
    selectedFrameColor = event.target.value;

    // Optionally, deselect all preset colors for clarity
    colorOptions.forEach((o) => o.classList.remove("selected"));
  });

  filterSelect.addEventListener("change", () => {
    const selectedFilter = filterSelect.value;
    currentFilter = selectedFilter; // Save the current filter for canvas use
    video.style.webkitFilter = selectedFilter; // ✅ Apply for iOS Safari
    video.style.filter = selectedFilter; // ✅ Apply for most browsers
  });

  async function initCamera() {
    try {
      const constraints = {
        video: {
          facingMode: { ideal: "user" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream;

      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        updateVideoMirror();
      };
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Camera error: " + err.message);
    }
  }

  function takePicture() {
    return new Promise((resolve) => {
      let count = 3;
      const timer = document.getElementById("timer");
      timer.textContent = count;
      timer.style.display = "flex";

      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      // Match canvas size to the live video preview's aspect ratio and size
      canvas.width = video.clientWidth;
      canvas.height = video.clientHeight;

      const countdown = setInterval(() => {
        count--;
        if (count > 0) {
          timer.textContent = count;
        } else {
          clearInterval(countdown);
          timer.style.display = "none";

          ctx.save();
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (isMirrored) {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
          }

          ctx.filter = currentFilter; // Apply filter here
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          ctx.filter = "none";
          ctx.restore();

          const photoUrl = canvas.toDataURL("image/png");
          capturedPhotos.push(photoUrl);
          resolve();
        }
      }, 1000);
    });
  }

  function createPhotoStrip() {
    photoStripContainer.innerHTML = "";
    photoStripContainer.style.display = "flex";

    const stripWidth = 400;
    const photoHeight = 300;
    const gap = -30; //increase to decrease gap between images
    const sideMargin = 30;
    const topMargin = 50;

    // Define margin for left, right, and bottom of the last image
    const imageMargin = 1; // 10px margin on left/right and bottom of last image

    const stripHeight =
      photoHeight * capturedPhotos.length +
      gap * (capturedPhotos.length - 1) +
      topMargin;

    stripCanvas.width = stripWidth;
    stripCanvas.height = stripHeight;

    stripCtx.fillStyle = selectedFrameColor;
    stripCtx.fillRect(0, 0, stripWidth, stripHeight);

    stripCtx.fillStyle = "#a5b4fc";
    stripCtx.fillRect(stripWidth * 0.2, 0, stripWidth * 0.6, 8);

    stripCtx.fillStyle = "#A52A2A";
    stripCtx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
    stripCtx.textAlign = "center";
    stripCtx.fillText("Photobooth", stripWidth / 2, 30);

    const loadPhotoPromises = capturedPhotos.map((photoUrl, index) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const aspectRatio = img.width / img.height;

          let drawWidth = stripWidth - sideMargin * 2; // Subtract margins for left/right
          let drawHeight = drawWidth / aspectRatio;

          if (drawHeight > photoHeight) {
            drawHeight = photoHeight;
            drawWidth = photoHeight * aspectRatio;
          }

          const xOffset = (stripWidth - drawWidth) / 2; // Center the image horizontally
          const y = topMargin + index * (photoHeight + gap);

          // Only apply margin to the last image's bottom
          const bottomMargin =
            index === capturedPhotos.length - 1 ? imageMargin : 0;

          stripCtx.drawImage(img, xOffset, y, drawWidth, drawHeight);

          // Apply bottom margin to the last image
          resolve();
        };
        img.src = photoUrl;
      });
    });

    Promise.all(loadPhotoPromises).then(() => {
      const date = new Date().toLocaleDateString();
      stripCtx.fillStyle = "#A52A2A";
      stripCtx.font = '11px "Single Day", cursive;';
      stripCtx.fillText(date, stripWidth / 2, stripHeight - 15);

      const stripUrl = stripCanvas.toDataURL("image/png");
      const photoStrip = document.createElement("div");
      photoStrip.className = "photo-strip";
      photoStrip.innerHTML = `
      <div class="photo-strip-title">Photobooth Strip</div>
      <img src="${stripUrl}" alt="Photo Strip">
      <button id="saveStripBtn" class="btn btn-custom w-100 mt-3">Save Photo Strip</button>
    `;
      photoStripContainer.appendChild(photoStrip);

      const saveStripBtn = document.getElementById("saveStripBtn");
      saveStripBtn.addEventListener("click", () => {
        const link = document.createElement("a");
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
    photoStripContainer.style.display = "none";

    while (photosTaken < photosToTake) {
      await takePicture();
      photosTaken++;

      if (photosTaken < photosToTake) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    createPhotoStrip();
    startButton.disabled = false;
  }

  function clearPhotos() {
    capturedPhotos = [];
    photoStripContainer.innerHTML = "";
    photoStripContainer.style.display = "none";
  }

  startButton.addEventListener("click", startPhotoSession);
  clearButton.addEventListener("click", clearPhotos);

  initCamera();
});
