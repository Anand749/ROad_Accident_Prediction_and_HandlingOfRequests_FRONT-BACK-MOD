/* eslint-disable no-console */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Accident from '../models/Accident.js';
import Worker from '../models/Worker.js';
import Hospital from '../models/Hospital.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/accidentdb';

const run = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for seeding');

    await Promise.all([
      User.deleteMany({}),
      Accident.deleteMany({}),
      Worker.deleteMany({}),
      Hospital.deleteMany({}),
    ]);

    // ─── Admin ──────────────────────────────────────
    const admin = await User.create({
      name: 'Admin',
      email: 'admin@accident.com',
      password: 'admin123',
      phone: '9999999999',
      role: 'admin',
    });
    console.log('Admin:', admin.email, '/ admin123');

    // ─── Citizens ───────────────────────────────────
    const users = await User.insertMany([
      { name: 'Alice', email: 'alice@example.com', password: 'password123', phone: '8888888881' },
      { name: 'Bob', email: 'bob@example.com', password: 'password123', phone: '8888888882' },
      { name: 'Charlie', email: 'charlie@example.com', password: 'password123', phone: '8888888883' },
    ]);
    console.log('Seeded citizens:', users.length);

    // ─── Worker User Accounts ───────────────────────
    const workerUsers = [];
    const workerData = [
      { name: 'Rajesh Patil', email: 'rajesh@worker.com', phone: '7777777701', area: 'Shivajinagar, Pune', lat: 18.530, lng: 73.847 },
      { name: 'Amit Sharma', email: 'amit@worker.com', phone: '7777777702', area: 'Hadapsar, Pune', lat: 18.508, lng: 73.926 },
      { name: 'Suresh Kumar', email: 'suresh@worker.com', phone: '7777777703', area: 'Hinjewadi, Pune', lat: 18.591, lng: 73.739 },
      { name: 'Vikram Singh', email: 'vikram@worker.com', phone: '7777777704', area: 'Kothrud, Pune', lat: 18.507, lng: 73.807 },
      { name: 'Ganesh Jadhav', email: 'ganesh@worker.com', phone: '7777777705', area: 'Andheri, Mumbai', lat: 19.119, lng: 72.846 },
      { name: 'Ramesh Gupta', email: 'ramesh@worker.com', phone: '7777777706', area: 'Bandra, Mumbai', lat: 19.054, lng: 72.840 },
      { name: 'Nikhil Reddy', email: 'nikhil@worker.com', phone: '7777777707', area: 'Connaught Place, Delhi', lat: 28.631, lng: 77.219 },
      { name: 'Sanjay Rao', email: 'sanjay@worker.com', phone: '7777777708', area: 'Koramangala, Bengaluru', lat: 12.935, lng: 77.624 },
      { name: 'Prashant More', email: 'prashant@worker.com', phone: '7777777709', area: 'Pimpri, Pune', lat: 18.627, lng: 73.800, available: false },
      { name: 'Anil Joshi', email: 'anil@worker.com', phone: '7777777710', area: 'Baner, Pune', lat: 18.559, lng: 73.786, available: false },
    ];

    for (const wd of workerData) {
      const workerUser = await User.create({
        name: wd.name,
        email: wd.email,
        password: 'worker123',
        phone: wd.phone,
        role: 'worker',
      });
      workerUsers.push({ ...wd, userId: workerUser._id });
    }

    const workers = await Worker.insertMany(
      workerUsers.map((wd) => ({
        userId: wd.userId,
        name: wd.name,
        phone: wd.phone,
        email: wd.email,
        area: wd.area,
        location: { lat: wd.lat, lng: wd.lng, city: wd.area },
        available: wd.available !== false,
      }))
    );
    console.log('Seeded workers:', workers.length);
    console.log('Worker login: any @worker.com email / worker123');

    // ─── Accidents ──────────────────────────────────
    const cities = ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Pune'];
    const severities = ['low', 'medium', 'high'];
    const baseCoords = {
      Mumbai: { lat: 19.076, lng: 72.8777 },
      Delhi: { lat: 28.6139, lng: 77.209 },
      Bengaluru: { lat: 12.9716, lng: 77.5946 },
      Hyderabad: { lat: 17.385, lng: 78.4867 },
      Pune: { lat: 18.5204, lng: 73.8567 },
    };

    const accidentsPayload = [];

    for (let i = 0; i < 50; i += 1) {
      const city = cities[i % cities.length];
      const severity = severities[i % severities.length];
      const base = baseCoords[city];
      accidentsPayload.push({
        location: {
          lat: base.lat + (Math.random() - 0.5) * 0.08,
          lng: base.lng + (Math.random() - 0.5) * 0.08,
          address: `${city} Accident Spot ${i + 1}`,
        },
        city,
        severity,
        accidentRate: Math.min(100, Math.max(10, Math.round(Math.random() * 100))),
        reportedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        description: `Sample accident ${i + 1} in ${city}`,
        casualties: Math.floor(Math.random() * 5),
      });
    }

    // Pune hotspots
    const puneHotspots = [
      { name: 'Hadapsar Highway', lat: 18.5089, lng: 73.9259, severity: 'high', rate: 85 },
      { name: 'Sinhagad Road', lat: 18.4862, lng: 73.8312, severity: 'high', rate: 78 },
      { name: 'Pune-Mumbai Expressway', lat: 18.5793, lng: 73.7382, severity: 'high', rate: 92 },
      { name: 'Katraj Tunnel', lat: 18.4582, lng: 73.8553, severity: 'high', rate: 88 },
      { name: 'Hinjewadi Junction', lat: 18.5912, lng: 73.7390, severity: 'medium', rate: 55 },
      { name: 'Magarpatta Road', lat: 18.5136, lng: 73.9270, severity: 'medium', rate: 48 },
      { name: 'Shivajinagar', lat: 18.5308, lng: 73.8474, severity: 'medium', rate: 42 },
      { name: 'Kothrud', lat: 18.5074, lng: 73.8077, severity: 'low', rate: 22 },
      { name: 'Baner', lat: 18.5590, lng: 73.7868, severity: 'low', rate: 18 },
      { name: 'Viman Nagar', lat: 18.5679, lng: 73.9143, severity: 'medium', rate: 45 },
      { name: 'Wakad', lat: 18.5942, lng: 73.7610, severity: 'low', rate: 15 },
      { name: 'Pimpri Chinchwad', lat: 18.6279, lng: 73.8009, severity: 'high', rate: 75 },
      { name: 'Nigdi Flyover', lat: 18.6520, lng: 73.7700, severity: 'high', rate: 82 },
      { name: 'Deccan Gymkhana', lat: 18.5167, lng: 73.8413, severity: 'medium', rate: 38 },
      { name: 'Camp Area', lat: 18.5119, lng: 73.8803, severity: 'low', rate: 25 },
    ];

    for (const spot of puneHotspots) {
      accidentsPayload.push({
        location: {
          lat: spot.lat + (Math.random() - 0.5) * 0.005,
          lng: spot.lng + (Math.random() - 0.5) * 0.005,
          address: spot.name,
        },
        city: 'Pune',
        severity: spot.severity,
        accidentRate: spot.rate,
        reportedAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
        description: `Accident at ${spot.name}, Pune`,
        casualties: spot.severity === 'high' ? Math.floor(Math.random() * 4) + 1 : Math.floor(Math.random() * 2),
      });
    }

    await Accident.insertMany(accidentsPayload);
    console.log('Seeded accidents:', accidentsPayload.length);

    // ─── Hospitals ──────────────────────────────────
    await Hospital.insertMany([
      { name: 'Sassoon General Hospital', phone: '020-26128000', address: 'Sassoon Road, Pune', location: { lat: 18.527, lng: 73.871 }, city: 'Pune', emergencyAvailable: true, type: 'government' },
      { name: 'Ruby Hall Clinic', phone: '020-66455555', address: 'Sassoon Road, Pune', location: { lat: 18.529, lng: 73.875 }, city: 'Pune', emergencyAvailable: true, type: 'private' },
      { name: 'Jehangir Hospital', phone: '020-66815555', address: 'Sassoon Road, Pune', location: { lat: 18.531, lng: 73.877 }, city: 'Pune', emergencyAvailable: true, type: 'private' },
      { name: 'KEM Hospital', phone: '020-26060100', address: 'Sardar Moodliar Road, Pune', location: { lat: 18.503, lng: 73.863 }, city: 'Pune', emergencyAvailable: true, type: 'government' },
      { name: 'Deenanath Mangeshkar Hospital', phone: '020-40151000', address: 'Erandwane, Pune', location: { lat: 18.504, lng: 73.830 }, city: 'Pune', emergencyAvailable: true, type: 'private' },
      { name: 'City General Hospital', phone: '011-12345678', address: 'Central Road, Mumbai', location: { lat: 19.077, lng: 72.879 }, city: 'Mumbai', emergencyAvailable: true, type: 'government' },
      { name: 'Mumbai Care Hospital', phone: '022-98765432', address: 'Marine Drive, Mumbai', location: { lat: 19.08, lng: 72.86 }, city: 'Mumbai', emergencyAvailable: true, type: 'private' },
      { name: 'Delhi Trauma Center', phone: '011-99887766', address: 'Outer Ring Road, Delhi', location: { lat: 28.61, lng: 77.21 }, city: 'Delhi', emergencyAvailable: true, type: 'government' },
      { name: 'Bengaluru Life Care', phone: '080-12344321', address: 'MG Road, Bengaluru', location: { lat: 12.97, lng: 77.6 }, city: 'Bengaluru', emergencyAvailable: true, type: 'private' },
      { name: 'Hyderabad Emergency Center', phone: '040-11223344', address: 'Banjara Hills, Hyderabad', location: { lat: 17.39, lng: 78.48 }, city: 'Hyderabad', emergencyAvailable: true, type: 'government' },
    ]);
    console.log('Seeded hospitals: 10');

    console.log('\n═══════════════════════════════════');
    console.log('  SEEDING COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════');
    console.log('  Admin:  admin@accident.com / admin123');
    console.log('  Worker: rajesh@worker.com  / worker123');
    console.log('  User:   alice@example.com  / password123');
    console.log('═══════════════════════════════════\n');

    process.exit(0);
  } catch (err) {
    console.error('Seeding error', err);
    process.exit(1);
  }
};

run();
