import React from "react";

export default function PaymentMethodSelector({ value, onChange }) {
  return (
    <div className="mt-4">
      <p className="text-sm text-gray-600 mb-2">Método de pagamento</p>
      <div className="inline-flex rounded-md overflow-hidden border border-gray-200 dark:border-gray-700">
        <button
          type="button"
          className={`px-4 py-2 text-sm ${value === 'pix' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200'}`}
          onClick={() => onChange('pix')}
          data-cy="pm-pix"
        >
          PIX
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm border-l border-gray-200 dark:border-gray-700 ${value === 'card' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-200'}`}
          onClick={() => onChange('card')}
          data-cy="pm-card"
        >
          Cartão
        </button>
      </div>
    </div>
  );
}

