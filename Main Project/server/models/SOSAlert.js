import mongoose from 'mongoose';

const sosAlertSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    userPhone: { type: String, required: true },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String },
    },
    status: {
      type: String,
      enum: ['pending', 'assigned', 'pending_confirmation', 'resolved'],
      default: 'pending',
    },
    assignedWorker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker',
    },
    complaint: {
      type: String,
      default: '',
      trim: true,
    },
    triggeredVia: {
      type: String,
      enum: ['button', 'voice'],
      default: 'button',
    },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

const SOSAlert = mongoose.model('SOSAlert', sosAlertSchema);

export default SOSAlert;
