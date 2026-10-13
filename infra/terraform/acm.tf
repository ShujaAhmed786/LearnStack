# TLS certificate for app.shujaahmed.dev (free via ACM)
resource "aws_acm_certificate" "main" {
  domain_name       = "${var.app_subdomain}.${var.domain_name}"
  validation_method = "DNS" # Validate via Route 53 DNS record

  lifecycle {
    create_before_destroy = true
  }

  tags = { Name = "learnstack-cert" }
}

# DNS validation record (proves you own the domain)
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.main.zone_id
}

# Wait for validation to complete before using the cert
resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}
