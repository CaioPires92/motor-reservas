import React, { useEffect, useRef, useState } from "react";

export default function ConfirmModal({ open, onClose, reservaId, pix, apiBase }) {
  const [status, setStatus] = useState(null);
  const attemptsRef = useRef(0);
  const pollingRef = useRef(null);
  if (!open) return null;

  const copyPix = async () => {
    try {
      if (pix?.qr_code) await navigator.clipboard.writeText(pix.qr_code);
    } catch {}
  };

  const fetchStatus = async () => {
    try {
      const resp = await fetch(`${apiBase}/reservas/${reservaId}`);
      if (resp.ok) {
        const data = await resp.json();
        setStatus(data?.status || "desconhecido");
      } else {
        setStatus("erro");
      }
    } catch {
      setStatus("erro");
    }
  };

  // Polling automático até sair de 'pendente' ou atingir limite
  useEffect(() => {
    if (!open || !reservaId) return;
    const MAX_ATTEMPTS = Number(import.meta.env.VITE_STATUS_POLL_ATTEMPTS || 12);
    const INTERVAL_MS = Number(import.meta.env.VITE_STATUS_POLL_INTERVAL || 5000);
    attemptsRef.current = 0;
    setStatus(null);

    const run = async () => {
      attemptsRef.current += 1;
      try {
        const resp = await fetch(`${apiBase}/reservas/${reservaId}`);
        if (resp.ok) {
          const data = await resp.json();
          const s = String(data?.status || '').toLowerCase();
          setStatus(s || 'desconhecido');
          if (s && s !== 'pendente') {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          } else if (attemptsRef.current >= MAX_ATTEMPTS) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      } catch { /* ignora erros transitórios */ }
    };

    pollingRef.current = setInterval(run, INTERVAL_MS);
    // dispara uma primeira consulta imediata
    run();

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [open, reservaId, apiBase]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative card p-6 w-full max-w-lg" data-cy="reservation-modal">
        <h3 className="text-xl font-semibold">Reserva criada</h3>
        <p className="text-sm text-gray-600 mt-1">Anote o ID para acompanhar o status do pagamento.</p>
        <div className="mt-3 text-sm">
          <span className="text-gray-500 mr-1">ID:</span>
          <span className="font-mono" data-cy="reservation-id">{reservaId}</span>
        </div>

        {pix?.qr_code && (
          <div className="mt-4">
            <button type="button" className="btn-secondary text-sm" onClick={copyPix} data-cy="copy-pix-button">Copiar PIX (copia e cola)</button>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          <button type="button" className="btn-primary" onClick={fetchStatus}>Ver status da reserva</button>
          <button type="button" className="btn-secondary" onClick={onClose}>Fechar</button>
        </div>

        {status && (
          <p className="mt-3 text-sm" data-cy="reservation-status">Status atual: <span className="font-semibold">{status}</span></p>
        )}
      </div>
    </div>
  );
}
