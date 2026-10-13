# CloudWatch log groups (30-day retention, not infinite)
resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/learnstack-api"
  retention_in_days = 30
  tags              = { Name = "learnstack-api-logs" }
}

resource "aws_cloudwatch_log_group" "web" {
  name              = "/ecs/learnstack-web"
  retention_in_days = 30
  tags              = { Name = "learnstack-web-logs" }
}

# SNS topic for alerts
resource "aws_sns_topic" "alerts" {
  name = "learnstack-alerts"
  tags = { Name = "learnstack-alerts" }
}

# Alarm: ALB 5xx errors (your app is broken)
resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "learnstack-alb-5xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "ALB returning 5xx errors"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}

# Alarm: RDS CPU high
resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "learnstack-rds-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "RDS CPU above 80%"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}

# Alarm: RDS storage low
resource "aws_cloudwatch_metric_alarm" "rds_storage" {
  alarm_name          = "learnstack-rds-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 5000000000 # 5 GB in bytes
  alarm_description   = "RDS free storage below 5 GB"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}

# Alarm: ECS CPU high
resource "aws_cloudwatch_metric_alarm" "ecs_cpu" {
  alarm_name          = "learnstack-ecs-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "ECS CPU above 80%"

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}
