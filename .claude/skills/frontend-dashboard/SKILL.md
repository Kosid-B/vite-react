---
name: frontend-dashboard
description: Build polished, production-ready dashboard and web-app UIs with a consistent visual style. Provides ready-to-use style presets (Clean Minimal, Dark Pro, Soft Pastel, Bold Data), design tokens, layout scaffolds, and component patterns for cards, charts, tables, and KPI metrics. Use this skill whenever the user wants to build a dashboard, admin panel, analytics view, internal tool, KPI/metrics screen, or any data-heavy web-app interface — even if they don't say the word "dashboard." Trigger on requests like "make an admin panel", "build a metrics screen", "I need a clean web app UI", "style my dashboard", or when the user picks a visual direction (minimal / dark / playful / bold) for a web app.
---

# Frontend Dashboard

A skill for building dashboard and web-app interfaces that look intentional and production-ready instead of templated. It pairs a small set of opinionated **style presets** with reusable layout and component patterns, so every screen shares one coherent visual language.

The goal is not "a chart on a gray background." The goal is a UI a real product team would ship: a clear information hierarchy, restrained color, type that does work, and components that stay consistent across the whole app.

## How to use this skill

1. **Pick (or confirm) a style preset.** If the user already named a direction (minimal, dark, playful, bold), map it to the preset below. If not, ask once which vibe fits, then commit.
2. **Lay down the design tokens first.** Copy the chosen preset's token block into `:root` before writing any component. Every color, radius, and shadow comes from a token — never a raw hex in markup.
3. **Build with the layout scaffold**, then drop in the component patterns (KPI cards, data tables, charts, filters).
4. **Run the quality checklist** at the end before calling it done.

Keep the boldness in ONE place (usually the accent color or the hero metric) and keep everything else quiet. A dashboard's job is legibility under density.

---

## Style presets

Each preset is a complete token set. Use exactly one per app. Don't mix accent systems.

### 1. Clean Minimal — "Linear / Vercel"
Calm, high-legibility, slightly cool. The default for serious B2B data tools.

```css
:root {
  --bg:        #FAFAFA;
  --surface:   #FFFFFF;
  --border:    #E5E7EB;
  --text:      #111827;
  --text-soft: #6B7280;
  --accent:    #4F46E5;   /* indigo, used sparingly */
  --accent-soft:#EEF2FF;
  --positive:  #16A34A;
  --negative:  #DC2626;
  --radius:    10px;
  --shadow:    0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.10);
  --font-ui:   "Inter", system-ui, sans-serif;
  --font-num:  "Inter", ui-monospace, monospace; /* tabular numerals */
}
```
Signature: hairline borders + one indigo accent. No gradients, no heavy shadows.

### 2. Dark Pro — "Supabase / GitHub dark"
For technical users staring at the screen for hours. High contrast, low glare.

```css
:root {
  --bg:        #0D1117;
  --surface:   #161B22;
  --border:    #30363D;
  --text:      #E6EDF3;
  --text-soft: #8B949E;
  --accent:    #3FB950;   /* neon-ish green */
  --accent-soft:#10301A;
  --positive:  #3FB950;
  --negative:  #F85149;
  --radius:    8px;
  --shadow:    0 0 0 1px rgba(255,255,255,.02), 0 8px 24px rgba(0,0,0,.4);
  --font-ui:   "Inter", system-ui, sans-serif;
  --font-num:  ui-monospace, "SF Mono", monospace;
}
```
Signature: glowing accent on a near-black field; monospace for all numbers.

### 3. Soft Pastel — "consumer / friendly SaaS"
Warmer and rounder. For dashboards aimed at non-technical end users.

```css
:root {
  --bg:        #F7F6FB;
  --surface:   #FFFFFF;
  --border:    #ECE9F5;
  --text:      #2A2540;
  --text-soft: #7B7595;
  --accent:    #7C5CFC;   /* soft violet */
  --accent-soft:#F0ECFF;
  --positive:  #2BB673;
  --negative:  #F2557A;
  --radius:    16px;
  --shadow:    0 4px 16px rgba(124,92,252,.10);
  --font-ui:   "Plus Jakarta Sans", system-ui, sans-serif;
  --font-num:  "Plus Jakarta Sans", sans-serif;
}
```
Signature: large radius (16px), soft violet shadow, generous whitespace.

### 4. Bold Data — "Stripe / fintech"
Numbers are the hero. Big metrics, confident weights, accent gradients on key figures only.

```css
:root {
  --bg:        #FFFFFF;
  --surface:   #FFFFFF;
  --border:    #EAECEF;
  --text:      #0A2540;
  --text-soft: #687385;
  --accent:    #635BFF;
  --accent-grad: linear-gradient(135deg,#635BFF,#00D4FF);
  --accent-soft:#F0F0FF;
  --positive:  #00A656;
  --negative:  #DF1B41;
  --radius:    12px;
  --shadow:    0 2px 5px rgba(60,66,87,.08), 0 1px 1px rgba(0,0,0,.05);
  --font-ui:   "Inter", system-ui, sans-serif;
  --font-num:  "Inter", sans-serif;
  --metric-size: clamp(28px, 4vw, 44px);
}
```
Signature: oversized bold metrics; gradient reserved for the single most important number.

---

## Layout scaffold

Almost every dashboard is: a sidebar, a top bar, then a content grid. Use this shell for all four presets — only the tokens change.

