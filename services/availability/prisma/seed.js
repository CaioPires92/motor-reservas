import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.reservation.deleteMany();
  await prisma.room.deleteMany();

  // Seed some rooms
  await prisma.room.createMany({
    data: [
      { name: "Standard", description: "Quarto padrão", priceNight: 200, capacity: 2 },
      { name: "Deluxe", description: "Quarto deluxe", priceNight: 350, capacity: 3 },
      { name: "Família", description: "Quarto família", priceNight: 500, capacity: 5 }
    ]
  });

  // Create an overlapping reservation for testing
  const deluxe = await prisma.room.findFirst({ where: { name: "Deluxe" } });
  if (deluxe) {
    await prisma.reservation.create({
      data: {
        roomId: deluxe.id,
        checkin: new Date("2025-11-05"),
        checkout: new Date("2025-11-10")
      }
    });
  }

  console.log("Seed concluído");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

