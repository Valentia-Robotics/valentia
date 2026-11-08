#!/usr/bin/env python3
"""
Genera los proyectos KiCad de las placas modulares de Valentia:

  placa-base-esp32/      va encima de la ESP32 (DevKitC de 38 pines) y lleva los
                         contactos (plaquitas redondas) + 2 imanes para el módulo.
  modulo-ultrasonidos/   plaquita del sensor HC-SR04P con 4 pines pogo + 2 imanes.

Se ejecuta con el Python de KiCad (necesita el módulo `pcbnew`, KiCad 7 o más nuevo):

    python3 hardware/generar_placas.py

Las medidas importantes están arriba (MEDIDAS): si cambia el imán o la ESP32,
se cambia aquí y se vuelve a ejecutar. Los archivos se abren con KiCad 7, 8 o 9.
"""
import os
import re
import uuid
import json
import pcbnew

AQUI = os.path.dirname(os.path.abspath(__file__))
LIB = "valentia"
SIMBOLOS = "/usr/share/kicad/symbols"

# ------------------------------------------------------------------ MEDIDAS (mm)
PASO = 2.54                 # paso de los pines de la ESP32 y de los contactos
ESP_SEPARACION = 25.4       # distancia entre las dos filas de la ESP32 DevKitC (38 pines)
ESP_TALADRO, ESP_PAD = 1.0, 1.7
CONTACTO_DIAM = 2.2         # plaquitas redondas donde apoyan los pines pogo
IMAN_DIAM = 6.0             # imán de neodimio de disco 6 x 3 mm
IMAN_HOLGURA = 0.2          # el agujero es 0,2 mm más grande que el imán
IMAN_DIST = 9.5             # del centro de los contactos al centro de cada imán
POGO_TALADRO, POGO_PAD = 1.0, 1.7

# Fila de arriba (lado izquierdo de la DevKitC, de la antena al USB) y fila de abajo.
FILA_IZQ = ["3V3", "EN", "SENSOR_VP", "SENSOR_VN", "IO34", "IO35", "IO32", "IO33", "IO25",
            "IO26", "IO27", "IO14", "IO12", "GND", "IO13", "SD2", "SD3", "CMD", "5V"]
FILA_DER = ["GND", "IO23", "IO22", "TXD0", "RXD0", "IO21", "GND", "IO19", "IO18", "IO5",
            "IO17", "IO16", "IO4", "IO0", "IO2", "IO15", "SD1", "SD0", "CLK"]
# Lo que usa la placa base (igual que firmware/coche-esp32: TRIG = 5, ECHO = 18).
CONTACTOS = [("3V3", "3V3"), ("TRIG", "IO5"), ("ECHO", "IO18"), ("GND", "GND")]

mm = pcbnew.FromMM
# KiCad 7 usa FP_SHAPE/FP_TEXT dentro de las huellas; KiCad 8+ usa PCB_SHAPE/PCB_TEXT.
FP_SHAPE = getattr(pcbnew, "FP_SHAPE", pcbnew.PCB_SHAPE)
FP_TEXT = getattr(pcbnew, "FP_TEXT", pcbnew.PCB_TEXT)
def V(x, y): return pcbnew.VECTOR2I(mm(x), mm(y))
def uid(): return str(uuid.uuid4())


# ================================================================== HUELLAS
def huella(nombre, descripcion):
    fp = pcbnew.FOOTPRINT(None)
    fp.SetFPID(pcbnew.LIB_ID(LIB, nombre))
    fp.SetDescription(descripcion)
    fp.SetReference("REF**")
    fp.SetValue(nombre)
    fp.Reference().SetLayer(pcbnew.F_SilkS)
    fp.Value().SetLayer(pcbnew.F_Fab)
    fp.Value().SetVisible(False)
    return fp

def pad_tht(fp, num, x, y, drill, size, cuadrado=False):
    p = pcbnew.PAD(fp)
    p.SetNumber(str(num))
    p.SetAttribute(pcbnew.PAD_ATTRIB_PTH)
    p.SetShape(pcbnew.PAD_SHAPE_RECT if cuadrado else pcbnew.PAD_SHAPE_CIRCLE)
    p.SetSize(V(size, size)); p.SetDrillSize(V(drill, drill))
    p.SetLayerSet(pcbnew.PAD.PTHMask())
    p.SetPosition(V(x, y)); anadir(fp, p)

