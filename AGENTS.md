# Project working constraints

- Preserve the currently accepted combat layout. Do not reposition, resize or redesign combat HUD, health/score/quest bars, action buttons, canvas or playfield unless the user explicitly asks for a layout change.
- Current next-step scope is character/image detail, animation, feedback and VFX. Proposals do not authorize implementing new effects.
- Preserve the existing gameplay rules, collision geometry, attack cadence and seeded simulation when polishing presentation, unless a gameplay change is requested.
- Keep gameplay RNG separate from effect RNG.
- Validate relevant changes with typecheck, builds and the existing flow/UI tests. Single-file sharing uses `npm run build:single`.
