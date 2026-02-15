import {
    Activity,
    Thermometer,
    Gauge,
    Play,
    Zap,
    Wind,
    RotateCw
} from 'lucide-react';
import MetricCard from '../components/MetricCard';

/**
 * ManufacturingView - Manufacturing industry specific metrics display
 */
export function ManufacturingView({ data }) {
    if (!data) {
        return (
            <div className="loading-spinner">
                <div className="spinner"></div>
            </div>
        );
    }

    // Determine status based on values
    const getVibrationStatus = (val) => val > 7 ? 'critical' : val > 5 ? 'warning' : 'good';
    const getTempStatus = (val) => val > 75 ? 'critical' : val > 60 ? 'warning' : 'good';
    const getProductionStatus = () => {
        if (data.production_status === 'RUNNING') return 'good';
        if (data.production_status === 'MAINTENANCE') return 'warning';
        return 'critical';
    };

    return (
        <div className="industry-view">
            <div className="metrics-grid">
                <MetricCard
                    label="Vibration RMS"
                    value={data.vibration_rms}
                    unit="mm/s"
                    icon={Activity}
                    status={getVibrationStatus(data.vibration_rms)}
                    precision={2}
                />
                <MetricCard
                    label="Motor Current"
                    value={data.motor_current}
                    unit="A"
                    icon={Zap}
                    precision={1}
                />
                <MetricCard
                    label="Bearing Temperature"
                    value={data.bearing_temperature}
                    unit="°C"
                    icon={Thermometer}
                    status={getTempStatus(data.bearing_temperature)}
                    precision={1}
                />
                <MetricCard
                    label="Conveyor Speed"
                    value={data.conveyor_speed}
                    unit="m/s"
                    icon={RotateCw}
                    precision={2}
                />
                <MetricCard
                    label="Cycle Count"
                    value={data.cycle_count}
                    icon={Play}
                    precision={0}
                />
                <MetricCard
                    label="Production Status"
                    value={data.production_status}
                    icon={Play}
                    status={getProductionStatus()}
                    precision={0}
                />
                <MetricCard
                    label="Power Consumption"
                    value={data.power_consumption}
                    unit="kW"
                    icon={Zap}
                    precision={1}
                />
                <MetricCard
                    label="Air Pressure"
                    value={data.air_pressure}
                    unit="Bar"
                    icon={Gauge}
                    precision={2}
                />
            </div>
        </div>
    );
}

export default ManufacturingView;
