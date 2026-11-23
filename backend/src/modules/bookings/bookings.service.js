import prisma from "../../config/prisma.js";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";

export const createBooking = async (bookingData) => {
    const {
        roomId,
        guestName,
        guestEmail,
        guestPhone,
        checkIn,
        checkOut,
        guests,
    } = bookingData;

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    const millisecondsPerDay = 1000 * 60 * 60 * 24;

    const nights = Math.round(
        (checkOutDate - checkInDate) / millisecondsPerDay
    );

    if (nights < 1) {
        const error = new Error("Booking must be for at least one night");
        error.statusCode = 400;
        throw error;
    }

    try {
        const booking = await prisma.$transaction(
            async (tx) => {
                // 1. Find the selected room
                const room = await tx.room.findUnique({
                    where: { id: roomId },
                });

                if (!room || !room.isActive) {
                    const error = new Error(
                        "Selected room does not exist or is unavailable"
                    );
                    error.statusCode = 404;
                    throw error;
                }

                // 2. Check room capacity
                if (guests > room.capacity) {
                    const error = new Error(
                        "Selected room cannot accommodate this number of guests"
                    );
                    error.statusCode = 400;
                    throw error;
                }

                // 3. Count bookings that overlap with the requested dates
                const overlappingBookings = await tx.booking.count({
                      where: {
                            roomId,

                            OR: [
                         {
                            status: "confirmed",
                         },
                        {
                            status: "pending_payment",
                            expiresAt: {
                            gt: new Date(),
                            },
                        },
                               ],

                         checkIn: {
                            lt: checkOutDate,
                         },

                         checkOut: {
                            gt: checkInDate,
                         },
                             },
                });

                
                // 4. Check available inventory
                if (overlappingBookings >= room.totalUnits) {
                    const error = new Error(
                        "No rooms available for the selected dates"
                    );
                    error.statusCode = 409;
                    throw error;
                }

                // 5. Calculate booking cost
                const subtotal = room.pricePerNight * nights;

                // 6. Create the booking
                return await tx.booking.create({
                    data: {
                        bookingReference: `RUBY-${randomUUID()
                            .slice(0, 8)
                            .toUpperCase()}`,
                        guestName,
                        guestEmail,
                        guestPhone,
                        roomId,
                        checkIn: checkInDate,
                        checkOut: checkOutDate,
                        guests,
                        nightlyRate: room.pricePerNight,
                        subtotal,
                        tax: 0,
                        totalAmount: subtotal,
                        currency: room.currency,
                        status: "pending_payment",
                        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
                    },
                });
            },
            {
                isolationLevel: "Serializable",
            }
        );

        return booking;

    } catch (error) {
        // PostgreSQL serialization conflict
        if (error.code === "P2034") {
            const conflictError = new Error(
                "This room is currently being booked. Please try again."
            );
            conflictError.statusCode = 409;
            throw conflictError;
        }

        throw error;
    }
};


export const lookupBooking = async ({
    bookingReference,
    email,
}) => {
    const booking = await prisma.booking.findFirst({
        where: {
            bookingReference: bookingReference.trim().toUpperCase(),
            guestEmail: {
                equals: email.trim(),
                mode: "insensitive",
            },
        },
        select: {
            id: true,
            bookingReference: true,
            guestName: true,
            guestEmail: true,
            guestPhone: true,
            checkIn: true,
            checkOut: true,
            guests: true,
            nightlyRate: true,
            subtotal: true,
            tax: true,
            totalAmount: true,
            currency: true,
            status: true,
            createdAt: true,

            room: {
                select: {
                    name: true,
                    description: true,
                    imageUrl: true,
                    imageAlt: true,
                },
            },

            payments: {
                select: {
                    status: true,
                    amount: true,
                    currency: true,
                    paidAt: true,
                },
            },

            serviceRequests: {
                select: {
                    id: true,
                    category: true,
                    description: true,
                    status: true,
                    createdAt: true,
                    completedAt: true,
                },
            },
        },
    });

    if (!booking) {
        throw new Error("Booking not found. Please check your booking reference and email.");
    }

    const guestAccessToken = jwt.sign(
    {
        bookingId: booking.id,
        purpose: "guest_booking_access",
    },
    process.env.JWT_SECRET,
    {
        expiresIn: "2h",
    }
     );

    return {
    booking,
    guestAccessToken,
     };
};



export const createServiceRequest = async (bookingId, requestData) => {
    const { category, description } = requestData;

    // Find the booking
    const booking = await prisma.booking.findUnique({
        where: {
            id: bookingId,
        },
    });

    if (!booking) {
        const error = new Error("Booking not found");
        error.statusCode = 404;
        throw error;
    }

    // Only confirmed bookings can make service requests
    if (booking.status !== "confirmed") {
        const error = new Error(
            "Service requests are only available for confirmed bookings"
        );
        error.statusCode = 400;
        throw error;
    }

    // Create the service request
    const serviceRequest = await prisma.serviceRequest.create({
        data: {
            bookingId,
            category: category.trim(),
            description: description.trim(),
        },
    });

    return serviceRequest;
};


export const getBookingServiceRequests = async (bookingId) => {
    const booking = await prisma.booking.findUnique({
        where: {
            id: bookingId,
        },
    });

    if (!booking) {
        const error = new Error("Booking not found");
        error.statusCode = 404;
        throw error;
    }

    const requests = await prisma.serviceRequest.findMany({
        where: {
            bookingId,
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    return requests;
};