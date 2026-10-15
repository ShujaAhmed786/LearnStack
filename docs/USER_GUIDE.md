# LearnStack User Guide

Complete guide for using LearnStack as a learner and as an administrator.

**Live app:** https://app.shujaahmed.dev

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Learner Guide](#learner-guide)
3. [Admin Guide](#admin-guide)
4. [Page Reference](#page-reference)
5. [FAQ](#faq)

---

## Getting Started

### Creating an Account

1. Go to https://app.shujaahmed.dev/register
2. Enter your name, email address, and password (minimum 8 characters)
3. Click **Create Account**
4. Check your email for a verification link
5. Click the verification link to activate your account
6. Log in at https://app.shujaahmed.dev/login

### Logging In

1. Go to https://app.shujaahmed.dev/login
2. Enter your email and password
3. Click **Log In**

### Forgot Password

1. On the login page, click **Forgot password?**
2. Enter your email address
3. Check your email for a reset link (valid for 1 hour)
4. Click the link and set a new password

---

## Learner Guide

### Dashboard

After logging in, you land on the **Dashboard** (`/dashboard`).

**What you see:**
- **Course cards** showing your enrolled courses with progress bars
- **Continue Learning** section with your most recent lesson
- **Stats** (courses started, lessons completed, quizzes passed)

**What to do:**
- Click any course card to open the course detail page
- Click **Continue** to resume where you left off

### Browsing Courses

Go to **Courses** (`/courses`) from the sidebar or bottom nav.

**What you see:**
- All available courses (e.g., DevOps Engineer, Cloud Engineer)
- Each card shows: title, description, lesson count, your progress

**What to do:**
- Click a course card to view its details

### Taking a Course

Open a course (e.g., `/courses/devops`).

**What you see:**
- Course title, description, and overall progress (e.g., "0 of 45 lessons completed")
- **Module accordion** - click a module to expand its lessons
- Each lesson shows: title, description, video icon (if video available), quiz icon (if quiz available)

**What to do:**
1. Click a module header to expand it
2. Click a lesson to select it
3. **On desktop:** The lesson detail appears in the right sidebar with:
   - Embedded video player (if the lesson has a video)
   - "Open on YouTube" link
   - Lesson overview/description
   - Quiz section (if the lesson has a quiz)
   - "Mark as Complete" button
4. **On mobile:** The lesson detail expands inline directly below the tapped lesson
5. Watch the video, then take the quiz if available
6. Click the checkbox or "Mark as Complete" to mark the lesson done

**Tabs in the lesson panel:**
- **Lesson Content** - Video, description, quiz
- **Discussion** - Ask questions and see answers from other learners

### Taking Quizzes

Go to **Quizzes** (`/quizzes`) to see all available quizzes.

**Quiz list shows:**
- Quiz title, question count (always 10), your best score, pass/fail status

**Starting a quiz:**
1. Click a quiz to see the intro page (`/quizzes/:id`)
2. Review the details (10 questions, 70% to pass)
3. Click **Start Quiz**
4. Answer each question (multiple choice)
5. Click **Submit** when done

**After submitting:**
- See your score immediately
- Review correct/incorrect answers
- If you scored 70%+, the lesson is marked complete
- You can retake any quiz to improve your score

**Quiz results** are saved and shown on the quiz intro page for future reference.

### Guides and Tactics

- **Guides** (`/practices`) - In-depth learning guides on DevOps topics
- **Tactics** (`/tactics`) - Practical DevOps tactics and techniques

Browse, read, and apply them to your learning.

### Certificates

Go to **Certificates** (`/certificates`) to see your earned certificates.

**How to earn:**
1. Complete all lessons in a course (mark each as complete)
2. Pass all required quizzes (70%+)
3. Click **Claim Certificate** on the course page
4. Your certificate appears here with a public verification URL

### Discussions

Each lesson has a **Discussion** tab where you can:
- Ask questions about the lesson content
- See questions from other learners
- Mark answers as accepted (if you're the asker)

### Profile

Access your profile from the sidebar menu to:
- Update your name and profile information
- Change your password
- View your learning statistics

---

## Admin Guide

Admins manage the platform content, users, and monitor learning progress.

### Accessing the Admin Panel

1. Go to https://app.shujaahmed.dev/admin/login
2. Log in with an admin account (SUPER_ADMIN or ORG_ADMIN role)
3. You land on the **Admin Dashboard** (`/admin`)

### Admin Dashboard

**What you see:**
- Total users, courses, quizzes, lessons
- Recent signups
- Completion rates
- Quick links to management pages

### Managing Users

Go to **Users** (`/admin/users`).

**What you can do:**
- **Search** users by name or email
- **View** user details (role, organization, progress)
- **Change roles** (Learner, Instructor, Org Admin, Super Admin)
- **Deactivate** users (soft-delete, preserves their data)
- **Filter** by role or status

User list is paginated (20 per page).

### Managing Courses

Go to **Courses** (`/admin/courses`).

**What you can do:**
- **Create** a new course (title, slug, description)
- **Edit** course details
- **Manage modules** - Add, reorder, edit, delete modules within a course
- **Manage lessons** - Add, edit, delete lessons within a module
  - Set lesson title, description
  - Add YouTube video URL (auto-embeds)
  - Link a quiz to the lesson
  - Set lesson order

### Managing Quizzes

Go to **Quizzes** (`/admin/quizzes`).

**What you can do:**
- **Create** a new quiz (title, description, pass percentage)
- **Add questions** - Each quiz has 10 questions
  - Question text
  - 4 answer options (A, B, C, D)
  - Mark the correct answer
  - Optional explanation
- **Edit** existing quizzes and questions
- **Delete** quizzes (also removes associated attempts)
- **Preview** the quiz as a learner would see it

### Managing Guides

Go to **Guides** (`/admin/guides`).

**What you can do:**
- **Create** learning guides (title, slug, content)
- **Edit** guide content (Markdown supported)
- **Publish/unpublish** guides
- **Delete** guides

### Managing Tactics

Go to **Tactics** (`/admin/tactics`).

**What you can do:**
- **Create** DevOps tactics (title, category, content)
- **Edit** tactic details
- **Organize** by category

### Analytics

Go to **Analytics** (`/admin/analytics`).

**What you see:**
- **Lesson funnels** - Where learners drop off in each course
- **Quiz difficulty** - Which questions are most/least answered correctly
- **At-risk learners** - Users with low engagement or failing quizzes
- **Completion rates** - By course, by module

Use this data to improve course content.

### Settings

Go to **Settings** (`/admin/settings`).

**What you can do:**
- Update organization name and branding
- Configure email templates
- Manage API keys (if applicable)

---

## Page Reference

### Public Pages (no login required)

| URL | Page | Description |
|-----|------|-------------|
| `/login` | Login | Email/password authentication |
| `/register` | Register | New account creation |
| `/forgot-password` | Forgot Password | Password reset request |
| `/reset-password` | Reset Password | Set new password (from email link) |
| `/verify-email` | Verify Email | Email verification landing |

### Learner Pages (login required)

| URL | Page | Description |
|-----|------|-------------|
| `/dashboard` | Dashboard | Course progress overview |
| `/courses` | Course List | Browse all courses |
| `/courses/:slug` | Course Detail | Modules, lessons, video+quiz panel |
| `/quizzes` | Quiz List | All quizzes with attempt status |
| `/quizzes/:id` | Quiz Intro | Quiz details and start button |
| `/quizzes/:id/take` | Take Quiz | Answer questions |
| `/quizzes/:id/results/:attemptId` | Quiz Results | Score and answer review |
| `/practices` | Guides | Learning guides list |
| `/practices/:slug` | Guide Detail | Guide content |
| `/tactics` | Tactics | DevOps tactics list |
| `/tactics/:id` | Tactic Detail | Tactic content |
| `/certificates` | Certificates | Earned certificates |
| `/discussions` | Discussions | Forum threads |
| `/live` | Live Sessions | Upcoming/past live classes |
| `/live/:id` | Live Session | Session details and join link |
| `/search` | Search | Search courses, lessons, guides |
| `/profile` | Profile | User settings |

### Admin Pages (admin role required)

| URL | Page | Description |
|-----|------|-------------|
| `/admin/login` | Admin Login | Admin authentication |
| `/admin` | Admin Dashboard | Platform overview stats |
| `/admin/users` | Users | User management with pagination |
| `/admin/courses` | Courses | Course/module/lesson CRUD |
| `/admin/roadmaps` | Roadmaps | Legacy course management (same as courses) |
| `/admin/quizzes` | Quizzes | Quiz and question CRUD |
| `/admin/guides` | Guides | Guide content CRUD |
| `/admin/tactics` | Tactics | Tactic content CRUD |
| `/admin/content` | Content | Unified content management |
| `/admin/analytics` | Analytics | Funnels, difficulty, at-risk learners |
| `/admin/settings` | Settings | Organization configuration |

---

## FAQ

### As a Learner

**Q: How do I enroll in a course?**
A: All courses are currently free and open. Just click a course and start learning. Your progress is tracked automatically.

**Q: What score do I need to pass a quiz?**
A: 70% or higher (7 out of 10 questions correct).

**Q: Can I retake a quiz?**
A: Yes, unlimited retakes. Your best score is saved.

**Q: How do I get a certificate?**
A: Complete all lessons in a course and pass all required quizzes, then click "Claim Certificate" on the course page.

**Q: I forgot my password. What do I do?**
A: Click "Forgot password?" on the login page, enter your email, and follow the reset link (valid for 1 hour).

### As an Admin

**Q: How do I add a new admin?**
A: Go to Users, find the user, and change their role to ORG_ADMIN or SUPER_ADMIN.

**Q: How do I add a video to a lesson?**
A: Edit the lesson, paste the YouTube URL in the video URL field. It auto-embeds.

**Q: Can I delete a user?**
A: You can deactivate users (soft-delete). Their data is preserved but they cannot log in.

**Q: How do I see which quizzes are too hard?**
A: Go to Analytics → Quiz Difficulty to see per-question success rates.
