import { CheckCircle, AlertTriangle, AlertOctagon, StopCircle } from 'lucide-react';
import StatusButton from './StatusButton';

/**
 * ConditionPanel - Condition selection buttons for simulation states
 * Now supports continuous generation until Stop is clicked
 */
export function ConditionPanel({ selectedCondition, onSelect, isRunning, onStop, disabled = false }) {
    const conditions = [
        { id: 'normal', label: 'Normal', variant: 'good', icon: CheckCircle },
        { id: 'mediocre', label: 'Mediocre', variant: 'warning', icon: AlertTriangle },
        { id: 'bad', label: 'Bad', variant: 'critical', icon: AlertOctagon }
    ];

    return (
        <div className="panel-section">
            <h2 className="panel-title">Select Condition</h2>
            <p className="panel-subtitle">
                Click a condition to start continuous simulation. Click Stop to end.
            </p>
            <div className="status-buttons">
                {conditions.map(({ id, label, variant, icon }) => (
                    <StatusButton
                        key={id}
                        variant={variant}
                        label={label}
                        icon={icon}
                        active={selectedCondition === id && isRunning}
                        onClick={() => onSelect(id)}
                        disabled={disabled || (isRunning && selectedCondition !== id)}
                    />
                ))}
                {isRunning && (
                    <button className="stop-button" onClick={onStop}>
                        <StopCircle size={18} />
                        Stop
                    </button>
                )}
            </div>
        </div>
    );
}

export default ConditionPanel;
