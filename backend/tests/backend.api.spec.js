import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import request from "supertest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let app;
let prisma;

const dbUrl = `file:${path.resolve(__dirname, "../src/prisma/test.db")}`;

beforeAll(async () => {
  // Garantir que o PIX não esteja habilitado nos testes
  delete process.env.MP_ACCESS_TOKEN;
  // Usar banco isolado para testes
  process.env.DATABASE_URL = dbUrl;

  // Importar o app após configurar as variáveis de ambiente
  const mod = await import("../src/app.js");
  app = mod.app;
  prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

  // Seed de um quarto
  await prisma.quarto.create({
    data: {
      nome: "Suíte Master",
      descricao: "Vista mar",
      precoNoite: 300.0,
      imagens: null,
      capacidade: 2,
    },
  });
});

afterAll(async () => {
  if (prisma) await prisma.$disconnect();
});

test("GET /api/quartos retorna lista com quarto seedado", async () => {
  const res = await request(app).get("/api/quartos");
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
  expect(res.body.length).toBeGreaterThan(0);
  const item = res.body.find((q) => q.nome === "Suíte Master");
  expect(item).toBeTruthy();
  expect(item.capacidade).toBe(2);
});

test("POST /api/reservas cria reserva para quarto existente", async () => {
  const quarto = await prisma.quarto.findFirst({ where: { nome: "Suíte Master" } });
  const checkin = new Date();
  const checkout = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const total = 600.0;

  const res = await request(app)
    .post("/api/reservas")
    .send({
      quartoId: quarto.id,
      nomeCliente: "Cliente Teste",
      email: "cliente@exemplo.com",
      checkin: checkin.toISOString(),
      checkout: checkout.toISOString(),
      total,
    });

  expect(res.status).toBe(200);
  expect(res.body.id).toBeDefined();
  expect(res.body.quartoId).toBe(quarto.id);
  expect(res.body.total).toBe(total);
});

test("POST /api/pagamento/pix retorna 503 sem token", async () => {
  const res = await request(app)
    .post("/api/pagamento/pix")
    .send({ email: "cliente@exemplo.com", total: 100 });
  expect(res.status).toBe(503);
  expect(res.body.error).toMatch(/indisponível/i);
});

