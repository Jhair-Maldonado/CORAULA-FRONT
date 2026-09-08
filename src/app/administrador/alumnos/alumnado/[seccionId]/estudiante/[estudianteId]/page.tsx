import { MOCK_GRADOS } from '@/data/mockAlumnos';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft01Icon, 
  PencilEdit02Icon, 
  UserCircleIcon, 
  Mail01Icon, 
  SmartPhone01Icon, 
  Location01Icon,
  Calendar01Icon,
  HeartAddIcon,
  ShieldKeyIcon,
  BookOpen01Icon,
  Copy01Icon
} from 'hugeicons-react';

export function generateStaticParams() {
  const params: { seccionId: string; estudianteId: string }[] = [];
  MOCK_GRADOS.forEach(grado => {
    grado.secciones.forEach(seccion => {
      seccion.estudiantes.forEach(est => {
        params.push({
          seccionId: seccion.id,
          estudianteId: est.id
        });
      });
    });
  });
  return params;
}

const getEstudiante = (seccionId: string, estudianteId: string) => {
  for (const grado of MOCK_GRADOS) {
    const seccion = grado.secciones.find(s => s.id === seccionId);
    if (seccion) {
      const estudiante = seccion.estudiantes.find(e => e.id === estudianteId);
      if (estudiante) return { estudiante, grado, seccion };
    }
  }
  return null;
};

export default async function EstudianteDetallePage({ 
  params 
}: { 
  params: Promise<{ seccionId: string; estudianteId: string }> 
}) {
  const resolvedParams = await params;
  const data = getEstudiante(resolvedParams.seccionId, resolvedParams.estudianteId);

  if (!data) {
    notFound();
  }

  const { estudiante, grado, seccion } = data;

  return (
    <div className="w-full h-full flex flex-col bg-canvas overflow-y-auto">
      {/* Top Banner / Cover */}
      <div className="h-32 md:h-30 bg-accent relative shrink-0">
        <div className="absolute top-6 left-6 z-10 flex gap-2">
          <Link 
            href={`/administrador/alumnos/alumnado/${resolvedParams.seccionId}`}
            className="flex items-center gap-2 px-3 py-1.5 bg-black/20 hover:bg-black/30 backdrop-blur-sm text-white rounded-lg text-[13px] font-bold transition-colors"
          >
            <ArrowLeft01Icon size={16} /> Volver al aula
          </Link>
        </div>
      </div>

      <div className="max-w-4xl w-full mx-auto px-6 md:px-10 pb-16 -mt-12 relative z-20 flex-1">
        
        {/* Header Profile */}
        <div className="bg-white rounded-2xl shadow-sm border border-line p-6 md:p-5 flex flex-col md:flex-row items-center md:items-end gap-6 mb-5">
          <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-neutral border-4 border-white shadow-md flex items-center justify-center text-3xl font-black text-accent shrink-0">
            {estudiante.nombres.charAt(0)}{estudiante.apellidos.charAt(0)}
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-xl md:text-2xl font-black text-ink tracking-tight mb-1">
              {estudiante.nombres} {estudiante.apellidos}
            </h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs font-bold text-muted">
              <span className="bg-neutral px-2 py-1 rounded text-ink flex items-center gap-1.5">
                <BookOpen01Icon size={14} /> {grado.nombre} - Sec. {seccion.letra}
              </span>
              <span className="bg-neutral px-2 py-1 rounded text-ink flex items-center gap-1.5">
                <UserCircleIcon size={14} /> DNI: {estudiante.dni}
              </span>
            </div>
          </div>

          <button className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-xs font-bold hover:bg-rose-800 transition-colors shadow-sm shrink-0">
            <PencilEdit02Icon size={16} /> Editar Alumno
          </button>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Datos Personales */}
          <div className="bg-white rounded-2xl border border-line p-6 shadow-sm">
            <h2 className="text-[13px] font-black text-ink uppercase tracking-widest mb-5 flex items-center gap-2">
              <UserCircleIcon size={18} className="text-accent" /> Datos Personales
            </h2>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4 p-3 bg-neutral/50 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-white border border-line flex items-center justify-center text-muted shrink-0">
                  <Calendar01Icon size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider">F. Nacimiento</p>
                  <p className="text-xs font-bold text-ink">{estudiante.fechaNacimiento}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-3 bg-neutral/50 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-white border border-line flex items-center justify-center text-muted shrink-0">
                  <SmartPhone01Icon size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Teléfono</p>
                  <p className="text-xs font-bold text-ink">{estudiante.telefono}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 bg-neutral/50 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-white border border-line flex items-center justify-center text-muted shrink-0">
                  <Mail01Icon size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Correo Institucional</p>
                  <p className="text-xs font-bold text-ink">{estudiante.correo}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 bg-neutral/50 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-white border border-line flex items-center justify-center text-muted shrink-0">
                  <Location01Icon size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Dirección (Referencial)</p>
                  <p className="text-xs font-bold text-ink">Registrada en sistema central</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {/* Contacto de Emergencia */}
            {estudiante.contactoEmergencia && (
              <div className="bg-white rounded-2xl border border-line p-6 shadow-sm border-l-4 border-l-rose-400">
                <h2 className="text-[13px] font-black text-ink uppercase tracking-widest mb-5 flex items-center gap-2">
                  <HeartAddIcon size={18} className="text-rose-500" /> Contacto de Emergencia
                </h2>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between p-3 bg-rose-50 rounded-xl border border-rose-100">
                    <div>
                      <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Familiar / Apoderado</p>
                      <p className="text-xs font-black text-ink mt-0.5">{estudiante.contactoEmergencia.nombre}</p>
                      <p className="text-[11px] font-bold text-muted">{estudiante.contactoEmergencia.relacion}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Celular</p>
                      <p className="text-base font-black text-ink tracking-tight mt-0.5">{estudiante.contactoEmergencia.telefono}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Credenciales de Acceso */}
            {estudiante.credenciales && (
              <div className="bg-ink text-white rounded-2xl p-6 shadow-sm relative overflow-hidden">
                {/* Background decorative icon */}
                <ShieldKeyIcon size={120} className="absolute -right-6 -bottom-6 text-white/5" />
                
                <h2 className="text-[13px] font-black text-white uppercase tracking-widest mb-5 flex items-center gap-2 relative z-10">
                  <ShieldKeyIcon size={18} className="text-accent-soft" /> Accesos al Sistema
                </h2>
                
                <div className="flex flex-col gap-4 relative z-10">
                  <div>
                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider mb-1">Usuario (DNI)</p>
                    <div className="flex items-center justify-between bg-white/10 rounded-lg p-3 backdrop-blur-md border border-white/10">
                      <code className="text-xs font-mono font-bold">{estudiante.credenciales.usuario}</code>
                      <button className="text-white/60 hover:text-white transition-colors">
                        <Copy01Icon size={16} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider mb-1">Contraseña Inicial</p>
                    <div className="flex items-center justify-between bg-white/10 rounded-lg p-3 backdrop-blur-md border border-white/10">
                      <code className="text-xs font-mono font-bold text-accent-soft">{estudiante.credenciales.contrasenia}</code>
                      <button className="text-white/60 hover:text-white transition-colors">
                        <Copy01Icon size={16} />
                      </button>
                    </div>
                    <p className="text-[10px] text-white/40 font-medium mt-2">
                      El alumno deberá cambiar esta contraseña al ingresar por primera vez.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
