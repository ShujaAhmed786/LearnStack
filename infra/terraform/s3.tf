# S3 bucket for app uploads (course images, user avatars, etc.)
resource "aws_s3_bucket" "uploads" {
  bucket = "learnstack-uploads-${data.aws_caller_identity.current.account_id}"

  tags = { Name = "learnstack-uploads" }
}

data "aws_caller_identity" "current" {}

# Enable versioning (recover from accidental deletes)
resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Block all public access (app accesses via signed URLs)
resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Encrypt at rest
resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
