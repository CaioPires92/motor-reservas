import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import rateLimit from "express-rate-limit";

dotenv.config();
export const app = express();
export const prisma = new PrismaClient();

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

// Rate limiting para consultas de disponibilidade
const RATE_LIMIT_AVAILABILITY_WINDOW_MS = Number(process.env.RATE_LIMIT_AVAILABILITY_WINDOW_MS || 60 * 1000);
const RATE_LIMIT_AVAILABILITY_MAX = Number(process.env.RATE_LIMIT_AVAILABILITY_MAX || 10);
const availabilityLimiter = rateLimit({
  windowMs: RATE_LIMIT_AVAILABILITY_WINDOW_MS,
  max: RATE_LIMIT_AVAILABILITY_MAX,
  message: { error: "Limite de requisições excedido. Tente novamente em 1 minuto." }
});

// Healthcheck
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// GET /availability?checkin=YYYY-MM-DD&checkout=YYYY-MM-DD&guests=2
app.get("/availability", availabilityLimiter, async (req, res) => {
  try {
    const { checkin, checkout, guests } = req.query;

    // Basic validation
    if (!checkin || !checkout) {
      return res.status(400).json({ error: "Parâmetros 'checkin' e 'checkout' são obrigatórios" });
    }

    const start = new Date(checkin);
    const end = new Date(checkout);
    const guestsNum = Number(guests || 1);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Datas inválidas" });
    }
    if (start >= end) {
      return res.status(400).json({ error: "'checkin' deve ser anterior a 'checkout'" });
    }
    if (guestsNum <= 0) {
      return res.status(400).json({ error: "Número de hóspedes deve ser positivo" });
    }

    // Rooms that support the given guests
    const rooms = await prisma.room.findMany({
      where: { capacity: { gte: guestsNum } }
    });

    if (!rooms.length) {
      return res.json({ availableRooms: [], totalAvailable: 0, dateRange: { checkin, checkout } });
    }

    // Find reservations that overlap the range for those rooms
    const roomIds = rooms.map(r => r.id);
    const overlapping = await prisma.reservation.findMany({
      where: {
        roomId: { in: roomIds },
        NOT: {
          OR: [
            { checkout: { lte: start } },
            { checkin: { gte: end } }
          ]
        }
      }
    });

    const bookedRoomIds = new Set(overlapping.map(r => r.roomId));
    const availableRooms = rooms.filter(r => !bookedRoomIds.has(r.id));

    return res.json({
      availableRooms,
      totalAvailable: availableRooms.length,
      dateRange: { checkin, checkout }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao consultar disponibilidade" });
  }
});
