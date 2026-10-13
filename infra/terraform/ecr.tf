# ECR repositories for Docker images

resource "aws_ecr_repository" "api" {
  name                 = "learnstack/api"
  image_tag_mutability = "MUTABLE" # Allow overwriting tags (we use SHA tags anyway)

  image_scanning_configuration {
    scan_on_push = true # Scan for vulnerabilities on every push
  }

  tags = { Name = "learnstack-api" }
}

resource "aws_ecr_repository" "web" {
  name                 = "learnstack/web"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = { Name = "learnstack-web" }
}

# Keep only the last 10 images to save storage costs
resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name
  policy     = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection    = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}

resource "aws_ecr_lifecycle_policy" "web" {
  repository = aws_ecr_repository.web.name
  policy     = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection    = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}
