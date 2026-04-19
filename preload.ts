import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    selectVideoFile:        (): Promise<string | null>      => ipcRenderer.invoke('select-video-file'),
    selectAudioFile:        (): Promise<string | null>      => ipcRenderer.invoke('select-audio-file'),
    selectOutputFile:       (): Promise<string | null>      => ipcRenderer.invoke('select-output-file'),
    selectDirectory:        (): Promise<string | null>      => ipcRenderer.invoke('select-directory'),
    combineFiles:           (data: unknown)                 => ipcRenderer.invoke('combine-files', data),
    trimVideo:              (data: unknown)                 => ipcRenderer.invoke('trim-video', data),
    renameFiles:            (data: unknown)                 => ipcRenderer.invoke('rename-files', data),
    previewFiles:           (data: unknown)                 => ipcRenderer.invoke('preview-files', data),
    cancelOperation:        (operationId: string)           => ipcRenderer.invoke('cancel-operation', operationId),
    getVideoDuration:       (videoPath: string)             => ipcRenderer.invoke('get-video-duration', videoPath),
    extractFrameCached:     (data: unknown)                 => ipcRenderer.invoke('extract-frame-cached', data),
    getFrameData:           (framePath: string)             => ipcRenderer.invoke('get-frame-data', framePath),
    onProgressUpdate:       (callback: (event: unknown, data: unknown) => void) => ipcRenderer.on('progress-update', callback),
    removeProgressListener: () => { ipcRenderer.removeAllListeners('progress-update'); },
    windowMinimize:         (): Promise<void>               => ipcRenderer.invoke('window-minimize'),
    windowMaximize:         (): Promise<void>               => ipcRenderer.invoke('window-maximize'),
    windowClose:            (): Promise<void>               => ipcRenderer.invoke('window-close'),
    onMaximizeChange:       (callback: (event: unknown, maximized: boolean) => void) => ipcRenderer.on('window-maximized', callback),
    removeMaximizeListener: () => { ipcRenderer.removeAllListeners('window-maximized'); },
});
