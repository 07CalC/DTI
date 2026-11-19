import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { roleHome, useAuth } from '@/contexts/auth'
import { FullScreenLoader, ProtectedRoute } from '@/routes/protected-route'
import { StudentLayout } from '@/layouts/StudentLayout'
import { StaffLayout } from '@/layouts/StaffLayout'
import { AdminLayout } from '@/layouts/AdminLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { AuthCallbackPage } from '@/pages/auth/AuthCallbackPage'
import { AccessDeniedPage } from '@/pages/auth/AccessDeniedPage'
import {
  AdminBulkImportPage,
  AdminMessDetailPage,
  AdminMessesPage,
  AdminOverviewPage,
  AdminReportsPage,
  AdminStaffPage,
  AdminStudentsPage,
  MealPassPage,
  StaffDashboardPage,
  StaffMealDetailPage,
  StaffMealFormPage,
  StaffMealPlanPage,
  StaffMealsPage,
  StaffScannerPage,
  StaffStudentsPage,
  StudentHistoryPage,
  StudentHomePage,
  StudentMealsPage,
  StudentProfilePage,
} from '@/routes/lazy-pages'

function RootRedirect() {
  const { session, me, loading, meError } = useAuth()

  if (loading) return <FullScreenLoader />
  if (!session) return <Navigate to="/login" replace />
  if (meError || !me || !me.profile.is_active) {
    return <Navigate to="/access-denied" replace />
  }
  return <Navigate to={roleHome(me.profile.role)} replace />
}

export default function App() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/access-denied" element={<AccessDeniedPage />} />

        <Route element={<ProtectedRoute allowed={['student']} />}>
          <Route element={<StudentLayout />}>
            <Route path="/student/home" element={<StudentHomePage />} />
            <Route path="/student/meals" element={<StudentMealsPage />} />
            <Route path="/student/history" element={<StudentHistoryPage />} />
            <Route path="/student/profile" element={<StudentProfilePage />} />
            <Route path="/student/pass/:bookingId" element={<MealPassPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowed={['staff']} />}>
          <Route element={<StaffLayout />}>
            <Route path="/staff/dashboard" element={<StaffDashboardPage />} />
            <Route path="/staff/scanner" element={<StaffScannerPage />} />
            <Route path="/staff/meals" element={<StaffMealsPage />} />
            <Route path="/staff/menu" element={<StaffMealPlanPage />} />
            <Route path="/staff/meals/new" element={<StaffMealFormPage />} />
            <Route path="/staff/meals/:mealId" element={<StaffMealDetailPage />} />
            <Route path="/staff/meals/:mealId/edit" element={<StaffMealFormPage />} />
            <Route path="/staff/students" element={<StaffStudentsPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowed={['admin']} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/overview" element={<AdminOverviewPage />} />
            <Route path="/admin/messes" element={<AdminMessesPage />} />
            <Route path="/admin/messes/:messId" element={<AdminMessDetailPage />} />
            <Route path="/admin/students" element={<AdminStudentsPage />} />
            <Route path="/admin/staff" element={<AdminStaffPage />} />
            <Route path="/admin/import" element={<AdminBulkImportPage />} />
            <Route path="/admin/reports" element={<AdminReportsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </Suspense>
  )
}
