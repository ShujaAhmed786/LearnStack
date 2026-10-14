import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useAuth } from './lib/auth-context';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Browse } from './pages/Browse';
import { TopicView } from './pages/TopicView';
import { Search } from './pages/Search';
import { ContentAdmin } from './pages/ContentAdmin';
import { QuizList } from './pages/QuizList';
import { QuizIntro } from './pages/QuizIntro';
import { QuizTake } from './pages/QuizTake';
import { QuizResults } from './pages/QuizResults';
import { QuizAdmin } from './pages/QuizAdmin';
import { VerifyEmail } from './pages/VerifyEmail';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { RoadmapsList } from './pages/RoadmapsList';
import { RoadmapDetail } from './pages/RoadmapDetail';
import { PracticesList } from './pages/PracticesList';
import { PracticeDetail } from './pages/PracticeDetail';
import { TacticsList } from './pages/TacticsList';
import { TacticDetail } from './pages/TacticDetail';
import { PurchaseSuccess } from './pages/PurchaseSuccess';
import { PurchaseCancelled } from './pages/PurchaseCancelled';
import { Certificates } from './pages/Certificates';
import { VerifyCertificate } from './pages/VerifyCertificate';
import { LiveSessions } from './pages/LiveSessions';
import { LiveSessionRoom } from './pages/LiveSessionRoom';
import { Discussions } from './pages/Discussions';
import { AdminLogin } from './pages/AdminLogin';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminUsers } from './pages/AdminUsers';
import { AdminRoadmaps } from './pages/AdminRoadmaps';
import { AdminGuides } from './pages/AdminGuides';
import { AdminTactics } from './pages/AdminTactics';
import { AdminSettings } from './pages/AdminSettings';
import { AdminAnalytics } from './pages/AdminAnalytics';
import { Skeleton } from './components/Skeleton';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Role } from '@learnstack/shared';

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: Role[];
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <Skeleton height="32px" className="w-48" />
          <Skeleton height="120px" className="w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role) && user.role !== 'SUPER_ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <Skeleton height="32px" className="w-48" />
          <Skeleton height="120px" className="w-full" />
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <Skeleton height="32px" className="w-48" />
          <Skeleton height="120px" className="w-full" />
        </div>
      </div>
    );
  }

  return <Navigate to={user ? '/dashboard' : '/login'} replace />;
}

function RoadmapSlugRedirect() {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={slug ? `/courses/${slug}` : '/courses'} replace />;
}

export function App() {
  return (
    <ErrorBoundary>
      <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/admin/login"
        element={<AdminLogin />}
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <Register />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/verify-email"
        element={<VerifyEmail />}
      />
      <Route
        path="/forgot-password"
        element={
          <PublicOnlyRoute>
            <ForgotPassword />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/reset-password"
        element={
          <PublicOnlyRoute>
            <ResetPassword />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      {/* Primary Courses Routes (Spec 10) */}
      <Route
        path="/courses"
        element={
          <ProtectedRoute>
            <RoadmapsList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:slug"
        element={
          <ProtectedRoute>
            <RoadmapDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchase/success"
        element={
          <ProtectedRoute>
            <PurchaseSuccess />
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchase/cancelled"
        element={
          <ProtectedRoute>
            <PurchaseCancelled />
          </ProtectedRoute>
        }
      />
      {/* Spec 13 Certificates Routes */}
      <Route
        path="/certificates"
        element={
          <ProtectedRoute>
            <Certificates />
          </ProtectedRoute>
        }
      />
      <Route
        path="/verify/:number"
        element={<VerifyCertificate />}
      />
      {/* Spec 14 Live Sessions Routes */}
      <Route
        path="/live"
        element={
          <ProtectedRoute>
            <LiveSessions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/live/:id"
        element={
          <ProtectedRoute>
            <LiveSessionRoom />
          </ProtectedRoute>
        }
      />
      {/* Spec 15 Discussion Forums Route */}
      <Route
        path="/discussions"
        element={
          <ProtectedRoute>
            <Discussions />
          </ProtectedRoute>
        }
      />
      {/* Legacy Roadmap Redirects */}
      <Route
        path="/roadmaps"
        element={<Navigate to="/courses" replace />}
      />
      <Route
        path="/roadmaps/:slug"
        element={<RoadmapSlugRedirect />}
      />
      <Route
        path="/practices"
        element={
          <ProtectedRoute>
            <PracticesList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/practices/:slug"
        element={
          <ProtectedRoute>
            <PracticeDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tactics"
        element={
          <ProtectedRoute>
            <TacticsList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tactics/:id"
        element={
          <ProtectedRoute>
            <TacticDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/browse"
        element={
          <ProtectedRoute>
            <Browse />
          </ProtectedRoute>
        }
      />
      <Route
        path="/topics/:id"
        element={
          <ProtectedRoute>
            <TopicView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/search"
        element={
          <ProtectedRoute>
            <Search />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/content"
        element={
          <ProtectedRoute allowedRoles={['ORG_ADMIN', 'INSTRUCTOR']}>
            <ContentAdmin />
          </ProtectedRoute>
        }
      />

      {/* Spec 03 Quiz Routes */}
      <Route
        path="/quizzes"
        element={
          <ProtectedRoute>
            <QuizList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quizzes/:id"
        element={
          <ProtectedRoute>
            <QuizIntro />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quizzes/:id/take"
        element={
          <ProtectedRoute>
            <QuizTake />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quizzes/:id/results/:attemptId"
        element={
          <ProtectedRoute>
            <QuizResults />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/quizzes"
        element={
          <ProtectedRoute allowedRoles={['ORG_ADMIN', 'INSTRUCTOR']}>
            <QuizAdmin />
          </ProtectedRoute>
        }
      />

      {/* Spec 08 & Spec 17 Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['ORG_ADMIN', 'SUPER_ADMIN']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute allowedRoles={['ORG_ADMIN', 'INSTRUCTOR', 'SUPER_ADMIN']}>
            <AdminAnalytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={<Navigate to="/admin/analytics" replace />}
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={['ORG_ADMIN', 'SUPER_ADMIN']}>
            <AdminUsers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/courses"
        element={
          <ProtectedRoute allowedRoles={['ORG_ADMIN', 'INSTRUCTOR']}>
            <AdminRoadmaps />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/roadmaps"
        element={<Navigate to="/admin/courses" replace />}
      />
      <Route
        path="/admin/guides"
        element={
          <ProtectedRoute allowedRoles={['ORG_ADMIN', 'INSTRUCTOR']}>
            <AdminGuides />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/tactics"
        element={
          <ProtectedRoute allowedRoles={['ORG_ADMIN', 'INSTRUCTOR']}>
            <AdminTactics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute allowedRoles={['ORG_ADMIN', 'SUPER_ADMIN']}>
            <AdminSettings />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<RootRedirect />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
