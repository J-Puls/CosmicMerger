import React, { useState, useEffect } from 'react';
import './MergeInterface.css';

const MergeInterface = ({ onMergeComplete }) => {
    const [videoPath, setVideoPath] = useState(null);
    const [audioPath, setAudioPath] = useState(null);
    const [outputPath, setOutputPath] = useState(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);

    const selectVideo = async () => {
        if (!window.electronAPI) return;

        const path = await window.electronAPI.selectVideoFile();
        if (path) {
            setVideoPath(path);
            setCurrentStep(2);

            // Auto-trigger audio selection after delay
            setTimeout(() => {
                if (!audioPath) {
                    selectAudio();
                }
            }, 500);
        }
    };

    const selectAudio = async () => {
        if (!window.electronAPI) return;

        const path = await window.electronAPI.selectAudioFile();
        if (path) {
            setAudioPath(path);
            setCurrentStep(3);

            // Auto-trigger output selection after delay
            setTimeout(() => {
                if (!outputPath) {
                    selectOutput();
                }
            }, 500);
        }
    };

    const selectOutput = async () => {
        if (!window.electronAPI) return;

        const path = await window.electronAPI.selectOutputFile();
        if (path) {
            setOutputPath(path);
            setCurrentStep(4);
        }
    };

    const combineFiles = async () => {
        if (!videoPath || !audioPath || !outputPath || !window.electronAPI) {
            alert('Please select all required files');
            return;
        }

        setIsProcessing(true);

        try {
            const result = await window.electronAPI.combineFiles({
                videoPath,
                audioPath,
                outputPath
            });

            if (result.success && onMergeComplete) {
                onMergeComplete(outputPath);
            }
        } catch (error) {
            console.error('Error combining files:', error);
            // Show more detailed error to user
            const errorMessage = error.error || error.message || 'Unknown error occurred';
            alert(`Failed to combine files: ${errorMessage}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const resetWorkflow = () => {
        setVideoPath(null);
        setAudioPath(null);
        setOutputPath(null);
        setCurrentStep(1);
        setIsProcessing(false);
    };

    // Reset workflow when component mounts
    useEffect(() => {
        resetWorkflow();
    }, []);

    const getStepClass = (stepNumber) => {
        if (stepNumber < currentStep) return 'workflow-step completed';
        if (stepNumber === currentStep) return 'workflow-step active';
        return 'workflow-step disabled';
    };

    return (
        <div className="merge-workflow">
            <div className={getStepClass(1)}>
                <div className="step-number">1</div>
                <div className="step-content">
                    <div className={`file-section ${videoPath ? 'selected' : ''}`}>
                        <label>Select Video File:</label>
                        <button onClick={selectVideo}>Choose Video</button>
                        <div className="file-path">
                            {videoPath || 'No video selected'}
                        </div>
                    </div>
                </div>
            </div>

            <div className={getStepClass(2)}>
                <div className="step-number">2</div>
                <div className="step-content">
                    <div className={`file-section ${audioPath ? 'selected' : ''}`}>
                        <label>Select Audio File:</label>
                        <button onClick={selectAudio} disabled={!videoPath}>
                            Choose Audio
                        </button>
                        <div className="file-path">
                            {audioPath || (videoPath ? 'Click to select audio file' : 'Select video first')}
                        </div>
                    </div>
                </div>
            </div>

            <div className={getStepClass(3)}>
                <div className="step-number">3</div>
                <div className="step-content">
                    <div className={`file-section ${outputPath ? 'selected' : ''}`}>
                        <label>Output Location:</label>
                        <button onClick={selectOutput} disabled={!audioPath}>
                            Choose Output
                        </button>
                        <div className="file-path">
                            {outputPath || (audioPath ? 'Click to choose output location' : 'Select audio first')}
                        </div>
                    </div>
                </div>
            </div>

            <div className={getStepClass(4)}>
                <div className="step-number">4</div>
                <div className="step-content">
                    <button
                        className="combine-button"
                        onClick={combineFiles}
                        disabled={!outputPath || isProcessing}
                    >
                        Collide
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MergeInterface;