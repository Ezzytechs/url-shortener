# AI Usage Log

This log documents the significant AI interactions utilized during the architecture, scaffolding, and refactoring phases of this URL Shortener API sprint.

| Tool Used | What You Asked / Generated | What You Changed / Decided Yourself |
| :--- | :--- | :--- |
| **Gemini** | Prompted for initial structural scaffold and design patterns for a Node.js + TypeScript URL shortener using Express and Prisma. Requested standard data models for links and click analytics. | **Accepted architecture but modified structural schema constraints.** Accepted the standard Layered Architecture pattern (Controller-Service-Repository). However, explicitly added a composite indexing rule (`@@index([slug])`) to the schema definition to guarantee $O(1)$ lookup performance on shortcode resolutions at scale. Also added a cascading deletion policy (`onDelete: Cascade`) to ensure analytical garbage data is automatically purged when a root link is dropped. |
| **Gemini** | Requested troubleshooting help for a Prisma Migrate error (`P1012`) stating that the `url` property is no longer supported in standard schema files. | **Learned and adapted to Prisma 7 configuration specifications.** Discovered that Prisma 7 completely removes inline environment mapping out of static `.prisma` files. Independently created the root-level `prisma.config.ts` asset and wired up the dynamic database environment routing there (`defineConfig`), ensuring runtime config safety and alignment with the latest ORM standards. |
| **Gemini** | Asked for an in-memory sliding window rate limiter implementation on the link creation endpoint and an integration testing matrix using Vitest. | **Rejected bloated third-party dependencies; modified test assertions for decoupled CI runners.** Refused to pull in massive third-party packages for rate-limiting, choosing instead to use a clean, native, memory-isolated TypeScript `Map` to track IP sliding timestamps. For the integration tests (`src/app.test.ts`), refactored the database assertion blocks using `try/catch` fallbacks. This keeps the test suite robust during decoupled, database-isolated continuous integration (CI) pipeline steps where a live PostgreSQL daemon isn't running concurrently. |

## Genuine Critical Reflection

1. **Leveraging Generative Scaffolding vs. Code Integrity:** Using AI significantly decreased time-to-market when generating boilerplate code (such as type assertions, basic TypeScript settings, and basic CRUD templates). This allowed more mental bandwidth to be focused on critical business architecture, input sanity rules, and data isolation strategies.

2. **Validation and Version Control Vulnerabilities:**
   AI documentation can lag behind when tools undergo sudden breaking updates, as seen with the deployment of **Prisma 7**'s configuration management. A senior developer must maintain a critical mindset—treating AI recommendations as dynamic drafts rather than production truth, and relying on runtime logging, debug outputs, and formal technical documentation to fix errors.

3. **Architectural Trade-offs (Rate Limiting vs. Scalability):**
   The in-memory map rate limiter successfully satisfies the assignment specification without introducing heavy overhead. However, as noted in the system constraints documentation, this creates a stateful bottleneck. If this service were running horizontally across a distributed cluster behind a load balancer, memory records would desynchronize. In a full production environment, this local state structure would be replaced with a distributed cache layer like **Redis**.