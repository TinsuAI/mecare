# Brand Guideline — MeCare Sales Kit for Nhà Thuốc Trúc Tâm

## Overview

**Product**: Ngọc — AI Zalo Assistant for Pharmacy Customer Care (by MeCare)
**Client**: Nhà Thuốc Trúc Tâm
**Purpose**: Sales kit website sent directly to the pharmacy owner to convince them to adopt the AI system
**Audience**: Vietnamese pharmacy owner / manager
**Design Philosophy**: Clean, modern, minimal — healthcare trust meets friendly technology. Not a cold corporate feel, but warm and approachable. Vietnamese context-aware.

---

## 1. Color Palette

All colors defined as HEX. CSS variable names match `/css/design-system.css`.

### Primary Colors

| Name | HEX | CSS Variable | Usage |
|---|---|---|---|
| Primary | `#0E9E8E` | `--color-primary` | Main brand color — teal-green. CTAs, links, highlights |
| Primary Dark | `#0B7D70` | `--color-primary-dark` | Hover states, active states |
| Primary Light | `#D6F2EF` | `--color-primary-light` | Backgrounds, subtle highlights, badges |
| Primary Muted | `#E8F7F6` | `--color-primary-muted` | Section backgrounds, card accents |

**Rationale**: Teal conveys health, trust, and freshness — used widely in pharmacy and medical brands in Southeast Asia. It also reads as "tech-forward" without being cold like pure blue.

### Secondary / Accent Colors

| Name | HEX | CSS Variable | Usage |
|---|---|---|---|
| Secondary | `#F59E0B` | `--color-secondary` | Warm amber — emphasis, highlights, callouts |
| Secondary Dark | `#D97706` | `--color-secondary-dark` | Hover states for amber elements |
| Secondary Light | `#FEF3C7` | `--color-secondary-light` | Warning backgrounds, feature callout cards |

**Rationale**: Warm amber creates a sense of energy, attention, and human warmth. It pairs naturally with teal and doesn't compete with healthcare greens.

### Background Colors

| Name | HEX | CSS Variable | Usage |
|---|---|---|---|
| Background | `#F7F9FB` | `--color-bg` | Page background — off-white, not pure white |
| Background Alt | `#EEF2F7` | `--color-bg-alt` | Alternating section backgrounds |
| White | `#FFFFFF` | `--color-white` | Cards, nav, content areas |
| Dark | `#0F1923` | `--color-dark` | Footer background, dark sections |

### Text Colors

| Name | HEX | CSS Variable | Usage |
|---|---|---|---|
| Text Primary | `#1A2332` | `--color-text` | Main body text — near-black, not pure black |
| Text Secondary | `#4A5568` | `--color-text-secondary` | Subtext, descriptions |
| Text Muted | `#8896A7` | `--color-text-muted` | Captions, labels, meta info |
| Text Light | `#B0BCC8` | `--color-text-light` | Placeholder text |
| Text White | `#FFFFFF` | `--color-text-white` | Text on dark backgrounds |

### Status Colors

| Name | HEX | CSS Variable | Usage |
|---|---|---|---|
| Success | `#16A34A` | `--color-success` | Positive metrics, checkmarks |
| Success Light | `#DCFCE7` | `--color-success-light` | Success badge backgrounds |
| Warning | `#F59E0B` | `--color-warning` | Same as secondary — warnings, alerts |
| Warning Light | `#FEF3C7` | `--color-warning-light` | Warning badge backgrounds |
| Error | `#DC2626` | `--color-error` | Error states (use sparingly) |
| Error Light | `#FEE2E2` | `--color-error-light` | Error badge backgrounds |

### Border Colors

| Name | HEX | CSS Variable | Usage |
|---|---|---|---|
| Border | `#E2E8F0` | `--color-border` | Default borders, dividers |
| Border Strong | `#CBD5E1` | `--color-border-strong` | Emphasized borders |

---

## 2. Typography