def pad_smd_redondo(fp, num, x, y, d):
    p = pcbnew.PAD(fp)
    p.SetNumber(str(num))
    p.SetAttribute(pcbnew.PAD_ATTRIB_SMD)
    p.SetShape(pcbnew.PAD_SHAPE_CIRCLE)
    p.SetSize(V(d, d))
    ls = pcbnew.LSET(); ls.AddLayer(pcbnew.F_Cu); ls.AddLayer(pcbnew.F_Mask)
    p.SetLayerSet(ls)
    p.SetPosition(V(x, y)); anadir(fp, p)

def anadir(fp, s):
    """Añade un dibujo a la huella (en KiCad 7 hay que fijar sus coordenadas locales)."""
    if hasattr(s, "SetLocalCoord"): s.SetLocalCoord()
    fp.Add(s)

def linea(fp, capa, x1, y1, x2, y2, ancho=0.12):
    s = FP_SHAPE(fp, pcbnew.SHAPE_T_SEGMENT)
    s.SetStart(V(x1, y1)); s.SetEnd(V(x2, y2)); s.SetLayer(capa); s.SetWidth(mm(ancho)); anadir(fp, s)

def rect(fp, capa, x1, y1, x2, y2, ancho=0.12):
    for a, b in [((x1, y1), (x2, y1)), ((x2, y1), (x2, y2)), ((x2, y2), (x1, y2)), ((x1, y2), (x1, y1))]:
        linea(fp, capa, *a, *b, ancho)

def circulo(fp, capa, x, y, r, ancho=0.12):
    s = FP_SHAPE(fp, pcbnew.SHAPE_T_CIRCLE)
    s.SetCenter(V(x, y)); s.SetEnd(V(x + r, y)); s.SetLayer(capa); s.SetWidth(mm(ancho)); anadir(fp, s)

def texto(fp, capa, t, x, y, alto=0.8, angulo=0):
    s = FP_TEXT(fp)
    s.SetText(t); s.SetLayer(capa); s.SetPosition(V(x, y))
    if angulo: s.SetTextAngle(pcbnew.EDA_ANGLE(angulo, pcbnew.DEGREES_T))
    s.SetTextSize(V(alto, alto)); s.SetTextThickness(mm(alto * 0.15))
    if capa in (pcbnew.B_SilkS, pcbnew.B_Fab): s.SetMirrored(True)
    anadir(fp, s)

def huella_esp32():
    """ESP32-DevKitC de 38 pines vista desde arriba. Pad 2k-1 = fila del 3V3, pad 2k = fila del GND."""
    fp = huella("ESP32_DevKitC_38pin", "Agujeros para la ESP32-DevKitC (2x19, filas a 25,4 mm). "
                "Origen en el pin 3V3; USB hacia la izquierda, antena hacia la derecha.")
    for k in range(19):
        x = -k * PASO
        pad_tht(fp, 2 * k + 1, x, 0, ESP_TALADRO, ESP_PAD, cuadrado=(k == 0))
        pad_tht(fp, 2 * k + 2, x, ESP_SEPARACION, ESP_TALADRO, ESP_PAD)
    # Silueta aproximada de la DevKitC (54,4 x 27,9 mm) en la capa de fabricación
    x_usb, x_ant = -18 * PASO - 2.7, 6.0
    rect(fp, pcbnew.F_Fab, x_usb, -1.25, x_ant, ESP_SEPARACION + 1.25, 0.1)
    rect(fp, pcbnew.F_Fab, x_ant - 6.0, 3.0, x_ant, ESP_SEPARACION - 3.0, 0.1)
    texto(fp, pcbnew.F_Fab, "antena", x_ant - 3.0, ESP_SEPARACION / 2, 0.8)
    # Nombres en serigrafía (cada pin)
    for k in range(19):
        texto(fp, pcbnew.F_SilkS, FILA_IZQ[k].replace("SENSOR_", ""), -k * PASO, 3.0, 0.8, 90)
        texto(fp, pcbnew.F_SilkS, FILA_DER[k].replace("XD0", "X"), -k * PASO, ESP_SEPARACION - 3.0, 0.8, 90)
    fp.Reference().SetPosition(V(-9 * PASO, ESP_SEPARACION / 2 - 3))
    fp.Value().SetPosition(V(-9 * PASO, ESP_SEPARACION / 2 + 3))
    return fp

