export function calculateNights(checkin, checkout) {
  const start = new Date(checkin);
  const end = new Date(checkout);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const diffMs = end - start;
  const nights = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, nights);
}

export function formatBRL(value) {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
  } catch {
    const n = Number(value || 0);
    return `R$ ${n.toFixed(2)}`;
  }
}

