---
name: Warm Glass Focus
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1b1b1c'
  on-surface-variant: '#584237'
  inverse-surface: '#303030'
  inverse-on-surface: '#f3f0ef'
  outline: '#8c7265'
  outline-variant: '#e0c0b1'
  surface-tint: '#9d4400'
  primary: '#9d4400'
  on-primary: '#ffffff'
  primary-container: '#ff7a21'
  on-primary-container: '#5f2600'
  inverse-primary: '#ffb690'
  secondary: '#7f5600'
  on-secondary: '#ffffff'
  secondary-container: '#feb320'
  on-secondary-container: '#6b4800'
  tertiary: '#6f5a4b'
  on-tertiary: '#ffffff'
  tertiary-container: '#b49c8a'
  on-tertiary-container: '#453426'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbca'
  primary-fixed-dim: '#ffb690'
  on-primary-fixed: '#331100'
  on-primary-fixed-variant: '#783200'
  secondary-fixed: '#ffddae'
  secondary-fixed-dim: '#ffba40'
  on-secondary-fixed: '#281800'
  on-secondary-fixed-variant: '#604100'
  tertiary-fixed: '#f9ddca'
  tertiary-fixed-dim: '#dcc2af'
  on-tertiary-fixed: '#27190d'
  on-tertiary-fixed-variant: '#554335'
  background: '#fcf9f8'
  on-background: '#1b1b1c'
  surface-variant: '#e5e2e1'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 56px
    fontWeight: '800'
    lineHeight: 64px
    letterSpacing: 0.04em
  display-hero-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: 0.03em
  timer-display:
    fontFamily: Plus Jakarta Sans
    fontSize: 72px
    fontWeight: '800'
    lineHeight: 72px
    letterSpacing: -0.02em
  timer-display-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: 0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: 0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: 0em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 18px
    letterSpacing: 0.06em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2.5rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system drives a high-performance focus environment that feels calm, warm, and deliberately grounded rather than clinical or punitive. The aesthetic fuses modern glassmorphism with an organic, sunlit warmth—pairing soft, frosted translucent layers with radiant amber halos and sharp, high-contrast typography. The design language replaces traditional productivity tropes (such as forest or garden metaphors) with clean, mathematical geometries: circular timer rings, precision segment bars, pill surfaces, and ambient radial light fields.

The emotional goal is energetic tranquility. The interface recedes during deep work sessions, presenting only lucid glass controls and crisp temporal data, while rewarding completed milestones with kinetic shifts in color depth and soft luminous refraction.

## Colors

The palette establishes warmth and strict functional clarity. The base canvas is built on a rich natural cream (`#F3E6D3`), avoiding stark clinical whites and screen glare during long working sessions.

### Functional Roles & Contrast Rules
- **Canvas Base:** `#F3E6D3` (Warm Cream). Never pure white `#FFFFFF` for full-bleed page backgrounds.
- **Glass Surfaces:** `rgba(255, 255, 255, 0.65)` layered over canvas and ambient blurred blobs. Surface boundaries use `rgba(255, 255, 255, 0.80)` 1px stroke.
- **Primary Accent (`#FF7A21`):** Applied to primary actions, active timer rings, key progress fills, and priority focus indicators.
- **Secondary Accent (`#FFB422`):** Warning states, paused intervals, intermediate progress segments, and secondary telemetry. Red is strictly excluded across the product; warning, alert, and stop behaviors map exclusively to `#FFB422` and high-contrast `#1E1E1E` iconography.
- **Surface Accent (`#FFE3CF`):** High-interaction resting states, search/input fields, inactive chip fills, and subtle focus halos.
- **Text & High-Contrast Elements (`#1E1E1E`):** All primary copy, body text, structural icons, and captions.

### Strict Contrast Specifications
To guarantee accessibility exceeding WCAG 2.1 AA standards:
- Always render `#1E1E1E` text over `#FF7A21` (Orange) and `#FFB422` (Amber) fills. Never render white text over orange or amber backgrounds.
- White text (`#FFFFFF`) is permitted exclusively over `#1E1E1E` fills (such as dark pill buttons and critical focus badges).
- Muted secondary copy on glass cards uses `rgba(30, 30, 30, 0.65)`.

## Typography

Plus Jakarta Sans is utilized across all typographic roles to preserve geometric precision while retaining friendly, modern proportions.

- **Hero & Section Headers (`display-hero`, `headline-lg`):** Executed in uppercase bold styling with extended letter tracking (`0.02em` to `0.04em`). This provides architectural structure to the page and anchors the softer frosted glass beneath.
- **Session Timers (`timer-display`):** Feature extra-bold tabular figures with tight tracking (`-0.02em`) to eliminate layout jump during active count-down states.
- **Labels & Microcopy:** Rendered in uppercase (`label-lg`, `label-md`) with high tracking (`0.05em` to `0.06em`) for maximum scan-speed in dense extension popups and modal headers.
- **Body:** Proportional, highly legible humanist geometry. Weights are kept at `400` and `500` to prevent visual fatigue.

## Layout & Spacing

The spatial architecture balances breathing room with modular density, accommodating both broad dashboard views and compact browser extension panels (360px–420px width).

### Layout Modes
- **Web App Dashboard:** A centered 12-column fluid grid system bounded by a max-width of `1280px`. Gutters remain constant at `1.5rem` (`24px`), with outer section margins expanding smoothly from `1.25rem` (`20px`) on mobile to `2.5rem` (`40px`) on desktop.
- **Chrome Extension Viewport:** A single-column vertical stack constrained to `380px` width. Margins scale down to `1rem` (`16px`) with internal glass panel gaps set strictly to `space-sm` (`8px`) or `space-md` (`16px`).

