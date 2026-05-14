# Parcel Routing System

An internal operator tool for routing parcels to the correct department based on business rules. Built as a production-grade take-home engineering assignment.

***

## Quick Start

```bash
git clone https://github.com/you/parcel-router
cd parcel-router
cp .env.example .env          # fill in DATABASE_URL
npm install
npx prisma migrate dev        # creates DB tables
npm run dev                   # http://localhost:3000
npm test                      # run all tests
```

***

## System Overview

```mermaid
flowchart TD
    A[Operator UI] -->|Single parcel form| B[POST /api/route]
    A -->|Batch file upload .xml/.json| C[POST /api/batch]
    A -->|View history| D[GET /api/audit]

    B --> E[Zod Validation]
    C --> F[Format Detection]
    F -->|XML| G[XML Parser]
    F -->|JSON| H[JSON Parser]
    G --> E
    H --> E

    E -->|Valid| I[Rule Engine]
    E -->|Invalid| J[400 / 422 Error Response]

    I --> K{Evaluate Rules\nin Priority Order}
    K -->|priority 1| L[InsuranceRequired\nvalue > 1000]
    K -->|priority 2| M[MailDepartment\nweight ≤ 1kg]
    K -->|priority 3| N[RegularDepartment\nweight ≤ 10kg]
    K -->|priority 4| O[HeavyDepartment\nweight > 10kg]
    K -->|no match| P[ManualReview\nFallback]

    L --> Q[RouteDecision]
    M --> Q
    N --> Q
    O --> Q
    P --> Q

    Q --> R[Persist to PostgreSQL]
    Q --> S[Pino Structured Log]
    Q --> T[API Response]
    T --> A
```

***

## Architecture Decisions

### 1. Rule Engine Pattern (not if/else chains)

**Decision:** Business rules are modelled as a typed `Rule[]` array, evaluated in priority order. Each rule has a `condition` function and a `decision` function.

**Why:** Adding a new department or routing condition requires adding a single object to the array. No existing code changes. This directly implements the Open/Closed Principle — the engine is open for extension but closed for modification.

**Alternative considered:** A JSON/YAML config DSL (like json-rules-engine). Rejected because it adds an abstraction layer without benefit at this scale, makes TypeScript types harder to enforce, and means engineers must learn a DSL instead of reading plain TypeScript.

**Trade-off:** Rules are code, not database rows. Changing a rule requires a deployment. In a future iteration, rules could be stored in the DB and loaded at startup — but this introduces security and validation complexity that isn't warranted here.

### 2. XML as Primary Batch Format (with JSON support)

**Decision:** XML is the primary batch format because the company's existing data (`Container_68465468.xml`) is already in this schema. JSON is also supported for modern API integrations.

**Why:** Forcing an XML-native organisation to convert to JSON adds migration risk with no technical benefit. The parser handles both formats behind a unified interface — callers don't need to know which format was uploaded.

**Notable detail:** The XML schema contains a typo — `<Receipient>` instead of `<Recipient>`. The parser matches the upstream schema exactly. We never "fix" upstream data contracts unilaterally — this is documented and the typo is preserved intentionally.

### 3. Next.js 14 Monorepo (not separate backend + frontend)

**Decision:** Single Next.js App Router project with API routes serving both the UI and the HTTP interface.

**Why:** For a take-home assignment, a monorepo is runnable in one command and reviewable in one repo. The core engine (`src/core/`) has zero Next.js dependencies — it could be extracted into a standalone service or npm package without changing a line of the engine.

**Production note:** At scale, the routing engine would be a dedicated microservice with its own deployment lifecycle, exposed via gRPC or REST, with the Next.js app as a thin client.

### 4. PostgreSQL + Prisma

**Decision:** PostgreSQL for persistence, Prisma as the ORM.

