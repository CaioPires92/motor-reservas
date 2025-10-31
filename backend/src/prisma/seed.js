import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.quarto.count();
  if (count > 0) {
    console.log("[seed] Nada a fazer: já existem", count, "quartos");
    return;
  }

  await prisma.quarto.createMany({
    data: [
      { nome: "Suíte Master", descricao: "Quarto amplo com vista", precoNoite: 300, capacidade: 2 },
      { nome: "Deluxe", descricao: "Conforto superior", precoNoite: 450, capacidade: 3 },
      { nome: "Família", descricao: "Espaço para todos", precoNoite: 600, capacidade: 5 },
    ],
  });
  console.log("[seed] Quartos de produção criados");
}

main()
  .catch((e) => {
    console.error("[seed] Falha ao executar seed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

