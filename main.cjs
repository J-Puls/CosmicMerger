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

// Function to zero-pad numbers to two digits
function padToTwoDigits(num) {
    return num.toString().padStart(2, '0');
}

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
        mainWindow.webContents.openDevTools();
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

// Handle directory selection for renamer
ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });

    if (!result.canceled) {
        return result.filePaths[0];
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
                mainWindow.webContents.send('progress-update', {
                    status: 'error',
                    message: `Error: ${err.message}`,
                    operationId: operationId
                });
                reject({ success: false, error: err.message });
            });

        ffmpegProcess.run();
    });
});

// Handle video trimming
ipcMain.handle('trim-video', async (event, { videoPath, outputPath, startTime, endTime }) => {
    const operationId = Date.now().toString();

    return new Promise((resolve, reject) => {
        let ffmpegProcess = ffmpeg(videoPath);

        // Apply trimming options if provided
        if (startTime !== null) {
            ffmpegProcess = ffmpegProcess.seekInput(parseFloat(startTime));
        }

        if (endTime !== null && startTime !== null) {
            const duration = parseFloat(endTime) - parseFloat(startTime);
            ffmpegProcess = ffmpegProcess.duration(duration);
        } else if (endTime !== null) {
            ffmpegProcess = ffmpegProcess.duration(parseFloat(endTime));
        }

        ffmpegProcess = ffmpegProcess
            .outputOptions(['-c:v libx264', '-c:a aac'])
            .output(outputPath);

        activeOperations.set(operationId, ffmpegProcess);

        ffmpegProcess
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
                    message: 'Trimming completed!',
                    operationId: operationId
                });
                resolve({ success: true, message: 'Video trimmed successfully!' });
            })
            .on('error', (err) => {
                activeOperations.delete(operationId);
                mainWindow.webContents.send('progress-update', {
                    status: 'error',
                    message: `Error: ${err.message}`,
                    operationId: operationId
                });
                reject({ success: false, error: err.message });
            });

        ffmpegProcess.run();
    });
});

// Handle operation cancellation
ipcMain.handle('cancel-operation', async (event, operationId) => {
    if (activeOperations.has(operationId)) {
        const operation = activeOperations.get(operationId);
        operation.kill('SIGTERM');
        activeOperations.delete(operationId);

        mainWindow.webContents.send('progress-update', {
            status: 'cancelled',
            message: 'Operation cancelled',
            operationId: operationId
        });

        return { success: true, message: 'Operation cancelled' };
    }
    return { success: false, error: 'Operation not found' };
});

// Handle frame data reading
ipcMain.handle('get-frame-data', async (event, framePath) => {
    try {
        if (fs.existsSync(framePath)) {
            const imageData = fs.readFileSync(framePath);
            const base64Image = imageData.toString('base64');
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
                '-q:v 2',
                '-f image2'
            ])
            .output(fullOutputPath)
            .on('end', () => {
                if (frameCache.size >= maxCacheSize) {
                    const firstKey = frameCache.keys().next().value;
                    const firstPath = frameCache.get(firstKey);
                    if (fs.existsSync(firstPath)) {
                        fs.unlinkSync(firstPath);
                    }
                    frameCache.delete(firstKey);
                }

                frameCache.set(cacheKey, fullOutputPath);
                resolve({ success: true, framePath: fullOutputPath, cached: false });
            })
            .on('error', (err) => {
                console.error('Frame extraction error:', err);
                reject({ success: false, error: err.message });
            })
            .run();
    });
});

