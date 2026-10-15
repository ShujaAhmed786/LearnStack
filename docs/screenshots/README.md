# LearnStack Screenshots

Visual documentation of all LearnStack pages for evaluator review. Screenshots are organized by user role and device type.

**Live app:** https://app.shujaahmed.dev

## Directory Structure

```
docs/screenshots/
├── README.md          # This file
├── learner/           # Learner panel screenshots (desktop)
├── admin/            # Admin panel screenshots (desktop)
└── mobile/           # Mobile screenshots (375px width)
```

## Learner Panel

Pages accessible to users with the LEARNER role.

| File | Page | URL | Description |
|------|------|-----|-------------|
| `learner/01-login.png` | Login | `/login` | Email/password login form with "Forgot password?" link |
| `learner/02-register.png` | Register | `/register` | New account registration with email verification |
| `learner/03-forgot-password.png` | Forgot Password | `/forgot-password` | Password reset request form |
| `learner/04-dashboard.png` | Dashboard | `/dashboard` | Course progress cards, continue learning, stats |
| `learner/05-courses.png` | Course List | `/courses` | All available courses with progress indicators |
| `learner/06-course-detail.png` | Course Detail | `/courses/devops` | Module accordion, lesson list, click lesson to expand video+quiz inline |
| `learner/07-quizzes.png` | Quiz List | `/quizzes` | All 67 quizzes with attempt status |
| `learner/08-quiz-intro.png` | Quiz Intro | `/quizzes/:id` | Quiz details, question count, pass requirement, Start button |
| `learner/09-guides.png` | Guides | `/practices` | Learning guides list |
| `learner/10-tactics.png` | Tactics | `/tactics` | DevOps tactics list |
| `learner/11-certificates.png` | Certificates | `/certificates` | Earned certificates with verification URLs |
| `learner/12-profile.png` | Profile | `/profile` | User settings and profile management |

### Learner Journey

1. **Register** (`/register`) → Verify email → **Login** (`/login`)
2. **Dashboard** (`/dashboard`) → See enrolled courses and progress
3. **Browse Courses** (`/courses`) → Click a course → **Course Detail** (`/courses/:slug`)
4. Expand a module → Click a lesson → Video and quiz appear inline below the lesson
5. **Take Quiz** → Answer 10 questions → See results (70%+ to pass)
6. Complete all lessons → **Claim Certificate** (`/certificates`)
7. Explore **Guides** (`/practices`) and **Tactics** (`/tactics`) for supplementary learning

## Admin Panel

Pages accessible to users with SUPER_ADMIN or ORG_ADMIN role. Admins manage content, users, and view analytics.

| File | Page | URL | Description |
|------|------|-----|-------------|
| `admin/01-login.png` | Admin Login | `/admin/login` | Separate admin authentication |
| `admin/02-dashboard.png` | Admin Dashboard | `/admin` | Platform stats: users, courses, quizzes, completions |
| `admin/03-users.png` | User Management | `/admin/users` | User list with search, role assignment, soft-delete |
| `admin/04-courses.png` | Course Management | `/admin/courses` | Course CRUD, module/lesson management |
| `admin/05-quizzes.png` | Quiz Management | `/admin/quizzes` | Quiz CRUD, question editor |
| `admin/06-guides.png` | Guide Management | `/admin/guides` | Guide content management |
| `admin/07-tactics.png` | Tactic Management | `/admin/tactics` | Tactic content management |
| `admin/08-analytics.png` | Analytics | `/admin/analytics` | Lesson funnels, quiz difficulty, at-risk learners |
| `admin/09-settings.png` | Settings | `/admin/settings` | Organization settings and branding |

### Admin Journey

1. **Login** (`/admin/login`) with admin credentials
2. **Dashboard** (`/admin`) → Review platform metrics
3. **Users** (`/admin/users`) → Search, assign roles, manage accounts
4. **Courses** (`/admin/courses`) → Create/edit courses, modules, lessons
5. **Quizzes** (`/admin/quizzes`) → Create quizzes, add questions
6. **Analytics** (`/admin/analytics`) → Identify struggling learners, difficult quizzes

## Mobile Screenshots

Key pages captured at 375px width (iPhone standard).

| File | Page | Description |
|------|------|-------------|
| `mobile/01-dashboard.png` | Dashboard | Course cards stack vertically, bottom nav bar |
| `mobile/02-course-detail.png` | Course Detail | Module accordion, tap lesson to expand video+quiz inline |
| `mobile/03-lesson-expanded.png` | Lesson Expanded | Video embed and quiz visible directly below tapped lesson |
| `mobile/04-quiz-list.png` | Quiz List | Quiz cards in single column |
| `mobile/05-quiz-take.png` | Taking Quiz | Question with answer options, progress indicator |

### Mobile UX Notes

- **Bottom navigation** replaces the desktop sidebar on screens < 768px
- **Lesson detail** expands inline below the tapped lesson (not in a sidebar)
- **Course cards** are fully tappable (entire card is a link)
- **Touch targets** meet 44px minimum for primary actions
- **Tables** in admin panel scroll horizontally (`overflow-x-auto`)

## Role Differences

| Capability | Learner | Admin |
|------------|---------|-------|
| View courses | Yes | Yes |
| Take quizzes | Yes | Yes |
| Earn certificates | Yes | Yes |
| Manage users | No | Yes |
| Create/edit courses | No | Yes |
| Create/edit quizzes | No | Yes |
| View analytics | No | Yes |
| Access `/admin/*` | No | Yes |

## Screenshot Guidelines

When capturing screenshots for this documentation:

1. **Desktop:** 1440px width, light mode (default theme)
2. **Mobile:** 375px width (iPhone SE/standard)
3. **State:** Use realistic data (the seeded DevOps Engineer course with 45 lessons)
4. **Annotations:** Highlight key interactive elements where helpful
5. **Naming:** Follow the numbered convention above for consistent ordering
