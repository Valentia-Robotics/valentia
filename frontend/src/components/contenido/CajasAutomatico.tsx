import { Caja } from "@/components/admin/Caja";
import {
  DatosAVerificar,
  FuenteDelGuion,
  TablaEscenas,
  TextoRedes,
  type Automatico,
} from "./DatosAutomaticos";

/**
 * Todo lo que trae un guion de n8n, igual para el admin y para el editor:
 * datos a verificar (arriba, bien visibles), noticia de origen, escenas y texto para redes.
 */
export function CajasAutomatico({ automatico }: { automatico: Automatico }) {
  return (
    <>
      <DatosAVerificar datos={automatico.datosAVerificar} />
      <Caja titulo="Noticia de origen">
        <FuenteDelGuion automatico={automatico} />
      </Caja>
      <Caja titulo="Escenas" sinRelleno>
        <TablaEscenas escenas={automatico.escenas} />
      </Caja>
      {(automatico.descripcionRedes || automatico.hashtags.length > 0) && (
        <Caja titulo="Para publicar en redes">
          <TextoRedes automatico={automatico} />
        </Caja>
      )}
    </>
  );
}
