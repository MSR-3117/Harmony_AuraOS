import {
    Gauge,
    Thermometer,
    Wind,
    Droplets,
    Activity,
    AlertTriangle
} from 'lucide-react';
import MetricCard from '../components/MetricCard';

/**
 * OilGasView - Oil & Gas industry specific metrics display
 */
export function OilGasView({ data }) {
    if (!data) {
        return (
            <div className="loading-spinner">
                <div className="spinner"></div>
            </div>
        );
    }

    // Determine status based on values
    const getLeakStatus = () => data.leak_detected ? 'critical' : 'good';
    const getPressureStatus = (val) => val > 130 ? 'critical' : val > 100 ? 'warning' : 'good';
    const getTempStatus = (val) => val > 50 ? 'warning' : val < -10 ? 'warning' : 'good';

    return (
        <div className="industry-view">
            <div className="metrics-grid">
                <MetricCard
                    label="Discharge Pressure"
                    value={data.discharge_pressure}
                    unit="PSI"
                    icon={Gauge}
                    status={getPressureStatus(data.discharge_pressure)}
                    precision={1}
                />
                <MetricCard
                    label="Suction Pressure"
                    value={data.suction_pressure}
                    unit="PSI"
                    icon={Gauge}
                    precision={1}
                />
                <MetricCard
                    label="Flow Rate"
                    value={data.flow_rate}
                    unit="L/min"
                    icon={Wind}
                    precision={0}
                />
                <MetricCard
                    label="Methane (CH₄)"
                    value={data.gas_composition_ch4}
                    unit="%"
                    icon={Droplets}
                    precision={1}
                />
                <MetricCard
                    label="CO₂"
                    value={data.gas_composition_co2}
                    unit="%"
                    icon={Droplets}
                    precision={2}
                />
                <MetricCard
                    label="Valve Position"
                    value={data.valve_position}
                    unit="%"
                    icon={Activity}
                    precision={0}
                />
                <MetricCard
                    label="Pipeline Temperature"
                    value={data.pipeline_temperature}
                    unit="°C"
                    icon={Thermometer}
                    status={getTempStatus(data.pipeline_temperature)}
                    precision={1}
                />
                <MetricCard
                    label="Leak Detection"
                    value={data.leak_detected ? 'DETECTED' : 'Clear'}
                    icon={AlertTriangle}
                    status={getLeakStatus()}
                    precision={0}
                />
            </div>
        </div>
    );
}

export default OilGasView;
