import { useState, useEffect } from 'react';
import {
    Zap,
    Gauge,
    Activity,
    Battery,
    Clock,
    CheckCircle,
    AlertTriangle,
    AlertOctagon
} from 'lucide-react';
import MetricCard from '../components/MetricCard';
import StatusButton from '../components/StatusButton';
import LiveChart from '../components/LiveChart';
import { useRealtimeData, useRealtimeHistory } from '../hooks/useRealtimeData';
import { database, ref, set } from '../firebase';

/**
 * PlugConnection - Energy monitoring module page
 */
export function PlugConnection() {
    const [activeStatus, setActiveStatus] = useState(null);
    const { data: liveData, loading } = useRealtimeData('energy/live');
    const { data: historyData } = useRealtimeHistory('energy/history', 20);

    // Handle status button click - write to database to trigger simulation
    const handleStatusChange = async (status) => {
        setActiveStatus(status);
        try {
            await set(ref(database, 'simulation/energy_state'), {
                condition: status,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to update simulation state:', error);
        }
    };

    // Format timestamp to readable format
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

    // Determine status based on power consumption
    const getPowerStatus = (power) => {
        if (!power) return 'normal';
        if (power > 500) return 'critical';
        if (power > 300) return 'warning';
        return 'good';
    };

    return (
        <div className="page-content">
            <header className="page-header">
                <h1>Plug Connection Module</h1>
                <p>Real-time energy monitoring and device control</p>
            </header>

            {/* Status Control Dashboard */}
            <section className="panel-section">
                <h2 className="panel-title">
                    <Activity size={20} />
                    Status Control
                </h2>
                <p className="panel-subtitle">
                    Select an operating state to simulate different energy conditions
                </p>
                <div className="status-buttons">
                    <StatusButton
                        variant="good"
                        label="Good State"
                        icon={CheckCircle}
                        active={activeStatus === 'good'}
                        onClick={() => handleStatusChange('good')}
                    />
                    <StatusButton
                        variant="warning"
                        label="Mediocre State"
                        icon={AlertTriangle}
                        active={activeStatus === 'mediocre'}
                        onClick={() => handleStatusChange('mediocre')}
                    />
                    <StatusButton
                        variant="info"
                        label="Faulty State"
                        icon={AlertOctagon}
                        active={activeStatus === 'faulty'}
                        onClick={() => handleStatusChange('faulty')}
                    />
                </div>
            </section>

            {/* Live Current Consumption Panel */}
            <section className="panel-section">
                <h2 className="panel-title">
                    <Zap size={20} />
                    Live Current Consumption
                </h2>

                {loading ? (
                    <div className="loading-spinner">
                        <div className="spinner"></div>
                    </div>
                ) : (
                    <div className="metrics-grid">
                        <MetricCard
                            label="Voltage"
                            value={liveData?.voltage}
                            unit="V"
                            icon={Zap}
                            precision={1}
                        />
                        <MetricCard
                            label="Current"
                            value={liveData?.current}
                            unit="A"
                            icon={Activity}
                            precision={2}
                        />
                        <MetricCard
                            label="Power"
                            value={liveData?.power}
                            unit="W"
                            icon={Gauge}
                            status={getPowerStatus(liveData?.power)}
                            precision={1}
                        />
                        <MetricCard
                            label="Cumulative Energy"
                            value={liveData?.energy}
                            unit="kWh"
                            icon={Battery}
                            precision={2}
                        />
                    </div>
                )}

                {/* Timestamp */}
                {liveData?.timestamp && (
                    <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                        <Clock size={14} color="var(--text-muted)" />
                        <span className="timestamp">
                            Last Update: {formatTimestamp(liveData.timestamp)}
                        </span>
                    </div>
                )}
            </section>

            {/* Device Information Panel */}
            <section className="panel-section">
                <h2 className="panel-title">Device Information</h2>
                <div className="device-info">
                    <div className="device-info-item">
                        <span className="device-info-label">Device Type</span>
                        <span className="device-info-value">
                            {liveData?.device_type || 'Industrial Motor'}
                        </span>
                    </div>
                    <div className="device-info-item">
                        <span className="device-info-label">Status</span>
                        <span className={`status-indicator ${liveData ? 'online' : 'offline'}`}>
                            <span className="status-dot"></span>
                            {liveData ? 'Online' : 'Offline'}
                        </span>
                    </div>
                    <div className="device-info-item">
                        <span className="device-info-label">Machine ID</span>
                        <span className="device-info-value">
                            {liveData?.machine_id || 'PLUG-001'}
                        </span>
                    </div>
                </div>
            </section>

            {/* Power Consumption Chart */}
            <section className="panel-section">
                <LiveChart
                    data={historyData}
                    dataKey="power"
                    title="Power Consumption History"
                    color="#4fc3f7"
                    unit="W"
                    type="area"
                />
            </section>
        </div>
    );
}

export default PlugConnection;
