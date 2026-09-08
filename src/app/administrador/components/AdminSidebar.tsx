import React from 'react';

export const AdminSidebar = () => {
  return (
    <aside className="w-64 bg-slate-900 text-white p-4 min-h-screen">
      <h2 className="text-xl font-bold mb-6">Panel Administrador</h2>
      <nav className="space-y-2">
        <a href="/administrador" className="block py-2 px-4 hover:bg-slate-800 rounded">Dashboard</a>
      </nav>
    </aside>
  );
};
