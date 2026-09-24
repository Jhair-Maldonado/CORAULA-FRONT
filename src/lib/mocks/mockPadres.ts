// src/lib/mocks/mockPadres.ts
import {
  PadrePerfil,
  HijoResumen,
  CursoCalificacion,
  RegistroAsistenciaDia,
  JustificacionInasistencia,
  HorarioSemanaPadre,
  ComunicadoPadre,
  CuotaPension,
  ResumenDashboardPadre,
  AlertaAsistencia,
  IncidenciaAsistencia
} from '@/types/padre';
import { ContactoChat } from '@/types/chat';

export const MOCK_PADRE_PERFIL: PadrePerfil = {
  id: 'padre-001',
  nombres: 'Roberto Carlos',
  apellidos: 'Fernández Silva',
  dni: '08765432',
  telefono: '+51 987 654 321',
  correo: 'roberto.fernandez@coraula.edu.pe',
  parentesco: 'Padre',
  direccion: 'Av. Las Palmeras 450, Urb. San Isidro',
  ocupacion: 'Ingeniero de Sistemas',
  hijos: [] // Se llena con MOCK_HIJOS
};

export const MOCK_HIJOS: HijoResumen[] = [
  {
    id: 'hijo-001',
    nombres: 'Sofía Elena',
    apellidos: 'Fernández Torres',
    nombreCompleto: 'Sofía Elena Fernández Torres',
    dni: '78451203',
    codigoEstudiante: 'EST-2026-042',
    grado: '4° Grado',
    nivel: 'Primaria',
    seccion: 'A',
    seccionId: 'sec-4a',
    fotoUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
    tutor: 'Prof. Carmen Morales Vega',
    tutorEmail: 'carmen.morales@coraula.edu.pe',
    tutorTelefono: '+51 971 234 567',
    estado: 'Activo',
    promedioGeneral: 17.8,
    porcentajeAsistencia: 96.5,
    estadoPension: 'Al Día',
    avisosPendientes: 2,
    incidenciasCount: 0, // Cary.pen: "0 Incidencias"
    fechaNacimiento: '2016-05-14',
    tipoSangre: 'O Positivo (O+)',
    alergias: 'Alergia al polen y penicilina',
    seguroMedico: 'Rímac Seguros Escolar - Póliza #44920'
  },
  {
    id: 'hijo-002',
    nombres: 'Mateo Alejandro',
    apellidos: 'Fernández Torres',
    nombreCompleto: 'Mateo Alejandro Fernández Torres',
    dni: '72194830',
    codigoEstudiante: 'EST-2024-118',
    grado: '2° Año',
    nivel: 'Secundaria',
    seccion: 'B',
    seccionId: 'sec-2b',
    fotoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    tutor: 'Lic. Javier Mendoza Salazar',
    tutorEmail: 'javier.mendoza@coraula.edu.pe',
    tutorTelefono: '+51 982 765 432',
    estado: 'Activo',
    promedioGeneral: 16.2,
    porcentajeAsistencia: 92.0,
    estadoPension: 'Pendiente',
    avisosPendientes: 1,
    incidenciasCount: 1, // Cary.pen: "1 Incidencia"
    fechaNacimiento: '2012-09-21',
    tipoSangre: 'A Positivo (A+)',

    alergias: 'Ninguna conocida',
    seguroMedico: 'Pacífico Salud Escolar - Póliza #88310'
  }
];

MOCK_PADRE_PERFIL.hijos = MOCK_HIJOS;

