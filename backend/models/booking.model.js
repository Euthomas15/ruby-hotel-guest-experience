const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    reference: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    guest: {
      fullName: { type: String, required: true, trim: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      phoneNumber: { type: String, required: true, trim: true },
    },
    room: {
      roomId: { type: String, required: true },
      slug: { type: String, required: true },
      name: { type: String, required: true },
      rate: { type: Number, required: true, min: 0 },
      imageUrl: { type: String, default: "" },
    },
    stay: {
      checkIn: { type: Date, required: true },
      checkOut: { type: Date, required: true },
      nights: { type: Number, required: true, min: 1 },
      guestCount: { type: Number, required: true, min: 1 },
      roomCount: { type: Number, required: true, min: 1, default: 1 },
    },
    subtotal: { type: Number, required: true, min: 0 },
    vatRate: { type: Number, required: true, min: 0 },
    vatAmount: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "NGN" },
    paymentStatus: {
      type: String,
      enum: ["pending", "verifying", "verified", "failed"],
      default: "pending",
    },
    bookingStatus: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
    },
    preArrival: {
      arrivalTime: { type: String, default: "" },
      specialRequests: { type: String, default: "" },
      contactNumber: { type: String, default: "" },
      status: {
        type: String,
        enum: ["not_submitted", "submitted", "approved", "rejected"],
        default: "not_submitted",
      },
      reviewedAt: { type: Date, default: null },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      statusHistory: [
        {
          from: {
            type: String,
            enum: ["not_submitted", "submitted", "approved", "rejected"],
            required: true,
          },
          to: {
            type: String,
            enum: ["not_submitted", "submitted", "approved", "rejected"],
            required: true,
          },
          actorType: {
            type: String,
            enum: ["guest", "staff", "admin"],
            required: true,
          },
          actorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
          },
          changedAt: { type: Date, default: Date.now },
        },
      ],
    },
    preferences: {
      category: {
        type: String,
        enum: ["quiet_stay", "explore_abuja", "fitness_wellness"],
        default: null,
      },
      updatedAt: { type: Date, default: null },
    },
    roomAccess: {
      status: {
        type: String,
        enum: ["awaiting_approval", "available"],
        default: "awaiting_approval",
      },
      approvedAt: { type: Date, default: null },
    },
  },
  { timestamps: true, optimisticConcurrency: true }
);

module.exports =
  mongoose.models.Booking || mongoose.model("Booking", bookingSchema);
