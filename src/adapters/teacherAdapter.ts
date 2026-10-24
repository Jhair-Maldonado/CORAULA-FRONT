import type { AdminTeacher, AdminTeacherDetail, TeacherFormValues } from '@/types/adminTeacher';
import type { CreateTeacherRequest, TeacherDetailResponse, TeacherResponse, UpdateTeacherRequest } from '@/types/teacherApi';

export function toAdminTeacher(teacher: TeacherResponse): AdminTeacher {
  return {
    ...teacher, id: String(teacher.id), nombreCompleto: teacher.fullName,
    iniciales: (teacher.firstNames.trim().charAt(0) + teacher.paternalLastName.trim().charAt(0)).toUpperCase(),
    estadoLabel: teacher.active ? 'Activo' : 'Inactivo',
  };
}

export function toAdminTeacherDetail(teacher: TeacherDetailResponse): AdminTeacherDetail {
  return { ...toAdminTeacher(teacher), assignments: teacher.assignments };
}

export function toTeacherForm(teacher: AdminTeacher): TeacherFormValues {
  return {
    dni: teacher.dni, firstNames: teacher.firstNames, paternalLastName: teacher.paternalLastName,
    maternalLastName: teacher.maternalLastName ?? '', phone: teacher.phone ?? '', specialty: teacher.specialty ?? '',
  };
}

export function toCreateTeacher(values: TeacherFormValues): CreateTeacherRequest {
  return {
    dni: values.dni.trim().toUpperCase(), firstNames: values.firstNames.trim(),
    paternalLastName: values.paternalLastName.trim(), maternalLastName: values.maternalLastName.trim() || null,
    phone: values.phone.trim() || null, specialty: values.specialty.trim() || null,
  };
}

export function toUpdateTeacher(values: TeacherFormValues, original: AdminTeacher): UpdateTeacherRequest {
  const next = toCreateTeacher(values);
  const previous = toCreateTeacher(toTeacherForm(original));
  const patch: UpdateTeacherRequest = {};
  const fields = ['dni', 'firstNames', 'paternalLastName', 'maternalLastName', 'phone', 'specialty'] as const;
  for (const field of fields) {
    if (next[field] !== previous[field]) patch[field] = next[field] ?? '';
  }
  return patch;
}

export function teacherFormValidation(values: TeacherFormValues): string | null {
  if (!/^[0-9A-Z]{8,12}$/i.test(values.dni.trim())) return 'El DNI debe tener entre 8 y 12 caracteres alfanuméricos.';
  if (!values.firstNames.trim() || !values.paternalLastName.trim()) return 'Nombres y apellido paterno son obligatorios.';
  const limits = { dni: 12, firstNames: 120, paternalLastName: 120, maternalLastName: 120, phone: 30, specialty: 100 } as const;
  for (const field of Object.keys(limits) as (keyof typeof limits)[]) {
    if (values[field].trim().length > limits[field]) return 'Uno de los campos supera la longitud permitida.';
  }
  return null;
}
