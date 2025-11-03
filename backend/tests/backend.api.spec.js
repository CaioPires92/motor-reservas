import path from "path";
import { fileURLToPath } from "url";
import request from "supertest";
import { PrismaClient as SetupPrisma } from "@prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let app;
let server;
let prisma;

const envDb = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const defaultSqlite = `file:${path.resolve(__dirname, "../src/prisma/test.db")}`;
const dbUrl = envDb || defaultSqlite;

beforeAll(async () => {
  // Garantir que o PIX não esteja habilitado nos testes
  delete process.env.MP_ACCESS_TOKEN;
  process.env.PIX_STUB = "false";
  process.env.NODE_ENV = "test";
  // Usar banco isolado para testes
  process.env.DATABASE_URL = dbUrl;

  // Em SQLite, criar esquema mínimo via DDL direta; para Postgres, o runner faz db push
  if (dbUrl.startsWith("file:")) {
    const setup = new SetupPrisma({ datasources: { db: { url: dbUrl } } });
    try {
      await setup.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "Quarto" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          "nome" TEXT NOT NULL,
          "descricao" TEXT NOT NULL,
          "precoNoite" REAL NOT NULL,
          "imagens" TEXT,
          "capacidade" INTEGER NOT NULL
        );`
      );
      await setup.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "Reserva" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          "quartoId" INTEGER NOT NULL,
          "nomeCliente" TEXT NOT NULL,
          "email" TEXT NOT NULL,
          "checkin" DATETIME NOT NULL,
          "checkout" DATETIME NOT NULL,
          "guests" INTEGER NOT NULL DEFAULT 1,
          "total" REAL NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'pendente',
          "mpPaymentId" TEXT,
          "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("quartoId") REFERENCES "Quarto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );`
      );
      await setup.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "idx_reserva_quarto_periodo" ON "Reserva" ("quartoId", "checkin", "checkout");`
      );
      await setup.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "idx_reserva_email_criadoEm" ON "Reserva" ("email", "criadoEm");`
      );
    } finally {
      await setup.$disconnect();
    }
  }

  // Importar o app após configurar as variáveis de ambiente
  const mod = await import("../src/app.js");
  app = mod.app;
  prisma = mod.prisma;
  server = app.listen(0);

  // Seed de um quarto
  // Limpar dados anteriores para evitar conflitos de sobreposição
  await prisma.reserva.deleteMany();
  await prisma.quarto.deleteMany();
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
  if (server) await new Promise((resolve) => server.close(resolve));
  if (prisma) await prisma.$disconnect();
});

test("GET /api/quartos retorna lista com quarto seedado", async () => {
  const res = await request(server).get("/api/quartos");
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

  const res = await request(server)
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
  const res = await request(server)
    .post("/api/pagamento/pix")
    .send({ email: "cliente@exemplo.com", total: 100 });
  expect(res.status).toBe(503);
  expect(res.body.error).toMatch(/indisponível/i);
});

test("PUT /api/reservas/:id altera período e recalcula total", async () => {
  const quarto = await prisma.quarto.findFirst({ where: { nome: "Suíte Master" } });
  const checkin = new Date("2025-11-10");
  const checkout = new Date("2025-11-12"); // 2 noites → 600
  const criar = await request(server)
    .post("/api/reservas")
    .send({
      quartoId: quarto.id,
      nomeCliente: "Cliente PUT",
      email: "put@exemplo.com",
      checkin: checkin.toISOString(),
      checkout: checkout.toISOString(),
    });
  expect(criar.status).toBe(200);
  const id = criar.body.id;
  expect(id).toBeDefined();

  const novoCheckout = new Date("2025-11-13"); // 3 noites → 900
  const atualizar = await request(server)
    .put(`/api/reservas/${id}`)
    .send({ checkout: novoCheckout.toISOString() });
  expect(atualizar.status).toBe(200);
  expect(atualizar.body.total).toBe(900);
});

