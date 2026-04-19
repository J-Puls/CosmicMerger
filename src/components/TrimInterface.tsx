import { useState, useEffect, useRef, MouseEvent as ReactMouseEvent } from 'react';
import { LuArrowLeft, LuArrowRight, LuScissors } from 'react-icons/lu';
import Stepper from 'components/Stepper';
import { useToast } from 'components/toast_container';

interface TrimInterfaceProps {
    pendingFile: string | null;
}

const TrimInterface = ({ pendingFile }: TrimInterfaceProps) => {
    const { addToast } = useToast();
    const [trimVideoPath, setTrimVideoPath] = useState<string | null>(null);
    const [trimOutputPath, setTrimOutputPath] = useState<string | null>(null);
    const [videoDuration, setVideoDuration] = useState<number | null>(null);
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [dragHandle, setDragHandle] = useState<'start' | 'end' | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);

    const timelineRef = useRef<HTMLDivElement>(null);
    const frameUpdateTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (pendingFile) {
            loadVideoForTrim(pendingFile, true);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingFile]);

    const loadVideoForTrim = async (videoPath: string, autoAdvance = false) => {
        if (!videoPath || !window.electronAPI) return;
        setTrimVideoPath(videoPath);
        try {
            const result = await window.electronAPI.getVideoDuration(videoPath);
            if (result.success && result.duration !== undefined) {
                setVideoDuration(result.duration);
                setStartTime(0);
                setEndTime(Math.max(0, result.duration - 0.1));
                if (autoAdvance) setCurrentStep(2);
                setTimeout(() => updateFramePreviews(), 200);
            }
        } catch {
            addToast('Could not read video duration. The file may be unsupported.', 'error');
        }
    };

    const selectTrimVideo = async () => {
        if (!window.electronAPI) return;
        const path = await window.electronAPI.selectVideoFile();
        if (path) loadVideoForTrim(path);
    };

    const selectTrimOutput = async () => {
        if (!window.electronAPI) return;
        const path = await window.electronAPI.selectOutputFile();
        if (path) setTrimOutputPath(path);
    };

    const updateFramePreviews = () => {
        if (!trimVideoPath || !videoDuration || !window.electronAPI) return;
        if (frameUpdateTimeout.current) clearTimeout(frameUpdateTimeout.current);
        frameUpdateTimeout.current = setTimeout(async () => {
            try {
                await extractAndDisplayFrame(startTime, 'start');
                await extractAndDisplayFrame(endTime, 'end');
            } catch {
                // frame preview errors are silent — UI placeholder handles the visual state
            }
        }, isDragging ? 800 : 300);
    };

    const extractAndDisplayFrame = async (timestamp: number, type: string) => {
        if (!trimVideoPath || !window.electronAPI || videoDuration === null) return;
        try {
            const safeTimestamp = Math.max(0, Math.min(timestamp, videoDuration - 0.1));
            const tempFilename = `cosmic_merger_frame_${type}_${Math.floor(safeTimestamp * 10)}_${Date.now()}.jpg`;
            const result = await window.electronAPI.extractFrameCached({
                videoPath: trimVideoPath,
                timestamp: safeTimestamp,
                outputPath: tempFilename,
            });
            if (result.success && result.framePath) {
                const frameData = await window.electronAPI.getFrameData(result.framePath);
                if (frameData.success && frameData.dataUrl) {
                    const img = document.getElementById(`${type}-frame-img`) as HTMLImageElement | null;
                    const placeholder = document.getElementById(`${type}-frame-placeholder`);
                    if (img && placeholder) {
                        img.onload = () => {
                            placeholder.style.display = 'none';
                            img.style.display = 'block';
                        };
                        img.src = frameData.dataUrl;
                    }
                }
            }
        } catch {
            const placeholder = document.getElementById(`${type}-frame-placeholder`);
            const loadingText = placeholder?.querySelector('.loading-text');
            if (loadingText) loadingText.textContent = 'Preview unavailable';
        }
    };

    const handleTimelineClick = (e: ReactMouseEvent<HTMLDivElement>) => {
        if (isDragging || videoDuration === null || !timelineRef.current) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const time = (x / rect.width) * videoDuration;
        if (Math.abs(time - startTime) < Math.abs(time - endTime)) {
            setStartTime(Math.min(time, endTime - 0.1));
        } else {
            setEndTime(Math.min(Math.max(time, startTime + 0.1), videoDuration - 0.1));
        }
    };

    const handleMouseDown = (e: ReactMouseEvent, handle: 'start' | 'end') => {
        e.preventDefault();
        setIsDragging(true);
        setDragHandle(handle);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging || videoDuration === null || !timelineRef.current) return;
        e.preventDefault();
        const rect = timelineRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const time = (x / rect.width) * videoDuration;
        if (dragHandle === 'start') {
            setStartTime(Math.min(time, endTime - 0.1));
        } else if (dragHandle === 'end') {
            setEndTime(Math.min(Math.max(time, startTime + 0.1), videoDuration - 0.1));
        }
    };

    const handleMouseUp = () => {
        if (isDragging) {
            setIsDragging(false);
            setDragHandle(null);
        }
    };

    useEffect(() => {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDragging, dragHandle, videoDuration, endTime, startTime]);

    useEffect(() => {
        updateFramePreviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startTime, endTime]);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(1);
        return `${mins}:${secs.padStart(4, '0')}`;
    };

    const trimVideo = async () => {
        if (!trimVideoPath || !trimOutputPath || videoDuration === null || !window.electronAPI) return;
        setIsProcessing(true);
        try {
            await window.electronAPI.trimVideo({
                videoPath: trimVideoPath,
                outputPath: trimOutputPath,
                startTime: startTime > 0 ? startTime.toString() : null,
                endTime: endTime < videoDuration ? endTime.toString() : null,
            });
        } catch {
            addToast('Trim failed. Check that the output path is writable.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const canAdvance = (): boolean => {
        if (currentStep === 1) return videoDuration !== null;
        if (currentStep === 2) return true;
        return false;
    };

    const goBack = () => setCurrentStep(s => s - 1);
    const goNext = () => setCurrentStep(s => s + 1);

    const startPercentage = videoDuration ? (startTime / videoDuration) * 100 : 0;
    const endPercentage = videoDuration ? (endTime / videoDuration) * 100 : 100;
    const rangeWidth = endPercentage - startPercentage;

    return (
        <div className="merge-wizard">
            <Stepper steps={['Video', 'Trim', 'Output']} currentStep={currentStep} />

            <div className="wizard-body">
                {currentStep === 1 && (
                    <div className={`file-section ${trimVideoPath ? 'selected' : ''}`}>
                        <label>Select Video to Trim</label>
                        <button className="btn btn-secondary" onClick={selectTrimVideo}>
                            {trimVideoPath ? 'Change Video' : 'Choose Video'}
                        </button>
                        <div className="file-path">{trimVideoPath ?? 'No video selected'}</div>
                        {videoDuration !== null && (
                            <div className="video-info">
                                Duration: {formatTime(videoDuration)} ({videoDuration.toFixed(1)}s)
                            </div>
                        )}
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="file-section selected">
                        <label>Set Trim Points</label>
                        <div className="timeline-container">
                            <div className="frame-previews">
                                <div className="frame-preview start-frame">
                                    <div className="frame-label">Start Frame</div>
                                    <div className="frame-container">
                                        <img id="start-frame-img" className="frame-img" alt="Start frame" style={{ display: 'none' }} />
                                        <div className="frame-placeholder" id="start-frame-placeholder">
                                            <div className="loading-text">Loading…</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="frame-preview end-frame">
                                    <div className="frame-label">End Frame</div>
                                    <div className="frame-container">
                                        <img id="end-frame-img" className="frame-img" alt="End frame" style={{ display: 'none' }} />
                                        <div className="frame-placeholder" id="end-frame-placeholder">
                                            <div className="loading-text">Loading…</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="timeline-track" ref={timelineRef} onClick={handleTimelineClick}>
                                <div className="timeline-range" style={{ left: `${startPercentage}%`, width: `${rangeWidth}%` }} />
                                <div
                                    className={`timeline-handle start-handle ${isDragging && dragHandle === 'start' ? 'dragging' : ''}`}
                                    style={{ left: `${startPercentage}%` }}
                                    onMouseDown={(e) => handleMouseDown(e, 'start')}
                                >
                                    <div className="handle-time">{formatTime(startTime)}</div>
                                </div>
                                <div
                                    className={`timeline-handle end-handle ${isDragging && dragHandle === 'end' ? 'dragging' : ''}`}
                                    style={{ left: `${endPercentage}%` }}
                                    onMouseDown={(e) => handleMouseDown(e, 'end')}
                                >
                                    <div className="handle-time">{formatTime(endTime)}</div>
                                </div>
                            </div>

                            <div className="timeline-info">
                                <div className="timeline-labels">
                                    <span className="time-label">0:00</span>
                                    <span className="time-label">{videoDuration !== null ? formatTime(videoDuration) : ''}</span>
                                </div>
                                <div className="selection-info">
                                    {formatTime(endTime - startTime)} selected &nbsp;·&nbsp; {formatTime(startTime)} – {formatTime(endTime)}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 3 && (
                    <div className={`file-section ${trimOutputPath ? 'selected' : ''}`}>
                        <label>Output Location</label>
                        <button className="btn btn-secondary" onClick={selectTrimOutput}>
                            {trimOutputPath ? 'Change Output' : 'Choose Output'}
                        </button>
                        <div className="file-path">{trimOutputPath ?? 'No output location selected'}</div>
                        {trimOutputPath && (
                            <div className="review-summary" style={{ marginTop: '1rem' }}>
                                <div className="review-row">
                                    <span className="review-label">Start</span>
                                    <span className="review-path">{formatTime(startTime)}</span>
                                </div>
                                <div className="review-row">
                                    <span className="review-label">End</span>
                                    <span className="review-path">{formatTime(endTime)}</span>
                                </div>
                                <div className="review-row">
                                    <span className="review-label">Duration</span>
                                    <span className="review-path">{formatTime(endTime - startTime)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="wizard-nav">
                <button
                    className="btn btn-dark d-flex align-items-center gap-2"
                    onClick={goBack}
                    disabled={currentStep === 1}
                >
                    <LuArrowLeft size={15} /> Back
                </button>

                {currentStep < 3 ? (
                    <button
                        className="btn btn-secondary d-flex align-items-center gap-2"
                        onClick={goNext}
                        disabled={!canAdvance()}
                    >
                        Next <LuArrowRight size={15} />
                    </button>
                ) : (
                    <button
                        className="btn btn-secondary d-flex align-items-center gap-2"
                        onClick={trimVideo}
                        disabled={!trimOutputPath || isProcessing}
                    >
                        <LuScissors size={15} /> {isProcessing ? 'Trimming…' : 'Trim'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default TrimInterface;
