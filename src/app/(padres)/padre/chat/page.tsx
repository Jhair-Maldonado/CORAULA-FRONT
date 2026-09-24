// src/app/(padres)/padre/chat/page.tsx
'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { getChatContactos, enviarMensajeChat } from '@/services/padres/padreService';
import { ContactoChat } from '@/types/chat';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  CardSkeleton,
  EmptyState,
  ErrorState,
} from '@/components/ui';
import {
  Comment01Icon,
  SentIcon,
  Search01Icon,
  CheckmarkCircle02Icon,
  ArrowLeft01Icon,
} from 'hugeicons-react';

export default function PadreChatPage() {
  const [contactos, setContactos] = useState<ContactoChat[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getChatContactos();
      setContactos(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
      }
    } catch (err) {
      console.error('Error cargando chat:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar las conversaciones');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    const run = async () => {
      await fetchData();
    };
    run();
  }, [fetchData]);

  const selectedContacto = contactos.find((c) => c.id === selectedId) || contactos[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedContacto?.mensajes]);

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoMensaje.trim() || !selectedContacto) return;

    const texto = nuevoMensaje;
    setNuevoMensaje('');
    setEnviando(true);

    try {
      await enviarMensajeChat(selectedContacto.id, texto);
      // Actualizar vista local
      setContactos((prev) =>
        prev.map((c) => {
          if (c.id === selectedContacto.id) {
            return {
              ...c,
              ultimoMensaje: texto,
              ultimaHora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              mensajes: [
                ...c.mensajes,
                {
                  id: `msg-${Date.now()}`,
                  remitenteId: 'padre-001',
                  remitenteNombre: 'Roberto Fernández',
                  esMio: true,
                  texto,
                  hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  leido: false,
                },
              ],
            };
          }
          return c;
        })
      );
    } catch (err) {
      console.error('Error enviando mensaje:', err);
    } finally {
      setEnviando(false);
    }
  };

  const contactosFiltrados = contactos.filter((c) =>
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
        <CardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <ErrorState
          title="No pudimos cargar la mensajería"
          message={error}
          onRetry={fetchData}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#BE123C] bg-[#FFE4E6] px-2.5 py-1 rounded-full inline-block mb-1">
          COMUNICACIÓN DIRECTA CON EL COLEGIO
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-[#111827] tracking-tight">
          Mensajería con Tutores y Docentes
        </h1>
        <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
          Canal directo para coordinar temas pedagógicos, justificaciones y consultas académicas.
        </p>
      </div>

      {/* Main Chat Box */}
      <div className="bg-white rounded-3xl border border-[#E5E7EB] shadow-xs overflow-hidden flex flex-col md:flex-row h-[680px]">
        {/* Contact List (Left Sidebar) */}
        <div className="w-full md:w-80 border-r border-[#E5E7EB] flex flex-col bg-slate-50/50">
          <div className="p-4 border-b border-[#E5E7EB] space-y-3">
            <h4 className="text-sm font-bold text-[#111827] flex items-center justify-between">
              <span>Docentes Asignados</span>
              <span className="text-xs font-semibold text-[#6B7280]">
                {contactos.length} contactos
              </span>
            </h4>
            <div className="relative">
              <Search01Icon size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar profesor o materia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white text-xs border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#BE123C]/20 focus:border-[#BE123C]"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {contactosFiltrados.length === 0 ? (
              <p className="p-6 text-xs text-center text-[#6B7280]">
                No se encontraron contactos.
              </p>
            ) : (
              contactosFiltrados.map((c) => {
                const isSelected = c.id === selectedContacto?.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`p-4 flex items-center gap-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-rose-50/80 border-l-4 border-l-[#BE123C]'
                        : 'hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="relative w-11 h-11 rounded-full overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
                      {c.avatar ? (
                        <Image src={c.avatar} alt={c.nombre} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-slate-600">
                          {c.nombre.charAt(0)}
                        </div>
                      )}
                      {c.online && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#15803D] rounded-full ring-2 ring-white" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <h5 className="text-xs font-bold text-[#111827] truncate">{c.nombre}</h5>
                        <span className="text-[10px] text-slate-400 shrink-0">{c.ultimaHora}</span>
                      </div>
                      <p className="text-[11px] text-[#6B7280] truncate leading-tight">
                        {c.ultimoMensaje}
                      </p>
                    </div>

                    {c.noLeidos ? (
                      <span className="w-5 h-5 rounded-full bg-[#BE123C] text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                        {c.noLeidos}
                      </span>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Conversation View (Right) */}
        {selectedContacto ? (
          <div className="flex-1 flex flex-col justify-between bg-white h-full">
            {/* Header */}
            <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between bg-slate-50/30">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-200 shrink-0">
                  {selectedContacto.avatar ? (
                    <Image
                      src={selectedContacto.avatar}
                      alt={selectedContacto.nombre}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-slate-600">
                      {selectedContacto.nombre.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#111827]">
                    {selectedContacto.nombre}
                  </h4>
                  <p className="text-[11px] text-[#6B7280] flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        selectedContacto.online ? 'bg-[#15803D]' : 'bg-slate-300'
                      }`}
                    />
                    {selectedContacto.online ? 'En línea' : 'Desconectado'}
                  </p>
                </div>
              </div>

              <Badge variant="accent" size="sm">
                Canal Oficial
              </Badge>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/40">
              <div className="text-center my-2">
                <span className="px-3 py-1 bg-slate-200/80 rounded-full text-[10px] font-bold text-slate-600">
                  Hoy
                </span>
              </div>

              {selectedContacto.mensajes.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.esMio ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[78%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                      msg.esMio
                        ? 'bg-[#BE123C] text-white rounded-br-none'
                        : 'bg-white text-[#111827] border border-[#E5E7EB] rounded-bl-none'
                    }`}
                  >
                    <p>{msg.texto}</p>
                    <div
                      className={`text-[10px] mt-1 text-right flex items-center justify-end gap-1 ${
                        msg.esMio ? 'text-rose-200' : 'text-slate-400'
                      }`}
                    >
                      <span>{msg.hora}</span>
                      {msg.esMio && <span>✓✓</span>}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={handleEnviar}
              className="p-3.5 border-t border-[#E5E7EB] bg-white flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Escriba un mensaje formal al docente..."
                value={nuevoMensaje}
                onChange={(e) => setNuevoMensaje(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-xs sm:text-sm text-[#111827] border border-transparent rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BE123C]/20 focus:border-[#BE123C] transition-all"
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={!nuevoMensaje.trim() || enviando}
                rightIcon={<SentIcon size={16} />}
              >
                Enviar
              </Button>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <EmptyState
              title="Seleccione una conversación"
              description="Seleccione a un docente o tutor de la lista para iniciar la conversación."
            />
          </div>
        )}
      </div>
    </div>
  );
}