def huella_contactos():
    fp = huella("Contactos_Pogo_1x04_P2.54mm", "4 plaquitas redondas (sin agujero) donde apoyan los pines pogo. "
                "Pedir la placa con acabado ENIG (oro) para que no se oxiden.")
    for i in range(4): pad_smd_redondo(fp, i + 1, 0, i * PASO, CONTACTO_DIAM)
    rect(fp, pcbnew.F_SilkS, -1.6, -1.6, 1.6, 3 * PASO + 1.6)
    texto(fp, pcbnew.F_SilkS, "1", -2.4, 0, 0.8)
    fp.Reference().SetPosition(V(0, -2.6)); fp.Reference().SetVisible(False)
    return fp

def huella_pogo():
    fp = huella("Pines_Pogo_1x04_P2.54mm", "4 pines pogo de paso 2,54 mm (tira de 1x4 de agujero pasante). "
                "Se sueldan con los muelles hacia abajo.")
    for i in range(4): pad_tht(fp, i + 1, 0, i * PASO, POGO_TALADRO, POGO_PAD, cuadrado=(i == 0))
    rect(fp, pcbnew.B_SilkS, -1.4, -1.4, 1.4, 3 * PASO + 1.4)
    texto(fp, pcbnew.B_SilkS, "POGO", -2.6, 1.5 * PASO, 0.8, 90)
    fp.Reference().SetPosition(V(0, -2.4)); fp.Reference().SetVisible(False)
    return fp

def huella_zocalo_sensor():
    fp = huella("Zocalo_Sensor_1x04_P2.54mm", "4 agujeros para el sensor HC-SR04P (VCC, TRIG, ECHO, GND): "
                "se suelda el sensor o un zócalo hembra acodado.")
    for i in range(4): pad_tht(fp, i + 1, 0, i * PASO, 1.0, 1.7, cuadrado=(i == 0))
    rect(fp, pcbnew.F_SilkS, -1.4, -1.4, 1.4, 3 * PASO + 1.4)
    fp.Reference().SetPosition(V(0, -2.4)); fp.Reference().SetVisible(False)
    return fp

def huella_iman():
    d = IMAN_DIAM + IMAN_HOLGURA
    fp = huella(f"Iman_{IMAN_DIAM:g}mm", f"Agujero sin metalizar de {d:g} mm para pegar un imán de neodimio de "
                f"{IMAN_DIAM:g} mm de diámetro.")
    p = pcbnew.PAD(fp)
    p.SetNumber("")
    p.SetAttribute(pcbnew.PAD_ATTRIB_NPTH)
    p.SetShape(pcbnew.PAD_SHAPE_CIRCLE)
    p.SetSize(V(d, d)); p.SetDrillSize(V(d, d))
    ls = pcbnew.LSET(); ls.AddLayer(pcbnew.F_Mask); ls.AddLayer(pcbnew.B_Mask)
    for c in (pcbnew.F_Cu, pcbnew.B_Cu): ls.AddLayer(c)
    p.SetLayerSet(ls)
    p.SetPosition(V(0, 0)); anadir(fp, p)
    circulo(fp, pcbnew.F_SilkS, 0, 0, d / 2 + 0.4)
    circulo(fp, pcbnew.F_CrtYd, 0, 0, d / 2 + 0.5, 0.05)
    fp.Reference().SetPosition(V(0, -d / 2 - 1.3)); fp.Reference().SetVisible(False)
    return fp


