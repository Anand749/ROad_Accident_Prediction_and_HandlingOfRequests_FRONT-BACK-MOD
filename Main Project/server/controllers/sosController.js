import SOSAlert from '../models/SOSAlert.js';
import Worker from '../models/Worker.js';
import User from '../models/User.js';
import { getIO } from '../socket/socketHandler.js';
import { haversineDistance } from '../utils/geo.js';
import { sendNewSOSEmail, sendResolutionConfirmEmail } from '../utils/mailer.js';

export const triggerSOS = async (req, res, next) => {
  try {
    const {
      location, address, triggeredVia, complaint,
    } = req.body;

    if (!location?.lat || !location?.lng) {
      return res.status(400).json({ message: 'Location is required' });
    }

    const alert = await SOSAlert.create({
      userId: req.user._id,
      userName: req.user.name,
      userPhone: req.user.phone,
      location: {
        lat: location.lat,
        lng: location.lng,
        address,
      },
      complaint: complaint || '',
      triggeredVia: triggeredVia || 'button',
    });

    const io = getIO();
    io.emit('new-sos-alert', { alert });

    // Send email to admin (non-blocking)
    sendNewSOSEmail(alert).catch(() => { });

    return res.status(201).json(alert);
  } catch (err) {
    return next(err);
  }
};

export const getAllSOS = async (req, res, next) => {
  try {
    const alerts = await SOSAlert.find()
      .populate('assignedWorker')
      .sort({ createdAt: -1 });
    res.json(alerts);
  } catch (err) {
    next(err);
  }
};

export const getMyAlerts = async (req, res, next) => {
  try {
    const alerts = await SOSAlert.find({ userId: req.user._id })
      .populate('assignedWorker')
      .sort({ createdAt: -1 });
    res.json(alerts);
  } catch (err) {
    next(err);
  }
};

export const assignWorker = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { workerId } = req.body;

    const alert = await SOSAlert.findById(id);
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    alert.assignedWorker = worker._id;
    alert.status = 'assigned';
    await alert.save();

    worker.assignedAlerts.push(alert._id);
    await worker.save();

    const io = getIO();
    io.emit('sos-updated', {
      alertId: alert._id,
      status: alert.status,
      worker,
    });

    return res.json(await alert.populate('assignedWorker'));
  } catch (err) {
    return next(err);
  }
};

export const resolveSOS = async (req, res, next) => {
  try {
    const { id } = req.params;
    const alert = await SOSAlert.findById(id);
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    // 50-50 flow: admin marks as pending_confirmation, needs user to confirm
    alert.status = 'pending_confirmation';
    await alert.save();

    const io = getIO();
    io.emit('sos-resolve-request', {
      alertId: alert._id,
      userId: alert.userId,
      status: alert.status,
    });
    io.emit('sos-updated', {
      alertId: alert._id,
      status: alert.status,
    });

    // Send email to user for confirmation (non-blocking)
    const user = await User.findById(alert.userId);
    if (user?.email) {
      sendResolutionConfirmEmail(user.email, alert).catch(() => { });
    }

    return res.json(alert);
  } catch (err) {
    return next(err);
  }
};

export const workerResolveSOS = async (req, res, next) => {
  try {
    const { id } = req.params;
    const alert = await SOSAlert.findById(id);
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    // Verify this worker is assigned to this alert
    const worker = await Worker.findOne({ userId: req.user._id });
    if (!worker) {
      return res.status(404).json({ message: 'Worker profile not found' });
    }
    if (!alert.assignedWorker || alert.assignedWorker.toString() !== worker._id.toString()) {
      return res.status(403).json({ message: 'You can only resolve alerts assigned to you' });
    }

    alert.status = 'pending_confirmation';
    await alert.save();

    const io = getIO();
    io.emit('sos-resolve-request', {
      alertId: alert._id,
      userId: alert.userId,
      status: alert.status,
    });
    io.emit('sos-updated', {
      alertId: alert._id,
      status: alert.status,
    });

    // Send email to user for confirmation (non-blocking)
    const user = await User.findById(alert.userId);
    if (user?.email) {
      sendResolutionConfirmEmail(user.email, alert).catch(() => { });
    }

    return res.json(alert);
  } catch (err) {
    return next(err);
  }
};

export const userConfirmResolve = async (req, res, next) => {
  try {
    const { id } = req.params;
    const alert = await SOSAlert.findById(id);
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }
    if (alert.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only confirm your own alerts' });
    }
    if (alert.status !== 'pending_confirmation') {
      return res.status(400).json({ message: 'Alert is not pending confirmation' });
    }

    alert.status = 'resolved';
    await alert.save();

    const io = getIO();
    io.emit('sos-updated', {
      alertId: alert._id,
      status: 'resolved',
    });

    return res.json(alert);
  } catch (err) {
    return next(err);
  }
};

export const userDisputeResolve = async (req, res, next) => {
  try {
    const { id } = req.params;
    const alert = await SOSAlert.findById(id);
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }
    if (alert.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only dispute your own alerts' });
    }
    if (alert.status !== 'pending_confirmation') {
      return res.status(400).json({ message: 'Alert is not pending confirmation' });
    }

    alert.status = 'assigned';
    await alert.save();

    const io = getIO();
    io.emit('sos-updated', {
      alertId: alert._id,
      status: 'assigned',
    });

    return res.json(alert);
  } catch (err) {
    return next(err);
  }
};

export const getNearbyWorkersForSOS = async (req, res, next) => {
  try {
    const { id } = req.params;
    const alert = await SOSAlert.findById(id);
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }
    const workers = await Worker.find({ available: true });
    const withDistance = workers.map((w) => ({
      worker: w,
      distance: haversineDistance(
        alert.location.lat,
        alert.location.lng,
        w.location.lat,
        w.location.lng
      ),
    }));

    withDistance.sort((a, b) => a.distance - b.distance);

    res.json(withDistance.slice(0, 10));
  } catch (err) {
    next(err);
  }
};

export const getNearbySOSHistory = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return res.status(400).json({ message: 'lat and lng are required' });
    }

    const alerts = await SOSAlert.find({})
      .populate('assignedWorker')
      .sort({ createdAt: -1 });

    const nearby = alerts.filter((a) => {
      const dist = haversineDistance(
        latitude, longitude,
        a.location.lat, a.location.lng
      );
      return dist <= 15; // 15 km radius
    });

    return res.json(nearby.slice(0, 20));
  } catch (err) {
    return next(err);
  }
};
