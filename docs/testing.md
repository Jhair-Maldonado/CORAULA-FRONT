# Pruebas y Validación (QA)

Estructura y catálogo de pruebas y evidencias del Frontend de CORAULA.
Aquí documentamos los flujos críticos funcionales, de integración y no funcionales, marcando el estatus y evidencia.

## 1. Pruebas Funcionales (De Flujo de Identidad)

### ✅ EXISTENTES (Probadas y Confirmadas)
- **Login válido por rol:** Inicio de sesión como ADMINISTRADOR te traslada al path `/administrador`.
- **Atrás / Adelante post-login:** Al loguearse y retroceder a `/security` con flechas del navegador, el usuario es empujado de vuelta al Dashboard, validando que el `GuestGuard` funciona.
- **Logout Completo:** El cierre de sesión purga el `localStorage`, desmonta la memoria temporal del contexto React, redirecciona a `/` y lanza un comando `location.replace()`.
- **Regreso temporal tras Logout (BFCache):** Al darle hacia atrás en el navegador luego del deslogueo, el evento `pageshow` es capturado y una recarga forzosa (`reload`) prohíbe el renderizado falso del layout privado, logrando máxima seguridad en `AuthGuard`.
- **Lint:** Se compila periódicamente libre de advertencias de useEffect e imports obsoletos (Exit code: 0).
- **Build:** Los trabajadores de Turbopack logran el empaquetamiento estático de SSG (Exit code: 0).

### ⏳ PROPUESTAS (Pendientes de Prueba Documentada)
- **Acceso directo sin sesión:** Intentar forzar la URL `http://localhost:3000/administrador/cursos` vía incognito o en una computadora nueva para certificar que el Global Loader actúa antes de expulsar a `/security`.
- **Login Inválido (401):** Escribir correos/contraseñas fallidas y certificar que aparece la respuesta correcta.
- **Bloqueo (423):** Realizar tres (o la cifra predeterminada de intentos de seguridad) fallas intencionales para evaluar que el mensaje "Cuenta bloqueada" sea claro.

## 2. Pruebas de Integración (Backend - Frontend)

### ⏳ PROPUESTAS
- **JWT Expirado:** Esperar `X` minutos y verificar si la lectura asíncrona de JWT expulsa al usuario al finalizar la cuenta regresiva, tanto interactuando como AFK.
- **Multi-Tab Session Sharing:** 
  1. Abrir sesión en la Pestaña A.
  2. Abrir Pestaña B. Confirmar que se encuentra logueado.
  3. Cerrar sesión en Pestaña B. 
  4. Revisar que la Pestaña A haya retornado a la pantalla `/` (Deslogueada remotamente).
- **Expulsión 403 HTTP:** Con una sesión DOCENTE activa, simular un intento POST manual hacia `/v1/auth/crear-cuenta-padre` mediante manipulación. Asegurar interceptación en `httpClient.ts`.

## 3. Pruebas No Funcionales (Performance & UI)

### ⏳ PROPUESTAS
- **Responsive Web Design:** Redimensionamiento y usabilidad táctil comprobada en iPhone, Android y iPad, especialmente la ocultación del SideBar.
- **Compatibilidad Cruzada:** Certificar la seguridad BFCache no sólo en Chrome sino en Firefox y Safari iOS (quien usa BFCache agresivo de forma distinta).
- **Tiempos de Respuesta (Lighthouse):** Analizar que el bundle generado en producción cumpla con las metas de Next.js (FCP y TTI menores a 1.2 segundos).