```
┌──────┬───────────────────────────────────────────┐
│      │  Top bar:  page title · search · user      │
│ Side ├───────────────────────────────────────────┤
│ nav  │  [KPI] [KPI] [KPI] [KPI]   ← metric row    │
│      │  ┌─────────────────┐ ┌──────────────────┐  │
│ logo │  │   chart (2/3)   │ │   list / chart   │  │
│ ...  │  └─────────────────┘ └──────────────────┘  │
│      │  ┌───────────────────────────────────────┐ │
│      │  │            data table                  │ │
│      │  └───────────────────────────────────────┘ │
└──────┴───────────────────────────────────────────┘
```

Rules that keep it from looking generic:
- **One content max-width** (~1280px) so the grid doesn't sprawl on wide screens.
- **8px spacing scale** only: 8 / 16 / 24 / 32. Never eyeball margins.
- **KPI row uses CSS grid** with `repeat(auto-fit, minmax(220px, 1fr))` so it reflows cleanly.
- Sidebar collapses to icons (or a drawer) below ~960px; the grid stacks to one column on mobile.

```css
.app { display:grid; grid-template-columns: 240px 1fr; min-height:100vh; background:var(--bg); }
.content { max-width:1280px; margin-inline:auto; padding:24px; display:flex; flex-direction:column; gap:24px; }
.kpi-row { display:grid; gap:16px; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); }
@media (max-width:960px){ .app{ grid-template-columns:1fr; } }
```

---

## Component patterns

### KPI / metric card
The most-copied component in dashboards, and the most often done badly. A good one shows: label, the number, and a signed delta with direction color.

```html
<div class="card kpi">
  <span class="kpi-label">Monthly revenue</span>
  <span class="kpi-value">$128,400</span>
  <span class="kpi-delta up">▲ 12.4% vs last month</span>
</div>
```
```css
.card { background:var(--surface); border:1px solid var(--border);
        border-radius:var(--radius); box-shadow:var(--shadow); padding:20px; }
.kpi { display:flex; flex-direction:column; gap:6px; }
.kpi-label { color:var(--text-soft); font-size:13px; }
.kpi-value { font:600 var(--metric-size,28px)/1 var(--font-num);
             color:var(--text); font-variant-numeric:tabular-nums; }
.kpi-delta { font-size:12px; }
.kpi-delta.up   { color:var(--positive); }
.kpi-delta.down { color:var(--negative); }
```
- Always use **tabular numerals** (`font-variant-numeric: tabular-nums`) so figures don't jitter.
- Delta color encodes meaning — green up / red down — never decorative.

### Data table
Dense but scannable. Right-align numbers, left-align text, sticky header, zebra optional.

```css
.table { width:100%; border-collapse:collapse; font-size:14px; }
.table th { text-align:left; color:var(--text-soft); font-weight:500;
            padding:10px 12px; border-bottom:1px solid var(--border);
            position:sticky; top:0; background:var(--surface); }
.table td { padding:12px; border-bottom:1px solid var(--border); color:var(--text); }
.table td.num { text-align:right; font-variant-numeric:tabular-nums; }
.table tr:hover td { background:var(--accent-soft); }
```
- Row height ≥ 44px for comfortable scanning and touch.
- Status uses a **pill**, not raw text: small radius, `--accent-soft` background, accent text.

### Charts
Don't ship default library colors. Drive every chart series from the token palette:
- Primary series → `--accent`. Secondary → `--text-soft`. Positive/negative → the delta tokens.
- Grid lines → `--border` at low opacity. Axis labels → `--text-soft`, small.
- No 3D, no drop shadows on bars, no rainbow categorical scales for ordered data.

### Buttons & inputs
- Primary button: `--accent` fill, white text, `--radius`. One primary action per view.
- Secondary: surface fill, `--border` outline. Ghost: text-only in `--accent`.
- Inputs: `--surface` fill, `--border`, focus ring in `--accent` (visible, ≥2px).
- Button copy says the outcome: "Save changes", "Export CSV" — never "Submit".

---

## Writing the UI copy

Copy makes a dashboard feel as templated as the visuals do. Keep it from the user's side of the screen:
- Name things by what the user controls ("Notifications"), not the system ("webhook config").
- Empty states are an invitation to act, with a clear next step — not just "No data".
- Errors say what happened and how to fix it, in plain words, no apology.
- Sentence case everywhere; consistent verbs across the flow (a "Publish" button yields a "Published" toast).

---

## Quality checklist

Before delivering, confirm:
- [ ] All colors, radii, shadows come from tokens — no stray hex in markup.
- [ ] One accent system; boldness spent in a single place.
- [ ] Numbers use tabular numerals; deltas are color-coded by direction.
- [ ] 8px spacing scale held throughout; content has a max-width.
- [ ] Responsive: sidebar collapses, grid stacks to one column on mobile.
- [ ] Visible keyboard focus on every interactive element.
- [ ] `prefers-reduced-motion` respected for any transitions.
- [ ] Contrast passes (text vs surface ≥ 4.5:1; check the dark preset especially).

---

## Choosing a preset (quick guide)

| If the product is… | Use |
|---|---|
| A serious B2B / internal analytics tool | Clean Minimal |
| A developer or technical / monitoring tool | Dark Pro |
| A consumer-facing or friendly app | Soft Pastel |
| Finance / metrics where numbers must dominate | Bold Data |

When unsure, default to **Clean Minimal** — it's the safest, most legible base and easiest to re-skin later.
