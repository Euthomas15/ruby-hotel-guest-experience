export const validateBookingInput = ({
    roomId,
    guestName,
    guestEmail,
    guestPhone,
    checkIn,
    checkOut,
    guests,
}) => {
    const errors = [];

    if (!roomId) {
        errors.push("Room ID is required");
    }

    if (!guestName || guestName.trim().length < 2) {
        errors.push("Guest name must contain at least 2 characters");
    }

    if (!guestEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
        errors.push("A valid email address is required");
    }

    if (!guestPhone || guestPhone.trim().length < 7) {
        errors.push("A valid phone number is required");
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (
        !checkIn ||
        !checkOut ||
        Number.isNaN(checkInDate.getTime()) ||
        Number.isNaN(checkOutDate.getTime()) ||
        checkInDate >= checkOutDate
    ) {
        errors.push("Valid check-in and check-out dates are required");
    }

    if (!Number.isInteger(guests) || guests < 1) {
        errors.push("Number of guests must be a positive whole number");
    }

    return errors;
};