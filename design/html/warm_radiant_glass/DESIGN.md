---
name: Warm Radiant Glass
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
    fontSize: 72px
    fontWeight: '800'
    lineHeight: 76px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 44px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  stat-counter:
    fontFamily: Plus Jakarta Sans
    fontSize: 64px
    fontWeight: '800'
    lineHeight: 68px
    letterSpacing: -0.02em
  stat-counter-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: 0.04em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '800'
    lineHeight: 32px
    letterSpacing: 0.04em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '800'
    lineHeight: 28px
    letterSpacing: 0.05em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 22px
    letterSpacing: 0.06em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: 0em
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0em
  label-caps:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.08em
  label-btn:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 18px
    letterSpacing: 0.02em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 3rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system delivers a tactile, radiant, and calm workspace engineered to foster deep concentration. Built around the ethos of *“Set your aim. Stay on it,”* the visual language rejects frantic productivity tropes, cold corporate dashboards, and gamified nature clichés (no leaves, vines, or trees). Instead, it evokes steady momentum and composed clarity through abstract geometric physics: radiant focal rings, ambient warm light sources, soft frosted glass panels, and confident editorial typography.

The target demographic consists of knowledge workers, creatives, and engineers navigating fragmented attention. The visual response must feel serene, elevated, and human—grounding the user in a distraction-free state through physical warmth, optical depth, and high-legibility typographic scale. The aesthetic merges contemporary glassmorphism with tactile pill forms, anchored by generous layout breathing room and deliberate ambient gradients.

## Colors

The palette establishes warmth and optical ease using rich citrus tones over an organic cream canvas.

- **Primary Orange (`#FF7A21`)**: Applied to primary actions, active timer rings, active indicators, and critical focal elements.
- **Amber (`#FFB422`)**: Secondary accents, warning alerts, drift state indicators, and medium focus streaks. Never introduce red tones; all cautionary states or interruptions resolve strictly within Amber.
- **Ink (`#1E1E1E`)**: Primary body copy, headers, high-contrast dark buttons, and dark chips.
- **Cream (`#F3E6D3`)**: Foundational background, blending via gentle directional gradients into pale highlight cream (`#F8EFE4`).
- **Soft Orange Tint (`#FFE3CF`)**: Low-intensity container fills, hover backgrounds, inactive progress tracks, and metadata pill tags.
- **Frosted Glass Matrix**: Surfaces use `rgba(255, 255, 255, 0.65)` supported by an outer rim border of `1px solid rgba(255, 255, 255, 0.8)`.

### Accessibility Rules
- Any element carrying `#FF7A21` or `#FFB422` as a background fill must use `#1E1E1E` (Ink) for label typography and iconography to maintain strict WCAG contrast compliance.
- White (`#FFFFFF`) typography is strictly reserved for `#1E1E1E` (Ink) filled elements or saturated dark status surfaces.
- Never use red for validation, destructive actions, or drift notifications; warning states use `#FFB422` with `#1E1E1E` text.

## Typography

The typographic hierarchy balances structural brutalism in headlines with approachable clarity across interactive elements.

- **Headlines & Section Titles**: Rendered in uppercase, extra-bold weights (`800`), with tracking slightly loosened (`0.04em` to `0.06em`) to preserve legibility and create a clear visual hierarchy.
- **Numeric Display & Timers**: Utilize tabular figures (`font-variant-numeric: tabular-nums`) to avoid layout jitter during active session ticks. High-scale numerals convey session velocity and progress instantly.
- **Body & Labels**: Default to standard sentence case, optimized for reading ease against translucent layers.

## Layout & Spacing

The layout model combines an adaptive fixed-width central container with fluid side margins.

- **Responsive Grid**: 
  - **Desktop (1200px+)**: 12-column grid, max-width `1240px`, `1.5rem` (`24px`) gutters, centered canvas.
  - **Extension Popup / Compact Split (380px–420px)**: Single-column flex/stack, `1.25rem` (`20px`) outer margin, `0.75rem` gap baseline.
  - **Tablet (768px–1199px)**: 8-column grid with dynamic fluid side bounds.
- **Rhythm**: Generous internal component padding prevents optical crowding caused by frosted glass edges and ambient backdrop glows. Cards prioritize internal spacing of `space-xl` (`40px`) on desktop and `space-lg` (`24px`) on compact screens.

## Elevation & Depth

