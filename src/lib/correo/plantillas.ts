/**
 * PLANTILLAS DE CORREO
 * Cada función prepara un correo (asunto, HTML y texto plano) en español, con el logo
 * y los colores de Valentia. Los programas de correo entienden muy poco CSS, así que
 * el diseño va con tablas y estilos escritos en cada etiqueta (es lo normal en los correos).
 */
import { marca } from "@/config/marca";
import type { Correo } from "./tipos";

/** Colores de globals.css (los correos no pueden leer ese archivo) */
const C = {
  tinta: "#0B0B0B",
  niebla: "#F4F4F2",
  gris: "#6B6B6B",
  linea: "#D9D9D6",
  acento: "#2D4BFF",
};

const TIPOGRAFIA = "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif";

/** Dirección pública de la web (las imágenes de un correo necesitan la dirección completa) */
function urlWeb(ruta = ""): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${ruta}`;
}

/** Evita que un nombre como "<b>Ana</b>" se convierta en HTML dentro del correo */
function escapar(texto: string): string {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const formatoFecha = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Madrid",
});

interface Contenido {
  /** Texto que algunos programas enseñan junto al asunto en la bandeja de entrada */
  resumen: string;
  titulo: string;
  /** Párrafos de texto (ya escapados si llevan datos del usuario) */
  parrafos: string[];
  /** Código grande y destacado (opcional) */
  codigo?: string;
  /** Botón (opcional) */
  boton?: { texto: string; url: string };
  /** Letra pequeña al final */
  notas?: string[];
}

/** El "sobre" común a todos los correos: logo, tarjeta blanca y pie */
function maquetar(c: Contenido): string {
  const parrafo = (texto: string) =>
    `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${C.tinta};">${texto}</p>`;
  const nota = (texto: string) =>
    `<p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:${C.gris};">${texto}</p>`;

  const codigo = c.codigo
    ? `<div style="margin:8px 0 24px;padding:20px;background:${C.niebla};border-radius:12px;text-align:center;">
         <span style="font-family:'Courier New',monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:${C.tinta};">${c.codigo}</span>
       </div>`
    : "";
  const boton = c.boton
    ? `<p style="margin:8px 0 24px;"><a href="${c.boton.url}" style="display:inline-block;padding:14px 28px;background:${C.acento};color:#ffffff;border-radius:999px;font-size:15px;font-weight:600;text-decoration:none;">${c.boton.texto}</a></p>`
    : "";
  const notas = c.notas?.length
    ? `<div style="margin-top:8px;padding-top:20px;border-top:1px solid ${C.linea};">${c.notas.map(nota).join("")}</div>`
    : "";

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(c.titulo)}</title>
</head>
<body style="margin:0;padding:0;background:${C.niebla};font-family:${TIPOGRAFIA};">
<div style="display:none;max-height:0;overflow:hidden;">${escapar(c.resumen)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.niebla};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
      <tr><td style="padding:0 8px 24px;">
        <img src="${urlWeb("/images/brand/logo-negro.png")}" width="160" height="19" alt="${marca.nombre}" style="display:block;border:0;">
      </td></tr>
      <tr><td style="background:#ffffff;border-radius:24px;padding:36px 32px;">
        <h1 style="margin:0 0 20px;font-size:24px;line-height:1.3;font-weight:600;color:${C.tinta};">${escapar(c.titulo)}</h1>
        ${c.parrafos.map(parrafo).join("")}
        ${codigo}
        ${boton}
        ${notas}
      </td></tr>
      <tr><td style="padding:24px 8px;font-size:12px;line-height:1.6;color:${C.gris};">
        ${marca.nombre} · ${marca.lema}<br>
        Este correo se ha enviado automáticamente; no hace falta que respondas.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/** Versión en texto plano: lo mismo, sin formato */
function enTexto(c: Contenido): string {
  const quitarHtml = (t: string) =>
    t
      .replace(/<[^>]+>/g, "")
      .replaceAll("&amp;", "&")
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
      .replaceAll("&quot;", '"')
      .replaceAll("&#39;", "'");
  return [
    c.titulo,
    "",
    ...c.parrafos.map(quitarHtml),
    ...(c.codigo ? ["", `    ${c.codigo}`, ""] : []),
    ...(c.boton ? [`${c.boton.texto}: ${c.boton.url}`, ""] : []),
    ...(c.notas ?? []).map(quitarHtml),
    "",
    `— ${marca.nombre}`,
  ].join("\n");
}

function correo(para: string, asunto: string, contenido: Contenido): Correo {
  return { para, asunto, html: maquetar(contenido), texto: enTexto(contenido) };
}

function saludo(nombre: string): string {
  return `Hola, ${escapar(nombre)}:`;
}

