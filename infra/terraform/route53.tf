# Route 53 hosted zone for shujaahmed.dev
# After applying, update nameservers at your domain registrar to these:
resource "aws_route53_zone" "main" {
  name = var.domain_name

  tags = { Name = "learnstack-zone" }
}

# A record: app.shujaahmed.dev -> ALB (alias record, free, auto-updates)
resource "aws_route53_record" "app" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "${var.app_subdomain}.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true # Only route to healthy ALB
  }
}
