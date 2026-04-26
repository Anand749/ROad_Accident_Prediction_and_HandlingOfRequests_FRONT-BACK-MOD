import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../utils/api.js';
import { MapContainer, TileLayer, CircleMarker, Circle, Popup } from 'react-leaflet';
import HeatmapLegend from '../components/HeatmapLegend.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [accidents, setAccidents] = useState([]);
  const [stats, setStats] = useState({
    totalAccidents: 0,
    pendingSOS: 0,
    activeWorkers: 0,
    cities: 0,
    pendingConfirmation: 0,
  });
  const { socket } = useSocket();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accRes, sosRes, workersRes] = await Promise.all([
          api.get('/accidents'),
          api.get('/sos'),
          api.get('/workers'),
        ]);
        setAccidents(accRes.data);
        const pendingCount = sosRes.data.filter((a) => a.status === 'pending').length;
        const confirmCount = sosRes.data.filter((a) => a.status === 'pending_confirmation').length;
        const activeWorkers = workersRes.data.filter((w) => w.available).length;
        const uniqueCities = new Set(accRes.data.map((a) => a.city)).size;
        setStats({
          totalAccidents: accRes.data.length,
          pendingSOS: pendingCount,
          activeWorkers,
          cities: uniqueCities,
          pendingConfirmation: confirmCount,
        });
      } catch {
        // ignore for now
      }
    };
    fetchData();
  }, []);

  // Listen for new SOS
  useEffect(() => {
    if (!socket) return undefined;
    socket.on('new-sos-alert', () => {
      toast.error('🚨 New SOS Alert!');
      setStats((prev) => ({ ...prev, pendingSOS: prev.pendingSOS + 1 }));
    });
    return () => { socket.off('new-sos-alert'); };
  }, [socket]);

  const center = accidents[0]?.location || { lat: 19.076, lng: 72.8777 };

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

  return (
    <div className="pt-4 pb-10">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div>
            <p className="font-rajdhani text-xs uppercase tracking-[0.26em] text-accentBlue">
              Admin Command Overview
            </p>
            <h2 className="font-rajdhani text-3xl font-semibold mt-1">
              Incident <span className="gradient-text">Heatmap & Metrics</span>
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Monitor accidents, SOS load and ground-force readiness across all cities.
            </p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Total Accidents', value: stats.totalAccidents, accent: 'from-accentBlue to-blue-700', icon: '📊' },
            { label: 'Pending SOS', value: stats.pendingSOS, accent: 'from-accentRed to-red-700', icon: '🚨' },
            { label: 'Awaiting Confirm', value: stats.pendingConfirmation, accent: 'from-amber-400 to-orange-600', icon: '⏳' },
            { label: 'Active Workers', value: stats.activeWorkers, accent: 'from-emerald-400 to-emerald-700', icon: '👷' },
            { label: 'Cities Monitored', value: stats.cities, accent: 'from-purple-400 to-indigo-700', icon: '🏙️' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card px-4 py-3 hover-lift"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-gray-400 uppercase tracking-[0.16em]">
                  {s.label}
                </p>
                <span className="text-sm">{s.icon}</span>
              </div>
              <p className="mt-1 font-rajdhani text-2xl font-bold">{s.value}</p>
              <div className={`mt-2 h-1 rounded-full bg-gradient-to-r ${s.accent}`} />
            </motion.div>
          ))}
        </div>

        {/* Map */}
        <div className="relative glass-card overflow-hidden h-[450px]">
          <MapContainer
            center={[center.lat, center.lng]}
            zoom={5}
            scrollWheelZoom
            className="w-full h-full"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            {/* Heatmap zones */}
            {accidents.map((a) => (
              <Circle
                key={`zone-${a._id}`}
                center={[a.location.lat, a.location.lng]}
                radius={severityRadius(a.severity, a.accidentRate)}
                pathOptions={{
                  color: 'transparent',
                  fillColor: severityColor(a.severity),
                  fillOpacity: 0.15,
                }}
              />
            ))}
            {/* Dot markers */}
            {accidents.map((a) => (
              <CircleMarker
                key={a._id}
                center={[a.location.lat, a.location.lng]}
                radius={6 + (a.accidentRate || 0) / 30}
                pathOptions={{
                  color: severityColor(a.severity),
                  fillColor: severityColor(a.severity),
                  fillOpacity: 0.7,
                }}
              >
                <Popup>
                  <div className="text-xs" style={{ minWidth: 120 }}>
                    <p className="font-semibold">{a.location.address || a.city}</p>
                    <p className="mt-1">
                      Severity: <span className="font-semibold uppercase">{a.severity}</span>
                    </p>
                    <p>Rate: {a.accidentRate}%</p>
                    {a.casualties > 0 && <p>Casualties: {a.casualties}</p>}
                    <p style={{ color: '#888', fontSize: 10, marginTop: 4 }}>
                      {new Date(a.reportedAt).toLocaleString()}
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
          <HeatmapLegend />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
