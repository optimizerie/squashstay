# SquashStay — Claude Code Context

## Repo
- **GitHub**: https://github.com/optimizerie/squashstay
- **Branch**: `main` (deploy branch)

## Stack
- **Frontend**: React + TypeScript + Vite (hash-based router, no React Router)
- **Backend**: Supabase (auth, database, realtime)
- **Hosting**: Railway (auto-deploys from GitHub Actions on push to main)
- **Email**: Resend

## Key Paths
- `src/App.tsx` — auth context, routing logic, shared screens (PendingApproval, Loading)
- `src/pages/` — one file per page
- `src/components/shared/Navbar.tsx` — shown on all dashboard pages
- `src/lib/supabase.ts` — Supabase client + helper functions
- `src/types/` — shared TypeScript types
- `supabase/migrations/` — database migrations

## Tool Credentials
All login tokens and API keys are in `.env.local`:
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — Supabase project
- `SUPABASE_ACCESS_TOKEN` — Supabase CLI auth
- `RAILWAY_API_TOKEN` — Railway CLI auth
- `RESEND_API_KEY` — Resend email API

To authenticate tools in a new session:
```bash
# Railway
railway login   # or use RAILWAY_API_TOKEN from .env.local

# Supabase
supabase login  # or use SUPABASE_ACCESS_TOKEN from .env.local
```

## Deploy
Push to `main` → GitHub Actions triggers → Railway redeploys automatically.
To deploy manually: `railway up --service squashstay`
