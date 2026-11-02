# CORAULA Frontend

CORAULA es el Sistema de Control y Registro Académico de Aula. Este frontend proporciona la interfaz de usuario para la gestión académica, integrando flujos para diferentes tipos de usuarios (Administradores, Directivos, Docentes, Estudiantes y Apoderados).

> ¿Vas a contribuir? Lee primero la [guía de contribución](CONTRIBUTING.md).

## Stack Tecnológico
- **Framework:** Next.js 16 (App Router)
- **Librería UI:** React 19
- **Lenguaje:** TypeScript (TSX)
- **Estilos:** Tailwind CSS v4
- **HTTP Client:** Axios
- **Manejo JWT:** jwt-decode

## Requisitos Previos
- Node.js 22
- npm (v9+)
- El servidor Backend (Spring Boot) ejecutándose y accesible en la red.

## Instalación
1. Clonar el repositorio.
2. Instalar dependencias:
   ```bash
   npm install
   ```

## Variables de Entorno
Copia la plantilla versionada `.env.example` a `.env.local` en la raíz (no versionado):
```bash
cp .env.example .env.local
```

| Variable | Valor local | Descripción |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_MODE` | (vacía) | `MOCK`, `LOCAL` o `PRODUCTION`. Los scripts la fijan; sin valor: `LOCAL` en `next dev` y `PRODUCTION` en `next build`. Un valor inválido detiene el arranque. |
| `NEXT_PUBLIC_LOCAL_API_URL` | `http://localhost:8080/api` | Modo `LOCAL`: URL del backend local, **incluyendo `/api`**. Si falta, usa `http://localhost:8080/api`. |
| `NEXT_PUBLIC_API_URL` | (no definir en local) | Modo `PRODUCTION`, obligatoria: URL del backend desplegado, incluyendo `/api`. |
| `NEXT_PUBLIC_MOCK_LATENCY_MS` | `300` | Modo `MOCK`: latencia simulada de cada respuesta, para ver los estados de carga. |
| `NEXT_PUBLIC_USE_MOCKS` | — | **Obsoleta.** Sin `NEXT_PUBLIC_APP_MODE`, `true` equivale a `MOCK` y `false` a un modo no simulado. Junto con `NEXT_PUBLIC_APP_MODE=MOCK`, `false` es una contradicción y detiene el arranque: elimínala de tu `.env.local`. |

- Las variables `NEXT_PUBLIC_*` se leen al arrancar: **reinicia `npm run dev`** después de cambiarlas.
- Configuración central: `src/config/appConfig.ts` (`APP_MODE`, `API_BASE_URL`, `API_TIMEOUT`, `ENV_INFO`, `buildURL`).

## Modos de ejecución

| Modo | Cómo activarlo | Backend | Timeout | Indicador |
| --- | --- | --- | --- | --- |
| `MOCK` | `npm run dev:mock` | Ninguno: el adaptador de `src/mocks/http` responde sin salir a la red | 10 s | Banda inferior «MODO SIMULADO» |
| `LOCAL` | `npm run dev` | `NEXT_PUBLIC_LOCAL_API_URL` o `http://localhost:8080/api` | 10 s | Etiqueta «LOCAL» abajo a la derecha |
| `PRODUCTION` | `npm run build` + `npm run start` (Vercel) | `NEXT_PUBLIC_API_URL` (obligatoria) | 20 s (arranque en frío de Render) | Ninguno |

- **El frontend local no debe apuntar a producción.** No existe un script para ello: el CORS del backend de producción solo acepta el dominio de Vercel y los datos son reales. Para trabajar en local, levanta el backend local (`coraula-backend` en el puerto 8080) o usa `MOCK`.
- En Vercel (producción), `next.config.mjs` detiene el build si `NEXT_PUBLIC_APP_MODE` no es `PRODUCTION`.

### Modo MOCK
- Usuarios de demostración (cualquier contraseña de 8 o más caracteres): `admin@demo.local` (ADMINISTRADOR), `secretaria@demo.local` (DIRECTIVO), `docente@demo.local` (DOCENTE) y `padre@demo.local` (APODERADO). `bloqueado@demo.local` responde 423; cualquier otro correo, 401. Estos usuarios solo existen en `MOCK`: fuera de ese modo el adaptador no se incluye en el bundle.
- El token es un JWT sin firma válida, decodificable, con el rol y una expiración de 8 h.
- Datos sintéticos y coherentes entre portales (el mismo alumno aparece en gestión, docente y apoderado). Las escrituras se aplican en memoria y se pierden al recargar la página.
- Una ruta sin datos simulados responde 501 `MOCK_NOT_IMPLEMENTED` y deja un aviso en la consola con la ruta.
- Rutas cubiertas: `src/mocks/http/mockAuth.ts` y `src/mocks/http/fixtures/{admin,docente,apoderado}.ts`.

### Deuda técnica
- `src/lib/api.ts` (portal Alumno y chat del docente) queda fuera de los modos: usa `fetch` con su propia `API_URL` (espera `/api/v1`, por defecto `http://localhost:8000/api/v1`) y sus mocks antiguos (`src/lib/mocks/*`). El adaptador de axios no lo cubre; su unificación con `httpClient` queda pendiente.

## Ejecución Local
Para arrancar el servidor de desarrollo en `http://localhost:3000` contra el backend local:
```bash
npm run dev
```
Sin backend, con datos simulados:
```bash
npm run dev:mock
```

## Validaciones y Build
Para validar reglas de linter y tipeado estricto:
```bash
npm run lint
```
Para construir la versión optimizada de producción:
```bash
npm run build
```

## Estructura Principal
El proyecto usa **App Router** de Next.js (`src/app`).
- `src/app/`: Contiene las páginas, rutas y layouts.
- `src/components/`: Componentes reutilizables, guards globales y UI.
- `src/contexts/`: Manejo de estado global (ej. `AuthContext`).
- `src/services/`: Capa de conexión al backend (`httpClient`, `authService`).
- `src/types/`: Definiciones y contratos TS.
- `docs/`: Documentación arquitectónica, técnica y de pruebas.

## Autenticación y Rutas
La aplicación se divide en una zona pública y múltiples zonas privadas protegidas.

### Rutas Públicas
- `/`: Panel de selección de usuario (Landing).
- `/security`: Portal de autenticación para personal (Admin/Directivo/Docente).
- `/login`: Portal de autenticación para familias (Apoderado/Estudiante).

*(Las pantallas de autenticación están protegidas por `GuestGuard` que repele a usuarios ya logueados de vuelta a sus dashboards).*

### Roles Oficiales y Rutas Privadas
La autenticación depende estrictamente de un JWT emitido por el backend, cuyo payload se gestiona en `AuthContext` y se verifica en `AuthGuard`. Los destinos y roles soportados son:
- **ADMINISTRADOR** → `/administrador`
- **DIRECTIVO** → `/administrador`
- **DOCENTE** → `/docente`
- **ESTUDIANTE** → `/alumno`
- **APODERADO** → `/padre`

Para un mayor detalle sobre la capa de seguridad, consulte `docs/autenticacion.md`.

## Comunicación con Backend
Todo acceso al backend se realiza mediante `src/services/httpClient.ts`, una instancia de Axios pre-configurada para adjuntar automáticamente el JWT de autorización almacenado en `localStorage`. Cualquier Error HTTP 401, 403 o 423 se captura de manera proactiva a nivel global para forzar la expiración de la sesión.
