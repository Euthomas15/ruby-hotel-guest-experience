const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    rate: { type: Number, required: true, min: 0.01 },
    currency: { type: String, default: "NGN", uppercase: true },
    capacity: { type: Number, required: true, min: 1 },
    imageUrl: { type: String, default: "" },
    amenities: [{ type: String, trim: true }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Room || mongoose.model("Room", roomSchema);
