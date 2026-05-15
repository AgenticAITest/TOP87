# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Class of '87 Reunion Portal** - A sophisticated alumni reunion website for the Class of 1987. This is a React 19 + Vite + TypeScript application deployed as a Google AI Studio app, featuring a dark luxury aesthetic with regional charter chapters and an admin dashboard.

### Key Features
- Alumni member directory with approval workflow
- Regional chapter management (Jakarta, Bandung, US, Australia)
- Admin dashboard for verification queue and system logs
- Responsive design with glassmorphism UI components
- Gemini AI integration via Google's genai SDK
- Motion graphics and smooth animations

## Tech Stack

- **Frontend Framework**: React 19.0.1 with TypeScript 5.8
- **Build Tool**: Vite 6.2.3
- **Styling**: Tailwind CSS 4.1.14 (via @tailwindcss/vite plugin)
- **Animation**: Motion/Framer Motion 12.23.24
- **Icons**: Lucide React 0.546.0
- **Server**: Express 4.21.2
- **AI Integration**: Google Generative AI SDK (@google/genai 1.29.0)
- **Environment**: Node.js required

## Development Commands

```bash
npm install                    # Install dependencies
npm run dev                    # Start Vite dev server on port 3000 (0.0.0.0 for network access)
npm run build                  # Build for production (output: dist/)
npm run preview                # Preview production build locally
npm run clean                  # Remove dist/ directory
npm run lint                   # Type-check TypeScript (tsc --noEmit)
```

### Environment Setup

1. Create a `.env.local` file (copy from `.env.example`)
2. Set `GEMINI_API_KEY` to your Gemini API key
3. (Optional) Set `APP_URL` for the hosted app URL

The app automatically injects both at runtime when deployed to AI Studio.

## Project Structure

```
src/
├── main.tsx              # React root entry point
├── App.tsx               # Main layout component (navbar, sections, footer)
├── index.css             # Global styles with Tailwind + custom themes
└── components/
    ├── Navbar.tsx        # Fixed header with mobile menu toggle
    ├── Hero.tsx          # Landing section with Google sign-in CTA
    ├── CharterSpotlight.tsx  # Regional chapter cards (4 charters)
    ├── MemberDirectory.tsx   # Alumni grid with status badges
    └── AdminDashboard.tsx    # Admin stats, verification queue, system log
```

## Architecture & Patterns

### Component Structure
- **Functional Components**: All components use React hooks (useState for mobile menu toggle)
- **Layout**: Single-page scroll experience with section-based organization
- **Styling**: Utility-first Tailwind CSS with custom theme colors defined in `index.css`

### Custom Color System
Defined as CSS custom properties in `index.css`:
- `--color-charcoal`: #111111 (primary background)
- `--color-navy`: #0A192F (secondary background)
- `--color-gold`: #D4AF37 (accent/highlight)
- `--color-gold-light`: #F9E27D (lighter accent)

### Reusable Utilities
Three custom Tailwind component classes in `index.css`:
- `.glass`: Glassmorphism effect (semi-transparent white background with blur)
- `.glass-gold`: Gold variant of the glass effect
- `.gold-glow`: Text shadow for gold accent text

### Animations & Motion
- Uses Motion library for entrance animations
- Components use `initial`, `animate`, `whileInView`, `whileHover`, `whileTap` props
- Staggered animations on list items using `delay: index * 0.05/0.1`
- Viewport-triggered animations (appears when scrolled into view)

### Data Patterns
- **Hard-coded Data**: Member profiles and charter data are inline arrays in component files
  - `MemberDirectory.tsx`: 6 sample members with status (Approved/Pending/Suspended)
  - `CharterSpotlight.tsx`: 4 regional chapters with stats and descriptions
  - `AdminDashboard.tsx`: Sample stats, verification requests, system logs
- No backend API integration yet; these would be replaced with API calls or state management

### Design System
- **Typography**: Playfair Display (serif) for headings, Inter (sans) for body
- **Responsive**: Mobile-first with `md:` (768px) and `lg:` (1024px) breakpoints
- **Icons**: Lucide React for consistent iconography
- **Images**: External Unsplash URLs with grayscale effects and color transitions

## TypeScript Configuration

- **Target**: ES2022
- **Module Resolution**: bundler (for Vite)
- **JSX**: react-jsx (automatic JSX transform)
- **Paths Alias**: `@/*` points to project root
- **Type Checking**: Run `npm run lint` to validate types without emitting

## Vite Configuration

- **Plugins**: React (@vitejs/plugin-react) and Tailwind CSS (@tailwindcss/vite)
- **Env Vars**: `GEMINI_API_KEY` is injected at build time via `process.env`
- **HMR**: Disabled when `DISABLE_HMR` env var is true (leftover from AI Studio prototyping — can be ignored)
- **Path Alias**: `@` resolves to project root
