import { Grado } from '@/types/alumnos';

export const MOCK_GRADOS: Grado[] = [
  {
    id: 'grado-1',
    nivel: 'Secundaria',
    numero: 1,
    nombre: '1° Grado',
    secciones: [
      {
        id: 'sec-1a',
        nombre: '1° Grado A',
        letra: 'A',
        capacidadMaxima: 30,
        estudiantes: [
          {
            id: 'est-1',
            nombres: 'Ana María',
            apellidos: 'Torres García',
            dni: '45678901',
            edad: 12,
            telefono: '+34 612 345 678',
            direccion: 'Av. Primavera 123, Ciudad',
            correo: 'ana.torres@escuela.edu',
            fechaNacimiento: '15/04/2014',
            estado: 'Activo',
            contactoEmergencia: { nombre: 'Juan Torres', telefono: '+34 600 111 222', relacion: 'Padre' },
            credenciales: { usuario: '45678901', contrasenia: 'Ana2014*' }
          },
          {
            id: 'est-2',
            nombres: 'Carlos Eduardo',
            apellidos: 'López Mendoza',
            dni: '45678902',
            edad: 12,
            telefono: '+34 612 345 679',
            direccion: 'Calle Los Pinos 456, Ciudad',
            correo: 'carlos.lopez@escuela.edu',
            fechaNacimiento: '22/08/2014',
            estado: 'Activo',
            contactoEmergencia: { nombre: 'María Mendoza', telefono: '+34 600 111 333', relacion: 'Madre' },
            credenciales: { usuario: '45678902', contrasenia: 'Carlos2014*' }
          },
          {
            id: 'est-3',
            nombres: 'Lucía',
            apellidos: 'Fernández Ruiz',
            dni: '45678903',
            edad: 11,
            telefono: '+34 612 345 680',
            direccion: 'Urb. Las Flores Mz A, Ciudad',
            correo: 'lucia.fernandez@escuela.edu',
            fechaNacimiento: '10/11/2014',
            estado: 'Activo',
            contactoEmergencia: { nombre: 'Roberto Fernández', telefono: '+34 600 111 444', relacion: 'Padre' },
            credenciales: { usuario: '45678903', contrasenia: 'Lucia2014*' }
          }
        ]
      },
      {
        id: 'sec-1b',
        nombre: '1° Grado B',
        letra: 'B',
        capacidadMaxima: 30,
        estudiantes: [
          {
            id: 'est-4',
            nombres: 'Diego',
            apellidos: 'Gómez Sánchez',
            dni: '45678904',
            edad: 12,
            telefono: '+34 612 345 681',
            direccion: 'Calle Sol 789, Ciudad',
            correo: 'diego.gomez@escuela.edu',
            fechaNacimiento: '05/02/2014',
            estado: 'Activo',
            contactoEmergencia: { nombre: 'Elena Sánchez', telefono: '+34 600 111 555', relacion: 'Madre' },
            credenciales: { usuario: '45678904', contrasenia: 'Diego2014*' }
          }
        ]
      },
      {
        id: 'sec-1c',
        nombre: '1° Grado C',
        letra: 'C',
        capacidadMaxima: 30,
        estudiantes: []
      }
    ]
  },
  {
    id: 'grado-2',
    nivel: 'Secundaria',
    numero: 2,
    nombre: '2° Grado',
    secciones: [
      {
        id: 'sec-2a',
        nombre: '2° Grado A',
        letra: 'A',
        capacidadMaxima: 25,
        estudiantes: []
      },
      {
        id: 'sec-2b',
        nombre: '2° Grado B',
        letra: 'B',
        capacidadMaxima: 25,
        estudiantes: []
      }
    ]
  }
];

export const getGradoById = (id: string) => MOCK_GRADOS.find(g => g.id === id);

export const getSeccionById = (gradoId: string, seccionId: string) => {
  const grado = getGradoById(gradoId);
  return grado?.secciones.find(s => s.id === seccionId);
};

export const getEstudianteById = (gradoId: string, seccionId: string, estudianteId: string) => {
  const seccion = getSeccionById(gradoId, seccionId);
  return seccion?.estudiantes.find(e => e.id === estudianteId);
};
