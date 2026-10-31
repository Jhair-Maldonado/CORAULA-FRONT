/**
 * Tipos e interfaces para el Módulo de Libreta Bimestral del Apoderado
 * Trazabilidad: RF-26, RF-31 (APOD-LIBRETA-UI | Sprint 8)
 * Base de Datos / Backend: Supabase (PostgreSQL) + PDF Generator (jsPDF / BACK #56)
 */

export type BimestreNumero = 1 | 2 | 3 | 4;

export type NivelLogro = 'AD' | 'A' | 'B' | 'C';

export interface DetalleLibreta {
  id: string | number;
  libreta_id: string | number;
  area: string;
  curso: string;
  criterio: string;
  nota: number;
  nivel_logro?: NivelLogro | null;
  conclusiones_descriptivas?: string | null;
  orden?: number;
}

export interface LibretaBimestral {
  id: string | number;
  estudiante_id: string | number;
  bimestre: BimestreNumero;
  anio_lectivo: number;
  publicado: boolean;
  fecha_publicacion?: string | null;
  promedio_general?: number | null;
  observacion_general?: string | null;
  pdf_url?: string | null;
  fecha_creacion: string;
}

export interface LibretaConDetalles extends LibretaBimestral {
  detalles: DetalleLibreta[];
}

export interface ResumenAreaNotas {
  area: string;
  cursos: {
    nombre: string;
    criterios: {
      criterio: string;
      nota: number;
      nivel_logro?: NivelLogro | null;
    }[];
    promedioCurso: number;
  }[];
  promedioArea: number;
}
