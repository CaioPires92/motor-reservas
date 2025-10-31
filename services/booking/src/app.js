import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import fetch from "node-fetch";
import { MercadoPagoConfig, Payment } from "mercadopago";
import rateLimit from "express-rate-limit";

dotenv.config();
export const app = express();
export const prisma = new PrismaClient();
const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
let mpPayment = null;
if (MP_TOKEN) {
  try {
    const mpClient = new MercadoPagoConfig({ accessToken: MP_TOKEN });
    mpPayment = new Payment(mpClient);
  } catch (e) {
    console.warn("[WARN] Falha ao configurar Mercado Pago SDK:", e?.message || e);
  }
} else {
  console.warn("[WARN] MP_ACCESS_TOKEN ausente; endpoints de pagamento PIX indisponíveis.");
}

// Segurança básica
app.use(helmet());

// Configuração de CORS por ambiente
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map(o => o.trim())
  .filter(Boolean);
const corsOptions = {
  origin: allowedOrigins.length > 0 ? allowedOrigins : "*",
};
app.use(cors(corsOptions));
app.use(express.json());

// Rate limiting para endpoints críticos
const RATE_LIMIT_RESERVAS_WINDOW_MS = Number(process.env.RATE_LIMIT_RESERVAS_WINDOW_MS || 60 * 1000);
const RATE_LIMIT_RESERVAS_MAX = Number(process.env.RATE_LIMIT_RESERVAS_MAX || 10);
const RATE_LIMIT_PIX_WINDOW_MS = Number(process.env.RATE_LIMIT_PIX_WINDOW_MS || 60 * 1000);
const RATE_LIMIT_PIX_MAX = Number(process.env.RATE_LIMIT_PIX_MAX || 10);
const reservasLimiter = rateLimit({
  windowMs: RATE_LIMIT_RESERVAS_WINDOW_MS,
  max: RATE_LIMIT_RESERVAS_MAX,
  message: { error: "Limite de requisições excedido. Tente novamente em 1 minuto." }
});
const pixLimiter = rateLimit({
  windowMs: RATE_LIMIT_PIX_WINDOW_MS,
  max: RATE_LIMIT_PIX_MAX,
  message: { error: "Limite de requisições excedido. Tente novamente em 1 minuto." }
});

