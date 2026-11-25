import { useState } from 'react';
import { Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import Header from '../components/Header.jsx';
import FileUploader from '../components/FileUploader.jsx';
import { api } from '../services/api.js';

export default function DatasetAnalysis({ onResult }) {
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | validating | analyzing | done | error
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  function pickRole(name) {
    const n = name.toLowerCase();
    if (n.includes('nav_pvt')) return 'nav';
    if (n.includes('mon_rf')) return 'rf';
    if (n.includes('rinex')) return 'rinex';
    if (n.includes('scenario') || n.endsWith('.json')) return 'metadata';
    return null;
  }

  async function handleAnalyze() {
    setError('');
    setStatus('analyzing');

    const nav = files.find((f) => pickRole(f.name) === 'nav');
    if (!nav) {
      setError('nav_pvt.csv is required.');
      setStatus('error');
      return;
    }
    const rf = files.find((f) => pickRole(f.name) === 'rf');
    const rinex = files.find((f) => pickRole(f.name) === 'rinex');
    const metadataFile = files.find((f) => pickRole(f.name) === 'metadata');

    try {
      let scenarioId;
      if (metadataFile) {
        const metadata = JSON.parse(await metadataFile.text());
        scenarioId = metadata.scenario_id ?? metadata.recording_id;
      }
      const res = await api.analyze({
        navFile: nav,
        rfFile: rf,
        rinexFile: rinex,
        scenarioId,
      });
      setResult(res);
      setStatus('done');
      onResult(res);
    } catch (err) {
      setError(err.message || 'Analysis failed.');
      setStatus('error');
    }
  }

  return (
    <>
      <Header
        eyebrow="Dataset Analysis"
        title="Upload GNSS recording"
        subtitle="Provide related files from the same recording or scenario. Include nav_pvt.csv at minimum for meaningful feature extraction."
      />
      <div className="panel">
        <FileUploader files={files} onChange={setFiles} />
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            className="btn primary"
            onClick={handleAnalyze}
            disabled={status === 'analyzing' || files.length === 0}
          >
            {status === 'analyzing' ? 'Analysing…' : 'Start analysis'}
          </button>
          {files.length > 0 && status !== 'analyzing' && (
            <button className="btn ghost" onClick={() => { setFiles([]); setResult(null); setError(''); setStatus('idle'); }}>
              Clear
            </button>
          )}
        </div>
        {status === 'analyzing' && (
          <div className="alert info" style={{ marginTop: '1rem' }}>
            Processing GNSS data on the backend. Large recordings may take up to a minute.
          </div>
        )}
        {error && (
          <div className="alert error"><AlertCircle size={14} style={{ marginRight: 6 }} /> {error}</div>
        )}
        {result && status === 'done' && (
          <div className="alert success" style={{ marginTop: '1rem' }}>
            <CheckCircle2 size={14} style={{ marginRight: 6 }} />
            Analysis complete — {result.window_predictions.length} windows processed,
            classification: <strong>{result.classification.replace('possible_', '')}</strong>.
            <div style={{ marginTop: '0.5rem' }}>
              <a href="/threats" className="btn-link">Open threat view →</a>
              {'  ·  '}
              <a href="/signals" className="btn-link">Inspect signal graphs →</a>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
