import { useState, useEffect } from 'react';
import { LuArrowLeft, LuArrowRight, LuMerge } from 'react-icons/lu';
import Stepper from 'components/Stepper';
import { useToast } from 'components/toast_container';

interface MergeInterfaceProps {
    onMergeComplete: (outputPath: string) => void;
}

const MergeInterface = ({ onMergeComplete }: MergeInterfaceProps) => {
    const { addToast } = useToast();
    const [videoPath, setVideoPath] = useState<string | null>(null);
    const [audioPath, setAudioPath] = useState<string | null>(null);
    const [outputPath, setOutputPath] = useState<string | null>(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        setVideoPath(null);
        setAudioPath(null);
        setOutputPath(null);
        setCurrentStep(1);
        setIsProcessing(false);
    }, []);

    const selectVideo = async () => {
        if (!window.electronAPI) return;
        const path = await window.electronAPI.selectVideoFile();
        if (path) setVideoPath(path);
    };

    const selectAudio = async () => {
        if (!window.electronAPI) return;
        const path = await window.electronAPI.selectAudioFile();
        if (path) setAudioPath(path);
    };

    const selectOutput = async () => {
        if (!window.electronAPI) return;
        const path = await window.electronAPI.selectOutputFile();
        if (path) setOutputPath(path);
    };

    const combineFiles = async () => {
        if (!videoPath || !audioPath || !outputPath || !window.electronAPI) return;
        setIsProcessing(true);
        try {
            const result = await window.electronAPI.combineFiles({ videoPath, audioPath, outputPath });
            if (result.success) onMergeComplete(outputPath);
        } catch {
            addToast('Merge failed. Check that all files are valid and accessible.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const canAdvance = (): boolean => {
        if (currentStep === 1) return !!videoPath;
        if (currentStep === 2) return !!audioPath;
        if (currentStep === 3) return !!outputPath;
        return false;
    };

    const goBack = () => setCurrentStep(s => s - 1);
    const goNext = () => setCurrentStep(s => s + 1);

    return (
        <div className="merge-wizard">
            <Stepper steps={['Video', 'Audio', 'Output', 'Review']} currentStep={currentStep} />

            <div className="wizard-body">
                {currentStep === 1 && (
                    <div className={`file-section ${videoPath ? 'selected' : ''}`}>
                        <label>Select Video File</label>
                        <button className="btn btn-secondary" onClick={selectVideo}>
                            {videoPath ? 'Change Video' : 'Choose Video'}
                        </button>
                        <div className="file-path">{videoPath ?? 'No video selected'}</div>
                    </div>
                )}

                {currentStep === 2 && (
                    <div className={`file-section ${audioPath ? 'selected' : ''}`}>
                        <label>Select Audio File</label>
                        <button className="btn btn-secondary" onClick={selectAudio}>
                            {audioPath ? 'Change Audio' : 'Choose Audio'}
                        </button>
                        <div className="file-path">{audioPath ?? 'No audio selected'}</div>
                    </div>
                )}

                {currentStep === 3 && (
                    <div className={`file-section ${outputPath ? 'selected' : ''}`}>
                        <label>Output Location</label>
                        <button className="btn btn-secondary" onClick={selectOutput}>
                            {outputPath ? 'Change Output' : 'Choose Output'}
                        </button>
                        <div className="file-path">{outputPath ?? 'No output location selected'}</div>
                    </div>
                )}

                {currentStep === 4 && (
                    <div className="file-section selected">
                        <label>Review</label>
                        <div className="review-summary">
                            <div className="review-row">
                                <span className="review-label">Video</span>
                                <span className="review-path">{videoPath}</span>
                            </div>
                            <div className="review-row">
                                <span className="review-label">Audio</span>
                                <span className="review-path">{audioPath}</span>
                            </div>
                            <div className="review-row">
                                <span className="review-label">Output</span>
                                <span className="review-path">{outputPath}</span>
                            </div>
                        </div>
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

                {currentStep < 4 ? (
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
                        onClick={combineFiles}
                        disabled={isProcessing}
                    >
                        <LuMerge size={15} /> {isProcessing ? 'Merging…' : 'Merge'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default MergeInterface;
