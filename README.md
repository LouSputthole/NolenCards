# Pretty Cool Cards Nolensville

Website for the card shop at 7177 Nolensville Rd, Suite A3. Dark neon theme, Three.js pack-opening hero that hands out a 10% discount code.

## Run

```sh
npm install
npm run dev      # local
npm run build    # static output in dist/
npm test         # open-hours helper check
```

## Edit the content

Everything a human changes lives in `src/content.js`: hours, phone, address, promo code, categories, community items, reviews. The logo is `public/logo.jpg`.

## Layout

- `src/sections/` one file per page section (Hero, Nav, Categories, Community, Reviews, Visit, Footer)
- `src/three/` the R3F pack-opening scene and materials
- `docs/DESIGN.md` the design brief

## Deploy

Static Vite site. Vercel: import the repo, framework preset "Vite", no env vars.
