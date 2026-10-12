# LearnStack

A multi-tenant, white-label learning platform. Organizations get their own branded learning portal with courses, quizzes, discussion forums, live sessions, certificates, and analytics.

## Features

- **Courses**: Modules, lessons, video embeds, file uploads, search
- **Quizzes**: 10-question quizzes per lesson, 70% pass required, auto-grading, timer
- **Discussion Forums**: Per-lesson threads, accepted answers, instructor badges
- **Live Sessions**: Jitsi Meet integration, registration, scheduling, countdown
- **Certificates**: PDF generation on course completion, public verification URL
- **Payments**: Stripe Checkout integration, test mode supported
- **SSO**: Google and Microsoft one-click login
- **Analytics**: Lesson funnels, quiz difficulty analysis, at-risk learner alerts
- **Admin Panel**: User management, course management, pricing controls
- **Multi-tenant**: Organizations with custom branding, role-based access (Super Admin, Org Admin, Instructor, Learner)
- **Themes**: Light and dark mode

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Lucide icons
- **Backend**: Node.js, TypeScript, Fastify, Zod validation
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: Argon2id password hashing, session cookies, OAuth 2.0
- **Monorepo**: pnpm workspaces
- **Deployment**: Docker, GitHub Actions, GHCR, Kubernetes, ArgoCD, Terraform

## Run It Yourself

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker and Docker Compose
- PostgreSQL (or use Docker)

### Quick Start (Local Development)

1. **Clone the repo**
   ```bash
   git clone https://github.com/ShujaAhmed786/LearnStack.git
   cd LearnStack
   ```

2. **Start PostgreSQL**
   ```bash
   docker compose up -d
   ```
   This starts PostgreSQL on port 5432 with default credentials.

3. **Install dependencies**
   ```bash
   pnpm install
   ```

4. **Set up environment variables**
   ```bash
   cp apps/api/.env.example apps/api/.env
   ```
   Edit `apps/api/.env` with your values:
   - `DATABASE_URL`: PostgreSQL connection string
   - `SESSION_SECRET`: Random string for session signing
   - `EMAIL_USER` / `EMAIL_PASS`: Gmail credentials for verification emails (optional)
   - `STRIPE_SECRET_KEY`: Stripe test key for payments (optional, test mode)
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: For Google SSO (optional)
   - `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET`: For Microsoft SSO (optional)

5. **Run database migrations**
   ```bash
   pnpm --filter db exec prisma migrate dev
   ```

6. **Seed demo data** (optional, for testing)
   ```bash
   pnpm --filter db exec prisma db seed
   ```
   This creates demo users, courses, quizzes, forum threads, and analytics data.
   Demo logins (password: `demo123` for all):
   - Admin: `admin@acme-corp.com`
   - Instructor: `maria@acme-corp.com`
   - Learner: `alex@acme-corp.com`

7. **Start the dev servers**
   ```bash
   pnpm dev
   ```
   - Frontend: http://localhost:5173
   - API: http://localhost:3001

### Production Deployment (Docker)

1. **Build images**
   ```bash
   docker build -f infra/docker/Dockerfile.api -t learnstack-api .
   docker build -f infra/docker/Dockerfile.web -t learnstack-web .
   ```

2. **Run with Docker Compose** (production-like)
   ```bash
   docker compose -f docker-compose.yml up -d
   ```

### Production Deployment (Kubernetes + Terraform)

Full production setup on AWS with K3s:

1. **Configure AWS credentials**
   ```bash
   aws configure
   ```

2. **Deploy infrastructure**
   ```bash
   cd infra/terraform-full
   terraform init
   terraform plan
   terraform apply
   ```
   This creates: VPC, NAT instance, 2x K3s nodes (t4g.small), PostgreSQL server, security groups. All software (K3s, ingress-nginx, ArgoCD, PostgreSQL) installs automatically via user_data.

3. **Run database migrations** against the production database
   ```bash
   DATABASE_URL="<from terraform output>" pnpm --filter db exec prisma migrate deploy
   ```

4. **Deploy via ArgoCD**
   ```bash
   kubectl apply -f infra/k8s/argocd-app.yaml
   ```
   ArgoCD syncs from GitHub and deploys automatically on every push to main.

See `infra/terraform-full/` for infrastructure details.

### CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on every push:
- TypeScript type checking
- Linting
- Tests
- Trivy security scan
- Docker build and push to GHCR

## Project Structure

```
LearnStack/
├── apps/
│   ├── api/          # Fastify backend
│   └── web/          # React frontend
├── packages/
│   ├── db/           # Prisma schema, migrations, seeds
│   └── shared/       # Shared TypeScript types
├── infra/
│   ├── docker/       # Dockerfiles, nginx config
│   ├── k8s/          # Kubernetes manifests, ArgoCD app
│   ├── terraform/    # Lightweight TF (existing cluster)
│   └── terraform-full/ # Full AWS infrastructure
├── .github/
│   └── workflows/    # CI/CD pipelines
└── docker-compose.yml
```

## API Routes

- `/v1/auth/*` - Authentication (register, login, logout, OAuth)
- `/v1/courses/*` - Course browsing and enrollment
- `/v1/quizzes/*` - Quiz attempts and results
- `/v1/discussions/*` - Forum threads and posts
- `/v1/live-sessions/*` - Live session management
- `/v1/certificates/*` - Certificate generation and verification
- `/v1/payments/*` - Stripe checkout and webhooks
- `/v1/admin/*` - Admin operations (users, courses, analytics)

## License

MIT
