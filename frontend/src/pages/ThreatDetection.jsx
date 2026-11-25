import Header from '../components/Header.jsx';
import ThreatPanel from '../components/ThreatPanel.jsx';
import Timeline from '../components/Timeline.jsx';
import { fmt, classLabel } from '../utils/formatters.js';
import { classColor } from '../utils/chartHelpers.js';

export default function ThreatDetection({ result }) {
  const windows = result?.window_predictions || [];

  return (
    <>
      <Header
        eyebrow="Threat Detection"
        title="Model assessment"
        subtitle="Statistical estimates from the trained classifier. Model probabilities are not verified attack probabilities."
      />
      <ThreatPanel result={result} />
      <Timeline windows={windows} />
      {windows.length > 0 && (
        <div className="panel">
          <h2>Per-window detail</h2>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Predicted</th>
                  <th>C/N₀</th>
                  <th>Sats</th>
                  <th>Fix</th>
                  <th>Jump (m)</th>
                  <th>Top class prob.</th>
                </tr>
              </thead>
              <tbody>
                {windows.map((w, i) => {
                  const probs = w.probability_scores || {};
                  const top = Object.entries(probs).sort((a, b) => b[1] - a[1])[0] || [];
                  const flagged = w.predicted_class !== 'normal' && (top[1] || 0) > 0.6;
                  const m = w.measurements || {};
                  return (
                    <tr key={i} className={flagged ? 'flagged' : ''}>
                      <td>{i + 1}</td>
                      <td>{w.start_time?.slice(11, 19) || w.start_time}</td>
                      <td>{w.end_time?.slice(11, 19) || w.end_time}</td>
                      <td style={{ color: classColor(w.predicted_class) }}>{classLabel(w.predicted_class)}</td>
                      <td>{fmt(m.cno_mean)}</td>
                      <td>{fmt(m.sat_count_mean, 1)}</td>
                      <td>{fmt(m.fix_available_ratio)}</td>
                      <td>{fmt(m.pos_jump_max_m)}</td>
                      <td>{top.length ? `${classLabel(top[0])} ${(top[1] * 100).toFixed(1)}%` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
