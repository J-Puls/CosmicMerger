import { useState, useEffect, ChangeEvent } from 'react';
import { LuArrowLeft, LuArrowRight, LuFilePen, LuCheck } from 'react-icons/lu';
import Stepper from 'components/Stepper';
import { useToast } from 'components/toast_container';
import { RenamedFile, RenamePreview } from 'types/electron';

const RenamerInterface = () => {
    const { addToast } = useToast();
    const [directoryPath, setDirectoryPath] = useState<string | null>(null);
    const [seasonNumber, setSeasonNumber] = useState('1');
    const [episodeOffset, setEpisodeOffset] = useState('1');
    const [currentStep, setCurrentStep] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [renamedFiles, setRenamedFiles] = useState<RenamedFile[]>([]);
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
        setRenamedFiles([]);
        try {
            const result = await window.electronAPI.renameFiles({
                dirPath: directoryPath,
                seasonNumber: seasonNum,
                episodeOffset: episodeOffsetNum,
            });
            if (result.success) {
                setRenamedFiles(result.renamedFiles ?? []);
                setCurrentStep(4);
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
        setRenamedFiles([]);
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

    if (currentStep === 4) {
        return (
            <div className="rename-complete">
                <div className="file-section selected">
                    <label>Rename Complete</label>
                    <p className="rename-complete-summary">
                        Successfully renamed {renamedFiles.length} file{renamedFiles.length !== 1 ? 's' : ''}
                    </p>
                    <div className="renamed-files-list">
                        {renamedFiles.slice(0, 10).map((file, index) => (
                            <div key={index} className="review-row">
                                <span className="review-path" style={{ color: 'var(--text-muted)' }}>{file.originalName}</span>
                                <span className="review-label" style={{ minWidth: 'auto' }}>{'→'}</span>
                                <span className="review-path">{file.newName}</span>
                            </div>
                        ))}
                        {renamedFiles.length > 10 && (
                            <div className="file-path">… and {renamedFiles.length - 10} more files</div>
                        )}
                    </div>
                </div>
                <div className="wizard-nav" style={{ borderTop: 'none', paddingTop: 0, marginTop: '1rem' }}>
                    <div />
                    <button className="btn btn-secondary d-flex align-items-center gap-2" onClick={resetRenamer}>
                        <LuFilePen size={15} /> Rename Another Folder
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="merge-wizard">
            <Stepper steps={['Folder', 'Settings', 'Preview']} currentStep={currentStep} />

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
                        <label>Preview</label>
                        {previewError && (
                            <div className="file-path" style={{ color: 'var(--bs-danger)' }}>{previewError}</div>
                        )}
                        {isGeneratingPreview && (
                            <div className="preview-loading d-flex align-items-center gap-2">
                                <div className="spinner-border spinner-border-sm" role="status" />
                                <span className="file-path">Generating preview…</span>
                            </div>
                        )}
                        {preview && !isGeneratingPreview && (
                            <div className="rename-preview-list">
                                {preview.directoryRename && (
                                    <div className="rename-preview-group">
                                        <span className="rename-preview-group-label">Folder</span>
                                        <div className="review-row">
                                            <span className="review-path" style={{ color: 'var(--text-muted)' }}>{preview.directoryRename.originalName}</span>
                                            <span className="review-label" style={{ minWidth: 'auto' }}>{'→'}</span>
                                            <span className="review-path">{preview.directoryRename.newName}</span>
                                        </div>
                                    </div>
                                )}
                                <div className="rename-preview-group">
                                    <span className="rename-preview-group-label">Files ({preview.totalFiles})</span>
                                    {preview.fileRenames.slice(0, 5).map((file, index) => (
                                        <div key={index} className="review-row">
                                            <span className="review-path" style={{ color: 'var(--text-muted)' }}>{file.originalName}</span>
                                            <span className="review-label" style={{ minWidth: 'auto' }}>{'→'}</span>
                                            <span className="review-path">{file.newName}</span>
                                        </div>
                                    ))}
                                    {preview.fileRenames.length > 5 && (
                                        <div className="file-path">… and {preview.fileRenames.length - 5} more files</div>
                                    )}
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
