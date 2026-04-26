import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, CircleMarker, Circle, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import useGeolocation from '../hooks/useGeolocation.js';
import axios from 'axios';

const ML_API_URL = import.meta.env.VITE_ML_API_URL || 'http://localhost:8000';

/* ─── Leaflet custom icon ────────────────────────────────────── */
const userIcon = new L.DivIcon({
  className: 'custom-user-marker',
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#00D4FF;border:3px solid #fff;box-shadow:0 0 14px rgba(0,212,255,0.7);"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

/* ─── Risk zone styling helpers ──────────────────────────────── */
const zoneConfig = {
  Green: {
    gradient: 'from-emerald-400 to-emerald-700',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/40',
    text: 'text-emerald-300',
    glow: '0 0 40px rgba(16,185,129,0.25)',
    icon: '✅',
    label: 'SAFE ZONE',
    mapColor: '#10b981',
  },
  Yellow: {
    gradient: 'from-yellow-400 to-amber-600',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/40',
    text: 'text-yellow-300',
    glow: '0 0 40px rgba(245,158,11,0.25)',
    icon: '⚠️',
    label: 'CAUTION ZONE',
    mapColor: '#f59e0b',
  },
  Red: {
    gradient: 'from-red-500 to-red-800',
    bg: 'bg-red-500/10',
    border: 'border-red-500/40',
    text: 'text-red-300',
    glow: '0 0 40px rgba(239,68,68,0.3)',
    icon: '🚨',
    label: 'DANGER ZONE',
    mapColor: '#ef4444',
  },
};

/* ─── Stat card sub-component ────────────────────────────────── */
const StatCard = ({ label, value, sub, icon }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="glass-card p-4 hover-lift group"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] text-gray-400 uppercase tracking-[0.18em] mb-1">{label}</p>
        <p className="font-rajdhani text-xl font-bold">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {icon && <span className="text-2xl opacity-60 group-hover:opacity-100 transition">{icon}</span>}
    </div>
  </motion.div>
);

/* ═══════════════════════════════════════════════════════════════ */
/*                      RISK PREDICTION PAGE                     */
/* ═══════════════════════════════════════════════════════════════ */
const RiskPrediction = () => {
  const { position, error: geoError, loading: geoLoading } = useGeolocation();
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usedCoords, setUsedCoords] = useState(null);
  const [gpsSynced, setGpsSynced] = useState(false);
  const [shouldAutoAnalyze, setShouldAutoAnalyze] = useState(false);

  // Sync GPS into inputs only once when first available
  useEffect(() => {
    if (position && !gpsSynced) {
      setLat(position.lat.toFixed(6));
      setLng(position.lng.toFixed(6));
      setGpsSynced(true);
      
      // Auto-trigger analysis for seamless UX
      setShouldAutoAnalyze(true);
    }
  }, [position, gpsSynced]);

  const handleAnalyze = useCallback(async () => {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    if (isNaN(latitude) || isNaN(longitude)) {
      setError('Please enter valid coordinates or allow GPS access.');
      return;
    }

    setLoading(true);
    setError(null);
    setPrediction(null);

    try {
      const res = await axios.post(`${ML_API_URL}/predict`, {
        latitude,
        longitude,
      }, { timeout: 25000 });
      setPrediction(res.data);
      setUsedCoords({ lat: latitude, lng: longitude });
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        setError('Request timed out. The ML server may still be starting up — please try again.');
      } else if (err.response) {
        setError(`Server error: ${err.response.data?.detail || err.response.statusText}`);
      } else {
        setError('Cannot reach ML server. Please ensure FastAPI is running on port 8000.');
      }
    } finally {
      setLoading(false);
    }
  }, [lat, lng]);

  // Handle auto-analysis after state has updated with coordinates
  useEffect(() => {
    if (shouldAutoAnalyze && lat && lng) {
      handleAnalyze();
      setShouldAutoAnalyze(false);
    }
  }, [shouldAutoAnalyze, lat, lng, handleAnalyze]);

  const useMyLocation = () => {
    if (position) {
      setLat(position.lat.toFixed(6));
      setLng(position.lng.toFixed(6));
    }
  };

  const zone = prediction?.risk_zone || 'Green';
  const cfg = zoneConfig[zone] || zoneConfig.Green;

  return (
    <div className="pt-4 pb-10">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        {/* ─── Header ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="font-rajdhani text-xs uppercase tracking-[0.26em] text-accentBlue">
            Hybrid ML + Rule-Based Engine
          </p>
          <h2 className="font-rajdhani text-3xl font-semibold mt-1">
            🛡️ AI <span className="gradient-text">Risk Radar</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1 max-w-lg">
            Analyze any location's real-time accident risk using weather, road infrastructure, and ML prediction models.
          </p>
        </motion.div>

        {/* ─── Input Controls ──────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-5"
        >
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 min-w-0">
              <label className="text-[10px] text-gray-400 uppercase tracking-[0.16em] block mb-1.5" htmlFor="input-lat">
                Latitude
              </label>
              <input
                id="input-lat"
                type="text"
                inputMode="decimal"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="e.g. 18.5204"
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-mono input-focus"
              />
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-[10px] text-gray-400 uppercase tracking-[0.16em] block mb-1.5" htmlFor="input-lng">
                Longitude
              </label>
              <input
                id="input-lng"
                type="text"
                inputMode="decimal"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="e.g. 73.8567"
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-mono input-focus"
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={useMyLocation}
                disabled={geoLoading || !!geoError}
                className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold uppercase tracking-[0.12em] hover:bg-white/10 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                📍 GPS
              </button>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-accentBlue to-blue-600 text-xs font-bold uppercase tracking-[0.16em] hover:shadow-lg hover:shadow-accentBlue/20 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Analyzing…
                  </span>
                ) : (
                  '🚀 Analyze'
                )}
              </button>
            </div>
          </div>

          {/* Error display */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
              >
                ⚠️ {error}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ─── Results ─────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {prediction ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
              {/* Risk Zone Hero Card */}
              <div
                className={`relative overflow-hidden rounded-2xl border ${cfg.border} p-6`}
                style={{ boxShadow: cfg.glow }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${cfg.gradient} opacity-10`} />
                <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
                <div className="relative flex flex-col sm:flex-row items-center gap-6">
                  {/* Gauge */}
                  <div className="relative h-32 w-32 rounded-full flex items-center justify-center shrink-0">
                    <div className={`absolute inset-0 rounded-full bg-gradient-to-tr ${cfg.gradient} opacity-50 animate-pulse`} />
                    <div className="absolute inset-2 rounded-full bg-background border border-white/10" />
                    <div className="relative z-10 text-center">
                      <p className="text-3xl">{cfg.icon}</p>
                      <p className={`text-xs font-bold mt-1 ${cfg.text}`}>{cfg.label}</p>
                    </div>
                  </div>
                  {/* Text */}
                  <div className="text-center sm:text-left">
                    <p className="text-[10px] text-gray-400 uppercase tracking-[0.22em]">AI Safety Assessment</p>
                    <h3 className={`font-rajdhani text-4xl font-black mt-1 ${cfg.text}`}>
                      {zone.toUpperCase()} ZONE
                    </h3>
                    <p className="text-gray-300 text-sm mt-1">
                      <span className="font-bold text-white">{(prediction.probability * 100).toFixed(1)}%</span>{' '}
                      AI Confidence
                    </p>
                  </div>
                </div>
              </div>

              {/* Grid: Map + Stats ─────────────────────────── */}
              <div className="grid md:grid-cols-[1.5fr_1fr] gap-5">
                {/* Map */}
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="glass-card overflow-hidden h-80 relative"
                >
                  {usedCoords && (
                    <MapContainer
                      center={[usedCoords.lat, usedCoords.lng]}
                      zoom={15}
                      scrollWheelZoom
                      className="w-full h-full"
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution="&copy; OpenStreetMap contributors"
                      />
                      {/* Risk zone circle */}
                      <Circle
                        center={[usedCoords.lat, usedCoords.lng]}
                        radius={500}
                        pathOptions={{
                          color: cfg.mapColor,
                          fillColor: cfg.mapColor,
                          fillOpacity: 0.15,
                          weight: 2,
                        }}
                      />
                      {/* User marker */}
                      <Marker position={[usedCoords.lat, usedCoords.lng]} icon={userIcon}>
                        <Popup>
                          <div className="text-xs font-semibold">
                            📍 Analyzed Location<br />
                            <span className="font-normal text-gray-500">
                              {usedCoords.lat.toFixed(4)}, {usedCoords.lng.toFixed(4)}
                            </span>
                          </div>
                        </Popup>
                      </Marker>
                    </MapContainer>
                  )}
                  {/* Zone label overlay */}
                  <div className="absolute top-3 right-3 z-[1000]">
                    <div className={`px-3 py-1.5 rounded-full ${cfg.bg} ${cfg.border} border backdrop-blur-md`}>
                      <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${cfg.text}`}>
                        {cfg.icon} {zone} Zone
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Stats Grid */}
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="grid grid-cols-2 gap-3 content-start"
                >
                  <StatCard
                    label="Weather"
                    value={prediction.weather}
                    sub={prediction.weather_description}
                    icon="🌤️"
                  />
                  <StatCard
                    label="Visibility"
                    value={`${prediction.visibility_km} km`}
                    icon="👁️"
                  />
                  <StatCard
                    label="Road Type"
                    value={String(prediction.road_type).charAt(0).toUpperCase() + String(prediction.road_type).slice(1)}
                    sub={`Surface: ${prediction.road_conditions}`}
                    icon="🛣️"
                  />
                  <StatCard
                    label="Speed Limit"
                    value={`${prediction.speed_limit} km/h`}
                    icon="⚡"
                  />
                  <StatCard
                    label="Local Time"
                    value={prediction.local_time_clock}
                    sub={prediction.time_period}
                    icon="🕐"
                  />
                  <StatCard
                    label="AI Confidence"
                    value={`${(prediction.probability * 100).toFixed(1)}%`}
                    sub="Hybrid ML Engine"
                    icon="🤖"
                  />
                </motion.div>
              </div>

              {/* How it works footer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="glass-card p-4"
              >
                <p className="text-[10px] text-gray-400 uppercase tracking-[0.16em] mb-2">How It Works</p>
                <div className="flex flex-wrap gap-3">
                  {[
                    { step: '1', text: 'Fetch real-time weather via OpenWeather API' },
                    { step: '2', text: 'Detect road type & speed limits via OpenStreetMap' },
                    { step: '3', text: 'Engineer features (time, weather risk, road condition)' },
                    { step: '4', text: 'Run hybrid ML model + rule-based safety engine' },
                  ].map((s) => (
                    <div key={s.step} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                      <span className="h-5 w-5 rounded-full bg-accentBlue/20 text-accentBlue text-[10px] font-bold flex items-center justify-center shrink-0">
                        {s.step}
                      </span>
                      <span className="text-[11px] text-gray-300">{s.text}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          ) : !loading && (
            <motion.div
              key="standby"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-dashed border-accentBlue/20 bg-accentBlue/[0.03] p-16 text-center"
            >
              <p className="text-4xl mb-3">🛡️</p>
              <h3 className="font-rajdhani text-xl font-semibold text-accentBlue">
                RADAR SYSTEM STANDBY
              </h3>
              <p className="text-xs text-gray-400 mt-2 max-w-sm mx-auto">
                Enter coordinates or allow GPS access, then click <strong>Analyze</strong> to
                scan the environment for accident risk factors.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RiskPrediction;
