import { useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart
} from 'recharts';

/**
 * LiveChart - Real-time data visualization component
 */
export function LiveChart({
    data = [],
    dataKey = 'value',
    title = 'Live Data',
    color = '#4fc3f7',
    unit = '',
    type = 'line',
    height = 250
}) {
    const chartData = useMemo(() => {
        return data.map((item, index) => ({
            ...item,
            time: item.timestamp
                ? new Date(item.timestamp).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                })
                : `T-${data.length - index}`
        }));
    }, [data]);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: 'rgba(17, 24, 32, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                }}>
                    <p style={{ color: '#8899a8', fontSize: '12px', marginBottom: '4px' }}>
                        {label}
                    </p>
                    <p style={{ color: color, fontSize: '16px', fontWeight: 600 }}>
                        {payload[0].value?.toFixed(2)} {unit}
                    </p>
                </div>
            );
        }
        return null;
    };

    if (chartData.length === 0) {
        return (
            <div className="chart-container">
                <div className="chart-header">
                    <h3 className="chart-title">{title}</h3>
                </div>
                <div style={{
                    height: height,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)'
                }}>
                    Waiting for data...
                </div>
            </div>
        );
    }

    const ChartComponent = type === 'area' ? AreaChart : LineChart;
    const DataComponent = type === 'area' ? Area : Line;

    return (
        <div className="chart-container">
            <div className="chart-header">
                <h3 className="chart-title">{title}</h3>
                <span className="timestamp">
                    Last update: {chartData[chartData.length - 1]?.time}
                </span>
            </div>
            <ResponsiveContainer width="100%" height={height}>
                <ChartComponent data={chartData}>
                    <defs>
                        <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255, 255, 255, 0.05)"
                        vertical={false}
                    />
                    <XAxis
                        dataKey="time"
                        stroke="#5a6a7a"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                    />
                    <YAxis
                        stroke="#5a6a7a"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                        tickFormatter={(value) => `${value}${unit ? ` ${unit}` : ''}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    {type === 'area' ? (
                        <Area
                            type="monotone"
                            dataKey={dataKey}
                            stroke={color}
                            strokeWidth={2}
                            fill={`url(#gradient-${dataKey})`}
                            dot={false}
                            activeDot={{ r: 4, fill: color }}
                        />
                    ) : (
                        <Line
                            type="monotone"
                            dataKey={dataKey}
                            stroke={color}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4, fill: color }}
                        />
                    )}
                </ChartComponent>
            </ResponsiveContainer>
        </div>
    );
}

export default LiveChart;
