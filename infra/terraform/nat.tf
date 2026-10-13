# fck-nat: cheap NAT instance alternative ($4/mo vs $33/mo for NAT Gateway)
# https://github.com/AndrewGuenther/fck-nat

# Elastic IP for the NAT instance (stable outbound IP)
resource "aws_eip" "nat" {
  domain = "vpc"
  tags   = { Name = "learnstack-nat-eip" }
}

# Get the latest fck-nat AMI
data "aws_ami" "fck_nat" {
  most_recent = true
  owners      = ["568608671756"] # fck-nat official account

  filter {
    name   = "name"
    values = ["fck-nat-al2023-*"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}

# Launch template for fck-nat
resource "aws_launch_template" "nat" {
  name_prefix   = "learnstack-nat-"
  image_id      = data.aws_ami.fck_nat.id
  instance_type = "t3.nano" # ~$4/month, plenty for NAT traffic

  network_interfaces {
    associate_public_ip_address = true
    security_groups             = [aws_security_group.nat.id]
  }

  tag_specifications {
    resource_type = "instance"
    tags          = { Name = "learnstack-nat" }
  }
}

# Auto Scaling Group (min 1, max 1) for auto-recovery if instance dies
resource "aws_autoscaling_group" "nat" {
  name                = "learnstack-nat"
  vpc_zone_identifier = [aws_subnet.public[0].id]
  min_size            = 1
  max_size            = 1
  desired_capacity    = 1

  launch_template {
    id      = aws_launch_template.nat.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "learnstack-nat"
    propagate_at_launch = true
  }
}

# Route private subnet traffic through the NAT instance
# Note: fck-nat handles the ENI attachment automatically via its startup script
resource "aws_route" "private_nat" {
  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  # fck-nat ASG automatically updates this route to point to the new instance
  # For initial setup, this will be updated by the fck-nat startup script
  network_interface_id = data.aws_network_interface.nat.id
}

# Look up the NAT instance's network interface (populated after ASG creates it)
data "aws_network_interface" "nat" {
  filter {
    name   = "tag:Name"
    values = ["learnstack-nat"]
  }
  depends_on = [aws_autoscaling_group.nat]
}
