import { useState, useEffect, ChangeEvent } from 'react';
import { LuArrowLeft, LuArrowRight, LuCheck, LuCircleAlert } from 'react-icons/lu';
import Stepper from 'components/Stepper';
import { useToast } from 'components/toast_container';
import { RenamePreview } from 'types/electron';

const RenamerInterface = () => {
    const { addToast } = useToast();
    const [directoryPath, setDirectoryPath] = useState<string | null>(null);
    const [seasonNumber, setSeasonNumber] = useState('1');
    const [episodeOffset, setEpisodeOffset] = useState('1');
    const [currentStep, setCurrentStep] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [preview, setPreview] = useState<RenamePreview | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

    const selectDirectory = async () => {
        if (!window.electronAPI) return;
        const path = await window.electronAPI.selectDirectory();
        if (path) setDirectoryPath(path);
    };

    const handleSeasonChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === '' || (parseInt(value) > 0 && parseInt(value) <= 99)) {
            setSeasonNumber(value);
        }
    };

    const handleEpisodeOffsetChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === '' || (parseInt(value) > 0 && parseInt(value) <= 999)) {
            setEpisodeOffset(value);
        }
    };

    useEffect(() => {
        const generatePreview = async () => {
            if (!directoryPath || !seasonNumber || !episodeOffset || !window.electronAPI) {
                setPreview(null);
                return;
            }
            const seasonNum = parseInt(seasonNumber, 10);
            const episodeOffsetNum = parseInt(episodeOffset, 10);
            if (isNaN(seasonNum) || seasonNum <= 0 || isNaN(episodeOffsetNum) || episodeOffsetNum <= 0) {
                setPreview(null);
                return;
            }
            setIsGeneratingPreview(true);
            setPreviewError(null);
            try {
                const result = await window.electronAPI.previewFiles({
                    dirPath: directoryPath,
                    seasonNumber: seasonNum,
                    episodeOffset: episodeOffsetNum,
                });
                if (result.success) {
                    setPreview(result.preview ?? null);
                } else {
                    setPreview(null);
                    setPreviewError(result.error ?? 'Preview failed.');
                }
            } catch {
                setPreview(null);
                setPreviewError('Unexpected error generating preview.');
            } finally {
                setIsGeneratingPreview(false);
            }
        };
        const id = setTimeout(generatePreview, 300);
        return () => clearTimeout(id);
    }, [directoryPath, seasonNumber, episodeOffset]);

    const renameFiles = async () => {
        if (!directoryPath || !seasonNumber || !episodeOffset || !window.electronAPI) return;
        const seasonNum = parseInt(seasonNumber, 10);
        const episodeOffsetNum = parseInt(episodeOffset, 10);
        setIsProcessing(true);
        try {
            const result = await window.electronAPI.renameFiles({
                dirPath: directoryPath,
                seasonNumber: seasonNum,
                episodeOffset: episodeOffsetNum,
            });
            if (result.success) {
                resetRenamer();
            }
        } catch {
            addToast('Rename failed. Check that the folder is accessible.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const resetRenamer = () => {
        setDirectoryPath(null);
        setSeasonNumber('1');
        setEpisodeOffset('1');
        setCurrentStep(1);
        setIsProcessing(false);
        setPreview(null);
        setPreviewError(null);
        setIsGeneratingPreview(false);
    };

    const settingsValid = (): boolean => {
        const s = parseInt(seasonNumber, 10);
        const e = parseInt(episodeOffset, 10);
        return !isNaN(s) && s > 0 && !isNaN(e) && e > 0;
    };

    const canAdvance = (): boolean => {
        if (currentStep === 1) return !!directoryPath;
        if (currentStep === 2) return settingsValid();
        return false;
    };

    const goBack = () => setCurrentStep(s => s - 1);
    const goNext = () => setCurrentStep(s => s + 1);

    return (
        <div className="merge-wizard">
            <Stepper steps={['Folder', 'Settings', 'Review']} currentStep={currentStep} />

            <div className="wizard-body">
                {currentStep === 1 && (
                    <div className={`file-section ${directoryPath ? 'selected' : ''}`}>
                        <label>Select Folder</label>
                        <button className="btn btn-secondary" onClick={selectDirectory}>
                            {directoryPath ? 'Change Folder' : 'Choose Folder'}
                        </button>
                        <div className="file-path">{directoryPath ?? 'No folder selected'}</div>
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="file-section selected">
                        <label>Settings</label>
                        <div className="rename-settings">
                            <div className="rename-setting-row">
                                <span className="rename-setting-label">Season</span>
                                <input
                                    type="number"
                                    className="form-control"
                                    min="1"
                                    max="99"
                                    value={seasonNumber}
                                    onChange={handleSeasonChange}
                                    style={{ maxWidth: 80 }}
                                />
                            </div>
                            <div className="rename-setting-row">
                                <span className="rename-setting-label">First Episode</span>
                                <input
                                    type="number"
                                    className="form-control"
                                    min="1"
                                    max="999"
                                    value={episodeOffset}
                                    onChange={handleEpisodeOffsetChange}
                                    style={{ maxWidth: 80 }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 3 && (
                    <div className={`file-section ${previewError ? '' : 'selected'}`}>
                        <label>Review</label>
                        {previewError && (
                            <div className="review-error">
                                <LuCircleAlert size={14} />
                                <span>{previewError}</span>
                            </div>
                        )}
                        {isGeneratingPreview && (
                            <div className="review-loading">
                                <div className="spinner-border spinner-border-sm" role="status" />
                                <span>Generating preview…</span>
                            </div>
                        )}
                        {preview && !isGeneratingPreview && (
                            <div className="rename-review-list">
                                {preview.directoryRename && (
                                    <div className="rename-review-folder">
                                        <span className="rename-preview-group-label">Folder</span>
                                        <div className="rename-review-row">
                                            <span className="rename-review-original">{preview.directoryRename.originalName}</span>
                                            <LuArrowRight size={12} className="rename-review-arrow" />
                                            <span className="rename-review-new">{preview.directoryRename.newName}</span>
                                        </div>
                                    </div>
                                )}
                                <div className="rename-review-files">
                                    <span className="rename-preview-group-label">Files ({preview.totalFiles})</span>
                                    <div className="rename-review-scroll">
                                        {preview.fileRenames.map((file, index) => (
                                            <div key={index} className="rename-review-row">
                                                <span className="rename-review-original">{file.originalName}</span>
                                                <LuArrowRight size={12} className="rename-review-arrow" />
                                                <span className="rename-review-new">{file.newName}</span>
                                            </div>
                                        ))}
                                    </div>
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
                        onClick={renameFiles}
                        disabled={isProcessing || !preview || isGeneratingPreview || !!previewError}
                    >
                        <LuCheck size={15} /> {isProcessing ? 'Renaming…' : `Rename ${preview ? `(${preview.totalFiles})` : ''}`}
                    </button>
                )}
            </div>
        </div>
    );
};

export default RenamerInterface;
