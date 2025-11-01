import React from "react";

export default function CheckoutForm({
  reserva,
  setReserva,
  loadingDisp,
  dispCarregada,
  disponiveis,
  onCheckAvailability,
  onReserve,
  status,
  selectedRoom,
  paymentMethod,
  setPaymentMethod,
}) {
  const emailValid = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
  const dateValid = (v) => Boolean(v) && !Number.isNaN(new Date(v).getTime());
  const gt = (a, b) => new Date(a).getTime() < new Date(b).getTime();
  const guestsValid = (g) => Number(g) >= 1;

  const errors = {
    nomeCliente: !reserva.nomeCliente ? "Informe seu nome" : null,
    email: !reserva.email ? "Informe seu email" : (!emailValid(reserva.email) ? "Email inválido" : null),
    checkin: !dateValid(reserva.checkin) ? "Check-in inválido" : null,
    checkout: !dateValid(reserva.checkout) ? "Check-out inválido" : (!dateValid(reserva.checkin) || !gt(reserva.checkin, reserva.checkout) ? "Checkout deve ser após o check-in" : null),
    guests: !guestsValid(reserva.guests) ? "Hóspedes deve ser >= 1" : null,
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const reserveDisabled = (dispCarregada && !disponiveis.includes(Number(reserva.quartoId))) || hasErrors;

  return (
    <div className="mt-8 card p-6">
      <h2 className="text-2xl font-semibold mb-2">Finalizar Reserva</h2>
      {/* Método de pagamento */}
      <div className="mb-3">
        <label className="block text-sm text-gray-600 mb-1">Método de pagamento</label>
        <div className="inline-flex rounded-md overflow-hidden border border-gray-200 dark:border-gray-700">
          <button type="button" className={`px-4 py-2 text-sm ${paymentMethod === 'pix' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200'}`} onClick={() => setPaymentMethod('pix')} data-cy="pm-pix-a">PIX</button>
          <button type="button" className={`px-4 py-2 text-sm border-l border-gray-200 dark:border-gray-700 ${paymentMethod === 'card' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-200'}`} onClick={() => setPaymentMethod('card')} data-cy="pm-card-a">Cartão</button>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <label htmlFor="nome" className="sr-only">Nome completo</label>
          <input id="nome" type="text" placeholder="Seu nome completo" className="border rounded-md p-2" data-cy="input-name" aria-invalid={Boolean(errors.nomeCliente)} aria-describedby="err-nome" onChange={e => setReserva({ ...reserva, nomeCliente: e.target.value })} />

          <label htmlFor="email" className="sr-only">Email</label>
          <input id="email" type="email" placeholder="seuemail@exemplo.com" className="border rounded-md p-2" data-cy="input-email" aria-invalid={Boolean(errors.email)} aria-describedby="err-email" onChange={e => setReserva({ ...reserva, email: e.target.value })} />

          <label htmlFor="checkin" className="sr-only">Data de check-in</label>
          <input id="checkin" type="date" className="border rounded-md p-2" data-cy="input-checkin" title="Data de check-in" aria-invalid={Boolean(errors.checkin)} aria-describedby="err-checkin" onChange={e => setReserva({ ...reserva, checkin: e.target.value })} />

          <label htmlFor="checkout" className="sr-only">Data de check-out</label>
          <input id="checkout" type="date" className="border rounded-md p-2" data-cy="input-checkout" title="Data de check-out" aria-invalid={Boolean(errors.checkout)} aria-describedby="err-checkout" onChange={e => setReserva({ ...reserva, checkout: e.target.value })} />

          <label htmlFor="guests" className="sr-only">Hóspedes</label>
          <input id="guests" type="number" min={1} step={1} className="border rounded-md p-2 w-24" placeholder="Hóspedes" data-cy="input-guests" aria-invalid={Boolean(errors.guests)} aria-describedby="err-guests" onChange={e => setReserva({ ...reserva, guests: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
          <p id="err-nome" className={`min-h-[1.25rem] ${errors.nomeCliente ? "text-red-600" : "text-transparent"}`}>{errors.nomeCliente || "."}</p>
          <p id="err-email" className={`min-h-[1.25rem] ${errors.email ? "text-red-600" : "text-transparent"}`}>{errors.email || "."}</p>
          <p id="err-guests" className={`min-h-[1.25rem] ${errors.guests ? "text-red-600" : "text-transparent"}`}>{errors.guests || "."}</p>
          <p id="err-checkin" className={`min-h-[1.25rem] ${errors.checkin ? "text-red-600" : "text-transparent"}`}>{errors.checkin || "."}</p>
          <p id="err-checkout" className={`min-h-[1.25rem] ${errors.checkout ? "text-red-600" : "text-transparent"}`}>{errors.checkout || "."}</p>
        </div>
      </div>
      {selectedRoom && !hasErrors && (
        <div className="mt-3 p-3 rounded border bg-gray-50">
          <ResumoReserva room={selectedRoom} reserva={reserva} />
        </div>
      )}
      <div className="flex gap-2 mt-2">
        <button onClick={onCheckAvailability} className="btn-secondary disabled:opacity-70" aria-busy={loadingDisp ? 'true' : 'false'} disabled={loadingDisp} data-cy="check-availability">
          {loadingDisp ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
              Consultando...
            </span>
          ) : (
            "Checar disponibilidade"
          )}
        </button>
        <button onClick={onReserve} className="btn-primary" aria-disabled={reserveDisabled ? 'true' : 'false'} disabled={reserveDisabled} data-cy="reserve">
          Reservar
        </button>
      </div>
      {status?.type === "success" && <p className="text-green-700 mt-3" data-cy="status-message">{status.message}</p>}
      {status?.type === "error" && <p className="text-red-700 mt-3" data-cy="status-message">{status.message}</p>}
    </div>
  );
}

import { calculateNights, formatBRL } from "../utils/price.js";

function ResumoReserva({ room, reserva }) {
  const nights = calculateNights(reserva.checkin, reserva.checkout);
  const total = nights > 0 ? nights * Number(room.precoNoite) : 0;
  return (
    <div className="text-sm flex flex-wrap items-center gap-3" data-cy="summary-box">
      <span className="font-medium">Resumo da reserva:</span>
      <span>{room.nome}</span>
      <span className="text-gray-500">•</span>
      <span>
        {reserva.checkin || "—"} → {reserva.checkout || "—"} ({nights} noite{nights === 1 ? "" : "s"})
      </span>
      <span className="text-gray-500">•</span>
      <span>{Number(reserva.guests || 1)} hóspede(s)</span>
      <span className="text-gray-500">•</span>
      <span className="font-semibold" data-cy="summary-total">Total {formatBRL(total)}</span>
    </div>
  );
}
