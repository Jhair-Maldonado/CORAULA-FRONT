# CORAULA - Plataforma Educativa Integrada

Frontend web de la plataforma educativa **CORAULA**, desarrollado en **Next.js (App Router)**, **TypeScript** y **Tailwind CSS**, implementado a partir del sistema de diseño oficial en `cary.pen` (Pencil).

---

## 🚀 Cómo correr el proyecto

### 1. Instalación de dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
Crea o revisa tu archivo `.env.local`:
```bash
# Copiar desde la plantilla
cp .env.example .env.local
```

### 3. Iniciar el servidor de desarrollo
```bash
npm run dev
```
Abre en tu navegador [http://localhost:3000](http://localhost:3000) o ingresa directamente al portal de padres en [http://localhost:3000/padre](http://localhost:3000/padre).

### 4. Compilación para producción
```bash
npm run build
npm run start
```

---

## 📁 Estructura del Proyecto (Módulo Padres)

```text
src/
├── app/
│   ├── (padres)/padre/           # Rutas y layout del Portal de Padres
│   │   ├── layout.tsx            # Layout común (Sidebar, Header con selector de hijo, PadreProvider)
│   │   ├── page.tsx              # Dashboard general (Métricas, avisos, tareas, pagos)
│   │   ├── hijos/
│   │   │   ├── page.tsx          # Listado de hijos / estudiantes a cargo
│   │   │   └── [id]/page.tsx     # Ficha completa del estudiante (académica y médica)
│   │   ├── calificaciones/page.tsx # Libreta de notas por competencias y descarga oficial en PDF
│   │   ├── asistencia/page.tsx   # Marcaciones biométricas diarias y justificaciones
│   │   ├── horario/page.tsx      # Horario semanal de clases por día y materias
│   │   ├── justificaciones/page.tsx # Alertas en vivo (>15 min de retraso), justificaciones e incidencias
│   │   ├── comunicados/page.tsx  # Circulares escolares, avisos urgentes y firma digital
│   │   └── chat/page.tsx         # Mensajería directa con los docentes tutores
│   ├── globals.css               # Tokens de diseño extraídos de cary.pen
│   └── page.tsx                  # Selector de roles institucional
│
├── components/
│   ├── ui/                       # Componentes reutilizables del sistema de diseño
│   │   ├── Badge.tsx             # Chips de estado (accent, success, warning, danger, neutral, info)
│   │   ├── Button.tsx            # Botones con variantes, tamaños, iconos y estados de carga
│   │   ├── Card.tsx              # Card, CardHeader, CardTitle, CardDescription, CardContent
│   │   ├── EmptyState.tsx        # Estado vacío accesible con icono y acción
│   │   ├── ErrorState.tsx        # Estado de error accesible con reintento
│   │   ├── Input.tsx             # Inputs de texto, textareas y selects con validación
│   │   ├── LoadingSkeleton.tsx   # Esqueletos animados de carga (cards, tablas, líneas)
│   │   ├── Modal.tsx             # Diálogo modal accesible con backdrop-blur y tecla Escape
│   │   └── Tabs.tsx              # Navegación horizontal por pestañas con badges
│   │
│   └── padres/                   # Componentes específicos del módulo de padres
│       ├── PadreContext.tsx      # Contexto global: padre actual y cambio de hijo activo
│       ├── PadreHeader.tsx       # Cabecera con selector desplegable de hijo y notificaciones
│       ├── PadreSidebar.tsx      # Barra lateral fija (escritorio) y drawer responsivo (móvil)
│       ├── HijoCard.tsx          # Tarjeta interactiva de estudiante con métricas y accesos
│       ├── JustificacionModal.tsx# Modal para registrar justificaciones de inasistencia
│       ├── PagoModal.tsx         # Modal para reportar transferencias y pagos de pensión
│       └── ComunicadoModal.tsx   # Modal de lectura completa y firma digital de autorizaciones
│
├── types/
│   ├── padre.ts                  # Interfaces TypeScript de todo el modelo de datos de padres
│   └── index.ts                  # Exportación centralizada de tipos
│
├── lib/
│   ├── api.ts                    # Capa de datos desacoplada (con soporte Mocks vs Backend real)
│   └── mocks/
│       └── mockPadres.ts         # Datos de prueba realistas (estudiantes, notas, cronogramas, chat)
```

---

## 🔌 Cómo cambiar de Mocks al Backend Real

El frontend está **100% listo para conectarse al backend real** sin alterar los componentes de la interfaz.

La lógica de conexión se centraliza en `src/lib/api.ts` y se controla a través de variables de entorno:

### 1. Activar Backend Real
En tu archivo `.env.local`, cambia la variable `NEXT_PUBLIC_USE_MOCKS` a `false` e indica la URL del servidor API:

```env
NEXT_PUBLIC_API_URL=https://api.coraula.edu.pe/v1
NEXT_PUBLIC_USE_MOCKS=false
```

### 2. Flujo de Autenticación
- Cuando `NEXT_PUBLIC_USE_MOCKS=false`, cada petición HTTP incluye automáticamente el encabezado:
  ```http
  Authorization: Bearer <token>
  ```
  tomado de `localStorage.getItem('coraula_token')`.
- Si el backend responde con un error HTTP (ej. 401, 403, 404, 500), `fetchWithAuth` captura el mensaje JSON devuelto y lo propaga a los estados de error de la interfaz para que el usuario pueda reintentar.

### 3. Puntos de Contacto marcados con `// TODO(backend)`
Cada función en `src/lib/api.ts` documenta el endpoint esperado y los parámetros que deben acordarse con el equipo de backend:

| Acción | Función en `src/lib/api.ts` | Endpoint sugerido |
| :--- | :--- | :--- |
| Perfil del Padre | `getPadrePerfil()` | `GET /padres/perfil` |
| Lista de Hijos | `getHijos()` | `GET /padres/mis-hijos` |
| Ficha de Estudiante | `getHijoById(id)` | `GET /estudiantes/:id/ficha-padre` |
| Resumen Dashboard | `getDashboardResumen(hijoId)` | `GET /padres/dashboard?hijoId=:id` |
| Calificaciones | `getCalificaciones(hijoId, bim)` | `GET /academico/calificaciones?hijoId=:id` |
| Asistencia | `getAsistencia(hijoId, mes)` | `GET /asistencia/estudiante/:id?mes=:mes` |
| Justificar Falta | `enviarJustificacion(data)` | `POST /asistencia/justificaciones` |
| Horario Escolar | `getHorario(hijoId)` | `GET /horarios/estudiante/:id` |
| Comunicados | `getComunicados(hijoId)` | `GET /comunicados?para=padres` |
| Firma Digital | `firmarComunicado(id, firma)` | `POST /comunicados/:id/firmar` |
| Pensiones / Pagos | `getPagos(hijoId)` | `GET /finanzas/pensiones?hijoId=:id` |
| Reportar Abono | `registrarPago(data)` | `POST /finanzas/pagos/reportar` |
| Chat con Tutores | `getChatContactos()` / `enviarMensajeChat()` | `GET /chat/contactos` / `POST /chat/mensajes` |

---

## 🎨 Tokens de Diseño (extraídos de `cary.pen`)

- **Canvas (Fondo):** `#F3F4F6`
- **Accent (Borgoña Institucional):** `#BE123C`
- **Accent Soft:** `#FFE4E6`
- **Ink (Texto Principal):** `#111827`
- **Muted (Secundario):** `#6B7280`
- **Line (Bordes):** `#E5E7EB`
- **Success:** `#DCFCE7` / `#15803D`
- **Tipografía:** Manrope, Inter y System Sans
