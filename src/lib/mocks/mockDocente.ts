// src/lib/mocks/mockDocente.ts
import {
  CursoDocente,
  BloqueHorarioDocente,
  CursoDetalleDocente,
  AsistenciaCursoDocente,
  NotasCursoDocente,
  ChatContactoDocente,
  DocenteDashboardData
} from '@/types/docentes';

export const MOCK_CURSOS_DOCENTE: CursoDocente[] = [
  {
    id: 'mat-3a',
    nombre: 'Matemáticas',
    grado: '3ro Secundaria - A',
    nivel: 'Secundaria',
    seccion: 'A',
    color: '#FF6B6B',
    alumnosCount: 28,
    horarioResumen: 'Lun · Mié 09:30 - 11:30',
    aula: 'Aula 204'
  },
  {
    id: 'fis-4b',
    nombre: 'Física',
    grado: '4to Secundaria - B',
    nivel: 'Secundaria',
    seccion: 'B',
    color: '#4D96FF',
    alumnosCount: 26,
    horarioResumen: 'Lun · Jue 08:00 - 09:00',
    aula: 'Lab. Ciencias'
  },
  {
    id: 'qui-2c',
    nombre: 'Química',
    grado: '2do Secundaria - C',
    nivel: 'Secundaria',
    seccion: 'C',
    color: '#6BCB77',
    alumnosCount: 30,
    horarioResumen: 'Mar · Vie 10:30 - 11:30',
    aula: 'Lab. Química'
  },
  {
    id: 'bio-3a',
    nombre: 'Biología',
    grado: '3ro Secundaria - A',
    nivel: 'Secundaria',
    seccion: 'A',
    color: '#FFD93D',
    alumnosCount: 28,
    horarioResumen: 'Mié · Vie 12:30 - 13:30',
    aula: 'Aula 204'
  },
  {
    id: 'his-1b',
    nombre: 'Historia',
    grado: '1ro Secundaria - B',
    nivel: 'Secundaria',
    seccion: 'B',
    color: '#9D4EDD',
    alumnosCount: 25,
    horarioResumen: 'Jue 11:30 - 13:00',
    aula: 'Aula 102'
  }
];

export const MOCK_HORARIO_HOY_DOCENTE: BloqueHorarioDocente[] = [
  {
    id: 'b-1',
    hora: '08:00 - 09:00',
    horaInicio: '08:00',
    horaFin: '09:00',
    curso: 'Física',
    grado: '4to Secundaria B',
    esActual: true,
    esDescanso: false,
    tiempoRestante: 'Termina en 20 min'
  },
  {
    id: 'b-2',
    hora: '09:00 - 09:30',
    horaInicio: '09:00',
    horaFin: '09:30',
    curso: 'Descanso',
    esActual: false,
    esDescanso: true
  },
  {
    id: 'b-3',
    hora: '09:30 - 10:30',
    horaInicio: '09:30',
    horaFin: '10:30',
    curso: 'Matemáticas',
    grado: '3ro Secundaria A',
    esActual: false,
    esDescanso: false
  },
  {
    id: 'b-4',
    hora: '10:30 - 11:30',
    horaInicio: '10:30',
    horaFin: '11:30',
    curso: 'Química',
    grado: '2do Secundaria C',
    esActual: false,
    esDescanso: false
  },
  {
    id: 'b-5',
    hora: '11:30 - 12:30',
    horaInicio: '11:30',
    horaFin: '12:30',
    curso: 'Almuerzo',
    esActual: false,
    esDescanso: true
  },
  {
    id: 'b-6',
    hora: '12:30 - 13:30',
    horaInicio: '12:30',
    horaFin: '13:30',
    curso: 'Biología',
    grado: '3ro Secundaria A',
    esActual: false,
    esDescanso: false
  }
];

