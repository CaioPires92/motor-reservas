import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export default function App() {
    const [quartos, setQuartos] = useState([]);
    const [reserva, setReserva] = useState({ nomeCliente: "", email: "", checkin: "", checkout: "", quartoId: "", guests: 1 });
    const [status, setStatus] = useState({ type: null, message: "" });
    const [pix, setPix] = useState(null);
    const [disponiveis, setDisponiveis] = useState([]);
    const [dispCarregada, setDispCarregada] = useState(false);

    useEffect(() => {
        axios
            .get(`${API_BASE}/quartos`)
            .then(r => setQuartos(r.data))
            .catch(err => {
                const msg = err?.response?.data?.error || err?.message || "Falha ao carregar quartos";
                setStatus({ type: "error", message: `Erro ao carregar quartos: ${msg}` });
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
            setStatus({ type: "success", message: `Reserva criada! ID ${data.id}. Total: R$ ${data.total.toFixed(2)}` });

            // Gera PIX automaticamente
            try {
                const { data: pixData } = await axios.post(`${API_BASE}/pagamento/pix`, {
                    email: reserva.email,
                    total: data.total,
                });
                setPix(pixData);
            } catch (e) {
                const msg = e?.response?.data?.error || "Falha ao gerar PIX";
                setStatus({ type: "error", message: msg });
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
        try {
            if (!reserva.checkin || !reserva.checkout || !reserva.guests) {
                setStatus({ type: "error", message: "Informe check-in, check-out e hóspedes para consultar disponibilidade" });
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
            if (reserva.quartoId) {
                const disponivel = ids.includes(Number(reserva.quartoId));
                setStatus({ type: disponivel ? "success" : "error", message: disponivel ? "Quarto selecionado está disponível" : "Quarto selecionado não está disponível; escolha outro" });
            } else {
                setStatus({ type: "success", message: `Encontrados ${ids.length} quartos disponíveis` });
            }
        } catch (e) {
            const msg = e?.response?.data?.error || e?.message || "Falha ao consultar disponibilidade";
            setStatus({ type: "error", message: msg });
        }
    };

    return (
        <div className="p-8 bg-gray-100 min-h-screen">
            <h1 className="text-3xl font-bold mb-4">Hotel Reserva</h1>
            {status.type === "error" && (
                <p className="text-red-700 bg-red-100 border border-red-300 rounded p-3 mb-4">
                    {status.message}
                </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {quartos.map(q => (
                    <div key={q.id} className={`bg-white shadow-lg rounded-xl p-4 ${dispCarregada ? (disponiveis.includes(q.id) ? "border-green-400 border" : "opacity-60") : ""}`}>
                        <h2 className="text-xl font-semibold">{q.nome}</h2>
                        <p>{q.descricao}</p>
                        <p className="font-bold mt-2">R$ {q.precoNoite.toFixed(2)} / noite</p>
                        <p className="text-sm text-gray-500">Capacidade: {q.capacidade}</p>
                        <button
                            onClick={() => setReserva({ ...reserva, quartoId: q.id })}
                            className="bg-blue-500 text-white px-4 py-2 rounded mt-3"
                        >
                            Selecionar
                        </button>
                    </div>
                ))}
            </div>

            {reserva.quartoId && (
                <div className="mt-8 bg-white p-6 rounded-xl shadow-md">
                    <h2 className="text-2xl font-semibold mb-2">Finalizar Reserva</h2>
                    <div className="flex flex-wrap gap-2">
                        <input type="text" placeholder="Nome" className="border p-2" onChange={e => setReserva({ ...reserva, nomeCliente: e.target.value })} />
                        <input type="email" placeholder="Email" className="border p-2" onChange={e => setReserva({ ...reserva, email: e.target.value })} />
                        <input type="date" className="border p-2" onChange={e => setReserva({ ...reserva, checkin: e.target.value })} />
                        <input type="date" className="border p-2" onChange={e => setReserva({ ...reserva, checkout: e.target.value })} />
                        <input type="number" min={1} className="border p-2 w-24" placeholder="Hóspedes" onChange={e => setReserva({ ...reserva, guests: e.target.value })} />
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button onClick={checarDisponibilidade} className="bg-indigo-600 text-white px-4 py-2 rounded">Checar disponibilidade</button>
                        <button
                            onClick={handleReserva}
                            className="bg-green-600 text-white px-4 py-2 rounded"
                            disabled={dispCarregada && !disponiveis.includes(Number(reserva.quartoId))}
                        >
                            Reservar
                        </button>
                    </div>
                    {status.type === "success" && <p className="text-green-700 mt-3">{status.message}</p>}
                    {status.type === "error" && <p className="text-red-700 mt-3">{status.message}</p>}

                    {pix && (
                        <div className="mt-6">
                            <h3 className="text-xl font-semibold mb-2">Pague com PIX</h3>
                            {pix.qr_code_base64 && (
                                <img
                                    alt="QR Code PIX"
                                    className="w-64 h-64 border rounded"
                                    src={`data:image/png;base64,${pix.qr_code_base64}`}
                                />
                            )}
                            {pix.qr_code && (
                                <div className="mt-3">
                                    <p className="text-sm text-gray-600">Copia e Cola:</p>
                                    <textarea
                                        readOnly
                                        className="w-full h-24 border p-2 text-xs"
                                        value={pix.qr_code}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}
