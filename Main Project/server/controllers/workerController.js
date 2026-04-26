import Worker from '../models/Worker.js';
import User from '../models/User.js';
import { haversineDistance } from '../utils/geo.js';
import { geocodeArea } from '../utils/geocode.js';

export const getAllWorkers = async (req, res, next) => {
  try {
    const workers = await Worker.find().sort({ createdAt: -1 });
    res.json(workers);
  } catch (err) {
    next(err);
  }
};

export const getNearbyWorkers = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return res.status(400).json({ message: 'lat and lng are required' });
    }
    const workers = await Worker.find({ available: true });
    const withDistance = workers.map((w) => ({
      worker: w,
      distance: haversineDistance(
        latitude,
        longitude,
        w.location.lat,
        w.location.lng
      ),
    }));
    withDistance.sort((a, b) => a.distance - b.distance);
    return res.json(withDistance.slice(0, 10));
  } catch (err) {
    return next(err);
  }
};

export const createWorker = async (req, res, next) => {
  try {
    const { name, phone, area, email, password } = req.body;

    if (!name || !phone || !area) {
      return res.status(400).json({ message: 'name, phone and area are required' });
    }

    // Geocode the area name to get coordinates
    const geo = await geocodeArea(area);

    // Create a User account for the worker so they can log in
    let userId = null;
    if (email && password) {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({ message: 'Email already in use. Choose a different email.' });
      }
      const workerUser = await User.create({
        name,
        email,
        password,
        phone,
        role: 'worker',
      });
      userId = workerUser._id;
    }

    const worker = await Worker.create({
      userId,
      name,
      phone,
      email,
      area,
      location: {
        lat: geo.lat,
        lng: geo.lng,
        city: area,
      },
      available: true,
    });

    return res.status(201).json(worker);
  } catch (err) {
    if (err.message?.includes('Could not geocode')) {
      return res.status(400).json({ message: err.message });
    }
    return next(err);
  }
};

export const updateWorker = async (req, res, next) => {
  try {
    const { id } = req.params;
    const worker = await Worker.findByIdAndUpdate(id, req.body, { new: true });
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }
    return res.json(worker);
  } catch (err) {
    return next(err);
  }
};

export const getMyWorkerProfile = async (req, res, next) => {
  try {
    const worker = await Worker.findOne({ userId: req.user._id }).populate('assignedAlerts');
    if (!worker) {
      return res.status(404).json({ message: 'Worker profile not found' });
    }
    return res.json(worker);
  } catch (err) {
    return next(err);
  }
};

export const getMyAssignedAlerts = async (req, res, next) => {
  try {
    const worker = await Worker.findOne({ userId: req.user._id });
    if (!worker) {
      return res.status(404).json({ message: 'Worker profile not found' });
    }

    // Import SOSAlert inline to avoid circular deps
    const { default: SOSAlert } = await import('../models/SOSAlert.js');
    const alerts = await SOSAlert.find({ assignedWorker: worker._id })
      .sort({ createdAt: -1 });

    return res.json(alerts);
  } catch (err) {
    return next(err);
  }
};
