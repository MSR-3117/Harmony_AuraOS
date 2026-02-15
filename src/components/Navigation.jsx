import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Plug, Droplet, Factory, HardHat, Zap, Wifi } from 'lucide-react';
import { database, ref, set, onValue } from '../firebase';

/**
 * TopBar - Horizontal navigation for pages + ESP32 connection
 */
export function TopBar() {
    const [esp32Ip, setEsp32Ip] = useState('');
    const [savedIp, setSavedIp] = useState('');
    const [isConnected, setIsConnected] = useState(false);

    // Load saved ESP32 IP from Firebase on mount
    useEffect(() => {
        const ipRef = ref(database, 'config/esp32_ip');
        const unsubscribe = onValue(ipRef, (snapshot) => {
            const ip = snapshot.val();
            if (ip) {
                setSavedIp(ip);
                setEsp32Ip(ip);
                setIsConnected(true);
            }
        });
        return () => unsubscribe();
    }, []);

    // Save ESP32 IP to Firebase
    const handleConnect = async () => {
        if (!esp32Ip.trim()) return;

        try {
            await set(ref(database, 'config/esp32_ip'), esp32Ip.trim());
            setSavedIp(esp32Ip.trim());
            setIsConnected(true);
        } catch (error) {
            console.error('Failed to save ESP32 IP:', error);
        }
    };

    // Disconnect ESP32
    const handleDisconnect = async () => {
        try {
            await set(ref(database, 'config/esp32_ip'), null);
            setSavedIp('');
            setIsConnected(false);
        } catch (error) {
            console.error('Failed to disconnect:', error);
        }
    };

    return (
        <header className="topbar">
            <div className="topbar-brand">
                <Zap size={20} />
                <span>Harmony Aura OS</span>
            </div>
            <nav className="topbar-nav">
                <NavLink
                    to="/"
                    className={({ isActive }) => `topbar-link ${isActive ? 'active' : ''}`}
                >
                    <LayoutDashboard size={16} />
                    Dashboard
                </NavLink>
                <NavLink
                    to="/plug-connection"
                    className={({ isActive }) => `topbar-link ${isActive ? 'active' : ''}`}
                >
                    <Plug size={16} />
                    Plug Connection
                </NavLink>
            </nav>

            {/* ESP32 Connection Panel */}
            <div className="topbar-actions">
                <div className="esp32-panel">
                    {isConnected ? (
                        <>
                            <div className="esp32-status connected">
                                <Wifi size={14} />
                                <span>ESP32: {savedIp}</span>
                            </div>
                            <button className="esp32-disconnect-btn" onClick={handleDisconnect}>
                                Disconnect
                            </button>
                        </>
                    ) : (
                        <>
                            <input
                                type="text"
                                className="esp32-input"
                                placeholder="10.64.106.20:8000/machine/data"
                                value={esp32Ip}
                                onChange={(e) => setEsp32Ip(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                            />
                            <button className="esp32-connect-btn" onClick={handleConnect}>
                                <Wifi size={14} />
                                Connect
                            </button>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}

/**
 * Sidebar - Industry selection panel
 */
export function Sidebar({ selectedIndustry, onSelectIndustry }) {
    const location = useLocation();
    const isDashboard = location.pathname === '/';

    const industries = [
        { id: 'oil_gas', label: 'Oil & Gas', icon: Droplet },
        { id: 'manufacturing', label: 'Manufacturing', icon: Factory },
        { id: 'construction', label: 'Construction', icon: HardHat }
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-section">
                <h3 className="sidebar-title">Industries</h3>
                <div className="sidebar-industry-list">
                    {industries.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            className={`sidebar-industry-btn ${selectedIndustry === id ? 'active' : ''} ${!isDashboard ? 'disabled' : ''}`}
                            onClick={() => isDashboard && onSelectIndustry(id)}
                            disabled={!isDashboard}
                        >
                            <Icon size={18} />
                            <span>{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {isDashboard && selectedIndustry && (
                <div className="sidebar-section">
                    <div className="sidebar-info">
                        <span className="sidebar-info-label">Active</span>
                        <span className="sidebar-info-value">
                            {industries.find(i => i.id === selectedIndustry)?.label}
                        </span>
                    </div>
                </div>
            )}
        </aside>
    );
}

export default { TopBar, Sidebar };
