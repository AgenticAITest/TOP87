---
name: Heritage & Hearth
colors:
  surface: '#fff8f5'
  surface-dim: '#e1d8d4'
  surface-bright: '#fff8f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fbf2ed'
  surface-container: '#f5ece7'
  surface-container-high: '#efe6e2'
  surface-container-highest: '#e9e1dc'
  on-surface: '#1e1b18'
  on-surface-variant: '#424843'
  inverse-surface: '#34302c'
  inverse-on-surface: '#f8efea'
  outline: '#727973'
  outline-variant: '#c2c8c1'
  surface-tint: '#466553'
  primary: '#001309'
  on-primary: '#ffffff'
  primary-container: '#0a2a1b'
  on-primary-container: '#72937f'
  inverse-primary: '#accfb8'
  secondary: '#885200'
  on-secondary: '#ffffff'
  secondary-container: '#ffb153'
  on-secondary-container: '#724400'
  tertiary: '#10100c'
  on-tertiary: '#ffffff'
  tertiary-container: '#252520'
  on-tertiary-container: '#8d8c85'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c7ebd3'
  primary-fixed-dim: '#accfb8'
  on-primary-fixed: '#012112'
  on-primary-fixed-variant: '#2e4d3c'
  secondary-fixed: '#ffddbb'
  secondary-fixed-dim: '#ffb868'
  on-secondary-fixed: '#2b1700'
  on-secondary-fixed-variant: '#673d00'
  tertiary-fixed: '#e5e2da'
  tertiary-fixed-dim: '#c9c6bf'
  on-tertiary-fixed: '#1c1c17'
  on-tertiary-fixed-variant: '#474741'
  background: '#fff8f5'
  on-background: '#1e1b18'
  surface-variant: '#e9e1dc'
typography:
  display-lg:
    fontFamily: Libre Caslon Text
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Libre Caslon Text
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
  headline-md:
    fontFamily: Libre Caslon Text
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-sm:
    fontFamily: Libre Caslon Text
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Work Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Work Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: Work Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1200px
  gutter: 24px
  margin-mobile: 16px
  section-padding: 80px
---

## Brand & Style

The design system is built for a 40th alumni reunion, evoking a sense of "Sophisticated Nostalgia." It bridges the gap between the prestige of an established legacy and the warmth of a community campfire. The visual language is **Atmospheric, Community-focused, and Premium.**

The aesthetic combines **Tactile/Skeuomorphic** elements—specifically rich paper textures and gold metallic accents—with a **Modern Minimalist** layout to ensure the content remains readable and the experience feels contemporary despite its nostalgic roots. For restricted content, the system employs **Glassmorphism**, creating a "frosted" barrier that suggests exclusivity and protection of shared memories.

The emotional response should be one of "Coming Home"—a dignified, high-end invitation to reconnect and celebrate four decades of shared history.

## Colors

The palette is rooted in a traditional, prestigious foundation:
- **Primary (Deep Forest Green):** Used for primary navigation, headings, and heavy UI blocks to convey stability and growth.
- **Secondary (Warm Amber/Gold):** Used for highlights, call-to-actions, and interactive states. It mimics the glow of a campfire and the prestige of a 40th-anniversary gold.
- **Surface (Parchment):** The background is not a flat white but a textured cream (#F5F2EA), providing a soft, non-glare reading experience that feels like physical stationery.
- **Neutral:** A deep charcoal-brown for body text to maintain high legibility without the harshness of pure black.

## Typography

This design system uses a high-contrast typographic pairing to balance tradition and clarity.

- **Headlines:** *Libre Caslon Text* provides an authoritative, literary, and timeless feel. Use it for all page titles, section headers, and "Storytelling" pull quotes. 
- **Body & Labels:** *Work Sans* is utilized for its neutral, grounded, and highly legible characteristics. It ensures that logistical details (dates, locations, gear sizes) are processed effortlessly.
- **Stylistic Note:** Large display text should use tighter letter-spacing to emphasize the "Editorial" look. Labels should always use increased tracking (letter-spacing) when in all-caps to maintain a premium, architectural feel.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy on desktop to mimic the structured margins of a premium invitation or a high-end magazine.

- **Grid:** A 12-column grid with a maximum width of 1200px. 
- **Vertical Rhythm:** Generous section padding (80px+) is used to create "breathing room," allowing the parchment texture and hero imagery to shine.
- **Mobile Adaptation:** On mobile, the 12-column grid collapses to a single column with 16px side margins. Section padding is reduced to 48px to maintain momentum while scrolling.
- **Storytelling Layouts:** Use asymmetrical column spans (e.g., text spanning 5 columns, image spanning 7) to create a dynamic, editorial feel for reunion stories.

## Elevation & Depth

Depth in this design system is achieved through texture and transparency rather than heavy shadows.

- **Tonal Layers:** The primary background is the parchment texture. Information cards use a slightly lighter, flat cream or a semi-transparent version of the primary green.
- **The "Locked Teaser" State:** Restricted content panels use a **Glassmorphism** effect: a backdrop-blur (12px to 20px) with a semi-transparent white or forest green overlay (40% opacity). This creates a "frosted window" effect, signaling that the content exists but is protected.
- **Subtle Depth:** Buttons and primary cards use an extremely soft, amber-tinted shadow (4% opacity) to suggest they are sitting slightly above the paper surface.

## Shapes

The shape language is **Soft and Precise**. 

- **Corners:** Use 0.25rem (4px) for most UI elements like input fields and small buttons to maintain a traditional, "cut paper" aesthetic.
- **Cards:** Larger panels may use up to 0.5rem (8px) to soften the layout.
- **Iconography:** Use "Stroke" based icons with a 1.5px or 2px weight. Avoid filled, playful shapes. Icons should feel like fine-line illustrations or engravings.

## Components

### Buttons
- **Primary:** Deep Forest Green background with White or Gold text. Rectangular with minimal rounding.
- **Secondary/CTA:** Warm Amber background. Used sparingly for high-priority actions like "Register Now" or "Sign In."
- **Ghost:** Transparent background with a thin Deep Forest Green border.

### Cards & Panels
- **Standard:** Uses the parchment paper texture as the background. Borders are either non-existent or a very thin 1px line in a darker shade of cream.
- **Locked Teaser Card:** Features the glassmorphic blur described in the Elevation section. A centered Gold "lock" icon and a clear, centered "Sign In" button are required.

### Inputs & Forms
- **Fields:** Subtle cream background with a 1px Forest Green bottom border (underline style) or a full light border. Focus states should transition the border to Gold.

### Storytelling Elements
- **Benefits List:** Use fine-line icons (Forest Green) paired with *Work Sans* bold subheaders and regular body text.
- **Hero:** The "Campfire" scene should be treated with a subtle vignette to pull focus toward the center, where the primary Headline and CTA reside.

### Navigation
- **Top Bar:** Semi-transparent Forest Green or Parchment with a "blur" effect to keep it readable as users scroll over textured content.