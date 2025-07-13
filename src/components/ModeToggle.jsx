import React from 'react';
import './ModeToggle.css';

const ModeToggle = ({ currentMode, onModeChange }) => {
    return (
        <div className="mode-toggle">
            <button
                className={`mode-btn ${currentMode === 'merge' ? 'active' : ''}`}
                onClick={() => onModeChange('merge')}
            >
                Merge Mode
            </button>
            <button
                className={`mode-btn ${currentMode === 'trim' ? 'active' : ''}`}
                onClick={() => onModeChange('trim')}
            >
                Trim Mode
            </button>
        </div>
    );
};

export default ModeToggle;