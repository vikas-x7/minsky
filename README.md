# Dynamic Event Ticketing Platform

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

- Next.js 15 (App Router, Turbopack)
- React 19
- Zustand (Global State Management)
- React Query (Server State Management)
- Axios (HTTP Client)
- React Hook Form & Zod (Form Validation)
- TailwindCSS v4 (Styling)
- Lucide React (Icons)

### Backend

- NestJS v11
- Drizzle ORM (Database ORM)
- PostgreSQL (Primary Database)
- Upstash Redis (Caching & Rate Limiting)
- Class Validator & Class Transformer
- Helmet (Security Headers)

### Tooling & Infrastructure

- Turborepo (Monorepo Management)
- Docker & Docker Compose (Containerization)
- Vitest & Supertest (Unit, Integration & E2E Testing)
- TypeScript v5.9
- Husky & Lint-Staged (Git Hooks & Pre-commit checks)
- ESLint & Prettier (Code Quality)

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

You can set up and run this project using either **Docker** (recommended) or **Manually** via `pnpm`.

### Method 1: Setup with Docker (Recommended)

1. **Clone the repository**

   ```bash
   git clone https://github.com/vikas-x7/minsky
   cd minsky
   ```

2. **Setup Environment Variables**
   Create `.env` files in `apps/web/.env`, `apps/api/.env`, and `packages/database/.env` using the provided `.env.example` templates.

3. **Start the containers**
   ```bash
   docker compose up --build
   ```
   _Note: The Docker setup will automatically sync your database schema and seed the initial data._

---

### Method 2: Manual Setup with pnpm

1. **Clone the repository & Install Dependencies**

   ```bash
   git clone https://github.com/vikas-x7/minsky
   cd minsky
   pnpm install
   ```

2. **Setup Environment Variables**
   Create `.env` files in `apps/web/.env`, `apps/api/.env`, and `packages/database/.env` using the provided `.env.example` templates.

3. **Setup and Seed the Database**
   Navigate to the database package to push the schema and seed the initial data:

   ```bash
   cd packages/database
   pnpm db:push:force
   pnpm db:seed
   cd ../../
   ```

4. **Start the Development Servers**
   ```bash
   pnpm dev
   ```
   _This will start both the Next.js frontend and NestJS backend concurrently._

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
