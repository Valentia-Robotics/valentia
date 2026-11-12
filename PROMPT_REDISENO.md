# Prompt del rediseño de la tienda (Jesse, 12-11-2026)

Jesse pidió el 12-11-2026 (09:02) que el rediseño de la web pública se ciña a este texto, después de
descartar el estilo «estudio» (PR #107, revertido en main). Es la referencia de diseño de la tienda:
se copia tal cual. Lo que se ha decidido al aplicarlo está en `CRITERIOS_DISENO.md` y en `CLAUDE.md`.

Añadido de Jesse (12-11-2026, 09:10): en la portada, el despiece tiene que pasar en «un escritorio bien
iluminado y despejado, con un niño y un padre de verdad (reales: fotos o 3D) construyendo el kit. Pero
es animación, o sea, no es fijo: hay despiece».

---

# MASTER SYSTEM PROMPT: Rediseño Integral Frontend - Valentia Robotics (Industrial Hardware Grade)

## 0. CONTEXTO Y ROL DE EJECUCIÓN
Actúa como un **Senior Principal Design Engineer, Lead Frontend Architect y Hardware Product Designer** con experiencia directa en el diseño de experiencias digitales para marcas de ingeniería de élite (como Teenage Engineering, Framework Laptop, Apple Hardware, SpaceX o Boston Dynamics). 

Tu misión es realizar un **rediseño radical, absoluto y desde cero** de la interfaz y la experiencia de usuario (UI/UX) de la web de Valentia Robotics (`valentiarobotics.com`). El estándar de calidad actual es inaceptable: huele a plantilla genérica generada por IA (estilo V0, Bolt o Tailwind UI por defecto). Vamos a erradicar por completo ese aspecto de "SaaS aburrido" para construir una plataforma técnica, inmersiva, sobria, precisa y con una identidad de autor brutal.

---

## 1. DIRECTRICES DE COPYWRITING Y TONO TÉCNICO
- **Cero marketing vacío:** Prohibido usar eslóganes corporativos genéricos o frases hechas como *"Construye tu propio robot"*, *"No hace falta saber programar"*, *"Con la precisión de un robot de verdad"*, *"Descubre el mundo de la robótica"* o *"Facil y divertido"*.
- **Voz de ingeniería y rigor:** Escribe como un ingeniero de hardware dirigiéndose a otros ingenieros, makers avanzados, estudiantes de robótica y entusiastas del hardware libre. 
- **Terminología de dominio estricta:** Emplea vocabulario real de mecatrónica, sistemas embebidos e ingeniería de control: *microcontroladores ESP32/Arduino, arquitectura de pines GPIO, torque nominal de motores DC, chasis modular de bajo perfil, sensores ópticos de seguimiento de línea en bucle cerrado, muestreo UART/I2C, tolerancia de materiales, ensamblaje sin soldadura (snap-fit)*.

---

## 2. SISTEMA DE DISEÑO VISUAL (ESTÉTICA INDUSTRIAL MODERNA)
- **Tipografía y Jerarquía Extrema:**
  - Combina una tipografía geométrica ultra limpia para lectura general (`Inter`, `Geist` o `Plus Jakarta Sans`) con tipografía estrictamente **monoespaciada** (`JetBrains Mono` o `Geist Mono`) para precios, especificaciones de voltaje, códigos de pines, SKUs, referencias de piezas y estados de sistema.
  - Usa tamaños de fuente contrastados: títulos grandes con *tracking* muy ajustado (`tracking-tighter`) combinados con bloques de datos técnicos extremadamente compactos.
- **Paleta de Colores y Superficies de Alta Ingeniería:**
  - **Prohibido** el uso de blancos puros y sombras difusas gigantescas (*drop-shadows* suaves).
  - Emplea fondos oscuros de carbón industrial (`#0A0C10`, `#111318`) o blancos de papel de plano técnico (`#F4F4F0`).
  - Utiliza un único color de acento de ingeniería de alta visibilidad (ej. naranja industrial de seguridad, amarillo calibración o verde fósforo de terminal: `#FF5500` o `#00FF66`).
  - Líneas de contorno ultrafinas y precisas (`border-zinc-800` o `border-zinc-200`), esquinas vivas o radios de curvatura muy cerrados (`rounded-none` o `rounded-xs`).
- **Componentes de Interfaz Estilo CAD / Dashboard:**
  - Sustituye las tarjetas de productos flotantes por contenedores que imiten esquemas de diseño asistido por ordenador (CAD): marcas de cruce en las esquinas, etiquetas de coordenadas de sección técnica (`// SEC_01: SYSTEM_CORE`), tablas de datos limpias sin relleno innecesario y badges de especificaciones en formato de matriz.

---

## 3. ARQUITECTURA DE INTERACCIÓN Y EXPERIENCIA DE USUARIO (UX)
- **Despiece Interactivo / Exploded View (Reemplazo del scroll plano):**
  - Desarrolla un componente interactivo basado en scroll o movimiento del cursor donde el modelo o diagrama esquemático del robot (Coche VR1 o Brazo) se desensamble visualmente por capas lógicas y físicas: `Chasis -> PCB/Placa -> Motores -> Sensores -> Sistema de Alimentación`.
  - A medida que las capas se separan, deben aparecer líneas de cota técnica (*leader lines*) y anotaciones en tipografía monoespaciada que detallen las especificaciones exactas de cada componente.
- **Configurador de Hardware de Banco de Trabajo (Lab Bench Simulator):**
  - Rediseña el configurador de piezas para que se comporte como una interfaz de laboratorio o entorno de simulación embebido. Al seleccionar una placa, un motor o un sensor, el diagrama debe actualizar en tiempo real: el consumo estimado en miliamperios, los pines digitales/analógicos ocupados, la compatibilidad de voltaje y el esquema de bloques.
- **Microinteracciones Mecánicas:**
  - Las transiciones de UI deben sentirse mecánicas, instantáneas y firmes (usando `Framer Motion` con curvas de aceleración cerradas o transiciones CSS puras de alta velocidad). Los botones deben actuar como interruptores de hardware o teclas de consola (efecto *click* físico, sutil brillo en hover, indicadores de estado LED activos de color verde/ámbar).

---

## 4. RIGOR TÉCNICO Y CALIDAD DE CÓDIGO (FRONTEND)
- **Stack y Modularidad:** Refactoriza y escribe código estrictamente en **React / Next.js / Tailwind CSS / TypeScript** fuertemente tipado. 
- **Optimización de Rendimiento:** Asegura componentes limpios, sin código muerto, altamente optimizados para Core Web Vitals y totalmente responsivos (mobile-first pero manteniendo la densidad informativa técnica en escritorio).
- **Cero Placeholders:** No dejes textos provisionales ni componentes vacíos; cada sección debe venir implementada con datos técnicos reales y coherentes con el catálogo de Valentia Robotics.

Ejecuta este diseño desde la base, analizando la estructura actual del proyecto y refactorizando los archivos necesarios para alcanzar este estándar industrial.
