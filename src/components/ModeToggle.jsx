import React from 'react';
import './ModeToggle.css';

const ModeToggle = ({ currentMode, onModeChange }) => {
    const modes = [
        {
            id: 'merge',
            label: 'Merge',
            icon: '🌌',
            description: 'Combine video and audio files'
        },
        {
            id: 'trim',
            label: 'Trim',
            icon: '✂️',
            description: 'Cut and trim video files'
        },
        {
            id: 'rename',
            label: 'Rename',
            icon: '📁',
            description: 'Rename video files for episodes'
        }
    ];

    return (
        <div className="mode-toggle">
            {modes.map(mode => (
                <button
                    key={mode.id}
                    className={`mode-button ${currentMode === mode.id ? 'active' : ''}`}
                    onClick={() => onModeChange(mode.id)}
                    title={mode.description}
                >
                    <span className="mode-icon">{mode.icon}</span>
                    <span className="mode-label">{mode.label}</span>
                </button>
            ))}
        </div>
    );
};

export default ModeToggle;