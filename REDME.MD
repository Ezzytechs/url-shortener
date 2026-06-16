```# Production-Grade URL Shortener API

A containerized, highly resilient JSON REST API for a URL shortener service built with Node.js, TypeScript, Express, and Prisma ORM, utilizing PostgreSQL for persistence.

## Features & Implementation Architecture
- **Layered Architecture:** Implements a strict separation of concerns through Controller-Service-Repository patterns.
- **Type Safety & Validation:** Comprehensive compile-time type safety with TypeScript, and strict runtime payload enforcement using Zod.
- **High-Performance Querying:** Built-in PostgreSQL indexes on slug parameters ensuring O(1) lookups during redirection workflows.
- **Click Analytics:** Real-time logging of execution timestamps and `User-Agent` headers per redirection.

---

## Technical Stack
- **Runtime:** Node.js (v20+ Alpine)
- **Language:** TypeScript (Strict Mode)
- **Framework:** Express.js
- **ORM:** Prisma v7
- **Database:** PostgreSQL 15

---

## Quick Start & Setup

### Prerequisites
Ensure you have the following installed on your host system:
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [Node.js v20+](https://nodejs.org/) (Only required for local bare-metal development)

### 1. Environmental Configuration
Clone the repository and create a `.env` file in the root directory:
```env
PORT=8080
NODE_ENV=development
DATABASE_URL="postgresql://postgres:supersecretpassword@localhost:5432/url_shortener?schema=public"

```

### 2. Run Locally via Docker Compose (Recommended)

The fastest way to spin up the entire stack (Database + API Engine + Persistence layers) is utilizing docker-compose:

```bash
# Build and run the containers in detached mode
docker compose up -d --build

```

This command automatically coordinates database volume mapping, exposes port `8080` for inbound traffic, performs database migrations safely, and boots up the API service.

### 3. Local Bare-Metal Development Setup

If you prefer running the Node application directly on your local host machine while keeping PostgreSQL inside Docker:

```bash
# 1. Spin up the PostgreSQL container alone
docker compose up -d postgres

# 2. Install native node dependencies
npm install

# 3. Synchronize database migrations via Prisma CLI
npx prisma migrate dev --name init

# 4. Start the live-reloading development server
npm run dev

```

---

## API Documentation & cURL Examples

### 1. Create a Short Link

Generates a compressed short-link slug mapping to a targeted destination URL. Supports optional custom slugs and future-dated expirations.

* **Endpoint:** `POST /api/links`
* **Headers:** `Content-Type: application/json`

#### Example A: Auto-generated short link

```bash
curl -X POST http://localhost:8080/api/links \
     -H "Content-Type: application/json" \
     -d '{"targetUrl": "[https://google.com](https://google.com)"}'

```

#### Example B: Custom short link with a future expiration date

```bash
curl -X POST http://localhost:8080/api/links \
     -H "Content-Type: application/json" \
     -d '{
       "targetUrl": "[https://github.com](https://github.com)",
       "slug": "my-github-profile",
       "expiresAt": "2026-06-15T22:00:00.000Z"
     }'

```

---

### 2. Resolve Short Link (Redirect)

Resolves a given short-link slug, registers structural usage analytics (`User-Agent`, timestamps), and performs an explicit HTTP 302 redirection.

* **Endpoint:** `GET /:slug`

```bash
curl -i http://localhost:8080/my-github-profile

```

*Note: The `-i` flag displays response headers, showcasing the `HTTP/1.1 302 Found` status code along with the target destination mapped inside the `Location` header field.*

---

### 3. List All Links

Retrieves a global manifest of all existing active and expired short links populated with automated real-time click counts.

* **Endpoint:** `GET /api/links`

```bash
curl -X GET http://localhost:8080/api/links

```

---

### 4. Remove a Short Link

Permanently destroys a target link mapping and clears all cascading relational analytics from storage.

* **Endpoint:** `DELETE /api/links/:slug`

```bash
curl -X DELETE http://localhost:8080/api/links/my-github-profile

```

---

### 5. Health Check Engine (Bonus Endpoint)

Monitors operational readiness and verifies active multi-tiered connections directly to the backing PostgreSQL infrastructure.

* **Endpoint:** `GET /health`

```bash
curl -X GET http://localhost:8080/health

```

---

## Known Systemic Limitations

1. **In-Memory Rate Limiting Volatility:** The current optional rate-limiting implementation relies entirely on volatile local server RAM maps. In a scaled multi-instance architecture behind a round-robin Load Balancer, client rate limits will reset independently per cluster node. To optimize this for corporate production environments, an external distributed cache store such as Redis should replace the in-memory middleware map.
2. **Horizontal Scale Race Conditions:** While the application uses a safe collision-avoidance check looping pattern when generating automatic short slugs, under massive concurrent parallel operations, two threads might evaluate an empty slug simultaneously before committing. For massive workloads, changing from a random character look-up algorithm to a distributed snowflake sequencing ID or deterministic hashing strategy would completely isolate clustering bottlenecks.
3. **Cascading Database Purges:** Deleting a hot-link records invokes a cascade-deletion schema rule dropping thousands of analytics rows synchronously within a single transaction blocks. For extremely high-traffic systems, this could block connection pooling threads; analytics records should instead be shifted to an asynchronous message broker or analytical data-warehouse for historical archival.