# -*- coding: utf-8 -*-
"""
Tarjetas Valentia -> proyectos de Bambu Suite (.lac)

Coge un ZIP de tarjetas (VAL-XXXX-XXXX_delantero.svg / _trasero.svg),
las reparte de 9 en 9 en una rejilla fija de 3x3 y crea, por cada grupo,
dos proyectos láser: uno con las caras delanteras y otro con las traseras.
En las traseras las columnas van al revés (la tarjeta se gira como una página),
así cada trasera cae justo detrás de su delantera.

Uso:  python tarjetas_bambu.py ARCHIVO.zip [--no-abrir]
"""
import json, os, re, subprocess, sys, zipfile, datetime

AQUI = os.path.dirname(os.path.abspath(__file__))
PLANTILLA = os.path.join(AQUI, "plantilla")
SALIDA_BASE = os.path.join(os.path.expanduser("~"), "Downloads", "Tarjetas_laser_listas")
BAMBU = r"C:\Program Files\Bambu Suite\BambuSuite.exe"

# ---- Rejilla fija (milímetros, coordenadas de la base del láser en Bambu Suite) ----
TARJETA_W, TARJETA_H = 85.6, 54.0
HUECO = 5.0                    # separación entre tarjetas
COLUMNAS, FILAS = 3, 3
ORIGEN_X, ORIGEN_Y = 21.6, 39.0  # esquina de la primera tarjeta (rejilla centrada en la zona láser)

MATERIAL = "Aluminium Office Card - Black"
MATERIAL_ID = "B-YC-A-A-K0"
MAQUINA = "Bambu Lab H2C-40W"


def posicion(hueco, trasera):
    """Esquina (x, y) del hueco 0..8. En traseras las columnas se invierten."""
    fila, col = divmod(hueco, COLUMNAS)
    if trasera:
        col = COLUMNAS - 1 - col
    return (round(ORIGEN_X + col * (TARJETA_W + HUECO), 4),
            round(ORIGEN_Y + fila * (TARJETA_H + HUECO), 4))


def svg_a_ruta(svg):
    """Convierte el 'd' del SVG (M/L/H/V/Z, absolutos o relativos) al formato de Bambu Suite."""
    ds = re.findall(r'\sd="([^"]*)"', svg)
    if not ds:
        raise ValueError("el SVG no tiene trazados")
    out = []
    for d in ds:
        tokens = re.findall(r'[MmLlHhVvZz]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?', d)
        if re.search(r'[AaCcQqSsTt]', d):
            raise ValueError("el SVG tiene curvas no soportadas")
        x = y = sx = sy = 0.0
        cmd = None
        i = 0
        while i < len(tokens):
            t = tokens[i]
            if t.isalpha():
                cmd = t; i += 1
                if cmd in "Zz":
                    out.append("Z"); x, y = sx, sy
                continue
            if cmd in "MmLl":
                nx, ny = float(tokens[i]), float(tokens[i + 1]); i += 2
                if cmd.islower():
                    nx += x; ny += y
                letra = "M" if cmd in "Mm" else "L"
                out.append("%s %.6f %.6f" % (letra, nx, ny))
                x, y = nx, ny
                if cmd in "Mm":
                    sx, sy = x, y
                    cmd = "L" if cmd == "M" else "l"
            elif cmd in "Hh":
                v = float(t); i += 1
                x = v + (x if cmd == "h" else 0)
                out.append("L %.6f %.6f" % (x, y))
            elif cmd in "Vv":
                v = float(t); i += 1
                y = v + (y if cmd == "v" else 0)
                out.append("L %.6f %.6f" % (x, y))
            else:
                raise ValueError("trazado SVG raro")
    return " ".join(out)


def leer_tarjetas(zip_path):
    tarjetas = {}
    with zipfile.ZipFile(zip_path) as z:
        for n in z.namelist():
            m = re.match(r'(?:.*/)?(.+)_(delantero|trasero)\.svg$', n, re.I)
            if m:
                tarjetas.setdefault(m.group(1), {})[m.group(2).lower()] = z.read(n).decode("utf-8")
    codigos = sorted(tarjetas)
    return [(c, tarjetas[c]) for c in codigos]


