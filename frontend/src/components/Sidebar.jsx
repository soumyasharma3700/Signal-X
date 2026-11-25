import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Upload, Activity, ShieldAlert,
  History as HistoryIcon, Settings as SettingsIcon, Satellite
} from 'lucide-react';

const items = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/dataset', label: 'Dataset Analysis', icon: Upload },
  { to: '/signals', label: 'Signal Monitoring', icon: Activity },
  { to: '/threats', label: 'Threat Detection', icon: ShieldAlert },
  { to: '/history', label: 'Analysis History', icon: HistoryIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export default function Sidebar({ backendOnline }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">S</div>
        <div className="brand-text">
          <h1>SIGNAL X</h1>
          <p>GNSS Integrity</p>
        </div>
      </div>
      <nav className="nav">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="conn-status">
          <span className={`conn-dot ${backendOnline === true ? 'online' : backendOnline === false ? 'offline' : ''}`} />
          <span>
            Backend {backendOnline === true ? 'online' : backendOnline === false ? 'offline' : 'checking…'}
          </span>
        </div>
      </div>
    </aside>
  );
}
