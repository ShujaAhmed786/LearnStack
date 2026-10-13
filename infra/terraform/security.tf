# ALB: accepts HTTPS from anywhere, HTTP for redirect
resource "aws_security_group" "alb" {
  name        = "learnstack-alb"
  description = "ALB security group"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS from internet"
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP (redirects to HTTPS)"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "learnstack-alb-sg" }
}

# ECS instances: only accept traffic from ALB
resource "aws_security_group" "ecs" {
  name        = "learnstack-ecs"
  description = "ECS instances - only ALB can reach them"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "All TCP from ALB only"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "learnstack-ecs-sg" }
}

# RDS: only accept Postgres connections from ECS instances
resource "aws_security_group" "rds" {
  name        = "learnstack-rds"
  description = "RDS - only ECS can connect"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
    description     = "Postgres from ECS only"
  }

  tags = { Name = "learnstack-rds-sg" }
}

# NAT instance: allow traffic from private subnets
resource "aws_security_group" "nat" {
  name        = "learnstack-nat"
  description = "fck-nat instance"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["10.0.0.0/16"]
    description = "All traffic from VPC (NAT forwarding)"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "learnstack-nat-sg" }
}