HUELLAS = {}
def guardar_huellas(carpeta):
    lib = os.path.join(carpeta, f"{LIB}.pretty")
    os.makedirs(lib, exist_ok=True)
    for f in [huella_esp32, huella_contactos, huella_pogo, huella_zocalo_sensor, huella_iman]:
        fp = f(); HUELLAS[fp.GetFPID().GetLibItemName().wx_str()] = f
        pcbnew.FootprintSave(lib, fp)
    with open(os.path.join(carpeta, "fp-lib-table"), "w") as t:
        t.write('(fp_lib_table\n  (version 7)\n'
                f'  (lib (name "{LIB}")(type "KiCad")(uri "${{KIPRJMOD}}/{LIB}.pretty")(options "")'
                '(descr "Huellas de Valentia"))\n)\n')


# ================================================================== ESQUEMA
def simbolo_lib(archivo, nombre):
    t = open(os.path.join(SIMBOLOS, archivo + ".kicad_sym")).read()
    i = t.find(f'(symbol "{nombre}"')
    j = t.find('\n  (symbol "', i + 10)
    if j < 0: j = t.rfind(")")
    s = t[i:j].rstrip()
    return s.replace(f'(symbol "{nombre}"', f'(symbol "{archivo}:{nombre}"', 1)

def pines_lib(archivo, nombre):
    s = simbolo_lib(archivo, nombre)
    return {n: (float(x), float(y)) for x, y, _, n in
            re.findall(r'\(pin \w+ \w+ \(at ([-\d.]+) ([-\d.]+) (\d+)\).*?\(number "(\w+)"', s, re.S)}

class Esquema:
    def __init__(self, proyecto, titulo):
        self.proyecto, self.titulo, self.raiz = proyecto, titulo, uid()
        self.libs, self.cosas = {}, []

    def simbolo(self, archivo, nombre, ref, valor, huella, x, y, pines_red):
        """Coloca un símbolo y pone una etiqueta (o un «sin conexión») en cada pin."""
        lib_id = f"{archivo}:{nombre}"
        self.libs[lib_id] = simbolo_lib(archivo, nombre)
        u = uid()
        def prop(n, v, dx, dy, oculto=False):
            return (f'    (property "{n}" "{v}" (at {x + dx:g} {y + dy:g} 0)\n'
                    f'      (effects (font (size 1.27 1.27)){" hide" if oculto else ""}))\n')
        pines = pines_lib(archivo, nombre)
        s = (f'  (symbol (lib_id "{lib_id}") (at {x:g} {y:g} 0) (unit 1)\n'
             f'    (in_bom yes) (on_board yes) (dnp no) (uuid {u})\n'
             + prop("Reference", ref, 1.27, -27.94 if len(pines) > 10 else (-7.62 if pines else -3.81))
             + prop("Value", valor, 1.27, 27.94 if len(pines) > 10 else (10.16 if pines else 3.81))
             + prop("Footprint", f"{LIB}:{huella}", 0, 0, True)
             + prop("Datasheet", "~", 0, 0, True))
        for n in pines: s += f'    (pin "{n}" (uuid {uid()}))\n'
        s += (f'    (instances (project "{self.proyecto}" (path "/{self.raiz}" (reference "{ref}") (unit 1))))\n'
              '  )\n')
        self.cosas.append(s)
        for n, (px, py) in pines.items():
            ax, ay = x + px, y - py
            red = pines_red.get(n)
            if red is None:
                self.cosas.append(f'  (no_connect (at {ax:g} {ay:g}) (uuid {uid()}))\n')
                continue
            izq = px < 0
            bx = ax - 2.54 if izq else ax + 2.54
            self.cosas.append(f'  (wire (pts (xy {ax:g} {ay:g}) (xy {bx:g} {ay:g})) (stroke (width 0) (type default)) (uuid {uid()}))\n')
            self.cosas.append(f'  (label "{red}" (at {bx:g} {ay:g} {180 if izq else 0}) (fields_autoplaced)\n'
                              f'    (effects (font (size 1.27 1.27)) (justify {"right" if izq else "left"} bottom)) (uuid {uid()}))\n')
        return u

    def nota(self, t, x, y):
        t = t.replace('"', "'").replace("\n", "\\n")
        self.cosas.append(f'  (text "{t}" (at {x:g} {y:g} 0)\n    (effects (font (size 1.27 1.27)) (justify left bottom)) (uuid {uid()}))\n')

    def guardar(self, ruta):
        libs = "".join("    " + v.replace("\n", "\n  ") + "\n" for v in self.libs.values())
        with open(ruta, "w") as f:
            f.write(f'(kicad_sch (version 20230121) (generator eeschema)\n  (uuid {self.raiz})\n  (paper "A4")\n'
                    f'  (title_block (title "{self.titulo}") (company "Valentia Robotics") (rev "1"))\n'
                    f'  (lib_symbols\n{libs}  )\n' + "".join(self.cosas) +
                    '  (sheet_instances (path "/" (page "1")))\n)\n')


