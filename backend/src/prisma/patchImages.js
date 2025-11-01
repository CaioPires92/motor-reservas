import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaults = [
  {
    match: /su[íi]te\s*master/i,
    url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&q=80",
  },
  {
    match: /deluxe/i,
    url: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=1200&q=80",
  },
  {
    match: /fam[ií]lia|familia/i,
    url: "https://images.unsplash.com/photo-1505691723518-36a5ac3b2c5c?w=1200&q=80",
  },
];

const fallbackUrl = "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&q=80";

async function main() {
  const quartos = await prisma.quarto.findMany();
  let updated = 0;
  for (const q of quartos) {
    const imagens = (q.imagens || "").trim();
    if (imagens.length > 0) continue;
    const match = defaults.find((d) => d.match.test(q.nome || ""));
    const url = match ? match.url : fallbackUrl;
    await prisma.quarto.update({ where: { id: q.id }, data: { imagens: url } });
    updated++;
  }
  console.log(`[patchImages] Quartos atualizados: ${updated}`);
}

main()
  .catch((e) => {
    console.error("[patchImages] erro:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

