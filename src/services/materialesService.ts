import httpClient from './httpClient';
import { MaterialEstudioAlumno } from '@/types/alumno';
import { getCalificacionesAlumno, getMaterialesAlumno } from '@/lib/api';
import { coursesService } from './admin/coursesService';

export const MAX_MATERIAL_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
export const MAX_MATERIAL_FILE_SIZE_MB = 15;

export const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.pptx', '.ppt', '.xlsx', '.xls', '.zip'] as const;

export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed'
]);

export interface FileValidationResult {
  valid: boolean;
  error: string | null;
  formattedSize: string;
}

export interface CursoAsignadoAlumno {
  id: string | number;
  curso: string;
  slug: string;
  codigo?: string;
  docente: string;
  area?: string;
  count: number;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Normaliza nombres de asignaturas para rutas slug seguras
 */
export function slugifyCurso(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Valida tamaño y formato del archivo pedagógico seleccionado.
 */
export function validateMaterialFile(file: File | null | undefined): FileValidationResult {
  if (!file) {
    return {
      valid: false,
      error: 'Debe seleccionar un archivo para el material de clase.',
      formattedSize: '0 MB'
    };
  }

  const formattedSize = formatBytes(file.size);

  if (file.size === 0) {
    return {
      valid: false,
      error: 'El archivo seleccionado está vacío (0 bytes).',
      formattedSize
    };
  }

  if (file.size > MAX_MATERIAL_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `El archivo «${file.name}» (${formattedSize}) excede el tamaño máximo permitido de ${MAX_MATERIAL_FILE_SIZE_MB} MB.`,
      formattedSize
    };
  }

  const fileName = file.name.toLowerCase();
  const hasAllowedExt = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
  const hasAllowedMime = file.type ? ALLOWED_MIME_TYPES.has(file.type.toLowerCase()) : false;

  if (!hasAllowedExt) {
    const ext = fileName.includes('.') ? `.${fileName.split('.').pop()}` : '';
    return {
      valid: false,
      error: `Formato de archivo no permitido (${ext || 'desconocido'}). Solo se admiten archivos PDF, Word (.docx), PowerPoint (.pptx), Excel (.xlsx) o ZIP.`,
      formattedSize
    };
  }

  if (file.type && !hasAllowedMime && !fileName.endsWith('.zip')) {
    return {
      valid: false,
      error: `El tipo de contenido no es compatible con los estándares de material de clase institucional.`,
      formattedSize
    };
  }

  return {
    valid: true,
    error: null,
    formattedSize
  };
}

/**
 * Determina el tipo MIME correspondiente a la extensión de un archivo
 */
function getMimeForFormat(formato: string): string {
  const f = formato.toUpperCase().trim();
  switch (f) {
    case 'PDF':
      return 'application/pdf';
    case 'DOCX':
    case 'DOC':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'PPTX':
    case 'PPT':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'XLSX':
    case 'XLS':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'ZIP':
      return 'application/zip';
    default:
      return 'application/octet-stream';
  }
}

export const DESCARGA_NO_DISPONIBLE = 'Descarga no disponible: módulo en construcción';

/**
 * Ejecuta la descarga real autorizada del material pedagógico en el navegador.
 * Sin urlDescarga real no descarga nada y lanza DESCARGA_NO_DISPONIBLE.
 */
export async function descargarArchivoMaterial(material: MaterialEstudioAlumno): Promise<void> {
  const extension = material.formato.toLowerCase();
  const safeFilename = `${material.titulo.toLowerCase().replace(/[^a-z0-9]/gi, '_')}.${extension}`;

  // Si existe una URL de descarga real provista por el backend y distinta de '#'
  if (material.urlDescarga && material.urlDescarga !== '#') {
    try {
      const response = await httpClient.get(material.urlDescarga, {
        responseType: 'blob'
      });
      const rawHeader = response.headers['content-type'];
      const mimeType = typeof rawHeader === 'string' ? rawHeader : getMimeForFormat(material.formato);
      const blob = new Blob([response.data], {
        type: mimeType
      });
      triggerBrowserDownload(blob, safeFilename);
      return;
    } catch {
      throw new Error(`No fue posible descargar el archivo «${material.titulo}». Comprueba tu conexión o credenciales.`);
    }
  }

  // Sin URL real (datos simulados, BACK #53 pendiente) no se genera ningún archivo.
  throw new Error(DESCARGA_NO_DISPONIBLE);
}

/**
 * Dispara la descarga a través del DOM usando un elemento ancla temporal
 */
function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.style.display = 'none';
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  }, 200);
}

