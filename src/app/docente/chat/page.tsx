import VistaChatDocente from '../../../../feature/docente/vistas/chat/vistaChatDocente';
import { AvisoModuloSimulado } from '@/components/ui/AvisoModuloSimulado';

export default function DocenteChatPage() {
  return (
    <>
      <AvisoModuloSimulado />
      <VistaChatDocente />
    </>
  );
}
