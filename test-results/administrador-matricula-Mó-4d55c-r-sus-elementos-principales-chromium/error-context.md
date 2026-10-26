# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: administrador\matricula.spec.ts >> Módulo de Administrador: Matricula >> debe cargar correctamente el módulo y mostrar sus elementos principales
- Location: e2e\administrador\matricula.spec.ts:23:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: /Masiva/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: /Masiva/i }) with timeout 5000ms
  - waiting for getByRole('heading', { name: /Masiva/i })

```

```yaml
- alert
- main:
  - link "← Volver a selección de usuarios":
    - /url: /
  - img "Ilustración CORAULA Gestión"
  - img
  - text: Panel Administrativo & Docente
  - heading "Gestión eficiente, mejores resultados" [level=2]
  - paragraph: Coordina la información institucional, realiza el seguimiento académico y administra vacantes en tiempo real.
  - text: CORAULA
  - img
  - text: Gestión
  - heading "Acceso Institucional" [level=1]
  - img
  - paragraph: Ingresa credenciales de personal autorizado.
  - img
  - textbox "Correo de gestión / docente"
  - img
  - textbox "Contraseña de seguridad"
  - button "Mostrar contraseña":
    - img
  - button "¿Olvidaste tu contraseña?"
  - button "Iniciar Sesión de Control":
    - text: Iniciar Sesión de Control
    - img
  - text: o autenticar con
  - button "Google":
    - img
    - text: Google
  - button "Apple":
    - img
    - text: Apple
  - button "Microsoft":
    - img
    - text: Microsoft
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | const BASE_URL = 'http://localhost:3000';
  4  | 
  5  | test.describe('Módulo de Administrador: Matricula', () => {
  6  |   
  7  |   // OMITIR o DESCOMENTAR dependiendo de tu sistema de Auth
  8  |   test.beforeEach(async ({ page }) => {
  9  |     // Si tu app requiere estar logueado para ver la ruta, hacemos un login rápido:
  10 |     await page.goto(`${BASE_URL}/login/security/administrador`);
  11 |     await page.getByPlaceholder('Correo de gestión / docente').fill('admin@coraula.com');
  12 |     await page.getByPlaceholder('Contraseña de seguridad').fill('password123');
  13 |     
  14 |     // Mock de red para no depender del backend
  15 |     await page.route('**/v1/auth/login', async route => {
  16 |       await route.fulfill({ json: { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJBRE1JTklTVFJBRE9SIiwiZXhwIjoxOTk5OTk5OTk5fQ.fake', role: 'ADMINISTRADOR' } });
  17 |     });
  18 |     
  19 |     await page.getByRole('button', { name: /iniciar sesión de control/i }).click();
  20 |     await page.waitForURL(url => url.pathname === '/administrador');
  21 |   });
  22 | 
  23 |   test('debe cargar correctamente el módulo y mostrar sus elementos principales', async ({ page }) => {
  24 |     // 1. Navegar a la ruta específica del módulo
  25 |     await page.goto(`${BASE_URL}/administrador/matricula`);
  26 |     
  27 |     // 2. Verificar que la URL sea la correcta
  28 |     await expect(page).toHaveURL(/.*\/administrador\/matricula/);
  29 | 
  30 |     // 3. Verificar que el body se haya renderizado sin error 404
  31 |     await expect(page.locator('body')).toBeVisible();
  32 | 
  33 |     // 4. Verificar que se renderice el título principal esperado
> 34 |     await expect(page.getByRole('heading', { name: /Masiva/i })).toBeVisible();
     |                                                                  ^ Error: expect(locator).toBeVisible() failed
  35 |   });
  36 | });
  37 | 
```