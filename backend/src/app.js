import express from "express";
import cors from "cors";
import roomsRoutes from "./modules/rooms/room.routes.js";
import bookingRoutes from "./modules/bookings/bookings.routes.js";
import paymentRoutes from "./modules/payments/payments.routes.js";
import staffRoutes from "./modules/staffs/staff.routes.js";
import errorMiddleware from "./middlewares/error.middlewares.js";

const app = express();


//MIDDLEWARES

const allowedOrigins = [
    "http://localhost:5173",
    "https://ruby-hotel-guest-experience.vercel.app"
];
app.use(cors({ origin: allowedOrigins,credentials: true,}));
app.use("/api/payments/paystack/webhook", express.raw({ type: "application/json"}));
app.use(express.json());
app.use(express.urlencoded({extended : true}));

//DEFAULT ROUTE

app.get("/", (req, res) => {
    res.status(200).json({
        success : true,
        message: "Welcome to RubyHotels"
    });
});

app.use("/api/rooms", roomsRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments",paymentRoutes);
app.use("/api/staff", staffRoutes);

app.use(errorMiddleware);

export default app;