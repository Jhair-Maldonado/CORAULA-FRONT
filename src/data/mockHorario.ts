import { BloqueHorario, CursoConfig } from '@/types/horario';

export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const HORAS_INICIO_OPCIONES = [
  { value: 0, label: '07:00 a. m.', horaStr: '07:00 a. m.', minutos: 7 * 60 },
  { value: 0.5, label: '07:30 a. m.', horaStr: '07:30 a. m.', minutos: 7 * 60 + 30 },
  { value: 1, label: '08:00 a. m.', horaStr: '08:00 a. m.', minutos: 8 * 60 },
  { value: 1.5, label: '08:30 a. m.', horaStr: '08:30 a. m.', minutos: 8 * 60 + 30 },
  { value: 2, label: '09:00 a. m.', horaStr: '09:00 a. m.', minutos: 9 * 60 },
  { value: 2.5, label: '09:30 a. m.', horaStr: '09:30 a. m.', minutos: 9 * 60 + 30 },
  { value: 3, label: '10:00 a. m.', horaStr: '10:00 a. m.', minutos: 10 * 60 },
  { value: 3.5, label: '10:30 a. m.', horaStr: '10:30 a. m.', minutos: 10 * 60 + 30 },
  { value: 4, label: '11:00 a. m.', horaStr: '11:00 a. m.', minutos: 11 * 60 },
  { value: 4.5, label: '11:30 a. m.', horaStr: '11:30 a. m.', minutos: 11 * 60 + 30 },
  { value: 5, label: '12:00 p. m.', horaStr: '12:00 p. m.', minutos: 12 * 60 },
  { value: 5.5, label: '12:30 p. m.', horaStr: '12:30 p. m.', minutos: 12 * 60 + 30 },
  { value: 6, label: '01:00 p. m.', horaStr: '01:00 p. m.', minutos: 13 * 60 },
  { value: 6.5, label: '01:30 p. m.', horaStr: '01:30 p. m.', minutos: 13 * 60 + 30 },
  { value: 7, label: '02:00 p. m.', horaStr: '02:00 p. m.', minutos: 14 * 60 },
  { value: 7.5, label: '02:30 p. m.', horaStr: '02:30 p. m.', minutos: 14 * 60 + 30 },
  { value: 8, label: '03:00 p. m.', horaStr: '03:00 p. m.', minutos: 15 * 60 },
  { value: 8.5, label: '03:30 p. m.', horaStr: '03:30 p. m.', minutos: 15 * 60 + 30 },
  { value: 9, label: '04:00 p. m.', horaStr: '04:00 p. m.', minutos: 16 * 60 },
  { value: 9.5, label: '04:30 p. m.', horaStr: '04:30 p. m.', minutos: 16 * 60 + 30 },
  { value: 10, label: '05:00 p. m.', horaStr: '05:00 p. m.', minutos: 17 * 60 },
  { value: 10.5, label: '05:30 p. m.', horaStr: '05:30 p. m.', minutos: 17 * 60 + 30 },
];

export const HORAS_LISTA = [
  { label: '07:00 a. m.', horaInicio: '07:00 a. m.', horaFin1h: '08:00 a. m.' },
  { label: '08:00 a. m.', horaInicio: '08:00 a. m.', horaFin1h: '09:00 a. m.' },
  { label: '09:00 a. m.', horaInicio: '09:00 a. m.', horaFin1h: '10:00 a. m.' },
  { label: '10:00 a. m.', horaInicio: '10:00 a. m.', horaFin1h: '11:00 a. m.' },
  { label: '11:00 a. m.', horaInicio: '11:00 a. m.', horaFin1h: '12:00 p. m.' },
  { label: '12:00 p. m.', horaInicio: '12:00 p. m.', horaFin1h: '01:00 p. m.' },
  { label: '01:00 p. m.', horaInicio: '01:00 p. m.', horaFin1h: '02:00 p. m.' },
  { label: '02:00 p. m.', horaInicio: '02:00 p. m.', horaFin1h: '03:00 p. m.' },
  { label: '03:00 p. m.', horaInicio: '03:00 p. m.', horaFin1h: '04:00 p. m.' },
  { label: '04:00 p. m.', horaInicio: '04:00 p. m.', horaFin1h: '05:00 p. m.' },
  { label: '05:00 p. m.', horaInicio: '05:00 p. m.', horaFin1h: '06:00 p. m.' },
];

export const CURSOS_CONFIG: CursoConfig[] = [
  { materia: 'Interacción Hombre Máquina (31673)', docentes: ['María Fernanda Soto', 'Carlos Vega'], colorCard: 'bg-[#b84c0e] text-white', colorBadge: 'bg-white text-[#b84c0e]' },
  { materia: 'Matemáticas Avanzadas', docentes: ['María Fernanda Soto', 'Carlos Vega'], colorCard: 'bg-blue-600 text-white', colorBadge: 'bg-white text-blue-800' },
  { materia: 'Lenguaje y Comunicación', docentes: ['Lucía Paredes', 'Ana María Torres'], colorCard: 'bg-emerald-600 text-white', colorBadge: 'bg-white text-emerald-800' },
  { materia: 'Historia del Perú', docentes: ['Carlos Vega', 'Jorge Salinas'], colorCard: 'bg-amber-600 text-white', colorBadge: 'bg-white text-amber-800' },
  { materia: 'Ciencia y Tecnología', docentes: ['Jorge Salinas', 'María Fernanda Soto'], colorCard: 'bg-purple-600 text-white', colorBadge: 'bg-white text-purple-800' },
  { materia: 'Sistemas Integrados (31675)', docentes: ['Jorge Salinas', 'Carlos Vega'], colorCard: 'bg-[#0e6eb8] text-white', colorBadge: 'bg-white text-[#0e6eb8]' },
  { materia: 'Planeamiento Estratégico', docentes: ['Lucía Paredes', 'Robert Smith'], colorCard: 'bg-rose-600 text-white', colorBadge: 'bg-white text-rose-800' },
];

export const MOCK_BLOQUES_HORARIO: BloqueHorario[] = [
  {
    id: 'b1',
    diaIndex: 1, // Martes
    horaInicioIndex: 0, // 07:00 a. m.
    duracionHoras: 2, // 07:00 a. m. - 09:00 a. m.
    materia: 'Sistemas Integrados (31675)',
    docente: 'Prof. Jorge Salinas',
    salon: 'Aula 101',
    modalidad: 'Presencial',
    colorCard: 'bg-[#0e6eb8] text-white',
    colorBadge: 'bg-white text-[#0e6eb8]'
  },
  {
    id: 'b2',
    diaIndex: 3, // Jueves
    horaInicioIndex: 8, // 03:00 p. m.
    duracionHoras: 2, // 3:00 pm - 5:00 pm
    materia: 'Sistemas Integrados (31675)',
    docente: 'Prof. Jorge Salinas',
    salon: 'Aula 102',
    modalidad: 'Presencial',
    colorCard: 'bg-[#0e6eb8] text-white',
    colorBadge: 'bg-white text-[#0e6eb8]'
  },
  {
    id: 'b3',
    diaIndex: 4, // Viernes
    horaInicioIndex: 9, // 04:00 p. m.
    duracionHoras: 2,
    materia: 'Planeamiento Estratégico',
    docente: 'Prof. Lucía Paredes',
    salon: 'Aula 301',
    modalidad: 'Presencial',
    colorCard: 'bg-rose-700 text-white',
    colorBadge: 'bg-white text-rose-800'
  }
];
