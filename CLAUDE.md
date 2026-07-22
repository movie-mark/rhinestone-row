# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page marketing/landing site for **Rhinestone Row**, a curated cowboy-hat boutique ("The hat is the outfit"). It is a **static site with no build step, no framework, and no dependencies** — plain HTML + CSS served as files. There is no `package.json`, no bundler, no test suite.

## Running / previewing

Serve the folder over any static HTTP server and open the root URL — relative asset paths (`assets/`, `tokens/`) and the CSS `@import` chain require HTTP, not `file://`.

For this VPS the dev-server-over-Tailscale recipe in the global CLAUDE.md still applies, but with a static server instead of a framework:

```
setsid nohup python3 -m http.server <PUERTO> --bind 127.0.0.1 >/tmp/dev-<PUERTO>.log 2>&1 &
~/tunel.sh <PUERTO>
curl -s -o /dev/null -w "%{http_code}\n" --max-time 5 http://100.64.77.65:<PUERTO>/
```

Give Juan the URL `http://100.64.77.65:<PUERTO>` (http, not https).

## Architecture

The whole site is **one page** (`index.html`) styled by a **design-token system** in `tokens/`.

- **`styles.css`** — the entry stylesheet. It does nothing but `@import` the five token files in order: `fonts → colors → typography → layout → base`. Import order matters (fonts/vars must load before `base.css` consumes them).
- **`tokens/`** — the design system, all expressed as CSS custom properties on `:root`. This is the source of truth for the brand; change values here, not inline:
  - `colors.css` — palette + **semantic tokens**. Dark context is the default on `:root`; the **`.rr-light`** class re-maps the same semantic variables (`--surface-*`, `--text-*`, `--border-*`) for light sections. To make a section light, add `class="rr-light"` — don't hardcode light colors.
  - `typography.css` — two type families: `--font-display` (Bodoni Moda, for `h1–h3`) and `--font-ui` (Archivo, for body/UI), plus the type/weight/tracking scales.
  - `layout.css` — 4px spacing scale, radii (editorial/squared, `--radius-0` = 0), shadows, and motion (`--ease-*`, `--dur-*`).
  - `base.css` — element resets and the `.rr-caps` utility (uppercase micro-label style used throughout).
  - `fonts.css` — Google Fonts `@import`.
- **Page-specific layout CSS lives in a `<style>` block inside `index.html`** (nav, hero, product grid, curation, footer). Reusable design decisions belong in `tokens/`; one-off page layout belongs in that inline block. Keep that split.
- **`assets/`** — hero image, four product photos, and `spark.svg`. The recurring `✦` "spark" motif and the `--fuchsia` accent (used sparingly, ~10% max per the palette comment) are the brand's signature.

## Conventions

- Prefer `var(--token)` over literal values; if a needed value isn't a token, consider adding one rather than hardcoding.
- Section order in `index.html`: nav → hero → `#edit` (product grid) → `#curation` (light band) → editorial quote band → footer.
- Responsive breakpoints are at the bottom of the inline `<style>`: `900px` (grid → 2 col, hide nav links, hero repositions) and `560px` (grid → 1 col, stacked CTAs).
- `.claude/` and `.DS_Store` are gitignored.
