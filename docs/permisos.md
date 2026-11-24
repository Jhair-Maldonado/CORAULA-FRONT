# Permisos en la interfaz

## Qué es y qué no es
`src/config/permissions.ts` es el catálogo central de lo que cada rol puede **hacer en la UI** (mostrar un botón, abrir una vista, habilitar una acción). Solo controla la interfaz: la autorización real es del backend (`SecurityConfiguration` y `@PreAuthorize`), que responde 403 aunque la UI deje intentar. Ocultar un botón no protege nada.

Fuente de los roles: `docs/permisos/matriz.yaml` del backend. El frontend guarda una copia en `tests/fixtures/permisos-matriz.yaml` (con el commit de origen en su primera línea) y `tests/permissions.test.tsx` comprueba que cada acción coincida con ella.

## Piezas
- `ACTION_ROLES`: acción → roles (`<entidad>.<verbo>`, por ejemplo `period.manage`).
- `ACTION_ENDPOINTS`: acción → endpoints del backend que la respaldan (puente con la matriz). La prueba exige que los roles de la acción sean la intersección de los de sus endpoints; con `{ prefijo }` (portal), la unión.
- `can(role, action)` y `canWithSession(auth, action)`: puras; falsas con rol nulo o desconocido y con acción inexistente. `canWithSession` exige además sesión `authenticated` y vigente.
- `rolesFor(action)`: lista de roles para `AuthGuard` (`allowedRoles`).
- `useCan(action)` (`src/hooks/useCan.ts`): hook para las vistas. Llámalo antes de cualquier `return` temprano.
- `FORBIDDEN_ACTION_MESSAGE` e `isForbidden(error)`: texto uniforme para el 403 de una escritura («No tienes permiso para esta acción.»). Los 403 de lectura conservan su mensaje propio.
- `src/utils/authRoutes.ts`: helpers de rol para login y guards (`isStaffRole`, `isPortalUserRole`, `portalPathForRole`); no deciden permisos de acciones.

## Cómo añadir una acción
1. Verifica el endpoint y sus roles en la matriz del backend (`docs/permisos/matriz.yaml`).
2. Agrega la acción a `ACTION_ROLES` y sus endpoints a `ACTION_ENDPOINTS`.
3. Usa `useCan('<acción>')` en la vista; nunca compares el rol a mano.
4. Si la ruta se simula en `src/mocks/http/fixtures/`, usa los mismos roles que la matriz: `tests/permissions.test.tsx` lo comprueba.
5. En escrituras, muestra `FORBIDDEN_ACTION_MESSAGE` ante un 403.

## Regla de actualización del fixture
Cuando cambie `docs/permisos/matriz.yaml` en el backend, se abre un issue en el frontend: se copia el archivo al fixture (actualizando el commit del comentario inicial), se ajusta el catálogo y las pruebas fallan hasta que coincidan.

## Pendientes
- `TODO(#138)`: `audit.read` incluye a DIRECTIVO porque el backend aún no aplica P2 de BACK #135; restringir a ADMINISTRADOR cuando lo aplique.
