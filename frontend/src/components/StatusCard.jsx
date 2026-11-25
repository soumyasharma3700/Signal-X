export default function StatusCard({
  title, icon: Icon, value, sub, pill, tone = 'neutral', extra,
}) {
  return (
    <div className={`status-card ${tone}`}>
      <div className="head">
        <span className="title">{title}</span>
        {Icon && <span className="icon"><Icon size={16} /></span>}
      </div>
      {value !== undefined && <div className="metric">{value}</div>}
      {sub && <div className="sub">{sub}</div>}
      {pill && <div style={{ marginTop: '0.5rem' }}>{pill}</div>}
      {extra}
    </div>
  );
}
