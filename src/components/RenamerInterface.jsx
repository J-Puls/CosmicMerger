import React, { useState, useEffect } from 'react';
import {Button, FormControl} from "react-bootstrap";

const RenamerInterface = () => {
    const [directoryPath, setDirectoryPath] = useState(null);
    const [seasonNumber, setSeasonNumber] = useState('1');
    const [episodeOffset, setEpisodeOffset] = useState('1'); // NEW: Episode offset state
    const [currentStep, setCurrentStep] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [renamedFiles, setRenamedFiles] = useState([]);
    const [preview, setPreview] = useState(null);
    const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

    const selectDirectory = async () => {
        if (!window.electronAPI) return;

        const path = await window.electronAPI.selectDirectory();
        if (path) {
            setDirectoryPath(path);
            setCurrentStep(2); // Auto-advance to step 2
        }
    };

    const handleSeasonChange = (e) => {
        const value = e.target.value;
        if (value === '' || (parseInt(value) > 0 && parseInt(value) <= 99)) {
            setSeasonNumber(value);
        }
    };

    // NEW: Handle episode offset changes
    const handleEpisodeOffsetChange = (e) => {
        const value = e.target.value;
        if (value === '' || (parseInt(value) > 0 && parseInt(value) <= 999)) {
            setEpisodeOffset(value);
        }
    };

    // Auto-generate preview whenever directory, season number, or episode offset changes
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

            try {
                const result = await window.electronAPI.previewFiles({
                    dirPath: directoryPath,
                    seasonNumber: seasonNum,
                    episodeOffset: episodeOffsetNum // NEW: Pass episode offset to backend
                });

                if (result.success) {
                    setPreview(result.preview);
                }
            } catch (error) {
                console.error('Error generating preview:', error);
                setPreview(null);
            } finally {
                setIsGeneratingPreview(false);
            }
        };

        // Small delay to avoid too many rapid calls while typing
        const timeoutId = setTimeout(generatePreview, 300);
        return () => clearTimeout(timeoutId);
    }, [directoryPath, seasonNumber, episodeOffset]); // NEW: Added episodeOffset dependency

    const renameFiles = async () => {
        if (!directoryPath || !seasonNumber || !episodeOffset || !window.electronAPI) {
            alert('Please select a directory and enter valid season and episode numbers');
            return;
        }

        const seasonNum = parseInt(seasonNumber, 10);
        const episodeOffsetNum = parseInt(episodeOffset, 10);
        if (isNaN(seasonNum) || seasonNum <= 0 || isNaN(episodeOffsetNum) || episodeOffsetNum <= 0) {
            alert('Please enter valid season and episode numbers');
            return;
        }

        setIsProcessing(true);
        setRenamedFiles([]);

        try {
            const result = await window.electronAPI.renameFiles({
                dirPath: directoryPath,
                seasonNumber: seasonNum,
                episodeOffset: episodeOffsetNum // NEW: Pass episode offset to backend
            });

            if (result.success) {
                setRenamedFiles(result.renamedFiles || []);
                setCurrentStep(3); // Move to completion step (now step 3)
            }
        } catch (error) {
            console.error('Error renaming files:', error);
            alert(`Error: ${error.error || error.message || 'Unknown error occurred'}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const resetRenamer = () => {
        setDirectoryPath(null);
        setSeasonNumber('1');
        setEpisodeOffset('1'); // NEW: Reset episode offset
        setCurrentStep(1);
        setRenamedFiles([]);
        setIsProcessing(false);
        setPreview(null);
        setIsGeneratingPreview(false);
    };

    const getStepClass = (stepNum) => {
        if (stepNum < currentStep) return 'workflow-step completed';
        if (stepNum === currentStep) return 'workflow-step active';
        return 'workflow-step';
    };

    const formatPath = (filePath) => {
        if (!filePath) return '';
        const parts = filePath.split(/[/\\]/);
        if (parts.length > 3) {
            return `.../${parts.slice(-3).join('/')}`;
        }
        return filePath;
    };

    return (
        <div className="renamer-interface d-flex flex-column gap-3">
            {/* Step 1: Select Directory */}
            <div className={`${getStepClass(1)} d-flex gap-3`}>
                <div className="step-number">1</div>
                <div className="step-content flex-fill">
                    <div className={`file-section ${directoryPath ? 'selected' : ''}`}>
                        <label>Select Directory:</label>
                        <Button onClick={selectDirectory}>Choose Folder</Button>
                        <div className="file-path">
                            {directoryPath ? formatPath(directoryPath) : 'No directory selected'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Step 2: Season Number, Episode Offset & Preview */}
            {currentStep >= 2 && (
                <div className={`${getStepClass(2)} d-flex gap-3`}>
                    <div className="step-number">2</div>
                    <div className="step-content flex-fill">
                        <div className={`file-section d-flex flex-column gap-3 ${seasonNumber && episodeOffset && directoryPath ? 'selected' : ''}`}>
                            <label>Settings:</label>
                            <div className="season-input-container d-flex flex-column gap-3">
                                <div className={'d-flex gap-3 align-items-center'}>
                                    <span>
                                    Season
                                </span>
                                    <FormControl
                                        type="number"
                                        min="1"
                                        max="99"
                                        value={seasonNumber}
                                        onChange={handleSeasonChange}
                                        placeholder="Season"
                                        disabled={!directoryPath}
                                        className="season-input flex-shrink-1"
                                        style={{ maxWidth: 100 }}
                                    />
                                    <span>
                                        Episode Offset
                                    </span>
                                    <FormControl
                                        type="number"
                                        min="1"
                                        max="999"
                                        value={episodeOffset}
                                        onChange={handleEpisodeOffsetChange}
                                        placeholder="Start Episode"
                                        disabled={!directoryPath}
                                        className="episode-offset-input flex-shrink-1"
                                        style={{ maxWidth: 120 }}
                                    />
                                </div>

                            </div>

                            {/* Auto Preview Section */}
                            {isGeneratingPreview && (
                                <div className="preview-loading d-flex align-items-center gap-2 text-primary">
                                    <div className="spinner-border spinner-border-sm" role="status"></div>
                                    <span>Generating preview...</span>
                                </div>
                            )}

                            {preview.directoryRename && (
                                <div className="directory-preview preview-section">
                                    <h6 className={'text-warning'}>Directory rename:</h6>
                                    <small className="preview-item d-flex gap-3 align-items-center p-2 flex-fill rounded">
                                        <div className="original-name text-white-50">{preview.directoryRename.originalName}</div>
                                        <div className="arrow">-></div>
                                        <div className="new-name text-primary">{preview.directoryRename.newName}</div>
                                    </small>
                                </div>
                            )}

                            {preview && !isGeneratingPreview && (
                                <>
                                    <div className="preview-section">
                                        <h6 className={'text-warning'}>File rename ({preview.totalFiles}):</h6>
                                        <div className="preview-list d-flex flex-column gap-1 ps-3 mb-3">
                                            {preview.fileRenames.slice(0, 5).map((file, index) => (
                                                <small key={index} className="preview-item d-flex gap-3 align-items-center">
                                                    <div className="original-name text-white-50">{file.originalName}</div>
                                                    <div className="arrow">-></div>
                                                    <div className="new-name text-primary">{file.newName}</div>
                                                </small>
                                            ))}
                                            {preview.fileRenames.length > 5 && (
                                                <div className="more-files text-white-50">
                                                    ... and {preview.fileRenames.length - 5} more files
                                                </div>
                                            )}
                                        </div>


                                    </div>
                                    <div className="rename-controls">
                                        <Button
                                            className="rename-button"
                                            onClick={renameFiles}
                                            disabled={isProcessing || !preview}
                                    >
                                            {isProcessing ?
                                                'Renaming...' : `Rename (${preview.totalFiles} files)`}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Step 3: Completion */}
            {currentStep >= 3 && renamedFiles.length > 0 && (
                <div className="workflow-step completed d-flex gap-3">
                    <div className="step-number">✓</div>
                    <div className="step-content d-flex flex-column file-section flex-fill gap-3">
                        <div className="d-flex justify-content-between">
                            <label>Renaming Complete!</label>
                            <p className="results-summary">
                                Successfully renamed {renamedFiles.length} file(s)
                            </p>
                        </div>

                        <div className="renamed-files-list">
                            <h5>Renamed Files:</h5>
                            <div className="files-grid d-flex flex-column gap-1 ps-3 text-primary">
                                {renamedFiles.slice(0, 10).map((file, index) => (
                                    <small key={index} className="file-rename-item d-flex gap-3 align-items-center">
                                        <div className="original-name">{file.originalName}</div>
                                        <div className="arrow">→</div>
                                        <div className="new-name">{file.newName}</div>
                                    </small>
                                ))}
                                {renamedFiles.length > 10 && (
                                    <div className="more-files">
                                        ... and {renamedFiles.length - 10} more files
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="action-buttons">
                            <Button className="reset-button" onClick={resetRenamer}>
                                Rename Another Folder
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RenamerInterface;