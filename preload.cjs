const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectVideoFile: () => ipcRenderer.invoke('select-video-file'),
    selectAudioFile: () => ipcRenderer.invoke('select-audio-file'),
    selectOutputFile: () => ipcRenderer.invoke('select-output-file'),
    combineFiles: (data) => ipcRenderer.invoke('combine-files', data),
    trimVideo: (data) => ipcRenderer.invoke('trim-video', data),
    cancelOperation: (operationId) => ipcRenderer.invoke('cancel-operation', operationId),
    getVideoDuration: (videoPath) => ipcRenderer.invoke('get-video-duration', videoPath),
    extractFrameCached: (data) => ipcRenderer.invoke('extract-frame-cached', data),
    getFrameData: (framePath) => ipcRenderer.invoke('get-frame-data', framePath),
    onProgressUpdate: (callback) => ipcRenderer.on('progress-update', callback),
    removeProgressListener: () => ipcRenderer.removeAllListeners('progress-update')
});