const BASE = import.meta.env.VITE_API_BASE || '';

async function req(path, opts = {}, timeoutMs = 30000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, { ...opts, signal: ctrl.signal });
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try { detail = (await res.json()).detail || detail; } catch {}
      throw new Error(detail);
    }
    return res.headers.get('content-type')?.includes('json')
      ? res.json()
      : res.text();
  } finally {
    clearTimeout(t);
  }
}

export const api = {
  health: () => req('/health', {}, 4000),
  modelInfo: () => req('/api/model/info'),
  scenarios: () => req('/api/scenarios'),
  streamScenario: (scenarioId, intervalMs = 1000) => new EventSource(
    `${BASE}/api/stream/${encodeURIComponent(scenarioId)}?interval_ms=${intervalMs}`,
  ),
  history: () => req('/api/history'),
  getResult: (id) => req(`/api/results/${id}`),
  analyze: async ({ navFile, rfFile, rinexFile, scenarioId }) => {
    const fd = new FormData();
    fd.append('nav_file', navFile);
    if (rfFile) fd.append('rf_file', rfFile);
    if (rinexFile) fd.append('rinex_file', rinexFile);
    if (scenarioId) fd.append('scenario_id', scenarioId);
    return req('/api/analyze', { method: 'POST', body: fd }, 120000);
  },
  validate: async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return req('/api/datasets/validate', { method: 'POST', body: fd });
  },
  inspect: async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return req('/api/datasets/inspect', { method: 'POST', body: fd });
  },
};

export const API_BASE = BASE;
