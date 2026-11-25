import { classLabel } from '../utils/formatters.js';

export default function Timeline({ windows, onSelect }) {
  if (!windows?.length) {
    return (
      <div className="panel">
        <h2>Threat timeline</h2>
        <div className="empty-state">
          <p>Timeline will appear after analysis completes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>Threat timeline</h2>
      <div className="timeline">
        {windows.map((w, i) => (
          <div
            key={i}
            className={`timeline-seg ${w.predicted_class}`}
            title={`${w.start_time} → ${w.end_time}\nPredicted: ${classLabel(w.predicted_class)}`}
            onClick={() => onSelect?.(i)}
          />
        ))}
      </div>
      <div className="legend">
        <span className="normal">normal</span>
        <span className="jamming">jamming</span>
        <span className="spoofing">spoofing</span>
        <span className="meaconing">meaconing</span>
      </div>
    </div>
  );
}
