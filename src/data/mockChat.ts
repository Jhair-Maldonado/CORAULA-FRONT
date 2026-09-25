import { ContactoChat } from '@/types/chat';

export const MOCK_CONTACTOS_CHAT: ContactoChat[] = [
  {
    id: 'c-1',
    nombre: 'Prof. Carlos Mendoza',
    rol: 'Docente',
    online: true,
    ultimoMensaje: 'Estimado director, envié las notas de Matemática.',
    ultimaHora: '10:42 AM',
    noLeidos: 2,
    mensajes: [
      { id: 'm-1', remitenteId: 'c-1', remitenteNombre: 'Prof. Carlos Mendoza', esMio: false, texto: 'Buenos días, estimado Director.', hora: '10:35 AM', leido: true },
      { id: 'm-2', remitenteId: 'admin', remitenteNombre: 'Administrador', esMio: true, texto: 'Hola Carlos, ¿cómo vas con los registros del 1° A?', hora: '10:38 AM', leido: true },
      { id: 'm-3', remitenteId: 'c-1', remitenteNombre: 'Prof. Carlos Mendoza', esMio: false, texto: 'Estimado director, envié las notas de Matemática.', hora: '10:42 AM', leido: false }
    ]
  },
  {
    id: 'c-2',
    nombre: 'Elena Beatriz Peralta',
    rol: 'Padre',
    online: true,
    ultimoMensaje: '¿Cuándo será la reunión de apoderados?',
    ultimaHora: '09:15 AM',
    noLeidos: 1,
    mensajes: [
      { id: 'm-1', remitenteId: 'c-2', remitenteNombre: 'Elena Beatriz Peralta', esMio: false, texto: 'Buenas tardes, quisiera consultar sobre la libreta de Lucía.', hora: '09:10 AM', leido: true },
      { id: 'm-2', remitenteId: 'c-2', remitenteNombre: 'Elena Beatriz Peralta', esMio: false, texto: '¿Cuándo será la reunión de apoderados?', hora: '09:15 AM', leido: false }
    ]
  },
  {
    id: 'c-3',
    nombre: 'Prof. María Fernanda Soto',
    rol: 'Docente',
    online: false,
    ultimoMensaje: 'Perfecto, coordinamos para mañana a primera hora.',
    ultimaHora: 'Ayer',
    noLeidos: 0,
    mensajes: [
      { id: 'm-1', remitenteId: 'admin', remitenteNombre: 'Administrador', esMio: true, texto: 'María Fernanda, recuerda revisar el temario de Comunicación.', hora: '04:20 PM', leido: true },
      { id: 'm-2', remitenteId: 'c-3', remitenteNombre: 'Prof. María Fernanda Soto', esMio: false, texto: 'Perfecto, coordinamos para mañana a primera hora.', hora: '04:45 PM', leido: true }
    ]
  },
  {
    id: 'c-4',
    nombre: 'Mateo Sánchez Flores',
    rol: 'Alumno',
    online: true,
    ultimoMensaje: 'Gracias por la aclaración del horario.',
    ultimaHora: 'Lun',
    noLeidos: 0,
    mensajes: [
      { id: 'm-1', remitenteId: 'c-4', remitenteNombre: 'Mateo Sánchez Flores', esMio: false, texto: 'Disculpe, ¿el taller de Robótica empieza el viernes?', hora: '11:00 AM', leido: true },
      { id: 'm-2', remitenteId: 'admin', remitenteNombre: 'Administrador', esMio: true, texto: 'Sí Mateo, en el aula 204.', hora: '11:05 AM', leido: true },
      { id: 'm-3', remitenteId: 'c-4', remitenteNombre: 'Mateo Sánchez Flores', esMio: false, texto: 'Gracias por la aclaración del horario.', hora: '11:06 AM', leido: true }
    ]
  },
  {
    id: 'c-5',
    nombre: 'Jorge Mario Rojas',
    rol: 'Padre',
    online: false,
    ultimoMensaje: 'Ya realicé el pago de la pensión.',
    ultimaHora: '15 Sep',
    noLeidos: 0,
    mensajes: [
      { id: 'm-1', remitenteId: 'c-5', remitenteNombre: 'Jorge Mario Rojas', esMio: false, texto: 'Ya realicé el pago de la pensión.', hora: '03:30 PM', leido: true }
    ]
  }
];
