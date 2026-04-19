import { useEffect, useState } from 'react';

interface TrimOptionDialogProps {
    onStartTrim: () => void;
    onDismiss: () => void;
}

const TrimOptionDialog = ({ onStartTrim, onDismiss }: TrimOptionDialogProps) => {
    const [show, setShow] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setShow(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const handleStartTrim = () => {
        setShow(false);
        setTimeout(onStartTrim, 300);
    };

    const handleDismiss = () => {
        setShow(false);
        setTimeout(onDismiss, 300);
    };

    return (
        <div className={`trim-option-dialog ${show ? 'show' : ''}`}>
            <div className="trim-option-content">
                <div className="trim-option-header">
                    <h3>Merge Complete!</h3>
                    <p>Would you like to trim your newly created video?</p>
                </div>
                <div className="trim-option-buttons">
                    <button className="trim-option-btn secondary" onClick={handleDismiss}>
                        Continue
                    </button>
                    <button className="trim-option-btn primary" onClick={handleStartTrim}>
                        Trim Video
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TrimOptionDialog;
