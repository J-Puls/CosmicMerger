import { ProgressData } from 'types/electron';

interface ProgressSectionProps {
    progressData: ProgressData | null;
    onCancel: () => void;
    showCancel: boolean;
}

const ProgressSection = ({ progressData, onCancel, showCancel }: ProgressSectionProps) => {
    if (!progressData) return null;

    const getStatusClass = (): string => {
        if (progressData.status === 'error' || progressData.status === 'cancelled') {
            return 'status-message error';
        } else if (progressData.status === 'completed') {
            return 'status-message success';
        }
        return 'status-message';
    };

    return (
        <div className="progress-section">
            <div className="cm-progress-bar">
                <div
                    className="cm-progress-fill"
                    style={{ width: `${progressData.percent ?? 0}%` }}
                />
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
