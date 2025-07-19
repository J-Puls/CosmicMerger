import React, { useState, useEffect } from 'react';
import StarField from './components/StarField';
import ModeToggle from './components/ModeToggle';
import MergeInterface from './components/MergeInterface';
import TrimInterface from './components/TrimInterface';
import RenamerInterface from './components/RenamerInterface';
import ProgressSection from './components/ProgressSection';
import TrimOptionDialog from './components/TrimOptionDialog';
import CursorEffects from './components/CursorEffects';
import {Container} from "react-bootstrap";

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
                await window.electronAPI.cancelOperation(currentOperationId);
            } catch (error) {
                console.error('Error cancelling operation:', error);
            }
        }
    };

    const renderCurrentInterface = () => {
        switch (currentMode) {
            case 'merge':
                return <MergeInterface onMergeComplete={handleMergeComplete} />;
            case 'trim':
                return <TrimInterface pendingFile={pendingTrimFile} />;
            case 'rename':
                return <RenamerInterface />;
            default:
                return <MergeInterface onMergeComplete={handleMergeComplete} />;
        }
    };

    return (
        <Container className="app p-5">

            <StarField />

            <CursorEffects />

            <section className={'d-flex flex-column gap-3'}>

                <ModeToggle
                    currentMode={currentMode}
                    onModeChange={setCurrentMode}
                />

                <div className={'mt-5'}>
                    {renderCurrentInterface()}
                </div>

                <ProgressSection
                    progressData={progressData}
                    onCancel={handleCancelOperation}
                    showCancel={!!currentOperationId}
                />
            </section>

            {showTrimDialog && (
                <TrimOptionDialog
                    onStartTrim={handleStartTrimWorkflow}
                    onDismiss={handleDismissTrimDialog}
                />
            )}
        </Container>
    );
}

export default App;