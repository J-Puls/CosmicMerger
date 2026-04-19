export type AppMode = 'merge' | 'trim' | 'rename';
export type ToastType = 'success' | 'error' | 'info';

export interface IpcResult {
    success: boolean;
    error?: string;
    message?: string;
}

export interface ProgressData {
    status: 'started' | 'processing' | 'completed' | 'error' | 'cancelled';
    percent?: number;
    message?: string;
    operationId?: string;
}

export interface CombineFilesArgs {
    videoPath: string;
    audioPath: string;
    outputPath: string;
}

export interface TrimVideoArgs {
    videoPath: string;
    outputPath: string;
    startTime: string | null;
    endTime: string | null;
}

export interface RenameFilesArgs {
    dirPath: string;
    seasonNumber: number;
    episodeOffset: number;
}

export interface RenamedFile {
    originalName: string;
    newName: string;
}

export interface RenameResult {
    success: boolean;
    renamedFiles?: RenamedFile[];
    error?: string;
}

export interface PreviewFilesArgs {
    dirPath: string;
    seasonNumber: number;
    episodeOffset: number;
}

export interface RenamePreview {
    directoryRename?: RenamedFile;
    fileRenames: RenamedFile[];
    totalFiles: number;
}

export interface PreviewResult {
    success: boolean;
    preview?: RenamePreview;
    error?: string;
}

export interface DurationResult {
    success: boolean;
    duration?: number;
    error?: string;
}

export interface ExtractFrameArgs {
    videoPath: string;
    timestamp: number;
    outputPath: string;
}

export interface FrameResult {
    success: boolean;
    framePath?: string;
    error?: string;
}

export interface FrameDataResult {
    success: boolean;
    dataUrl?: string;
    error?: string;
}

export interface ElectronAPI {
    selectVideoFile: () => Promise<string | null>;
    selectAudioFile: () => Promise<string | null>;
    selectOutputFile: () => Promise<string | null>;
    selectDirectory: () => Promise<string | null>;
    combineFiles: (data: CombineFilesArgs) => Promise<IpcResult>;
    trimVideo: (data: TrimVideoArgs) => Promise<IpcResult>;
    renameFiles: (data: RenameFilesArgs) => Promise<RenameResult>;
    previewFiles: (data: PreviewFilesArgs) => Promise<PreviewResult>;
    cancelOperation: (operationId: string) => Promise<IpcResult>;
    getVideoDuration: (videoPath: string) => Promise<DurationResult>;
    extractFrameCached: (data: ExtractFrameArgs) => Promise<FrameResult>;
    getFrameData: (framePath: string) => Promise<FrameDataResult>;
    onProgressUpdate: (callback: (event: unknown, data: ProgressData) => void) => void;
    removeProgressListener: () => void;
    windowMinimize: () => Promise<void>;
    windowMaximize: () => Promise<void>;
    windowClose: () => Promise<void>;
    onMaximizeChange: (callback: (event: unknown, maximized: boolean) => void) => void;
    removeMaximizeListener: () => void;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
