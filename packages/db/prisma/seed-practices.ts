import { PrismaClient, GuideCategory } from '@prisma/client';

export interface GuideSeedItem {
  title: string;
  slug: string;
  category: GuideCategory;
  difficulty: string;
  readTimeMinutes: number;
  summary: string;
  content: string;
}

export interface TacticSeedItem {
  title: string;
  category: GuideCategory;
  description: string;
  impact: string;
  effort: string;
  savingsEstimate?: string;
  howToUse: string;
  howToImplement: string;
  whenUseful: string;
}


export const guidesData: GuideSeedItem[] = [
  // 1. TEAM_COMMUNICATION
  {
    title: 'The standup that actually works',
    slug: 'the-standup-that-actually-works',
    category: 'TEAM_COMMUNICATION',
    difficulty: 'Beginner',
    readTimeMinutes: 7,
    summary: 'Why traditional round-robin status updates waste engineering time, and how an async-first, blocker-driven standup cuts meetings from 45 minutes to 12 minutes.',
    content: `# The Standup That Actually Works

Most daily standups are painful status updates disguised as agile ceremonies. Six engineers sit in a circle or stare at Zoom tiles while one person recites their git commit log from yesterday. Everyone else waits for their turn to speak, mentally preparing what to say rather than listening.

If your standup takes longer than 15 minutes, it is not a synchronization checkpoint—it is an interrogation. Here is how high-performing teams replace verbal recitation with an async-first, blocker-focused framework.

---

## 1. The Core Flaw of Round-Robin Standups

The traditional three questions:
1. *What did you do yesterday?* (Answer: Jira already knows this.)
2. *What will you do today?* (Answer: The sprint board already knows this.)
3. *Any blockers?* (Answer: Usually mumbled as "No blockers" because nobody wants to derail the meeting.)

When updates are historical, teammates tune out. High-performing engineering teams reverse the priority: **Blockers and handoffs first, sprint goal alignment second, historical status never.**

---

## 2. The Async-First Model: 9:00 AM Slack Post

Before any synchronous meeting occurs, each engineer submits an async update into a designated Slack channel (e.g., \`#team-core-standup\`) between 8:30 AM and 9:30 AM:

\`\`\`markdown
### Standup: @alex
- 🎯 **Sprint Goal Focus**: Migrating auth sessions to Redis cluster
- 🚧 **Blockers / Needs**: Need DevOps help opening port 6379 between VPC subnets (CC: @jordan)
- 🤝 **Handoffs**: PR #412 is ready for review by backend peers; contains the schema migration.
\`\`\`

Notice what is missing: There is no itemized list of Jira tickets or PR links that the team doesn't care about. If there are no blockers and no cross-functional dependencies, the update takes 30 seconds to read.

---

## 3. The 10-Minute Synchronous "Walk the Board"

If your team chooses to have a live call, **never go person-by-person**. Instead, **walk the board right-to-left**:

\`\`\`
[Done] <- [In Review] <- [In Progress] <- [Ready for Dev]
\`\`\`

1. **Start with [In Review]**: Why hasn't this ticket merged? Does it need an approval? Is CI failing? Finishing existing work always takes priority over starting new tickets.
2. **Move to [In Progress]**: Are any tickets lingering past their 2-day target cycle time? If a ticket has been in progress for 4 days, ask: *"Can we split this ticket or pair to unblock it today?"*
3. **Address Blockers**: Take blocker discussions directly from the board.

---

## 4. Hard Rules for the 15-Minute Cap

- **The Parking Lot Rule**: If any two engineers start debugging an error or discussing architecture, the facilitator interrupts immediately: *"Take it to the parking lot."* Those two people stay on after the call; everyone else disconnects.
- **No Jira Ticket Editing on Screen**: The standup is not the place to fix descriptions, assign story points, or re-estimate tasks.
- **Camera-on or Camera-off Doesn't Matter**: What matters is brevity and unblocking teammates.

By shifting updates async and focusing exclusively on flow bottlenecks, your engineers get 40 hours of collective focus time back every single month.`,
  },

  {
    title: 'Incident communication roles',
    slug: 'incident-communication-roles',
    category: 'TEAM_COMMUNICATION',
    difficulty: 'Intermediate',
    readTimeMinutes: 9,
    summary: 'Commander, Scribe, and Ops: how assigning explicit non-technical roles during a P0 outage prevents chaotic Slack channels and keeps executives informed.',
    content: `# Incident Communication Roles: Who Says What During an Outage

When production goes down, the biggest threat is rarely the code bug—it is the chaos that erupts in the incident channel. 

Executives panic-pinging engineers, three developers running contradictory database queries, customer support bombarding the channel asking for ETAs, and nobody documenting what was rolled back.

Mature engineering organizations prevent this by adopting the **Incident Command System (ICS)**. During a Sev-1 outage, you need three distinct roles.

---

## 1. The Three Incident Roles

\`\`\`
+-----------------------+
|  Incident Commander   | <--- The single authority; coordinates, never writes code
+-----------------------+
       |           |
       v           v
+--------------+ +--------------------+
|  The Scribe  | | Operations / Debug |
| (Timelines,  | | (Running commands, |
|  Stakeholders| |  inspecting logs)  |
+--------------+ +--------------------+
\`\`\`

### Role 1: Incident Commander (IC)
- **Responsibility**: Coordinates response, assigns hypotheses, prevents thrashing, and decides on actions (e.g., authorizing a rollback or database reboot).
- **Rule of Thumb**: *The Incident Commander does NOT touch production or look at logs.* The moment the IC starts debugging, they lose macro-visibility of the incident.

### Role 2: The Scribe
- **Responsibility**: Maintains the running event timeline in the incident channel or Google Doc.
- **Outputs**: Records every hypothesis, action taken, timestamp, metric graph, and stakeholder update.
- **Why it matters**: Without a dedicated scribe, engineers waste 45 minutes reconstructing what happened during the post-mortem.

### Role 3: Operations Lead (The Debugger)
- **Responsibility**: Executes technical triage. Runs the rollback script, profiles the database, queries Prometheus, or isolates faulty nodes.
- **Outputs**: Reports findings verbally to the IC: *"Hypothesis confirmed: worker node memory exhausted by connection spike."*

---

## 2. Real-World Outage Timeline Example

Here is how a real P0 database connection exhaustion outage plays out when roles are followed:

\`\`\`
[14:02 UTC] Alert fires: API Gateway 502 Rate > 5%.
[14:04 UTC] Lead Engineer declares: "Declaring SEV-1. I am Incident Commander. Channel: #inc-2026-10-12."
[14:05 UTC] IC: "@sarah is Scribe. @dave is Ops Lead for DB. @jason is Ops Lead for Kubernetes."
[14:08 UTC] Scribe: "Timeline started. Incident Doc created. Impact: ~15% of checkout traffic failing."
[14:12 UTC] Ops (Dave): "Postgres max_connections reached (1000/1000). Active queries stuck in IDLE in transaction."
[14:13 UTC] IC: "Dave, your objective is to terminate idle connections older than 2 minutes. Report when executed."
[14:15 UTC] Ops (Dave): "Ran pg_terminate_backend. Active connections dropped to 210. 502s recovering."
[14:17 UTC] Scribe: "Posts public update to #status-internal: Remediation in place, error rate returned to 0.02%. Monitoring for 15 minutes."
[14:32 UTC] IC: "Incident resolved. Moving to post-mortem phase."
\`\`\`

---

## 3. Communication Templates for Executives and Customers

Executives need regular updates, but engineers cannot afford to answer *"When will it be fixed?"* every four minutes. 

The Scribe posts updates to the internal status channel on a **strict 20-minute cadence** using this formula:

\`\`\`markdown
🚨 **SEV-1 UPDATE #2** [14:20 UTC]
- **Current Impact**: Checkout checkout service returning 500 errors for ~8% of US-East customers.
- **Current Action**: Rolling back deploy v2.14.0; 2 of 4 pods replaced.
- **Estimated Next Update**: 14:40 UTC (or immediately upon status change).
- **Incident Commander**: @alex | **Scribe**: @sarah
\`\`\`

Setting a clear "Next Update" time silences incoming inquiries. Everyone knows when the next status report will arrive.`,
  },

  {
    title: 'Writing RFCs that get approved',
    slug: 'writing-rfcs-that-get-approved',
    category: 'TEAM_COMMUNICATION',
    difficulty: 'Intermediate',
    readTimeMinutes: 10,
    summary: 'A battlefield-tested RFC (Request for Comments) skeleton covering problem framing, rejected alternatives, operational risk, and phased rollouts.',
    content: `# Writing RFCs That Get Approved

Too many architectural RFCs end up in review purgatory. They span 35 pages of theoretical musings, generate 140 contentious comments on edge cases that will never occur, and eventually die of organizational exhaustion.

Great Request for Comments (RFC) documents are not academic papers. They are **decision-forcing contracts**. Their job is to build consensus, surface architectural landmines early, and provide a clear blueprint for implementation.

---

## 1. The Golden Structure of an RFC

Keep your proposal between 3 and 6 pages. Structure it with these mandatory sections:

1. **Metadata & Status**: Author, Date, Target Reviewers, Review Deadline, Status (Draft / In Review / Approved / Rejected).
2. **Context & Problem Statement**: What is broken today, and what business metric suffers if we do nothing?
3. **Goals & Non-Goals**: Define what this proposal explicitly does NOT solve.
4. **Proposed Solution**: Architecture diagrams, schema migrations, and API contracts.
5. **Alternatives Considered**: Why competing approaches were rejected.
6. **Rollout, Observability & Backout Plan**: How we test, deploy, and reverse if things break.

---

## 2. A Real RFC Skeleton: Replacing Redis with Managed KeyDB

\`\`\`markdown
# RFC-042: Migration of Session Store from Single Redis to Clustered KeyDB

## Status: IN REVIEW | Target Reviewers: @platform-team | Deadline: Oct 20

### 1. Problem Statement
Our current single-node Redis instance (r6g.xlarge) hit 84% memory utilization during Black Friday. 
Because our session payloads include OAuth refresh tokens, cache eviction is unacceptable.
Rebooting the node causes 35 seconds of downtime and drops active user sessions.

### 2. Goals & Non-Goals
- **Goals**:
  - Zero session loss during horizontal node scaling.
  - Sub-5ms p99 read/write latency.
  - Multi-threaded memory architecture to handle 85k ops/sec.
- **Non-Goals**:
  - We are NOT migrating application cache (Apollo GraphQL cache remains on separate Redis).

### 3. Proposed Solution
Deploy KeyDB in multi-master active-replication mode across 3 availability zones in us-east-1.
- Client SDK: Switch node-redis to cluster-aware client with retry backoff.
- Failover: AWS NLB with TCP health check on port 6379.

### 4. Alternatives Considered
1. **AWS ElastiCache Redis Cluster**:
   - *Why rejected*: Multi-cluster ElastiCache doubles monthly hosting cost (\$480/mo vs \$140/mo self-managed on EC2) without multi-threading.
2. **PostgreSQL session table (jsonb)**:
   - *Why rejected*: Write amplification and VACUUM overhead under 25k writes/sec would saturate Postgres IOPS.

### 5. Rollout & Migration Strategy
- **Phase 1**: Dual-write sessions to existing Redis and new KeyDB cluster for 48 hours. Reads still hit Redis.
- **Phase 2**: Cut read traffic to KeyDB via feature flag (\`SESSION_BACKEND=keydb\`).
- **Phase 3**: Monitor error rate and connection metrics for 7 days.
- **Rollback Trigger**: If p99 latency exceeds 15ms or connection errors > 0.1%, flip feature flag back to Redis immediately.
\`\`\`

---

## 3. Techniques for Rapid Approval

- **Pre-wire the Hard Stakeholders**: Never submit an RFC without having a 15-minute 1-on-1 with the senior architect who is most likely to object. Address their concerns before sending the doc to the wider team.
- **Establish a Strict Timebox**: Every RFC must have an explicit review deadline (e.g., 5 business days). When the deadline passes, unresolved comments are resolved by the tech lead.
- **Respect Non-Goals**: If someone asks, *"Can this also handle our event queue?"*, refer them to the Non-Goals section and defer to a future RFC.`,
  },

  // 2. DEV_WORKFLOW
  {
    title: 'Trunk-based vs GitFlow: picking for your team size',
    slug: 'trunk-based-vs-gitflow',
    category: 'DEV_WORKFLOW',
    difficulty: 'Intermediate',
    readTimeMinutes: 8,
    summary: 'Branch diagrams, release cadences, and merge tax: why teams under 15 engineers slow down with GitFlow, and when trunk-based development with feature flags wins.',
    content: `# Trunk-Based vs GitFlow: Picking the Right Model for Your Team Size

Few engineering debates generate as much friction as branching strategies. GitFlow feels structured and safe, while Trunk-Based Development feels terrifying to engineers who are used to release branches and manual QA hardening sprints.

The reality: **Your branching model must match your deployment frequency.** Here is an honest comparison of both models.

---

## 1. GitFlow: High Ceremony for Scheduled Release Cycles

\`\`\`
main:        o-----------------------o (v1.0.0)-------------o (v1.1.0)
              \\                     /                      /
release:       \\        o----------o                      /
                \\      /                                 /
develop:         o----o----o----------------------------o
                  \\  /
feature/auth:      o-o
\`\`\`

### How it works:
- Long-lived \`develop\` branch where features aggregate.
- Feature branches branched off \`develop\` and merged back via PR.
- \`release/*\` branches frozen for QA regression testing, hotfixed, and then merged to both \`main\` and \`develop\`.

### Who it is for:
- Teams shipping desktop software, mobile iOS/Android binaries with app store review lag, or enterprise on-premise software with quarterly release cycles.
- Teams with 30+ engineers per monolith where features cannot go to production immediately.

### Why it hurts web teams:
- **Merge Debt**: Merging back from \`release\` to \`develop\` regularly triggers severe merge conflicts.
- **Delayed Integration**: Features sit in long-lived branches for weeks. When they finally merge, integration bugs surface at the worst possible time.

---

## 2. Trunk-Based Development (TBD): The Fast CI/CD Standard

\`\`\`
main:  o-------o-------o-------o-------o-------o (Continuous Deployment)
        \\     / \\     / \\     /
feat-a:  o---o   |   |   |   |
feat-b:          o---o   |   |
feat-c:                  o---o
\`\`\`

### How it works:
- Exactly one long-lived branch: \`main\` (or \`trunk\`).
- Short-lived feature branches that live **less than 24 to 48 hours**.
- Every branch merges directly into \`main\` through small, passing PRs.
- Continuous deployment automatically deploys \`main\` to production upon passing CI.

### The Missing Piece: Feature Flags
Engineers often ask: *"How can I merge into main every day if my feature takes 2 weeks to build?"*
Answer: **Feature toggles (feature flags)**.

\`\`\`typescript
export function renderCheckoutButton() {
  if (featureFlags.isEnabled('NEW_STRIPE_CHECKOUT', user.id)) {
    return <NewStripeCheckout />;
  }
  return <LegacyPaypalCheckout />;
}
\`\`\`

You merge the code into \`main\`, deploy it to production dark (disabled for 100% of users), and turn it on internally for testing before rolling out to 10%, 50%, and 100% of traffic.

---

## 3. The Decision Matrix

| Team Metric | Recommend GitFlow | Recommend Trunk-Based |
| :--- | :--- | :--- |
| **Team Size** | 25+ devs on shared repo | 1 to 20 developers |
| **Deploy Cadence** | Bi-weekly or monthly | Multiple times per day |
| **QA Process** | Manual QA team testing phase | Automated test suites in CI |
| **Risk Tolerance** | High risk (banking, hardware) | Fast rollback & flag support |

If you are building SaaS and deploying less than once per day because your branching strategy requires manual releases, switch to trunk-based development with short-lived branches today.`,
  },

  {
    title: 'What senior engineers look for in code review',
    slug: 'senior-code-review-standards',
    category: 'DEV_WORKFLOW',
    difficulty: 'Intermediate',
    readTimeMinutes: 8,
    summary: 'Move beyond linting, syntax, and nitpicks. Five architectural aspects senior engineers evaluate: state explosion, failure modes, query amplification, and observability.',
    content: `# What Senior Engineers Look for in Code Review

Junior and mid-level engineers review syntax, variable naming, formatting, and test presence. 

Senior engineers assume formatting is handled by ESLint and Prettier. When a senior staff engineer reviews a pull request, they look for architectural durability, silent failure modes, and operational risk.

Here are the five critical elements senior engineers evaluate.

---

## 1. Failure Modes and Recovery Paths

*What happens when external systems return an error, timeout, or send unexpected payloads?*

\`\`\`typescript
// Junior implementation:
async function processOrder(orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  await paymentGateway.charge(order.amount);
  await db.order.update({ where: { id: orderId }, data: { status: 'PAID' } });
}
\`\`\`

**The Senior Review Critique**:
*"If \`paymentGateway.charge()\` succeeds, but the database connection fails before \`update()\`, the customer's credit card has been charged, but the order remains in PENDING status. The customer will click Retry and get charged twice.*
*Solution: Introduce an idempotency key passed to the payment gateway, wrap operations in an outbox event, or implement a reconciliation job."*

---

## 2. Query Amplification (N+1 and Missing Indexes)

*Will this scale from 10 items in development to 100,000 items in production?*

\`\`\`typescript
// Dangerous code in loop:
const users = await db.user.findMany({ where: { orgId } });
for (const u of users) {
  u.lastLogin = await db.auditLog.findFirst({
    where: { userId: u.id },
    orderBy: { createdAt: 'desc' }
  });
}
\`\`\`

A senior reviewer will immediately identify the N+1 database roundtrip pattern. They will also inspect the Prisma/SQL schema:
- Does \`auditLog\` have a composite index on \`(userId, createdAt DESC)\`?
- Without this index, every user check initiates a full table sequential scan.

---

## 3. State Explosion and Boolean Flags

When features evolve, developers often add boolean flags to handle new states:

\`\`\`typescript
interface UserSubscription {
  isActive: boolean;
  isTrial: boolean;
  isCanceled: boolean;
  isPastDue: boolean;
}
\`\`\`

With 4 booleans, there are $2^4 = 16$ possible states! What does \`isActive: true, isCanceled: true, isPastDue: true\` mean?
A senior engineer requests a finite state machine:

\`\`\`typescript
type SubscriptionStatus = 
  | 'TRIAL' 
  | 'ACTIVE' 
  | 'PAST_DUE' 
  | 'CANCELED' 
  | 'EXPIRED';
\`\`\`

---

## 4. Observability and Traceability

*If this throws a 500 in production at 2:00 AM, will on-call engineers know what happened?*

- Are errors logged with structured metadata (user ID, tenant ID, request ID) or as generic strings like \`console.error("Payment failed", err)\`?
- Are error messages leaking PII or credentials into datadog/cloudwatch?
- Is there a counter metric incremented on payment failures so alerting can trigger?

---

## 5. Backward and Forward Compatibility

When database schemas or API responses change, does this PR break existing clients running in production?
- **Zero-downtime rule**: A database column can never be deleted or renamed in the same PR that updates application code.
- Phase 1: Add new column (nullable).
- Phase 2: Deploy code writing to both columns and reading from new column.
- Phase 3: Backfill historical rows.
- Phase 4: Drop old column in a subsequent release.`,
  },

  {
    title: 'Zero-downtime deploys: rolling, blue-green, canary',
    slug: 'zero-downtime-deploys',
    category: 'DEV_WORKFLOW',
    difficulty: 'Advanced',
    readTimeMinutes: 11,
    summary: 'Detailed operational comparison of rolling updates, blue-green environments, and canary deployments with real Kubernetes and Nginx configuration snippets.',
    content: `# Zero-Downtime Deployments: Rolling, Blue-Green, and Canary

A modern engineering team cannot tolerate maintenance windows. Shipping code must happen in the middle of a business day without dropping active WebSocket connections, terminating HTTP requests, or returning 502 Bad Gateway errors.

Here is an architectural breakdown of the three primary deployment strategies and how to implement them.

---

## 1. Rolling Deployments

In a rolling update, a pool of container replicas is incrementally replaced by new versions.

\`\`\`
Step 1: [v1] [v1] [v1] [v1] (Traffic: 100% v1)
Step 2: [v2] [v1] [v1] [v1] (Traffic: 75% v1, 25% v2)
Step 3: [v2] [v2] [v1] [v1] (Traffic: 50% v1, 50% v2)
Step 4: [v2] [v2] [v2] [v2] (Traffic: 100% v2)
\`\`\`

### Kubernetes Deployment Configuration:
\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
spec:
  replicas: 4
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # Launch 1 new pod before killing an old one
      maxUnavailable: 0  # Never drop below 4 operational pods
  template:
    spec:
      containers:
      - name: api
        image: registry.example.com/api:v2.4.0
        readinessProbe:
          httpGet:
            path: /healthz
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 2
\`\`\`

**The Critical Gotcha**: Both \`v1\` and \`v2\` run concurrently for several minutes. Your database schema **must support both versions simultaneously**.

---

## 2. Blue-Green Deployments

Blue-Green deploys maintain two identical production environments. One environment (Blue) is active; the other (Green) is idle.

\`\`\`
Router (Load Balancer) ----> [Blue Environment: v1.0 (Live)]
                             [Green Environment: v2.0 (Staged & Tested)]

*Switch Router Target*

Router (Load Balancer) ----> [Green Environment: v2.0 (Live)]
                             [Blue Environment: v1.0 (Standby for rollback)]
\`\`\`

### Advantages:
- **Instant Rollback**: If metrics spike after cutover, flipping the router back to Blue takes under 2 seconds.
- **Full Integration Testing**: The Green environment can be hit with end-to-end smoke tests before handling real user traffic.

### Disadvantages:
- **Cost**: Requires double the compute infrastructure during deployment periods.
- **Shared State**: Both Blue and Green must share the same production database.

---

## 3. Canary Deployments

Canary deployments route a small fraction of real production traffic (e.g., 2% to 5%) to the new version, while monitoring error rates and latency against the baseline.

\`\`\`
Load Balancer
  ├── 95% traffic ──> [v1 Baseline Pods]
  └──  5% traffic ──> [v2 Canary Pods] (Monitored for 15 mins)
\`\`\`

### Nginx Canary Routing by Header or Weight:
\`\`\`nginx
upstream backend_v1 {
    server 10.0.1.10:3000 weight=95;
    server 10.0.1.11:3000 weight=95;
}

upstream backend_v2_canary {
    server 10.0.2.10:3000 weight=5;
}

server {
    listen 80;
    location / {
        # Route internal staff to Canary via header
        if ($http_x_canary = "true") {
            proxy_pass http://backend_v2_canary;
        }
        proxy_pass http://backend_v1;
    }
}
\`\`\`

If Prometheus reports that \`http_requests_total{status=~"5.*", version="v2"}\` is within normal limits after 30 minutes, traffic ramps to 25%, 50%, and finally 100%.`,
  },

  // 3. REAL_INCIDENTS
  {
    title: 'The $0.64/day lesson',
    slug: 'the-64-cent-day-lesson',
    category: 'REAL_INCIDENTS',
    difficulty: 'Advanced',
    readTimeMinutes: 10,
    summary: 'How running a lean K3s lightweight Kubernetes cluster on spot-adjacent pricing beats managed cloud services for small workloads with real benchmark numbers.',
    content: `# The $0.64/Day Lesson: Why Managed Services Are Costing You 10x Too Much

Engineers are taught that managed cloud services (AWS EKS, RDS Multi-AZ, CloudFront, NAT Gateways) are the only acceptable way to run production systems.

For enterprise scale with 40 microservices, managed services make sense. But for startups, internal tools, and early-stage workloads, the "managed tax" is staggering. Here is the breakdown of a real workload that moved from managed AWS to a lean K3s cluster.

---

## 1. The Real Workload and Benchmark Numbers

- **Traffic**: 133,400 requests across a 72-hour operational window.
- **Latency**: p50 of 2.14ms, p95 of 5.33ms, p99 of 12.8ms.
- **Services Hosted**: Fastify API, PostgreSQL with WAL archiving, Redis, and a background queue worker.
- **Total Infrastructure Cost**: **$7.15 to $9.07 over 3 days ($2.38/day total, compute portion only $0.64/day)**.

If this same workload ran on default AWS managed components:
- AWS EKS Cluster Fee: \$73.00/month (\$2.43/day just for the control plane).
- AWS RDS db.t4g.small: \$32.00/month.
- AWS NAT Gateway: \$32.40/month + data processing fees.
- Total Managed Baseline: **~\$145.00/month ($4.83/day)** before running a single application container!

---

## 2. The Lean K3s Architecture

\`\`\`
+------------------------------------------------------------+
| Hetzner / Scaleway / OVH Cloud Node ($5.40/mo, 4GB RAM)     |
|                                                            |
|  +------------------------------------------------------+  |
|  | K3s Single-Node Kubernetes (embedded SQLite engine)  |  |
|  |                                                      |  |
|  |  [Traefik Ingress Controller (built-in)]             |  |
|  |    ├── [Fastify App Pod (120MB RSS)]                 |  |
|  |    ├── [PostgreSQL 16 StatefulSet (Persistent Disk)] |  |
|  |    └── [Redis Alpine Pod (35MB RSS)]                 |  |
|  +------------------------------------------------------+  |
|                                                            |
|  System-level Backups: Litestream streaming DB WAL to S3   |
+------------------------------------------------------------+
\`\`\`

### Why K3s?
Standard Kubernetes (k8s) requires etcd, kube-apiserver, kube-controller-manager, and kubelet, consuming 1.8GB of RAM just to stay idle.
K3s strips away legacy alpha APIs, packages everything into a single binary, replaces etcd with SQLite, and boots in under 30 seconds with **under 500MB of RAM utilization**.

---

## 3. The Litestream Secret for Stateful Safety

The biggest fear of running your own database inside a container is disk corruption.
We solve this with **Litestream**: an open-source tool that continuously streams SQLite or Postgres write-ahead logs to Cloudflare R2 / AWS S3 every 10 seconds:

\`\`\`yaml
# /etc/litestream.yml
dbs:
  - path: /var/lib/postgresql/data
    replicas:
      - type: s3
        bucket: production-database-backups
        path: db-wal
        endpoint: https://<account_id>.r2.cloudflarestorage.com
\`\`\`

If the node burns to the ground, spinning up a replacement instance from the S3 replica takes 3 commands and restores the database to within 10 seconds of the failure.

---

## 4. Key Takeaways

1. **Don't pay for cluster orchestration you don't use**: If your team has fewer than 10 engineers, a managed EKS cluster is operational theater.
2. **Compute is cheap; managed services are expensive**: A bare VPS has zero network egress markup and provides 4x the CPU and RAM per dollar compared to AWS EC2.`,
  },

  {
    title: 'Database connections ran out at 3 AM',
    slug: 'database-connections-ran-out-at-3-am',
    category: 'REAL_INCIDENTS',
    difficulty: 'Intermediate',
    readTimeMinutes: 9,
    summary: 'A real post-mortem of how serverless auto-scaling and backend pod scaling exhausted PostgreSQL max_connections, and how PgBouncer saved the database.',
    content: `# Database Connections Ran Out at 3 AM: Why Connection Pooling Matters

At 3:12 AM, the on-call pager went off: Every backend service was throwing \`FATAL: remaining connection slots are reserved for non-replicated superuser connections\`.

The database was not out of CPU. Memory was sitting comfortably at 40%. Disk IOPS were low. But the entire application was completely offline because PostgreSQL refused to accept any new client connections.

Here is what happened, why connection pooling is mandatory, and how to configure PgBouncer to prevent it forever.

---

## 1. Anatomy of the Failure

PostgreSQL uses a process-per-connection model. Each client connection spawns a dedicated OS process on the database host, consuming roughly 5MB to 10MB of memory:

\`\`\`
API Pod 1 (20 pool conns) ──┐
API Pod 2 (20 pool conns) ──┼──> PostgreSQL (max_connections = 100)
API Pod 3 (20 pool conns) ──┤    [Limit reached! New connections rejected]
API Pod 4 (20 pool conns) ──┤
API Pod 5 (20 pool conns) ──┘
\`\`\`

During a traffic spike at 3:00 AM, Kubernetes Horizontal Pod Autoscaler (HPA) scaled our API from 3 pods to 12 pods.
- Each API pod initialized its Prisma client with a default connection pool of 20 connections.
- $12 \text{ pods} \times 20 \text{ connections} = 240 \text{ connections}$.
- The PostgreSQL instance was configured with \`max_connections = 150\`.
- As soon as pod #8 spun up, all connection slots were consumed, and the database collapsed.

---

## 2. The Solution: PgBouncer in Transaction Mode

Application connection pools (like Prisma, TypeORM, or HikariCP) hold connections open even when the application is simply waiting for HTTP requests.

A dedicated connection pooler like **PgBouncer** sits between your application and PostgreSQL. It holds thousands of client connections open while maintaining only a tiny, multiplexed pool of actual database connections.

\`\`\`
1,000 App Clients ──> [ PgBouncer Pooler ] ── (25 real connections) ──> Postgres
\`\`\`

### PgBouncer Configuration (\`pgbouncer.ini\`):
\`\`\`ini
[databases]
learnstack = host=127.0.0.1 port=5432 dbname=learnstack

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

# The magic setting: transaction-level pooling
pool_mode = transaction

# Max client connections PgBouncer accepts from APIs
max_client_conn = 2000

# Max real connections PgBouncer opens to Postgres
default_pool_size = 25
reserve_pool_size = 5
\`\`\`

---

## 3. Transaction vs Session Pooling

- **Session Mode**: A client holds a Postgres connection for the entire duration of its TCP connection. (Does not solve HPA spikes).
- **Transaction Mode**: PgBouncer assigns a Postgres connection to the client **only for the exact duration of a SQL transaction**. As soon as \`COMMIT\` or \`ROLLBACK\` executes, the connection is instantly given to another client.

### Caveat with Transaction Pooling:
In transaction mode, features bound to the session lifecycle are disabled:
- Prepared statements without names.
- \`LISTEN\` and \`NOTIFY\`.
- \`SET LOCAL\` session variables.

For modern ORMs like Prisma, appending \`?pgbouncer=true\` to the connection string instructs the client to use transaction-safe parameters.

With PgBouncer installed, 20 API pods making 10,000 requests per second now run on just **25 real Postgres connections**.`,
  },

  {
    title: 'Post-mortem template that prevents repeat outages',
    slug: 'post-mortem-template-prevents-repeat-outages',
    category: 'REAL_INCIDENTS',
    difficulty: 'Intermediate',
    readTimeMinutes: 8,
    summary: 'A blameless post-mortem framework focusing on contributing factors, 5 Whys root cause analysis, timeline logging, and verifiable action items.',
    content: `# The Post-Mortem Template That Prevents Repeat Outages

When an incident ends, teams are exhausted. The natural temptation is to write a one-paragraph summary in Slack: *"Redis ran out of memory, we increased instance size, all good now."*

Three weeks later, the exact same outage strikes.

A blameless post-mortem is the single most valuable cultural artifact an engineering team produces. Its purpose is never to assign fault to an individual—it is to identify systemic vulnerabilities in architecture, monitoring, and process.

---

## 1. The Blameless Post-Mortem Template

\`\`\`markdown
# Incident Post-Mortem: [INC-2026-10-04] Payment Webhook 500 Spike

## 1. Metadata
- **Date**: 2026-10-04
- **Duration**: 42 minutes (18:14 UTC to 18:56 UTC)
- **Severity**: SEV-1
- **Lead / Commander**: @sarah
- **Authors**: @alex, @dave

## 2. Executive Summary
Between 18:14 UTC and 18:56 UTC, our Stripe webhook receiver returned HTTP 500 errors 
for 4,120 customer subscription renewals. Total impacted revenue was \$84,000 in delayed 
captures. No credit card data was compromised. Customers were not double-charged.

## 3. Timeline (UTC)
- **18:10**: Deploy v3.8.1 merged to main containing updated webhook parsing.
- **18:14**: Stripe begins sending new JSON payload with null customer_metadata.
- **18:18**: PagerDuty fires: "Stripe Webhook Error Rate > 2%".
- **18:22**: On-call engineer (@alex) joins incident bridge; identifies TypeError in logs.
- **18:35**: Incident Commander decides to rollback v3.8.1 to v3.8.0.
- **18:42**: Rollback completed across all Kubernetes nodes.
- **18:56**: Error rates return to 0.00%. Stripe event retry queue drained successfully.

## 4. The 5 Whys (Root Cause Analysis)
1. *Why did webhooks fail?* Code threw unhandled \`TypeError: Cannot read properties of null\`.
2. *Why was customer_metadata null?* Stripe recently updated the API schema for guest checkouts.
3. *Why didn't tests catch this?* The test mock used a static JSON payload from 2024 that always included an empty object instead of null.
4. *Why wasn't schema validation enforced?* The handler did not use Zod parsing before accessing nested properties.
5. *Why wasn't canary deployment used?* Webhook service was deployed using a simple rolling update strategy without automated error rate rollback triggers.

## 5. Preventative Action Items
| Action Item | Type | Owner | Ticket | Due Date |
| :--- | :--- | :--- | :--- | :--- |
| Add Zod schema validation to all Stripe webhooks | Prevent | @alex | ENG-4129 | Oct 12 |
| Update Stripe mock fixtures from live webhook test payloads | Detect | @dave | ENG-4130 | Oct 15 |
| Implement automated rollback on Canary error rate spike | Mitigate | @devops | OPS-884 | Oct 22 |
\`\`\`

---

## 2. The Golden Rules of Post-Mortems

1. **You Cannot Fire Your Way to Reliability**: If an engineer ran \`DROP TABLE\` in production, the fault is that the CLI allowed direct production access without approval guards, not that the engineer typed the command.
2. **Every Action Item Must Have an Owner and Ticket**: Unowned action items in a post-mortem doc are wishful thinking. Put them on the sprint board immediately.`,
  },

  // 4. COST_CUTTING
  {
    title: 'Replacing NAT Gateway saved $30/month',
    slug: 'replacing-nat-gateway-saved-30-a-month',
    category: 'COST_CUTTING',
    difficulty: 'Intermediate',
    readTimeMinutes: 7,
    summary: 'How replacing AWS managed NAT Gateway with an open-source fck-nat instance on a t4g.nano cuts AWS networking bills by $32 per month per VPC.',
    content: `# Replacing AWS NAT Gateway with fck-nat: Save $30+/Month Per VPC

If you run private subnets in AWS, you are required to have a NAT Gateway so private EC2 instances or Lambda functions can access external APIs (npm, GitHub, Stripe, Datadog).

AWS charges **$0.045 per hour** for every NAT Gateway, plus **$0.045 per GB** of data processed.
For a single VPC with two availability zones, that is **$65.00/month** before passing a single megabyte of traffic!

Here is how small and medium teams replace managed NAT with an open-source ARM instance running \`fck-nat\`.

---

## 1. What is \`fck-nat\`?

\`fck-nat\` is a lightweight AMI built specifically to run network address translation on AWS Graviton (ARM64) instances.
Instead of paying \$32.40/month for AWS Managed NAT:
- Launch a single **t4g.nano** instance (2 vCPU, 0.5GB RAM).
- Monthly cost: **$3.06/month**.
- **Net Savings: ~$29.34/month per NAT gateway.**

---

## 2. Step-by-Step Architecture & Terraform Implementation

\`\`\`
Internet Gateway
       |
[Public Subnet]
       ├── fck-nat (t4g.nano EC2 instance, Elastic IP attached)
       |
[Private Subnet Route Table]
       └── 0.0.0.0/0  --->  Target: [Network Interface of fck-nat]
\`\`\`

### Terraform Configuration:
\`\`\`hcl
# 1. Fetch latest fck-nat AMI
data "aws_ami" "fck_nat" {
  most_recent = true
  owners      = ["568608671756"] # fck-nat official AWS account ID

  filter {
    name   = "name"
    values = ["fck-nat-amzn2-*-arm64-ebs"]
  }
}

# 2. Deploy the t4g.nano instance in public subnet
resource "aws_instance" "nat" {
  ami                         = data.aws_ami.fck_nat.id
  instance_type               = "t4g.nano"
  subnet_id                   = aws_subnet.public.id
  source_dest_check           = false # CRITICAL: Must be false for routing!
  associate_public_ip_address = true

  tags = {
    Name = "vpc-fck-nat"
  }
}

# 3. Route private subnet traffic through fck-nat instance
resource "aws_route" "private_nat_gateway" {
  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  network_interface_id   = aws_instance.nat.primary_network_interface_id
}
\`\`\`

---

## 3. Performance & Caveats

- **Bandwidth**: A \`t4g.nano\` handles up to **5 Gbps burst network bandwidth**, easily accommodating high-throughput API traffic, container image pulls, and webhook dispatches.
- **High Availability**: For critical production workloads requiring 99.99% uptime across AZ failures, configure an Auto Scaling Group with minimum 1 / maximum 1 instance that auto-replaces the node if EC2 hardware fails.

For dev, staging, and early-stage production VPCs, there is no reason to pay AWS \$380/year per VPC for a managed NAT gateway.`,
  },

  {
    title: 'ARM instances: 20% cheaper, same performance',
    slug: 'arm-instances-graviton-migration',
    category: 'COST_CUTTING',
    difficulty: 'Intermediate',
    readTimeMinutes: 8,
    summary: 'A step-by-step AWS Graviton (ARM64) migration checklist for Node.js, Go, Docker, and PostgreSQL workloads with immediate 20% cost reductions.',
    content: `# ARM Instances: 20% Cheaper, Same (or Better) Performance

When AWS released Graviton processors (Graviton2, Graviton3, Graviton4), they changed cloud unit economics.

Comparing standard x86 instances to ARM64 equivalents:
- \`t4g.xlarge\` (ARM64): **$0.1344/hr**
- \`t3.xlarge\` (x86_64): **$0.1664/hr**
- Immediate cost reduction: **19.2% to 22%** with equivalent or superior single-core performance.

Here is the production migration checklist for moving your workloads to ARM64.

---

## 1. Workloads That Run on ARM with Zero Code Changes

If your stack is built with interpreted or byte-code languages, migration requires zero code refactoring:
- **Node.js / TypeScript**: Native ARM V8 engine binaries exist for all LTS versions.
- **Python**: Python 3.8+ runs natively on \`aarch64\`.
- **Go / Rust**: Simply set \`GOARCH=arm64\` or target \`aarch64-unknown-linux-gnu\`.
- **PostgreSQL / Redis**: Official Docker images support multi-arch out of the box.

---

## 2. Multi-Architecture Docker Builds with Buildx

The primary obstacle teams encounter is building Docker images on an x86 CI runner (e.g., standard GitHub Actions runner) for deployment onto ARM64 servers.

Use **Docker Buildx** to build dual-architecture images:

\`\`\`yaml
# .github/workflows/docker.yml
name: Build Multi-Arch Image

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and Push
        uses: docker/build-push-action@v5
        with:
          platforms: linux/amd64,linux/arm64
          push: true
          tags: registry.example.com/api:latest
\`\`\`

---

## 3. Database Migration: AWS RDS Graviton

Migrating an AWS RDS PostgreSQL or MySQL instance from x86 (\`db.m5\`, \`db.t3\`) to Graviton (\`db.m6g\`, \`db.t4g\`) requires **zero data dumps or exports**:

1. Modify the DB instance in AWS Console or Terraform:
   \`\`\`hcl
   instance_class = "db.t4g.medium" # Changed from db.t3.medium
   \`\`\`
2. Apply during maintenance window.
3. RDS performs an in-place restart; the engine starts immediately on the ARM hypervisor. Total downtime is typically under 90 seconds.`,
  },

  {
    title: 'S3 lifecycle policies for logs',
    slug: 's3-lifecycle-policies-for-logs',
    category: 'COST_CUTTING',
    difficulty: 'Beginner',
    readTimeMinutes: 6,
    summary: 'Stop paying hot storage prices for cold logs. Configure automated transitions to Standard-IA and Glacier Flexible Archive after 30 days.',
    content: `# S3 Lifecycle Policies for Logs: Stop Paying Hot Storage Prices

Almost every engineering team has an S3 bucket named \`app-production-logs\` or \`telemetry-archive\` that has been quietly growing for three years.

Standard S3 storage costs **$0.023 per GB/month**.
When your application ships 50GB of access logs and trace files every day:
- After 1 year: 18.25 TB of logs = **$419.75/month**.
- After 2 years: 36.50 TB of logs = **$839.50/month**.

99.9% of those logs are never read again after 14 days unless required for a compliance audit. Here is how to configure S3 lifecycle transitions.

---

## 1. The Storage Tier Strategy

\`\`\`
Day 0 - 30:     S3 Standard ($0.023/GB) - Fast debugging & triage
Day 31 - 90:    S3 Standard-Infrequent Access ($0.0125/GB) - 45% discount
Day 91 - 365:   S3 Glacier Flexible Archive ($0.0036/GB) - 84% discount
Day 366+:       Automated Permanent Deletion
\`\`\`

---

## 2. Terraform S3 Lifecycle Rule Configuration

\`\`\`hcl
resource "aws_s3_bucket_lifecycle_configuration" "logs_lifecycle" {
  bucket = aws_s3_bucket.logs.id

  rule {
    id     = "archive-and-delete-old-logs"
    status = "Enabled"

    filter {
      prefix = "logs/"
    }

    # Transition to Standard-IA after 30 days
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    # Move to Glacier after 90 days
    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    # Permanently delete after 1 year (365 days)
    expiration {
      days = 365
    }

    # Clean up incomplete multipart uploads after 7 days
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}
\`\`\`

---

## 3. The Forgotten Hidden Cost: Multipart Uploads

When client uploads or log dumpers fail halfway through transferring a file, AWS S3 leaves behind invisible partial upload chunks. S3 bills you standard storage rates for these chunks forever!
Always include \`abort_incomplete_multipart_upload\` in every bucket lifecycle rule.`,
  },

  // 5. AUTOMATION
  {
    title: 'If a human does it twice, automate it',
    slug: 'if-a-human-does-it-twice-automate-it',
    category: 'AUTOMATION',
    difficulty: 'Intermediate',
    readTimeMinutes: 9,
    summary: 'The five operational scripts every engineering team must automate: backup verification, cert renewal checks, log rotation, zero-downtime deploy, and synthetic health checks.',
    content: `# If a Human Does It Twice, Automate It: 5 Essential Operational Scripts

The hallmark of low-maturity engineering teams is "tribal knowledge checklists":
- *"Remember to run the database cleanup script on the 1st of the month."*
- *"Check if the SSL certificate renewed on Staging."*
- *"Don't forget to restart the worker if memory exceeds 80%."*

Every manual checklist item is an outage waiting to happen when the person who remembers is on vacation. Here are the five scripts every team should automate today.

---

## 1. Automated Backup Verification Drill

Taking backups is useless if the backup file is corrupted. Run a daily cron job that downloads the latest backup, restores it to a temporary Docker container, and runs a sanity query:

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

# 1. Download latest S3 dump
aws s3 cp s3://my-backups/latest.sql.gz /tmp/latest.sql.gz

# 2. Boot fresh throwaway Postgres container
docker run --name test-restore -e POSTGRES_PASSWORD=secret -d -p 5433:5432 postgres:16-alpine
sleep 5

# 3. Restore database
gunzip -c /tmp/latest.sql.gz | docker exec -i test-restore psql -U postgres -d postgres

# 4. Assert integrity: Check user count > 0
USER_COUNT=$(docker exec test-restore psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM \"User\";")
if [ "$USER_COUNT" -gt 0 ]; then
  echo "✅ Backup restored cleanly! User count: $USER_COUNT"
else
  echo "❌ Backup restore assertion failed!" && exit 1
fi

# Cleanup
docker rm -f test-restore
rm /tmp/latest.sql.gz
\`\`\`

---

## 2. TLS/SSL Certificate Expiration Monitor

Certbot and Let's Encrypt usually work, until a DNS TXT challenge fails silently. Set up an automated check running every Monday:

\`\`\`bash
#!/usr/bin/env bash
DOMAIN="api.learnstack.dev"
EXPIRY_DATE=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN":443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
NOW_EPOCH=$(date +%s)
DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

if [ "$DAYS_LEFT" -lt 15 ]; then
  curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"🚨 SSL Alert: Certificate for $DOMAIN expires in $DAYS_LEFT days!\"}" \
    "$SLACK_WEBHOOK_URL"
fi
\`\`\`

---

## 3. The 3 Other Crucial Automations

3. **Log Rotation Enforcement**: Use Linux \`logrotate\` configs to ensure stdout/stderr files never consume 100% of server disk space.
4. **Stale Branch Cleanup**: A GitHub Action that automatically closes PRs and deletes remote branches inactive for over 90 days.
5. **Synthetic User Flow Ping**: A cron ping executing an actual login flow with a dummy account every 5 minutes to verify token issuance.`,
  },

  {
    title: 'Scheduled vs event-driven scaling',
    slug: 'scheduled-vs-event-driven-scaling',
    category: 'AUTOMATION',
    difficulty: 'Intermediate',
    readTimeMinutes: 8,
    summary: 'Why waiting for CPU auto-scaling thresholds causes 504 Gateway Timeouts during predictable morning traffic spikes, and how cron-based predictive scaling wins.',
    content: `# Scheduled vs Event-Driven Scaling: Why CPU Metrics Are Too Late

Reactive auto-scaling (e.g., Kubernetes HPA or AWS Auto Scaling Groups triggered by CPU > 75%) sounds great on paper.

In practice, reactive auto-scaling is often too slow:
1. Traffic surges at 9:00 AM when users log in.
2. Existing pods hit 100% CPU and start queueing incoming HTTP requests.
3. Prometheus metrics take 60 seconds to aggregate and cross the threshold.
4. The cloud provider takes 90 seconds to provision a new VM instance.
5. The container takes 45 seconds to pull its image, boot Node.js, and pass readiness probes.

**Total delay: 3 to 4 minutes.** By the time new pods become ready, the API has already returned thousands of 504 Gateway Timeouts.

---

## 1. Predictive Scheduled Scaling with Kubernetes KEDA

If your traffic spikes follow predictable human patterns (e.g., 9:00 AM on weekdays), **do not wait for CPU metrics**. Scale preemptively.

Using KEDA (Kubernetes Event-driven Autoscaling) with a Cron Trigger:

\`\`\`yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: api-cron-scaler
spec:
  scaleTargetRef:
    name: api-service
  minReplicaCount: 2
  maxReplicaCount: 20
  triggers:
  # Pre-warm replicas before morning business rush
  - type: cron
    metadata:
      timezone: America/New_York
      start: "45 8 * * 1-5"   # 8:45 AM Monday-Friday
      end: "00 18 * * 1-5"    # 6:00 PM Monday-Friday
      desiredReplicas: "10"
\`\`\`

At 8:45 AM, 15 minutes before the rush begins, KEDA scales the replica count from 2 to 10. When users log in at 9:00 AM, the infrastructure is already warm and idling at 20% capacity.

---

## 2. When to Use Which Scaling Pattern

| Pattern | Trigger Mechanism | Ideal Use Case |
| :--- | :--- | :--- |
| **Scheduled (Cron)** | Wall-clock time | Predictable diurnal spikes (office hours, marketing emails) |
| **Queue Depth (SQS/RabbitMQ)** | Backlog count | Background workers, video transcoders, async jobs |
| **Reactive (CPU/Memory)** | Resource utilization | Unpredictable viral events or unexpected DDoS attacks |`,
  },

  // 6. RELIABILITY
  {
    title: 'Health checks that catch real failures',
    slug: 'health-checks-that-catch-real-failures',
    category: 'RELIABILITY',
    difficulty: 'Intermediate',
    readTimeMinutes: 8,
    summary: 'Why returning HTTP 200 from a dumb /healthz route masks deadlocks and thread pool exhaustion, and how to write deep multi-level readiness probes.',
    content: `# Health Checks That Catch Real Failures: Beyond \`return { status: "ok" }\`

Most API health check endpoints look like this:

\`\`\`typescript
app.get('/health', async () => ({ status: 'ok' }));
\`\`\`

This check tells you exactly one thing: The Node.js event loop is currently capable of returning a static JSON string.

It does **not** tell you:
- Whether the database connection pool is completely deadlocked.
- Whether Redis is rejecting writes due to OOM.
- Whether local disk storage is 100% full.

Here is how to design health checks that keep your load balancers honest without triggering cascading outage loops.

---

## 1. The Separation of Liveness vs Readiness

Kubernetes and modern load balancers provide two distinct probe types:

\`\`\`
Liveness Probe:   "Is this process irrevocably frozen or deadlocked? If so, RESTART it."
Readiness Probe:  "Can this pod serve user traffic right now? If not, REMOVE from load balancer."
\`\`\`

### The Fatal Mistake: Putting Database Checks in Liveness Probes
If your database goes down for 30 seconds, and your **Liveness** probe queries the database:
- Every single API pod fails its liveness probe.
- Kubernetes begins simultaneously killing and restarting every API container in the cluster!
- When the database recovers, it is immediately hit by 50 pods rebooting and opening fresh connection pools at the exact same second, causing another collapse.

---

## 2. A Production Deep Readiness Endpoint

\`\`\`typescript
app.get('/health/ready', async (request, reply) => {
  const checks = {
    database: false,
    redis: false,
    diskSpace: false,
  };

  try {
    // 1. Database quick ping with strict 1000ms timeout
    await Promise.race([
      prisma.$queryRaw\`SELECT 1\`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 1000)),
    ]);
    checks.database = true;
  } catch (err) {
    request.log.warn({ err }, 'Readiness check: DB failed');
  }

  try {
    // 2. Redis PING
    await redisClient.ping();
    checks.redis = true;
  } catch (err) {
    request.log.warn({ err }, 'Readiness check: Redis failed');
  }

  const isHealthy = checks.database && checks.redis;

  if (!isHealthy) {
    return reply.status(503).send({ status: 'DEGRADED', checks });
  }

  return reply.send({ status: 'READY', checks });
});
\`\`\`

If Postgres experiences a momentary connection hiccup, the load balancer removes the pod from the routing rotation without restarting the container. As soon as the DB responds, traffic resumes automatically.`,
  },

  {
    title: 'You have backups. Have you tried restoring?',
    slug: 'backups-and-restore-drills',
    category: 'RELIABILITY',
    difficulty: 'Advanced',
    readTimeMinutes: 10,
    summary: 'The difference between having a backup file and having a recovery capability. A concrete monthly restore drill runbook to prove recovery time objectives (RTO).',
    content: `# You Have Backups. Have You Tried Restoring? The Monthly Drill Runbook

Schrödinger's Backup: *The condition of any backup is unknown until you attempt to restore it.*

Every year, well-known tech companies experience catastrophic data loss not because their backup cron jobs failed, but because:
- The backup encryption key was stored in the database that was lost.
- The PostgreSQL dump was created with flags that omitted table constraints.
- The restore process took 36 hours when the business required an RTO (Recovery Time Objective) of under 2 hours.

Here is the exact monthly restore drill runbook you should schedule on your team's calendar.

---

## 1. The Restore Drill Metrics: RPO and RTO

\`\`\`
[Last Valid Backup Point] <---- RPO ----> [Disaster Strike] <---- RTO ----> [Fully Restored]
\`\`\`

- **RPO (Recovery Point Objective)**: How much data can you afford to lose? (e.g., 1 hour of writes).
- **RTO (Recovery Time Objective)**: How long can the system be offline while you restore? (e.g., 45 minutes).

If your database dump is 350GB, uncompressing and importing it via \`psql\` over standard network links will take 4+ hours. If your RTO is 1 hour, **your backup strategy has already failed**.

---

## 2. Step-by-Step Monthly Drill Runbook

### Prerequisites:
- Conduct drill in an isolated staging or sandbox VPC. Never restore into the production network namespace!
- Assign an engineer on rotation as the "Drill Operator" and a second engineer as "Verifier".

### Phase 1: Retrieve and Decrypt (Target: < 10 mins)
\`\`\`bash
# 1. Fetch the latest snapshot from off-site storage (AWS S3 Glacier or Cloudflare R2)
aws s3 cp s3://company-prod-backups/pg-2026-10-12.sql.gz.enc ./backup.enc

# 2. Decrypt using AWS KMS or Vault CLI
aws kms decrypt --ciphertext-blob fileb://backup.enc --output text --query Plaintext | base64 -d > ./backup.sql.gz
\`\`\`

### Phase 2: Spin Up Target Database & Restore (Target: < 30 mins)
\`\`\`bash
# 3. Import dump into clean PostgreSQL instance
gunzip -c ./backup.sql.gz | psql -h staging-restore-db.internal -U postgres -d learnstack_restore
\`\`\`

### Phase 3: Automated Sanity Verifications
Run validation scripts to confirm transactional integrity:
- Check row counts for primary tables (\`User\`, \`Organization\`, \`Topic\`).
- Verify the latest record timestamp is within the RPO window (e.g., within 24 hours).
- Test foreign key constraints and index validity.

---

## 3. The Drill Retrospective Report

After every drill, publish a 1-page report to the engineering team:
- **Date executed**: 2026-10-12
- **Snapshot size**: 14.2 GB
- **Time to retrieve**: 4m 12s
- **Time to import**: 18m 45s
- **Total RTO achieved**: 22m 57s (Target: < 45m)
- **Data loss gap (RPO)**: 12 minutes of WAL logs.

When disaster strikes at 2:00 AM on a Saturday, your engineers won't be reading documentation for the first time—they will be executing a runbook they have rehearsed twelve times this year.`,
  },
];

