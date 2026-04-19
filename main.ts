import { app, BrowserWindow, ipcMain, dialog, session } from 'electron';
import path from 'path';
import ffmpeg, { FfmpegCommand } from 'fluent-ffmpeg';
import fs from 'fs';
import os from 'os';

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');

const activeOperations = new Map<string, FfmpegCommand>();
let mainWindow: BrowserWindow | null = null;

function padToTwoDigits(num: number): string {
    return num.toString().padStart(2, '0');
}

function createWindow(): void {
    mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        frame: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    mainWindow.on('maximize', () => mainWindow?.webContents.send('window-maximized', true));
    mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window-maximized', false));

    const isDev = process.argv.includes('--dev') || !app.isPackaged;

    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    const isDev = process.argv.includes('--dev') || !app.isPackaged;

    const csp = isDev
        ? [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "connect-src 'self' ws://localhost:3000 http://localhost:3000",
            "img-src 'self' data:",
          ].join('; ')
        : [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline'",
            "font-src 'self'",
            "img-src 'self' data:",
          ].join('; ');

    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [csp],
            },
        });
    });

    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('select-video-file', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'Video Files', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] }],
    });
    return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('select-audio-file', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'Audio Files', extensions: ['m4a', 'mp3', 'wav', 'aac', 'ogg', 'flac'] }],
    });
    return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('select-output-file', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showSaveDialog(mainWindow, {
        filters: [{ name: 'Video Files', extensions: ['mp4'] }],
        defaultPath: 'combined-video.mp4',
    });
    return result.canceled ? null : result.filePath ?? null;
});

ipcMain.handle('select-directory', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
    return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('combine-files', async (_event, { videoPath, audioPath, outputPath }: { videoPath: string; audioPath: string; outputPath: string }) => {
    const operationId = Date.now().toString();

    return new Promise((resolve, reject) => {
        const proc = ffmpeg(videoPath)
            .input(audioPath)
            .outputOptions(['-c:v copy', '-c:a aac', '-map 0:v:0', '-map 1:a:0', '-shortest'])
            .output(outputPath);

        activeOperations.set(operationId, proc);

        proc
            .on('start', (cmd) => {
                console.log('FFmpeg command:', cmd);
                mainWindow?.webContents.send('progress-update', { status: 'started', message: 'Processing started...', operationId });
            })
            .on('progress', (progress) => {
                mainWindow?.webContents.send('progress-update', {
                    status: 'processing',
                    percent: progress.percent,
                    message: `Processing: ${Math.round(progress.percent ?? 0)}%`,
                    operationId,
                });
            })
            .on('end', () => {
                activeOperations.delete(operationId);
                mainWindow?.webContents.send('progress-update', { status: 'completed', message: 'Processing completed!', operationId });
                resolve({ success: true, message: 'Files merged successfully!' });
            })
            .on('error', (err) => {
                activeOperations.delete(operationId);
                mainWindow?.webContents.send('progress-update', { status: 'error', message: `Error: ${err.message}`, operationId });
                reject({ success: false, error: err.message });
            });

        proc.run();
    });
});

ipcMain.handle('trim-video', async (_event, { videoPath, outputPath, startTime, endTime }: { videoPath: string; outputPath: string; startTime: string | null; endTime: string | null }) => {
    const operationId = Date.now().toString();

    return new Promise((resolve, reject) => {
        let proc = ffmpeg(videoPath);

        if (startTime !== null) proc = proc.seekInput(parseFloat(startTime));

        if (endTime !== null && startTime !== null) {
            proc = proc.duration(parseFloat(endTime) - parseFloat(startTime));
        } else if (endTime !== null) {
            proc = proc.duration(parseFloat(endTime));
        }

        proc = proc.outputOptions(['-c:v libx264', '-c:a aac']).output(outputPath);

        activeOperations.set(operationId, proc);

        proc
            .on('start', (cmd) => {
                console.log('FFmpeg trim command:', cmd);
                mainWindow?.webContents.send('progress-update', { status: 'started', message: 'Trimming started...', operationId });
            })
            .on('progress', (progress) => {
                mainWindow?.webContents.send('progress-update', {
                    status: 'processing',
                    percent: progress.percent,
                    message: `Trimming: ${Math.round(progress.percent ?? 0)}%`,
                    operationId,
                });
            })
            .on('end', () => {
                activeOperations.delete(operationId);
                mainWindow?.webContents.send('progress-update', { status: 'completed', message: 'Trimming completed!', operationId });
                resolve({ success: true, message: 'Video trimmed successfully!' });
            })
            .on('error', (err) => {
                activeOperations.delete(operationId);
                mainWindow?.webContents.send('progress-update', { status: 'error', message: `Error: ${err.message}`, operationId });
                reject({ success: false, error: err.message });
            });

        proc.run();
    });
});

ipcMain.handle('cancel-operation', async (_event, operationId: string) => {
    if (activeOperations.has(operationId)) {
        activeOperations.get(operationId)!.kill('SIGTERM');
        activeOperations.delete(operationId);
        mainWindow?.webContents.send('progress-update', { status: 'cancelled', message: 'Operation cancelled', operationId });
        return { success: true, message: 'Operation cancelled' };
    }
    return { success: false, error: 'Operation not found' };
});

ipcMain.handle('get-frame-data', async (_event, framePath: string) => {
    try {
        if (fs.existsSync(framePath)) {
            const base64Image = fs.readFileSync(framePath).toString('base64');
            return { success: true, dataUrl: `data:image/jpeg;base64,${base64Image}` };
        }
        return { success: false, error: 'Frame file not found' };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
});

ipcMain.handle('get-video-duration', async (_event, videoPath: string) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) {
                reject({ success: false, error: err.message });
            } else {
                resolve({ success: true, duration: metadata.format.duration });
            }
        });
    });
});

