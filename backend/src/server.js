import app from "./app.js";
import "dotenv/config";
import connectMongoDB from "./config/mongodb.js";
import prisma from "./config/prisma.js";
import { startBookingExpiryScheduler } from "./modules/bookings/booking-expiry.scheduler.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectMongoDB();

        // Connect to PostgreSQL
        await prisma.$connect();

        console.log("PostgreSQL connected successfully");

        // Start the server
        app.listen(PORT, () => {
            console.log(`Ruby Hotel Server is running on port ${PORT}`);
        });
        startBookingExpiryScheduler();

    } catch (error) {
        console.error("Server startup failed:", error.message);
        await prisma.$disconnect().catch(() => {});
        process.exit(1);
    }
};

startServer();
  