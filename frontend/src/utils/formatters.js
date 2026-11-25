export function fmt(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  if (typeof value === 'number') return value.toFixed(digits);
  return String(value);
}

export function classifyTone(cls) {
  if (!cls) return 'neutral';
  const c = String(cls).toLowerCase().replace('possible_', '');
  if (c === 'jamming' || c === 'combined') return 'danger';
  if (c === 'spoofing') return 'warning';
  if (c === 'meaconing') return 'purple';
  if (c === 'normal') return 'success';
  return 'neutral';
}

export function indicatorTone(v) {
  const s = String(v).toLowerCase();
  if (['nominal', 'good', 'ok'].includes(s)) return 'success';
  if (['degraded', 'reduced', 'poor', 'anomalous'].includes(s)) return 'danger';
  return 'neutral';
}

export function bytesSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function shortTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

export function classLabel(cls) {
  if (!cls) return 'Unknown';
  const c = String(cls).replace('possible_', '');
  return c.charAt(0).toUpperCase() + c.slice(1);
}
