import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet marker icons (default path breaks under Vite)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function MapView({ trajectory }) {
  if (!trajectory || trajectory.length < 2) {
    return (
      <div className="chart-card">
        <h3>Navigation trajectory</h3>
        <div className="empty">No position data in this recording.</div>
      </div>
    );
  }

  const points = trajectory.map((p) => [p.lat, p.lon]);
  const start = points[0];
  const end = points[points.length - 1];
  const center = [
    (Math.min(...points.map((p) => p[0])) + Math.max(...points.map((p) => p[0]))) / 2,
    (Math.min(...points.map((p) => p[1])) + Math.max(...points.map((p) => p[1]))) / 2,
  ];

  return (
    <div className="chart-card">
      <h3>Navigation trajectory</h3>
      <div className="map-wrap">
        <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Polyline positions={points} pathOptions={{ color: '#22d3ee', weight: 3 }} />
          <Marker position={start}><Popup>Start</Popup></Marker>
          <Marker position={end}><Popup>End</Popup></Marker>
        </MapContainer>
      </div>
    </div>
  );
}
