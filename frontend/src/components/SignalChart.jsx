import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea, Legend,
} from 'recharts';
import { classColor } from '../utils/chartHelpers.js';

export default function SignalChart({ windows, title = 'C/N₀ over time' }) {
  if (!windows?.length) {
    return (
      <div className="chart-card">
        <h3>{title}</h3>
        <div className="empty">No signal-quality data available yet.</div>
      </div>
    );
  }

  const data = windows.map((w, i) => ({
    i: i + 1,
    t: w.start_time?.slice(11, 19) || `${i + 1}`,
    cno: w.measurements?.cno_mean ?? null,
    cls: w.predicted_class,
  }));

  const suspicious = windows.map((w) => w.predicted_class).map((c) => c !== 'normal');

  return (
    <div className="chart-card">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="t" stroke="#8898b8" fontSize={11} />
          <YAxis stroke="#8898b8" fontSize={11} label={{
            value: 'dB-Hz', angle: -90, position: 'insideLeft', fill: '#8898b8', fontSize: 11,
          }} />
          <Tooltip
            contentStyle={{ background: '#0f1a2c', border: '1px solid #1a2a44', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#8898b8' }}
          />
          {data.map((d, i) => (
            suspicious[i] && (
              <ReferenceArea
                key={i}
                x1={d.t}
                x2={data[i + 1]?.t || d.t}
                fill={classColor(d.cls)}
                fillOpacity={0.15}
              />
            )
          ))}
          <Line
            type="monotone" dataKey="cno" stroke="#22d3ee" strokeWidth={2}
            dot={{ r: 3, fill: '#22d3ee' }} connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