# ================================================================== PLACA
def nueva_placa():
    b = pcbnew.BOARD()
    ds = b.GetDesignSettings()
    ds.SetCopperLayerCount(2)
    ds.m_TrackMinWidth = mm(0.2); ds.m_MinClearance = mm(0.2); ds.m_HoleClearance = mm(0.3)
    nc = ds.m_NetSettings.m_DefaultNetClass
    nc.SetTrackWidth(mm(0.3)); nc.SetClearance(mm(0.2)); nc.SetViaDiameter(mm(0.7)); nc.SetViaDrill(mm(0.35))
    return b

def contorno(b, x1, y1, x2, y2, r=2.0):
    """Borde de la placa con esquinas redondeadas."""
    def seg(a, c):
        s = pcbnew.PCB_SHAPE(b, pcbnew.SHAPE_T_SEGMENT); s.SetStart(V(*a)); s.SetEnd(V(*c))
        s.SetLayer(pcbnew.Edge_Cuts); s.SetWidth(mm(0.1)); b.Add(s)
    def arco(cx, cy, sx, sy):
        s = pcbnew.PCB_SHAPE(b, pcbnew.SHAPE_T_ARC); s.SetCenter(V(cx, cy)); s.SetStart(V(sx, sy))
        s.SetArcAngleAndEnd(pcbnew.EDA_ANGLE(90, pcbnew.DEGREES_T)); s.SetLayer(pcbnew.Edge_Cuts)
        s.SetWidth(mm(0.1)); b.Add(s)
    seg((x1 + r, y1), (x2 - r, y1)); seg((x2, y1 + r), (x2, y2 - r))
    seg((x2 - r, y2), (x1 + r, y2)); seg((x1, y2 - r), (x1, y1 + r))
    arco(x2 - r, y1 + r, x2 - r, y1); arco(x2 - r, y2 - r, x2, y2 - r)
    arco(x1 + r, y2 - r, x1 + r, y2); arco(x1 + r, y1 + r, x1, y1 + r)

def redes(b, nombres):
    r = {}
    for n in nombres:
        # Mismo nombre que da el esquema (etiquetas locales en la hoja raíz: "/3V3"...)
        net = pcbnew.NETINFO_ITEM(b, "/" + n); b.Add(net); r[n] = net
    return r

def poner(b, nombre_huella, ref, valor, x, y, sim_uuid, nets_por_pad):
    fp = HUELLAS[nombre_huella]()
    fp.SetReference(ref); fp.SetValue(valor)
    fp.SetPosition(V(x, y))
    fp.SetPath(pcbnew.KIID_PATH(f"/{sim_uuid}"))
    b.Add(fp)
    for p in fp.Pads():
        if p.GetNumber() in nets_por_pad: p.SetNet(nets_por_pad[p.GetNumber()])
    return fp

def pista(b, net, puntos, capa=pcbnew.F_Cu, ancho=0.3):
    for a, c in zip(puntos, puntos[1:]):
        t = pcbnew.PCB_TRACK(b); t.SetStart(V(*a)); t.SetEnd(V(*c))
        t.SetLayer(capa); t.SetWidth(mm(ancho)); t.SetNet(net); b.Add(t)

def via(b, net, x, y):
    v = pcbnew.PCB_VIA(b); v.SetPosition(V(x, y)); v.SetDrill(mm(0.35)); v.SetWidth(mm(0.7))
    v.SetLayerPair(pcbnew.F_Cu, pcbnew.B_Cu); v.SetNet(net); b.Add(v)

