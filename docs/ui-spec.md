# Landing Page UI Specification: Sellix Trace

## 1. Overview
The landing page (`index.html`) is a standalone, single-file presentation page providing a public overview of the Sellix Trace dark-web threat intelligence platform. It features high-end visual aesthetics, a dark background with an ambient video/canvas background loop, subtle glassmorphism, responsive navigation with a mobile burger menu at <= 1160px, and seamless navigation links routing into `/app`.

## 2. Visual & Layout Requirements
- **Structure**: Single file `index.html` with self-contained CSS and vanilla JavaScript. No external build steps or heavy frameworks.
- **Color Palette**:
  - Background: Deep Black (`#080808` / `#000000`)
  - Panels / Cards: Dark Obsidian Glass (`#181818` / `rgba(24, 24, 24, 0.75)` with `1px solid rgba(255, 255, 255, 0.08)`)
  - Accent / Highlights: Electric Violet (`#a78bfa` / `#8b5cf6`) and Cyber Cyan (`#38bdf8`)
  - Text: Primary `#ffffff`, Secondary `#94a3b8`, Muted `#64748b`
  - Buttons: White pill buttons (`#ffffff` background, `#09090b` text, hover opacity/glow) and glass pill buttons.
- **Typography**: Inter or Plus Jakarta Sans with fallbacks to system sans-serif. Clean, crisp tracking.
- **Background**:
  - Ambient seamless video element or dynamic hardware-accelerated particle canvas simulating high-tech network nodes and data streams.
  - Deep radial vignette overlay to maintain high text contrast and legibility.
- **Header & Navigation**:
  - Sellix Trace logo with glowing violet beacon.
  - Navigation links: Capabilities, Detectors, Graph Resolution, Chain of Custody, Case Studies.
  - Action buttons: "Sign In" and "Launch Platform" (pill-styled, routing to `/app`).
  - Breakpoint: Collapses into an accessible mobile hamburger drawer at screen widths <= 1160px.
- **Hero Section**:
  - Headline: High-impact dark-web investigation messaging preserving concise line lengths.
  - Subtitle: Clear explanation of Tor hidden-service de-anonymization and cross-marketplace threat actor correlation.
  - Dual CTAs: Primary "Explore Live Demo" and Secondary "View Documentation".
  - Live metric badges: "40+ Onion Snapshots Analyzed", "150+ Actor Entities Resolved", "Zero Probing / 100% Passive".
- **Feature Showcase Grid**:
  - Capability 1: Onion Misconfiguration Analyzer (server-status, TLS cert leaks, header fingerprints).
  - Capability 2: Cross-Marketplace Entity Graph (PGP, wallets, stylometry, community clustering).
  - Capability 3: Clearnet Origin Matching & Real-World Pivots (explainable confidence scores, suspect attribution).
  - Capability 4: Chain-of-Custody & Court-Ready Evidence Dossiers (SHA-256 evidence hashing, one-click PDF export).
- **Motion & Accessibility**:
  - Subtle entrance animations for hero elements (`fade-in-up`).
  - Strict compliance with `@media (prefers-reduced-motion: reduce)`: disables transitions and auto-animations for users requesting reduced motion.
  - Zero horizontal scroll at standard desktop (1280x800), tablet (1024x768), and mobile (375x667) viewports.
