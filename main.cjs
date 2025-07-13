const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const os = require('os');

// More compatible GPU error suppression
app.commandLine.appendSwitch('--disable-gpu');
app.commandLine.appendSwitch('--disable-gpu-compositing');

// Track active operations for cancellation
let activeOperations = new Map();
let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs')
        }
    });

    // Load from Vite dev server in development, dist in production
    const isDev = process.argv.includes('--dev') || !app.isPackaged;

    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');

    } else {
        mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
    }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Handle file selection
ipcMain.handle('select-video-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Video Files', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] }
        ]
    });

    if (!result.canceled) {
        return result.filePaths[0];
    }
    return null;
});

ipcMain.handle('select-audio-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Audio Files', extensions: ['m4a', 'mp3', 'wav', 'aac', 'ogg', 'flac'] }
        ]
    });

    if (!result.canceled) {
        return result.filePaths[0];
    }
    return null;
});

ipcMain.handle('select-output-file', async () => {
    const result = await dialog.showSaveDialog(mainWindow, {
        filters: [
            { name: 'Video Files', extensions: ['mp4'] }
        ],
        defaultPath: 'combined-video.mp4'
    });

    if (!result.canceled) {
        return result.filePath;
    }
    return null;
});

// Handle video and audio combination
ipcMain.handle('combine-files', async (event, { videoPath, audioPath, outputPath }) => {
    const operationId = Date.now().toString();

    return new Promise((resolve, reject) => {
        const ffmpegProcess = ffmpeg(videoPath)
            .input(audioPath)
            .outputOptions([
                '-c:v copy',
                '-c:a aac',
                '-map 0:v:0',
                '-map 1:a:0',
                '-shortest'
            ])
            .output(outputPath);

        activeOperations.set(operationId, ffmpegProcess);

        ffmpegProcess
            .on('start', (commandLine) => {
                console.log('FFmpeg command:', commandLine);
                mainWindow.webContents.send('progress-update', {
                    status: 'started',
                    message: 'Processing started...',
                    operationId: operationId
                });
            })
            .on('progress', (progress) => {
                mainWindow.webContents.send('progress-update', {
                    status: 'processing',
                    percent: progress.percent,
                    message: `Processing: ${Math.round(progress.percent || 0)}%`,
                    operationId: operationId
                });
            })
            .on('end', () => {
                activeOperations.delete(operationId);
                mainWindow.webContents.send('progress-update', {
                    status: 'completed',
                    message: 'Processing completed!',
                    operationId: operationId
                });
                resolve({ success: true, message: 'Files merged successfully!' });
            })
            .on('error', (err) => {
                activeOperations.delete(operationId);
                console.error('FFmpeg error:', err);
                mainWindow.webContents.send('progress-update', {
                    status: 'error',
                    message: `Error: ${err.message}`,
                    operationId: operationId
                });
                reject({ success: false, error: err.message });
            })
            .run();
    });
});

// Handle video trimming
ipcMain.handle('trim-video', async (event, { videoPath, outputPath, startTime, endTime }) => {
    const operationId = Date.now().toString();

    return new Promise((resolve, reject) => {
        const ffmpegCommand = ffmpeg(videoPath);

        if (startTime) {
            ffmpegCommand.seekInput(startTime);
        }

        if (endTime && startTime) {
            const duration = parseFloat(endTime) - parseFloat(startTime);
            ffmpegCommand.duration(duration);
        } else if (endTime) {
            ffmpegCommand.duration(endTime);
        }

        ffmpegCommand
            .outputOptions([
                '-c:v libx264',
                '-c:a aac',
                '-avoid_negative_ts make_zero'
            ])
            .output(outputPath);

        activeOperations.set(operationId, ffmpegCommand);

        ffmpegCommand
            .on('start', (commandLine) => {
                console.log('FFmpeg trim command:', commandLine);
                mainWindow.webContents.send('progress-update', {
                    status: 'started',
                    message: 'Trimming started...',
                    operationId: operationId
                });
            })
            .on('progress', (progress) => {
                mainWindow.webContents.send('progress-update', {
                    status: 'processing',
                    percent: progress.percent,
                    message: `Trimming: ${Math.round(progress.percent || 0)}%`,
                    operationId: operationId
                });
            })
            .on('end', () => {
                activeOperations.delete(operationId);
                mainWindow.webContents.send('progress-update', {
                    status: 'completed',
                    message: 'Video trimmed successfully!',
                    operationId: operationId
                });
                resolve({ success: true, message: 'Video trimmed successfully!' });
            })
            .on('error', (err) => {
                activeOperations.delete(operationId);
                console.error('FFmpeg trim error:', err);
                mainWindow.webContents.send('progress-update', {
                    status: 'error',
                    message: `Error: ${err.message}`,
                    operationId: operationId
                });
                reject({ success: false, error: err.message });
            })
            .run();
    });
});

