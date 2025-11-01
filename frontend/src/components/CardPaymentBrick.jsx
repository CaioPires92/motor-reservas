import React, { useEffect, useRef, useState } from "react";

// Lightweight wrapper for Mercado Pago Card Payment Brick
export default function CardPaymentBrick({ publicKey, amount, email, reservaId, apiBase, onPaid, onError }) {
  const containerRef = useRef(null);
  const [mp, setMp] = useState(null);
  const [brick, setBrick] = useState(null);

  // load SDK if needed
  useEffect(() => {
    if (window.MercadoPago) {
      setMp(new window.MercadoPago(publicKey, { locale: 'pt-BR' }));
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://sdk.mercadopago.com/js/v2';
    s.onload = () => setMp(new window.MercadoPago(publicKey, { locale: 'pt-BR' }));
    s.onerror = () => onError?.(new Error('Falha ao carregar SDK do Mercado Pago'));
    document.body.appendChild(s);
    return () => { try { document.body.removeChild(s); } catch {} };
  }, [publicKey, onError]);

  // init brick
  useEffect(() => {
    if (!mp || !containerRef.current) return;
    (async () => {
      try {
        const bricksBuilder = mp.bricks();
        const instance = await bricksBuilder.create('cardPayment', containerRef.current, {
          initialization: { amount: Number(amount || 0) },
          customization: {
            visual: { style: { theme: 'default' }},
            paymentMethods: { maxInstallments: 12 },
          },
          callbacks: {
            onReady: () => {},
            onError: (e) => { onError?.(e); },
            onSubmit: ({ selectedPaymentMethod, formData }) => {
              // formData contains token, installments, paymentMethodId, issuerId, payer.email, etc.
              return new Promise(async (resolve, reject) => {
                try {
                  const resp = await fetch(`${apiBase}/pagamento/cartao`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      token: formData?.token,
                      email: formData?.payer?.email || email,
                      total: amount,
                      installments: formData?.installments || 1,
                      payment_method_id: formData?.paymentMethodId || selectedPaymentMethod?.id,
                      issuer_id: formData?.issuerId,
                      reservaId,
                    })
                  });
                  const data = await resp.json();
                  if (!resp.ok) throw new Error(data?.error || 'Falha no pagamento');
                  if (String(data?.status).toLowerCase() === 'approved') onPaid?.(data);
                  resolve();
                } catch (err) {
                  onError?.(err);
                  reject();
                }
              });
            },
          },
        });
        setBrick(instance);
      } catch (e) {
        onError?.(e);
      }
    })();
    return () => {
      if (brick && brick.unmount) {
        try { brick.unmount(); } catch {}
      }
    }
  }, [mp, amount, email, reservaId, apiBase]);

  return (
    <div className="mt-6" data-cy="card-brick">
      <h3 className="text-xl font-semibold mb-2">Pague com Cartão</h3>
      <div ref={containerRef} id="card-payment-brick-container" />
    </div>
  );
}