**Why:** Every routing decision is persisted as an immutable `RoutingRecord`. This provides a full audit trail, enables pattern detection (e.g. spike in Heavy parcels), and gives operators a queryable history. Prisma provides type-safe queries, auto-generated migrations, and schema-as-documentation.

**Trade-off:** This requires a running Postgres instance. For a purely stateless demo, an in-memory store would suffice — but the assignment explicitly evaluates monitoring and reliability, which requires persistent state.

### 5. Pino Structured Logging

**Decision:** Pino over `console.log`, with a typed `RoutingLogEvent` shape.

**Why:** Every routing decision emits a structured JSON log event with consistent fields (`parcelWeight`, `parcelValue`, `department`, `appliedRule`, `processingMs`). In production, these feed directly into Datadog, CloudWatch, or Grafana Loki for alerting and dashboards. Unstructured logs are unsearchable at scale.

***

## Routing Rules

Rules are evaluated in ascending priority order. First matching rule wins.

| Priority | Rule Label | Condition | Department | Insurance |
|---|---|---|---|---|
| 1 | `InsuranceRequired` | `value > 1000` | Determined by weight sub-rules | ✅ Yes |
| 2 | `MailDepartment` | `weight ≤ 1 kg` | Mail | No |
| 3 | `RegularDepartment` | `weight ≤ 10 kg` | Regular | No |
| 4 | `HeavyDepartment` | `weight > 10 kg` | Heavy | No |
| — | `Fallback` | No rule matched | ManualReview | No |

### Boundary Cases

| Weight | Expected Department |
|---|---|
| 1.00 kg | Mail |
| 1.01 kg | Regular |
| 10.00 kg | Regular |
| 10.01 kg | Heavy |

***

## How to Add a New Routing Rule

Open `src/core/rules/defaultRules.ts` and add one object to the array:

```typescript
// Example: route parcels marked "fragile" to a Fragile Department
{
  label: 'FragileDepartment',
  priority: 0,                          // priority 0 = evaluated before all others
  condition: (p) => !!p.attributes?.fragile,
  decision: () => ({
    department: 'Fragile',
    requiresInsurance: false,
    reason: 'Parcel marked fragile — routed to Fragile Department',
    appliedRuleLabel: 'FragileDepartment',
    flags: [],
  }),
},
```

**That is the entire change.** No modifications to the engine, API, or UI.

Then add a test:

```typescript
it('routes fragile parcels to Fragile Department', () => {
  const result = engine.route({ weight: 2, value: 0, attributes: { fragile: true } });
  expect(result.department).toBe('Fragile');
});
```

***

## Security Measures

### Implemented

| Measure | Where | Protects Against |
|---|---|---|
| Security headers (CSP, HSTS, X-Frame-Options) | `next.config.ts` | XSS, clickjacking, MIME sniffing |
| Zod input validation | All API routes | Injection, malformed input |
| File size limit (10MB) | `/api/batch` | DoS via large file uploads |
| File type validation | `BatchUpload.tsx` + parser | Unexpected file format attacks |
| `robots: noindex` | `layout.tsx` metadata | Prevents search engine indexing of internal tool |
| `poweredByHeader: false` | `next.config.ts` | Stack fingerprinting |
| Rate limiting (in-memory) | `src/lib/security.ts` | Brute force / abuse |
| Error messages without stack traces | All API routes | Information leakage |

### Would Add in Production

- **Authentication** (NextAuth.js or Auth0) — this tool should be behind SSO, not publicly accessible
- **Redis-backed rate limiting** (@upstash/ratelimit) — in-memory rate limiter doesn't work across horizontal instances
- **CSRF protection** — for state-mutating form submissions
- **Audit log immutability** — routing records should be append-only with no DELETE permissions at the DB user level
- **VPC / private networking** — the DB should never be publicly accessible
- **Dependency scanning** (Snyk / Dependabot) — automated CVE detection in CI

***

## Observability & Failure Handling

### Structured Log Events

