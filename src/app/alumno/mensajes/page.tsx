// src/app/alumno/mensajes/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { getMensajesDocentesAlumno, enviarMensajeDocenteAlumno } from '@/lib/api';
import { ContactoDocenteAlumno } from '@/types/alumno';
import { AlumnoHeader } from '@/components/alumno/AlumnoHeader';
import { AlumnoFilterBar } from '@/components/alumno/AlumnoFilterBar';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { Search, Send, CheckCircle2 } from 'lucide-react';

export default function AlumnoMensajesPage() {
  const [contactos, setContactos] = useState<ContactoDocenteAlumno[]>([]);
  const [selectedContactoId, setSelectedContactoId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getMensajesDocentesAlumno();
      setContactos(res);
      if (res.length > 0 && !selectedContactoId) {
        setSelectedContactoId(res[0].id);
      }
    } catch (err: any) {
      setError(err?.message || 'Error al cargar los mensajes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoMensaje.trim() || !selectedContactoId || enviando) return;

    try {
      setEnviando(true);
      await enviarMensajeDocenteAlumno(selectedContactoId, nuevoMensaje.trim());
      setNuevoMensaje('');
      // Refresh local contact list
      const res = await getMensajesDocentesAlumno();
      setContactos(res);
    } catch (err) {
      console.error(err);
    } finally {
      setEnviando(false);
    }
  };

  if (loading && contactos.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <CardSkeleton />
            <div className="mt-2"><CardSkeleton /></div>
          </div>
          <div className="lg:col-span-8">
            <CardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (error && contactos.length === 0) {
    return (
      <ErrorState
        title="No pudimos cargar tus mensajes"
        message={error}
        onRetry={fetchData}
      />
    );
  }

  const selectedContacto = contactos.find((c) => c.id === selectedContactoId) || contactos[0];

  const filteredContactos = contactos.filter(
    (c) =>
      c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.curso.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <AlumnoHeader
        eyebrow="Canal Institucional"
        title="Mensajes y Consultas Académicas"
        subtitle="Comunicación directa y supervisada con tus docentes tutores"
      />

      {/* Filter Bar */}
      <AlumnoFilterBar
        filters={[
          { label: 'Bandeja', value: 'Docentes Asignados ▾' },
          { label: 'Estado', value: 'Mensajes Activos ▾' }
        ]}
        badgeText="3 mensajes nuevos"
        badgeVariant="accent"
      />

      {/* Chat Layout: Contacts List Left + Active Conversation Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Contacts Column (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-xs flex flex-col gap-3">
          {/* Search Box */}
          <div className="flex items-center gap-2 bg-[#F3F4F6] rounded-lg px-3 py-2 text-xs text-[#6B7280]">
            <Search className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
            <input
              type="text"
              placeholder="Buscar docente o tutor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent outline-none w-full text-xs text-[#111827] placeholder:text-[#6B7280]"
            />
          </div>

          {/* Contacts List */}
          <div className="flex flex-col gap-1.5 max-h-[500px] overflow-y-auto">
            {filteredContactos.map((c) => {
              const isSelected = c.id === selectedContactoId;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedContactoId(c.id)}
                  className={`w-full text-left p-3 rounded-lg transition-all cursor-pointer flex flex-col gap-1 ${
                    isSelected
                      ? 'bg-[#FFE4E6] text-[#BE123C]'
                      : 'bg-white hover:bg-slate-50 border border-transparent hover:border-[#E5E7EB]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[13px] font-bold ${
                        isSelected ? 'text-[#BE123C]' : 'text-[#111827]'
                      }`}
                    >
                      {c.nombre}
                    </span>
                    <span className="text-[10px] text-[#6B7280]">
                      {c.horaUltimoMensaje}
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-semibold ${
                      isSelected ? 'text-[#BE123C]' : 'text-[#6B7280]'
                    }`}
                  >
                    {c.curso} {c.esTutor && '· Tutor'}
                  </span>
                  <p className="text-[11px] text-[#6B7280] line-clamp-1">
                    {c.ultimoMensaje}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Active Conversation (8 cols) */}
        {selectedContacto ? (
          <div className="lg:col-span-8 bg-white rounded-xl border border-[#E5E7EB] p-5 sm:p-6 shadow-xs flex flex-col gap-4">
            {/* Chat Top Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div>
                <h3 className="text-sm font-bold text-[#111827] flex items-center gap-2">
                  {selectedContacto.nombre} - {selectedContacto.curso}
                </h3>
                <span className="text-[11px] text-[#15803D] flex items-center gap-1 font-medium mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-[#15803D]" />
                  {selectedContacto.estado} · {selectedContacto.ubicacion}
                </span>
              </div>
              {selectedContacto.esTutor && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFE4E6] text-[#BE123C]">
                  Docente Tutor
                </span>
              )}
            </div>

            {/* Messages Thread Container */}
            <div className="flex flex-col gap-3 min-h-[340px] max-h-[420px] overflow-y-auto pr-1">
              {selectedContacto.mensajes.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[85%] sm:max-w-[75%] p-3 rounded-xl text-xs ${
                    msg.esPropio
                      ? 'ml-auto bg-[#FFE4E6] text-[#111827] rounded-br-none'
                      : 'mr-auto bg-[#F3F4F6] text-[#111827] rounded-bl-none'
                  }`}
                >
                  <p className="leading-relaxed">{msg.contenido}</p>
                  <span
                    className={`text-[9px] mt-1 self-end ${
                      msg.esPropio ? 'text-[#BE123C]' : 'text-[#6B7280]'
                    }`}
                  >
                    {msg.hora}
                  </span>
                </div>
              ))}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={handleEnviar}
              className="flex items-center gap-2 pt-3 border-t border-[#E5E7EB]"
            >
              <input
                type="text"
                value={nuevoMensaje}
                onChange={(e) => setNuevoMensaje(e.target.value)}
                placeholder="Escribe tu consulta académica al docente tutor..."
                className="flex-1 bg-[#F3F4F6] border-none rounded-lg px-3.5 py-2.5 text-xs text-[#111827] placeholder:text-[#6B7280] outline-none focus:ring-1 focus:ring-[#BE123C]/30"
              />
              <button
                type="submit"
                disabled={!nuevoMensaje.trim() || enviando}
                className="px-4 py-2.5 rounded-lg bg-[#BE123C] hover:bg-[#9F1239] disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>Enviar</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}
