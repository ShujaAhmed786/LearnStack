# AWS WAFv2 Web ACL for ALB protection
# Protects against common attacks: SQL injection, XSS, bad bots

resource "aws_wafv2_web_acl" "main" {
  name  = "learnstack-waf"
  scope = "REGIONAL" # For ALB (CLOUDFRONT would be for CloudFront)

  default_action {
    allow {}
  }

  # AWS Managed Rule: Core rule set (OWASP Top 10)
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "learnstack-waf-common"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rule: Known bad inputs
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "learnstack-waf-badinputs"
      sampled_requests_enabled   = true
    }
  }

  # Rate limiting: block IPs with too many requests
  rule {
    name     = "RateLimit"
    priority = 3

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000 # requests per 5 minutes per IP
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "learnstack-waf-ratelimit"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "learnstack-waf"
    sampled_requests_enabled   = true
  }

  tags = { Name = "learnstack-waf" }
}

# Associate WAF with ALB
resource "aws_wafv2_web_acl_association" "main" {
  resource_arn = aws_lb.main.arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}
