import { useState } from 'react';
import { Activity, Clock } from 'lucide-react';
import ConditionPanel from '../components/ConditionPanel';
import LiveChart from '../components/LiveChart';
import OilGasView from '../views/OilGasView';
import ManufacturingView from '../views/ManufacturingView';
import ConstructionView from '../views/ConstructionView';
import { useRealtimeData, useRealtimeHistory } from '../hooks/useRealtimeData';
import { database, ref, set } from '../firebase';

// Industry to Firebase collection mapping
const COLLECTION_MAP = {
    oil_gas: 'sensor_data_oil_gas',
    manufacturing: 'sensor_data_manufacturing',
    construction: 'sensor_data_construction'
};

// Industry display names
const INDUSTRY_NAMES = {
    oil_gas: 'Oil & Gas',
    manufacturing: 'Manufacturing',
    construction: 'Construction'
};

// Chart data keys per industry
const CHART_KEYS = {
    oil_gas: { key: 'discharge_pressure', label: 'Discharge Pressure', unit: 'PSI', color: '#6a9a8a' },
    manufacturing: { key: 'vibration_rms', label: 'Vibration RMS', unit: 'mm/s', color: '#6a9a5a' },
    construction: { key: 'engine_rpm', label: 'Engine RPM', unit: 'RPM', color: '#b86d4a' }
};

/**
 * Dashboard - Main industry monitoring dashboard
 * Now supports continuous simulation until Stop is clicked
 */
export function Dashboard({ selectedIndustry = 'oil_gas', onSelectIndustry }) {
    const [selectedCondition, setSelectedCondition] = useState(null);
    const [isRunning, setIsRunning] = useState(false);

    // Get the correct collection path for the selected industry
    const collectionPath = COLLECTION_MAP[selectedIndustry];

    // Subscribe to real-time data
    const { data: latestData, loading } = useRealtimeData(collectionPath, true);
    const { data: historyData } = useRealtimeHistory(collectionPath, 20);

    // Handle condition selection - start continuous simulation
    const handleConditionChange = async (condition) => {
        setSelectedCondition(condition);
        setIsRunning(true);
        try {
            await set(ref(database, 'simulation/state'), {
                industry: selectedIndustry,
                condition: condition,
                running: true,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to start simulation:', error);
        }
    };

    // Handle stop - stop continuous simulation
    const handleStop = async () => {
        setIsRunning(false);
        try {
            await set(ref(database, 'simulation/state'), {
                industry: selectedIndustry,
                condition: selectedCondition,
                running: false,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to stop simulation:', error);
        }
    };

    // Format timestamp
    const formatTimestamp = (ts) => {
        if (!ts) return '--';
        const date = new Date(ts);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    // Get the appropriate chart configuration
    const chartConfig = CHART_KEYS[selectedIndustry];

    // Render the appropriate industry view
    const renderIndustryView = () => {
        if (loading) {
            return (
                <div className="loading-spinner">
                    <div className="spinner"></div>
                </div>
            );
        }

        switch (selectedIndustry) {
            case 'oil_gas':
                return <OilGasView data={latestData} />;
            case 'manufacturing':
                return <ManufacturingView data={latestData} />;
            case 'construction':
                return <ConstructionView data={latestData} />;
            default:
                return null;
        }
    };

    return (
        <div className="page-content">
            <header className="page-header">
                <h1>Industry Monitoring</h1>
                <p>Real-time telemetry for {INDUSTRY_NAMES[selectedIndustry]}</p>
            </header>

            {/* Condition Selection */}
            <ConditionPanel
                selectedCondition={selectedCondition}
                onSelect={handleConditionChange}
                isRunning={isRunning}
                onStop={handleStop}
            />

            {/* Status Bar */}
            <section className="status-bar">
                <div className="status-bar-item">
                    <span className="status-bar-label">Industry</span>
                    <span className="status-bar-value">{INDUSTRY_NAMES[selectedIndustry]}</span>
                </div>
                <div className="status-bar-item">
                    <span className="status-bar-label">Condition</span>
                    <span className="status-bar-value" style={{ textTransform: 'capitalize' }}>
                        {selectedCondition || 'Idle'}
                    </span>
                </div>
                <div className="status-bar-item">
                    <span className="status-bar-label">Status</span>
                    <span className={`status-bar-value ${isRunning ? 'running' : ''}`}>
                        {isRunning ? '● Running' : '○ Stopped'}
                    </span>
                </div>
                {latestData?.timestamp && (
                    <div className="status-bar-item">
                        <span className="status-bar-label">Last Update</span>
                        <span className="status-bar-value mono">{formatTimestamp(latestData.timestamp)}</span>
                    </div>
                )}
            </section>

            {/* Industry-Specific Metrics */}
            <section className="panel-section">
                <h2 className="panel-title">
                    <Activity size={16} />
                    Live Telemetry
                </h2>
                {renderIndustryView()}
            </section>

            {/* Real-time Chart */}
            <section className="panel-section">
                <LiveChart
                    data={historyData}
                    dataKey={chartConfig.key}
                    title={`${chartConfig.label} Trend`}
                    color={chartConfig.color}
                    unit={chartConfig.unit}
                    type="area"
                />
            </section>
        </div>
    );
}

export default Dashboard;
