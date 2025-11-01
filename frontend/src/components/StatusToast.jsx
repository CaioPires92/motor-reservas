import React, { useEffect } from "react";

export default function StatusToast({ type, message, duration = 4000, onDismiss }) {
  useEffect(() => {
    if (!type || !message || !duration) return;
    const t = setTimeout(() => {
      onDismiss?.();
    }, duration);
    return () => clearTimeout(t);
  }, [type, message, duration, onDismiss]);

  if (!type || !message) return null;
  const isError = type === "error";
  const base = "rounded p-3 mb-4 border flex items-start justify-between gap-3";
  const cls = isError
    ? `${base} text-red-700 bg-red-50 border-red-200`
    : `${base} text-green-700 bg-green-50 border-green-200`;
  return (
    <div className={cls} data-cy="status-message" role="alert" aria-live="polite">
      <span>{message}</span>
      {onDismiss && (
        <button
          type="button"
          aria-label="Fechar aviso"
          onClick={onDismiss}
          className="ml-auto inline-flex items-center justify-center rounded-md px-2 py-1 text-sm text-inherit hover:opacity-80"
        >
          ×
        </button>
      )}
    </div>
  );
}
