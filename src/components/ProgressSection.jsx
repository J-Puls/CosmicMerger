import React from 'react';


const ProgressSection = ({ progressData, onCancel, showCancel }) => {
    if (!progressData) return null;

    const getStatusClass = () => {
        if (progressData.status === 'error' || progressData.status === 'cancelled') {
            return 'status-message error';
        } else if (progressData.status === 'completed') {
            return 'status-message success';
        }
        return 'status-message';
    };

    return (
        <div className="progress-section">
            <div className="progress-bar">
                <div
                    className="progress-fill"
                    style={{ width: `${progressData.percent || 0}%` }}
                ></div>
            </div>
            <div className="progress-controls">
                <div className={getStatusClass()}>
                    {progressData.message}
                </div>
                {showCancel && (
                    <button className="cancel-button" onClick={onCancel}>
                        Cancel
                    </button>
                )}
            </div>
        </div>
    );
};

export default ProgressSection;