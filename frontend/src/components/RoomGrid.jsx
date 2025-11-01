import React from "react";
import RoomCard from "./RoomCard.jsx";
import SkeletonCard from "./SkeletonCard.jsx";
import EmptyState from "./EmptyState.jsx";

export default function RoomGrid({ rooms = [], loading = false, availableIds = null, onSelect, nights = 0, formatBRL }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!rooms.length) {
    return <EmptyState title="Nenhum quarto disponível" subtitle="Tente outras datas ou quantidade de hóspedes" />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {rooms.map((q) => (
        <RoomCard
          key={q.id}
          room={q}
          available={Array.isArray(availableIds) ? availableIds.includes(q.id) : undefined}
          onSelect={onSelect}
          nights={nights}
          formatBRL={formatBRL}
        />
      ))}
    </div>
  );
}