export const MOCK_CALIFICACIONES_SOFIA: CursoCalificacion[] = [
  {
    cursoId: 'cur-mat-4a',
    cursoNombre: 'Matemática y Razonamiento Lógico',
    codigoCurso: 'MAT-401',
    docente: 'Prof. Carmen Morales',
    area: 'Ciencias Exactas',
    bimestre1: 18,
    bimestre2: 17,
    bimestre3: 19,
    bimestre4: undefined,
    promedioActual: 18.0,
    nivelLogro: 'AD',
    estado: 'Destacado',
    criterios: [
      { nombre: 'Resuelve problemas de cantidad', nota: 18, nivelLogro: 'AD', comentario: 'Domina operaciones complejas y cálculo mental con rapidez.' },
      { nombre: 'Resuelve problemas de regularidad y equivalencia', nota: 19, nivelLogro: 'AD', comentario: 'Excelente identificación de patrones numéricos.' },
      { nombre: 'Resuelve problemas de forma y movimiento', nota: 17, nivelLogro: 'A', comentario: 'Buen manejo de geometría básica y figuras espaciales.' }
    ],
    evaluaciones: [
      { id: 'ev-1', titulo: 'Práctica Calificada #1: Fracciones', tipo: 'Práctica', nota: 18, fecha: '2026-03-15', peso: 20 },
      { id: 'ev-2', titulo: 'Tarea de Investigación: Criptografía', tipo: 'Tarea', nota: 20, fecha: '2026-03-22', peso: 15 },
      { id: 'ev-3', titulo: 'Examen Parcial de Geometría', tipo: 'Examen', nota: 17, fecha: '2026-04-05', peso: 35 }
    ],
    observacionDocente: 'Sofía demuestra un talento notable en resolución de problemas analíticos. Muy participativa en clase.'
  },
  {
    cursoId: 'cur-com-4a',
    cursoNombre: 'Comunicación y Comprensión Lectora',
    codigoCurso: 'COM-402',
    docente: 'Lic. Teresa Quispe',
    area: 'Humanidades',
    bimestre1: 17,
    bimestre2: 18,
    bimestre3: 17,
    bimestre4: undefined,
    promedioActual: 17.3,
    nivelLogro: 'AD',
    estado: 'Destacado',
    criterios: [
      { nombre: 'Se comunica oralmente en su lengua materna', nota: 18, nivelLogro: 'AD', comentario: 'Excelente fluidez y vocabulario en presentaciones.' },
      { nombre: 'Lee diversos tipos de textos escritos', nota: 17, nivelLogro: 'A', comentario: 'Comprende textos inferenciales y críticos adecuadamente.' },
      { nombre: 'Escribe diversos tipos de textos', nota: 17, nivelLogro: 'A', comentario: 'Buena redacción, ortografía y uso de conectores lógicos.' }
    ],
    evaluaciones: [
      { id: 'ev-com-1', titulo: 'Control de Lectura: El Principito', tipo: 'Práctica', nota: 19, fecha: '2026-03-18', peso: 25 },
      { id: 'ev-com-2', titulo: 'Redacción de Cuento Fantástico', tipo: 'Tarea', nota: 18, fecha: '2026-03-29', peso: 20 },
      { id: 'ev-com-3', titulo: 'Examen de Gramática y Ortografía', tipo: 'Examen', nota: 16, fecha: '2026-04-10', peso: 35 }
    ],
    observacionDocente: 'Mantiene una redacción enriquecida y amor por la lectura. Felicitaciones.'
  },
  {
    cursoId: 'cur-cie-4a',
    cursoNombre: 'Ciencia y Tecnología',
    codigoCurso: 'CYT-403',
    docente: 'Ing. Marcos Benavides',
    area: 'Ciencias Naturales',
    bimestre1: 19,
    bimestre2: 18,
    bimestre3: 18,
    bimestre4: undefined,
    promedioActual: 18.3,
    nivelLogro: 'AD',
    estado: 'Destacado',
    criterios: [
      { nombre: 'Indaga mediante métodos científicos', nota: 19, nivelLogro: 'AD', comentario: 'Gran curiosidad científica y rigor en laboratorios.' },
      { nombre: 'Explica el mundo físico basándose en conocimientos científicos', nota: 18, nivelLogro: 'AD', comentario: 'Comprensión sólida de ecosistemas y energía.' }
    ],
    evaluaciones: [
      { id: 'ev-cie-1', titulo: 'Proyecto: Filtro de Agua Casero', tipo: 'Proyecto', nota: 20, fecha: '2026-03-25', peso: 30 },
      { id: 'ev-cie-2', titulo: 'Informe de Laboratorio: Microscopía', tipo: 'Práctica', nota: 18, fecha: '2026-04-02', peso: 25 }
    ],
    observacionDocente: 'Destacado trabajo en equipo durante las ferias de ciencia experimental.'
  },
  {
    cursoId: 'cur-ing-4a',
    cursoNombre: 'Inglés Avanzado',
    codigoCurso: 'ING-404',
    docente: 'Ms. Sarah Jenkins',
    area: 'Idiomas',
    bimestre1: 16,
    bimestre2: 17,
    bimestre3: 17,
    bimestre4: undefined,
    promedioActual: 16.7,
    nivelLogro: 'A',
    estado: 'Logrado',
    criterios: [
      { nombre: 'Listening & Reading Comprehension', nota: 17, nivelLogro: 'A', comentario: 'Understands complex spoken directions.' },
      { nombre: 'Speaking & Pronunciation', nota: 16, nivelLogro: 'A', comentario: 'Shows good fluency, continue practicing connected speech.' }
    ],
    evaluaciones: [
      { id: 'ev-ing-1', titulo: 'Oral Presentation: My Favorite Invention', tipo: 'Práctica', nota: 16, fecha: '2026-03-20', peso: 30 },
      { id: 'ev-ing-2', titulo: 'Midterm Grammar & Vocab Quiz', tipo: 'Examen', nota: 17, fecha: '2026-04-08', peso: 40 }
    ],
    observacionDocente: 'Active participation in class discussions. Very confident attitude.'
  }
];

