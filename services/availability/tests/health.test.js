import request from "supertest";

let app;

// Use a separate test database file BEFORE importing app/prisma
process.env.DATABASE_URL = "file:./test.db";

beforeAll(async () => {
    ({ app } = await import("../src/app.js"));
});

afterAll(async () => {
    // no need to disconnect prisma for simple health check
});

describe("GET /health", () => {
    test("retorna 200 e responde rapidamente", async () => {
        const t0 = Date.now();
        const res = await request(app).get("/health");
        const t1 = Date.now();
        expect(res.status).toBe(200);
        expect(res.body?.status).toBe("ok");
        expect(t1 - t0).toBeLessThan(500); // resposta deve ser rápida
    });
});

