import VistaChatDocente from '../../../../feature/docente/vistas/chat/vistaChatDocente';
import { AvisoModuloSimulado } from '@/components/ui/AvisoModuloSimulado';

export default function DocenteChatPage() {
  return (
    <>
      {/* La mensajería aún no tiene backend: siempre usa datos de demostración (#121). */}
      <AvisoModuloSimulado activo={true} detalle="la mensajería no está conectada; los contactos y mensajes son de demostración." />
      <VistaChatDocente />
    </>
  );
}
