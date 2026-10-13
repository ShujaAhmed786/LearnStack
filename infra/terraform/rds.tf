# DB subnet group (RDS must be in private subnets)
resource "aws_db_subnet_group" "main" {
  name       = "learnstack"
  subnet_ids = aws_subnet.private[*].id

  tags = { Name = "learnstack-db-subnet-group" }
}

# RDS PostgreSQL with Multi-AZ for automatic failover
resource "aws_db_instance" "main" {
  identifier = "learnstack"

  engine         = "postgres"
  engine_version = "16.3"
  instance_class = var.db_instance_class # db.t3.micro

  allocated_storage     = 20
  max_allocated_storage = 100 # Autoscaling up to 100 GB
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "learnstack"
  username = "postgres"
  manage_master_user_password = true # Set via TF_VAR_db_password, stored in Secrets Manager too

  # Multi-AZ: standby replica in another AZ, auto-failover in 60-120 seconds
  multi_az = true

  # Backups: 7-day retention, point-in-time recovery
  backup_retention_period = 7
  backup_window           = "03:00-04:00" # UTC, low-traffic time
  maintenance_window      = "sun:04:00-sun:05:00"

  # Network
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false # Never expose RDS to the internet

  # Protection
  deletion_protection       = true # Prevent accidental deletion
  delete_automated_backups  = false # Keep backups even if instance is deleted
  skip_final_snapshot       = false # Always take a final snapshot on delete

  # Monitoring
  enabled_cloudwatch_logs_exports = ["postgresql"]
  performance_insights_enabled    = true
  performance_insights_retention_period = 7

  tags = { Name = "learnstack-db" }
}
