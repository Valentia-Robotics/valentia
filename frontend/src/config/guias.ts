/**
 * GUÍAS (/guias): artículos para aprender, con lo que la gente busca en Google antes de comprar
 * un kit («Arduino o ESP32», «cómo funciona un robot seguidor de líneas»…).
 *
 * Para añadir una guía: copia un bloque, cambia el slug (será la dirección /guias/<slug>) y escribe.
 * - En los párrafos y listas, [texto](/ruta) se convierte en un enlace.
 * - `kits` y `componentes` (slugs) salen al final como «Para ponerlo en práctica».
 * - Al cambiar el texto, pon la fecha de hoy en `actualizada` (Google la tiene en cuenta).
 */

export interface SeccionGuia {
  titulo: string;
  parrafos: string[];
  lista?: string[];
}

export interface Guia {
  slug: string;
  /** Título de la página (h1) */
  titulo: string;
  /** Título para Google y la pestaña, si debe ser distinto del h1 */
  tituloSeo?: string;
  /** Descripción para Google y para el listado (una o dos frases) */
  descripcion: string;
  /** Fechas en formato AAAA-MM-DD */
  publicada: string;
  actualizada: string;
  /** Minutos de lectura (aproximados) */
  minutos: number;
  /** Primer párrafo, más grande */
  entradilla: string;
  secciones: SeccionGuia[];
  kits: string[];
  componentes: string[];
}

