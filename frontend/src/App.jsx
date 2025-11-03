import React, { useEffect, useState } from "react";
import axios from "axios";
import StatusToast from "./components/StatusToast.jsx";
import PixPanel from "./components/PixPanel.jsx";
import Header from "./components/Header.jsx";
import RoomGrid from "./components/RoomGrid.jsx";
import CheckoutForm from "./components/CheckoutForm.jsx";
import CardPaymentBrick from "./components/CardPaymentBrick.jsx";
import ConfirmModal from "./components/ConfirmModal.jsx";
import { calculateNights, formatBRL } from "./utils/price.js";
import ReservationHistory from "./components/ReservationHistory.jsx";

// Em desenvolvimento, force usar o proxy "/api" do Vite para evitar
// dependência de VITE_API_URL apontando para portas inconsistentes.
const API_BASE = import.meta.env.MODE === "production"
    ? (import.meta.env.VITE_API_URL || "/api")
    : "/api";

export default function App() {
    const [quartos, setQuartos] = useState([]);
    const [reserva, setReserva] = useState({ nomeCliente: "", email: "", checkin: "", checkout: "", quartoId: "", guests: 1 });
    const [status, setStatus] = useState({ type: null, message: "" });
    const [pix, setPix] = useState(null);
    const [disponiveis, setDisponiveis] = useState([]);
    const [dispCarregada, setDispCarregada] = useState(false);
    const [loadingQuartos, setLoadingQuartos] = useState(true);
    const [loadingDisp, setLoadingDisp] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('pix');
    const [showCard, setShowCard] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [lastReservaId, setLastReservaId] = useState(null);

    useEffect(() => {
        axios
            .get(`${API_BASE}/quartos`)
            .then(r => {
                setQuartos(r.data);
                setLoadingQuartos(false);
            })
            .catch(err => {
                const msg = err?.response?.data?.error || err?.message || "Falha ao carregar quartos";
                setStatus({ type: "error", message: `Erro ao carregar quartos: ${msg}` });
                setLoadingQuartos(false);
            });
    }, []);

    const handleReserva = async () => {
        setStatus({ type: null, message: "" });
        setPix(null);
        try {
            const quartoSelecionado = quartos.find(q => q.id === Number(reserva.quartoId));
            if (!quartoSelecionado) {
                setStatus({ type: "error", message: "Quarto selecionado inválido" });
                return;
            }

            // Se disponibilidade foi checada, garanta que o quarto está disponível
            if (dispCarregada && !disponiveis.includes(Number(reserva.quartoId))) {
                setStatus({ type: "error", message: "Quarto indisponível para o período e hóspedes informados" });
                return;
            }

            const checkinDate = new Date(reserva.checkin);
            const checkoutDate = new Date(reserva.checkout);
            const diffMs = checkoutDate - checkinDate;
            const noites = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) || 1);
            const total = noites * Number(quartoSelecionado.precoNoite);

            const payload = {
                quartoId: Number(reserva.quartoId),
                nomeCliente: reserva.nomeCliente,
                email: reserva.email,
                checkin: reserva.checkin,
                checkout: reserva.checkout,
                guests: Number(reserva.guests || 1),
                total,
            };

            const { data } = await axios.post(`${API_BASE}/reservas`, payload);
            setStatus({ type: "success", message: `Reserva criada! ID ${data.id}. Total: R$ ${Number(data.total).toFixed(2)}` });
            setLastReservaId(data.id);
            setShowConfirm(true);

            // Gera PIX automaticamente
            if (paymentMethod === 'pix') {
              try {
                const { data: pixData } = await axios.post(`${API_BASE}/pagamento/pix`, {
                    email: reserva.email,
                    total: data.total,
                    reservaId: data.id,
                });
                setPix(pixData);
              } catch (e) {
                const msg = e?.response?.data?.error || "Falha ao gerar PIX";
                setStatus({ type: "error", message: msg });
              }
            } else {
              // Cartão: exibir o Brick para pagamento
              setShowCard(true);
            }
        } catch (err) {
            const msg = err?.response?.data?.error || "Falha ao criar reserva";
            setStatus({ type: "error", message: msg });
        }
    };

    const checarDisponibilidade = async () => {
        setStatus({ type: null, message: "" });
        setPix(null);
        setDispCarregada(false);
        setDisponiveis([]);
        setLoadingDisp(true);
        try {
            if (!reserva.checkin || !reserva.checkout || !reserva.guests) {
                setStatus({ type: "error", message: "Informe check-in, check-out e hóspedes para consultar disponibilidade" });
                setLoadingDisp(false);
                return;
            }
            const { data } = await axios.get(`${API_BASE}/disponibilidade`, {
                params: {
                    checkin: reserva.checkin,
                    checkout: reserva.checkout,
                    guests: Number(reserva.guests || 1),
                },
            });
            const ids = (data?.availableRooms || []).map(r => r.id);
            setDisponiveis(ids);
            setDispCarregada(true);
            setLoadingDisp(false);
            if (reserva.quartoId) {
                const disponivel = ids.includes(Number(reserva.quartoId));
                setStatus({ type: disponivel ? "success" : "error", message: disponivel ? "Quarto selecionado está disponível" : "Quarto selecionado não está disponível; escolha outro" });
            } else {
                setStatus({ type: "success", message: `Encontrados ${ids.length} quartos disponíveis` });
            }
        } catch (e) {
            const msg = e?.response?.data?.error || e?.message || "Falha ao consultar disponibilidade";
            setStatus({ type: "error", message: msg });
            setLoadingDisp(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="container-app py-8">
            {reserva.quartoId && dispCarregada && !disponiveis.includes(Number(reserva.quartoId)) && (
              <div className="rounded border border-amber-200 bg-amber-50 text-amber-800 p-3 mb-4">
                Quarto selecionado não está disponível; escolha outro.
              </div>
            )}
            <StatusToast
              type={status.type}
              message={status.message}
              onDismiss={() => setStatus({ type: null, message: "" })}
            />
            <RoomGrid
              rooms={quartos}
              loading={loadingQuartos}
              availableIds={dispCarregada ? disponiveis : null}
              onSelect={(room) => setReserva({ ...reserva, quartoId: room.id })}
              nights={calculateNights(reserva.checkin, reserva.checkout)}
              formatBRL={formatBRL}
            />

            {reserva.quartoId && (
              <>
                <CheckoutForm
                  reserva={reserva}
                  setReserva={setReserva}
                  loadingDisp={loadingDisp}
                  dispCarregada={dispCarregada}
                  disponiveis={disponiveis}
                  onCheckAvailability={checarDisponibilidade}
                  onReserve={handleReserva}
                  status={status}
                  selectedRoom={quartos.find(q => q.id === Number(reserva.quartoId))}
                  paymentMethod={paymentMethod}
                  setPaymentMethod={setPaymentMethod}
                />
                {paymentMethod === 'pix' && <PixPanel pix={pix} />}
                {paymentMethod === 'card' && showCard && (
                  <CardPaymentBrick
                    publicKey={import.meta.env.VITE_MP_PUBLIC_KEY}
                    amount={Number(quartos.find(q => q.id === Number(reserva.quartoId))?.precoNoite || 0) * (calculateNights(reserva.checkin, reserva.checkout) || 0)}
                    email={reserva.email}
                    reservaId={lastReservaId}
                    apiBase={API_BASE}
                    onPaid={() => setStatus({ type: 'success', message: 'Pagamento aprovado' })}
                    onError={(e) => setStatus({ type: 'error', message: e?.message || 'Erro no pagamento' })}
                  />
                )}
              </>
            )}

            <ReservationHistory apiBase={API_BASE} />

            </main>
            <ConfirmModal
              open={showConfirm}
              onClose={() => setShowConfirm(false)}
              reservaId={lastReservaId}
              pix={pix}
              apiBase={API_BASE}
            />
        </div>
    );
}
