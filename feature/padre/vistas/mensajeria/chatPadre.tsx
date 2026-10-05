'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Search01Icon, 
  SentIcon, 
  Attachment01Icon, 
  MoreVerticalIcon, 
  CheckmarkCircle01Icon,
  BookOpen01Icon
} from 'hugeicons-react';
import { ContactoChat, MensajeChat } from '@/types/chat';

// Extendemos el tipo para incluir profesor específico
interface ChatCurso extends ContactoChat {
  profesor: string;
}

const MOCK_CURSOS_CHAT: ChatCurso[] = [
  {
    id: 'chat-mat',
    nombre: 'Matemáticas',
    profesor: 'Prof. Luis Vega',
    rol: 'Docente',
    online: true,
    ultimoMensaje: 'Recuerden que la tarea 4 es para mañana.',
    ultimaHora: '10:30 AM',
    noLeidos: 2,
    mensajes: [
      {
        id: 'm-1', remitenteId: 'prof-1', remitenteNombre: 'Luis Vega', esMio: false,
        texto: 'Estimados padres, adjunto los ejercicios de práctica.', hora: '10:00 AM', leido: true
      },
      {
        id: 'm-2', remitenteId: 'padre', remitenteNombre: 'Usted', esMio: true,
        texto: 'Gracias profesor. ¿Mi hijo entregó la tarea 3?', hora: '10:15 AM', leido: true
      },
      {
        id: 'm-3', remitenteId: 'prof-1', remitenteNombre: 'Luis Vega', esMio: false,
        texto: 'Sí, la entregó a tiempo. Recuerden que la tarea 4 es para mañana.', hora: '10:30 AM', leido: true
      }
    ]
  },
  {
    id: 'chat-com',
    nombre: 'Comunicación',
    profesor: 'Prof. Ana Soto',
    rol: 'Docente',
    online: false,
    ultimoMensaje: 'Perfecto, nos vemos en la reunión.',
    ultimaHora: 'Ayer',
    noLeidos: 0,
    mensajes: [
      {
        id: 'm-1', remitenteId: 'prof-2', remitenteNombre: 'Ana Soto', esMio: false,
        texto: 'Habrá una pequeña reunión por Zoom el viernes.', hora: '14:00 PM', leido: true
      },
      {
        id: 'm-2', remitenteId: 'padre', remitenteNombre: 'Usted', esMio: true,
        texto: 'Perfecto, nos vemos en la reunión.', hora: '15:20 PM', leido: true
      }
    ]
  },
  {
    id: 'chat-cie',
    nombre: 'Ciencias Naturales',
    profesor: 'Prof. Carla Ruiz',
    rol: 'Docente',
    online: true,
    ultimoMensaje: 'Por favor, enviar la maqueta el lunes.',
    ultimaHora: '11:00 AM',
    noLeidos: 1,
    mensajes: [
      {
        id: 'm-1', remitenteId: 'prof-3', remitenteNombre: 'Carla Ruiz', esMio: false,
        texto: 'Por favor, enviar la maqueta el lunes.', hora: '11:00 AM', leido: true
      }
    ]
  }
];