export const MOCK_CALIFICACIONES_MATEO: CursoCalificacion[] = [
  {
    cursoId: 'cur-mat-2b',
    cursoNombre: 'Álgebra y Trigonometría',
    codigoCurso: 'MAT-202',
    docente: 'Lic. Javier Mendoza',
    area: 'Ciencias Exactas',
    bimestre1: 16,
    bimestre2: 15,
    bimestre3: 17,
    bimestre4: undefined,
    promedioActual: 16.0,
    nivelLogro: 'A',
    estado: 'Logrado',
    criterios: [
      { nombre: 'Resolución de ecuaciones y sistemas lineales', nota: 16, nivelLogro: 'A' },
      { nombre: 'Funciones polinómicas y razonamiento abstracto', nota: 15, nivelLogro: 'A' }
    ],
    evaluaciones: [
      { id: 'ev-mat2-1', titulo: 'Práctica #1: Productos Notables', tipo: 'Práctica', nota: 15, fecha: '2026-03-12', peso: 20 },
      { id: 'ev-mat2-2', titulo: 'Examen Bimestral I', tipo: 'Examen', nota: 17, fecha: '2026-04-03', peso: 40 }
    ],
    observacionDocente: 'Mateo muestra capacidad analítica. Se recomienda mayor constancia en la entrega de tareas.'
  },
  {
    cursoId: 'cur-fis-2b',
    cursoNombre: 'Física Elemental',
    codigoCurso: 'FIS-201',
    docente: 'Prof. David Valdivia',
    area: 'Ciencias Naturales',
    bimestre1: 17,
    bimestre2: 16,
    bimestre3: 18,
    bimestre4: undefined,
    promedioActual: 17.0,
    nivelLogro: 'AD',
    estado: 'Destacado',
    criterios: [
      { nombre: 'Cinemática y leyes del movimiento de Newton', nota: 18, nivelLogro: 'AD' }
    ],
    evaluaciones: [
      { id: 'ev-fis-1', titulo: 'Laboratorio de MRUV', tipo: 'Proyecto', nota: 18, fecha: '2026-03-24', peso: 30 }
    ]
  }
];

