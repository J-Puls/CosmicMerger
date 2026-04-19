import { ProgressData } from 'types/electron';

interface ProgressSectionProps {
    progressData: ProgressData | null;
    onCancel: () => void;
    showCancel: boolean;
}

const ProgressSection = ({ progressData, onCancel, showCancel }: ProgressSectionProps) => {
    if (!progressData) return null;

    return (
        <div className="progress-section">
            <div className="cm-progress-bar">
                <div
                    className="cm-progress-fill"
                    style={{ width: `${progressData.percent ?? 0}%` }}
                />
            </div>
            {showCancel && (
                <div className="progress-controls">
                    <button className="cancel-button" onClick={onCancel}>Cancel</button>
                </div>
            )}
        </div>
    );
};

export default ProgressSection;
