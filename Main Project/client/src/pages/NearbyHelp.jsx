import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../utils/api.js';
import useGeolocation from '../hooks/useGeolocation.js';
import MapView from '../components/MapView.jsx';
import HospitalCard from '../components/HospitalCard.jsx';
import EmergencyContacts from '../components/EmergencyContacts.jsx';

const NearbyHelp = () => {
  const { position, error: geoError, loading: geoLoading } = useGeolocation();
  const [hospitals, setHospitals] = useState([]);

  useEffect(() => {
    const fetchNearby = async () => {
      if (!position) return;
      try {
        const res = await api.get('/hospitals/nearby', {
          params: { lat: position.lat, lng: position.lng },
        });
        setHospitals(res.data);
      } catch {
        // ignore, UI handles empty state
      }
    };
    fetchNearby();
  }, [position]);

  return (
    <div className="pt-4 pb-10">
      <div className="max-w-6xl mx-auto px-4 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div>
            <p className="font-rajdhani text-xs uppercase tracking-[0.26em] text-accentBlue">
              Nearby Emergency Support
            </p>
            <h2 className="font-rajdhani text-3xl font-semibold mt-1">
              Hospitals <span className="gradient-text">& Critical Lines</span>
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Instantly discover closest treatment centers and national emergency hotlines.
            </p>
          </div>
          {hospitals.length > 0 && (
            <div className="glass-card px-4 py-2 hover-lift">
              <p className="text-[10px] text-gray-400 uppercase tracking-[0.16em]">Found Nearby</p>
              <p className="font-rajdhani text-xl font-bold">{hospitals.length} Hospitals</p>
            </div>
          )}
        </div>

        {/* Map + Hospitals grid */}
        <div className="grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)] gap-5 items-start">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative"
          >
            {geoLoading || !position ? (
              <div className="glass-card h-80 flex flex-col items-center justify-center gap-3">
                <div className="h-10 w-10 rounded-full border-2 border-accentBlue border-t-transparent animate-spin" />
                <p className="text-xs text-gray-400">
                  Acquiring your position to locate hospitals…
                </p>
              </div>
            ) : geoError ? (
              <div className="glass-card h-80 flex flex-col items-center justify-center gap-2 text-center">
                <p className="font-rajdhani font-semibold text-red-400">
                  GPS Permission Required
                </p>
                <p className="text-xs text-gray-400 max-w-xs">
                  We could not access your location. Please enable location services to see
                  hospitals near you.
                </p>
              </div>
            ) : (
              <MapView center={position} accidents={[]} height="h-80" showUser />
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="space-y-3">
              <h3 className="font-rajdhani font-semibold tracking-[0.18em] uppercase text-xs text-gray-300">
                Nearest Hospitals
              </h3>
              <div className="max-h-80 overflow-y-auto pr-1 space-y-3">
                {hospitals.length === 0 ? (
                  <div className="glass-card px-4 py-6 text-center text-xs text-gray-400">
                    No hospitals found yet. As data grows, this will populate with real locations.
                  </div>
                ) : (
                  hospitals.map((item) => (
                    <HospitalCard
                      key={item.hospital._id}
                      hospital={{
                        ...item.hospital,
                        distance: item.distance,
                      }}
                    />
                  ))
                )}
              </div>
            </div>

            <EmergencyContacts />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default NearbyHelp;