const AVAILABILITY_URL = process.env.AVAILABILITY_URL || "http://localhost:4100";

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// List rooms
app.get("/quartos", async (req, res) => {
  try {
    const rooms = await prisma.room.findMany();
    res.json(rooms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar quartos" });
  }
});

// Create reservation
app.post("/reservas", reservasLimiter, async (req, res) => {
  try {
    const { roomId, checkin, checkout, guests = 1, nomeCliente, email } = req.body;
    if (!roomId || !checkin || !checkout || !nomeCliente || !email) {
      return res.status(400).json({ error: "Campos obrigatórios: roomId, checkin, checkout, nomeCliente, email" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Email inválido" });
    }

    const start = new Date(checkin);
    const end = new Date(checkout);
    const guestsNum = Number(guests);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      return res.status(400).json({ error: "Intervalo de datas inválido" });
    }
    if (guestsNum <= 0) {
      return res.status(400).json({ error: "Número de hóspedes inválido" });
    }

    const room = await prisma.room.findUnique({ where: { id: Number(roomId) } });
    if (!room) return res.status(404).json({ error: "Quarto não encontrado" });
    if (guestsNum > room.capacity) return res.status(400).json({ error: "Hóspedes excedem a capacidade do quarto" });

    // Orquestração: checar disponibilidade via microsserviço externo
    try {
      const qs = new URLSearchParams({
        checkin: start.toISOString().slice(0, 10),
        checkout: end.toISOString().slice(0, 10),
        guests: String(guestsNum)
      });
      const resp = await fetch(`${AVAILABILITY_URL}/availability?${qs.toString()}`);
      if (!resp.ok) {
        const msg = await resp.text();
        return res.status(502).json({ error: `Falha ao consultar disponibilidade: ${msg}` });
      }
      const data = await resp.json();
      const availableIds = new Set((data.availableRooms || []).map(r => r.id));
      if (!availableIds.has(room.id)) {
        return res.status(409).json({ error: "Quarto indisponível no período (availability)" });
      }
    } catch (e) {
      console.warn("Availability indisponível, seguindo com checagem local.", e?.message);
    }

    // conflict check
    const conflict = await prisma.reservation.findFirst({
      where: {
        roomId: room.id,
        NOT: { OR: [{ checkout: { lte: start } }, { checkin: { gte: end } }] }
      }
    });
    if (conflict) {
      return res.status(409).json({ error: "Quarto indisponível no período solicitado" });
    }

    const totalNights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const total = totalNights * room.priceNight;

    const reserva = await prisma.reservation.create({
      data: {
        roomId: room.id,
        checkin: start,
        checkout: end,
        status: "pendente",
        nomeCliente,
        email
      }
    });

    res.status(201).json({ ...reserva, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar reserva" });
  }
});

// PIX payment
app.post("/pagamento/pix", pixLimiter, async (req, res) => {
  try {
    if (!MP_TOKEN) {
      return res.status(503).json({ error: "Pagamento PIX indisponível: token não configurado" });
    }
    const { email, total } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ error: "Email inválido" });
    }
    if (!total || Number(total) <= 0) {
      return res.status(400).json({ error: "Total deve ser maior que zero" });
    }
    const payment = await mpPayment.create({
      body: {
        transaction_amount: Number(total),
        description: "Reserva de hotel",
        payment_method_id: "pix",
        payer: { email }
      }
    });
    const body = payment?.body ?? payment;
    return res.json({
      qr_code_base64: body?.point_of_interaction?.transaction_data?.qr_code_base64,
      qr_code: body?.point_of_interaction?.transaction_data?.qr_code,
      id: body?.id
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao gerar pagamento PIX" });
  }
});

// Update reservation
app.put("/reservas/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { roomId, checkin, checkout, guests = 1 } = req.body;
    const current = await prisma.reservation.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ error: "Reserva não encontrada" });
    if (current.status === "cancelada") return res.status(400).json({ error: "Reserva cancelada não pode ser modificada" });

    const start = checkin ? new Date(checkin) : current.checkin;
    const end = checkout ? new Date(checkout) : current.checkout;
    const roomIdNum = roomId ? Number(roomId) : current.roomId;
    const guestsNum = Number(guests);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      return res.status(400).json({ error: "Intervalo de datas inválido" });
    }
    if (guestsNum <= 0) {
      return res.status(400).json({ error: "Número de hóspedes inválido" });
    }

    const room = await prisma.room.findUnique({ where: { id: roomIdNum } });
    if (!room) return res.status(404).json({ error: "Quarto não encontrado" });
    if (guestsNum > room.capacity) return res.status(400).json({ error: "Hóspedes excedem a capacidade do quarto" });

    // Orquestração: checar disponibilidade via microsserviço externo
    try {
      const qs = new URLSearchParams({
        checkin: start.toISOString().slice(0, 10),
        checkout: end.toISOString().slice(0, 10),
        guests: String(guestsNum)
      });
      const resp = await fetch(`${AVAILABILITY_URL}/availability?${qs.toString()}`);
      if (resp.ok) {
        const data = await resp.json();
        const availableIds = new Set((data.availableRooms || []).map(r => r.id));
        if (!availableIds.has(room.id)) {
          return res.status(409).json({ error: "Conflito de reserva (availability)" });
        }
      }
    } catch (e) {
      console.warn("Availability indisponível na atualização, seguindo com checagem local.", e?.message);
    }

    const conflict = await prisma.reservation.findFirst({
      where: {
        roomId: room.id,
        id: { not: id },
        NOT: { OR: [{ checkout: { lte: start } }, { checkin: { gte: end } }] }
      }
    });
    if (conflict) {
      return res.status(409).json({ error: "Conflito de reserva no período solicitado" });
    }

    const updated = await prisma.reservation.update({
      where: { id },
      data: { roomId: room.id, checkin: start, checkout: end }
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar reserva" });
  }
});

// Cancel reservation
app.delete("/reservas/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const current = await prisma.reservation.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ error: "Reserva não encontrada" });
    if (current.status === "cancelada") return res.status(400).json({ error: "Reserva já cancelada" });

    const canceled = await prisma.reservation.update({
      where: { id },
      data: { status: "cancelada" }
    });
    res.json(canceled);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao cancelar reserva" });
  }
});