export const MOCK_CURSO_DETALLE_MATEMATICAS: CursoDetalleDocente = {
  id: 'mat-3a',
  nombre: 'Matemáticas',
  grado: '3ro Secundaria - A',
  seccion: 'A',
  color: '#FF6B6B',
  totalClases: 6,
  totalTareas: 5,
  semanas: [
    {
      id: 'sem-1',
      numero: 1,
      titulo: 'Semana 1',
      clasesCount: 2,
      clases: [
        {
          id: 'c-101',
          numero: 1,
          nombre: 'Clase 1: Introducción a derivadas',
          tipo: 'documento',
          tieneTarea: true,
          archivoNombre: 'Guia_Derivadas_Basicas.pdf',
          fecha: '08 Sep 2026'
        },
        {
          id: 'c-102',
          numero: 2,
          nombre: 'Clase 2: Ejercicios prácticos',
          tipo: 'video',
          tieneTarea: true,
          archivoNombre: 'Resolucion_Problemas_Paso_a_Paso.mp4',
          fecha: '10 Sep 2026'
        }
      ]
    },
    {
      id: 'sem-2',
      numero: 2,
      titulo: 'Semana 2',
      clasesCount: 2,
      clases: [
        {
          id: 'c-201',
          numero: 3,
          nombre: 'Clase 3: Regla de la cadena y cocientes',
          tipo: 'documento',
          tieneTarea: true,
          archivoNombre: 'Reglas_Operacion_Calculo.pdf',
          fecha: '15 Sep 2026'
        },
        {
          id: 'c-202',
          numero: 4,
          nombre: 'Clase 4: Aplicaciones en física cinemática',
          tipo: 'ejercicios',
          tieneTarea: false,
          archivoNombre: 'Taller_Velocidad_Aceleracion.docx',
          fecha: '17 Sep 2026'
        }
      ]
    },
    {
      id: 'sem-3',
      numero: 3,
      titulo: 'Semana 3',
      clasesCount: 2,
      clases: [
        {
          id: 'c-301',
          numero: 5,
          nombre: 'Clase 5: Máximos, mínimos y concavidad',
          tipo: 'documento',
          tieneTarea: true,
          archivoNombre: 'Optimizacion_Funciones.pdf',
          fecha: '22 Sep 2026'
        },
        {
          id: 'c-302',
          numero: 6,
          nombre: 'Clase 6: Evaluación continua bimestral',
          tipo: 'evaluacion',
          tieneTarea: true,
          archivoNombre: 'Cuestionario_Evaluacion_Bimestral.pdf',
          fecha: '24 Sep 2026'
        }
      ]
    }
  ]
};

export const MOCK_ASISTENCIA_DOCENTE: AsistenciaCursoDocente = {
  cursoId: 'mat-3a',
  cursoNombre: 'Matemáticas',
  grado: '3ro Secundaria - A',
  mes: 'Septiembre 2026',
  fecha: '2026-09-23',
  estudiantes: [
    {
      id: 'est-1',
      nombre: 'Ana Torres',
      avatar: 'AT',
      asistenciaPorcentaje: 95,
      faltasPorcentaje: 5,
      incidencias: 0,
      estadoHoy: 'Presente'
    },
    {
      id: 'est-2',
      nombre: 'Bruno Castillo',
      avatar: 'BC',
      asistenciaPorcentaje: 88,
      faltasPorcentaje: 12,
      incidencias: 1,
      estadoHoy: 'Presente'
    },
    {
      id: 'est-3',
      nombre: 'Camila Ríos',
      avatar: 'CR',
      asistenciaPorcentaje: 92,
      faltasPorcentaje: 8,
      incidencias: 0,
      estadoHoy: 'Presente'
    },
    {
      id: 'est-4',
      nombre: 'Diego López',
      avatar: 'DL',
      asistenciaPorcentaje: 78,
      faltasPorcentaje: 22,
      incidencias: 3,
      estadoHoy: 'Tardanza'
    },
    {
      id: 'est-5',
      nombre: 'Elena Martín',
      avatar: 'EM',
      asistenciaPorcentaje: 90,
      faltasPorcentaje: 10,
      incidencias: 1,
      estadoHoy: 'Presente'
    },
    {
      id: 'est-6',
      nombre: 'Fernando Sánchez',
      avatar: 'FS',
      asistenciaPorcentaje: 100,
      faltasPorcentaje: 0,
      incidencias: 0,
      estadoHoy: 'Presente'
    },
    {
      id: 'est-7',
      nombre: 'Valentina Rojas',
      avatar: 'VR',
      asistenciaPorcentaje: 96,
      faltasPorcentaje: 4,
      incidencias: 0,
      estadoHoy: 'Presente'
    },
    {
      id: 'est-8',
      nombre: 'Mateo Salazar',
      avatar: 'MS',
      asistenciaPorcentaje: 91,
      faltasPorcentaje: 9,
      incidencias: 1,
      estadoHoy: 'Presente'
    },
    {
      id: 'est-9',
      nombre: 'Luciana Torres',
      avatar: 'LT',
      asistenciaPorcentaje: 94,
      faltasPorcentaje: 6,
      incidencias: 0,
      estadoHoy: 'Presente'
    },
    {
      id: 'est-10',
      nombre: 'Diego Mendoza',
      avatar: 'DM',
      asistenciaPorcentaje: 85,
      faltasPorcentaje: 15,
      incidencias: 2,
      estadoHoy: 'Falta'
    }
  ]
};

