import Accident from '../models/Accident.js';
import { haversineDistance } from '../utils/geo.js';

export const getAllAccidents = async (req, res, next) => {
  try {
    const accidents = await Accident.find().sort({ reportedAt: -1 });
    res.json(accidents);
  } catch (err) {
    next(err);
  }
};

export const getByCity = async (req, res, next) => {
  try {
    const { city } = req.params;
    const accidents = await Accident.find({ city: new RegExp(`^${city}$`, 'i') }).sort({ reportedAt: -1 });
    res.json(accidents);
  } catch (err) {
    next(err);
  }
};

export const getRisk = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return res.status(400).json({ message: 'lat and lng are required' });
    }

    const accidents = await Accident.find();
    const nearby = accidents.filter((acc) => {
      const dist = haversineDistance(
        latitude,
        longitude,
        acc.location.lat,
        acc.location.lng
      );
      return dist <= 10;
    });

    if (nearby.length === 0) {
      return res.json({ risk: 5 });
    }

    const avg = nearby.reduce((sum, a) => sum + a.accidentRate, 0) / nearby.length;
    const risk = Math.min(Math.round(avg), 100);
    return res.json({ risk });
  } catch (err) {
    return next(err);
  }
};

export const getNearbyAccidents = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return res.status(400).json({ message: 'lat and lng are required' });
    }

    const accidents = await Accident.find();
    const nearby = accidents
      .map((acc) => ({
        ...acc.toObject(),
        distance: haversineDistance(latitude, longitude, acc.location.lat, acc.location.lng),
      }))
      .filter((acc) => acc.distance <= 15) // 15 km radius
      .sort((a, b) => a.distance - b.distance);

    return res.json(nearby);
  } catch (err) {
    return next(err);
  }
};

export const createAccident = async (req, res, next) => {
  try {
    const accident = await Accident.create(req.body);
    res.status(201).json(accident);
  } catch (err) {
    next(err);
  }
};
