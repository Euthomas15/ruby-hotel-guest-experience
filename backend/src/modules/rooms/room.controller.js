import { getAllRooms } from "./room.service.js";

export const fetchRooms = async (req, res, next) => {
    try {
        const { checkIn, checkOut, guests } = req.query;
        console.log("ROOM QUERY:", req.query);
        console.log({
    checkIn,
    checkOut,
    guests,
    missing: !checkIn || !checkOut || !guests
});

        if (!checkIn || !checkOut || !guests) {
            return res.status(400).json({
                success: false,
                message: "Check-in, check-out and guests are required",
            });
        }

        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        const guestCount = Number(guests);

        if (
            Number.isNaN(checkInDate.getTime()) ||
            Number.isNaN(checkOutDate.getTime()) ||
            checkInDate >= checkOutDate
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide valid check-in and check-out dates",
            });
        }

        if (!Number.isInteger(guestCount) || guestCount < 1) {
            return res.status(400).json({
                success: false,
                message: "Guests must be a positive whole number",
            });
        }

        const rooms = await getAllRooms({
            checkIn: checkInDate,
            checkOut: checkOutDate,
            guests: guestCount,
        });

        return res.status(200).json({
            success: true,
            message: "Available rooms retrieved successfully",
            data: rooms,
        });
    } catch (error) {
        next(error);
    }
};