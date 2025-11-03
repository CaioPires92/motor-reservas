import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import * as Sentry from "@sentry/node";
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
// confiar no proxy (Render/Netlify) para IPs e headers corretos
app.set("trust proxy", 1);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("[FATAL] DATABASE_URL não configurada. Defina uma URL PostgreSQL válida.");
  // Em produção no Render, configure via Settings → Environment → DATABASE_URL
}
export const prisma = new PrismaClient({
  datasources: { db: { url: databaseUrl } },
});

// Sentry (opcional)
const SENTRY_DSN = process.env.SENTRY_DSN;
if (SENTRY_DSN) {
  try {
    Sentry.init({ dsn: SENTRY_DSN, environment: process.env.NODE_ENV || "production" });
    app.use(Sentry.Handlers.requestHandler());
  } catch (e) {
    console.warn("[sentry] falha ao inicializar:", e?.message || e);
  }
}

const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
const PIX_STUB = process.env.PIX_STUB === "true";
const AVAILABILITY_URL = process.env.AVAILABILITY_URL;
const FETCH_TIMEOUT_MS = Number(process.env.AVAILABILITY_TIMEOUT_MS || 3000);
const ENABLE_ERROR_TEST = process.env.ENABLE_ERROR_TEST === "true";
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

// Segurança básica, compressão e CORS por ambiente
app.use(helmet());
app.use(compression());
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const corsOptions = allowedOrigins.length > 0 
  ? { origin: allowedOrigins, exposedHeaders: ["X-Total-Count"] }
  : { exposedHeaders: ["X-Total-Count"] };
app.use(cors(corsOptions));
app.use(express.json());

// Rate limiting básico para endpoints críticos (parametrizável por env)
const RL_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60 * 1000);
const RL_RES_MAX = Number(process.env.RATE_LIMIT_RESERVAS_MAX || 10);
const RL_PIX_MAX = Number(process.env.RATE_LIMIT_PIX_MAX || 10);
// Em ambiente de teste, não aplicar rate limiting para evitar timers/handles abertos
const useLimiter = process.env.NODE_ENV !== "test";
let reservasLimiterMw, pixLimiterMw, cardLimiterMw;
if (useLimiter) {
  const reservasLimiter = rateLimit({
    windowMs: RL_WINDOW_MS,
    max: RL_RES_MAX,
    message: { error: "Limite de requisições excedido. Tente novamente em instantes." },
  });
  const pixLimiter = rateLimit({
    windowMs: RL_WINDOW_MS,
    max: RL_PIX_MAX,
    message: { error: "Limite de requisições excedido. Tente novamente em instantes." },
  });
  const cardLimiter = pixLimiter;
  reservasLimiterMw = reservasLimiter;
  pixLimiterMw = pixLimiter;
  cardLimiterMw = cardLimiter;
} else {
  const pass = (req, res, next) => next();
  reservasLimiterMw = pass;
  pixLimiterMw = pass;
  cardLimiterMw = pass;
}

// Health check simples com verificação do banco e flags de serviços
app.get("/health", async (req, res) => {
  try {
    await prisma.quarto.count();
    return res.json({
      status: "ok",
      pixStub: PIX_STUB,
      mercadoPago: Boolean(MP_TOKEN),
      availabilityConfigured: Boolean(AVAILABILITY_URL),
      commit: process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT_SHA || null,
    });
  } catch (e) {
    return res.status(503).json({ status: "degraded" });
  }
});

