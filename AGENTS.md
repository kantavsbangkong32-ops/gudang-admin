# Gudang Admin — AGENTS.md

## Stack
- React 19 + Vite 8 (JSX, **no TypeScript**)
- Tailwind CSS v4 via `@tailwindcss/vite` plugin in `vite.config.js` — CSS-first config with `@import "tailwindcss"` + `@theme`, **no** `tailwind.config.js`
- Supabase (auth, PostgreSQL, storage)
- Deploy: Vercel (SPA rewrites in `vercel.json`)
- UI: Bahasa Indonesia throughout (`index.html` has `lang="id"`)

## Commands
| Command | Purpose |
|---|---|
| `npm run dev` | Dev server (Vite) |
| `npm run build` | Production build |
| `npm run lint` | ESLint (`eslint.config.js`, flat config, ESLint 10.x `defineConfig`) |
| `npm run preview` | Preview production build |

No test or typecheck scripts (no framework configured). `pg` and `better-sqlite3` in `package.json` are for scripts/ only, not the app.

## Environment
- `.env` requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; validated at runtime in `src/lib/supabase.js`

## Supabase
- Schema source of truth: `supabase-schema.sql` — tables: `categories`, `profiles`, `items`, `orders`, `order_items`, `stock_import_logs`
- Setup scripts in `scripts/` (`node scripts/<name>.js`). Service role key hardcoded — do not commit changes.
- RLS enabled on all tables. Profile auto-created via trigger on `auth.users`.

## Architecture
- Entry: `src/main.jsx` → `src/App.jsx` (react-router-dom SPA with `BrowserRouter`)
- Auth: `src/context/AuthContext.jsx` — Supabase auth + profile fetch, exposes `isAdmin` (`profile.role === 'ADMIN'`)
- Layout (`src/components/Layout.jsx`) wraps all authenticated routes as an `<Outlet/>`; redirects to `/login` if not logged in or not ADMIN
- 9 pages in `src/pages/`, 2 components (`Layout`, `Sidebar`) in `src/components/`
- Supabase client: `src/lib/supabase.js`

## Routes
| Path | Page |
|---|---|
| `/login` | Login |
| `/dashboard` | Dashboard |
| `/products` | Products (list) |
| `/products/new` | ProductForm (create) |
| `/products/:id` | ProductDetail |
| `/products/edit/:id` | ProductForm (edit) |
| `/categories` | Categories |
| `/orders` | Orders (list) |
| `/orders/:id` | OrderDetail |
| `/stock-import` | StockImport |

Catch-all `*` redirects to `/dashboard`.

## Conventions
- All files `.jsx`, no TypeScript (though `@types/react` exists in devDeps from template)
- Only `ADMIN` role passes the guard in Layout
- Flat component structure (no nested subdirs per page)
- Tailwind v4 theme tokens in `src/index.css`: `shopee`, `shopee-dark`, `shopee-light`, `shopee-bg`
- Sidebar has a non-functional search bar (visual placeholder in Layout header)
