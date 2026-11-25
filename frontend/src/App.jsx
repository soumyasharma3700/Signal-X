import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import DatasetAnalysis from './pages/DatasetAnalysis.jsx';
import SignalMonitoring from './pages/SignalMonitoring.jsx';
import ThreatDetection from './pages/ThreatDetection.jsx';
import History from './pages/History.jsx';
import Settings from './pages/Settings.jsx';
import { api } from './services/api.js';

function storedResult() {
  try {
    const saved = localStorage.getItem('signalx_last_result');
    return saved ? JSON.parse(saved) : null;
  } catch {
    localStorage.removeItem('signalx_last_result');
    return null;
  }
}

export default function App() {
  const [backendOnline, setBackendOnline] = useState(null);
  const [demoMode, setDemoMode] = useState(
    () => localStorage.getItem('signalx_demo_mode') === 'true',
  );
  const [lastResult, setLastResult] = useState(storedResult);

  useEffect(() => {
    if (lastResult) {
      localStorage.setItem('signalx_last_result', JSON.stringify(lastResult));
    } else {
      localStorage.removeItem('signalx_last_result');
    }
  }, [lastResult]);

  useEffect(() => {
    localStorage.setItem('signalx_demo_mode', String(demoMode));
  }, [demoMode]);

  function handleResult(result) {
    setLastResult(result);
    setDemoMode(false);
  }

  function handleDemoModeChange(enabled) {
    setDemoMode(enabled);
    if (!enabled && lastResult?.analysis_id?.startsWith('demo-')) {
      setLastResult(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function ping() {
      try {
        await api.health();
        if (!cancelled) setBackendOnline(true);
      } catch {
        if (!cancelled) setBackendOnline(false);
      }
    }
    ping();
    const id = setInterval(ping, 15000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return (
    <div className="app-shell">
      <Sidebar backendOnline={backendOnline} demoMode={demoMode} />
      <main className="app-main">
        {demoMode && (
          <div className="demo-banner">
            DEMO DATA — SIMULATED OBSERVATIONS. Not from the backend.
            <button className="btn-link" onClick={() => handleDemoModeChange(false)}>
              Exit demo
            </button>
          </div>
        )}
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <Dashboard
                lastResult={lastResult}
                demoMode={demoMode}
                setDemoMode={handleDemoModeChange}
                onResult={setLastResult}
              />
            }
          />
          <Route
            path="/dataset"
            element={<DatasetAnalysis onResult={handleResult} />}
          />
          <Route
            path="/signals"
            element={<SignalMonitoring result={lastResult} demoMode={demoMode} />}
          />
          <Route
            path="/threats"
            element={<ThreatDetection result={lastResult} demoMode={demoMode} />}
          />
          <Route
            path="/history"
            element={<History onOpen={handleResult} />}
          />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
