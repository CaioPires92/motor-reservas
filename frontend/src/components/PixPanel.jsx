import React from "react";

export default function PixPanel({ pix }) {
  if (!pix) return null;
  const copy = async () => {
    try {
      if (pix.qr_code) {
        await navigator.clipboard.writeText(pix.qr_code);
        // no toast here to keep tests stable; UI could integrate toast later
      }
    } catch {}
  };
  return (
    <div className="mt-6" data-cy="pix-container">
      <h3 className="text-xl font-semibold mb-2">Pague com PIX</h3>
      {pix.qr_code_base64 && (
        <img
          alt="QR Code PIX"
          className="w-64 h-64 border rounded"
          data-cy="pix-qr"
          src={`data:image/png;base64,${pix.qr_code_base64}`}
        />
      )}
      {pix.qr_code && (
        <div className="mt-3">
          <p className="text-sm text-gray-600">Copia e Cola:</p>
          <div className="flex items-start gap-2">
            <textarea
              readOnly
              className="w-full h-24 border p-2 text-xs"
              data-cy="pix-code"
              value={pix.qr_code}
            />
            <button type="button" onClick={copy} className="btn-secondary text-sm px-3 py-2">
              Copiar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

