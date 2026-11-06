/**
 * PREGUNTAS FRECUENTES (/preguntas-frecuentes)
 * Para cambiar una respuesta o añadir una pregunta, edita esta lista.
 * Los datos de envío y devoluciones salen de src/config/tienda.ts (así no se quedan desfasados).
 */
import { tienda } from "@/config/tienda";
import { formatearPrecio } from "@/lib/utils";

export interface Pregunta {
  pregunta: string;
  /** Párrafos de la respuesta (texto normal) */
  respuesta: string[];
  /** Enlace al final de la respuesta, si ayuda */
  enlace?: { href: string; texto: string };
}

export interface GrupoPreguntas {
  titulo: string;
  preguntas: Pregunta[];
}

const { envio } = tienda;
const provincias = envio.provincias.map((p) => p.nombre);
const listaProvincias = `${provincias.slice(0, -1).join(", ")} y ${provincias.at(-1)}`;

export function preguntasFrecuentes({
  compraAbierta,
}: {
  compraAbierta: boolean;
}): GrupoPreguntas[] {
  return [
    {
      titulo: "Antes de comprar",
      preguntas: [
        {
          pregunta: "¿Hace falta saber programar?",
          respuesta: [
            "No. El curso empieza desde cero: la primera lección consiste en hacer que se encienda una luz de la placa, y a partir de ahí vas sumando cosas poco a poco.",
            "Cada lección tiene su vídeo y el código explicado línea a línea. Si te atascas en un reto, puedes ver pistas y, al final, la solución.",
          ],
        },
        {
          pregunta: "¿Para qué edad son?",
          respuesta: [
            "En la ficha de cada kit pone la edad recomendada y el nivel. Los de nivel principiante los puede hacer solo un chaval de unos 10 años; más pequeños, mejor con un adulto al lado.",
            "Y no hay edad máxima: hay muchos adultos que se compran uno porque siempre habían querido entender cómo funciona un robot.",
          ],
          enlace: { href: "/kits", texto: "Ver los kits" },
        },
        {
          pregunta: "¿Hay que soldar?",
          respuesta: [
            "No. Es plug & play: las piezas se enchufan, encajan entre sí o se unen con imanes. No hace falta soldar ni herramientas especiales. Si algo queda mal, se suelta y se vuelve a probar.",
          ],
        },
        {
          pregunta: "¿Qué necesito además del kit?",
          respuesta: [
            "Un ordenador (Windows, Mac o Linux) para programar la placa. El programa que se usa, Arduino, es gratuito y en el curso te enseñamos a instalarlo paso a paso. El cable USB para conectar la placa al ordenador va en la caja.",
            "El coche y el brazo funcionan con 4 pilas AA, y ya vienen en la caja. La estación meteorológica no necesita pilas: va conectada por USB.",
          ],
        },
        {
          pregunta: "¿Qué trae la caja?",
          respuesta: [
            "Todas las piezas para montar el robot y una tarjeta con un código QR para desbloquear el curso. En la ficha de cada kit tienes la lista completa de piezas.",
          ],
        },
        {
          pregunta: "¿Puedo montar un robot a mi manera?",
          respuesta: [
            "Sí, en el configurador puedes elegir las piezas una a una (o partir de un kit y cambiar lo que quieras). Te avisa si algo no es compatible.",
            "Eso sí: los robots personalizados no llevan curso. El curso va solo con los kits cerrados, porque está hecho para esas piezas exactas.",
          ],
          enlace: { href: "/configurador", texto: "Ir al configurador" },
        },
      ],
    },
    {
      titulo: "Pedidos y envíos",
      preguntas: [
        ...(compraAbierta
          ? []
          : [
              {
                pregunta: "¿Cuándo se podrá comprar?",
                respuesta: [
                  "Muy pronto. Estamos terminando de preparar las primeras cajas. Si nos dejas tu email en la portada o en la ficha de un kit, te escribimos el día que abramos (solo ese correo).",
                ],
              },
            ]),
        {
          pregunta: "¿A dónde enviáis?",
          respuesta: [
            `De momento solo a la ${envio.nombreZona} (${listaProvincias}). Queremos llegar a toda España, pero preferimos empezar cerca y hacerlo bien.`,
          ],
        },
        {
          pregunta: "¿Cuánto cuesta el envío y cuánto tarda?",
          respuesta: [
            `${formatearPrecio(envio.costeCentimos)}, y gratis en pedidos de ${formatearPrecio(envio.gratisDesdeCentimos)} o más. Suele llegar en ${envio.plazo}. Cuando sale de nuestro almacén te mandamos un correo con el número de seguimiento.`,
          ],
        },
        {
          pregunta: "¿Puedo devolverlo?",
          respuesta: [
            `Sí, tienes ${tienda.diasDesistimiento} días desde que lo recibes para devolverlo sin dar explicaciones. Te contamos cómo en la página de devoluciones.`,
          ],
          enlace: { href: "/legal/devoluciones", texto: "Devoluciones" },
        },
        {
          pregunta: "Me ha llegado una pieza rota o falta algo. ¿Qué hago?",
          respuesta: [
            "Escríbenos con una foto de lo que ha pasado y lo solucionamos lo antes posible.",
          ],
        },
      ],
    },
    {
      titulo: "El curso",
      preguntas: [
        {
          pregunta: "¿Cómo activo el curso?",
          respuesta: [
            "Escanea con el móvil el QR de la tarjeta que viene en la caja. Te pedirá entrar en tu cuenta (o crear una, es un minuto) y el curso aparece en «Mis cursos».",
            "Si no puedes escanearlo, escribe el código de la tarjeta en la página de activar.",
          ],
          enlace: { href: "/activar", texto: "Activar un código" },
        },
        {
          pregunta: "¿Puedo hacer el curso en el móvil?",
          respuesta: [
            "Puedes ver los vídeos y las explicaciones en el móvil o la tablet, pero para programar el robot necesitas el ordenador. Lo más cómodo es tener el curso abierto en el móvil mientras programas en el ordenador.",
          ],
        },
        {
          pregunta: "¿El curso caduca?",
          respuesta: [
            "No. Una vez activado se queda en tu cuenta para siempre, y puedes repetir las lecciones todas las veces que quieras.",
          ],
        },
        {
          pregunta: "¿Pueden hacerlo dos hermanos con el mismo kit?",
          respuesta: [
            "Cada código se activa en una sola cuenta. Lo más fácil es hacerlo juntos desde esa cuenta: el progreso se guarda ahí.",
          ],
        },
        {
          pregunta: "¿Hay diploma al terminar?",
          respuesta: [
            "Sí. Cuando completas todas las lecciones puedes descargar un diploma con tu nombre (o el de quien lo haya hecho) para guardarlo o imprimirlo.",
          ],
        },
      ],
    },
  ];
}
