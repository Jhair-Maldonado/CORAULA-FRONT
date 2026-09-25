export interface MensajeChat {
  id: string;
  remitenteId: string;
  remitenteNombre: string;
  esMio: boolean;
  texto: string;
  hora: string;
  leido?: boolean;
}

export interface ContactoChat {
  id: string;
  nombre: string;
  rol: 'Docente' | 'Padre' | 'Alumno' | 'Administrador';
  avatar?: string;
  online: boolean;
  ultimoMensaje: string;
  ultimaHora: string;
  noLeidos?: number;
  mensajes: MensajeChat[];
}
