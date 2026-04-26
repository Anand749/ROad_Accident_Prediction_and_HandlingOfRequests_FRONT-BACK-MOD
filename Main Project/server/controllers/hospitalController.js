import Hospital from '../models/Hospital.js';
import { haversineDistance } from '../utils/geo.js';

export const getNearbyHospitals = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return res.status(400).json({ message: 'lat and lng are required' });
    }
    const hospitals = await Hospital.find();
    const withDistance = hospitals.map((h) => ({
      hospital: h,
      distance: haversineDistance(
        latitude,
        longitude,
        h.location.lat,
        h.location.lng
      ),
    }));
    withDistance.sort((a, b) => a.distance - b.distance);
    return res.json(withDistance);
  } catch (err) {
    return next(err);
  }
};

export const getByCity = async (req, res, next) => {
  try {
    const { city } = req.params;
    const hospitals = await Hospital.find({ city: new RegExp(`^${city}$`, 'i') });
    res.json(hospitals);
  } catch (err) {
    next(err);
  }
};

