import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
    adapter,
});

const rooms = [
    {
        name: "Standard room",
        description: "A calm, comfortable room for an easy city stay.",
        imageUrl: "/images/standardroom.jpg",
        imageAlt: "Bright hotel room with a neatly made bed",
        pricePerNight: 6500000,
        capacity: 2,
        features: ["Queen bed", "Wi-Fi"],
    },
    {
        name: "Deluxe room",
        description: "A restful retreat with a king bed and warm interiors.",
        imageUrl: "https://images.unsplash.com/photo-1702014861736-d62834317c5e?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
        imageAlt: "Warm and inviting hotel room",
        pricePerNight: 9000000,
        capacity: 2,
        features: ["King bed", "32 m²"],
    },
    {
        name: "Executive room",
        description: "Extra space to unwind, with a lounge area.",
        imageUrl: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=85",
        imageAlt: "Elegant hotel suite with a spacious sitting area",
        pricePerNight: 12000000,
        capacity: 2,
        features: ["King bed", "Lounge"],
    },
];

async function seedRooms() {
    for (const room of rooms) {
        await prisma.room.upsert({
            where: {
                name: room.name,
            },
            update: room,
            create: room,
        });
    }

    console.log("Room records seeded successfully.");
}

seedRooms()
    .catch((error) => {
        console.error("Seeding failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });