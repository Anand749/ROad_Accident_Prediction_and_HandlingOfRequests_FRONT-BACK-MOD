import mongoose from 'mongoose';

const hospitalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    city: { type: String, required: true },
    emergencyAvailable: { type: Boolean, default: true },
    type: {
      type: String,
      enum: ['government', 'private'],
      required: true,
    },
  },
  { timestamps: true }
);

const Hospital = mongoose.model('Hospital', hospitalSchema);

export default Hospital;

