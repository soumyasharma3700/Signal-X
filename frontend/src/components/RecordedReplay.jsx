import { useEffect, useRef, useState } from 'react';
import { Play, Radio, Square } from 'lucide-react';
import { api } from '../services/api.js';
import { fmt, shortTime } from '../utils/formatters.js';

function firstValue(values, keys) {
  for (const key of keys) {
    if (values[key] !== null && values[key] !== undefined) {
      return values[key];
    }
  }
  return null;
}

export default function RecordedReplay() {
  const [scenarios, setScenarios] = useState([]);
  const [scenarioId, setScenarioId] = useState('');
  const [intervalMs, setIntervalMs] = useState(1000);
  const [samples, setSamples] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const streamRef = useRef(null);

  useEffect(() => {
    let active = true;
    api.scenarios()
      .then((response) => {
        if (!active) return;
        const available = response.scenarios ?? [];
        setScenarios(available);
        setScenarioId(available[0]?.scenario_id ?? '');
        setStatus(available.length ? 'ready' : 'empty');
      })
      .catch((cause) => {
        if (!active) return;
        setError(cause.message || 'Could not load recorded scenarios.');
        setStatus('error');
      });

    return () => {
      active = false;
      streamRef.current?.close();
    };
  }, []);

  function stopReplay() {
    streamRef.current?.close();
    streamRef.current = null;
    setStatus('stopped');
  }

  function startReplay() {
    if (!scenarioId) return;
    streamRef.current?.close();
    setSamples([]);
    setError('');
    setStatus('connecting');

    const stream = api.streamScenario(scenarioId, intervalMs);
    streamRef.current = stream;
    stream.onopen = () => setStatus('playing');
    stream.onmessage = (event) => {
      try {
        const sample = JSON.parse(event.data);
        setSamples((current) => [...current.slice(-99), sample]);
        setStatus('playing');
      } catch {
        setError('The replay stream returned an invalid telemetry record.');
        stream.close();
        streamRef.current = null;
        setStatus('error');
      }
    };
    stream.addEventListener('complete', () => {
      stream.close();
      if (streamRef.current === stream) streamRef.current = null;
      setStatus('complete');
    });
    stream.addEventListener('replay_error', (event) => {
      try {
        setError(JSON.parse(event.data).detail || 'Scenario replay failed.');
      } catch {
        setError('Scenario replay failed.');
      }
      stream.close();
      if (streamRef.current === stream) streamRef.current = null;
      setStatus('error');
    });
    stream.onerror = () => {
      if (stream.readyState === EventSource.CLOSED) {
        setError('The replay connection closed unexpectedly.');
        if (streamRef.current === stream) streamRef.current = null;
        setStatus('error');
      } else {
        setStatus('reconnecting');
      }
    };
  }

  const latest = samples[samples.length - 1];
  const latestMeasurements = latest?.measurements ?? {};
  const statusText = {
    loading: 'Loading recordings…',
    empty: 'No recordings found',
    ready: 'Ready to replay',
    connecting: 'Connecting…',
    playing: 'Playing recorded data',
    reconnecting: 'Reconnecting…',
    stopped: 'Replay stopped',
    complete: 'Replay complete',
    error: 'Replay unavailable',
  }[status] ?? status;
  const replayActive = ['playing', 'connecting', 'reconnecting'].includes(status);

  return (
    <section className="panel replay-panel" aria-labelledby="replay-title">
      <div className="replay-heading">
        <div>
          <div className="eyebrow">RECORDED DATA · NOT A LIVE SATELLITE LINK</div>
          <h2 id="replay-title">Jammertest telemetry replay</h2>
          <p>
            Play actual recorded receiver observations in timestamp order to
            approximate a live feed. No receiver or trained classifier is needed.
          </p>
        </div>
        <div className={`replay-status ${status}`}>
          <span className="replay-status-dot" />
          {statusText}
        </div>
      </div>

      <div className="replay-controls">
        <label>
          <span>Recorded scenario</span>
          <select
            value={scenarioId}
            onChange={(event) => setScenarioId(event.target.value)}
            disabled={!scenarios.length || status === 'playing' || status === 'connecting'}
          >
            {scenarios.length
              ? scenarios.map((scenario) => (
                <option key={scenario.scenario_id} value={scenario.scenario_id}>
                  {scenario.attack_type} · {scenario.name}
                </option>
              ))
              : <option value="">No extracted recordings available</option>}
          </select>
        </label>
        <label>
          <span>Playback interval</span>
          <select
            value={intervalMs}
            onChange={(event) => setIntervalMs(Number(event.target.value))}
            disabled={status === 'playing' || status === 'connecting'}
          >
            <option value={1000}>1 row / second</option>
            <option value={500}>2 rows / second</option>
            <option value={250}>4 rows / second</option>
          </select>
        </label>
        <button
          className={`btn ${replayActive ? 'danger' : 'primary'}`}
          onClick={replayActive ? stopReplay : startReplay}
          disabled={!replayActive && (!scenarioId || status === 'loading')}
        >
          {replayActive ? <Square size={14} /> : <Play size={14} />}
          {replayActive ? 'Stop replay' : 'Start replay'}
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="replay-summary">
        <div>
          <span className="label">Samples received</span>
          <span className="value">{samples.length}</span>
        </div>
        <div>
          <span className="label">Recorded timestamp</span>
          <span className="value">{latest ? shortTime(latest.timestamp) : '—'}</span>
        </div>
        <div>
          <span className="label">Signal SNR</span>
          <span className="value">
            {fmt(firstValue(latestMeasurements, ['cno', 'cn0', 'snr_L1', 'snr_L2', 'signal_strength']))}
          </span>
        </div>
        <div>
          <span className="label">Satellites</span>
          <span className="value">
            {fmt(firstValue(latestMeasurements, ['num_sv', 'numSV', 'satellites']), 0)}
          </span>
        </div>
        <div>
          <span className="label">Position</span>
          <span className="value">
            {latest
              ? `${fmt(firstValue(latestMeasurements, ['lat', 'latitude']), 5)}, ${fmt(firstValue(latestMeasurements, ['lon', 'longitude']), 5)}`
              : '—'}
          </span>
        </div>
        <div>
          <span className="label">RF jamming index</span>
          <span className="value">
            {fmt(firstValue(latestMeasurements, ['jamInd_01', 'jamInd_02']))}
          </span>
        </div>
      </div>

      <div className="replay-feed" aria-live="polite">
        {!samples.length
          ? (
            <div className="empty-state">
              <div className="icon-wrap"><Radio size={24} /></div>
              <h3>Waiting for replay</h3>
              <p>Choose a recorded Jammertest scenario and start playback.</p>
            </div>
          )
          : samples.slice(-8).reverse().map((sample) => {
            const measurements = sample.measurements ?? {};
            return (
              <div className="replay-row" key={`${sample.sequence}-${sample.timestamp}`}>
                <span className="replay-sequence">#{sample.sequence + 1}</span>
                <span className="replay-time">{shortTime(sample.timestamp)}</span>
                <span>SNR {fmt(firstValue(measurements, ['cno', 'cn0', 'snr_L1', 'snr_L2', 'signal_strength']))}</span>
                <span>Jamming {fmt(firstValue(measurements, ['jamInd_01', 'jamInd_02']))}</span>
                <span>Satellites {fmt(firstValue(measurements, ['num_sv', 'numSV', 'satellites']), 0)}</span>
                <span>Fix {fmt(firstValue(measurements, ['fix_type', 'fixType', 'fix']))}</span>
              </div>
            );
          })}
      </div>
    </section>
  );
}
