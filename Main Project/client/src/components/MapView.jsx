import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import HeatmapLegend from './HeatmapLegend.jsx';

const userIcon = new L.DivIcon({
  className: 'custom-user-marker',
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#00D4FF;border:3px solid #fff;box-shadow:0 0 12px rgba(0,212,255,0.6);"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const severityColor = (severity) => {
  if (severity === 'high') return '#FF2D55';
  if (severity === 'medium') return '#FFD60A';
  return '#30D158';
};

const severityRadius = (severity, rate) => {
  if (severity === 'high') return 400 + (rate || 50) * 5;
  if (severity === 'medium') return 300 + (rate || 30) * 4;
  return 200 + (rate || 10) * 3;
};

const MapView = ({ center, accidents = [], height = 'h-80', showUser = true, showHeatmap = false }) => {
  if (!center) {
    return (
      <div className={`glass-card ${height} flex items-center justify-center`}>
        <div className="text-center space-y-3">
          <div className="h-10 w-10 mx-auto rounded-full border-2 border-accentBlue border-t-transparent animate-spin" />
          <p className="text-xs text-gray-400">Waiting for location...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-card overflow-hidden ${height} relative`}>
      <MapContainer center={[center.lat, center.lng]} zoom={13} scrollWheelZoom className="w-full h-full">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        {showUser && (
          <Marker position={[center.lat, center.lng]} icon={userIcon}>
            <Popup>
              <div className="text-xs font-semibold">📍 Your current location</div>
            </Popup>
          </Marker>
        )}

        {/* Risk heatmap zones — large colored circles */}
        {showHeatmap && accidents.map((a) => (
          <Circle
            key={`zone-${a._id}`}
            center={[a.location.lat, a.location.lng]}
            radius={severityRadius(a.severity, a.accidentRate)}
            pathOptions={{
              color: 'transparent',
              fillColor: severityColor(a.severity),
              fillOpacity: 0.18,
            }}
          />
        ))}

        {/* Accident dot markers */}
        {accidents.map((a) => (
          <CircleMarker
            key={a._id}
            center={[a.location.lat, a.location.lng]}
            radius={8 + (a.accidentRate || 0) / 25}
            pathOptions={{
              color: severityColor(a.severity),
              fillColor: severityColor(a.severity),
              fillOpacity: 0.7,
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-xs space-y-1" style={{ minWidth: 140 }}>
                <p className="font-semibold text-sm">{a.location.address || a.city}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: severityColor(a.severity),
                  }} />
                  <span style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: 11 }}>{a.severity}</span>
                </div>
                <p>Risk rate: <strong>{a.accidentRate}%</strong></p>
                {a.casualties > 0 && <p>Casualties: {a.casualties}</p>}
                {a.reportedAt && (
                  <p style={{ color: '#888', fontSize: 10, marginTop: 4 }}>
                    {new Date(a.reportedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Risk legend overlay */}
      {showHeatmap && <HeatmapLegend />}
    </div>
  );
};

export default MapView;