### Reflow & Responsive Logic
- **Desktop (1024px+):** Multi-pane split: focus target and timer on the primary 7-column card; task list, ambient noise controls, and daily streaks on the complementary 5-column glass sidebar.
- **Tablet (768px – 1023px):** Collapses to an 8-column layout with vertical stacked sections.
- **Mobile & Extension Popover (<768px):** Single-column stacked order prioritizing the active timer surface, followed by linear goal cards.

## Elevation & Depth

Visual hierarchy does not use sharp shadows or mechanical z-indices. Instead, depth is achieved by layering frosted translucent glass over organic ambient warmth.

### Ambient Depth Plane (Base Backing)
Directly on top of the `#F3E6D3` canvas, fixed radial color blobs create diffuse backlighting:
- Blob A: Primary Orange (`#FF7A21`), 350px radius, opacity 25%, blur filter `80px`.
- Blob B: Secondary Amber (`#FFB422`), 450px radius, opacity 20%, blur filter `100px`.
Blobs must remain non-representational, smooth, and abstract. They shift location slightly between focus mode (warm, centered) and rest mode (softer, ambient periphery).

### Glassmorphism Surface Specifications
- **Resting Panels & Cards:** Background `rgba(255, 255, 255, 0.65)`, backdrop filter blur `16px` (`backdrop-blur-md` to `backdrop-blur-lg`), 1px solid stroke `rgba(255, 255, 255, 0.80)`. Shadow: `0 8px 32px -4px rgba(255, 122, 33, 0.08), 0 2px 8px -1px rgba(30, 30, 30, 0.04)`.
- **Raised Interactive Glass (Hover / Active Focus Card):** Background `rgba(255, 255, 255, 0.80)`, backdrop filter blur `24px`, border `1px solid #FFFFFF`. Shadow: `0 16px 40px -6px rgba(255, 122, 33, 0.14), 0 4px 12px -2px rgba(30, 30, 30, 0.06)`.
- **Overlay Glass (Modals / Focus Sheets):** Background `rgba(255, 255, 255, 0.85)`, backdrop filter blur `32px`, border `1px solid rgba(255, 255, 255, 0.95)`, shadow `0 24px 64px -12px rgba(30, 30, 30, 0.15)`.

## Shapes

The design system enforces a pill-forward, ultra-rounded profile to counterbalance strong uppercase typography and reinforce tactile softness.

- **Primary Cards & Containers:** Standardized at `24px` (`rounded-3xl`). This matches the organic silhouette of the frosted backdrop.
- **Interactive Controls (Buttons, Chips, Text Inputs, Search Bars):** Fully pill-shaped (`9999px` border radius).
- **Progress Tracking & Visuals:** Radial timer rings and segment track meters have complete circular cap rounding (`stroke-linecap: round`). No sharp corners exist on interactive boundaries or progress elements.

## Components

### Buttons
- **Primary Pill:** Background `#FF7A21`, color `#1E1E1E`, font `label-lg`, height `48px`, horizontal padding `28px`, border radius `9999px`, no border. Hover state transitions to background `#FFB422` with slight scale (`1.02`). Active state scales to `0.98`.
- **Secondary Glass Pill:** Background `rgba(255, 255, 255, 0.70)`, color `#1E1E1E`, 1px solid border `rgba(255, 255, 255, 0.90)`, backdrop-filter `blur(12px)`. Hover state shifts background to `#FFE3CF`.
- **Dark Emphasis Pill:** Background `#1E1E1E`, color `#FFFFFF`, font `label-lg`, height `48px`. Used exclusively for critical mode transitions (e.g., "END SESSION", "LOCK SCREEN").

### Cards
- **Frosted Content Card:** Base container configured with `rgba(255, 255, 255, 0.65)` fill, `1px solid rgba(255, 255, 255, 0.80)` border, `24px` rounded corners, and padding of `space-lg` (`24px`) to `space-xl` (`40px`). Used to enclose the timer, intention list, and session summary.

### Chips & Badges
- **Status Chips:** Pill-shaped, height `28px`, padding `0 12px`.
  - *Active/Focus:* Background `#FFE3CF`, text `#1E1E1E`, font `label-sm`.
  - *Break/Standby:* Background `rgba(255, 255, 255, 0.50)`, border `1px solid rgba(255, 255, 255, 0.80)`, text `#1E1E1E`.
  - *Critical Count:* Background `#FFB422`, text `#1E1E1E`, font `label-sm`.

### Input Fields & Aim Selectors
- **Single-Line Aim Input:** Pill-shaped container (`height: 52px`), fill `#FFE3CF` at 70% opacity, border `1px solid rgba(255, 255, 255, 0.90)`. Text color `#1E1E1E`, placeholder `rgba(30, 30, 30, 0.45)`. Focused state illuminates the outline with a 2px solid `#FF7A21` ring with no offset.

### Focus Timer Dial
- **Circular Progress Ring:** Scalable SVG circle with background track `rgba(30, 30, 30, 0.06)`, active meter stroke `#FF7A21`, line-cap rounded. Inner surface hosts the `timer-display` numerical readout in `#1E1E1E`, stacked immediately above the active session label in uppercase `label-md`.

### Intention Checklists
- **List Items:** Enclosed in micro-glass slabs (`rgba(255, 255, 255, 0.45)`, border radius `16px`, padding `12px 16px`).
- **Checkboxes:** Custom circular checks (`22px` diameter) with `2px solid #FF7A21`. Checked state fills completely with `#FF7A21` displaying an ink `#1E1E1E` checkmark icon. Strike-through body text transitions to `rgba(30, 30, 30, 0.40)`.