const frameCache = new Map<string, string>();
const maxCacheSize = 20;

ipcMain.handle('extract-frame-cached', async (_event, { videoPath, timestamp, outputPath }: { videoPath: string; timestamp: number; outputPath: string }) => {
    const cacheKey = `${videoPath}:${Math.floor(timestamp * 10) / 10}`;

    if (frameCache.has(cacheKey)) {
        const cachedPath = frameCache.get(cacheKey)!;
        if (fs.existsSync(cachedPath)) {
            return { success: true, framePath: cachedPath, cached: true };
        }
        frameCache.delete(cacheKey);
    }

    return new Promise((resolve, reject) => {
        const fullOutputPath = path.join(os.tmpdir(), outputPath);
        const seekTime = Math.max(0, timestamp);

        ffmpeg(videoPath)
            .seekInput(seekTime)
            .frames(1)
            .outputOptions(['-q:v 2', '-f image2'])
            .output(fullOutputPath)
            .on('end', () => {
                if (frameCache.size >= maxCacheSize) {
                    const firstKey = frameCache.keys().next().value!;
                    const firstPath = frameCache.get(firstKey)!;
                    if (fs.existsSync(firstPath)) fs.unlinkSync(firstPath);
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

ipcMain.handle('rename-files', async (_event, { dirPath, seasonNumber, episodeOffset = 1 }: { dirPath: string; seasonNumber: number; episodeOffset: number }) => {
    const operationId = Date.now().toString();

    return new Promise((resolve, reject) => {
        try {
            if (!fs.existsSync(dirPath)) { reject({ success: false, error: 'Directory does not exist.' }); return; }
            if (isNaN(seasonNumber) || seasonNumber <= 0) { reject({ success: false, error: 'Invalid season number.' }); return; }
            if (isNaN(episodeOffset) || episodeOffset <= 0) { reject({ success: false, error: 'Invalid episode offset.' }); return; }

            mainWindow?.webContents.send('progress-update', { status: 'started', message: 'Starting file renaming...', operationId });

            const files = fs.readdirSync(dirPath).filter(file => {
                const filePath = path.join(dirPath, file);
                return fs.statSync(filePath).isFile() && /\.(mp4|mkv|avi|mov|webm)$/i.test(file);
            });

            if (files.length === 0) { reject({ success: false, error: 'No video files found in the selected directory.' }); return; }

            mainWindow?.webContents.send('progress-update', { status: 'processing', message: `Found ${files.length} video files to rename...`, operationId });

            const renamedFiles: Array<{ originalName: string; newName: string; seasonDir: string }> = [];

            files.forEach((file, index) => {
                const episodeNumber = padToTwoDigits(index + episodeOffset);
                const newFileName = `Episode S${padToTwoDigits(seasonNumber)}E${episodeNumber}${path.extname(file)}`;
                fs.renameSync(path.join(dirPath, file), path.join(dirPath, newFileName));
                renamedFiles.push({ originalName: file, newName: newFileName, seasonDir: dirPath });

                mainWindow?.webContents.send('progress-update', {
                    status: 'processing',
                    percent: ((index + 1) / files.length) * 90,
                    message: `Renamed: ${file} → ${newFileName}`,
                    operationId,
                });
            });

            const parentDir = path.dirname(dirPath);
            const currentDirName = path.basename(dirPath);
            let newDirName = `Season ${padToTwoDigits(seasonNumber)}`;
            let newDirPath = path.join(parentDir, newDirName);

            if (currentDirName !== newDirName) {
                if (fs.existsSync(newDirPath)) {
                    let counter = 1;
                    while (fs.existsSync(newDirPath)) {
                        newDirName = `Season ${padToTwoDigits(seasonNumber)} (${counter++})`;
                        newDirPath = path.join(parentDir, newDirName);
                    }
                }

                mainWindow?.webContents.send('progress-update', { status: 'processing', percent: 95, message: `Renaming folder to: ${newDirName}`, operationId });
                fs.renameSync(dirPath, newDirPath);
                renamedFiles.forEach(f => { f.seasonDir = newDirPath; });
            }

            mainWindow?.webContents.send('progress-update', {
                status: 'completed',
                message: `Successfully renamed ${files.length} files and organized into ${newDirName}!`,
                operationId,
            });

            resolve({ success: true, message: `Successfully renamed ${files.length} files!`, renamedFiles, seasonDirectory: newDirPath || dirPath });
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            mainWindow?.webContents.send('progress-update', { status: 'error', message: `Error: ${msg}`, operationId });
            reject({ success: false, error: msg });
        }
    });
});

ipcMain.handle('preview-files', async (_event, { dirPath, seasonNumber, episodeOffset = 1 }: { dirPath: string; seasonNumber: number; episodeOffset: number }) => {
    return new Promise((resolve) => {
        try {
            if (!fs.existsSync(dirPath)) { resolve({ success: false, error: 'Directory does not exist.' }); return; }
            if (isNaN(seasonNumber) || seasonNumber <= 0) { resolve({ success: false, error: 'Invalid season number.' }); return; }
            if (isNaN(episodeOffset) || episodeOffset <= 0) { resolve({ success: false, error: 'Invalid episode offset.' }); return; }

            const files = fs.readdirSync(dirPath).filter(file => {
                const filePath = path.join(dirPath, file);
                return fs.statSync(filePath).isFile() && /\.(mp4|mkv|avi|mov|webm)$/i.test(file);
            });

            if (files.length === 0) { resolve({ success: false, error: 'No video files found in the selected directory.' }); return; }

            const fileRenames = files.map((file, index) => {
                const episodeNumber = padToTwoDigits(index + episodeOffset);
                const newFileName = `Episode S${padToTwoDigits(seasonNumber)}E${episodeNumber}${path.extname(file)}`;
                return { originalName: file, newName: newFileName, originalPath: path.join(dirPath, file), newPath: path.join(dirPath, newFileName) };
            });

            const currentDirName = path.basename(dirPath);
            const parentDir = path.dirname(dirPath);
            const newDirName = `Season ${padToTwoDigits(seasonNumber)}`;
            let directoryRename: { originalName: string; newName: string } | null = null;

            if (currentDirName !== newDirName) {
                let finalDirName = newDirName;
                let finalDirPath = path.join(parentDir, newDirName);
                if (fs.existsSync(finalDirPath)) {
                    let counter = 1;
                    while (fs.existsSync(finalDirPath)) {
                        finalDirName = `${newDirName} (${counter++})`;
                        finalDirPath = path.join(parentDir, finalDirName);
                    }
                }
                directoryRename = { originalName: currentDirName, newName: finalDirName };
            }

            resolve({ success: true, preview: { fileRenames, directoryRename, totalFiles: files.length, seasonNumber, episodeOffset } });
        } catch (error: unknown) {
            resolve({ success: false, error: error instanceof Error ? error.message : String(error) });
        }
    });
});

// Window controls
ipcMain.handle('window-minimize', () => mainWindow?.minimize());
ipcMain.handle('window-maximize', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
});
ipcMain.handle('window-close', () => mainWindow?.close());
