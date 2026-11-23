import jwt from "jsonwebtoken";

export const guestBookingMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Guest booking access token is required",
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.purpose !== "guest_booking_access") {
            return res.status(403).json({
                success: false,
                message: "Invalid guest access token",
            });
        }

        if (decoded.bookingId !== req.params.bookingId) {
            return res.status(403).json({
                success: false,
                message: "You cannot access another guest's booking",
            });
        }

        req.guestBooking = {
            bookingId: decoded.bookingId,
        };

        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired guest access token",
        });
    }
};