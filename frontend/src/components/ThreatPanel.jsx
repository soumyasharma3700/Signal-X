import { ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { severityTone } from '../utils/chartHelpers.js';
import { classLabel } from '../utils/formatters.js';

export default function ThreatPanel({ result }) {
  if (!result) {
    return (
      <div className="panel">
        <div className="empty-state">
          <div className="icon-wrap"><ShieldQuestion size={32} /></div>
          <h3>No analysis yet</h3>
          <p>Upload a GNSS recording in Dataset Analysis to see a threat assessment.</p>
        </div>
      </div>
    );
  }

  const tone = severityTone(result.classification);
  const isClean = String(result.classification).includes('normal');

  // Aggregate mean probabilities across windows
  const sum = {};
  let count = 0;
  for (const w of result.window_predictions || []) {
    for (const [cls, p] of Object.entries(w.probability_scores || {})) {
      sum[cls] = (sum[cls] || 0) + p;
    }
    count++;
  }
  const mean = Object.fromEntries(
    Object.entries(sum).map(([k, v]) => [k, v / Math.max(count, 1)])
  );
  const ranked = Object.entries(mean).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <div className={`threat-hero ${tone}`}>
        <div>
          <div className="label">Model prediction</div>
          <div className="value">{classLabel(result.classification)}</div>
          <div className="sub" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
            {isClean
              ? 'Model did not flag this recording as interference.'
              : 'Model flagged this recording as suspicious. Statistical estimate, not verified attack.'}
          </div>
        </div>
        <div style={{ minWidth: 260 }}>
          <div className="label" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            Mean class probabilities
          </div>
          <div className="prob-bars">
            {ranked.map(([cls, p]) => (
              <div className="prob-bar" key={cls}>
                <span className="name">{cls}</span>
                <div className="track"><div className={`fill ${cls}`} style={{ width: `${(p * 100).toFixed(1)}%` }} /></div>
                <span className="pct">{(p * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="status-strip" style={{ marginTop: 0, marginBottom: '1rem' }}>
        <div className="item">
          <span className="label">Recording</span>
          <span className="value">{result.recording_id || '—'}</span>
        </div>
        <div className="item">
          <span className="label">Scenario</span>
          <span className="value">{result.scenario_id || '—'}</span>
        </div>
        <div className="item">
          <span className="label">Windows</span>
          <span className="value">{result.window_predictions?.length || 0}</span>
        </div>
        <div className="item">
          <span className="label">Analysed</span>
          <span className="value">{result.analyzed_at ? new Date(result.analyzed_at).toLocaleString() : '—'}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {Object.entries(result.indicators || {}).map(([k, v]) => (
          <span
            key={k}
            className={`pill ${['nominal', 'good'].includes(v) ? 'success' : 'danger'}`}
          >
            {k.replace(/_/g, ' ')}: {v}
          </span>
        ))}
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', borderLeft: '2px solid var(--accent)', paddingLeft: '0.75rem' }}>
        {result.disclaimer}
      </p>
    </>
  );
}
