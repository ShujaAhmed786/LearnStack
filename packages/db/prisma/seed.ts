import { PrismaClient } from '@prisma/client';
import { seedPractices } from './seed-practices.js';
import { seedAdminUser } from './seed-admin.js';
import { seedTopicQuizzes } from './seed-topic-quizzes.js';
import { seedDemoData } from './seed-demo-data.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding LearnStack roadmaps...');

  // 1. DevOps Roadmap
  const devopsData = {
    title: 'DevOps Engineer',
    slug: 'devops',
    description: 'Step by step guide to becoming a modern DevOps and Site Reliability Engineer.',
    icon: 'Terminal',
    stages: [
      {
        title: 'Linux Fundamentals',
        order: 0,
        topics: [
          {
            title: 'File system navigation',
            description: 'Master the Linux filesystem hierarchy (FHS), root directory layout, absolute/relative paths, and core traversal commands.',
            youtubeUrl: 'https://www.youtube.com/watch?v=s3ii48qYBxA',
            order: 0,
          },
          {
            title: 'Permissions (chmod/chown)',
            description: 'Understand POSIX file permissions (rwx), octal representation, ownership delegation, and sticky bits.',
            youtubeUrl: 'https://www.youtube.com/watch?v=5nzv_9npoq8',
            order: 1,
          },
          {
            title: 'Process management (ps, kill, systemd)',
            description: 'Inspect processes with ps, top, and htop; manage signals with kill; configure background daemon units with systemd.',
            youtubeUrl: 'https://www.youtube.com/watch?v=2e_Z6z5jW84',
            order: 2,
          },
          {
            title: 'Package managers (apt/yum)',
            description: 'Maintain system repositories, handle dependency resolution, and automate upgrades using apt, yum, and dnf.',
            youtubeUrl: 'https://www.youtube.com/watch?v=kP_pXjM7r3o',
            order: 3,
          },
          {
            title: 'SSH essentials',
            description: 'Generate asymmetric keypairs, configure ~/.ssh/config, secure sshd_config, and establish SSH tunnels.',
            youtubeUrl: 'https://www.youtube.com/watch?v=hQWRp-TXcKQ',
            order: 4,
          },
          {
            title: 'Shell scripting basics',
            description: 'Write robust POSIX Bash scripts with variables, conditionals, loops, exit codes, and set -euo pipefail.',
            youtubeUrl: 'https://www.youtube.com/watch?v=v-F3YLd6oMw',
            order: 5,
          },
          {
            title: 'Log viewing (journalctl, tail)',
            description: 'Query binary systemd logs with journalctl filters, follow live output with tail -f, and pipe through grep and awk.',
            youtubeUrl: 'https://www.youtube.com/watch?v=9gWzK1oO8yE',
            order: 6,
          },
          {
            title: 'Networking basics (ip, curl, netstat)',
            description: 'Diagnose network interfaces, socket states, DNS lookups, and HTTP payloads using ip, curl, ss, and netstat.',
            youtubeUrl: 'https://www.youtube.com/watch?v=rL8_HkR_q7U',
            order: 7,
          },
        ],
      },
      {
        title: 'Networking & Protocols',
        order: 1,
        topics: [
          {
            title: 'DNS how it works',
            description: 'Understand recursive resolvers, authoritative nameservers, record types (A, CNAME, MX, TXT), and TTL.',
            youtubeUrl: 'https://www.youtube.com/watch?v=mpQZVYPuDGU',
            order: 0,
          },
          {
            title: 'HTTP/HTTPS',
            description: 'Learn HTTP/1.1 and HTTP/2 semantics, methods, headers, status codes, and TLS handshake encryption.',
            youtubeUrl: 'https://www.youtube.com/watch?v=iYM2zFP3Zn0',
            order: 1,
          },
          {
            title: 'TCP/UDP',
            description: 'Compare 3-way handshakes, connection reliability, flow control, and datagram-oriented UDP streaming.',
            youtubeUrl: 'https://www.youtube.com/watch?v=uwoD5YsGACg',
            order: 2,
          },
          {
            title: 'Firewalls (ufw/iptables)',
            description: 'Protect server perimeters, inspect packet tables, define chain policies, and configure UFW rule sets.',
            youtubeUrl: 'https://www.youtube.com/watch?v=5U_uU7gGcxE',
            order: 3,
          },
          {
            title: 'Load balancing concepts',
            description: 'Distribute incoming traffic using Layer 4 (TCP) and Layer 7 (HTTP) load balancers with health checks.',
            youtubeUrl: 'https://www.youtube.com/watch?v=s_o8dwzRlu4',
            order: 4,
          },
          {
            title: 'VPN basics',
            description: 'Establish encrypted point-to-site and site-to-site tunnels using OpenVPN and WireGuard.',
            youtubeUrl: 'https://www.youtube.com/watch?v=_SreW_iB9a0',
            order: 5,
          },
        ],
      },
      {
        title: 'Version Control with Git',
        order: 2,
        topics: [
          {
            title: 'Init, clone, commit',
            description: 'Set up local repositories, stage changes with git add, and write concise conventional commits.',
            youtubeUrl: 'https://www.youtube.com/watch?v=RGOj5yH7evk',
            order: 0,
          },
          {
            title: 'Branching',
            description: 'Isolate feature development, manage short-lived branches, and implement trunk-based development.',
            youtubeUrl: 'https://www.youtube.com/watch?v=e2IbNHi4uCI',
            order: 1,
          },
          {
            title: 'Merging and rebasing',
            description: 'Compare non-fast-forward merge commits with interactive rebase cleanups to maintain linear history.',
            youtubeUrl: 'https://www.youtube.com/watch?v=0chZFIZLR_0',
            order: 2,
          },
          {
            title: 'GitHub workflows',
            description: 'Collaborate with remotes, configure branch protections, and track issue milestones.',
            youtubeUrl: 'https://www.youtube.com/watch?v=DVRQoVR3v6w',
            order: 3,
          },
          {
            title: 'Pull request reviews',
            description: 'Conduct actionable code reviews, propose suggestions, and enforce automated status checks before merging.',
            youtubeUrl: 'https://www.youtube.com/watch?v=8lGpZkjnkt4',
            order: 4,
          },
        ],
      },
      {
        title: 'Automation & Scripting',
        order: 3,
        topics: [
          {
            title: 'Bash scripting',
            description: 'Build robust automation scripts with error traps, argument parsing, and command subshells.',
            youtubeUrl: 'https://www.youtube.com/watch?v=tK9Oc6AEnR4',
            order: 0,
          },
          {
            title: 'Python for automation',
            description: 'Automate DevOps operational tasks, REST API calls, and file system cleanup with Python.',
            youtubeUrl: 'https://www.youtube.com/watch?v=rfscVS0vtbw',
            order: 1,
          },
          {
            title: 'Cron jobs',
            description: 'Schedule recurring background maintenance tasks, backup scripts, and certificate rotations with crontab.',
            youtubeUrl: 'https://www.youtube.com/watch?v=QZJ1P7bM1p0',
            order: 2,
          },
        ],
      },
      {
        title: 'CI/CD Pipelines',
        order: 4,
        topics: [
          {
            title: 'GitHub Actions basics',
            description: 'Create YAML workflows triggered on pull requests, matrix builds, artifact caching, and secrets.',
            youtubeUrl: 'https://www.youtube.com/watch?v=R8_veQiYBjI',
            order: 0,
          },
          {
            title: 'Jenkins basics',
            description: 'Set up a Jenkins controller, define declarative Jenkinsfiles, and manage distributed build agents.',
            youtubeUrl: 'https://www.youtube.com/watch?v=FX322RVNGj4',
            order: 1,
          },
          {
            title: 'Pipeline design',
            description: 'Structure build, test, scan, and deploy stages with artifact promotion across staging and production.',
            youtubeUrl: 'https://www.youtube.com/watch?v=scEDHsr3APg',
            order: 2,
          },
          {
            title: 'Testing in pipelines',
            description: 'Incorporate unit tests, linting, SAST code analysis, and integration testing before deployment.',
            youtubeUrl: 'https://www.youtube.com/watch?v=7kL5Bdfc12E',
            order: 3,
          },
        ],
      },
      {
        title: 'Containers with Docker',
        order: 5,
        topics: [
          {
            title: 'Images and containers',
            description: 'Understand container isolation, namespaces, cgroups, rootfs layers, and lifecycle states.',
            youtubeUrl: 'https://www.youtube.com/watch?v=3c-iLYnHGaM',
            order: 0,
          },
          {
            title: 'Dockerfile best practices',
            description: 'Write multi-stage Dockerfiles, minimize image layer bloat, run as non-root, and optimize caching.',
            youtubeUrl: 'https://www.youtube.com/watch?v=JofsaZ3H1qM',
            order: 1,
          },
          {
            title: 'Docker Compose',
            description: 'Orchestrate multi-container local environments with custom networks, shared volumes, and env vars.',
            youtubeUrl: 'https://www.youtube.com/watch?v=SXwC9fSwct8',
            order: 2,
          },
          {
            title: 'Container registries',
            description: 'Tag and publish container images to Docker Hub, GitHub Container Registry, AWS ECR, and GCP Artifact Registry.',
            youtubeUrl: 'https://www.youtube.com/watch?v=gAkwW2tuIqE',
            order: 3,
          },
        ],
      },
      {
        title: 'Container Orchestration with Kubernetes',
        order: 6,
        topics: [
          {
            title: 'Pods, deployments, services',
            description: 'Deploy stateless workloads, manage replica counts, rolling updates, and ClusterIP / NodePort services.',
            youtubeUrl: 'https://www.youtube.com/watch?v=X48VuDVv0do',
            order: 0,
          },
          {
            title: 'Ingress',
            description: 'Route external HTTP/S traffic to internal cluster services with Ingress controllers and TLS certificates.',
            youtubeUrl: 'https://www.youtube.com/watch?v=80Ew_fsV4rM',
            order: 1,
          },
          {
            title: 'ConfigMaps and secrets',
            description: 'Decouple environment configuration and sensitive credentials from container application code.',
            youtubeUrl: 'https://www.youtube.com/watch?v=b4wS9e2g3jU',
            order: 2,
          },
          {
            title: 'Helm basics',
            description: 'Package, parameterize, and version Kubernetes applications using Helm charts, values, and templates.',
            youtubeUrl: 'https://www.youtube.com/watch?v=-ykwb1d0DXU',
            order: 3,
          },
        ],
      },
      {
        title: 'Infrastructure as Code (Terraform)',
        order: 7,
        topics: [
          {
            title: 'HCL syntax',
            description: 'Declare providers, resources, input variables, outputs, and local values using HashiCorp Configuration Language.',
            youtubeUrl: 'https://www.youtube.com/watch?v=l5ob4z6ic9c',
            order: 0,
          },
          {
            title: 'State management',
            description: 'Secure terraform.tfstate with remote S3/GCS backends, state locking with DynamoDB, and state inspection.',
            youtubeUrl: 'https://www.youtube.com/watch?v=7xngnjfIlK4',
            order: 1,
          },
          {
            title: 'Modules',
            description: 'Encapsulate reusable infrastructure patterns and enforce standard architectures with Terraform modules.',
            youtubeUrl: 'https://www.youtube.com/watch?v=WtwgL2nJsmc',
            order: 2,
          },
          {
            title: 'Workspaces',
            description: 'Manage multiple state instances for distinct environments (dev, stage, prod) within the same configuration.',
            youtubeUrl: 'https://www.youtube.com/watch?v=V4_Xy4V2ZzQ',
            order: 3,
          },
        ],
      },
      {
        title: 'Observability & Monitoring',
        order: 8,
        topics: [
          {
            title: 'Prometheus basics',
            description: 'Scrape time-series metrics via exporters, write PromQL queries, and understand counters vs gauges.',
            youtubeUrl: 'https://www.youtube.com/watch?v=h4Sl21AKkDg',
            order: 0,
          },
          {
            title: 'Grafana dashboards',
            description: 'Build rich dashboards, visualize cluster telemetry, and set threshold alerts based on PromQL queries.',
            youtubeUrl: 'https://www.youtube.com/watch?v=wXQJqX8v2U0',
            order: 1,
          },
          {
            title: 'Centralized logging',
            description: 'Collect, ship, and query application and system logs using Grafana Loki, FluentBit, or Elasticsearch.',
            youtubeUrl: 'https://www.youtube.com/watch?v=gT8vWz2uX1A',
            order: 2,
          },
          {
            title: 'Alerting',
            description: 'Configure Prometheus Alertmanager, define escalation policies, deduplicate alerts, and route to Slack/PagerDuty.',
            youtubeUrl: 'https://www.youtube.com/watch?v=fD8f3N8xU6Q',
            order: 3,
          },
        ],
      },
      {
        title: 'DevSecOps & Security',
        order: 9,
        topics: [
          {
            title: 'Secrets management',
            description: 'Store, rotate, and access dynamic secrets and API keys securely using HashiCorp Vault or cloud KMS.',
            youtubeUrl: 'https://www.youtube.com/watch?v=VYfl-DpZ5wM',
            order: 0,
          },
          {
            title: 'Container image scanning',
            description: 'Detect vulnerabilities (CVEs) and misconfigurations in base images using Trivy and Grype in CI/CD.',
            youtubeUrl: 'https://www.youtube.com/watch?v=0zF4m0G9_jA',
            order: 1,
          },
          {
            title: 'Network policies',
            description: 'Enforce zero-trust ingress and egress packet isolation between Kubernetes pods and namespaces.',
            youtubeUrl: 'https://www.youtube.com/watch?v=3gPbRh4gK8M',
            order: 2,
          },
        ],
      },
    ],
  };

  // 2. Cloud Roadmap
  const cloudData = {
    title: 'Cloud Engineer',
    slug: 'cloud',
    description: 'Pick one cloud provider to start. Master infrastructure, networking, storage, and serverless compute.',
    icon: 'Cloud',
    stages: [
      {
        title: 'Choose Your Cloud',
        order: 0,
        topics: [
          {
            title: 'AWS vs GCP vs Azure Comparison',
            description: 'Explore the trade-offs, pricing models, enterprise adoption trends, and core architectural paradigms across AWS, GCP, and Azure.',
            youtubeUrl: 'https://www.youtube.com/watch?v=2LaAJq1lB1Q',
            order: 0,
          },
        ],
      },
      {
        title: 'AWS Path',
        order: 1,
        topics: [
          {
            title: 'IAM basics',
            description: 'Create users, groups, and IAM roles; define least-privilege JSON permission policies and enforce MFA.',
            youtubeUrl: 'https://www.youtube.com/watch?v=YQVq5d1m0cQ',
            order: 0,
          },
          {
            title: 'EC2 instances',
            description: 'Launch virtual server instances, select instance types, manage EBS volumes, and configure security groups.',
            youtubeUrl: 'https://www.youtube.com/watch?v=d_kXQfA3e70',
            order: 1,
          },
          {
            title: 'VPC networking',
            description: 'Architect Virtual Private Clouds with public/private subnets, Internet Gateways, NAT Gateways, and route tables.',
            youtubeUrl: 'https://www.youtube.com/watch?v=hiKPPy584-g',
            order: 2,
          },
          {
            title: 'S3 storage',
            description: 'Store objects at scale with S3 bucket policies, versioning, lifecycle rules, and server-side KMS encryption.',
            youtubeUrl: 'https://www.youtube.com/watch?v=e6w9LwZJFIA',
            order: 3,
          },
          {
            title: 'RDS databases',
            description: 'Provision managed relational databases (PostgreSQL/MySQL) with automated backups, Multi-AZ failover, and read replicas.',
            youtubeUrl: 'https://www.youtube.com/watch?v=erQ_Tf6qC4s',
            order: 4,
          },
          {
            title: 'Lambda serverless',
            description: 'Execute event-driven serverless code with AWS Lambda, API Gateway integrations, and execution roles.',
            youtubeUrl: 'https://www.youtube.com/watch?v=71Mee9Z0b-8',
            order: 5,
          },
          {
            title: 'CloudWatch monitoring',
            description: 'Monitor infrastructure telemetry, collect logs, set threshold alarms, and trigger auto-remediation actions.',
            youtubeUrl: 'https://www.youtube.com/watch?v=8Vj3D1O4M0Y',
            order: 6,
          },
        ],
      },
      {
        title: 'GCP Path',
        order: 2,
        topics: [
          {
            title: 'IAM',
            description: 'Manage Google Cloud identities, understand predefined vs custom roles, and attach service accounts.',
            youtubeUrl: 'https://www.youtube.com/watch?v=k1RI5locZE4',
            order: 0,
          },
          {
            title: 'Compute Engine',
            description: 'Deploy Compute Engine VM instances, attach persistent disks, and manage instance templates and groups.',
            youtubeUrl: 'https://www.youtube.com/watch?v=2T8gK5vN4nE',
            order: 1,
          },
          {
            title: 'VPC',
            description: 'Configure global Virtual Private Cloud networks, regional subnets, Cloud Router, and firewall rules.',
            youtubeUrl: 'https://www.youtube.com/watch?v=ENX88X-Z1uI',
            order: 2,
          },
          {
            title: 'Cloud Storage',
            description: 'Store blob data across storage classes (Standard, Nearline, Coldline, Archive) with uniform bucket-level access.',
            youtubeUrl: 'https://www.youtube.com/watch?v=VzZ1d8N4L2Q',
            order: 3,
          },
          {
            title: 'Cloud SQL',
            description: 'Deploy fully managed MySQL and PostgreSQL instances with high availability and automated maintenance windows.',
            youtubeUrl: 'https://www.youtube.com/watch?v=R9_uQv7E9yA',
            order: 4,
          },
          {
            title: 'Cloud Functions',
            description: 'Deploy lightweight serverless compute functions reacting to HTTP webhooks and Pub/Sub event streams.',
            youtubeUrl: 'https://www.youtube.com/watch?v=2qF6xL9x5U8',
            order: 5,
          },
          {
            title: 'Cloud Monitoring',
            description: 'Collect metrics and logs with Google Cloud Operations Suite (formerly Stackdriver) and configure alerting policies.',
            youtubeUrl: 'https://www.youtube.com/watch?v=M9p7m9X5E7k',
            order: 6,
          },
        ],
      },
      {
        title: 'Azure Path',
        order: 3,
        topics: [
          {
            title: 'Entra ID',
            description: 'Manage users, enterprise applications, Conditional Access, and RBAC roles with Microsoft Entra ID (Azure AD).',
            youtubeUrl: 'https://www.youtube.com/watch?v=M0O3n_bZ2x0',
            order: 0,
          },
          {
            title: 'Virtual Machines',
            description: 'Provision Windows and Linux VMs, configure network security groups (NSGs), and attach managed OS and data disks.',
            youtubeUrl: 'https://www.youtube.com/watch?v=10bO2kCg_0Y',
            order: 1,
          },
          {
            title: 'Virtual Network',
            description: 'Build Azure Virtual Networks (VNets), segment subnets, configure peering, and deploy Azure Bastion for secure access.',
            youtubeUrl: 'https://www.youtube.com/watch?v=Kz1oX6Z9m0k',
            order: 2,
          },
          {
            title: 'Blob Storage',
            description: 'Manage General Purpose v2 storage accounts, blob containers, access tiers (Hot/Cool/Archive), and SAS tokens.',
            youtubeUrl: 'https://www.youtube.com/watch?v=8rD3wP5rL6A',
            order: 3,
          },
          {
            title: 'Azure SQL',
            description: 'Deploy Azure SQL Database single databases and elastic pools with built-in high availability and query performance insights.',
            youtubeUrl: 'https://www.youtube.com/watch?v=v0L1h8yX4U8',
            order: 4,
          },
          {
            title: 'Azure Functions',
            description: 'Build event-driven serverless apps using input/output bindings, triggers, and Consumption / Premium plans.',
            youtubeUrl: 'https://www.youtube.com/watch?v=73lB_q6e3qg',
            order: 5,
          },
          {
            title: 'Azure Monitor',
            description: 'Collect and analyze telemetry using Log Analytics workspaces, Kusto Query Language (KQL), and Application Insights.',
            youtubeUrl: 'https://www.youtube.com/watch?v=D6F6dE6k0yU',
            order: 6,
          },
        ],
      },
    ],
  };

  const roadmaps = [devopsData, cloudData];

  for (const rm of roadmaps) {
    console.log(`Processing roadmap: ${rm.title} (${rm.slug})`);

    // Clean up existing roadmap with this slug if re-seeding
    const existing = await prisma.roadmap.findUnique({
      where: { slug: rm.slug },
    });

    if (existing) {
      await prisma.roadmap.delete({ where: { id: existing.id } });
    }

    const createdRoadmap = await prisma.roadmap.create({
      data: {
        title: rm.title,
        slug: rm.slug,
        description: rm.description,
        icon: rm.icon,
      },
    });

    for (const stage of rm.stages) {
      const createdStage = await prisma.roadmapStage.create({
        data: {
          roadmapId: createdRoadmap.id,
          title: stage.title,
          order: stage.order,
        },
      });

      for (const topic of stage.topics) {
        await prisma.roadmapTopic.create({
          data: {
            stageId: createdStage.id,
            title: topic.title,
            description: topic.description,
            youtubeUrl: topic.youtubeUrl,
            order: topic.order,
          },
        });
      }
    }

    console.log(`Successfully seeded roadmap: ${rm.title}`);
  }

  console.log('Roadmaps seeding complete!');

  // Seed Spec 07: Industry Practices and Tactics
  await seedPractices(prisma);

  // Seed Admin User
  await seedAdminUser();

  // Seed Spec 09: Topic Quizzes
  await seedTopicQuizzes(prisma);

  // Seed Spec 12: Course Product
  console.log('Seeding course products...');
  const cloudCourse = await prisma.roadmap.findUnique({ where: { slug: 'cloud' } });
  if (cloudCourse) {
    const existingProduct = await prisma.product.findFirst({
      where: { courseId: cloudCourse.id },
    });
    if (!existingProduct) {
      await prisma.product.create({
        data: {
          courseId: cloudCourse.id,
          priceCents: 0, // Free for now
          currency: 'usd',
          active: true,
          orgId: cloudCourse.orgId || '',
        },
      });
      console.log('Seeded free product for Cloud Engineer course.');
    }
  }

  // Seed Spec 18: Demo Data for Theodore
  await seedDemoData(prisma);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
