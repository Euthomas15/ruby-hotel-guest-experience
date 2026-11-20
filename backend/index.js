const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const cors = require("cors");
const express = require("express");
const connectDB = require("./configs/db");
const { initializePaymentDatabase } = require("./configs/postgres");
const userRoutes = require("./routes/user.routes");
const hotelRoutes = require("./routes/booking.routes");
const roomRoutes = require("./routes/room.routes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use("/api/users", userRoutes);
app.use("/api/hotel", roomRoutes);
app.use("/api/hotel", hotelRoutes);
app.use((error, req, res, next) => {
  console.error("Request error:", error);
  if (res.headersSent) {
    return next(error);
  }
  return res.status(500).json({
    success: false,
    message: "An unexpected server error occurred.",
  });
});

async function startServer() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be set to a random value of at least 32 characters.");
  }

  await connectDB();
  await initializePaymentDatabase();
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exitCode = 1;
});