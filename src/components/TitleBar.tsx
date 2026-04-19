import { useState, useEffect } from 'react';
import { LuMinus, LuSquare, LuX, LuMaximize2 } from 'react-icons/lu';

const TitleBar = () => {
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        if (!window.electronAPI) return;
        window.electronAPI.onMaximizeChange((_event, maximized) => setIsMaximized(maximized));
        return () => window.electronAPI.removeMaximizeListener();
    }, []);

    return (
        <div className="app-titlebar">
            <div className="titlebar-drag" />
            <div className="titlebar-controls">
                <button className="titlebar-btn" onClick={() => window.electronAPI?.windowMinimize()}>
                    <LuMinus size={14} />
                </button>
                <button className="titlebar-btn" onClick={() => window.electronAPI?.windowMaximize()}>
                    {isMaximized ? <LuSquare size={13} /> : <LuMaximize2 size={13} />}
                </button>
                <button className="titlebar-btn titlebar-close" onClick={() => window.electronAPI?.windowClose()}>
                    <LuX size={14} />
                </button>
            </div>
        </div>
    );
};

export default TitleBar;
