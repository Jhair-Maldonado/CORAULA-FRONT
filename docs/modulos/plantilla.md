# Plantilla de Documentación Modular

*Usa esta plantilla para documentar módulos funcionales (ej: Padres, Docentes, Administrador).*
*NO crear un README.md dentro de las carpetas de módulo; la documentación viva debe almacenarse aquí (`docs/modulos/`)*

# Nombre del módulo (ej: Módulo Padres)

## Objetivo
*(Breve descripción funcional: Para qué existe, a quién está destinado, y qué flujos engloba).*

## Rutas
*(Listado de rutas App Router asociadas a este módulo)*
- `/ruta-base` -> Descripción principal.
- `/ruta-base/[id]` -> Detalle dinámico.

## Componentes principales
*(Componentes UI complejos o estructurales exclusivos de este bloque)*
- `Sidebar<Nombre>`: (Descripción breve)
- `Tabla<Entidad>`: (Descripción breve)

## Estado/contexto
*(Si requiere Providers locales, zustand o SWR mutantes detallarlos aquí)*

## Servicios
*(Funciones y peticiones HTTP delegadas a este módulo)*
- `servicio1()`: Propósito y Endpoints `/v1/...` afectados.

## Integración backend
*(Particularidades de la comunicación, DTOs importantes o estados HTTP específicos esperados)*

## Mocks temporales
*(Si aún existen hardcodes para pruebas de interfaz por falta del backend o base de datos en Spring, indícalos aquí para seguimiento)*

## Decisiones técnicas
*(Por qué se usa un Layout anidado, por qué un CSR en vez de SSR para una página específica, etc)*

## Pendientes
- [ ] Tarea o refactor técnico por saldar.
- [ ] Endpoint de backend no integrado.
