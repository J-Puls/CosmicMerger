import { ReactElement } from 'react';
import { LuMerge, LuScissors, LuFilePen } from 'react-icons/lu';
import { AppMode } from 'types/electron';

interface ModeToggleProps {
    currentMode: AppMode;
    onModeChange: (mode: AppMode) => void;
}

const modes: Array<{ id: AppMode; icon: ReactElement; label: string }> = [
    { id: 'rename', icon: <LuFilePen size={18} />, label: 'Rename' },
    { id: 'merge',  icon: <LuMerge size={18} />,   label: 'Merge'  },
    { id: 'trim',   icon: <LuScissors size={18} />, label: 'Trim'   },
];

const ModeToggle = ({ currentMode, onModeChange }: ModeToggleProps) => {
    return (
        <>
            {modes.map(mode => (
                <button
                    key={mode.id}
                    className={`sidebar-nav-btn ${currentMode === mode.id ? 'active' : ''}`}
                    onClick={() => onModeChange(mode.id)}
                    title={mode.label}
                >
                    {mode.icon}
                </button>
            ))}
        </>
    );
};

export default ModeToggle;
