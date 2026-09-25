// src/lib/mocks/mockAlumno.ts
import {
  AlumnoPerfil,
  CalificacionesAlumnoData,
  ResumenAsistenciaAlumno,
  HorarioAlumnoData,
  MaterialesAlumnoData,
  ContactoDocenteAlumno,
  ResumenDashboardAlumno
} from '@/types/alumno';

export const MOCK_ALUMNO_PERFIL: AlumnoPerfil = {
  id: 'alu-rodrigo-2026',
  nombres: 'Rodrigo',
  apellidos: 'Mendoza Torres',
  nombreCompleto: 'Rodrigo Mendoza Torres',
  dni: '74128905',
  codigoEstudiante: 'SM-2026-5B-14',
  grado: '5to de Secundaria',
  seccion: 'B',
  aula: 'Aula 204 (Pabellón B)',
  nivel: 'Secundaria',
  anioLectivo: '2026',
  fotoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  promedioPonderado: 16.8,
  porcentajeAsistencia: 96.4,
  estadoMatricula: 'Matrícula Activa'
};

// PANTALLA 3: CALIFICACIONES (REPLICA EXACTA DE LA IMAGEN DE REFERENCIA)
export const MOCK_CALIFICACIONES_ALUMNO: CalificacionesAlumnoData = {
  periodoActual: 'Semestre 1',
  fechaCorte: '08 de septiembre',
  promedioGeneral: 16.5,
  comparativaPeriodo: '+0.8 vs. Semestre 0',
  tendenciaProgreso: [
    { periodo: 'S1', nota: 14.5 },
    { periodo: 'S2', nota: 15.8 },
    { periodo: 'S3', nota: 14.0 },
    { periodo: 'S4', nota: 16.8 },
    { periodo: 'S5', nota: 15.9 },
    { periodo: 'S6', nota: 16.5, esActual: true }
  ],
  cursos: [
    {
      id: 'cur-mat-5b',
      curso: 'Matemática',
      docenteTitular: 'Prof. Marco Aurelio',
      examenes: 17.0,
      tareas: 16.5,
      participacion: 18.0,
      promedio: 16.9,
      notaFinal: 17,
      estado: 'Aprobado'
    },
    {
      id: 'cur-com-5b',
      curso: 'Comunicación',
      docenteTitular: 'Prof. Elena Valdivia',
      examenes: 16.0,
      tareas: 18.0,
      participacion: 17.5,
      promedio: 17.1,
      notaFinal: 17,
      estado: 'Aprobado'
    },
    {
      id: 'cur-cyt-5b',
      curso: 'Ciencia y Tecnología',
      docenteTitular: 'Prof. Carlos Rivas',
      examenes: 15.5,
      tareas: 16.0,
      participacion: 16.5,
      promedio: 16.0,
      notaFinal: 16,
      estado: 'Aprobado'
    },
    {
      id: 'cur-his-5b',
      curso: 'Historia',
      docenteTitular: 'Prof. Andrés Morales',
      examenes: 18.0,
      tareas: 17.0,
      participacion: 18.5,
      promedio: 17.8,
      notaFinal: 18,
      estado: 'Aprobado'
    },
    {
      id: 'cur-ing-5b',
      curso: 'Inglés',
      docenteTitular: 'Prof. Sarah Johnson',
      examenes: 17.5,
      tareas: 16.5,
      participacion: 17.0,
      promedio: 17.0,
      notaFinal: 17,
      estado: 'Aprobado'
    }
  ]
};

