# CEO AI Thailand — Design System Style Guide

**Theme:** Dark Tech · Slate · Cyan · Amber  
**Font:** [Kanit](https://fonts.google.com/specimen/Kanit) (Thai + Latin) — weights 300 / 400 / 500 / 600 / 700 / 800  
**Base font size:** 14px · line-height 1.65

---

## Wrapping & Setup

Every screen must start with this root wrapper to apply the dark theme:

```jsx
<div style={{ fontFamily: "'Kanit', sans-serif", background: 'var(--cream)', color: 'var(--ink)', minHeight: '100vh' }}>
  {/* content */}
</div>
```

Load tokens via the CSS file before any components:

```html
<link rel="stylesheet" href="tokens.css" />
<link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
```

---

## Color Tokens

### Backgrounds (dark → light)
| Token | Value | Use |
|---|---|---|
| `var(--cream)` | `#020617` | Page / app background |
| `var(--cream2)` | `#0f172a` | Card, sidebar, modal |
| `var(--cream3)` | `#1e293b` | Elevated surface, input bg |

### Text
| Token | Value | Use |
|---|---|---|
| `var(--ink)` | `#f8fafc` | Primary text, headings |
| `var(--ink2)` | `#e2e8f0` | Body text |
| `var(--ink3)` | `#94a3b8` | Muted / label / meta |
| `var(--ink4)` | `#64748b` | Placeholder, caption, disabled |

### Borders
| Token | Value | Use |
|---|---|---|
| `var(--sand)` | `#334155` | Default border / divider |

### Accent Colors
| Token | Value | Bg Token | Use |
|---|---|---|---|
| `var(--rust)` | `#06b6d4` | `var(--rust-bg)` | Primary CTA, active state, link |
| `var(--green)` | `#10b981` | `var(--green-bg)` | Success, done, positive metric |
| `var(--blue)` | `#3b82f6` | `var(--blue-bg)` | Info, secondary action |
| `var(--amber)` | `#f59e0b` | `var(--amber-bg)` | Warning, highlight, badge |

> **Note:** `--rust` is **cyan** (`#06b6d4`), not actual rust-red. The variable name is a legacy alias — always use cyan as the primary brand color.

---

## Shape & Shadow

```css
--r:        8px;   /* card, button, input */
--r-lg:     14px;  /* modal, large card */
--shadow-sm: 0 1px 3px rgba(0,0,0,.30), 0 1px 2px rgba(0,0,0,.20);
--shadow:    0 4px 12px rgba(0,0,0,.40), 0 1px 3px rgba(0,0,0,.25);
```

---

## Typography Scale

| Role | Size | Weight | Color |
|---|---|---|---|
| Page title | 22–26px | 800 | `var(--ink)` |
| Section heading | 16–18px | 700 | `var(--ink)` |
| Card title | 14–15px | 700 | `var(--ink)` |
| Body / label | 13–14px | 400–500 | `var(--ink2)` |
| Meta / caption | 11–12px | 400 | `var(--ink3)` |
| Eyebrow / tag | 10–11px | 700, uppercase, letter-spacing .08em | `var(--ink4)` |

---

## Component Patterns

### Card
```jsx
<div style={{
  background: 'var(--cream3)',
  border: '1px solid var(--sand)',
  borderRadius: 'var(--r)',
  padding: '16px 20px',
  boxShadow: 'var(--shadow-sm)',
}}>
  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink4)', marginBottom: 8 }}>
    Label
  </div>
  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)' }}>Value</div>
  <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 4 }}>Description</div>
</div>
```

### Primary Button (Cyan)
```jsx
<button style={{
  background: 'var(--rust)',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--r)',
  padding: '10px 20px',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "'Kanit', sans-serif",
  cursor: 'pointer',
  minHeight: 44,
}}>
  ดำเนินการ
</button>
```

### Ghost Button (Outlined)
```jsx
<button style={{
  background: 'transparent',
  color: 'var(--rust)',
  border: '1px solid var(--rust)',
  borderRadius: 'var(--r)',
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "'Kanit', sans-serif",
  cursor: 'pointer',
}}>
  ดูเพิ่มเติม
</button>
```

### Status Badge
```jsx
// Green = success
<span style={{ background: 'var(--green-bg)', color: 'var(--green)', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
  ✓ เสร็จแล้ว
</span>

// Amber = warning
<span style={{ background: 'var(--amber-bg)', color: 'var(--amber)', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
  ⚠ รอดำเนินการ
</span>

// Cyan = active / info
<span style={{ background: 'var(--rust-bg)', color: 'var(--rust)', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
  ✦ AI Powered
</span>
```

### Data Table Row
```jsx
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--sand)' }}>
  <span style={{ fontSize: 13, color: 'var(--ink2)' }}>ชื่อรายการ</span>
  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>ค่า</span>
</div>
```

### Section Header (Page Title Pattern)
```jsx
<div style={{ marginBottom: 24 }}>
  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>
    ชื่อหน้า
  </div>
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
    <span style={{ background: 'var(--cream3)', border: '1px solid var(--sand)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: 'var(--ink3)' }}>
      meta chip
    </span>
    <span style={{ background: 'var(--rust-bg)', border: '1px solid rgba(6,182,212,.2)', color: 'var(--rust)', borderRadius: 20, padding: '4px 12px', fontSize: 12 }}>
      ✦ AI Powered
    </span>
  </div>
</div>
```

---

## Layout Conventions

- **App shell:** Sidebar (230px fixed left) + Main content (margin-left: 230px)
- **Main padding:** `40px` desktop, `16px` mobile
- **Grid system:** CSS Grid, typically 2–4 columns at desktop, 1 column at mobile (≤700px)
- **Card gap:** 12–16px
- **Mobile breakpoint:** `700px`

---

## AI / Accent Motifs

The design uses `✦` (✦ U+2726) as the AI/brand spark symbol throughout.

```jsx
<span style={{ color: 'var(--rust)' }}>✦</span> AI Agent
```

Dark-on-dark gradient for AI panels:
```css
background: linear-gradient(135deg, rgba(6,182,212,.06), rgba(245,158,11,.06));
border: 1px solid rgba(6,182,212,.2);
```