Every routing decision emits:
```json
{
  "level": "info",
  "event": "routing_decision",
  "parcelWeight": 5,
  "parcelValue": 0,
  "department": "Regular",
  "requiresInsurance": false,
  "appliedRule": "RegularDepartment",
  "source": "single",
  "processingMs": 3
}
```

### Failure Scenarios

| Failure | Detection | Response |
|---|---|---|
| Invalid parcel input | Zod validation | 400 with field-level errors |
| Malformed JSON body | try/catch on `req.json()` | 400 with message |
| Malformed XML file | Parser try/catch | 422 with parse error details |
| File too large | Size check before parsing | 413 with size limit message |
| Rule engine throws | try/catch in API route | 500 with correlation ID, ERROR log |
| DB write fails | Prisma throws, caught by handler | 500 with correlation ID |
| No rule matches parcel | Engine fallback | Routes to ManualReview, never throws |
| Rate limit exceeded | In-memory counter | 429 with Retry-After header |

### What "Team Notification" Looks Like in Production

In production, Pino logs ship to a log aggregation service (Datadog / CloudWatch Logs). Alerts are configured on:
- `level: "error"` events → PagerDuty/Slack alert
- `department: "ManualReview"` spike → anomaly alert
- `processingMs > 500` → latency alert
- Batch job `status: "failed"` → immediate notification

***

## Testing Strategy

```
tests/
├── unit/
│   ├── RuleEngine.test.ts      # All routing rules + boundary cases + extensibility
│   ├── parcelSchema.test.ts    # Zod validation — valid and invalid inputs
│   └── xmlParser.test.ts       # XML parsing using real fixture file
└── integration/
    ├── api-route.test.ts       # POST /api/route — routing outcomes + validation errors
    └── api-batch.test.ts       # POST /api/batch — XML + JSON + error cases
```

**Regression protection:** The unit tests use real parcel data from `Container_68465468.xml` as named test cases. If a rule change accidentally breaks a known parcel's routing, the test fails with a specific recipient name — not a generic assertion error.

**DB isolation:** Integration tests mock Prisma via `vi.mock("@/lib/db")` — no real database needed to run the test suite.

```bash
npm test                    # all tests
npm run test:unit           # unit tests only
npm run test:integration    # integration tests only
npm run test:coverage       # coverage report
```

***

## Scaling Considerations

| Concern | Current Approach | Production Approach |
|---|---|---|
| Rule evaluation | In-memory, synchronous | Same — rules are stateless, microsecond evaluation |
| Batch processing | Synchronous in request | Async queue (BullMQ + Redis), webhook on completion |
| DB writes | Synchronous `createMany` | Same for small batches; async for >1000 parcels |
| Rate limiting | In-memory per instance | Redis-backed (@upstash/ratelimit) |
| Horizontal scaling | Stateless engine scales freely | Add instances behind load balancer |
| Rule changes | Code deploy | Feature flags (LaunchDarkly) for zero-downtime rule rollout |

***

## Trade-offs & Known Limitations

| Limitation | Reason | Mitigation |
|---|---|---|
| In-memory rate limiter | Redis not in scope for take-home | Replace with @upstash/ratelimit in production |
| No authentication | Internal tool scope | Add NextAuth.js + RBAC before public deployment |
| Rules require code deploy to change | Simplicity over dynamism | Add rule versioning + DB-stored rules as future improvement |
| No async batch processing | Synchronous is fine for <1000 parcels | Add BullMQ queue for large volume |
| No rule conflict detection | Out of scope | Add a startup validator that checks for overlapping rule conditions |

***

## Future Improvements

1. **Rule versioning** — store rule snapshots in DB, replay historical batches with the rules active at that time
2. **Shadow mode for new rules** — run a new rule in parallel without affecting routing outcome, compare results before activating
3. **Admin panel** — UI for managing active rules without a code deploy
4. **OpenTelemetry traces** — distributed tracing across rule evaluation, DB write, and log emission
5. **Webhook notifications** — POST to a configured URL when a batch completes or a ManualReview is flagged
6. **Duplicate detection** — flag duplicate parcels in a batch (same recipient + weight + value)

