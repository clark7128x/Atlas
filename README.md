# Atlas

A search tool for a company's internal documents — ask a question in plain language, get an answer with the exact source passage highlighted, scoped to only the documents you actually have access to.

Built as a full-stack portfolio project, structured as five independently-shippable phases rather than one big bang release.

## Why

Most hobby RAG projects skip access control entirely — any user's query can retrieve any document in the vector store. Atlas treats that as the headline risk, not an afterthought:

- **Every retrieval query is scoped by owner/org at the database level**, not filtered after the fact.
- **Answer provenance is inline.** The exact matched passage is highlighted in place, not just a filename link.
- Anyone can browse the app in **guest mode** — sign-in is only required the moment you actually need your own documents or an answer, not before you've seen anything.

## Status

This repo follows the phased plan in [`PHASES.md`](./PHASES.md). Current state:

- [x] **Phase 0 — Skeleton:** Next.js UI, Express API, Postgres via Prisma, Docker Compose
- [x] Real authentication (bcrypt + JWT) with login **and** registration, org-scoped from the start
- [x] Guest mode: the main app is always visible; a "Sign in" modal gates only document access and querying
- [ ] **Phase 1 — Scoped RAG:** document upload → owner-scoped embeddings (pgvector), cited answers with provenance highlight — *the tenant-isolation test for this belongs to Phase 1, earlier than in the other two projects, because it's the risk this project is judged on*
- [ ] **Phase 2 — Agentic:** LangGraph agent with specialist document routing, session memory
- [ ] **Phase 3 — Infra:** async ingestion queue, sandboxed file processing, observability
- [ ] **Phase 4 — Security & polish:** audited cross-tenant retrieval test, multi-agent side-flow

See [`PRODUCT.md`](./PRODUCT.md), [`ARCHITECTURE.md`](./ARCHITECTURE.md), and [`DESIGN.md`](./DESIGN.md) for the full spec each phase is being built against.

## Planned stack

| Layer | Tech |
|---|---|
| Frontend | Next.js, TypeScript, Tailwind CSS |
| API | Node.js, Express |
| AI service | Python, LangChain, LangGraph |
| Data | PostgreSQL (Prisma), Redis, pgvector |
| Infra | RabbitMQ, S3, Docker, Prometheus/Grafana |

## Running it locally

```bash
docker compose up -d          # Postgres

cd apps/api
npm install
npm run db:generate && npm run db:push && npm run db:seed
npm run dev                   # http://localhost:3001

cd ../web
npm install
npm run dev                   # http://localhost:3000
```

Seeded demo login: `alice@acme.com` / `password123` — or register a new account from the sign-in modal.

## Structure

```
apps/
  web/    Next.js frontend (guest mode + auth modal)
  api/    Express API + Prisma (owner/org-scoped from the schema up)
```