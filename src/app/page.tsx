'use client';

import React, { useContext, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AuthContext } from '@/contexts/AuthContext';
import {
  GraduationCap,
  BookOpen,
  Users,
  ShieldCheck,
  Sparkles,
  Award,
  HeartHandshake,
  Star,
  ArrowRight,
  LogOut,
  School,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  MapPin,
  Menu,
  X,
  Compass,
  Smile,
  ArrowUpRight,
  MessageCircle,
  Calendar,
  Send,
  Video,
  FileText,
  Search,
} from 'lucide-react';

const PORTALES = [
  {
    id: 'estudiante',
    title: 'Portal Estudiante',
    role: 'Alumno',
    path: '/alumno',
    badge: 'Aula Virtual',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    headerBg: 'bg-gradient-to-br from-rose-700 to-rose-900',
    desc: 'Visualización de clases en vivo, horario semanal, tareas asignadas, boletas bimestrales y biblioteca digital.',
    accentColor: 'text-rose-700',
    btnBg: 'bg-rose-700 hover:bg-rose-800 text-white',
    icon: GraduationCap,
  },
  {
    id: 'padre',
    title: 'Portal de Familias',
    role: 'Padres y Apoderados',
    path: '/padre',
    badge: 'Acompañamiento',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    headerBg: 'bg-gradient-to-br from-emerald-600 to-teal-800',
    desc: 'Seguimiento en tiempo real de asistencia diaria, progreso de aprendizaje, comunicados y justificaciones.',
    accentColor: 'text-emerald-700',
    btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    icon: HeartHandshake,
  },
  {
    id: 'docente',
    title: 'Portal Docente',
    role: 'Profesorado',
    path: '/docente/login',
    badge: 'Gestión de Clases',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-200',
    headerBg: 'bg-gradient-to-br from-amber-600 to-amber-800',
    desc: 'Registro de asistencia biométrica y contingencia, publicación de sesiones de clase, notas e incidencias.',
    accentColor: 'text-amber-700',
    btnBg: 'bg-amber-600 hover:bg-amber-700 text-white',
    icon: BookOpen,
  },
  {
    id: 'directivo',
    title: 'Dirección Escolar',
    role: 'Equipo Directivo',
    path: '/login/security/administrador',
    badge: 'Supervisión Pedagógica',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
    headerBg: 'bg-gradient-to-br from-slate-700 to-slate-900',
    desc: 'Supervisión de aulas activas, avance curricular por secciones, auditoría del sistema y métricas académicas.',
    accentColor: 'text-slate-800',
    btnBg: 'bg-slate-800 hover:bg-slate-900 text-white',
    icon: Compass,
  },
  {
    id: 'administrador',
    title: 'Administración',
    role: 'Gestor del Sistema',
    path: '/login/security/administrador',
    badge: 'Control Institucional',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    headerBg: 'bg-gradient-to-br from-rose-800 to-red-950',
    desc: 'Matrícula de alumnos, configuración de periodos y bimestres, horarios escolares y cuentas de personal.',
    accentColor: 'text-rose-800',
    btnBg: 'bg-rose-800 hover:bg-rose-900 text-white',
    icon: ShieldCheck,
  },
];

const PILARES = [
  {
    title: 'Formación en Valores y Fe',
    desc: 'Educación con identidad cristiana inspirada en el carisma del Sagrado Corazón.',
    color: 'bg-rose-700',
    icon: HeartHandshake,
  },
  {
    title: 'Visualización de Clases',
    desc: 'Acceso estructurado a sesiones didácticas, materiales y clases para repasar.',
    color: 'bg-emerald-600',
    icon: Video,
  },
  {
    title: 'Plana Docente Acreditada',
    desc: 'Educadores titulados y en constante actualización tecnológica y pedagógica.',
    color: 'bg-sky-600',
    icon: Award,
  },
  {
    title: 'Seguridad y Asistencia',
    desc: 'Control biométrico y notificaciones inmediatas a los padres de familia.',
    color: 'bg-amber-600',
    icon: ShieldCheck,
  },
  {
    title: 'Aprendizaje Activo',
    desc: 'Proyectos de ciencia, robótica, arte y desarrollo de pensamiento crítico.',
    color: 'bg-indigo-600',
    icon: Sparkles,
  },
  {
    title: 'Vínculo Colegio - Familia',
    desc: 'Comunicación transparente y seguimiento del rendimiento escolar en vivo.',
    color: 'bg-teal-600',
    icon: Smile,
  },
];

