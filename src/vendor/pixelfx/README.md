# pixelfx (vendored)

Pinned copy of https://github.com/patch-gg/pixelfx at commit `a841596` (v0.3.0, 2026-10-31), MIT.
See `LICENSE` and `NOTICE.md`. Only `src/core` and the effects listed in `effects.js` (plus their
category `_lib.js`) are copied. Files are unmodified except `core/painter.js`, where `glow`, `glowLine` and
`glowRing` clip their loops to the frame (and `glow` inlines `add`); marked `[pungunhaeng patch]`, same output. The gallery and its Patch Pixel font are not included.

To add an effect: copy `src/fx/<category>/<name>.js` (and that category's `_lib.js` if missing) from the same
commit, then register it in `effects.js`. Used by `src/render/pfx.ts`.
