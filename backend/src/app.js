import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { MercadoPagoConfig, Payment } from "mercadopago";
import rateLimit from "express-rate-limit";
import QRCode from "qrcode";
import { PrismaClient } from "@prisma/client";
import path from "path";
import { fileURLToPath } from "url";
import { validarPeriodo } from "./domain/periodo.js";
import { calcularTotal } from "./domain/preco.js";
import { checarConflito, validarCapacidade } from "./domain/reservaService.js";
import { listarQuartosDisponiveis } from "./domain/disponibilidade.js";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();
const defaultDbUrl = `file:${path.resolve(__dirname, "./prisma/dev.db")}`;
export const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL || defaultDbUrl } },
});

const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
const PIX_STUB = process.env.PIX_STUB === "true";
const AVAILABILITY_URL = process.env.AVAILABILITY_URL;
let mpPayment = null;
if (MP_TOKEN) {
  try {
    const mpClient = new MercadoPagoConfig({ accessToken: MP_TOKEN });
    mpPayment = new Payment(mpClient);
  } catch (e) {
    console.warn("[WARN] Falha ao configurar Mercado Pago SDK:", e?.message || e);
  }
} else if (!PIX_STUB) {
  console.warn("[WARN] MP_ACCESS_TOKEN ausente; endpoints de pagamento PIX indisponíveis.");
}

// Segurança básica e CORS por ambiente
app.use(helmet());
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const corsOptions = allowedOrigins.length > 0 ? { origin: allowedOrigins } : {};
app.use(cors(corsOptions));
app.use(express.json());

// Rate limiting básico para endpoints críticos
const reservasLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10,
  message: { error: "Limite de requisições excedido. Tente novamente em instantes." },
});
const pixLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Limite de requisições excedido. Tente novamente em instantes." },
});

// Health check simples com verificação do banco e flags de serviços
app.get("/health", async (req, res) => {
  try {
    await prisma.quarto.count();
    return res.json({
      status: "ok",
      pixStub: PIX_STUB,
      mercadoPago: Boolean(MP_TOKEN),
      availabilityConfigured: Boolean(AVAILABILITY_URL),
    });
  } catch (e) {
    return res.status(503).json({ status: "degraded" });
  }
});

// Seed de desenvolvimento: popula quartos quando o banco está vazio
async function seedDevRooms() {
  try {
    const count = await prisma.quarto.count();
    if (count === 0) {
      await prisma.quarto.createMany({
        data: [
          { nome: "Suíte Master", descricao: "Quarto amplo com vista", precoNoite: 300, capacidade: 2 },
          { nome: "Deluxe", descricao: "Conforto superior", precoNoite: 450, capacidade: 3 },
          { nome: "Família", descricao: "Espaço para todos", precoNoite: 600, capacidade: 5 }
        ]
      });
      console.log("[seed] Quartos de desenvolvimento criados");
    }
  } catch (e) {
    console.warn("[seed] Falha ao aplicar seed de desenvolvimento:", e?.message || e);
  }
}

if (process.env.NODE_ENV !== "production") {
  // dispara sem bloquear o start do servidor
  // (se já houver dados, não faz nada)
  seedDevRooms();
}

// --- Quartos ---
app.get("/api/quartos", async (req, res) => {
  const quartos = await prisma.quarto.findMany();
  res.json(quartos);
});

// --- Reservas ---
app.post("/api/reservas", reservasLimiter, async (req, res) => {
  try {
    const { quartoId, nomeCliente, email, checkin, checkout } = req.body;
    const guestsRaw = req.body.guests ?? 1;

    // Campos obrigatórios
    if (!quartoId || !nomeCliente || !email || !checkin || !checkout) {
      return res.status(400).json({
        error:
          "Campos obrigatórios: quartoId, nomeCliente, email, checkin, checkout",
      });
    }

    // Email válido
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(email))) {
      return res.status(400).json({ error: "Email inválido" });
    }

    // Datas válidas e normalizadas
    let start, end, startMid, endMid;
    try {
      ({ start, end, startMid, endMid } = validarPeriodo(checkin, checkout));
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }

    // Quarto existente
    const quarto = await prisma.quarto.findUnique({
      where: { id: Number(quartoId) },
    });
    if (!quarto) return res.status(404).json({ error: "Quarto não encontrado" });
    let guests;
    try {
      guests = validarCapacidade(guestsRaw, quarto.capacidade);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }

    // Checagem de conflito (sobreposição de períodos)
    const conflito = await checarConflito(prisma, quarto.id, start, end);
    if (conflito) {
      return res
        .status(409)
        .json({ error: "Quarto indisponível no período selecionado" });
    }

    // Cálculo do total no servidor (proteção contra manipulação no cliente)
    const totalCalculado = calcularTotal(quarto.precoNoite, startMid, endMid);

    const reserva = await prisma.reserva.create({
      data: {
        quartoId: quarto.id,
        nomeCliente,
        email,
        checkin: start,
        checkout: end,
        guests,
        total: totalCalculado,
      },
    });

    // Mantém contrato atual (200) para compatibilidade com testes existentes
    return res.json(reserva);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao criar reserva" });
  }
});