// Handle operation cancellation
ipcMain.handle('cancel-operation', async (event, operationId) => {
    console.log(`Attempting to cancel operation: ${operationId}`);

    if (!operationId) {
        return { success: false, error: 'No operation ID provided' };
    }

    if (activeOperations.has(operationId)) {
        const ffmpegProcess = activeOperations.get(operationId);
        try {
            // Check if process is still running
            if (!ffmpegProcess || ffmpegProcess.killed) {
                activeOperations.delete(operationId);
                return { success: false, error: 'Process already terminated' };
            }

            // Try graceful termination first
            ffmpegProcess.kill('SIGTERM');

            // Give it a moment to terminate gracefully
            await new Promise(resolve => setTimeout(resolve, 1000));

            // If still running, force kill
            if (!ffmpegProcess.killed) {
                ffmpegProcess.kill('SIGKILL');
            }

            activeOperations.delete(operationId);

            // Send cancellation update to frontend
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('progress-update', {
                    status: 'cancelled',
                    message: 'Operation cancelled by user',
                    operationId: operationId
                });
            }

            console.log(`Operation ${operationId} cancelled successfully`);
            return { success: true, message: 'Operation cancelled successfully' };

        } catch (error) {
            console.error('Error cancelling operation:', error);

            // Still remove from active operations even if kill failed
            activeOperations.delete(operationId);

            // Extract meaningful error message
            const errorMessage = error.message || error.toString() || 'Unknown cancellation error';

            return { success: false, error: errorMessage };
        }
    } else {
        console.log(`Operation ${operationId} not found in active operations`);
        return { success: false, error: 'Operation not found or already completed' };
    }
});

// Serve frame images as base64 data URLs
ipcMain.handle('get-frame-data', async (event, framePath) => {
    try {
        if (fs.existsSync(framePath)) {
            const imageBuffer = fs.readFileSync(framePath);
            const base64Image = imageBuffer.toString('base64');
            return { success: true, dataUrl: `data:image/jpeg;base64,${base64Image}` };
        } else {
            return { success: false, error: 'Frame file not found' };
        }
    } catch (error) {
        console.error('Error reading frame file:', error);
        return { success: false, error: error.message };
    }
});

// Get video duration for trimming interface
ipcMain.handle('get-video-duration', async (event, videoPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) {
                reject({ success: false, error: err.message });
            } else {
                const duration = metadata.format.duration;
                resolve({ success: true, duration: duration });
            }
        });
    });
});

// Frame cache for faster subsequent extractions
const frameCache = new Map();
const maxCacheSize = 20;

ipcMain.handle('extract-frame-cached', async (event, { videoPath, timestamp, outputPath }) => {
    const cacheKey = `${videoPath}:${Math.floor(timestamp * 10) / 10}`;

    if (frameCache.has(cacheKey)) {
        const cachedPath = frameCache.get(cacheKey);
        if (fs.existsSync(cachedPath)) {
            return { success: true, framePath: cachedPath, cached: true };
        } else {
            frameCache.delete(cacheKey);
        }
    }

    return new Promise((resolve, reject) => {
        const tempDir = os.tmpdir();
        const fullOutputPath = path.join(tempDir, outputPath);
        const seekTime = Math.max(0, parseFloat(timestamp));

        ffmpeg(videoPath)
            .seekInput(seekTime)
            .frames(1)
            .outputOptions([
                '-vf', 'scale=160:90:force_original_aspect_ratio=decrease,pad=160:90:(ow-iw)/2:(oh-ih)/2',
                '-q:v', '8',
                '-f', 'image2',
                '-threads', '1',
                '-preset', 'ultrafast'
            ])
            .output(fullOutputPath)
            .on('end', () => {
                if (fs.existsSync(fullOutputPath)) {
                    if (frameCache.size >= maxCacheSize) {
                        const firstKey = frameCache.keys().next().value;
                        const oldPath = frameCache.get(firstKey);
                        frameCache.delete(firstKey);
                        try {
                            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                        } catch (err) {
                            console.error('Cache cleanup error:', err);
                        }
                    }
                    frameCache.set(cacheKey, fullOutputPath);

                    resolve({ success: true, framePath: fullOutputPath, cached: false });
                } else {
                    reject({ success: false, error: 'Frame file was not created' });
                }
            })
            .on('error', (err) => {
                console.error('Frame extraction error:', err);
                try {
                    if (fs.existsSync(fullOutputPath)) {
                        fs.unlinkSync(fullOutputPath);
                    }
                } catch (cleanupErr) {
                    console.error('Cleanup error:', cleanupErr);
                }
                reject({ success: false, error: err.message });
            })
            .run();
    });
});