### Fonts

**Heading Font**: **Plus Jakarta Sans** (Google Fonts)
- Modern, geometric, highly legible
- Has good Vietnamese diacritic support
- Feels contemporary and tech-forward while remaining warm
- Weights: 400, 500, 600, 700, 800

**Body Font**: **Inter** (Google Fonts)
- Industry standard for UI/product text
- Excellent readability at small sizes
- Perfect Vietnamese character support
- Weights: 400, 500, 600

**Google Fonts Import URL**:
```
https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap
```

### Font Scale

| Size Name | CSS Variable | Pixel Value | Usage |
|---|---|---|---|
| xs | `--text-xs` | 12px | Captions, labels, footnotes |
| sm | `--text-sm` | 14px | Small body text, secondary content |
| base | `--text-base` | 16px | Default body text |
| lg | `--text-lg` | 18px | Lead paragraphs, emphasized body |
| xl | `--text-xl` | 20px | Large body, small headings |
| 2xl | `--text-2xl` | 24px | Section subheadings |
| 3xl | `--text-3xl` | 30px | Section headings |
| 4xl | `--text-4xl` | 36px | Page headings |
| 5xl | `--text-5xl` | 48px | Hero titles |
| 6xl | `--text-6xl` | 60px | Large display numbers (stats) |

### Line Heights

| Name | CSS Variable | Value | Usage |
|---|---|---|---|
| tight | `--leading-tight` | 1.2 | Headings, display text |
| snug | `--leading-snug` | 1.35 | Subheadings |
| normal | `--leading-normal` | 1.6 | Body text |
| relaxed | `--leading-relaxed` | 1.75 | Long-form reading |

### Font Weights

| Name | CSS Variable | Value |
|---|---|---|
| normal | `--font-normal` | 400 |
| medium | `--font-medium` | 500 |
| semibold | `--font-semibold` | 600 |
| bold | `--font-bold` | 700 |
| extrabold | `--font-extrabold` | 800 |

---

## 3. Spacing System

Base unit: **4px**

| Token | CSS Variable | Value | Usage |
|---|---|---|---|
| 1 | `--space-1` | 4px | Tight inline spacing |
| 2 | `--space-2` | 8px | Small gaps between related elements |
| 3 | `--space-3` | 12px | Inner card padding (small) |
| 4 | `--space-4` | 16px | Standard padding, grid gap |
| 5 | `--space-5` | 20px | Medium spacing |
| 6 | `--space-6` | 24px | Card padding, section inner padding |
| 8 | `--space-8` | 32px | Large card padding |
| 10 | `--space-10` | 40px | Section inner spacing |
| 12 | `--space-12` | 48px | Mobile section padding |
| 16 | `--space-16` | 64px | Large section gaps |
| 20 | `--space-20` | 80px | Desktop section padding |
| 24 | `--space-24` | 96px | Major section separators |
| 32 | `--space-32` | 128px | Very large layout gaps |

---

## 4. Border Radius

| Name | CSS Variable | Value | Usage |
|---|---|---|---|
| sm | `--radius-sm` | 4px | Small elements, badges |
| md | `--radius-md` | 8px | Buttons, inputs, small cards |
| lg | `--radius-lg` | 12px | Cards, modals |
| xl | `--radius-xl` | 16px | Large cards, hero elements |
| 2xl | `--radius-2xl` | 24px | Feature cards, image containers |
| full | `--radius-full` | 9999px | Pills, avatar circles, tags |

---

## 5. Shadows

| Name | CSS Variable | Value | Usage |
|---|---|---|---|
| sm | `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)` | Subtle depth, inputs |
| md | `--shadow-md` | `0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.06)` | Cards, dropdowns |
| lg | `--shadow-lg` | `0 10px 30px rgba(0,0,0,0.10), 0 4px 10px rgba(0,0,0,0.06)` | Elevated cards, popovers |
| xl | `--shadow-xl` | `0 20px 50px rgba(0,0,0,0.12), 0 8px 20px rgba(0,0,0,0.08)` | Modals, highlighted cards |
| primary | `--shadow-primary` | `0 4px 20px rgba(14,158,142,0.25)` | Primary CTA buttons, brand elements |

