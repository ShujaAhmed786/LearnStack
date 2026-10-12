import { PrismaClient, QuestionType } from '@prisma/client';
import { devopsFundamentalsQuizzes } from './quizzes/devops-fundamentals.js';
import { devopsAdvancedQuizzes } from './quizzes/devops-advanced.js';
import { cloudPathsQuizzes } from './quizzes/cloud-paths.js';
import { TopicQuizSeed } from './quizzes/types.js';

const prisma = new PrismaClient();

export async function seedTopicQuizzes(client?: PrismaClient) {
  const db = client || prisma;
  console.log('Seeding topic quizzes for DevOps and Cloud roadmaps...');

  // 1. Get or create the LearnStack organization
  let org = await db.organization.findFirst({
    where: {
      OR: [
        { name: 'LearnStack' },
        { slug: 'learnstack' },
      ],
    },
  });

  if (!org) {
    org = await db.organization.create({
      data: {
        name: 'LearnStack',
        slug: 'learnstack',
        primaryColor: '#14B8A6',
      },
    });
  }

  const allQuizzes: TopicQuizSeed[] = [
    ...devopsFundamentalsQuizzes,
    ...devopsAdvancedQuizzes,
    ...cloudPathsQuizzes,
  ];

  console.log(`Processing ${allQuizzes.length} topic quizzes...`);

  let createdCount = 0;
  let linkedCount = 0;
  let questionCount = 0;

  for (const item of allQuizzes) {
    // 2. Find or create Quiz
    let quiz = await db.quiz.findFirst({
      where: {
        title: item.topicTitle,
        orgId: org.id,
      },
    });

    if (!quiz) {
      quiz = await db.quiz.create({
        data: {
          title: item.topicTitle,
          description: item.description,
          orgId: org.id,
          passingScore: 70,
        },
      });
      createdCount++;
    } else {
      // Update description/passingScore
      quiz = await db.quiz.update({
        where: { id: quiz.id },
        data: {
          description: item.description,
          passingScore: 70,
        },
      });
    }

    // 3. Clear existing questions for idempotency and create fresh ones
    await db.question.deleteMany({
      where: { quizId: quiz.id },
    });

    for (let i = 0; i < item.questions.length; i++) {
      const q = item.questions[i];
      await db.question.create({
        data: {
          quizId: quiz.id,
          text: q.text,
          type: q.type as QuestionType,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          points: 1,
          order: i,
        },
      });
      questionCount++;
    }

    // 4. Link quiz to all matching RoadmapTopic records
    const matchingTopics = await db.roadmapTopic.findMany({
      where: { title: item.topicTitle },
    });

    for (const t of matchingTopics) {
      await db.roadmapTopic.update({
        where: { id: t.id },
        data: { quizId: quiz.id },
      });
      linkedCount++;
    }
  }

  console.log(`Done! Created/Updated ${allQuizzes.length} quizzes with ${questionCount} total questions.`);
  console.log(`Linked to ${linkedCount} roadmap topics.`);
}

if (process.argv[1]?.endsWith('seed-topic-quizzes.ts')) {
  seedTopicQuizzes()
    .catch((e) => {
      console.error('Failed to seed topic quizzes:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
