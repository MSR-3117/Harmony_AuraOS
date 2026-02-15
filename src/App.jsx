import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TopBar, Sidebar } from './components/Navigation';
import Dashboard from './pages/Dashboard';
import PlugConnection from './pages/PlugConnection';

/**
 * App - Main application component with new layout structure
 */
function App() {
    const [selectedIndustry, setSelectedIndustry] = useState('oil_gas');

    return (
        <BrowserRouter>
            <div className="app-container">
                <TopBar />
                <div className="app-body">
                    <Sidebar
                        selectedIndustry={selectedIndustry}
                        onSelectIndustry={setSelectedIndustry}
                    />
                    <main className="main-content">
                        <Routes>
                            <Route
                                path="/"
                                element={
                                    <Dashboard
                                        selectedIndustry={selectedIndustry}
                                        onSelectIndustry={setSelectedIndustry}
                                    />
                                }
                            />
                            <Route path="/plug-connection" element={<PlugConnection />} />
                        </Routes>
                    </main>
                </div>
            </div>
        </BrowserRouter>
    );
}

export default App;
