# Autenticación y Flujos de Acceso

Este documento detalla cómo se gestiona y orquesta la identidad, seguridad y roles en el frontend de CORAULA.

## Mapa de Autenticación y Roles

El inicio de sesión y direccionamiento se organiza a través del **BackendRole**.
No se utilizan roles ficticios ni administrativos intermedios en el frontend (ej. SUPERADMIN fue retirado de la UI principal).

| BackendRole     | Portal de Login Público    | Dashboard Asignado (Home)  |
|-----------------|----------------------------|----------------------------|
| ADMINISTRADOR   | `/security`                | `/administrador`           |
| DIRECTIVO       | `/security`                | `/administrador`           |
| DOCENTE         | `/security`                | `/docente`                 |
| ESTUDIANTE      | `/login`                   | `/alumno`                  |
| APODERADO       | `/login`                   | `/padre`                   |

**Nota Visual sobre Query Params:**
Las URLs del tipo `/security?rol=docente` o `/login?rol=estudiante` se usan única y exclusivamente para entregar contexto visual a la interfaz pública del formulario. **La autorización real proviene siempre del JWT decodificado por `AuthContext`.** Jamás se debe utilizar el query parameter para tomar decisiones de seguridad.

## Flujos de Seguridad y Componentes

### 1. El Proveedor (`AuthContext.tsx`)
Maneja cuatro variables reactivas globales:
- `token` (String / Null)
- `role` (BackendRole / Null)
- `sessionValid` (Boolean)
- `status` ('loading' | 'authenticated' | 'unauthenticated')

El contexto extrae dinámicamente la propiedad de expiración (`exp`) del JWT mediante la librería `jwt-decode`. Este token se sincroniza de manera automática con `localStorage`. Un JWT caducado desata un `invalidateSession()`.

### 2. Multi-Tab (Sincronización por Storage)
Gracias al `window.addEventListener('storage', ...)` implementado en el Contexto, la sesión se sincroniza bidireccionalmente entre todas las pestañas abiertas. Un inicio o cierre de sesión en una pestaña se refleja de inmediato en las demás.

### 3. Expulsiones desde la red (Errores HTTP)
El backend cuenta con defensas propias. `httpClient.ts` escucha las siguientes respuestas y desencadena un cierre de sesión forzoso, emitiendo el evento `auth:unauthorized` a `AuthContext`:
- **401 Unauthorized:** Token manipulado, expirado del lado del servidor o inválido.
- **403 Forbidden:** Intento de acceso a un servicio no correspondiente al Rol (expulsión preventiva).
- **423 Locked:** Cuenta del usuario bloqueada temporalmente.

### 4. Rutas Privadas (`AuthGuard.tsx`)
El `AuthGuard` bloquea todo renderizado bajo rutas privadas. 
Las reglas que sigue:
- Verifica que el estado de AuthContext sea `authenticated`.
- Realiza una validación cruda contra `localStorage` mediante `isSessionPhysicallyValid()` para garantizar que la sesión no es un estado "fantasma" de React (por un bug o mal uso).
- Intercepta el evento `pageshow` del Back-Forward Cache (BFCache). Si el usuario cerró sesión y luego usó la flecha "Atrás" del navegador, el `pageshow` detectará un token faltante y recargará la ventana de forma severa para demoler la persistencia.

### 5. Rutas Públicas (`GuestGuard.tsx`)
Los portales `/login` y `/security` están fuertemente custodiados por `GuestGuard`. Si un usuario que ya cuenta con un token de sesión funcional navega intencionalmente hacia estos portales, el GuestGuard intercepta el proceso y los lanza silenciosa y automáticamente hacia su Dashboard (`/administrador`, `/docente`, etc). Esto evita "paseos" ilícitos.

### 6. Destrucción Absoluta (Logout)
Ningún menú, cabecera ni barra lateral navega libremente hacia un destino público si se pretende cerrar sesión. La única forma válida de salir del sistema en todo el código fuente es importando y llamando al método `logout()` de `AuthContext`.
Este método limpia la sesión y efectúa un `window.location.replace('/')`, garantizando el desmontaje completo del Router Cache de Next.js y un purgado visual.
