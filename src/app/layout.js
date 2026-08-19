import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';

export const metadata = {
  title: 'CORAULA | Gestión Académica',
  description: 'Sistema de Control y Registro Académico de Aula',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      {/* Tailwind: Fondo gris claro y texto oscuro por defecto */}
      <body className="bg-gray-100 text-gray-900 antialiased min-h-screen flex flex-col">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}