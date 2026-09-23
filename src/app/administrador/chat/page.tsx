'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Search01Icon, 
  SentIcon, 
  Attachment01Icon, 
  MoreVerticalIcon, 
  CheckmarkCircle01Icon,
  UserCircleIcon,
  CircleIcon,
  FilterIcon,
  Add01Icon,
  FingerPrintIcon,
  Cancel01Icon
} from 'hugeicons-react';
import { MOCK_CONTACTOS_CHAT } from '@/data/mockChat';
import { ContactoChat, MensajeChat } from '@/types/chat';

export default function ChatPage() {
  const [contactos, setContactos] = useState<ContactoChat[]>(MOCK_CONTACTOS_CHAT);
  const [contactoActivoId, setContactoActivoId] = useState<string>(MOCK_CONTACTOS_CHAT[0].id);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filtroRol, setFiltroRol] = useState<string>('Todos');
  const [nuevoTexto, setNuevoTexto] = useState<string>('');

  // Estado del Modal de Escaneo de Huella Dactilar
  const [showModalHuella, setShowModalHuella] = useState<boolean>(false);
  const [escaneando, setEscaneando] = useState<boolean>(false);
  const [alumnoEncontrado, setAlumnoEncontrado] = useState<{ alumno: string; tutor: string } | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  const contactoSeleccionado = contactos.find(c => c.id === contactoActivoId) || contactos[0];

  // Auto-scroll al final de la conversación
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [contactoActivoId, contactos]);

  const filteredContactos = contactos.filter(c => {
    const matchesSearch = c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.ultimoMensaje.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRol = filtroRol === 'Todos' || c.rol === filtroRol;
    return matchesSearch && matchesRol;
  });

  // Simulación del escáner biológico de huella
  const handleEscanearHuella = () => {
    setEscaneando(true);
    setAlumnoEncontrado(null);

    setTimeout(() => {
      setEscaneando(false);
      // Simula coincidencia con la huella del estudiante Mateo Sánchez
      setAlumnoEncontrado({
        alumno: 'Mateo Sánchez Flores (1° Sec - A)',
        tutor: 'Elena Beatriz Peralta (Apoderada / Tutor Legal)'
      });

      // Después de 1.5s redirige y abre el chat del tutor
      setTimeout(() => {
        setShowModalHuella(false);
        setAlumnoEncontrado(null);
        setContactoActivoId('c-2'); // Abre el chat de Elena Beatriz Peralta (Tutor)
      }, 1500);
    }, 2000);
  };

  const handleEnviarMensaje = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoTexto.trim()) return;

    const horaActual = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true });

    const nuevoMsg: MensajeChat = {
      id: `m-${Date.now()}`,
      remitenteId: 'admin',
      remitenteNombre: 'Administrador',
      esMio: true,
      texto: nuevoTexto,
      hora: horaActual,
      leido: true
    };

    setContactos(prev => prev.map(c => {
      if (c.id === contactoActivoId) {
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
    <div className="w-full h-full p-4 md:p-6 bg-canvas flex flex-col font-sans overflow-hidden">
      
      {/* CONTENEDOR ESTILO WHATSAPP WEB */}
      <div className="max-w-7xl mx-auto w-full flex-1 bg-white rounded-2xl border border-line shadow-sm overflow-hidden flex flex-col md:flex-row">
        
        {/* COLUMNA IZQUIERDA: LISTA DE CHATS */}
        <div className="w-full md:w-[340px] lg:w-[380px] border-r border-line flex flex-col shrink-0 bg-white">
          
          {/* Header Lista con Botón Nuevo Chat */}
          <div className="p-4 border-b border-line bg-neutral/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-accent text-white font-bold text-xs flex items-center justify-center">
                AD
              </div>
              <div>
                <h2 className="text-sm font-bold text-ink leading-tight">Chat Institucional</h2>
                <p className="text-[10px] font-bold text-muted">Mensajería interna</p>
              </div>
            </div>

            {/* BOTÓN NUEVO CHAT BIOMÉTRICO */}
            <button 
              onClick={() => setShowModalHuella(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-white font-bold text-xs hover:bg-accent/90 transition-all shadow-xs cursor-pointer"
            >
              <Add01Icon size={14} />
              <span>Nuevo Chat</span>
            </button>
          </div>

          {/* Buscador y Filtros */}
          <div className="p-3 border-b border-line/60 flex flex-col gap-2 bg-white">
            <div className="flex items-center gap-2 bg-neutral/60 border border-line/60 rounded-xl px-3 py-1.5">
              <Search01Icon size={16} className="text-muted shrink-0" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar o empezar un nuevo chat..."
                className="w-full bg-transparent text-xs font-medium text-ink outline-none placeholder:text-muted"
              />
            </div>

            {/* Chips de Rol */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5">
              {['Todos', 'Docente', 'Padre', 'Alumno'].map(rol => (
                <button
                  key={rol}
                  onClick={() => setFiltroRol(rol)}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                    filtroRol === rol
                      ? 'bg-accent text-white shadow-xs'
                      : 'bg-neutral text-muted hover:bg-neutral/80'
                  }`}
                >
                  {rol}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Mensajes */}
          <div className="flex-1 overflow-y-auto divide-y divide-line/40">
            {filteredContactos.map(contacto => {
              const isSelected = contacto.id === contactoActivoId;
              const iniciales = contacto.nombre.split(' ').map(n => n.charAt(0)).slice(0, 2).join('');

              return (
                <div
                  key={contacto.id}
                  onClick={() => {
                    setContactoActivoId(contacto.id);
                    // Marcar leídos
                    setContactos(prev => prev.map(c => c.id === contacto.id ? { ...c, noLeidos: 0 } : c));
                  }}
                  className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${
                    isSelected ? 'bg-accent/10 border-l-4 border-l-accent' : 'hover:bg-neutral/40'
                  }`}
                >
                  {/* Avatar con Estado Online */}
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full bg-accent-soft text-accent font-bold text-xs flex items-center justify-center border border-accent/20">
                      {iniciales}
                    </div>
                    {contacto.online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className="text-xs font-bold text-ink truncate">{contacto.nombre}</h3>
                      <span className="text-[10px] text-muted font-medium shrink-0 ml-1">{contacto.ultimaHora}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-muted truncate font-medium">{contacto.ultimoMensaje}</p>
                      {contacto.noLeidos && contacto.noLeidos > 0 ? (
                        <span className="w-4 h-4 rounded-full bg-accent text-white text-[9px] font-bold flex items-center justify-center shrink-0 ml-1.5">
                          {contacto.noLeidos}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUMNA DERECHA: VENTANA DE CONVERSACIÓN (STYLE WHATSAPP) */}
        <div className="flex-1 flex flex-col bg-[#efeae2]/30 relative">
          
          {/* Header Chat Activo */}
          <div className="p-3.5 px-6 bg-white border-b border-line flex items-center justify-between shrink-0 shadow-xs z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent-soft text-accent font-bold text-xs flex items-center justify-center border border-accent/20">
                {contactoSeleccionado.nombre.split(' ').map(n => n.charAt(0)).slice(0, 2).join('')}
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink leading-tight">{contactoSeleccionado.nombre}</h3>
                <span className="text-[10px] font-bold text-muted flex items-center gap-1.5">
                  <span className="bg-accent/10 text-accent px-1.5 py-0.2 rounded font-bold">{contactoSeleccionado.rol}</span>
                  • {contactoSeleccionado.online ? 'En línea' : 'Desconectado'}
                </span>
              </div>
            </div>

            <button className="text-muted hover:text-ink transition-colors p-1.5 rounded-lg hover:bg-neutral">
              <MoreVerticalIcon size={18} />
            </button>
          </div>

          {/* Área de Mensajes con Fondo Patrón */}
          <div 
            ref={chatContainerRef}
            className="flex-1 p-4 md:p-6 overflow-y-auto flex flex-col gap-3"
          >
            {contactoSeleccionado.mensajes.map((msg) => (
              <div 
                key={msg.id}
                className={`flex flex-col max-w-[80%] md:max-w-[65%] rounded-2xl p-3 shadow-xs ${
                  msg.esMio 
                    ? 'self-end bg-accent text-white rounded-br-none' 
                    : 'self-start bg-white text-ink rounded-bl-none border border-line/60'
                }`}
              >
                {!msg.esMio && (
                  <span className="text-[10px] font-bold text-accent mb-1">{msg.remitenteNombre}</span>
                )}
                <p className="text-xs font-medium leading-relaxed break-words">{msg.texto}</p>
                
                <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${msg.esMio ? 'text-white/80' : 'text-muted'}`}>
                  <span>{msg.hora}</span>
                  {msg.esMio && <CheckmarkCircle01Icon size={12} className="text-white" />}
                </div>
              </div>
            ))}
          </div>

          {/* Caja de Entrada de Mensaje (Footer WhatsApp) */}
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
              placeholder="Escribe un mensaje..."
              className="flex-1 bg-neutral/50 border border-line rounded-xl px-4 py-2.5 text-xs font-medium text-ink outline-none focus:border-accent transition-colors"
            />

            <button 
              type="submit"
              disabled={!nuevoTexto.trim()}
              className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center hover:bg-accent/90 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-sm shrink-0 cursor-pointer"
            >
              <SentIcon size={18} />
            </button>
          </form>

        </div>

      </div>

      {/* MODAL BIOMÉTRICO: ESCANEO DE HUELLA DACTILAR */}
      {showModalHuella && (
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-line p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center gap-4 relative animate-fade-in">
            
            <button 
              onClick={() => {
                setShowModalHuella(false);
                setEscaneando(false);
                setAlumnoEncontrado(null);
              }}
              className="absolute top-4 right-4 text-muted hover:text-ink transition-colors p-1"
            >
              <Cancel01Icon size={18} />
            </button>

            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-accent uppercase tracking-widest">VERIFICACIÓN BIOMÉTRICA</span>
              <h3 className="text-base font-bold text-ink mt-0.5">Escanear Huella del Alumno</h3>
              <p className="text-xs text-muted font-medium mt-1 max-w-[240px]">
                Coloca la huella dactilar del alumno en el lector biológico para abrir el chat del apoderado.
              </p>
            </div>

            {/* SENSOR HUELLA Y ANIMACIÓN */}
            <div 
              onClick={handleEscanearHuella}
              className={`w-28 h-28 rounded-3xl border-2 flex flex-col items-center justify-center relative cursor-pointer transition-all ${
                escaneando 
                  ? 'border-accent bg-accent/5 shadow-lg shadow-accent/20 scale-105' 
                  : alumnoEncontrado 
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                  : 'border-dashed border-line bg-neutral/40 hover:border-accent hover:bg-neutral/80'
              }`}
            >
              <FingerPrintIcon 
                size={56} 
                className={`transition-colors ${
                  escaneando 
                    ? 'text-accent animate-pulse' 
                    : alumnoEncontrado 
                    ? 'text-emerald-600' 
                    : 'text-muted/60 group-hover:text-accent'
                }`} 
              />

              {/* Láser de Escaneo en progreso */}
              {escaneando && (
                <div className="absolute inset-x-0 h-1 bg-accent shadow-[0_0_12px_#BE123C] animate-bounce" />
              )}
            </div>

            {/* ESTADO DE RESULTADOS */}
            {escaneando && (
              <div className="flex items-center gap-2 text-xs font-bold text-accent">
                <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span>Leyendo huella digital...</span>
              </div>
            )}

            {!escaneando && !alumnoEncontrado && (
              <button
                onClick={handleEscanearHuella}
                className="w-full py-2.5 rounded-xl bg-accent text-white font-bold text-xs hover:bg-accent/90 transition-all shadow-xs cursor-pointer"
              >
                Simular Pulsación de Huella
              </button>
            )}

            {alumnoEncontrado && (
              <div className="w-full p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex flex-col gap-1 text-left animate-fade-in">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                  <CheckmarkCircle01Icon size={16} /> Huella Reconocida
                </div>
                <p className="text-[11px] font-bold text-ink mt-0.5">{alumnoEncontrado.alumno}</p>
                <p className="text-[10px] text-emerald-800 font-medium">Tutor vinculado: <span className="font-bold">{alumnoEncontrado.tutor}</span></p>
                <span className="text-[9px] font-bold text-emerald-600 mt-1 italic">Abriendo conversación con el apoderado...</span>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