export const MOCK_ASISTENCIA_SOFIA: RegistroAsistenciaDia[] = [
  { id: 'as-1', fecha: '2026-04-01', diaSemana: 'Miércoles', estado: 'Presente', horaLlegada: '07:48' },
  { id: 'as-2', fecha: '2026-04-02', diaSemana: 'Jueves', estado: 'Presente', horaLlegada: '07:50' },
  { id: 'as-3', fecha: '2026-04-03', diaSemana: 'Viernes', estado: 'Presente', horaLlegada: '07:45' },
  { id: 'as-4', fecha: '2026-04-06', diaSemana: 'Lunes', estado: 'Presente', horaLlegada: '07:52' },
  { id: 'as-5', fecha: '2026-04-07', diaSemana: 'Martes', estado: 'Tardanza', horaLlegada: '08:14', observacion: 'Retraso por congestión vehicular en Av. Principal.' },
  { id: 'as-6', fecha: '2026-04-08', diaSemana: 'Miércoles', estado: 'Presente', horaLlegada: '07:44' },
  { id: 'as-7', fecha: '2026-04-09', diaSemana: 'Jueves', estado: 'Falta Justificada', observacion: 'Cita médica odontológica programada.', justificacionId: 'just-001' },
  { id: 'as-8', fecha: '2026-04-10', diaSemana: 'Viernes', estado: 'Presente', horaLlegada: '07:49' },
  { id: 'as-9', fecha: '2026-04-13', diaSemana: 'Lunes', estado: 'Presente', horaLlegada: '07:46' },
  { id: 'as-10', fecha: '2026-04-14', diaSemana: 'Martes', estado: 'Presente', horaLlegada: '07:40' }
];

export const MOCK_JUSTIFICACIONES: JustificacionInasistencia[] = [
  {
    id: 'just-001',
    hijoId: 'hijo-001',
    hijoNombre: 'Sofía Fernández Torres',
    fechaInasistencia: '2026-04-09',
    motivo: 'Salud / Médico',
    descripcion: 'Control odontológico anual y curación preventiva. Se adjuntó constancia médica.',
    archivoAdjuntoNombre: 'constancia_medica_clinica_san_pablo.pdf',
    fechaEnvio: '2026-04-08 18:30',
    estado: 'Aprobada',
    respuestaTutor: 'Justificación recibida y aceptada. Se coordinó reprogramación de la práctica de Comunicación.',
    fechaRespuesta: '2026-04-09 09:15'
  }
];

export const MOCK_ALERTAS_ASISTENCIA: AlertaAsistencia[] = [
  {
    id: 'alr-001',
    hijoId: 'hijo-002',
    hijoNombre: 'Mateo Alejandro Fernández Torres',
    fecha: '2026-04-14',
    horaInicioClase: '08:00 AM',
    horaLimiteIngreso: '08:15 AM (Tolerancia máxima 15 min)',
    minutosRetraso: 24,
    materia: 'Álgebra y Trigonometría',
    salon: 'Aula 2-B Secundaria',
    docente: 'Lic. Javier Mendoza Salazar',
    estado: 'Activa',
    tipo: 'Inasistencia >15 min',
    mensaje: 'Han transcurrido 24 minutos desde el inicio de clase (08:00 AM) y el estudiante aún no registra marcación en puerta de ingreso ni en su aula de Álgebra.',
    notificadoPor: 'Sistema Biométrico Puerta Principal / Tutoría',
    fechaNotificacion: 'Hoy 08:24 AM'
  }
];

