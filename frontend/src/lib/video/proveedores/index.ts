/**
 * Servicios de vídeo que admite Valentia.
 * Para añadir otro (por ejemplo, Wistia o Bunny Stream): crea su archivo junto a estos,
 * siguiendo el formato de ../tipos.ts, y añádelo a esta lista.
 */
import type { ProveedorVideo } from "../tipos";
import { vimeo } from "./vimeo";
import { youtube } from "./youtube";

export const proveedoresVideo: ProveedorVideo[] = [youtube, vimeo];
