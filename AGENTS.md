# Project working constraints

- Preserve the currently accepted combat layout. Do not reposition, resize or redesign combat HUD, health/score/quest bars, action buttons, canvas or playfield unless the user explicitly asks for a layout change.
- Current next-step scope is character/image detail, animation, feedback and VFX. Proposals do not authorize implementing new effects.
- Preserve the existing gameplay rules, collision geometry, attack cadence and seeded simulation when polishing presentation, unless a gameplay change is requested.
- Keep gameplay RNG separate from effect RNG.
- Validate relevant changes with typecheck, builds and the existing flow/UI tests. Single-file sharing uses `npm run build:single`.

# Shared workflow (Codex and Claude)

Both Codex and Claude work in this repository. Follow `docs/workflow.md`; the essentials:

- Mark your work: branch `codex/<topic>` or `claude/<topic>` (keep a session-assigned `ccr-…` branch), PR title prefix `[Codex]` or `[Claude]`, a commit trailer `Agent: Codex` or `Agent: Claude`, and `작업: Codex` / `작업: Claude` at the end of the PR body.
- Never push to main, and never let automation commit to main. Open PRs as drafts and follow `.github/pull_request_template.md`. The user merges.
- Add commits to the other tool's PR only when the user asks.
- Done means the checks in `docs/workflow.md` section 3 ran, with the commands and results written in the PR. Cloudflare build status is not checked (the user manages it).
- Share test builds in the conversation. Do not commit build output or create `build/…` branches.
