# Theme context

## Compact token summary

### Existing palette

| Token | Value | Current role |
|---|---|---|
| `--bg` | `#1a1428` | Deep violet page |
| `--bg2` | `#2a1f3d` | Secondary violet |
| `--panel` | `#352650` | Panel surface |
| `--panel-border` | `#6b4f9a` | Purple border |
| `--text` | `#f5f0ff` | Primary text |
| `--muted` | `#b8a8d4` | Secondary text |
| `--accent` | `#ffd76a` | Gold action |
| `--accent2` | `#7ee0c8` | Teal accent |
| `--danger` | `#ff6b8a` | Damage/destructive |
| `--ok` | `#7dffb3` | Success |
| `--card` | `#4a3570` | Generic card |
| `--card-attack` | `#6b3a5a` | Attack card |
| `--card-block` | `#3a5a6b` | Block card |
| `--card-skill` | `#3a6b4a` | Skill card |

### Existing geometry and typography

- Font stack: system UI, PingFang TC, Microsoft JhengHei, sans-serif.
- Radius: `16px`; buttons use `14px`.
- Shadow: `0 8px 24px rgba(0,0,0,.35)`.
- Primary tap size: `64px`.
- Centered app max width: `720px`.
- App outer spacing: `12px` plus safe-area insets.
- Type uses `rem` and `clamp`; major title reaches `3.4rem`.

### Responsive contracts

- Phone layout JS/CSS: width `≤600px`, or landscape height `≤500px`.
- Additional CSS breakpoints: 340, 600, 620, 800, and portrait 900 widths.
- Short-height adjustments: 700 and 760; landscape-specific compaction at 500.
- Required families: 1024×768, 768×1024, 360×640, 390×844, 640×360, 844×390, and 1280×720.
- `prefers-reduced-motion: reduce` disables nonessential transitions and animations.

## Raw global token source — `src/styles/main.css`

The production stylesheet is 6,216 lines. Per Superdesign’s payload rule for stylesheets over 900 lines, the complete global token block and breakpoint inventory are duplicated here; the stylesheet remains the canonical raw source.

```css
:root {
  --bg: #1a1428;
  --bg2: #2a1f3d;
  --panel: #352650;
  --panel-border: #6b4f9a;
  --text: #f5f0ff;
  --muted: #b8a8d4;
  --accent: #ffd76a;
  --accent2: #7ee0c8;
  --danger: #ff6b8a;
  --ok: #7dffb3;
  --card: #4a3570;
  --card-attack: #6b3a5a;
  --card-block: #3a5a6b;
  --card-skill: #3a6b4a;
  --shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  --radius: 16px;
  --tap: 64px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'PingFang TC',
    'Microsoft JhengHei', sans-serif;
}

* {
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

html,
body {
  margin: 0;
  min-height: 100%;
  background: radial-gradient(ellipse at top, #3d2a5c 0%, var(--bg) 55%);
  color: var(--text);
}

#app {
  min-height: 100dvh;
  max-width: 720px;
  margin: 0 auto;
  padding: 12px;
  padding-top: max(12px, env(safe-area-inset-top));
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  padding-left: max(12px, env(safe-area-inset-left));
  padding-right: max(12px, env(safe-area-inset-right));
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-x: hidden;
}
```

Breakpoint inventory in the canonical file:

```css
@media (max-height: 700px) { ... }
@media (max-width: 620px) { ... }
@media (orientation: landscape) { ... }
@media (orientation: portrait) and (max-width: 900px) { ... }
@media (max-height: 760px) and (orientation: landscape) { ... }
@media (prefers-reduced-motion: reduce) { ... }
@media (max-width: 600px), (max-height: 500px) and (orientation: landscape) { ... }
@media (max-width: 600px) and (orientation: portrait) { ... }
@media (max-height: 500px) and (orientation: landscape) { ... }
@media (max-width: 340px) { ... }
@media (max-width: 800px) { ... }
```
