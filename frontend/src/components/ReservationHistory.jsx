import React, { useState } from "react";

export default function ReservationHistory({ apiBase }) {
  const [email, setEmail] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [total, setTotal] = useState(null);

  const fetchHistory = async (nextPage = 1) => {
    setLoading(true); setError(null); setItems([]);
    try {
      let resp = await fetch(`${apiBase}/reservas/historico?email=${encodeURIComponent(email)}&limit=${limit}&page=${nextPage}`);
      if (!resp.ok) {
        const url = new URL(`${apiBase}/reservas`);
        url.searchParams.set('email', email);
        url.searchParams.set('limit', String(limit));
        url.searchParams.set('page', String(nextPage));
        resp = await fetch(url);
      }
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const totalHdr = resp.headers.get('X-Total-Count');
      setTotal(totalHdr ? Number(totalHdr) : null);
      const data = await resp.json();
      setItems(Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []));
      setPage(nextPage);
    } catch (e) {
      setError('Falha ao buscar reservas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-10 card p-6">
      <h3 className="text-lg font-semibold mb-2">Histórico de reservas</h3>
      <div className="flex flex-wrap gap-2">
        <input
          type="email"
          placeholder="seuemail@exemplo.com"
          className="border rounded-md p-2 min-w-[260px]"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          data-cy="history-email"
        />
        <button type="button" className="btn-primary" onClick={() => fetchHistory(1)} disabled={!email || loading} data-cy="history-search">
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </div>
      {error && <p className="text-red-600 mt-2">{error}</p>}
      {items.length > 0 && (
        <>
          <ul className="mt-4 divide-y divide-gray-200 dark:divide-gray-800">
            {items.map((r) => (
              <li key={r.id} className="py-3 text-sm" data-cy="history-item">
                <span className="font-mono">#{r.id}</span>
                <span className="mx-2 text-gray-500">•</span>
                <span>{new Date(r.checkin).toLocaleDateString()} → {new Date(r.checkout).toLocaleDateString()}</span>
                <span className="mx-2 text-gray-500">•</span>
                <span>Status: <span className="font-medium">{r.status}</span></span>
                <span className="mx-2 text-gray-500">•</span>
                <span>Total: R$ {Number(r.total).toFixed(2)}</span>
                {r.quarto?.nome && (
                  <>
                    <span className="mx-2 text-gray-500">•</span>
                    <span>Quarto: {r.quarto.nome}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center gap-3">
            <button className="btn-secondary text-sm px-3 py-2" onClick={() => fetchHistory(page - 1)} disabled={loading || page <= 1} data-cy="history-prev">Anterior</button>
            <span className="text-sm" data-cy="history-page">Página {page}{total ? ` / ${Math.max(1, Math.ceil(total/limit))}` : ''}</span>
            <button className="btn-secondary text-sm px-3 py-2" onClick={() => fetchHistory(page + 1)} disabled={loading || (items.length < limit && (total === null || page >= Math.ceil((total||0)/limit)))} data-cy="history-next">Próxima</button>
          </div>
        </>
      )}
      {items.length === 0 && !loading && !error && (
        <p className="text-sm text-gray-500 mt-3">Nenhuma reserva encontrada para este email.</p>
      )}
    </div>
  );
}
