import React, { useEffect, useState } from "react";
import axios from "axios";

export default function App() {
    const [quartos, setQuartos] = useState([]);
    const [reserva, setReserva] = useState({ nomeCliente: "", email: "", checkin: "", checkout: "", quartoId: "", total: 0 });
    const [pix, setPix] = useState(null);

    useEffect(() => {
        axios.get("http://localhost:4000/api/quartos").then(r => setQuartos(r.data));
    }, []);

    const handleReserva = async () => {
        await axios.post("http://localhost:4000/api/reservas", reserva);
        const pagamento = await axios.post("http://localhost:4000/api/pagamento/pix", {
            email: reserva.email,
            total: reserva.total,
        });
        setPix(pagamento.data);
    };

    return (
        <div className="p-8 bg-gray-100 min-h-screen">
            <h1 className="text-3xl font-bold mb-4">Hotel Reserva</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {quartos.map(q => (
                    <div key={q.id} className="bg-white shadow-lg rounded-xl p-4">
                        <h2 className="text-xl font-semibold">{q.nome}</h2>
                        <p>{q.descricao}</p>
                        <p className="font-bold mt-2">R$ {q.precoNoite.toFixed(2)} / noite</p>
                        <button
                            onClick={() => setReserva({ ...reserva, quartoId: q.id, total: q.precoNoite })}
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
                    <input type="text" placeholder="Nome" className="border p-2 mr-2" onChange={e => setReserva({ ...reserva, nomeCliente: e.target.value })} />
                    <input type="email" placeholder="Email" className="border p-2 mr-2" onChange={e => setReserva({ ...reserva, email: e.target.value })} />
                    <button onClick={handleReserva} className="bg-green-600 text-white px-4 py-2 rounded mt-4">Gerar PIX</button>
                </div>
            )}

            {pix && (
                <div className="mt-8 text-center">
                    <h3 className="text-xl font-bold mb-2">Escaneie o QR Code PIX:</h3>
                    <img src={`data:image/png;base64,${pix.qr_code_base64}`} alt="QR Code Pix" className="mx-auto" />
                    <p className="mt-4 text-gray-700 break-all">{pix.qr_code}</p>
                </div>
            )}
        </div>
    );
}
