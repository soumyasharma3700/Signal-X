import Header from '../components/Header.jsx';
import SignalChart from '../components/SignalChart.jsx';
import SatelliteChart from '../components/SatelliteChart.jsx';
import MapView from '../components/MapView.jsx';
import Timeline from '../components/Timeline.jsx';
import RecordedReplay from '../components/RecordedReplay.jsx';

export default function SignalMonitoring({ result }) {
  const windows = result?.window_predictions || [];

  return (
    <>
      <Header
        eyebrow="Signal Monitoring"
        title="GNSS observations"
        subtitle="C/N₀, satellite visibility, trajectory, and suspicious windows from the current analysis."
      />
      <RecordedReplay />
      {!result && (
        <div className="alert info">No analysis loaded. Upload a recording in Dataset Analysis first.</div>
      )}
      <div className="chart-grid">
        <SignalChart windows={windows} />
        <SatelliteChart windows={windows} />
      </div>
      <div style={{ marginTop: '1rem' }}>
        <MapView trajectory={result?.trajectory} />
      </div>
      <Timeline windows={windows} />
    </>
  );
}
