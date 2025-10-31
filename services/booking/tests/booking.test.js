import request from "supertest";

let app, prisma;

process.env.DATABASE_URL = "file:./test.db";

beforeAll(async () => {
  ({ app, prisma } = await import("../src/app.js"));
  await prisma.reservation.deleteMany();
  await prisma.room.deleteMany();
  await prisma.room.createMany({
    data: [
      { name: "Standard", description: "Quarto padrão", priceNight: 200, capacity: 2 },
      { name: "Deluxe", description: "Quarto deluxe", priceNight: 350, capacity: 3 }
    ]
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /reservas", () => {
  test("cria reserva quando disponível", async () => {
    const room = await prisma.room.findFirst({ where: { name: "Standard" } });
    const res = await request(app)
      .post("/reservas")
      .send({
        roomId: room.id,
        checkin: "2025-11-10",
        checkout: "2025-11-12",
        guests: 2,
        nomeCliente: "Ana",
        email: "ana@example.com"
      });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe("pendente");
  });

  test("retorna 409 se houver conflito", async () => {
    const room = await prisma.room.findFirst({ where: { name: "Deluxe" } });
    await prisma.reservation.create({
      data: {
        roomId: room.id,
        checkin: new Date("2025-11-05"),
        checkout: new Date("2025-11-08"),
        status: "pendente",
        nomeCliente: "Bob",
        email: "bob@example.com"
      }
    });
    const res = await request(app)
      .post("/reservas")
      .send({
        roomId: room.id,
        checkin: "2025-11-06",
        checkout: "2025-11-07",
        guests: 2,
        nomeCliente: "Carla",
        email: "carla@example.com"
      });
    expect(res.status).toBe(409);
  });

  test("retorna 400 para email inválido", async () => {
    const room = await prisma.room.findFirst({ where: { name: "Standard" } });
    const res = await request(app)
      .post("/reservas")
      .send({
        roomId: room.id,
        checkin: "2025-11-15",
        checkout: "2025-11-16",
        guests: 1,
        nomeCliente: "Hector",
        email: "invalid-email"
      });
    expect(res.status).toBe(400);
    expect(res.body?.error).toBeDefined();
  });
});

describe("PUT /reservas/:id", () => {
  test("modifica reserva sem conflito", async () => {
    const room = await prisma.room.findFirst({ where: { name: "Standard" } });
    const created = await prisma.reservation.create({
      data: {
        roomId: room.id,
        checkin: new Date("2025-11-15"),
        checkout: new Date("2025-11-17"),
        status: "pendente",
        nomeCliente: "Dani",
        email: "dani@example.com"
      }
    });
    const res = await request(app)
      .put(`/reservas/${created.id}`)
      .send({ checkin: "2025-11-16", checkout: "2025-11-18" });
    expect(res.status).toBe(200);
    expect(new Date(res.body.checkin).toISOString()).toBe(new Date("2025-11-16").toISOString());
  });

  test("retorna 409 ao modificar para período conflitado", async () => {
    const room = await prisma.room.findFirst({ where: { name: "Standard" } });
    const a = await prisma.reservation.create({
      data: {
        roomId: room.id,
        checkin: new Date("2025-11-20"),
        checkout: new Date("2025-11-22"),
        status: "pendente",
        nomeCliente: "Eva",
        email: "eva@example.com"
      }
    });
    const b = await prisma.reservation.create({
      data: {
        roomId: room.id,
        checkin: new Date("2025-11-23"),
        checkout: new Date("2025-11-25"),
        status: "pendente",
        nomeCliente: "Felipe",
        email: "felipe@example.com"
      }
    });
    const res = await request(app)
      .put(`/reservas/${b.id}`)
      .send({ checkin: "2025-11-21", checkout: "2025-11-24" });
    expect(res.status).toBe(409);
  });
});

describe("DELETE /reservas/:id", () => {
  test("cancela reserva e impede cancelamento duplicado", async () => {
    const room = await prisma.room.findFirst({ where: { name: "Deluxe" } });
    const created = await prisma.reservation.create({
      data: {
        roomId: room.id,
        checkin: new Date("2025-12-01"),
        checkout: new Date("2025-12-03"),
        status: "pendente",
        nomeCliente: "Gabi",
        email: "gabi@example.com"
      }
    });
    const res1 = await request(app).delete(`/reservas/${created.id}`);
    expect(res1.status).toBe(200);
    expect(res1.body.status).toBe("cancelada");

    const res2 = await request(app).delete(`/reservas/${created.id}`);
    expect(res2.status).toBe(400);
  });
});
