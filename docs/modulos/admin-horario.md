# Administrador · Horario por grado y sección

## Objetivo
Permite al administrador ver el horario semanal de cada sección como una grilla (horas en filas, días en columnas) y gestionar sus bloques: crear, editar y eliminar, con aviso de choques. Reemplaza la lista por día que había antes.

## Rutas
- `/administrador/horario` -> `vistaDeLosGrados`: tarjetas por sección con enlace a su horario.
- `/administrador/horario/gradoHorario/[id]` -> `horarioDelGrado`: grilla semanal de la sección `id`.

## Componentes principales
- `vistaDeLosGrados`: lista de secciones. Usa `useGradeTree`; la búsqueda y el filtro de nivel se hacen en el cliente.
- `horarioDelGrado`: cabecera de la sección, filtro «Día», grilla y diálogos de detalle, formulario y eliminación.
- `components/ScheduleGrid`: pinta el modelo de la grilla. Cada bloque es un `<button>` con `aria-label` completo; la región tiene `tabIndex=0` y desplazamiento horizontal (`min-w-[760px]`).
- `components/scheduleUi.ts`: etiquetas de día, clases comunes y `SCHEDULE_PALETTE` (7 variantes con tokens de `globals.css`).
- `ScheduleForm`, `ScheduleDetails`, `ScheduleDialog`, `ScheduleConflictError`: sin cambios de contrato.

## Estado/contexto
Estado local en cada vista (sin Provider). `horarioDelGrado` mantiene tres cargas independientes (sección, cursos y horario), cada una con su revisión para reintentar.

## Servicios
- `schedulesService.listBySection(id)`: `GET /v1/management/sections/{id}/schedule`. Crear, editar y eliminar usan `POST|PATCH|DELETE /v1/management/schedules`.
- `sectionsService.getById(id)`: `GET /v1/management/sections/{id}`.
- `sectionCoursesService.list(id)`: cursos de la sección para el formulario.
- `vacanciesService.list(periodo)`: `GET /v1/management/vacancies`, a través de `useGradeTree` y `toGradeTree`.

## Adapter de la grilla
`toScheduleGrid(bloques, día?)` en `src/adapters/scheduleGridAdapter.ts` (tipos en `src/types/scheduleGrid.ts`). Es puro: sin React ni clases CSS.
- **Validación:** descarta días fuera de `SchoolDay` (no hay sábado) y horas inválidas o con inicio >= fin; los cuenta en `discarded`.
- **Unidad:** 1 fila = 5 minutos; los minutos que no son múltiplo de 5 se redondean al más cercano. Una hora mide 56 px (`h-14`), por lo que 45 min = 9 filas (42 px) y 90 min = 18 filas (84 px).
- **Rango:** mínimo 07:00 a 15:00, ampliado a la hora en punto anterior al primer inicio y siguiente al último fin. Se calcula con todos los bloques válidos, no solo con el día filtrado.
- **Superposición:** por día, los bloques que se solapan (de forma transitiva) forman un grupo; cada uno toma el primer carril libre y mide `1/lanes` de ancho. Que un fin coincida con otro inicio no es solape.
- **Color:** `courseId % 7`; no cambia al reordenar.
- **Compacto:** `compact` es verdadero si dura menos de 60 min. La vista lo traduce a tres niveles de detalle (ver más abajo).
- **Límites:** los minutos redondeados no pasan de 23:55 (el eje nunca muestra «24:00»). El inicio del rango sale del minuto ya redondeado: 06:58 cuenta como 07:00 y no agrega una hora vacía.
- **Accesibilidad:** `ariaLabel` «Matemática, lunes de 08:00 a 09:30, docente X, aula Y», con «sin docente asignado» y «sin aula» si faltan datos.

## Niveles de detalle del bloque
Una hora mide 56 px; el botón mide 2 px menos que su fila (el `li` lleva `py-px`). Con `leading-tight` (1,25) las líneas miden: nombre 13,75 px, hora y docente 12,5 px, insignia de aula 13 px, separación 2 px.

| Duración | Botón | Contenido útil | Líneas | Alto necesario |
|---|---|---|---|---|
| 45 min (`compact`, `p-1`) | 40 px | 30 px | nombre + «hora · aula» | 28,25 px |
| 60 a 89 min (`medium`, `p-2`) | 54 px (60 min) | 36 px | nombre + «hora · aula»; sin docente | 28,25 px |
| 90 min o más (`full`, `p-2`) | 82 px (90 min) | 64 px | nombre, hora, docente e insignia de aula | 57,75 px |

El docente de los bloques de menos de 90 min no se muestra en la grilla, pero sigue en el `aria-label` y en el detalle. Con docente, un bloque de 60 min necesitaría 43 px y no cabe en 36. Solo el nivel `full` usa la insignia `rounded-full`. La prueba de `tests/adminSchedule.test.tsx` comprueba las líneas de 45, 60, 85 y 90 min.

## Paleta y contraste
Contraste del texto sobre el fondo de cada variante (WCAG, mínimo 4,5:1):

| # | Clases | Contraste |
|---|---|---|
| 0 | `bg-accent text-white` | 6,29 |
| 1 | `bg-success-ink text-white` | 5,02 |
| 2 | `bg-warning-ink text-white` | 4,92 |
| 3 | `bg-ink text-white` | 17,74 |
| 4 | `bg-accent-soft text-accent` | 5,24 |
| 5 | `bg-success text-success-ink` | 4,57 |
| 6 | `bg-white text-warning-ink` | 4,92 |

El texto de los bloques no usa opacidad: con `opacity-90` u `opacity-80` las variantes 1, 2, 5 y 6 bajarían de 4,5:1.

## Integración backend
- `SchoolDay` solo tiene lunes a viernes; la columna de sábado del diseño original no existe.
- Los choques (sección, docente y aula) llegan como 409 y se muestran con `ScheduleConflictError`.
- 404 de la sección: «Sección no encontrada». 403: mensaje de permiso en la lista de grados.

## Mocks temporales
Fixtures en `src/mocks/http/fixtures/` (`admin.ts` y `shared.ts`). La sección 12 tiene, además de un bloque por curso y día, tres bloques sueltos (ids 4061 a 4063: 45, 45 y 90 min). No hay bloques superpuestos en el MOCK porque el backend los rechaza; el solape se prueba solo con datos de prueba.

## Decisiones técnicas
- El alta no se hace pulsando una celda vacía: se mantiene el botón «Agregar clase».
- No se restauran «Crear Horario», sábado, «Semana de», modalidad, horas por semana, tutor ni estado del horario: el backend no los tiene.
- El filtro de nivel y la búsqueda de grados son del cliente; el backend no los recibe.

## Pruebas
- `tests/scheduleGridAdapter.test.tsx`: rangos, 45 y 90 min, redondeo, carriles, color estable, descartes, orden, `ariaLabel` y filtro.
- `tests/adminSchedule.test.tsx`: grilla (botones, detalle, vacío, error y 404) y lista de grados (`ready`, `forbidden`, `no-period`, `error`, enlaces).
- `tests/mockAdapter.test.tsx`: horario de la sección 12.

## Pendientes
- [ ] Crear bloques desde una celda vacía (fuera del alcance de #156).
