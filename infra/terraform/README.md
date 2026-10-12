# LearnStack Deployment Guide

## Prerequisites
- Existing K3s cluster (from FitLyfe infra)
- PostgreSQL running (existing DB node or new)
- kubectl configured
- Terraform >= 1.5 installed
- Domain pointed at your cluster ingress

## Step 1: Configure Terraform
```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your actual values
```

## Step 2: Provision Database and Secrets
```bash
terraform init
terraform plan
terraform apply
```
This creates:
- `learnstack` PostgreSQL database
- `learnstack_app` database user with secure password
- `learnstack` Kubernetes namespace
- `learnstack-secrets` with DATABASE_URL and SESSION_SECRET

## Step 3: Run Database Migrations
```bash
# From your PC, targeting the production database
cd packages/db
DATABASE_URL="<from terraform output>" pnpm prisma migrate deploy
```

## Step 4: Build and Push Images
```bash
# GitHub Actions does this automatically on push to main
# Or manually:
docker build -f infra/docker/Dockerfile.api -t ghcr.io/shujaahmed786/learnstack-api:latest .
docker build -f infra/docker/Dockerfile.web -t ghcr.io/shujaahmed786/learnstack-web:latest .
docker push ghcr.io/shujaahmed786/learnstack-api:latest
docker push ghcr.io/shujaahmed786/learnstack-web:latest
```

## Step 5: Deploy via ArgoCD
```bash
kubectl apply -f infra/k8s/argocd-app.yaml
# ArgoCD will sync automatically
```

## Step 6: Verify
```bash
kubectl -n learnstack get pods
kubectl -n learnstack get ingress
curl https://learnstack.yourdomain.com/health
```

## Resource Usage
- API: 128Mi request / 256Mi limit, 2 replicas
- Web: 64Mi request / 128Mi limit, 2 replicas
- Total: ~384Mi requests, ~768Mi limits
- Fits on existing t4g.small nodes alongside FitLyfe
