import { useEffect, useState } from 'react';
import Header from '../components/Header.jsx';
import { api, API_BASE } from '../services/api.js';

export default function Settings() {
  const [model, setModel] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.modelInfo().then(setModel).catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <Header
        eyebrow="Settings"
        title="Configuration"
        subtitle="Read-only view of the current backend integration and model."
      />
      <div className="panel">
        <h2>API</h2>
        <div className="status-strip" style={{ marginTop: 0 }}>
          <div className="item">
            <span className="label">Base URL</span>
            <span className="value">{API_BASE || '(same origin, proxied)'}</span>
          </div>
        </div>
      </div>
      <div className="panel">
        <h2>Model</h2>
        {error && <div className="alert error">{error}</div>}
        {!model && !error && <div className="alert info">Loading model info…</div>}
        {model && (
          <div className="status-strip" style={{ marginTop: 0 }}>
            <div className="item"><span className="label">Type</span><span className="value">{model.model_type}</span></div>
            <div className="item"><span className="label">Macro-F1</span><span className="value">{model.macro_f1?.toFixed(3)}</span></div>
            <div className="item"><span className="label">Classes</span><span className="value">{(model.supported_classes || []).join(', ')}</span></div>
          </div>
        )}
      </div>
    </>
  );
}
