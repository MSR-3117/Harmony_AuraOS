/**
 * StatusButton - Trigger button for simulation states
 */
export function StatusButton({
    variant = 'good',
    label,
    icon: Icon,
    active = false,
    onClick,
    disabled = false
}) {
    return (
        <button
            className={`status-btn ${variant} ${active ? 'active' : ''}`}
            onClick={onClick}
            disabled={disabled}
        >
            {Icon && <Icon size={18} />}
            {label}
        </button>
    );
}

export default StatusButton;
