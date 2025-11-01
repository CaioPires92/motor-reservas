import React from "react";

export default function EmptyState({ title = "Nada por aqui", subtitle = "Tente ajustar os filtros" }) {
  return (
    <div className="card p-6 text-center text-gray-600">
      <p className="font-semibold">{title}</p>
      <p className="text-sm">{subtitle}</p>
    </div>
  );
}

