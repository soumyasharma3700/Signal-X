import { Link } from 'react-router-dom';
import { Activity, Satellite, Compass, ShieldAlert, Play, Upload } from 'lucide-react';
import Header from '../components/Header.jsx';
import StatusCard from '../components/StatusCard.jsx';
import ThreatPanel from '../components/ThreatPanel.jsx';
import SignalChart from '../components/SignalChart.jsx';
import SatelliteChart from '../components/SatelliteChart.jsx';
import { fmt, classifyTone } from '../utils/formatters.js';
import { demoPresets } from '../utils/demoData.js';

export default function Dashboard({
  lastResult, demoMode, setDemoMode, onResult,
}) {
  const result = lastResult;
  const windows = result?.window_predictions || [];

  const meanCno = (() => {
    const vals = windows.map((w) => w.measurements?.cno_mean).filter((v) => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  })();
  const meanSats = (() => {
    const vals = windows.map((w) => w.measurements?.sat_count_mean).filter((v) => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  })();

  return (
    <>
      <Header
        eyebrow="GNSS Integrity Monitoring"
        title="Mission Overview"
        subtitle="Monitor satellite navigation observations and identify suspicious signal behaviour."
      >
        <div className="status-strip">
          <div className="item">
            <span className="label">Analysis</span>
            <span className="value">{result ? 'completed' : 'idle'}</span>
          </div>
          <div className="item">
            <span className="label">Recording</span>
            <span className="value">{result?.recording_id || 'none selected'}</span>
          </div>
          <div className="item">
            <span className="label">Last analysed</span>
            <span className="value">{result?.analyzed_at ? new Date(result.analyzed_at).toLocaleString() : '—'}</span>
          </div>
          <div className="item">
            <span className="label">Mode</span>
            <span className="value">{demoMode ? 'demo' : 'backend'}</span>
          </div>
        </div>
      </Header>

      <div className="card-grid">
        <StatusCard
          title="GNSS Signal Quality"
          icon={Activity}
          value={meanCno != null ? `${fmt(meanCno, 1)} dB-Hz` : '—'}
          sub={meanCno != null ? 'Mean C/N₀ across windows' : 'No analysis performed yet'}
          pill={meanCno != null && (
            <span className={`pill ${meanCno < 30 ? 'danger' : 'success'}`}>
              {meanCno < 30 ? 'degraded' : 'nominal'}
            </span>
          )}
          tone={meanCno != null && meanCno < 30 ? 'danger' : 'neutral'}
        />
        <StatusCard
          title="Satellite Visibility"
          icon={Satellite}
          value={meanSats != null ? `${fmt(meanSats, 1)}` : '—'}
          sub={meanSats != null ? 'Tracked satellites, mean across windows' : 'No data'}
          pill={meanSats != null && (
            <span className={`pill ${meanSats < 6 ? 'danger' : 'success'}`}>
              {meanSats < 6 ? 'reduced' : 'nominal'}
            </span>
          )}
          tone={meanSats != null && meanSats < 6 ? 'danger' : 'neutral'}
        />
        <StatusCard
          title="Navigation Integrity"
          icon={Compass}
          value={result?.indicators?.position_stability || '—'}
          sub={result?.indicators?.fix_availability ? `Fix: ${result.indicators.fix_availability}` : 'No fix data'}
          tone={result?.indicators?.position_stability === 'anomalous' ? 'danger' : 'neutral'}
        />
        <StatusCard
          title="Threat Assessment"
          icon={ShieldAlert}
          value={result ? result.classification.replace('possible_', '') : '—'}
          sub={result ? 'Statistical estimate — not verified attack' : 'Awaiting analysis'}
          tone={result ? classifyTone(result.classification) : 'neutral'}
        />
      </div>

      <div className="panel">
        <h2>Quick actions</h2>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/dataset" className="btn primary"><Upload size={14} style={{ marginRight: 6 }} /> Upload a recording</Link>
          <button className="btn" onClick={() => {
            const r = demoPresets.jamming();
            setDemoMode(true);
            onResult(r);
          }}>
            <Play size={14} style={{ marginRight: 6 }} /> Load demo (jamming)
          </button>
        </div>
      </div>

      <div className="chart-grid">
        <SignalChart windows={windows} />
        <SatelliteChart windows={windows} />
      </div>

      <div style={{ marginTop: '1rem' }}>
        <ThreatPanel result={result} />
      </div>
    </>
  );
}
