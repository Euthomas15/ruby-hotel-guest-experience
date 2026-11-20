const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const connectDB = require("../configs/db");
const Room = require("../models/room.model");

const rooms = [
  {
    slug: "standard",
    name: "Standard room",
    description:
      "A calm, comfortable room for an easy city stay. Your stay includes Wi-Fi, air conditioning and access to the gym.",
    rate: 65000,
    currency: "NGN",
    capacity: 2,
    imageUrl: "",
    amenities: ["Queen bed", "2 guests", "Wi-Fi", "Air conditioning", "Gym access"],
    active: true,
  },
  {
    slug: "deluxe",
    name: "Deluxe room",
    description: "A restful retreat with a king bed and warm interiors.",
    rate: 90000,
    currency: "NGN",
    capacity: 2,
    imageUrl: "",
    amenities: ["King bed", "2 guests", "32 m²"],
    active: true,
  },
  {
    slug: "executive",
    name: "Executive room",
    description: "Extra space to unwind, with a lounge area.",
    rate: 120000,
    currency: "NGN",
    capacity: 2,
    imageUrl: "",
    amenities: ["King bed", "Lounge", "2 guests"],
    active: true,
  },
];

async function seedRooms() {
  await connectDB();
  for (const room of rooms) {
    await Room.findOneAndUpdate(
      { slug: room.slug },
      { $set: room },
      {
        upsert: true,
        returnDocument: "after",
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );
  }
  console.log(`Seeded ${rooms.length} Ruby Hotel room types.`);
  await mongoose.disconnect();
}

seedRooms().catch(async (error) => {
  console.error("Room seed failed:", error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
});
