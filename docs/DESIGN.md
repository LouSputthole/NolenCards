# Pretty Cool Cards Nolensville — site design brief (2026-10-06)

## Business
Sports card + Pokémon shop, 7177 Nolensville Rd Suite A3, Nolensville TN 37135. (615) 283-8186.
Carries Pokémon, sports (modern + vintage, sealed wax, hobby boxes), One Piece, singles, graded slabs, supplies.
Buys collections. Trade nights, kids club, family-friendly back game room. 4.9★ / 215 Google reviews.
All copy lives in `src/content.js`. Facebook is the only social link we have.

## Brand
Logo = neon sign (`public/logo.jpg`): white script "PrettyCool", red Nashville skyline, blue football with Tennessee tri-star.
Palette (Tailwind theme tokens in `src/index.css`): `ink` #07070b bg, `neon-red` #ff2a3c, `neon-blue` #2f6bff, `snow` text, `fog` muted, `gold` for the promo card.
Fonts: Bebas Neue (display, `font-display`), Pacifico (script accents, `font-script`), Inter (body, `font-sans`).
Feel: dark shop at night, neon glow, holographic foil. Awwwards-tier polish, not a template.

## Page (single scroll)
1. **Hero** = full-viewport R3F scene. A sealed booster pack (shop-branded, NOT Pokémon trademarks) floats.
   User clicks/drags to tear it open; cards fan out; last card flips to camera = gold "10% OFF" card with code `PACKOPEN10`.
   Skip button for impatient users. `onRevealed()` fires when the code is on screen.
2. **Categories** — what we carry (6 cards from `categories`).
3. **Community** — trade nights, kids club, game room, release days.
4. **Reviews** — 3 quotes + rating.
5. **Visit** — hours table (highlight today, "Open now" / "Closed"), address, call, directions, embedded map.
6. **Footer** — logo, address, Facebook, © year.
Nav is fixed, transparent over hero, shows the promo code pill once `revealed`.

## Rules
- Mobile first. Hero must run at 60fps on a phone: low poly, no post-processing heavier than bloom, `dpr={[1, 1.5]}`.
- `prefers-reduced-motion`: skip the animation, show the reveal state immediately.
- No new npm deps without asking. Have: three, @react-three/fiber, @react-three/drei, framer-motion, tailwindcss v4.
- No Pokémon / NFL / MLB logos or card art. Procedural materials only.
- Deploy target: Vercel static (`vite build`).
