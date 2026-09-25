import { Curso } from '@/types/cursos';

export const MOCK_CURSOS: Curso[] = [
  {
    id: 'matematica',
    nombre: 'Matemática y Razonamiento Lógico',
    codigo: 'MAT-101',
    nivel: 'Secundaria',
    area: 'Ciencias y Matemáticas',
    frecuenciaSemanal: 4,
    horasTotalesSemana: 6,
    cantPracticasCalificadas: 4,
    semanasExamenes: ['Semana 8 (Examen Parcial)', 'Semana 16 (Examen Final)'],
    docenteAsignado: 'Prof. Carlos Eduardo Mendoza',
    syllabusArchivo: {
      nombre: 'Syllabus_Matematica_2026.pdf',
      tamanio: '2.4 MB',
      fechaSubida: '15/03/2026',
      tipo: 'pdf'
    },
    descripcion: 'Desarrollo de competencias lógicas, álgebra elemental, geometría euclidiana y resolución de problemas cotidianos.',
    temarioResumen: [
      'Álgebra y Ecuaciones de Primer Grado',
      'Geometría Plana y Áreas',
      'Razonamiento Matemático I',
      'Trigonometría Básica'
    ]
  },
  {
    id: 'comunicacion',
    nombre: 'Comunicación y Literatura',
    codigo: 'COM-102',
    nivel: 'Secundaria',
    area: 'Humanidades y Letras',
    frecuenciaSemanal: 3,
    horasTotalesSemana: 5,
    cantPracticasCalificadas: 3,
    semanasExamenes: ['Semana 7 (Evaluación de Lectura)', 'Semana 15 (Evaluación Final)'],
    docenteAsignado: 'Prof. María Fernanda Soto',
    syllabusArchivo: {
      nombre: 'Plan_Anual_Comunicacion.docx',
      tamanio: '1.1 MB',
      fechaSubida: '10/03/2026',
      tipo: 'doc'
    },
    descripcion: 'Comprensión lectora avanzada, análisis gramatical, redacción académica y obras literarias representativas.',
    temarioResumen: [
      'Comprensión Lectoras y Textos Argumentativos',
      'Ortografía y Semántica Avanzada',
      'Literatura Peruana e Hispanoamericana',
      'Redacción de Ensayos'
    ]
  },
  {
    id: 'ciencia-tecnologia',
    nombre: 'Ciencia, Tecnología y Ambiente',
    codigo: 'CTA-103',
    nivel: 'Secundaria',
    area: 'Ciencias Naturales',
    frecuenciaSemanal: 3,
    horasTotalesSemana: 4,
    cantPracticasCalificadas: 4,
    semanasExamenes: ['Semana 8 (Lab Check)', 'Semana 16 (Proyecto de Ciencias)'],
    docenteAsignado: 'Prof. Ana María Gutiérrez',
    syllabusArchivo: undefined,
    descripcion: 'Estudio de la materia, energía, biodiversidad, genética básica y proyectos de investigación en laboratorio.',
    temarioResumen: [
      'Método Científico y Laboratorio',
      'Estructura Celular y Biología',
      'Física de la Materia',
      'Ecología y Medio Ambiente'
    ]
  },
  {
    id: 'ingles',
    nombre: 'Inglés Técnico e Intermedio',
    codigo: 'ING-104',
    nivel: 'Secundaria',
    area: 'Idiomas',
    frecuenciaSemanal: 2,
    horasTotalesSemana: 4,
    cantPracticasCalificadas: 2,
    semanasExamenes: ['Semana 9 (Midterm Oral)', 'Semana 16 (Final Exam)'],
    docenteAsignado: 'Prof. Roberto Gómez',
    syllabusArchivo: undefined,
    descripcion: 'Desarrollo de habilidades de Speaking, Listening, Reading y Writing enfocados en certificación internacional.',
    temarioResumen: [
      'Grammar & Vocabulary Builder',
      'Listening Comprehension Workshop',
      'Oral Presentations & Speaking',
      'Written Essays'
    ]
  }
];
