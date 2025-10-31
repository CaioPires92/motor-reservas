import request from "supertest";

let app, prisma;

// Use a separate test database file BEFORE importing app/prisma
process.env.DATABASE_URL = "file:./test.db";

beforeAll(async () => {
  ({ app, prisma } = await import("../src/app.js"));
  // Create baseline rooms
  await prisma.reservation.deleteMany();
  await prisma.room.deleteMany();
  await prisma.room.createMany({
    data: [
      { name: "Standard", description: "Quarto padrão", priceNight: 200, capacity: 2 },
      { name: "Deluxe", description: "Quarto deluxe", priceNight: 350, capacity: 3 },
      { name: "Família", description: "Quarto família", priceNight: 500, capacity: 5 }
    ]
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /availability", () => {
  test("retorna 400 quando faltam parâmetros", async () => {
    const res = await request(app).get("/availability");
    expect(res.status).toBe(400);
  });

  test("retorna quartos disponíveis quando não há reservas", async () => {
    const res = await request(app)
      .get("/availability")
      .query({ checkin: "2025-11-01", checkout: "2025-11-03", guests: 2 });
    expect(res.status).toBe(200);
    expect(res.body.totalAvailable).toBeGreaterThan(0);
    expect(Array.isArray(res.body.availableRooms)).toBe(true);
  });

  test("filtra quartos com reservas conflitantes", async () => {
    const deluxe = await prisma.room.findFirst({ where: { name: "Deluxe" } });
    await prisma.reservation.create({
      data: {
        roomId: deluxe.id,
        checkin: new Date("2025-11-05"),
        checkout: new Date("2025-11-08")
      }
    });

    const res = await request(app)
      .get("/availability")
      .query({ checkin: "2025-11-06", checkout: "2025-11-07", guests: 2 });

    expect(res.status).toBe(200);
    const names = res.body.availableRooms.map(r => r.name);
    expect(names).not.toContain("Deluxe");
  });

  test("limites inclusivos: checkout <= checkin não sobrepõe", async () => {
    const standard = await prisma.room.findFirst({ where: { name: "Standard" } });
    await prisma.reservation.create({
      data: {
        roomId: standard.id,
        checkin: new Date("2025-11-10"),
        checkout: new Date("2025-11-12")
      }
    });

    // Consulta até o checkin -1 dia -> deve estar disponível
    const res = await request(app)
      .get("/availability")
      .query({ checkin: "2025-11-08", checkout: "2025-11-10", guests: 2 });
    expect(res.status).toBe(200);
    const names = res.body.availableRooms.map(r => r.name);
    expect(names).toContain("Standard");
  });

  test("validações de entrada: datas inválidas", async () => {
    const res = await request(app)
      .get("/availability")
      .query({ checkin: "invalid", checkout: "2025-11-03" });
    expect(res.status).toBe(400);
  });
});
