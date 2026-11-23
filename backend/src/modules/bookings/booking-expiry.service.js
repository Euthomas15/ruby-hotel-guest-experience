import prisma from "../../config/prisma.js";

export const expirePendingBookings = async () => {
    const result = await prisma.booking.updateMany({
        where: {
            status: "pending_payment",
            expiresAt: {
                lte: new Date(),
            },
        },
        data: {
            status: "cancelled",
        },
    });

    return result.count;
};