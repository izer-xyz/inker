# E-ink Reader

Firefox extension that makes web pages easier to read on e-ink devices by using high-contrast styling and gesture-controlled pagination.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `firefox-extension/manifest.json` — Firefox WebExtension metadata and permissions.
- `firefox-extension/content.js` — swipe activation, pagination, contrast mode, and keyboard controls.
- `firefox-extension/popup.html` — toolbar popup markup and usage guidance.
- `firefox-extension/popup.css` — popup styling.
- `firefox-extension/popup.js` — current-tab toggle behavior.

## Architecture decisions

- The extension uses a content script rather than a separate reader view so the page's links, forms, and normal browsing behavior remain available.
- Vertical swipes activate the mode when it is off, then paginate when it is on; Escape and the on-page control provide explicit exit paths.
- Firefox storage remembers the mode and zoom state, while restricted browser pages fail gracefully.

## Product

E-ink Reader provides white backgrounds, black text, strongly underlined links, grayscale media, adjustable 75–150% zoom, and viewport-sized pagination for web reading. It works with touch swipes, mouse wheels, arrow keys, Page Up/Page Down, Space, the on-page controls, and the extension popup.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
