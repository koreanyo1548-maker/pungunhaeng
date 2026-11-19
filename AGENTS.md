# Project working constraints

- Preserve the currently accepted combat layout. Do not reposition, resize or redesign combat HUD, health/score/quest bars, action buttons, canvas or playfield unless the user explicitly asks for a layout change.
- Proposals do not authorize implementation: implement only what the user asked for.
- Preserve the existing gameplay rules, collision geometry, attack cadence and seeded simulation when polishing presentation, unless a gameplay change is requested.
- Keep gameplay RNG separate from effect RNG.
- For art tasks, refer to [풍운행 아트 스타일 기준](docs/art-style-reference.md) for the existing art references and in-game review criteria.
- Validate relevant changes with typecheck, builds and the existing flow/UI tests. Single-file sharing uses `npm run build:single`.

# Shared workflow (Codex and Claude)

Both Codex and Claude work in this repository. Follow `docs/workflow.md`; the essentials:

- Mark your work: branch `codex/<topic>` or `claude/<topic>` (keep a session-assigned `ccr-…` branch), PR title prefix `[Codex]` or `[Claude]`, a commit trailer `Agent: Codex` or `Agent: Claude`, and `작업: Codex` / `작업: Claude` at the end of the PR body.
- Never push to main, and never let automation commit to main. Open PRs as drafts and follow `.github/pull_request_template.md`. The user merges.
- Add commits to the other tool's PR only when the user asks.
- Work scope (`docs/workflow.md` section 7). Codex: art, sprites, animation, effects and their hookup, the image pipeline, screen presentation, build and performance (`art/`, `src/assets/`, `src/render/`, `src/styles/`, `tools/`). Claude: combat and growth rules, stages, 인연 and meta progression, balance numbers, design docs and terms, the test setup (`src/systems/`, `src/data/`, `src/scenes/`, `src/entities/`, `docs/`). Shared: `src/core/`, `src/ui/`, `tests/`, `index.html`, config. Check the scope before starting; if a task is outside it, say so, and proceed if the user still wants it. Touch the other side minimally and list hand-offs under "남은 것".
- Done means the `PR checks` workflow passes on the PR (`docs/workflow.md` section 3); before opening, run at least typecheck, format check and `npm test`. Never disable or skip a check. Cloudflare build status is not checked (the user manages it).
- Images: originals in `art/originals/` as PNG, runtime WebP via `python tools/convert-webp.py`, committed together. Do not hand-edit generated files.
- Share test builds in the conversation. Do not commit build output or create `build/…` branches.
