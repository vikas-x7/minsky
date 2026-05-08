# 🎟️ Dynamic Event Ticketing Platform

A full-stack event ticketing platform built with Next.js 15, NestJS, Turborepo, Drizzle ORM, and PostgreSQL.

---

## Features

- Event listing page
- Event detail page
- Ticket booking system
- User bookings page
- Booking confirmation page
- Analytics APIs
- Redis caching
- Concurrency-safe bookings
- Vitest testing setup
- Docker support
- Shared database package with Drizzle ORM

---

## Tech Stack

### Frontend

- Next.js 15
- React Query
- TailwindCSS

### Backend

- NestJS
- Drizzle ORM
- PostgreSQL
- Redis

### Tooling

- Turborepo
- Vitest
- Docker Compose
- TypeScript

---

## Project Structure

```txt
apps/
  web/      → Next.js frontend
  api/      → NestJS backend

packages/
  database/ → Shared database schema
```

---

## Setup

### 1. Clone Repository

```bash
git clone https://github.com/vikas-x7/minsky
cd minsky
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Start PostgreSQL

```bash
docker compose up --build
```

### 4. Setup Database

```bash
cd packages/database

pnpm db:push
pnpm db:seed
```

### 5. Start Development Server

```bash
pnpm dev
```

Frontend:

```txt
http://localhost:3000
```

Backend:

```txt
http://localhost:3001
```

---

## Testing

Run test commands inside:

```bash
cd apps/api
```

### Run All Tests

```bash
pnpm test
```

### Run Unit Tests

```bash
pnpm test:unit
```

### Run Integration Tests

```bash
pnpm test:integration
```

### Run E2E Tests

```bash
pnpm test:e2e
```

### Run Coverage

```bash
pnpm test:coverage
```

---

## Environment Variables

```env
DATABASE_URL="postgresql://user:password@host:5432/db_name?sslmode=require"

PORT=3001
NODE_ENV=development

CORS_ORIGIN="http://localhost:3000"
ADMIN_API_KEY="admin-secret-key"

PRICING_WEIGHT_TIME=1.0
PRICING_WEIGHT_DEMAND=1.0
PRICING_WEIGHT_INVENTORY=1.0

UPSTASH_REDIS_REST_URL="https://your-upstash-url"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"
```

---

## Assignment Requirements Covered

- Next.js 15
- NestJS
- Turborepo
- Drizzle ORM
- PostgreSQL
- Concurrency Control
- Unit / Integration / E2E Testing

---

More implementation details are available in `DESIGN.md`.