def crear_lac(ruta_lac, piezas, trasera):
    """piezas: lista de (hueco, codigo, svg)."""
    obj_list, comp_canvas, comp_plate, obj_set = [], [], [], []
    for k, (hueco, codigo, svg) in enumerate(piezas):
        oid = 100 + k
        x, y = posicion(hueco, trasera)
        tr = "1 0 0 1 %g %g" % (x, y)
        obj_list.append({
            "color": "244 67 54 255",
            "flags": ["FreeAspectRatio"],
            "is_closed": True,
            "name": "%s_%s" % (codigo, "trasero" if trasera else "delantero"),
            "obj_id": oid,
            "path_data": svg_a_ruta(svg),
            "type": "PathObject",
        })
        comp_canvas.append({"obj_id": oid, "transform": tr})
        comp_plate.append({"obj_id": oid, "transform": tr})
        obj_set.append({"obj_id": oid, "process_type": "LaserFillEngrave"})

    modelo = {
        "Application": "Bambu Suite",
        "FileVersion": "01.02.01.00",
        "canvas_list": [{
            "components": comp_canvas, "index": 1, "name": "",
            "obj_list": obj_list, "type_count": {},
        }],
    }
    ajustes = {
        "canvas_settings": [{
            "index": 1,
            "making_batch_list": [{
                "auto_arranged": True,
                "batch_settings": {"classVersion": 3, "processing_mode": "PLANE"},
                "making_plate_list": [{
                    "components": comp_plate, "name": "", "obj_id": 14,
                    "plate_mirror": False,
                    "plate_settings": {"classVersion": 3},
                }],
                "material_id": MATERIAL_ID,
                "material_name": MATERIAL,
                "material_settings_name": MATERIAL,
                "name": "", "obj_id": 10, "process_category": 1,
            }],
            "object_settings": obj_set,
        }],
        "project_settings": {"classVersion": 3, "machine_settings_name": MAQUINA, "version": None},
    }

    def plantilla(nombre):
        with open(os.path.join(PLANTILLA, nombre), "rb") as f:
            return f.read()

    tmp = ruta_lac + ".tmp"
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("2D/entry.json", plantilla("entry.json"))
        z.writestr("2D/2dmodel.json", json.dumps(modelo, indent=4, ensure_ascii=False))
        z.writestr("Metadata2D/project_settings.json", json.dumps(ajustes, indent=4))
        z.writestr("Metadata2D/%s.config" % MAQUINA, plantilla("%s.config" % MAQUINA))
        z.writestr("_rels/.rels", plantilla(".rels"))
        z.writestr("[Content_Types].xml", plantilla("[Content_Types].xml"))
    os.replace(tmp, ruta_lac)


def _ventana_bambu():
    import ctypes
    from ctypes import wintypes
    user32 = ctypes.windll.user32
    encontradas = []
    def cb(h, _):
        n = user32.GetWindowTextLengthW(h)
        if n and user32.IsWindowVisible(h):
            b = ctypes.create_unicode_buffer(n + 1)
            user32.GetWindowTextW(h, b, n + 1)
            if b.value.endswith("Bambu Suite"):
                encontradas.append(h)
        return True
    user32.EnumWindows(ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, wintypes.LPARAM)(cb), 0)
    return encontradas[0] if encontradas else None


def _es_boton_preparar(h, plantilla):
    """Compara el texto del botón de abajo a la derecha con la plantilla de "Preparar".
    En la pestaña Preparar ese sitio lo ocupa "Hacer", que NO coincide."""
    import ctypes
    from ctypes import wintypes
    user32, gdi32 = ctypes.windll.user32, ctypes.windll.gdi32
    r = wintypes.RECT(); user32.GetClientRect(h, ctypes.byref(r))
    o = wintypes.POINT(0, 0); user32.ClientToScreen(h, ctypes.byref(o))
    cw, ch, paso = r.right, r.bottom, plantilla["paso"]
    dc = user32.GetDC(0)
    try:
        iguales = total = 0
        for fila, y in zip(plantilla["bits"], range(ch - plantilla["arriba"], ch - plantilla["abajo"], paso)):
            for bit, x in zip(fila, range(cw - plantilla["izq"], cw - plantilla["der"], paso)):
                c = gdi32.GetPixel(dc, o.x + x, o.y + y)
                if c == -1 or c == 0xFFFFFFFF:
                    return False, None
                rr, gg, bb = c & 0xFF, (c >> 8) & 0xFF, (c >> 16) & 0xFF
                oscuro = (rr + gg + bb) / 3 < 110
                iguales += (oscuro == (bit == "1")); total += 1
        # el fondo del botón tiene que ser verde
        c = gdi32.GetPixel(dc, o.x + cw - plantilla["clic_x"], o.y + ch - 50)
        verde = ((c >> 8) & 0xFF) > 200 and (c & 0xFF) < 200 and ((c >> 16) & 0xFF) < 150
    finally:
        user32.ReleaseDC(0, dc)
    return (verde and total and iguales / total > 0.97), (o.x + cw - plantilla["clic_x"], o.y + ch - plantilla["clic_y"])


