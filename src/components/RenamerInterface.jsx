import React, { useState } from 'react';
import {Button, FormControl} from "react-bootstrap";

const RenamerInterface = () => {
    const [directoryPath, setDirectoryPath] = useState(null);
    const [seasonNumber, setSeasonNumber] = useState('1');
    const [currentStep, setCurrentStep] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [renamedFiles, setRenamedFiles] = useState([]);

    const selectDirectory = async () => {
        if (!window.electronAPI) return;

        const path = await window.electronAPI.selectDirectory();
        if (path) {
            setDirectoryPath(path);
            setCurrentStep(2);
        }
    };

    const handleSeasonChange = (e) => {
        const value = e.target.value;
        if (value === '' || (parseInt(value) > 0 && parseInt(value) <= 99)) {
            setSeasonNumber(value);
            setCurrentStep(value ? 3 : 2);
        }
    };

    const renameFiles = async () => {
        if (!directoryPath || !seasonNumber || !window.electronAPI) {
            alert('Please select a directory and enter a valid season number');
            return;
        }

        const seasonNum = parseInt(seasonNumber, 10);
        if (isNaN(seasonNum) || seasonNum <= 0) {
            alert('Please enter a valid season number');
            return;
        }

        setIsProcessing(true);
        setRenamedFiles([]);

        try {
            const result = await window.electronAPI.renameFiles({
                dirPath: directoryPath,
                seasonNumber: seasonNum
            });

            if (result.success) {
                setRenamedFiles(result.renamedFiles || []);
                setCurrentStep(4);
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
        setCurrentStep(1);
        setRenamedFiles([]);
        setIsProcessing(false);
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

            <div className={`${getStepClass(2)} d-flex gap-3`}>
                <div className="step-number">2</div>
                <div className="step-content flex-fill">
                    <div className={`file-section ${seasonNumber && directoryPath ? 'selected' : ''}`}>
                        <label>Season Number:</label>
                        <div className="season-input-container d-flex gap-3 align-items-center">
                            <FormControl
                                type="number"
                                min="1"
                                max="99"
                                value={seasonNumber}
                                onChange={handleSeasonChange}
                                placeholder="Enter season number"
                                disabled={!directoryPath}
                                className="season-input flex-shrink-1"
                                style={{ maxWidth: 100 }}
                            />
                            <span className="season-preview flex-shrink-0 lead d-flex gap-3">
                                <span>
                                    ->
                                </span>
                                {seasonNumber && `Season ${seasonNumber.padStart(2, '0')}`}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`${getStepClass(3)} d-flex gap-3`}>
                <div className="step-number">3</div>
                <div className="step-content flex-fill">
                    <Button
                        className="rename-button"
                        onClick={renameFiles}
                        disabled={!directoryPath || !seasonNumber || isProcessing || renamedFiles?.length}
                    >
                        {isProcessing ? 'Renaming...' : 'Rename Episodes'}
                    </Button>
                </div>
            </div>

            {currentStep >= 4 && renamedFiles.length > 0 && (
                <div className="workflow-step completed d-flex gap-3">
                    <div className="step-number">✓</div>
                    <div className="step-content d-flex flex-column file-section flex-fill gap-3">

                           <div className={'d-flex justify-content-between'}>
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