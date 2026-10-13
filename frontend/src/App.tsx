import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Spinner } from '@/components/ui'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'

import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { OnboardingPage } from '@/pages/onboarding/OnboardingPage'
import { HomePage } from '@/pages/home/HomePage'
import { ProgramPage } from '@/pages/program/ProgramPage'
import { WorkoutSessionPage } from '@/pages/workout/WorkoutSessionPage'
import { NutritionPage } from '@/pages/nutrition/NutritionPage'
import { ShoppingListPage } from '@/pages/nutrition/ShoppingListPage'
import { HydrationPage } from '@/pages/nutrition/HydrationPage'
import { ActivityPage } from '@/pages/activity/ActivityPage'
import { LeaderboardPage } from '@/pages/leaderboard/LeaderboardPage'
import { ChallengesPage } from '@/pages/challenges/ChallengesPage'
import { BadgesPage } from '@/pages/badges/BadgesPage'
import { LivesPage } from '@/pages/lives/LivesPage'
import { LiveRoomPage } from '@/pages/lives/LiveRoomPage'
import { CommunityPage } from '@/pages/community/CommunityPage'
import { CoachAiPage } from '@/pages/coach/CoachAiPage'
import { ProgressPage } from '@/pages/progress/ProgressPage'
import { ProfilePage } from '@/pages/profile/ProfilePage'
import { PremiumPage } from '@/pages/premium/PremiumPage'
import { NotificationsPage } from '@/pages/notifications/NotificationsPage'
import { AdminPage } from '@/pages/admin/AdminPage'
import { ManagementPage } from '@/pages/management/ManagementPage'
import { SuperAdminPage } from '@/pages/superadmin/SuperAdminPage'
import { EventsPage } from '@/pages/events/EventsPage'
import { HelpPage } from '@/pages/help/HelpPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PremiumGate } from '@/components/domain/PremiumGate'
import { isAdmin, isStaff, isSuperAdmin } from '@/utils/roles'

function FullScreenLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-900">
      <Spinner label="Chargement de FitLife…" />
    </div>
  )
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading, needsOnboarding } = useAuth()
  const location = useLocation()
  if (loading) return <FullScreenLoader />
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (needsOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }
  return <>{children}</>
}

function RequireRole({ children, role }: { children: ReactNode; role: 'superadmin' | 'admin' | 'coach' }) {
  const { user } = useAuth()
  if (role === 'superadmin' && !isSuperAdmin(user)) return <Navigate to="/" replace />
  if (role === 'admin' && !isAdmin(user)) return <Navigate to="/" replace />
  if (role === 'coach' && !isStaff(user)) return <Navigate to="/" replace />
  return <>{children}</>
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading, needsOnboarding } = useAuth()
  if (loading) return <FullScreenLoader />
  if (isAuthenticated) return <Navigate to={needsOnboarding ? '/onboarding' : '/'} replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route
        element={
          <PublicOnly>
            <AuthLayout />
          </PublicOnly>
        }
      >
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      <Route
        path="/onboarding"
        element={
          <RequireAuth>
            <OnboardingPage />
          </RequireAuth>
        }
      />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/program" element={<PremiumGate><ProgramPage /></PremiumGate>} />
        <Route path="/workout/:workoutId" element={<WorkoutSessionPage />} />
        <Route path="/nutrition" element={<NutritionPage />} />
        <Route path="/nutrition/shopping" element={<PremiumGate><ShoppingListPage /></PremiumGate>} />
        <Route path="/hydration" element={<HydrationPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/leaderboard" element={<PremiumGate><LeaderboardPage /></PremiumGate>} />
        <Route path="/challenges" element={<PremiumGate><ChallengesPage /></PremiumGate>} />
        <Route path="/badges" element={<PremiumGate><BadgesPage /></PremiumGate>} />
        <Route path="/lives" element={<LivesPage />} />
        <Route path="/lives/:id" element={<LiveRoomPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/coach" element={<PremiumGate><CoachAiPage /></PremiumGate>} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/premium" element={<PremiumPage />} />
        <Route path="/abonnement" element={<Navigate to="/premium" replace />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route
          path="/admin"
          element={
            <RequireRole role="admin">
              <AdminPage />
            </RequireRole>
          }
        />
        <Route
          path="/gestion"
          element={
            <RequireRole role="coach">
              <ManagementPage />
            </RequireRole>
          }
        />
        <Route path="/coach-space" element={<Navigate to="/gestion" replace />} />
        <Route
          path="/super-admin"
          element={
            <RequireRole role="superadmin">
              <SuperAdminPage />
            </RequireRole>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
