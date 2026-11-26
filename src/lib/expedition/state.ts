// The one frame state every expedition module reads. The controller fills it;
// modules never write to it except where noted.
import type { Direction } from "./travel";

export interface ChapterInfo {
  el: HTMLElement;
  id: string;
  title: string;
  depth: number;
  /** Scroll position at which this chapter begins for depth, route and gauge. */
  start: number;
  aim: string | null;
}

export interface Beam {
  x: number;
  y: number;
  angle: number;
  length: number;
  half: number;
  intensity: number;
}

export interface ExpeditionState {
  /** Local time and frame delta, seconds (dt is 0 for on-demand redraws). */
  t: number;
  dt: number;
  /** The visitor's real scroll position. */
  scrollY: number;
  /** The camera: scroll eased by a short, bounded lag. */
  cam: number;
  /** Camera velocity, px/s. */
  velocity: number;
  vw: number;
  vh: number;
  maxScroll: number;
  small: boolean;
  reduced: boolean;
  chapters: ChapterInfo[];
  /** Current chapter index, narrative depth (m), progress through the page (0..1). */
  index: number;
  depthM: number;
  progress: number;
  /** How dark the water is, 0..1. */
  murk: number;
  /** Diver's travel direction (written by the diver after each step). */
  dir: Direction;
  waterlineDoc: number;
  line: { x: number; y: number } | null;
  /** Sideways camera offset for parallax, px. */
  camX: number;
  /** Right edge of the content column, px: the lane starts here. */
  contentRight: number;
  /** The flashlight, written by the diver each frame. */
  beam: Beam | null;
  /** Finale, 0..1: how far the diver has settled into the logo pose. */
  finale: number;
}
