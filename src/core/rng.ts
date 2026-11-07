// Seeded random numbers (mulberry32). Every run gets a seed; the same seed and the same inputs replay the same run.
// Two independent streams:
//   random()   — gameplay: spawns, drops, 인연/돈오 picks, skill targets. Reproducible from the run seed.
//   fxRandom() — cosmetic only: particles, screen shake, audio noise. How many frames are drawn or how many
//                particles are spawned never shifts a gameplay roll (e.g. 60 Hz vs 120 Hz displays).
// A seed can be forced with #seed=<number> in the URL (works with #debug too: #debug&seed=42).

export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let game = mulberry32(1);
let fx = mulberry32(2);
export let runSeed = 0;

function pickSeed(): number {
  const forced = /[#&]seed=(\d+)/.exec(location.hash);
  if (forced) return Number(forced[1]) >>> 0;
  return (Math.random() * 4294967296) >>> 0;
}

/** Starts the random streams for a new run. Returns the seed so it can be shown or logged. */
export function seedRun(seed: number = pickSeed()): number {
  runSeed = seed >>> 0;
  game = mulberry32(runSeed);
  fx = mulberry32(runSeed ^ 0x9e3779b9);
  return runSeed;
}

export const random = (): number => game();
export const fxRandom = (): number => fx();
