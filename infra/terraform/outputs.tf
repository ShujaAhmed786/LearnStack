output "app_url" {
  description = "The app URL"
  value       = "https://${var.app_subdomain}.${var.domain_name}"
}

output "alb_dns_name" {
  description = "ALB DNS name (for debugging)"
  value       = aws_lb.main.dns_name
}

output "ecr_api_url" {
  description = "ECR repository URL for API images"
  value       = aws_ecr_repository.api.repository_url
}

output "ecr_web_url" {
  description = "ECR repository URL for web images"
  value       = aws_ecr_repository.web.repository_url
}

output "rds_endpoint" {
  description = "RDS endpoint (connect via private network only)"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "nameservers" {
  description = "Update your domain registrar to use these nameservers"
  value       = aws_route53_zone.main.name_servers
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}
