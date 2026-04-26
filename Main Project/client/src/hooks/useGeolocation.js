import { useEffect, useState } from 'react';

export const useGeolocation = () => {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setError(new Error('Geolocation not supported'));
      setLoading(false);
      return;
    }
    const watcher = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 20000,
      }
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  return { position, error, loading };
};

export default useGeolocation;

