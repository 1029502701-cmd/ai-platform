# AI SaaS Platform

## Overview

A long-term production AI SaaS platform built on Cloudflare, targeting Mainland China users.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS |
| Backend | Cloudflare Pages Functions (Workers compatible) |
| Database | Cloudflare D1 (SQLite) |
| Cache/Session | Cloudflare KV |
| File Storage | Cloudflare R2 |
| ORM | Drizzle ORM |
| Testing | Vitest (co-located) |

## Getting Started

```powershell
# 1. Install dependencies
npm install

# 2. Copy environment template
Copy-Item .dev.vars.example .dev.vars
# Edit .dev.vars with your actual API keys

# 3. Start development server
npm run dev
```

> **Note**: `npm install` may be slow in China. You can use a mirror:
> ```powershell
> npm config set registry https://registry.npmmirror.com
> npm install
> ```

## Project Structure

```
├── functions/          # Cloudflare Pages Functions (API layer)
│   └── api/            # API route handlers
├── shared/             # Shared service layer (backend logic + types)
│   └── services/       # Business logic services
├── src/                # React frontend
├── drizzle/            # Database schema & migrations
├── tests/              # Unit & integration tests
├── public/             # Static assets
└── .codex/             # Development organization & agent docs
```

## Cloudflare Deployment

This project deploys to Cloudflare Pages. See `.codex/CLOUDFLARE_GUIDE.md` for details.

## Development Rules

All development must follow the team rules in `.codex/RULES.md` and workflow in `.codex/WORKFLOW.md`.

## License

Internal use only.