def zona_prohibida(b, x1, y1, x2, y2, nombre):
    z = pcbnew.ZONE(b)
    z.SetIsRuleArea(True); z.SetZoneName(nombre)
    z.SetDoNotAllowTracks(True); z.SetDoNotAllowVias(True); z.SetDoNotAllowCopperPour(True)
    z.SetDoNotAllowPads(False); z.SetDoNotAllowFootprints(False)
    ls = pcbnew.LSET(); ls.AddLayer(pcbnew.F_Cu); ls.AddLayer(pcbnew.B_Cu); z.SetLayerSet(ls)
    o = z.Outline(); o.NewOutline()
    for p in [(x1, y1), (x2, y1), (x2, y2), (x1, y2)]: o.Append(mm(p[0]), mm(p[1]))
    b.Add(z)

def texto_placa(b, t, x, y, capa=pcbnew.F_SilkS, alto=1.0):
    s = pcbnew.PCB_TEXT(b); s.SetText(t); s.SetLayer(capa); s.SetPosition(V(x, y))
    s.SetTextSize(V(alto, alto)); s.SetTextThickness(mm(alto * 0.15))
    if capa == pcbnew.B_SilkS: s.SetMirrored(True)
    b.Add(s)

def proyecto(carpeta, nombre):
    os.makedirs(carpeta, exist_ok=True)
    guardar_huellas(carpeta)
    with open(os.path.join(carpeta, nombre + ".kicad_pro"), "w") as f:
        json.dump({"meta": {"filename": nombre + ".kicad_pro", "version": 1},
                   "board": {"design_settings": {"defaults": {}, "rules": {
                       "min_clearance": 0.2, "min_track_width": 0.2, "min_hole_clearance": 0.3,
                       "min_via_diameter": 0.5, "min_through_hole_diameter": 0.3}}},
                   "net_settings": {"classes": [{"name": "Default", "clearance": 0.2, "track_width": 0.3,
                                                 "via_diameter": 0.7, "via_drill": 0.35}], "meta": {"version": 3}},
                   "text_variables": {}}, f, indent=2)


