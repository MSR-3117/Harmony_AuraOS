import { Droplet, Factory, HardHat } from 'lucide-react';

/**
 * IndustryPanel - Industry selection buttons
 */
export function IndustryPanel({ selectedIndustry, onSelect }) {
    const industries = [
        { id: 'oil_gas', label: 'Oil & Gas', icon: Droplet, emoji: '🛢' },
        { id: 'manufacturing', label: 'Manufacturing', icon: Factory, emoji: '🏭' },
        { id: 'construction', label: 'Construction', icon: HardHat, emoji: '🏗' }
    ];

    return (
        <div className="panel-section">
            <h2 className="panel-title">Select Industry</h2>
            <div className="industry-buttons">
                {industries.map(({ id, label, icon: Icon, emoji }) => (
                    <button
                        key={id}
                        className={`industry-btn ${id.replace('_', '-')} ${selectedIndustry === id ? 'active' : ''}`}
                        onClick={() => onSelect(id)}
                    >
                        <span className="industry-icon">{emoji}</span>
                        <span>{label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

export default IndustryPanel;
