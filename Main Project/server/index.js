import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';

import authRoutes from './routes/auth.js';
import accidentRoutes from './routes/accidents.js';
import sosRoutes from './routes/sos.js';
import workerRoutes from './routes/workers.js';
import hospitalRoutes from './routes/hospitals.js';
import { initSocket } from './socket/socketHandler.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Allow multiple client origins (local + deployed)
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((u) => u.trim());

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT'],
  },
});

initSocket(io);

// Middlewares
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Accident Detection API running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/accidents', accidentRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/hospitals', hospitalRoutes);

// Global error handler (simple)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/accidentdb';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error', err);
    process.exit(1);
  });
