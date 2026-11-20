# Project working constraints

- Preserve the currently accepted combat layout. Do not reposition, resize or redesign combat HUD, health/score/quest bars, action buttons, canvas or playfield unless the user explicitly asks for a layout change.
- Proposals do not authorize implementation: implement only what the user asked for.
- Preserve the existing gameplay rules, collision geometry, attack cadence and seeded simulation when polishing presentation, unless a gameplay change is requested.
- Keep gameplay RNG separate from effect RNG.
- For art tasks, refer to [풍운행 아트 스타일 기준](docs/art-style-reference.md) for the existing art references and in-game review criteria.
- Validate changes with typecheck, format check and builds. The browser game tests (`npm test` e2e, UI and `tests/e2e/`, `tests/equivalence/`) are run by hand only for large structural changes or when the user asks (`docs/workflow.md` section 3). Single-file sharing uses `npm run build:single`.
- Balance and game feel are judged only by the user's own play (`docs/workflow.md` section 8). Do not run the balance bot (`tests/sim/balance.mjs`, `npm run test:sim`) to judge or tune balance, and do not claim a change "feels right" from bot numbers. Apply the requested adjustment, open the PR; the user merges, plays and asks for the next adjustment.

# Shared workflow (Codex and Claude)

Both Codex and Claude work in this repository. Follow `docs/workflow.md`; the essentials:

- Mark your work: branch `codex/<topic>` or `claude/<topic>` (keep a session-assigned `ccr-…` branch), PR title prefix `[Codex]` or `[Claude]`, a commit trailer `Agent: Codex` or `Agent: Claude`, and `작업: Codex` / `작업: Claude` at the end of the PR body.
- Never push to main, and never let automation commit to main. Open PRs as drafts and follow `.github/pull_request_template.md`. The user merges.
- Add commits to the other tool's PR only when the user asks.
- Work scope (`docs/workflow.md` section 7). Codex is the graphic designer: it draws the pictures (original art, sprites, animation frames, effect sheets, icons) and converts them (`art/`, the image files in `src/assets/`, `tools/convert-webp.py` and the image profile). Claude does everything else: rules, balance, stages, 인연 and meta progression, presentation and effects and how pictures are hooked up and shown, the screen and HUD, design docs and terms, tests (`src/`, including `src/render/` and `src/styles/`, `docs/`, `tests/`, `index.html`, config). Claude asks Codex for pictures in `docs/codex-art-handoff.md`. Check the scope before starting; if a task is outside it, say so, and proceed if the user still wants it. Touch the other side minimally and list hand-offs under "남은 것".
- Done means the `PR checks` workflow (types, format, builds; 1-2 minutes) passes on the PR (`docs/workflow.md` section 3); before opening, run at least typecheck and format check. Never disable or skip a check. Cloudflare build status is not checked (the user manages it).
- Images: originals in `art/originals/` as PNG, runtime WebP via `python tools/convert-webp.py`, committed together. Do not hand-edit generated files.
- Share test builds in the conversation. Do not commit build output or create `build/…` branches.
