import request from "supertest";

// Configurar env ANTES de importar o app
process.env.DATABASE_URL = "file:./test.db";
process.env.RATE_LIMIT_AVAILABILITY_WINDOW_MS = "1000"; // 1s
process.env.RATE_LIMIT_AVAILABILITY_MAX = "2"; // permitir 2 requisições

let app, prisma;

beforeAll(async () => {
  ({ app, prisma } = await import("../src/app.js"));
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Rate limiting /availability", () => {
  test("bloqueia após exceder o limite (429)", async () => {
    const query = { checkin: "2025-11-01", checkout: "2025-11-02", guests: 1 };

    // Duas requisições permitidas
    await request(app).get("/availability").query(query);
    await request(app).get("/availability").query(query);

    // Terceira deve retornar 429
    const third = await request(app).get("/availability").query(query);
    expect(third.status).toBe(429);
  });
});

