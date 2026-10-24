# Arquitectura del Frontend

Este documento detalla la estructura base, los flujos y las responsabilidades arquitectónicas principales del proyecto CORAULA.

## Diagrama de la Arquitectura de Next.js App Router

```text
src/
├── app/                      # Rutas de la UI y Layouts (Next.js 13+ App Router)
│   ├── (public)/             # Rutas públicas (/, /login, /security)
│   ├── administrador/        # Dashboard y rutas para Administrador y Directivo
│   ├── docente/              # Dashboard para el Docente
│   ├── alumno/               # Dashboard para el Estudiante
│   └── padre/                # Dashboard para el Apoderado
│
├── components/               # Componentes Globales (Guards, Loaders, UI genérica)
│
├── contexts/                 # Manejo de Estados Globales
│   └── AuthContext.tsx       # Estado y persistencia del Token JWT y AuthStatus
│
├── services/                 # Capa de Acceso a Datos / Backend
│   ├── httpClient.ts         # Instancia Axios (Interceptors, Headers, Error Handling)
│   └── authService.ts        # Peticiones exclusivas de Autenticación
│
└── types/                    # Tipos de TypeScript (BackendRole, Interfaces globales)
```

## Patrón y Responsabilidades

La arquitectura del frontend aplica el principio de segregación de responsabilidades: la Interfaz de Usuario se compone de **Layouts** y páginas, protegidas por **Guards**, que reaccionan a un **Estado Global**, el cual es abastecido por **Servicios** comunicados vía HTTP al backend.

### 1. Manejo de Estado (AuthContext)
`AuthContext.tsx` es el proveedor único (`<AuthProvider>`) y fuente de la verdad para toda la aplicación. Se sitúa en la parte superior del árbol (`RootLayout`) y se encarga de:
- Mantener en memoria el token, rol y la validez de la sesión.
- Sincronizar el estado de React con la persistencia física en `localStorage`.
- Despachar un timer dinámico basado en la fecha `exp` del JWT para invalidación automática.
- Proveer el método global y absoluto de `logout()` que destruye todo vestigio y efectúa una recarga dura de limpieza de Router Cache (`window.location.replace('/')`).

### 2. Capa de Seguridad (Guards)

**AuthGuard:**
Protege todo el contenido privado del acceso no autorizado. Si la sesión no es válida, interrumpe el renderizado y empuja al usuario hacia fuera. 
- *Ubicación:* Usado dentro del `layout.tsx` de cada módulo privado (`/administrador`, `/docente`, etc).

**GuestGuard:**
Garantiza que usuarios que ya se encuentran autenticados con un JWT legítimo NO puedan observar ni permanecer en las pantallas de inicio de sesión (`/login`, `/security`). Si detecta una sesión válida, re-enruta automáticamente hacia los respectivos dashboards privados.
- *Ubicación:* Envuelve directamente el layout de las pantallas de acceso.

### 3. Conexión Backend (Servicios HTTP)
La separación entre el servicio y el cliente base asegura flexibilidad y control.

**httpClient.ts:**
Una configuración base estandarizada utilizando **Axios**. Se encarga de:
- Adjuntar el Bearer Token a cada petición (Interceptores Request).
- Identificar códigos de estado 401/403/423 emitidos por Spring Boot, para disparar eventos asíncronos que matan la sesión y ejecutan el deslogueo en la UI (Interceptores Response).

**authService.ts:**
Consume `httpClient` para orquestar flujos de login. Las interacciones con otros módulos (Docentes, Cursos) contarán con sus propios servicios homólogos (e.g., `docenteService.ts`).

### 4. Layouts por Módulo (App Router)
Cada bloque de roles (`/administrador`, `/docente`, etc.) tiene su propio `layout.tsx`. Esto favorece:
- La creación de menús laterales (Sidebars) modulares.
- La anidación natural de rutas.
- El cacheo de layouts para navegación instantánea entre subservicios de un mismo módulo.
