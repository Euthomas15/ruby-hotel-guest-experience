import prisma from "../../config/prisma.js";

export const getAllRooms = async ({ checkIn, checkOut, guests }) => {
    const rooms = await prisma.room.findMany({
        where: {
            isActive: true,
            capacity: {
                gte: guests,
            },
        },
        include: {
            bookings: {
                where: {
                    OR: [ {
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
                        lt: checkOut,
                    },
                    checkOut: {
                        gt: checkIn,
                    },
                },
            },
        },
        orderBy: {
            pricePerNight: "asc",
        },
    });

    return rooms
        .map((room) => {
            const bookedUnits = room.bookings.length;
            const availableUnits = room.totalUnits - bookedUnits;

            return {
                id: room.id,
                name: room.name,
                description: room.description,
                imageUrl: room.imageUrl,
                imageAlt: room.imageAlt,
                pricePerNight: room.pricePerNight,
                currency: room.currency,
                capacity: room.capacity,
                features: room.features,
                totalUnits: room.totalUnits,
                availableUnits,
            };
        })
        .filter((room) => room.availableUnits > 0);
};