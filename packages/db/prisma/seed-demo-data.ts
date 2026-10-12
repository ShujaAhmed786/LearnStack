import { PrismaClient, Role, LiveSessionStatus, QuestionType } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

export async function seedDemoData(client?: PrismaClient) {
  const db = client || prisma;
  console.log('==============================================');
  console.log('  Seeding Spec 18 Demo Data for Acme Corp     ');
  console.log('==============================================');

  // 1. Organization: Acme Corp
  const acmeOrg = await db.organization.upsert({
    where: { slug: 'acme-corp' },
    update: {
      name: 'Acme Corp',
      primaryColor: '#14B8A6',
    },
    create: {
      name: 'Acme Corp',
      slug: 'acme-corp',
      primaryColor: '#14B8A6',
    },
  });
  console.log(`[1/10] Organization: ${acmeOrg.name} (${acmeOrg.slug}) - ID: ${acmeOrg.id}`);

  // 2. Users: 14 demo users with password "demo123"
  const passwordHash = await argon2.hash('demo123', {
    type: argon2.argon2id,
  });

  const DEMO_USERS_CONFIG = [
    // 1 Super Admin
    { name: 'Admin User', email: 'admin@acme-corp.com', role: 'SUPER_ADMIN' as Role, daysAgo: 60 },
    // 2 Org Admins
    { name: 'Sara Jenkins', email: 'sara@acme-corp.com', role: 'ORG_ADMIN' as Role, daysAgo: 55 },
    { name: 'James Wilson', email: 'james@acme-corp.com', role: 'ORG_ADMIN' as Role, daysAgo: 52 },
    // 3 Instructors
    { name: 'Maria Garcia', email: 'maria@acme-corp.com', role: 'INSTRUCTOR' as Role, daysAgo: 50 },
    { name: 'David Chen', email: 'david@acme-corp.com', role: 'INSTRUCTOR' as Role, daysAgo: 48 },
    { name: 'Lisa Taylor', email: 'lisa@acme-corp.com', role: 'INSTRUCTOR' as Role, daysAgo: 45 },
    // 8 Learners
    { name: 'Alex Rivera', email: 'alex@acme-corp.com', role: 'LEARNER' as Role, daysAgo: 40 },
    { name: 'Emma Watson', email: 'emma@acme-corp.com', role: 'LEARNER' as Role, daysAgo: 35 },
    { name: 'Chris Evans', email: 'chris@acme-corp.com', role: 'LEARNER' as Role, daysAgo: 32 },
    { name: 'Nina Patel', email: 'nina@acme-corp.com', role: 'LEARNER' as Role, daysAgo: 30 },
    { name: 'Omar Farooq', email: 'omar@acme-corp.com', role: 'LEARNER' as Role, daysAgo: 25 },
    { name: 'Priya Sharma', email: 'priya@acme-corp.com', role: 'LEARNER' as Role, daysAgo: 20 },
    { name: 'Tom Holland', email: 'tom@acme-corp.com', role: 'LEARNER' as Role, daysAgo: 15 },
    { name: 'Zoe Kravitz', email: 'zoe@acme-corp.com', role: 'LEARNER' as Role, daysAgo: 10 },
  ];

  const userMap = new Map<string, any>();
  for (const u of DEMO_USERS_CONFIG) {
    const createdAt = new Date(Date.now() - u.daysAgo * 86400000);
    const user = await db.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        passwordHash,
        emailVerified: true,
        active: true,
        orgId: acmeOrg.id,
      },
      create: {
        name: u.name,
        email: u.email,
        role: u.role,
        passwordHash,
        emailVerified: true,
        active: true,
        orgId: acmeOrg.id,
        createdAt,
      },
    });
    userMap.set(u.email, user);
  }
  console.log(`[2/10] Seeded ${userMap.size} demo users (all password: demo123).`);

  // 3. Courses Verification (DevOps and Cloud)
  const devopsCourse = await db.roadmap.findUnique({
    where: { slug: 'devops' },
    include: {
      stages: {
        orderBy: { order: 'asc' },
        include: { topics: { orderBy: { order: 'asc' } } },
      },
    },
  });

  const cloudCourse = await db.roadmap.findUnique({
    where: { slug: 'cloud' },
    include: {
      stages: {
        orderBy: { order: 'asc' },
        include: { topics: { orderBy: { order: 'asc' } } },
      },
    },
  });

  if (!devopsCourse || !cloudCourse) {
    throw new Error('DevOps or Cloud courses not found. Please run base seed first.');
  }

  const devopsTopics = devopsCourse.stages.flatMap((s) => s.topics);
  const cloudTopics = cloudCourse.stages.flatMap((s) => s.topics);
  console.log(`[3/10] Courses verified: DevOps (${devopsTopics.length} lessons), Cloud (${cloudTopics.length} lessons).`);

  // 4. Products & Purchases
  // DevOps course: Free ($0)
  const devopsProduct = await db.product.upsert({
    where: { id: `prod_devops_${acmeOrg.id}` },
    update: { priceCents: 0, active: true },
    create: {
      id: `prod_devops_${acmeOrg.id}`,
      courseId: devopsCourse.id,
      priceCents: 0,
      currency: 'usd',
      active: true,
      orgId: acmeOrg.id,
    },
  });

  // Cloud course: Paid ($49 = 4900 cents)
  const cloudProduct = await db.product.upsert({
    where: { id: `prod_cloud_${acmeOrg.id}` },
    update: { priceCents: 4900, active: true },
    create: {
      id: `prod_cloud_${acmeOrg.id}`,
      courseId: cloudCourse.id,
      priceCents: 4900,
      currency: 'usd',
      active: true,
      orgId: acmeOrg.id,
    },
  });

  // 3 Purchases for Cloud course: alex, emma, nina
  const buyers = [
    { email: 'alex@acme-corp.com', daysAgo: 20 },
    { email: 'emma@acme-corp.com', daysAgo: 15 },
    { email: 'nina@acme-corp.com', daysAgo: 25 },
  ];

  for (const b of buyers) {
    const buyer = userMap.get(b.email);
    const sessionId = `cs_demo_${buyer.email.split('@')[0]}_cloud`;
    await db.purchase.upsert({
      where: { stripeSessionId: sessionId },
      update: { status: 'COMPLETED' },
      create: {
        userId: buyer.id,
        productId: cloudProduct.id,
        stripeSessionId: sessionId,
        stripePaymentId: `pi_demo_${buyer.email.split('@')[0]}`,
        amountCents: 4900,
        currency: 'usd',
        status: 'COMPLETED',
        createdAt: new Date(Date.now() - b.daysAgo * 86400000),
      },
    });

    // Cloud course enrollment
    await db.enrollment.upsert({
      where: { userId_courseId: { userId: buyer.id, courseId: cloudCourse.id } },
      update: {},
      create: {
        userId: buyer.id,
        courseId: cloudCourse.id,
        orgId: acmeOrg.id,
        createdAt: new Date(Date.now() - b.daysAgo * 86400000),
      },
    });
  }

  // Enroll all learners in DevOps course
  for (const u of DEMO_USERS_CONFIG.filter((x) => x.role === 'LEARNER')) {
    const learner = userMap.get(u.email);
    await db.enrollment.upsert({
      where: { userId_courseId: { userId: learner.id, courseId: devopsCourse.id } },
      update: {},
      create: {
        userId: learner.id,
        courseId: devopsCourse.id,
        orgId: acmeOrg.id,
        createdAt: new Date(Date.now() - (u.daysAgo - 1) * 86400000),
      },
    });
  }
  console.log('[4/10] Products, Purchases ($49 Cloud course for Alex, Emma, Nina) and Enrollments seeded.');

  // 5. Progress Data (TopicProgress)
  // alex: 60% DevOps (~27 topics), 30% Cloud (~7 topics)
  // emma: 40% DevOps (~18 topics), 2 Cloud
  // nina: 100% DevOps (ALL topics), 70% Cloud (~15 topics)
  // chris: 10% DevOps (first 4 topics, inactive > 10 days - at risk)
  // omar: 25% DevOps (~11 topics, active yesterday)
  // priya: 35% DevOps (~16 topics), 20% Cloud (~4 topics)
  // tom: 15% DevOps (~7 topics)
  // zoe: 50% DevOps (~22 topics), 10% Cloud (~2 topics)
  const PROGRESS_PLAN = [
    { email: 'alex@acme-corp.com', devopsRatio: 0.6, cloudCount: 7, lastActiveDaysAgo: 2 },
    { email: 'emma@acme-corp.com', devopsRatio: 0.4, cloudCount: 2, lastActiveDaysAgo: 3 },
    { email: 'nina@acme-corp.com', devopsRatio: 1.0, cloudCount: 15, lastActiveDaysAgo: 1 },
    { email: 'chris@acme-corp.com', devopsRatio: 0.1, cloudCount: 0, lastActiveDaysAgo: 12 }, // at-risk!
    { email: 'omar@acme-corp.com', devopsRatio: 0.25, cloudCount: 0, lastActiveDaysAgo: 1 },
    { email: 'priya@acme-corp.com', devopsRatio: 0.35, cloudCount: 4, lastActiveDaysAgo: 4 },
    { email: 'tom@acme-corp.com', devopsRatio: 0.15, cloudCount: 0, lastActiveDaysAgo: 5 },
    { email: 'zoe@acme-corp.com', devopsRatio: 0.5, cloudCount: 2, lastActiveDaysAgo: 2 },
  ];

  let totalProgressCreated = 0;
  for (const plan of PROGRESS_PLAN) {
    const learner = userMap.get(plan.email);
    const devopsCompletedCount = Math.round(devopsTopics.length * plan.devopsRatio);

    for (let i = 0; i < devopsCompletedCount; i++) {
      const topic = devopsTopics[i];
      const ageDays = Math.max(plan.lastActiveDaysAgo, Math.round(25 - i * 0.5));
      const updatedAt = new Date(Date.now() - ageDays * 86400000);

      await db.topicProgress.upsert({
        where: { userId_topicId: { userId: learner.id, topicId: topic.id } },
        update: { completed: true, updatedAt },
        create: {
          userId: learner.id,
          topicId: topic.id,
          completed: true,
          updatedAt,
        },
      });
      totalProgressCreated++;
    }

    for (let i = 0; i < plan.cloudCount && i < cloudTopics.length; i++) {
      const topic = cloudTopics[i];
      const ageDays = Math.max(plan.lastActiveDaysAgo, Math.round(15 - i * 0.7));
      const updatedAt = new Date(Date.now() - ageDays * 86400000);

      await db.topicProgress.upsert({
        where: { userId_topicId: { userId: learner.id, topicId: topic.id } },
        update: { completed: true, updatedAt },
        create: {
          userId: learner.id,
          topicId: topic.id,
          completed: true,
          updatedAt,
        },
      });
      totalProgressCreated++;
    }
  }
  console.log(`[5/10] Seeded progress across learners (${totalProgressCreated} completed lesson records).`);

  // 6. Quizzes & Quiz Attempts
  // Fetch quizzes associated with devops and cloud
  const devopsQuizIds = devopsTopics.map((t) => t.quizId).filter((id): id is string => Boolean(id));
  const cloudQuizIds = cloudTopics.map((t) => t.quizId).filter((id): id is string => Boolean(id));
  const allAvailableQuizIds = [...new Set([...devopsQuizIds, ...cloudQuizIds])];

  // Specific quiz attempts per Spec 18:
  // - alex: passed 5 quizzes (scores 80-95)
  // - emma: passed 3, failed 2 (scores 45, 55, then retook and passed)
  // - chris: attempted 1, failed (score 30), hasn't retried (at-risk learner)
  // - nina: passed 8 quizzes, high scores (90+)
  // - others: varying progress
  const alexUser = userMap.get('alex@acme-corp.com');
  const emmaUser = userMap.get('emma@acme-corp.com');
  const chrisUser = userMap.get('chris@acme-corp.com');
  const ninaUser = userMap.get('nina@acme-corp.com');
  const omarUser = userMap.get('omar@acme-corp.com');
  const priyaUser = userMap.get('priya@acme-corp.com');

  const QUIZ_ATTEMPTS_SEED = [
    // Alex (5 passed)
    ...[85, 90, 80, 95, 90].map((score, idx) => ({
      userId: alexUser.id,
      quizId: allAvailableQuizIds[idx % allAvailableQuizIds.length],
      score,
      passed: true,
      daysAgo: 18 - idx * 3,
    })),
    // Emma (passed 3, failed 2 with retakes)
    { userId: emmaUser.id, quizId: allAvailableQuizIds[0], score: 45, passed: false, daysAgo: 16 },
    { userId: emmaUser.id, quizId: allAvailableQuizIds[0], score: 80, passed: true, daysAgo: 15 },
    { userId: emmaUser.id, quizId: allAvailableQuizIds[1], score: 55, passed: false, daysAgo: 12 },
    { userId: emmaUser.id, quizId: allAvailableQuizIds[1], score: 75, passed: true, daysAgo: 11 },
    { userId: emmaUser.id, quizId: allAvailableQuizIds[2], score: 85, passed: true, daysAgo: 8 },
    // Chris (1 failed attempt, score 30, at-risk)
    { userId: chrisUser.id, quizId: allAvailableQuizIds[0], score: 30, passed: false, daysAgo: 12 },
    // Nina (8 passed, scores 90+)
    ...[95, 100, 90, 95, 100, 90, 95, 100].map((score, idx) => ({
      userId: ninaUser.id,
      quizId: allAvailableQuizIds[idx % allAvailableQuizIds.length],
      score,
      passed: true,
      daysAgo: 24 - idx * 2.5,
    })),
    // Omar (2 passed)
    { userId: omarUser.id, quizId: allAvailableQuizIds[0], score: 75, passed: true, daysAgo: 5 },
    { userId: omarUser.id, quizId: allAvailableQuizIds[1], score: 85, passed: true, daysAgo: 2 },
    // Priya (3 attempts)
    { userId: priyaUser.id, quizId: allAvailableQuizIds[0], score: 70, passed: true, daysAgo: 10 },
    { userId: priyaUser.id, quizId: allAvailableQuizIds[1], score: 85, passed: true, daysAgo: 7 },
    { userId: priyaUser.id, quizId: allAvailableQuizIds[2], score: 90, passed: true, daysAgo: 4 },
  ];

  let quizAttemptsCreated = 0;
  for (const qa of QUIZ_ATTEMPTS_SEED) {
    if (!qa.quizId) continue;
    const startedAt = new Date(Date.now() - qa.daysAgo * 86400000);
    const completedAt = new Date(startedAt.getTime() + 15 * 60000);

    const existing = await db.quizAttempt.findFirst({
      where: {
        userId: qa.userId,
        quizId: qa.quizId,
        score: qa.score,
      },
    });

    if (!existing) {
      await db.quizAttempt.create({
        data: {
          userId: qa.userId,
          quizId: qa.quizId,
          orgId: acmeOrg.id,
          score: qa.score,
          passed: qa.passed,
          answers: { q1: 'test_answer', q2: 'test_answer' },
          startedAt,
          completedAt,
        },
      });
      quizAttemptsCreated++;
    }
  }
  console.log(`[6/10] Seeded ${quizAttemptsCreated} varied quiz attempts (including failures and high scores).`);

  // 7. Discussion Forums (Spec 15)
  // 15-20 threads across different lessons with 2-5 posts, 3-4 accepted answers, 2 pinned
  const mariaUser = userMap.get('maria@acme-corp.com');
  const davidUser = userMap.get('david@acme-corp.com');
  const lisaUser = userMap.get('lisa@acme-corp.com');
  const tomUser = userMap.get('tom@acme-corp.com');
  const zoeUser = userMap.get('zoe@acme-corp.com');

  const THREADS_SPEC = [
    {
      title: 'Welcome! Read this first',
      pinned: true,
      author: mariaUser,
      lessonId: devopsTopics[0]?.id,
      courseId: devopsCourse.id,
      posts: [
        {
          author: mariaUser,
          content: 'Welcome to Acme Corp DevOps & Cloud Academy! Please use this forum to ask questions, share insights, and debug issues. Our instructor team is here to help you succeed.',
          isAnswer: false,
        },
        {
          author: alexUser,
          content: 'Excited to be here! Looking forward to diving deep into the Linux and Docker modules.',
          isAnswer: false,
        },
        {
          author: ninaUser,
          content: 'Thanks Maria! The curriculum looks extremely practical and comprehensive.',
          isAnswer: false,
        },
      ],
    },
    {
      title: 'FAQ: Common setup issues',
      pinned: true,
      author: davidUser,
      lessonId: cloudTopics[0]?.id,
      courseId: cloudCourse.id,
      posts: [
        {
          author: davidUser,
          content: 'Here is a quick checklist for your local developer environment:\n1. Ensure Docker Desktop has WSL2 enabled on Windows.\n2. Configure AWS CLI with aws configure sso.\n3. Verify Terraform version is >= 1.5.0.',
          isAnswer: true,
        },
        {
          author: emmaUser,
          content: 'Enabling WSL2 fixed my Docker hanging issue immediately. Thank you!',
          isAnswer: false,
        },
      ],
    },
    {
      title: 'Confused about chmod 755 vs 644',
      pinned: false,
      author: alexUser,
      lessonId: devopsTopics[1]?.id,
      courseId: devopsCourse.id,
      posts: [
        {
          author: alexUser,
          content: 'Why do executable scripts get 755 while regular config files like nginx.conf get 644? Does read permission not imply execution?',
          isAnswer: false,
        },
        {
          author: mariaUser,
          content: 'In POSIX permissions, read (4), write (2), and execute (1) are distinct bit flags. 755 gives rwxr-xr-x (executable for everyone, writable by owner). 644 gives rw-r--r-- (readable by everyone, writable by owner, but not executable). Config files should never have execute bits set for security hygiene.',
          isAnswer: true,
        },
        {
          author: alexUser,
          content: 'That bitmask math makes so much sense now. Thank you Maria!',
          isAnswer: false,
        },
      ],
    },
    {
      title: 'Docker networking not working on Windows',
      pinned: false,
      author: emmaUser,
      lessonId: devopsTopics[2]?.id,
      courseId: devopsCourse.id,
      posts: [
        {
          author: emmaUser,
          content: 'When I run containers with bridge networking, localhost:3000 refuses connections on Windows 11. What am I missing?',
          isAnswer: false,
        },
        {
          author: mariaUser,
          content: 'Make sure you explicitly bind ports with -p 3000:3000 and ensure your Docker service is listening on 0.0.0.0 inside the container, not 127.0.0.1.',
          isAnswer: true,
        },
        {
          author: chrisUser,
          content: 'I had the same issue! Binding to 0.0.0.0 solved it.',
          isAnswer: false,
        },
      ],
    },
    {
      title: 'Best way to structure Terraform modules?',
      pinned: false,
      author: ninaUser,
      lessonId: cloudTopics[1]?.id,
      courseId: cloudCourse.id,
      posts: [
        {
          author: ninaUser,
          content: 'Should we keep root modules and child modules in the same repository, or use a dedicated central registry repository for reusable modules?',
          isAnswer: false,
        },
        {
          author: davidUser,
          content: 'For production organizations like Acme Corp, the recommended pattern is: 1) A centralized terraform-modules repo with tagged git releases for child modules (VPC, EKS, RDS). 2) Environment-specific repos (staging, prod) referencing those tagged releases with pinned versions.',
          isAnswer: true,
        },
        {
          author: ninaUser,
          content: 'Tagging git releases prevents unexpected drift across staging and prod. Adopting this today.',
          isAnswer: false,
        },
      ],
    },
    {
      title: 'How does Kubernetes Ingress differ from NodePort?',
      pinned: false,
      author: omarUser,
      lessonId: devopsTopics[4]?.id,
      courseId: devopsCourse.id,
      posts: [
        {
          author: omarUser,
          content: 'Is NodePort still useful if we have Ingress NGINX configured in our cluster?',
          isAnswer: false,
        },
        {
          author: mariaUser,
          content: 'NodePort exposes a service on each node IP at a static port (30000-32767). Ingress operates at Layer 7 (HTTP/HTTPS) routing traffic based on hostname and URI paths to internal ClusterIP services. You usually use Ingress as your primary entrypoint, with an AWS NLB pointing to the Ingress controller.',
          isAnswer: true,
        },
      ],
    },
    {
      title: 'CI/CD Pipeline caching strategies for Docker layers',
      pinned: false,
      author: priyaUser,
      lessonId: devopsTopics[3]?.id,
      courseId: devopsCourse.id,
      posts: [
        {
          author: priyaUser,
          content: 'Our GitHub Actions workflow takes 12 minutes to build Docker images. How can we leverage cache-from in GitHub Actions cache?',
          isAnswer: false,
        },
        {
          author: davidUser,
          content: 'Use docker/build-push-action with cache-type=gha. Also order your Dockerfile to copy package.json / pnpm-lock.yaml before source files so dependencies are cached.',
          isAnswer: false,
        },
      ],
    },
    {
      title: 'IAM Role vs IAM User best practices in AWS',
      pinned: false,
      author: chrisUser,
      lessonId: cloudTopics[2]?.id,
      courseId: cloudCourse.id,
      posts: [
        {
          author: chrisUser,
          content: 'Why does AWS strongly recommend avoiding long-lived IAM user access keys in CI/CD?',
          isAnswer: false,
        },
        {
          author: lisaUser,
          content: 'Long-lived access keys get leaked into logs or public repos easily. By using OIDC (OpenID Connect) with GitHub Actions or AWS IAM Roles Anywhere, your pipeline assumes temporary short-lived STS credentials without storing any static secrets.',
          isAnswer: false,
        },
      ],
    },
    {
      title: 'S3 bucket policies vs ACLs: which one to use?',
      pinned: false,
      author: tomUser,
      lessonId: cloudTopics[3]?.id,
      courseId: cloudCourse.id,
      posts: [
        {
          author: tomUser,
          content: 'AWS disabled ACLs by default on new buckets. Is there any reason to re-enable them?',
          isAnswer: false,
        },
        {
          author: davidUser,
          content: 'No, keep S3 Object Ownership set to "Bucket owner enforced". IAM policies and S3 Bucket Policies provide full fine-grained access control.',
          isAnswer: false,
        },
      ],
    },
    {
      title: 'Systemd service restart policies in production',
      pinned: false,
      author: alexUser,
      lessonId: devopsTopics[2]?.id,
      courseId: devopsCourse.id,
      posts: [
        {
          author: alexUser,
          content: 'Should we use Restart=always or Restart=on-failure for background API daemons?',
          isAnswer: false,
        },
        {
          author: mariaUser,
          content: 'Restart=on-failure with RestartSec=5s is best. That way, if a process exits cleanly with code 0 (during graceful deployment/shutdown), systemd does not mistakenly relaunch it.',
          isAnswer: false,
        },
      ],
    },
    {
      title: 'VPC peering vs Transit Gateway latency tradeoffs',
      pinned: false,
      author: ninaUser,
      lessonId: cloudTopics[4]?.id,
      courseId: cloudCourse.id,
      posts: [
        {
          author: ninaUser,
          content: 'Does Transit Gateway add measurable network latency compared to direct VPC peering?',
          isAnswer: false,
        },
        {
          author: davidUser,
          content: 'VPC Peering has no intermediate hop, so latency is identical to direct intra-region communication (~0.5ms). Transit Gateway introduces an elastic interface hop adding approximately ~1ms of latency, but reduces mesh complexity when managing 5+ VPCs.',
          isAnswer: false,
        },
      ],
    },
    {
      title: 'How to handle database migrations in blue/green deployments?',
      pinned: false,
      author: zoeUser,
      lessonId: devopsTopics[5]?.id,
      courseId: devopsCourse.id,
      posts: [
        {
          author: zoeUser,
          content: 'If both blue and green are running concurrently, how do you handle non-backward compatible schema changes?',
          isAnswer: false,
        },
        {
          author: mariaUser,
          content: 'Use the expand/contract pattern (also known as parallel run). First deploy code that works with both schema versions, then migrate data, then cut over traffic, and finally clean up deprecated columns.',
          isAnswer: false,
        },
      ],
    },
    {
      title: 'Prometheus scraping intervals: 15s vs 60s impact',
      pinned: false,
      author: omarUser,
      lessonId: devopsTopics[6]?.id,
      courseId: devopsCourse.id,
      posts: [
        {
          author: omarUser,
          content: 'What is the storage overhead difference when scraping at 15s instead of 60s across 200 microservices?',
          isAnswer: false,
        },
        {
          author: mariaUser,
          content: '15s generates 4x more sample points. Standardize on 15s for critical latency/error rate metrics, and 60s for slow-moving metrics like disk or JVM memory pools.',
          isAnswer: false,
        },
      ],
    },
    {
      title: 'Bash error handling: set -euo pipefail caveats',
      pinned: false,
      author: alexUser,
      lessonId: devopsTopics[0]?.id,
      courseId: devopsCourse.id,
      posts: [
        {
          author: alexUser,
          content: 'Sometimes pipefail causes scripts to exit unexpectedly when grep finds no matches. How do you handle that cleanly?',
          isAnswer: false,
        },
        {
          author: mariaUser,
          content: 'Append || true or check exit codes explicitly: grep "pattern" file.txt || [ $? -eq 1 ]',
          isAnswer: false,
        },
      ],
    },
    {
      title: 'CloudWatch Logs vs Loki for cost efficiency at scale',
      pinned: false,
      author: priyaUser,
      lessonId: cloudTopics[0]?.id,
      courseId: cloudCourse.id,
      posts: [
        {
          author: priyaUser,
          content: 'CloudWatch log ingestion pricing ($0.50/GB) is becoming our biggest AWS line item. Has anyone migrated to Grafana Loki on S3?',
          isAnswer: false,
        },
        {
          author: davidUser,
          content: 'Yes! Grafana Loki stores compressed chunks in standard S3 without indexing raw log text, yielding ~80% savings compared to CloudWatch ingestion at high volume.',
          isAnswer: false,
        },
      ],
    },
    {
      title: 'Zero downtime deployments with ECS Fargate rolling updates',
      pinned: false,
      author: emmaUser,
      lessonId: cloudTopics[1]?.id,
      courseId: cloudCourse.id,
      posts: [
        {
          author: emmaUser,
          content: 'What minimumHealthyPercent and maximumPercent settings should we use for zero downtime rolling updates?',
          isAnswer: false,
        },
        {
          author: davidUser,
          content: 'Set minimumHealthyPercent=100 and maximumPercent=200. This ensures new tasks are fully healthy and passing ALB health checks before old tasks are drained.',
          isAnswer: false,
        },
      ],
    },
  ];

  let threadsCreated = 0;
  for (const t of THREADS_SPEC) {
    let thread = await db.discussionThread.findFirst({
      where: { title: t.title, orgId: acmeOrg.id },
    });

    if (!thread) {
      thread = await db.discussionThread.create({
        data: {
          title: t.title,
          lessonId: t.lessonId || null,
          courseId: t.courseId || null,
          orgId: acmeOrg.id,
          authorId: t.author.id,
          pinned: t.pinned,
        },
      });
      threadsCreated++;

      for (let pIdx = 0; pIdx < t.posts.length; pIdx++) {
        const post = t.posts[pIdx];
        await db.discussionPost.create({
          data: {
            threadId: thread.id,
            authorId: post.author.id,
            content: post.content,
            isAnswer: post.isAnswer,
            orgId: acmeOrg.id,
            createdAt: new Date(Date.now() - (10 - pIdx * 2) * 86400000),
          },
        });
      }
    }
  }
  console.log(`[7/10] Seeded ${threadsCreated} realistic discussion threads with replies & accepted answers.`);

  // 8. Live Sessions (Spec 14)
  // 3 upcoming (tomorrow, +3 days, +7 days), 2 past (ended: -10 days, -5 days)
  const LIVE_SESSIONS_SPEC = [
    {
      title: 'Docker Deep Dive Q&A',
      description: 'Live interactive debugging of multi-stage Docker builds, container networking, and memory leak diagnosis.',
      scheduledAt: new Date(Date.now() + 1 * 86400000),
      durationMinutes: 60,
      courseId: devopsCourse.id,
      status: 'SCHEDULED' as LiveSessionStatus,
      instructor: mariaUser,
    },
    {
      title: 'AWS VPC Workshop',
      description: 'Hands-on architectural build of highly available public/private subnets, NAT gateways, and transit routing.',
      scheduledAt: new Date(Date.now() + 3 * 86400000),
      durationMinutes: 90,
      courseId: cloudCourse.id,
      status: 'SCHEDULED' as LiveSessionStatus,
      instructor: davidUser,
    },
    {
      title: 'Career Panel: Breaking into DevOps',
      description: 'Ask anything session with senior staff SREs on interview preparation, portfolio building, and real production incidents.',
      scheduledAt: new Date(Date.now() + 7 * 86400000),
      durationMinutes: 60,
      courseId: devopsCourse.id,
      status: 'SCHEDULED' as LiveSessionStatus,
      instructor: mariaUser,
    },
    {
      title: 'Linux Basics Live',
      description: 'Interactive terminal walkthrough covering grep, awk, sed, and systemd units.',
      scheduledAt: new Date(Date.now() - 10 * 86400000),
      durationMinutes: 60,
      courseId: devopsCourse.id,
      status: 'ENDED' as LiveSessionStatus,
      instructor: mariaUser,
    },
    {
      title: 'Git Workshop',
      description: 'Deep dive into git rebase -i, bisect, reflog recovery, and clean commit history maintenance.',
      scheduledAt: new Date(Date.now() - 5 * 86400000),
      durationMinutes: 60,
      courseId: devopsCourse.id,
      status: 'ENDED' as LiveSessionStatus,
      instructor: davidUser,
    },
  ];

  const allLearners = DEMO_USERS_CONFIG.filter((u) => u.role === 'LEARNER').map((u) => userMap.get(u.email));
  let liveSessionsCreated = 0;

  for (const ls of LIVE_SESSIONS_SPEC) {
    let session = await db.liveSession.findFirst({
      where: { title: ls.title, orgId: acmeOrg.id },
    });

    const slug = ls.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const meetingId = `acme-${slug}`;
    const meetingUrl = `https://meet.jit.si/${meetingId}`;

    if (!session) {
      session = await db.liveSession.create({
        data: {
          title: ls.title,
          description: ls.description,
          courseId: ls.courseId,
          orgId: acmeOrg.id,
          scheduledAt: ls.scheduledAt,
          durationMinutes: ls.durationMinutes,
          meetingId,
          meetingUrl,
          status: ls.status,
          createdById: ls.instructor.id,
        },
      });
      liveSessionsCreated++;

      // Register 5-7 learners for each session
      const registeredCount = 5 + Math.floor(Math.random() * 3);
      for (let i = 0; i < registeredCount && i < allLearners.length; i++) {
        const learner = allLearners[i];
        await db.sessionRegistration.upsert({
          where: { sessionId_userId: { sessionId: session.id, userId: learner.id } },
          update: {},
          create: {
            sessionId: session.id,
            userId: learner.id,
          },
        });
      }
    }
  }
  console.log(`[8/10] Seeded ${liveSessionsCreated} live sessions (3 upcoming, 2 ended) with learner registrations.`);

  // 9. Certificates (Spec 13)
  // nina: 1 certificate for DevOps (100% completed)
  // alex: 1 certificate for Cloud
  const CERTIFICATES_SEED = [
    {
      user: ninaUser,
      course: devopsCourse,
      certificateNumber: 'LS-2026-NINA9281',
      daysAgo: 10,
    },
    {
      user: alexUser,
      course: cloudCourse,
      certificateNumber: 'LS-2026-ALEX4820',
      daysAgo: 5,
    },
  ];

  let certsCreated = 0;
  for (const c of CERTIFICATES_SEED) {
    const existing = await db.certificate.findUnique({
      where: { certificateNumber: c.certificateNumber },
    });

    if (!existing) {
      await db.certificate.create({
        data: {
          userId: c.user.id,
          courseId: c.course.id,
          orgId: acmeOrg.id,
          certificateNumber: c.certificateNumber,
          issuedAt: new Date(Date.now() - c.daysAgo * 86400000),
          pdfUrl: `/v1/certificates/${c.certificateNumber}/pdf`,
        },
      });
      certsCreated++;
    }
  }
  console.log(`[9/10] Seeded ${certsCreated} completion certificates for Nina (DevOps) and Alex (Cloud).`);

  // 10. Analytics Events (Spec 17): 500+ events over 30 days
  const existingEventsCount = await db.analyticsEvent.count({
    where: { orgId: acmeOrg.id },
  });

  const targetEventsCount = 550;
  if (existingEventsCount < targetEventsCount) {
    console.log(`[10/10] Seeding 500+ analytics events (current: ${existingEventsCount}, target: ${targetEventsCount})...`);
    const eventsToCreate = [];
    const eventTypes = [
      'lesson_started',
      'lesson_completed',
      'quiz_started',
      'quiz_completed',
      'video_played',
      'login',
    ];

    const allTopicIds = [...devopsTopics, ...cloudTopics].map((t) => t.id);

    // Distribute across last 30 days
    for (let day = 0; day < 30; day++) {
      // More events on recent days
      const eventsForThisDay = Math.floor(12 + (30 - day) * 0.7 + Math.random() * 8);

      for (let j = 0; j < eventsForThisDay; j++) {
        const randomLearner = allLearners[Math.floor(Math.random() * allLearners.length)];
        const randomEventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const randomTopicId = allTopicIds[Math.floor(Math.random() * allTopicIds.length)];
        const isCloud = Math.random() > 0.6;
        const courseId = isCloud ? cloudCourse.id : devopsCourse.id;

        // Distribute timestamp inside the day
        const dayOffsetMs = day * 86400000 + Math.floor(Math.random() * 86400000);
        const createdAt = new Date(Date.now() - dayOffsetMs);

        eventsToCreate.push({
          userId: randomLearner.id,
          orgId: acmeOrg.id,
          eventType: randomEventType,
          lessonId: randomEventType !== 'login' ? randomTopicId : null,
          courseId: randomEventType !== 'login' ? courseId : null,
          metadata: {
            timeSpentSeconds: 120 + Math.floor(Math.random() * 320),
            client: 'desktop-web',
          },
          createdAt,
        });
      }
    }

    // Batch insert in chunks of 100
    for (let i = 0; i < eventsToCreate.length; i += 100) {
      const chunk = eventsToCreate.slice(i, i + 100);
      await db.analyticsEvent.createMany({
        data: chunk,
      });
    }

    const finalEventsCount = await db.analyticsEvent.count({
      where: { orgId: acmeOrg.id },
    });
    console.log(`[10/10] Successfully generated ${finalEventsCount} total analytics events over 30 days.`);
  } else {
    console.log(`[10/10] Analytics events already seeded (${existingEventsCount} events exist).`);
  }

  console.log('\n==============================================');
  console.log('  DEMO DATA SEED COMPLETE FOR THEODORE!       ');
  console.log('==============================================\n');
}

if (process.argv[1]?.endsWith('seed-demo-data.ts')) {
  seedDemoData()
    .catch((e) => {
      console.error('Error seeding demo data:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