// Atualizar reserva
app.put("/api/reservas/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { quartoId, checkin, checkout, guests: guestsRaw } = req.body;

    const atual = await prisma.reserva.findUnique({ where: { id } });
    if (!atual) return res.status(404).json({ error: "Reserva não encontrada" });
    if (atual.status === "cancelada") return res.status(400).json({ error: "Reserva cancelada não pode ser modificada" });

    const quartoIdFinal = Number(quartoId ?? atual.quartoId);
    const quarto = await prisma.quarto.findUnique({ where: { id: quartoIdFinal } });
    if (!quarto) return res.status(404).json({ error: "Quarto não encontrado" });

    const checkinFinal = checkin ?? atual.checkin.toISOString();
    const checkoutFinal = checkout ?? atual.checkout.toISOString();
    let start, end, startMid, endMid;
    try {
      ({ start, end, startMid, endMid } = validarPeriodo(checkinFinal, checkoutFinal));
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }

    let guests;
    try {
      guests = validarCapacidade(guestsRaw ?? 1, quarto.capacidade);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }

    const conflito = await checarConflito(prisma, quarto.id, start, end, id);
    if (conflito) {
      return res.status(409).json({ error: "Conflito de reserva no período solicitado" });
    }

    const total = calcularTotal(quarto.precoNoite, startMid, endMid);
    const atualizado = await prisma.reserva.update({
      where: { id },
      data: { quartoId: quarto.id, checkin: start, checkout: end, guests, total }
    });
    return res.json(atualizado);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao atualizar reserva" });
  }
});

// Consultar reserva por ID
app.get("/api/reservas/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const reserva = await prisma.reserva.findUnique({ where: { id } });
    if (!reserva) return res.status(404).json({ error: "Reserva não encontrada" });
    return res.json(reserva);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao consultar reserva" });
  }
});

// Listar reservas com filtros (quartoId, período sobreposto)
app.get("/api/reservas", async (req, res) => {
  try {
    const { quartoId, inicio, fim } = req.query;
    const where = {};
    if (quartoId) where.quartoId = Number(quartoId);

    if (inicio && fim) {
      let start, end;
      try {
        ({ start, end } = validarPeriodo(String(inicio), String(fim)));
      } catch (e) {
        return res.status(400).json({ error: e.message });
      }
      where.NOT = {
        OR: [
          { checkout: { lte: start } },
          { checkin: { gte: end } },
        ],
      };
    } else if ((inicio && !fim) || (!inicio && fim)) {
      return res.status(400).json({ error: "Parâmetros de período requerem inicio e fim" });
    }

    const reservas = await prisma.reserva.findMany({ where });
    return res.json(reservas);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao listar reservas" });
  }
});

// --- Disponibilidade ---
app.get("/api/disponibilidade", async (req, res) => {
  try {
    const { checkin, checkout, guests } = req.query;
    if (!checkin || !checkout || !guests) {
      return res.status(400).json({ error: "Parâmetros obrigatórios: checkin, checkout, guests" });
    }

    // Se houver microserviço configurado, tenta consultar; em erro, cai para cálculo local
    if (AVAILABILITY_URL) {
      try {
        const url = new URL("/availability", AVAILABILITY_URL);
        url.searchParams.set("checkin", String(checkin));
        url.searchParams.set("checkout", String(checkout));
        url.searchParams.set("guests", String(guests));
        const resp = await fetch(url);
        if (resp.ok) {
          const data = await resp.json();
          return res.json(data);
        }
        console.warn("[availability] resposta não-ok do serviço externo, usando cálculo local:", resp.status);
      } catch (err) {
        console.warn("[availability] falha ao consultar serviço externo, usando cálculo local:", err?.message || err);
      }
    }

    const resultado = await listarQuartosDisponiveis(prisma, String(checkin), String(checkout), Number(guests));
    return res.json(resultado);
  } catch (e) {
    if (/hóspedes inválido/i.test(e.message) || /Parâmetros obrigatórios/i.test(e.message)) {
      return res.status(400).json({ error: e.message });
    }
    console.error(e);
    return res.status(500).json({ error: "Erro ao consultar disponibilidade" });
  }
});

// Cancelar reserva
app.delete("/api/reservas/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const atual = await prisma.reserva.findUnique({ where: { id } });
    if (!atual) return res.status(404).json({ error: "Reserva não encontrada" });
    if (atual.status === "cancelada") return res.status(400).json({ error: "Reserva já cancelada" });

    const cancelada = await prisma.reserva.update({
      where: { id },
      data: { status: "cancelada" }
    });
    return res.json(cancelada);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao cancelar reserva" });
  }
});

// --- Pagamento PIX ---
app.post("/api/pagamento/pix", pixLimiter, async (req, res) => {
  try {
    const { email, total } = req.body;

    if (PIX_STUB) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(email)) || Number(total) <= 0) {
        return res.status(400).json({ error: "Email ou total inválido" });
      }
      const code = `PIX-STUB|email:${email}|total:${Number(total).toFixed(2)}|ts:${Date.now()}`;
      const qrDataUrl = await QRCode.toDataURL(code);
      return res.json({
        qr_code_base64: qrDataUrl.replace(/^data:image\/png;base64,/, ""),
        qr_code: code,
        id: `stub-${Date.now()}`,
      });
    }

    if (!MP_TOKEN) {
      return res
        .status(503)
        .json({ error: "Pagamento PIX indisponível: token não configurado" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(email)) || Number(total) <= 0) {
      return res.status(400).json({ error: "Email ou total inválido" });
    }

    const payment = await mpPayment.create({
      body: {
        transaction_amount: Number(total),
        description: "Reserva de hotel",
        payment_method_id: "pix",
        payer: { email },
      }
    });
    const body = payment?.body ?? payment;
    res.json({
      qr_code_base64: body?.point_of_interaction?.transaction_data?.qr_code_base64,
      qr_code: body?.point_of_interaction?.transaction_data?.qr_code,
      id: body?.id,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao gerar pagamento PIX" });
  }
});

const PORT = process.env.PORT || 4000;
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, "0.0.0.0", () =>
    console.log(`Servidor rodando em http://0.0.0.0:${PORT}`),
  );
}

export default app;
