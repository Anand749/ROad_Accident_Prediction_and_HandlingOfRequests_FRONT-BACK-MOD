import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import api from '../utils/api.js';
import WorkerCard from '../components/WorkerCard.jsx';

const WorkerManagement = () => {
  const [workers, setWorkers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    area: '',
    email: '',
    password: '',
  });

  const loadWorkers = async () => {
    try {
      const res = await api.get('/workers');
      setWorkers(res.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadWorkers();
  }, []);

  const toggleAvailability = async (worker) => {
    try {
      await api.patch(`/workers/${worker._id}`, {
        available: !worker.available,
      });
      loadWorkers();
    } catch {
      toast.error('Failed to update worker');
    }
  };

  const handleAddWorker = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/workers', {
        name: form.name,
        phone: form.phone,
        area: form.area,
        email: form.email || undefined,
        password: form.password || undefined,
      });
      toast.success('Worker added! Login credentials created.');
      setModalOpen(false);
      setForm({ name: '', phone: '', area: '', email: '', password: '' });
      loadWorkers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add worker');
    } finally {
      setLoading(false);
    }
  };

  const center = workers[0]?.location || { lat: 19.076, lng: 72.8777 };

  return (
    <div className="pt-4 pb-10">
      <div className="max-w-6xl mx-auto px-4 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div>
            <p className="font-rajdhani text-xs uppercase tracking-[0.26em] text-accentBlue">
              Response Force Management
            </p>
            <h2 className="font-rajdhani text-3xl font-semibold mt-1">
              Field Workers <span className="gradient-text">& Locations</span>
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              {workers.length} workers registered • {workers.filter((w) => w.available).length} available
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-accentBlue/20 to-accentBlue/10 text-xs font-semibold tracking-[0.18em] uppercase text-accentBlue border border-accentBlue/30 hover:border-accentBlue/60 transition hover-lift"
          >
            + Add Worker
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-card px-4 py-3 hover-lift">
            <p className="text-[10px] text-gray-400 uppercase tracking-[0.16em]">Total Workers</p>
            <p className="font-rajdhani text-2xl font-bold mt-1">{workers.length}</p>
          </div>
          <div className="glass-card px-4 py-3 hover-lift">
            <p className="text-[10px] text-gray-400 uppercase tracking-[0.16em]">Available</p>
            <p className="font-rajdhani text-2xl font-bold mt-1 text-emerald-400">
              {workers.filter((w) => w.available).length}
            </p>
          </div>
          <div className="glass-card px-4 py-3 hover-lift">
            <p className="text-[10px] text-gray-400 uppercase tracking-[0.16em]">Busy</p>
            <p className="font-rajdhani text-2xl font-bold mt-1 text-yellow-400">
              {workers.filter((w) => !w.available).length}
            </p>
          </div>
        </div>

        {/* Workers + Map grid */}
        <div className="grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.7fr)] gap-5">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-3 max-h-[420px] overflow-y-auto pr-1"
          >
            {workers.map((w) => (
              <WorkerCard key={w._id} worker={w} onToggle={toggleAvailability} />
            ))}
            {workers.length === 0 && (
              <div className="glass-card px-4 py-6 text-center">
                <p className="text-xs text-gray-400">
                  No workers found yet. Use "Add Worker" to onboard responders.
                </p>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card overflow-hidden h-[420px]"
          >
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
              {workers.map((w) => (
                <Marker
                  key={w._id}
                  position={[w.location.lat, w.location.lng]}
                >
                  <Popup>
                    <div className="text-xs space-y-1">
                      <p className="font-semibold">{w.name}</p>
                      <p className="text-gray-300">{w.area || w.location.city}</p>
                      <p className="text-[11px] text-gray-400">
                        {w.available ? '✓ Available' : '◆ Busy'}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </motion.div>
        </div>

        {/* Add Worker Modal */}
        <AnimatePresence>
          {modalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-40"
              onClick={() => setModalOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="glass-card max-w-md w-full p-6 mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-rajdhani text-lg font-semibold">
                      Add New Worker
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Enter details — coordinates & login are auto-created
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition"
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleAddWorker} className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block mb-1.5 text-gray-300 font-medium">Name</label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 input-focus text-sm"
                        placeholder="Worker name"
                      />
                    </div>
                    <div>
                      <label className="block mb-1.5 text-gray-300 font-medium">Phone</label>
                      <input
                        type="tel"
                        required
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 input-focus text-sm"
                        placeholder="+91 9876543210"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1.5 text-gray-300 font-medium">
                      Area / Locality
                    </label>
                    <input
                      type="text"
                      required
                      value={form.area}
                      onChange={(e) => setForm({ ...form, area: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 input-focus text-sm"
                      placeholder="e.g. Bandra West, Mumbai"
                    />
                    <p className="mt-1 text-[10px] text-gray-500">
                      📍 Latitude & longitude will be auto-resolved from the area name
                    </p>
                  </div>

                  {/* Worker Login Credentials */}
                  <div className="pt-2 border-t border-white/10">
                    <p className="text-[11px] text-accentBlue font-semibold uppercase tracking-[0.16em] mb-3">
                      🔐 Login Credentials (for worker to log in)
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block mb-1.5 text-gray-300 font-medium">Email</label>
                        <input
                          type="email"
                          required
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 input-focus text-sm"
                          placeholder="worker@email.com"
                        />
                      </div>
                      <div>
                        <label className="block mb-1.5 text-gray-300 font-medium">Password</label>
                        <input
                          type="password"
                          required
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 input-focus text-sm"
                          placeholder="••••••"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-2.5 rounded-lg bg-gradient-to-r from-accentRed to-accentBlue text-xs font-semibold tracking-[0.18em] uppercase shadow-glow-red disabled:opacity-50 transition hover:opacity-90"
                  >
                    {loading ? 'Geocoding & Saving…' : 'Create Worker & Login'}
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default WorkerManagement;
