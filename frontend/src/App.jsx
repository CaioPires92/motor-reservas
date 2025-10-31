import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export default function App() {
    const [quartos, setQuartos] = useState([]);
    const [reserva, setReserva] = useState({ nomeCliente: "", email: "", checkin: "", checkout: "", quartoId: "", guests: 1 });
    const [status, setStatus] = useState({ type: null, message: "" });
    const [pix, setPix] = useState(null);

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
                    <div key={q.id} className="bg-white shadow-lg rounded-xl p-4">
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
                    <button onClick={handleReserva} className="bg-green-600 text-white px-4 py-2 rounded mt-4">Reservar</button>
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
