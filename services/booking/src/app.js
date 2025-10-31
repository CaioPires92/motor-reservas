import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import fetch from "node-fetch";
import mercadopago from "mercadopago";

dotenv.config();
export const app = express();
export const prisma = new PrismaClient();
const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
if (MP_TOKEN) {
  mercadopago.configure({ access_token: MP_TOKEN });
} else {
  console.warn("[WARN] MP_ACCESS_TOKEN ausente; endpoints de pagamento PIX indisponíveis.");
}

app.use(cors());
app.use(express.json());

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
app.post("/reservas", async (req, res) => {
  try {
    const { roomId, checkin, checkout, guests = 1, nomeCliente, email } = req.body;
    if (!roomId || !checkin || !checkout || !nomeCliente || !email) {
      return res.status(400).json({ error: "Campos obrigatórios: roomId, checkin, checkout, nomeCliente, email" });
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
app.post("/pagamento/pix", async (req, res) => {
  try {
    if (!MP_TOKEN) {
      return res.status(503).json({ error: "Pagamento PIX indisponível: token não configurado" });
    }
    const { email, total } = req.body;
    const payment = await mercadopago.payment.create({
      transaction_amount: Number(total),
      description: "Reserva de hotel",
      payment_method_id: "pix",
      payer: { email }
    });
    return res.json({
      qr_code_base64: payment.body.point_of_interaction.transaction_data.qr_code_base64,
      qr_code: payment.body.point_of_interaction.transaction_data.qr_code,
      id: payment.body.id
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
