/** Synchronous ownership of effects/projectiles; nested triggers restore their caller. */
export let visualSkill: string | undefined;
export function withSkill<T>(id: string | undefined, fn: () => T): T {
  const previous = visualSkill;
  visualSkill = id;
  try {
    return fn();
  } finally {
    visualSkill = previous;
  }
}
