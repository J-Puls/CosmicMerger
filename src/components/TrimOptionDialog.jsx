import React, { useEffect, useState } from 'react';

const TrimOptionDialog = ({ onStartTrim, onDismiss }) => {
    const [show, setShow] = useState(false);

    useEffect(() => {
        // Trigger show animation after component mounts
        const timer = setTimeout(() => setShow(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const handleStartTrim = () => {
        setShow(false);
        setTimeout(onStartTrim, 300); // Wait for animation to complete
    };

    const handleDismiss = () => {
        setShow(false);
        setTimeout(onDismiss, 300); // Wait for animation to complete
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