export function ChatPadre() {
  const [chats, setChats] = useState<ChatCurso[]>(MOCK_CURSOS_CHAT);
  const [chatActivoId, setChatActivoId] = useState<string>(MOCK_CURSOS_CHAT[0].id);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [nuevoTexto, setNuevoTexto] = useState<string>('');

  const chatContainerRef = useRef<HTMLDivElement>(null);

  const chatSeleccionado = chats.find(c => c.id === chatActivoId) || chats[0];

  // Auto-scroll al final de la conversación
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatActivoId, chats]);

  // Filtrado simple por nombre del curso o profesor
  const filteredChats = chats.filter(c => 
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.profesor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEnviarMensaje = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoTexto.trim()) return;

    const horaActual = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true });

    const nuevoMsg: MensajeChat = {
      id: `m-${Date.now()}`,
      remitenteId: 'padre',
      remitenteNombre: 'Usted',
      esMio: true,
      texto: nuevoTexto,
      hora: horaActual,
      leido: true
    };

    setChats(prev => prev.map(c => {
      if (c.id === chatActivoId) {
        return {
          ...c,
          ultimoMensaje: nuevoTexto,
          ultimaHora: horaActual,
          mensajes: [...c.mensajes, nuevoMsg]
        };
      }
      return c;
    }));

    setNuevoTexto('');
  };

  return (
    <div className="w-full h-full flex flex-col font-sans overflow-hidden animate-in fade-in">
      
      {/* CONTENEDOR ESTILO WHATSAPP WEB */}
      <div className="w-full flex-1 bg-white rounded-2xl border border-line shadow-sm overflow-hidden flex flex-col md:flex-row">
        
        {/* COLUMNA IZQUIERDA: LISTA DE CURSOS */}
        <div className="w-full md:w-[320px] lg:w-[350px] border-r border-line flex flex-col shrink-0 bg-white">
          
          {/* Header Lista */}
          <div className="p-4 border-b border-line bg-neutral/30 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-ink leading-tight uppercase tracking-wider">Docentes a Cargo</h2>
              <p className="text-[10px] font-bold text-muted mt-0.5">Comunicación directa</p>
            </div>
          </div>

          {/* Buscador de Cursos */}
          <div className="p-3 border-b border-line flex flex-col gap-2 bg-white">
            <div className="flex items-center gap-2 bg-neutral/60 border border-line/60 rounded-xl px-3 py-2">
              <Search01Icon size={16} className="text-muted shrink-0" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por curso o profesor..."
                className="w-full bg-transparent text-[11px] font-bold text-ink outline-none placeholder:text-muted/70"
              />
            </div>
          </div>

          {/* Lista de Chats (Cursos) */}
          <div className="flex-1 overflow-y-auto divide-y divide-line/40">
            {filteredChats.length > 0 ? filteredChats.map(chat => {
              const isSelected = chat.id === chatActivoId;

              return (
                <div
                  key={chat.id}
                  onClick={() => {
                    setChatActivoId(chat.id);
                    // Marcar leídos
                    setChats(prev => prev.map(c => c.id === chat.id ? { ...c, noLeidos: 0 } : c));
                  }}
                  className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${
                    isSelected ? 'bg-accent/10 border-l-4 border-l-accent' : 'hover:bg-neutral/40 border-l-4 border-l-transparent'
                  }`}
                >
                  {/* Icono del Curso con Estado Online */}
                  <div className="relative shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${isSelected ? 'bg-accent text-white border-accent' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                      <BookOpen01Icon size={18} />
                    </div>
                    {chat.online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className={`text-[11px] font-black truncate ${isSelected ? 'text-accent' : 'text-ink'}`}>{chat.nombre}</h3>
                      <span className="text-[9px] text-muted font-bold shrink-0 ml-1">{chat.ultimaHora}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className={`text-[10px] truncate ${isSelected ? 'font-bold text-ink' : 'font-medium text-muted'}`}>{chat.ultimoMensaje}</p>
                      {chat.noLeidos && chat.noLeidos > 0 ? (
                        <span className="w-4 h-4 rounded-full bg-accent text-white text-[9px] font-black flex items-center justify-center shrink-0 ml-1.5">
                          {chat.noLeidos}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="p-6 text-center text-[11px] font-bold text-muted">
                No se encontraron cursos o profesores que coincidan con la búsqueda.
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: VENTANA DE CONVERSACIÓN */}
        <div className="flex-1 flex flex-col bg-[#efeae2]/20 relative">
          
          {/* Header Chat Activo */}
          <div className="p-3.5 px-6 bg-white border-b border-line flex items-center justify-between shrink-0 shadow-xs z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center shadow-sm">
                <BookOpen01Icon size={18} />
              </div>
              <div>
                <h3 className="text-xs font-black text-ink uppercase tracking-wider">{chatSeleccionado.nombre}</h3>
                <p className="text-[10px] font-bold text-muted flex items-center gap-1.5 mt-0.5">
                  <span className="text-ink">{chatSeleccionado.profesor}</span>
                  • {chatSeleccionado.online ? <span className="text-emerald-500">En línea</span> : 'Desconectado'}
                </p>
              </div>
            </div>

            <button className="text-muted hover:text-ink transition-colors p-1.5 rounded-lg hover:bg-neutral">
              <MoreVerticalIcon size={18} />
            </button>
          </div>

          {/* Área de Mensajes */}
          <div 
            ref={chatContainerRef}
            className="flex-1 p-4 md:p-6 overflow-y-auto flex flex-col gap-3"
          >
            <div className="flex justify-center mb-4">
              <span className="bg-white border border-line px-3 py-1 rounded-full text-[9px] font-bold text-muted shadow-sm">
                Hoy
              </span>
            </div>

            {chatSeleccionado.mensajes.map((msg) => (
              <div 
                key={msg.id}
                className={`flex flex-col max-w-[85%] md:max-w-[70%] rounded-2xl p-3 shadow-sm ${
                  msg.esMio 
                    ? 'self-end bg-accent text-white rounded-br-sm' 
                    : 'self-start bg-white text-ink border border-line rounded-bl-sm'
                }`}
              >
                {!msg.esMio && (
                  <span className="text-[9px] font-black uppercase tracking-wider text-accent mb-1">{msg.remitenteNombre}</span>
                )}
                <p className={`text-[11px] font-medium leading-relaxed break-words ${msg.esMio ? 'text-white/95' : 'text-ink/90'}`}>{msg.texto}</p>
                
                <div className={`flex items-center justify-end gap-1 mt-1.5 text-[8px] font-bold ${msg.esMio ? 'text-white/70' : 'text-muted'}`}>
                  <span>{msg.hora}</span>
                  {msg.esMio && <CheckmarkCircle01Icon size={12} className={msg.leido ? 'text-[#38bdf8]' : 'text-white/50'} />}
                </div>
              </div>
            ))}
          </div>

          {/* Caja de Entrada de Mensaje */}
          <form 
            onSubmit={handleEnviarMensaje}
            className="p-3 md:p-4 bg-white border-t border-line flex items-center gap-3 shrink-0"
          >
            <button 
              type="button"
              className="text-muted hover:text-accent transition-colors p-2 rounded-xl hover:bg-neutral cursor-pointer"
            >
              <Attachment01Icon size={20} />
            </button>

            <input 
              type="text" 
              value={nuevoTexto}
              onChange={(e) => setNuevoTexto(e.target.value)}
              placeholder="Escribe un mensaje al profesor..."
              className="flex-1 bg-neutral border border-line rounded-xl px-4 py-2.5 text-[11px] font-bold text-ink outline-none focus:border-accent transition-colors placeholder:text-muted/70"
            />

            <button 
              type="submit"
              disabled={!nuevoTexto.trim()}
              className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center hover:bg-accent/90 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-sm shrink-0 cursor-pointer"
            >
              <SentIcon size={16} />
            </button>
          </form>

        </div>

      </div>
    </div>
  );
}