// PANTALLA 2: ASISTENCIA
export const MOCK_ASISTENCIA_ALUMNO: ResumenAsistenciaAlumno = {
  mesActual: 'Septiembre 2026',
  porcentajeAsistencia: 96.4,
  diasLectivos: 22,
  asistenciasPuntuales: 20,
  tardanzasRegistradas: 1,
  faltasJustificadas: 1,
  marcaciones: [
    {
      id: 'asi-01',
      fecha: 'Lun 08/09',
      hora: '07:48 AM',
      metodo: 'Huella Biométrica',
      estado: 'Puntual',
      observacion: 'Ingreso por Puerta Principal'
    },
    {
      id: 'asi-02',
      fecha: 'Vie 05/09',
      hora: '07:52 AM',
      metodo: 'Huella Biométrica',
      estado: 'Puntual',
      observacion: 'Ingreso normal'
    },
    {
      id: 'asi-03',
      fecha: 'Jue 04/09',
      hora: '08:14 AM',
      metodo: 'Supervisor Manual',
      estado: 'Tardanza',
      observacion: 'Retraso vehicular (14 min)'
    },
    {
      id: 'asi-04',
      fecha: 'Mie 03/09',
      hora: '07:45 AM',
      metodo: 'Huella Biométrica',
      estado: 'Puntual',
      observacion: 'Ingreso normal'
    },
    {
      id: 'asi-05',
      fecha: 'Mar 02/09',
      hora: '--:--',
      metodo: 'Justificación Médica',
      estado: 'Justificada',
      observacion: 'Certificado médico validado'
    },
    {
      id: 'asi-06',
      fecha: 'Lun 01/09',
      hora: '07:40 AM',
      metodo: 'Huella Biométrica',
      estado: 'Puntual',
      observacion: 'Ingreso regular'
    }
  ]
};

// PANTALLA 4: HORARIO
export const MOCK_HORARIO_ALUMNO: HorarioAlumnoData = {
  semanaLectiva: '08 - 12 de Septiembre',
  periodo: 'Segundo Semestre',
  turno: 'Turno Mañana (08:00 - 14:00)',
  aula: 'Aula 204 (Pabellón B)',
  proximaClase: {
    curso: 'Matemática',
    docente: 'Prof. Marco Aurelio · Tutor',
    horario: 'Viernes · 08:00 - 09:30 AM',
    aula: 'Aula 204 (Pabellón B)',
    materialesRequeridos: [
      'Cuaderno cuadriculado de trabajo',
      'Calculadora científica',
      'Guía N° 4 impresa o digital'
    ]
  },
  bloques: [
    {
      id: 'blq-01',
      horaInicio: '08:00',
      horaFin: '09:30',
      rangoHora: '08:00 - 09:30',
      lunes: 'Matemática',
      martes: 'Comunicación',
      miercoles: 'Ciencia y Tec.',
      jueves: 'Historia',
      viernes: 'Matemática'
    },
    {
      id: 'blq-receso',
      horaInicio: '09:30',
      horaFin: '10:00',
      rangoHora: '09:30 - 10:00',
      lunes: 'RECESO',
      martes: 'RECESO',
      miercoles: 'RECESO',
      jueves: 'RECESO',
      viernes: 'RECESO',
      esReceso: true
    },
    {
      id: 'blq-02',
      horaInicio: '10:00',
      horaFin: '11:30',
      rangoHora: '10:00 - 11:30',
      lunes: 'Comunicación',
      martes: 'Inglés',
      miercoles: 'Matemática',
      jueves: 'Ciencia y Tec.',
      viernes: 'Comunicación'
    },
    {
      id: 'blq-03',
      horaInicio: '11:30',
      horaFin: '13:00',
      rangoHora: '11:30 - 13:00',
      lunes: 'Ciencia y Tec.',
      martes: 'Historia',
      miercoles: 'Inglés',
      jueves: 'Tutoría Escolar',
      viernes: 'Inglés'
    }
  ]
};

