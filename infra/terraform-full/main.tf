# LearnStack Infrastructure
# Lean K3s cluster: 2x t4g.small (k3s) + 1x t4g.small (postgres) + fck-nat
# Everything installed via user_data, no manual SSH needed

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

variable "region" {
  default = "us-east-1"
}

variable "project" {
  default = "learnstack"
}

provider "aws" {
  region = var.region
  default_tags {
    tags = {
      Project = var.project
    }
  }
}

# --- Key Pair ---
resource "tls_private_key" "main" {
  algorithm = "ED25519"
}

resource "aws_key_pair" "main" {
  key_name   = "${var.project}-key"
  public_key = tls_private_key.main.public_key_openssh
}

resource "local_file" "private_key" {
  content         = tls_private_key.main.private_key_openssh
  filename        = "${path.module}/${var.project}-key.pem"
  file_permission = "0600"
}

# --- VPC ---
resource "aws_vpc" "main" {
  cidr_block           = "10.1.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = { Name = "${var.project}-vpc" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${var.project}-igw" }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.1.1.0/24"
  availability_zone       = "${var.region}a"
  map_public_ip_on_launch = true
  tags                    = { Name = "${var.project}-public" }
}

resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.1.2.0/24"
  availability_zone = "${var.region}a"
  tags              = { Name = "${var.project}-private-a" }
}

resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.1.3.0/24"
  availability_zone = "${var.region}b"
  tags              = { Name = "${var.project}-private-b" }
}

# --- NAT instance (AL2023 with iptables masquerading, cheaper than NAT Gateway) ---
data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-arm64"]
  }
  filter {
    name   = "architecture"
    values = ["arm64"]
  }
}

resource "aws_security_group" "nat" {
  name   = "${var.project}-nat-sg"
  vpc_id = aws_vpc.main.id
  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["10.1.0.0/16"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "nat" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = "t4g.nano"
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.nat.id]
  key_name               = aws_key_pair.main.key_name
  source_dest_check      = false
  tags                   = { Name = "${var.project}-nat" }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    set -e
    exec > /var/log/user-data.log 2>&1
    # Enable IP forwarding and NAT masquerading
    echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
    sysctl -p
    iptables -t nat -A POSTROUTING -o ens5 -j MASQUERADE
    # Persist iptables
    dnf install -y iptables-services
    service iptables save
    echo "NAT_SETUP_COMPLETE" > /var/log/nat-setup.done
  EOF
  )
}

resource "aws_eip" "nat" {
  instance = aws_instance.nat.id
  domain   = "vpc"
  tags     = { Name = "${var.project}-nat-eip" }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block           = "0.0.0.0/0"
    network_interface_id = aws_instance.nat.primary_network_interface_id
  }
  tags = { Name = "${var.project}-private-rt" }
}

resource "aws_route_table_association" "private_a" {
  subnet_id      = aws_subnet.private_a.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private_b" {
  subnet_id      = aws_subnet.private_b.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  tags = { Name = "${var.project}-public-rt" }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# --- Security Groups ---
resource "aws_security_group" "k3s" {
  name   = "${var.project}-k3s-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["10.1.0.0/16"]
  }
  ingress {
    from_port   = 6443
    to_port     = 6443
    protocol    = "tcp"
    cidr_blocks = ["10.1.0.0/16"]
  }
  ingress {
    from_port = 0
    to_port   = 0
    protocol  = "-1"
    self      = true
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "${var.project}-k3s-sg" }
}

resource "aws_security_group" "db" {
  name   = "${var.project}-db-sg"
  vpc_id = aws_vpc.main.id
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.k3s.id]
  }
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["10.1.0.0/16"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "${var.project}-db-sg" }
}

# --- Random passwords ---
resource "random_password" "k3s_token" {
  length  = 32
  special = false
}

resource "random_password" "db_password" {
  length  = 32
  special = true
}

# --- Ubuntu AMI ---
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-arm64-server-*"]
  }
}

