import React, { useState, useEffect, useRef } from 'react';
import {Button} from "react-bootstrap";

const TrimInterface = ({ pendingFile }) => {
    const [trimVideoPath, setTrimVideoPath] = useState(null);
    const [trimOutputPath, setTrimOutputPath] = useState(null);
    const [videoDuration, setVideoDuration] = useState(null);
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [dragHandle, setDragHandle] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const timelineRef = useRef(null);
    const frameUpdateTimeout = useRef(null);

    // Load pending file when it changes
    useEffect(() => {
        if (pendingFile) {
            loadVideoForTrim(pendingFile);
        }
    }, [pendingFile]);

    const loadVideoForTrim = async (videoPath) => {
        if (!videoPath || !window.electronAPI) return;

        setTrimVideoPath(videoPath);

        try {
            const result = await window.electronAPI.getVideoDuration(videoPath);
            if (result.success) {
                setVideoDuration(result.duration);
                setStartTime(0);
                setEndTime(Math.max(0, result.duration - 0.1));

                // Initialize frame previews
                setTimeout(() => {
                    updateFramePreviews();
                }, 200);
            }
        } catch (error) {
            console.error('Error getting video duration:', error);
        }
    };

    const selectTrimVideo = async () => {
        if (!window.electronAPI) return;

        const path = await window.electronAPI.selectVideoFile();
        if (path) {
            loadVideoForTrim(path);
        }
    };

    const selectTrimOutput = async () => {
        if (!window.electronAPI) return;

        const path = await window.electronAPI.selectOutputFile();
        if (path) {
            setTrimOutputPath(path);
        }
    };

    const updateFramePreviews = async () => {
        if (!trimVideoPath || !videoDuration || !window.electronAPI) return;

        clearTimeout(frameUpdateTimeout.current);
        frameUpdateTimeout.current = setTimeout(async () => {
            try {
                // Extract start frame
                await extractAndDisplayFrame(startTime, 'start');
                // Extract end frame
                await extractAndDisplayFrame(endTime, 'end');
            } catch (error) {
                console.error('Error updating frame previews:', error);
            }
        }, isDragging ? 800 : 300);
    };

    const extractAndDisplayFrame = async (timestamp, type) => {
        if (!trimVideoPath || !window.electronAPI) return;

        try {
            const safeTimestamp = Math.max(0, Math.min(timestamp, videoDuration - 0.1));
            const tempFilename = `cosmic_merger_frame_${type}_${Math.floor(safeTimestamp * 10)}_${Date.now()}.jpg`;

            const result = await window.electronAPI.extractFrameCached({
                videoPath: trimVideoPath,
                timestamp: safeTimestamp,
                outputPath: tempFilename
            });

            if (result.success) {
                // Get the image data as base64 through Electron
                const frameData = await window.electronAPI.getFrameData(result.framePath);

                if (frameData.success) {
                    const img = document.getElementById(`${type}-frame-img`);
                    const placeholder = document.getElementById(`${type}-frame-placeholder`);

                    if (img && placeholder) {
                        img.onload = () => {
                            placeholder.style.display = 'none';
                            img.style.display = 'block';
                        };

                        // Use the base64 data URL instead of file:// protocol
                        img.src = frameData.dataUrl;
                    }
                }
            }
        } catch (error) {
            console.error(`Error extracting ${type} frame:`, error);
            // Show placeholder error state
            const placeholder = document.getElementById(`${type}-frame-placeholder`);
            if (placeholder) {
                placeholder.querySelector('.loading-text').textContent = 'Preview unavailable';
            }
        }
    };

    const handleTimelineClick = (e) => {
        if (isDragging || !videoDuration || !timelineRef.current) return;

        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        const time = percentage * videoDuration;

        const distToStart = Math.abs(time - startTime);
        const distToEnd = Math.abs(time - endTime);

        if (distToStart < distToEnd) {
            setStartTime(Math.min(time, endTime - 0.1));
        } else {
            setEndTime(Math.max(time, startTime + 0.1));
            setEndTime(prev => Math.min(prev, videoDuration - 0.1));
        }
    };

    const handleMouseDown = (e, handle) => {
        e.preventDefault();
        setIsDragging(true);
        setDragHandle(handle);
    };

    const handleMouseMove = (e) => {
        if (!isDragging || !videoDuration || !timelineRef.current) return;

        e.preventDefault();
        const rect = timelineRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percentage = x / rect.width;
        const time = percentage * videoDuration;

        if (dragHandle === 'start') {
            setStartTime(Math.min(time, endTime - 0.1));
        } else if (dragHandle === 'end') {
            setEndTime(Math.max(time, startTime + 0.1));
            setEndTime(prev => Math.min(prev, videoDuration - 0.1));
        }
    };

    const handleMouseUp = () => {
        if (isDragging) {
            setIsDragging(false);
            setDragHandle(null);
        }
    };

    // Add global mouse event listeners
    useEffect(() => {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragHandle, videoDuration, endTime, startTime]);

    // Update frame previews when times change
    useEffect(() => {
        updateFramePreviews();
    }, [startTime, endTime]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(1);
        return `${mins}:${secs.padStart(4, '0')}`;
    };

    const trimVideo = async () => {
        if (!trimVideoPath || !trimOutputPath || !window.electronAPI) {
            alert('Please select video file and output location');
            return;
        }

        setIsProcessing(true);

        try {
            const result = await window.electronAPI.trimVideo({
                videoPath: trimVideoPath,
                outputPath: trimOutputPath,
                startTime: startTime > 0 ? startTime.toString() : null,
                endTime: endTime < videoDuration ? endTime.toString() : null
            });

            if (result.success) {
                console.log('Video trimmed successfully');
            }
        } catch (error) {
            console.error('Error trimming video:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    if (!videoDuration) {
        return (
            <div className="trim-interface">
                <div className="file-section">
                    <label>Select Video to Trim:</label>
                    <Button onClick={selectTrimVideo}>Choose Video</Button>
                    <div className="file-path">
                        {trimVideoPath || 'No video selected'}
                    </div>
                </div>
            </div>
        );
    }

    const startPercentage = (startTime / videoDuration) * 100;
    const endPercentage = (endTime / videoDuration) * 100;
    const rangeWidth = endPercentage - startPercentage;

    return (
        <div className="trim-interface">
            <div className="file-section selected">
                <label>Video to Trim:</label>
                <Button onClick={selectTrimVideo}>Choose Different Video</Button>
                <div className="file-path">{trimVideoPath}</div>
                <div className="video-info">
                    <span>Duration: {formatTime(videoDuration)} ({videoDuration.toFixed(1)}s)</span>
                </div>
            </div>

            <div className="file-section">
                <label>Trim Timeline:</label>
                <div className="timeline-container">
                    <div className="frame-previews">
                        <div className="frame-preview start-frame">
                            <div className="frame-label">Start Frame</div>
                            <div className="frame-container">
                                <img id="start-frame-img" className="frame-img" alt="Start frame" style={{ display: 'none' }} />
                                <div className="frame-placeholder" id="start-frame-placeholder">
                                    <div className="loading-text">Loading...</div>
                                </div>
                            </div>
                        </div>
                        <div className="frame-preview end-frame">
                            <div className="frame-label">End Frame</div>
                            <div className="frame-container">
                                <img id="end-frame-img" className="frame-img" alt="End frame" style={{ display: 'none' }} />
                                <div className="frame-placeholder" id="end-frame-placeholder">
                                    <div className="loading-text">Loading...</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        className="timeline-track"
                        ref={timelineRef}
                        onClick={handleTimelineClick}
                    >
                        <div
                            className="timeline-range"
                            style={{
                                left: `${startPercentage}%`,
                                width: `${rangeWidth}%`
                            }}
                        ></div>
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
                            <span className="time-label">{formatTime(videoDuration)}</span>
                        </div>
                        <div className="selection-info">
                            <span>Selection: {formatTime(endTime - startTime)}</span>
                            <span> | Start: {formatTime(startTime)}</span>
                            <span> | End: {formatTime(endTime)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="file-section">
                <label>Output Location:</label>
                <Button onClick={selectTrimOutput}>Choose Output</Button>
                <div className="file-path">
                    {trimOutputPath || 'No output location selected'}
                </div>
            </div>

            <Button
                className="combine-button"
                onClick={trimVideo}
                disabled={!trimOutputPath || isProcessing}
            >
                Slice
            </Button>
        </div>
    );
};

export default TrimInterface;