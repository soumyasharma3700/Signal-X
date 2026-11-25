import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { classColor } from '../utils/chartHelpers.js';

export default function SatelliteChart({ windows }) {
  if (!windows?.length) {
    return (
      <div className="chart-card">
        <h3>Satellite visibility</h3>
        <div className="empty">No satellite-count data available yet.</div>
      </div>
    );
  }

  const data = windows.map((w, i) => ({
    i: i + 1,
    t: w.start_time?.slice(11, 19) || `${i + 1}`,
    sats: w.measurements?.sat_count_mean ?? null,
    cls: w.predicted_class,
  }));

  return (
    <div className="chart-card">
      <h3>Satellite visibility</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="t" stroke="#8898b8" fontSize={11} />
          <YAxis stroke="#8898b8" fontSize={11} />
          <Tooltip contentStyle={{ background: '#0f1a2c', border: '1px solid #1a2a44', borderRadius: 8, fontSize: 12 }} />
          <Bar dataKey="sats">
            {data.map((d, i) => (
              <Cell key={i} fill={classColor(d.cls)} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