export const MOCK_ASISTENCIA_MAP: Record<string, AsistenciaCursoDocente> = {
  'mat-3a': MOCK_ASISTENCIA_DOCENTE,
  'bio-3a': {
    cursoId: 'bio-3a',
    cursoNombre: 'Biología',
    grado: '3ro Secundaria - A',
    mes: 'Septiembre 2026',
    fecha: '2026-09-23',
    estudiantes: [
      { id: 'est-3a-1', nombre: 'Ana Torres', avatar: 'AT', asistenciaPorcentaje: 95, faltasPorcentaje: 5, incidencias: 0, estadoHoy: 'Presente' },
      { id: 'est-3a-2', nombre: 'Bruno Castillo', avatar: 'BC', asistenciaPorcentaje: 90, faltasPorcentaje: 10, incidencias: 0, estadoHoy: 'Presente' },
      { id: 'est-3a-3', nombre: 'Camila Ríos', avatar: 'CR', asistenciaPorcentaje: 94, faltasPorcentaje: 6, incidencias: 0, estadoHoy: 'Presente' },
      { id: 'est-3a-4', nombre: 'Diego López', avatar: 'DL', asistenciaPorcentaje: 82, faltasPorcentaje: 18, incidencias: 2, estadoHoy: 'Tardanza' },
      { id: 'est-3a-5', nombre: 'Elena Martín', avatar: 'EM', asistenciaPorcentaje: 96, faltasPorcentaje: 4, incidencias: 0, estadoHoy: 'Presente' },
      { id: 'est-3a-6', nombre: 'Fernando Sánchez', avatar: 'FS', asistenciaPorcentaje: 100, faltasPorcentaje: 0, incidencias: 0, estadoHoy: 'Presente' },
      { id: 'est-3a-7', nombre: 'Valentina Rojas', avatar: 'VR', asistenciaPorcentaje: 92, faltasPorcentaje: 8, incidencias: 0, estadoHoy: 'Presente' },
      { id: 'est-3a-8', nombre: 'Mateo Salazar', avatar: 'MS', asistenciaPorcentaje: 88, faltasPorcentaje: 12, incidencias: 1, estadoHoy: 'Presente' },
      { id: 'est-3a-9', nombre: 'Luciana Torres', avatar: 'LT', asistenciaPorcentaje: 95, faltasPorcentaje: 5, incidencias: 0, estadoHoy: 'Presente' },
      { id: 'est-3a-10', nombre: 'Diego Mendoza', avatar: 'DM', asistenciaPorcentaje: 78, faltasPorcentaje: 22, incidencias: 3, estadoHoy: 'Falta' },
    ]
  },
  'fis-4b': {
    cursoId: 'fis-4b',
    cursoNombre: 'Física',
    grado: '4to Secundaria - B',
    mes: 'Septiembre 2026',
    fecha: '2026-09-23',
    estudiantes: [
      { id: 'est-4b-1', nombre: 'Rodrigo Mendoza', avatar: 'RM', asistenciaPorcentaje: 96, faltasPorcentaje: 4, incidencias: 0, estadoHoy: 'Presente' },
      { id: 'est-4b-2', nombre: 'Valeria Vargas', avatar: 'VV', asistenciaPorcentaje: 92, faltasPorcentaje: 8, incidencias: 0, estadoHoy: 'Presente' },
      { id: 'est-4b-3', nombre: 'Matías Paredes', avatar: 'MP', asistenciaPorcentaje: 85, faltasPorcentaje: 15, incidencias: 2, estadoHoy: 'Tardanza' },
      { id: 'est-4b-4', nombre: 'Sofía Castro', avatar: 'SC', asistenciaPorcentaje: 98, faltasPorcentaje: 2, incidencias: 0, estadoHoy: 'Presente' },
      { id: 'est-4b-5', nombre: 'Joaquín Morales', avatar: 'JM', asistenciaPorcentaje: 75, faltasPorcentaje: 25, incidencias: 3, estadoHoy: 'Falta' },
      { id: 'est-4b-6', nombre: 'Daniela Flores', avatar: 'DF', asistenciaPorcentaje: 90, faltasPorcentaje: 10, incidencias: 1, estadoHoy: 'Presente' },
      { id: 'est-4b-7', nombre: 'Gabriel Gutiérrez', avatar: 'GG', asistenciaPorcentaje: 94, faltasPorcentaje: 6, incidencias: 0, estadoHoy: 'Presente' },
      { id: 'est-4b-8', nombre: 'Andrea Benítez', avatar: 'AB', asistenciaPorcentaje: 88, faltasPorcentaje: 12, incidencias: 1, estadoHoy: 'Presente' },
      { id: 'est-4b-9', nombre: 'Sebastián Quispe', avatar: 'SQ', asistenciaPorcentaje: 91, faltasPorcentaje: 9, incidencias: 0, estadoHoy: 'Presente' },
      { id: 'est-4b-10', nombre: 'Nicole Ramos', avatar: 'NR', asistenciaPorcentaje: 82, faltasPorcentaje: 18, incidencias: 2, estadoHoy: 'Justificada' },
    ]
  },
  'qui-2c': {
    cursoId: 'qui-2c',
    cursoNombre: 'Química',
    grado: '2do Secundaria - C',
    mes: 'Septiembre 2026',
    fecha: '2026-09-23',
    estudiantes: [
      { id: 'est-2c-1', nombre: 'Carlos López', avatar: 'CL', asistenciaPorcentaje: 90, faltasPorcentaje: 10, incidencias: 1, estadoHoy: 'Presente' },
      { id: 'est-2c-2', nombre: 'Lucía Fernández', avatar: 'LF', asistenciaPorcentaje: 97, faltasPorcentaje: 3, incidencias: 0, estadoHoy: 'Presente' },
      { id: 'est-2c-3', nombre: 'Kevin Ramos', avatar: 'KR', asistenciaPorcentaje: 84, faltasPorcentaje: 16, incidencias: 2, estadoHoy: 'Presente' },
      { id: 'est-2c-4', nombre: 'Mariana Silva', avatar: 'MS', asistenciaPorcentaje: 95, faltasPorcentaje: 5, incidencias: 0, estadoHoy: 'Presente' },
      { id: 'est-2c-5', nombre: 'Alejandro Cruz', avatar: 'AC', asistenciaPorcentaje: 79, faltasPorcentaje: 21, incidencias: 3, estadoHoy: 'Tardanza' },
      { id: 'est-2c-6', nombre: 'Patricia Huamán', avatar: 'PH', asistenciaPorcentaje: 92, faltasPorcentaje: 8, incidencias: 0, estadoHoy: 'Presente' },
      { id: 'est-2c-7', nombre: 'Franco Delgado', avatar: 'FD', asistenciaPorcentaje: 88, faltasPorcentaje: 12, incidencias: 1, estadoHoy: 'Falta' },
      { id: 'est-2c-8', nombre: 'Jimena Medina', avatar: 'JM', asistenciaPorcentaje: 99, faltasPorcentaje: 1, incidencias: 0, estadoHoy: 'Presente' },
      { id: 'est-2c-9', nombre: 'Jorge Chávez', avatar: 'JC', asistenciaPorcentaje: 86, faltasPorcentaje: 14, incidencias: 1, estadoHoy: 'Presente' },
      { id: 'est-2c-10', nombre: 'Romina Prado', avatar: 'RP', asistenciaPorcentaje: 93, faltasPorcentaje: 7, incidencias: 0, estadoHoy: 'Presente' },
    ]
  },
  'his-1b': {
    cursoId: 'his-1b',
    cursoNombre: 'Historia',
    grado: '1ro Secundaria - B',
    mes: 'Septiembre 2026',
    fecha: '2026-09-23',
    estudiantes: [
      { id: 'est-1b-1', nombre: 'Diego Gómez', avatar: 'DG', asistenciaPorcentaje: 94, faltasPorcentaje: 6, incidencias: 0, estadoHoy: 'Presente' },
      { id: 'est-1b-2', nombre: 'Samuel Estrada', avatar: 'SE', asistenciaPorcentaje: 89, faltasPorcentaje: 11, incidencias: 1, estadoHoy: 'Presente' },
      { id: 'est-1b-3', nombre: 'Fabricio Vera', avatar: 'FV', asistenciaPorcentaje: 92, faltasPorcentaje: 8, incidencias: 0, estadoHoy: 'Presente' },
      { id: 'est-1b-4', nombre: 'Claudia Peña', avatar: 'CP', asistenciaPorcentaje: 96, faltasPorcentaje: 4, incidencias: 0, estadoHoy: 'Presente' },
      { id: 'est-1b-5', nombre: 'Gonzalo Rivas', avatar: 'GR', asistenciaPorcentaje: 80, faltasPorcentaje: 20, incidencias: 2, estadoHoy: 'Tardanza' },
      { id: 'est-1b-6', nombre: 'Natalia León', avatar: 'NL', asistenciaPorcentaje: 98, faltasPorcentaje: 2, incidencias: 0, estadoHoy: 'Presente' },
      { id: 'est-1b-7', nombre: 'Daniel Cáceres', avatar: 'DC', asistenciaPorcentaje: 74, faltasPorcentaje: 26, incidencias: 4, estadoHoy: 'Falta' },
      { id: 'est-1b-8', nombre: 'Pamela Ortiz', avatar: 'PO', asistenciaPorcentaje: 91, faltasPorcentaje: 9, incidencias: 1, estadoHoy: 'Presente' },
      { id: 'est-1b-9', nombre: 'Andrés Navarro', avatar: 'AN', asistenciaPorcentaje: 87, faltasPorcentaje: 13, incidencias: 1, estadoHoy: 'Presente' },
      { id: 'est-1b-10', nombre: 'Carolina Gil', avatar: 'CG', asistenciaPorcentaje: 95, faltasPorcentaje: 5, incidencias: 0, estadoHoy: 'Presente' },
    ]
  }
};

