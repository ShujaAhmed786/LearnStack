terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Local state (S3 backend requires s3:CreateBucket permission)
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "learnstack"
      Environment = "production"
      ManagedBy   = "terraform"
    }
  }
}
