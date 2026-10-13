# Secrets Manager: never put passwords in code or env files

# Database connection URL (constructed from RDS outputs)
resource "aws_secretsmanager_secret" "db_url" {
  name = "learnstack/db-url"
  tags = { Name = "learnstack-db-url" }
}

resource "aws_secretsmanager_secret_version" "db_url" {
  secret_id = aws_secretsmanager_secret.db_url.id
  secret_string = jsonencode({
    DATABASE_URL = "postgresql://${aws_db_instance.main.username}:${var.db_password}@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}"
  })
}

# Session secret for auth (random 64-char string)
resource "random_password" "session_secret" {
  length  = 64
  special = true
}

resource "aws_secretsmanager_secret" "session_secret" {
  name = "learnstack/session-secret"
  tags = { Name = "learnstack-session-secret" }
}

resource "aws_secretsmanager_secret_version" "session_secret" {
  secret_id = aws_secretsmanager_secret.session_secret.id
  secret_string = jsonencode({
    SESSION_SECRET = random_password.session_secret.result
  })
}

# Database master password (also stored for reference)
resource "aws_secretsmanager_secret" "db_password" {
  name = "learnstack/db-password"
  tags = { Name = "learnstack-db-password" }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = jsonencode({ password = var.db_password })
}
