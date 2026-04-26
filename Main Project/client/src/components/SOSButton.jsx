import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import useGeolocation from '../hooks/useGeolocation.js';
import useVoiceCommand from '../hooks/useVoiceCommand.js';
import api from '../utils/api.js';
import toast from 'react-hot-toast';

const SOSButton = () => {
  const { user } = useAuth();
  const { position, error: geoError } = useGeolocation();
  const [modalOpen, setModalOpen] = useState(false);
  const [complaint, setComplaint] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Core send function — used by both button modal and voice command
  const sendSOS = useCallback(
    async (via = 'button', complaintText = '') => {
      if (!user) return;
      if (geoError || !position) {
        toast.error('Location not available. Please enable GPS.');
        return;
      }
      setSubmitting(true);
      try {
        await api.post('/sos/trigger', {
          location: position,
          triggeredVia: via,
          complaint: complaintText.trim(),
        });
        toast.success('🚨 SOS Alert Sent! Help is on the way.');
        setModalOpen(false);
        setComplaint('');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to send SOS');
      } finally {
        setSubmitting(false);
      }
    },
    [geoError, position, user]
  );

  // Voice command handler — skips modal, sends immediately
  const triggerVoiceSOS = useCallback(() => sendSOS('voice', ''), [sendSOS]);
  const { listening, lastTranscript } = useVoiceCommand(triggerVoiceSOS);

  const handleModalSubmit = () => sendSOS('button', complaint);

  if (!user) return null;

  return (
    <>
      {/* ─── SOS Button ───────────────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-40">
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          className="sos-pulse relative h-20 w-20 rounded-full bg-gradient-to-br from-accentRed to-red-700 flex items-center justify-center border-4 border-red-400/90 text-lg font-rajdhani font-semibold tracking-[0.3em] text-white uppercase"
          onClick={() => setModalOpen(true)}
        >
          SOS
          <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-accentBlue flex items-center justify-center text-[9px] font-semibold">
            !
          </span>
        </motion.button>
      </div>

      {/* ─── Voice Listener Indicator ─────────────────────────────── */}
      <div className="fixed bottom-6 left-6 z-40 flex flex-col gap-2 items-start">
        <div className="glass-card px-3 py-2 flex items-center gap-2 text-xs text-gray-200">
          <div
            className={`h-7 w-7 rounded-full flex items-center justify-center border border-accentBlue/60 bg-surface/80 ${
              listening ? 'mic-pulse' : ''
            }`}
          >
            <span className="material-icons text-[16px]">mic</span>
          </div>
          <div>
            <p className="font-semibold tracking-wide text-[10px] uppercase text-accentBlue">
              Voice Listener
            </p>
            <p className="text-[11px] text-gray-300">
              Say &quot;sos&quot;, &quot;help me&quot; or &quot;emergency&quot;
            </p>
          </div>
        </div>
        {lastTranscript && (
          <div className="glass-card px-3 py-1 text-[11px] text-gray-300 max-w-xs">
            <span className="text-accentBlue/80 mr-1">Heard:</span>
            {lastTranscript}
          </div>
        )}
      </div>

      {/* ─── SOS Complaint Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => !submitting && setModalOpen(false)}
            />

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              className="relative z-10 w-full max-w-md glass-card p-6 border border-accentRed/40 rounded-2xl"
              style={{ boxShadow: '0 0 60px rgba(255,45,85,0.25)' }}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-accentRed/20 border border-accentRed/50 flex items-center justify-center text-xl shrink-0 sos-pulse">
                  🚨
                </div>
                <div>
                  <h3 className="font-rajdhani text-xl font-bold tracking-wide">
                    Send SOS Alert
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Your location will be shared with emergency responders
                  </p>
                </div>
              </div>

              {/* GPS status */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-4 text-xs font-semibold ${
                position && !geoError
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/10 border border-red-500/30 text-red-400'
              }`}>
                <span>{position && !geoError ? '📍' : '⚠️'}</span>
                {position && !geoError
                  ? `GPS Active: ${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`
                  : 'GPS not available — enable location access'}
              </div>

              {/* Complaint input */}
              <div className="mb-4">
                <label
                  htmlFor="sos-complaint"
                  className="block text-[10px] text-gray-400 uppercase tracking-[0.16em] mb-1.5"
                >
                  Describe the emergency <span className="text-gray-500 normal-case">(optional)</span>
                </label>
                <textarea
                  id="sos-complaint"
                  rows={3}
                  value={complaint}
                  onChange={(e) => setComplaint(e.target.value)}
                  placeholder="e.g. Road accident near highway junction, 2 vehicles involved..."
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm resize-none input-focus placeholder-gray-600 text-gray-100"
                  disabled={submitting}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => !submitting && setModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold uppercase tracking-[0.14em] hover:bg-white/10 transition disabled:opacity-40"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleModalSubmit}
                  disabled={submitting || (!position && !geoError)}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-accentRed to-red-700 text-xs font-bold uppercase tracking-[0.16em] hover:shadow-lg hover:shadow-red-500/20 transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Sending…
                    </>
                  ) : (
                    '🚨 Confirm SOS'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SOSButton;
