import { useState, useEffect, useRef } from 'react';

/**
 * MetricCard - Displays a single metric with animated value transitions
 */
export function MetricCard({
    label,
    value,
    unit,
    icon: Icon,
    status = 'normal',
    precision = 1,
    showChange = false,
    previousValue = null
}) {
    const [isAnimating, setIsAnimating] = useState(false);
    const prevValueRef = useRef(value);

    useEffect(() => {
        if (prevValueRef.current !== value) {
            setIsAnimating(true);
            const timer = setTimeout(() => setIsAnimating(false), 300);
            prevValueRef.current = value;
            return () => clearTimeout(timer);
        }
    }, [value]);

    const formattedValue = typeof value === 'number'
        ? value.toFixed(precision)
        : value ?? '--';

    const statusClass = status === 'good' ? 'status-good'
        : status === 'warning' ? 'status-warning'
            : status === 'critical' ? 'status-critical'
                : '';

    const change = previousValue !== null && typeof value === 'number'
        ? value - previousValue
        : null;

    return (
        <div className={`metric-card ${statusClass}`}>
            <div className="metric-header">
                {Icon && (
                    <div className="metric-icon">
                        <Icon size={20} />
                    </div>
                )}
                <span className="metric-label">{label}</span>
            </div>
            <div className={`metric-value ${isAnimating ? 'animating' : ''}`}>
                {formattedValue}
                {unit && <span className="metric-unit"> {unit}</span>}
            </div>
            {showChange && change !== null && (
                <div className={`metric-change ${change >= 0 ? 'positive' : 'negative'}`}>
                    {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(precision)}
                </div>
            )}
        </div>
    );
}

export default MetricCard;
