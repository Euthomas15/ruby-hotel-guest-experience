import { expirePendingBookings } from "./booking-expiry.service.js";

export const startBookingExpiryScheduler = () => {
    // Run once when the server starts.
    expirePendingBookings()
        .then((count) => {
            console.log(`${count} expired booking(s) cancelled`);
        })
        .catch((error) => {
            console.error("Booking expiry error:", error.message);
        });

    // Repeat every 60 seconds.
    setInterval(async () => {
        try {
            const count = await expirePendingBookings();

            if (count > 0) {
                console.log(`${count} expired booking(s) cancelled`);
            }
        } catch (error) {
            console.error("Booking expiry error:", error.message);
        }
    }, 60 * 1000);
};