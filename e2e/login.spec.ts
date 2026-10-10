import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Flujo de Login E2E', () => {

  // Test para el Login de Administrador
  test.describe('Login Administrador', () => {
    test.beforeEach(async ({ page }) => {
      // Asumimos que la ruta del admin es /login/security/administrador
      await page.goto(`${BASE_URL}/login/security/administrador`);
    });

    test('debe mostrar los elementos principales de la página', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /acceso institucional/i })).toBeVisible();
      await expect(page.getByPlaceholder('Correo de gestión / docente')).toBeVisible();
      await expect(page.getByPlaceholder('Contraseña de seguridad')).toBeVisible();
      await expect(page.getByRole('button', { name: /iniciar sesión de control/i })).toBeVisible();
    });

    test('debe mostrar errores si se envía el formulario vacío', async ({ page }) => {
      const submitBtn = page.getByRole('button', { name: /iniciar sesión de control/i });
      
      // Hacemos clic sin llenar nada
      await submitBtn.click();

      // Verificamos que aparezcan los mensajes de validación
      await expect(page.getByText('El correo es obligatorio.')).toBeVisible();
      await expect(page.getByText('La contraseña es obligatoria.')).toBeVisible();
    });

    test('debe mostrar error si el formato del correo es inválido', async ({ page }) => {
      const emailInput = page.getByPlaceholder('Correo de gestión / docente');
      const submitBtn = page.getByRole('button', { name: /iniciar sesión de control/i });

      await emailInput.fill('correo-sin-arroba');
      await submitBtn.click();

      await expect(page.getByText('El formato de correo no es válido.')).toBeVisible();
    });

    test('debe alternar la visibilidad de la contraseña', async ({ page }) => {
      const passwordInput = page.getByPlaceholder('Contraseña de seguridad');
      const toggleBtn = page.getByRole('button', { name: /mostrar contraseña/i });

      // Ingresamos contraseña
      await passwordInput.fill('secreta123');
      await expect(passwordInput).toHaveAttribute('type', 'password');

      // Clic para mostrar
      await toggleBtn.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');

      // Clic para ocultar (el botón cambia de aria-label a "Ocultar contraseña")
      const hideBtn = page.getByRole('button', { name: /ocultar contraseña/i });
      await hideBtn.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('debe probar el flujo del modal de recuperación de contraseña', async ({ page }) => {
      const forgotPasswordBtn = page.getByRole('button', { name: /olvidaste tu contraseña/i });
      await forgotPasswordBtn.click();

      // Verificar que el modal se abrió
      await expect(page.getByText(/Paso 1 de 2: Ingresa tu correo/i)).toBeVisible();

      // Intentar enviar vacío en el modal
      const sendCodeBtn = page.getByRole('button', { name: /enviar instrucciones/i });
      await sendCodeBtn.click();
      await expect(page.locator('span#recovery-email-error').filter({ hasText: 'El correo es obligatorio.' })).toBeVisible();

      // Llenar con correo válido
      const modalEmailInput = page.locator('input[aria-describedby="recovery-email-error"]');
      await modalEmailInput.fill('admin@coraula.com');
      await sendCodeBtn.click();

      // Verificar pantalla de éxito en el modal
      await expect(page.getByText(/solicitud exitosa/i)).toBeVisible();
      await expect(page.getByText(/instrucciones enviadas a tu correo/i)).toBeVisible();
      
      // Cerrar modal
      const returnBtn = page.getByRole('button', { name: /volver/i });
      await returnBtn.click();
      
      // Verificar que el modal desapareció
      await expect(page.getByText(/Paso 1 de 2: Ingresa tu correo/i)).toBeHidden();
    });

    // Nota: El envío exitoso con credenciales válidas depende de si el backend está corriendo.
    // Si tu backend local no está levantado en la prueba, este test fallará por timeout de red.
    test('debe permitir ingresar datos y hacer submit (mockeado o real)', async ({ page }) => {
      const emailInput = page.getByPlaceholder('Correo de gestión / docente');
      const passwordInput = page.getByPlaceholder('Contraseña de seguridad');
      const submitBtn = page.getByRole('button', { name: /iniciar sesión de control/i });

      await emailInput.fill('testadmin@coraula.com');
      await passwordInput.fill('Pass1234');
      
      // En un entorno e2e real, aquí puedes interceptar la petición de red (mocking)
      // para que no requiera el backend, o puedes usar credenciales de test en DB.
      await page.route('**/api/auth/login', async route => {
        const json = { token: 'fake-jwt', role: 'ADMINISTRADOR' };
        await route.fulfill({ json });
      });

      await submitBtn.click();
      
      // Como hicimos mock de la ruta, el redirect a /administrador debería ocurrir
      await expect(page).toHaveURL(/.*\/administrador/);
    });
  });

});
