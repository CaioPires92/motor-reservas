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
      { nome: "Suíte Master", descricao: "Quarto amplo com vista", precoNoite: 300, capacidade: 2, imagens: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&q=80" },
      { nome: "Deluxe", descricao: "Conforto superior", precoNoite: 450, capacidade: 3, imagens: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=1200&q=80" },
      { nome: "Família", descricao: "Espaço para todos", precoNoite: 600, capacidade: 5, imagens: "https://images.unsplash.com/photo-1505691723518-36a5ac3b2c5c?w=1200&q=80" },
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
