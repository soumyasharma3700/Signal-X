export function classColor(cls) {
  const c = String(cls || 'normal').replace('possible_', '');
  if (c === 'jamming') return '#ef4444';
  if (c === 'spoofing') return '#f59e0b';
  if (c === 'meaconing') return '#a855f7';
  if (c === 'combined') return '#ff7a55';
  return '#10b981';
}

export function severityTone(cls) {
  const c = String(cls || '').replace('possible_', '');
  if (c === 'jamming' || c === 'combined') return 'danger';
  if (c === 'spoofing') return 'warning';
  if (c === 'meaconing') return 'purple';
  if (c === 'normal') return 'success';
  return 'neutral';
}