test("DELETE /api/reservas/:id cancela e impede cancelamento duplicado", async () => {
  const quarto = await prisma.quarto.findFirst({ where: { nome: "Suíte Master" } });
  const checkin = new Date("2025-12-01");
  const checkout = new Date("2025-12-03");
  const criar = await request(server)
    .post("/api/reservas")
    .send({
      quartoId: quarto.id,
      nomeCliente: "Cliente DEL",
      email: "del@exemplo.com",
      checkin: checkin.toISOString(),
      checkout: checkout.toISOString(),
    });
  expect(criar.status).toBe(200);
  const id = criar.body.id;

  const cancelar = await request(server).delete(`/api/reservas/${id}`);
  expect(cancelar.status).toBe(200);
  expect(cancelar.body.status).toBe("cancelada");

  const cancelarDeNovo = await request(server).delete(`/api/reservas/${id}`);
  expect(cancelarDeNovo.status).toBe(400);
});

test("POST /api/reservas valida capacidade com guests acima do limite", async () => {
  const quarto = await prisma.quarto.findFirst({ where: { nome: "Suíte Master" } });
  const checkin = new Date("2025-11-20");
  const checkout = new Date("2025-11-22");
  const res = await request(app)
    .post("/api/reservas")
    .send({
      quartoId: quarto.id,
      nomeCliente: "Capacidade Teste",
      email: "capacidade@exemplo.com",
      checkin: checkin.toISOString(),
      checkout: checkout.toISOString(),
      guests: 3, // capacidade do quarto é 2
    });
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/capacidade/i);
});

test("GET /api/reservas/:id recupera reserva criada", async () => {
  const quarto = await prisma.quarto.findFirst({ where: { nome: "Suíte Master" } });
  const checkin = new Date("2025-11-24");
  const checkout = new Date("2025-11-26");
  const criar = await request(server)
    .post("/api/reservas")
    .send({
      quartoId: quarto.id,
      nomeCliente: "Cliente GET",
      email: "get@exemplo.com",
      checkin: checkin.toISOString(),
      checkout: checkout.toISOString(),
      guests: 2,
    });
  expect(criar.status).toBe(200);
  const id = criar.body.id;
  const buscar = await request(server).get(`/api/reservas/${id}`);
  expect(buscar.status).toBe(200);
  expect(buscar.body.id).toBe(id);
});

test("GET /api/reservas filtra por quarto e período sobreposto", async () => {
  const quarto = await prisma.quarto.findFirst({ where: { nome: "Suíte Master" } });
  const criar = await request(app)
    .post("/api/reservas")
    .send({
      quartoId: quarto.id,
      nomeCliente: "Cliente Filtro",
      email: "filtro@exemplo.com",
      checkin: new Date("2025-11-20").toISOString(),
      checkout: new Date("2025-11-22").toISOString(),
      guests: 2,
    });
  expect(criar.status).toBe(200);

  const res = await request(server)
    .get("/api/reservas")
    .query({
      quartoId: quarto.id,
      inicio: new Date("2025-11-21").toISOString(),
      fim: new Date("2025-11-23").toISOString(),
    });
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
  expect(res.body.length).toBeGreaterThan(0);
});

describe("GET /api/disponibilidade", () => {
  test("retorna 400 quando faltam parâmetros", async () => {
    const res = await request(server).get("/api/disponibilidade");
    expect(res.status).toBe(400);
  });

  test("retorna quartos disponíveis quando não há reservas conflitando", async () => {
    const res = await request(server)
      .get("/api/disponibilidade")
      .query({ checkin: "2026-01-01", checkout: "2026-01-03", guests: 2 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.availableRooms)).toBe(true);
    expect(res.body.totalAvailable).toBeGreaterThanOrEqual(1);
  });

  test("filtra quartos por capacidade e conflito", async () => {
    const quarto = await prisma.quarto.findFirst({ where: { nome: "Suíte Master" } });
    // Cria reserva no período alvo para gerar conflito
    await prisma.reserva.create({
      data: {
        quartoId: quarto.id,
        nomeCliente: "Conf Disponibilidade",
        email: "conf@exemplo.com",
        checkin: new Date("2025-11-05"),
        checkout: new Date("2025-11-10"),
        total: 0,
      },
    });

    const res = await request(server)
      .get("/api/disponibilidade")
      .query({ checkin: "2025-11-07", checkout: "2025-11-08", guests: 2 });
    expect(res.status).toBe(200);
    // Suíte Master (capacidade 2) deve ser removida por conflito
    const ids = new Set(res.body.availableRooms.map((r) => r.id));
    expect(ids.has(quarto.id)).toBe(false);
  });
});