// PANTALLA 5: MATERIALES
export const MOCK_MATERIALES_ALUMNO: MaterialesAlumnoData = {
  totalMateriales: 24,
  espacioUsadoMb: 850,
  espacioTotalMb: 2048,
  materiales: [
    {
      id: 'mat-01',
      titulo: 'Guía de Álgebra Lineal - Cap. 4',
      curso: 'Matemática',
      docente: 'Prof. Marco Aurelio',
      fecha: '06/09/2026',
      formato: 'PDF',
      tamanio: '2.4 MB',
      urlDescarga: '#'
    },
    {
      id: 'mat-02',
      titulo: 'Diapositivas: Vanguardismo Literario',
      curso: 'Comunicación',
      docente: 'Prof. Elena Valdivia',
      fecha: '05/09/2026',
      formato: 'PPTX',
      tamanio: '5.1 MB',
      urlDescarga: '#'
    },
    {
      id: 'mat-03',
      titulo: 'Manual de Laboratorio Químico N° 3',
      curso: 'Ciencia y Tec.',
      docente: 'Prof. Carlos Rivas',
      fecha: '03/09/2026',
      formato: 'PDF',
      tamanio: '3.8 MB',
      urlDescarga: '#'
    },
    {
      id: 'mat-04',
      titulo: 'Compendio de Historia del Perú Siglo XX',
      curso: 'Historia',
      docente: 'Prof. Andrés Morales',
      fecha: '01/09/2026',
      formato: 'PDF',
      tamanio: '4.2 MB',
      urlDescarga: '#'
    },
    {
      id: 'mat-05',
      titulo: 'Audio & Vocabulary Guide Units 5-6',
      curso: 'Inglés',
      docente: 'Prof. Sarah Johnson',
      fecha: '28/08/2026',
      formato: 'ZIP',
      tamanio: '12.5 MB',
      urlDescarga: '#'
    }
  ]
};

// PANTALLA 6: MENSAJES Y CHAT
export const MOCK_MENSAJES_DOCENTES: ContactoDocenteAlumno[] = [
  {
    id: 'doc-marco-aurelio',
    nombre: 'Prof. Marco Aurelio',
    curso: 'Matemática',
    esTutor: true,
    estado: 'En línea',
    ubicacion: 'Aula 204 Pabellón B',
    ultimoMensaje: 'El procedimiento está perfecto. Puedes apoyarte en el teorema de senos de la Guía 4 de Materiales.',
    horaUltimoMensaje: '10:15 AM',
    mensajesNoLeidos: 0,
    mensajes: [
      {
        id: 'msg-01',
        emisorId: 'doc-marco-aurelio',
        receptorId: 'alu-rodrigo-2026',
        contenido: 'Hola Rodrigo, estuve revisando los ejercicios de trigonometría que subiste.',
        hora: '10:12 AM',
        esPropio: false
      },
      {
        id: 'msg-02',
        emisorId: 'alu-rodrigo-2026',
        receptorId: 'doc-marco-aurelio',
        contenido: 'Buenos días profesor. Tenía dudas sobre la simplificación del problema 4 en el paso final.',
        hora: '10:14 AM',
        esPropio: true
      },
      {
        id: 'msg-03',
        emisorId: 'doc-marco-aurelio',
        receptorId: 'alu-rodrigo-2026',
        contenido: 'El procedimiento está perfecto. Puedes apoyarte en el teorema de senos de la Guía 4 de Materiales. ¡Nos vemos en clase!',
        hora: '10:15 AM',
        esPropio: false
      }
    ]
  },
  {
    id: 'doc-elena-valdivia',
    nombre: 'Prof. Elena Valdivia',
    curso: 'Comunicación',
    esTutor: false,
    estado: 'Desconectado',
    ubicacion: 'Sala de Profesores',
    ultimoMensaje: 'Tu ensayo fue recibido correctamente en el sistema escolar.',
    horaUltimoMensaje: 'Ayer',
    mensajesNoLeidos: 1,
    mensajes: [
      {
        id: 'msg-ev-01',
        emisorId: 'doc-elena-valdivia',
        receptorId: 'alu-rodrigo-2026',
        contenido: 'Tu ensayo fue recibido correctamente en el sistema escolar. Te enviaré las observaciones mañana.',
        hora: '04:30 PM',
        esPropio: false
      }
    ]
  },
  {
    id: 'doc-carlos-rivas',
    nombre: 'Prof. Carlos Rivas',
    curso: 'Ciencia y Tecnología',
    esTutor: false,
    estado: 'Desconectado',
    ubicacion: 'Laboratorio de Ciencias N° 2',
    ultimoMensaje: 'No olviden traer guardapolvo al laboratorio para la sesión práctica del viernes.',
    horaUltimoMensaje: '04/09',
    mensajesNoLeidos: 0,
    mensajes: [
      {
        id: 'msg-cr-01',
        emisorId: 'doc-carlos-rivas',
        receptorId: 'alu-rodrigo-2026',
        contenido: 'No olviden traer guardapolvo al laboratorio para la sesión práctica del viernes.',
        hora: '11:15 AM',
        esPropio: false
      }
    ]
  },
  {
    id: 'doc-coordinacion',
    nombre: 'Coordinación San Marcos',
    curso: 'Tutoría y Convivencia',
    esTutor: false,
    estado: 'Desconectado',
    ubicacion: 'Dirección Académica',
    ultimoMensaje: 'Recordatorio institucional: Reunión de delegados escolares programada para el miércoles.',
    horaUltimoMensaje: '02/09',
    mensajesNoLeidos: 2,
    mensajes: [
      {
        id: 'msg-co-01',
        emisorId: 'doc-coordinacion',
        receptorId: 'alu-rodrigo-2026',
        contenido: 'Recordatorio institucional: Reunión de delegados escolares programada para el miércoles en auditorio.',
        hora: '09:00 AM',
        esPropio: false
      }
    ]
  }
];

