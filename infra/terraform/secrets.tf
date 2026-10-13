# Secrets Manager: never put passwords in code or env files

# Database connection URL
# Note: password comes from RDS-managed secret, not Terraform vars
resource "aws_secretsmanager_secret" "db_url" {
  name = "learnstack/db-url"
  tags = { Name = "learnstack-db-url" }
}

resource "aws_secretsmanager_secret_version" "db_url" {
  secret_id = aws_secretsmanager_secret.db_url.id
  secret_string = jsonencode({
    DATABASE_URL = "postgresql://${aws_db_instance.main.username}:${jsondecode(data.aws_secretsmanager_secret_version.rds_password.secret_string)["password"]}@${aws_db_instance.main.address}:${aws_db_instance.main.port}/${aws_db_instance.main.db_name}"
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

# Note: RDS master password is now managed by RDS itself
# (manage_master_user_password = true). The secret ARN is available as:
# aws_db_instance.main.master_user_secret[0].secret_arn
# ECS tasks should read the password from there.