***

## AI Usage

See [docs/AI_USAGE.md](./docs/AI_USAGE.md) for full transparency on AI-assisted development.

***

## Environment Variables

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/parcel_router"
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
RATE_LIMIT_MAX="100"
RATE_LIMIT_WINDOW_MS="60000"
MAX_BATCH_FILE_SIZE_MB="10"
LOG_LEVEL="info"
```

## Middleware & Cross-Cutting Concerns

Rate limiting, correlation IDs, and request-scoped concerns are handled
in `src/middleware.ts` — not in individual route handlers.

**Why middleware:**
Duplicating rate limiting across every API route creates drift.
One route gets updated, another doesn't.
Middleware runs before any route handler, on every matching request,
ensuring consistent enforcement with zero duplication.

**Route-specific limits:**
| Route | Limit | Reason |
|---|---|---|
| POST /api/route | 60 req/min | Single parcel — lightweight |
| POST /api/batch | 10 req/min | File processing — expensive |
| GET /api/audit | 30 req/min | DB read — moderate cost |

**Correlation IDs:**
Every API request receives a `x-correlation-id` UUID header.
This ID appears in all log events for that request.
When an operator reports "something went wrong at 3pm", you search
logs for the correlation ID and see the full request trace.

**Production note:**
The in-memory rate limiter works for a single server instance.
For multi-instance deployments, replace with @upstash/ratelimit + Redis.
The interface is identical — only the backing store changes.

## Monitoring & Reliability

### Structured Log Events

Every routing decision emits a JSON log event with consistent fields:

\`\`\`json
{
  "level": "info",
  "event": "routing_decision",
  "parcelWeight": 5,
  "parcelValue": 1500,
  "department": "Regular",
  "requiresInsurance": true,
  "appliedRule": "InsuranceRequired",
  "source": "batch_xml",
  "batchId": "clx1234abc",
  "processingMs": 4,
  "correlationId": "uuid-here"
}
\`\`\`

### What to Alert On (Production)

| Alert | Condition | Severity |
|---|---|---|
| Routing engine error | `event: routing_error` | 🔴 Critical |
| ManualReview spike | `department: ManualReview` rate > 5% | 🟡 Warning |
| Batch failure | `batchJob.status: failed` | 🔴 Critical |
| High insurance rate | `requiresInsurance` rate > 50% | 🟡 Anomaly |
| Latency degradation | `processingMs > 500` | 🟡 Warning |
| Rate limit spike | HTTP 429 rate > 1% | 🟡 Anomaly |

### Detecting Unusual Patterns

The `flags[]` array and `appliedRuleLabel` field enable pattern queries:

\`\`\`sql
-- Detect insurance approval spike
SELECT DATE_TRUNC('hour', "createdAt"), COUNT(*)
FROM "RoutingRecord"
WHERE "requiresInsurance" = true
GROUP BY 1 ORDER BY 1 DESC;

-- Detect sudden ManualReview increase (rule misconfiguration signal)
SELECT DATE_TRUNC('hour', "createdAt"), COUNT(*)
FROM "RoutingRecord"
WHERE department = 'ManualReview'
GROUP BY 1 ORDER BY 1 DESC;
\`\`\`

### PostgreSQL Dependency Note

This application requires **PostgreSQL** — not SQLite or MySQL.
The `flags String[]` field uses a native PostgreSQL array type.
Prisma does not support array fields on SQLite.
CI environments must use a PostgreSQL service container.

\`\`\`yaml
# GitHub Actions example
services:
  postgres:
    image: postgres:15
    env:
      POSTGRES_DB: parcel_router_test
      POSTGRES_PASSWORD: test
\`\`\`