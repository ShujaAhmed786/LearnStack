# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "learnstack"

  setting {
    name  = "containerInsights"
    value = "enabled" # CloudWatch Container Insights for monitoring
  }

  tags = { Name = "learnstack-cluster" }
}

# Get the latest ECS-optimized AMI
data "aws_ami" "ecs_optimized" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-ecs-hvm-*-x86_64-ebs"]
  }
}

# Launch template for ECS container instances
resource "aws_launch_template" "ecs" {
  name_prefix   = "learnstack-ecs-"
  image_id      = data.aws_ami.ecs_optimized.id
  instance_type = var.ecs_instance_type

  iam_instance_profile {
    name = aws_iam_instance_profile.ecs.name
  }

  network_interfaces {
    security_groups = [aws_security_group.ecs.id]
  }

  # Join the ECS cluster on boot
  user_data = base64encode(<<-EOS
    #!/bin/bash
    echo "ECS_CLUSTER=${aws_ecs_cluster.main.name}" >> /etc/ecs/ecs.config
  EOS
  )

  tag_specifications {
    resource_type = "instance"
    tags          = { Name = "learnstack-ecs" }
  }
}

# Auto Scaling Group for ECS instances
resource "aws_autoscaling_group" "ecs" {
  name                = "learnstack-ecs"
  vpc_zone_identifier = aws_subnet.private[*].id
  min_size            = var.ecs_min_size
  max_size            = var.ecs_max_size
  desired_capacity    = var.ecs_min_size

  launch_template {
    id      = aws_launch_template.ecs.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "learnstack-ecs"
    propagate_at_launch = true
  }
}

# ECS capacity provider (connects ASG to ECS cluster)
resource "aws_ecs_capacity_provider" "main" {
  name = "learnstack"

  auto_scaling_group_provider {
    auto_scaling_group_arn = aws_autoscaling_group.ecs.arn

    managed_scaling {
      status = "ENABLED"
    }
  }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = [aws_ecs_capacity_provider.main.name]
}

# --- API Task Definition ---
resource "aws_ecs_task_definition" "api" {
  family                   = "learnstack-api"
  network_mode             = "bridge" # EC2 launch type uses bridge networking
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "api"
    image     = "${aws_ecr_repository.api.repository_url}:latest"
    essential = true

    portMappings = [{
      containerPort = 3001
      hostPort      = 0 # Dynamic port mapping (ECS assigns random host port)
      protocol      = "tcp"
    }]

    # Secrets from Secrets Manager (never in plaintext)
    secrets = [
      {
        name      = "DATABASE_URL"
        valueFrom = "${aws_secretsmanager_secret.db_url.arn}:DATABASE_URL::"
      },
      {
        name      = "SESSION_SECRET"
        valueFrom = "${aws_secretsmanager_secret.session_secret.arn}:SESSION_SECRET::"
      }
    ]

    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "3001" },
      { name = "CORS_ORIGIN", value = "https://app.shujaahmed.dev" }
    ]

    # Health check for ALB target group
    healthCheck = {
      command     = ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.api.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "api"
      }
    }

    # Resource limits
    cpu    = 512  # 0.5 vCPU
    memory = 1024 # 1 GB
  }])
}

# --- Web Task Definition ---
resource "aws_ecs_task_definition" "web" {
  family                   = "learnstack-web"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "web"
    image     = "${aws_ecr_repository.web.repository_url}:latest"
    essential = true

    portMappings = [{
      containerPort = 8080
      hostPort      = 0
      protocol      = "tcp"
    }]

    healthCheck = {
      command     = ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 30
    }

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.web.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "web"
      }
    }

    cpu    = 256  # 0.25 vCPU
    memory = 512  # 0.5 GB
  }])
}

# --- ECS Services ---
resource "aws_ecs_service" "api" {
  name            = "learnstack-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 2 # One per AZ

  # Rolling deployment: keep 1 running while deploying 1 new
  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 3001
  }

  # Spread across AZs
  ordered_placement_strategy {
    type  = "spread"
    field = "attribute:ecs.availability-zone"
  }

  depends_on = [aws_lb_listener.https]
}

resource "aws_ecs_service" "web" {
  name            = "learnstack-web"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.web.arn
  desired_count   = 2

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  load_balancer {
    target_group_arn = aws_lb_target_group.web.arn
    container_name   = "web"
    container_port   = 8080
  }

  ordered_placement_strategy {
    type  = "spread"
    field = "attribute:ecs.availability-zone"
  }

  depends_on = [aws_lb_listener.https]
}