export default function HomePage() {
  const authContext = useContext(AuthContext);
  const activeRole = authContext?.role;
  const isAuthenticated = authContext?.status === 'authenticated' && !!activeRole;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modalInscripcionOpen, setModalInscripcionOpen] = useState(false);
  const [inscripcionEnviada, setInscripcionEnviada] = useState(false);

  const [formData, setFormData] = useState({
    nombreNino: '',
    nivel: 'Primaria',
    grado: '1° Grado',
    nombreApoderado: '',
    telefono: '',
    email: '',
  });

  const handleLogout = () => {
    authContext?.logout();
  };

  const handleSubmitInscripcion = (e: React.FormEvent) => {
    e.preventDefault();
    setInscripcionEnviada(true);
  };

  const handleCerrarModal = () => {
    setModalInscripcionOpen(false);
    setInscripcionEnviada(false);
    setFormData({
      nombreNino: '',
      nivel: 'Primaria',
      grado: '1° Grado',
      nombreApoderado: '',
      telefono: '',
      email: '',
    });
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-800 font-sans selection:bg-rose-100 selection:text-rose-900">
      
      {/* ─────────────────────────────────────────────────────────────
          1. BANNER SUPERIOR DE CONTACTO (TELÉFONO + MENSAJE)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-[#111827] text-slate-300 text-[12px] font-medium py-2 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          
          {/* Lado izquierdo: Teléfono y WhatsApp */}
          <div className="flex items-center gap-6">
            <a
              href="tel:+51987654321"
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <Phone size={13} className="text-rose-500" />
              <span>Celular Admisión: <strong className="text-white font-bold">+51 987 654 321</strong></span>
            </a>
            <a
              href="mailto:contacto@sagradocorazon.edu.pe"
              className="hidden md:flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <Mail size={13} className="text-rose-500" />
              <span>contacto@sagradocorazon.edu.pe</span>
            </a>
          </div>

          {/* Lado derecho: Escribir mensaje y horario */}
          <div className="flex items-center gap-4 text-slate-400">
            <span className="hidden lg:inline-flex items-center gap-1">
              <Clock size={12} className="text-amber-400" />
              <span>Atención: Lun a Vie 8:00 AM - 4:30 PM</span>
            </span>
            <span className="hidden sm:inline text-slate-700">|</span>
            <button
              onClick={() => setModalInscripcionOpen(true)}
              className="flex items-center gap-1 text-rose-400 hover:text-rose-300 font-bold transition-colors cursor-pointer"
            >
              <MessageCircle size={13} />
              <span>Escríbenos para informes 2026</span>
            </button>
          </div>

        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. HEADER INSTITUCIONAL (Estructura de la Imagen)
      ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo: CORAULA - Colegio Sagrado Corazón */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-700 via-rose-600 to-rose-800 flex items-center justify-center text-white font-black text-2xl shadow-md shadow-rose-700/25 group-hover:scale-105 transition-transform">
              C
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-black tracking-tight text-slate-900">
                  COR<span className="text-rose-700">AULA</span>
                </span>
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
              </div>
              <p className="text-[10px] font-extrabold text-slate-500 tracking-wider uppercase">
                Colegio Sagrado Corazón
              </p>
            </div>
          </Link>

          {/* Menú de Navegación en el Centro (Navbar con "Ingresar a tu portal") */}
          <nav className="hidden lg:flex items-center gap-8 text-[13.5px] font-bold text-slate-700">
            <a href="#inicio" className="text-rose-700 hover:text-rose-800 transition-colors">
              Inicio
            </a>
            <a href="#sistema-clases" className="hover:text-rose-700 transition-colors flex items-center gap-1">
              <span>Sistema de Clases</span>
              <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 text-[10px] rounded-md font-extrabold">En Vivo</span>
            </a>
            <a href="#pilares" className="hover:text-rose-700 transition-colors">
              Propuesta Educativa
            </a>
            <a href="#niveles" className="hover:text-rose-700 transition-colors">
              Niveles
            </a>
            
            {/* Requerimiento explícito: "en el navbar este el ingresar a tu portal" */}
            <a
              href="#portales"
              className="inline-flex items-center gap-1.5 text-rose-700 font-extrabold bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3.5 py-1.5 rounded-xl transition-all"
            >
              <Users size={14} />
              <span>Ingresar a tu portal</span>
            </a>
          </nav>

          {/* Lado Derecho del Header: Botón "Inscribir a mi niño" */}
          <div className="hidden sm:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-2xl text-xs text-amber-900">
                <span>Sesión: <strong className="font-extrabold">{activeRole}</strong></span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1 font-bold text-rose-700 hover:text-rose-900 transition-colors cursor-pointer"
                  title="Cerrar sesión"
                >
                  <LogOut size={13} />
                  <span>Salir</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setModalInscripcionOpen(true)}
                className="px-6 py-2.5 rounded-xl border-2 border-slate-900 hover:bg-slate-900 hover:text-white text-slate-900 font-extrabold text-[13.5px] shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <span>Inscribir a mi niño</span>
                <ArrowRight size={15} />
              </button>
            )}
          </div>

          {/* Botón Menú Móvil */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-700 hover:text-rose-700"
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Menú Móvil Desplegable */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 px-6 py-5 flex flex-col gap-3 font-bold text-sm text-slate-700 shadow-lg">
            <a href="#inicio" onClick={() => setMobileMenuOpen(false)}>Inicio</a>
            <a href="#sistema-clases" onClick={() => setMobileMenuOpen(false)}>Sistema de Clases</a>
            <a href="#pilares" onClick={() => setMobileMenuOpen(false)}>Propuesta Educativa</a>
            <a href="#niveles" onClick={() => setMobileMenuOpen(false)}>Niveles</a>
            <a href="#portales" onClick={() => setMobileMenuOpen(false)} className="text-rose-700 font-black">
              Ingresar a tu portal →
            </a>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setModalInscripcionOpen(true);
              }}
              className="mt-3 py-3 bg-rose-700 text-white text-center rounded-xl font-extrabold shadow-sm"
            >
              Inscribir a mi niño
            </button>
          </div>
        )}
      </header>

      {/* ─────────────────────────────────────────────────────────────
          3. HERO SECTION (Estructura idéntica a la Imagen de Referencia)
      ───────────────────────────────────────────────────────────── */}
      <section id="inicio" className="relative overflow-hidden pt-8 pb-16 lg:pt-12 lg:pb-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* LADO IZQUIERDO: Título, Subtítulo y Botón */}
            <div className="lg:col-span-6 flex flex-col items-start text-left">
              
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-xs font-black tracking-wide mb-5">
                <School size={13} className="text-rose-700" />
                <span>Colegio Sagrado Corazón • Matrícula 2026</span>
              </div>

              {/* Título Principal con línea decorativa manuscrita como en la imagen */}
              <div className="relative mb-5">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight leading-[1.12]">
                  El aprendizaje <br />
                  de tu hijo, <br />
                  <span className="relative inline-block text-rose-700">
                    siempre en curso
                    {/* Trazo ondulado decorativo manuscrito en dorado / ámbar */}
                    <svg
                      className="absolute -bottom-2.5 left-0 w-full h-3 text-amber-500 fill-none stroke-current"
                      viewBox="0 0 200 12"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    >
                      <path d="M 5 6 C 50 1, 150 11, 195 4" />
                    </svg>
                  </span>
                </h1>
              </div>

              <p className="text-base sm:text-[17px] text-slate-600 font-medium leading-relaxed max-w-xl mb-8">
                Garantizamos una educación con valores, fe y rigor académico. Gracias a nuestra plataforma <strong>CORAULA</strong>, estudiantes, maestros y familias cuentan con un <strong>sistema de aprendizaje y visualización de clases en vivo</strong>, seguimiento de tareas y asistencia transparente.
              </p>

              {/* Botón CTA + Flecha decorativa doodle */}
              <div className="flex items-center gap-6 mb-12 relative w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setModalInscripcionOpen(true)}
                  className="px-8 py-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-base shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Inscribir a mi niño</span>
                  <ArrowRight size={18} />
                </button>

                {/* Flecha doodle dibujada (SVG) */}
                <div className="hidden sm:block text-emerald-600">
                  <svg width="60" height="40" viewBox="0 0 70 50" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M 5 35 Q 35 45 55 15" />
                    <path d="M 45 12 L 57 15 L 53 27" />
                  </svg>
                </div>
              </div>

              {/* Tarjetas flotantes inferiores de la columna izquierda (como en la imagen) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                
                {/* Tarjeta 1: Mejor Docente Certificado */}
                <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-2xl p-4 flex items-center gap-4 shadow-xs hover:shadow-md transition-shadow">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-rose-50">
                    <Image
                      src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80"
                      alt="Docente Acreditada"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] font-extrabold text-slate-500 block leading-tight">
                      Plana Docente Acreditada
                    </span>
                    <strong className="text-xl font-black text-rose-700 block">
                      +210
                    </strong>
                    <span className="text-[10px] font-semibold text-slate-400">
                      Profesores y tutores especialistas
                    </span>
                  </div>
                </div>

                {/* Tarjeta 2: Visualización de Clases y Aulas */}
                <a
                  href="#sistema-clases"
                  className="bg-[#F8FAFC] border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between shadow-xs hover:border-rose-400 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-emerald-50">
                      <Image
                        src="https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=300&q=80"
                        alt="Clases en vivo"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 leading-snug group-hover:text-rose-700 transition-colors">
                        Sistema de clases <br />y seguimiento en vivo
                      </p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:bg-rose-700 group-hover:text-white transition-colors">
                    <ArrowUpRight size={16} />
                  </div>
                </a>

              </div>

            </div>

            {/* LADO DERECHO: Composición con Estudiante y Pizarra Ilustrada (Estructura de la imagen) */}
            <div className="lg:col-span-6 relative flex justify-center items-center">
              
              {/* Contenedor principal estilo pizarra verde/teal con doodles de tiza */}
              <div className="relative w-full max-w-[480px] h-[520px] rounded-[40px] bg-gradient-to-br from-[#064E3B] to-[#042f24] p-6 shadow-2xl flex items-end justify-center overflow-hidden border-4 border-white">
                
                {/* Doodles estilo tiza de fondo */}
                <div className="absolute inset-0 opacity-20 pointer-events-none p-6 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-white">
                    <BookOpen size={40} />
                    <Sparkles size={32} />
                  </div>
                  <div className="flex justify-around items-center text-white">
                    <GraduationCap size={48} />
                    <Award size={36} />
                  </div>
                  <div className="flex justify-between items-center text-white">
                    <School size={40} />
                    <HeartHandshake size={36} />
                  </div>
                </div>

                {/* Destello de sol / luz en esquina */}
                <div className="absolute -top-12 -left-12 w-40 h-40 bg-amber-400/20 rounded-full blur-2xl" />

                {/* Imagen del estudiante sonriente con libros */}
                <div className="relative w-full h-[480px] z-10 flex items-end justify-center">
                  <Image
                    src="https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80"
                    alt="Estudiante del Sagrado Corazón aprendiendo con libros"
                    fill
                    priority
                    className="object-contain object-bottom drop-shadow-2xl"
                  />
                </div>

                {/* Badge flotante de acreditación */}
                <div className="absolute top-6 right-6 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200 shadow-xl flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
                    Clases 100% en Vivo
                  </span>
                </div>

              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. SECCIÓN ESPECIAL: SISTEMA DE APRENDIZAJE Y VISUALIZACIÓN DE CLASES
      ───────────────────────────────────────────────────────────── */}
      <section id="sistema-clases" className="py-20 bg-gradient-to-b from-white to-slate-50 border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-black text-rose-700 tracking-widest uppercase bg-rose-50 border border-rose-200 px-3.5 py-1.5 rounded-full inline-block mb-3">
              INNOVACIÓN PEDAGÓGICA CORAULA
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight mb-4">
              Sistema de Aprendizaje y Visualización de Clases
            </h2>
            <p className="text-slate-600 font-medium text-sm sm:text-base">
              Diseñado para que ningún estudiante pierda el hilo formativo y las familias acompañen el avance escolar desde cualquier dispositivo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-rose-300 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center mb-6 shadow-xs">
                <Video size={28} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-3">
                Visualización de Sesiones y Clases
              </h3>
              <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed font-medium mb-6">
                Acceso organizado a cada clase del día por área académica (Matemática, Comunicación, Ciencias, Inglés), con diapositivas, guías y grabaciones didácticas de apoyo.
              </p>
              <ul className="flex flex-col gap-2 text-xs font-bold text-slate-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span>Horario sincronizado en tiempo real</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span>Material descargable por bimestre</span>
                </li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-6 shadow-xs">
                <ShieldCheck size={28} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-3">
                Asistencia Biometrizada y Contingencia
              </h3>
              <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed font-medium mb-6">
                Registro biométrico instantáneo al entrar a clases. Si existe una eventualidad, el docente aplica el protocolo de contingencia con motivo justificado para tranquilidad familiar.
              </p>
              <ul className="flex flex-col gap-2 text-xs font-bold text-slate-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span>Notificación en vivo a los apoderados</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span>Módulo de justificación con archivo médico</span>
                </li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-amber-300 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-6 shadow-xs">
                <FileText size={28} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-3">
                Evaluaciones y Boletas Claras
              </h3>
              <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed font-medium mb-6">
                Criterios de evaluación transparentes por competencias. Los padres y alumnos conocen la ponderación, tareas entregadas y retroalimentación personalizada de los maestros.
              </p>
              <ul className="flex flex-col gap-2 text-xs font-bold text-slate-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span>Promedios bimestrales oficiales</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span>Reporte descargable en PDF</span>
                </li>
              </ul>
            </div>

          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. PILARES EDUCATIVOS (Íconos Circulares)
      ───────────────────────────────────────────────────────────── */}
      <section id="pilares" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          
          <span className="text-xs font-black text-rose-700 tracking-widest uppercase bg-rose-50 border border-rose-200 px-3.5 py-1.5 rounded-full inline-block mb-3">
            IDENTIDAD Y PROPUESTA SAGRADO CORAZÓN
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-4">
            Los pilares que guían la formación de cada estudiante
          </h2>
          <p className="text-slate-500 font-medium text-sm sm:text-base max-w-2xl mx-auto mb-14">
            Un modelo que equilibra el rigor académico, el desarrollo socioemocional y el compromiso ético y cristiano.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 sm:gap-8">
            {PILARES.map((pilar, idx) => {
              const IconComponent = pilar.icon;
              return (
                <div key={idx} className="flex flex-col items-center text-center group">
                  <div className={`w-20 h-20 rounded-full ${pilar.color} text-white flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300 mb-3`}>
                    <IconComponent size={30} />
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-900 mb-1 leading-snug">
                    {pilar.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    {pilar.desc}
                  </p>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. PORTALES DE ACCESO (Núcleo Institucional CORAULA)
      ───────────────────────────────────────────────────────────── */}
      <section id="portales" className="py-20 bg-slate-900 text-white relative overflow-hidden">
        
        {/* Adornos de fondo */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-700/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-black text-rose-400 tracking-widest uppercase bg-rose-950/80 border border-rose-800/80 px-3.5 py-1.5 rounded-full inline-block mb-3">
              ENTORNOS DIGITALES CORAULA
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4">
              Ingresa al Portal de tu Perfil
            </h2>
            <p className="text-slate-400 font-medium text-sm sm:text-base">
              Selecciona tu rol para acceder a tus clases, asistencias, notas y herramientas pedagógicas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {PORTALES.map((portal) => {
              const IconComponent = portal.icon;
              return (
                <div
                  key={portal.id}
                  className="bg-slate-800/90 rounded-3xl border border-slate-700 hover:border-rose-500 shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group"
                >
                  <div>
                    {/* Header Card */}
                    <div className={`${portal.headerBg} p-6 text-white relative overflow-hidden`}>
                      <div className="flex items-center justify-between mb-3 relative z-10">
                        <span className="text-[11px] font-black px-3 py-1 rounded-full bg-white text-slate-900 shadow-xs">
                          {portal.badge}
                        </span>
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                          <IconComponent size={20} />
                        </div>
                      </div>
                      <h3 className="text-xl font-black tracking-tight relative z-10">
                        {portal.title}
                      </h3>
                      <p className="text-xs text-slate-200 font-bold relative z-10">
                        {portal.role}
                      </p>
                    </div>

                    {/* Contenido Card */}
                    <div className="p-6">
                      <p className="text-xs sm:text-[13px] text-slate-300 font-medium leading-relaxed mb-4">
                        {portal.desc}
                      </p>
                    </div>
                  </div>

                  {/* Botón de Ingreso Directo */}
                  <div className="p-6 pt-0">
                    <Link
                      href={portal.path}
                      className={`w-full py-3 px-4 rounded-xl font-black text-xs sm:text-[13px] flex items-center justify-center gap-2 ${portal.btnBg} transition-all shadow-md active:scale-95 cursor-pointer`}
                    >
                      <span>Ingresar al Portal</span>
                      <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          7. NIVELES EDUCATIVOS (Inicial, Primaria, Secundaria)
      ───────────────────────────────────────────────────────────── */}
      <section id="niveles" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-black text-rose-700 tracking-widest uppercase bg-rose-50 border border-rose-200 px-3.5 py-1.5 rounded-full inline-block mb-3">
              PROPUESTA ACADÉMICA
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-4">
              Niveles Educativos del Sagrado Corazón
            </h2>
            <p className="text-slate-500 font-medium text-sm sm:text-base">
              Acompañamos cada etapa escolar con docentes acreditados y seguimiento digital en vivo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Inicial */}
            <div className="bg-[#FFFDF9] rounded-3xl p-8 border border-amber-200 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-black text-amber-700 uppercase tracking-wider">3 a 5 Años</span>
                  <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-black text-xs">01</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-3">Nivel Inicial</h3>
                <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed font-medium mb-6">
                  Descubrimiento, socialización afectiva, desarrollo psicomotriz y valores en aulas lúdicas equipadas.
                </p>
                <ul className="flex flex-col gap-2 mb-8 text-xs font-bold text-slate-700">
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Acompañamiento socioemocional</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Iniciación en inglés y arte</li>
                </ul>
              </div>
              <button
                onClick={() => {
                  setFormData({ ...formData, nivel: 'Inicial', grado: '3 Años' });
                  setModalInscripcionOpen(true);
                }}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs text-center shadow-xs cursor-pointer"
              >
                Inscribir a Inicial 2026
              </button>
            </div>

            {/* Primaria */}
            <div className="bg-rose-50/40 rounded-3xl p-8 border-2 border-rose-300 shadow-md hover:shadow-xl transition-all flex flex-col justify-between relative">
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-rose-700 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                Nivel Más Solicitado
              </span>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-black text-rose-700 uppercase tracking-wider">1° a 6° Grado</span>
                  <span className="w-8 h-8 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center font-black text-xs">02</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-3">Nivel Primaria</h3>
                <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed font-medium mb-6">
                  Consolidación de competencias en matemáticas, comunicación, ciencias, formación en la fe y robótica escolar.
                </p>
                <ul className="flex flex-col gap-2 mb-8 text-xs font-bold text-slate-700">
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Clases interactivas y aula virtual</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Asistencia biométrica al instante</li>
                </ul>
              </div>
              <button
                onClick={() => {
                  setFormData({ ...formData, nivel: 'Primaria', grado: '1° Grado' });
                  setModalInscripcionOpen(true);
                }}
                className="w-full py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-black text-xs text-center shadow-sm cursor-pointer"
              >
                Inscribir a Primaria 2026
              </button>
            </div>

            {/* Secundaria */}
            <div className="bg-[#FFFDF9] rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider">1° a 5° Año</span>
                  <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center font-black text-xs">03</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-3">Nivel Secundaria</h3>
                <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed font-medium mb-6">
                  Preparación preuniversitaria integral, liderazgo, laboratorios científicos, debate y orientación vocacional.
                </p>
                <ul className="flex flex-col gap-2 mb-8 text-xs font-bold text-slate-700">
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Alto nivel académico pre-U</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Certificaciones y valores de vida</li>
                </ul>
              </div>
              <button
                onClick={() => {
                  setFormData({ ...formData, nivel: 'Secundaria', grado: '1° Año' });
                  setModalInscripcionOpen(true);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs text-center shadow-xs cursor-pointer"
              >
                Inscribir a Secundaria 2026
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          8. FOOTER INSTITUCIONAL
      ───────────────────────────────────────────────────────────── */}
      <footer className="bg-[#0F172A] text-slate-400 pt-16 pb-12 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
            
            {/* Col 1 */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-700 text-white font-black text-lg flex items-center justify-center shadow-md">
                  C
                </div>
                <div>
                  <span className="text-xl font-black text-white tracking-tight">CORAULA</span>
                  <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Sagrado Corazón</p>
                </div>
              </div>
              <p className="text-slate-400 leading-relaxed font-normal mt-2">
                Ecosistema pedagógico escolar del Colegio Sagrado Corazón. Formando en fe, valores y excelencia para toda la vida.
              </p>
            </div>

            {/* Col 2 */}
            <div className="flex flex-col gap-2.5">
              <span className="font-black text-white text-sm mb-1 uppercase tracking-wider">Enlaces Rápidos</span>
              <a href="#inicio" className="hover:text-rose-400 transition-colors">Inicio</a>
              <a href="#sistema-clases" className="hover:text-rose-400 transition-colors">Sistema de Clases</a>
              <a href="#pilares" className="hover:text-rose-400 transition-colors">Propuesta Educativa</a>
              <a href="#niveles" className="hover:text-rose-400 transition-colors">Niveles Escolares</a>
              <button onClick={() => setModalInscripcionOpen(true)} className="text-left text-amber-400 font-bold hover:underline cursor-pointer">
                Inscribir a mi niño
              </button>
            </div>

            {/* Col 3 */}
            <div className="flex flex-col gap-2.5">
              <span className="font-black text-white text-sm mb-1 uppercase tracking-wider">Portales de Acceso</span>
              <Link href="/alumno" className="hover:text-rose-400 transition-colors">Portal Estudiantes</Link>
              <Link href="/padre" className="hover:text-rose-400 transition-colors">Portal Familias y Apoderados</Link>
              <Link href="/docente/login" className="hover:text-rose-400 transition-colors">Portal Docente</Link>
              <Link href="/login/security/administrador" className="hover:text-rose-400 transition-colors">Gestión Escolar y Dirección</Link>
            </div>

            {/* Col 4 */}
            <div className="flex flex-col gap-2.5">
              <span className="font-black text-white text-sm mb-1 uppercase tracking-wider">Contacto Directo</span>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-rose-500 shrink-0" />
                <span>Admisión: +51 987 654 321 / (01) 480-2345</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-rose-500 shrink-0" />
                <span>contacto@sagradocorazon.edu.pe</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-rose-500 shrink-0" />
                <span>Av. Primavera 1234, Lima - Perú</span>
              </div>
            </div>

          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <p>© 2026 CORAULA • Colegio Sagrado Corazón. Todos los derechos reservados.</p>
            <p className="text-slate-500">Sistema Educativo Integrado • Versión Oficial 2026</p>
          </div>
        </div>
      </footer>

      {/* ─────────────────────────────────────────────────────────────
          9. MODAL INTERACTIVO: "INSCRIBIR A MI NIÑO"
      ───────────────────────────────────────────────────────────── */}
      {modalInscripcionOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Botón cerrar */}
            <button
              onClick={handleCerrarModal}
              className="absolute right-5 top-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            {!inscripcionEnviada ? (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
                    <School size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                      Inscripción y Admisión 2026
                    </h3>
                    <p className="text-xs font-semibold text-slate-500">
                      Colegio Sagrado Corazón • Plataforma CORAULA
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                  Completa los datos de tu niño(a) para recibir el plan curricular, costos de matrícula y la programación de visita guiada al colegio.
                </p>

                <form onSubmit={handleSubmitInscripcion} className="flex flex-col gap-3.5">
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">
                      Nombre completo del estudiante <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Mateo García Flores"
                      value={formData.nombreNino}
                      onChange={(e) => setFormData({ ...formData, nombreNino: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:border-rose-600 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1 block">
                        Nivel Escolar <span className="text-rose-600">*</span>
                      </label>
                      <select
                        value={formData.nivel}
                        onChange={(e) => setFormData({ ...formData, nivel: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:border-rose-600 focus:outline-none bg-white"
                      >
                        <option value="Inicial">Nivel Inicial</option>
                        <option value="Primaria">Nivel Primaria</option>
                        <option value="Secundaria">Nivel Secundaria</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1 block">
                        Grado / Edad <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. 1° Primaria / 4 años"
                        value={formData.grado}
                        onChange={(e) => setFormData({ ...formData, grado: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:border-rose-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">
                      Nombre del Padre o Apoderado <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Carmen Flores Mendoza"
                      value={formData.nombreApoderado}
                      onChange={(e) => setFormData({ ...formData, nombreApoderado: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:border-rose-600 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1 block">
                        Celular / WhatsApp <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="987 654 321"
                        value={formData.telefono}
                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:border-rose-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1 block">
                        Correo Electrónico <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="familia@correo.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:border-rose-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="mt-3 w-full py-3 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-black text-xs sm:text-sm tracking-wide shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Send size={15} />
                    <span>Enviar Solicitud de Inscripción 2026</span>
                  </button>
                </form>
              </div>
            ) : (
              <div className="text-center py-6 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">¡Solicitud Registrada!</h3>
                <p className="text-xs text-slate-600 max-w-sm mb-6 leading-relaxed">
                  Gracias por tu interés en el <strong>Colegio Sagrado Corazón</strong>. Hemos enviado la ficha de información al correo <strong>{formData.email}</strong> y nos contactaremos al <strong>{formData.telefono}</strong>.
                </p>
                <button
                  onClick={handleCerrarModal}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-black text-xs hover:bg-slate-800 cursor-pointer"
                >
                  Entendido, volver a la página
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