// PANTALLA 1: RESUMEN DASHBOARD
export const MOCK_RESUMEN_DASHBOARD_ALUMNO: ResumenDashboardAlumno = {
  perfil: MOCK_ALUMNO_PERFIL,
  kpis: {
    promedioPonderado: 16.8,
    asistenciaGeneral: 96.4,
    tareasCompletadas: 28,
    tareasTotales: 30,
    cursosInscritos: 5
  },
  cursos: [
    {
      curso: 'Matemática',
      docente: 'Prof. Marco Aurelio',
      horasSemanales: '6 hrs/sem',
      promedio: 17.0,
      estado: 'Aprobado'
    },
    {
      curso: 'Comunicación',
      docente: 'Prof. Elena Valdivia',
      horasSemanales: '5 hrs/sem',
      promedio: 17.1,
      estado: 'Aprobado'
    },
    {
      curso: 'Ciencia y Tecnología',
      docente: 'Prof. Carlos Rivas',
      horasSemanales: '5 hrs/sem',
      promedio: 16.0,
      estado: 'Aprobado'
    },
    {
      curso: 'Historia',
      docente: 'Prof. Andrés Morales',
      horasSemanales: '4 hrs/sem',
      promedio: 17.8,
      estado: 'Aprobado'
    },
    {
      curso: 'Inglés',
      docente: 'Prof. Sarah Johnson',
      horasSemanales: '4 hrs/sem',
      promedio: 17.0,
      estado: 'Aprobado'
    }
  ],
  proximasActividades: [
    {
      id: 'act-01',
      titulo: 'Práctica de Geometría Espacial',
      curso: 'Matemática',
      docente: 'Prof. Marco Aurelio',
      fechaLimite: 'HOY · 23:59 PM',
      urgente: true
    },
    {
      id: 'act-02',
      titulo: 'Ensayo de Literatura Peruana',
      curso: 'Comunicación',
      docente: 'Prof. Elena Valdivia',
      fechaLimite: 'MAÑANA · 10:00 AM',
      urgente: false
    },
    {
      id: 'act-03',
      titulo: 'Laboratorio: Reacciones Químicas',
      curso: 'Ciencia y Tecnología',
      docente: 'Prof. Carlos Rivas',
      fechaLimite: 'VIERNES · 08:30 AM',
      urgente: false
    }
  ]
};