# --- K3s Server (with full user_data setup) ---
resource "aws_instance" "k3s_server" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = "t4g.small"
  subnet_id              = aws_subnet.private_a.id
  vpc_security_group_ids = [aws_security_group.k3s.id]
  key_name               = aws_key_pair.main.key_name
  tags                   = { Name = "${var.project}-k3s-server" }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    set -e
    exec > /var/log/user-data.log 2>&1

    # Install K3s server
    curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--disable traefik --disable servicelb" K3S_TOKEN="${random_password.k3s_token.result}" sh -

    # Wait for K3s to be ready
    sleep 30

    # Install Helm
    curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

    # Install ingress-nginx
    export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
    helm repo update
    helm install ingress-nginx ingress-nginx/ingress-nginx \
      --namespace ingress-nginx --create-namespace \
      --set controller.service.type=ClusterIP \
      --set controller.resources.requests.memory=128Mi \
      --set controller.resources.limits.memory=256Mi

    # Install ArgoCD
    kubectl create namespace argocd || true
    kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

    # Signal completion
    echo "K3S_SETUP_COMPLETE" > /var/log/k3s-setup.done
    echo "Setup complete at $(date)"
  EOF
  )

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }
}

# --- K3s Agent ---
resource "aws_instance" "k3s_agent" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = "t4g.small"
  subnet_id              = aws_subnet.private_b.id
  vpc_security_group_ids = [aws_security_group.k3s.id]
  key_name               = aws_key_pair.main.key_name
  tags                   = { Name = "${var.project}-k3s-agent" }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    set -e
    exec > /var/log/user-data.log 2>&1

    # Wait for server to be ready (simple retry loop)
    for i in $(seq 1 30); do
      if nc -z ${aws_instance.k3s_server.private_ip} 6443 2>/dev/null; then
        echo "K3s server reachable"
        break
      fi
      echo "Waiting for K3s server... attempt $i"
      sleep 20
    done

    # Install K3s agent
    curl -sfL https://get.k3s.io | K3S_URL="https://${aws_instance.k3s_server.private_ip}:6443" K3S_TOKEN="${random_password.k3s_token.result}" sh -

    echo "K3S_AGENT_SETUP_COMPLETE" > /var/log/k3s-setup.done
  EOF
  )

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  depends_on = [aws_instance.k3s_server]
}

# --- PostgreSQL ---
resource "aws_instance" "postgres" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = "t4g.small"
  subnet_id              = aws_subnet.private_a.id
  vpc_security_group_ids = [aws_security_group.db.id]
  key_name               = aws_key_pair.main.key_name
  tags                   = { Name = "${var.project}-postgres" }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    set -e
    exec > /var/log/user-data.log 2>&1

    # Install PostgreSQL 16
    apt-get update
    apt-get install -y postgresql-16 postgresql-contrib

    # Configure to listen on all interfaces
    echo "listen_addresses = '*'" >> /etc/postgresql/16/main/postgresql.conf
    echo "host all all 10.1.0.0/16 scram-sha-256" >> /etc/postgresql/16/main/pg_hba.conf

    systemctl restart postgresql
    systemctl enable postgresql

    # Create database and user
    sudo -u postgres psql -c "CREATE USER learnstack_app WITH PASSWORD '${random_password.db_password.result}';"
    sudo -u postgres psql -c "CREATE DATABASE learnstack OWNER learnstack_app;"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE learnstack TO learnstack_app;"

    echo "POSTGRES_SETUP_COMPLETE" > /var/log/postgres-setup.done
    echo "Setup complete at $(date)"
  EOF
  )

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }
}

# --- Outputs ---
output "k3s_server_private_ip" {
  value = aws_instance.k3s_server.private_ip
}

output "postgres_private_ip" {
  value = aws_instance.postgres.private_ip
}

output "database_url" {
  value     = "postgresql://learnstack_app:${random_password.db_password.result}@${aws_instance.postgres.private_ip}:5432/learnstack"
  sensitive = true
}

output "k3s_token" {
  value     = random_password.k3s_token.result
  sensitive = true
}

output "ssh_key_path" {
  value = local_file.private_key.filename
}
