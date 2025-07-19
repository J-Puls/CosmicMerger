import React, { useState } from 'react';
import './RenamerInterface.css';

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
        <div className="renamer-interface">
            <div className={getStepClass(1)}>
                <div className="step-number">1</div>
                <div className="step-content">
                    <div className={`file-section ${directoryPath ? 'selected' : ''}`}>
                        <label>Select Directory:</label>
                        <button onClick={selectDirectory}>Choose Folder</button>
                        <div className="file-path">
                            {directoryPath ? formatPath(directoryPath) : 'No directory selected'}
                        </div>
                    </div>
                </div>
            </div>

            <div className={getStepClass(2)}>
                <div className="step-number">2</div>
                <div className="step-content">
                    <div className={`season-section ${seasonNumber && directoryPath ? 'selected' : ''}`}>
                        <label>Season Number:</label>
                        <div className="season-input-container">
                            <input
                                type="number"
                                min="1"
                                max="99"
                                value={seasonNumber}
                                onChange={handleSeasonChange}
                                placeholder="Enter season number"
                                disabled={!directoryPath}
                                className="season-input"
                            />
                            <span className="season-preview">
                                {seasonNumber && `→ Season ${seasonNumber.padStart(2, '0')}`}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className={getStepClass(3)}>
                <div className="step-number">3</div>
                <div className="step-content">
                    <button
                        className="rename-button"
                        onClick={renameFiles}
                        disabled={!directoryPath || !seasonNumber || isProcessing}
                    >
                        {isProcessing ? 'Renaming...' : 'Rename Episodes'}
                    </button>
                </div>
            </div>

            {currentStep >= 4 && renamedFiles.length > 0 && (
                <div className="step completed">
                    <div className="step-number">✓</div>
                    <div className="step-content">
                        <div className="results-section">
                            <h3>Renaming Complete!</h3>
                            <p className="results-summary">
                                Successfully renamed {renamedFiles.length} file(s)
                            </p>

                            <div className="renamed-files-list">
                                <h4>Renamed Files:</h4>
                                <div className="files-grid">
                                    {renamedFiles.slice(0, 10).map((file, index) => (
                                        <div key={index} className="file-rename-item">
                                            <div className="original-name">{file.originalName}</div>
                                            <div className="arrow">→</div>
                                            <div className="new-name">{file.newName}</div>
                                        </div>
                                    ))}
                                    {renamedFiles.length > 10 && (
                                        <div className="more-files">
                                            ... and {renamedFiles.length - 10} more files
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="action-buttons">
                                <button className="reset-button" onClick={resetRenamer}>
                                    Rename Another Folder
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RenamerInterface;