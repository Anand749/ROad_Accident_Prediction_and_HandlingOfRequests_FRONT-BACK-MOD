import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { MapContainer, TileLayer, Circle, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import api from '../utils/api.js';
import useGeolocation from '../hooks/useGeolocation.js';
import SOSButton from '../components/SOSButton.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const ML_API_URL = import.meta.env.VITE_ML_API_URL || 'http://localhost:8000';

const userIcon = new L.DivIcon({
  className: 'custom-user-marker',
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#00D4FF;border:3px solid #fff;box-shadow:0 0 12px rgba(0,212,255,0.7);"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const complaintIcon = new L.DivIcon({
  className: 'complaint-marker',
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#FF2D55;border:2px solid #fff;box-shadow:0 0 10px rgba(255,45,85,0.8);"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const mlZone = {
  Green:  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', text: 'text-emerald-300', glow: '0 0 30px rgba(16,185,129,0.2)', icon: '✅', label: 'SAFE ZONE',   color: '#10b981', gradient: 'from-emerald-400 to-emerald-700' },
  Yellow: { bg: 'bg-yellow-500/10',  border: 'border-yellow-500/40',  text: 'text-yellow-300',  glow: '0 0 30px rgba(245,158,11,0.2)',  icon: '⚠️', label: 'CAUTION',    color: '#f59e0b', gradient: 'from-yellow-400 to-amber-600'  },
  Red:    { bg: 'bg-red-500/10',     border: 'border-red-500/40',     text: 'text-red-300',     glow: '0 0 30px rgba(239,68,68,0.25)',   icon: '🚨', label: 'DANGER ZONE',color: '#ef4444', gradient: 'from-red-500 to-red-800'     },
};

const riskLabel = (risk) => {
  if (risk >= 67) return 'HIGH RISK';
  if (risk >= 34) return 'MODERATE RISK';
  return 'LOW RISK';
};

const riskColor = (risk) => {
  if (risk >= 67) return 'text-accentRed';
  if (risk >= 34) return 'text-yellow-300';
  return 'text-emerald-300';
};

const riskGradient = (risk) => {
  if (risk >= 67) return 'from-accentRed to-red-700';
  if (risk >= 34) return 'from-yellow-400 to-amber-600';
  return 'from-emerald-400 to-emerald-700';
};

const UserDashboard = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { position, error: geoError, loading: geoLoading } = useGeolocation();
  const [risk, setRisk] = useState(null);
  const [accidents, setAccidents] = useState([]);
  const [pendingConfirmations, setPendingConfirmations] = useState([]);
  const [pastComplaints, setPastComplaints] = useState([]);
  const [activeTab, setActiveTab] = useState('map');

  // ── ML Risk Radar state ────────────────────────────────────
  const [mlLat, setMlLat] = useState('');
  const [mlLng, setMlLng] = useState('');
  const [mlPrediction, setMlPrediction] = useState(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlError, setMlError] = useState(null);
  const [mlSynced, setMlSynced] = useState(false);

  // Fetch risk + nearby accidents + user alerts + past complaints
  useEffect(() => {
    const fetchData = async () => {
      if (!position) return;
      try {
        const [riskRes, nearbyRes, myAlertsRes, historyRes] = await Promise.all([
          api.get('/accidents/risk', { params: { lat: position.lat, lng: position.lng } }),
          api.get('/accidents/nearby', { params: { lat: position.lat, lng: position.lng } }),
          api.get('/sos/my-alerts'),
          api.get('/sos/nearby-history', { params: { lat: position.lat, lng: position.lng } }),
        ]);
        setRisk(riskRes.data.risk);
        setAccidents(nearbyRes.data);
        setPendingConfirmations(myAlertsRes.data.filter((a) => a.status === 'pending_confirmation'));
        setPastComplaints(historyRes.data);
      } catch (err) {
        // silent fail, UI shows loading states
      }
    };
    fetchData();
  }, [position]);

  // Sync GPS into ML inputs once
  useEffect(() => {
    if (position && !mlSynced) {
      setMlLat(position.lat.toFixed(6));
      setMlLng(position.lng.toFixed(6));
      setMlSynced(true);
    }
  }, [position, mlSynced]);

  const handleMlAnalyze = useCallback(async () => {
    const latitude = parseFloat(mlLat);
    const longitude = parseFloat(mlLng);
    if (isNaN(latitude) || isNaN(longitude)) {
      setMlError('Enter valid coordinates or allow GPS access.');
      return;
    }
    setMlLoading(true);
    setMlError(null);
    setMlPrediction(null);
    try {
      const res = await axios.post(`${ML_API_URL}/predict`, { latitude, longitude }, { timeout: 25000 });
      setMlPrediction(res.data);
    } catch (err) {
      setMlError(err.code === 'ECONNABORTED' ? 'ML server timeout. Try again.' : 'Cannot reach ML server (port 8000).');
    } finally {
      setMlLoading(false);
    }
  }, [mlLat, mlLng]);

  // Listen for resolution requests via socket
  useEffect(() => {
    if (!socket || !user) return undefined;
    const handleResolveRequest = ({ alertId, userId }) => {
      if (userId === user._id || userId === user.id) {
        toast('Admin has marked your SOS as resolved. Please confirm!', { icon: '✅', duration: 8000 });
        // Refetch my alerts
        api.get('/sos/my-alerts').then((res) => {
          setPendingConfirmations(res.data.filter((a) => a.status === 'pending_confirmation'));
        }).catch(() => { });
      }
    };
    socket.on('sos-resolve-request', handleResolveRequest);
    return () => {
      socket.off('sos-resolve-request', handleResolveRequest);
    };
  }, [socket, user]);

  const confirmResolve = async (alertId) => {
    try {
      await api.patch(`/sos/${alertId}/confirm`);
      toast.success('Resolution confirmed! Thank you.');
      setPendingConfirmations((prev) => prev.filter((a) => a._id !== alertId));
    } catch {
      toast.error('Failed to confirm resolution');
    }
  };

  const disputeResolve = async (alertId) => {
    try {
      await api.patch(`/sos/${alertId}/dispute`);
      toast.success('Resolution disputed. Worker will be re-notified.');
      setPendingConfirmations((prev) => prev.filter((a) => a._id !== alertId));
    } catch {
      toast.error('Failed to dispute resolution');
    }
  };

  const now = useMemo(() => new Date(), []);

  return (
    <div className="pt-4 pb-10" style={{ background: 'radial-gradient(ellipse at 20% 0%, rgba(0,212,255,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(255,45,85,0.04) 0%, transparent 60%)' }}>
      <div className="max-w-7xl mx-auto px-4 space-y-6">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-rajdhani text-xs uppercase tracking-[0.3em] text-accentBlue flex items-center gap-2">
              <span className="h-px w-6 bg-accentBlue/50" />
              Stay Safe, Stay Aware
            </p>
            <h2 className="font-rajdhani text-3xl font-semibold mt-1">
              Citizen <span className="gradient-text">Safety Dashboard</span>
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Live accident risk, nearby incidents, past complaints and one-tap SOS access.
            </p>
          </div>
          <div className="glass-card px-4 py-3 text-right hover-lift">
            <p className="text-[11px] text-gray-400">Local time</p>
            <p className="font-rajdhani text-xl font-semibold">
              {now.toLocaleTimeString()}
            </p>
            <p className="text-[11px] text-gray-400">
              {now.toLocaleDateString(undefined, {
                weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
              })}
            </p>
          </div>
        </motion.div>

        {/* ── Pending Confirmations ── */}
        <AnimatePresence>
          {pendingConfirmations.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
              {pendingConfirmations.map((alert) => (
                <div key={alert._id} className="glass-card-red p-4 confirm-pulse border border-red-500/20 rounded-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-yellow-300">Resolution Pending</p>
                      </div>
                      <p className="text-xs text-gray-300">Admin marked SOS at <span className="font-semibold text-white">{alert.location?.address || `${alert.location?.lat?.toFixed(3)}, ${alert.location?.lng?.toFixed(3)}`}</span> as resolved.</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button type="button" onClick={() => confirmResolve(alert._id)} className="px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold uppercase tracking-[0.14em] hover:bg-emerald-500/30 transition border border-emerald-500/30">✓ Confirm</button>
                      <button type="button" onClick={() => disputeResolve(alert._id)} className="px-4 py-2 rounded-full bg-accentRed/20 text-accentRed text-xs font-semibold uppercase tracking-[0.14em] hover:bg-accentRed/30 transition border border-accentRed/30">✗ Dispute</button>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── 4 Stat Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Nearby Incidents', value: accidents.length,          icon: '🔴', grad: 'from-accentRed to-red-800',      glow: 'rgba(255,45,85,0.12)'   },
            { label: 'Past Complaints',  value: pastComplaints.length,      icon: '📋', grad: 'from-accentBlue to-blue-700',    glow: 'rgba(0,212,255,0.12)'   },
            { label: 'GPS Status',       value: geoLoading ? 'Acquiring…' : geoError ? 'Denied' : '✓ Active', icon: '📍', grad: 'from-emerald-400 to-emerald-700', glow: 'rgba(16,185,129,0.12)' },
            { label: 'Pending SOS',      value: pendingConfirmations.length || 'None', icon: '🚨', grad: 'from-amber-400 to-orange-600', glow: 'rgba(245,158,11,0.12)' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="glass-card px-4 py-3 hover-lift relative overflow-hidden border border-white/5 rounded-xl"
              style={{ boxShadow: `0 0 22px ${s.glow}` }}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-gray-500 uppercase tracking-[0.14em]">{s.label}</p>
                <span className="text-base">{s.icon}</span>
              </div>
              <p className="font-rajdhani text-2xl font-bold">{s.value}</p>
              <div className={`mt-2 h-0.5 rounded-full bg-gradient-to-r ${s.grad} opacity-50`} />
            </motion.div>
          ))}
        </div>

        {/* ── Two-Column: Map + AI Radar ── */}
        <div className="grid lg:grid-cols-2 gap-5">

          {/* Left — Live Map */}
          <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 }}
            className="glass-card overflow-hidden border border-white/5 rounded-2xl flex flex-col"
            style={{ minHeight: 460, boxShadow: '0 0 30px rgba(0,212,255,0.05)' }}>
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between shrink-0">
              <div>
                <p className="font-rajdhani font-bold text-base tracking-wide">📍 Live Incident Map</p>
                <p className="text-[10px] text-gray-500">Current location + database SOS complaints</p>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-gray-400">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-accentBlue shadow-lg shadow-accentBlue/40" />You</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-accentRed shadow-lg shadow-accentRed/40" />SOS</span>
              </div>
            </div>
            <div className="flex-1" style={{ minHeight: 400 }}>
              {geoLoading ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 p-8">
                  <div className="h-10 w-10 rounded-full border-2 border-accentBlue border-t-transparent animate-spin" />
                  <p className="text-xs text-gray-400">Acquiring GPS position…</p>
                </div>
              ) : geoError ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-center p-8">
                  <span className="text-3xl">📵</span>
                  <p className="text-sm font-semibold text-red-400">GPS Access Denied</p>
                  <p className="text-xs text-gray-500">Enable location in browser settings.</p>
                </div>
              ) : position ? (
                <div style={{ height: 410 }}>
                  <MapContainer center={[position.lat, position.lng]} zoom={13} scrollWheelZoom className="w-full h-full">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                    <Marker position={[position.lat, position.lng]} icon={userIcon}>
                      <Popup><div className="text-xs font-semibold">📍 Your Location<br /><span className="font-normal text-gray-500">{position.lat.toFixed(4)}, {position.lng.toFixed(4)}</span></div></Popup>
                    </Marker>
                    {pastComplaints.map((c) => c.location?.lat && c.location?.lng ? (
                      <Marker key={c._id} position={[c.location.lat, c.location.lng]} icon={complaintIcon}>
                        <Popup>
                          <div className="text-xs" style={{ minWidth: 150 }}>
                            <p className="font-bold text-red-500 mb-1">🚨 SOS Alert</p>
                            <p><span className="text-gray-500">By:</span> {c.userName}</p>
                            {c.complaint && <p className="mt-0.5"><span className="text-gray-500">Note:</span> {c.complaint}</p>}
                            <p><span className="text-gray-500">Status:</span> <span className="capitalize font-semibold">{c.status}</span></p>
                            <p className="text-gray-400 text-[10px] mt-1">{new Date(c.createdAt).toLocaleString()}</p>
                          </div>
                        </Popup>
                      </Marker>
                    ) : null)}
                  </MapContainer>
                </div>
              ) : null}
            </div>
          </motion.div>

          {/* Right — AI Risk Radar */}
          <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 }}
            className="rounded-2xl border border-accentBlue/20 p-5 space-y-4 flex flex-col"
            style={{ background: 'linear-gradient(135deg,rgba(0,212,255,0.04) 0%,rgba(0,10,30,0.7) 100%)', boxShadow: '0 0 40px rgba(0,212,255,0.07)', minHeight: 460 }}>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-accentBlue/15 border border-accentBlue/30 flex items-center justify-center text-2xl shrink-0">🛡️</div>
              <div>
                <p className="font-rajdhani text-xl font-bold">AI Risk Radar</p>
                <p className="text-[10px] text-gray-500">Hybrid ML + rule-based safety engine</p>
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-[0.14em] block mb-1.5">Latitude</label>
                  <input type="text" inputMode="decimal" value={mlLat} onChange={(e) => setMlLat(e.target.value)} placeholder="e.g. 18.5204"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono input-focus text-gray-100 placeholder-gray-600" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-[0.14em] block mb-1.5">Longitude</label>
                  <input type="text" inputMode="decimal" value={mlLng} onChange={(e) => setMlLng(e.target.value)} placeholder="e.g. 73.8567"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono input-focus text-gray-100 placeholder-gray-600" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button"
                  onClick={() => { if (position) { setMlLat(position.lat.toFixed(6)); setMlLng(position.lng.toFixed(6)); } }}
                  disabled={geoLoading || !!geoError}
                  className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold hover:bg-white/10 transition disabled:opacity-40 flex items-center gap-1.5">
                  📍 Use GPS
                </button>
                <button type="button" onClick={handleMlAnalyze} disabled={mlLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-accentBlue to-blue-600 text-xs font-bold uppercase tracking-[0.16em] hover:shadow-lg hover:shadow-accentBlue/30 transition disabled:opacity-60 flex items-center justify-center gap-2">
                  {mlLoading ? <><span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />Analyzing…</> : '🚀 Analyze Risk'}
                </button>
              </div>
            </div>

            {mlError && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                ⚠️ {mlError}
              </motion.p>
            )}

            {/* Standby */}
            {!mlPrediction && !mlLoading && !mlError && (
              <div className="flex-1 flex flex-col items-center justify-center py-8 rounded-xl border border-dashed border-accentBlue/15 bg-accentBlue/[0.02]">
                <span className="text-5xl mb-3">🛰️</span>
                <p className="font-rajdhani text-lg font-semibold text-accentBlue/60">RADAR STANDBY</p>
                <p className="text-[11px] text-gray-600 mt-1 text-center max-w-[200px]">Enter coordinates or use GPS, then hit Analyze</p>
              </div>
            )}

            {/* Result */}
            {mlPrediction && (() => {
              const zone = mlPrediction.risk_zone || 'Green';
              const cfg = mlZone[zone] || mlZone.Green;
              return (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl border ${cfg.border} overflow-hidden flex-1`}
                  style={{ boxShadow: cfg.glow }}>
                  <div className="relative p-4 overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-br ${cfg.gradient} opacity-10`} />
                    <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/5 blur-2xl" />
                    <div className="relative flex items-center gap-4 mb-3">
                      <div className="relative h-16 w-16 rounded-full shrink-0 flex items-center justify-center">
                        <div className={`absolute inset-0 rounded-full bg-gradient-to-tr ${cfg.gradient} opacity-40 animate-pulse`} />
                        <div className="absolute inset-1.5 rounded-full bg-background border border-white/10" />
                        <span className="relative z-10 text-2xl">{cfg.icon}</span>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-[0.16em]">AI Assessment</p>
                        <p className={`font-rajdhani text-2xl font-black ${cfg.text}`}>{zone.toUpperCase()} ZONE</p>
                        <p className="text-xs text-gray-300"><span className="font-bold text-white">{(mlPrediction.probability * 100).toFixed(1)}%</span> confidence</p>
                      </div>
                    </div>
                    <div className="relative grid grid-cols-3 gap-2">
                      {[
                        { icon: '🌤️', label: 'Weather',    val: mlPrediction.weather },
                        { icon: '👁️', label: 'Visibility', val: mlPrediction.visibility_km ? `${mlPrediction.visibility_km}km` : null },
                        { icon: '⚡',  label: 'Speed Lmt', val: mlPrediction.speed_limit ? `${mlPrediction.speed_limit}km/h` : null },
                        { icon: '🛣️', label: 'Road',      val: mlPrediction.road_type },
                        { icon: '🕐', label: 'Period',    val: mlPrediction.time_period },
                        { icon: '🤖', label: 'Engine',    val: 'Hybrid ML' },
                      ].filter(s => s.val).map(s => (
                        <div key={s.label} className="bg-white/5 rounded-lg px-2 py-1.5 text-center border border-white/5">
                          <p className="text-lg">{s.icon}</p>
                          <p className="text-[9px] text-gray-500 uppercase tracking-wide">{s.label}</p>
                          <p className="text-[10px] font-semibold text-gray-200 truncate mt-0.5">{s.val}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {mlLat && mlLng && (
                    <div style={{ height: 140 }}>
                      <MapContainer center={[parseFloat(mlLat), parseFloat(mlLng)]} zoom={14} scrollWheelZoom={false} className="w-full h-full" zoomControl={false}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Circle center={[parseFloat(mlLat), parseFloat(mlLng)]} radius={400} pathOptions={{ color: cfg.color, fillColor: cfg.color, fillOpacity: 0.18, weight: 2 }} />
                        <Marker position={[parseFloat(mlLat), parseFloat(mlLng)]} icon={userIcon}><Popup><span className="text-xs">📍 Analyzed</span></Popup></Marker>
                      </MapContainer>
                    </div>
                  )}
                </motion.div>
              );
            })()}
          </motion.div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-2">
          {[
            { key: 'map',  label: '📊 Area Insights',   count: accidents.length        },
            { key: 'past', label: '📋 Past Complaints',  count: pastComplaints.length   },
          ].map((tab) => (
            <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.16em] transition flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-accentBlue/15 text-accentBlue border border-accentBlue/40 shadow-lg shadow-accentBlue/10'
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'}`}>
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${activeTab === tab.key ? 'bg-accentBlue/20' : 'bg-white/10'}`}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <AnimatePresence mode="wait">
          {activeTab === 'past' && (
            <motion.div key="past" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="glass-card overflow-hidden border border-white/5 rounded-2xl">
              <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-accentRed animate-pulse" />
                <h3 className="font-rajdhani font-bold text-sm tracking-wide">Past SOS Complaints · 15km radius</h3>
              </div>
              {pastComplaints.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <span className="text-4xl">🎉</span>
                  <p className="text-sm font-semibold text-emerald-400 mt-2">No incidents found nearby</p>
                  <p className="text-xs text-gray-500 mt-1">Your area looks safe!</p>
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  <table className="min-w-full data-table">
                    <thead className="bg-white/5 sticky top-0">
                      <tr>
                        {['User', 'Location', 'Complaint', 'Time', 'Status'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-[10px] uppercase tracking-[0.14em] text-gray-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pastComplaints.map((c) => (
                        <tr key={c._id} className="border-t border-white/5 hover:bg-white/[0.03] transition">
                          <td className="px-4 py-3"><p className="font-semibold text-sm">{c.userName}</p><p className="text-[11px] text-gray-500">{c.userPhone}</p></td>
                          <td className="px-4 py-3 text-gray-300 text-xs">{c.location?.address || `${c.location?.lat?.toFixed(3)}, ${c.location?.lng?.toFixed(3)}`}</td>
                          <td className="px-4 py-3 max-w-[160px]">{c.complaint ? <span className="text-[11px] text-gray-300">{c.complaint}</span> : <span className="text-[11px] text-gray-600 italic">—</span>}</td>
                          <td className="px-4 py-3 text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString()}<br /><span className="text-[10px] text-gray-600">{new Date(c.createdAt).toLocaleTimeString()}</span></td>
                          <td className="px-4 py-3"><span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] uppercase tracking-[0.14em] border border-emerald-500/20">{c.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'map' && (
            <motion.div key="map-insights" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {accidents.length === 0 ? (
                <div className="glass-card px-4 py-12 text-center border border-white/5 rounded-2xl">
                  <span className="text-4xl">✅</span>
                  <p className="text-sm font-semibold text-emerald-400 mt-2">No nearby accidents found</p>
                  <p className="text-xs text-gray-500 mt-1">Your area appears safe!</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {accidents.slice(0, 6).map((a, i) => {
                    const sc = a.severity === 'high' ? '#FF2D55' : a.severity === 'medium' ? '#FFD60A' : '#30D158';
                    return (
                      <motion.div key={a._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                        className="glass-card p-4 hover-lift border border-white/5 rounded-xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg,${sc}70,transparent)` }} />
                        <div className="flex items-center gap-2 mb-3">
                          <span className="h-3 w-3 rounded-full shrink-0" style={{ background: sc, boxShadow: `0 0 8px ${sc}60` }} />
                          <p className="font-rajdhani font-bold text-sm truncate">{a.location?.address || a.city}</p>
                        </div>
                        <div className="space-y-1.5 text-[11px]">
                          <div className="flex justify-between"><span className="text-gray-500">Severity</span><span className="font-bold uppercase" style={{ color: sc }}>{a.severity}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Accident Rate</span><span className="font-bold text-white">{a.accidentRate}%</span></div>
                          {a.distance != null && <div className="flex justify-between"><span className="text-gray-500">Distance</span><span className="font-bold text-accentBlue">{a.distance.toFixed(1)} km</span></div>}
                          {a.casualties > 0 && <div className="flex justify-between"><span className="text-gray-500">Casualties</span><span className="font-bold text-accentRed">{a.casualties}</span></div>}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <SOSButton />
    </div>
  );
};

export default UserDashboard;
