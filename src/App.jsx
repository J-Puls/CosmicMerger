import React, { useState, useEffect } from 'react';
import StarField from './components/StarField';
import ModeToggle from './components/ModeToggle';
import MergeInterface from './components/MergeInterface';
import TrimInterface from './components/TrimInterface';
import ProgressSection from './components/ProgressSection';
import TrimOptionDialog from './components/TrimOptionDialog';
import CursorEffects from './components/CursorEffects';
import './App.css';

function App() {
    const [currentMode, setCurrentMode] = useState('merge');
    const [progressData, setProgressData] = useState(null);
    const [currentOperationId, setCurrentOperationId] = useState(null);
    const [showTrimDialog, setShowTrimDialog] = useState(false);
    const [pendingTrimFile, setPendingTrimFile] = useState(null);

    // Listen for progress updates from Electron
    useEffect(() => {
        if (!window.electronAPI) return;

        const handleProgressUpdate = (event, data) => {
            setProgressData(data);

            if (data.operationId && data.status === 'started') {
                setCurrentOperationId(data.operationId);
            }

            if (data.status === 'completed' || data.status === 'error' || data.status === 'cancelled') {
                setCurrentOperationId(null);
            }
        };

        window.electronAPI.onProgressUpdate(handleProgressUpdate);

        return () => {
            window.electronAPI.removeProgressListener();
        };
    }, []);

    const handleMergeComplete = (outputPath) => {
        setPendingTrimFile(outputPath);
        setShowTrimDialog(true);
    };

    const handleStartTrimWorkflow = () => {
        setShowTrimDialog(false);
        setCurrentMode('trim');
        // The TrimInterface will handle loading the file
    };

    const handleDismissTrimDialog = () => {
        setShowTrimDialog(false);
        setPendingTrimFile(null);
    };

    const handleCancelOperation = async () => {
        if (currentOperationId && window.electronAPI) {
            try {
                const result = await window.electronAPI.cancelOperation(currentOperationId);

                // Check if the cancellation itself failed
                if (result && !result.success) {
                    const errorMessage = result.error || result.message || 'Failed to cancel operation';
                    console.error('Error cancelling operation:', errorMessage);

                    // Optionally show user-friendly message
                    setProgressData(prevData => ({
                        ...prevData,
                        status: 'error',
                        message: `Cancel failed: ${errorMessage}`
                    }));
                }
            } catch (error) {
                console.error('Error cancelling operation:', error);

                // Extract meaningful error message
                let errorMessage = 'Failed to cancel operation';
                if (typeof error === 'object' && error !== null) {
                    errorMessage = error.error || error.message || errorMessage;
                } else if (typeof error === 'string') {
                    errorMessage = error;
                }

                // Show user-friendly error message
                setProgressData(prevData => ({
                    ...prevData,
                    status: 'error',
                    message: `Cancel failed: ${errorMessage}`
                }));
            }
        }
    };

    return (
        <div className="app">
            <StarField />
            <CursorEffects />

            <div className="container">
                <h1>Cosmic Merger</h1>

                <ModeToggle
                    currentMode={currentMode}
                    onModeChange={setCurrentMode}
                />

                {currentMode === 'merge' ? (
                    <MergeInterface onMergeComplete={handleMergeComplete} />
                ) : (
                    <TrimInterface pendingFile={pendingTrimFile} />
                )}

                <ProgressSection
                    progressData={progressData}
                    onCancel={handleCancelOperation}
                    showCancel={!!currentOperationId}
                />
            </div>

            {showTrimDialog && (
                <TrimOptionDialog
                    onStartTrim={handleStartTrimWorkflow}
                    onDismiss={handleDismissTrimDialog}
                />
            )}
        </div>
    );
}

export default App;