export const tacticsData: TacticSeedItem[] = [
  // ==========================================
  // COST CUTTING (8 tactics)
  // ==========================================
  {
    title: 'Replace NAT Gateway with fck-nat',
    category: 'COST_CUTTING',
    description: 'AWS NAT Gateway costs ~$32/month per AZ plus $0.045/GB. fck-nat runs on a t4g.nano for ~$3/month with the same functionality for most workloads.',
    howToUse: 'Deploy fck-nat via the community Terraform module. Point your private route tables at the fck-nat ENI instead of the NAT Gateway.',
    howToImplement: `Use terraform module \`github.com/RaJiska/fck-nat\` or the official \`fck-nat\` CloudFormation.

\`\`\`hcl
module "fck-nat" {
  source  = "RaJiska/fck-nat/aws"
  version = "~> 1.3"

  vpc_id                = var.vpc_id
  subnet_id             = var.public_subnet_id
  instance_type         = "t4g.nano"
  use_cloudwatch_alarms = true
  update_route_tables   = true
  route_table_ids       = {
    private = var.private_route_table_id
  }
}
\`\`\`

Set instance type to \`t4g.nano\` and enable auto-recovery. Point your private route table default route \`0.0.0.0/0\` to the network interface created by fck-nat.`,
    whenUseful: 'Dev/staging environments, or production with <100GB/month NAT traffic. Keep managed NAT Gateway for high-traffic production.',
    impact: 'High',
    effort: 'Hours',
    savingsEstimate: '~$29/month per AZ',
  },
  {
    title: 'VPC Gateway Endpoints for S3 and DynamoDB',
    category: 'COST_CUTTING',
    description: 'Traffic from private subnets to S3/DynamoDB routes through NAT Gateway by default, paying $0.045/GB. Gateway endpoints are completely free and keep traffic on the AWS backbone.',
    howToUse: 'Create a Gateway-type VPC endpoint for S3 and DynamoDB. Associate it with every private subnet route table.',
    howToImplement: `Create via AWS CLI:
\`\`\`bash
aws ec2 create-vpc-endpoint \\
  --vpc-id vpc-xxx \\
  --service-name com.amazonaws.us-east-1.s3 \\
  --vpc-endpoint-type Gateway \\
  --route-table-ids rtb-xxx rtb-yyy
\`\`\`

Or declare via Terraform:
\`\`\`hcl
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.\${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = aws_route_table.private[*].id
}

resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.\${var.aws_region}.dynamodb"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = aws_route_table.private[*].id
}
\`\`\``,
    whenUseful: 'Any VPC with private subnets that talk to S3 or DynamoDB. This should be in every VPC, no exceptions.',
    impact: 'High',
    effort: 'Hours',
    savingsEstimate: '$0.045/GB on all S3/DynamoDB traffic',
  },
  {
    title: 'Graviton (ARM) instances',
    category: 'COST_CUTTING',
    description: 'AWS Graviton processors deliver up to 20% better price-performance than x86 for most workloads. Most containerized apps switch with zero code changes.',
    howToUse: 'Change instance type from t3/t4g x86 to t4g (Graviton). For EKS, add ARM node groups. For RDS, switch to db.t4g or db.r6g.',
    howToImplement: `In Terraform, change \`instance_type\` from \`t3.small\` to \`t4g.small\`:
\`\`\`hcl
resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux_arm64.id
  instance_type = "t4g.small"
}
\`\`\`

Build multi-architecture container images using Docker buildx:
\`\`\`bash
docker buildx build \\
  --platform linux/amd64,linux/arm64 \\
  -t registry.example.com/api:latest \\
  --push .
\`\`\`
Test once in staging, then roll out across compute workloads.`,
    whenUseful: 'Any stateless workload, APIs, workers, CI runners. Avoid for legacy x86-only binaries.',
    impact: 'High',
    effort: 'Days',
    savingsEstimate: '~20% on compute',
  },
  {
    title: 'Auto-shutdown for non-production',
    category: 'COST_CUTTING',
    description: 'Dev and staging environments running 24/7 waste money. Developers work ~50 hours/week, but instances run 168 hours.',
    howToUse: 'Lambda function on EventBridge schedule stops instances at 8 PM, starts at 8 AM on weekdays. Tag-based: only instances tagged AutoShutdown=true.',
    howToImplement: `Configure EventBridge cron rules:
- Stop Rule: Cron \`0 20 * * ? *\` (8:00 PM UTC daily)
- Start Rule: Cron \`0 8 ? * MON-FRI *\` (8:00 AM UTC Mon-Fri)

Lambda handler (Python 3.12):
\`\`\`python
import boto3

ec2 = boto3.client('ec2')

def lambda_handler(event, context):
    action = event.get('action', 'stop')
    filters = [{'Name': 'tag:AutoShutdown', 'Values': ['true']}]
    
    reservations = ec2.describe_instances(Filters=filters)['Reservations']
    instance_ids = [i['InstanceId'] for r in reservations for i in r['Instances']]
    
    if not instance_ids:
        return {'status': 'No instances found'}
        
    if action == 'stop':
        ec2.stop_instances(InstanceIds=instance_ids)
    elif action == 'start':
        ec2.start_instances(InstanceIds=instance_ids)
        
    return {'action': action, 'instances': instance_ids}
\`\`\`
Or use AWS Instance Scheduler.`,
    whenUseful: 'Any non-production environment. Can save 50-70% on dev/staging compute.',
    impact: 'High',
    effort: 'Hours',
    savingsEstimate: '50-70% on non-prod compute',
  },
  {
    title: 'S3 Lifecycle Policies',
    category: 'COST_CUTTING',
    description: 'Logs and backups accumulate forever by default. Lifecycle policies auto-transition old objects to cheaper storage tiers.',
    howToUse: 'Set policy: Standard → Infrequent Access after 30 days → Glacier after 90 days → delete after 365 days.',
    howToImplement: `Configure with Terraform \`aws_s3_bucket_lifecycle_configuration\`:
\`\`\`hcl
resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    id     = "archive-and-cleanup"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }
  }
}
\`\`\`
Or via S3 Console: Bucket → Management → Create lifecycle rule.`,
    whenUseful: 'Log buckets, backup buckets, any append-only data. Immediate savings with zero risk.',
    impact: 'Medium',
    effort: 'Hours',
    savingsEstimate: '60-80% on old object storage',
  },
  {
    title: 'Share one ALB with Ingress Groups',
    category: 'COST_CUTTING',
    description: 'Each ALB costs ~$16/month base. Teams often create one per service. The AWS Load Balancer Controller can share a single ALB across multiple Ingress resources.',
    howToUse: 'Annotate Ingresses with alb.ingress.kubernetes.io/group.name: shared. All Ingresses in the group share one ALB.',
    howToImplement: `Install the AWS Load Balancer Controller via Helm:
\`\`\`bash
helm repo add eks https://aws.github.io/eks-charts
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \\
  -n kube-system \\
  --set clusterName=my-cluster
\`\`\`

Add group annotation to each Ingress manifest:
\`\`\`yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: default
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/group.name: shared-alb-group
    alb.ingress.kubernetes.io/scheme: internet-facing
spec:
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 80
\`\`\``,
    whenUseful: 'Kubernetes clusters with 5+ HTTP services. Saves $16/month per eliminated ALB.',
    impact: 'Medium',
    effort: 'Hours',
    savingsEstimate: '~$16/month per ALB consolidated',
  },
  {
    title: 'Spot Instances for fault-tolerant workloads',
    category: 'COST_CUTTING',
    description: 'Spot instances cost 60-90% less than on-demand. Perfect for CI runners, batch jobs, and stateless workers that handle interruption.',
    howToUse: 'Use EC2 Auto Scaling with mixed instance policy, or Karpenter with spot consolidation. Set interruption handling.',
    howToImplement: `In EKS managed node groups or Auto Scaling Groups, configure mixed instances with spot allocation:
\`\`\`hcl
resource "aws_autoscaling_group" "spot_pool" {
  name_prefix         = "spot-worker-"
  max_size            = 20
  min_size            = 2
  desired_capacity    = 4

  mixed_instances_policy {
    instances_distribution {
      on_demand_base_capacity                  = 0
      on_demand_percentage_above_base_capacity = 20
      spot_allocation_strategy                 = "capacity-optimized"
    }
    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.worker.id
        version            = "$Latest"
      }
      override { instance_type = "c6g.xlarge" }
      override { instance_type = "c6a.xlarge" }
      override { instance_type = "c5.xlarge" }
    }
  }
}
\`\`\`
Deploy AWS Node Termination Handler to catch spot interruption notices 2 minutes prior to shutdown.`,
    whenUseful: 'CI/CD runners, batch processing, dev environments, stateless APIs with 3+ replicas.',
    impact: 'High',
    effort: 'Days',
    savingsEstimate: '60-90% on eligible compute',
  },
  {
    title: 'Delete unattached EBS volumes and idle resources',
    category: 'COST_CUTTING',
    description: 'Unattached EBS volumes, old snapshots, and idle load balancers silently burn money. A monthly cleanup catches them.',
    howToUse: 'Run a monthly audit script. Tag everything at creation so orphans are identifiable.',
    howToImplement: `Describe and find unattached EBS volumes via AWS CLI:
\`\`\`bash
aws ec2 describe-volumes \\
  --filters Name=status,Values=available \\
  --query "Volumes[*].{ID:VolumeId,Size:Size,Created:CreateTime}" \\
  --output table
\`\`\`

Delete unattached volumes:
\`\`\`bash
for vol_id in $(aws ec2 describe-volumes --filters Name=status,Values=available --query "Volumes[*].VolumeId" --output text); do
  echo "Deleting volume $vol_id"
  aws ec2 delete-volume --volume-id "$vol_id"
done
\`\`\`
Or run \`cloud-nuke\` in dry-run mode first to catch unused ALBs and orphan snapshots:
\`\`\`bash
cloud-nuke aws --dry-run --resource-type ec2,ebs,eip,alb
\`\`\``,
    whenUseful: 'Any account older than 6 months. Almost every team finds surprises on first audit.',
    impact: 'Medium',
    effort: 'Hours',
    savingsEstimate: 'Varies, often $50-200/month found',
  },

  // ==========================================
  // SCALABILITY (8 tactics)
  // ==========================================
  {
    title: 'Horizontal Pod Autoscaling (HPA)',
    category: 'SCALABILITY',
    description: 'Manually setting replica counts means over-provisioning for peaks or under-provisioning and dropping traffic. HPA adjusts replicas based on CPU, memory, or custom metrics.',
    howToUse: 'Define HPA per deployment with min/max replicas and target CPU (typically 70%).',
    howToImplement: `Quick autoscale via kubectl:
\`\`\`bash
kubectl autoscale deployment api --cpu-percent=70 --min=2 --max=10
\`\`\`

Or write a declarative HPA v2 manifest:
\`\`\`yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
\`\`\`
Gradually add Prometheus custom metrics (e.g. HTTP request rate or queue depth) via Prometheus Adapter.`,
    whenUseful: 'Any API with variable traffic. Start with CPU-based, graduate to request-rate or queue-depth metrics.',
    impact: 'High',
    effort: 'Hours',
    savingsEstimate: 'Prevents downtime & cuts over-provisioning',
  },
  {
    title: 'Read replicas for database reads',
    category: 'SCALABILITY',
    description: 'A single database handles both writes and reads until reads overwhelm it. Read replicas offload SELECT queries, letting the primary focus on writes.',
    howToUse: 'Create 1-2 read replicas. Route reporting, analytics, and read-heavy API endpoints to replicas.',
    howToImplement: `In AWS RDS console or CLI, create a replica:
\`\`\`bash
aws rds create-db-instance-read-replica \\
  --db-instance-identifier prod-db-replica-1 \\
  --source-db-instance-identifier prod-db-primary \\
  --db-instance-class db.r6g.large
\`\`\`

In your app, configure read/write split connection pools:
\`\`\`typescript
import { Pool } from 'pg';

export const writePool = new Pool({
  connectionString: process.env.DATABASE_PRIMARY_URL,
  max: 20,
});

export const readPool = new Pool({
  connectionString: process.env.DATABASE_REPLICA_URL,
  max: 50,
});

export async function queryRead(sql: string, params: any[]) {
  return readPool.query(sql, params);
}
\`\`\``,
    whenUseful: 'Read:write ratio above 5:1. Dashboards, search, and feed endpoints are classic candidates.',
    impact: 'High',
    effort: 'Days',
    savingsEstimate: 'Offloads 70-90% read load from primary DB',
  },
  {
    title: 'Connection pooling (PgBouncer)',
    category: 'SCALABILITY',
    description: 'Each app instance opening direct database connections exhausts the connection limit fast. PgBouncer multiplexes thousands of app connections into a small pool of real database connections.',
    howToUse: 'Deploy PgBouncer between app and database. Point app at PgBouncer instead of direct database.',
    howToImplement: `Deploy via Docker or Kubernetes using image \`edoburu/pgbouncer\`:
\`\`\`ini
# /etc/pgbouncer/pgbouncer.ini
[databases]
app_db = host=primary.rds.internal port=5432 dbname=app_db

[pgbouncer]
listen_port = 6432
listen_addr = 0.0.0.0
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
server_idle_timeout = 600
\`\`\`

Point your application database connection URL to port 6432:
\`\`\`bash
DATABASE_URL="postgres://user:password@pgbouncer.internal:6432/app_db"
\`\`\``,
    whenUseful: 'More than 50 app instances, serverless functions, or any connection-count errors in logs.',
    impact: 'High',
    effort: 'Days',
    savingsEstimate: 'Eliminates connection exhaustion 500 errors',
  },
  {
    title: 'CDN for static assets',
    category: 'SCALABILITY',
    description: 'Serving images, JS, and CSS from your origin server wastes compute and adds latency. A CDN caches them at edge locations worldwide.',
    howToUse: 'Put CloudFront (or Cloudflare) in front of your S3 bucket or origin. Set long cache headers on versioned assets.',
    howToImplement: `Configure CloudFront distribution pointing to S3 origin.

Set aggressive immutable caching headers on hashed asset builds:
\`\`\`nginx
# Nginx / server static response headers
location ~* \\.(?:css|js|woff2|png|jpg|svg)$ {
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
\`\`\`

Upload built assets to S3 with cache control:
\`\`\`bash
aws s3 sync dist/ s3://my-static-assets-bucket/assets/ \\
  --cache-control "public, max-age=31536000, immutable"
\`\`\``,
    whenUseful: 'Any app serving static files. Reduces origin load by 80-90% and cuts global latency.',
    impact: 'High',
    effort: 'Hours',
    savingsEstimate: 'Reduces origin server bandwidth by 80-90%',
  },
  {
    title: 'Async workers for slow operations',
    category: 'SCALABILITY',
    description: 'Sending emails, generating PDFs, or calling slow APIs inside a web request blocks the response. Move them to background workers via a queue.',
    howToUse: 'Web request pushes a job to Redis/SQS. Worker processes pull jobs and execute. User gets instant response.',
    howToImplement: `Using BullMQ in Node.js:
\`\`\`typescript
import { Queue, Worker } from 'bullmq';

const connection = { host: 'redis.internal', port: 6379 };
export const emailQueue = new Queue('emails', { connection });

// In web request handler:
await emailQueue.add('send-email', {
  to: user.email,
  template: 'welcome',
}, { attempts: 3, backoff: { type: 'exponential', delay: 1000 } });

// In standalone background worker process:
const emailWorker = new Worker('emails', async job => {
  await sendEmail(job.data.to, job.data.template);
}, { connection, concurrency: 10 });
\`\`\`
For AWS architectures, substitute with Amazon SQS and Lambda / ECS workers.`,
    whenUseful: 'Any operation taking >500ms that doesn\'t need an immediate result in the response.',
    impact: 'High',
    effort: 'Days',
    savingsEstimate: 'Keeps web response times under 100ms',
  },
  {
    title: 'Database indexing for slow queries',
    category: 'SCALABILITY',
    description: 'Missing indexes turn millisecond queries into full table scans. The fix is often a single CREATE INDEX.',
    howToUse: 'Enable slow query logging. Run EXPLAIN on slow queries. Add indexes on WHERE, JOIN, and ORDER BY columns.',
    howToImplement: `Analyze query execution plan with EXPLAIN ANALYZE:
\`\`\`sql
EXPLAIN ANALYZE
SELECT * FROM users WHERE email = 'dev@learnstack.io';
\`\`\`

Create indexes concurrently in PostgreSQL to avoid table locking:
\`\`\`sql
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

-- Composite index for multi-column filtering:
CREATE INDEX CONCURRENTLY idx_orders_user_created 
ON orders(user_id, created_at DESC);
\`\`\`

Check query metrics via pg_stat_statements for worst offenders:
\`\`\`sql
SELECT query, calls, total_exec_time / calls AS avg_time_ms
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
\`\`\``,
    whenUseful: 'Any query consistently over 100ms. Check pg_stat_statements for the worst offenders.',
    impact: 'High',
    effort: 'Hours',
    savingsEstimate: 'Cuts slow query latency by 10x-100x',
  },
  {
    title: 'Caching with Redis',
    category: 'SCALABILITY',
    description: 'Repeatedly computing the same expensive query or API response wastes resources. Cache the result with a TTL.',
    howToUse: 'Cache-aside pattern: check Redis first, on miss compute and store with expiry. Invalidate on writes.',
    howToImplement: `Cache-aside pattern implementation:
\`\`\`typescript
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

export async function getCachedData<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached) as T;
  }

  const freshData = await fetchFn();
  await redis.setex(key, ttlSeconds, JSON.stringify(freshData));
  return freshData;
}

// In route handler:
const profile = await getCachedData(\`user:\${id}:profile\`, 300, () =>
  db.user.findUnique({ where: { id } })
);
\`\`\`
Invalidate key on updates: \`await redis.del(\`user:\${id}:profile\`);\``,
    whenUseful: 'Reference data, user sessions, API responses, computed aggregations. Start with 5-minute TTLs.',
    impact: 'High',
    effort: 'Days',
    savingsEstimate: 'Saves database compute on read-heavy routes',
  },
  {
    title: 'Partition large tables',
    category: 'SCALABILITY',
    description: 'Tables with 100M+ rows slow down even with indexes. Partitioning splits them into smaller physical tables by date or key range.',
    howToUse: 'PostgreSQL declarative partitioning by range (usually date). Queries on recent data only scan recent partitions.',
    howToImplement: `Set up declarative table partitioning by range in PostgreSQL:
\`\`\`sql
-- Create parent partitioned table
CREATE TABLE events (
    id BIGSERIAL,
    event_type VARCHAR(64) NOT NULL,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE events_2026_10 PARTITION OF events
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

CREATE TABLE events_2026_11 PARTITION OF events
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

-- Index individual partitions
CREATE INDEX idx_events_2026_10_type ON events_2026_10(event_type);
\`\`\`
Queries specifying \`created_at >= '2026-10-01'\` benefit from partition pruning and avoid scanning old tables.`,
    whenUseful: 'Time-series data, logs, events tables growing >10GB. Dramatic improvement for date-range queries.',
    impact: 'High',
    effort: 'Weeks',
    savingsEstimate: 'Prevents database performance cliff at 100M+ rows',
  },

  // ==========================================
  // RELIABILITY (8 tactics)
  // ==========================================
  {
    title: 'Health checks that catch real failures',
    category: 'RELIABILITY',
    description: 'A /healthz that always returns 200 tells you the process is alive, not that it works. Deep health checks verify database, cache, and critical dependencies.',
    howToUse: 'Two endpoints: /healthz (liveness, cheap) and /readyz (readiness, checks DB + Redis). Kubernetes uses liveness for restarts, readiness for traffic routing.',
    howToImplement: `Fastify / Express readiness check implementation:
\`\`\`typescript
// Liveness: Process is alive (cheap)
app.get('/healthz', async () => ({ status: 'ok' }));

// Readiness: Process can actually serve traffic
app.get('/readyz', async (request, reply) => {
  try {
    // 2-second timeout on DB query
    await Promise.race([
      prisma.$queryRaw\`SELECT 1\`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), 2000)),
    ]);
    // Ping Redis
    await redis.ping();
    return { status: 'ready', timestamp: new Date().toISOString() };
  } catch (error: any) {
    return reply.status(503).send({ status: 'unhealthy', error: error.message });
  }
});
\`\`\`

Kubernetes Pod spec:
\`\`\`yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
readinessProbe:
  httpGet:
    path: /readyz
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
\`\`\``,
    whenUseful: 'Every service in Kubernetes. Prevents routing traffic to instances that can\'t serve it.',
    impact: 'High',
    effort: 'Hours',
    savingsEstimate: 'Eliminates traffic routing to zombie pods',
  },
  {
    title: 'Backup restore drills',
    category: 'RELIABILITY',
    description: 'Untested backups are not backups. Monthly restore drills prove you can actually recover.',
    howToUse: 'Monthly: restore the latest backup to an isolated instance, run smoke tests, record recovery time. Document gaps.',
    howToImplement: `Automate monthly restore drills via a scheduled Bash or Python script:
\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

echo "1. Downloading latest snapshot..."
LATEST_BACKUP=$(aws s3 ls s3://db-backups-bucket/ | sort | tail -n 1 | awk '{print $4}')
aws s3 cp "s3://db-backups-bucket/\${LATEST_BACKUP}" /tmp/backup.dump

echo "2. Booting temporary isolated Postgres test container..."
docker run --name restore-drill -e POSTGRES_PASSWORD=test -p 5433:5432 -d postgres:16
sleep 5

echo "3. Restoring dump..."
pg_restore -h localhost -p 5433 -U postgres -d postgres /tmp/backup.dump

echo "4. Running smoke tests and data validation queries..."
COUNT=$(psql -h localhost -p 5433 -U postgres -d postgres -t -c "SELECT count(*) FROM users;")
echo "Found \${COUNT} users in restored backup."

echo "5. Tearing down test container..."
docker rm -f restore-drill
rm /tmp/backup.dump
echo "Restore verification completed successfully."
\`\`\`
Record Recovery Time Objective (RTO) and Recovery Point Objective (RPO) in your audit log.`,
    whenUseful: 'Every production database. The first drill always reveals something broken.',
    impact: 'High',
    effort: 'Hours',
    savingsEstimate: 'Guarantees business survivability during catastrophe',
  },
  {
    title: 'Circuit breakers for downstream calls',
    category: 'RELIABILITY',
    description: 'When a downstream service fails slowly, every caller waits and eventually exhausts its own resources. Circuit breakers fail fast after a threshold.',
    howToUse: 'Wrap external calls. After N consecutive failures, the circuit opens and calls fail immediately for a cooldown period, then half-opens to test recovery.',
    howToImplement: `Using opossum in Node.js:
\`\`\`typescript
import CircuitBreaker from 'opossum';

async function callPaymentGateway(orderData: any) {
  const res = await fetch('https://api.payments.com/v1/charge', {
    method: 'POST',
    body: JSON.stringify(orderData),
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(3000), // 3s timeout
  });
  if (!res.ok) throw new Error(\`Gateway status \${res.status}\`);
  return res.json();
}

const options = {
  timeout: 3000,               // Call timeout
  errorThresholdPercentage: 50, // Open when 50% fail
  resetTimeout: 30000,         // Wait 30s before half-open probe
};

export const paymentBreaker = new CircuitBreaker(callPaymentGateway, options);

paymentBreaker.fallback(() => ({
  status: 'queued_offline',
  message: 'Payment gateway temporarily unavailable; queued for processing',
}));
\`\`\``,
    whenUseful: 'Any call to payment gateways, third-party APIs, or microservices. Prevents cascading failures.',
    impact: 'High',
    effort: 'Days',
    savingsEstimate: 'Prevents cascading outages across dependent services',
  },
  {
    title: 'Graceful shutdown handling',
    category: 'RELIABILITY',
    description: 'Kubernetes sends SIGTERM before killing a pod. Without a handler, in-flight requests die mid-processing.',
    howToUse: 'Catch SIGTERM, stop accepting new connections, finish in-flight requests (up to terminationGracePeriodSeconds), then exit.',
    howToImplement: `Graceful shutdown in Node.js / Fastify:
\`\`\`typescript
const server = fastify();

const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
signals.forEach(signal => {
  process.on(signal, async () => {
    console.log(\`Received \${signal}. Starting graceful shutdown...\`);
    try {
      // 1. Stop accepting new HTTP requests
      await server.close();
      console.log('HTTP server closed.');

      // 2. Close database pools and queue connections
      await prisma.$disconnect();
      await redis.quit();
      console.log('Database and cache connections closed.');

      process.exit(0);
    } catch (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
  });
});
\`\`\`

Configure in Kubernetes deployment manifest:
\`\`\`yaml
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 30
      containers:
        - name: app
          image: app:v1
\`\`\``,
    whenUseful: 'Every containerized service. Eliminates 502s during rolling deploys.',
    impact: 'Medium',
    effort: 'Hours',
    savingsEstimate: 'Eliminates 502 Bad Gateway errors during deploys',
  },
  {
    title: 'Structured logging with correlation IDs',
    category: 'RELIABILITY',
    description: 'Grep-ing plain text logs across services during an incident is slow. Structured JSON logs with request correlation IDs let you trace a request end-to-end.',
    howToUse: 'Log JSON with fields: timestamp, level, service, correlationId, message, context. Pass correlation ID through all service calls via header.',
    howToImplement: `Using Pino and middleware in Fastify/Express:
\`\`\`typescript
import pino from 'pino';
import { randomUUID } from 'crypto';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: label => ({ level: label }),
  },
});

// Middleware: propagate or generate x-correlation-id
app.addHook('onRequest', async (request, reply) => {
  const correlationId =
    (request.headers['x-correlation-id'] as string) || randomUUID();
  request.headers['x-correlation-id'] = correlationId;
  reply.header('x-correlation-id', correlationId);

  request.log = logger.child({
    service: 'learnstack-api',
    correlationId,
  });
});

// In request handlers:
request.log.info({ userId, action: 'checkout' }, 'User started checkout');
\`\`\`
Pass \`headers: { 'x-correlation-id': correlationId }\` on all outbound HTTP / fetch calls.`,
    whenUseful: 'Any multi-service architecture. Cuts incident debugging time dramatically.',
    impact: 'High',
    effort: 'Days',
    savingsEstimate: 'Cuts root cause analysis time from hours to minutes',
  },
  {
    title: 'Runbooks for common incidents',
    category: 'RELIABILITY',
    description: 'During an outage, nobody should be figuring out what to do. Runbooks turn panic into procedure.',
    howToUse: 'One runbook per known failure mode: symptoms, diagnosis steps, fix commands, escalation path. Keep them next to the code.',
    howToImplement: `Store markdown runbooks in the repository under \`docs/runbooks/\`:
\`\`\`markdown
# Runbook: High Database Connection Spike

## 1. Symptoms
- PagerDuty Alert: PostgreSQL connection pool > 90%
- Ingress 504 Gateway Timeouts

## 2. Diagnosis Commands
\`\`\`bash
# Check active connections and longest-running queries
psql $DATABASE_URL -c "
  SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state 
  FROM pg_stat_activity 
  WHERE state != 'idle' 
  ORDER BY duration DESC LIMIT 5;
"
\`\`\`

## 3. Remediation Commands
\`\`\`bash
# Terminate queries running > 60 seconds
psql $DATABASE_URL -c "
  SELECT pg_terminate_backend(pid) 
  FROM pg_stat_activity 
  WHERE state = 'idle in transaction' 
  AND query_start < now() - interval '60 seconds';
"
\`\`\`

## 4. Escalation
- If connections remain exhausted after 5m: Page Lead DBA (@dba-oncall).
\`\`\``,
    whenUseful: 'After every incident, write the runbook that would have shortened it. Start with your top 3 failure modes.',
    impact: 'Medium',
    effort: 'Hours',
    savingsEstimate: 'Prevents panic and reduces Mean Time To Recovery (MTTR)',
  },
  {
    title: 'Staged rollouts (canary deploys)',
    category: 'RELIABILITY',
    description: 'Deploying to 100% at once means a bad release hits everyone. Canary deploys route a small percentage of traffic to the new version first.',
    howToUse: 'Deploy v2 alongside v1. Route 5% of traffic to v2. Monitor error rates. Gradually increase to 100% or roll back.',
    howToImplement: `Using Argo Rollouts with a Canary strategy in Kubernetes:
\`\`\`yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: api-service
spec:
  replicas: 10
  strategy:
    canary:
      steps:
        # Route 5% traffic to canary and pause for verification
        - setWeight: 5
        - pause: { duration: 5m }
        # Increase to 25% traffic
        - setWeight: 25
        - pause: { duration: 5m }
        # Increase to 50% traffic
        - setWeight: 50
        - pause: { duration: 5m }
      analysis:
        templates:
          - templateName: success-rate-metric
        args:
          - name: service-name
            value: api-service
\`\`\`
If error rate exceeds 1% during analysis, Argo Rollouts automatically aborts and rolls back to v1.`,
    whenUseful: 'Any production deploy. Especially valuable for risky changes like database migrations.',
    impact: 'High',
    effort: 'Weeks',
    savingsEstimate: 'Prevents bad deployments from impacting 100% of users',
  },
  {
    title: 'SLOs and error budgets',
    category: 'RELIABILITY',
    description: 'Without defined reliability targets, every incident feels like a crisis and every feature feels blocked. SLOs create a shared agreement on how reliable is reliable enough.',
    howToUse: 'Define SLIs (what you measure), SLOs (the target, e.g., 99.9% success), and error budgets (how much failure is acceptable). Spend the budget on features, halt features when exhausted.',
    howToImplement: `Define Service Level Indicator (SLI) in Prometheus:
\`\`\`promql
# SLI: Percentage of successful non-5xx requests over 30 days
sum(rate(http_requests_total{status!~"5.."}[30d])) 
/ 
sum(rate(http_requests_total[30d])) * 100
\`\`\`

SLO Agreement:
- Target: 99.9% success over rolling 30-day window.
- Error Budget: 0.1% failures permitted (43.2 minutes of total downtime per month).

Create Prometheus alerting rule when error budget burn rate is critical:
\`\`\`yaml
groups:
  - name: slo-alerts
    rules:
      - alert: ErrorBudgetBurnRateTooHigh
        expr: (sum(rate(http_requests_total{status=~"5.."}[1h])) / sum(rate(http_requests_total[1h]))) > 0.014
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Error budget burning 14x normal rate; will exhaust budget in 2 days"
\`\`\`
Spend the budget on shipping fast; pause risky feature releases when the budget is depleted.`,
    whenUseful: 'Teams arguing about reliability vs features. Gives both sides a number to work with.',
    impact: 'Medium',
    effort: 'Weeks',
    savingsEstimate: 'Eliminates engineering vs product friction during outages',
  },
];

