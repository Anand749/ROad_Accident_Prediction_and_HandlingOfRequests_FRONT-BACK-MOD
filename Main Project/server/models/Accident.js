import mongoose from 'mongoose';

const accidentSchema = new mongoose.Schema(
  {
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String },
    },
    city: { type: String, required: true },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true,
    },
    accidentRate: { type: Number, required: true }, // 0-100
    reportedAt: { type: Date, default: Date.now },
    description: { type: String },
    casualties: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Accident = mongoose.model('Accident', accidentSchema);

export default Accident;

