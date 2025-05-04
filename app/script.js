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

  const filters = [
    { name: "None", value: "none" },
    { name: "Grayscale", value: "grayscale(100%)" },
    { name: "Sepia", value: "sepia(100%)" },
    { name: "Blur", value: "blur(3px)" },
    { name: "Brightness", value: "brightness(150%)" },
    { name: "Contrast", value: "contrast(200%)" },
    { name: "Hue Rotate", value: "hue-rotate(90deg)" },
    { name: "Invert", value: "invert(100%)" },
    { name: "Saturate", value: "saturate(300%)" },
  ];

  // Populate the dropdown
  filters.forEach((filter) => {
    const option = document.createElement("option");
    option.value = filter.value;
    option.textContent = filter.name;
    filterSelect.appendChild(option);
  });

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

  filterSelect.addEventListener("change", function () {
    currentFilter = this.value;
    video.style.filter = this.value;
    video.style.webkitFilter = this.value;
  });

  async function initCamera() {
    try {
      const constraints = {
        video: {
          facingMode: { ideal: "user" },
          width: { ideal: 640 },
          height: { ideal: 480 },
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

          console.log(currentFilter);

          // Draw video normally without CSS filter
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Apply fallback filter for iOS (if selected)
          if (currentFilter !== "none") {
            let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            imageData = applyFallbackFilter(imageData, currentFilter);
            ctx.putImageData(imageData, 0, 0);
          }

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

function applyFallbackFilter(imageData, filterType) {
  const data = imageData.data;

  switch (filterType) {
    case "none":
      // No filter applied, return as is
      break;

    case "grayscale(100%)":
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = data[i + 1] = data[i + 2] = avg;
      }
      break;

    case "sepia(100%)":
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i],
          g = data[i + 1],
          b = data[i + 2];
        data[i] = r * 0.393 + g * 0.769 + b * 0.189;
        data[i + 1] = r * 0.349 + g * 0.686 + b * 0.168;
        data[i + 2] = r * 0.272 + g * 0.534 + b * 0.131;
      }
      break;

    case "blur(3px)":
      // Basic blur effect using JS (not ideal for performance)
      console.warn(
        "Blur effect fallback may not work well in raw JS, use CSS if possible."
      );
      break;

    case "brightness(150%)":
      for (let i = 0; i < data.length; i += 4) {
        data[i] *= 1.5;
        data[i + 1] *= 1.5;
        data[i + 2] *= 1.5;
      }
      break;

    case "contrast(200%)":
      const factor = (259 * (200 + 255)) / (255 * (259 - 200));
      for (let i = 0; i < data.length; i += 4) {
        data[i] = factor * (data[i] - 128) + 128;
        data[i + 1] = factor * (data[i + 1] - 128) + 128;
        data[i + 2] = factor * (data[i + 2] - 128) + 128;
      }
      break;

    case "hue-rotate(90deg)":
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i],
          g = data[i + 1],
          b = data[i + 2];
        data[i] = g;
        data[i + 1] = b;
        data[i + 2] = r;
      }
      break;

    case "invert(100%)":
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];
        data[i + 1] = 255 - data[i + 1];
        data[i + 2] = 255 - data[i + 2];
      }
      break;

    case "saturate(300%)":
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
        data[i] = gray + (data[i] - gray) * 3;
        data[i + 1] = gray + (data[i + 1] - gray) * 3;
        data[i + 2] = gray + (data[i + 2] - gray) * 3;
      }
      break;
  }

  return imageData;
}
