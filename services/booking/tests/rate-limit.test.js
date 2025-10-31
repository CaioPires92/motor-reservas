import request from "supertest";

// Configurar env ANTES de importar o app
process.env.DATABASE_URL = "file:./test.db";
process.env.RATE_LIMIT_RESERVAS_WINDOW_MS = "1000"; // 1s
process.env.RATE_LIMIT_RESERVAS_MAX = "2"; // permitir 2 requisições

let app, prisma;

beforeAll(async () => {
  ({ app, prisma } = await import("../src/app.js"));
  await prisma.reservation.deleteMany();
  await prisma.room.deleteMany();
  await prisma.room.create({
    data: { name: "RateLimit Room", description: "Teste de limite", priceNight: 100, capacity: 2 }
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Rate limiting /reservas", () => {
  test("bloqueia após exceder o limite (429)", async () => {
    const room = await prisma.room.findFirst({ where: { name: "RateLimit Room" } });
    const payload = {
      roomId: room.id,
      checkin: "2025-11-10",
      checkout: "2025-11-12",
      guests: 1,
      nomeCliente: "Teste",
      email: "teste@example.com"
    };

    // Duas requisições permitidas
    await request(app).post("/reservas").send(payload);
    await request(app).post("/reservas").send(payload);

    // Terceira deve retornar 429
    const third = await request(app).post("/reservas").send(payload);
    expect(third.status).toBe(429);
  });
});

