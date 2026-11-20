const mongoose = require("mongoose");

const serviceRequestSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    bookingReference: { type: String, required: true, uppercase: true },
    category: {
      type: String,
      required: true,
      enum: ["extra_towels", "room_cleaning", "airport_pickup", "food_and_drinks"],
    },
    details: { type: String, default: "", trim: true, maxlength: 1000 },
    status: {
      type: String,
      enum: ["requested", "in_progress", "completed", "cancelled"],
      default: "requested",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    statusHistory: [
      {
        from: {
          type: String,
          enum: ["requested", "in_progress", "completed", "cancelled"],
          default: undefined,
        },
        to: {
          type: String,
          enum: ["requested", "in_progress", "completed", "cancelled"],
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
  { timestamps: true, optimisticConcurrency: true }
);

module.exports =
  mongoose.models.ServiceRequest ||
  mongoose.model("ServiceRequest", serviceRequestSchema);
