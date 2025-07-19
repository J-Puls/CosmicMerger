import React from 'react';
import {Button} from "react-bootstrap";


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
        <div className="mode-toggle d-flex justify-content-center">
            {modes.map(mode => (
                <Button
                    key={mode.id}
                    className={`mode-button d-flex gap-2 align-items-center flex-fill rounded-0 justify-content-center ${currentMode === mode.id ? 'active' : ''}`}
                    onClick={() => onModeChange(mode.id)}
                    variant={currentMode === mode.id ? 'secondary' : 'dark'}
                    title={mode.description}
                >
                    <span className="mode-icon">{mode.icon}</span>
                    <span className="mode-label">{mode.label}</span>
                </Button>
            ))}
        </div>
    );
};

export default ModeToggle;