Visual hierarchy relies on blurred physical layers rather than opaque shadow stacking.

- **Background Atmosphere**: The foundational canvas hosts two or three large, organic blurred color orbs (`#FF7A21` at 18% opacity and `#FFB422` at 25% opacity) with Gaussian blur ranges between `90px` and `140px`. These blobs remain strictly abstract and geometric, shifting gently behind content layers.
- **Frosted Surfaces (Surface Tier 1)**: Base cards feature `background: rgba(255, 255, 255, 0.65)`, `backdrop-filter: blur(16px)`, a top-down highlight border `1px solid rgba(255, 255, 255, 0.8)`, and an ambient drop shadow: `0 16px 36px -12px rgba(30, 30, 30, 0.06), 0 4px 12px -2px rgba(255, 122, 33, 0.04)`.
- **Raised Interactive Layers (Surface Tier 2)**: Floating menus, session summaries, and active modals retain `backdrop-filter: blur(24px)` with increased internal luminance `rgba(255, 255, 255, 0.82)` and an amplified ambient shadow: `0 24px 48px -12px rgba(30, 30, 30, 0.12), 0 8px 16px -4px rgba(255, 122, 33, 0.08)`.

## Shapes

The design system uses pill and organic radii, offsetting the strong, uppercase geometric typography.

- **Cards & Primary Modules**: Apply a consistent `24px` radius (`rounded-2xl` to `rounded-3xl` depending on scale) to produce a smooth, pebble-like tactile quality.
- **Controls, Badges, & Chips**: All buttons, state indicators, text inputs, and filter chips use a full pill radius (`9999px`).
- **Prohibited Imagery**: Organic plant motifs, leaves, growth stems, and hand-drawn doodles are explicitly prohibited. Graphic language relies on pure geometric abstractions: concentric rings, segmented radial arcs, linear progress indicators, and crisp SVG outlines.

## Components

### Buttons
- **Primary Pill**: Background `#FF7A21`, text `#1E1E1E`, font `label-btn`, padding `12px 28px`. Hover: translateY(-1px) with an ambient glow shadow `0 8px 20px -4px rgba(255, 122, 33, 0.4)`. Active: translateY(0).
- **Ink Pill (High Contrast)**: Background `#1E1E1E`, text `#FFFFFF`, font `label-btn`, padding `12px 28px`. Hover: `rgba(30, 30, 30, 0.85)`.
- **Frosted Ghost**: Background `rgba(255, 255, 255, 0.5)`, border `1px solid rgba(255, 255, 255, 0.8)`, text `#1E1E1E`, backdrop-blur `12px`. Hover: background `rgba(255, 255, 255, 0.8)`.

### Cards & Panels
- Translucent container with `24px` border radius, `1px solid rgba(255, 255, 255, 0.8)` perimeter highlight, and `rgba(255, 255, 255, 0.65)` fill. Content within uses generous inner padding (`32px` to `40px`).

### Chips & Badges
- **Active / Session Status**: Fill `#FFE3CF`, text `#1E1E1E`, border `1px solid rgba(255, 122, 33, 0.25)`, radius `9999px`, typography `label-caps`.
- **Caution / Drift Alert**: Fill `#FFB422`, text `#1E1E1E`, radius `9999px`, font `label-caps`.

### Input Fields
- Enclosed pill containers: `background: rgba(255, 255, 255, 0.5)`, `border: 1px solid rgba(255, 255, 255, 0.8)`, padding `12px 24px`, text `#1E1E1E`. Focus state switches border to `#FF7A21` with a `0 0 0 3px rgba(255, 122, 33, 0.2)` ring.

### Checkboxes & Toggle Controls
- Custom circular indicators. Unselected: `20px` diameter circle with `1.5px solid rgba(30, 30, 30, 0.2)`. Selected: filled `#FF7A21` featuring an `#1E1E1E` centered tick mark.

### Domain-Specific Components
- **Focal Ring (Timer Component)**: Scalable SVG dual-ring. Inactive track: `#FFE3CF` (stroke width 8px). Active dynamic stroke: `#FF7A21` (stroke width 8px) with round caps. Center stack houses tabular numeric countdown (`stat-counter`) with an uppercase aim title directly below (`label-caps`).
- **Drift Warning Toast**: Glass pill card with a `#FFB422` indicator pill, alerting users to stray activity using reassuring, non-punitive messaging with amber accents.