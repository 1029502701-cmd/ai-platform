# 🇨🇳 China Network Compatibility (Highest Priority)

This platform is primarily designed for users in mainland China.

Every architecture decision MUST consider network compatibility.

Never assume Cloudflare services are fully reachable from mainland China.

Before implementing any feature, ask:

- Will this architecture work reliably for users in mainland China?
- Will it introduce additional cross-domain requests?
- Will it increase latency or connection failures?
- Is there a more China-friendly solution?

Preferred principles:

- Use ONE custom domain whenever possible.
- Use Pages Functions as the unified API gateway.
- Avoid exposing workers.dev domains.
- Avoid frontend direct requests to Workers.
- Minimize cross-domain requests.
- Keep frontend and API under the same origin.
- Reduce DNS lookups and TLS handshakes.
- Design APIs to tolerate unstable networks.
- Retry transient failures where appropriate.
- Keep requests lightweight.
- Provide graceful fallback and timeout handling.

Never optimize for Cloudflare best practices if they reduce reliability for mainland China users.

When architecture recommendations conflict, prioritize China network compatibility unless explicitly instructed otherwise.

# AI Platform Development Rules

## IMPORTANT

If there is a choice between:

A) Quick implementation

or

B) Better long-term architecture

Always choose B.

If a requirement may create future technical debt,
stop and propose a better architecture before coding.

Never sacrifice architecture for speed.

Every time before modifying any code:

1. Read this RULES.md completely.
2. Understand the current architecture.
3. Do NOT start coding immediately.
4. First analyze the impact.
5. Output your implementation plan.
6. Wait until the plan is validated.
7. Then implement.

---

# Core Principles

This is a long-term production project.

Never make quick fixes.

Always choose scalable architecture.

Code quality is more important than coding speed.

---

# Architecture Rules

Always keep modules independent.

Never create tightly coupled code.

Preferred architecture:

Frontend
↓

Pages Functions(API)
↓

Service Layer
↓

Database

Never allow:

Frontend
↓

Workers Directly

---

# API Rules

All frontend requests must use:

/api/...

Never hardcode workers.dev domains.

Never expose internal API URLs.

---

# Cloudflare Rules

Use Pages Functions as API gateway.

Avoid CORS.

Avoid cross-domain requests.

Do not require frontend configuration changes between development and production.

---

# Database Rules

Prefer D1.

KV only for cache/session.

R2 only for files.

Never store structured business data in KV.

---

# AI Rules

All AI providers must implement the same interface.

Never write provider-specific business logic.

Support future providers:

- OpenAI
- Gemini
- Claude
- Qwen
- DeepSeek
- OpenRouter

---

# Prompt Rules

Never hardcode prompts.

Prompt must be configurable.

Prompt should support version management.

---

# Knowledge Rules

Knowledge must be separated from prompts.

Support future admin editing.

---

# Report Rules

Reports should be component-based.

Do not hardcode report layout.

---

# Admin Rules

Everything should be manageable from Admin.

Examples:

Users

Prompts

Knowledge

AI Providers

Reports

Bloggers

Affiliate

Logs

Configs

---

# Code Rules

Never write giant files.

One responsibility per module.

Keep functions short.

Prefer reusable code.

Avoid duplicate logic.

---

# Error Handling

Always catch exceptions.

Never silently ignore errors.

Log important events.

Provide meaningful error messages.

---

# Performance Rules

Avoid unnecessary database queries.

Cache when appropriate.

Lazy load heavy modules.

Streaming whenever possible.

---

# UI Rules

Mobile first.

Responsive.

Loading state.

Empty state.

Error state.

Dark mode friendly.

---

# Security Rules

Never trust frontend input.

Validate all requests.

Protect admin APIs.

Never expose secret keys.

---

# Before Coding

Always answer:

1. What files will change?
2. Why?
3. Is there a better architecture?
4. Will this affect existing features?
5. Is it backward compatible?

Only after answering these questions should coding begin.

---

# Before Finishing

Always check:

✔ Build passes

✔ No TypeScript errors

✔ No lint errors

✔ No duplicate code

✔ Existing features still work

✔ New feature documented

Then provide:

- Files modified
- Reason
- Possible risks
- Future optimization suggestions

Never say "Done" without verification.
# Existing User Compatibility

This project already has existing users.

Do not introduce breaking changes.

If a database structure, API, or configuration must change:

- provide a migration plan
- keep backward compatibility
- avoid interrupting existing users

Never rewrite working functionality without necessity.
# Deployment Rules

Before introducing any new service:

Evaluate:

- Is it supported by Cloudflare?
- Is it accessible from mainland China?
- Does it require another domain?
- Does it introduce additional latency?
- Can it be deployed within the current architecture?

Prefer fewer services and fewer domains.
# Project Principle

This is a production platform, not a demo.

Every implementation should be:

- scalable
- maintainable
- configurable
- production-ready
- compatible with mainland China networks