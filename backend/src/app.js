import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mercadopago from "mercadopago";
import { PrismaClient } from "@prisma/client";

dotenv.config();
const app = express();
const prisma = new PrismaClient();

mercadopago.configure({ access_token: process.env.MP_ACCESS_TOKEN });

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
        data: { quartoId, nomeCliente, email, checkin: new Date(checkin), checkout: new Date(checkout), total },
    });
    res.json(reserva);
});

// --- Pagamento PIX ---
app.post("/api/pagamento/pix", async (req, res) => {
    try {
        const { email, total } = req.body;
        const payment = await mercadopago.payment.create({
            transaction_amount: Number(total),
            description: "Reserva de hotel",
            payment_method_id: "pix",
            payer: { email },
        });
        res.json({
            qr_code_base64: payment.body.point_of_interaction.transaction_data.qr_code_base64,
            qr_code: payment.body.point_of_interaction.transaction_data.qr_code,
            id: payment.body.id,
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erro ao gerar pagamento PIX" });
    }
});

app.listen(4000, () => console.log("Servidor rodando em http://localhost:4000"));