/**
 * Obtiene la lista completa de cursos asignados al alumno desde la base de datos / servicios,
 * correlacionando el conteo de materiales disponibles por cada curso.
 */
export async function getAlumnoCursosAsignados(): Promise<CursoAsignadoAlumno[]> {
  // 1. Obtener los materiales disponibles para realizar el conteo
  let materiales: MaterialEstudioAlumno[] = [];
  try {
    const matsRes = await getMaterialesAlumno('Todos los cursos', 'Todos los archivos');
    materiales = matsRes?.materiales || [];
  } catch {
    materiales = [];
  }

  // Helper para contar materiales correspondientes a un curso
  const contarMateriales = (nombreCurso: string, slugCurso: string): number => {
    return materiales.filter(m => {
      const slugM = slugifyCurso(m.curso);
      return slugM === slugCurso || m.curso.toLowerCase() === nombreCurso.toLowerCase();
    }).length;
  };

  // 2. Intentar consultar el catálogo de cursos de la BD institucional
  try {
    const res = await coursesService.list({ active: true, size: 50 });
    if (res?.content && res.content.length > 0) {
      return res.content.map(c => {
        const slug = slugifyCurso(c.name);
        const mats = materiales.filter(m => slugifyCurso(m.curso) === slug || m.curso.toLowerCase() === c.name.toLowerCase());
        const docenteMat = mats[0]?.docente;
        return {
          id: c.id,
          curso: c.name,
          slug,
          codigo: c.code,
          docente: docenteMat || 'Docente titular',
          area: c.area,
          count: contarMateriales(c.name, slug)
        };
      });
    }
  } catch {
    // Si la llamada administrativa falla (por rol o autenticación de estudiante), procedemos con cursos del alumno
  }

  // 3. Fallback de asignación por matrícula/calificaciones del alumno
  try {
    const calif = await getCalificacionesAlumno();
    if (calif?.cursos && calif.cursos.length > 0) {
      return calif.cursos.map(c => {
        const slug = slugifyCurso(c.curso);
        return {
          id: c.id,
          curso: c.curso,
          slug,
          codigo: c.id,
          docente: c.docenteTitular || 'Docente titular',
          count: contarMateriales(c.curso, slug)
        };
      });
    }
  } catch {
    // Continúa con fallback por materiales
  }

  // 4. Fallback final: consolidar nombres únicos presentes en materiales
  const nombresUnicos = Array.from(new Set(materiales.map(m => m.curso)));
  return nombresUnicos.map(name => {
    const slug = slugifyCurso(name);
    const mats = materiales.filter(m => m.curso === name);
    return {
      id: slug,
      curso: name,
      slug,
      docente: mats[0]?.docente || 'Docente titular',
      count: mats.length
    };
  });
}

/**
 * Resuelve y busca un curso asignado al alumno a partir del parámetro de ruta [id] (slug, ID numérico, código o nombre).
 */
export function resolverCursoAlumno(
  cursos: CursoAsignadoAlumno[],
  materiales: MaterialEstudioAlumno[],
  slugOrId: string
): { cursoNombre: string; cursoId: string | number; docente: string; materiales: MaterialEstudioAlumno[] } | null {
  const rawParam = decodeURIComponent(slugOrId).trim().toLowerCase();
  const targetSlug = slugifyCurso(rawParam);

  // 1. Buscar en cursos asignados
  const matchCurso = cursos.find(c => {
    return (
      String(c.id).toLowerCase() === rawParam ||
      c.slug === targetSlug ||
      slugifyCurso(c.curso) === targetSlug ||
      (c.codigo && c.codigo.toLowerCase() === rawParam)
    );
  });

  if (matchCurso) {
    const courseMats = materiales.filter(m => {
      return (
        slugifyCurso(m.curso) === matchCurso.slug ||
        slugifyCurso(m.curso) === targetSlug ||
        m.curso.toLowerCase() === matchCurso.curso.toLowerCase()
      );
    });
    return {
      cursoNombre: matchCurso.curso,
      cursoId: matchCurso.id,
      docente: matchCurso.docente,
      materiales: courseMats
    };
  }

  // 2. Buscar si existe en los materiales directamente
  const matchingMaterials = materiales.filter(m => {
    return slugifyCurso(m.curso) === targetSlug || m.curso.toLowerCase() === rawParam;
  });

  if (matchingMaterials.length > 0) {
    return {
      cursoNombre: matchingMaterials[0].curso,
      cursoId: targetSlug,
      docente: matchingMaterials[0].docente,
      materiales: matchingMaterials
    };
  }

  return null;
}
