import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.reservation.deleteMany();
  await prisma.room.deleteMany();

  await prisma.room.createMany({
    data: [
      { name: "Standard", description: "Quarto padrão", priceNight: 200, capacity: 2 },
      { name: "Deluxe", description: "Quarto deluxe", priceNight: 350, capacity: 3 },
      { name: "Família", description: "Quarto família", priceNight: 500, capacity: 5 }
    ]
  });

  console.log("Seed booking concluído");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

