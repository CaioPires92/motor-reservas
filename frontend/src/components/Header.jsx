import React, { useEffect, useState } from "react";

export default function Header() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = saved ? saved === 'dark' : prefersDark;
    setDark(initial);
    document.documentElement.classList.toggle('dark', initial);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <header className="border-b bg-white/80 backdrop-blur dark:bg-gray-900/70">
      <div className="container-app py-4 flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-gray-100">Motor Reservas</h1>
        <div className="flex items-center gap-3">
          <span className="hidden md:inline text-sm text-gray-500 dark:text-gray-400">Reserve seu quarto em poucos cliques</span>
          <button type="button" onClick={toggle} className="btn-secondary text-xs px-3 py-2" data-cy="theme-toggle">
            {dark ? 'Claro' : 'Escuro'}
          </button>
        </div>
      </div>
    </header>
  );
}
