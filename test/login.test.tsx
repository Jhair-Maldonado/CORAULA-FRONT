import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { AuthContext } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';

// Selecciona el componente que deseas probar (ej: LoginUsuario)
import LoginAdministrador from '../feature/login/admin/loginAdministrador'; 

// 1. Mocks de dependencias externas
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/services/authService', () => ({
  authService: {
    login: jest.fn(),
  },
}));

// Mock del GuestGuard para que simplemente renderice sus hijos
jest.mock('@/components/GuestGuard', () => ({
  GuestGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('Flujo de Login y Recuperación de Contraseña', () => {
  const mockPush = jest.fn();
  const mockLoginContext = jest.fn();
  const mockLogoutContext = jest.fn();
  const mockValidateSession = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  const renderComponent = () => {
    return render(
      <AuthContext.Provider value={{ 
        login: mockLoginContext, 
        status: 'unauthenticated', 
        role: null,
        token: null,
        sessionValid: false,
        logout: mockLogoutContext,
        validateSession: mockValidateSession,
        isSessionPhysicallyValid: jest.fn().mockReturnValue(false)
      }}>
        <LoginAdministrador />
      </AuthContext.Provider>
    );
  };

  // --- [Renderizado] ---
  it('debe renderizar los campos de correo, contraseña y los botones principales', () => {
    renderComponent();

    // Campos de texto
    expect(screen.getByPlaceholderText(/correo/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/contraseña/i)).toBeInTheDocument();

    // Botones
    expect(screen.getByRole('button', { name: /iniciar sesión de control/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /olvidaste tu contraseña/i })).toBeInTheDocument();
  });

  // --- [Campos Vacíos] ---
  it('debe mostrar errores de validación si se envía el formulario vacío', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    const submitBtn = screen.getByRole('button', { name: /iniciar sesión de control/i });
    await user.click(submitBtn);

    // Debe mostrar los mensajes de obligatoriedad
    await waitFor(() => expect(screen.getByText('El correo es obligatorio.')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('La contraseña es obligatoria.')).toBeInTheDocument());

    // authService no debe ser llamado
    expect(authService.login).not.toHaveBeenCalled();
  });

  // --- [Formato Email] ---
  it('debe mostrar un error si el correo no tiene un formato válido', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    const emailInput = screen.getByPlaceholderText(/correo/i);
    const passwordInput = screen.getByPlaceholderText(/contraseña/i);
    const submitBtn = screen.getByRole('button', { name: /iniciar sesión de control/i });

    await user.type(emailInput, 'correosinformato');
    await user.type(passwordInput, '123456');
    await user.click(submitBtn);

    await waitFor(() => expect(screen.getByText('El formato de correo no es válido.')).toBeInTheDocument());
    expect(authService.login).not.toHaveBeenCalled();
  });

  // --- [Alternar Contraseña] ---
  it('debe cambiar el tipo de input de contraseña entre "password" y "text" al hacer clic en el icono', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    const passwordInput = screen.getByPlaceholderText(/contraseña/i);
    const toggleBtn = screen.getByRole('button', { name: /mostrar contraseña/i });

    // Inicialmente es tipo password
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Hacemos clic para mostrar
    await user.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'text');

    // Hacemos clic para ocultar
    const hideBtn = screen.getByRole('button', { name: /ocultar contraseña/i });
    await user.click(hideBtn);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  // --- [Envío Exitoso] ---
  it('debe llamar a authService.login y redirigir si las credenciales son correctas', async () => {
    const user = userEvent.setup();
    
    // Configuramos el mock para una respuesta exitosa
    (authService.login as jest.Mock).mockResolvedValueOnce({
      token: 'fake-jwt-token',
      role: 'ADMINISTRADOR',
    });

    renderComponent();

    const emailInput = screen.getByPlaceholderText(/correo/i);
    const passwordInput = screen.getByPlaceholderText(/contraseña/i);
    const submitBtn = screen.getByRole('button', { name: /iniciar sesión de control/i });

    await user.type(emailInput, 'alumno@coraula.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitBtn);

    // Verificamos que se llamó a la API con los datos correctos
    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith('alumno@coraula.com', 'password123');
    });

    // Verificamos que se guardó la sesión en el contexto
    expect(mockLoginContext).toHaveBeenCalledWith('fake-jwt-token', 'ADMINISTRADOR');

    // Verificamos la redirección
    expect(mockPush).toHaveBeenCalledWith('/administrador');
  });

  // --- [Recuperación de Contraseña] ---
  describe('Flujo de Recuperación de Contraseña', () => {
    it('debe abrir el modal, validar el correo y mostrar mensaje de confirmación', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Abrir el modal
      const forgotPasswordBtn = screen.getByRole('button', { name: /olvidaste tu contraseña/i });
      await user.click(forgotPasswordBtn);

      // Verificamos que el modal se abrió (buscamos el paso 1)
      expect(screen.getByText(/paso 1 de 2: ingresa tu correo/i)).toBeInTheDocument();

      const modalEmailInput = screen.getAllByPlaceholderText(/correo/i)[1];
      const sendCodeBtn = screen.getByRole('button', { name: /enviar instrucciones/i });

      // Validar correo vacío (intento de enviar sin escribir)
      await user.click(sendCodeBtn);
      await waitFor(() => expect(screen.getByText('El correo es obligatorio.')).toBeInTheDocument());

      // Validar formato de correo incorrecto
      await user.type(modalEmailInput, 'correo-invalido');
      await user.click(sendCodeBtn);
      await waitFor(() => expect(screen.getByText('El formato de correo no es válido.')).toBeInTheDocument());

      // Flujo exitoso
      await user.clear(modalEmailInput);
      await user.type(modalEmailInput, 'valido@coraula.com');
      await user.click(sendCodeBtn);

      // Esperar a que el setTimeout interno del componente termine y cambie la pantalla (aprox 1000ms)
      await waitFor(() => {
        expect(screen.getByText(/solicitud exitosa/i)).toBeInTheDocument();
      }, { timeout: 1500 });

      expect(screen.getByText(/instrucciones enviadas a tu correo/i)).toBeInTheDocument();
      expect(screen.getByText('valido@coraula.com')).toBeInTheDocument();

      // Cerrar el modal mediante el botón "Volver"
      const volverBtn = screen.getByRole('button', { name: /volver/i });
      await user.click(volverBtn);

      // El modal debe desaparecer (el botón volver ya no está en el documento)
      expect(volverBtn).not.toBeInTheDocument();
    });
  });
});

