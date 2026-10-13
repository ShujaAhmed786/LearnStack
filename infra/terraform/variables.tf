variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "domain_name" {
  description = "Root domain (shujaahmed.dev)"
  type        = string
  default     = "shujaahmed.dev"
}

variable "app_subdomain" {
  description = "Subdomain for the app"
  type        = string
  default     = "app"
}

variable "db_password" {
  description = "RDS master password (set via TF_VAR_db_password, never commit)"
  type        = string
  sensitive   = true
}

variable "ecs_instance_type" {
  description = "EC2 instance type for ECS cluster"
  type        = string
  default     = "t3.small"
}

variable "ecs_min_size" {
  description = "Minimum ECS instances"
  type        = number
  default     = 2
}

variable "ecs_max_size" {
  description = "Maximum ECS instances"
  type        = number
  default     = 4
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}
