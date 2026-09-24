# CORAULA Frontend

CORAULA es el Sistema de Control y Registro Académico de Aula. Este frontend proporciona la interfaz de usuario para la gestión académica, integrando flujos para diferentes tipos de usuarios (Administradores, Directivos, Docentes, Estudiantes y Apoderados).

## Stack Tecnológico
- **Framework:** Next.js 16 (App Router)
- **Librería UI:** React 19
- **Lenguaje:** TypeScript (TSX)
- **Estilos:** Tailwind CSS v4
- **HTTP Client:** Axios
- **Manejo JWT:** jwt-decode

## Requisitos Previos
- Node.js (v18+)
- npm (v9+)
- El servidor Backend (Spring Boot) ejecutándose y accesible en la red.

## Instalación
1. Clonar el repositorio.
2. Instalar dependencias:
   ```bash
   npm install
   ```

## Variables de Entorno
Crea un archivo `.env.local` en la raíz (no versionado):
```env
# URL del backend para peticiones Axios (ej: http://localhost:8080)
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## Ejecución Local
Para arrancar el servidor de desarrollo en `http://localhost:3000`:
```bash
npm run dev
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