# ---------------------------------------------------------- 1) PLACA BASE ESP32
def placa_base():
    nombre = "placa-base-esp32"
    carpeta = os.path.join(AQUI, nombre)
    proyecto(carpeta, nombre)

    # Posiciones (mm). Pin 3V3 en (X3V3, Y_ARR); USB a la izquierda, antena a la derecha.
    X3V3, Y_ARR = 49.72, 7.3
    Y_ABA = Y_ARR + ESP_SEPARACION
    ANCHO, ALTO = 72.0, 40.0
    CX, CY = 66.0, 20.0                       # centro de la fila de contactos
    ys = [CY - 1.5 * PASO + i * PASO for i in range(4)]

    def x_izq(red): return X3V3 - FILA_IZQ.index(red) * PASO
    def x_der(red): return X3V3 - FILA_DER.index(red) * PASO

    # ---- esquema
    sch = Esquema(nombre, "Placa base ESP32 - módulo ultrasonidos")
    usados = {"3V3": "3V3", "IO5": "TRIG", "IO18": "ECHO"}
    pines_esp = {}
    for k in range(19):
        a, d = FILA_IZQ[k], FILA_DER[k]
        if a in usados: pines_esp[str(2 * k + 1)] = usados[a]
        if d in usados: pines_esp[str(2 * k + 2)] = usados[d]
    pines_esp["2"] = "GND"     # primer GND de la fila de abajo (los otros dos GND ya están unidos en la ESP32)
    u_esp = sch.simbolo("Connector_Generic", "Conn_02x19_Odd_Even", "U1", "ESP32-DevKitC 38 pines",
                        "ESP32_DevKitC_38pin", 76.2, 88.9, pines_esp)
    u_con = sch.simbolo("Connector_Generic", "Conn_01x04", "J1", "Contactos módulo ultrasonidos",
                        "Contactos_Pogo_1x04_P2.54mm", 165.1, 76.2,
                        {"1": "3V3", "2": "TRIG", "3": "ECHO", "4": "GND"})
    u_i1 = sch.simbolo("Mechanical", "MountingHole", "M1", "Imán 6x3 (N hacia arriba)", f"Iman_{IMAN_DIAM:g}mm", 160.02, 101.6, {})
    u_i2 = sch.simbolo("Mechanical", "MountingHole", "M2", "Imán 6x3 (S hacia arriba)", f"Iman_{IMAN_DIAM:g}mm", 205.74, 101.6, {})
    sch.nota("U1: pines impares = lado 3V3 ... 5V; pines pares = lado GND ... CLK (de la antena al USB).\n"
             "TRIG = GPIO5 y ECHO = GPIO18, igual que firmware/coche-esp32.\n"
             "Los otros GND (pines 27 y 14) ya están unidos dentro de la ESP32.\n"
             "Sensor HC-SR04P: funciona a 3,3 V (un HC-SR04 normal de 5 V daría 5 V en el GPIO18).", 25.4, 127)
    sch.nota("Imanes: polaridad contraria en cada extremo, así el módulo\nsolo encaja en un sentido (al revés se repelen).", 152.4, 116.84)
    sch.guardar(os.path.join(carpeta, nombre + ".kicad_sch"))

    # ---- placa
    b = nueva_placa()
    n = redes(b, ["3V3", "TRIG", "ECHO", "GND"])
    contorno(b, 0, 0, ANCHO, ALTO)
    poner(b, "ESP32_DevKitC_38pin", "U1", "ESP32-DevKitC 38 pines", X3V3, Y_ARR, u_esp,
          {k: n[v] for k, v in pines_esp.items()})
    poner(b, "Contactos_Pogo_1x04_P2.54mm", "J1", "Contactos", CX, ys[0], u_con,
          {"1": n["3V3"], "2": n["TRIG"], "3": n["ECHO"], "4": n["GND"]})
    poner(b, f"Iman_{IMAN_DIAM:g}mm", "M1", "Imán N", CX, CY - IMAN_DIST, u_i1, {})
    poner(b, f"Iman_{IMAN_DIAM:g}mm", "M2", "Imán S", CX, CY + IMAN_DIST, u_i2, {})

    # Pistas: 3V3 y GND por arriba (F.Cu), TRIG y ECHO por abajo (B.Cu) hasta una vía junto al contacto.
    # Ninguna pasa por encima de la antena de la ESP32 (zona prohibida).
    XV = 59.0
    pista(b, n["3V3"], [(x_izq("3V3"), Y_ARR), (XV, Y_ARR), (XV, ys[0]), (CX, ys[0])], ancho=0.5)
    pista(b, n["GND"], [(x_der("GND"), Y_ABA), (XV, Y_ABA), (XV, ys[3]), (CX, ys[3])], ancho=0.5)
    xt, xe = x_der("IO5"), x_der("IO18")
    pista(b, n["ECHO"], [(xe, Y_ABA), (xe, 35.5), (60.5, 35.5), (60.5, ys[2])], pcbnew.B_Cu)
    via(b, n["ECHO"], 60.5, ys[2]); pista(b, n["ECHO"], [(60.5, ys[2]), (CX, ys[2])])
    pista(b, n["TRIG"], [(xt, Y_ABA), (xt, 37.5), (62.0, 37.5), (62.0, ys[1])], pcbnew.B_Cu)
    via(b, n["TRIG"], 62.0, ys[1]); pista(b, n["TRIG"], [(62.0, ys[1]), (CX, ys[1])])

    zona_prohibida(b, X3V3 + 0.5, Y_ARR + 3.5, X3V3 + 7.0, Y_ABA - 3.5, "antena ESP32")

    for i, t in enumerate(["3V3", "TRIG", "ECHO", "GND"]):
        texto_placa(b, t, CX + 3.6, ys[i], alto=0.8)
    texto_placa(b, "N", CX, CY - IMAN_DIST - 4.4, alto=1.2)
    texto_placa(b, "S", CX, CY + IMAN_DIST + 4.4, alto=1.2)
    texto_placa(b, "ULTRASONIDOS", CX - 0.0, 1.5, alto=0.9)
    texto_placa(b, "VALENTIA · base ESP32 v1", 26.0, ALTO - 1.6, alto=1.0)
    texto_placa(b, "<- USB", 6.0, ALTO / 2, alto=1.0)
    texto_placa(b, "ESP32 DEBAJO", 26.0, ALTO / 2 + 1.6, pcbnew.B_SilkS, 1.0)

    ruta = os.path.join(carpeta, nombre + ".kicad_pcb")
    pcbnew.SaveBoard(ruta, b)
    return ruta


