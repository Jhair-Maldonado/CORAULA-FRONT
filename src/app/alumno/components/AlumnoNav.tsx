'use client';

import React, { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { Logout01Icon } from 'hugeicons-react';

export const AlumnoNav = () => {
  const authContext = useContext(AuthContext);

  const handleLogout = () => {
    authContext?.logout();
  };

  return (
    <nav className="bg-indigo-700 text-white p-4 flex justify-between items-center">
      <h1 className="text-xl font-bold">Portal del Estudiante</h1>
      <button 
        onClick={handleLogout}
        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-red-600 rounded-lg transition-colors text-sm font-medium cursor-pointer"
        title="Cerrar sesión"
      >
        <Logout01Icon size={18} />
        <span className="hidden sm:inline">Cerrar sesión</span>
      </button>
    </nav>
  );
};
