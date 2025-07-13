let videoPath = null;
let audioPath = null;
let outputPath = null;

// Trim mode variables
let trimVideoPath = null;
let trimOutputPath = null;
let videoDuration = null;
let currentMode = 'merge';

// Timeline state
let isDragging = false;
let dragHandle = null;
let startTime = 0;
let endTime = 0;
let timelineWidth = 0;
let frameExtractionTimeout = null;
let activeExtractions = new Set();
let frameQueue = [];
let isProcessingQueue = false;

// Cursor trail and effects
let mouseX = 0;
let mouseY = 0;

// Mode switching
function switchMode(mode) {
    currentMode = mode;

    // Update button states
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${mode}-mode-btn`).classList.add('active');

    // Show/hide interfaces
    document.getElementById('merge-interface').style.display = mode === 'merge' ? 'block' : 'none';
    document.getElementById('trim-interface').style.display = mode === 'trim' ? 'block' : 'none';

    // Hide progress section when switching modes
    document.getElementById('progress-section').style.display = 'none';

    // Reset workflow when switching to merge mode
    if (mode === 'merge') {
        resetWorkflow();
    }
}

function initCursor() {
    // Update cursor position and create trail
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        // Create trail effect
        if (Math.random() > 0.7) { // Reduce frequency for subtlety
            createTrail(mouseX, mouseY);
        }
    });

    // Click star explosion effect
    document.addEventListener('click', (e) => {
        createStarExplosion(e.clientX, e.clientY);
    });
}

function createTrail(x, y) {
    const trail = document.createElement('div');
    trail.className = 'cursor-trail';
    trail.style.left = (x - 2) + 'px';
    trail.style.top = (y - 2) + 'px';
    document.body.appendChild(trail);

    // Remove trail after animation
    setTimeout(() => {
        if (trail.parentNode) {
            trail.parentNode.removeChild(trail);
        }
    }, 800);
}

function createStarExplosion(x, y) {
    const starCount = 12; // Number of stars in explosion
    const colors = ['#ffffff', '#b3d9ff', '#ffd9b3', '#ffb3d9', '#d9b3ff', '#00d4ff'];

    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'explosion-star';

        // Random color from our palette
        star.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

        // Random size variation
        const size = Math.random() * 2 + 2; // 2-4px
        star.style.width = size + 'px';
        star.style.height = size + 'px';

        // Calculate random direction for each star
        const angle = (360 / starCount) * i + (Math.random() - 0.5) * 30; // Spread evenly with some randomness
        const distance = Math.random() * 80 + 40; // Random distance 40-120px
        const radian = angle * (Math.PI / 180);

        const endX = x + Math.cos(radian) * distance;
        const endY = y + Math.sin(radian) * distance;

        // Set initial position at click point
        star.style.left = x + 'px';
        star.style.top = y + 'px';

        // Add to page
        document.body.appendChild(star);

        // Animate to end position
        star.style.transition = 'all 1.2s ease-out';

        // Small delay to ensure initial position is set
        setTimeout(() => {
            star.style.left = endX + 'px';
            star.style.top = endY + 'px';
        }, 10);

        // Remove star after animation
        setTimeout(() => {
            if (star.parentNode) {
                star.parentNode.removeChild(star);
            }
        }, 1200);
    }
}

// Create animated starfield
function createStars() {
    const starsContainer = document.getElementById('stars');
    const starCount = 150;

    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.animationDelay = Math.random() * 3 + 's';
        star.style.animationDuration = (Math.random() * 2 + 2) + 's';

        // Random star sizes and colors
        const size = Math.random() * 3 + 1;
        star.style.width = size + 'px';
        star.style.height = size + 'px';

        // Add slight color variation
        const colors = ['#ffffff', '#b3d9ff', '#ffd9b3', '#ffb3d9', '#d9b3ff'];
        star.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

        starsContainer.appendChild(star);
    }
}

// Initialize stars and cursor when page loads
window.addEventListener('load', () => {
    createStars();
    initCursor();
    initTimeline();

    // Initialize workflow
    resetWorkflow();
});

async function selectVideo() {
    const path = await window.electronAPI.selectVideoFile();
    if (path) {
        videoPath = path;
        document.getElementById('video-path').textContent = path;
        document.getElementById('video-section').classList.add('selected');

        // Update workflow steps
        completeStep(1);
        activateStep(2);

        // Enable audio selection and auto-trigger it
        const audioBtn = document.getElementById('audio-btn');
        audioBtn.disabled = false;
        document.getElementById('audio-path').textContent = 'Click to select audio file';

        // Optional: Auto-open audio dialog after a short delay
        setTimeout(() => {
            if (!audioPath) { // Only if user hasn't selected audio yet
                selectAudio();
            }
        }, 500);
    }
}

async function selectAudio() {
    const path = await window.electronAPI.selectAudioFile();
    if (path) {
        audioPath = path;
        document.getElementById('audio-path').textContent = path;
        document.getElementById('audio-section').classList.add('selected');

        // Update workflow steps
        completeStep(2);
        activateStep(3);

        // Enable output selection and auto-trigger it
        const outputBtn = document.getElementById('output-btn');
        outputBtn.disabled = false;
        document.getElementById('output-path').textContent = 'Click to choose output location';

        // Optional: Auto-open output dialog after a short delay
        setTimeout(() => {
            if (!outputPath) { // Only if user hasn't selected output yet
                selectOutput();
            }
        }, 500);
    }
}

async function selectOutput() {
    const path = await window.electronAPI.selectOutputFile();
    if (path) {
        outputPath = path;
        document.getElementById('output-path').textContent = path;
        document.getElementById('output-section').classList.add('selected');

        // Update workflow steps
        completeStep(3);
        activateStep(4);

        // Enable combine button
        updateCombineButton();
    }
}

function completeStep(stepNumber) {
    const step = document.getElementById(`step-${stepNumber}`);
    step.classList.remove('active', 'disabled');
    step.classList.add('completed');
}

function activateStep(stepNumber) {
    const step = document.getElementById(`step-${stepNumber}`);
    step.classList.remove('disabled', 'completed');
    step.classList.add('active');

    // Scroll the active step into view
    setTimeout(() => {
        step.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }, 100);
}

function resetWorkflow() {
    // Reset all steps to initial state
    for (let i = 1; i <= 4; i++) {
        const step = document.getElementById(`step-${i}`);
        step.classList.remove('active', 'completed');
        if (i > 1) {
            step.classList.add('disabled');
        }
    }

    // Reset step 1 as active
    document.getElementById('step-1').classList.add('active');

    // Reset button states
    document.getElementById('audio-btn').disabled = true;
    document.getElementById('output-btn').disabled = true;
    document.getElementById('combine-btn').disabled = true;

    // Reset file paths
    videoPath = null;
    audioPath = null;
    outputPath = null;

    // Reset UI text
    document.getElementById('video-path').textContent = 'No video selected';
    document.getElementById('audio-path').textContent = 'Select video first';
    document.getElementById('output-path').textContent = 'Select audio first';

    // Remove selected classes
    document.getElementById('video-section').classList.remove('selected');
    document.getElementById('audio-section').classList.remove('selected');
    document.getElementById('output-section').classList.remove('selected');
}

function updateCombineButton() {
    const combineBtn = document.getElementById('combine-btn');
    if (videoPath && audioPath && outputPath) {
        combineBtn.disabled = false;
    } else {
        combineBtn.disabled = true;
    }
}

async function combineFiles() {
    if (!videoPath || !audioPath || !outputPath) {
        alert('Please select all required files');
        return;
    }

    const combineBtn = document.getElementById('combine-btn');
    const progressSection = document.getElementById('progress-section');
    const progressFill = document.getElementById('progress-fill');
    const statusMessage = document.getElementById('status-message');

    combineBtn.disabled = true;
    progressSection.style.display = 'block';
    progressFill.style.width = '0%';
    statusMessage.textContent = 'Initializing...';
    statusMessage.className = 'status-message';

    try {
        const result = await window.electronAPI.combineFiles({
            videoPath: videoPath,
            audioPath: audioPath,
            outputPath: outputPath
        });

        if (result.success) {
            progressFill.style.width = '100%';
            statusMessage.textContent = result.message;
            statusMessage.className = 'status-message success';

            // Show option to trim the newly created file
            showTrimOption(outputPath);
        }
    } catch (error) {
        statusMessage.textContent = `Error: ${error.error || error.message}`;
        statusMessage.className = 'status-message error';
        progressFill.style.width = '0%';
    } finally {
        combineBtn.disabled = false;
    }
}

// Store the file path globally to avoid HTML string issues
let pendingTrimFilePath = null;

function showTrimOption(mergedFilePath) {
    // Store the path globally to avoid escaping issues
    pendingTrimFilePath = mergedFilePath;

    // Create and show trim option dialog
    const trimOptionDialog = document.createElement('div');
    trimOptionDialog.className = 'trim-option-dialog';
    trimOptionDialog.innerHTML = `
    <div class="trim-option-content">
      <div class="trim-option-header">
        <h3>Merge Complete!</h3>
        <p>Would you like to trim your newly created video?</p>
      </div>
      <div class="trim-option-buttons">
        <button class="trim-option-btn secondary" onclick="dismissTrimOption()">
          Continue
        </button>
        <button class="trim-option-btn primary" onclick="startTrimWorkflow()">
          Trim Video
        </button>
      </div>
    </div>
  `;

    document.body.appendChild(trimOptionDialog);

    // Animate in
    setTimeout(() => {
        trimOptionDialog.classList.add('show');
    }, 100);
}

function dismissTrimOption() {
    const dialog = document.querySelector('.trim-option-dialog');
    if (dialog) {
        dialog.classList.remove('show');
        setTimeout(() => {
            dialog.remove();
            pendingTrimFilePath = null; // Clear the stored path
        }, 300);
    }
}

async function startTrimWorkflow() {
    if (!pendingTrimFilePath) {
        console.error('No pending trim file path found');
        return;
    }

    const filePath = pendingTrimFilePath;
    dismissTrimOption();

    // Switch to trim mode
    switchMode('trim');

    // Auto-load the merged file
    await loadVideoForTrim(filePath);

    // Scroll to trim interface smoothly
    setTimeout(() => {
        document.getElementById('trim-interface').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }, 300);
}

async function loadVideoForTrim(videoPath) {
    if (!videoPath) return;

    // Set the video path and update UI
    trimVideoPath = videoPath;
    document.getElementById('trim-video-path').textContent = videoPath;
    document.getElementById('trim-video-section').classList.add('selected');

    // Get video duration and initialize
    try {
        const result = await window.electronAPI.getVideoDuration(videoPath);
        if (result.success) {
            videoDuration = result.duration;
            const minutes = Math.floor(videoDuration / 60);
            const seconds = (videoDuration % 60).toFixed(1);
            document.getElementById('video-duration-display').textContent =
                `Duration: ${minutes}:${seconds.padStart(4, '0')} (${videoDuration.toFixed(1)}s)`;

            // Show all trim interface sections
            document.getElementById('video-info').style.display = 'block';
            document.getElementById('trim-settings-section').style.display = 'block';
            document.getElementById('trim-output-section').style.display = 'block';

            // Initialize timeline
            initializeTimeline();

            // Show success message
            const statusMessage = document.getElementById('status-message');
            statusMessage.textContent = 'Video loaded successfully! Ready to trim.';
            statusMessage.className = 'status-message success';

            // Ensure progress section is visible for the message
            document.getElementById('progress-section').style.display = 'block';
        }
    } catch (error) {
        console.error('Error getting video duration:', error);
        const statusMessage = document.getElementById('status-message');
        statusMessage.textContent = 'Error loading video for trimming';
        statusMessage.className = 'status-message error';
        document.getElementById('progress-section').style.display = 'block';
    }

    updateTrimButton();
}

// Listen for progress updates
window.electronAPI.onProgressUpdate((event, data) => {
    const progressFill = document.getElementById('progress-fill');
    const statusMessage = document.getElementById('status-message');
    const cancelBtn = document.getElementById('cancel-btn');

    // Store operation ID for cancellation
    if (data.operationId && data.status === 'started') {
        currentOperationId = data.operationId;
    }

    if (data.percent !== undefined) {
        progressFill.style.width = `${data.percent}%`;
    }

    statusMessage.textContent = data.message;

    if (data.status === 'error' || data.status === 'cancelled') {
        statusMessage.className = 'status-message error';
        cancelBtn.style.display = 'none';
    } else if (data.status === 'completed') {
        statusMessage.className = 'status-message success';
        cancelBtn.style.display = 'none';
    } else {
        statusMessage.className = 'status-message';
    }
});

// Trim mode functions
async function selectTrimVideo() {
    const path = await window.electronAPI.selectVideoFile();
    if (path) {
        trimVideoPath = path;
        document.getElementById('trim-video-path').textContent = path;
        document.getElementById('trim-video-section').classList.add('selected');

        // Get video duration
        try {
            const result = await window.electronAPI.getVideoDuration(path);
            if (result.success) {
                videoDuration = result.duration;
                const minutes = Math.floor(videoDuration / 60);
                const seconds = (videoDuration % 60).toFixed(1);
                document.getElementById('video-duration-display').textContent =
                    `Duration: ${minutes}:${seconds.padStart(4, '0')} (${videoDuration.toFixed(1)}s)`;
                document.getElementById('video-info').style.display = 'block';
                document.getElementById('trim-settings-section').style.display = 'block';
                document.getElementById('trim-output-section').style.display = 'block';

                // Initialize timeline
                initializeTimeline();
            }
        } catch (error) {
            console.error('Error getting video duration:', error);
        }

        updateTrimButton();
    }
}

async function selectTrimOutput() {
    const path = await window.electronAPI.selectOutputFile();
    if (path) {
        trimOutputPath = path;
        document.getElementById('trim-output-path').textContent = path;
        document.getElementById('trim-output-section').classList.add('selected');
        updateTrimButton();
    }
}

function updateTrimButton() {
    const trimBtn = document.getElementById('trim-btn');
    if (trimVideoPath && trimOutputPath) {
        trimBtn.disabled = false;
    } else {
        trimBtn.disabled = true;
    }
}

async function trimVideo() {
    if (!trimVideoPath || !trimOutputPath) {
        alert('Please select video file and output location');
        return;
    }

    // Validation
    if (startTime >= videoDuration) {
        alert('Start time cannot be greater than or equal to video duration');
        return;
    }

    if (endTime > videoDuration) {
        alert('End time cannot be greater than video duration');
        return;
    }

    if (startTime >= endTime) {
        alert('Start time must be less than end time');
        return;
    }

    const trimBtn = document.getElementById('trim-btn');
    const progressSection = document.getElementById('progress-section');
    const progressFill = document.getElementById('progress-fill');
    const statusMessage = document.getElementById('status-message');

    trimBtn.disabled = true;
    progressSection.style.display = 'block';
    progressFill.style.width = '0%';
    statusMessage.textContent = 'Initializing trim...';
    statusMessage.className = 'status-message';

    try {
        const result = await window.electronAPI.trimVideo({
            videoPath: trimVideoPath,
            outputPath: trimOutputPath,
            startTime: startTime > 0 ? startTime.toString() : null,
            endTime: endTime < videoDuration ? endTime.toString() : null
        });

        if (result.success) {
            progressFill.style.width = '100%';
            statusMessage.textContent = result.message;
            statusMessage.className = 'status-message success';
        }
    } catch (error) {
        statusMessage.textContent = `Error: ${error.error || error.message}`;
        statusMessage.className = 'status-message error';
        progressFill.style.width = '0%';
    } finally {
        trimBtn.disabled = false;
    }
}

// Timeline functionality
function initTimeline() {
    const timelineTrack = document.getElementById('timeline-track');
    const startHandle = document.getElementById('start-handle');
    const endHandle = document.getElementById('end-handle');

    if (!timelineTrack) return;

    // Mouse/touch event handlers
    startHandle.addEventListener('mousedown', (e) => startDrag(e, 'start'));
    endHandle.addEventListener('mousedown', (e) => startDrag(e, 'end'));
    timelineTrack.addEventListener('click', handleTimelineClick);

    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', stopDrag);

    // Touch events for mobile
    startHandle.addEventListener('touchstart', (e) => startDrag(e.touches[0], 'start'));
    endHandle.addEventListener('touchstart', (e) => startDrag(e.touches[0], 'end'));
    document.addEventListener('touchmove', (e) => handleDrag(e.touches[0]));
    document.addEventListener('touchend', stopDrag);
}

function startDrag(e, handle) {
    e.preventDefault();
    isDragging = true;
    dragHandle = handle;

    const handleElement = document.getElementById(`${handle}-handle`);
    handleElement.classList.add('dragging');

    timelineWidth = document.getElementById('timeline-track').offsetWidth;
}

function handleDrag(e) {
    if (!isDragging || !videoDuration) return;

    e.preventDefault();
    const timelineTrack = document.getElementById('timeline-track');
    const rect = timelineTrack.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    const time = percentage * videoDuration;

    if (dragHandle === 'start') {
        startTime = Math.min(time, endTime - 0.1); // Ensure start is before end
        updateTimelineDisplay();
    } else if (dragHandle === 'end') {
        // Ensure end time doesn't exceed video duration minus small buffer
        endTime = Math.max(time, startTime + 0.1);
        endTime = Math.min(endTime, videoDuration - 0.1); // Keep away from absolute end
        updateTimelineDisplay();
    }
}

function stopDrag() {
    if (isDragging) {
        isDragging = false;
        const handleElement = document.getElementById(`${dragHandle}-handle`);
        if (handleElement) {
            handleElement.classList.remove('dragging');
        }
        dragHandle = null;
    }
}

function handleTimelineClick(e) {
    if (isDragging || !videoDuration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = percentage * videoDuration;

    // Move the closest handle to the click position
    const distToStart = Math.abs(time - startTime);
    const distToEnd = Math.abs(time - endTime);

    if (distToStart < distToEnd) {
        startTime = Math.min(time, endTime - 0.1);
    } else {
        endTime = Math.max(time, startTime + 0.1);
        endTime = Math.min(endTime, videoDuration - 0.1); // Keep away from absolute end
    }

    updateTimelineDisplay();
}

function updateTimelineDisplay() {
    if (!videoDuration) return;

    const startPercentage = (startTime / videoDuration) * 100;
    const endPercentage = (endTime / videoDuration) * 100;
    const rangeWidth = endPercentage - startPercentage;

    // Update handle positions
    document.getElementById('start-handle').style.left = `${startPercentage}%`;
    document.getElementById('end-handle').style.left = `${endPercentage}%`;

    // Update range highlight
    const range = document.getElementById('timeline-range');
    range.style.left = `${startPercentage}%`;
    range.style.width = `${rangeWidth}%`;

    // Update time displays
    document.getElementById('start-time-display').textContent = formatTime(startTime);
    document.getElementById('end-time-display').textContent = formatTime(endTime);
    document.getElementById('selection-start').textContent = formatTime(startTime);
    document.getElementById('selection-end').textContent = formatTime(endTime);
    document.getElementById('selection-duration').textContent = formatTime(endTime - startTime);

    // Update frame previews with optimized debouncing
    clearTimeout(frameExtractionTimeout);
    frameExtractionTimeout = setTimeout(() => {
        queueFrameUpdates();
    }, isDragging ? 800 : 300); // Longer delay while dragging
}

async function queueFrameUpdates() {
    if (!trimVideoPath || !videoDuration) return;

    // Cancel any active extractions
    activeExtractions.clear();

    // Add to queue
    frameQueue = [
        { timestamp: startTime, type: 'start' },
        { timestamp: endTime, type: 'end' }
    ];

    if (!isProcessingQueue) {
        processFrameQueue();
    }
}

async function processFrameQueue() {
    if (isProcessingQueue || frameQueue.length === 0) return;

    isProcessingQueue = true;

    while (frameQueue.length > 0) {
        const { timestamp, type } = frameQueue.shift();

        // Skip if this extraction is no longer needed
        if (!activeExtractions.has(`${type}:${timestamp}`)) {
            activeExtractions.add(`${type}:${timestamp}`);

            try {
                showFrameLoading(type);
                await extractAndDisplayFrameOptimized(timestamp, type);
            } catch (error) {
                console.error(`Error processing frame queue for ${type}:`, error);
                showFrameError(type);
            }

            activeExtractions.delete(`${type}:${timestamp}`);
        }

        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    isProcessingQueue = false;
}

async function updateFramePreviews() {
    // Legacy function - now redirects to queue system
    queueFrameUpdates();
}

async function extractAndDisplayFrameOptimized(timestamp, type) {
    if (!trimVideoPath) return;

    try {
        // Ensure timestamp is within safe bounds
        const safeTimestamp = Math.max(0, Math.min(timestamp, videoDuration - 0.1));

        // Create unique temporary filename
        const tempFilename = `cosmic_merger_frame_${type}_${Math.floor(safeTimestamp * 10)}_${Date.now()}.jpg`;

        const result = await window.electronAPI.extractFrameCached({
            videoPath: trimVideoPath,
            timestamp: safeTimestamp,
            outputPath: tempFilename
        });

        if (result.success) {
            displayFrame(result.framePath, type);
            if (result.cached) {
                console.log(`Used cached frame for ${type} at ${safeTimestamp}s`);
            }
        } else {
            showFrameError(type);
        }
    } catch (error) {
        console.error(`Error extracting ${type} frame:`, error);
        showFrameError(type);
    }
}

function showFrameLoading(type) {
    const img = document.getElementById(`${type}-frame-img`);
    const placeholder = document.getElementById(`${type}-frame-placeholder`);
    const framePreview = img.closest('.frame-preview');

    img.style.display = 'none';
    placeholder.style.display = 'flex';
    placeholder.querySelector('.loading-text').textContent = 'Loading...';
    framePreview.classList.add('loading');
}

async function extractAndDisplayFrame(timestamp, type) {
    if (!trimVideoPath) return;

    try {
        // Create unique temporary filename
        const tempFilename = `cosmic_merger_frame_${type}_${Date.now()}.jpg`;

        const result = await window.electronAPI.extractFrame({
            videoPath: trimVideoPath,
            timestamp: Math.max(0, timestamp),
            outputPath: tempFilename
        });

        if (result.success) {
            displayFrame(result.framePath, type);
        } else {
            showFrameError(type);
        }
    } catch (error) {
        console.error(`Error extracting ${type} frame:`, error);
        showFrameError(type);
    }
}

function displayFrame(framePath, type) {
    const img = document.getElementById(`${type}-frame-img`);
    const placeholder = document.getElementById(`${type}-frame-placeholder`);
    const framePreview = img.closest('.frame-preview');

    img.onload = () => {
        placeholder.style.display = 'none';
        img.style.display = 'block';
        framePreview.classList.remove('loading');
    };

    img.onerror = () => {
        console.error(`Failed to load ${type} frame image`);
        showFrameError(type);
    };

    // Convert Windows path and use file:// protocol
    const normalizedPath = framePath.replace(/\\/g, '/');
    img.src = `file:///${normalizedPath}`;
}

function showFrameError(type) {
    const placeholder = document.getElementById(`${type}-frame-placeholder`);
    const framePreview = placeholder.closest('.frame-preview');

    placeholder.querySelector('.loading-text').textContent = 'Preview unavailable';
    framePreview.classList.remove('loading');
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
}

function initializeTimeline() {
    if (!videoDuration) return;

    startTime = 0;
    endTime = Math.max(0, videoDuration - 0.1); // Ensure we don't go past the actual video end

    // Set total duration display
    document.getElementById('total-duration').textContent = formatTime(videoDuration);

    updateTimelineDisplay();

    // Initial frame preview with slight delay
    setTimeout(() => {
        queueFrameUpdates();
    }, 200);
}