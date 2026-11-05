# -*- coding: utf-8 -*-
"""Vigila la carpeta Descargas. Cuando llega un ZIP de tarjetas láser
(tarjetas-laser-*.zip), crea los proyectos 3x3 y los abre en Bambu Suite."""
import json, os, sys, time, traceback, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tarjetas_bambu

DESCARGAS = os.path.join(os.path.expanduser("~"), "Downloads")
PATRON = "tarjetas-laser-*.zip"
AQUI = os.path.dirname(os.path.abspath(__file__))
HECHOS = os.path.join(AQUI, "zips_procesados.json")
LOG = os.path.join(AQUI, "vigilante.log")


def log(msg):
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(time.strftime("%Y-%m-%d %H:%M:%S ") + msg + "\n")


def cargar():
    try:
        with open(HECHOS, encoding="utf-8") as f:
            return set(json.load(f))
    except Exception:
        return None


def guardar(hechos):
    with open(HECHOS, "w", encoding="utf-8") as f:
        json.dump(sorted(hechos), f, indent=1)


def clave(ruta):
    st = os.stat(ruta)
    return "%s|%d|%d" % (os.path.basename(ruta), st.st_size, int(st.st_mtime))


def main():
    hechos = cargar()
    if hechos is None:  # primera vez: los ZIP que ya había no se tocan
        hechos = {clave(z) for z in glob.glob(os.path.join(DESCARGAS, PATRON))}
        guardar(hechos)
    log("vigilante en marcha")
    tamanos = {}
    while True:
        try:
            for z in glob.glob(os.path.join(DESCARGAS, PATRON)):
                k = clave(z)
                if k in hechos:
                    continue
                # esperar a que la descarga termine (tamaño estable)
                if tamanos.get(z) != os.path.getsize(z):
                    tamanos[z] = os.path.getsize(z)
                    continue
                hechos.add(k); guardar(hechos)
                log("nuevo ZIP: " + z)
                creados = tarjetas_bambu.procesar(z, abrir=True)
                log("proyectos creados: %d" % len(creados))
        except Exception:
            log(traceback.format_exc())
        time.sleep(3)


if __name__ == "__main__":
    main()