def pulsar_preparar(espera=180):
    """Espera a que Bambu Suite muestre el proyecto, lo pone delante y pulsa "Preparar".
    Solo pulsa si Bambu Suite está delante y el botón es exactamente "Preparar"."""
    import ctypes, time
    user32 = ctypes.windll.user32
    user32.SetProcessDPIAware()
    with open(os.path.join(PLANTILLA, "boton_preparar.json"), encoding="utf-8") as f:
        plantilla = json.load(f)
    time.sleep(8)  # que Bambu Suite reciba el archivo y abra la pestaña nueva
    fin = time.time() + espera
    while time.time() < fin:
        h = _ventana_bambu()
        if h:
            if user32.GetForegroundWindow() != h:
                user32.ShowWindow(h, 6); time.sleep(0.5); user32.ShowWindow(h, 3); time.sleep(1.5)
            if user32.GetForegroundWindow() == h:
                ok, punto = _es_boton_preparar(h, plantilla)
                if ok:
                    time.sleep(1.5)  # comprobar otra vez, por si aún estaba cargando
                    ok, punto = _es_boton_preparar(h, plantilla)
                if ok and user32.GetForegroundWindow() == h:
                    user32.SetCursorPos(*punto); time.sleep(0.2)
                    ok2, _ = _es_boton_preparar(h, plantilla)
                    if ok2 and user32.GetForegroundWindow() == h:
                        user32.mouse_event(2, 0, 0, 0, 0); time.sleep(0.08); user32.mouse_event(4, 0, 0, 0, 0)
                        time.sleep(3)
                        return True
        time.sleep(2)
    return False


def procesar(zip_path, abrir=True):
    tarjetas = leer_tarjetas(zip_path)
    if not tarjetas:
        print("No hay tarjetas en", zip_path)
        return []
    nombre = os.path.splitext(os.path.basename(zip_path))[0]
    carpeta = os.path.join(SALIDA_BASE, nombre)
    os.makedirs(carpeta, exist_ok=True)
    creados, orden = [], []
    grupos = [tarjetas[i:i + 9] for i in range(0, len(tarjetas), 9)]
    for g, grupo in enumerate(grupos, 1):
        orden.append("PROYECTO %02d" % g)
        for hueco, (codigo, _) in enumerate(grupo):
            fila, col = divmod(hueco, 3)
            orden.append("  hueco fila %d, columna %d: %s" % (fila + 1, col + 1, codigo))
        for cara, trasera in (("delantero", False), ("trasero", True)):
            piezas = [(h, c, caras[cara]) for h, (c, caras) in enumerate(grupo) if cara in caras]
            if not piezas:
                continue
            ruta = os.path.join(carpeta, "Proyecto_%02d_%s.lac" % (g, cara))
            crear_lac(ruta, piezas, trasera)
            creados.append(ruta)
    with open(os.path.join(carpeta, "ORDEN.txt"), "w", encoding="utf-8") as f:
        f.write("Tarjetas de %s (%s)\n" % (nombre, datetime.datetime.now().strftime("%d/%m/%Y %H:%M")))
        f.write("Graba primero el _delantero, gira las tarjetas como una página y graba el _trasero del mismo número.\n")
        f.write("Fila 1 es la de arriba y columna 1 la de la izquierda, mirando la cara delantera.\n\n")
        f.write("\n".join(orden) + "\n")
    print("Creados %d proyectos en %s" % (len(creados), carpeta))
    if abrir:
        for ruta in creados:
            subprocess.Popen([BAMBU, ruta])
            # espera a que cargue, la pone delante y pulsa "Preparar" (solo si lo reconoce)
            pulsar_preparar()
    return creados


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    procesar(sys.argv[1], abrir="--no-abrir" not in sys.argv)
