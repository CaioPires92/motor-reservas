import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mercadopago from "mercadopago";
import { PrismaClient } from "@prisma/client";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();
const defaultDbUrl = `file:${path.resolve(__dirname, "./prisma/dev.db")}`;
export const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL || defaultDbUrl } },
});

const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
if (MP_TOKEN) {
  mercadopago.configure({ access_token: MP_TOKEN });
} else {
  console.warn("[WARN] MP_ACCESS_TOKEN ausente; endpoints de pagamento PIX indisponíveis.");
}

app.use(cors());
app.use(express.json());

// --- Quartos ---
app.get("/api/quartos", async (req, res) => {
  const quartos = await prisma.quarto.findMany();
  res.json(quartos);
});

// --- Reservas ---
app.post("/api/reservas", async (req, res) => {
  const { quartoId, nomeCliente, email, checkin, checkout, total } = req.body;
  const reserva = await prisma.reserva.create({
    data: {
      quartoId,
      nomeCliente,
      email,
      checkin: new Date(checkin),
      checkout: new Date(checkout),
      total,
    },
  });
  res.json(reserva);
});

// --- Pagamento PIX ---
app.post("/api/pagamento/pix", async (req, res) => {
  try {
    if (!MP_TOKEN) {
      return res
        .status(503)
        .json({ error: "Pagamento PIX indisponível: token não configurado" });
    }
    const { email, total } = req.body;
    const payment = await mercadopago.payment.create({
      transaction_amount: Number(total),
      description: "Reserva de hotel",
      payment_method_id: "pix",
      payer: { email },
    });
    res.json({
      qr_code_base64:
        payment.body.point_of_interaction.transaction_data.qr_code_base64,
      qr_code: payment.body.point_of_interaction.transaction_data.qr_code,
      id: payment.body.id,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao gerar pagamento PIX" });
  }
});

if (process.env.NODE_ENV !== "test") {
  app.listen(4000, () =>
    console.log("Servidor rodando em http://localhost:4000"),
  );
}

export default app;
