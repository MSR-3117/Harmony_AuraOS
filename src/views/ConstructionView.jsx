import {
    Gauge,
    Thermometer,
    Fuel,
    Activity,
    AlertTriangle,
    Truck,
    Settings
} from 'lucide-react';
import MetricCard from '../components/MetricCard';

/**
 * ConstructionView - Construction industry specific metrics display
 */
export function ConstructionView({ data }) {
    if (!data) {
        return (
            <div className="loading-spinner">
                <div className="spinner"></div>
            </div>
        );
    }

    // Determine status based on values
    const getRPMStatus = (val) => val > 2200 ? 'warning' : val < 700 ? 'warning' : 'good';
    const getTempStatus = (val) => val > 100 ? 'critical' : val > 95 ? 'warning' : 'good';
    const getFuelStatus = (val) => val < 15 ? 'critical' : val < 30 ? 'warning' : 'good';
    const getFaultStatus = () => data.fault_codes?.length > 0 ? 'critical' : 'good';

    return (
        <div className="industry-view">
            <div className="metrics-grid">
                <MetricCard
                    label="Engine RPM"
                    value={data.engine_rpm}
                    unit="RPM"
                    icon={Gauge}
                    status={getRPMStatus(data.engine_rpm)}
                    precision={0}
                />
                <MetricCard
                    label="Engine Load"
                    value={data.engine_load}
                    unit="%"
                    icon={Activity}
                    precision={1}
                />
                <MetricCard
                    label="Coolant Temperature"
                    value={data.coolant_temperature}
                    unit="°C"
                    icon={Thermometer}
                    status={getTempStatus(data.coolant_temperature)}
                    precision={1}
                />
                <MetricCard
                    label="Oil Pressure"
                    value={data.oil_pressure}
                    unit="PSI"
                    icon={Gauge}
                    precision={1}
                />
                <MetricCard
                    label="Hydraulic Pressure"
                    value={data.hydraulic_pressure}
                    unit="PSI"
                    icon={Gauge}
                    precision={0}
                />
                <MetricCard
                    label="Vehicle Speed"
                    value={data.vehicle_speed}
                    unit="km/h"
                    icon={Truck}
                    precision={1}
                />
                <MetricCard
                    label="Operating Mode"
                    value={data.operating_mode}
                    icon={Settings}
                    precision={0}
                />
                <MetricCard
                    label="Fuel Level"
                    value={data.fuel_level}
                    unit="%"
                    icon={Fuel}
                    status={getFuelStatus(data.fuel_level)}
                    precision={1}
                />
            </div>

            {/* Fault Codes Section */}
            {data.fault_codes && data.fault_codes.length > 0 && (
                <div className="panel-section" style={{ marginTop: 'var(--spacing-lg)' }}>
                    <h3 className="panel-title">
                        <AlertTriangle size={18} color="var(--status-critical)" />
                        Active Fault Codes
                    </h3>
                    <div className="fault-list">
                        {data.fault_codes.map((code, index) => (
                            <span key={index} className="fault-badge">{code}</span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default ConstructionView;
