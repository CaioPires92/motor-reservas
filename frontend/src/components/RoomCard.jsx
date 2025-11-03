import React from "react";

export default function RoomCard({ room, available, onSelect, nights = 0, formatBRL }) {
  const firstImage = (() => {
    if (!room?.imagens) return null;
    const url = String(room.imagens).split(',')[0].trim();
    return url || null;
  })();
  return (
    <div
      key={room.id}
      data-cy="room-card"
      className={`card p-4 ${
        available === undefined
          ? ""
          : available
          ? "border-green-400 border"
          : "opacity-60"
      }`}
    >
      {firstImage ? (
        <img src={firstImage} alt={room.nome} className="w-full h-40 object-cover rounded-md mb-3" loading="lazy" />
      ) : (
        <div className="w-full h-40 rounded-md mb-3 bg-gray-200 dark:bg-gray-800" />
      )}
      <h2 className="text-xl font-semibold">{room.nome}</h2>
      <p>{room.descricao}</p>
      <p className="font-bold mt-2">R$ {Number(room.precoNoite ?? 0).toFixed(2)} / noite</p>
      <p className="text-sm text-gray-500">Capacidade: {room.capacidade}</p>
      {nights > 0 && (
        <p className="text-sm mt-1">
          Estadia ({nights} noite{nights === 1 ? "" : "s"}): {formatBRL ? formatBRL(nights * Number(room.precoNoite)) : `R$ ${(nights * Number(room.precoNoite)).toFixed(2)}`}
        </p>
      )}
      {available !== undefined && (
        <span
          className={`inline-block text-xs font-semibold px-2 py-1 rounded mt-2 ${
            available
              ? "bg-green-100 text-green-700 border border-green-300"
            : "bg-red-100 text-red-700 border border-red-300"
          }`}
        >
          {available ? "Disponível" : "Indisponível"}
        </span>
      )}
      <button
        onClick={() => onSelect?.(room)}
        className="btn-primary mt-3"
        data-cy="select-room"
      >
        Selecionar
      </button>
    </div>
  );
}
