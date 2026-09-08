import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';

export const metadata = {
  title: 'CORAULA | Gestión Académica',
  description: 'Sistema de Control y Registro Académico de Aula',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-canvas text-ink antialiased min-h-screen flex flex-col font-sans">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
