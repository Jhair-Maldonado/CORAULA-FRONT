import { formatIsoDate } from '@/lib/gradeWindowContract';
import { GRADE_WINDOW_EXPIRED_MESSAGE } from '@/services/teacher/teacherGradesService';
import type { GradeWindow } from '@/types/gradeWindowApi';

export const NO_GRADE_WINDOW_MESSAGE = 'Sin fecha límite configurada';

// BACKEND #39: registration date D and inclusive deadline (the later of D+7 and an extension), America/Lima.
export default function PlazoRegistroNotas({ gradeWindow }: { gradeWindow: GradeWindow | null }) {
  if (!gradeWindow) return <p role="status" className="p-3 bg-white border border-[#E5E7EB] text-[#64748B] rounded-xl text-xs">{NO_GRADE_WINDOW_MESSAGE}</p>;
  const { registrationDate, registrationDateConfigured, extendedDeadline, deadline, expired } = gradeWindow;
  return (
    <section aria-label="Plazo de registro de notas" className={`p-3 border rounded-xl text-xs flex flex-col gap-1 ${expired ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-white border-[#E5E7EB] text-[#64748B]'}`}>
      <p>Fecha de registro: <strong className="text-[#111827]"><time dateTime={registrationDate}>{formatIsoDate(registrationDate)}</time></strong>
        {!registrationDateConfigured && ' (fin del bimestre; sin fecha configurada por el Director)'}</p>
      <p>Fecha límite: <strong className="text-[#111827]"><time dateTime={deadline}>{formatIsoDate(deadline)}</time></strong> inclusive, hora de Lima
        {extendedDeadline !== null && extendedDeadline === deadline ? ' (ampliada por el Director)' : ' (fecha de registro + 7 días)'}</p>
      {expired
        ? <p role="alert" className="font-bold">{GRADE_WINDOW_EXPIRED_MESSAGE}</p>
        : <p>Puedes registrar y corregir notas hasta la fecha límite.</p>}
    </section>
  );
}
