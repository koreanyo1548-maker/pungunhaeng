// Synchronous event bus (Observer). Combat code only reports what happened; 화두 (quest), 깨달음 (abilities)
// and anything added later (meta progression, endless mode, analytics) subscribe without touching combat code.
// Listeners run in registration order, so quest listeners are registered before ability listeners (see main.ts).

export interface GameEvents {
  /** a lateral step (보법) — every step, used by step-triggered abilities */
  step: { x: number };
  /** a quick left-right reversal — what the 보법 quest counts */
  zigzag: undefined;
  /** passed close to a bullet (h) or between two enemies (e) */
  graze: { x: number; y: number; h?: any; e?: any };
  /** killed an enemy right in front of the player */
  nearKill: { e: any };
  /** any non-boss kill that is not from a blast or 무아지경 */
  kill: { e: any };
  /** every 10th combo kill */
  combo10: undefined;
  /** a full row cleared without any enemy slipping past */
  rowClear: undefined;
  /** 내공 해방 (bomb) used */
  blast: { killed: number };
  /** 내공 gained (after multipliers) */
  charge: { n: number };
  /** 내공 reached its maximum */
  fullCharge: undefined;
}
export type GameEvent = keyof GameEvents;
type Listener<K extends GameEvent> = (data: GameEvents[K]) => void;

const listeners: { [K in GameEvent]?: Listener<K>[] } = {};

export function on<K extends GameEvent>(type: K, fn: Listener<K>): void {
  ((listeners[type] ??= []) as Listener<K>[]).push(fn);
}

export function emit<K extends GameEvent>(
  type: K,
  ...[data]: GameEvents[K] extends undefined ? [] : [GameEvents[K]]
): void {
  const list = listeners[type] as Listener<K>[] | undefined;
  if (list) for (const fn of list) fn(data as GameEvents[K]);
}