/** Para qué es el código (cambia el asunto y el texto) */
export type MotivoCodigo = "registro" | "dispositivo" | "recuperar";

const textosCodigo: Record<MotivoCodigo, { asunto: string; titulo: string; intro: string }> = {
  registro: {
    asunto: "Tu código para activar tu cuenta de Valentia",
    titulo: "Confirma tu email",
    intro:
      "¡Qué bien tenerte por aquí! Escribe este código en la web para confirmar tu email y empezar a construir.",
  },
  dispositivo: {
    asunto: "Tu código para iniciar sesión en Valentia",
    titulo: "Confirma que eres tú",
    intro:
      "Estás iniciando sesión desde un dispositivo nuevo. Escribe este código en la web para entrar.",
  },
  recuperar: {
    asunto: "Tu código para cambiar la contraseña de Valentia",
    titulo: "Cambia tu contraseña",
    intro: "Has pedido cambiar tu contraseña. Escribe este código en la web para elegir una nueva.",
  },
};

/** Correo con un código de 6 cifras */
export function plantillaCodigo(datos: {
  para: string;
  nombre: string;
  codigo: string;
  motivo: MotivoCodigo;
  minutos: number;
}): Correo {
  const t = textosCodigo[datos.motivo];
  return correo(datos.para, t.asunto, {
    resumen: `Tu código es ${datos.codigo}. Caduca en ${datos.minutos} minutos.`,
    titulo: t.titulo,
    parrafos: [saludo(datos.nombre), t.intro],
    codigo: datos.codigo,
    notas: [
      `El código caduca en ${datos.minutos} minutos y solo sirve una vez.`,
      "Nadie de Valentia te lo pedirá nunca: no se lo des a nadie.",
      "Si no has sido tú, puedes ignorar este correo; sin el código nadie puede entrar.",
    ],
  });
}

/** Aviso después de iniciar sesión desde un dispositivo nuevo */
export function plantillaNuevoDispositivo(datos: {
  para: string;
  nombre: string;
  dispositivo: string;
  fecha: Date;
}): Correo {
  return correo(datos.para, "Se ha iniciado sesión en tu cuenta desde un nuevo dispositivo", {
    resumen: `Nuevo inicio de sesión: ${datos.dispositivo}.`,
    titulo: "Nuevo inicio de sesión",
    parrafos: [
      saludo(datos.nombre),
      "Se ha iniciado sesión en tu cuenta desde un nuevo dispositivo:",
      `<strong>${escapar(datos.dispositivo)}</strong><br>${formatoFecha.format(datos.fecha)}`,
      "Si has sido tú, no tienes que hacer nada.",
    ],
    boton: { texto: "Revisar mis dispositivos", url: urlWeb("/cuenta") },
    notas: [
      "¿No has sido tú? Entra en «Mi cuenta», cambia tu contraseña y pulsa «Cerrar sesión en todos». " +
        `Si no puedes entrar, usa «¿Olvidaste tu contraseña?» en ${urlWeb("/login")}.`,
    ],
  });
}

/** Alguien ha intentado crear una cuenta con un email que ya está registrado */
export function plantillaIntentoRegistro(datos: { para: string; nombre: string }): Correo {
  return correo(datos.para, "Ya tienes una cuenta en Valentia", {
    resumen: "Alguien ha intentado crear una cuenta con tu email.",
    titulo: "Ya tienes una cuenta",
    parrafos: [
      saludo(datos.nombre),
      "Alguien ha intentado crear una cuenta nueva con este email, pero ya tienes una. Si has sido tú, simplemente inicia sesión.",
    ],
    boton: { texto: "Iniciar sesión", url: urlWeb("/login") },
    notas: [
      `¿No recuerdas la contraseña? Usa «¿Olvidaste tu contraseña?» en ${urlWeb("/login")}.`,
      "Si no has sido tú, puedes ignorar este correo: tu cuenta sigue segura.",
    ],
  });
}

/** Confirmación de que la contraseña ha cambiado */
export function plantillaContrasenaCambiada(datos: { para: string; nombre: string }): Correo {
  return correo(datos.para, "Tu contraseña de Valentia ha cambiado", {
    resumen: "Tu contraseña se ha cambiado correctamente.",
    titulo: "Contraseña cambiada",
    parrafos: [
      saludo(datos.nombre),
      "Tu contraseña se ha cambiado correctamente. Por seguridad, hemos cerrado la sesión en tus otros dispositivos.",
    ],
    notas: [
      `¿No has sido tú? Recupera tu cuenta cuanto antes con «¿Olvidaste tu contraseña?» en ${urlWeb("/login")}.`,
    ],
  });
}
