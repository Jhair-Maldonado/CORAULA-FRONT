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

## Integración de matrícula masiva: contrato Excel V2 (2026-10-07)

- Ruta activa: `/administrador/matricula`. `pantallaVistaMatricula` delega al único `ImportadorMatricula`; backend es la fuente autoritativa. No hay lectura local XLSX ni edición de preview.
- `src/types/studentImport.ts`: StudentImportIssue, StudentImportRowData, StudentImportRowPreview (errors y warnings), StudentImportPreview, StudentImportConfirmation y StudentImportHttpError (campos opcionales para variantes HTTP). RowData refleja las 21 columnas del contrato V2 más studentCode: null; level y guardianRelationship aceptan strings desconocidos; studentCode es null y no se envía como input. No existe guardianPhone2.
- Servicio con httpClient: preview y confirm usan las rutas `/v1/management/students/import/preview` y `/v1/management/students/import/confirm`; baseURL ya incluye `/api`. FormData contiene únicamente `file`. Se anula Content-Type JSON sin fijar boundary y se preserva el interceptor Bearer.
- Selección y drop aceptan exclusivamente `.xlsx` (también mayúsculas), borran los resultados previos y conservan el File original. Preview se solicita explícitamente con el botón Obtener preview. Mientras hay peticiones se bloquean cambios de archivo.
- La respuesta real muestra resumen, todas las filas, estudiante, apoderado, información académica y todas las incidencias. Cada incidencia muestra código, campo y message recibido; errores en rojo y warnings en ámbar. Los valores desconocidos de nivel/relación y null se muestran sin corregirlos.
- Confirm requiere File seleccionado idéntico al del preview, totalRows positivo, invalidRows cero, validRows igual a totalRows, número de filas coincidente y todas las filas válidas sin errores. Warnings no bloquean. Se bloquea durante requests, tras éxito y tras previews actualizados provenientes de errores.
- 400/409 con preview reemplaza el resultado y conserva File, muestra nuevos errores y requiere nueva validación antes de confirmar. 400 estructural y 409 simple/concurrente muestran message; 401 sigue en infraestructura global sin logout local; 403 muestra acceso denegado sin cerrar sesión; 500/red muestran error reintentable, conservando message si está disponible.
- Éxito de confirm usa los siete contadores de la respuesta, distinguiendo apoderados creados y reutilizados por relación (no únicos). Bloqueo síncrono y estado de éxito evitan doble confirm; el resumen se conserva y Cargar otro archivo permite iniciar explícitamente otro flujo.
- Auditoría V2: se eliminó `src/types/matricula.ts` porque todas sus interfaces de importación legacy carecían de consumidores. Se eliminó `public/plantillas/plantilla_matricula.csv`, incompatible con el backend; no tenía enlaces activos. No existe todavía una plantilla XLSX V2 oficial y no se ofrece una descarga incompatible.
- No hay framework frontend de tests establecido. No se agregaron librerías ni mocks. Comprobaciones puntuales ejecutadas con Node: 12 casos sobre la expresión real canConfirm (incluye warnings, invalidRows, validRows cero, totalRows cero, filas inválidas/con errores, identidad File, request activo, éxito, error con preview actualizado y estados ausentes); 5 casos del filtro real de extensión; identidad del File y key única file en FormData; transformRequest de Axios conserva FormData al anular su encabezado JSON. Todas pasaron.
- Inspección adicional: endpoints, llamadas preview/confirm con File conservado, recuperación de previews en 400/409, interceptor solo 401, render de contadores reales y ausencia de payload JSON/éxito simulado. Esto no equivale a pruebas de interacción en navegador ni contra backend real.
- `npm run lint`: exit 0, cero errores y 16 advertencias existentes fuera del cambio.
- Antes del build se comprobó que `git ls-files .next` no devolvía archivos; se eliminó únicamente ese directorio generado, con ruta absoluta verificada dentro del workspace. Webpack usa fallback WASM por bloqueo de SWC nativo de Windows Application Control.
- Deuda de validación: probar en navegador con backend real respuestas 200/201, archivos válidos/inválidos, warnings, 400/409 con preview y sin preview, permisos 401/403 y recuperación de 500/red. Comprobar multipart en Network. No se declara integración de extremo a extremo probada.
- `npx next build --webpack`: exit 0; compilación, TypeScript y generación de las 30 páginas correctas, incluida `/administrador/matricula`. `git diff --check`: exit 0. Sin commit ni push.

### Adaptación V2 y validación E2E completada

Se completó la validación manual en navegador contra backend real y Supabase del flujo Student Onboarding V2.

Validaciones realizadas:

- Archivo Excel V2 válido: preview y confirmación correctos.
- Persistencia verificada en Supabase de estudiante, apoderado, relación, usuario y matrícula.
- `studentLastNamePaternal` vacío o compuesto solo por espacios → `MISSING_FIELD`.
- `guardianLastNamePaternal` vacío o compuesto solo por espacios → `MISSING_FIELD`.
- Apellido materno opcional vacío → persistido como `NULL`.
- Fecha de nacimiento futura → `FUTURE_BIRTH_DATE`.
- Sección inexistente → `SECTION_NOT_FOUND`.
- Apoderado existente:
  - conserva sus datos persistidos;
  - reutiliza su cuenta;
  - permite crear una nueva relación sin sobrescribir sus apellidos.
- Preview comprobado como read-only.
- Confirmación ejecutada contra backend real mediante `multipart/form-data`.

Flujo validado:

Excel V2 → Frontend → Preview → Confirm → Spring Boot → Supabase.

El contrato Excel V1 ya no está soportado por el importador actual.