export const MOCK_INCIDENCIAS_ASISTENCIA: IncidenciaAsistencia[] = [
  {
    id: 'inc-001',
    hijoId: 'hijo-002',
    fecha: '2026-04-14',
    tipo: 'Inasistencia >15 min sin justificación previa',
    descripcion: 'No registra ingreso escolar tras superar la tolerancia oficial de 15 minutos en el turno mañana.',
    gravedad: 'Moderada',
    estado: 'Pendiente'
  },
  {
    id: 'inc-002',
    hijoId: 'hijo-001',
    fecha: '2026-04-07',
    tipo: 'Tardanza (Ingreso 08:14 AM)',
    descripcion: 'Ingreso al límite del horario de tolerancia matutina por congestión vehicular.',
    gravedad: 'Leve',
    estado: 'Resuelta'
  }
];

export const MOCK_HORARIO_SOFIA: HorarioSemanaPadre[] = [

  {
    dia: 'Lunes',
    diaNumero: 1,
    bloques: [
      { id: 'b1', horaInicio: '08:00', horaFin: '09:30', curso: 'Matemática', docente: 'Prof. Carmen Morales', salon: 'Aula 4-A', colorClase: 'bg-rose-50 border-rose-200 text-rose-800' },
      { id: 'b2', horaInicio: '09:30', horaFin: '11:00', curso: 'Comunicación', docente: 'Lic. Teresa Quispe', salon: 'Aula 4-A', colorClase: 'bg-blue-50 border-blue-200 text-blue-800' },
      { id: 'b3', horaInicio: '11:30', horaFin: '13:00', curso: 'Educación Física', docente: 'Prof. Ronald Huamán', salon: 'Coliseo', colorClase: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
      { id: 'b4', horaInicio: '13:45', horaFin: '15:15', curso: 'Tutoría Escolar', docente: 'Prof. Carmen Morales', salon: 'Aula 4-A', colorClase: 'bg-amber-50 border-amber-200 text-amber-800' }
    ]
  },
  {
    dia: 'Martes',
    diaNumero: 2,
    bloques: [
      { id: 'b5', horaInicio: '08:00', horaFin: '09:30', curso: 'Ciencia y Tecnología', docente: 'Ing. Marcos Benavides', salon: 'Laboratorio Primaria', colorClase: 'bg-teal-50 border-teal-200 text-teal-800' },
      { id: 'b6', horaInicio: '09:30', horaFin: '11:00', curso: 'Inglés Avanzado', docente: 'Ms. Sarah Jenkins', salon: 'Aula 4-A', colorClase: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
      { id: 'b7', horaInicio: '11:30', horaFin: '13:00', curso: 'Personal Social', docente: 'Lic. Teresa Quispe', salon: 'Aula 4-A', colorClase: 'bg-amber-50 border-amber-200 text-amber-800' }
    ]
  },
  {
    dia: 'Miércoles',
    diaNumero: 3,
    bloques: [
      { id: 'b8', horaInicio: '08:00', horaFin: '09:30', curso: 'Matemática', docente: 'Prof. Carmen Morales', salon: 'Aula 4-A', colorClase: 'bg-rose-50 border-rose-200 text-rose-800' },
      { id: 'b9', horaInicio: '09:30', horaFin: '11:00', curso: 'Arte y Cultura', docente: 'Lic. Rosaura Flores', salon: 'Taller de Arte', colorClase: 'bg-purple-50 border-purple-200 text-purple-800' },
      { id: 'b10', horaInicio: '11:30', horaFin: '13:00', curso: 'Cómputo y Robótica', docente: 'Ing. José Alarcón', salon: 'Laboratorio de Informática', colorClase: 'bg-sky-50 border-sky-200 text-sky-800' }
    ]
  },
  {
    dia: 'Jueves',
    diaNumero: 4,
    bloques: [
      { id: 'b11', horaInicio: '08:00', horaFin: '09:30', curso: 'Comunicación', docente: 'Lic. Teresa Quispe', salon: 'Aula 4-A', colorClase: 'bg-blue-50 border-blue-200 text-blue-800' },
      { id: 'b12', horaInicio: '09:30', horaFin: '11:00', curso: 'Ciencia y Tecnología', docente: 'Ing. Marcos Benavides', salon: 'Aula 4-A', colorClase: 'bg-teal-50 border-teal-200 text-teal-800' },
      { id: 'b13', horaInicio: '11:30', horaFin: '13:00', curso: 'Inglés Avanzado', docente: 'Ms. Sarah Jenkins', salon: 'Aula 4-A', colorClase: 'bg-indigo-50 border-indigo-200 text-indigo-800' }
    ]
  },
  {
    dia: 'Viernes',
    diaNumero: 5,
    bloques: [
      { id: 'b14', horaInicio: '08:00', horaFin: '09:30', curso: 'Matemática (Taller)', docente: 'Prof. Carmen Morales', salon: 'Aula 4-A', colorClase: 'bg-rose-50 border-rose-200 text-rose-800' },
      { id: 'b15', horaInicio: '09:30', horaFin: '11:00', curso: 'Plan Lector y Biblioteca', docente: 'Lic. Teresa Quispe', salon: 'Biblioteca General', colorClase: 'bg-blue-50 border-blue-200 text-blue-800' },
      { id: 'b16', horaInicio: '11:30', horaFin: '13:00', curso: 'Música y Coro', docente: 'Prof. Carlos Rivera', salon: 'Auditorio', colorClase: 'bg-purple-50 border-purple-200 text-purple-800' }
    ]
  }
];

export const MOCK_COMUNICADOS: ComunicadoPadre[] = [
  {
    id: 'com-001',
    titulo: 'Convocatoria a Primera Escuela para Padres del Año Académico 2026',
    resumen: 'Taller obligatorio sobre convivencia escolar positiva y uso responsable de tecnologías en casa.',
    contenido: `Estimados Padres y Apoderados de la Familia CORAULA:

Nos es grato saludarlos cordialmente y convocarlos a la I Escuela para Padres 2026, titulada: "Creciendo Juntos en la Era Digital: Estrategias de Acompañamiento y Salud Mental para Niños y Jóvenes".

Fecha: Jueves 30 de Abril de 2026
Hora: 18:30 hrs. (Ingreso puntual por la puerta principal)
Lugar: Auditorio Principal "San Juan Bosco"

La asistencia de al menos un apoderado es de carácter fundamental para el fortalecimiento del triángulo educativo (Colegio - Alumno - Familia).

Agradecemos de antemano su compromiso y puntualidad.

Atentamente,
Departamento de Psicología y Dirección General`,
    tipo: 'Urgente',
    fecha: '2026-04-12',
    emisor: 'Dirección General de Estudios',
    emisorCargo: 'Dra. Patricia Valenzuela',
    leido: false,
    requiereFirma: true,
    firmado: false,
    adjuntos: [
      { nombre: 'guia_taller_escuela_padres.pdf', tamanio: '1.4 MB' },
      { nombre: 'programa_de_actividades.pdf', tamanio: '820 KB' }
    ]
  },
  {
    id: 'com-002',
    titulo: 'Salida Pedagógica al Museo de Historia Natural y Planetario',
    resumen: 'Autorización y detalles de la visita cultural programada para 4° Grado de Primaria.',
    contenido: `Estimados Padres de Familia de 4° Grado de Primaria:

Como parte de los proyectos de indagación científica del curso de Ciencia y Tecnología, se ha programado una visita guiada al Museo de Historia Natural y Planetario.

- Fecha: Viernes 24 de Abril de 2026
- Salida del Colegio: 08:30 hrs en buses institucionales monitoreados por GPS.
- Retorno al Colegio: 14:00 hrs.
- Indumentaria: Buzo deportivo oficial del colegio, gorro institucional y refrigerio ligero en lonchera.

Por favor completar la autorización digital correspondiente para habilitar la participación del estudiante.`,
    tipo: 'Evento',
    fecha: '2026-04-10',
    emisor: 'Coordinación de Primaria',
    emisorCargo: 'Lic. Carmen Morales Vega',
    leido: true,
    requiereFirma: true,
    firmado: true,
    firmaFecha: '2026-04-11 10:20',
    firmaNombre: 'Roberto Carlos Fernández Silva (DNI 08765432)',
    adjuntos: [
      { nombre: 'itinerario_museo_2026.pdf', tamanio: '950 KB' }
    ]
  },
  {
    id: 'com-003',
    titulo: 'Calendario de Exámenes Parciales del I Bimestre',
    resumen: 'Rol oficial de evaluaciones escritas y orales para todos los niveles.',
    contenido: `Compartimos el cronograma oficial de exámenes bimestrales correspondientes al Primer Periodo Académico. Rogamos revisar los horarios y apoyar el repaso programado en los hogares.`,
    tipo: 'Académico',
    fecha: '2026-04-05',
    emisor: 'Secretaría Académica',
    emisorCargo: 'Lic. Andrés Salgado',
    leido: true,
    requiereFirma: false,
    adjuntos: [
      { nombre: 'rol_examenes_bimestre_1.pdf', tamanio: '2.1 MB' }
    ]
  }
];

export const MOCK_PAGOS: CuotaPension[] = [
  {
    id: 'pago-001',
    hijoId: 'hijo-001',
    concepto: 'Matrícula Anual 2026 - Sofía Fernández',
    mes: 'Enero',
    monto: 650.00,
    mora: 0.00,
    total: 650.00,
    fechaVencimiento: '2026-01-31',
    estado: 'Pagado',
    fechaPago: '2026-01-20',
    metodoPago: 'Transferencia',
    numeroOperacion: 'BBVA-908129381',
    comprobanteUrl: '#'
  },
  {
    id: 'pago-002',
    hijoId: 'hijo-001',
    concepto: 'Pensión Cuota 1 (Marzo 2026) - Sofía Fernández',
    mes: 'Marzo',
    monto: 580.00,
    mora: 0.00,
    total: 580.00,
    fechaVencimiento: '2026-03-31',
    estado: 'Pagado',
    fechaPago: '2026-03-25',
    metodoPago: 'Tarjeta',
    numeroOperacion: 'VISA-44910293',
    comprobanteUrl: '#'
  },
  {
    id: 'pago-003',
    hijoId: 'hijo-001',
    concepto: 'Pensión Cuota 2 (Abril 2026) - Sofía Fernández',
    mes: 'Abril',
    monto: 580.00,
    mora: 0.00,
    total: 580.00,
    fechaVencimiento: '2026-04-30',
    estado: 'Pendiente'
  },
  {
    id: 'pago-004',
    hijoId: 'hijo-002',
    concepto: 'Pensión Cuota 2 (Abril 2026) - Mateo Fernández',
    mes: 'Abril',
    monto: 620.00,
    mora: 0.00,
    total: 620.00,
    fechaVencimiento: '2026-04-30',
    estado: 'Pendiente'
  }
];

export const MOCK_CHAT_CONTACTOS_PADRE: ContactoChat[] = [
  {
    id: 'doc-tutor-sofia',
    nombre: 'Prof. Carmen Morales (Tutora 4° A)',
    rol: 'Docente',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
    online: true,
    ultimoMensaje: 'Estimado Roberto, la práctica de Sofía fue reprogramada con éxito para este martes.',
    ultimaHora: '10:45 AM',
    noLeidos: 1,
    mensajes: [
      {
        id: 'm1',
        remitenteId: 'padre-001',
        remitenteNombre: 'Roberto Fernández',
        esMio: true,
        texto: 'Buenos días profesora Carmen. Quería confirmar si pudo recibir la justificación médica de Sofía del día jueves.',
        hora: '09:10 AM',
        leido: true
      },
      {
        id: 'm2',
        remitenteId: 'doc-tutor-sofia',
        remitenteNombre: 'Prof. Carmen Morales',
        esMio: false,
        texto: 'Buenos días don Roberto. Sí, fue validada en el sistema institucional.',
        hora: '09:40 AM',
        leido: true
      },
      {
        id: 'm3',
        remitenteId: 'doc-tutor-sofia',
        remitenteNombre: 'Prof. Carmen Morales',
        esMio: false,
        texto: 'Estimado Roberto, la práctica de Sofía fue reprogramada con éxito para este martes.',
        hora: '10:45 AM',
        leido: false
      }
    ]
  },
  {
    id: 'doc-tutor-mateo',
    nombre: 'Lic. Javier Mendoza (Tutor 2° B Sec)',
    rol: 'Docente',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    online: false,
    ultimoMensaje: 'Recuerde revisar el avance de Álgebra para el proyecto bimestral.',
    ultimaHora: 'Ayer',
    noLeidos: 0,
    mensajes: [
      {
        id: 'mm1',
        remitenteId: 'doc-tutor-mateo',
        remitenteNombre: 'Lic. Javier Mendoza',
        esMio: false,
        texto: 'Estimados apoderados, se habilitó la guía del proyecto bimestral en plataforma.',
        hora: 'Ayer 15:30',
        leido: true
      }
    ]
  }
];

export const getMockResumenDashboard = (hijoId: string): ResumenDashboardPadre => {
  const hijo = MOCK_HIJOS.find(h => h.id === hijoId) || MOCK_HIJOS[0];
  const isSofia = hijo.id === 'hijo-001';

  return {
    hijo,
    asistenciaHoy: {
      estado: 'Presente',
      horaIngreso: isSofia ? '07:46 AM' : '07:38 AM'
    },
    proximasEvaluaciones: isSofia
      ? [
          { id: 'pe-1', curso: 'Matemática', titulo: 'Práctica Calificada #2: Fracciones Mixtas', fecha: '2026-04-22', tipo: 'Práctica' },
          { id: 'pe-2', curso: 'Comunicación', titulo: 'Examen de Comprensión Lectora', fecha: '2026-04-27', tipo: 'Examen' },
          { id: 'pe-3', curso: 'Ciencia y Tecnología', titulo: 'Entrega de Informe: Botánica Escolar', fecha: '2026-04-29', tipo: 'Entrega' }
        ]
      : [
          { id: 'pe-4', curso: 'Álgebra', titulo: 'Examen Parcial de Sistemas 2x2', fecha: '2026-04-23', tipo: 'Examen' },
          { id: 'pe-5', curso: 'Física', titulo: 'Informe de Laboratorio: Péndulo', fecha: '2026-04-28', tipo: 'Entrega' }
        ],
    ultimasNotas: isSofia
      ? [
          { curso: 'Matemática', evaluacion: 'Tarea de Criptografía', nota: 20, fecha: '2026-03-22' },
          { curso: 'Ciencia y Tecnología', evaluacion: 'Filtro de Agua', nota: 20, fecha: '2026-03-25' },
          { curso: 'Comunicación', evaluacion: 'Cuento Fantástico', nota: 18, fecha: '2026-03-29' }
        ]
      : [
          { curso: 'Física', evaluacion: 'Laboratorio de MRUV', nota: 18, fecha: '2026-03-24' },
          { curso: 'Álgebra', evaluacion: 'Examen Bimestral I', nota: 17, fecha: '2026-04-03' }
        ],
    comunicadosUrgentes: MOCK_COMUNICADOS.filter(c => c.tipo === 'Urgente' || !c.leido),
    estadoPension: {
      alDia: isSofia ? true : false,
      proximaCuota: isSofia ? 'Cuota 2 - Abril 2026' : 'Cuota 2 - Abril 2026',
      monto: isSofia ? 580.00 : 620.00,
      vencimiento: '30 de Abril, 2026'
    }
  };
};
