// Serviço de regras da Reserva
export async function checarConflito(prisma, quartoId, start, end, excludeId) {
  const where = {
    quartoId: Number(quartoId),
    AND: [{ checkin: { lt: end } }, { checkout: { gt: start } }],
  };
  if (excludeId) {
    where.id = { not: Number(excludeId) };
  }
  const conflito = await prisma.reserva.findFirst({ where });
  return Boolean(conflito);
}

export function validarCapacidade(guests, capacidade) {
  const g = Number(guests);
  if (!Number.isFinite(g) || g <= 0) {
    throw new Error("Número de hóspedes inválido");
  }
  if (g > Number(capacidade)) {
    throw new Error("Hóspedes excedem a capacidade do quarto");
  }
  return g;
}