export const MOCK_NOTAS_DOCENTE: NotasCursoDocente = {
  cursoId: 'mat-3a',
  cursoNombre: 'Matemáticas',
  grado: '3ro Secundaria - A',
  mes: 'Septiembre 2026',
  periodo: '3er Bimestre',
  estudiantes: [
    { estudianteId: 'est-3', nombre: 'Camila Ríos', pasoEntrada: 16, trabajoClase: 20, ejercicios: 20, tareas: 18, revisionCuaderno: 17, pasoSalida: 20, notaFinal: 18.5 },
    { estudianteId: 'est-11', nombre: 'Lorenzo Luis', pasoEntrada: 16, trabajoClase: 20, ejercicios: 12, tareas: 14, revisionCuaderno: 16, pasoSalida: 20, notaFinal: 16.3 },
    { estudianteId: 'est-1', nombre: 'Ana Torres', pasoEntrada: 18, trabajoClase: 19, ejercicios: 20, tareas: 20, revisionCuaderno: 19, pasoSalida: 18, notaFinal: 19.0 },
    { estudianteId: 'est-2', nombre: 'Bruno Castillo', pasoEntrada: 12, trabajoClase: 14, ejercicios: 13, tareas: 15, revisionCuaderno: 14, pasoSalida: 13, notaFinal: 13.5 },
    { estudianteId: 'est-4', nombre: 'Diego López', pasoEntrada: 11, trabajoClase: 12, ejercicios: 10, tareas: 14, revisionCuaderno: 12, pasoSalida: 11, notaFinal: 11.7 },
    { estudianteId: 'est-5', nombre: 'Elena Martín', pasoEntrada: 17, trabajoClase: 18, ejercicios: 16, tareas: 17, revisionCuaderno: 18, pasoSalida: 17, notaFinal: 17.2 },
    { estudianteId: 'est-6', nombre: 'Fernando Sánchez', pasoEntrada: 20, trabajoClase: 20, ejercicios: 19, tareas: 20, revisionCuaderno: 20, pasoSalida: 20, notaFinal: 19.8 },
    { estudianteId: 'est-7', nombre: 'Valentina Rojas', pasoEntrada: 16, trabajoClase: 17, ejercicios: 18, tareas: 16, revisionCuaderno: 17, pasoSalida: 18, notaFinal: 17.0 },
    { estudianteId: 'est-8', nombre: 'Mateo Salazar', pasoEntrada: 15, trabajoClase: 14, ejercicios: 16, tareas: 15, revisionCuaderno: 14, pasoSalida: 15, notaFinal: 14.8 }
  ]
};