# ---------------------------------------------------------- 2) MÓDULO ULTRASONIDOS
def modulo_ultrasonidos():
    nombre = "modulo-ultrasonidos"
    carpeta = os.path.join(AQUI, nombre)
    proyecto(carpeta, nombre)
    ANCHO, ALTO = 19.0, 30.0
    PX, SX, CY = 5.0, 11.5, 15.0              # columna de pogo, columna del sensor, centro
    ys = [CY - 1.5 * PASO + i * PASO for i in range(4)]

    sch = Esquema(nombre, "Módulo ultrasonidos HC-SR04P (pogo + imanes)")
    redes_pin = {"1": "3V3", "2": "TRIG", "3": "ECHO", "4": "GND"}
    u_pogo = sch.simbolo("Connector_Generic", "Conn_01x04", "J1", "Pines pogo 1x4 (por debajo)",
                         "Pines_Pogo_1x04_P2.54mm", 76.2, 76.2, redes_pin)
    u_sen = sch.simbolo("Connector_Generic", "Conn_01x04", "J2", "HC-SR04P (VCC TRIG ECHO GND)",
                        "Zocalo_Sensor_1x04_P2.54mm", 127, 76.2, redes_pin)
    u_i1 = sch.simbolo("Mechanical", "MountingHole", "M1", "Imán 6x3 (S hacia abajo)", f"Iman_{IMAN_DIAM:g}mm", 76.2, 101.6, {})
    u_i2 = sch.simbolo("Mechanical", "MountingHole", "M2", "Imán 6x3 (N hacia abajo)", f"Iman_{IMAN_DIAM:g}mm", 121.92, 101.6, {})
    sch.nota("Los pines pogo caen justo encima de las plaquitas de la placa base\n(mismo orden: 3V3, TRIG, ECHO, GND).", 50.8, 127)
    sch.guardar(os.path.join(carpeta, nombre + ".kicad_sch"))

    b = nueva_placa()
    n = redes(b, ["3V3", "TRIG", "ECHO", "GND"])
    contorno(b, 0, 0, ANCHO, ALTO, 1.5)
    por_pad = {k: n[v] for k, v in redes_pin.items()}
    poner(b, "Pines_Pogo_1x04_P2.54mm", "J1", "Pogo", PX, ys[0], u_pogo, por_pad)
    poner(b, "Zocalo_Sensor_1x04_P2.54mm", "J2", "HC-SR04P", SX, ys[0], u_sen, por_pad)
    poner(b, f"Iman_{IMAN_DIAM:g}mm", "M1", "Imán", PX, CY - IMAN_DIST, u_i1, {})
    poner(b, f"Iman_{IMAN_DIAM:g}mm", "M2", "Imán", PX, CY + IMAN_DIST, u_i2, {})
    for i, k in enumerate(["1", "2", "3", "4"]):
        pista(b, por_pad[k], [(PX, ys[i]), (SX, ys[i])], ancho=0.5 if k in "14" else 0.3)
    for i, t in enumerate(["VCC", "TRIG", "ECHO", "GND"]):
        texto_placa(b, t, SX + 3.9, ys[i], alto=0.8)
    texto_placa(b, "HC-SR04P", SX + 1.5, ys[3] + 2.6, alto=0.8)
    texto_placa(b, "S", PX, CY - IMAN_DIST - 4.0 if CY - IMAN_DIST - 4.0 > 1 else 1.0, pcbnew.B_SilkS, 1.0)
    texto_placa(b, "N", PX, ALTO - 1.0, pcbnew.B_SilkS, 1.0)
    texto_placa(b, "VALENTIA", 13.0, 3.0, alto=0.8)
    texto_placa(b, "v1", 13.0, ALTO - 3.0, alto=0.8)
    ruta = os.path.join(carpeta, nombre + ".kicad_pcb")
    pcbnew.SaveBoard(ruta, b)
    return ruta


if __name__ == "__main__":
    for r in (placa_base(), modulo_ultrasonidos()):
        print("Generado:", os.path.relpath(r, AQUI))
