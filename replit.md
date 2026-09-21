# Inky

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
- `firefox-extension/content.js` — Readability reader view, swipe activation, pagination, contrast mode, and keyboard controls.
- `firefox-extension/readability-entry.js` — browser bundle entry for `@mozilla/readability`.
- `firefox-extension/popup.html` — toolbar popup markup and usage guidance.
- `firefox-extension/popup.css` — popup styling.
- `firefox-extension/popup.js` — current-tab toggle behavior.

## Architecture decisions

- The extension uses a content script rather than a separate reader view so the page's links, forms, and normal browsing behavior remain available.
- Horizontal swipes activate the mode when it is off, then paginate when it is on; vertical swipes are ignored for actions, and Escape plus the on-page control provide explicit exit paths.
- Mozilla Readability extracts the primary article into a temporary reader view, so surrounding sticky and fixed-position page chrome does not cover paginated content; the original page remains available when reading mode is exited.
- Firefox storage remembers the mode, while restricted browser pages fail gracefully.

## Product

Inky uses Mozilla Readability to provide a focused article view with high-contrast presentation, strongly underlined links, grayscale media, and viewport-sized pagination for web reading. It works with horizontal touch swipes, mouse wheels, arrow keys, Page Up/Page Down, Space, page navigation buttons, the on-page control, and the extension popup.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
