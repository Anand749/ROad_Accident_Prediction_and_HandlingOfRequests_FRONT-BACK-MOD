import mongoose from 'mongoose';

const workerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    area: { type: String, required: true },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      city: { type: String, required: true },
    },
    available: { type: Boolean, default: true },
    assignedAlerts: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'SOSAlert' },
    ],
  },
  { timestamps: true }
);

const Worker = mongoose.model('Worker', workerSchema);

export default Worker;
