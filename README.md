# KADOSH LOVE demo banking application

An installable, responsive banking-app prototype with Home, Send, Review, Receipt, Add Money, Savings, Cards, and Profile screens.

- **Live app:** https://kawembawilfred655-afk.github.io/kadosh-banking-design/
- **Design exports:** [SVG](./kadosh-love-board.svg) · [PNG](./kadosh-love-board.png) · [PDF](./kadosh-love-board.pdf)
- **Currency:** UGX throughout. Figures are converted at a fixed sample rate of 1 USD = UGX 3,700; this is not a live exchange rate.
- **Demo only:** balances and activity persist in the browser. Transfers, card operations, and deposits do not use real accounts or move real money.

## Run locally

Open `index.html` in a modern browser. Without a configured backend, the app uses local browser storage.

## Optional demo SQL backend

The GitHub Pages app is a static site; server-side SQL must run separately. The API in `api/` is intended for a Vercel deployment backed by Supabase Postgres.

1. Create a Supabase project and enable anonymous sign-in under **Authentication → Providers**.
2. Run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL Editor.
3. Import this repository into Vercel. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as server-only environment variables. **Never add the service-role key to the repository or browser config.**
4. Set `ALLOWED_ORIGINS` to the exact comma-separated origins that serve the app, for example `https://kawembawilfred655-afk.github.io,https://YOUR-PROJECT.vercel.app`.
5. After deploying, set `apiBase`, `supabaseUrl`, and the public Supabase anon/publishable key in [`public-config.js`](./public-config.js). The anon key is designed for browser use; keep Supabase RLS enabled. Commit the public config and allow GitHub Pages to redeploy.

Each demo transaction is tied to its Supabase anonymous user. The API checks that session, validates transaction fields, restricts CORS to configured origins, and stores the record in Postgres. This example does **not** implement regulated banking, real authentication, money movement, or a production ledger.
