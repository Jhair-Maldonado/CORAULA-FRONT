// feature/docente/vistas/chat/vistaChatDocente.tsx
'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  Search,
  Paperclip,
  Send,
  User,
  Users,
  CheckCheck,
  Smile,
  MoreVertical,
  Phone,
  Video
} from 'lucide-react';
import { getDocenteChats, enviarMensajeDocenteChat } from '@/lib/api';
import { ChatContactoDocente, MensajeDocenteItem } from '@/types/docentes';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';

export default function VistaChatDocente() {
  const [activeTab, setActiveTab] = useState<'alumnos' | 'padres'>('alumnos');
  const [contactos, setContactos] = useState<ChatContactoDocente[]>([]);
  const [selectedContacto, setSelectedContacto] = useState<ChatContactoDocente | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mensajeTexto, setMensajeTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchChats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getDocenteChats(activeTab);
      setContactos(res);
      if (res.length > 0) {
        setSelectedContacto(res[0]);
      } else {
        setSelectedContacto(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Error al cargar mensajes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, [activeTab]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedContacto?.mensajes]);

  const handleEnviarMensaje = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensajeTexto.trim() || !selectedContacto || enviando) return;

    const texto = mensajeTexto.trim();
    setMensajeTexto('');

    // Optimistic update
    const nuevoMensaje: MensajeDocenteItem = {
      id: `msg-${Date.now()}`,
      remitente: 'docente',
      texto,
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setSelectedContacto((prev) =>
      prev
        ? {
            ...prev,
            ultimoMensaje: texto,
            hora: nuevoMensaje.hora,
            mensajes: [...prev.mensajes, nuevoMensaje]
          }
        : null
    );

    try {
      setEnviando(true);
      await enviarMensajeDocenteChat(selectedContacto.id, texto);
    } catch (err) {
      console.error('Error al enviar mensaje:', err);
    } finally {
      setEnviando(false);
    }
  };

  const contactosFiltrados = contactos.filter((c) =>
    c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.subtitulo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && contactos.length === 0) {
    return (
      <div className="h-[750px] bg-white rounded-2xl border border-[#E5E7EB] p-6">
        <CardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="No pudimos cargar los mensajes"
        message={error}
        onRetry={fetchChats}
      />
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xs overflow-hidden flex flex-col md:flex-row h-[calc(100vh-140px)] min-h-[580px]">
      {/* PANEL IZQUIERDO: CONTACTOS & BUSCADOR (Frame AVY9a Contacts Subsidebar) */}
      <aside className="w-full md:w-80 lg:w-96 border-r border-[#E5E7EB] flex flex-col shrink-0 bg-[#FAFBFD]">
        {/* Search Bar */}
        <div className="p-3.5 border-b border-[#E5E7EB] bg-white">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]"
            />
            <input
              type="text"
              placeholder="Buscar estudiante o apoderado..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#F3F4F6] border border-transparent focus:border-[#BE123C] focus:bg-white rounded-lg text-xs text-[#111827] focus:outline-hidden transition-all"
            />
          </div>
        </div>

        {/* Tabs Alumnos / Padres (Frame AVY9a Tabs Container) */}
        <div className="flex border-b border-[#E5E7EB] bg-white p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('alumnos')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'alumnos'
                ? 'bg-[#BE123C] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#111827] hover:bg-[#F3F4F6]'
            }`}
          >
            <User size={14} />
            <span>Alumnos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('padres')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'padres'
                ? 'bg-[#BE123C] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#111827] hover:bg-[#F3F4F6]'
            }`}
          >
            <Users size={14} />
            <span>Padres</span>
          </button>
        </div>

        {/* Lista de Chats (Frame AVY9a Chat List) */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#E5E7EB]/60 custom-scrollbar">
          {contactosFiltrados.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#64748B]">
              No se encontraron contactos en esta sección.
            </div>
          ) : (
            contactosFiltrados.map((contacto) => {
              const isSelected = selectedContacto?.id === contacto.id;

              return (
                <button
                  key={contacto.id}
                  type="button"
                  onClick={() => setSelectedContacto(contacto)}
                  className={`w-full p-3.5 flex items-center gap-3 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-l-4 border-l-[#BE123C] shadow-2xs'
                      : 'hover:bg-white/80'
                  }`}
                >
                  {/* Avatar con indicador en línea */}
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-[#FFE4E6] text-[#BE123C] font-extrabold text-xs flex items-center justify-center border border-[#BE123C]/20">
                      {contacto.avatar}
                    </div>
                    {contacto.enLinea && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
                    )}
                  </div>

                  {/* Info del chat */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-[#111827] truncate">
                        {contacto.nombre}
                      </span>
                      <span className="text-[10px] text-[#64748B] shrink-0 font-medium">
                        {contacto.hora}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#64748B] truncate mt-0.5">
                      {contacto.ultimoMensaje}
                    </p>
                  </div>

                  {/* Badge no leídos (Unread Badge en cary.pen) */}
                  {contacto.noLeidos > 0 && (
                    <span className="w-4 h-4 bg-[#BE123C] text-white text-[9px] font-bold rounded-full flex items-center justify-center shrink-0">
                      {contacto.noLeidos}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* PANEL DERECHO: CONVERSACIÓN ACTIVA (Frame AVY9a Conversation Area) */}
      <section className="flex-1 flex flex-col bg-white">
        {selectedContacto ? (
          <>
            {/* Header de conversación */}
            <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-[#FFE4E6] text-[#BE123C] font-extrabold text-xs flex items-center justify-center border border-[#BE123C]/20">
                    {selectedContacto.avatar}
                  </div>
                  {selectedContacto.enLinea && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-[#111827]">
                    {selectedContacto.nombre}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#64748B]">
                      {selectedContacto.subtitulo}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold">
                      {selectedContacto.enLinea ? '• En línea' : '• Desconectado'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[#64748B]">
                <button
                  type="button"
                  className="p-2 hover:bg-[#F3F4F6] rounded-lg transition-colors cursor-pointer"
                  title="Llamada de voz"
                >
                  <Phone size={17} />
                </button>
                <button
                  type="button"
                  className="p-2 hover:bg-[#F3F4F6] rounded-lg transition-colors cursor-pointer"
                  title="Videollamada"
                >
                  <Video size={17} />
                </button>
              </div>
            </div>

            {/* Mensajes Area (Frame AVY9a Messages Area) */}
            <div className="flex-1 p-5 overflow-y-auto space-y-3.5 bg-[#F9FAFB] custom-scrollbar">
              <div className="flex justify-center">
                <span className="text-[10px] font-bold text-[#64748B] bg-[#E5E7EB]/60 px-3 py-1 rounded-full uppercase tracking-wider">
                  Hoy
                </span>
              </div>

              {selectedContacto.mensajes.map((msg) => {
                const esDocente = msg.remitente === 'docente';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      esDocente ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-xs shadow-2xs leading-relaxed ${
                        esDocente
                          ? 'bg-[#BE123C] text-white rounded-tr-none'
                          : 'bg-white text-[#111827] border border-[#E5E7EB] rounded-tl-none'
                      }`}
                    >
                      <p>{msg.texto}</p>
                    </div>

                    <span className="text-[10px] text-[#94A3B8] mt-1 px-1 flex items-center gap-1 font-medium">
                      {msg.hora}
                      {esDocente && <CheckCheck size={12} className="text-[#BE123C]" />}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Container (Frame AVY9a Input Container) */}
            <form
              onSubmit={handleEnviarMensaje}
              className="p-3.5 border-t border-[#E5E7EB] bg-white flex items-center gap-2 shrink-0"
            >
              <button
                type="button"
                className="p-2 text-[#64748B] hover:text-[#111827] hover:bg-[#F3F4F6] rounded-lg transition-colors cursor-pointer"
                title="Adjuntar archivo o guía"
              >
                <Paperclip size={18} />
              </button>

              <input
                type="text"
                placeholder="Escribe tu mensaje..."
                value={mensajeTexto}
                onChange={(e) => setMensajeTexto(e.target.value)}
                className="flex-1 px-4 py-2.5 text-xs bg-[#F3F4F6] border border-transparent focus:border-[#BE123C] focus:bg-white rounded-xl focus:outline-hidden transition-all text-[#111827]"
              />

              <button
                type="submit"
                disabled={!mensajeTexto.trim() || enviando}
                className="p-2.5 bg-[#BE123C] hover:bg-rose-800 text-white rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                title="Enviar mensaje"
              >
                <Send size={16} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#64748B]">
            <p className="text-sm font-semibold">Selecciona un chat para comenzar la conversación</p>
          </div>
        )}
      </section>
    </div>
  );
}
