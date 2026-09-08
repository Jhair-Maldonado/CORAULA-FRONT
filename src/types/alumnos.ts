export interface ContactoEmergencia {
  nombre: string;
  telefono: string;
  relacion: string; // Ej. "Padre", "Madre"
}

export interface Credenciales {
  usuario: string;     // Usualmente el DNI
  contrasenia: string;
}

export interface Estudiante {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string;
  edad: number;
  telefono: string;
  direccion: string;
  correo: string;
  fechaNacimiento: string;
  estado: 'Activo' | 'Inactivo' | 'Suspendido';
  contactoEmergencia: ContactoEmergencia;
  credenciales: Credenciales;
  enRiesgo?: boolean;
  incidencias?: string[];
}

export interface Seccion {
  id: string;
  nombre: string;     // Ej. "1° Grado A"
  letra: string;      // Ej. "A"
  capacidadMaxima: number; // Ej. 30
  estudiantes: Estudiante[];
}

export interface Grado {
  id: string;
  nivel: string;      // Ej. "Secundaria"
  numero: number;     // Ej. 1
  nombre: string;     // Ej. "1° Grado"
  secciones: Seccion[];
}