---

## 6. Transitions

| Name | CSS Variable | Value |
|---|---|---|
| fast | `--transition-fast` | `150ms ease` |
| base | `--transition-base` | `250ms ease` |
| slow | `--transition-slow` | `400ms ease` |

---

## 7. Component Styles

### Buttons

**Primary Button** (`.btn-primary`):
- Background: `--color-primary`
- Text: white
- Border-radius: `--radius-md`
- Padding: 12px 24px
- Font: semibold, 16px
- Hover: background `--color-primary-dark`, shadow `--shadow-primary`
- Transition: all 250ms ease

**Secondary Button** (`.btn-secondary`):
- Background: transparent
- Border: 2px solid `--color-primary`
- Text: `--color-primary`
- Hover: background `--color-primary-muted`

**Ghost Button** (`.btn-ghost`):
- Background: transparent
- Text: `--color-text-secondary`
- No border
- Hover: text `--color-primary`, background `--color-primary-muted` subtle

**Large Button** (`.btn-lg`):
- Padding: 16px 32px
- Font size: 18px

**Small Button** (`.btn-sm`):
- Padding: 8px 16px
- Font size: 14px

### Cards

**Base Card** (`.card`):
- Background: white
- Border: 1px solid `--color-border`
- Border-radius: `--radius-lg`
- Shadow: `--shadow-md`
- Padding: `--space-6` (24px)

**Hover Card** (`.card-hover`):
- Adds `transform: translateY(-4px)` and `--shadow-lg` on hover
- Transition: all 250ms ease

**Feature Card** — same as card but with a colored top border (3px solid `--color-primary`) on left side or top.

### Badges / Tags

**Base Badge** (`.badge`):
- Display: inline-flex
- Padding: 4px 10px
- Border-radius: `--radius-full`
- Font: semibold, 12px (xs)
- Uppercase or sentence case depending on context

**Badge Variants**:
- `.badge-primary` — bg `--color-primary-light`, text `--color-primary`
- `.badge-secondary` — bg `--color-secondary-light`, text `--color-secondary-dark`
- `.badge-success` — bg `--color-success-light`, text `--color-success`
- `.badge-warning` — bg `--color-warning-light`, text `--color-secondary-dark`
- `.badge-muted` — bg `--color-bg-alt`, text `--color-text-muted`

**Tags** (`.tag`):
- Similar to badge but slightly larger
- Used for customer segment labels (e.g., "Khách mua định kỳ", "Khách cần tư vấn")
- Padding: 6px 14px, rounded-full

### Icons

Use **Phosphor Icons** via CDN:
```html
<script src="https://unpkg.com/@phosphor-icons/web@2.1.1/src/index.js"></script>
```

Icon sizes:
- Small: 16px (`--icon-sm`)
- Base: 20px (`--icon-base`)
- Medium: 24px (`--icon-md`)
- Large: 32px (`--icon-lg`)
- XL: 48px (`--icon-xl`)

Feature icons should be displayed in a circular container:
- 56px × 56px circle
- Background: `--color-primary-light`
- Color: `--color-primary`
- Border-radius: `--radius-full`

---

## 8. Visual Style Guidelines

### General Principles

1. **Clean and airy** — generous whitespace, never crowded
2. **Hierarchy through size** — use font scale and weight to create clear reading order, not color alone
3. **Icons over stock photos** — use Phosphor Icons + simple illustrations, avoid stock photography
4. **Numbers prominently** — stats and metrics should be the visual anchor of each section
5. **Teal as primary signal** — reserve primary color for interactive and key elements

### Layout Principles