// Handle file renaming - Modified to use episode offset
ipcMain.handle('rename-files', async (event, { dirPath, seasonNumber, episodeOffset = 1 }) => {
    const operationId = Date.now().toString();

    return new Promise((resolve, reject) => {
        try {
            // Validate inputs
            if (!fs.existsSync(dirPath)) {
                reject({ success: false, error: 'Directory does not exist.' });
                return;
            }

            if (isNaN(seasonNumber) || seasonNumber <= 0) {
                reject({ success: false, error: 'Invalid season number.' });
                return;
            }

            // NEW: Validate episode offset
            if (isNaN(episodeOffset) || episodeOffset <= 0) {
                reject({ success: false, error: 'Invalid episode offset.' });
                return;
            }

            // Send initial progress
            mainWindow.webContents.send('progress-update', {
                status: 'started',
                message: 'Starting file renaming...',
                operationId: operationId
            });

            // Get list of all video files in the directory
            const files = fs.readdirSync(dirPath).filter(file => {
                const filePath = path.join(dirPath, file);
                return fs.statSync(filePath).isFile() && file.match(/\.(mp4|mkv|avi|mov|webm)$/i);
            });

            if (files.length === 0) {
                reject({ success: false, error: 'No video files found in the selected directory.' });
                return;
            }

            // Send progress update
            mainWindow.webContents.send('progress-update', {
                status: 'processing',
                message: `Found ${files.length} video files to rename...`,
                operationId: operationId
            });

            const renamedFiles = [];

            // First, rename all the files in place
            files.forEach((file, index) => {
                // MODIFIED: Use episode offset instead of starting from 1
                const episodeNumber = padToTwoDigits(index + episodeOffset);
                const newFileName = `Episode S${padToTwoDigits(seasonNumber)}E${episodeNumber}${path.extname(file)}`;
                const oldFilePath = path.join(dirPath, file);
                const newFilePath = path.join(dirPath, newFileName);

                // Rename the file in place (no copying)
                fs.renameSync(oldFilePath, newFilePath);

                renamedFiles.push({
                    originalName: file,
                    newName: newFileName,
                    seasonDir: dirPath // Now it's the same directory
                });

                // Send progress update for each file
                const progress = ((index + 1) / files.length) * 90; // Save 10% for folder rename
                mainWindow.webContents.send('progress-update', {
                    status: 'processing',
                    percent: progress,
                    message: `Renamed: ${file} → ${newFileName}`,
                    operationId: operationId
                });
            });

            // Now rename the containing directory to match Season XX format
            const parentDir = path.dirname(dirPath);
            const currentDirName = path.basename(dirPath);
            let newDirName = `Season ${padToTwoDigits(seasonNumber)}`;
            let newDirPath = path.join(parentDir, newDirName);

            // Only rename the directory if it's not already named correctly
            if (currentDirName !== newDirName) {
                // Check if target directory name already exists
                if (fs.existsSync(newDirPath)) {
                    // If target exists, append a number to make it unique
                    let counter = 1;
                    let uniqueDirPath = newDirPath;
                    while (fs.existsSync(uniqueDirPath)) {
                        uniqueDirPath = path.join(parentDir, `${newDirName} (${counter})`);
                        counter++;
                    }
                    newDirPath = uniqueDirPath;
                    newDirName = path.basename(uniqueDirPath);
                }

                mainWindow.webContents.send('progress-update', {
                    status: 'processing',
                    percent: 95,
                    message: `Renaming folder to: ${newDirName}`,
                    operationId: operationId
                });

                // Rename the directory
                fs.renameSync(dirPath, newDirPath);

                // Update the seasonDir in renamedFiles to reflect the new directory path
                renamedFiles.forEach(file => {
                    file.seasonDir = newDirPath;
                });
            }

            // Send completion
            mainWindow.webContents.send('progress-update', {
                status: 'completed',
                message: `Successfully renamed ${files.length} files and organized into ${newDirName}!`,
                operationId: operationId
            });

            resolve({
                success: true,
                message: `Successfully renamed ${files.length} files and organized into ${newDirName}!`,
                renamedFiles: renamedFiles,
                seasonDirectory: newDirPath || dirPath
            });

        } catch (error) {
            console.error('Error renaming files:', error);
            mainWindow.webContents.send('progress-update', {
                status: 'error',
                message: `Error: ${error.message}`,
                operationId: operationId
            });
            reject({ success: false, error: error.message });
        }
    });
});

// NEW: Handle file preview - Modified to use episode offset
ipcMain.handle('preview-files', async (event, { dirPath, seasonNumber, episodeOffset = 1 }) => {
    return new Promise((resolve, reject) => {
        try {
            // Validate inputs
            if (!fs.existsSync(dirPath)) {
                reject({ success: false, error: 'Directory does not exist.' });
                return;
            }

            if (isNaN(seasonNumber) || seasonNumber <= 0) {
                reject({ success: false, error: 'Invalid season number.' });
                return;
            }

            // NEW: Validate episode offset
            if (isNaN(episodeOffset) || episodeOffset <= 0) {
                reject({ success: false, error: 'Invalid episode offset.' });
                return;
            }

            // Get list of all video files in the directory
            const files = fs.readdirSync(dirPath).filter(file => {
                const filePath = path.join(dirPath, file);
                return fs.statSync(filePath).isFile() && file.match(/\.(mp4|mkv|avi|mov|webm)$/i);
            });

            if (files.length === 0) {
                reject({ success: false, error: 'No video files found in the selected directory.' });
                return;
            }

            // Generate preview of file renames
            const fileRenamePreview = files.map((file, index) => {
                // MODIFIED: Use episode offset instead of starting from 1
                const episodeNumber = padToTwoDigits(index + episodeOffset);
                const newFileName = `Episode S${padToTwoDigits(seasonNumber)}E${episodeNumber}${path.extname(file)}`;

                return {
                    originalName: file,
                    newName: newFileName,
                    originalPath: path.join(dirPath, file),
                    newPath: path.join(dirPath, newFileName)
                };
            });

            // Generate preview of directory rename
            const currentDirName = path.basename(dirPath);
            const parentDir = path.dirname(dirPath);
            const newDirName = `Season ${padToTwoDigits(seasonNumber)}`;
            const newDirPath = path.join(parentDir, newDirName);

            let directoryRenamePreview = null;

            // Only show directory rename if it would actually change
            if (currentDirName !== newDirName) {
                let finalDirName = newDirName;
                let finalDirPath = newDirPath;

                // Check if target directory name already exists
                if (fs.existsSync(newDirPath)) {
                    let counter = 1;
                    while (fs.existsSync(finalDirPath)) {
                        finalDirName = `${newDirName} (${counter})`;
                        finalDirPath = path.join(parentDir, finalDirName);
                        counter++;
                    }
                }

                directoryRenamePreview = {
                    originalName: currentDirName,
                    newName: finalDirName,
                    originalPath: dirPath,
                    newPath: finalDirPath
                };
            }

            resolve({
                success: true,
                preview: {
                    fileRenames: fileRenamePreview,
                    directoryRename: directoryRenamePreview,
                    totalFiles: files.length,
                    seasonNumber: seasonNumber,
                    episodeOffset: episodeOffset // NEW: Include episode offset in preview response
                }
            });

        } catch (error) {
            console.error('Error generating preview:', error);
            reject({ success: false, error: error.message });
        }
    });
});