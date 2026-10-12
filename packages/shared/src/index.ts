export type Role = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'INSTRUCTOR' | 'LEARNER';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  primaryColor: string;
  createdAt: string | Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  orgId: string;
  emailVerified: boolean;
  active?: boolean;
  deletedAt?: string | Date | null;
  createdAt: string | Date;
  org?: Organization;
}

export interface AuthResponse {
  user: User;
  org: Organization;
}

export interface ApiError {
  error: {
    message: string;
    code: string;
  };
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  orgSlug: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface VerifyEmailInput {
  email: string;
  code: string;
}

export interface ResendCodeInput {
  email: string;
}

// Spec 02: Content Management Types
export interface Material {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  topicId: string;
  orgId: string;
  createdAt: string | Date;
}

export interface Topic {
  id: string;
  title: string;
  content: string;
  subjectId: string;
  orgId: string;
  order: number;
  youtubeUrl?: string | null;
  videoUrl?: string | null;
  materials?: Material[];
  createdAt: string | Date;
  subject?: Subject;
}

export interface Subject {
  id: string;
  name: string;
  description?: string | null;
  collectionId: string;
  orgId: string;
  createdAt: string | Date;
  topics?: Topic[];
  collection?: Collection;
  _count?: {
    topics: number;
  };
}

export interface Collection {
  id: string;
  name: string;
  description?: string | null;
  categoryId: string;
  orgId: string;
  createdAt: string | Date;
  subjects?: Subject[];
  category?: Category;
  _count?: {
    subjects: number;
  };
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  orgId: string;
  createdAt: string | Date;
  collections?: Collection[];
  _count?: {
    collections: number;
  };
}

export interface CreateCategoryInput {
  name: string;
  description?: string;
}

export interface CreateCollectionInput {
  name: string;
  description?: string;
}

export interface CreateSubjectInput {
  name: string;
  description?: string;
}

export interface CreateTopicInput {
  title: string;
  content: string;
  order?: number;
  youtubeUrl?: string;
  videoUrl?: string;
}

export interface UpdateTopicInput {
  title?: string;
  content?: string;
  order?: number;
  youtubeUrl?: string | null;
  videoUrl?: string | null;
}

export interface SearchResultTopic extends Omit<Topic, 'subject'> {
  subject: {
    id: string;
    name: string;
    collection: {
      id: string;
      name: string;
      category: {
        id: string;
        name: string;
      };
    };
  };
}

// Spec 03: Quiz Engine Types
export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';

export interface Question {
  id: string;
  quizId: string;
  text: string;
  type: QuestionType;
  options: string[];
  correctAnswer?: string; // Scrubbed for learners before submission
  explanation?: string | null;
  points: number;
  order: number;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  orgId: string;
  answers: Record<string, string>;
  score?: number | null;
  passed?: boolean | null;
  startedAt: string | Date;
  completedAt?: string | Date | null;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  quiz?: Quiz;
}

export interface Quiz {
  id: string;
  title: string;
  description?: string | null;
  topicId?: string | null;
  orgId: string;
  timeLimitMinutes?: number | null;
  passingScore: number;
  createdAt: string | Date;
  questions?: Question[];
  attempts?: QuizAttempt[];
  topic?: {
    id: string;
    title: string;
  } | null;
  _count?: {
    questions: number;
    attempts: number;
  };
  bestScore?: number | null;
  lastAttempt?: QuizAttempt | null;
}

export interface CreateQuizInput {
  title: string;
  description?: string;
  topicId?: string;
  timeLimitMinutes?: number;
  passingScore?: number;
}

export interface CreateQuestionInput {
  text: string;
  type: QuestionType;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  points?: number;
  order?: number;
}

export interface SubmitQuizAttemptInput {
  answers: Record<string, string>;
}

export interface QuestionFeedback {
  questionId: string;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  pointsEarned: number;
  pointsPossible: number;
  explanation?: string | null;
}

export interface SubmitQuizResult {
  attemptId: string;
  score: number;
  passed: boolean;
  totalPoints: number;
  earnedPoints: number;
  feedback: QuestionFeedback[];
}

// Spec 04: Uploads and Progress Types
export interface Progress {
  id: string;
  userId: string;
  topicId: string;
  orgId: string;
  completed: boolean;
  lastPosition: number;
  updatedAt: string | Date;
  topic?: Topic;
}

export interface ProgressSummarySubject {
  subjectId: string;
  subjectName: string;
  collectionName: string;
  categoryName: string;
  totalTopics: number;
  completedTopics: number;
  percentComplete: number;
}

export interface ProgressSummary {
  totalTopics: number;
  completedTopics: number;
  inProgressTopics: number;
  subjects: ProgressSummarySubject[];
  lastAccessedTopic?: {
    topicId: string;
    topicTitle: string;
    subjectName: string;
    lastPosition: number;
    updatedAt: string | Date;
  } | null;
}

export interface UploadResponse {
  url: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

// Spec 06: Roadmap Types
export interface TopicProgress {
  id: string;
  topicId: string;
  userId: string;
  completed: boolean;
  updatedAt: string | Date;
}

export interface RoadmapTopic {
  id: string;
  stageId: string;
  title: string;
  description?: string | null;
  youtubeUrl?: string | null;
  quizId?: string | null;
  quizTitle?: string | null;
  questionCount?: number;
  userBestScore?: number | null;
  passed?: boolean;
  order: number;
  completed?: boolean;
  locked?: boolean;
  progress?: TopicProgress[];
}

export interface RoadmapStage {
  id: string;
  roadmapId: string;
  title: string;
  order: number;
  topics: RoadmapTopic[];
  totalTopics?: number;
  completedTopics?: number;
  percentComplete?: number;
}

export interface Roadmap {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  orgId?: string | null;
  stages?: RoadmapStage[];
  createdAt: string | Date;
  totalTopics?: number;
  completedTopics?: number;
  percentComplete?: number;
  priceCents?: number | null;
  currency?: string | null;
  isEnrolled?: boolean;
  isFree?: boolean;
}

// Spec 12: Payments & Enrollments Types
export type PurchaseStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface Product {
  id: string;
  courseId: string;
  priceCents: number;
  currency: string;
  active: boolean;
  orgId: string;
  createdAt: string | Date;
}

export interface Purchase {
  id: string;
  userId: string;
  productId: string;
  stripeSessionId: string;
  stripePaymentId?: string | null;
  amountCents: number;
  currency: string;
  status: PurchaseStatus;
  createdAt: string | Date;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  orgId: string;
  createdAt: string | Date;
  course?: Roadmap;
}


export interface RoadmapProgressSummary {
  roadmapId: string;
  roadmapSlug: string;
  totalTopics: number;
  completedTopics: number;
  percentComplete: number;
  stages: {
    stageId: string;
    stageTitle: string;
    totalTopics: number;
    completedTopics: number;
    percentComplete: number;
  }[];
}

// Spec 07: Industry Practices & Tactics Types
export type GuideCategory =
  | 'TEAM_COMMUNICATION'
  | 'DEV_WORKFLOW'
  | 'REAL_INCIDENTS'
  | 'COST_CUTTING'
  | 'AUTOMATION'
  | 'RELIABILITY'
  | 'SCALABILITY';

export interface Guide {
  id: string;
  title: string;
  slug: string;
  category: GuideCategory;
  summary: string;
  content: string;
  difficulty: string;
  readTimeMinutes: number;
  published: boolean;
  orgId?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Tactic {
  id: string;
  title: string;
  category: GuideCategory;
  description: string;
  impact: string;
  effort: string;
  savingsEstimate?: string | null;
  published: boolean;
  orgId?: string | null;
  howToUse?: string | null;
  howToImplement?: string | null;
  whenUseful?: string | null;
  createdAt: string | Date;
}


// Spec 08: Admin Types
export interface AdminStats {
  userCount: number;
  contentCounts: {
    categories: number;
    topics: number;
    quizzes: number;
  };
  quizAttempts: number;
  recentSignups: User[];
}

export interface AdminUsersResponse {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
}

export interface UpdateUserRoleInput {
  role: Role;
}

export interface UpdateUserStatusInput {
  active: boolean;
}

export interface UpdateOrgSettingsInput {
  name?: string;
  logoUrl?: string | null;
  primaryColor?: string;
}

// Spec 13: Certificate Types
export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  orgId: string;
  certificateNumber: string;
  issuedAt: string | Date;
  pdfUrl?: string | null;
  user?: {
    name: string;
    email: string;
  };
  course?: {
    title: string;
    slug: string;
  };
  org?: {
    name: string;
    logoUrl?: string | null;
  };
}

export interface VerifyCertificateResponse {
  valid: boolean;
  holderName?: string;
  courseTitle?: string;
  issuedAt?: string | Date;
  orgName?: string;
  certificateNumber?: string;
  pdfUrl?: string | null;
}

// Spec 14: Live Sessions Types
export type LiveSessionStatus = 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';

export interface LiveSession {
  id: string;
  title: string;
  description?: string | null;
  courseId?: string | null;
  orgId: string;
  scheduledAt: string | Date;
  durationMinutes: number;
  meetingUrl?: string | null;
  meetingId?: string | null;
  status: LiveSessionStatus;
  createdById: string;
  createdAt: string | Date;
  isRegistered?: boolean;
  canJoin?: boolean;
  registrationCount?: number;
  course?: {
    id: string;
    title: string;
    slug: string;
  } | null;
  instructor?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface CreateLiveSessionInput {
  title: string;
  description?: string;
  courseId?: string;
  scheduledAt: string;
  durationMinutes?: number;
}

export interface JoinLiveSessionResponse {
  meetingUrl: string;
  meetingId: string;
  title: string;
  status: LiveSessionStatus;
}

// Spec 15: Discussion Forum Types
export interface DiscussionPost {
  id: string;
  threadId: string;
  authorId: string;
  content: string;
  isAnswer: boolean;
  orgId: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  author?: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
}

export interface DiscussionThread {
  id: string;
  title: string;
  lessonId?: string | null;
  courseId?: string | null;
  orgId: string;
  authorId: string;
  pinned: boolean;
  locked: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  postCount?: number;
  hasAcceptedAnswer?: boolean;
  author?: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
  posts?: DiscussionPost[];
  course?: {
    id: string;
    title: string;
    slug: string;
  } | null;
  lesson?: {
    id: string;
    title: string;
  } | null;
}

export interface CreateThreadInput {
  title: string;
  content: string;
  lessonId?: string;
  courseId?: string;
}

export interface CreatePostInput {
  content: string;
}

// Spec 17: Analytics Types
export type AnalyticsEventType =
  | 'lesson_started'
  | 'lesson_completed'
  | 'quiz_started'
  | 'quiz_completed'
  | 'video_played'
  | 'login';

export interface TrackEventInput {
  eventType: AnalyticsEventType | string;
  lessonId?: string;
  courseId?: string;
  metadata?: Record<string, any>;
}

export interface AnalyticsOverviewResponse {
  totalLearners: number;
  activeThisWeek: number;
  avgCompletionRate: number;
  avgQuizScore: number;
  totalLessonsCompleted: number;
}

export interface FunnelLessonStep {
  lessonId: string;
  title: string;
  started: number;
  completed: number;
  completionRate: number;
  avgTimeSpent: number;
}

export interface CourseFunnelResponse {
  courseId: string;
  courseTitle: string;
  totalEnrolled: number;
  lessons: FunnelLessonStep[];
}

export interface HardestQuestion {
  questionId: string;
  text: string;
  correctRate: number;
}

export interface QuizAnalyticsItem {
  quizId: string;
  title: string;
  attempts: number;
  avgScore: number;
  passRate: number;
  hardestQuestions: HardestQuestion[];
}

export interface CourseQuizzesResponse {
  courseId: string;
  courseTitle: string;
  quizzes: QuizAnalyticsItem[];
}

export interface AtRiskLearner {
  userId: string;
  name: string;
  email: string;
  reasons: string[];
  lastActiveAt?: string | Date | null;
  enrolledAt?: string | Date | null;
  courseTitle?: string | null;
  progressPercent?: number;
  quizFailuresCount?: number;
}

export interface AtRiskLearnersResponse {
  atRiskCount: number;
  learners: AtRiskLearner[];
}

export interface DailyEngagementPoint {
  date: string;
  activeLearners: number;
}

export interface EngagementResponse {
  days: DailyEngagementPoint[];
}