- **Max width**: 1200px for main content, 800px for text-heavy sections
- **Section padding**: 80px top/bottom on desktop, 48px on mobile
- **Grid**: 12-column conceptually, use CSS Grid with auto-fill
- **Mobile-first**: All components designed mobile-first, then enhanced for desktop

### Vietnamese Design Considerations

- Use proper Vietnamese diacritics throughout all UI copy
- Font must render Vietnamese characters correctly — Plus Jakarta Sans and Inter both do
- Avoid overly corporate/Western imagery
- Use friendly, warm illustrations (abstract, geometric) over real photos
- Color choices (teal + amber) work well for Vietnamese healthcare context
- Numbers and proof points are highly persuasive for this audience — feature them prominently

### Gradient Usage

**Hero Gradient** (`.gradient-hero`):
```
background: linear-gradient(135deg, #0B7D70 0%, #0E9E8E 50%, #1BB8A8 100%);
```

**Card Accent Gradient** (`.gradient-card`):
```
background: linear-gradient(135deg, #E8F7F6 0%, #F7F9FB 100%);
```

**Section Background Gradient** (`.gradient-section`):
```
background: linear-gradient(180deg, #F7F9FB 0%, #EEF2F7 100%);
```

---

## 9. Brand Voice

### Tone Principles

- **Warm but professional** — like a trusted advisor, not a cold sales pitch
- **Confident, not boastful** — let numbers and outcomes speak
- **Simple language** — avoid jargon, explain concepts simply
- **Action-oriented** — every section should have a clear next step

### Vocabulary Rules

| Use This | Not This |
|---|---|
| nhà thuốc | doanh nghiệp, cơ sở kinh doanh |
| khách hàng | bệnh nhân (unless clinically appropriate) |
| tư vấn | hỗ trợ y tế |
| Ngọc | trợ lý AI, hệ thống |
| chăm sóc khách hàng | customer service |
| tin nhắn Zalo | message, chat |
| tự động | automated |
| tiết kiệm thời gian | save time |
| tăng doanh thu | increase revenue |

### Sample Copy Patterns

**Hero headline pattern**: "[Benefit] cho [audience] — [how]"
Example: "Chăm sóc khách hàng thông minh hơn — ngay trên Zalo"

**Feature description pattern**: Active verb + benefit + context
Example: "Ngọc tự động nhắc lịch tái khám, giúp khách hàng không quên thuốc"

**CTA patterns**:
- Primary: "Dùng thử miễn phí" / "Bắt đầu ngay"
- Secondary: "Xem demo" / "Tìm hiểu thêm"

**Stat display pattern**: [Large number] + [context label] + [brief explanation]
Example: `85%` / `khách hàng phản hồi` / "trong vòng 2 giờ đầu"

---

## 10. Page Structure & Sections

### Standard Sales Page Sections (in order)

1. **Nav** — Logo + navigation links + CTA button
2. **Hero** — Headline, subheadline, primary CTA, optional visual/mockup
3. **Social Proof Bar** — Key numbers / logos (if any)
4. **Problem Section** — Pain points of the pharmacy owner (manually answering messages, losing customers)
5. **Solution Section** — How Ngọc solves each problem
6. **Features Grid** — 6–9 specific features with icons
7. **How It Works** — 3–4 step process timeline
8. **Metrics / Results** — Before/After comparison with numbers
9. **Pricing / Plans** — Simple and clear
10. **FAQ** — Common objections answered
11. **CTA Section** — Final push with primary action
12. **Footer** — Contact, links, branding

---

## 11. File Reference

| File | Purpose |
|---|---|
| `css/design-system.css` | All CSS variables, reset, utility classes, component classes |
| `css/animations.css` | Scroll animation classes triggered by JS |
| `js/main.js` | Nav toggle, smooth scroll, scroll animations |
| `pages/_head.html` | Shared HTML head partial |
| `pages/index.html` | Main sales page |

---

*Brand guideline version 1.0 — MeCare × Nhà Thuốc Trúc Tâm sales kit*