export const guias: Guia[] = [
  {
    slug: "como-elegir-un-kit-de-robotica",
    titulo: "Cómo elegir un kit de robótica para empezar",
    tituloSeo: "Cómo elegir un kit de robótica para niños y principiantes",
    descripcion:
      "Qué mirar antes de comprar un primer kit de robótica: edad, placa, si hay que soldar, qué trae la caja y cómo se aprende a programarlo.",
    publicada: "2026-10-30",
    actualizada: "2026-10-30",
    minutos: 6,
    entradilla:
      "Hay cientos de kits de robótica y casi todos prometen lo mismo. La diferencia está en los detalles: si el robot llega a funcionar de verdad, si alguien te explica qué estás haciendo y si después puedes seguir creando cosas tú solo.",
    secciones: [
      {
        titulo: "Primero: ¿para quién es?",
        parrafos: [
          "La edad importa menos de lo que parece. Lo que cuenta es la paciencia para seguir pasos y las ganas de entender. A partir de unos 10 años se puede montar un coche robot sencillo con algo de ayuda; desde los 12, un brazo robótico, que exige más precisión al ajustar las piezas.",
          "Si es para un adulto que nunca ha programado, sirven los mismos kits. Empezar por algo que se mueve (un coche) suele enganchar más que empezar por algo que solo mide (una estación meteorológica).",
        ],
      },
      {
        titulo: "La placa: Arduino o ESP32",
        parrafos: [
          "La placa es el cerebro del robot: ahí se carga el programa. Las dos más usadas para aprender son Arduino UNO y ESP32. Las dos son buenas opciones, y lo que aprendas con una te sirve para la otra.",
          "Arduino UNO funciona a 5 V, es muy resistente y casi todos los tutoriales del mundo están hechos con ella. ESP32 es más potente y trae wifi y Bluetooth, ideal para proyectos que envían datos al móvil. Lo explicamos con calma en [Arduino o ESP32: cuál elegir](/guias/arduino-o-esp32).",
        ],
      },
      {
        titulo: "Sin soldar, mejor",
        parrafos: [
          "Para un primer kit, que no haya que soldar es casi obligatorio. Las piezas deben unirse con tornillos, conectores o una protoboard (una placa con agujeros donde los cables se clavan a presión). Así, si te equivocas, solo hay que cambiar un cable de sitio.",
        ],
      },
      {
        titulo: "Qué debería traer la caja",
        parrafos: [
          "Lo más frustrante es abrir la caja y descubrir que falta algo para empezar. Antes de comprar, comprueba que incluye:",
        ],
        lista: [
          "La placa y el cable USB para conectarla al ordenador.",
          "Las pilas o la batería (y no solo el portapilas vacío).",
          "Todos los cables, tornillos y piezas de montaje.",
          "Instrucciones claras, mejor en vídeo que en un folleto de letra pequeña.",
        ],
      },
      {
        titulo: "Lo importante: aprender a programarlo",
        parrafos: [
          "Un kit sin explicaciones se queda en un juguete que se monta una vez. Con un curso que explique cada línea de código, el robot se convierte en la puerta de entrada a la programación y la electrónica.",
          "Busca que el curso vaya paso a paso: primero encender un LED, después mover un motor, luego leer un sensor y, al final, juntarlo todo. Cada paso debería terminar con algo que funciona, porque eso es lo que da ganas de seguir.",
        ],
      },
      {
        titulo: "¿Y después del primer robot?",
        parrafos: [
          "Un buen kit usa piezas estándar (sensores de ultrasonidos, servos, motores con reductora) que se pueden reutilizar en otros proyectos. Así, cuando termines, puedes añadir piezas sueltas y crear algo nuevo. En nuestro [configurador](/configurador) puedes montar un robot pieza a pieza y te avisa si algo no es compatible.",
        ],
      },
    ],
    kits: ["vr1-starter-kit", "brazo-robotico", "estacion-meteorologica"],
    componentes: [],
  },
  {
    slug: "arduino-o-esp32",
    titulo: "Arduino o ESP32: cuál elegir para tu primer proyecto",
    descripcion:
      "Diferencias entre Arduino UNO y ESP32 explicadas sin tecnicismos: potencia, voltaje, wifi, precio y para qué proyectos conviene cada una.",
    publicada: "2026-10-30",
    actualizada: "2026-11-08",
    minutos: 5,
    entradilla:
      "Arduino UNO y ESP32 son las dos placas más populares para aprender electrónica y programación. Se programan casi igual, con el mismo programa (el IDE de Arduino), pero no son iguales. Esta es la diferencia que de verdad importa.",
    secciones: [
      {
        titulo: "Arduino UNO: la clásica",
        parrafos: [
          "La Arduino UNO lleva un microcontrolador ATmega328P a 16 MHz. Es poco potente comparada con un móvil, pero de sobra para mover motores, leer sensores y encender luces. Su gran ventaja es que funciona a 5 V, igual que la mayoría de módulos para principiantes, así que casi todo se conecta directamente.",
          "Es robusta, aguanta bastante bien los errores de conexión y tiene la mayor cantidad de ejemplos y tutoriales de internet. Por eso la usamos en el [brazo robótico](/kits/brazo-robotico).",
        ],
      },
      {
        titulo: "ESP32: más potencia y wifi",
        parrafos: [
          "La ESP32 tiene dos núcleos a 240 MHz, mucha más memoria y, sobre todo, wifi y Bluetooth integrados. Con ella puedes ver los datos de un sensor en el móvil o controlar algo desde casa sin cables.",
          "La diferencia que hay que tener en cuenta es que trabaja a 3,3 V. La mayoría de sensores modernos lo aceptan, pero algunos módulos antiguos de 5 V necesitan un adaptador. Es la placa de nuestro [coche robótico multifunción VR1](/kits/vr1-starter-kit), que gracias al Bluetooth se puede conectar con el móvil, y de nuestra [estación meteorológica](/kits/estacion-meteorologica), que lee temperatura, humedad, presión y luz.",
        ],
      },
      {
        titulo: "Comparadas en una lista",
        parrafos: [],
        lista: [
          "Voltaje de las señales: Arduino UNO 5 V; ESP32 3,3 V.",
          "Velocidad: Arduino UNO 16 MHz; ESP32 hasta 240 MHz con dos núcleos.",
          "Conexión: Arduino UNO, solo por cable; ESP32, wifi y Bluetooth.",
          "Ejemplos en internet: muchísimos en las dos, algo más para Arduino UNO.",
          "Precio: la ESP32 suele ser más barata, aunque es más potente.",
        ],
      },
      {
        titulo: "Entonces, ¿cuál?",
        parrafos: [
          "Si tu proyecto lleva motores y sensores clásicos (un coche, un brazo, una alarma), Arduino UNO es la opción más cómoda para empezar. Si quieres que tu proyecto se conecte a internet o al móvil, o vas a medir cosas y guardar datos, elige ESP32.",
          "Y no te preocupes por equivocarte: el lenguaje es el mismo, así que lo que aprendas con una placa te sirve para la otra. Puedes ver las dos en [componentes](/componentes).",
        ],
      },
    ],
    kits: ["vr1-starter-kit", "estacion-meteorologica"],
    componentes: ["arduino-uno-r3", "esp32-devkit"],
  },
  {
    slug: "como-funciona-un-robot-seguidor-de-lineas",
    titulo: "Cómo funciona un robot seguidor de líneas",
    descripcion:
      "Qué piezas lleva un coche seguidor de líneas, cómo detecta la línea negra con sensores infrarrojos y cómo decide hacia dónde girar.",
    publicada: "2026-10-30",
    actualizada: "2026-11-08",
    minutos: 6,
    entradilla:
      "Un robot seguidor de líneas es un pequeño coche que recorre un camino dibujado en el suelo, normalmente una línea negra sobre fondo blanco. Es el proyecto clásico para empezar en robótica porque junta todo lo básico: sensores, motores y un programa que toma decisiones.",
    secciones: [
      {
        titulo: "Las piezas",
        parrafos: ["Casi todos los seguidores de líneas se parecen por dentro:"],
        lista: [
          "Un chasis con dos ruedas motrices y una rueda loca delante o detrás.",
          "Dos motores de corriente continua con reductora (los típicos motores amarillos).",
          "Un driver de motores, como el L298N, porque la placa no puede dar la corriente que piden los motores.",
          "Dos o más sensores de línea infrarrojos, como el TCRT5000, mirando al suelo.",
          "Una placa, como Arduino UNO o ESP32, que lee los sensores y manda a los motores.",
          "Pilas o batería para que funcione sin cables.",
        ],
      },
      {
        titulo: "Cómo «ve» la línea",
        parrafos: [
          "Cada sensor de línea tiene un LED infrarrojo (luz que no vemos) y un receptor justo al lado. El LED ilumina el suelo y el receptor mide cuánta luz rebota. Una superficie blanca refleja mucha luz; una negra la absorbe casi toda.",
          "Así, el sensor dice a la placa algo muy sencillo: «estoy sobre blanco» o «estoy sobre negro». Con dos sensores, uno a cada lado de la línea, el robot sabe si va centrado o si se está saliendo por un lado.",
        ],
      },
      {
        titulo: "Cómo decide hacia dónde ir",
        parrafos: ["El programa repite estas preguntas muchas veces por segundo:"],
        lista: [
          "Si los dos sensores ven blanco, la línea está en medio: sigue recto.",
          "Si el sensor izquierdo ve negro, la línea se ha ido hacia la izquierda: gira a la izquierda frenando la rueda izquierda.",
          "Si el sensor derecho ve negro, gira a la derecha.",
          "Si los dos ven negro, ha llegado a un cruce o al final: para o decide qué hacer.",
        ],
      },
      {
        titulo: "Por qué hace falta un driver de motores",
        parrafos: [
          "Los pines de una placa Arduino solo dan unos pocos miliamperios, pensados para señales y LED. Un motor necesita cientos. El driver hace de intermediario: recibe las órdenes de la placa y deja pasar la corriente de las pilas hacia los motores. Además permite cambiar el sentido de giro y la velocidad.",
        ],
      },
      {
        titulo: "Para ir más allá",
        parrafos: [
          "Cuando el robot ya sigue la línea, el siguiente paso es añadir un [sensor de ultrasonidos](/guias/sensor-de-ultrasonidos-hc-sr04) para que se pare si encuentra un obstáculo en el camino. Es exactamente lo que se hace en la última lección del curso del [coche robótico multifunción VR1](/kits/vr1-starter-kit).",
        ],
      },
    ],
    kits: ["vr1-starter-kit"],
    componentes: [
      "sensor-linea-tcrt5000",
      "driver-motores-l298n",
      "motor-dc-reductora",
      "chasis-coche-2wd",
    ],
  },
  {
    slug: "sensor-de-ultrasonidos-hc-sr04",
    titulo: "Sensor de ultrasonidos HC-SR04: cómo mide distancias",
    descripcion:
      "Cómo funciona el sensor HC-SR04, cómo calcula la distancia con el eco y para qué se usa en robótica: esquivar obstáculos, medir niveles y más.",
    publicada: "2026-10-30",
    actualizada: "2026-11-08",
    minutos: 4,
    entradilla:
      "El HC-SR04 es ese sensor con dos «ojos» redondos que aparece en casi todos los robots caseros. No ve como una cámara: mide distancias igual que un murciélago, con sonido.",
    secciones: [
      {
        titulo: "Cómo funciona",
        parrafos: [
          "Uno de los dos círculos es un altavoz y el otro un micrófono. El sensor lanza un pitido de ultrasonidos (40 kHz, demasiado agudo para nuestro oído) y espera a escuchar el eco que rebota en el objeto que tiene delante.",
          "La placa mide cuánto tiempo pasa entre el pitido y el eco. Como el sonido viaja a unos 343 metros por segundo, la distancia es ese tiempo multiplicado por la velocidad del sonido, dividido entre dos (porque el sonido va y vuelve).",
        ],
      },
      {
        titulo: "Lo que puede medir",
        parrafos: [
          "Funciona bien entre unos 2 centímetros y 4 metros, con una precisión de pocos milímetros cuando el objeto es plano y está de frente. Le cuestan más las superficies blandas (una cortina o un peluche absorben el sonido) y los objetos muy inclinados, que desvían el eco hacia otro lado.",
        ],
      },
      {
        titulo: "Cómo se conecta",
        parrafos: [
          "Tiene cuatro pines: VCC (alimentación a 5 V), GND (tierra), TRIG (la placa le pide que dispare el pitido) y ECHO (el sensor avisa de cuánto ha tardado el eco). Con una Arduino UNO se conecta directamente. Con una ESP32, que trabaja a 3,3 V, conviene bajar la tensión de la señal ECHO con dos resistencias, o usar la versión HC-SR04P, que funciona a 3,3 V y a 5 V. Es la que lleva nuestro [coche robótico multifunción VR1](/kits/vr1-starter-kit).",
        ],
      },
      {
        titulo: "Ideas para usarlo",
        parrafos: [],
        lista: [
          "Un coche que frena o gira al encontrar un obstáculo.",
          "Un medidor de nivel de agua en un depósito.",
          "Una alarma que pita si alguien se acerca a tu puerta.",
          "Un «metro» digital que muestra la distancia en una pantalla.",
        ],
      },
    ],
    kits: ["vr1-starter-kit"],
    componentes: ["sensor-ultrasonidos-hc-sr04", "arduino-uno-r3", "zumbador-activo"],
  },
  {
    slug: "servomotor-sg90-o-mg996r",
    titulo: "Qué es un servomotor y cuál usar: SG90 o MG996R",
    descripcion:
      "Cómo funciona un servo, en qué se diferencia de un motor normal y cuándo elegir un microservo SG90 o un servo MG996R de alto par.",
    publicada: "2026-10-30",
    actualizada: "2026-10-30",
    minutos: 5,
    entradilla:
      "Un motor normal gira sin parar mientras le llega corriente. Un servomotor, en cambio, va a la posición exacta que le pidas (por ejemplo, 90 grados) y se queda ahí, aguantando. Por eso son los músculos de los brazos robóticos, las pinzas y los timones.",
    secciones: [
      {
        titulo: "Cómo funciona por dentro",
        parrafos: [
          "Dentro de un servo hay un pequeño motor, una caja de engranajes que lo hace más lento y más fuerte, y un sensor que mide en qué posición está el eje. Un circuito compara la posición que le pides con la que tiene y mueve el motor hasta que coinciden.",
          "La placa le indica la posición con una señal de pulsos: unos 50 pulsos por segundo, y la duración de cada pulso (entre medio milisegundo y dos milisegundos y medio) marca el ángulo, de 0 a 180 grados. En Arduino no hace falta calcular nada: la librería Servo lo hace por ti con una sola línea.",
        ],
      },
      {
        titulo: "SG90: pequeño y ligero",
        parrafos: [
          "El microservo SG90 pesa unos 9 gramos y tiene engranajes de plástico. Su fuerza ronda 1,8 kg·cm: puede levantar 1,8 kilos a un centímetro del eje, o 180 gramos a diez centímetros. Es perfecto para mover cosas ligeras: una pinza pequeña, un sensor que gira para mirar a los lados o una banderita.",
        ],
      },
      {
        titulo: "MG996R: fuerza de verdad",
        parrafos: [
          "El MG996R es bastante más grande (unos 55 gramos), con engranajes metálicos y una fuerza de unos 9 a 11 kg·cm según el voltaje. Es el que conviene en las articulaciones de un brazo robótico que tiene que levantar su propio peso y algo más.",
          "A cambio, consume mucha más corriente, sobre todo al arrancar o si se bloquea. Nunca lo alimentes desde el pin de 5 V de la placa: necesita su propia fuente de alimentación, como un portabaterías, compartiendo solo la tierra (GND) con la placa.",
        ],
      },
      {
        titulo: "Cómo elegir",
        parrafos: [],
        lista: [
          "Si lo que mueve pesa poco y está cerca del eje: SG90.",
          "Si tiene que levantar un brazo, una pata o algo pesado: MG996R.",
          "Si dudas, calcula: peso (kg) × distancia al eje (cm) debe quedar muy por debajo de la fuerza del servo.",
        ],
      },
    ],
    kits: ["brazo-robotico"],
    componentes: ["servo-sg90", "servo-mg996r", "estructura-brazo-4dof", "bateria-18650-2s"],
  },
  {
    slug: "estacion-meteorologica-con-esp32",
    titulo: "Cómo hacer una estación meteorológica con ESP32",
    descripcion:
      "Qué sensores necesita una estación meteorológica casera, qué mide cada uno (temperatura, humedad, presión y luz) y cómo mostrar los datos en una pantalla.",
    publicada: "2026-10-30",
    actualizada: "2026-10-30",
    minutos: 6,
    entradilla:
      "Una estación meteorológica es uno de los proyectos más agradecidos para empezar: no tiene piezas que se muevan, se monta en poco tiempo y, cuando funciona, la miras todos los días. Además enseña algo muy útil: leer sensores y entender lo que significan sus números.",
    secciones: [
      {
        titulo: "Lo que necesitas",
        parrafos: [],
        lista: [
          "Una placa ESP32 (con wifi, por si después quieres ver los datos en el móvil).",
          "Un sensor DHT22 para la temperatura y la humedad.",
          "Un sensor BMP280 para la presión del aire.",
          "Una fotorresistencia (LDR) para la luz.",
          "Una pantalla OLED pequeña para ver los datos.",
          "Una protoboard y cables para unirlo todo sin soldar.",
        ],
      },
      {
        titulo: "Temperatura y humedad: DHT22",
        parrafos: [
          "El DHT22 mide la temperatura con un margen de error de medio grado y la humedad relativa del aire, de 0 a 100 %. Es un sensor lento: da una lectura nueva cada dos segundos, más que suficiente para el tiempo que hace.",
          "Un consejo: colócalo lejos de la placa y de la pantalla. La electrónica se calienta un poco y, si el sensor está pegado, marcará un par de grados de más.",
        ],
      },
      {
        titulo: "Presión del aire: BMP280",
        parrafos: [
          "El BMP280 mide la presión atmosférica en hectopascales (hPa). Al nivel del mar ronda los 1013 hPa. Lo interesante no es el número en sí, sino cómo cambia: si la presión baja varias unidades en pocas horas, suele llegar mal tiempo; si sube, mejora.",
          "Como la presión baja al subir de altura, el mismo sensor sirve para calcular la altitud aproximada a la que estás.",
        ],
      },
      {
        titulo: "Luz: la fotorresistencia",
        parrafos: [
          "Una LDR es una resistencia que cambia con la luz: cuanta más luz recibe, menos resistencia tiene. Conectada con otra resistencia fija, la ESP32 puede leer un número que sube y baja con la luz y saber si es de día, si está nublado o si es de noche.",
        ],
      },
      {
        titulo: "Mostrarlo todo en una pantalla",
        parrafos: [
          "Las pantallas OLED de 0,96 pulgadas tienen 128 × 64 puntos y se conectan con solo cuatro cables (por el bus I2C, el mismo que usa el BMP280). El programa lee los sensores cada pocos segundos y escribe los valores en la pantalla.",
          "Cuando eso funciona, puedes aprovechar el wifi de la ESP32 para enviar los datos al móvil o guardar un historial y ver cómo cambia el tiempo a lo largo de la semana. Todos estos pasos están en el curso de la [estación meteorológica](/kits/estacion-meteorologica).",
        ],
      },
    ],
    kits: ["estacion-meteorologica"],
    componentes: [
      "esp32-devkit",
      "sensor-dht22",
      "sensor-presion-bmp280",
      "sensor-luz-ldr",
      "pantalla-oled-096",
    ],
  },
];

export function obtenerGuia(slug: string): Guia | undefined {
  return guias.find((g) => g.slug === slug);
}

/** Guías que hablan de un kit o de un componente (para enlazarlas desde su ficha) */
export function guiasRelacionadas(tipo: "kits" | "componentes", slug: string): Guia[] {
  return guias.filter((g) => g[tipo].includes(slug));
}
