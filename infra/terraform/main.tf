# LearnStack Deployment Infrastructure
# Reuses the existing FitLyfe K3s cluster (separate namespace)
# Provisions: PostgreSQL database, K8s secrets

terraform {
  required_version = ">= 1.5"
  required_providers {
    postgresql = {
      source  = "cyrilgdn/postgresql"
      version = "~> 1.22"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.30"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

# --- Variables ---
variable "db_host" {
  description = "PostgreSQL host (existing DB node)"
  type        = string
}

variable "db_port" {
  description = "PostgreSQL port"
  type        = string
  default     = "5432"
}

variable "db_admin_user" {
  description = "PostgreSQL admin username"
  type        = string
  default     = "postgres"
}

variable "db_admin_password" {
  description = "PostgreSQL admin password"
  type        = string
  sensitive   = true
}

variable "kubeconfig_path" {
  description = "Path to kubeconfig for the K3s cluster"
  type        = string
  default     = "~/.kube/config"
}

variable "app_domain" {
  description = "Domain for LearnStack (e.g., learnstack.yourdomain.com)"
  type        = string
}

variable "cors_origin" {
  description = "CORS origin (usually https:// + app_domain)"
  type        = string
}

# --- Providers ---
provider "postgresql" {
  host     = var.db_host
  port     = var.db_port
  username = var.db_admin_user
  password = var.db_admin_password
  sslmode  = "require"
  superuser = false
}

provider "kubernetes" {
  config_path = var.kubeconfig_path
}

# --- PostgreSQL: Database and User ---
resource "postgresql_database" "learnstack" {
  name  = "learnstack"
  owner = postgresql_role.learnstack_app.name
}

resource "random_password" "db_password" {
  length  = 32
  special = true
}

resource "postgresql_role" "learnstack_app" {
  name     = "learnstack_app"
  login    = true
  password = random_password.db_password.result
}

resource "postgresql_grant" "learnstack_db" {
  database    = postgresql_database.learnstack.name
  role        = postgresql_role.learnstack_app.name
  object_type = "database"
  privileges  = ["CONNECT", "CREATE", "TEMPORARY"]
}

# --- Secrets ---
resource "random_password" "session_secret" {
  length  = 64
  special = true
}

resource "kubernetes_namespace" "learnstack" {
  metadata {
    name = "learnstack"
  }
}

resource "kubernetes_secret" "learnstack_secrets" {
  metadata {
    name      = "learnstack-secrets"
    namespace = kubernetes_namespace.learnstack.metadata[0].name
  }

  data = {
    database-url   = "postgresql://${postgresql_role.learnstack_app.name}:${random_password.db_password.result}@${var.db_host}:${var.db_port}/learnstack"
    session-secret = random_password.session_secret.result
  }

  type = "Opaque"
}

# --- Outputs ---
output "database_url" {
  value     = "postgresql://${postgresql_role.learnstack_app.name}:***@${var.db_host}:${var.db_port}/learnstack"
  sensitive = false
}

output "namespace" {
  value = kubernetes_namespace.learnstack.metadata[0].name
}

output "app_domain" {
  value = var.app_domain
}
