import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header.jsx';
import { api } from '../services/api.js';
import { classLabel, shortTime } from '../utils/formatters.js';
import { severityTone } from '../utils/chartHelpers.js';

export default function History({ onOpen }) {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    api.history()
      .then((data) => setItems(data.analyses || []))
      .catch((e) => setError(e.message || 'Failed to load history'));
  }, []);

  async function open(analysisId) {
    setLoadingId(analysisId);
    try {
      const result = await api.getResult(analysisId);
      onOpen(result);
      navigate('/dashboard');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <>
      <Header
        eyebrow="Analysis History"
        title="Previous analyses"
        subtitle="Persisted in the backend SQLite store. Open an entry to inspect its full threat and signal detail."
      />
      {error && <div className="alert error">{error}</div>}
      {items === null && !error && <div className="alert info">Loading history…</div>}
      {items !== null && items.length === 0 && (
        <div className="panel">
          <div className="empty-state">
            <h3>No previous analyses</h3>
            <p>Upload a recording to get started — completed analyses will appear here.</p>
          </div>
        </div>
      )}
      {items && items.length > 0 && (
        <div className="panel">
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Recording</th>
                  <th>Scenario</th>
                  <th>Classification</th>
                  <th>Windows</th>
                  <th>Suspicious</th>
                  <th>Analysed</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.analysis_id}>
                    <td>{a.recording_id}</td>
                    <td>{a.scenario_id || '—'}</td>
                    <td style={{ color: severityTone(a.classification) === 'danger' ? 'var(--danger)' : severityTone(a.classification) === 'warning' ? 'var(--warning)' : 'var(--success)' }}>
                      {classLabel(a.classification)}
                    </td>
                    <td>{a.window_count}</td>
                    <td>{a.suspicious_count}</td>
                    <td>{shortTime(a.analyzed_at)}</td>
                    <td>
                      <button
                        className="btn"
                        disabled={loadingId === a.analysis_id}
                        onClick={() => open(a.analysis_id)}
                      >
                        {loadingId === a.analysis_id ? 'Opening…' : 'Open'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