export const MOCK_NOTAS_MAP: Record<string, NotasCursoDocente> = {
  'mat-3a': MOCK_NOTAS_DOCENTE,
  'bio-3a': {
    cursoId: 'bio-3a',
    cursoNombre: 'Biología',
    grado: '3ro Secundaria - A',
    mes: 'Septiembre 2026',
    periodo: '3er Bimestre',
    estudiantes: [
      { estudianteId: 'est-3a-1', nombre: 'Ana Torres', pasoEntrada: 19, trabajoClase: 18, ejercicios: 19, tareas: 20, revisionCuaderno: 18, pasoSalida: 19, notaFinal: 18.8 },
      { estudianteId: 'est-3a-2', nombre: 'Bruno Castillo', pasoEntrada: 15, trabajoClase: 16, ejercicios: 14, tareas: 16, revisionCuaderno: 15, pasoSalida: 16, notaFinal: 15.3 },
      { estudianteId: 'est-3a-3', nombre: 'Camila Ríos', pasoEntrada: 17, trabajoClase: 19, ejercicios: 18, tareas: 19, revisionCuaderno: 17, pasoSalida: 18, notaFinal: 18.0 },
      { estudianteId: 'est-3a-4', nombre: 'Diego López', pasoEntrada: 12, trabajoClase: 13, ejercicios: 11, tareas: 12, revisionCuaderno: 13, pasoSalida: 12, notaFinal: 12.2 },
      { estudianteId: 'est-3a-5', nombre: 'Elena Martín', pasoEntrada: 18, trabajoClase: 17, ejercicios: 18, tareas: 18, revisionCuaderno: 19, pasoSalida: 18, notaFinal: 18.0 },
      { estudianteId: 'est-3a-6', nombre: 'Fernando Sánchez', pasoEntrada: 20, trabajoClase: 19, ejercicios: 20, tareas: 20, revisionCuaderno: 20, pasoSalida: 20, notaFinal: 19.8 },
    ]
  },
  'fis-4b': {
    cursoId: 'fis-4b',
    cursoNombre: 'Física',
    grado: '4to Secundaria - B',
    mes: 'Septiembre 2026',
    periodo: '3er Bimestre',
    estudiantes: [
      { estudianteId: 'est-4b-1', nombre: 'Rodrigo Mendoza', pasoEntrada: 18, trabajoClase: 19, ejercicios: 20, tareas: 19, revisionCuaderno: 18, pasoSalida: 19, notaFinal: 18.8 },
      { estudianteId: 'est-4b-2', nombre: 'Valeria Vargas', pasoEntrada: 16, trabajoClase: 17, ejercicios: 16, tareas: 18, revisionCuaderno: 17, pasoSalida: 16, notaFinal: 16.7 },
      { estudianteId: 'est-4b-3', nombre: 'Matías Paredes', pasoEntrada: 13, trabajoClase: 14, ejercicios: 12, tareas: 15, revisionCuaderno: 13, pasoSalida: 14, notaFinal: 13.5 },
      { estudianteId: 'est-4b-4', nombre: 'Sofía Castro', pasoEntrada: 19, trabajoClase: 20, ejercicios: 19, tareas: 20, revisionCuaderno: 20, pasoSalida: 19, notaFinal: 19.5 },
      { estudianteId: 'est-4b-5', nombre: 'Joaquín Morales', pasoEntrada: 10, trabajoClase: 11, ejercicios: 10, tareas: 12, revisionCuaderno: 11, pasoSalida: 10, notaFinal: 10.7 },
      { estudianteId: 'est-4b-6', nombre: 'Daniela Flores', pasoEntrada: 16, trabajoClase: 15, ejercicios: 17, tareas: 16, revisionCuaderno: 16, pasoSalida: 15, notaFinal: 15.8 },
    ]
  },
  'qui-2c': {
    cursoId: 'qui-2c',
    cursoNombre: 'Química',
    grado: '2do Secundaria - C',
    mes: 'Septiembre 2026',
    periodo: '3er Bimestre',
    estudiantes: [
      { estudianteId: 'est-2c-1', nombre: 'Carlos López', pasoEntrada: 15, trabajoClase: 16, ejercicios: 15, tareas: 17, revisionCuaderno: 16, pasoSalida: 15, notaFinal: 15.7 },
      { estudianteId: 'est-2c-2', nombre: 'Lucía Fernández', pasoEntrada: 19, trabajoClase: 18, ejercicios: 20, tareas: 19, revisionCuaderno: 19, pasoSalida: 18, notaFinal: 18.8 },
      { estudianteId: 'est-2c-3', nombre: 'Kevin Ramos', pasoEntrada: 14, trabajoClase: 13, ejercicios: 14, tareas: 15, revisionCuaderno: 14, pasoSalida: 13, notaFinal: 13.8 },
      { estudianteId: 'est-2c-4', nombre: 'Mariana Silva', pasoEntrada: 18, trabajoClase: 19, ejercicios: 18, tareas: 18, revisionCuaderno: 19, pasoSalida: 18, notaFinal: 18.3 },
      { estudianteId: 'est-2c-5', nombre: 'Alejandro Cruz', pasoEntrada: 11, trabajoClase: 12, ejercicios: 11, tareas: 13, revisionCuaderno: 12, pasoSalida: 11, notaFinal: 11.7 },
      { estudianteId: 'est-2c-6', nombre: 'Patricia Huamán', pasoEntrada: 17, trabajoClase: 16, ejercicios: 17, tareas: 17, revisionCuaderno: 17, pasoSalida: 16, notaFinal: 16.7 },
    ]
  },
  'his-1b': {
    cursoId: 'his-1b',
    cursoNombre: 'Historia',
    grado: '1ro Secundaria - B',
    mes: 'Septiembre 2026',
    periodo: '3er Bimestre',
    estudiantes: [
      { estudianteId: 'est-1b-1', nombre: 'Diego Gómez', pasoEntrada: 17, trabajoClase: 18, ejercicios: 17, tareas: 19, revisionCuaderno: 18, pasoSalida: 17, notaFinal: 17.7 },
      { estudianteId: 'est-1b-2', nombre: 'Samuel Estrada', pasoEntrada: 14, trabajoClase: 15, ejercicios: 14, tareas: 16, revisionCuaderno: 15, pasoSalida: 14, notaFinal: 14.7 },
      { estudianteId: 'est-1b-3', nombre: 'Fabricio Vera', pasoEntrada: 16, trabajoClase: 16, ejercicios: 17, tareas: 17, revisionCuaderno: 16, pasoSalida: 16, notaFinal: 16.3 },
      { estudianteId: 'est-1b-4', nombre: 'Claudia Peña', pasoEntrada: 18, trabajoClase: 19, ejercicios: 18, tareas: 20, revisionCuaderno: 19, pasoSalida: 18, notaFinal: 18.7 },
      { estudianteId: 'est-1b-5', nombre: 'Gonzalo Rivas', pasoEntrada: 12, trabajoClase: 13, ejercicios: 12, tareas: 14, revisionCuaderno: 13, pasoSalida: 12, notaFinal: 12.7 },
      { estudianteId: 'est-1b-6', nombre: 'Natalia León', pasoEntrada: 19, trabajoClase: 20, ejercicios: 19, tareas: 20, revisionCuaderno: 20, pasoSalida: 19, notaFinal: 19.5 },
    ]
  }
};