export async function seedPractices(prisma: PrismaClient) {
  console.log('Seeding Industry Practices (16 Guides) & Tactics (24 Items)...');

  // Seed Guides
  for (const guide of guidesData) {
    await prisma.guide.upsert({
      where: { slug: guide.slug },
      create: {
        title: guide.title,
        slug: guide.slug,
        category: guide.category,
        difficulty: guide.difficulty,
        readTimeMinutes: guide.readTimeMinutes,
        summary: guide.summary,
        content: guide.content,
        published: true, // Seeded as published per spec
      },
      update: {
        title: guide.title,
        category: guide.category,
        difficulty: guide.difficulty,
        readTimeMinutes: guide.readTimeMinutes,
        summary: guide.summary,
        content: guide.content,
        published: true,
      },
    });
  }
  console.log(`Successfully seeded ${guidesData.length} comprehensive guides.`);

  // Seed Tactics
  // Clean existing tactics if re-seeding
  await prisma.tactic.deleteMany({});

  for (const tactic of tacticsData) {
    await prisma.tactic.create({
      data: {
        title: tactic.title,
        category: tactic.category,
        description: tactic.description,
        impact: tactic.impact,
        effort: tactic.effort,
        savingsEstimate: tactic.savingsEstimate,
        howToUse: tactic.howToUse,
        howToImplement: tactic.howToImplement,
        whenUseful: tactic.whenUseful,
        published: true,
      },
    });
  }
  console.log(`Successfully seeded ${tacticsData.length} tactics.`);
}

