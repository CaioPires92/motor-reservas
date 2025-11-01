import React from "react";

export default function SkeletonCard() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-2/3 mb-3" />
      <div className="h-4 bg-gray-200 rounded w-5/6 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-3/5 mb-6" />
      <div className="h-8 bg-gray-200 rounded w-24" />
    </div>
  );
}

