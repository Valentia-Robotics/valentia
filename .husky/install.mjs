// Activa los hooks de git (.husky/) al hacer "npm install".
// En servidores de publicación o integración continua no hace falta (y husky puede no estar instalado).
if (process.env.CI || process.env.NODE_ENV === "production") process.exit(0);

try {
  const husky = (await import("husky")).default;
  const mensaje = husky();
  if (mensaje) console.log(mensaje);
} catch {
  console.log("husky no está instalado: los hooks de git no se han activado.");
}
