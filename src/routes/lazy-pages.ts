import { lazy } from 'react'

// Role screens are split by route so a student does not download staff or
// admin code, and the QR renderer/decoder only loads when a pass or scanner is
// opened. Auth screens stay eager for a fast first paint.
export const StudentHomePage = lazy(() =>
  import('@/pages/student/StudentHomePage').then((module) => ({ default: module.StudentHomePage })),
)
export const StudentMealsPage = lazy(() =>
  import('@/pages/student/StudentMealsPage').then((module) => ({ default: module.StudentMealsPage })),
)
export const StudentHistoryPage = lazy(() =>
  import('@/pages/student/StudentHistoryPage').then((module) => ({ default: module.StudentHistoryPage })),
)
export const StudentProfilePage = lazy(() =>
  import('@/pages/student/StudentProfilePage').then((module) => ({ default: module.StudentProfilePage })),
)
export const MealPassPage = lazy(() =>
  import('@/pages/student/MealPassPage').then((module) => ({ default: module.MealPassPage })),
)

export const StaffDashboardPage = lazy(() =>
  import('@/pages/staff/StaffDashboardPage').then((module) => ({ default: module.StaffDashboardPage })),
)
export const StaffMealsPage = lazy(() =>
  import('@/pages/staff/StaffMealsPage').then((module) => ({ default: module.StaffMealsPage })),
)
export const StaffMealDetailPage = lazy(() =>
  import('@/pages/staff/StaffMealDetailPage').then((module) => ({ default: module.StaffMealDetailPage })),
)
export const StaffMealFormPage = lazy(() =>
  import('@/pages/staff/StaffMealFormPage').then((module) => ({ default: module.StaffMealFormPage })),
)
export const StaffMealPlanPage = lazy(() =>
  import('@/pages/staff/StaffMealPlanPage').then((module) => ({ default: module.StaffMealPlanPage })),
)
export const StaffScannerPage = lazy(() =>
  import('@/pages/staff/StaffScannerPage').then((module) => ({ default: module.StaffScannerPage })),
)
export const StaffStudentsPage = lazy(() =>
  import('@/pages/staff/StaffStudentsPage').then((module) => ({ default: module.StaffStudentsPage })),
)

export const AdminOverviewPage = lazy(() =>
  import('@/pages/admin/AdminOverviewPage').then((module) => ({ default: module.AdminOverviewPage })),
)
export const AdminMessesPage = lazy(() =>
  import('@/pages/admin/AdminMessesPage').then((module) => ({ default: module.AdminMessesPage })),
)
export const AdminMessDetailPage = lazy(() =>
  import('@/pages/admin/AdminMessDetailPage').then((module) => ({ default: module.AdminMessDetailPage })),
)
export const AdminStudentsPage = lazy(() =>
  import('@/pages/admin/AdminStudentsPage').then((module) => ({ default: module.AdminStudentsPage })),
)
export const AdminStaffPage = lazy(() =>
  import('@/pages/admin/AdminStaffPage').then((module) => ({ default: module.AdminStaffPage })),
)
export const AdminBulkImportPage = lazy(() =>
  import('@/pages/admin/AdminBulkImportPage').then((module) => ({ default: module.AdminBulkImportPage })),
)
export const AdminReportsPage = lazy(() =>
  import('@/pages/admin/AdminReportsPage').then((module) => ({ default: module.AdminReportsPage })),
)
