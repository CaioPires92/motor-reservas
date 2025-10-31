import { validarPeriodo } from "./periodo.js";

// Lista quartos disponíveis localmente usando Prisma e regras de período/capacidade
export async function listarQuartosDisponiveis(prisma, checkinIso, checkoutIso, guestsRaw) {
  // Valida período
  const { start, end } = validarPeriodo(checkinIso, checkoutIso);
  const guests = Number(guestsRaw);
  if (!Number.isInteger(guests) || guests <= 0) {
    throw new Error("Número de hóspedes inválido");
  }

  // Filtra quartos por capacidade
  const quartos = await prisma.quarto.findMany({
    where: { capacidade: { gte: guests } },
  });
  const roomIds = quartos.map((q) => q.id);

  if (roomIds.length === 0) {
    return { availableRooms: [], totalAvailable: 0, dateRange: { checkin: checkinIso, checkout: checkoutIso } };
  }

  // Busca reservas que sobrepõem o intervalo para esses quartos
  const overlapping = await prisma.reserva.findMany({
    where: {
      quartoId: { in: roomIds },
      NOT: {
        OR: [
          { checkout: { lte: start } },
          { checkin: { gte: end } },
        ],
      },
    },
  });

  const bookedRoomIds = new Set(overlapping.map((r) => r.quartoId));
  const availableRooms = quartos.filter((q) => !bookedRoomIds.has(q.id));

  return {
    availableRooms,
    totalAvailable: availableRooms.length,
    dateRange: { checkin: checkinIso, checkout: checkoutIso },
  };
}

