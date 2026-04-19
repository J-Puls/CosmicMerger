import { useState, useEffect } from 'react';
import ModeToggle from 'components/ModeToggle';
import MergeInterface from 'components/MergeInterface';
import TrimInterface from 'components/TrimInterface';
import RenamerInterface from 'components/RenamerInterface';
import ProgressSection from 'components/ProgressSection';
import TrimOptionDialog from 'components/TrimOptionDialog';
import { ToastContainer, ToastProvider, useToast } from 'components/toast_container';
import TitleBar from 'components/TitleBar';
import { AppMode, ProgressData } from 'types/electron';

const AppInner = () => {
    const [currentMode, setCurrentMode] = useState<AppMode>('rename');
    const [progressData, setProgressData] = useState<ProgressData | null>(null);
    const [currentOperationId, setCurrentOperationId] = useState<string | null>(null);
    const [showTrimDialog, setShowTrimDialog] = useState(false);
    const [pendingTrimFile, setPendingTrimFile] = useState<string | null>(null);

    useEffect(() => {
        if (!window.electronAPI) return;

        const handleProgressUpdate = (_event: unknown, data: ProgressData) => {
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

    const handleMergeComplete = (outputPath: string) => {
        setPendingTrimFile(outputPath);
        setShowTrimDialog(true);
    };

    const handleStartTrimWorkflow = () => {
        setShowTrimDialog(false);
        setCurrentMode('trim');
    };

    const handleDismissTrimDialog = () => {
        setShowTrimDialog(false);
        setPendingTrimFile(null);
    };

    const { addToast } = useToast();

    const handleCancelOperation = async () => {
        if (currentOperationId && window.electronAPI) {
            try {
                await window.electronAPI.cancelOperation(currentOperationId);
            } catch {
                addToast('Failed to cancel the operation.', 'error');
            }
        }
    };

    const modeTitles: Record<AppMode, string> = {
        merge: 'Merge',
        trim: 'Trim',
        rename: 'Rename',
    };

    const renderCurrentInterface = () => {
        switch (currentMode) {
            case 'merge':
                return <MergeInterface onMergeComplete={handleMergeComplete} />;
            case 'trim':
                return <TrimInterface pendingFile={pendingTrimFile} />;
            case 'rename':
                return <RenamerInterface />;
        }
    };

    return (
        <div className="app-shell">
            <TitleBar />
            <div className="app-body">
                <nav className="app-sidebar">
                    <div className="app-logo">CM</div>
                    <ModeToggle
                        currentMode={currentMode}
                        onModeChange={setCurrentMode}
                    />
                </nav>
                <main className="app-content">
                    <div className="content-inner">
                        <h1 className="page-title">{modeTitles[currentMode]}</h1>
                        {renderCurrentInterface()}
                        <ProgressSection
                            progressData={progressData}
                            onCancel={handleCancelOperation}
                            showCancel={!!currentOperationId}
                        />
                    </div>
                </main>
            </div>
            {showTrimDialog && (
                <TrimOptionDialog
                    onStartTrim={handleStartTrimWorkflow}
                    onDismiss={handleDismissTrimDialog}
                />
            )}
            <ToastContainer />
        </div>
    );
};

const App = () => (
    <ToastProvider>
        <AppInner />
    </ToastProvider>
);

export default App;
