// Clearly labelled sample data for hackathon demo mode.
// Does NOT come from the backend.

function buildResult(scenario) {
  const windows = [];
  const now = Date.now();
  const total = 36;
  for (let i = 0; i < total; i++) {
    const start = new Date(now + i * 10000);
    const end = new Date(now + (i + 1) * 10000);
    const degraded = i >= 10 && i <= 24;
    const cno = scenario === 'jamming'
      ? (degraded ? 18 + Math.random() * 4 : 40 + Math.random() * 4)
      : scenario === 'spoofing'
      ? (degraded ? 44 + Math.random() * 5 : 40 + Math.random() * 4)
      : 40 + Math.random() * 4;
    const sats = scenario === 'jamming'
      ? (degraded ? 3 + Math.random() * 2 : 10 + Math.random() * 2)
      : 10 + Math.random() * 2;
    const jump = scenario === 'spoofing' && degraded ? 80 + Math.random() * 60 : Math.random() * 4;

    const probs = scenario === 'jamming'
      ? { jamming: degraded ? 0.82 + Math.random() * 0.1 : 0.06, spoofing: 0.1, meaconing: 0.06 }
      : scenario === 'spoofing'
      ? { jamming: 0.08, spoofing: degraded ? 0.85 + Math.random() * 0.1 : 0.07, meaconing: 0.08 }
      : { normal: 0.9, jamming: 0.05, spoofing: 0.05 };

    windows.push({
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      predicted_class: degraded ? scenario : 'normal',
      probability_scores: probs,
      measurements: {
        cno_mean: Number(cno.toFixed(2)),
        sat_count_mean: Number(sats.toFixed(1)),
        fix_available_ratio: degraded ? 0.6 : 0.95,
        pos_jump_max_m: Number(jump.toFixed(2)),
      },
    });
  }

  const trajectory = [];
  for (let i = 0; i < 80; i++) {
    trajectory.push({
      lat: 59.378 + Math.sin(i / 12) * 0.002 + (scenario === 'spoofing' && i > 30 ? 0.01 : 0),
      lon: 18.054 + Math.cos(i / 12) * 0.002,
      t: new Date(now + i * 5000).toISOString(),
    });
  }

  return {
    analysis_id: 'demo-' + scenario,
    recording_id: `DEMO_${scenario.toUpperCase()}`,
    classification: `possible_${scenario}`,
    analyzed_at: new Date().toISOString(),
    window_predictions: windows,
    indicators: {
      signal_quality: scenario === 'jamming' ? 'degraded' : 'nominal',
      satellite_visibility: scenario === 'jamming' ? 'reduced' : 'nominal',
      fix_availability: scenario === 'jamming' ? 'poor' : 'nominal',
      position_stability: scenario === 'spoofing' ? 'anomalous' : 'nominal',
    },
    trajectory,
    disclaimer:
      'DEMO DATA — SIMULATED OBSERVATIONS. Model probabilities are illustrative only.',
  };
}

export const demoPresets = {
  normal: () => buildResult('normal'),
  jamming: () => buildResult('jamming'),
  spoofing: () => buildResult('spoofing'),
};
