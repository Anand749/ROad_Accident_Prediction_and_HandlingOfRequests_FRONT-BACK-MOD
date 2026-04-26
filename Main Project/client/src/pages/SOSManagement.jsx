import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../utils/api.js';
import { useSocket } from '../context/SocketContext.jsx';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';

const statusBadge = (status) => {
  if (status === 'pending') return 'bg-accentRed/20 text-accentRed';
  if (status === 'assigned') return 'bg-yellow-400/20 text-yellow-300';
  if (status === 'pending_confirmation') return 'bg-amber-400/20 text-amber-300';
  return 'bg-emerald-500/20 text-emerald-300';
};

const statusLabel = (status) => {
  if (status === 'pending_confirmation') return 'Awaiting User';
  return status;
};

const statusDot = (status) => {
  if (status === 'pending') return '#FF2D55';
  if (status === 'assigned') return '#FFD60A';
  if (status === 'pending_confirmation') return '#F59E0B';
  return '#30D158';
};

const SOSManagement = () => {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [nearbyWorkers, setNearbyWorkers] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const { socket } = useSocket();

  const loadAlerts = async () => {
    try {
      const res = await api.get('/sos');
      setAlerts(res.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  useEffect(() => {
    if (!socket) return undefined;
    socket.on('new-sos-alert', ({ alert }) => {
      toast.error('🚨 New SOS alert received!');
      setAlerts((prev) => [alert, ...prev]);
    });
    socket.on('sos-updated', ({ alertId, status }) => {
      setAlerts((prev) =>
        prev.map((a) => (a._id === alertId ? { ...a, status } : a))
      );
      if (status === 'assigned') toast.success('Alert assigned to worker');
      if (status === 'pending_confirmation') toast('Awaiting user confirmation…', { icon: '⏳' });
      if (status === 'resolved') toast.success('Alert fully resolved!');
    });
    return () => {
      socket.off('new-sos-alert');
      socket.off('sos-updated');
    };
  }, [socket]);

  const openAssignModal = async (alert) => {
    setSelectedAlert(alert);
    try {
      const res = await api.get(`/sos/${alert._id}/workers`);
      setNearbyWorkers(res.data);
    } catch {
      setNearbyWorkers([]);
    }
  };

  const assignWorker = async (workerId) => {
    if (!selectedAlert) return;
    try {
      await api.patch(`/sos/${selectedAlert._id}/assign`, { workerId });
      toast.success('Worker assigned successfully');
      setSelectedAlert(null);
      setNearbyWorkers([]);
      loadAlerts();
    } catch {
      toast.error('Failed to assign worker');
    }
  };

  const resolveAlert = async (alertId) => {
    try {
      await api.patch(`/sos/${alertId}/resolve`);
      toast('Resolution sent to user for confirmation', { icon: '📤', duration: 4000 });
      loadAlerts();
    } catch {
      toast.error('Failed to resolve alert');
    }
  };

  const filteredAlerts =
    filter === 'all' ? alerts : alerts.filter((a) => a.status === filter);

  const mapCenter =
    alerts.find((a) => a.status === 'pending')?.location
    || alerts[0]?.location
    || { lat: 19.076, lng: 72.8777 };

  // Stats
  const pendingCount = alerts.filter((a) => a.status === 'pending').length;
  const assignedCount = alerts.filter((a) => a.status === 'assigned').length;
  const confirmCount = alerts.filter((a) => a.status === 'pending_confirmation').length;
  const resolvedCount = alerts.filter((a) => a.status === 'resolved').length;

  return (
    <div className="pt-4 pb-10">
      <div className="max-w-6xl mx-auto px-4 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div>
            <p className="font-rajdhani text-xs uppercase tracking-[0.26em] text-accentBlue">
              Live SOS Orchestration
            </p>
            <h2 className="font-rajdhani text-3xl font-semibold mt-1">
              Respond to <span className="gradient-text">Incoming Alerts</span>
            </h2>
          </div>
          <div className="glass-card px-3 py-2 flex items-center gap-2 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accentRed opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accentRed" />
            </span>
            <p className="text-gray-300">Real-time socket connected</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Pending', value: pendingCount, color: 'from-accentRed to-red-700' },
            { label: 'Assigned', value: assignedCount, color: 'from-yellow-400 to-amber-600' },
            { label: 'Awaiting User', value: confirmCount, color: 'from-amber-400 to-orange-600' },
            { label: 'Resolved', value: resolvedCount, color: 'from-emerald-400 to-emerald-700' },
          ].map((s) => (
            <div key={s.label} className="glass-card px-4 py-3 hover-lift">
              <p className="text-[10px] text-gray-400 uppercase tracking-[0.16em]">{s.label}</p>
              <p className="font-rajdhani text-2xl font-bold mt-1">{s.value}</p>
              <div className={`mt-2 h-1 rounded-full bg-gradient-to-r ${s.color}`} />
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.8fr)] gap-5">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-3"
          >
            {/* Filters */}
            <div className="flex items-center justify-between">
              <h3 className="font-rajdhani font-semibold tracking-[0.18em] uppercase text-xs text-gray-300">
                SOS Alerts
              </h3>
              <div className="flex gap-1.5 text-[11px] flex-wrap">
                {['all', 'pending', 'assigned', 'pending_confirmation', 'resolved'].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={`px-2 py-1 rounded-full border text-[10px] capitalize transition ${filter === f
                        ? 'border-accentBlue bg-accentBlue/10 text-accentBlue'
                        : 'border-white/10 text-gray-300 hover:bg-white/5'
                      }`}
                  >
                    {f === 'pending_confirmation' ? 'awaiting' : f}
                  </button>
                ))}
              </div>
            </div>

            {/* Alert table */}
            <div className="glass-card max-h-[380px] overflow-y-auto">
              <table className="min-w-full data-table">
                <thead className="bg-white/5 sticky top-0">
                  <tr>
                    <th className="px-3 py-2.5 text-left">User</th>
                    <th className="px-3 py-2.5 text-left hidden sm:table-cell">Location</th>
                    <th className="px-3 py-2.5 text-left">Status</th>
                    <th className="px-3 py-2.5 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAlerts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-gray-400">
                        No alerts match this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredAlerts.map((a) => (
                      <tr key={a._id} className="border-t border-white/5 hover:bg-white/[0.02] transition">
                        <td className="px-3 py-2.5">
                          <p className="font-semibold">{a.userName}</p>
                          <a href={`tel:${a.userPhone}`} className="text-[11px] text-accentBlue">
                            {a.userPhone}
                          </a>
                        </td>
                        <td className="px-3 py-2.5 text-gray-300 hidden sm:table-cell">
                          {a.location?.address || `${a.location?.lat?.toFixed(3)}, ${a.location?.lng?.toFixed(3)}`}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.14em] ${statusBadge(a.status)}`}
                          >
                            {a.status === 'pending' && (
                              <span className="h-1.5 w-1.5 rounded-full bg-accentRed animate-pulse" />
                            )}
                            {statusLabel(a.status)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-1.5">
                            {a.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => openAssignModal(a)}
                                className="px-2.5 py-1 rounded-full bg-accentBlue/15 text-[10px] text-accentBlue hover:bg-accentBlue/25 transition"
                              >
                                Assign
                              </button>
                            )}
                            {(a.status === 'pending' || a.status === 'assigned') && (
                              <button
                                type="button"
                                onClick={() => resolveAlert(a._id)}
                                className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-[10px] text-emerald-300 hover:bg-emerald-500/25 transition"
                              >
                                Resolve
                              </button>
                            )}
                            {a.status === 'pending_confirmation' && (
                              <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-[10px] text-amber-300">
                                ⏳ Waiting
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Map */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card overflow-hidden h-[420px] relative"
          >
            <MapContainer
              center={[mapCenter.lat, mapCenter.lng]}
              zoom={5}
              scrollWheelZoom
              className="w-full h-full"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              {alerts
                .filter((a) => a.status !== 'resolved')
                .map((a) => (
                  <CircleMarker
                    key={a._id}
                    center={[a.location.lat, a.location.lng]}
                    radius={a.status === 'pending' ? 12 : 8}
                    pathOptions={{
                      color: statusDot(a.status),
                      fillColor: statusDot(a.status),
                      fillOpacity: 0.7,
                      weight: a.status === 'pending' ? 3 : 2,
                    }}
                  >
                    <Popup>
                      <div className="text-xs space-y-1">
                        <p className="font-semibold">{a.userName}</p>
                        <p className="text-gray-300">
                          {a.location?.address || 'Unknown address'}
                        </p>
                        <p style={{ textTransform: 'uppercase', fontSize: 10, fontWeight: 600 }}>
                          {statusLabel(a.status)}
                        </p>
                        {a.status === 'pending' && (
                          <button
                            type="button"
                            className="mt-1 px-3 py-1 rounded-full text-[11px]"
                            style={{ background: 'rgba(0,212,255,0.2)', color: '#00D4FF' }}
                            onClick={() => openAssignModal(a)}
                          >
                            Assign worker
                          </button>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
            </MapContainer>
          </motion.div>
        </div>

        {/* Assign Worker Modal */}
        <AnimatePresence>
          {selectedAlert && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-40"
              onClick={() => { setSelectedAlert(null); setNearbyWorkers([]); }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="glass-card max-w-md w-full p-5 mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-rajdhani text-lg font-semibold">
                      Assign Worker
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      For SOS by {selectedAlert.userName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedAlert(null); setNearbyWorkers([]); }}
                    className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  Select the nearest available responder for this SOS alert.
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {nearbyWorkers.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">
                      No available workers found near this alert.
                    </p>
                  ) : (
                    nearbyWorkers.map((item) => (
                      <button
                        key={item.worker._id}
                        type="button"
                        onClick={() => assignWorker(item.worker._id)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/5 hover:bg-accentBlue/10 text-xs transition hover-lift"
                      >
                        <div>
                          <p className="font-semibold">{item.worker.name}</p>
                          <p className="text-gray-400">
                            {item.worker.area || item.worker.location.city} • {item.distance.toFixed(1)} km
                          </p>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-[10px] text-emerald-300 uppercase tracking-[0.16em] font-semibold">
                          Assign
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SOSManagement;