export const MOCK_CHAT_CONTACTOS_DOCENTE: ChatContactoDocente[] = [
  {
    id: 'chat-est-1',
    nombre: 'Miguel Fernández',
    tipo: 'alumno',
    subtitulo: '3ro Secundaria A · Alumno',
    avatar: 'MF',
    ultimoMensaje: 'Gracias por la explicación',
    hora: '10:45 AM',
    noLeidos: 1,
    enLinea: true,
    mensajes: [
      {
        id: 'm-1',
        remitente: 'contacto',
        texto: 'Hola profe, ¿puedo hacer una pregunta?',
        hora: '10:30 AM'
      },
      {
        id: 'm-2',
        remitente: 'contacto',
        texto: 'Me confundí en la parte de las derivadas',
        hora: '10:31 AM'
      },
      {
        id: 'm-3',
        remitente: 'docente',
        texto: 'Por supuesto, dime qué no entiendes',
        hora: '10:33 AM'
      },
      {
        id: 'm-4',
        remitente: 'docente',
        texto: 'Aquí está el material adicional que te había mencionado',
        hora: '10:35 AM'
      },
      {
        id: 'm-5',
        remitente: 'contacto',
        texto: 'Gracias profe, ya lo entendí',
        hora: '10:45 AM'
      }
    ]
  },
  {
    id: 'chat-est-2',
    nombre: 'Sofia García',
    tipo: 'alumno',
    subtitulo: '4to Secundaria B · Alumno',
    avatar: 'SG',
    ultimoMensaje: '¿Puedo enviar la tarea mañana?',
    hora: '09:20 AM',
    noLeidos: 1,
    enLinea: true,
    mensajes: [
      {
        id: 'm-21',
        remitente: 'contacto',
        texto: 'Profesor buenos días, tuve problemas con internet ayer.',
        hora: '09:18 AM'
      },
      {
        id: 'm-22',
        remitente: 'contacto',
        texto: '¿Puedo enviar la tarea mañana?',
        hora: '09:20 AM'
      }
    ]
  },
  {
    id: 'chat-est-3',
    nombre: 'Carlos Pérez',
    tipo: 'alumno',
    subtitulo: '2do Secundaria C · Alumno',
    avatar: 'CP',
    ultimoMensaje: '¡Muy buena clase!',
    hora: 'Ayer',
    noLeidos: 0,
    enLinea: false,
    mensajes: [
      {
        id: 'm-31',
        remitente: 'contacto',
        texto: 'Profesor, entendí muy bien el experimento de hoy.',
        hora: 'Ayer 04:12 PM'
      },
      {
        id: 'm-32',
        remitente: 'contacto',
        texto: '¡Muy buena clase!',
        hora: 'Ayer 04:13 PM'
      }
    ]
  },
  {
    id: 'chat-est-4',
    nombre: 'Lucía Martínez',
    tipo: 'alumno',
    subtitulo: '3ro Secundaria A · Alumno',
    avatar: 'LM',
    ultimoMensaje: 'Tengo una duda sobre el tema',
    hora: 'Ayer',
    noLeidos: 1,
    enLinea: false,
    mensajes: [
      {
        id: 'm-41',
        remitente: 'contacto',
        texto: 'Tengo una duda sobre el tema del ejercicio 4 de la guía.',
        hora: 'Ayer 02:45 PM'
      }
    ]
  },
  {
    id: 'chat-est-5',
    nombre: 'Pablo López',
    tipo: 'alumno',
    subtitulo: '1ro Secundaria B · Alumno',
    avatar: 'PL',
    ultimoMensaje: 'Ok, hasta mañana',
    hora: 'Lun',
    noLeidos: 0,
    enLinea: false,
    mensajes: [
      {
        id: 'm-51',
        remitente: 'docente',
        texto: 'Recuerda traer tu cuaderno de actividades mañana.',
        hora: 'Lun 11:20 AM'
      },
      {
        id: 'm-52',
        remitente: 'contacto',
        texto: 'Ok, hasta mañana',
        hora: 'Lun 11:25 AM'
      }
    ]
  },
  // Padres / Apoderados
  {
    id: 'chat-padre-1',
    nombre: 'Rosa Fernández',
    tipo: 'padre',
    subtitulo: 'Apoderada de Miguel Fernández',
    avatar: 'RF',
    ultimoMensaje: 'Buenas tardes profesor, sobre la reunión...',
    hora: '11:15 AM',
    noLeidos: 1,
    enLinea: true,
    mensajes: [
      {
        id: 'mp-1',
        remitente: 'contacto',
        texto: 'Buenas tardes profesor, sobre la reunión de entrega de libretas, ¿será presencial?',
        hora: '11:15 AM'
      }
    ]
  },
  {
    id: 'chat-padre-2',
    nombre: 'Jorge García',
    tipo: 'padre',
    subtitulo: 'Apoderado de Sofía García',
    avatar: 'JG',
    ultimoMensaje: 'Muchas gracias por la paciencia y el apoyo',
    hora: 'Ayer',
    noLeidos: 0,
    enLinea: false,
    mensajes: [
      {
        id: 'mp-2',
        remitente: 'contacto',
        texto: 'Muchas gracias por la paciencia y el apoyo con Sofía.',
        hora: 'Ayer 05:00 PM'
      }
    ]
  },
  {
    id: 'chat-padre-3',
    nombre: 'Carmen Pérez',
    tipo: 'padre',
    subtitulo: 'Apoderada de Carlos Pérez',
    avatar: 'CP',
    ultimoMensaje: '¿Habrá clase de reforzamiento este sábado?',
    hora: 'Vie',
    noLeidos: 0,
    enLinea: false,
    mensajes: [
      {
        id: 'mp-3',
        remitente: 'contacto',
        texto: 'Estimado profesor, ¿habrá clase de reforzamiento este sábado?',
        hora: 'Vie 09:40 AM'
      }
    ]
  }
];

export const MOCK_DOCENTE_DASHBOARD: DocenteDashboardData = {
  docenteNombre: 'Prof. Carlos Mendoza',
  materia: 'Ciencias y Matemáticas',
  cursos: MOCK_CURSOS_DOCENTE,
  horarioHoy: MOCK_HORARIO_HOY_DOCENTE,
  claseEnCurso: MOCK_HORARIO_HOY_DOCENTE[0]
};
