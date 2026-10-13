# IAM role for EC2 instances (lets them pull from ECR, write logs, read secrets)
resource "aws_iam_role" "ecs_instance" {
  name = "learnstack-ecs-instance"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

# Attach AWS managed policy for ECS container instances
resource "aws_iam_role_policy_attachment" "ecs_instance" {
  role       = aws_iam_role.ecs_instance.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
}

# Allow reading secrets from Secrets Manager
# C4: Task execution role needs secrets access (not the EC2 instance role)
# ECS resolves container secrets using the execution role
resource "aws_iam_role_policy" "secrets" {
  name = "learnstack-secrets-read"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["secretsmanager:GetSecretValue"]
      Resource = [
        aws_secretsmanager_secret.db_url.arn,
        aws_secretsmanager_secret.session_secret.arn,
        "${one(aws_db_instance.main.master_user_secret).secret_arn}",
      ]
    }]
  })
}

# Instance profile to attach the role to EC2
resource "aws_iam_instance_profile" "ecs" {
  name = "learnstack-ecs-instance-profile"
  role = aws_iam_role.ecs_instance.name
}

# ECS task execution role (used by ECS agent to pull images and write logs)
resource "aws_iam_role" "ecs_task_execution" {
  name = "learnstack-ecs-task-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECS task role (used by your containers to access AWS services)
resource "aws_iam_role" "ecs_task" {
  name = "learnstack-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}