// Endpoint opcional para validar Sentry no backend (habilite via ENABLE_ERROR_TEST=true)
if (ENABLE_ERROR_TEST) {
  app.get("/error-test", (req, res) => {
    throw new Error("Sentry backend test error");
  });
}

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
app.post("/api/reservas", reservasLimiterMw, async (req, res) => {
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

    let reserva;
    try {
      reserva = await prisma.reserva.create({
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
    } catch (err) {
      const msg = String(err?.message || '').toLowerCase();
      if (msg.includes('exclusion') || msg.includes('reserva_no_overlap')) {
        return res.status(409).json({ error: "Quarto indisponível no período selecionado" });
      }
      throw err;
    }

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
    let atualizado;
    try {
      atualizado = await prisma.reserva.update({
        where: { id },
        data: { quartoId: quarto.id, checkin: start, checkout: end, guests, total }
      });
    } catch (err) {
      const msg = String(err?.message || '').toLowerCase();
      if (msg.includes('exclusion') || msg.includes('reserva_no_overlap')) {
        return res.status(409).json({ error: "Conflito de reserva no período solicitado" });
      }
      throw err;
    }
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
    const { quartoId, inicio, fim, email } = req.query;
    const where = {};
    if (quartoId) where.quartoId = Number(quartoId);
    if (email) where.email = String(email);

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

    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;
    const [total, reservas] = await Promise.all([
      prisma.reserva.count({ where }),
      prisma.reserva.findMany({ where, orderBy: { criadoEm: 'desc' }, include: { quarto: true }, take: limit, skip })
    ]);
    res.setHeader("X-Total-Count", String(total));
    return res.json(reservas);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao listar reservas" });
  }
});

// Histórico minimalista por e-mail (retorna apenas campos relevantes)
app.get("/api/reservas/historico", async (req, res) => {
  try {
    const email = String(req.query.email || "").trim();
    if (!email) return res.status(400).json({ error: "Parâmetro 'email' é obrigatório" });
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;
    const where = { email };
    const select = {
      id: true,
      status: true,
      total: true,
      checkin: true,
      checkout: true,
      quarto: { select: { nome: true } },
    };
    const [total, reservas] = await Promise.all([
      prisma.reserva.count({ where }),
      prisma.reserva.findMany({ where, orderBy: { criadoEm: 'desc' }, select, take: limit, skip })
    ]);
    res.setHeader("X-Total-Count", String(total));
    return res.json(reservas);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao listar histórico" });
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
        const ac = new AbortController();
        const to = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
        const resp = await fetch(url, { signal: ac.signal });
        clearTimeout(to);
        if (resp.ok) {
          const data = await resp.json();
          return res.json(data);
        }
        console.warn("[availability] resposta não-ok do serviço externo, usando cálculo local:", resp.status);
      } catch (err) {
        const aborted = (err && (err.name === 'AbortError' || /aborted|abort/i.test(String(err.name||'')+String(err.message||''))));
        console.warn("[availability] falha ao consultar serviço externo, usando cálculo local:", aborted ? `timeout ${FETCH_TIMEOUT_MS}ms` : (err?.message || err));
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
app.post("/api/pagamento/pix", pixLimiterMw, async (req, res) => {
  try {
    const { email, total, reservaId } = req.body;

    if (reservaId && Number.isFinite(Number(reservaId))) {
      const r = await prisma.reserva.findUnique({ where: { id: Number(reservaId) } });
      if (!r) return res.status(404).json({ error: "Reserva não encontrada para gerar PIX" });
    }

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
        external_reference: reservaId ? String(reservaId) : undefined,
      }
    });
    const body = payment?.body ?? payment;
    // associa o pagamento à reserva, se informado
    try {
      if (reservaId && body?.id) {
        await prisma.reserva.update({
          where: { id: Number(reservaId) },
          data: { mpPaymentId: String(body.id) }
        });
      }
    } catch (e) {
      console.warn("[pix] falha ao vincular mpPaymentId à reserva:", e?.message || e);
    }
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

// Pagamento com Cartão (Mercado Pago)
app.post("/api/pagamento/cartao", cardLimiterMw, async (req, res) => {
  try {
    if (!MP_TOKEN) {
      return res.status(503).json({ error: "Cartão indisponível: token não configurado" });
    }
    const { token, email, total, installments, payment_method_id, issuer_id, reservaId } = req.body || {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(email)) || Number(total) <= 0 || !token || !payment_method_id) {
      return res.status(400).json({ error: "Dados inválidos: token, email, total e payment_method_id são obrigatórios" });
    }
    if (reservaId && Number.isFinite(Number(reservaId))) {
      const r = await prisma.reserva.findUnique({ where: { id: Number(reservaId) } });
      if (!r) return res.status(404).json({ error: "Reserva não encontrada para pagamento" });
    }

    const payment = await mpPayment.create({
      body: {
        transaction_amount: Number(total),
        description: "Reserva de hotel",
        token: String(token),
        installments: Number(installments || 1),
        payment_method_id: String(payment_method_id),
        issuer_id: issuer_id ? String(issuer_id) : undefined,
        payer: { email: String(email) },
        external_reference: reservaId ? String(reservaId) : undefined,
      }
    });
    const body = payment?.body ?? payment;
    try {
      if (reservaId && body?.id) {
        const updates = { mpPaymentId: String(body.id) };
        if (String(body?.status).toLowerCase() === 'approved') updates.status = 'paga';
        await prisma.reserva.update({ where: { id: Number(reservaId) }, data: updates });
      }
    } catch (e) {
      console.warn("[card] falha ao vincular mpPaymentId/status à reserva:", e?.message || e);
    }
    return res.json({ id: body?.id, status: body?.status, status_detail: body?.status_detail });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao processar pagamento com cartão" });
  }
});

// Consulta status de pagamento no Mercado Pago (PIX ou cartão)
app.get("/api/pagamento/status/:id", async (req, res) => {
  try {
    if (!MP_TOKEN || !mpPayment) {
      return res.status(503).json({ error: "Consulta indisponível: token não configurado" });
    }
    const pid = String(req.params.id);
    const payment = await mpPayment.get({ id: pid });
    const body = payment?.body ?? payment;
    return res.json({ id: body?.id, status: body?.status, status_detail: body?.status_detail, reservaId: body?.external_reference || null });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao consultar status do pagamento" });
  }
});

// Webhook do Mercado Pago para atualizar status da reserva
// Configure a URL no painel do MP apontando para: /api/webhooks/mercadopago
app.all("/api/webhooks/mercadopago", express.json({ type: "application/json" }), async (req, res) => {
  try {
    if (!MP_TOKEN || !mpPayment) {
      return res.status(503).json({ ok: false });
    }
    const q = req.query || {};
    const b = (req.body && typeof req.body === 'object') ? req.body : {};
    const paymentId = q.id || q["data.id"] || b?.data?.id || b?.id;
    if (!paymentId) {
      return res.status(200).json({ ok: true }); // ignora eventos irrelevantes
    }
    // Obtém pagamento no MP
    const payment = await mpPayment.get({ id: String(paymentId) });
    const body = payment?.body ?? payment;
    const status = String(body?.status || '').toLowerCase();
    const externalRef = body?.external_reference;
    if (!externalRef) {
      return res.status(200).json({ ok: true });
    }
    const reservaIdNum = Number(externalRef);
    if (!Number.isFinite(reservaIdNum)) {
      return res.status(200).json({ ok: true });
    }
    const atual = await prisma.reserva.findUnique({ where: { id: reservaIdNum } });
    if (atual) {
      const novoStatus = status === 'approved' ? 'paga' : (status === 'cancelled' || status === 'rejected') ? 'cancelada' : null;
      const updates = {};
      if (novoStatus && atual.status !== novoStatus) updates.status = novoStatus;
      if (body?.id && atual.mpPaymentId !== String(body.id)) updates.mpPaymentId = String(body.id);
      if (Object.keys(updates).length > 0) {
        await prisma.reserva.update({ where: { id: reservaIdNum }, data: updates });
      }
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[mp-webhook] erro:", e);
    return res.status(200).json({ ok: true }); // evita reentregas agressivas
  }
});

const PORT = process.env.PORT || 4000;
let server;
if (process.env.NODE_ENV !== "test") {
  server = app.listen(PORT, "0.0.0.0", () =>
    console.log(`Servidor rodando em http://0.0.0.0:${PORT}`),
  );
}

async function gracefulShutdown() {
  try {
    await prisma.$disconnect();
  } catch (_) {}
  if (server && server.listening) {
    server.close(() => process.exit(0));
  } else {
    process.exit(0);
  }
}
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Sentry error handler no final (se habilitado)
if (SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

export default app;
