import type { CSSProperties, ReactNode } from "react";
import { PIEZAS_ROBOT, type PiezaRobot } from "./piezasRobot";

/**
 * Robot de la portada dibujado en SVG (versión ligera, sin 3D).
 * Se ve en móviles, en equipos poco potentes, con "reducir movimiento" y mientras carga el 3D.
 * Cada pieza se separa según la variable CSS --e (0 = montado, 1 = despiezado), que pone
 * PortadaRobot al hacer scroll. Sin JavaScript se ve montado.
 */
export function RobotEstatico({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 640 420"
      role="img"
      aria-label="Ilustración de un robot con ruedas formado por chasis, placa, motores, sensores y batería"
      className={className}
    >
      <ellipse cx="320" cy="372" rx="230" ry="18" fill="#0b0b0b" opacity="0.08" />

      <Pieza id="chasis">
        <rect x="110" y="236" width="400" height="34" rx="12" fill="#1a1a1a" />
        <circle cx="455" cy="286" r="13" fill="#6b6b6b" />
      </Pieza>

      <Pieza id="motores">
        <rect x="150" y="266" width="80" height="26" rx="6" fill="#b9bcc4" />
        <circle cx="190" cy="300" r="64" fill="#0b0b0b" />
        <circle cx="190" cy="300" r="30" fill="#f4f4f2" />
        <circle cx="190" cy="300" r="9" fill="#6b6b6b" />
      </Pieza>

      <Pieza id="placa">
        <rect x="245" y="204" width="180" height="16" rx="4" fill="#2d4bff" />
        <rect x="305" y="190" width="50" height="15" rx="3" fill="#0b0b0b" />
        {Array.from({ length: 9 }, (_, i) => (
          <rect key={i} x={256 + i * 9} y="196" width="5" height="9" rx="1" fill="#d8b65a" />
        ))}
      </Pieza>

      <Pieza id="sensores">
        <rect x="508" y="188" width="14" height="70" rx="4" fill="#2d4bff" />
        <circle cx="537" cy="206" r="15" fill="#dadde3" stroke="#6b6b6b" strokeWidth="2" />
        <circle cx="537" cy="240" r="15" fill="#dadde3" stroke="#6b6b6b" strokeWidth="2" />
        <rect x="410" y="270" width="64" height="8" rx="3" fill="#0b0b0b" />
      </Pieza>

      <Pieza id="bateria">
        <line x1="152" y1="186" x2="152" y2="122" stroke="#0b0b0b" strokeWidth="4" />
        <circle cx="152" cy="116" r="10" fill="#7a8cff" />
        <rect x="128" y="184" width="104" height="52" rx="10" fill="#f4f4f2" stroke="#d9d9d6" />
        <rect x="128" y="184" width="104" height="11" rx="5" fill="#7a8cff" />
      </Pieza>
    </svg>
  );
}

function Pieza({ id, children }: { id: PiezaRobot["id"]; children: ReactNode }) {
  const pieza = PIEZAS_ROBOT.find((p) => p.id === id)!;
  const [dx, dy] = pieza.direccion2d;
  return (
    <g className="pieza-robot" data-pieza={id} style={{ "--dx": dx, "--dy": dy } as CSSProperties}>
      {children}
    </g>
  );
}
